'use strict';

var _ = require('lodash');
var moment = require('moment-timezone');

function toNumericDate(date, user) {
  // FYI, sometimes we get a moment, sometimes a date,
  // sometimes a string that can be converted into a date like strava's start_date_local:  2017-02-23T12:37:21Z
  // What we want here is to get the date without adjusting for timezone.

  // If we get a string we will just chop it out.
  if (typeof date === 'string') {
    // Assuming something like 2017-02-23T12:37:21Z
    let dateString = date.substring(0, 10).replace(/-/g, '').substring(0, 8);

    if (/^\d+$/.test(dateString) && dateString.length === 8) {
      // dateString contains only digits
      return parseInt(dateString, 10);
    }
  }

  let dateMoment;

  if (user) {
    // When we are working with a date in user timezone - like that returned by getTodayInUserTimezone() -
    // we need to format is using that timezone. Otherwise it will be formatted using server timezone.
    let timezone = user.timezone || 'America/New_York';
    dateMoment = moment.tz(date, timezone);
  } else {
    // The following will format the date in the server timezone.
    // Start of day in NY will become 10 pm the day before in MT
    // so dateString will be a day earlier than we expect.
    // E.g., 2017-02-24T05:00:00.000Z will become 20170223 when running in MT.
    dateMoment = moment(date);
  }

  return parseInt(dateMoment.format('YYYYMMDD'), 10);
}

module.exports = {};

// TODO: the toNumericDate method should be in core util.
module.exports.toNumericDate = toNumericDate;

// TODO: the following method should be in user util.
module.exports.getTodayInUserTimezone = function(user) {
  let userTimezone = user.timezone || 'America/New_York';
  let now = moment(); //Fri Nov 04 2016 02:13:27 GMT+0000 (UTC)
  return moment.tz(now, userTimezone).startOf('day').toDate(); //Thu Nov 03 2016 06:00:00 GMT+0000 (UTC)
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

  if (ftpItem) {
    return ftpItem.ftp;
  }

  // if no match, return oldest.
  return user.ftpLog[user.ftpLog.length - 1].ftp;
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
