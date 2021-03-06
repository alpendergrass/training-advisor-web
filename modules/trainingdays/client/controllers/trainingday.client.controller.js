'use strict';

angular.module('trainingDays')
  .controller('TrainingDayController', ['$scope', '$state', '$stateParams', '$compile', '$filter', 'Authentication', 'TrainingDays', 'Feedback', 'Util', '_', 'moment', 'toastr', 'usSpinnerService',
    function($scope, $state, $stateParams, $compile, $filter, Authentication, TrainingDays, Feedback, Util, _, moment, toastr, usSpinnerService) {
      $scope.authentication = Authentication;
      $scope.util = Util;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      });

      $scope._ = _;
      $scope.today = moment().startOf('day').toDate();
      $scope.yesterday = moment().subtract(1, 'day').startOf('day').toDate();
      $scope.tomorrow = moment().add(1, 'days').startOf('day').toDate();
      $scope.dayAfterTomorrow = moment().add(2, 'days').startOf('day').toDate();

      $scope.viewTrainingDay = function() {
        $scope.activityTypes = [
          { value: 'easy', text: 'Do an easy ride' },
          { value: 'moderate', text: 'Do a moderate ride' },
          { value: 'hard', text: 'Do a hard ride' },
          { value: 'test', text: 'Do a threshold power test' }
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
          $scope.checkGiveFeedback(trainingDay);

        }

        function showRanking(trainingDay) {
          if (!trainingDay) {
            return '';
          }

          if ($scope.trainingDay.scheduledEventRanking) {
            return Util.getRankingDescription($scope.trainingDay.scheduledEventRanking);
          } else {
            return $scope.plannedActivity ? Util.mapActivityTypeToVerbiage($scope.plannedActivity.activityType) : 'Training Day';
          }
        }

        function resetViewObjects(trainingDay) {
          $scope.plannedActivity = Util.getPlannedActivity(trainingDay, $scope.source);
          $scope.plannedActivityDescription = Util.getPlannedActivityDescription($scope.plannedActivity, trainingDay.scheduledEventRanking);
          $scope.requestedActivity = Util.getPlannedActivity(trainingDay, 'requested');
          $scope.plannedMetrics = Util.getMetrics($scope.trainingDay, 'planned');
          $scope.actualMetrics = Util.getMetrics($scope.trainingDay, 'actual');
          $scope.dayRanking = showRanking(trainingDay);
          $scope.dayTerrain = Util.getTerrainDescription(trainingDay.eventTerrain);
        }

        // Check if provider is already in use with current user
        $scope.isConnectedSocialAccount = function(provider) {
          return $scope.authentication.user.provider === provider || ($scope.authentication.user.additionalProvidersData && $scope.authentication.user.additionalProvidersData[provider]);
        };

        $scope.getDay = function(date) {
          $scope.error = null;
          var dateNumeric = Util.toNumericDate(date);

          TrainingDays.getDay({
            trainingDateNumeric: dateNumeric
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
          $scope.trainingDay.$remove(function(deletedTD) {
            // Reload user to pick up changes in notifications.
            Authentication.user = deletedTD.user;
            $state.go('dashboard');
          });
        };

        $scope.updateEventRanking = function(priority) {
          if ((priority >= 0 && priority <= 3) || priority === 9) {
            if (priority !== 1 && priority !== 2 && priority !== 3) {
              $scope.trainingDay.estimatedLoad = 0;
              $scope.trainingDay.eventTerrain = 0;
            }
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Valid eventRankings are 0, 1, 2 and 3. And 9.';
        };

        $scope.updateEstimatedLoad = function(estimate) {
          //http://stackoverflow.com/questions/5971645/what-is-the-double-tilde-operator-in-javascript
          var n = ~~Number(estimate);

          if (n === $scope.trainingDay.estimatedLoad) {
            //no change.
            return;
          }

          if (String(n) === estimate && n >= 0 && n <= 9999) {
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Estimated load must be a positive whole number less than 10000.';
        };

        $scope.updateEventTerrain = function(terrain) {
          if (terrain >= 0 && terrain <= 5) {
            return $scope.update($scope.trainingDay, function(trainingDay) {
              if (trainingDay) {
                resetViewObjects(trainingDay);
              }
            });
          }

          return 'Terrain must be a whole number between 0 and 5.';
        };

        $scope.saveCompletedActivity = function(data, created) {
          var index = _.indexOf($scope.trainingDay.completedActivities, _.find($scope.trainingDay.completedActivities, { created: created }));

          if (index > -1) {
            // Is an existing activity.
            var activity = $scope.trainingDay.completedActivities[index];
            activity.edited = true;
            activity.load = data.load;
            activity.intensity = data.intensity;
            activity.notes = data.notes;
          } else {
            // We are creating an activity, replace the place-holder one created when we clicked the create button.
            $scope.trainingDay.completedActivities.splice(index, 1, data);
          }

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
            intensity: 0,
            elevationGain: 0,
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
          if ($scope.authentication.user.ftpLog.length < 1) {
            toastr.error('You must set <a class="decorated-link" href="/settings/profile">Functional Threshold Power</a> before you can get Strava activities.', {
              allowHtml: true, timeOut: 7000
            });
            return;
          }

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
          // For normal users only call getAdvice if the user wants an alternative activity (e.g., easy instead of hard).
          // Allow super user to request advice for any day.
          if ($scope.alternateActivity || ($scope.authentication.user.levelOfDetail > 2 && !moment($scope.trainingDay.date).isBetween($scope.yesterday, $scope.dayAfterTomorrow, 'day'))) {
            TrainingDays.getAdvice({
              trainingDateNumeric: Util.toNumericDate($scope.trainingDay.date),
              alternateActivity: $scope.alternateActivity,
              selectNewWorkout: false
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
          } else {
            // We call refreshAdvice instead of getAdvice if we do not have a planned activity
            // or if the user wants different advice.
            // If current day is today, this will ensure that tomorrow's advice is regenerated also.
            TrainingDays.refreshAdvice({
              trainingDateNumeric: Util.toNumericDate($scope.trainingDay.date),
              selectNewWorkout: $scope.plannedActivity ? true : false
            }, function(response) {
              var trainingDay = response.advisedToday ? response.advisedToday : response.advisedTomorrow;
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
                $scope.error = 'Server error prevented refreshAdvice.';
              }
            });
          }

        };

        // This block runs on page load.
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
      };

      $scope.checkGiveFeedback = function(trainingDay) {
        if (moment(trainingDay.dateNumeric.toString()).isAfter(moment().subtract(4, 'days')) &&
          trainingDay.completedActivities.length > 0 &&
          Util.getMetrics(trainingDay, 'actual').loadRating === 'hard' &&
          trainingDay.trainingEffortFeedback === null) {
          $scope.openGiveFeedback(trainingDay);
        }
      };

      $scope.openGiveFeedback = function(trainingDay) {
        Feedback.show(trainingDay)
        .then(function(trainingDay) {
          // trainingDay.trainingEffortFeedback = trainingEffortFeedback;
        }, function() {
          //User cancelled out of dialog.
          //By setting to zero we will not ask again.
          // trainingDay.trainingEffortFeedback = 0;
        }).finally(function() {
          return $scope.update(trainingDay, function() {});
        });
      };

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

          return callback ? callback(trainingDay) : null;
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            $scope.error = errorResponse.data.message;
          } else {
            //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
            $scope.error = 'Server error prevented training day update.';
          }

          return callback ? callback(null) : null;
        });
      };
    }
  ]);
