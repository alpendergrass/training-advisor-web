'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  RuleEngine = require('node-rules'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceMetrics = require('./advice-metrics'),
  adviceEvent = require('./advice-event'),
  adviceTest = require('./advice-test'),
  adviceRest = require('./advice-rest'),
  adviceEasy = require('./advice-easy'),
  adviceModerate = require('./advice-moderate'),
  adviceSimulation = require('./advice-simulation'),
  adviceChoice = require('./advice-choice'),
  adviceHard = require('./advice-hard'),
  adviceLoad = require('./advice-load'),
  adviceConstants = require('./advice-constants'),
  adviceUtil = require('./advice-util'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  err;
require('lodash-migrate');

function generateAdvice(user, trainingDay, source, callback) {
  var facts = {};
  var tomorrow = util.toNumericDate(moment(trainingDay.dateNumeric.toString()).add(1, 'day'));
  var metricsType = util.setMetricsType(source);

  dbUtil.getExistingTrainingDayDocument(user, tomorrow)
    .then(function(tomorrowTrainingDay) {
      dbUtil.didWeGoHardTheDayBefore(user, trainingDay.dateNumeric, metricsType, function(err, wentHard) {
        if (err) {
          return callback(err, null, null);
        }

        facts.trainingState = null;
        facts.adviceConstants = adviceConstants;
        facts.wentHardYesterday = wentHard;
        facts.testingIsDue = adviceUtil.isTestingDue(user, trainingDay);
        facts.todayDayOfWeek = moment(trainingDay.dateNumeric.toString()).day().toString();
        facts.tomorrowDayOfWeek = moment(trainingDay.dateNumeric.toString()).add(1, 'day').day().toString();
        facts.trainingDay = trainingDay;
        facts.plannedActivity = util.getPlannedActivity(trainingDay, source);
        facts.metrics = util.getMetrics(trainingDay, metricsType);

        facts.tomorrowTrainingDay = tomorrowTrainingDay;

        var R = new RuleEngine(adviceEvent.eventRules);
        R.register(adviceTest.testRules);
        R.register(adviceRest.restRules);
        R.register(adviceEasy.easyRules);
        R.register(adviceModerate.moderateRules);
        R.register(adviceSimulation.simulationRules);
        R.register(adviceChoice.choiceRules);
        R.register(adviceHard.hardRules);

        R.execute(facts, function(result){
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
    completedActivity.load = ((planActivity.targetMaxLoad - planActivity.targetMinLoad) / 2) + planActivity.targetMinLoad;
    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);
    trainingDay.planLoad = completedActivity.load;

    //By setting fitness and fatigue to zero we trigger recomputation of metrics for this day
    //when updateMetrics is called for the following day.
    //Do not want to zero out a starting point though.
    //This issue will go away once we start plan gen with tomorrow always
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

  params.source = 'plangeneration';

  var user = params.user,
    adviceParams = _.clone(params),
    savedThresholdPowerTestDate = user.thresholdPowerTestDate,
    goalDay,
    statusMessage = {
      type: '',
      text: '',
      title: 'Season Update',
      created: Date.now(),
      username: user.username
    };

  // Make the following a async.series, use promises or something to clean it up. Yuck.

  // Get future goal days.
  dbUtil.getFuturePriorityDays(user, params.numericDate, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd, function(err, goalDays) {
    if (err) {
      return callback(err, null);
    }

    if (goalDays.length < 1) {
      err = new TypeError('A goal is required in order to generate a season view.');
      return callback(err, null);
    }

    //Use last goal to generate plan.
    goalDay = goalDays[goalDays.length - 1];

    // TODO: why not start with today's metrics?
    //And shouldn't we recompute actual metrics before we copy? They could be out of date.
    let yesterdayNumeric = util.toNumericDate(moment(params.numericDate.toString()).subtract(1, 'day'));

    dbUtil.copyActualMetricsToPlanned(user, yesterdayNumeric)
      .then(function() {
        //We call updateMetrics here to ensure we have good starting metrics.
        let metricsParams = {
          user: params.user,
          numericDate: params.numericDate,
          metricsType: util.setMetricsType(params.source)
        };
        adviceMetrics.updateMetrics(metricsParams, function(err) {
          if (err) {
            return callback(err, null);
          }

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
                adviceParams.planGenUnderway = true;

                async.eachSeries(trainingDays, function(trainingDay, callback) {
                  adviceParams.numericDate = trainingDay.dateNumeric;
                  adviceParams.trainingDay = null;

                  module.exports.advise(adviceParams, function(err, trainingDay) {
                    if (err) {
                      return callback(err);
                    }

                    adviceParams.trainingDay = trainingDay;

                    generateActivityFromAdvice(adviceParams, function(err, trainingDay) {
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
                    metricsParams.numericDate = trainingDays[trainingDays.length - 1].dateNumeric;

                    adviceMetrics.updateMetrics(metricsParams, function(err, td) {
                      if (err) {
                        return callback(err, null);
                      }

                      dbUtil.removePlanGenerationCompletedActivities(user)
                        .then(function() {
                          user.thresholdPowerTestDate = savedThresholdPowerTestDate;
                          user.planGenNeeded = false;
                          return user.save();
                        })
                        .then(function() {
                          statusMessage.text = 'We have updated your season.';
                          statusMessage.type = 'success';
                          return callback(null, statusMessage);
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
        });
      })
      .catch(function(err) {
        //from copyActualMetricsToPlanned()
        return callback(err, null);
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
    metricsType: util.setMetricsType(params.source)
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
      var plannedActivities = [];
      var source;
      var statusMessage = {};

      //Replace any existing requested, planned or advised activity.
      _.remove(trainingDay.plannedActivities, function(activity) {
        return activity.source === params.source;
      });

      if (params.source === 'requested') {
        //User has requested advice for a specific activity type.
        //We just need to compute load for the requested activity.

        //Create planned activity for requested activity.
        plannedActivity.activityType = params.alternateActivity;
        plannedActivity.source = params.source;
        plannedActivities.push(plannedActivity);
        trainingDay.plannedActivities = plannedActivities;

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

          // if (params.alertUser && !trainingDay.isSimDay) {
          //   statusMessage = {
          //     type: 'info',
          //     text: 'You should update your season.',
          //     title: 'Training Metrics Updated',
          //     created: Date.now(),
          //     username: user.username
          //   };

          //   dbUtil.sendMessageToUser(statusMessage, user);
          // }

          return callback(null, recommendation);
        });
      }
    }
  );
};

// The following is only exported for testing.
module.exports._testGenerateAdvice = generateAdvice;
