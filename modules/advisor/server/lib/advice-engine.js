'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  RuleEngine = require('node-rules'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceConstants = require('./advice-constants'),
  adviceUtil = require('./advice-util'),
  adviceMetrics = require('./advice-metrics'),
  adviceLoad = require('./advice-load'),
  adviceEvent = require('./advice-event'),
  adviceTest = require('./advice-test'),
  adviceDefault = require('./advice-default'),
  adviceT0 = require('./advice-t0'),
  adviceInSeason = require('./advice-season'),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  workoutUtil = require('./workout-util'),
  tdUtil = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  err;

mongoose.Promise = global.Promise;

function generateAdvice(user, trainingDay, source, selectNewWorkout, callback) {
  var facts = {};
  // var subsequentDate = coreUtil.toNumericDate(moment(trainingDay.dateNumeric.toString()).add(1, 'day'));
  var oneDayPriorDate = coreUtil.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(1, 'day'));
  var twoDaysPriorDate = coreUtil.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(2, 'days'));
  var metricsType = tdUtil.setMetricsType(source);

  dbUtil.getFuturePriorityDays(user, trainingDay.dateNumeric, 1, adviceConstants.maxDaysToLookAheadForFutureGoals)
    .then(function(goalDays) {
      if (goalDays.length < 1) {
        facts.nextGoal = null;
      } else {
        facts.nextGoal = goalDays[0];
      }
      return dbUtil.getExistingTrainingDayDocument(user, oneDayPriorDate);
    })
    .then(function(oneDayPrior) {
      if (oneDayPrior) {
        facts.oneDayPrior = oneDayPrior;
        facts.metricsOneDayPrior = tdUtil.getMetrics(oneDayPrior, metricsType);
      }
      return dbUtil.getExistingTrainingDayDocument(user, twoDaysPriorDate);
    })
    .then(function(twoDaysPrior) {
      if (twoDaysPrior) {
        facts.twoDaysPrior = twoDaysPrior;
        facts.metricsTwoDaysPrior = tdUtil.getMetrics(twoDaysPrior, metricsType);
      }

      facts.trainingState = null;
      facts.source = source;
      facts.adviceConstants = adviceConstants;
      facts.testingIsDue = adviceUtil.isTestingDue(user, trainingDay);
      facts.todayDayOfWeek = moment(trainingDay.dateNumeric.toString()).day().toString();
      facts.tomorrowDayOfWeek = moment(trainingDay.dateNumeric.toString()).add(1, 'day').day().toString();
      facts.trainingDay = trainingDay;
      facts.plannedActivity = tdUtil.getPlannedActivity(trainingDay, source);
      facts.metrics = tdUtil.getMetrics(trainingDay, metricsType);

      // Rule priority guide:
      // Event priorities are 90 - 99.
      // Test: 80 - 89.
      // Default: 70 - 79, 1 for catch-all load rule.
      // By period activityType rules: 2 - 9.
      // Rule priority only applies if ALL rules have (non-zero) priority. Done.

      // user.recoveryRate is 0 - 10, slow to fast recovery.
      let recoveryRateMultiplier = 1;

      if (facts.metricsOneDayPrior) {
        if (facts.metricsOneDayPrior.loadRating === 'hard') {
          // I don't want to see another hard day if I'm a slow recoverer.
          recoveryRateMultiplier = 2;
        } else if (facts.metricsOneDayPrior.loadRating === 'moderate') {
          recoveryRateMultiplier = 1.4;
        }
      }

      let userThresholdAdjustment = (10 - user.recoveryRate) * recoveryRateMultiplier;
      facts.testingDueEasyDayThreshold = adviceConstants.testingDueEasyDayThreshold + userThresholdAdjustment;

      var R = new RuleEngine(adviceEvent.eventRules);
      R.register(adviceTest.testRules);
      R.register(adviceDefault.defaultRules);

      switch (trainingDay.period) {
        case 't0':
          R.register(adviceT0.t0Rules);
          break;
        case 't1':
          facts.hardDayThreshold = adviceConstants.t1HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t1ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t1EasyDayThreshold + userThresholdAdjustment;
          break;
        case 't2':
          facts.hardDayThreshold = adviceConstants.t2HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t2ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t2EasyDayThreshold + userThresholdAdjustment;
          break;
        case 't3':
          facts.hardDayThreshold = adviceConstants.t3HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t3ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t3EasyDayThreshold + userThresholdAdjustment;
          break;
        case 't4':
          facts.hardDayThreshold = adviceConstants.t4HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t4ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t4EasyDayThreshold + userThresholdAdjustment;
          break;
        case 't5':
          facts.hardDayThreshold = adviceConstants.t5HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t5ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t5EasyDayThreshold + userThresholdAdjustment;
          break;
        case 't6':
          facts.hardDayThreshold = adviceConstants.t6HardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.t6ModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.t6EasyDayThreshold + userThresholdAdjustment;
          break;
        case 'race':
          facts.hardDayThreshold = adviceConstants.raceHardDayThreshold + userThresholdAdjustment;
          facts.moderateDayThreshold = adviceConstants.raceModerateDayThreshold + userThresholdAdjustment;
          facts.easyDayThreshold = adviceConstants.raceEasyDayThreshold + userThresholdAdjustment;
          break;
      }

      if (_.includes(['t1', 't2', 't3', 't4', 't5', 't6', 'race'], trainingDay.period)) {
        R.register(adviceInSeason.inSeasonRules);
      }

      R.execute(facts, function(result) {
        workoutUtil.getWorkout(trainingDay, source, selectNewWorkout)
          .then(trainingDay => {
            return adviceLoad.setLoadRecommendations(trainingDay, source);
          })
          .then(trainingDay => {
            return trainingDay.save();
          })
          .then(trainingDay => {
            if (source === 'advised' && facts.plannedActivity.activityType === 'test') {
              user.lastTestRecommendationDateNumeric = trainingDay.dateNumeric;
              return user.save();
            } else {
              return Promise.resolve(user);
            }
          })
          .then(user => {
            return callback(null, trainingDay);
          })
          .catch(err => {
            console.log('Error - generateAdvice err: ', err);
            return callback(err, null);
          });
      });
    })
    .catch(function(err) {
      console.log('Error - generateAdvice err: ', err);
      return callback(err, null);
    });
}

