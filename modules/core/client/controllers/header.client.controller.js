'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', 'Authentication', 'Menus', '_',
  function ($scope, $state, Authentication, Menus, _) {
    var jQuery = window.jQuery;

    //The following makes lodash available in html.
    $scope._ = _;

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
