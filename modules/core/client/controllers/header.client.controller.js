'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', 'Core', 'Authentication', 'Menus', '_', 'toastr',
  function ($scope, $state, Core, Authentication, Menus, _, toastr) {
    var jQuery = window.jQuery;

    //The following makes lodash available in html.
    $scope._ = _;
    $scope.$state = $state;
    $scope.authentication = Authentication;
    $scope.menu = Menus.getMenu('topbar');

    var clientAppVersion = null;
    // Init local version number.
    Core.getAppVersion({},
      function(response) {
        clientAppVersion = response.appVersion;
        console.log('app version: ', clientAppVersion);
      },
      function(errorResponse) {
        console.log('Core.getAppVersion errorResponse: ', errorResponse);
      });

    // Check for new app version every so often.
    setInterval(function() {
      Core.getAppVersion({},
        function(response) {
          if (!clientAppVersion) {
            clientAppVersion = response.appVersion;
          } else if (clientAppVersion !== response.appVersion) {
            console.log('new app version: ', response.appVersion);

            toastr.info('A new version of the application is available. <a class="refresh-link" href="javascript:window.location.reload()">REFRESH</a>', {
              allowHtml: true,
              timeOut: (1000 * 60 * 60),
              extendedTimeOut: 5000,
              closeButton: true,
              tapToDismiss: false
            });
          }
        },
        function(errorResponse) {
          console.log('Core.getAppVersion errorResponse: ', errorResponse);
        });
    }, (1000 * 60 * 60) * 1); // every 1 hours

    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      jQuery('.navbar-collapse').collapse('hide');
    });
  }
]);

