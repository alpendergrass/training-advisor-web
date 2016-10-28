'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  advicePeriod = require('./advice-period'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceConstants = require('./advice-constants'),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  err;
require('lodash-migrate');

module.exports = {};

module.exports.updateMetrics = function(params, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!params.user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!params.numericDate) {
    err = new TypeError('numericDate is required to update metrics');
    return callback(err, null);
  }

  if (!moment(params.numericDate.toString()).isValid()) {
    err = new TypeError('date ' + params.numericDate + ' is not a valid date');
    return callback(err, null);
  }

  // Let's not muck up the original params while we are here.
  let waterfallParams = _.clone(params);

  async.waterfall([
    async.apply(clearRunway, waterfallParams),
    updateFatigue,
    updateMetricsForDay
  ],
    function(err, trainingDay) {
      if (err) {
        return callback(err, null);
      }

      if (params.planGenUnderway) {
        // No need to set planGenNeeded since that is what we are doing now.
        return callback(null, trainingDay);
      }

      params.user.planGenNeeded = true;

      params.user.save(function(err) {
        if (err) {
          return callback(err, null);
        }

        return callback(null, trainingDay);
      });
    }
  );
};

function clearRunway(params, callback) {
  //not needed if we are generating plan.
  if (params.planGenUnderway) {
    return callback(null, params);
  }

  dbUtil.clearFutureMetricsAndAdvice(params.user, params.numericDate, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, params);
  });
}

function updateFatigue(params, callback) {
  dbUtil.getTrainingDayDocument(params.user, params.numericDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    params.trainingDay = trainingDay;

    //not needed if we are generating plan.
    if (params.planGenUnderway) {
      return callback(null, params);
    }

    //Adjust user.fatigueTimeConstant based on trainingDay.trainingEffortFeedback
    userUtil.updateFatigueTimeConstant(params.user.id, trainingDay.trainingEffortFeedback, function(err, fatigueTimeConstant) {
      if (err) {
        return callback(err, null);
      }

      params.user.fatigueTimeConstant = fatigueTimeConstant;

      if (params.trainingDay.trainingEffortFeedback !== null) {
        //We only ask for feedback if trainingEffortFeedback is null.
        //So if we got here, this means that we have received and applied feedback,
        //so we reset it to zero to avoid having the time constant
        //readjusted if/when updateMetrics is called again.
        params.trainingDay.trainingEffortFeedback = 0;
      }

      return callback(null, params);
    });
  });
}

