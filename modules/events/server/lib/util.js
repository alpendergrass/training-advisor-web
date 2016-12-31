'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  dbUtil = require('./db-util'),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  stravaUtil = require(path.resolve('./modules/trainingdays/server/lib/strava-util')),
  err;

mongoose.Promise = global.Promise;

module.exports = {};

module.exports.storeEvent = function(data) {
  return new Promise(function(resolve, reject) {
    if (data.object_type === 'activity' && data.aspect_type === 'create') {
      let event = new EventModel({
        source: 'strava',
        ownerId: data.owner_id,
        objectId: data.object_id,
        objectType: data.object_type,
        aspectType: data.aspect_type,
        eventTime: moment.unix(data.event_time)
      });

      event.save()
        .then(function(event) {
          resolve(event);
        })
        .catch(function(err) {
          console.log('strava webhook event save failed: ', err);
          reject(err);
        });
    } else {
      console.log('unrecognized webhook data: ', data);
      reject(new Error(`storeEvent: unrecognized webhook data ${data}.`));
    }
  });
};

module.exports.processEvents = function() {
  return new Promise(function(resolve, reject) {
    console.log('processEvents start: ', moment().format());
    dbUtil.getUnprocessedEvents()
      .then(function(events) {
        _.forEach(events, function(event) {
          if (event.source === 'strava' && event.objectType === 'activity' && event.aspectType === 'create') {
            // Strava activity - see if the user wants us to save it.
            // get user by strava user id: providerData.id
            userUtil.getUserByStravaID(event.ownerId)
              .then(function(user) {
                if (user && user.autoFetchStravaActivities) {
                  // We were getting a few events for which we found no user.
                  // Not sure how this happened.
                  return stravaUtil.fetchActivity(user, event.objectId);
                } else {
                  event.status = 'skipped';
                  return Promise.resolve();
                }
              })
              .then(function() {
                if (event.status !== 'skipped') {
                  event.status = 'fetched';
                }

                event.processed = moment().format();
                return event.save();
              })
              .then(function(event) {
                // console.log('processed strava webhook event: ', event);
              })
              .catch(function(err) {
                console.log('strava webhook event processing failed: ', err);
                event.status = 'error';
                event.errorDetail = err;

                event.save()
                  .then(function(event) {})
                  .catch(function(err) {
                    console.log('strava webhook event processing error - event save failed: ', err);
                  });
              });
          } else {
            event.status = 'unrecognized';

            event.save()
              .then(function(event) {
                console.log('skipping unrecognized event: ', event);
              })
              .catch(function(err) {
                console.log('skipping unrecognized event - save failed: ', err);
              });
          }
        });

        console.log('processEvents   end: ', moment().format());
        return resolve();
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

