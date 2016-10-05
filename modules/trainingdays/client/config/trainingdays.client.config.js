'use strict';

angular.module('trainingDays').run(['Menus',
  function (Menus) {
    Menus.addMenuItem('topbar', {
      title: 'My Season',
      state: 'season',
      roles: ['user']
    });

    Menus.addMenuItem('topbar', {
      title: 'My Calendar',
      state: 'calendar',
      roles: ['user']
    });

    Menus.addMenuItem('topbar', {
      title: 'Training Days',
      state: 'trainingDays',
      type: 'dropdown',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'Get Advice',
      state: 'trainingDays.getAdvice',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'Schedule Events',
      state: 'trainingDays.createEvent',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'True-Up Fitness & Fatigue',
      state: 'trainingDays.trueUp',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'List All Training Days',
      state: 'trainingDays.list',
      roles: ['admin']
    });
  }
]);
