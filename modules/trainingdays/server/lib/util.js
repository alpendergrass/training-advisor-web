'use strict';

var _ = require('lodash');
var moment = require('moment-timezone');

function toNumericDate(date) {
  var dateString = moment(date).format('YYYYMMDD');
  return parseInt(dateString, 10);
}

module.exports = {};

module.exports.toNumericDate = toNumericDate;

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

//TODO: the following two methods should be in user util.
module.exports.getTodayInUserTimezone = function(user) {
  let userTimezone = user.timezone || 'America/New_York';
  let now = moment(); //Fri Nov 04 2016 02:13:27 GMT+0000 (UTC)
  return moment.tz(now, userTimezone).startOf('day').toDate(); //Thu Nov 03 2016 06:00:00 GMT+0000 (UTC)
};

module.exports.getFTP = function(user, trainingDateNumeric) {
  if (user.ftpLog.length < 1) {
    //should not get here without having at least one ftp.
    throw new Error(`User ${user.username} has no ftpLog.`);
  }
  console.log('trainingDateNumeric: ', trainingDateNumeric);

  // ftpLog is stored sorted by date newest to oldest.
  // We will return the first ftp that has a date earlier or equal to current.
  let ftpItem = _.find(user.ftpLog, function(item) {
    console.log('item.ftpDate: ', (item.ftpDate));
    console.log('item.ftpDate: ', toNumericDate(item.ftpDate));
    return toNumericDate(item.ftpDate) <= trainingDateNumeric;
  });

  if (ftpItem) {
    return ftpItem.ftp;
  }

  // if no match, return oldest.
  return user.ftpLog[user.ftpLog.length - 1].ftp;
};

// module.exports.sendMessageToUser = function (message, user) {
//   var socketIDlookup = _.find(global.userSocketIDs, function(sock) {
//     return sock.username === user.username;
//   });

//   if (socketIDlookup) {
//     console.log('Emitting trainingDayMessage "' + message.text + '" to ' + user.username + ' on socketID ' + socketIDlookup.socketID);
//     global.io.to(socketIDlookup.socketID).emit('trainingDayMessage', message);
//   } else {
//     console.log('socketIDlookup failed for username ' + user.username);
//   }
// };
