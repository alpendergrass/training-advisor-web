'use strict';

const _ = require('lodash'),
  moment = require('moment-timezone'),
  ua = require('universal-analytics');

module.exports = {};

module.exports.logAnalytics = function(req, pageData, eventData, user) {

  if (!req.user && !user) {
    return;
  }

  let userId = req.user? req.user.id : user.id;

  try {
    var visitor = ua(req.app.locals.googleAnalyticsTrackingID, userId, { strictCidFormat: false });

    if (pageData && pageData.path) {
      if (!pageData.title) {
        // If we are not passed a page title, we will use the last node of referer.
        // req.headers.referer: "http://localhost:3000/season"
        // req.headers.referer: "http://www.tacittraining.com/season"
        pageData.title = _.startCase(req.headers.referer.replace(/^\w+\:{1}\/{2}[\w.:]+\/?\w*\/{1}/, ''));
      }

      visitor.pageview({ dp: pageData.path, dt: pageData.title, dh: req.app.locals.googleAnalyticsHost, uid: userId }).send();
    }

    if (eventData) {
      let eventParms = {
        ec: eventData.category,
        ea: eventData.action,
        uid: userId,
        el: eventData.label || null,
        ev: eventData.value || null,
        // I do not see where event path shows up in GA.
        dp: eventData.path || null
      };

      visitor.event(eventParms).send();
    }
    return;
  } catch (err) {
    console.log('logAnalytics error: ', err);
    // We don't want to blow up if analytics logging does not work.
    return;
  }
};

module.exports.toNumericDate = function(date, user) {
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
    dateMoment = moment.tz(date, user.timezone);
  } else {
    // The following will format the date in the server timezone.
    // Start of day in NY will become 10 pm the day before in MT
    // so dateString will be a day earlier than we expect.
    // E.g., 2017-02-24T05:00:00.000Z will become 20170223 when running in MT.
    dateMoment = moment(date);
  }

  return parseInt(dateMoment.format('YYYYMMDD'), 10);
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
