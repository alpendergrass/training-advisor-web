'use strict';

var path = require('path'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceConstants = require('./advice-constants'),
  err;


module.exports = {};

module.exports.setLoadRecommendations = function(user, trainingDay, source, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (!source) {
    err = new TypeError('valid source is required');
    return callback(err, null, null);
  }

  let plannedActivity = util.getPlannedActivity(trainingDay, source);
  let metrics = util.getMetrics(trainingDay, util.setMetricsType(source));
  setTargetLoads(trainingDay, plannedActivity, metrics);

  return callback(null, trainingDay);
};

function setTargetLoads(trainingDay, plannedActivity, metrics) {
  metrics.rampRateAdjustmentFactor = computeRampRateAdjustment(trainingDay, plannedActivity, metrics);

  //We have different factors for different activity rankings. E.g., ranking of 1 is a goal event. 9 is an off day.
  var activityType = plannedActivity.activityType === 'event' ? plannedActivity.activityType + trainingDay.scheduledEventRanking : plannedActivity.activityType;

  var factorSet = _.find(adviceConstants.loadAdviceLookups, { 'activityType': activityType });

  plannedActivity.targetMinLoad = Math.round(metrics.targetAvgDailyLoad * factorSet.lowLoadFactor * metrics.rampRateAdjustmentFactor);
  plannedActivity.targetMaxLoad = Math.round(metrics.targetAvgDailyLoad * factorSet.highLoadFactor * metrics.rampRateAdjustmentFactor);
}

function computeRampRateAdjustment(trainingDay, plannedActivity, metrics) {
  // Adjust advice to bring average ramp rate towards target ramp rate.
  // If below, increase daily targets by % of difference.
  // If above, decrease daily targets by % of difference.
  // Only adjust hard or moderate days.
  // Do not adjust planned loads.

  var adjustmentFactor = 1;

  if (metrics.metricsType === 'planned') {
    return adjustmentFactor;
  }

  if (metrics.sevenDayAverageRampRate !== 0 && (plannedActivity.activityType === 'hard' || plannedActivity.activityType === 'moderate')) {
    adjustmentFactor = Math.abs((metrics.sevenDayTargetRampRate - metrics.sevenDayAverageRampRate) / metrics.sevenDayTargetRampRate);

    // Cap adjustment at limit.
    if (adjustmentFactor > adviceConstants.rampRateAdjustmentLimit) {
      adjustmentFactor = adviceConstants.rampRateAdjustmentLimit;
    }

    // If actual rate > target rate, we want to dial it back a bit.
    if (metrics.sevenDayAverageRampRate > metrics.sevenDayTargetRampRate) {
      adjustmentFactor = 1 - adjustmentFactor;
    } else {
      adjustmentFactor = 1 + adjustmentFactor;
    }
  }

  return adjustmentFactor;
}
