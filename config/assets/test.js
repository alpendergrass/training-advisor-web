'use strict';

module.exports = {
  tests: {
    client: ['modules/*/tests/client/**/*.js'],
    server: ['modules/*/tests/server/*.js'],
    // server: ['modules/core/tests/server/**/*.js'],
    // server: ['modules/events/tests/server/**/*.js'],
    // server: ['modules/trainingdays/tests/server/**/*.js'],
    // server: ['modules/trainingdays/tests/server/routes.tests.js'],
    // server: ['modules/trainingdays/tests/server/lib.db-util.tests.js'],
    // server: ['modules/trainingdays/tests/server/lib.strava-util.tests.js'],
    // server: ['modules/trainingdays/tests/server/lib.strava-util.tests.js'],
    // server: ['modules/advisor/tests/server/*.js'],
    // server: ['modules/advisor/tests/server/lib.advice-load.tests.js'],
    // server: ['modules/users/tests/server/**/*.js'],
    e2e: ['modules/*/tests/e2e/**/*.js']
  }
};
