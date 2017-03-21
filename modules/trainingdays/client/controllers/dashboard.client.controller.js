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
      var tomorrow = moment().add(1, 'day').toDate();

      TrainingDays.getAdvice({
        trainingDateNumeric: Util.toNumericDate(today),
        alternateActivity: null
      }, function(trainingDayToday) {
        trainingDayToday.date = moment(trainingDayToday.dateNumeric.toString()).toDate();
        $scope.trainingDayToday = trainingDayToday;
        $scope.todayFormatted = moment(trainingDayToday.date).format('dddd, d MMMM YYYY');
        $scope.plannedActivityToday = Util.getPlannedActivity(trainingDayToday, 'advised');
        $scope.plannedActivityDescriptionToday = Util.getPlannedActivityDescription($scope.plannedActivityToday, trainingDayToday.scheduledEventRanking);

        TrainingDays.getAdvice({
          trainingDateNumeric: Util.toNumericDate(tomorrow),
          alternateActivity: null
        }, function(trainingDayTomorrow) {
          trainingDayTomorrow.date = moment(trainingDayTomorrow.dateNumeric.toString()).toDate();
          $scope.trainingDayTomorrow = trainingDayTomorrow;
          $scope.tomorrowFormatted = moment(trainingDayTomorrow.date).format('dddd, d MMMM YYYY');
          $scope.plannedActivityTomorrow = Util.getPlannedActivity(trainingDayTomorrow, 'advised');
          $scope.plannedActivityDescriptionTomorrow = Util.getPlannedActivityDescription($scope.plannedActivityTomorrow, trainingDayTomorrow.scheduledEventRanking);
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
          console.log('errorResponse: ', errorResponse);
        });

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
