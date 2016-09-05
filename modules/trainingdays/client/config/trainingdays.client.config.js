'use strict';

// Configuring the TrainingDays module
angular.module('trainingDays').run(['Menus',
  function (Menus) {
    Menus.addMenuItem('topbar', {
      title: 'Training Days',
      state: 'trainingDays',
      type: 'dropdown',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'My Season',
      state: 'trainingDays.season',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'My Training Days',
      state: 'trainingDays.calendar',
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
      title: 'Start Season',
      state: 'trainingDays.createStart',
      roles: ['user']
    });

    Menus.addSubMenuItem('topbar', 'trainingDays', {
      title: 'Mid-Season True-Up',
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
