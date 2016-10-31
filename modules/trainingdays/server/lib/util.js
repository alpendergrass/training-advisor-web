'use strict';

var _ = require('lodash');

module.exports = {};

module.exports.getMetrics = function(trainingDay, metricsType) {
  //metricsType planned|actual
  return _.find(trainingDay.metrics, ['metricsType', metricsType]);
};

module.exports.getPlannedActivity = function(trainingDay, source) {
  return _.find(trainingDay.plannedActivities, ['source', source]);
};

module.exports.setMetricsType = function(source) {
  //plannedActivitySources advised|requested|plangeneration
  //metricsType planned|actual
  switch (source) {
    case 'advised':
      return 'actual';
    case 'requested':
      return 'actual';
    case 'plangeneration':
      return 'planned';
    default:
      return 'actual';
  }
};