function generateActivityFromAdvice(params, callback) {
  //We do this to allow us to generate a plan.
  //The assumption is that the user will execute the advice to the letter.

  var completedActivity = {},
    trainingDay = params.trainingDay,
    user = params.user,
    metrics = tdUtil.getMetrics(trainingDay, 'planned'),
    planActivity = tdUtil.getPlannedActivity(trainingDay, 'plangeneration');

  if (planActivity) {
    let load = planActivity.activityType === 'rest' ? 0 : ((planActivity.targetMaxLoad - planActivity.targetMinLoad) / 2) + planActivity.targetMinLoad;
    completedActivity.load = load;

    let intensityLookup = _.find(adviceConstants.intensityEstimateLookups,
      {
        'activityType': planActivity.activityType,
        'period': trainingDay.period
      });
    completedActivity.intensity = intensityLookup ? intensityLookup.intensity : 0;

    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);

    //By setting fitness and fatigue to zero we trigger recomputation of metrics for this day
    //when updateMetrics is called for the following day.
    //Do not want to zero out a starting point though.
    if (!trainingDay.startingPoint) {
      metrics.fitness = 0;
      metrics.fatigue = 0;
    }

    trainingDay.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      if (planActivity.activityType === 'test') {
        // Make it look as if the user tested when recommended.
        user.ftpLog[0].ftpDateNumeric = trainingDay.dateNumeric;
        user.lastTestRecommendationDateNumeric = trainingDay.dateNumeric;
      }

      return callback(null, trainingDay);
    });
  }
}

module.exports = {};

