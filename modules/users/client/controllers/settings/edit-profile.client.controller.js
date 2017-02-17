'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$state', '$filter', 'Users', 'Authentication', 'moment', 'toastr',
  function($scope, $http, $state, $filter, Users, Authentication, moment, toastr) {
    var jQuery = window.jQuery;
    angular.element(document).ready(function() {
      jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
    });

    this.user = Authentication.user;
    this.user.thresholdPowerTestDate = new Date(this.user.thresholdPowerTestDate);
    this.user.ftpLog.forEach(function (ftpLogItem) {
      ftpLogItem.ftpTestDate = new Date(ftpLogItem.ftpTestDate);
    });


    this.user.autoFetchStravaActivities = this.user.autoFetchStravaActivities === null ? null : this.user.autoFetchStravaActivities.toString();

    // We highlight fields that need to be updated.
    this.needsFTP = !this.user.thresholdPower;

    this.data = {
      daysOfTheWeek: [
        { id: '1', name: 'Monday' },
        { id: '2', name: 'Tuesday' },
        { id: '3', name: 'Wednesday' },
        { id: '4', name: 'Thursday' },
        { id: '5', name: 'Friday' },
        { id: '6', name: 'Saturday' },
        { id: '0', name: 'Sunday' }
      ],
      levelsOfDetail: [
        { value: 1, text: 'Show me advice' },
        { value: 2, text: 'Show me advice and numbers' },
        { value: 3, text: 'Give me super powers' }
      ]
    };

    // this.user.levelOfDetail = this.user.levelOfDetail.toString();

    this.showLevelOfDetail = function() {
      var selected = $filter('filter')(this.data.levelsOfDetail, { value: this.user.levelOfDetail });
      return selected[0].text;
    };

    //Begin Datepicker stuff.
    // this.datePickerStatus = {
    //   opened: false
    // };

    // this.datePickerOpened = {};

    // this.openDatePicker = function($event, elementOpened) {
    //   // this.datePickerStatus.opened = true;
    //   $event.preventDefault();
    //   $event.stopPropagation();
    //   this.datePickerOpened[elementOpened] = !this.datePickerOpened[elementOpened];
    // };

    this.ftpDateOptions = {
      formatYear: 'yy',
      startingDay: 1,
      showWeeks: false,
      maxDate: moment().toDate()
    };
    //End Datepicker stuff.

    this.addFTP = function() {
      var inserted = {
        ftp: 0,
        ftpTestDate: new Date(),
        ftpSource: 'manual'
      };
      this.user.ftpLog.push(inserted);
    };

    this.updateLevelOfDetail = function(level) {
      //http://stackoverflow.com/questions/5971645/what-is-the-double-tilde-operator-in-javascript
      var n = ~~Number(level);

      if (n === this.user.levelOfDetail) {
        //no change.
        return;
      }

      if (String(n) === level && (n >= 1 && n <= 3)) {
        return this.updateUserProfile(true);
      }

      return 'Valid levelsOfDetail are 1, 2 and 3.';
    }

    // Update a user profile
    this.updateUserProfile = function(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      var user = new Users(this.user);

      user.$update(function(response) {
        $scope.$broadcast('show-errors-reset', 'userForm');
        toastr.success('Your profile has been updated.', 'Profile Saved');
        Authentication.user = response;
        //$state.go('season');
      }, function(response) {
        toastr.error(response.data.message);
      });
    };
  }
]);
