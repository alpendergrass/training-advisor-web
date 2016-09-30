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

  if (latestPlannedActivity.activityType === 'event' && trainingDay.estimatedLoad > 0) {
    //If an event, use estimated load, if provided, for target.
    latestPlannedActivity.targetMinLoad = trainingDay.estimatedLoad;
    latestPlannedActivity.targetMaxLoad = trainingDay.estimatedLoad;
    return callback(null, trainingDay);
  } else if (latestPlannedActivity.activityType === 'simulation') {
    //We use the goal event estimate for simulations. We have to go find the next goal day.
    dbUtil.getFuturePriorityDays(user, trainingDay.date, 1, adviceConstants.maxDaysToLookAheadForFutureGoals, function(err, goalDays) {
      if (err) {
        return callback(err, null);
      }

      //Note that it is possible that no goal exists or that no estimate was provided.
      if (goalDays.length > 0 && goalDays[0].estimatedLoad) {
        latestPlannedActivity.targetMinLoad = Math.round(0.95 * goalDays[0].estimatedLoad);
        latestPlannedActivity.targetMaxLoad = Math.round(1.05 * goalDays[0].estimatedLoad);
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

  //We have different factors for diffent activity rankings. E.g., ranking of 1 is a goal event. 9 is an off day.
  var activityType = latestPlannedActivity.activityType === 'event' ? latestPlannedActivity.activityType + trainingDay.scheduledEventRanking : latestPlannedActivity.activityType;

  var factorSet = _.find(adviceConstants.loadAdviceLookups, { 'activityType': activityType });

  latestPlannedActivity.targetMinLoad = Math.round(trainingDay.targetAvgDailyLoad * factorSet.lowLoadFactor * trainingDay.rampRateAdjustmentFactor);
  latestPlannedActivity.targetMaxLoad = Math.round(trainingDay.targetAvgDailyLoad * factorSet.highLoadFactor * trainingDay.rampRateAdjustmentFactor);
  // trainingDay.targetIntensity = factorSet.intensity;
}

function computeRampRateAdjustment(trainingDay) {
  // 9/20/16: mucking with the ramp rate the way we were below is causing some weirdness in the advice,
  // at least when looking at the season chart for future days. We were getting some hard days with much lower target loads than
  // the other hard days around them. I think these were the only days where we were not tweaking the ramp rates.
  // I'm going to turn off the adjusting until I have higher confidence in doing this.
  // Perhaps we should only adjust ramp rates when computing current advice, not when doing planGen.
  // I think we also need to compute ramp rates over a longer period as 7 day ramp rate is very sensitive.
  // Use 14 days to compute? Maybe go back to the last rest period if we can figure out what that was.

  // Adjust advice to bring actual ramp rate towards target ramp rate.
  // If below, increase daily targets by % of difference.
  // If above, decrease daily targets by % of difference.
  // Only adjust hard or moderate days.

  var adjustmentFactor = 1;

  //sevenDayRampRate of zero probably means we do not have a prior week to use to compute.
  // if (trainingDay.sevenDayRampRate !== 0 && (latestPlannedActivity.activityType === 'hard' || latestPlannedActivity.activityType === 'moderate')) {
  //   adjustmentFactor = Math.abs((trainingDay.sevenDayTargetRampRate - trainingDay.sevenDayRampRate) / trainingDay.sevenDayTargetRampRate);

  //   // Cap adjustment at limit.
  //   if (adjustmentFactor > adviceConstants.rampRateAdjustmentLimit) {
  //     adjustmentFactor = adviceConstants.rampRateAdjustmentLimit;
  //   }

  //   // If actual rate > target rate, we want to dial it back a bit.
  //   if (trainingDay.sevenDayRampRate > trainingDay.sevenDayTargetRampRate) {
  //     adjustmentFactor = 1 - adjustmentFactor;
  //   } else {
  //     adjustmentFactor = 1 + adjustmentFactor;
  //   }
  // }

  return adjustmentFactor;
}
