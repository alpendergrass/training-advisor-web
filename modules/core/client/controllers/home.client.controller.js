'use strict';

angular.module('core').controller('HomeController', ['Authentication',
  function (Authentication) {
    this.authentication = Authentication;
  }
]);
