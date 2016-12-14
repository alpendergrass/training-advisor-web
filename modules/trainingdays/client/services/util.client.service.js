'use strict';

angular.module('trainingDays').service('Util', ['_',
  function (_) {
    var getMetrics = function(trainingDay, metricsType) {
      return _.find(trainingDay.metrics, ['metricsType', metricsType]);
    };

    var getPlannedActivity = function(trainingDay, source) {
      return _.find(trainingDay.plannedActivities, ['source', source]);
    };

    var mapActivityTypeToVerbiage = function(activityType) {
      var activityTypeVerbiageLookups = [
        {
          activityType: 'choice',
          phrase: 'Choice Day'
        }, {
          activityType: 'rest',
          phrase: 'Rest Day'
        }, {
          activityType: 'easy',
          phrase: 'Low Load Day'
        }, {
          activityType: 'moderate',
          phrase: 'Moderate Load Day'
        }, {
          activityType: 'hard',
          phrase: 'High Load Day'
        }, {
          activityType: 'test',
          phrase: 'Power Testing Day'
        }, {
          activityType: 'event',
          phrase: 'Event'
        }
      ];

      return _.find(activityTypeVerbiageLookups, { 'activityType': activityType }).phrase;
    };

    return {
      getMetrics: getMetrics,
      getPlannedActivity: getPlannedActivity,
      mapActivityTypeToVerbiage: mapActivityTypeToVerbiage
    };
  }
]);