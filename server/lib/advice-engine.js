'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceMetrics = require('./advice-metrics'),
  adviceGoal = require('./advice-goal'),
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

  if (!params.startDate) {
    err = new TypeError('startDate is required');
    return callback(err, null);
  }

  var startDate = new Date(params.startDate),
    user = params.user,
    adviceParams = {},
    savedThresholdPowerTestDate = user.thresholdPowerTestDate,
    statusMessage = {
      type: '',
      text: '',
      title: 'Training Plan Update',
      created: Date.now(),
      username: user.username
    };

  dbUtil.getNextPriorityDay(user, startDate, 1, adviceConstants.maximumNumberOfTrainingDays, function(err, goalDay) {
    if (err) {
      return callback(err, null);
    }

    //TODO: do not require a goal.
    if (!goalDay) {
      err = new TypeError('A goal is required in order to compute a plan.');
      return callback(err, null);
    }

    adviceMetrics.updateMetrics(user, startDate, function(err, td) {
      if (err) {
        return callback(err, null);
      }

      //get all training days from startDate thru goal.
      dbUtil.getTrainingDays(user, startDate, goalDay.date, function(err, trainingDays) {
        if (err) {
          return callback(err, null);
        }

        if (trainingDays.length < 1) {
          return callback(null, null);
        }

        //if today has a ride, start with tomorrow, else start with today.
        if (trainingDays[0].completedActivities.length > 0) {
          trainingDays.shift(); 
          startDate = moment(startDate).add('1', 'day').toDate();
        }

        async.eachSeries(trainingDays, function(trainingDay, callback) {
          adviceParams = {
            user: user,
            trainingDate: trainingDay.date
          };

          module.exports.advise(adviceParams, function (err, trainingDay) {
            if (err) {
              return callback(err);
            }

            //TODO: We should only do this for future dates.
            generateActivityFromAdvice(user, trainingDay, function(err, trainingDay) {
              if (err) {
                return callback(err);
              }

              return callback();
            });
          });
        }, 
          function(err) {
            if (err) {
              return callback(err,null);
            }

            dbUtil.removePlanningActivities(user, startDate, function(err, rawResponse) {
              if (err) {
                return callback(err, null);
              }

              user.thresholdPowerTestDate = savedThresholdPowerTestDate; 
              user.save(function (err) {
                if (err) {
                  return callback(err, null);
                } 

                statusMessage.text = 'We have updated your training plan.';
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

  // var trainingDate = moment(params.trainingDate, moment.ISO_8601, true); 
  var trainingDate = new Date(params.trainingDate); 

  if (!moment(trainingDate).isValid()) {
    err = new TypeError('trainingDate ' + params.trainingDate + ' is not a valid date');
    return callback(err, null);
  }

  //TODO: if this remains series of one, perhaps convert to object structure for readability.
  async.series(
    [
      function(callback) {
        adviceMetrics.updateMetrics(params.user, trainingDate, function(err, trainingDay) {
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
        plannedActivities;

      if (!params.alternateActivity) {
        //We are advising an activity.
        //Replace any existing plannedActivities.
        plannedActivities = [];
        plannedActivities[0] = {};
        plannedActivities[0].activityType = '';
        plannedActivities[0].source = 'advised';
        trainingDay.plannedActivities = plannedActivities;

        generateAdvice(params.user, trainingDay, function(err, recommendation) {
          if (err) {
            return callback(err, null);
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
        // console.log('trainingDay:' + trainingDay);
        trainingDay.plannedActivities = plannedActivities;

        //Determine load. 
        adviceLoad.setLoadRecommendations(params.user, trainingDay, function(err, recommendation) {
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
    async.apply(adviceGoal.checkGoal, user, trainingDay),
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
          trainingDay.plannedActivities[0].advice += ' You are in transition. You goal for your ride today should be to have fun. Go hard or mellow, your call.';   
        } else if (trainingDay.period === 'peak') {
          trainingDay.plannedActivities[0].activityType = 'hard';
          trainingDay.plannedActivities[0].rationale += ' Is peak period, recommending hard ride but load will be smaller than typical hard ride.';             
          trainingDay.plannedActivities[0].advice += ' You are peaking for your goal event. You should do a short but intense ride today.';   
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

function generateActivityFromAdvice(user, trainingDay, callback) {
  var completedActivity = {};

  if (trainingDay.plannedActivities[0] && trainingDay.plannedActivities[0].source === 'advised') {
    completedActivity.load = ((trainingDay.plannedActivities[0].targetMaxLoad - trainingDay.plannedActivities[0].targetMinLoad) / 2) + trainingDay.plannedActivities[0].targetMinLoad;
    completedActivity.source = 'plangeneration';
    trainingDay.completedActivities.push(completedActivity);
    trainingDay = adviceMetrics.assignLoadRating(trainingDay);

    trainingDay.save(function (err) {
      if (err) {
        return callback(err, null);
      }

      adviceMetrics.updateMetrics(user, trainingDay.date, function(err, trainingDay) {
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
