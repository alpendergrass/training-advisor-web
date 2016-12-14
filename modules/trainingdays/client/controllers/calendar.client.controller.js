'use strict';

angular.module('trainingDays')
  .controller('CalendarController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$filter', '$uibModal', '$anchorScroll', 'Authentication', 'TrainingDays', 'Season', '_', 'moment', 'toastr', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $filter, $uibModal, $anchorScroll, Authentication, TrainingDays, Season, _, moment, toastr, usSpinnerService, MaterialCalendarData) {
      $scope.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover();
      });

      //The following makes lodash available in html.
      $scope._ = _;

      $scope.today = moment().startOf('day').toDate();

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
    }
  ]);
