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

module.exports = {};

module.exports.updateMetrics = function(params, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!params.user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!params.trainingDate) {
    err = new TypeError('trainingDate is required');
    return callback(err, null);
  }

  if (!moment(params.trainingDate).isValid()) {
    err = new TypeError('trainingDate ' + params.trainingDate + ' is not a valid date');
    return callback(err, null);
  }

  async.waterfall([
    async.apply(clearRunway, params),
    updateFatigue,
    updateMetricsForDay
  ],
    function(err, trainingDay) {
      if (err) {
        return callback(err, null);
      }

      params.user.planGenNeeded = true;

      params.user.save(function (err) {
        if (err) {
          return callback(err, null);
        }

        return callback(null, trainingDay);
      });
    }
  );
};

module.exports.assignLoadRating = function(trainingDay) {
  var totalLoad = sumBy(trainingDay.completedActivities, 'load');
  trainingDay.loadRating = determineLoadRating(trainingDay.targetAvgDailyLoad, totalLoad);
  return trainingDay;
};

function clearRunway(params, callback) {
  //not needed if we are generating plan.
  if (params.genPlan) {
    return callback(null, params);
  }

  dbUtil.clearFutureMetricsAndAdvice(params.user, params.trainingDate, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, params);
  });
}

function updateFatigue(params, callback) {
  dbUtil.getTrainingDayDocument(params.user, params.trainingDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null, null);
    }

    //not needed if we are generating plan.
    if (params.genPlan) {
      return callback(null, params.user, trainingDay);
    }

    //Adjust user.fatigueTimeConstant based on trainingDay.trainingEffortFeedback
    userUtil.updateFatigueTimeConstant(params.user.id, trainingDay.trainingEffortFeedback, function(err, fatigueTimeConstant) {
      if (err) {
        return callback(err, null, null);
      }

      params.user.fatigueTimeConstant = fatigueTimeConstant;
      if (trainingDay.trainingEffortFeedback !== null) {
        //We only ask for feedback if trainingEffortFeedback is null.
        //So if we got here, this means that we have received and applied feedback,
        //so we reset it to zero to avoid having the time constant
        //readjusted if/when updateMetrics is called again.
        trainingDay.trainingEffortFeedback = 0;
      }

      return callback(null, params.user, trainingDay);
    });
  });
}

