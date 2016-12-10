'use strict';

angular.module('users').controller('SettingsController', ['Authentication',
  function (Authentication) {
    this.user = Authentication.user;
  }
]);
