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

      //Set default dates.
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

      $scope.yesterday = moment().subtract(1, 'day').startOf('day').toDate();
      $scope.tomorrow = moment().add(1, 'days').startOf('day').toDate();
      $scope.dayAfterTomorrow = moment().add(2, 'days').startOf('day').toDate();

      // Check if provider is already in use with current user
      $scope.isConnectedSocialAccount = function(provider) {
        return $scope.authentication.user.provider === provider || ($scope.authentication.user.additionalProvidersData && $scope.authentication.user.additionalProvidersData[provider]);
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

            if (moment(td.date).isSame(moment(), 'day')) {
              td.htmlID = 'today';
            }
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
              return td.scheduledEventRanking === 1 && moment(td.date).isAfter(moment());
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

      $scope.viewCalendar = function() {
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
          if (trainingDay.plannedActivities[0] && trainingDay.plannedActivities[0].activityType !== 'event' && moment(trainingDay.date).isAfter($scope.yesterday, 'day')) {
            content += content.length > lengthOfFixedContent ? '<br>' : '';
            content += '<i>' + trainingDay.plannedActivities[0].activityType + ' day planned</i>';
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
          //   content += '<br><i>Form: ' + trainingDay.form + '</i>';
          // }

          content += '<br><i>Period: ' + trainingDay.period + '</i>';

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
            getSeason(function() {
              if ($scope.season) {
                _.forEach($scope.season, function(td) {
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

        initCalendar();
      };

      //Highlight today in calendar view
      //Note that this will not survive a change in calendar layout (calendar to agenda or v.v.).
      //We need a callback from the calendar module. Or something.
      angular.element(document).ready(function() {
        jQuery('.today-on-calendar').parent().parent().addClass('md-whiteframe-7dp');
      });


      $scope.viewSeason = function() {
        var loadArray,
          formArray,
          fitnessArray,
          fatigueArray,
          formPointBorderColors,
          formPointRadius,
          loadBackgroundColors;

        var extractLoad = function(td) {
          var load = 0;
          if (td.completedActivities.length > 0) {
            load = _.sumBy(td.completedActivities, function(activity) {
              return activity.load;
            });
          } else if (td.plannedActivities.length > 0) {
            load = (td.plannedActivities[0].targetMinLoad + td.plannedActivities[0].targetMaxLoad) / 2;
          }

          return load;
        };

        var setLoadBackgroundColor = function(td) {
          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return '#97BBCD';
          }

          if (td.isSimDay) {
            // Highlight sim days.
            return '#ffe4b3';
          }

          // Highlight event days.
          if (td.scheduledEventRanking === 1) {
            return '#BD7E7D';
          }

          if (td.plannedActivities[0] && td.plannedActivities[0].activityType === 'test') {
            return '#B2DBDA';
          }

          if (td.scheduledEventRanking === 2) {
            return '#D1A2A1';
          }

          if (td.scheduledEventRanking === 3) {
            return '#EBD1D1';
          }

          return '#EAF1F5';
        };

        var setFormPointColor = function(td) {
          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return '#98D8E2';
          }

          return '#FFFFFF';
        };

        var setFormPointRadius = function(td) {
          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return 6;
          }

          return 3;
        };

        var loadChart = function(argument) {
          getSeason(function() {
            if ($scope.season) {
              loadArray = _.flatMap($scope.season, extractLoad);
              loadBackgroundColors = _.flatMap($scope.season, setLoadBackgroundColor);
              formPointRadius = _.flatMap($scope.season, setFormPointRadius);
              formPointBorderColors = _.flatMap($scope.season, setFormPointColor);
              formArray = _.flatMap($scope.season, function(td) { return td.form; });
              fitnessArray = _.flatMap($scope.season, function(td) { return td.fitness; });
              fatigueArray = _.flatMap($scope.season, function(td) { return td.fatigue; });
              $scope.chartLabels = _.flatMap($scope.season, function extractDate(td) { return moment(td.date).format('ddd MMM D'); });
              $scope.chartData = [loadArray, fitnessArray, fatigueArray, formArray];
              $scope.chartDatasetOverride = [
                {
                  label: 'Load',
                  borderWidth: 1,
                  backgroundColor: loadBackgroundColors,
                  type: 'bar'
                },
                {
                  label: 'Fitness',
                  borderWidth: 3,
                  type: 'line'
                },
                {
                  label: 'Fatigue',
                  borderWidth: 3,
                  type: 'line'
                },
                {
                  label: 'Form',
                  borderWidth: 3,
                  pointRadius: formPointRadius,
                  pointBorderColor:  formPointBorderColors,
                  type: 'line'
                }
              ];
            }
          });
        };

        var initSimFlags = function() {
          $scope.simMode = false;
          $scope.simConfigUnderway = false; //will be set to true once user changes a TD.
          $scope.simHasRun = false;
        };

        var initPage = function(argument) {
          //We need to clean up any potential left over sim days.
          TrainingDays.finalizeSim({
            commit: 'no'
          }, function(response) {
            initSimFlags();
            loadChart();
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              $scope.error = 'Server error prevented simulation clean-up.';
            }
          });
        };

        $scope.error = null;

        $scope.chartOptions = {
          legend: { display: true },
          tooltips: {
            callbacks: {
              beforeTitle: function(tooltipItems) {
                return $scope.season[tooltipItems[0].index].name;
              },
              afterTitle: function(tooltipItems) {
                var text = '',
                  td = $scope.season[tooltipItems[0].index];

                if (td.scheduledEventRanking) {
                  switch (td.scheduledEventRanking) {
                    case 1:
                      text = 'Goal Event';
                      break;
                    case 2:
                      text = 'Medium Priority Event';
                      break;
                    case 3:
                      text = 'Low Priority Event';
                      break;
                    case 9:
                      text = 'Scheduled Off Day';
                      break;
                  }
                }

                return text;
              },
              footer: function(tooltipItems) {
                var text = '',
                  td = $scope.season[tooltipItems[0].index];

                if (td.plannedActivities[0] && moment(td.date).isAfter($scope.yesterday, 'day')) {
                  //Display future advice
                  if (td.plannedActivities[0].activityType !== 'event') {
                    text = td.plannedActivities[0].activityType + ' day';
                  }
                } else {
                  //Display load rating
                  text = td.loadRating + ' day';
                }

                return text;
              }
            }
          }
        };

        $scope.onChartClick = function(points) {
          if (points.length > 0) {
            var td = $scope.season[points[0]._index];
            if ($scope.simMode) {
              if (moment(td.date).isSameOrAfter(moment().startOf('day'))) {
                //Only allow update of today or after.
                //Apparently we are outside the Angular context here.
                $scope.$apply(function() {
                  $scope.openSimDay(td._id);
                });
              }
            } else {
              $state.go('trainingDays.view', { trainingDayId: td._id });
            }
          }
        };

        $scope.genPlan = function() {
          usSpinnerService.spin('tdSpinner');
          $scope.error = null;

          TrainingDays.genPlan({
            trainingDate: $scope.today.toISOString()
          }, function(response) {
            usSpinnerService.stop('tdSpinner');
            $location.path('season');
            loadChart();
          }, function(errorResponse) {
            usSpinnerService.stop('tdSpinner');
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
              $scope.error = 'Server error prevented season update.';
            }
          });
        };

        $scope.startSim = function() {
          //enable sim controls, disable others.
          $scope.simMode = true;
        };

        $scope.runSim = function() {
          //genPlan using sim days.
          $scope.simConfigUnderway = false;
          $scope.simHasRun = true;
          $scope.genPlan();
        };

        $scope.commitSim = function() {
          TrainingDays.finalizeSim({
            commit: 'yes'
          }, function(response) {
            initSimFlags();
            loadChart();
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              $scope.error = 'Server error prevented commit of simulation.';
            }
          });
        };

        $scope.revertSim = function() {
          TrainingDays.finalizeSim({
            commit: 'no'
          }, function(response) {
            initSimFlags();
            $scope.genPlan();
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              $scope.error = 'Server error prevented revert of simulation.';
            }
          });
        };

        $scope.cancelSim = function() {
          //confirm revert if simConfigUnderway
          //if confirmed, revertSim()
          // $scope.revertSim();
          //otherwise, reset flags.
          initSimFlags();
        };

        $scope.openSimDay = function(id) {
          var modalInstance = $uibModal.open({
            templateUrl: 'simDay.html',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
              $scope.trainingDay = TrainingDays.getSimDay({
                trainingDayId: id
              },
                function(trainingDay) {},
                function(errorResponse) {
                  if (errorResponse.data && errorResponse.data.message) {
                    $scope.error = errorResponse.data.message;
                  } else {
                    $scope.error = 'Server error prevented training day retrieval.';
                  }
                }
              );
              $scope.eventRankings = [
                { value: 0, text: 'Training Day' },
                { value: 1, text: 'Goal Event' },
                { value: 2, text: 'Medium Priority Event' },
                { value: 3, text: 'Low Priority Event' },
                { value: 9, text: 'Off Day' }
              ];

              $scope.showRanking = function() {
                var selected = $filter('filter')($scope.eventRankings, { value: $scope.trainingDay.scheduledEventRanking });
                return ($scope.trainingDay.scheduledEventRanking && selected.length) ? selected[0].text : 'Training Day';
              };

              $scope.$watch('trainingDay.scheduledEventRanking', function(ranking) {
                // If off day or a not a scheduled event, zero out estimate.
                if (String(ranking) === '9' || String(ranking) === '0') {
                  $scope.trainingDay.estimatedLoad = 0;
                }
              });

              $scope.saveSimDay = function() {
                $uibModalInstance.close($scope.trainingDay);
              };

              $scope.cancelSimDay = function() {
                $uibModalInstance.dismiss('cancel');
              };
            }],
            resolve: {
              trainingDay: function() {
                return $scope.trainingDay;
              },
              eventRankings: function() {
                return $scope.eventRankings;
              },
              showRanking: function() {
                return $scope.showRanking;
              }
            }
          });

          modalInstance.result.then(function(trainingDay) {
            $scope.update(true, trainingDay);
            loadChart();
            $scope.simConfigUnderway = true;
          }, function() {
            //User cancelled out of dialog.
          }).finally(function() {
            return;
          });
        };

        initPage();
      };

      $scope.listTrainingDays = function() {
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
                return td.scheduledEventRanking === 1 && moment(td.date).isAfter(moment());
              })
              .sortBy(['date'])
              .head()
              .value();

            if ($scope.hasEnd) {
              $scope.needsPlanGen = _.find($scope.trainingDaysAll, function(td) {
                //Determine is there are any TDs before next goal which do not have plannedActivities.
                //If there are we need to offer plan gen.
                return moment(td.date).isAfter(moment().add(1, 'day')) && moment(td.date).isBefore(moment($scope.hasEnd.date).add(1, 'day')) && td.plannedActivities.length < 1;
              });
            }

            if (callback) {
              return callback();
            }
          });
        };

        $scope.nextBatch = function() {
          if ($scope.trainingDaysChunked && $scope.trainingDaysChunked.length > $scope.nextChunk) {
            $scope.trainingDays = _.concat($scope.trainingDays, $scope.trainingDaysChunked[$scope.nextChunk]);
            $scope.nextChunk++;
          }
        };

        //The following is used on the TD list page for the Today button.
        //This page is no longer available to non-admin users.
        $scope.scrollTo = function(id) {
          var currentPath = $location.hash();
          $location.hash(id);
          $anchorScroll();
          //reset to currentPath to keep from changing URL in browser.
          $location.hash(currentPath);
        };

        getAllTrainingDays(function() {
          //Doing infinite scrolling all client-side.
          //May need to switch to server-side at some point. Or some combo of client and server side.
          $scope.trainingDaysChunked = _.chunk($scope.trainingDaysAll, 56);
          $scope.trainingDays = $scope.trainingDaysChunked[0];
          $scope.nextChunk = 1;
        });
      };

      $scope.setUpStartingPoint = function() {
        var minStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().subtract(1, 'day').startOf('day').toDate();
        var maxStartDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;

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
            fitness: this.fitness,
            fatigue: this.fatigue,
            notes: this.notes
          });

          // Redirect after save
          trainingDay.$create(function(response) {
            $location.path('season');

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
          if (ranking === '9') {
            $scope.estimatedLoad = 0;
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
            $location.path('season');

            // Clear form fields
            $scope.name = '';
            $scope.date = null;
            $scope.scheduledEventRanking = '0';
            $scope.estimatedLoad = 0;
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
      };

      $scope.requestAdvice = function() {
        var minAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : $scope.today;
        var maxAdviceDate = $scope.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();

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
          { value: 'simulation', text: 'Do a goal event simulation' }, //TODO: do not offer this if no goal exists.
          { value: 'test', text: 'Do a threshold power test' }
        ];

        $scope.eventRankings = [
          { value: 1, text: 'Goal Event' },
          { value: 2, text: 'Medium Priority Event' },
          { value: 3, text: 'Low Priority Event' },
          { value: 9, text: 'Off Day' },
          { value: 0, text: 'Training Day' }
        ];

        $scope.showRanking = function() {
          var selected = $filter('filter')($scope.eventRankings, { value: $scope.trainingDay.scheduledEventRanking }),
            dayText = $scope.trainingDay.plannedActivities && $scope.trainingDay.plannedActivities[0] ? $scope.trainingDay.plannedActivities[0].activityType.charAt(0).toUpperCase() + $scope.trainingDay.plannedActivities[0].activityType.slice(1) + ' Day' : 'Nothing Planned';
          return ($scope.trainingDay.scheduledEventRanking && selected.length) ? selected[0].text : dayText;
        };

        $scope.$watch('trainingDay.scheduledEventRanking', function(ranking) {
          // If off day or a not a scheduled event, zero out estimate.
          if (ranking === 9) {
            $scope.trainingDay.estimatedLoad = 0;
          }
        });

        function prepForTDView(trainingDay) {
          //not sure why Mongo/Mongoose returns a string for a date field
          //but I have to convert it back to a date to get my date picker
          //to consider it a valid date if the user does not pick a new date.
          trainingDay.date = new Date(trainingDay.date);
          $scope.previousDay = moment(trainingDay.date).subtract(1, 'day').toDate();
          $scope.nextDay = moment(trainingDay.date).add(1, 'day').toDate();
          $scope.showGetAdvice = moment(trainingDay.date).isBetween($scope.yesterday, $scope.dayAfterTomorrow, 'day');
          $scope.allowFormAndFitnessTrueUp = moment(trainingDay.date).isBefore($scope.tomorrow, 'day');
          $scope.showFormAndFitness = trainingDay.fitness !== 0 || trainingDay.fatigue !== 0 || trainingDay.form !== 0;
          $scope.showCompletedActivities = moment(trainingDay.date).isBefore($scope.tomorrow, 'day');
          return trainingDay;
        }

        $scope.getDay = function(date) {
          $scope.error = null;

          $scope.trainingDay = TrainingDays.getDay({
            trainingDate: date.toISOString()
          }, function(trainingDay) {
            prepForTDView(trainingDay);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
              $scope.error = 'Server error prevented training day retrieval.';
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
              $location.path('season');
            });
          }
        };

        $scope.updateEventRanking = function(priority) {
          //http://stackoverflow.com/questions/5971645/what-is-the-double-tilde-operator-in-javascript
          var n = ~~Number(priority);

          if (n === $scope.trainingDay.scheduledEventRanking) {
            //no change.
            return;
          }

          if (String(n) === priority && (n >= 0 && n <= 3) || n === 9) {
            return $scope.update(true);
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
            return $scope.update(true);
          }

          return 'Estimated load must be a positive whole number less than 1000.';
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

        // Find existing TrainingDay
        $scope.trainingDay = TrainingDays.get({
          trainingDayId: $stateParams.trainingDayId
        }, function(trainingDay) {
          prepForTDView(trainingDay);
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ""}
            $scope.error = 'Server error prevented training day retrieval.';
          }
        });
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

      $scope.checkGiveFeedback = function(trainingDay) {
        if (trainingDay.completedActivities.length > 0 && trainingDay.loadRating === 'hard' && trainingDay.trainingEffortFeedback === null) {
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
          return $scope.update(true, trainingDay);
        });
      };
    }
  ]);
