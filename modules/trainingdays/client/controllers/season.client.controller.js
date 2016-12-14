'use strict';

angular.module('trainingDays')
  .controller('SeasonController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$filter', '$uibModal', '$anchorScroll', 'Authentication', 'TrainingDays', 'Season', 'Feedback', '_', 'moment', 'toastr', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $filter, $uibModal, $anchorScroll, Authentication, TrainingDays, Season, Feedback, _, moment, toastr, usSpinnerService, MaterialCalendarData) {
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

        var loadChart = function() {
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

              planLoadArray = _.flatMap($scope.season, getPlanLoad);
              planFormArray = _.flatMap($scope.season, getPlanForm);
              planFitnessArray = _.flatMap($scope.season, getPlanFitness);
              actualLoadArray = _.flatMap($scope.season, getActualLoad);
              actualFitnessArray = _.flatMap($scope.season, getActualFitness);
              actualFatigueArray = _.flatMap($scope.season, getActualFatigue);
              actualFormArray = _.flatMap($scope.season, getActualForm);
              planLoadBackgroundColors = _.flatMap($scope.season, setPlanLoadBackgroundColor);
              formPointRadius = _.flatMap($scope.season, setFormPointRadius);
              // actualFormPointBorderColors = _.flatMap($scope.season, setActualFormPointColor);
              $scope.chartLabels = _.flatMap($scope.season, extractDate);

              if ($scope.authentication.user.levelOfDetail > 2) {
                targetRampRateArray = _.flatMap($scope.season, getTargetRampRate);
                // rampRateArray = _.flatMap($scope.season, getRampRate);
                planAverageRampRateArray = _.flatMap($scope.season, getPlanAverageRampRate);
                actualAverageRampRateArray = _.flatMap($scope.season, getActualAverageRampRate);
                // $scope.chartData = [actualLoadArray, planLoadArray, actualFitnessArray, planFitnessArray, actualFormArray, planFormArray, actualFatigueArray, targetRampRateArray, rampRateArray, actualAverageRampRateArray, planAverageRampRateArray];
                $scope.chartData = [actualLoadArray, planLoadArray, actualFitnessArray, planFitnessArray, actualFormArray, planFormArray, actualFatigueArray, targetRampRateArray, actualAverageRampRateArray, planAverageRampRateArray];
              } else {
                $scope.chartData = [actualLoadArray, planLoadArray, actualFitnessArray, planFitnessArray, actualFormArray, planFormArray, actualFatigueArray];
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
                  hitRadius: 4,
                  type: 'line'
                },
                {
                  label: 'Fitness - Plan',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: 0,
                  hitRadius: 4,
                  type: 'line'
                },
                {
                  label: 'Form - Actual',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: formPointRadius,
                  hitRadius: 4,
                  // pointBorderColor: actualFormPointBorderColors,
                  type: 'line'
                },
                {
                  label: 'Form - Plan',
                  yAxisID: 'y-axis-0',
                  borderWidth: 3,
                  pointRadius: formPointRadius,
                  hitRadius: 4,
                  // pointBorderColor: '#4D5360',
                  type: 'line'
                },
                {
                  label: 'Fatigue',
                  borderWidth: 3,
                  pointRadius: 0,
                  hitRadius: 4,
                  type: 'line'
                },
                {
                  label: 'Target Ramp Rate',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  hitRadius: 4,
                  type: 'line'
                },
                // {
                //   label: 'Ramp Rate',
                //   yAxisID: 'y-axis-1',
                //   borderWidth: 3,
                //   pointRadius: 0,
                //   hitRadius: 4,
                //   type: 'line'
                // },
                {
                  label: 'Average Ramp Rate - Actual',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  hitRadius: 4,
                  type: 'line'
                },
                {
                  label: 'Average Ramp Rate - Plan',
                  yAxisID: 'y-axis-1',
                  borderWidth: 3,
                  pointRadius: 0,
                  hitRadius: 4,
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

        $scope.chartColors = [
          '#97BBCD', //Load - Actual
          '#DCDCDC', //Load - Plan
          '#FDB45C', //Fitness - Actual
          '#949FB1', //Fitness - Plan
          '#46BFBD', //Form - Actual
          '#4D5360', //Form - Plan
          '#F7464A', //Fatigue
          '#79B685', //Target Ramp Rate
          '#B23E5B', //Ramp Rate
          '#DF8B4D', //Average Ramp Rate - Actual
          '#E2D769', //Average Ramp Rate - Plan
          '#8AEB90'

        ];

        $scope.chartOptions = {
          legend: {
            display: true,
            position: 'top'
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
                // By using an array here each element will be on a new line.
                var text,
                  td = $scope.season[tooltipItems[0].index];

                if (td.scheduledEventRanking) {
                  switch (td.scheduledEventRanking) {
                    case 1:
                      text = ['Goal Event'];
                      break;
                    case 2:
                      text = ['Medium Priority Event'];
                      break;
                    case 3:
                      text = ['Low Priority Event'];
                      break;
                    case 9:
                      text = ['Scheduled Off Day'];
                      break;
                  }

                  if (td.estimatedLoad > 0) {
                    text.push('Estimated Load ' + td.estimatedLoad);
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
                    text = mapActivityTypeToVerbiage(planActivity.activityType);
                  }
                } else if (!td.scheduledEventRanking) {
                  planActivity = getPlannedActivity(td, 'plangeneration');
                  if (planActivity) {
                    text = mapActivityTypeToVerbiage(planActivity.activityType);
                    if ($scope.authentication.user.levelOfDetail > 2) {
                      text += ' period: ' + td.period;
                      text += ' rationale: ' + planActivity.rationale;
                    }
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
              $state.go('trainingDayView', { trainingDayId: td._id });
            }
          }
        };

        $scope.genPlan = function() {
          $scope.isWorking = true;
          usSpinnerService.spin('tdSpinner');
          toastr.info('Update has been initiated.', 'Season Update'); //, { timeOut: 7000 });
          $scope.error = null;

          TrainingDays.genPlan({
            trainingDate: $scope.today.toISOString()
          }, function(response) {
            usSpinnerService.stop('tdSpinner');
            $scope.isWorking = false;
            toastr.success(response.statusMessage.text, response.statusMessage.title); //, { timeOut: 10000 });
            // Reload user object as notifications may have been updated.
            Authentication.user = response.user;
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

              $scope.eventTerrains = [
                { value: 1, text: 'Flat' },
                { value: 2, text: 'Slightly Hilly' },
                { value: 3, text: 'Hilly' },
                { value: 4, text: 'Very Hilly' },
                { value: 5, text: 'Mountainous' }
              ];

              $scope.showRanking = function() {
                var selected = $filter('filter')($scope.eventRankings, { value: $scope.trainingDay.scheduledEventRanking });
                return ($scope.trainingDay.scheduledEventRanking && selected.length) ? selected[0].text : 'Training Day';
              };

              $scope.showTerrain = function() {
                var selected = $filter('filter')($scope.eventTerrains, { value: $scope.trainingDay.eventTerrain });
                return ($scope.trainingDay.eventTerrain && selected.length) ? selected[0].text : 'Not Specified';
              };

              $scope.$watch('trainingDay.scheduledEventRanking', function(ranking) {
                // If not a goal event, zero out estimate.
                if (String(ranking) !== '1') {
                  $scope.trainingDay.estimatedLoad = 0;
                  $scope.trainingDay.eventTerrain = 0;
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
              },
              showTerrain: function() {
                return $scope.showTerrain;
              }
            }
          });

          modalInstance.result
            .then(function(trainingDay) {
              trainingDay.$update(function(trainingDay) {
                loadChart();
                $scope.simConfigUnderway = true;
              }, function(errorResponse) {
                if (errorResponse.data && errorResponse.data.message) {
                  $scope.error = errorResponse.data.message;
                } else {
                  //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
                  $scope.error = 'Server error prevented training day update.';
                }
              });
            }, function() {
              //User canceled out of dialog.
            })
            .finally(function() {
              return;
            });
        };

        initPage();
      };

      $scope.checkGiveFeedback = function(trainingDay) {
        if (trainingDay.completedActivities.length > 0 && getMetrics(trainingDay, 'actual').loadRating === 'hard' && trainingDay.trainingEffortFeedback === null) {
          $scope.openGiveFeedback(trainingDay);
        }
      };

      $scope.openGiveFeedback = function(trainingDay) {
        Feedback.show(trainingDay)
          .then(function(trainingDay) {}, function() {})
          .finally(function() {
            trainingDay.$update(function(trainingDay) {}, function(errorResponse) {
              if (errorResponse.data && errorResponse.data.message) {
                $scope.error = errorResponse.data.message;
              } else {
                $scope.error = 'Server error prevented training day update.';
              }
            });
          });
      };
    }
  ]);
