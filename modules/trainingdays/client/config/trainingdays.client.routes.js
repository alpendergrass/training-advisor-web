'use strict';

angular.module('trainingDays').provider('modalState', ['$stateProvider', function($stateProvider) {
  var provider = this;

  this.$get = function() {
    return provider;
  };

  this.state = function(stateName, options) {
    function getOptionKeyValue(key, val) {
      options.resolve[key] = function() {
        return val;
      };
    }

    var modalInstance;

    options.onEnter = onEnter;
    options.onExit = onExit;

    if (!options.resolve) {
      options.resolve = [];
    }

    var resolveKeys = angular.isArray(options.resolve) ? options.resolve : Object.keys(options.resolve);

    $stateProvider.state(stateName, omit(options, ['template', 'templateUrl', 'controller', 'controllerAs']));
    onEnter.$inject = ['$uibModal', '$state', '$timeout', '$log'].concat(resolveKeys);

    function onEnter($modal, $state, $timeout, $log) {
      options.resolve = {};

      for (var i = onEnter.$inject.length - resolveKeys.length; i < onEnter.$inject.length; i++) {
        getOptionKeyValue(onEnter.$inject[i], arguments[i]);
      }

      $timeout(function() { // to let populate $stateParams
        modalInstance = $modal.open(options);
        modalInstance.result
          .finally(function() {
            $timeout(function() { // to let populate $state.$current
              if ($state.$current.name === stateName)
                $state.go(options.parent || '^', {}, { reload: options.reloadParent });
            });
          });
      });
    }

    function onExit() {
      if (modalInstance)
        modalInstance.close();
    }

    return provider;
  };

  // TODO: replace with lodash function.
  function omit(object, forbidenKeys) {
    var prunedObject = {};
    for (var key in object)
      if (forbidenKeys.indexOf(key) === -1)
        prunedObject[key] = object[key];
    return prunedObject;
  }
}]);


angular.module('trainingDays').config(['$stateProvider', 'modalStateProvider',
  function($stateProvider, modalStateProvider) {
    $stateProvider
      .state('dashboard', {
        url: '/dashboard',
        templateUrl: 'modules/trainingDays/client/views/dashboard.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
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
          forwardTo: null
        },
        templateUrl: 'modules/trainingDays/client/views/create-start.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.createEvent', {
        url: '/createEvent',
        params: {
          scheduledEventRanking: null
        },
        templateUrl: 'modules/trainingDays/client/views/create-event.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      })
      .state('trainingDays.getAdvice', {
        url: '/getAdvice/:trainingDateNumeric',
        templateUrl: 'modules/trainingDays/client/views/get-advice.client.view.html',
        data: {
          roles: ['user', 'admin']
        }
      });

    modalStateProvider
      .state('trainingDays.syncActivities', {
        backdrop: 'static', // click on backdrop does not close modal.
        reloadParent: true,
        url: '/syncActivities',
        parent: 'dashboard',
        templateUrl: '/modules/trainingdays/client/views/partials/sync-activities.client.view.html',
        controller: ['$scope', '$uibModalInstance', '_', 'moment', 'toastr', 'Authentication', 'TrainingDays', 'Util',
          function($scope, $uibModalInstance, _, moment, toastr, Authentication, TrainingDays, Util) {
            var notificationTypes = _.flatMap(Authentication.user.notifications, function(n) { return n.notificationType; });
            $scope.syncAdvised = _.includes(notificationTypes, 'stravasync');
            $scope.replaceExisting = false;

            $scope.syncActivities = function() {
              if (Authentication.user.ftpLog.length < 1) {
                toastr.error('You must set <a class="decorated-link" href="/settings/profile">Functional Threshold Power</a> before you can get Strava activities.', { allowHtml: true, timeOut: 7000 });
                return;
              }
              toastr.info('Strava sync started. We will notify you when completed.', 'Strava Sync', { timeOut: 6000 });
              TrainingDays.downloadAllActivities({
                todayNumeric: Util.toNumericDate(moment()),
                replaceExisting: $scope.replaceExisting
              }, function(response) {
                Authentication.user = response.user;
                toastr[response.message.type](response.message.text, response.message.title, { timeOut: 6000 });
              }, function(errorResponse) {
                console.log('errorResponse: ', errorResponse);
                toastr.error(errorResponse.data.message, { timeOut: 7000 });
              });

              $uibModalInstance.close();
            };
            $scope.cancelSync = function() {
              $uibModalInstance.dismiss('cancel');
            };
          }],
        resolve: {}
      });
  }
]);
