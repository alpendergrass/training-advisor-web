'use strict';

angular.module('trainingDays')
  .controller('AdviceController', ['$scope', '$location', '$compile', '$anchorScroll', 'Authentication', 'TrainingDays', '_', 'moment',
    function($scope, $location, $compile, $anchorScroll, Authentication, TrainingDays, _, moment) {
      this.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover();
      });

      // this._ = _;
      var today = moment().startOf('day').toDate();
      this.adviceDate = today;

      this.datePickerStatus = {
        opened: false
      };

      this.openDatePicker = function($event) {
        this.datePickerStatus.opened = true;
      };

      this.requestAdvice = function() {
        var minAdviceDate = this.authentication.user.levelOfDetail > 2 ? null : today;
        var maxAdviceDate = this.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();

        this.getAdvice = function(isValid) {
          this.error = null;

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
              this.error = errorResponse.data.message;
            } else {
              //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
              this.error = 'Server error prevented advice retrieval.';
            }
          });
        };

        this.adviceDateOptions = {
          formatYear: 'yy',
          startingDay: 1,
          showWeeks: false,
          minDate: minAdviceDate,
          maxDate: maxAdviceDate
        };
      };
    }
  ]);
