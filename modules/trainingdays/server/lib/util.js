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

module.exports.getTodayInTimezone = function(timezone) {
  let useTimezone = timezone || 'America/New_York';
  console.log('useTimezone: ', useTimezone);
  let now = moment(); //Fri Nov 04 2016 02:13:27 GMT+0000 (UTC)
  return moment.tz(now, timezone).startOf('day').toDate(); //Thu Nov 03 2016 06:00:00 GMT+0000 (UTC)
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
