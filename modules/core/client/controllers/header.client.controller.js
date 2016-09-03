'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', 'Authentication', 'Menus',
  function ($scope, $state, Authentication, Menus) {
    var jQuery = window.jQuery;

    $scope.$state = $state;
    $scope.authentication = Authentication;

    // Get the topbar menu
    $scope.menu = Menus.getMenu('topbar');

    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      jQuery('.navbar-collapse').collapse('hide');
    });
  }
]);
