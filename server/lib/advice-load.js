'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceConstants = require('./advice-constants'),
  latestPlannedActivity,
  err;

module.exports = {};

module.exports.setLoadRecommendations = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  //We are assuming that the last item in the plannedActivities array is the newest and the one 
  //for which we need to compute load.
  latestPlannedActivity = trainingDay.plannedActivities[trainingDay.plannedActivities.length - 1];

  if (latestPlannedActivity.activityType === 'goal' && trainingDay.eventPriority === 1 && trainingDay.estimatedGoalLoad > 0) {
    //If an A event, use estimated load for target.
    latestPlannedActivity.targetMinLoad = trainingDay.estimatedGoalLoad;
    latestPlannedActivity.targetMaxLoad = trainingDay.estimatedGoalLoad;
    return callback(null, trainingDay);
  } else if (latestPlannedActivity.activityType === 'simulation') {
    //We use the goal event estimate for simulations. We have to go find the next goal day.
    dbUtil.getFuturePriorityDays(user, trainingDay.date, 1, adviceConstants.maximumNumberOfDaysToLookAhead, function(err, goalDays) {
      if (err) {
        return callback(err, null);
      }

      //Note that it is possible that no goal exists and no estimate was provided.
      if (goalDays.length > 0 && goalDays[0].estimatedGoalLoad) {
        latestPlannedActivity.targetMinLoad = Math.round(0.95 * goalDays[0].estimatedGoalLoad);
        latestPlannedActivity.targetMaxLoad = Math.round(1.05 * goalDays[0].estimatedGoalLoad);        
      } else {
        setTargetLoads(trainingDay);
      }

      return callback(null, trainingDay);
    });
  }
  else {
    setTargetLoads(trainingDay);
    return callback(null, trainingDay);
  }
};

function setTargetLoads(trainingDay) {
  trainingDay.rampRateAdjustmentFactor = computeRampRateAdjustment(trainingDay);

  var factorSet = _.find(adviceConstants.loadAdviceLookups, { 'activityType': latestPlannedActivity.activityType });

  latestPlannedActivity.targetMinLoad = Math.round(trainingDay.targetAvgDailyLoad * factorSet.lowLoadFactor * trainingDay.rampRateAdjustmentFactor);
  latestPlannedActivity.targetMaxLoad = Math.round(trainingDay.targetAvgDailyLoad * factorSet.highLoadFactor * trainingDay.rampRateAdjustmentFactor);
  // trainingDay.targetIntensity = factorSet.intensity;
}

function computeRampRateAdjustment(trainingDay) {
  // Adjust advice to bring actual ramp rate towards target ramp rate.
  // If below, increase daily targets by % of difference.
  // If above, decrease daily targets by % of difference.  
  // Only adjust hard or moderate days.

  var adjustmentFactor = 1;

  //sevenDayRampRate of zero probably means we do not have a prior week to use to compute.
  if (trainingDay.sevenDayRampRate !== 0 && (latestPlannedActivity.activityType === 'hard' || latestPlannedActivity.activityType === 'moderate')) {
    adjustmentFactor = Math.abs((trainingDay.sevenDayTargetRampRate - trainingDay.sevenDayRampRate) / trainingDay.sevenDayTargetRampRate);

    // Cap adjustment at limit.
    if (adjustmentFactor > adviceConstants.rampRateAdjustmentLimit) {
      adjustmentFactor = adviceConstants.rampRateAdjustmentLimit;
    }

    // If actual rate > target rate, we want to dial it back a bit.
    if (trainingDay.sevenDayRampRate > trainingDay.sevenDayTargetRampRate) {
      adjustmentFactor = 1 - adjustmentFactor;
    } else {
      adjustmentFactor = 1 + adjustmentFactor;
    }
  }

  return adjustmentFactor;
}
