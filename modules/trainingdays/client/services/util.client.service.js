'use strict';

angular.module('trainingDays').service('Util', ['$filter', '_', 'moment',
  function($filter, _, moment) {
    var getMetrics = function(trainingDay, metricsType) {
      return _.find(trainingDay.metrics, ['metricsType', metricsType]);
    };

    var getPlannedActivity = function(trainingDay, source) {
      return _.find(trainingDay.plannedActivities, ['source', source]);
    };

    var mapActivityTypeToVerbiage = function(activityType, eventRanking) {
      // Note that eventRanking parm is optional.
      var eventPhrase;

      switch (eventRanking) {
        case 1:
          eventPhrase = 'Goal Event!';
          break;
        case 2:
          eventPhrase = 'Medium Priority Event';
          break;
        case 3:
          eventPhrase = 'Low Priority Event';
          break;
        case 9:
          eventPhrase = 'Off Day';
          break;
        default:
          // Shouldn't get an event activityType with no ranking.
          eventPhrase = 'Training Day';
      }

      var activityTypeVerbiageLookups = [{
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
        phrase: eventPhrase
      }];

      return _.find(activityTypeVerbiageLookups, { 'activityType': activityType }).phrase;
    };

    var mapActivityTypeToLoadVerbiage = function(plannedActivity) {
      var activityLoadVerbiageLookups = [{
        activityType: 'choice',
        phrase: ''
      }, {
        activityType: 'rest',
        phrase: ''
      }, {
        activityType: 'easy',
        phrase: 'Training Load ' + plannedActivity.targetMaxLoad + ' or lower.'
      }, {
        activityType: 'moderate',
        phrase: 'Training Load between ' + plannedActivity.targetMinLoad + ' and ' + plannedActivity.targetMaxLoad + '.'
      }, {
        activityType: 'hard',
        phrase: 'Training Load between ' + plannedActivity.targetMinLoad + ' and ' + plannedActivity.targetMaxLoad + '.'
      }, {
        activityType: 'test',
        phrase: ''
      }, {
        activityType: 'event',
        phrase: ''
      }];

      return _.find(activityLoadVerbiageLookups, { 'activityType': plannedActivity.activityType }).phrase;
    };

    var getPlannedActivityDescription = function(plannedActivity, eventRanking) {
      var description;
      if (plannedActivity) {
        description = {
          namePhrase: mapActivityTypeToVerbiage(plannedActivity.activityType, eventRanking),
          loadPhrase: mapActivityTypeToLoadVerbiage(plannedActivity)
        };
      } else {
        description = {
          namePhrase: '',
          loadPhrase: ''
        };
      }

      return description;
    };

    var toNumericDate = function(date) {
      var dateString = moment(date).format('YYYYMMDD');
      return parseInt(dateString, 10);
    };

    var eventRankings = [
      { value: 0, text: 'Training Day' },
      { value: 1, text: 'Goal Event' },
      { value: 2, text: 'Medium Priority Event' },
      { value: 3, text: 'Low Priority Event' },
      { value: 9, text: 'Off Day' }
    ];

    var getRankingDescription = function(eventRanking) {
      var selected = $filter('filter')(eventRankings, { value: eventRanking });
      return selected.length ? selected[0].text : 'Training Day';
    };

    var eventTerrains = [
      { value: 1, text: 'Flat' },
      { value: 2, text: 'Slightly Hilly' },
      { value: 3, text: 'Hilly' },
      { value: 4, text: 'Very Hilly' },
      { value: 5, text: 'Mountainous' }
    ];

    var getTerrainDescription = function(terrainRanking) {
      var selected = $filter('filter')(eventTerrains, { value: terrainRanking });
      return selected.length ? selected[0].text : 'Not Specified';
    };


    return {
      getMetrics: getMetrics,
      getPlannedActivity: getPlannedActivity,
      mapActivityTypeToVerbiage: mapActivityTypeToVerbiage,
      getPlannedActivityDescription: getPlannedActivityDescription,
      toNumericDate: toNumericDate,
      eventRankings: eventRankings,
      eventTerrains: eventTerrains,
      getRankingDescription: getRankingDescription,
      getTerrainDescription: getTerrainDescription
    };
  }
]);
