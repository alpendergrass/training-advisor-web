'use strict';

angular.module('users').controller('EditProfileController', ['$scope', '$http', '$location', 'Users', 'Authentication', 'toastr',
  function ($scope, $http, $location, Users, Authentication, toastr) {
    $scope.user = Authentication.user;
    $scope.user.thresholdPowerTestDate = new Date($scope.user.thresholdPowerTestDate);
    $scope.data = {
      daysOfTheWeek: [
        { id: '1', name: 'Monday' },
        { id: '2', name: 'Tuesday' },
        { id: '3', name: 'Wednesday' },
        { id: '4', name: 'Thursday' },
        { id: '5', name: 'Friday' },
        { id: '6', name: 'Saturday' },
        { id: '0', name: 'Sunday' }
      ],
      trainingPeaksAccountTypes: [
        { id: 'SharedFree', name: 'Shared Free' },
        { id: 'CoachedFree', name: 'Coached Free' },
        { id: 'SelfCoachedPremium', name: 'Self Coached Premium' },
        { id: 'SharedSelfCoachedPremium', name: 'Shared Self Coached Premium' },
        { id: 'CoachedPremium', name: 'Coached Premium' },
        { id: 'SharedCoachedPremium', name: 'Shared Coached Premium' },
      ]
    };
    // Update a user profile
    $scope.updateUserProfile = function (isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      var user = new Users($scope.user);

      user.$update(function (response) {
        $scope.$broadcast('show-errors-reset', 'userForm');
        toastr.success('Profile Saved Successfully');
        Authentication.user = response;
      }, function (response) {
        toastr.error(response.data.message);
      });
    };
  }
]);

