'use strict';

angular.module('users').controller('ChangePasswordController', ['$scope', '$http', 'Authentication', 'PasswordValidator', 'toastr',
  function ($scope, $http, Authentication, PasswordValidator, toastr) {
    $scope.user = Authentication.user;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    // Change user password
    $scope.changeUserPassword = function (isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'passwordForm');
        return false;
      }

      $http.post('/api/users/password', $scope.passwordDetails).success(function (response) {
        // If successful clear form
        $scope.$broadcast('show-errors-reset', 'passwordForm');
        toastr.success('Password Changed Successfully');
        $scope.passwordDetails = null;
      }).error(function (response) {
        toastr.error(response.message);
      });
    };
  }
]);
