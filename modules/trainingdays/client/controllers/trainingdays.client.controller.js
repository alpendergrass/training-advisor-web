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

      //Set dates.
      $scope.today = moment().startOf('day').toDate();
      $scope.adviceDate = $scope.today;
      $scope.yesterday = moment().subtract(1, 'day').startOf('day').toDate();
      $scope.tomorrow = moment().add(1, 'days').startOf('day').toDate();
      $scope.dayAfterTomorrow = moment().add(2, 'days').startOf('day').toDate();

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

      $scope.viewCalendar = function() {
        var formatDayContent = function(trainingDay) {
          var load = 0,
            loadRating = '',
            planActivity,
            content = '<div class="td-calendar-content',
            lengthOfFixedContent = 33;

          //We want to be able to highlight today.
          if (trainingDay.htmlID && trainingDay.htmlID === 'today') {
            content += ' today-on-calendar';
            lengthOfFixedContent += 18;
          }

          content += '">';

          content += trainingDay.name ? '<b>' + trainingDay.name + '</b> ' : '';
          content += trainingDay.startingPoint ? '<b class="small text-danger">Season Start</b> ' : '';
          content += trainingDay.fitnessAndFatigueTrueUp ? '<b class="small text-danger">Fitness and Fatigue True Up</b> ' : '';

          content += '<small>';
          lengthOfFixedContent += 7;

          if (trainingDay.scheduledEventRanking) {
            content += trainingDay.name ? ' - ' : '';

            switch (trainingDay.scheduledEventRanking) {
              case 1:
                content += '<b class="text-danger">Goal Event!</b>';
                break;
              case 2:
                content += '<b>Medium Priority Event</b>';
                break;
              case 3:
                content += 'Low Priority Event';
                break;
              case 9:
                content += 'Scheduled Off Day';
                break;
              default:
                break;
            }
          }

          //Display future advice

          if (moment(trainingDay.date).isAfter($scope.today, 'day')) {
            content += content.length > lengthOfFixedContent ? '<br>' : '';
            content += '<i>';
            planActivity = getPlannedActivity(trainingDay, 'plangeneration');
            if (planActivity) {
              content += mapActivityTypeToVerbiage(planActivity.activityType) + ' - ';
            }
            content += 'load: ' + trainingDay.planLoad + '</i>';
          }


          if (trainingDay.completedActivities.length > 0) {
            content += content.length > lengthOfFixedContent ? '<br>' : '';
            _.forEach(trainingDay.completedActivities, function(activity) {
              load += activity.load;
            });
            loadRating = getMetrics(trainingDay, 'actual').loadRating;
            content += load ? ' Load: ' + load + ' - ' + loadRating + ' day' : '';
          }


          // if (trainingDay.form !== 0) {
          //   content += '<br><i>Form: ' + trainingDay.form + '</i>';
          // }

          // content += '<br><i>Period: ' + trainingDay.period + '</i>';

          content += '</small></div>';
          return content;
        };

        var initCalendar = function() {
          //Use vertical format if we are in a small window like on a phone.
          if (jQuery(window).width() < 800) {
            $scope.setDirection('vertical');
            $scope.smallWindow = true;
          } else {
            $scope.smallWindow = false;
          }
          // Need to clear out calendar data. Moving goal date can strand some data otherwise.
          MaterialCalendarData.data = {};

          //We need to clean up any potential left over sim days.
          TrainingDays.finalizeSim({
            commit: 'no'
          }, function(response) {
            usSpinnerService.spin('tdSpinner');
            $scope.isWorking = true;

            Season.getSeason(function(errorMessage, season) {
              usSpinnerService.stop('tdSpinner');
              $scope.isWorking = false;
              $scope.error = errorMessage;

              if (season) {
                $scope.season = season.days;
                // Reload user object as notifications may have been updated.
                Authentication.user = season.user;
                $scope.hasStart = season.hasStart;
                $scope.hasEnd = season.hasEnd;
                $scope.needsPlanGen = season.needsPlanGen;

                if (season.yesterday) {
                  $scope.checkGiveFeedback(season.yesterday);
                }
                _.forEach(season.days, function(td) {
                  MaterialCalendarData.setDayContent(td.date, formatDayContent(td));
                });
              }
            });
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              $scope.error = 'Server error prevented simulation clean-up.';
            }
          });
        };

        $scope.setDirection = function(direction) {
          $scope.direction = direction;
          $scope.dayFormat = direction === 'vertical' ? 'EEE, MMM d' : 'd';
        };

        $scope.dayClick = function(date) {
          var td = _.find($scope.season, function(d) {
            return (moment(d.date).isSame(moment(date), 'day'));
          });

          if (td) {
            $state.go('trainingDayView', { trainingDayId: td._id });
          } else {
            if (moment(date).isSameOrAfter($scope.hasStart.date)) {
              //trainingDay does not exist, we need to create it first.
              var trainingDay = new TrainingDays({
                date: date
              });

              trainingDay.$create(function(trainingDay) {
                // Reload user to pick up changes in notifications.
                Authentication.user = trainingDay.user;
                $location.path('trainingDay/' + trainingDay._id);
              }, function(errorResponse) {
                if (errorResponse.data && errorResponse.data.message) {
                  $scope.error = errorResponse.data.message;
                } else {
                  //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
                  $scope.error = 'Server error prevented trainingDay creation.';
                }
              });
            }
          }
        };

        initCalendar();
      };

      // //Highlight today in calendar view
      // //Note that this will not survive a change in calendar layout (calendar to agenda or v.v.).
      // //We need a callback from the calendar module. Or something.
      // angular.element(document).ready(function() {
      //   jQuery('.today-on-calendar').parent().parent().addClass('md-whiteframe-7dp');
      // });

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

      $scope.scheduleEvent = function() {
        $scope.recurrenceSpec = null;

        //If the user clicks a Create Goal link we pass in the event prioity so no need to ask.
        if ($stateParams.scheduledEventRanking) {
          $scope.scheduledEventRanking = $stateParams.scheduledEventRanking;
          $scope.eventRankingParm = $stateParams.scheduledEventRanking;
        } else {
          $scope.eventRankingParm = 0;
        }

        var minEventDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().startOf('day').toDate();

        $scope.eventDateOptions = {
          formatYear: 'yy',
          startingDay: 1,
          showWeeks: false,
          minDate: minEventDate
        };

        $scope.$watch('scheduledEventRanking', function(ranking) {
          if (ranking !== '1') {
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
            //size: 'sm',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
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
            //User cancelled out of dialog.
            $scope.recurs = false;
            $scope.recurrenceSpec = null;
          }).finally(function() {
          });
        };

        $scope.createEvent = function(isValid) {
          $scope.error = null;

          if (!isValid) {
            $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');

            return false;
          }

          var trainingDay = new TrainingDays({
            date: this.date,
            name: this.name,
            estimatedLoad: this.estimatedLoad,
            scheduledEventRanking: this.scheduledEventRanking,
            recurrenceSpec: this.recurrenceSpec,
            notes: this.notes
          });

          trainingDay.$create(function(response) {
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

      $scope.viewTrainingDay = function() {
        $scope.activityTypes = [
          { value: 'easy', text: 'Do an easy ride' },
          { value: 'moderate', text: 'Do a moderate ride' },
          { value: 'hard', text: 'Do a hard ride' },
          { value: 'test', text: 'Do a threshold power test' }
        ];

        $scope.eventRankings = [
          { value: 1, text: 'Goal Event' },
          { value: 2, text: 'Medium Priority Event' },
          { value: 3, text: 'Low Priority Event' },
          { value: 9, text: 'Off Day' },
          { value: 0, text: 'Training Day' }
        ];

        $scope.eventTerrains = [
          { value: 1, text: 'Flat' },
          { value: 2, text: 'Slightly Hilly' },
          { value: 3, text: 'Hilly' },
          { value: 4, text: 'Very Hilly' },
          { value: 5, text: 'Mountainous' }
        ];

        function prepForTDView(trainingDay) {
          trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
          $scope.previousDay = moment(trainingDay.date).subtract(1, 'day').toDate();
          $scope.nextDay = moment(trainingDay.date).add(1, 'day').toDate();
          $scope.showGetAdvice = moment(trainingDay.date).isBetween($scope.yesterday, $scope.dayAfterTomorrow, 'day') || $scope.authentication.user.levelOfDetail > 2;
          $scope.showCompletedActivities = moment(trainingDay.date).isBefore($scope.tomorrow, 'day');
          $scope.allowEventEdit = moment(trainingDay.date).isSameOrAfter($scope.today, 'day') || $scope.authentication.user.levelOfDetail > 2;
          $scope.showFormAndFitness = $scope.authentication.user.levelOfDetail > 1;
          $scope.source = moment(trainingDay.date).isSameOrBefore($scope.tomorrow, 'day') ? 'advised' : 'plangeneration';
          resetViewObjects(trainingDay);
        }

        function resetViewObjects(trainingDay) {
          $scope.plannedActivity = getPlannedActivity(trainingDay, $scope.source);
          $scope.requestedActivity = getPlannedActivity(trainingDay, 'requested');
          $scope.plannedMetrics = getMetrics($scope.trainingDay, 'planned');
          $scope.actualMetrics = getMetrics($scope.trainingDay, 'actual');
        }

        $scope.showRanking = function() {
          if (!$scope.trainingDay) {
            return '';
          }

          var selected = $filter('filter')($scope.eventRankings, { value: $scope.trainingDay.scheduledEventRanking }),
            dayText = $scope.plannedActivity ? mapActivityTypeToVerbiage($scope.plannedActivity.activityType) : 'Training Day';
          return ($scope.trainingDay.scheduledEventRanking && selected.length) ? selected[0].text : dayText;
        };

        $scope.showTerrain = function() {
          if (!$scope.trainingDay) {
            return '';
          }

          var selected = $filter('filter')($scope.eventTerrains, { value: $scope.trainingDay.eventTerrain });
          return ($scope.trainingDay.eventTerrain && selected.length) ? selected[0].text : 'Not Specified';
        };

        $scope.$watch('trainingDay.scheduledEventRanking', function(ranking) {
          // If not a goal event, zero out estimates.
          if ($scope.trainingDay && ranking !== 1) {
            $scope.trainingDay.estimatedLoad = 0;
            $scope.trainingDay.eventTerrain = 0;
          }
        });

        $scope.getDay = function(date) {
          $scope.error = null;

          TrainingDays.getDay({
            trainingDate: date.toISOString()
          }, function(trainingDay) {
            $state.go('trainingDayView', { trainingDayId: trainingDay._id });
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented training day retrieval.';
            }
          });
        };

        // Remove existing TrainingDay
        $scope.remove = function() {
          $scope.trainingDay.$remove(function(response) {
            $state.go('season');
          });
        };

        $scope.updateEventRanking = function(priority) {
          //http://stackoverflow.com/questions/5971645/what-is-the-double-tilde-operator-in-javascript
          var n = ~~Number(priority);

          if (n === $scope.trainingDay.scheduledEventRanking) {
            //no change.
            return;
          }

          if (String(n) === priority && (n >= 0 && n <= 3) || n === 9) {
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Valid eventRankings are 0, 1, 2 and 3. And 9.';
        };

        $scope.updateEstimatedLoad = function(estimate) {
          var n = ~~Number(estimate);

          if (n === $scope.trainingDay.estimatedLoad) {
            //no change.
            return;
          }

          if (String(n) === estimate && n >= 0 && n <= 999) {
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Estimated load must be a positive whole number less than 1000.';
        };

        $scope.updateEventTerrain = function(terrain) {
          var n = ~~Number(terrain);

          if (n === $scope.trainingDay.eventTerrain) {
            //no change.
            return;
          }

          if (String(n) === terrain && n >= 0 && n <= 5) {
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Terrain must be a whole number between 0 and 5.';
        };

        $scope.saveCompletedActivity = function(data, created) {
          angular.extend(data, { created: created });
          var index = _.indexOf($scope.trainingDay.completedActivities, _.find($scope.trainingDay.completedActivities, { created: created }));
          $scope.trainingDay.completedActivities.splice(index, 1, data);

          $scope.update($scope.trainingDay, function(trainingDay) {
            if (trainingDay) {
              resetViewObjects(trainingDay);
              $scope.checkGiveFeedback($scope.trainingDay);
            }
          });
        };

        $scope.addCompletedActivity = function(data) {
          $scope.inserted = {
            load: 0,
            //intensity: 0,
            notes: ''
          };
          $scope.trainingDay.completedActivities.push($scope.inserted);
        };

        $scope.deleteCompletedActivity = function(index) {
          $scope.trainingDay.completedActivities.splice(index, 1);
          return $scope.update($scope.trainingDay, function(trainingDay) {
            if (trainingDay) {
              resetViewObjects(trainingDay);
            }
          });
        };

        $scope.downloadActivities = function(provider) {
          usSpinnerService.spin('tdSpinner');

          $scope.trainingDay.$downloadActivities({
            provider: provider
          }, function(trainingDay) {
            usSpinnerService.stop('tdSpinner');
            //We need to correct the date coming from server-side as it might not have self corrected yet.
            trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
            $scope.trainingDay = trainingDay;
            resetViewObjects(trainingDay);
            toastr[trainingDay.lastStatus.type](trainingDay.lastStatus.text, trainingDay.lastStatus.title);
            if (trainingDay.lastStatus.type === 'success') {
              $scope.checkGiveFeedback($scope.trainingDay);
            }
          }, function(errorResponse) {
            usSpinnerService.stop('tdSpinner');
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented activity download.';
            }
          });
        };

        $scope.advise = function() {
          TrainingDays.getAdvice({
            trainingDate: $scope.trainingDay.date.toISOString(),
            alternateActivity: $scope.alternateActivity || null
          }, function(trainingDay) {
            trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
            $scope.trainingDay = trainingDay;
            $scope.alternateActivity = null;
            resetViewObjects(trainingDay);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              if (errorResponse.data.message === 'Starting date for current training period was not found.') {
                // We want to come back here after we create start.
                $state.go('trainingDays.createStart', { forwardTo: 'trainingDayView' });
              } else {
                $scope.error = errorResponse.data.message;
              }
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented advice retrieval.';
            }
          });
        };

        if (!$stateParams.trainingDayId) {
          // The following will reload the page with today.
          $scope.getDay($scope.today);
        } else {
          $scope.trainingDay = TrainingDays.get({
            trainingDayId: $stateParams.trainingDayId
          }, function(trainingDay) {
            prepForTDView(trainingDay);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented training day retrieval.';
            }
          });
        }

        $scope.update = function(trainingDay, callback) {
          //Note that we take a callback but do not return an error as we handle it here.
          $scope.error = null;

          if (!trainingDay) {
            // If called from the view trainingDay is not passed in.
            trainingDay = $scope.trainingDay;
          }

          trainingDay.$update(function(trainingDay) {
            // Reload user to pick up changes in notifications.
            Authentication.user = trainingDay.user;

            //We need to correct the date coming from server-side as it might not have self corrected yet.
            trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
            $scope.trainingDay = trainingDay;

            return callback(trainingDay);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented training day update.';
            }

            return callback(null);
          });
        };

      };

      $scope.checkGiveFeedback = function(trainingDay) {
        if (trainingDay.completedActivities.length > 0 && getMetrics(trainingDay, 'actual').loadRating === 'hard' && trainingDay.trainingEffortFeedback === null) {
          $scope.openGiveFeedback(trainingDay);
        }
      };

      $scope.openGiveFeedback = function(trainingDay) {
        var modalInstance = $uibModal.open({
          templateUrl: '/modules/trainingdays/client/views/partials/feedback-trainingdays.client.view.html',
          size: 'sm',
          controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
            $scope.relativeDay = moment(trainingDay.date).calendar(null, {
              sameDay: '[today]',
              nextDay: '[tomorrow]',
              nextWeek: 'dddd',
              lastDay: '[yesterday]',
              lastWeek: '[last] dddd',
              sameElse: 'MMM D'
            });
            //By setting $scope.trainingEffortFeedback to '' we disable the Save button
            //until the user makes a selection.
            $scope.trainingEffortFeedback = '';
            $scope.trainingEffortRatings = [
              { value: '2', text: 'Great!' },
              { value: '1', text: 'Very Good.' },
              { value: '0', text: 'Good.' },
              { value: '-1', text: 'Tired.' },
              { value: '-2', text: 'Very Tired!' }
            ];
            $scope.giveFeedback = function() {
              trainingDay.trainingEffortFeedback = $scope.trainingEffortFeedback;
              $uibModalInstance.close(trainingDay);
            };
            $scope.cancelFeedback = function() {
              trainingDay.trainingEffortFeedback = 0;
              $uibModalInstance.dismiss('cancel');
            };
          }],
          resolve: {
            trainingEffortRatings: function() {
              return $scope.trainingEffortRatings;
            }
          }
        });

        modalInstance.result.then(function(trainingDay) {
          // trainingDay.trainingEffortFeedback = trainingEffortFeedback;
        }, function() {
          //User cancelled out of dialog.
          //By setting to zero we will not ask again.
          // trainingDay.trainingEffortFeedback = 0;
        }).finally(function() {
          return $scope.update(trainingDay);
          //todo need a new update() here
        });
      };
    }
  ]);
