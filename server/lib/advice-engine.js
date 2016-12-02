'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  RuleEngine = require('node-rules'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceConstants = require('./advice-constants'),
  adviceUtil = require('./advice-util'),
  adviceMetrics = require('./advice-metrics'),
  adviceLoad = require('./advice-load'),
  adviceEvent = require('./advice-event'),
  adviceTest = require('./advice-test'),
  adviceDefault = require('./advice-default'),
  adviceT0 = require('./advice-t0'),
  adviceT1 = require('./advice-t1'),
  adviceT2 = require('./advice-t2'),
  adviceT3 = require('./advice-t3'),
  adviceT4 = require('./advice-t4'),
  adviceT5 = require('./advice-t5'),
  adviceT6 = require('./advice-t6'),
  adviceRace = require('./advice-race'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  err;

function generateAdvice(user, trainingDay, source, callback) {
  var facts = {};
  // var subsequentDate = util.toNumericDate(moment(trainingDay.dateNumeric.toString()).add(1, 'day'));
  var oneDayPriorDate = util.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(1, 'day'));
  var twoDaysPriorDate = util.toNumericDate(moment(trainingDay.dateNumeric.toString()).subtract(2, 'days'));
  var metricsType = util.setMetricsType(source);

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
        facts.metricsOneDayPrior = util.getMetrics(oneDayPrior, metricsType);
      }
      return dbUtil.getExistingTrainingDayDocument(user, twoDaysPriorDate);
    })
    .then(function(twoDaysPrior) {
      if (twoDaysPrior) {
        facts.twoDaysPrior = twoDaysPrior;
        facts.metricsTwoDaysPrior = util.getMetrics(twoDaysPrior, metricsType);
      }

      facts.trainingState = null;
      facts.source = source;
      facts.adviceConstants = adviceConstants;
      facts.testingIsDue = adviceUtil.isTestingDue(user, trainingDay);
      facts.todayDayOfWeek = moment(trainingDay.dateNumeric.toString()).day().toString();
      facts.tomorrowDayOfWeek = moment(trainingDay.dateNumeric.toString()).add(1, 'day').day().toString();
      facts.trainingDay = trainingDay;
      facts.plannedActivity = util.getPlannedActivity(trainingDay, source);
      facts.metrics = util.getMetrics(trainingDay, metricsType);

      // Rule priority guide:
      // Event priorities are 90 - 99.
      // Test: 80 - 89.
      // Default: 70 - 79, 1 for catch-all load rule.
      // By period activityType rules: 2 - 9.
      // By period chained advice rules: < 0..
      // Rule priority only applies if ALL rules have (non-zero) priority. Done.

      var R = new RuleEngine(adviceEvent.eventRules);
      R.register(adviceTest.testRules);
      R.register(adviceDefault.defaultRules);

      switch (trainingDay.period) {
        case 't0':
          R.register(adviceT0.t0Rules);
          break;
        case 't1':
          R.register(adviceT1.t1Rules);
          break;
        case 't2':
          R.register(adviceT2.t2Rules);
          break;
        case 't3':
          R.register(adviceT3.t3Rules);
          break;
        case 't4':
          R.register(adviceT4.t4Rules);
          break;
        case 't5':
          R.register(adviceT5.t5Rules);
          break;
        case 't6':
          R.register(adviceT6.t6Rules);
          break;
        case 'race':
          R.register(adviceRace.raceRules);
          break;
      }

      R.execute(facts, function(result) {
        adviceLoad.setLoadRecommendations(user, trainingDay, source, function(err, trainingDay) {
          if (err) {
            console.log('setLoadRecommendations err: ', err);
            return callback(err);
          }

          trainingDay.save(function(err) {
            if (err) {
              console.log('trainingDay.save err: ', err);
              return callback(err, null);
            } else {
              return callback(null, trainingDay);
            }
          });
        });
      });
    })
    .catch(function(err) {
      return callback(err, 0);
    });
}

