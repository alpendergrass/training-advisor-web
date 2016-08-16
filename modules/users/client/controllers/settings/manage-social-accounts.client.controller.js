'use strict';

angular.module('users').controller('SocialAccountsController', ['$scope', '$http', 'Authentication', 'toastr',
  function ($scope, $http, Authentication, toastr) {
    $scope.user = Authentication.user;

    // Check if there are additional accounts
    $scope.hasConnectedAdditionalSocialAccounts = function (provider) {
      for (var i in $scope.user.additionalProvidersData) {
        return true;
      }

      return false;
    };

    // Check if provider is already in use with current user
    $scope.isConnectedSocialAccount = function (provider) {
      return $scope.user.provider === provider || ($scope.user.additionalProvidersData && $scope.user.additionalProvidersData[provider]);
    };

    // Remove a user social account
    $scope.removeUserSocialAccount = function (provider) {
      $http.delete('/api/users/accounts', {
        params: {
          provider: provider
        }
      }).success(function (response) {
        // If successful clear form
        toastr.success('Account Removed Successfully');
        $scope.user = Authentication.user = response;
      }).error(function (response) {
        toastr.error(response.message);
      });
    };
  }
]);
