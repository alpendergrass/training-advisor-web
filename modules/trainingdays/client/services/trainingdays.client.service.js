'use strict';

//TrainingDays service used for communicating with the trainingDays REST endpoints
angular.module('trainingDays').factory('TrainingDays', ['$resource',
  function ($resource) {
    return $resource('api/trainingDays/:trainingDayId', {
      trainingDayId: '@_id'
    }, {
      create: {
        method: 'POST'
      },
      update: {
        method: 'PUT'
      },
      getSimDay: {
        method: 'GET',
        url: 'api/trainingDays/getSimDay/:trainingDayId'
      },
      finalizeSim: {
        method: 'GET',
        url: 'api/trainingDays/finalizeSim/:commit'
      },
      getDay: {
        method: 'GET',
        url: 'api/trainingDays/getDay/:trainingDateNumeric'
      },
      getAdvice: {
        method: 'GET',
        url: 'api/trainingDays/getAdvice/:trainingDateNumeric',
        params: { alternateActivity: '' }
      },
      getSeason: {
        method: 'GET',
        url: 'api/trainingDays/getSeason/:todayNumeric',
        isArray: true
      },
      genPlan: {
        method: 'GET',
        url: 'api/trainingDays/genPlan/:trainingDateNumeric',
        params: { isSim: false }
      },
      downloadActivities: {
        method: 'GET',
        url: 'api/trainingDays/downloadActivities/:trainingDayId',
        params: { provider: '' }
      },
      downloadAllActivities: {
        method: 'GET',
        url: 'api/trainingDays/downloadAllActivities/:todayNumeric'
      }
    });
  }
]);
