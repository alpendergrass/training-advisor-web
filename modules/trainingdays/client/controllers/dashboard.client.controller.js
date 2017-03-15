'use strict';

angular.module('trainingDays')
  .controller('DashboardController', ['$scope', '$location', '$compile', 'Authentication', 'TrainingDays', 'Util', '_', 'moment',
    function($scope, $location, $compile, Authentication, TrainingDays, Util, _, moment) {
      $scope.authentication = Authentication;
      $scope._ = _;

      // var jQuery = window.jQuery;
      // angular.element(document).ready(function() {
      //   jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      // });

      var today = moment().toDate();

      TrainingDays.getAdvice({
        trainingDateNumeric: Util.toNumericDate(today),
        alternateActivity: null
      }, function(trainingDay) {
        trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
        $scope.trainingDayToday = trainingDay;
        $scope.todayFormatted = moment(trainingDay.date).format('dddd, d MMMM YYYY');
        $scope.plannedActivity = Util.getPlannedActivity(trainingDay, 'advised');
      }, function(errorResponse) {
        // TODO: what should we do if error?
        if (errorResponse.data && errorResponse.data.message) {
          // if (errorResponse.data.message === 'Starting date for current training period was not found.') {
          //   // We want to come back here after we create start.
          //   $state.go('trainingDays.createStart', { forwardTo: 'trainingDayView' });
          // } else {
          $scope.error = errorResponse.data.message;
          // }
        } else {
          $scope.error = 'Server error prevented advice retrieval.';
        }
      });

      TrainingDays.getFutureEvents({
        trainingDateNumeric: Util.toNumericDate(today)
      }, function(futureEvents) {
        $scope.futureEvents = futureEvents;
      }, function(errorResponse) {
        // TODO: what should we do if error?
        if (errorResponse.data && errorResponse.data.message) {
          // if (errorResponse.data.message === 'Starting date for current training period was not found.') {
          //   // We want to come back here after we create start.
          //   $state.go('trainingDays.createStart', { forwardTo: 'trainingDayView' });
          // } else {
          $scope.error = errorResponse.data.message;
          // }
        } else {
          $scope.error = 'Server error prevented events retrieval.';
        }
      });



    }
  ]);