function generateActivityFromAdvice(params, callback) {
  //We do this to allow us to generate a plan.
  //The assumption is that the user will execute the advice to the letter.

  var completedActivity = {},
    trainingDay = params.trainingDay,
    user = params.user,
    metrics = util.getMetrics(trainingDay, 'planned'),
    planActivity = util.getPlannedActivity(trainingDay, 'plangeneration');

  if (planActivity) {
    let load = planActivity.activityType === 'rest' ? 0 : ((planActivity.targetMaxLoad - planActivity.targetMinLoad) / 2) + planActivity.targetMinLoad;
    completedActivity.load = load;
    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);
    trainingDay.planLoad = completedActivity.load;

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
        //Make it look as if the user tested when recommended.
        user.thresholdPowerTestDate = moment(trainingDay.dateNumeric.toString()).toDate();
        user.save(function(err) {
          if (err) {
            return callback(err, null);
          }

          return callback(null, trainingDay);
        });
      } else {
        return callback(null, trainingDay);
      }
    });
  }
}

module.exports = {};

module.exports.generatePlan = function(params, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!params.user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  //Start date should be the current day in the user's time zone.
  if (!params.numericDate) {
    err = new TypeError('genPlan date is required');
    return callback(err, null);
  }

  var user = params.user,
    adviceParams = _.clone(params),
    savedThresholdPowerTestDate = user.thresholdPowerTestDate,
    goalDay;

  // Make the following a async.series, use promises or something to clean it up. Yuck.

  // Get future goal days.
  dbUtil.getFuturePriorityDays(user, params.numericDate, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd)
    .then(function(goalDays) {
      if (goalDays.length < 1) {
        err = new TypeError('A goal is required in order to generate a season view.');
        return callback(err, null);
      }

      //Use last goal to generate plan.
      goalDay = goalDays[goalDays.length - 1];

      let metricsParams = {
        user: params.user,
        numericDate: params.numericDate,
      };

      metricsParams.metricsType = 'actual';

      // We recompute actual metrics before we copy as they could be out of date.
      adviceMetrics.updateMetrics(metricsParams, function(err, todayTrainingDay) {
        if (err) {
          return callback(err, null);
        }

        dbUtil.copyActualMetricsToPlanned(user, params.numericDate)
          .then(function() {
            //We call updateMetrics here to ensure we have good starting metrics.

            //As a precaution we remove all planning data.
            //If we errored out last time there could be some left overs.
            dbUtil.removePlanGenerationActivities(user)
              .then(function() {
                //get all training days from tomorrow thru last goal.
                let tomorrowNumeric = util.toNumericDate(moment(params.numericDate.toString()).add(1, 'day'));

                dbUtil.getTrainingDays(user, tomorrowNumeric, goalDay.dateNumeric, function(err, trainingDays) {
                  if (err) {
                    return callback(err, null);
                  }

                  if (trainingDays.length < 1) {
                    err = new TypeError('No training days returned by getTrainingDays.');
                    return callback(err, null);
                  }

                  let adviceParams = {};
                  adviceParams.user = user;
                  adviceParams.source = 'plangeneration';
                  adviceParams.alternateActivity = null;
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
                        return callback(err, null);
                      }

                      //We need to update metrics for last day as it will not be up to date otherwise.
                      // But if we call it for today we will clear the plannedActivity we just assigned to this day.
                      // So we call it for tomorrow.
                      let nextDateNumeric = util.toNumericDate(moment(trainingDays[trainingDays.length - 1].dateNumeric.toString()).add(1, 'day'));
                      metricsParams.numericDate = nextDateNumeric;
                      metricsParams.metricsType = 'planned';

                      adviceMetrics.updateMetrics(metricsParams, function(err, trainingDay) {
                        if (err) {
                          return callback(err, null);
                        }

                        dbUtil.removePlanGenerationCompletedActivities(user)
                          .then(function() {
                            user.thresholdPowerTestDate = savedThresholdPowerTestDate;
                            return user.save();
                          })
                          .then(function() {
                            // We need to refresh advice for today and tomorrow because
                            // we called updateMetrics when we started which would clear
                            // current advice for these days.
                            return module.exports.refreshAdvice(user, todayTrainingDay);
                          })
                          .then(function() {
                            //remove genPlan notification if it exists
                            let notifications = [{ notificationType: 'plangen', lookup: '' }];
                            return userUtil.updateNotifications(user, notifications, true);
                          })
                          .then(function(response) {
                            let statusMessage = {
                              type: 'success',
                              text: 'We have updated your season.',
                              title: 'Season Update',
                              created: Date.now(),
                              username: user.username
                            };
                            let genPlanresponse = { user: response.user, statusMessage: statusMessage };
                            return callback(null, genPlanresponse);
                          })
                          .catch(function(err) {
                            return callback(err, null);
                          });
                      });
                    } // end eachSeries callback
                  );
                });
              })
              .catch(function(err) {
                //from removePlanGenerationActivities() before eachSeries
                return callback(err, null);
              });
          })
          .catch(function(err) {
            //from copyActualMetricsToPlanned()
            return callback(err, null);
          });
      });
    })
    .catch(function(err) {
      //from getFuturePriorityDays()
      return callback(err, null);
    });
};

