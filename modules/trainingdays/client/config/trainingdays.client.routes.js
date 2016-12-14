'use strict';

angular.module('trainingDays').config(['$stateProvider',
  function ($stateProvider) {
    $stateProvider
      .state('season', {
        url: '/season',
        templateUrl: 'modules/trainingDays/client/views/season.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDayView', {
        url: '/trainingDay/:trainingDayId',
        templateUrl: 'modules/trainingDays/client/views/view.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays', {
        abstract: true,
        url: '/trainingDays',
        template: '<ui-view/>'
      })
      .state('trainingDays.calendar', {
        url: '/calendar',
        templateUrl: 'modules/trainingDays/client/views/calendar.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.list', {
        url: '/list',
        templateUrl: 'modules/trainingDays/client/views/list.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.createStart', {
        url: '/createStart',
        params: {
          forwardTo : null
        },
        templateUrl: 'modules/trainingDays/client/views/create-start.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.trueUp', {
        url: '/trueUp',
        templateUrl: 'modules/trainingDays/client/views/true-up.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.createEvent', {
        url: '/createEvent',
        params: {
          scheduledEventRanking : null
        },
        templateUrl: 'modules/trainingDays/client/views/create-event.client.view.html',
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
      });
  }
]);
