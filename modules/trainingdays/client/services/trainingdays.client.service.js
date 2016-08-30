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
      getAdvice: {
        method: 'GET',
        url: 'api/trainingDays/getAdvice/:trainingDate',
        params: { alternateActivity: '' }
      },
      getPlan: {
        method: 'GET',
        url: 'api/trainingDays/getPlan/:startDate'
      },
      downloadActivities: {
        method: 'GET',
        url: 'api/trainingDays/downloadActivities/:trainingDayId',
        params: { provider: '' }
      }
    });
  }
]);