module.exports.refreshAdvice = function(user, trainingDay) {
  // if trainingDay is not beyond tomorrow we should update metrics for trainingDay (which will clear future)
  // and then advise for today (maybe) and tomorrow.

  let tdDate = moment(trainingDay.dateNumeric.toString()); //Thu Nov 03 2016 00:00:00 GMT+0000 (UTC)
  let today = util.getTodayInUserTimezone(user);
  let tomorrow = moment(today).add(1, 'day').startOf('day').toDate(); //Fri Nov 04 2016 00:00:00 GMT+0000

  return new Promise(function(resolve, reject) {
    if (tdDate.isAfter(tomorrow)) {
      return resolve(trainingDay);
    }

    let metricsParams = {
      user: user,
      numericDate: trainingDay.dateNumeric,
      metricsType: 'actual'
    };

    // if trainingDay is today, we do not need to update metrics as that will happen in advise.
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

      if (tdDate.isSameOrBefore(today)) {
        //getAdvice for today and tomorrow.
        adviceParams.numericDate = util.toNumericDate(today);

        module.exports.advise(adviceParams, function(err, advisedToday) {
          if (err) {
            return reject(err);
          }

          adviceParams.numericDate = util.toNumericDate(tomorrow);

          module.exports.advise(adviceParams, function(err, advisedTomorrow) {
            if (err) {
              return reject(err);
            }

            if (trainingDay.dateNumeric === advisedToday.dateNumeric) {
              return resolve(advisedToday);
            } else {
              return resolve(trainingDay);
            }
          });
        });
      } else {
        //tdDate is tomorrow -> getAdvice for tomorrow.
        adviceParams.numericDate = util.toNumericDate(tomorrow);

        module.exports.advise(adviceParams, function(err, advisedTomorrow) {
          if (err) {
            return reject(err);
          }

          return resolve(trainingDay);
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

  let metricsParams = {
    user: params.user,
    numericDate: params.numericDate,
    metricsType: util.setMetricsType(params.source),
    source: params.source
  };

  async.series(
    //series of one.
    [
      function(callback) {
        adviceMetrics.updateMetrics(metricsParams, function(err, trainingDay) {
          if (err) {
            return callback(err);
          }

          return callback(null, trainingDay);
        });
      }
    ],
    function(err, results) {
      if (err) {
        return callback(err, null);
      }

      var trainingDay = results[0];
      var plannedActivity = {};
      var source;

      if (params.source === 'requested') {
        //User has requested advice for a specific activity type.
        //We just need to compute load for the requested activity.

        //Create planned activity for requested activity.
        plannedActivity.activityType = params.alternateActivity;
        plannedActivity.source = params.source;
        trainingDay.plannedActivities.push(plannedActivity);

        //Determine load.
        adviceLoad.setLoadRecommendations(params.user, trainingDay, params.source, function(err, recommendation) {
          if (err) {
            return callback(err);
          }

          recommendation.save(function(err) {
            if (err) {
              return callback(err, null);
            }

            return callback(null, recommendation);
          });
        });
      } else {
        //We are advising or planning an activity.

        plannedActivity.source = params.source;
        trainingDay.plannedActivities.push(plannedActivity);

        generateAdvice(params.user, trainingDay, params.source, function(err, recommendation) {
          if (err) {
            return callback(err, null);
          }

          return callback(null, recommendation);
        });
      }
    }
  );
};

// The following is only exported for testing.
module.exports._testGenerateAdvice = generateAdvice;
