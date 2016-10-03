'use strict';

angular.module('site').controller('SiteController', ['$scope', '$state', 'Authentication', 'Site',
  function($scope, $state, Authentication, Site) {
    $scope.authentication = Authentication;

    $scope.update = function(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'userForm');

        return false;
      }

      var site = $scope.site;

      site.$update(function () {}, function (errorResponse) {
        $scope.error = errorResponse.data.message;
      });
    };

    $scope.site = Site.get({}, function(site) {}, function(errorResponse) {
      if (errorResponse.data && errorResponse.data.message) {
        $scope.error = errorResponse.data.message;
      } else {
        $scope.error = 'Server error prevented site model retrieval.';
      }
    });

  }
]);