module.exports.generatePlan = function(params) {
  return new Promise(function(resolve, reject) {
    if (!params.user) {
      err = new TypeError('valid user is required');
      return reject(err);
    }

    //Start date should be the current day in the user's time zone.
    if (!params.numericDate) {
      err = new TypeError('genPlan date is required');
      return reject(err);
    }

    var user = params.user,
      adviceParams = _.clone(params),
      savedFTPDateNumeric = user.ftpLog[0].ftpDateNumeric,
      savedLastTestRecommendationDateNumeric = user.lastTestRecommendationDateNumeric,
      numericEffectiveGoalDate,
      noGoalState = null;

    // TODO: Use promises below to clean this up. Yuck.
    // Replace async.eachSeries with synchronous promises.
    // Find ".reduce(" to see where I've done it elsewhere.
    // And see here: https://remysharp.com/2015/12/18/promise-waterfall

    // Get future goal days.
    dbUtil.getFuturePriorityDays(user, params.numericDate, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd)
      .then(function(goalDays) {
        if (goalDays.length > 0) {
          //Use last goal to generate plan.
          numericEffectiveGoalDate = goalDays[goalDays.length - 1].dateNumeric;
          return Promise.resolve();
        } else {
          numericEffectiveGoalDate = coreUtil.toNumericDate(moment().add(adviceConstants.monthsToVirtualGoal, 'months'));
          // Let's pretend we have a goal in order to generate a more interesting plan.
          // Get this day, remember settings then set this day to goal.
          return dbUtil.getTrainingDayDocument(user, numericEffectiveGoalDate);
        }
      })
      .then(function(tempGoalDay) {
        if (tempGoalDay) {
          // make this a goal day.
          noGoalState = {
            scheduledEventRanking: tempGoalDay.scheduledEventRanking,
            estimatedLoad: tempGoalDay.estimatedLoad
          };
          tempGoalDay.scheduledEventRanking = 1;
          tempGoalDay.estimatedLoad = 0;
          return tempGoalDay.save();
        } else {
          return Promise.resolve();
        }
      })
      .then(function() {
        let metricsParams = {
          user: params.user,
          numericDate: params.numericDate,
        };

        metricsParams.metricsType = 'actual';

        // We recompute actual metrics before we copy as they could be out of date.
        adviceMetrics.updateMetrics(metricsParams, function(err, todayTrainingDay) {
          if (err) {
            return reject(err);
          }

          dbUtil.copyActualMetricsToPlanned(user, params.numericDate)
            .then(function() {
              //As a precaution we remove all planning data.
              //If we errored out last time there could be some left overs.
              return dbUtil.removePlanGenerationActivities(user, params.numericDate);
            })
            .then(function() {
              //get all training days from tomorrow thru last goal.
              let tomorrowNumeric = coreUtil.toNumericDate(moment(params.numericDate.toString()).add(1, 'day'));

              dbUtil.getTrainingDays(user, tomorrowNumeric, numericEffectiveGoalDate, function(err, trainingDays) {
                if (err) {
                  return reject(err);
                }

                if (trainingDays.length < 1) {
                  err = new TypeError('No training days returned by getTrainingDays.');
                  return reject(err);
                }

                let adviceParams = {};
                adviceParams.user = user;
                adviceParams.source = 'plangeneration';
                adviceParams.alternateActivity = null;
                adviceParams.selectNewWorkout = false;
                adviceParams.planGenUnderway = true;

                let genActivityParams = {};
                genActivityParams.user = user;

                async.eachSeries(trainingDays, function(trainingDay, callback) {
                  adviceParams.numericDate = trainingDay.dateNumeric;

                  module.exports.advise(adviceParams, function(err, trainingDay) {
                    if (err) {
                      return callback(err);
                    }

                    genActivityParams.trainingDay = trainingDay;

                    generateActivityFromAdvice(genActivityParams, function(err, trainingDay) {
                      if (err) {
                        return callback(err);
                      }

                      return callback();
                    });
                  });
                },
                  function(err) {
                    if (err) {
                      return reject(err);
                    }

                    user.ftpLog[0].ftpDateNumeric = savedFTPDateNumeric;
                    user.lastTestRecommendationDateNumeric = savedLastTestRecommendationDateNumeric;

                    //We need to update metrics for last day as it will not be up to date otherwise.
                    // But if we call it for today we will clear the plannedActivity we just assigned to this day.
                    // So we call it for tomorrow.
                    let nextDateNumeric = coreUtil.toNumericDate(moment(trainingDays[trainingDays.length - 1].dateNumeric.toString()).add(1, 'day'));
                    metricsParams.numericDate = nextDateNumeric;
                    metricsParams.metricsType = 'planned';

                    adviceMetrics.updateMetrics(metricsParams, function(err, trainingDay) {
                      if (err) {
                        return reject(err);
                      }

                      dbUtil.removePlanGenerationCompletedActivities(user)
                        .then(function() {
                          if (noGoalState) {
                            // If we faked a goal we need to restore to previous state.
                            return TrainingDay.update({
                              user: user,
                              dateNumeric: numericEffectiveGoalDate,
                              cloneOfId: null
                            }, {
                              $set: {
                                scheduledEventRanking: noGoalState.scheduledEventRanking,
                                estimatedLoad: noGoalState.estimatedLoad
                              }
                            });
                          } else {
                            return Promise.resolve();
                          }
                        })
                        .then(function() {
                          // We need to refresh advice for today and tomorrow because
                          // we called updateMetrics when we started which would clear
                          // current advice for these days.
                          return module.exports.refreshAdvice(user, todayTrainingDay);
                        })
                        .then(function() {
                          let statusMessage = {
                            type: 'success',
                            text: 'We have updated your season.',
                            title: 'Season Update',
                            created: Date.now(),
                            username: user.username
                          };

                          if (params.isSim) {
                            statusMessage.text = 'Simulation has completed.';
                            statusMessage.title = 'Season Simulation';
                          }

                          let genPlanresponse = { user: user, statusMessage: statusMessage };
                          return resolve(genPlanresponse);
                        })
                        .catch(function(err) {
                          return reject(err);
                        });
                    });
                  } // end eachSeries callback
                );
              });
            })
            .catch(function(err) {
              //from copyActualMetricsToPlanned()
              return reject(err);
            });
        });
      })
      .catch(function(err) {
        //from getFuturePriorityDays() or removePlanGenerationActivities()
        return reject(err);
      });
  });
};

