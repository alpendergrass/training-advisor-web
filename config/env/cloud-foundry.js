'use strict';

var cfenv = require('cfenv'),
  appEnv = cfenv.getAppEnv();

var cfMongoUrl = (function() {
  if (appEnv.getService('training-advisor-mongodb')) {
    var mongoCreds = appEnv.getService('training-advisor-mongodb').credentials;
    return mongoCreds.uri || mongoCreds.url;
  } else {
    throw new Error('No service names "training-advisor-mongodb" bound to the application.');
  }
}());

var getCred = function (serviceName, credProp) {
  return appEnv.getService(serviceName) ?
    appEnv.getService(serviceName).credentials[credProp] : undefined;
};

module.exports = {
  port: appEnv.port,
  db: {
    uri: cfMongoUrl,
    options: {
      user: '',
      pass: ''
    }
  },
  log: {
    // Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
    format: 'combined',
    // Stream defaults to process.stdout
    // By default we want logs to go to process.out so the Cloud Foundry Loggregator will collect them
    options: {}
  },
  strava: {
    clientID: getCred('training-advisor-strava', 'id') || 'APP_ID',
    clientSecret: getCred('training-advisor-strava', 'secret') || 'APP_SECRET',
    callbackURL: '/api/auth/strava/callback'
  },
  // google: {
  //   clientID: getCred('training-advisor-google', 'id') || 'APP_ID',
  //   clientSecret: getCred('training-advisor-google', 'secret') || 'APP_SECRET',
  //   callbackURL: '/api/auth/google/callback'
  // },
  mailer: {
    from: getCred('training-advisor-mail', 'from') || 'MAILER_FROM',
    options: {
      apiKey: getCred('training-advisor-mail', 'password') || 'MAILER_PASSWORD',
    }
  },
  seedDB: {
    seed: process.env.MONGO_SEED === 'true' ? true : false,
    options: {
      logResults: process.env.MONGO_SEED_LOG_RESULTS === 'false' ? false : true,
      seedUser: {
        username: process.env.MONGO_SEED_USER_USERNAME || 'user',
        provider: 'local',
        email: process.env.MONGO_SEED_USER_EMAIL || 'user@localhost.com',
        firstName: 'User',
        lastName: 'Local',
        displayName: 'User Local',
        roles: ['user']
      },
      seedAdmin: {
        username: process.env.MONGO_SEED_ADMIN_USERNAME || 'admin',
        provider: 'local',
        email: process.env.MONGO_SEED_ADMIN_EMAIL || 'admin@tacittraining.com',
        firstName: 'Admin',
        lastName: 'Local',
        displayName: 'Admin Local',
        roles: ['user', 'admin']
      }
    }
  }
};
