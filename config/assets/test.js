'use strict';

module.exports = {
  tests: {
    client: ['modules/*/tests/client/**/*.js'],
    server: ['modules/*/tests/server/**/*.js'],
    // server: ['modules/core/tests/server/**/*.js'],
    // server: ['modules/trainingdays/tests/server/**/*.js'],
    // server: ['modules/trainingdays/tests/server/lib.db-util.tests.js'],
    // server: ['modules/advisor/tests/server/**/*.js'],
    // server: ['modules/advisor/tests/server/lib.advice-period.tests.js'],
    // server: ['modules/advisor/tests/server/lib.advice-metrics.tests.js'],
    // server: ['modules/advisor/tests/server/lib.advice-util.tests.js'],
    // server: ['modules/users/tests/server/**/*.js'],
    e2e: ['modules/*/tests/e2e/**/*.js']
  }
};
