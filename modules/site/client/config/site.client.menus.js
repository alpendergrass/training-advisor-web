'use strict';

angular.module('site').run(['Menus',
  function (Menus) {
    Menus.addSubMenuItem('topbar', 'admin', {
      title: 'Site Admin',
      state: 'site'
    });
  }
]);
