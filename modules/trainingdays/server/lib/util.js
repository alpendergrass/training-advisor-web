'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  dbUtil = require('./db-util');

module.exports = {};

// TODO: the following method should be in user util.
module.exports.getTodayInUserTimezone = function(user) {
  let now = moment(); //Fri Nov 04 2016 02:13:27 GMT+0000 (UTC)
  return moment.tz(now, user.timezone).startOf('day').toDate(); //Thu Nov 03 2016 06:00:00 GMT+0000 (UTC)
};

// TODO: the following method should be in user util.
module.exports.getFTP = function(user, trainingDateNumeric) {
  if (user.ftpLog.length < 1) {
    //should not get here without having at least one ftp.
    throw new Error(`User ${user.username} has no ftpLog.`);
  }

  // ftpLog is stored sorted by date newest to oldest.
  // We will return the first ftp that has a date earlier or equal to current.
  let ftpItem = _.find(user.ftpLog, function(item) {
    return item.ftpDateNumeric <= trainingDateNumeric;
  });

  // Somehow a null ftp slipped through. Shouldn't happen but just in case let's check.
  if (ftpItem && Number.isInteger(ftpItem.ftp)) {
    return ftpItem.ftp;
  }

  // if no match, return oldest.
  ftpItem = user.ftpLog[user.ftpLog.length - 1];

  if (Number.isInteger(ftpItem.ftp)) {
    return ftpItem.ftp;
  }

  throw new Error(`User ${user.username} has no valid ftp.`);
};

module.exports.getMetrics = function(trainingDay, metricsType) {
  //metricsType planned|actual
  return _.find(trainingDay.metrics, ['metricsType', metricsType]);
};

module.exports.getPlannedActivity = function(trainingDay, source) {
  return _.find(trainingDay.plannedActivities, ['source', source]);
};

module.exports.setMetricsType = function(source) {
  //plannedActivitySources advised|requested|plangeneration
  //metricsType planned|actual
  switch (source) {
    case 'advised':
      return 'actual';
    case 'requested':
      return 'actual';
    case 'plangeneration':
      return 'planned';
    default:
      return 'actual';
  }
};
