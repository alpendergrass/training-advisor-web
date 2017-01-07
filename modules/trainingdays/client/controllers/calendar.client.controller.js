'use strict';

angular.module('trainingDays')
  .controller('CalendarController', ['$scope', '$state', '$stateParams', '$location', '$compile', '$anchorScroll', 'Authentication', 'TrainingDays', 'Season', 'Util', '_', 'moment', 'usSpinnerService', 'MaterialCalendarData',
    function($scope, $state, $stateParams, $location, $compile, $anchorScroll, Authentication, TrainingDays, Season, Util, _, moment, usSpinnerService, MaterialCalendarData) {
      this.authentication = Authentication;
      this.hasStart = true;
      this.hasEnd = true;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover();
      });

      var today = moment().startOf('day').toDate();

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

        if (moment(trainingDay.date).isAfter(today, 'day')) {
          content += content.length > lengthOfFixedContent ? '<br>' : '';
          content += '<i>';
          planActivity = Util.getPlannedActivity(trainingDay, 'plangeneration');
          if (planActivity) {
            content += Util.mapActivityTypeToVerbiage(planActivity.activityType) + ' - ';
          }
          content += 'load: ' + trainingDay.planLoad + '</i>';
        }


        if (trainingDay.completedActivities.length > 0) {
          content += content.length > lengthOfFixedContent ? '<br>' : '';
          _.forEach(trainingDay.completedActivities, function(activity) {
            load += activity.load;
          });
          loadRating = Util.getMetrics(trainingDay, 'actual').loadRating;
          content += load ? ' Load: ' + load + ' - ' + loadRating + ' day' : '';
        }


        // if (trainingDay.form !== 0) {
        //   content += '<br><i>Form: ' + trainingDay.form + '</i>';
        // }

        // content += '<br><i>Period: ' + trainingDay.period + '</i>';

        content += '</small></div>';
        return content;
      };

      this.initCalendar = function() {
        //Use vertical format if we are in a small window like on a phone.
        if (jQuery(window).width() < 800) {
          this.setDirection('vertical');
          this.smallWindow = true;
        } else {
          this.smallWindow = false;
        }
        // Need to clear out calendar data. Moving goal date can strand some data otherwise.
        MaterialCalendarData.data = {};

        var that = this;

        //We need to clean up any potential left over sim days.
        TrainingDays.finalizeSim({
          commit: 'no'
        }, function(response) {
          usSpinnerService.spin('tdSpinner');

          Season.getSeason(function(errorMessage, season) {
            usSpinnerService.stop('tdSpinner');
            that.error = errorMessage;

            if (season) {
              that.season = season.days;
              // Reload user object as notifications may have been updated.
              Authentication.user = season.user;
              that.hasStart = season.hasStart;
              that.hasEnd = season.hasEnd;

              _.forEach(season.days, function(td) {
                MaterialCalendarData.setDayContent(td.date, formatDayContent(td));
              });
            }
          });
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            that.error = errorResponse.data.message;
          } else {
            that.error = 'Server error prevented simulation clean-up.';
          }
        });
      };

      this.setDirection = function(direction) {
        this.direction = direction;
        this.dayFormat = direction === 'vertical' ? 'EEE, MMM d' : 'd';
      };

      this.dayClick = function(date) {
        var td = _.find(this.season, function(d) {
          return (moment(d.date).isSame(moment(date), 'day'));
        });

        if (td) {
          $state.go('trainingDayView', { trainingDayId: td._id });
        } else {
          if (moment(date).isSameOrAfter(this.hasStart.date)) {
            //trainingDay does not exist, we need to create it first.
            var trainingDay = new TrainingDays({
              date: date
            });

            var that = this;

            trainingDay.$create(function(trainingDay) {
              // Reload user to pick up changes in notifications.
              Authentication.user = trainingDay.user;
              $location.path('trainingDay/' + trainingDay._id);
            }, function(errorResponse) {
              if (errorResponse.data && errorResponse.data.message) {
                that.error = errorResponse.data.message;
              } else {
                that.error = 'Server error prevented trainingDay creation.';
              }
            });
          }
        }
      };


      // //Highlight today in calendar view
      // //Note that this will not survive a change in calendar layout (calendar to agenda or v.v.).
      // //We need a callback from the calendar module. Or something.
      // angular.element(document).ready(function() {
      //   jQuery('.today-on-calendar').parent().parent().addClass('md-whiteframe-7dp');
      // });
    }
  ]);
