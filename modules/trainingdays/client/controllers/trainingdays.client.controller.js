'use strict';

angular.module('trainingDays')
  .controller('TrainingDaysController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$filter', '$uibModal', '$anchorScroll', 'Authentication', 'TrainingDays', 'Season', '_', 'moment', 'toastr', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $filter, $uibModal, $anchorScroll, Authentication, TrainingDays, Season, _, moment, toastr, usSpinnerService, MaterialCalendarData) {
      $scope.authentication = Authentication;
      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover();
      });

      //The following makes lodash available in html.
      $scope._ = _;

      // //Create socket for server-to-client messaging.
      // //Make sure the Socket is connected
      // if (!Socket.socket) {
      //   Socket.connect();
      // }

      // //The following will remove any listeners. We create a new one below.
      // Socket.init();

      // // Add an event listener to the 'trainingDayMessage' event
      // Socket.on('trainingDayMessage', function(message) {
      //   toastr[message.type](message.text, message.title);
      // });

      $scope.today = moment().startOf('day').toDate();
      $scope.adviceDate = $scope.today;

      //Begin Datepicker stuff.
      $scope.datePickerStatus = {
        opened: false
      };

      $scope.openDatePicker = function($event) {
        $scope.datePickerStatus.opened = true;
      };
      //End Datepicker stuff.

      // Check if provider is already in use with current user
      $scope.isConnectedSocialAccount = function(provider) {
        return $scope.authentication.user.provider === provider || ($scope.authentication.user.additionalProvidersData && $scope.authentication.user.additionalProvidersData[provider]);
      };

      var toNumericDate = function(date) {
        var dateString = moment(date).format('YYYYMMDD');
        return parseInt(dateString, 10);
      };

      var getMetrics = function(trainingDay, metricsType) {
        return _.find(trainingDay.metrics, ['metricsType', metricsType]);
      };

      var getPlannedActivity = function(trainingDay, source) {
        return _.find(trainingDay.plannedActivities, ['source', source]);
      };

      var mapActivityTypeToVerbiage = function(activityType) {
        var activityTypeVerbiageLookups = [
          {
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
            phrase: 'Event'
          }
        ];

        return _.find(activityTypeVerbiageLookups, { 'activityType': activityType }).phrase;
      };

      $scope.listTrainingDays = function() {
        // This page is now Admin only.

        var getAllTrainingDays = function(callback) {
          $scope.trainingDaysAll = TrainingDays.query({ clientDate: moment().startOf('day').toDate() }, function() {
            //not sure why Mongo/Mongoose returns a string for a date field but
            //we need trainingDay.date to be a valid date object for comparison purposes in the view.
            _.forEach($scope.trainingDaysAll, function(td) {
              //Note that we are not using dateNumeric here.
              td.date = new Date(td.date);
            });

            if (callback) {
              return callback();
            }
          });
        };

        getAllTrainingDays(function() {
          $scope.trainingDays = $scope.trainingDaysAll;
        });
      };

      $scope.setUpStartingPoint = function() {
        var minStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().subtract(1, 'day').startOf('day').toDate();
        var maxStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;

        $scope.startDate = $scope.today;

        $scope.startDateOptions = {
          formatYear: 'yy',
          startingDay: 1,
          showWeeks: false,
          minDate: minStartDate,
          maxDate: maxStartDate
        };

        $scope.trueUpDateOptions = {
          formatYear: 'yy',
          startingDay: 1,
          showWeeks: false,
          maxDate: maxStartDate
        };

        // Create new starting point of a training season or a true-up day.
        $scope.createStartingPoint = function(isValid, isTrueUp) {
          $scope.error = null;

          if (!isValid) {
            $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
            return false;
          }

          var trainingDay = new TrainingDays({
            startingPoint: !isTrueUp,
            fitnessAndFatigueTrueUp: isTrueUp,
            date: this.startDate,
            name: this.name,
            actualFitness: this.fitness,
            actualFatigue: this.fatigue,
            notes: this.notes
          });

          trainingDay.$create(function(response) {
            // Reload user to pick up changes in notifications.
            Authentication.user = response.user;

            if ($stateParams.forwardTo) {
              $state.go($stateParams.forwardTo);
            } else {
              toastr.success('You should review your profile settings.', 'Start Created', { timeOut: 7000 });
              $state.go('settings.profile');
            }
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented starting point creation.';
            }
          });
        };
      };

      $scope.requestAdvice = function() {
        var minAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;
        var maxAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();

        $scope.getAdvice = function(isValid) {
          $scope.error = null;

          if (!isValid) {
            $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
            return false;
          }

          var getAdviceDate = moment(this.adviceDate).startOf('day').toDate();

          TrainingDays.getAdvice({
            trainingDate: getAdviceDate.toISOString(),
            alternateActivity: null
          }, function(trainingDay) {
            $location.path('trainingDay/' + trainingDay._id);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented advice retrieval.';
            }
          });
        };

        $scope.adviceDateOptions = {
          formatYear: 'yy',
          startingDay: 1,
          showWeeks: false,
          minDate: minAdviceDate,
          maxDate: maxAdviceDate
        };
      };
    }
  ]);
