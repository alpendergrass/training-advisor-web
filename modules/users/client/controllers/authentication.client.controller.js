'use strict';

angular.module('users').controller('AuthenticationController', ['$scope', '$state', '$http', '$location', '$window', 'Authentication', 'PasswordValidator', 'Site', 'usSpinnerService',
  function ($scope, $state, $http, $location, $window, Authentication, PasswordValidator, Site, usSpinnerService) {
    var that = this;
    this.authentication = Authentication;
    this.popoverMsg = PasswordValidator.getPopoverMsg();

    // Get an eventual error defined in the URL query string:
    this.error = $location.search().err;

    // If user is signed in then redirect back home
    if (this.authentication.user) {
      $location.path('/');
    }

    // TODO: convert function to arrow function so that I can use this.
    Site.get({}, function(site) {
      if (typeof site.allowRegistrations === 'undefined'){
        that.allowRegistrations = true;
      } else {
        that.allowRegistrations = site.allowRegistrations;
      }
    }, function(errorResponse) {
      if (errorResponse.data && errorResponse.data.message) {
        that.error = errorResponse.data.message;
      } else {
        that.error = 'Server error prevented Site model retrieval.';
      }
    });

    this.signup = function (isValid) {
      this.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      usSpinnerService.spin('authSpinner');

      $http.post('/api/auth/signup', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        this.authentication.user = response;

        // And redirect to the previous or profile page
        // $state.go($state.previous.state.name || 'settings.profile', $state.previous.params);
        $state.go('settings.profile');
      }).error(function (response) {
        usSpinnerService.stop('authSpinner');
        this.error = response.message;
      });
    };

    this.signin = function (isValid) {
      this.error = null;

      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');
        return false;
      }

      usSpinnerService.spin('authSpinner');

      $http.post('/api/auth/signin', $scope.credentials).success(function (response) {
        // If successful we assign the response to the global user model
        this.authentication.user = response;

        // And redirect to the previous or calendar page
        $state.go($state.previous.state.name || 'season', $state.previous.params);
      }).error(function (response) {
        usSpinnerService.stop('authSpinner');
        this.error = response.message;
      });
    };

    // OAuth provider request
    this.callOauthProvider = function (url) {
      usSpinnerService.spin('authSpinner');

      if ($state.previous && $state.previous.href) {
        url += '?redirect_to=' + encodeURIComponent($state.previous.href);
      }

      // Effectively call OAuth authentication route:
      $window.location.href = url;
    };
  }
]);
