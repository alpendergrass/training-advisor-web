'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', 'Authentication', 'Menus', '_',
  function ($scope, $state, Authentication, Menus, _) {
    var jQuery = window.jQuery;

    //The following makes lodash available in html.
    $scope._ = _;

    this.$state = $state;
    this.authentication = Authentication;

    // this.notifications = _.filter(Authentication.user.notifications, ['blocked', false]);

    // Get the topbar menu
    this.menu = Menus.getMenu('topbar');

    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      jQuery('.navbar-collapse').collapse('hide');
    });
  }
]);