module.exports.refreshAdvice = function(user, trainingDay, selectNewWorkout) {
  // if trainingDay is not beyond tomorrow we should update metrics for trainingDay (which will clear future)
  // and then advise for today (maybe) and tomorrow.

  return new Promise(function(resolve, reject) {
    if (!trainingDay) {
      console.log('Error - refreshAdvice requires trainingDay input');
      return reject(new Error('refreshAdvice requires trainingDay input'));
    }

    let tdDate = moment.tz(trainingDay.dateNumeric.toString(), user.timezone);  // toDate:  2017-02-25T13:30:00.000Z
    let today = tdUtil.getTodayInUserTimezone(user);            // 2017-02-25T13:30:00.000Z
    let tomorrow = moment(today).add(1, 'day').toDate();      //  2017-02-26T13:30:00.000Z

    let response = {
      trainingDay: trainingDay,
      advisedToday: null,
      advisedTomorrow: null
    };

    if (tdDate.isAfter(tomorrow, 'day')) {
      return resolve(response);
    }

    let metricsParams = {
      user: user,
      numericDate: trainingDay.dateNumeric,
      metricsType: 'actual'
    };

    // if trainingDay is today or tomorrow, we technically do not need to update metrics as that will happen in advise.
    adviceMetrics.updateMetrics(metricsParams, function(err, trainingDay) {
      // updateMetrics will clear future metrics and advice starting with trainingDay.
      // Calling advise below will regenerate metrics from trainingDay until today/tomorrow.
      // TODO: perhaps we should not remove future advice here. User might want to see what was advised on a particular day

      if (err) {
        return reject(err);
      }

      let adviceParams = {};
      adviceParams.user = user;
      adviceParams.source = 'advised';
      adviceParams.alternateActivity = null;
      adviceParams.selectNewWorkout = selectNewWorkout ? true : false;

      if (tdDate.isSameOrBefore(today, 'day')) {
        //getAdvice for today and tomorrow.
        adviceParams.numericDate = coreUtil.toNumericDate(today, user);

        module.exports.advise(adviceParams, function(err, advisedToday) {
          if (err) {
            return reject(err);
          }

          response.advisedToday = advisedToday;
          adviceParams.numericDate = coreUtil.toNumericDate(tomorrow, user);
          // selectNewWorkout only applies to the first day we are advising,
          // today or tomorrow but not both.
          adviceParams.selectNewWorkout = false;

          module.exports.advise(adviceParams, function(err, advisedTomorrow) {
            if (err) {
              return reject(err);
            }

            response.advisedTomorrow = advisedTomorrow;

            if (trainingDay.dateNumeric === advisedToday.dateNumeric) {
              // Let's return the advised version of today.
              response.trainingDay = advisedToday;
            } else {
              // return trainingDay with updated metrics
              response.trainingDay = trainingDay;
            }

            return resolve(response);
          });
        });
      } else {
        //tdDate is tomorrow -> getAdvice for tomorrow.
        adviceParams.numericDate = coreUtil.toNumericDate(tomorrow, user);

        module.exports.advise(adviceParams, function(err, advisedTomorrow) {
          if (err) {
            return reject(err);
          }

          // Let's return the advised version of tomorrow.
          response.trainingDay = advisedTomorrow;
          response.advisedTomorrow = advisedTomorrow;

          return resolve(response);
        });
      }
    });
  });
};

