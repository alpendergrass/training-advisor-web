'use strict';

var passport = require('passport');

module.exports = function (app) {
  // User Routes
  var users = require('../controllers/users.server.controller');

  // Setting up the users password api - keep for test:server
  app.route('/api/auth/forgot').post(users.forgot);
  app.route('/api/auth/reset/:token').get(users.validateResetToken);
  app.route('/api/auth/reset/:token').post(users.reset);

  // Setting up the users authentication api - keep for test:server
  app.route('/api/auth/signup').post(users.signup);
  app.route('/api/auth/signin').post(users.signin);
  app.route('/api/auth/signout').get(users.signout);

  // Setting the facebook oauth routes
  app.route('/api/auth/facebook').get(users.oauthCall('facebook', {
    scope: ['email']
  }));
  app.route('/api/auth/facebook/callback').get(users.oauthCallback('facebook'));

  // Setting the strava oauth routes
  app.route('/api/auth/strava').get(users.oauthCall('strava'));
  app.route('/api/auth/strava/callback').get(users.oauthCallback('strava'));

  // // Setting the facebook oauth routes
  // app.route('/api/auth/facebook').get(users.oauthCall('facebook', {
  //   scope: ['email']
  // }));
  // app.route('/api/auth/facebook/callback').get(users.oauthCallback('facebook'));

  // // Setting the twitter oauth routes
  // app.route('/api/auth/twitter').get(users.oauthCall('twitter'));
  // app.route('/api/auth/twitter/callback').get(users.oauthCallback('twitter'));

  // // Setting the google oauth routes
  // app.route('/api/auth/google').get(users.oauthCall('google', {
  //   scope: [
  //     'https://www.googleapis.com/auth/userinfo.profile',
  //     'https://www.googleapis.com/auth/userinfo.email'
  //   ]
  // }));
  // app.route('/api/auth/google/callback').get(users.oauthCallback('google'));
};
