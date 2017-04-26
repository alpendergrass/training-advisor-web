'use strict';

angular.module('trainingDays')
  .controller('DashboardController', ['$scope', '$location', '$compile', 'Authentication', 'TrainingDays', 'Season', 'Util', '_', 'moment',
    function($scope, $location, $compile, Authentication, TrainingDays, Season, Util, _, moment) {
      $scope.authentication = Authentication;
      $scope._ = _;

      Season.getSeason(function(errorMessage, season) {
        if (season) {
          // Reload user object as notifications may have been updated.
          Authentication.user = season.user;
        }
      });

      var today = moment().toDate();
      var tomorrow = moment().add(1, 'day').toDate();
      var yesterday = moment().subtract(1, 'day').toDate();

      TrainingDays.getDay({
        trainingDateNumeric: Util.toNumericDate(yesterday)
      }, function(trainingDayYesterday) {
        trainingDayYesterday.date = moment(trainingDayYesterday.dateNumeric.toString()).toDate();
        $scope.trainingDayYesterday = trainingDayYesterday;
        $scope.yesterdayFormatted = moment(trainingDayYesterday.date).format('dddd, D MMMM YYYY');
        $scope.yesterdayMetrics = Util.getMetrics($scope.trainingDayYesterday, 'actual');
      }, function(errorResponse) {
        if (errorResponse.data && errorResponse.data.message) {
          $scope.error = errorResponse.data.message;
        } else {
          $scope.error = 'Server error prevented training day retrieval.';
        }
      });

      TrainingDays.refreshAdvice({
        trainingDateNumeric: Util.toNumericDate(today)
      }, function(response) {
        var trainingDayToday = response.advisedToday;
        trainingDayToday.date = moment(trainingDayToday.dateNumeric.toString()).toDate();
        $scope.trainingDayToday = trainingDayToday;
        $scope.todayFormatted = moment(trainingDayToday.date).format('dddd, D MMMM YYYY');
        $scope.plannedActivityToday = Util.getPlannedActivity(trainingDayToday, 'advised');
        $scope.plannedActivityDescriptionToday = Util.getPlannedActivityDescription($scope.plannedActivityToday, trainingDayToday.scheduledEventRanking);
        $scope.requestedActivityToday = Util.getPlannedActivity(trainingDayToday, 'requested');
        $scope.todayMetrics = Util.getMetrics($scope.trainingDayToday, 'actual');

        var trainingDayTomorrow = response.advisedTomorrow;
        trainingDayTomorrow.date = moment(trainingDayTomorrow.dateNumeric.toString()).toDate();
        $scope.trainingDayTomorrow = trainingDayTomorrow;
        $scope.tomorrowFormatted = moment(trainingDayTomorrow.date).format('dddd, D MMMM YYYY');
        $scope.plannedActivityTomorrow = Util.getPlannedActivity(trainingDayTomorrow, 'advised');
        $scope.plannedActivityDescriptionTomorrow = Util.getPlannedActivityDescription($scope.plannedActivityTomorrow, trainingDayTomorrow.scheduledEventRanking);
        $scope.requestedActivityTomorrow = Util.getPlannedActivity(trainingDayTomorrow, 'requested');
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
          $scope.error = 'Server error prevented refreshAdvice.';
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

      var getWeeklyLoad = function(doc) {
        return doc.totalLoadWeekly;
      };

      var getLabel = function(doc) {
        // Set date to the ISO first day of the week (Monday).
        return moment(doc._id.year + '-' + doc._id.week, 'GGGG-W').format('D MMM YY');
      };

      TrainingDays.getLoadSummary({
        trainingDateNumeric: Util.toNumericDate(today)
      }, function(results) {
        var plannedLoadSummary = _.filter(results.loadSummary, ['_id.metricsType', 'planned']);
        var planedLoadArray = _.flatMap(plannedLoadSummary, getWeeklyLoad);
        var actualLoadSummary = _.filter(results.loadSummary, ['_id.metricsType', 'actual']);
        var actualLoadArray = _.flatMap(actualLoadSummary, getWeeklyLoad);

        $scope.loadData = [actualLoadArray, planedLoadArray];
        $scope.loadLabels = _.flatMap(actualLoadSummary, getLabel);
        $scope.loadSeries = ['Actual', 'Planned'];
        $scope.loadOptions = { legend: { display: true } };

      }, function(errorResponse) {
        // TODO: what should we do if error?
        if (errorResponse.data && errorResponse.data.message) {
          $scope.error = errorResponse.data.message;
        } else {
          $scope.error = 'Server error prevented events retrieval.';
        }
      });
    }
  ]);
