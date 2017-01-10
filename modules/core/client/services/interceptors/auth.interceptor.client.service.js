'use strict';

angular.module('core').factory('authInterceptor', ['$q', '$injector', '$window',
  function ($q, $injector, $window) {
    return {
      responseError: function(rejection) {
        if (!rejection.config.ignoreAuthModule) {
          switch (rejection.status) {
            case 401:
              //Authentication failure.
              $injector.get('$state').transitionTo('authentication.signin');
              break;
            case 403:
              // Authorization failure.
              // We get a 403 when our sessionid cookie has expired.
              //$injector.get('$state').transitionTo('forbidden');
              $window.location.href = '/api/auth/signout';
              break;
          }
        }
        // otherwise, default behaviour
        return $q.reject(rejection);
      }
    };
  }
]);
