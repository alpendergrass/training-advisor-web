'use strict';


var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceMetrics = require('./advice-metrics'),
  adviceEvent = require('./advice-event'),
  adviceTest = require('./advice-test'),
  adviceRest = require('./advice-rest'),
  adviceEasy = require('./advice-easy'),
  adviceModerate = require('./advice-moderate'),
  adviceSimulation = require('./advice-simulation'),
  adviceLoad = require('./advice-load'),
  adviceConstants = require('./advice-constants'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  err;

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

  //TODO: Make the following a async.series. maybe.
  //As a precaution we remove all planning activities.
  //If we errored out last time there will be some left over planning activities.
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
              alertUser: false,
              genPlan: true
            };

            module.exports.advise(adviceParams, function (err, trainingDay) {
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

                user.thresholdPowerTestDate = savedThresholdPowerTestDate;
                user.planGenNeeded = false;

                user.save(function (err) {
                  if (err) {
                    return callback(err, null);
                  }

                  statusMessage.text = 'We have updated your season.';
                  statusMessage.type = 'success';
                  dbUtil.sendMessageToUser(statusMessage, params.user);
                  return callback(null, true);
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
        //updateMetrics not needed if we are generating plan as updateMetrics was called in generateActivityFromAdvice for prior day.
        //Wait, it sees it is...though I don't know why.
        // if (params.genPlan) {
        //   dbUtil.getTrainingDayDocument(params.user, params.trainingDate, function(err, trainingDay) {
        //     if (err) {
        //       return callback(err, null);
        //     }

        //     return callback(null, trainingDay);
        //   });
        // } else {
        adviceMetrics.updateMetrics(params, function(err, trainingDay) {
          if (err) {
            return callback(err);
          }

          return callback(null, trainingDay);
        });
      }
      // }
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

          if (params.alertUser && !trainingDay.isSimDay) {
            statusMessage = {
              type: 'info',
              text: 'Training metrics have been updated. You should update your season.',
              title: 'Season Update',
              created: Date.now(),
              username: user.username
            };

            dbUtil.sendMessageToUser(statusMessage, user);
          }

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

          recommendation.save(function (err) {
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

function generateAdvice(user, trainingDay, callback) {
  //Each method in the waterfall must return all objects used by subsequent methods.
  async.waterfall([
    async.apply(adviceEvent.checkEvent, user, trainingDay),
    adviceTest.checkTest,
    adviceRest.checkRest,
    adviceEasy.checkEasy,
    adviceModerate.checkModerate,
    adviceSimulation.checkSimulation
  ],
    function(err, user, trainingDay) {
      if (err) {
        return callback(err, null, null);
      }

      if (trainingDay.plannedActivities[0].activityType === '') {

        if (trainingDay.period === 'transition') {
          trainingDay.plannedActivities[0].activityType = 'choice';
          trainingDay.plannedActivities[0].rationale += ' Is transition period, user can slack off if he/she desires.';
          trainingDay.plannedActivities[0].advice += ' You are in transition. You should take a break from training. Now is a good time for cross-training. If you ride, keep it mellow and fun.';
        } else if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
          trainingDay.plannedActivities[0].activityType = 'hard';
          trainingDay.plannedActivities[0].rationale += ' Is ' + trainingDay.period + ' period, recommending hard ride but load will be smaller than typical hard ride.';
          trainingDay.plannedActivities[0].advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
        } else {
          //Default is a hard workout.
          trainingDay.plannedActivities[0].activityType = 'hard';
          trainingDay.plannedActivities[0].rationale += ' No other recommendation, so hard.';
          trainingDay.plannedActivities[0].advice += ' If you feel up to it you should go hard today. You appear to be sufficiently rested.';
          trainingDay.plannedActivities[0].advice += ' Intensity should be high but will vary based on ride duration.';
        }
      }

      adviceLoad.setLoadRecommendations(user, trainingDay, function(err, trainingDay) {
        if (err) {
          return callback(err);
        }

        trainingDay.save(function (err) {
          if (err) {
            return callback(err, null);
          } else {
            return callback(null, trainingDay);
          }
        });
      });
    }
  );
}

function generateActivityFromAdvice(params, callback) {
  var completedActivity = {},
    trainingDay = params.trainingDay,
    user = params.user;

  if (trainingDay.plannedActivities[0] && trainingDay.plannedActivities[0].source === 'advised') {
    completedActivity.load = ((trainingDay.plannedActivities[0].targetMaxLoad - trainingDay.plannedActivities[0].targetMinLoad) / 2) + trainingDay.plannedActivities[0].targetMinLoad;
    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);
    trainingDay = adviceMetrics.assignLoadRating(trainingDay);

    trainingDay.save(function (err) {
      if (err) {
        return callback(err, null);
      }

      adviceMetrics.updateMetrics(params, function(err, trainingDay) {
        if (err) {
          return callback(err, null);
        }

        if (trainingDay.plannedActivities[0].activityType === 'test') {
          //Make it look as if the user tested when recommended.
          user.thresholdPowerTestDate = trainingDay.date;
          user.save(function (err) {
            if (err) {
              return callback(err, null);
            }

            return callback(null, trainingDay);
          });
        } else {
          return callback(null, trainingDay);
        }
      });
    });
  }
}
