'use strict';

angular.module('users').controller('AuthenticationController', ['$scope', '$state', '$http', '$location', '$window', 'Authentication', 'PasswordValidator', 'Site', 'usSpinnerService',
  function ($scope, $state, $http, $location, $window, Authentication, PasswordValidator, Site, usSpinnerService) {
    $scope.authentication = Authentication;
    $scope.popoverMsg = PasswordValidator.getPopoverMsg();

    // Get an eventual error defined in the URL query string:
    $scope.error = $location.search().err;

    // If user is signed in then redirect back home
    if ($scope.authentication.user) {
      $location.path('/');
    }

    Site.get({}, function(site) {
      if (typeof site.allowRegistrations === 'undefined'){
        $scope.allowRegistrations = true;
      } else {
        $scope.allowRegistrations = site.allowRegistrations;
      }
    }, function(errorResponse) {
      if (errorResponse.data && errorResponse.data.message) {
        $scope.error = errorResponse.data.message;
      } else {
        $scope.error = 'Server error prevented Site model retrieval.';
      }
    });

    $scope.signup = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      usSpinnerService.spin('authSpinner');

      $http.post('/api/auth/signup', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;

        // And redirect to the previous or profile page
        // $state.go($state.previous.state.name || 'settings.profile', $state.previous.params);
        $state.go('settings.profile');
      }).error(function (response) {
        usSpinnerService.stop('authSpinner');
        $scope.error = response.message;
      });
    };

    $scope.signin = function (isValid) {
      $scope.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      usSpinnerService.spin('authSpinner');

      $http.post('/api/auth/signin', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        $scope.authentication.user = response;

        // And redirect to the previous or calendar page
        $state.go($state.previous.state.name || 'season', $state.previous.params);
      }).error(function (response) {
        usSpinnerService.stop('authSpinner');
        $scope.error = response.message;
      });
    };

    // OAuth provider request
    $scope.callOauthProvider = function (url) {
      usSpinnerService.spin('authSpinner');

      if ($state.previous && $state.previous.href) {
        url += '?redirect_to=' + encodeURIComponent($state.previous.href);
      }

      // Effectively call OAuth authentication route:
      $window.location.href = url;
    };
  }
]);
