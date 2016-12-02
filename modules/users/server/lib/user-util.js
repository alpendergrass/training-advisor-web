'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  err;


var adornNotification = function(notification) {
  // *** Beware of possible circular blocks. ***

  let notificationAdornments = [
    {
      notificationType: 'ftp',
      message: 'You need to set your Functional Threshold Power.',
      state: 'settings.profile',
      blocks: ''
    }, {
      notificationType: 'timezone',
      message: 'You need to set your local timezone.',
      state: 'settings.profile',
      blocks: ''
    }, {
      notificationType: 'plangen',
      message: 'You need to update your season.',
      state: 'season',
      blocks: ''
    }, {
      notificationType: 'start',
      message: 'You need to set a start day for your season.',
      state: 'trainingDays.createStart',
      blocks: 'plangen'
    }, {
      notificationType: 'goal',
      message: 'You need to create a goal for your season.',
      state: 'trainingDays.createEvent({"scheduledEventRanking": "1"})',
      blocks: 'plangen'
    }
  ];

  let adornment = _.find(notificationAdornments, { 'notificationType': notification.notificationType });

  if (adornment) {
    notification.message = adornment.message;
    notification.state = adornment.state;
    notification.blocks = adornment.blocks;
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

module.exports.updateNotifications = function(user, notificationUpdates, saveUser) {
  return new Promise(function(resolve, reject) {
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

    // Block notifications if blocking notifications are present
    // and v.v.
    let blocks = _.flatMap(user.notifications, function(n) { return n.blocks; });

    _.forEach(user.notifications, function(notification) {
      notification.blocked = _.includes(blocks, notification.notificationType);
    });

    user.markModified('notifications');
    // I do not understand why I have to do this as notifications is not a schema-less type.

    if (!saveUser) {
      return resolve({ user: user, saved: false });
    }

    user.save(function(err) {
      if (err) {
        return reject(err);
      }
      return resolve({ user: user, saved: true });
    });
  });
};

module.exports.verifyUserSettings = function(updatedUser, userBefore, saveUser, callback) {
  let notifications = [];

  if (!updatedUser.thresholdPower) {
    notifications.push({ notificationType: 'ftp', lookup: '', alert: true, add: true });
  } else {
    notifications.push({ notificationType: 'ftp', lookup: '' });
  }

  if (!updatedUser.timezone) {
    notifications.push({ notificationType: 'timezone', lookup: '', alert: true, add: true });
  } else {
    notifications.push({ notificationType: 'timezone', lookup: '' });
  }

  if (userBefore &&
    (!moment(userBefore.thresholdPowerTestDate).isSame(updatedUser.thresholdPowerTestDate, 'day') ||
    !_.isEqual(userBefore.preferredRestDays, updatedUser.preferredRestDays))) {
    notifications.push({ notificationType: 'plangen', lookup: '', alert: true, add: true });
  }

  module.exports.updateNotifications(updatedUser, notifications, saveUser)
    .then(function(response) {
      return callback(null, response);
    })
    .catch(function(err) {
      return callback(err, null);
    });
};

