'use strict';

// TrainingDays controller
angular.module('trainingDays')
  .controller('TrainingDaysController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$filter', '$uibModal', '$anchorScroll', 'Authentication', 'TrainingDays', '_', 'moment', 'toastr', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $filter, $uibModal, $anchorScroll, Authentication, TrainingDays, _, moment, toastr, usSpinnerService, MaterialCalendarData) {
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


      var getSeason = function(callback) {
        $scope.hasStart = true;
        $scope.hasEnd = true;
        $scope.needsPlanGen = false;
        $scope.isWorking = true;
        usSpinnerService.spin('tdSpinner');

        TrainingDays.getSeason({
          today: $scope.today.toISOString()
        }, function(season) {
          _.forEach(season, function(td) {
            td.date = moment(td.dateNumeric.toString()).toDate();

            if (moment(td.date).isSame(moment(), 'day')) {
              td.htmlID = 'today';
            }
          });

          $scope.hasStart = _.find(season, function(td) {
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
          usSpinnerService.stop('tdSpinner');
          $scope.isWorking = false;
          return callback();
        }, function(errorResponse) {
          $scope.season = null;
          $scope.isWorking = false;
          usSpinnerService.stop('tdSpinner');
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
            $scope.error = 'Server error prevented season retrieval';
          }
        });
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

          if (moment(trainingDay.date).isAfter($scope.yesterday, 'day')) {
            content += content.length > lengthOfFixedContent ? '<br>' : '';
            planActivity = getPlannedActivity(trainingDay, 'plangeneration');
            if (planActivity) {
              content += '<i>' + planActivity.activityType + ' day planned</i>';
            }
          }


          if (trainingDay.completedActivities.length > 0) {
            content += content.length > lengthOfFixedContent ? '<br>' : '';
            _.forEach(trainingDay.completedActivities, function(activity) {
              load += activity.load;
            });
            loadRating = getMetrics(trainingDay, 'actual').loadRating;
            content += load ? ' Load: ' + load + ' - ' + loadRating + ' day' : '';
          } else if (!trainingDay.scheduledEventRanking) {
            load = trainingDay.planLoad;
            content += ' Planned load: ' + trainingDay.planLoad;
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
            if (moment(date).isSameOrAfter($scope.hasStart.date)) {
              //trainingDay does not exist, we need to create it first.
              var trainingDay = new TrainingDays({
                date: date
              });

              trainingDay.$create(function(response) {
                $location.path('trainingDays/' + response._id);
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


      $scope.viewSeason = function() {
        var actualLoadArray,
          actualFormArray,
          actualFitnessArray,
          actualFatigueArray,
          // actualFormPointBorderColors,
          formPointRadius,
          planLoadArray,
          planFormArray,
          planFitnessArray,
          targetRampRateArray,
          rampRateArray,
          actualAverageRampRateArray,
          planAverageRampRateArray,
          planLoadBackgroundColors;

        var setPlanLoadBackgroundColor = function(td) {
          // Highlight goal event days.
          if (td.scheduledEventRanking === 1) {
            return '#BD7E7D';
          }

          if (moment(td.date).isBefore($scope.today, 'day')) {
            return '#EAF1F5';
          }

          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return '#FFA07A';
          }

          if (td.isSimDay) {
            // Highlight sim days when in what-if mode.
            return '#ffe4b3';
          }

          // Highlight other event days.
          if (td.scheduledEventRanking === 2) {
            return '#D1A2A1';
          }

          if (td.scheduledEventRanking === 3) {
            return '#EBD1D1';
          }

          var planActivity = getPlannedActivity(td, 'plangeneration');

          if (planActivity && planActivity.activityType === 'test') {
            return '#B2DBDA';
          }

          return '#EAF1F5';
        };

        var setActualFormPointColor = function(td) {
          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return '#FFA07A';
          }

          return '#FFFFFF';
        };

        var setFormPointRadius = function(td) {
          if (td.htmlID && td.htmlID === 'today') {
            // Highlight today by making it stand out a bit.
            return 6;
          }

          return 0;
        };

        var getPlanLoad = function(td) {
          return td.planLoad;
        };

        var getActualLoad = function(td) {
          var load = 0;

          if (moment(td.date).isAfter($scope.today, 'day')) {
            return [];
          }


          if (td.completedActivities.length > 0) {
            load = _.sumBy(td.completedActivities, function(activity) {
              return activity.load;
            });
          }

          return load;
        };

        var getPlanFitness = function(td) {
          return getMetrics(td, 'planned').fitness;
        };


        var getActualFitness = function(td) {
          if (moment(td.date).isAfter($scope.today, 'day')) {
            return null;
          }

          return getMetrics(td, 'actual').fitness;
        };

        var getActualFatigue = function(td) {
          if (moment(td.date).isAfter($scope.today, 'day')) {
            return null;
          }

          return getMetrics(td, 'actual').fatigue;
        };

        var getPlanForm = function(td) {
          return getMetrics(td, 'planned').form;
        };

        var getActualForm = function(td) {
          if (moment(td.date).isAfter($scope.today, 'day')) {
            return null;
          }

          return getMetrics(td, 'actual').form;
        };

        var getTargetRampRate = function(td) {
          if (moment(td.date).isAfter($scope.today, 'day')) {
            return getMetrics(td, 'planned').sevenDayTargetRampRate;
          }
          return getMetrics(td, 'actual').sevenDayTargetRampRate;
        };

        var getRampRate = function(td) {
          if (moment(td.date).isAfter($scope.today, 'day')) {
            return getMetrics(td, 'planned').sevenDayRampRate;
          }
          return getMetrics(td, 'actual').sevenDayRampRate;
        };

        var getActualAverageRampRate = function(td) {
          return getMetrics(td, 'actual').sevenDayAverageRampRate;
        };

        var getPlanAverageRampRate = function(td) {
          return getMetrics(td, 'planned').sevenDayAverageRampRate;
        };

        var extractDate = function(td) {
          return moment(td.date).format('ddd MMM D');
        };

        var loadChart = function(callback) {
          getSeason(function() {
            if ($scope.season) {
              planLoadArray = _.flatMap($scope.season, getPlanLoad);
              planFormArray = _.flatMap($scope.season, getPlanForm);
              planFitnessArray = _.flatMap($scope.season, getPlanFitness);
              actualLoadArray = _.flatMap($scope.season, getActualLoad);
              actualFitnessArray = _.flatMap($scope.season, getActualFitness);
              // actualFatigueArray = _.flatMap($scope.season, getActualFatigue);
              actualFormArray = _.flatMap($scope.season, getActualForm);
              planLoadBackgroundColors = _.flatMap($scope.season, setPlanLoadBackgroundColor);
              formPointRadius = _.flatMap($scope.season, setFormPointRadius);
              // actualFormPointBorderColors = _.flatMap($scope.season, setActualFormPointColor);
              $scope.chartLabels = _.flatMap($scope.season, extractDate);

              if ($scope.authentication.user.levelOfDetail > 2) {
                targetRampRateArray = _.flatMap($scope.season, getTargetRampRate);
                rampRateArray = _.flatMap($scope.season, getRampRate);
                planAverageRampRateArray = _.flatMap($scope.season, getPlanAverageRampRate);
                actualAverageRampRateArray = _.flatMap($scope.season, getActualAverageRampRate);
                $scope.chartData = [actualLoadArray, planLoadArray, actualFitnessArray, planFitnessArray, actualFormArray, planFormArray, targetRampRateArray, rampRateArray, actualAverageRampRateArray, planAverageRampRateArray];
              } else {
                $scope.chartData = [actualLoadArray, planLoadArray, actualFitnessArray, planFitnessArray, actualFormArray, planFormArray];
              }

              $scope.chartDatasetOverride = [
                {
                  label: 'Load - Actual',
                  yAxisID: 'y-axis-0',
                  borderWidth: 1,
                  // backgroundColor: actualLoadBackgroundColors,
                  type: 'bar'
                },
                {
                  label: 'Load - Plan ',
                  yAxisID: 'y-axis-0',
                  borderWidth: 1,
                  backgroundColor: planLoadBackgroundColors,
                  type: 'bar'
                },
                {
                  label: 'Fitness - Actual',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                },
                {
                  label: 'Fitness - Plan',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                },
                {
                  label: 'Form - Actual',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: formPointRadius,
                  // pointBorderColor: actualFormPointBorderColors,
                  type: 'line'
                },
                {
                  label: 'Form - Plan',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: formPointRadius,
                  // pointBorderColor: '#4D5360',
                  type: 'line'
                },
                {
                  label: 'Target Ramp Rate',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                },
                {
                  label: 'Ramp Rate',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                },
                {
                  label: 'Average Ramp Rate - Actual',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                },
                {
                  label: 'Average Ramp Rate - Plan',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  type: 'line'
                }
                // {
                //   label: 'Fatigue',
                //   borderWidth: 3,
                //   pointRadius: 0,
                //   type: 'line'
                // },
              ];
            }

            if (callback) {
              return callback();
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
            loadChart(function() {
              if (!$scope.authentication.user.timezone) {
                toastr.warning('Please go to <strong>My Profile</strong> and set your timezone.', 'Timezone Not Set', {
                  allowHtml: true,
                  timeOut: 7000
                });
              }
              if ($scope.needsPlanGen) {
                toastr.info('You should update your season.', 'Season View May Be Out Of Date');
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

        $scope.error = null;

        $scope.chartColors = [
          '#97BBCD',
          '#DCDCDC',
          '#FDB45C',
          '#949FB1',
          '#46BFBD',
          '#4D5360',
          '#F7464A',
          '#79B685'
        ];

        $scope.chartOptions = {
          legend: {
            display: true,
            position: 'bottom'
          },
          scales: {
            xAxes: [{
              stacked: true,
              gridLines: {
                display: false
              }
            }],
            yAxes: [{
              position: 'left',
              id: 'y-axis-0'
            }, {
              position: 'right',
              id: 'y-axis-1',
              gridLines: {
                display: false
              },
              ticks: {
                display: false,
                max: 13,
                min: -2,
                stepSize: 1
              }
            }]
          },
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
                  td = $scope.season[tooltipItems[0].index],
                  planActivity;

                // Display load rating for passed days,
                // advised activity type for today or tomorrow,
                // planned activity type for future days.
                if (moment(td.date).isBefore($scope.today, 'day')) {
                  text = getMetrics(td, 'actual').loadRating + ' day';
                } else if (!td.scheduledEventRanking && moment(td.date).isBetween($scope.today, $scope.tomorrow, 'day', '[]')) {
                  planActivity = getPlannedActivity(td, 'advised');
                  if (planActivity) {
                    text = planActivity.activityType + ' day';
                  }
                } else if (!td.scheduledEventRanking) {
                  planActivity = getPlannedActivity(td, 'plangeneration');
                  if (planActivity) {
                    text = planActivity.activityType + ' day';
                  }
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
          $scope.isWorking = true;
          usSpinnerService.spin('tdSpinner');
          $scope.error = null;

          TrainingDays.genPlan({
            trainingDate: $scope.today.toISOString()
          }, function(response) {
            usSpinnerService.stop('tdSpinner');
            $scope.isWorking = false;
            toastr.success(response.text, response.title); //, { timeOut: 10000 });
            loadChart();
          }, function(errorResponse) {
            $scope.isWorking = false;
            usSpinnerService.stop('tdSpinner');
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
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
          //TODO: confirm revert if simConfigUnderway
          if ($scope.simConfigUnderway || $scope.simHasRun) {
            $scope.revertSim();
          } else {
            initSimFlags();
          }
        };

        $scope.openSimDay = function(id) {
          var modalInstance = $uibModal.open({
            templateUrl: 'simDay.html',
            controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
              $scope.trainingDay = TrainingDays.getSimDay({
                trainingDayId: id
              },
                function(trainingDay) {
                  trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
                },
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

        // $scope.nextBatch = function() {
        //   if ($scope.trainingDaysChunked && $scope.trainingDaysChunked.length > $scope.nextChunk) {
        //     $scope.trainingDays = _.concat($scope.trainingDays, $scope.trainingDaysChunked[$scope.nextChunk]);
        //     $scope.nextChunk++;
        //   }
        // };

        //The following is used on the TD list page for the Today button.
        //This page is no longer available to non-admin users.
        // $scope.scrollTo = function(id) {
        //   var currentPath = $location.hash();
        //   $location.hash(id);
        //   $anchorScroll();
        //   //reset to currentPath to keep from changing URL in browser.
        //   $location.hash(currentPath);
        // };

        getAllTrainingDays(function() {
          //Doing infinite scrolling all client-side.
          //May need to switch to server-side at some point. Or some combo of client and server side.
          // $scope.trainingDaysChunked = _.chunk($scope.trainingDaysAll, 56);
          // $scope.trainingDays = $scope.trainingDaysChunked[0];
          // $scope.nextChunk = 1;
          // 10/7/2016: infinite scrolling was breaking deployment.
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
            toastr.success('You should update your profile now.', 'Start Created', { timeOut: 7000 });
            $state.go('settings.profile');
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
            $location.path('trainingDays/' + trainingDay._id);
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
          var selected = $filter('filter')($scope.eventRankings, { value: $scope.trainingDay.scheduledEventRanking }),
            dayText = $scope.plannedActivity ? $scope.plannedActivity.activityType.charAt(0).toUpperCase() + $scope.plannedActivity.activityType.slice(1) + ' Day' : 'Training Day';
          return ($scope.trainingDay.scheduledEventRanking && selected.length) ? selected[0].text : dayText;
        };

        $scope.$watch('trainingDay.scheduledEventRanking', function(ranking) {
          // If off day or a not a scheduled event, zero out estimate.
          if (ranking === 9) {
            $scope.trainingDay.estimatedLoad = 0;
          }
        });

        $scope.getDay = function(date) {
          $scope.error = null;

          TrainingDays.getDay({
            trainingDate: date.toISOString()
          }, function(trainingDay) {
            $state.go('trainingDays.view', { trainingDayId: trainingDay._id });
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
              $state.go('season');
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
            return $scope.update(true, $scope.trainingDay, function(trainingDay) {
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
            return $scope.update(true, $scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Estimated load must be a positive whole number less than 1000.';
        };

        $scope.saveCompletedActivity = function(data, created) {
          angular.extend(data, { created: created });
          var index = _.indexOf($scope.trainingDay.completedActivities, _.find($scope.trainingDay.completedActivities, { created: created }));
          $scope.trainingDay.completedActivities.splice(index, 1, data);

          $scope.update(true, $scope.trainingDay, function(trainingDay) {
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
          return $scope.update(true, $scope.trainingDay, function(trainingDay) {
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
            resetViewObjects(trainingDay);
          }, function(errorResponse) {
            if (errorResponse.data && errorResponse.data.message) {
              $scope.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              $scope.error = 'Server error prevented advice retrieval.';
            }
          });
        };

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
      };

      $scope.update = function(isValid, trainingDay, callback) {
        //We are sometimes being called as if we were synchronous here.
        //Note that we take a callback but do not return an error as we handle it here.
        $scope.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');

          if (callback) {
            return callback(null);
          }

          return false;
        }

        if (!trainingDay) {
          trainingDay = $scope.trainingDay;
        }

        trainingDay.$update(function(trainingDay) {
          //We need to correct the date coming from server-side as it might not have self corrected yet.
          trainingDay.date = moment(trainingDay.dateNumeric.toString()).toDate();
          $scope.trainingDay = trainingDay;
          if (callback) {
            return callback(trainingDay);
          }
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
            $scope.error = 'Server error prevented training day update.';
          }

          if (callback) {
            return callback(null);
          }

          return false;
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
