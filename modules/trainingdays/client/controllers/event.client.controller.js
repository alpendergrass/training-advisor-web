'use strict';

angular.module('trainingDays')
  .controller('EventController', ['$scope', '$state', '$stateParams', '$compile', '$uibModal', 'Authentication', 'TrainingDays', 'Util', '_', 'moment',
    function($scope, $state, $stateParams, $compile, $uibModal, Authentication, TrainingDays, Util, _, moment) {
      $scope.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      });

      $scope.datePickerStatus = {
        opened: false
      };

      $scope.openDatePicker = function($event) {
        $scope.datePickerStatus.opened = true;
      };

      var minEventDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().startOf('day').toDate();

      $scope.eventDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minEventDate
      };

      $scope.recurrenceSpec = null;

      //If the user clicks a Create Goal link we pass in the event priority so no need to ask.
      if ($stateParams.scheduledEventRanking) {
        $scope.scheduledEventRanking = $stateParams.scheduledEventRanking;
        $scope.eventRankingParm = $stateParams.scheduledEventRanking;
      } else {
        $scope.eventRankingParm = 0;
      }

      $scope.$watch('scheduledEventRanking', function(ranking) {
        if (ranking !== 1 && ranking !== 2 && ranking !== 3) {
          $scope.estimatedLoad = 0;
          $scope.eventTerrain = 0;
        }
      });

      $scope.checkRecurrence = function() {
        $scope.recurrenceSpec = null;

        if ($scope.recurs) {
          $scope.openRecurrence($scope.date);
        }
      };

      $scope.openRecurrence = function(eventDate) {
        var modalInstance = $uibModal.open({
          templateUrl: 'recurrance.html',
          controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
            // What is $scope here?
            $scope.recurrenceSpec = {
              daysOfWeek: {}
            };

            $scope.recurrenceSpec.summary = '';

            var minRepeatDate = moment(eventDate).add(1, 'day').startOf('day').toDate();
            var maxRepeatDate = moment().add(52, 'weeks').startOf('day').toDate();

            $scope.repeatDateOptions = {
              formatYear: 'yy',
              startingDay: 1,
              showWeeks: false,
              minDate: minRepeatDate,
              maxDate: maxRepeatDate
            };


            $scope.datePickerStatus = {
              opened: false
            };

            $scope.openDatePicker = function($event) {
              $scope.datePickerStatus.opened = true;
            };

            $scope.noDaysSelected = function() {
              return !_.find($scope.recurrenceSpec.daysOfWeek, function(o) {
                return o === true;
              });
            };

            $scope.formatRepeatSummary = function($event) {
              var dayOfWeek,
                selectedDays = '';

              $scope.recurrenceSpec.summary = '';

              if (parseInt($scope.recurrenceSpec.everyNTimeUnits, 10) === 1) {
                $scope.recurrenceSpec.summary = 'Weekly';
              } else if ($scope.recurrenceSpec.everyNTimeUnits > 1) {
                $scope.recurrenceSpec.summary = 'Every ' + $scope.recurrenceSpec.everyNTimeUnits + ' weeks';
              }

              _.forEach($scope.recurrenceSpec.daysOfWeek, function(value, key) {
                if (value) {
                  dayOfWeek = _.find($scope.daysOfWeek, { 'value': key });
                  selectedDays += dayOfWeek.title + ', ';
                }
              });

              if (selectedDays) {
                $scope.recurrenceSpec.summary += ' on ' + selectedDays.substring(0, selectedDays.length - 2);
              }

              if ($scope.recurrenceSpec.endsOn) {
                $scope.recurrenceSpec.summary += ' until ' + moment($scope.recurrenceSpec.endsOn).format('dddd, MMMM Do YYYY');
              }
            };

            $scope.daysOfWeek = [
              { text: 'S', value: '0', title: 'Sunday' },
              { text: 'M', value: '1', title: 'Monday' },
              { text: 'T', value: '2', title: 'Tuesday' },
              { text: 'W', value: '3', title: 'Wednesday' },
              { text: 'T', value: '4', title: 'Thursday' },
              { text: 'F', value: '5', title: 'Friday' },
              { text: 'S', value: '6', title: 'Saturday' }
            ];

            $scope.saveRecurrence = function() {
              $uibModalInstance.close($scope.recurrenceSpec);
            };

            $scope.cancelRecurrence = function() {
              $uibModalInstance.dismiss('cancel');
            };
          }]
        });

        modalInstance.result.then(function(recurrenceSpec) {
          $scope.recurrenceSpec = recurrenceSpec;
        }, function() {
          //User canceled out of dialog.
          $scope.recurs = false;
          $scope.recurrenceSpec = null;
        }).finally(function() {});
      };

      $scope.createEvent = function(isValid) {
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');

          return false;
        }

        var trainingDay = new TrainingDays({
          date: this.date, // We use date for recurring events.
          dateNumeric: Util.toNumericDate(this.date),
          name: this.name,
          estimatedLoad: this.estimatedLoad,
          eventTerrain: this.eventTerrain,
          scheduledEventRanking: this.scheduledEventRanking,
          recurrenceSpec: this.recurrenceSpec,
          notes: this.notes
        });

        trainingDay.$create(function(createdTrainingDay) {
          // Reload user to pick up changes in notifications.
          Authentication.user = createdTrainingDay.user;
          $state.go('season');
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
            $scope.error = 'Server error prevented event creation.';
          }
        });
      };
    }
  ]);
