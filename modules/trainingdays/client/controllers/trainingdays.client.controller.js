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
      $scope.today = moment().startOf('day').toDate();
      $scope.adviceDate = $scope.today;

      //Begin Datepicker stuff.
      var minAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;
      var maxAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();
      var minStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().subtract(7, 'days').startOf('day').toDate();
      var maxStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;
      var minGoalDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().startOf('day').toDate();

      $scope.startDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minStartDate,
        maxDate: maxStartDate
      };

      $scope.goalDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minGoalDate
      };

      $scope.adviceDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minAdviceDate,
        maxDate: maxAdviceDate
      };

      $scope.trueUpDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        maxDate: maxStartDate
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
        
        if (trainingDay.eventPriority) {
          content += ' - ';

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
        }

        //Display future advice
        if (trainingDay.plannedActivities[0] && moment(trainingDay.date).isAfter($scope.yesterday, 'day')) {
          content += content.length > lengthOfFixedContent ? '<br>' : '';
          if (trainingDay.plannedActivities[0].activityType === 'goal') {
            content += '<i>scheduled event</i>';
          } else {
            content += '<i>' + trainingDay.plannedActivities[0].activityType + ' day planned</i>';
          }
        }

        if (trainingDay.completedActivities.length > 0) {
          content += content.length > lengthOfFixedContent ? '<br>' : '';
          content += 'Load: ';
          _.forEach(trainingDay.completedActivities, function(activity) {
            load += activity.load;
          });
          content += load + ' - ' + trainingDay.loadRating + ' day';
        }

        // if (trainingDay.form !== 0) {
        //   content += '<br>Form: ' + trainingDay.form;
        // }

        content += '</small></div>';
        return content;
      };

      var getSeason = function(callback) {
        $scope.hasStart = true;
        $scope.hasEnd = true;
        $scope.needsPlanGen = false;

        TrainingDays.getSeason({
          today: $scope.today.toISOString()
        }, function(season) {
          _.forEach(season, function(td) {
            //not sure why Mongo/Mongoose returns a string for a date field but
            //td.date has to be a date object.
            td.date = new Date(td.date);

          });

          $scope.hasStart = _.find(season, function(td) {
            // moment.isSameOrBefore is only available in versions 2.10.7 but 
            // I'm using a component (angular-timezone-selector) that currently specifies an earlier version. 
            //TODO: watch for an updated version of angular-timezone-selector.
            //9/1/16: Now using download of fork https://github.com/j-w-miller/angular-timezone-selector, not bower install of original.
            //Supports later version of moment. isSameOrBefore should work now.
            // return td.startingPoint && moment(td.date).isSameOrBefore(moment()); 
            return td.startingPoint && moment(td.date).isBefore(moment());
          });

          //Find first future goal TD if any.
          $scope.hasEnd = _.chain(season)
            .filter(function(td) {
              return td.eventPriority === 1 && moment(td.date).isAfter(moment());
            })
            .sortBy(['date'])
            .head()
            .value();

          if ($scope.hasEnd) {
            $scope.needsPlanGen = (season && season[0] && season[0].user && season[0].user.planGenNeeded);
          }

          // Get yesterday if it exists.
          var yesterday = _.find(season, function(td) {
            return moment(td.date).isSame((moment().subtract(1, 'day')), 'day');
          });

          if (yesterday) {
            $scope.checkGiveFeedback(yesterday);
          }
          
          $scope.season = season;
          return callback();
        }, function(errorResponse) {
          $scope.season = null;
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented season retrieval';
          }
        });
      };

      $scope.calendar = function() {
        //Use vertical format if we are in a small window like on a phone.
        if (jQuery(window).width() < 800) {
          $scope.setDirection('vertical');
          $scope.smallWindow = true;
        } else {
          $scope.smallWindow = false;
        }
        // Need to clear out calendar data. Moving goal date can strand some data otherwise.
        MaterialCalendarData.data = {};

        getSeason(function() {
          if ($scope.season) {
            _.forEach($scope.season, function(td) {
              MaterialCalendarData.setDayContent(td.date, formatDayContent(td));
            });
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
        var td = _.find($scope.season, function(d) {
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
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
              $scope.error = 'Server error prevented trainingDay creation.';
            }
          });
        }
      };

      function extractLoad(td) {
        var load = 0;
        if (td.completedActivities.length > 0) {
          load = _.sumBy(td.completedActivities, function(activity) {
            return activity.load;
          });
        } else if (td.plannedActivities.length > 0) {
          load = (td.plannedActivities[0].targetMinLoad + td.plannedActivities[0].targetMaxLoad) / 2;
        }

        return load;
      }

      $scope.chart = function() {
        var loadArray,
          formArray,
          fitnessArray,
          fatigueArray;

        $scope.error = null;
        // $scope.chartColors = ['#45b7cd', '#ff6384', '#ff8e72'];
        $scope.chartDatasetOverride = [
          {
            label: 'Load',
            borderWidth: 1,
            type: 'bar'
          },
          {
            label: 'Fitness',
            borderWidth: 3,
            hoverBackgroundColor: 'rgba(255,99,132,0.4)',
            hoverBorderColor: 'rgba(255,99,132,1)',
            type: 'line'
          },
          {
            label: 'Fatigue',
            borderWidth: 3,
            hoverBackgroundColor: 'rgba(255,99,132,0.4)',
            hoverBorderColor: 'rgba(255,99,132,1)',
            type: 'line'
          },
          {
            label: 'Form',
            borderWidth: 3,
            hoverBackgroundColor: 'rgba(255,99,132,0.4)',
            hoverBorderColor: 'rgba(255,99,132,1)',
            type: 'line'
          }
        ];

        getSeason(function() {
          if ($scope.season) {
            loadArray = _.flatMap($scope.season, extractLoad);
            formArray = _.flatMap($scope.season, function(td) { return td.form; });
            fitnessArray = _.flatMap($scope.season, function(td) { return td.fitness; });
            fatigueArray = _.flatMap($scope.season, function(td) { return td.fatigue; });
            $scope.chartLabels = _.flatMap($scope.season, function extractDate(td) { return moment(td.date).format('ddd MMM D'); });
            $scope.chartData = [loadArray, fitnessArray, fatigueArray, formArray];
          }
        });
      };

      var getAllTrainingDays = function(callback) {
        //Initialize these to prevent temp loading of alert at top of TD list.
        $scope.hasStart = true;
        $scope.hasEnd = true;
        $scope.needsPlanGen = false;

        $scope.trainingDaysAll = TrainingDays.query({ clientDate: moment().startOf('day').toDate() }, function() {
          //not sure why Mongo/Mongoose returns a string for a date field but
          //we need trainingDay.date to be a valid date object for comparision purposes in the view.
          _.forEach($scope.trainingDaysAll, function(td) {
            td.date = new Date(td.date);
          });

          $scope.hasStart = _.find($scope.trainingDaysAll, function(td) {
            // moment.isSameOrBefore is only available in versions 2.10.7 but 
            // I'm using a component (angular-timezone-selector) that currently specifies an earlier version. 
            //TODO: watch for an updated version of angular-timezone-selector.
            //9/1/16: Now using download of fork https://github.com/j-w-miller/angular-timezone-selector, not bower install of original.
            //Supports later version of moment. isSameOrBefore should work now.
            // return td.startingPoint && moment(td.date).isSameOrBefore(moment()); 
            return td.startingPoint && moment(td.date).isBefore(moment());
          });

          //Find first future goal TD if any.
          $scope.hasEnd = _.chain($scope.trainingDaysAll)
            .filter(function(td) {
              return td.eventPriority === 1 && moment(td.date).isAfter(moment());
            })
            .sortBy(['date'])
            .head()
            .value();

          if ($scope.hasEnd) {
            $scope.needsPlanGen = _.find($scope.trainingDaysAll, function(td) {
              //Determine is there are any TDs before next goal which do not have plannedActivities.
              //If there are we need to offer plan gen.
              return moment(td.date).isAfter(moment().add('1', 'day')) && moment(td.date).isBefore(moment($scope.hasEnd.date).add('1', 'day')) && td.plannedActivities.length < 1;
            });
          }

          if (callback) {
            return callback();
          }
        });
      };

      $scope.list = function() {
        getAllTrainingDays(function() {
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
          $scope.allowFormAndFitnessTrueUp = moment(trainingDay.date).isBefore($scope.tomorrow, 'day');
          $scope.showFormAndFitness = trainingDay.fitness !== 0 || trainingDay.fatigue !== 0 || trainingDay.form !== 0;
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
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented activity save.';
          }
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
          fitness: this.fitness,
          fatigue: this.fatigue,
          notes: this.notes
        });

        // Redirect after save
        trainingDay.$create(function(response) {
          $location.path('trainingDays');

          // Clear form fields
          $scope.name = '';
          $scope.fitness = 0;
          $scope.fatigue = 0;
          $scope.notes = '';
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented starting point creation.';
          }
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
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented event creation.';
          }
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
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented training day update.';
          }
        });
      };

      $scope.getAdvice = function(isValid, adviceDate) {
        $scope.error = null;
        var getAdviceDate;

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
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented advice retrieval.';
          }
        });
      };

      $scope.genPlan = function() {
        usSpinnerService.spin('tdSpinner');
        $scope.error = null;

        TrainingDays.genPlan({
          startDate: $scope.today.toISOString()
        }, function(response) {
          usSpinnerService.stop('tdSpinner');
          $location.path('trainingDays/season');
          $scope.chart();
        }, function(errorResponse) {
          usSpinnerService.stop('tdSpinner');
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented plan generation.';
          }
        });
      };

      $scope.downloadActivities = function(provider) {
        usSpinnerService.spin('tdSpinner');
        var trainingDay = $scope.trainingDay;
        // var d = new Date(trainingDay.date);

        trainingDay.$downloadActivities({
          provider: provider
        }, function(response) {
          usSpinnerService.stop('tdSpinner');
          $scope.checkGiveFeedback(trainingDay);
        }, function(errorResponse) {
          usSpinnerService.stop('tdSpinner');
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
    }
  ]);
