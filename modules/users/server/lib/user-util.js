'use strict';

var path = require('path'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  err;


var adornNotification = function(notification) {
  let notificationAdornments = [
    {
      notificationType: 'ftp',
      message: 'You need to set your Functional Threshold Power.',
      state: 'settings.profile'
    }, {
      notificationType: 'timezone',
      message: 'You need to set your local timezone.',
      state: 'settings.profile'
    }
  ];

  let adornment = _.find(notificationAdornments, { 'notificationType': notification.notificationType });

  if (adornment) {
    notification.message = adornment.message;
    notification.state = adornment.state;
  }

  return notification;
};

module.exports = {};

module.exports.updateFatigueTimeConstant = function(id, trainingEffortFeedback, callback) {
  //Adjust user.fatigueTimeConstant based on trainingDay.trainingEffortFeedback
  var computedConstant;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    err = new TypeError('user id is not valid');
    return callback(err, null);
  }

  User.findById(id, '-salt -password').exec(function(err, user) {
    if (err) {
      return callback(err, null);
    }

    if (!user) {
      return callback(new Error('Failed to load user ' + id), null);
    }

    if (trainingEffortFeedback === null || trainingEffortFeedback === 0) {
      //No need to adjust user's fatigueTimeConstant
      return callback(null, user.fatigueTimeConstant);
    }

    computedConstant = user.fatigueTimeConstant + trainingEffortFeedback;

    if (computedConstant < adviceConstants.minimumFatigueTimeConstant) {
      user.fatigueTimeConstant = adviceConstants.minimumFatigueTimeConstant;
    } else if (computedConstant > adviceConstants.maximumFatigueTimeConstant) {
      user.fatigueTimeConstant = adviceConstants.maximumFatigueTimeConstant;
    } else {
      user.fatigueTimeConstant = computedConstant;
    }

    user.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, user.fatigueTimeConstant);
    });
  });
};

module.exports.getTrainingPeaksAutoDownloadUsers = function(callback) {

  var query = User.where('trainingPeaksCredentials.autoDownload').equals(true);

  query.find().exec(function(err, users) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, users);
  });
};

module.exports.addNotifications = function(user, newNotifications) {
  return new Promise(function(resolve, reject) {

    // User.findById(id, '-salt -password').exec(function(err, user) {
    //   if (err) {
    //     return reject(err);
    //   }

    // if (user.notifications.length < 1) {
    //   // TODO: add message and link (?)
    //   user.notifications.push(newNotification);
    // } else {

    console.log('addNotifications user: ', user);
    let notificationAdded = false;

    _.forEach(newNotifications, function(newNotification) {

      // See if notification already exists.
      let notification = _.find(user.notifications, { 'notificationType': newNotification.notificationType, 'lookup': newNotification.lookup });

      if (!notification) {
        notificationAdded = true;
        // TODO: add message and link (?)
        user.notifications.push(adornNotification(newNotification));
      }
    });

    if (!notificationAdded) {
      return resolve(user);
    }

    user.save(function(err) {
      if (err) {
        return reject(err);
      }

      return resolve(user);
    });
  });
  // });
};
