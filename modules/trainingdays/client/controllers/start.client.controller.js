'use strict';

angular.module('trainingDays')
  .controller('StartController', ['$scope', '$state', '$stateParams', '$compile', 'Authentication', 'TrainingDays', 'Util', '_', 'moment', 'toastr',
    function($scope, $state, $stateParams, $compile, Authentication, TrainingDays, Util, _, moment, toastr) {
      $scope.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      });

      $scope._ = _;
      $scope.today = moment().startOf('day').toDate();
      $scope.name = 'Season Start';
      $scope.fitness = 30;
      $scope.fatigue = 30;

      $scope.datePickerStatus = {
        opened: false
      };

      var minStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().subtract(2, 'months').startOf('day').toDate();
      var maxStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;

      $scope.startDate = moment().subtract(30, 'days').startOf('day').toDate();

      $scope.startDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minStartDate,
        maxDate: maxStartDate
      };

      $scope.openDatePicker = function($event) {
        $scope.datePickerStatus.opened = true;
      };

      $scope.createStartingPoint = function(isValid) {
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
          return false;
        }

        var trainingDay = new TrainingDays({
          startingPoint: true,
          dateNumeric: Util.toNumericDate(this.startDate),
          name: this.name,
          actualFitness: this.fitness,
          actualFatigue: this.fatigue,
          notes: this.notes
        });

        trainingDay.$create(function(createdTrainingDay) {
          // Reload user to pick up changes in notifications.
          Authentication.user = createdTrainingDay.user;

          if ($stateParams.forwardTo) {
            $state.go($stateParams.forwardTo);
          } else {
            toastr.success('Your season start day has been created.', 'Start Saved');
            $state.go('trainingDays.syncActivities');
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
    }
  ]);
