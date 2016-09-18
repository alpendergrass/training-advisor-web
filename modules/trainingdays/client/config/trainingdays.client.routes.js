'use strict';

// Setting up route
angular.module('trainingDays').config(['$stateProvider',
  function ($stateProvider) {
    // TrainingDays state routing
    $stateProvider
      .state('season', {
        url: '/season',
        templateUrl: 'modules/trainingDays/client/views/season-trainingdays.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('calendar', {
        url: '/calendar',
        templateUrl: 'modules/trainingDays/client/views/calendar-trainingdays.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays', {
        abstract: true,
        url: '/trainingDays',
        template: '<ui-view/>'
      })
      .state('trainingDays.list', {
        url: '/list',
        templateUrl: 'modules/trainingDays/client/views/list-trainingdays.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.createStart', {
        url: '/createStart',
        templateUrl: 'modules/trainingDays/client/views/create-start-trainingday.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.trueUp', {
        url: '/trueUp',
        templateUrl: 'modules/trainingDays/client/views/true-up-trainingday.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.createEvent', {
        url: '/createEvent',
        params: {
          scheduledEventRanking : null
        },
        templateUrl: 'modules/trainingDays/client/views/create-event-trainingday.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.getAdvice', {
        url: '/getAdvice/:trainingDate',
        templateUrl: 'modules/trainingDays/client/views/get-advice.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.view', {
        url: '/:trainingDayId',
        templateUrl: 'modules/trainingDays/client/views/view-trainingday.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });
  }
]);
