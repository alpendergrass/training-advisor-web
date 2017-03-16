'use strict';


var path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  passport = require('passport');

mongoose.Promise = global.Promise;

var Site = mongoose.model('Site'),
  User = mongoose.model('User');


// URLs for which user can't be redirected on signin
var noReturnUrls = [
  '/authentication/signin',
  '/authentication/signup'
];

exports.signup = function(req, res) {
  // For security measurement we remove the roles from the req.body object
  delete req.body.roles;

  // Init Variables
  var user = new User(req.body);
  var message = null;

  // Add missing user fields
  user.provider = 'local';
  user.displayName = user.firstName + ' ' + user.lastName;
  user.lastLogin = Date.now();
  user.preferredRestDays = ['1'];

  // Then save the user
  user.save(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      // Remove sensitive data before login
      user.password = undefined;
      user.salt = undefined;

      req.login(user, function(err) {
        if (err) {
          res.status(400).send(err);
        } else {
          res.json(user);
        }
      });
    }
  });
};

// Signin after passport authentication
exports.signin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err || !user) {
      res.status(400).send(info);
    } else {
      user.lastLogin = Date.now();
      user.save(function(err) {
        // Ignore any save error here.
        // Remove sensitive data before login
        user.password = undefined;
        user.salt = undefined;

        req.login(user, function(err) {
          if (err) {
            res.status(400).send(err);
          } else {
            res.json(user);
          }
        });
      });
    }
  })(req, res, next);
};

exports.signout = function(req, res) {
  let path = 'Signout';
  let pageData = null;
  let eventData = { category: 'User', action: 'Sign Out', path: path };
  coreUtil.logAnalytics(req, pageData, eventData);

  req.logout();
  res.redirect('/');
};

// OAuth provider call
exports.oauthCall = function(strategy, scope) {
  return function(req, res, next) {
    // Set redirection path on session.
    // Do not redirect to a signin or signup page
    if (noReturnUrls.indexOf(req.query.redirect_to) === -1) {
      req.session.redirect_to = req.query.redirect_to;
    }
    // Authenticate
    passport.authenticate(strategy, scope)(req, res, next);
  };
};

exports.oauthCallback = function(strategy) {
  return function(req, res, next) {
    // Pop redirect URL from session
    var sessionRedirectURL = req.session.redirect_to;
    delete req.session.redirect_to;

    passport.authenticate(strategy, function(err, user, redirectURL) {
      if (err) {
        return res.redirect('/authentication/signin?err=' + encodeURIComponent(errorHandler.getErrorMessage(err)));
      }

      if (!user) {
        return res.redirect('/authentication/signin');
      }

      req.login(user, function(err) {
        if (err) {
          return res.redirect('/authentication/signin');
        }

        if (user.waitListed) {
          return res.redirect('/waitlist');
        }

        userUtil.verifyUserSettings(user, null, true)
          .then(function(response) {
            user = response.user;
          })
          .catch(function(err) {
            console.log(`oauthCallback verifyUserSettings failed for user ${user.username} err: ${err}`);
          })
          .then(function() {
            // if (_.includes(user.roles, 'admin')) {
            //   return res.redirect('/admin/users');
            // }

            // If user needs to set FTP, timezone or auto-fetch preference we should redirect to profile page.
            if (!user.ftpLog || user.ftpLog.length < 1 || !user.timezone || user.autoFetchStravaActivities === null || user.autoUpdateFtpFromStrava === null) {
              return res.redirect('/settings/profile');
            }

            // We do not want to redirect to the home page after auth.
            return res.redirect(redirectURL || (sessionRedirectURL && sessionRedirectURL !== '/')? sessionRedirectURL : '/trainingDay/');
          })
          .catch(function(err) {
            return res.redirect('/trainingDay/');
          });
      });
    })(req, res, next);
  };
};

// Helper function to save or update a OAuth user profile
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {
  if (!req.user) {
    Site.findOne().exec(function(err, site) {
      if (err || !site) {
        site = { allowRegistrations: true };
      }

      // Define a search query fields
      var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
      var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

      // Define main provider search query
      var mainProviderSearchQuery = {};
      mainProviderSearchQuery.provider = providerUserProfile.provider;
      mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

      // Define additional provider search query
      var additionalProviderSearchQuery = {};
      additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

      // Define a search query to find existing user with current provider profile
      var searchQuery = {
        $or: [mainProviderSearchQuery, additionalProviderSearchQuery]
      };

      User.findOne(searchQuery, function(err, user) {
        if (err) {
          return done(err);
        } else {
          let path = 'saveOAuthUserProfile';
          let pageData = null;

          if (!user) {

            var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

            User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
              user = new User({
                firstName: providerUserProfile.firstName,
                lastName: providerUserProfile.lastName,
                username: availableUsername,
                displayName: providerUserProfile.displayName,
                email: providerUserProfile.email,
                profileImageURL: providerUserProfile.profileImageURL,
                provider: providerUserProfile.provider,
                providerData: providerUserProfile.providerData,
                waitListed: !site.allowRegistrations,
                preferredRestDays: ['1'],
                lastLogin: Date.now()
              });

              if (providerUserProfile.providerData.ftp) {
                user.ftpLog = [{
                  ftp: providerUserProfile.providerData.ftp
                }];
              }

              let eventData = { category: 'User', action: 'New User Login', path: path };
              coreUtil.logAnalytics(req, pageData, eventData, user);

              user.save(function(err) {
                return done(err, user);
              });
            });
          } else {
            //user exists, let's save providerData so we have the latest.

            let eventData = { category: 'User', action: 'Existing User Login', path: path };
            coreUtil.logAnalytics(req, pageData, eventData, user);

            //It is possible that the user revoked access to our app in Strava and then reauthorized,
            //which generates a new accessToken which must be used when calling their API.
            user.providerData = providerUserProfile.providerData;
            //And let's make sure we have the current image URL.
            user.profileImageURL = providerUserProfile.profileImageURL;
            // Then tell mongoose that we've updated the providerData field as it is a schema-less field.
            user.markModified('providerData');
            user.lastLogin = Date.now();
            user.save(function(err) {
              return done(err, user);
            });
          }
        }
      });
    });

  } else {
    // User is already logged in, join the provider data to the existing user
    var user = req.user;

    // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
    if (user.provider !== providerUserProfile.provider && (!user.additionalProvidersData || !user.additionalProvidersData[providerUserProfile.provider])) {
      // Add the provider data to the additional provider data field
      if (!user.additionalProvidersData) {
        user.additionalProvidersData = {};
      }

      user.additionalProvidersData[providerUserProfile.provider] = providerUserProfile.providerData;

      // Then tell mongoose that we've updated the additionalProvidersData field
      user.markModified('additionalProvidersData');

      // And save the user
      user.save(function(err) {
        return done(err, user, '/settings/accounts');
      });
    } else {
      return done(new Error('User is already connected using this provider'), user);
    }
  }
};

exports.removeOAuthProvider = function(req, res, next) {
  var user = req.user;
  var provider = req.query.provider;

  if (!user) {
    return res.status(401).json({
      message: 'User is not authenticated'
    });
  } else if (!provider) {
    return res.status(400).send();
  }

  // Delete the additional provider
  if (user.additionalProvidersData[provider]) {
    delete user.additionalProvidersData[provider];

    // Then tell mongoose that we've updated the additionalProvidersData field
    user.markModified('additionalProvidersData');
  }

  user.save(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      req.login(user, function(err) {
        if (err) {
          return res.status(400).send(err);
        } else {
          return res.json(user);
        }
      });
    }
  });
};
