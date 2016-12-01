'use strict';

var _ = require('lodash'),
  fs = require('fs'),
  path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  mongoose = require('mongoose'),
  multer = require('multer'),
  config = require(path.resolve('./config/config')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  User = mongoose.model('User');

exports.update = function(req, res) {
  var user = req.user;
  var notifications;
  var userUpdate = req.body;

  // As a security measure we remove roles from the incoming object in case they were tampered with.
  delete userUpdate.roles;

  if (!user) {
    return res.status(400).send({
      message: 'User is not signed in'
    });
  }

  userUtil.verifyUserSettings(userUpdate, user, false, function(err, response) {
    if (err) {
      console.log(`verifyUserSettings failed for user ${user.username} err: ${err}`);
    } else {
      userUpdate = response.user;
      // Save notifications so we can restore after merge below
      notifications = user.notifications;
    }

    // Merge updates with existing user
    user = _.extend(user, userUpdate);

    user.updated = Date.now();
    user.displayName = user.firstName + ' ' + user.lastName;

    if (notifications) {
      user.notifications = notifications;
    }

    user.save(function(err) {
      if (err) {
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
