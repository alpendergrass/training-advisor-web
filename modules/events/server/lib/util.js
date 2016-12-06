'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  dbUtil = require('./db-util'),
  err;

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
          console.log('saved strava webhook event: ', event);
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
    dbUtil.getUnprocessedEvents()
      .then(function(events) {
        _.forEach(events, function(event) {
          if (event.source === 'strava' && event.objectType === 'activity' && event.aspectType === 'create') {
            // Strava activity - see if the user wants us to save it.
          }


        });




        return resolve();
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

