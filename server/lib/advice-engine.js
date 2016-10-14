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
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  err;

function generateAdvice(user, trainingDay, callback) {

  var facts = {};

  dbUtil.didWeGoHardTheDayBefore(user, trainingDay.date, function(err, wentHard) {
    if (err) {
      return callback(err, null, null);
    }

    facts.trainingState = null;
    facts.adviceConstants = adviceConstants;
    facts.wentHardYesterday = wentHard;
    facts.testingIsDue = adviceUtil.isTestingDue(user, trainingDay);
    facts.todayDayOfWeek = moment.tz(trainingDay.date, user.timezone).day().toString();
    facts.tomorrowDayOfWeek = moment.tz(trainingDay.date, user.timezone).add(1, 'days').day().toString();
    facts.trainingDay = trainingDay;

    var R = new RuleEngine(adviceEvent.eventRules);
    R.register(adviceTest.testRules);
    R.register(adviceRest.restRules);
    R.register(adviceEasy.easyRules);
    R.register(adviceModerate.moderateRules);
    R.register(adviceSimulation.simulationRules);
    R.register(adviceChoice.choiceRules);
    R.register(adviceHard.hardRules);

    R.execute(facts,function(result){
      adviceLoad.setLoadRecommendations(user, trainingDay, function(err, trainingDay) {
        if (err) {
          return callback(err);
        }

        trainingDay.save(function(err) {
          if (err) {
            return callback(err, null);
          } else {
            return callback(null, trainingDay);
          }
        });
      });
    });
  });

}

function generateActivityFromAdvice(params, callback) {
  //We do this to allow us to generate a plan.
  //The assumption is that the user will execute the advice to the letter.

  var completedActivity = {},
    trainingDay = params.trainingDay,
    user = params.user;

  if (trainingDay.plannedActivities[0] && trainingDay.plannedActivities[0].source === 'advised') {
    completedActivity.load = ((trainingDay.plannedActivities[0].targetMaxLoad - trainingDay.plannedActivities[0].targetMinLoad) / 2) + trainingDay.plannedActivities[0].targetMinLoad;
    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);

    //By setting fitness and fatigue to zero we trigger recomputation of metrics for this day
    //when updateMetrics is called for the following day.
    //We should not do this if this is a start or true-up day as F&F were set by user.
    if (!trainingDay.startingPoint && !trainingDay.fitnessAndFatigueTrueUp) {
      trainingDay.fitness = 0;
      trainingDay.fatigue = 0;
    }

    trainingDay.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      if (trainingDay.plannedActivities[0].activityType === 'test') {
        //Make it look as if the user tested when recommended.
        user.thresholdPowerTestDate = trainingDay.date;
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
  if (!params.trainingDate) {
    err = new TypeError('trainingDate is required');
    return callback(err, null);
  }

  var trainingDate = new Date(params.trainingDate),
    user = params.user,
    adviceParams = {},
    savedThresholdPowerTestDate = user.thresholdPowerTestDate,
    goalDay,
    statusMessage = {
      type: '',
      text: '',
      title: 'Season Update',
      created: Date.now(),
      username: user.username
    };

  //TODO: Make the following a async.series, use EC6 promises or something to clean it up. Yuck.

  //As a precaution we remove all planning activities.
  //If we errored out last time there could be some left over planning activities.
  dbUtil.removePlanningActivities(user, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    dbUtil.getFuturePriorityDays(user, trainingDate, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd, function(err, goalDays) {
      if (err) {
        return callback(err, null);
      }

      if (goalDays.length < 1) {
        err = new TypeError('A goal is required in order to generate a season view.');
        return callback(err, null);
      }

      //Use last goal to generate plan.
      goalDay = goalDays[goalDays.length - 1];

      //I don't think we should have to call updateMetrics here.
      //But we will just in case.
      adviceMetrics.updateMetrics(params, function(err, td) {
        if (err) {
          return callback(err, null);
        }

        //get all training days from trainingDate thru goal.
        dbUtil.getTrainingDays(user, trainingDate, goalDay.date, function(err, trainingDays) {
          if (err) {
            return callback(err, null);
          }

          if (trainingDays.length < 1) {
            err = new TypeError('No training days returned by getTrainingDays.');
            return callback(err, null);
          }

          //if today has a ride, start with tomorrow, else start with today.
          if (trainingDays[0].completedActivities.length > 0) {
            trainingDays.shift();
          }

          async.eachSeries(trainingDays, function(trainingDay, callback) {
            adviceParams = {
              user: user,
              trainingDate: trainingDay.date,
              // alertUser: false,
              genPlan: true
            };

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

              dbUtil.removePlanningActivities(user, function(err, rawResponse) {
                if (err) {
                  return callback(err, null);
                }

                //We need to update metrics for last day as it will not be up to date otherwise.
                adviceParams.trainingDate = trainingDays[trainingDays.length - 1].date;
                adviceParams.trainingDay = null;

                adviceMetrics.updateMetrics(adviceParams, function(err, td) {
                  if (err) {
                    return callback(err, null);
                  }

                  user.thresholdPowerTestDate = savedThresholdPowerTestDate;
                  user.planGenNeeded = false;

                  user.save(function(err) {
                    if (err) {
                      return callback(err, null);
                    }

                    statusMessage.text = 'We have updated your season.';
                    statusMessage.type = 'success';
                    return callback(null, statusMessage);
                  });
                });
              });
            }
          );
        });
      });
    });
  });
};

module.exports.advise = function(params, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!params.user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!params.trainingDate) {
    err = new TypeError('trainingDate is required');
    return callback(err, null);
  }

  var trainingDate = new Date(params.trainingDate),
    user = params.user;

  if (!moment(trainingDate).isValid()) {
    err = new TypeError('trainingDate ' + params.trainingDate + ' is not a valid date');
    return callback(err, null);
  }

  async.series(
    //series of one.
    [
      function(callback) {
        adviceMetrics.updateMetrics(params, function(err, trainingDay) {
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

      var trainingDay = results[0],
        plannedActivities,
        statusMessage = {};

      if (!params.alternateActivity) {
        //We are advising an activity.
        //Replace any existing plannedActivities.
        plannedActivities = [];
        plannedActivities[0] = {};
        plannedActivities[0].activityType = '';
        plannedActivities[0].source = 'advised';
        trainingDay.plannedActivities = plannedActivities;

        generateAdvice(user, trainingDay, function(err, recommendation) {
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
      } else {
        //User has requested advice for a specific activity type.
        //We just need to compute load for the requested activity.

        //Remove any previously requested specific activity advice.
        plannedActivities = _.filter(trainingDay.plannedActivities, function(activity) {
          return activity.source !== 'requested';
        });

        //Create planned activity for requested activity.
        var plannedActivity = {};
        plannedActivity.activityType = params.alternateActivity;
        plannedActivity.source = 'requested';
        plannedActivities.push(plannedActivity);
        trainingDay.plannedActivities = plannedActivities;

        //Determine load.
        adviceLoad.setLoadRecommendations(user, trainingDay, function(err, recommendation) {
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
      }
    }
  );
};

// The following is only exported for testing.
module.exports._testGenerateAdvice = generateAdvice;
