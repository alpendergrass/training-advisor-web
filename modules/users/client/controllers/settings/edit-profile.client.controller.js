'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$state', '$filter', 'Users', 'Authentication', 'moment', 'toastr',
  function($scope, $http, $state, $filter, Users, Authentication, moment, toastr) {
    var jQuery = window.jQuery;

    angular.element(document).ready(function() {
      jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
    });

    var initUser = function(user) {
      $scope.user = user;
      $scope.user.thresholdPowerTestDate = new Date($scope.user.thresholdPowerTestDate);
      $scope.user.ftpLog.forEach(function (ftpLogItem) {
        ftpLogItem.ftpTestDate = new Date(ftpLogItem.ftpTestDate);
      });
    }

    initUser(Authentication.user);

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

    $scope.addFTP = function() {
      var inserted = {
        ftp: 99,
        ftpTestDate: new Date(),
        ftpSource: 'manual'
      };
      $scope.user.ftpLog.push(inserted);
      return $scope.updateUserProfile(true);
    };

    $scope.removeFTP = function(ftpItem) {
      _.pull($scope.user.ftpLog, ftpItem);
      return $scope.updateUserProfile(true);
    };

    //TODO: if FTP is edited, change source to manual.

    $scope.checkFirstName = function(name) {
      if (!name) {
        return 'First name is required';
      }

      $scope.user.firstName = name;
      return $scope.updateUserProfile(true);
    };

    $scope.checkLastName = function(name) {
      if (!name) {
        return 'Last name is required';
      }

      $scope.user.lastName = name;
      return $scope.updateUserProfile(true);
    };

    $scope.checkEmail = function(email) {
      var EMAIL_REGEXP = /^[_a-z0-9]+(\.[_a-z0-9]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$/;

      if (!EMAIL_REGEXP.test(email)) {
        return 'Invalid email address';
      }

      $scope.user.email = email;
      return $scope.updateUserProfile(true);
    };

    $scope.updateUserProfile = function(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      var user = new Users($scope.user);

      user.$update(function(response) {
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
