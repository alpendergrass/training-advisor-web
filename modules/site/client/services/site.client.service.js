'use strict';

//Site service used for communicating with the site REST endpoints
angular.module('site').factory('Site', ['$resource',
  function ($resource) {
    return $resource('api/site', {}, {
      update: {
        method: 'PUT'
      }
    });
  }
]);
