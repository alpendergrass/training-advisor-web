'use strict';

// TrainingDays controller
angular.module('trainingDays')
  .controller('TrainingDaysController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$filter', '$uibModal', '$anchorScroll', 'Authentication', 'Socket', 'TrainingDays', '_', 'moment', 'toastr', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $filter, $uibModal, $anchorScroll, Authentication, Socket, TrainingDays, _, moment, toastr, usSpinnerService, MaterialCalendarData) {
      $scope.authentication = Authentication;
      var jQuery = window.jQuery;

      //The following makes lodash available in html.
      $scope._ = _;

      //Create socket for server-to-client messaging.
      //Make sure the Socket is connected
      if (!Socket.socket) {
        Socket.connect();
      }

      //The following will remove any listeners. We create a new one below.
      Socket.init();

      // Add an event listener to the 'trainingDayMessage' event
      Socket.on('trainingDayMessage', function(message) {
        toastr[message.type](message.text, message.title);
      });

      //The following is used on the TD list page for the Today button.
      //This page is no longer available to non-admin users.
      $scope.scrollTo = function(id) {
        var currentPath = $location.hash();
        $location.hash(id);
        $anchorScroll();
        //reset to currentPath to keep from changing URL in browser.
        $location.hash(currentPath);
      };

      //If the user clicks a Create Goal link we pass in the event prioity so no need to ask.
      if ($stateParams.eventPriority) {
        $scope.eventPriority = $stateParams.eventPriority;
        $scope.eventPriorityParm = $stateParams.eventPriority;
      } else {
        $scope.eventPriorityParm = 0;
      }

      //Set default dates.
      $scope.adviceDate = moment().startOf('day').toDate();
      $scope.startDate = moment().startOf('day').toDate();

      //Begin Datepicker stuff.
      $scope.minAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.adviceDate;
      $scope.maxAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();
      $scope.maxTrueUpDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().startOf('day').toDate();
      $scope.minStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().subtract(1, 'day').startOf('day').toDate();
      $scope.maxStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.startDate;
      $scope.minGoalDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().startOf('day').toDate();

      $scope.dateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false
      };

      $scope.datePickerStatus = {
        opened: false
      };

      $scope.openDatePicker = function($event) {
        $scope.datePickerStatus.opened = true;
      };
      //End Datepicker stuff.

      //For comparision in views, we will use seconds - getTime()
      $scope.yesterday = moment().subtract(1, 'day').startOf('day').toDate().getTime();
      $scope.tomorrow = moment().add(1, 'days').startOf('day').toDate().getTime();
      $scope.dayAfterTomorrow = moment().add(2, 'days').startOf('day').toDate().getTime();

      $scope.activityTypes = [
        { value: 'easy', text: 'Do an easy ride' },
        { value: 'moderate', text: 'Do a moderate ride' },
        { value: 'hard', text: 'Do a hard ride' },
        { value: 'simulation', text: 'Do a goal event simulation' }, //TODO: do not offer this if no goal exists.
        { value: 'test', text: 'Do a threshold power test' }
      ];

      $scope.recurrenceSpec = null;

      // Check if provider is already in use with current user
      $scope.isConnectedSocialAccount = function(provider) {
        return $scope.authentication.user.provider === provider || ($scope.authentication.user.additionalProvidersData && $scope.authentication.user.additionalProvidersData[provider]);
      };

      var formatDayContent = function(trainingDay) {
        var load = 0,
          content = '<div class="td-calendar-content';

        if (trainingDay.htmlID && trainingDay.htmlID === 'today') {
          content += ' today-on-calendar';
        }

        content += '">';

        content += trainingDay.name ? '<b>' + trainingDay.name + '</b> ' : '';
        content += trainingDay.startingPoint ? '<b class="small text-danger">Season Start</b> ' : '';
        content += trainingDay.fitnessAndFatigueTrueUp ? '<b class="small text-danger">Fitness and Fatigue True Up</b> ' : '';
        
        if (trainingDay.eventPriority) {
          content += '<small> - ';
          switch (trainingDay.eventPriority) {
            case 1:
              content += '<b class="text-danger">Goal Event!</b>';
              break;
            case 2:
              content += '<b>Medium Priority</b>';
              break;
            case 3:
              content += 'Training-Focused';
              break;
            default:
              break;
          }
          content += '</small>';
        }
        if (trainingDay.completedActivities.length > 0) {
          content += content.length > 33 ? '<br>' : '';
          content += '<small>Load: ';
          _.forEach(trainingDay.completedActivities, function(activity) {
            load += activity.load;
            // content += activity.load + ', ';
          });
          // content = content.substring(0, content.length - 2);
          content += load + ' - ' + trainingDay.loadRating + ' day</small>';
        }
        content += '</div>';
        return content;
      };

      $scope.getAllTrainingDays = function(calendar, callback) {
        //Initialize these to prevent temp loading of alert at top of TD list.
        $scope.hasStart = true;
        $scope.hasEnd = true;
        $scope.hasToday = false;

        if (calendar) {
          // Need to clear out data in case a TD has been deleted.
          MaterialCalendarData.data = {};
        }

        $scope.trainingDaysAll = TrainingDays.query({ clientDate: moment().startOf('day').toDate() }, function() {
          //not sure why Mongo/Mongoose returns a string for a date field but
          //we need trainingDay.date to be a valid date object for comparision purposes in the view.
          _.forEach($scope.trainingDaysAll, function(td) {
            td.date = new Date(td.date);

            if (moment(td.date).isSame(moment(), 'day')) {
              td.htmlID = 'today';
              $scope.hasToday = true;
            }

            if (calendar) {
              MaterialCalendarData.setDayContent(td.date, formatDayContent(td));
            }
          });

          $scope.hasStart = _.find($scope.trainingDaysAll, function(td) {
            // moment.isSameOrBefore is only available in versions 2.10.7 but 
            // I'm using a component (angular-timezone-selector) that currently specifies an earlier version. 
            // return td.startingPoint && moment(td.date).isSameOrBefore(moment()); 
            return td.startingPoint && moment(td.date).isBefore(moment());
          });

          $scope.hasEnd = _.find($scope.trainingDaysAll, function(td) {
            return td.eventPriority === 1 && moment(td.date).isAfter(moment());
          });

          if (callback) {
            return callback();
          }
        });
      };

      $scope.calendar = function() {
        if (jQuery(window).width() < 800) {
          $scope.setDirection('vertical');
          $scope.smallWindow = true;
        } else {
          $scope.smallWindow = false;
        }

        $scope.getAllTrainingDays(true, function() {
          // Get yesterday if it exists.
          var yesterday = _.find($scope.trainingDaysAll, function(td) {
            return moment(td.date).isSame((moment().subtract(1, 'day')), 'day');
          });

          if (yesterday) {
            $scope.checkGiveFeedback(yesterday);
          }
        });
      };

      //Highlight today in calendar view
      //Note that this will not survive a change in calendar layout (calendar to agenda or v.v.).
      //We need a callback from the calendar module. Or something.
      angular.element(document).ready(function () {
        jQuery('.today-on-calendar').parent().parent().addClass('md-whiteframe-7dp');
      });

      $scope.setDirection = function(direction) {
        $scope.direction = direction;
        $scope.dayFormat = direction === 'vertical' ? 'EEE, MMM d' : 'd';
      };

      $scope.dayClick = function(date) {
        var td = _.find($scope.trainingDaysAll, function(d) {
          return (moment(d.date).isSame(moment(date), 'day'));
        });

        if (td) {
          $state.go('trainingDays.view', { trainingDayId: td._id });
        } else {
          var trainingDay = new TrainingDays({
            date: date
          });

          // Redirect after save
          trainingDay.$create(function(response) {
            $scope.trainingDay = response;
            $location.path('trainingDays/' + response._id);
          }, function(errorResponse) {
            $scope.error = errorResponse.data.message;
          });
        }
      };

      $scope.list = function() {
        $scope.getAllTrainingDays(false, function() {
          //Doing infinite scrolling all client-side. 
          //May need to switch to server-side at some point. Or some combo of client and server side.
          $scope.trainingDaysChunked = _.chunk($scope.trainingDaysAll, 56);
          $scope.trainingDays = $scope.trainingDaysChunked[0];
          $scope.nextChunk = 1;
        });
      };

      $scope.nextBatch = function() {
        if ($scope.trainingDaysChunked && $scope.trainingDaysChunked.length > $scope.nextChunk) {
          $scope.trainingDays = _.concat($scope.trainingDays, $scope.trainingDaysChunked[$scope.nextChunk]);
          $scope.nextChunk++;
        }
      };

      // Find existing TrainingDay
      $scope.findOne = function() {
        $scope.trainingDay = TrainingDays.get({
          trainingDayId: $stateParams.trainingDayId
        }, function(trainingDay) {
          //not sure why Mongo/Mongoose returns a string for a date field
          //but I have to convert it back to a date to get my date picker
          //to consider it a valid date if the user does not pick a new date.
          trainingDay.date = new Date(trainingDay.date);
          $scope.showGetAdvice = moment(trainingDay.date).isBetween($scope.yesterday, $scope.dayAfterTomorrow, 'day');
          $scope.showFormAndFitness = moment(trainingDay.date).isBefore($scope.dayAfterTomorrow, 'day');
          $scope.showCompletedActivities = moment(trainingDay.date).isBefore($scope.tomorrow, 'day');
        });
      };

      $scope.saveCompletedActivity = function(data, created) {
        angular.extend(data, { created: created });
        var index = _.indexOf($scope.trainingDay.completedActivities, _.find($scope.trainingDay.completedActivities, { created: created }));
        $scope.trainingDay.completedActivities.splice(index, 1, data);

        var trainingDay = $scope.trainingDay;

        $scope.trainingDay.$update(function() {
          $scope.checkGiveFeedback(trainingDay);
        }, function(errorResponse) {
          $scope.error = errorResponse.data.message;
        });
      };

      $scope.addCompletedActivity = function(data) {
        $scope.inserted = {
          // activityType: '',
          load: 0,
          //intensity: 0,
          notes: ''
        };
        $scope.trainingDay.completedActivities.push($scope.inserted);
      };

      $scope.deleteCompletedActivity = function(index) {
        $scope.trainingDay.completedActivities.splice(index, 1);
        return $scope.update(true);
      };

      // Create new starting point of a training season.
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
          fitness: this.fitness,
          fatigue: this.fatigue,
          notes: this.notes
        });

        // Redirect after save
        trainingDay.$create(function(response) {
          $location.path('trainingDays');

          // Clear form fields
          $scope.startDate = null;
          $scope.name = '';
          $scope.fitness = 0;
          $scope.fatigue = 0;
          $scope.notes = '';
        }, function(errorResponse) {
          $scope.error = errorResponse.data.message;
        });
      };

      $scope.createGoalEvent = function(isValid) {
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');

          return false;
        }

        var trainingDay = new TrainingDays({
          date: this.date,
          name: this.name,
          estimatedGoalLoad: this.estimatedGoalLoad,
          eventPriority: this.eventPriority,
          recurrenceSpec: this.recurrenceSpec,
          notes: this.notes
        });

        // Redirect after save
        trainingDay.$create(function(response) {
          $location.path('trainingDays');

          // Clear form fields
          $scope.name = '';
          $scope.date = null;
          $scope.eventPriority = '0';
          $scope.estimatedGoalLoad = 0;
          $scope.recurrenceSpec = null;
          $scope.notes = '';
        }, function(errorResponse) {
          $scope.error = errorResponse.data.message;
        });
      };

      // Remove existing TrainingDay
      $scope.remove = function(trainingDay) {
        if (trainingDay) {
          trainingDay.$remove();

          for (var i in $scope.trainingDays) {
            if ($scope.trainingDays[i] === trainingDay) {
              $scope.trainingDays.splice(i, 1);
            }
          }
        } else {
          $scope.trainingDay.$remove(function() {
            $location.path('trainingDays');
          });
        }
      };

      $scope.eventPriorities = [
        { value: 1, text: 'Goal Event!' },
        { value: 2, text: 'Medium Priority Event' },
        { value: 3, text: 'Training-Focused Event' }
      ];

      $scope.showPriority = function() {
        var selected = $filter('filter')($scope.eventPriorities, { value: $scope.trainingDay.eventPriority });
        return ($scope.trainingDay.eventPriority && selected.length) ? selected[0].text : 'Not set';
      };

      $scope.updateEventPriority = function(priority) {
        var n = ~~Number(priority);

        if (n === $scope.trainingDay.eventPriority) {
          //no change.
          return;
        }

        if (String(n) === priority && n >= 1 && n <= 3) {
          return $scope.update(true);
        }

        return 'Valid eventPriorities are 1, 2 and 3.';
      };

      $scope.updateEstimatedLoad = function(estimate) {
        var n = ~~Number(estimate);

        if (n === $scope.trainingDay.estimatedGoalLoad) {
          //no change.
          return;
        }

        if (String(n) === estimate && n >= 0 && n <= 999) {
          return $scope.update(true);
        }

        return 'Estimated load must be a positive whole number less than 1000.';
      };

      $scope.update = function(isValid, trainingDay) {
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
          return false;
        }

        if (!trainingDay) {
          trainingDay = $scope.trainingDay;
        }

        trainingDay.$update(function() {}, function(errorResponse) {
          $scope.error = errorResponse.data.message;
        });
      };

      $scope.getAdvice = function(isValid, adviceDate) {
        var getAdviceDate;
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
          return false;
        }

        //Use adviceDate if passed in. Use this.adviceDate otherwise, which is likely the date
        //selected on the getAdvice page.
        getAdviceDate = adviceDate || this.adviceDate;
        getAdviceDate = moment(getAdviceDate).startOf('day').toDate();

        TrainingDays.getAdvice({
          trainingDate: getAdviceDate.toISOString(),
          alternateActivity: $scope.alternateActivity || null
        }, function(response) {
          $scope.trainingDay = response;
          $location.path('trainingDays/' + response._id);
        }, function(errorResponse) {
          $scope.error = errorResponse.data.message;
        });
      };

      $scope.downloadActivities = function(provider) {
        usSpinnerService.spin('tdViewSpinner');
        var trainingDay = $scope.trainingDay;
        // var d = new Date(trainingDay.date);

        trainingDay.$downloadActivities({
          provider: provider
        }, function(response) {
          usSpinnerService.stop('tdViewSpinner');
          $scope.checkGiveFeedback(trainingDay);
        }, function(errorResponse) {
          usSpinnerService.stop('tdViewSpinner');
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented activity download.';
          }
        });
      };

      $scope.checkGiveFeedback = function(trainingDay) {
        if (trainingDay.loadRating === 'hard' && trainingDay.trainingEffortFeedback === null) {
          $scope.openGiveFeedback(trainingDay);
        }
      };

      $scope.openGiveFeedback = function(trainingDay) {
        var modalInstance = $uibModal.open({
          templateUrl: '/modules/trainingdays/client/views/partials/feedback-trainingdays.client.view.html',
          size: 'sm',
          controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
            $scope.relativeDay = (moment(trainingDay.date).isSame(moment(), 'day')) ? 'today' : 'yesterday';
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
          return $scope.update(true, trainingDay);
        });
      };

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
            //By setting $scope.trainingEffortFeedback to '' we disable the Save button
            //until the user makes a selection.

            $scope.recurrenceSpec = {
              daysOfWeek: {}
            };

            $scope.recurrenceSpec.summary = '';

            $scope.minRepeatDate = moment(eventDate).add(1, 'day').startOf('day').toDate();
            $scope.maxRepeatDate = moment().add(52, 'weeks').startOf('day').toDate();

            $scope.dateOptions = {
              formatYear: 'yy',
              startingDay: 1,
              showWeeks: false
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
    }
  ]);
