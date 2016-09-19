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
      getDay: {
        method: 'GET',
        url: 'api/trainingDays/getDay/:trainingDate'
      },
      getAdvice: {
        method: 'GET',
        url: 'api/trainingDays/getAdvice/:trainingDate',
        params: { alternateActivity: '' }
      },
      getSeason: {
        method: 'GET',
        url: 'api/trainingDays/getSeason/:today',
        isArray: true
      },
      genPlan: {
        method: 'GET',
        url: 'api/trainingDays/genPlan/:trainingDate'
      },
      downloadActivities: {
        method: 'GET',
        url: 'api/trainingDays/downloadActivities/:trainingDayId',
        params: { provider: '' }
      }
    });
  }
]);