module.exports.advise = function(params, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!params.user) {
    err = new TypeError('advise valid user is required');
    return callback(err, null);
  }

  if (!params.numericDate) {
    err = new TypeError('advise numericDate is required');
    return callback(err, null);
  }

  if (!moment(params.numericDate.toString()).isValid()) {
    err = new TypeError('advise numericDate ' + params.numericDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!params.source) {
    err = new TypeError('advise source is required');
    return callback(err, null);
  }

  if (!_.has(params, 'selectNewWorkout')) {
    err = new TypeError('advise selectNewWorkout is required');
    return callback(err, null);
  }

  let metricsParams = {
    user: params.user,
    numericDate: params.numericDate,
    metricsType: tdUtil.setMetricsType(params.source),
    source: params.source
  };

  adviceMetrics.updateMetrics(metricsParams, function(err, trainingDay) {
    if (err) {
      console.log('Error - advise.updateMetrics err: ', err);
      return callback(err);
    }

    var plannedActivity = {};

    if (params.source === 'requested') {
      //User has requested a specific activity type (load) different from what we recommend.
      //We just need to compute load for the requested activity type.

      //Create planned activity for requested activity.
      plannedActivity.activityType = params.alternateActivity;
      plannedActivity.source = params.source;
      trainingDay.plannedActivities.push(plannedActivity);

      adviceLoad.setLoadRecommendations(trainingDay, params.source)
        .then(trainingDay => {
          return trainingDay.save();
        })
        .then(trainingDay => {
          return callback(null, trainingDay);
        })
        .catch(err => {
          console.log('Error - advise for requested activity err: ', err);
          return callback(err);
        });
    } else {
      //We are advising or planning an activity.
      plannedActivity.source = params.source;
      trainingDay.plannedActivities.push(plannedActivity);

      generateAdvice(params.user, trainingDay, params.source, params.selectNewWorkout, function(err, recommendation) {
        if (err) {
          console.log('Error - advise.generateAdvice err: ', err);
          return callback(err, null);
        }

        return callback(null, recommendation);
      });
    }
  });
};

// The following is only exported for testing.
module.exports._testGenerateAdvice = generateAdvice;
