'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$state', '$filter', '_', 'Users', 'Authentication', 'moment', 'toastr',
  function($scope, $http, $state, $filter, _, Users, Authentication, moment, toastr) {
    var jQuery = window.jQuery;

    angular.element(document).ready(function() {
      jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
    });

    // TODO: this is a dup of a function in the TD Util service.
    // Should be in a Core Util service.
    var toNumericDate = function(date) {
      var dateString = moment(date).format('YYYYMMDD');
      return parseInt(dateString, 10);
    };

    var initUser = function(user) {
      $scope.user = user;
      $scope.user.ftpLog.forEach(function (ftpLogItem) {
        ftpLogItem.ftpDate = new Date(ftpLogItem.ftpDate);
      });
    };

    initUser(Authentication.user);

    $scope.newFtp = null;

    $scope.data = {
      daysOfTheWeek: [
        { value: '1', text: 'Monday' },
        { value: '2', text: 'Tuesday' },
        { value: '3', text: 'Wednesday' },
        { value: '4', text: 'Thursday' },
        { value: '5', text: 'Friday' },
        { value: '6', text: 'Saturday' },
        { value: '0', text: 'Sunday' }
      ],
      levelsOfDetail: [
        { value: 1, text: 'Show me advice' },
        { value: 2, text: 'Show me advice and numbers' },
        { value: 3, text: 'Give me super powers' }
      ],
      autoFetchActivityOptions: [
        { value: true, text: 'Fetch Strava activities automatically' },
        { value: false, text: 'Do not fetch Strava activities automatically' }
      ],
      autoUpdateFtpOptions: [
        { value: true, text: 'Update FTP when Strava FTP update is detected' },
        { value: false, text: 'Do not update FTP from Strava' }
      ],
      favorSufferScoreOptions: [
        { value: false, text: 'Use Estimated Power When No Power Meter' },
        { value: true, text: 'Use Suffer Score When No Power Meter' }
      ]
    };

    $scope.showLevelOfDetail = function() {
      var selected = $filter('filter')($scope.data.levelsOfDetail, { value: $scope.user.levelOfDetail });
      return selected[0].text;
    };

    $scope.showRestDays = function() {
      var selected = [];

      angular.forEach($scope.data.daysOfTheWeek, function(dow) {
        if ($scope.user.preferredRestDays.indexOf(dow.value) >= 0) {
          selected.push(dow.text);
        }
      });

      return selected.length ? selected.join(', ') : 'None set';
    };

    $scope.ftpDateOptions = {
      formatYear: 'yy',
      startingDay: 1,
      showWeeks: false,
      maxDate: moment().toDate()
    };

    $scope.ftpDatePickerStatus = {
      opened: false
    };

    $scope.openFtpDatePicker = function($event) {
      $scope.ftpDatePickerStatus.opened = true;
    };

    $scope.newFtpDatePickerStatus = {
      opened: false
    };

    $scope.openNewFtpDatePicker = function($event) {
      $scope.newFtpDatePickerStatus.opened = true;
    };

    $scope.addFTP = function() {
      $scope.newFtp = {
        ftp: 100,
        ftpDate: new Date(),
        ftpSource: 'manual'
      };

      $scope.newFtpForm.$show();
    };

    $scope.cancelAddFTP = function() {
      $scope.newFtp = null;
    };


    $scope.removeFTP = function(ftpItem) {
      _.pull($scope.user.ftpLog, ftpItem);
      return $scope.updateUserProfile();
    };

    //TODO: if FTP is edited, change source to manual.

    $scope.checkFirstName = function(name) {
      if (!name) {
        return 'First name is required';
      }

      $scope.user.firstName = name;
      return $scope.updateUserProfile();
    };

    $scope.checkLastName = function(name) {
      if (!name) {
        return 'Last name is required';
      }

      $scope.user.lastName = name;
      return $scope.updateUserProfile();
    };

    $scope.checkEmail = function(email) {
      var EMAIL_REGEXP = /^[_a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/;

      if (!EMAIL_REGEXP.test(email)) {
        return 'Invalid email address';
      }

      $scope.user.email = email;
      return $scope.updateUserProfile();
    };

    $scope.validateFtp = function(ftp) {
      // Because control is defined as a number with max and min, invalid
      // values will not be passed. FTP likely will be null in this case.
      if (!Number.isInteger(ftp) || ftp < 1 || ftp > 999) {
        return 'Valid value 1 - 999.';
      }

      return;
    };

    $scope.updateUserProfile = function() {
      var user = new Users($scope.user);

      if ($scope.newFtp) {
        user.ftpLog.push($scope.newFtp);
      }

      //Sort ftpLog by newest to oldest test date.
      user.ftpLog = _.orderBy(user.ftpLog, 'ftpDate', 'desc');

      _.forEach(user.ftpLog, function(item) {
        item.ftpDateNumeric = toNumericDate(item.ftpDate);
      });

      user.$update(function(response) {
        $scope.newFtp = null;
        toastr.success('Your profile has been updated.', 'Profile Saved');
        Authentication.user = response;
        initUser(Authentication.user);
        return true;
      }, function(response) {
        toastr.error(response.data.message);
        return false;
      });
    };
  }
]);
