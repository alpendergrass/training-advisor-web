'use strict';


var passport = require('passport'),
  StravaStrategy = require('passport-strava-oauth2').Strategy,
  users = require('../../controllers/users.server.controller');

module.exports = function (config) {
  // Use strava strategy
  passport.use(new StravaStrategy({
    clientID: config.strava.clientID,
    clientSecret: config.strava.clientSecret,
    callbackURL: config.strava.callbackURL,
    passReqToCallback: true
  },
  function (req, accessToken, refreshToken, profile, done) {
    // Set the provider data and include tokens
    var providerData = profile._json;
    providerData.accessToken = accessToken;
    providerData.refreshToken = refreshToken;

    // Create the user OAuth profile
    var providerUserProfile = {
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      displayName: profile.displayName,
      email: profile.emails[0].value,
      username: profile.username || generateUsername(profile),
      profileImageURL: getImageURL(providerData), 
      provider: 'strava',
      providerIdentifierField: 'id',
      providerData: providerData
    };

    // Save the user OAuth profile
    users.saveOAuthUserProfile(req, providerUserProfile, done);

    function generateUsername(profile) {
      var username = '';

      if (profile.emails) {
        username = profile.emails[0].value.split('@')[0];
      } else if (profile.name) {
        username = profile.name.givenName[0] + profile.name.familyName;
      }

      return username.toLowerCase() || undefined;
    }

    function getImageURL (providerData) {
      //(providerData.profile) ? providerData.profile : undefined, //avatar/athlete/large.png

      if (providerData.profile && providerData.profile.indexOf('http') > -1) {
        return providerData.profile;
      }

      return '/modules/users/client/img/profile/default.png';  
    }
  }));
};
