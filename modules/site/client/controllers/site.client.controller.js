'use strict';

angular.module('site').controller('SiteController', ['$scope', '$state', 'Authentication', 'Site', 'toastr',
  function($scope, $state, Authentication, Site, toastr) {
    $scope.authentication = Authentication;

    $scope.update = function(isValid) {
      if (!isValid) {
        $scope.$broadcast('show-errors-check-validity', 'siteForm');

        return false;
      }

      var site = $scope.site;

      site.$update(function (response) {
        toastr.success('Site Updated Successfully');
      }, function (errorResponse) {
        if (errorResponse.data && errorResponse.data.message) {
          $scope.error = errorResponse.data.message;
        } else {
          $scope.error = 'Server error prevented site model update.';
        }
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
