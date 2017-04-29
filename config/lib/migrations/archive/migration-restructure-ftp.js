'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util'));

mongoose.Promise = global.Promise;

module.exports = {
  id: 'migration-restructure-ftp',

  up: function(db, callback) {
    console.log('Starting restructure-metrics migration: ', new Date().toString());
    var getUsers = User.find({}).sort('-created').exec();

    getUsers.then(function(users) {
      return Promise.all(users.map(function(user) {
        return restructureFTP(user);
      }));
    })
    .then(function(results) {
      console.log(`migration-restructure-ftp complete. ${results.length} users processed.`);
      return callback(null);
    })
    .catch(function(err) {
      return callback(err);
    });
  },

  down: function(db, callback) {
    console.log('migration-restructure-ftp.down called.');
    var getUsers = User.find({}).sort('-created').exec();

    getUsers.then(function(users) {
      return Promise.all(users.map(function(user) {
        return rollbackFTPRestructure(user);
      }));
    })
    .then(function(results) {
      console.log(`migration-restructure-ftp rolled back. ${results.length} users processed.`);
      return callback(null);
    })
    .catch(function(err) {
      return callback(err);
    });
  }
};

function restructureFTP(user) {
  return new Promise(function(resolve, reject) {
    if (!user.thresholdPower || !user.thresholdPowerTestDate) {
      return resolve(false);
    }

    let userTimezone = user.timezone || 'America/New_York';

    let ftpData = {
      ftp: user.thresholdPower,
      ftpDate: user.thresholdPowerTestDate,
      ftpDateNumeric: util.toNumericDate(moment.tz(user.thresholdPowerTestDate, userTimezone).startOf('day').toDate()),
      ftpSource: 'migration'
    };

    user.ftpLog = [];
    user.ftpLog.push(ftpData);
    user.save()
      .then(function(results) {
        console.log(`restructureFTP successful for user ${user.username}.`);
        return resolve(true);
      })
      .catch(function(err) {
        console.log(`restructureFTP failed for user: ${user.username}. err: ${err}`);
        return resolve(false);
      });
  });
}

function rollbackFTPRestructure(user) {
  return new Promise(function(resolve, reject) {
    user.ftpLog = [];
    user.save()
      .then(function(results) {
        console.log(`rollbackFTPRestructure successful for user ${user.username}.`);
        return resolve(true);
      })
      .catch(function(err) {
        console.log(`rollbackFTPRestructure failed for user: ${user.username}. err: ${err}`);
        return resolve(false);
      });
  });
}
