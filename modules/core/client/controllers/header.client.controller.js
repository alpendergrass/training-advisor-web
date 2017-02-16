'use strict';

angular.module('core').controller('HeaderController', ['$scope', '$state', '$mdDialog', 'Core', 'Authentication', 'Menus', '_', 'toastr', 'localStorageService',
  function ($scope, $state, $mdDialog, Core, Authentication, Menus, _, toastr, localStorageService) {
    var jQuery = window.jQuery;

    //The following makes lodash available in html.
    $scope._ = _;
    $scope.$state = $state;
    $scope.authentication = Authentication;
    $scope.menu = Menus.getMenu('topbar');

    var clientAppVersion = null,
      versionCheckInterval = (1000 * 60 * 60) * 0.1; // every n hours
    // Init local version number.
    Core.getAppVersion({},
      function(response) {
        clientAppVersion = response.appVersion;
        console.log('app version: ', clientAppVersion);
        var storedVersion = localStorageService.get('app_version');
        console.log('stored app version: ', storedVersion);

        // Compare current app version to the version in local storage.
        // If not the same, store this version in ls, request release notes and display for this version.
        if (storedVersion !== clientAppVersion) {
          localStorageService.set('app_version', clientAppVersion);

          Core.getReleaseNotes({},
            function(response) {
              var releaseNotes = response.releaseNotes;

              if (releaseNotes[0].version === clientAppVersion) {
                var releaseMessage = '<h4>' + releaseNotes[0].message + '</h4><p><ul>';
                releaseNotes[0].features.forEach(function (feature) {
                  releaseMessage += '<li>' + feature + '</li>';
                });
                releaseMessage += '</ul></p>';

                var alert = $mdDialog.alert({
                  title: releaseNotes[0].title ? releaseNotes[0].title : 'Changes in Version ' + releaseNotes[0].version,
                  content: releaseMessage,
                  ok: 'Close'
                });

                $mdDialog.show(alert);
              }
            },
            function(errorResponse) {
              console.error(errorResponse);
            });
        }
      },
      function(errorResponse) {
        console.error(errorResponse);
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
              timeOut: versionCheckInterval,
              extendedTimeOut: (1000 * 5),
              closeButton: true,
              tapToDismiss: false
            });
          }
        },
        function(errorResponse) {
          console.log('Core.getAppVersion errorResponse: ', errorResponse);
        });
    }, versionCheckInterval);

    // Collapsing the menu after navigation
    $scope.$on('$stateChangeSuccess', function () {
      jQuery('.navbar-collapse').collapse('hide');
    });
  }
]);

