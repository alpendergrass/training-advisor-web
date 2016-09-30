'use strict';


var _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  async = require('async'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceUtil = require('./advice-util'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.checkRest = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== '') {
    return callback(null, user, trainingDay);
  }

  async.waterfall([
    async.apply(isThisAPreferredRestDay, user, trainingDay),
    areWeSufficientlyFatiguedToNeedRest,
    isRestNeededInPrepForGoalEvent,
    isRestNeededInPrepForPriority2Event,
    isRestNeededInPrepForTesting
  ],
    function(err, user, trainingDay) {
      if (err) {
        return callback(err, null, null);
      }

      return callback(null, user, trainingDay);
    }
  );
};

function isThisAPreferredRestDay(user, trainingDay, callback) {

  if (_.indexOf(user.preferredRestDays, moment(trainingDay.date).day().toString()) > -1) {
    trainingDay.plannedActivities[0].rationale += ' Is a preferred rest day.';
    trainingDay.plannedActivities[0].advice += ' Today is one of your planned rest days, so rest.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function areWeSufficientlyFatiguedToNeedRest (user, trainingDay, callback) {
  //Has TSB been below lower threshold (default is -30)? For two or more days (?)?

  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.form <= adviceConstants.restNeededThreshold ||
    (trainingDay.period === 'peak' && trainingDay.form <= adviceConstants.restNeededForPeakingThreshold) ||
    (trainingDay.period === 'race' && trainingDay.form <= adviceConstants.restNeededForRacingThreshold)) {
    trainingDay.plannedActivities[0].rationale += ' Sufficiently fatigued to recommend rest.';
    trainingDay.plannedActivities[0].advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForGoalEvent (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextGoalEvent === 2) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended as goal event is in two days.';
    trainingDay.plannedActivities[0].advice += ' Rest is needed as your goal event is in two days. If you ride, go very easy, just loosen the legs.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForPriority2Event (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextPriority2Event === 1) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended as priority 2 event is in one day.';
    trainingDay.plannedActivities[0].advice += ' Rest is recommended as you have a medium priority event tomorrow. If you ride, go easy.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForTesting (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  //Depending on values of various thresholds, we may never get here.
  //E.g., if restNeededForPeakingThreshold is greater than restNeededForTestingThreshold.
  if (trainingDay.period === 'peak' || trainingDay.period === 'race' || trainingDay.period === 'transition') {
    //no testing in peak, race or transition periods.
    return callback(null, user, trainingDay);
  }

  if (adviceUtil.isTestingDue(user, trainingDay) && trainingDay.form <= adviceConstants.restNeededForTestingThreshold) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended in preparation for testing.';
    trainingDay.plannedActivities[0].rationale += ' Rest is needed in preparation for testing, so rest today.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}
