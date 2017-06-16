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

// module.exports.setLoadRecommendations = function(trainingDay, source, callback) {
module.exports.setLoadRecommendations = function(trainingDay, source) {
  return new Promise(function(resolve, reject) {

    // callback = (typeof callback === 'function') ? callback : function(err, data) {};

    if (!trainingDay) {
      err = new TypeError('valid trainingDay is required');
      // return callback(err, null, null);
      return reject(err);
    }

    if (!source) {
      err = new TypeError('valid source is required');
      // return callback(err, null, null);
      return reject(err);
    }

    let plannedActivity = util.getPlannedActivity(trainingDay, source);
    let metrics = util.getMetrics(trainingDay, util.setMetricsType(source));
    setTargetLoads(trainingDay, plannedActivity, metrics);

    // return callback(null, trainingDay);
    return resolve(trainingDay);
  });
};

function setTargetLoads(trainingDay, plannedActivity, metrics) {
  // If user provide load estimate for an event, use that to set target.
  if (plannedActivity.activityType === 'event' && trainingDay.scheduledEventRanking !== 9 && trainingDay.estimatedLoad) {
    plannedActivity.targetMinLoad = Math.round(trainingDay.estimatedLoad * 0.9);
    plannedActivity.targetMaxLoad = Math.round(trainingDay.estimatedLoad * 1.1);
    return;
  }

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
