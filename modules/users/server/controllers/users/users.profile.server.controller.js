'use strict';

var _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  mongoose = require('mongoose'),
  multer = require('multer'),
  config = require(path.resolve('./config/config')),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  stravaUtil = require(path.resolve('./modules/trainingdays/server/lib/strava-util')),
  User = mongoose.model('User');

exports.update = function(req, res) {
  var user = req.user;
  var userUpdate = req.body;

  // As a security measure we remove roles from the incoming object in case they were tampered with.
  delete userUpdate.roles;

  if (!user) {
    return res.status(403).send({
      message: 'User is not signed in'
    });
  }

  console.log('My Profile update active user: ', user.username);

  if (user.__v !== userUpdate.__v) {
    // req.user, if updated in another tab, could have a greater version (__v) number than req.body user.
    // (Likely, notifications were updated elsewhere.)
    // We will return the current user so the client can sort itself out.
    return res.status(409).send({
      user: user,
      message: 'User data is out of date.'
    });
  }

  let path = '/api/users/update';
  let pageData = { path: path, title: 'My Profile' };
  let eventData = { category: 'User', action: 'Update Profile', path: path };

  coreUtil.logAnalytics(req, pageData, eventData);

  userUtil.verifyUserSettings(userUpdate, user, false)
    .then(function(verified) {
      userUpdate = verified.user;
    })
    .catch(function(err) {
      console.log(`Error - user.update verifyUserSettings failed for user ${user.username} err: ${err}`);
    })
    .then(function() {
      // Merge updates with existing user
      user = _.extend(user, userUpdate);

      user.updated = Date.now();
      user.displayName = user.firstName + ' ' + user.lastName;

      user.save(function(err) {
        if (err) {
          console.log('Error - user update save err: ', err);
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          req.login(user, function (err) {
            if (err) {
              res.status(400).send(err);
            } else {
              res.json(user);
            }
          });
        }
      });
    })
    .catch(function(err) {
      return res.redirect('/trainingDay/');
    });
};

exports.getStravaFTP = function(req, res) {
  stravaUtil.getFTP(req.user)
    .then(user => {
      req.login(user, function (err) {
        if (err) {
          res.status(400).send(err);
        } else {
          res.json(user);
        }
      });
    })
    .catch(err => {
      console.log(`Error - getStravaFTP failed for user ${req.user.username} err: ${err}`);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
};


exports.changeProfilePicture = function(req, res) {
  var user = req.user;
  var message = null;
  var upload = multer(config.uploads.profileUpload).single('newProfilePicture');
  var profileUploadFileFilter = require(path.resolve('./config/lib/multer')).profileUploadFileFilter;

  // Filtering to upload only images
  upload.fileFilter = profileUploadFileFilter;

  if (user) {
    upload(req, res, function (uploadError) {
      if(uploadError) {
        return res.status(400).send({
          message: 'Error occurred while uploading profile picture'
        });
      } else {
        user.profileImageURL = config.uploads.profileUpload.dest + req.file.filename;

        user.save(function (saveError) {
          if (saveError) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(saveError)
            });
          } else {
            req.login(user, function (err) {
              if (err) {
                res.status(400).send(err);
              } else {
                res.json(user);
              }
            });
          }
        });
      }
    });
  } else {
    res.status(400).send({
      message: 'User is not signed in'
    });
  }
};

//Send User
exports.me = function(req, res) {
  res.json(req.user || null);
};