function updateMetricsForDay(user, currentTrainingDay, callback) {
  //Compute fitness, fatigue and form.
  //If prior day's fitness and fatigue are not populated, recursively call updateMetricsForDay
  //until they are, which could go all the way back to our period start date, which should
  //have non-zero fitness and fatigue.

  //We use yesterday's fitness and fatigue to compute today's form, like TP does it.
  //This prevents today's form from changing when completed activities are added to today.

  //TODO: must convert the following to an array-based series in order to ensure order. Or not and keep fingers crossed.
  async.series({
    periodData: function(callback){
      advicePeriod.getPeriod(user, currentTrainingDay, function(err, periodData) {
        if (err) {
          return callback(err);
        }

        return callback(null, periodData);
      });
    },
    priorTrainingDay: function(callback) {
      if (currentTrainingDay.startingPoint || currentTrainingDay.fitnessAndFatigueTrueUp) {
        //Special cases:
        //1. If called with the first trainingDay of the training period, no point in looking for prior day.
        //2. User is done a F&F trueup: she has manually entered these values and we do not want to recompute them.
        //We will return null for prior day and check for null prior day below.
        if (currentTrainingDay.fitness === 0 && currentTrainingDay.fatigue === 0) {
          err = new RangeError('Starting day or F&F true-up day should not have fitness and fatigue equal to zero.');
          return callback(err, null);
        }

        return callback(null, null);
      }

      var priorDate = moment(currentTrainingDay.date).subtract(1, 'days');

      dbUtil.getTrainingDayDocument(user, priorDate, function(err, priorTrainingDay) {
        if (err) {
          return callback(err, null);
        }

        if (priorTrainingDay.fitness === 0 && priorTrainingDay.fatigue === 0) {
          updateMetricsForDay(user, priorTrainingDay, function (err, updatedpriorTrainingDay) {
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

    currentTrainingDay.period = results.periodData.period;
    currentTrainingDayTotalLoad = sumBy(currentTrainingDay.completedActivities, 'load');
    fatigueTimeConstant = user.fatigueTimeConstant || adviceConstants.defaultFatigueTimeConstant;

    //Compute fitness and fatigue for current trainingDay.
    //If priorTrainingDay does not exist, currentTrainingDay is our starting day or is a F&F trueup and
    //fitness and fatigue would have been supplied by the user.
    if (results.priorTrainingDay) {
      currentTrainingDay.fitness = Math.round((results.priorTrainingDay.fitness + ((currentTrainingDayTotalLoad - results.priorTrainingDay.fitness) / adviceConstants.defaultFitnessTimeConstant)) * 10) / 10;
      currentTrainingDay.fatigue = Math.round((results.priorTrainingDay.fatigue + ((currentTrainingDayTotalLoad - results.priorTrainingDay.fatigue) / fatigueTimeConstant)) * 10) / 10;
      //TODO: We could use age as a factor in computing ATL for masters. This will cause TSB to drop faster
      //triggering R&R sooner. We will start with number of years past 35 / 2 as a percentage. So:
      //Age adjusted fatigue = yesterday’s (age-adjusted) fatigue + ((load * ((age - 35) / 2.) * 0.01 + 1) - yesterday’s (age-adjusted) fatigue) / 7)
      //Our adjustment of fatigueTimeConstant in theory should achieve the same thing but may not be sensitive enough.
      priorDayFitness = results.priorTrainingDay.fitness;
      priorDayFatigue = results.priorTrainingDay.fatigue;
    } else {
      //We need something to use below in computing form and targetAvgDailyLoad
      priorDayFitness = currentTrainingDay.fitness;
      priorDayFatigue = currentTrainingDay.fatigue;
    }

    //Base and build periods: for daily target fitness (CTL) ramp rate, we will start with 7/week at the beginning of training
    //and decrease (linearly) to 3 by the end of build.
    //daily ramp rate = (3 + (4 * ((days remaining in base + build) / total days in base + build))) / 7
    //Peak period: we want TSB to rise when tapering so we will let CTL decay somewhat. Use ??? for daily ramp rate.

    if (currentTrainingDay.period === 'peak' || currentTrainingDay.period === 'transition'){
      //In essence, a zero ramp.
      currentTrainingDay.dailyTargetRampRate = 0.001;
    } else {
      //Let's break it down to make it easier to understand when I come back to it a year from now.
      totalBaseAndBuildDays = results.periodData.basePeriodDays + results.periodData.buildPeriodDays;
      percentageOfTrainingTimeRemaining = (totalBaseAndBuildDays - results.periodData.currentDayCount) / totalBaseAndBuildDays;
      currentTrainingDay.sevenDayTargetRampRate = Math.round((3 + (4 * percentageOfTrainingTimeRemaining)) * 100) / 100;
      currentTrainingDay.dailyTargetRampRate = Math.round((currentTrainingDay.sevenDayTargetRampRate / 7) * 100) / 100;
    }

    //Compute target avg daily load = (CTL Time Constant * Target CTL ramp rate) + CTLy
    currentTrainingDay.targetAvgDailyLoad = Math.round(((adviceConstants.defaultFitnessTimeConstant * currentTrainingDay.dailyTargetRampRate) + priorDayFitness) * 100) / 100;

    //Today's form is yesterday's fitness - fatigue. This is the way Coggan/TP does it.
    //Note that Strava uses today's F&F to compute today's form. I believe the Coggan way is more realistic.
    //currentTrainingDay.form = Math.round((currentTrainingDay.fitness - currentTrainingDay.fatigue) * 100) / 100;
    currentTrainingDay.form = Math.round((priorDayFitness - priorDayFatigue) * 100) / 100;
    currentTrainingDay.loadRating = determineLoadRating(currentTrainingDay.targetAvgDailyLoad, currentTrainingDayTotalLoad);

    currentTrainingDay.daysUntilNextGoalEvent = results.periodData.daysUntilNextGoalEvent;
    currentTrainingDay.daysUntilNextPriority2Event = results.periodData.daysUntilNextPriority2Event;
    currentTrainingDay.daysUntilNextPriority3Event = results.periodData.daysUntilNextPriority3Event;

    computeSevenDayRampRate(user, currentTrainingDay, function (err, rampRate) {
      //ignore error...for now at least.
      currentTrainingDay.sevenDayRampRate = rampRate;

      currentTrainingDay.save(function (err) {
        if (err) {
          return callback(err, null);
        } else {
          return callback(null, currentTrainingDay);
        }
      });
    });
  });
}

function sumBy(items, prop){
  return items.reduce(function(a, b){
    return a + b[prop];
  }, 0);
}

function determineLoadRating(targetAvgDailyLoad, dayTotalLoad) {
  //classify today's load: rest, easy, moderate, hard
  //TODO: we should figure out how to classify a workout as a simulation.
  //perhaps by comparing a hard workout with the expected demands of the goal event.

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
  //compute sevenDayRampRate = Yesterday's fitness - fitness 7 days prior.
  var priorDate = moment(trainingDay.date).subtract(8, 'days'),
    yesterday = moment(trainingDay.date).subtract(1, 'days'),
    rampRate;

  dbUtil.getExistingTrainingDayDocument(user, yesterday, function(err, yesterdayTrainingDay) {
    if (err) {
      return callback(err, 0);
    }

    if (!yesterdayTrainingDay) {
      return callback(null, 0);
    }

    dbUtil.getExistingTrainingDayDocument(user, priorDate, function(err, priorTrainingDay) {
      if (err) {
        return callback(err, 0);
      }

      if (!priorTrainingDay) {
        return callback(null, 0);
      }

      rampRate = Math.round((yesterdayTrainingDay.fitness - priorTrainingDay.fitness) * 100) / 100;
      return callback(null, rampRate);
    });
  });
}
