'use strict';

//Site service used for communicating with the site REST endpoints
angular.module('core').factory('Core', ['$resource',
  function ($resource) {
    return $resource('api/core', {}, {
      getAppVersion: {
        method: 'GET',
        url: 'api/core/getAppVersion'
      }
    });
  }
]);
