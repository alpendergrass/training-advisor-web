'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
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
  err;

module.exports = {};

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

  //TODO: if this remains series of one, convert to object structure for readability.
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
        //We are suggesting an activity.
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
  //each method in the waterfall must return all objects used by subsequent methods
  //even if no changes were made, such as with user.
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
