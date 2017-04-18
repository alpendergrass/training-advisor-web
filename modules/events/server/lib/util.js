'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  User = mongoose.model('User'),
  dbUtil = require('./db-util'),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  stravaUtil = require(path.resolve('./modules/trainingdays/server/lib/strava-util')),
  err;

mongoose.Promise = global.Promise;

var processStravaEvent = function(event) {
  return new Promise(function(resolve, reject) {
    // Strava activity - see if the user wants us to save it.
    // get user by strava user id: providerData.id
    userUtil.getUserByStravaID(event.ownerId)
      .then(user => {
        if (user && user.autoFetchStravaActivities) {
          // We were getting a few events for which we found no user.
          // Not sure how this happened.
          return stravaUtil.fetchActivity(user, event.objectId);
        } else {
          console.log('skipping event.objectId: ', event.objectId);
          event.status = 'skipped';
          return;
        }
      })
      .then(() => {
        if (event.status !== 'skipped') {
          event.status = 'fetched';
        }

        event.processed = moment().format();
        console.log('processed strava webhook event.objectId: ', event.objectId);
        return event.save();
      })
      .then(event => {
        return resolve();
      })
      .catch(err => {
        console.log(`strava event processing failed. Error: ${err}. Event: ${JSON.stringify(event)}`);
        event.status = 'error';
        event.errorDetail = err;

        event.save()
          .then(event => {
            return resolve();
          })
          .catch(err => {
            console.log(`strava event processing error - event save failed. Error: ${err}. Event: ${JSON.stringify(event)}`);
            return resolve();
          });
      });
  });
};

var processSendInBlueEvent = function(event) {
  return new Promise(function(resolve, reject) {
    User.update({ email: event.objectValue }, { $set: { emailNewsletter: false } }).exec()
      .then(() => {
        event.status = 'applied';
        event.processed = moment().format();
        console.log(`processed sendInBlue webhook event for: ${event.objectValue}`);
        return event.save();
      })
      .then(event => {
        return resolve();
      })
      .catch(err => {
        console.log(`sendinblue event processing failed. Error: ${err}. Event: ${JSON.stringify(event)}`);
        event.status = 'error';
        event.errorDetail = err;

        event.save()
          .then(event => {
            return resolve();
          })
          .catch(err => {
            console.log(`sendinblue event processing error - event save failed. Error: ${err}. Event: ${JSON.stringify(event)}`);
            return resolve();
          });
      });
  });
};

var processUnrecognizedEvent = function(event) {
  return new Promise(function(resolve, reject) {
    event.status = 'unrecognized';

    event.save()
      .then(event => {
        console.log(`Error: skipping unrecognized event. Event: ${JSON.stringify(event)}`);
        return resolve();
      })
      .catch(err => {
        console.log(`Error: skipping unrecognized event - save failed. Event: ${JSON.stringify(event)}`);
        return resolve();
      });
  });
};

module.exports = {};

module.exports.storeStravaEvent = function(data) {
  return new Promise(function(resolve, reject) {
    if (data.object_type === 'activity' && data.aspect_type === 'create') {
      let event = new EventModel({
        source: 'strava',
        ownerId: data.owner_id,
        objectId: data.object_id,
        objectType: data.object_type,
        aspectType: data.aspect_type,
        eventTime: moment.unix(data.event_time),
        eventData: JSON.stringify(data)
      });

      event.save()
        .then(function(event) {
          resolve(event);
        })
        .catch(function(err) {
          console.log(`strava webhook event save failed. Error: ${err}. Data: ${JSON.stringify(data)}`);
          reject(err);
        });
    } else {
      console.log('unrecognized webhook data: ', data);
      reject(new Error(`storeStravaEvent: unrecognized webhook data ${JSON.stringify(data)}.`));
    }
  });
};

module.exports.storeSendInBlueEvent = function(data) {
  return new Promise(function(resolve, reject) {
    if (data.event === 'unsubscribe') {
      console.log('SendInBlue unsubscribe request received for email ', data.email);

      let event = new EventModel({
        source: 'sendinblue',
        objectType: 'email_address',
        objectValue: data.email,
        aspectType: data.event,
        eventTime: moment(data.date_event),
        eventData: JSON.stringify(data)
      });

      event.save()
        .then(function(event) {
          resolve(event);
        })
        .catch(function(err) {
          console.log(`sendInBlue webhook event save failed. Error: ${err}. Data: ${JSON.stringify(data)}`);
          reject(err);
        });
    } else {
      reject(new Error(`storeSendInBlueEvent: unrecognized webhook data ${JSON.stringify(data)}.`));
    }
  });
};

module.exports.processEvents = function() {
  return new Promise(function(resolve, reject) {
    // console.log('processEvents starting: ', moment().format());
    dbUtil.getUnprocessedEvents()
      .then(events => {
        // Using Array.reduce to process sequentially in hopes of eliminating version error
        // when processing two events for a user.
        events.reduce((promise, event) => {
          return promise.then(() => {
            if (event.source === 'strava' && event.objectType === 'activity' && event.aspectType === 'create') {
              return processStravaEvent(event);
            } else if (event.source === 'sendinblue' && event.objectType === 'email_address' && event.aspectType === 'unsubscribe') {
              return processSendInBlueEvent(event);
            } else {
              return processUnrecognizedEvent(event);
            }
          });
        }, Promise.resolve()) // Resolved promise is initial value passed into payload.reduce().
          .then(() => {
            console.log('Done processing events.');
            return resolve();
          });
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};

module.exports.purgeEvents = function() {
  let purgeDate = moment().subtract(1, 'week').toDate();

  return new Promise(function(resolve, reject) {
    console.log('purgeEvents starting: ', moment().format());
    EventModel.remove({
      created: { $lt: purgeDate },
      status: { $ne: 'new' }
    }, function(err) {
      if (err) {
        console.log('purgeEvents failed: ', err);
        reject(err);
      }

      resolve();
    });
  });
};

