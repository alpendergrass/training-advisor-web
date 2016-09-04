'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.checkGoal = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== ''){  
    return callback(null, user, trainingDay);          
  }

  if (trainingDay.eventPriority > 0) {
    switch (trainingDay.eventPriority) {
      case 1:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 1 (goal) event.';
        trainingDay.plannedActivities[0].advice += ' Today is a goal event. Give it your all. Good luck!';
        trainingDay.plannedActivities[0].activityType = 'goal';
        break;
      case 2:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 2 (medium priority) event.';
        if (trainingDay.period === 'peak') {
          trainingDay.plannedActivities[0].rationale += ' In peak period. Goal event is ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          trainingDay.plannedActivities[0].advice += ' You have a medium priority event scheduled for today.';
          trainingDay.plannedActivities[0].advice += ' However, your next goal event is only ' + trainingDay.daysUntilNextGoalEvent + ' days away. ';
          if (trainingDay.daysUntilNextGoalEvent < adviceConstants.priority2EventCutOffThreshold) {
            trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
            trainingDay.plannedActivities[0].advice += ' You should skip this event.';
          } else {
            trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
            trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will not compromise your goal.';
          }
        } else {
          trainingDay.plannedActivities[0].advice += ' Today is a medium priority event.';
          trainingDay.plannedActivities[0].advice += ' If you feel good go for the podium but if you do not have the legs, sit in. You do not want to risk your season today.';
          trainingDay.plannedActivities[0].activityType = 'goal';
        }
        break;
      case 3:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 3 (low priority) event.';
        if (trainingDay.period === 'peak') {
          trainingDay.plannedActivities[0].rationale += ' In peak period. Goal event is ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          trainingDay.plannedActivities[0].advice += ' You have a low priority event scheduled for today.';
          trainingDay.plannedActivities[0].advice += ' However, your next goal event is only ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          if (trainingDay.daysUntilNextGoalEvent < adviceConstants.priority3EventCutOffThreshold) {
            trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
            trainingDay.plannedActivities[0].advice += ' You should skip this event.';
          } else {
            trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
            trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will help you prepare for your goal event.';
          }
        } else {
          trainingDay.plannedActivities[0].advice += ' Today is a low priority event. Your primary objective today is to get a quality, race-pace workout. If you feel good go hard but if not, sit in or drop out. Race results are not important. Remember that your future goals are the reason you are riding today.';
          trainingDay.plannedActivities[0].activityType = 'goal';
        }
        break;
    }
  }
  
  return callback(null, user, trainingDay);          
};