// TODO: function updateMetricsForDay(params, callback) {
function updateMetricsForDay(params, callback) {
  //Compute fitness, fatigue and form.
  //If prior day's fitness and fatigue are not populated, recursively call updateMetricsForDay
  //until they are, which could go all the way back to our period start date, which should
  //have non-zero fitness and fatigue.

  //We use yesterday's fitness and fatigue to compute today's form.
  //This prevents today's form from changing when completed activities are added to today.

  //TODO: add the appropriate (planned vs advised) set of metrics to params (?).
  //Maybe all we have to do it determine the appropriate index.

  //TODO: must convert the following to an array-based series in order to ensure order. Or not and keep fingers crossed.
  async.series({
    periodData: function(callback) {
      advicePeriod.getPeriod(params.user, params.trainingDay, function(err, periodData) {
        if (err) {
          return callback(err, null);
        }

        return callback(null, periodData);
      });
    },
    priorTrainingDay: function(callback) {
    //TODO: return prior day metrics here instead of TD?

      if (params.trainingDay.startingPoint || params.trainingDay.fitnessAndFatigueTrueUp) {
        //Special cases:
        //1. If called with the first trainingDay of the training period, no point in looking for prior day.
        //2. User has done a F&F trueup: she has manually entered these values and we do not want to recompute them.
        //We will return null for prior day and check for null prior day below.
        if (params.trainingDay.fitness === 0 && params.trainingDay.fatigue === 0) {
          err = new RangeError('Starting day or F&F true-up day should not have fitness and fatigue equal to zero.');
          return callback(err, null);
        }

        return callback(null, null);
      }

      var numericPriorDate = dbUtil.toNumericDate(moment(params.trainingDay.dateNumeric.toString()).subtract(1, 'day'));

      dbUtil.getTrainingDayDocument(params.user, numericPriorDate, function(err, priorTrainingDay) {
        if (err) {
          return callback(err, null);
        }

        if (priorTrainingDay.fitness === 0 && priorTrainingDay.fatigue === 0) {
          let priorDayParams = _.clone(params);
          priorDayParams.trainingDay = priorTrainingDay;
          updateMetricsForDay(priorDayParams, function(err, updatedpriorTrainingDay) {
            if (err) {
              return callback(err, null);
            }

            return callback(null, updatedpriorTrainingDay);
          });
        } else {
          return callback(null, priorTrainingDay);
        }
      });
    }
  },
    function(err, results) {
      if (err) {
        return callback(err, null);
      }

      var totalBaseAndBuildDays,
        percentageOfTrainingTimeRemaining,
        currentTrainingDayTotalLoad,
        fatigueTimeConstant,
        priorDayFitness,
        priorDayFatigue;

      params.trainingDay.period = results.periodData.period;
      currentTrainingDayTotalLoad = sumBy(params.trainingDay.completedActivities, 'load');
      fatigueTimeConstant = params.user.fatigueTimeConstant || adviceConstants.defaultFatigueTimeConstant;

      //Compute fitness and fatigue for current trainingDay.
      //If priorTrainingDay does not exist, params.trainingDay is our starting day or is a F&F trueup and
      //fitness and fatigue would have been supplied by the user.
      if (results.priorTrainingDay) {
        params.trainingDay.fitness = Math.round((results.priorTrainingDay.fitness + ((currentTrainingDayTotalLoad - results.priorTrainingDay.fitness) / adviceConstants.defaultFitnessTimeConstant)) * 10) / 10;
        params.trainingDay.fatigue = Math.round((results.priorTrainingDay.fatigue + ((currentTrainingDayTotalLoad - results.priorTrainingDay.fatigue) / fatigueTimeConstant)) * 10) / 10;
        //Trello: We could use age as a factor in computing ATL for masters. This will cause TSB to drop faster
        //triggering R&R sooner. We will start with number of years past 35 / 2 as a percentage. So:
        //Age adjusted fatigue = yesterday’s (age-adjusted) fatigue + ((load * ((age - 35) / 2.) * 0.01 + 1) - yesterday’s (age-adjusted) fatigue) / 7)
        //Our adjustment of fatigueTimeConstant in theory should achieve the same thing but may not be sensitive enough.
        priorDayFitness = results.priorTrainingDay.fitness;
        priorDayFatigue = results.priorTrainingDay.fatigue;
      } else {
        //We need something to use below in computing form and targetAvgDailyLoad
        priorDayFitness = params.trainingDay.fitness;
        priorDayFatigue = params.trainingDay.fatigue;
      }

      //Base and build periods: for daily target fitness (CTL) ramp rate, we will start with 7/week at the beginning of training
      //and decrease (linearly) to 3 by the end of build.
      //daily ramp rate = (3 + (4 * ((days remaining in base + build) / total days in base + build))) / 7
      //Peak period: we want TSB to rise when tapering so we will let CTL decay somewhat.

      if (params.trainingDay.period === 'peak' || params.trainingDay.period === 'race' || params.trainingDay.period === 'transition') {
        //In essence, a zero ramp.
        params.trainingDay.dailyTargetRampRate = 0.001;
      } else {
        //Let's break it down to make it easier to understand when I come back to it a year from now.
        percentageOfTrainingTimeRemaining = (results.periodData.totalTrainingDays - results.periodData.currentDayCount) / results.periodData.totalTrainingDays;
        params.trainingDay.sevenDayTargetRampRate = Math.round((3 + (4 * percentageOfTrainingTimeRemaining)) * 100) / 100;
        params.trainingDay.dailyTargetRampRate = Math.round((params.trainingDay.sevenDayTargetRampRate / 7) * 100) / 100;
      }

      //Compute target avg daily load = (CTL Time Constant * Target CTL ramp rate) + CTLy
      params.trainingDay.targetAvgDailyLoad = Math.round(((adviceConstants.defaultFitnessTimeConstant * params.trainingDay.dailyTargetRampRate) + priorDayFitness) * 100) / 100;

      //Today's form is yesterday's fitness - fatigue. This is the way Coggan/TP does it.
      //Note that Strava uses today's F&F to compute today's form. I believe the Coggan way is more realistic.
      //params.trainingDay.form = Math.round((params.trainingDay.fitness - params.trainingDay.fatigue) * 100) / 100;
      params.trainingDay.form = Math.round((priorDayFitness - priorDayFatigue) * 100) / 100;
      params.trainingDay.loadRating = determineLoadRating(params.trainingDay.targetAvgDailyLoad, currentTrainingDayTotalLoad);

      params.trainingDay.daysUntilNextGoalEvent = results.periodData.daysUntilNextGoalEvent;
      params.trainingDay.daysUntilNextPriority2Event = results.periodData.daysUntilNextPriority2Event;
      params.trainingDay.daysUntilNextPriority3Event = results.periodData.daysUntilNextPriority3Event;

      // computeSevenDayRampRate(user, params.trainingDay, function (err, rampRate) {
      //ignore error...for now at least.
      //We are not using sevenDayRampRate since we disabled computeRampRateAdjustment.
        // params.trainingDay.sevenDayRampRate = rampRate;
      params.trainingDay.sevenDayRampRate = 0;

      params.trainingDay.save(function(err) {
        if (err) {
          return callback(err, null);
        } else {
          return callback(null, params.trainingDay);
        }
      });
      // });
    });
}

function sumBy(items, prop) {
  return items.reduce(function(a, b) {
    return a + b[prop];
  }, 0);
}

function determineLoadRating(targetAvgDailyLoad, dayTotalLoad) {
  //classify today's load: rest, easy, moderate, hard

  var maxLoadForRating;

  for (var i = 0; i < adviceConstants.loadRatingLookups.length; i++) {
    maxLoadForRating = Math.round(targetAvgDailyLoad * adviceConstants.loadRatingLookups[i].upperLoadFactor);
    if (dayTotalLoad <= maxLoadForRating) {
      return adviceConstants.loadRatingLookups[i].rating;
    }
  }

  return 'hard';
}

function computeSevenDayRampRate(user, trainingDay, callback) {
  //We are not using sevenDayRampRate since we disabled computeRampRateAdjustment.
  //compute sevenDayRampRate = Yesterday's fitness - fitness 7 days prior.
  var priorDate = dbUtil.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(8, 'days')),
    yesterday = dbUtil.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(1, 'days')),
    rampRate;

  dbUtil.getExistingTrainingDayDocument(user, yesterday)
    .then(function(yesterdayTrainingDay) {
      if (!yesterdayTrainingDay) {
        return callback(null, 0);
      }

      dbUtil.getExistingTrainingDayDocument(user, priorDate)
        .then(function(priorTrainingDay) {
          if (!priorTrainingDay) {
            return callback(null, 0);
          }

          rampRate = Math.round((yesterdayTrainingDay.fitness - priorTrainingDay.fitness) * 100) / 100;
          return callback(null, rampRate);
        })
        .catch(function(err) {
          return callback(err, 0);
        });
    })
    .catch(function(err) {
      return callback(err, 0);
    });
}
