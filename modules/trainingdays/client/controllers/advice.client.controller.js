'use strict';

angular.module('trainingDays')
  .controller('AdviceController', ['$scope', '$location', '$compile', '$anchorScroll', 'Authentication', 'TrainingDays', 'Util', '_', 'moment',
    function($scope, $location, $compile, $anchorScroll, Authentication, TrainingDays, Util, _, moment) {
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

      var minAdviceDate = this.authentication.user.levelOfDetail > 2 ? null : today;
      var maxAdviceDate = this.authentication.user.levelOfDetail > 2 ? null : moment().add(1, 'day').startOf('day').toDate();

      this.adviceDateOptions = {
        formatYear: 'yy',
        startingDay: 1,
        showWeeks: false,
        minDate: minAdviceDate,
        maxDate: maxAdviceDate
      };

      this.getAdvice = function(isValid) {
        this.error = null;

        if (!isValid) {
          $scope.$broadcast('show-errors-check-validity', 'trainingDayForm');
          return false;
        }

        var getAdviceDate = Util.toNumericDate(this.adviceDate);
        var that = this;

        TrainingDays.getAdvice({
          trainingDateNumeric: getAdviceDate,
          alternateActivity: null
        }, function(trainingDay) {
          $location.path('trainingDay/' + trainingDay._id);
        }, function(errorResponse) {
          if (errorResponse.data && errorResponse.data.message) {
            that.error = errorResponse.data.message;
          } else {
            that.error = 'Server error prevented advice retrieval.';
          }
        });
      };
    }
  ]);
