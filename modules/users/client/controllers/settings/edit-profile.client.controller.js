'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$state', 'Users', 'Authentication', 'moment', 'toastr',
  function ($scope, $http, $state, Users, Authentication, moment, toastr) {
    var jQuery = window.jQuery;
    angular.element(document).ready(function() {
      jQuery('[data-toggle="popover"]').popover();
    });

    this.user = Authentication.user;
    this.user.thresholdPowerTestDate = new Date(this.user.thresholdPowerTestDate);
    this.user.autoFetchStravaActivities = this.user.autoFetchStravaActivities === null ? null : this.user.autoFetchStravaActivities.toString();
    this.user.levelOfDetail = this.user.levelOfDetail.toString();

    this.data = {
      daysOfTheWeek: [
        { id: '1', name: 'Monday' },
        { id: '2', name: 'Tuesday' },
        { id: '3', name: 'Wednesday' },
        { id: '4', name: 'Thursday' },
        { id: '5', name: 'Friday' },
        { id: '6', name: 'Saturday' },
        { id: '0', name: 'Sunday' }
      // ],
      // trainingPeaksAccountTypes: [
      //   { id: 'SharedFree', name: 'Shared Free' },
      //   { id: 'CoachedFree', name: 'Coached Free' },
      //   { id: 'SelfCoachedPremium', name: 'Self Coached Premium' },
      //   { id: 'SharedSelfCoachedPremium', name: 'Shared Self Coached Premium' },
      //   { id: 'CoachedPremium', name: 'Coached Premium' },
      //   { id: 'SharedCoachedPremium', name: 'Shared Coached Premium' },
      ]
    };

    //Begin Datepicker stuff.
    this.datePickerStatus = {
      opened: false
    };

    this.openDatePicker = function($event) {
      this.datePickerStatus.opened = true;
    };

    this.ftpDateOptions = {
      formatYear: 'yy',
      startingDay: 1,
      showWeeks: false,
      maxDate: moment().toDate()
    };
    //End Datepicker stuff.

    // Update a user profile
    this.updateUserProfile = function (isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      var user = new Users(this.user);

      user.$update(function (response) {
        $scope.$broadcast('show-errors-reset', 'userForm');
        toastr.success('Your profile has been updated.', 'Profile Saved');
        Authentication.user = response;
        $state.go('season');
      }, function (response) {
        toastr.error(response.data.message);
      });
    };
  }
]);

