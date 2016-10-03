'use strict';

// Setting up route
angular.module('site').config(['$stateProvider',
  function ($stateProvider) {
    $stateProvider
      .state('site', {
        url: '/site',
        templateUrl: 'modules/site/client/views/site.client.view.html',
        controller: 'SiteController'
      });
  }
]);
