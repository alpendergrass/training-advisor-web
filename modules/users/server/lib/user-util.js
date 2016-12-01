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

module.exports.updateNotifications = function(user, notificationUpdates) {
  return new Promise(function(resolve, reject) {

    // User.findById(id, '-salt -password').exec(function(err, user) {
    //   if (err) {
    //     return reject(err);
    //   }

    // if (user.notifications.length < 1) {
    //   // TODO: add message and link (?)
    //   user.notifications.push(notificationUpdate);
    // } else {

    let notificationsModified = false;

    _.forEach(notificationUpdates, function(notificationUpdate) {
      let notification = _.find(user.notifications, { 'notificationType': notificationUpdate.notificationType, 'lookup': notificationUpdate.lookup });

      if (notificationUpdate.add) {
        // If notification does not exist we need to add it.
        if (!notification) {
          notificationsModified = true;
          user.notifications.push(adornNotification(notificationUpdate));
        }
      } else {
        // If notification exists we need to remove it.
        if (notification) {
          notificationsModified = true;
          _.remove(user.notifications, function(notification) {
            return notification.notificationType === notificationUpdate.notificationType && notification.lookup === notificationUpdate.lookup;
          });
        }
      }
    });

    if (!notificationsModified) {
      return resolve({ user: user, saved: false });
    }

    user.markModified('notifications');
    // I do not understand why I have to do this as notifications is not a schema-less type.

    user.save(function(err) {
      if (err) {
        return reject(err);
      }
      return resolve({ user: user, saved: true });
    });
  });
  // });
};

module.exports.verifyUserSettings = function(user, callback) {
  let notifications = [];

  if (!user.thresholdPower) {
    notifications.push({ notificationType: 'ftp', lookup: '', alert: true, add: true });
  } else {
    notifications.push({ notificationType: 'ftp', lookup: '' });
  }

  if (!user.timezone) {
    notifications.push({ notificationType: 'timezone', lookup: '', alert: true, add: true });
  } else {
    notifications.push({ notificationType: 'timezone', lookup: '' });
  }

  module.exports.updateNotifications(user, notifications)
    .then(function(response) {
      return callback(null, response);
    })
    .catch(function(err) {
      return callback(err, null);
    });
};

