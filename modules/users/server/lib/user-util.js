'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  err;


var removeOrphanedNotifications = function(notifications) {
  // Here we will remove any notifications that are associated with training days that no longer exist.
  return new Promise(function(resolve, reject) {
    return Promise.all(notifications.map(function(notification) {
      if (notification.lookup) {
        // We are assuming that the lookup is an TD ID.
        let countTDs = TrainingDay.count({ _id: notification.lookup }).exec();

        countTDs
          .then(function(count) {
            if (count < 1) {
              // No TrainingDay exists for the notification.
              // Remove the notification.
              return null;
            } else {
              // TrainingDay exists for the notification.
              return notification;
            }
          })
          .catch(function(err) {
            // If error we will remove notification
            return;
          });
      } else {
        // No lookup associated with the notification so leave it alone.
        return notification;
      }
    }))
      .then(function(scannedNotifications) {
        // Remove any null values from our array of results from Promise.all
        _.remove(scannedNotifications, function(notification) {
          return !notification;
        });

        return resolve(scannedNotifications);
      });
  });
};

var adornNotification = function(notification) {
  // *** Beware of possible circular blocks. ***

  let notificationAdornments = [
    {
      notificationType: 'ftp',
      message: 'You need to set your Functional Threshold Power.',
      state: 'settings.profile',
      alert: true,
      blocks: 'start'
    }, {
      notificationType: 'timezone',
      message: 'You need to set your local timezone.',
      state: 'settings.profile',
      alert: true,
      blocks: ''
    }, {
      notificationType: 'fetchstrava',
      message: 'You need to set your Strava Activity Sync preference.',
      state: 'settings.profile',
      alert: false,
      blocks: ''
    }, {
      notificationType: 'fetchstravaftp',
      message: 'You need to set your Strava FTP Sync preference.',
      state: 'settings.profile',
      alert: false,
      blocks: ''
    }, {
      notificationType: 'plangen',
      message: 'You need to update your season.',
      state: 'season',
      alert: false,
      blocks: ''
    }, {
      notificationType: 'start',
      message: 'You need to set a start day for your season.',
      state: 'trainingDays.createStart',
      alert: true,
      blocks: 'plangen'
    }, {
      notificationType: 'goal',
      message: 'You need to create a goal for your season.',
      state: 'trainingDays.createEvent({"scheduledEventRanking": "1"})',
      alert: false,
      blocks: ''
    }, {
      notificationType: 'terrain',
      message: 'You should set terrain for your event.',
      state: 'trainingDayView({"trainingDayId": "||lookup||" })',
      alert: false,
      blocks: ''
    }, {
      notificationType: 'loadestimate',
      message: 'You should provide an estimated load for your event.',
      state: 'trainingDayView({"trainingDayId": "||lookup||" })',
      alert: false,
      blocks: ''
    }
  ];

  let adornment = _.find(notificationAdornments, { 'notificationType': notification.notificationType });

  if (adornment) {
    notification.message = adornment.message;
    notification.state = _.replace(adornment.state, '||lookup||', notification.lookup);
    notification.alert = adornment.alert;
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

module.exports.updateNotifications = function(user, notificationUpdates, saveUser) {
  return new Promise(function(resolve, reject) {
    let notificationsModified = false;

    removeOrphanedNotifications(user.notifications)
      .then(function(notifications) {
        user.notifications = notifications;

        _.forEach(notificationUpdates, function(notificationUpdate) {
          let notification = _.find(user.notifications, function(n) {
            return ((notificationUpdate.notificationType === '[[all]]' || n.notificationType === notificationUpdate.notificationType) && n.lookup === notificationUpdate.lookup);
          });

          if (notificationUpdate.add) {
            // If notification does not exist we need to add it.
            if (!notification && notificationUpdate.notificationType !== '[[all]]') {
              // '[[all]]' is only valid when removing notifications.
              notificationsModified = true;
              user.notifications.push(adornNotification(notificationUpdate));
            }
          } else {
            // If notification exists we need to remove it.
            if (notification) {
              notificationsModified = true;
              _.remove(user.notifications, function(notification) {
                return (notificationUpdate.notificationType === '[[all]]' || notification.notificationType === notificationUpdate.notificationType) && notification.lookup === notificationUpdate.lookup;
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


        if (!saveUser) {
          return resolve({ user: user, saved: false });
        }

        user.markModified('notifications');
        // I do not understand why I have to do this as notifications is not a schema-less type.
        // But it seems I have to for it to work.

        user.save()
          .then(function(user) {
            return resolve({ user: user, saved: true });
          })
          .catch(function(err){
            console.log('updateNotifications user save err: ', err);
            return reject(err);
          });
      })
      .catch(function(err){
        return reject(err);
      });
  });
};

module.exports.verifyUserSettings = function(updatedUser, userBefore, saveUser) {
  return new Promise(function(resolve, reject) {
    let notifications = [];

    if (!updatedUser.ftpLog || updatedUser.ftpLog.length < 1) {
      notifications.push({ notificationType: 'ftp', lookup: '', add: true });
    } else {
      notifications.push({ notificationType: 'ftp', lookup: '' });
    }

    if (!updatedUser.timezone) {
      notifications.push({ notificationType: 'timezone', lookup: '', add: true });
    } else {
      notifications.push({ notificationType: 'timezone', lookup: '' });
    }

    if (updatedUser.autoFetchStravaActivities === null) {
      notifications.push({ notificationType: 'fetchstrava', lookup: '', add: true });
    } else {
      notifications.push({ notificationType: 'fetchstrava', lookup: '' });
    }

    if (updatedUser.autoUpdateFtpFromStrava === null) {
      notifications.push({ notificationType: 'fetchstravaftp', lookup: '', add: true });
    } else {
      notifications.push({ notificationType: 'fetchstravaftp', lookup: '' });
    }

    // If latest ftp date was changed
    // or if rest days were changed
    // or recoveryRate was changed
    // //or rampRateAdjustment was changed,
    //  recommend plangen.
    if (userBefore &&
      ((userBefore.ftpLog && userBefore.ftpLog.length > 0 && updatedUser.ftpLog && updatedUser.ftpLog.length > 0 && !moment(userBefore.ftpLog[0].ftpDate).isSame(updatedUser.ftpLog[0].ftpDate, 'day')) ||
      !_.isEqual(userBefore.preferredRestDays, updatedUser.preferredRestDays) ||
      (userBefore.recoveryRate && userBefore.recoveryRate !== updatedUser.recoveryRate))) {
      // (userBefore.recoveryRate && userBefore.recoveryRate !== updatedUser.recoveryRate) ||
      // (userBefore.rampRateAdjustment && userBefore.rampRateAdjustment !== updatedUser.rampRateAdjustment))) {
      notifications.push({ notificationType: 'plangen', lookup: '', add: true });
    }

    module.exports.updateNotifications(updatedUser, notifications, saveUser)
      .then(function(response) {
        return resolve(response);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports.getUserByStravaID = function(id) {
  return new Promise(function(resolve, reject) {
    // We are assuming that user.provider ==='strava'
    let findUser = User.findOne({ 'providerData.id': id }).exec();

    findUser
      .then(function(user) {
        return resolve(user);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};
