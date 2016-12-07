'use strict';

var mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  err;

const GET_EVENTS_LIMIT = 20;

mongoose.Promise = global.Promise;

module.exports = {};

module.exports.getUnprocessedEvents = function() {
  return new Promise(function(resolve, reject) {
    let findEvents = EventModel.find({ 'status': 'new' }).limit(GET_EVENTS_LIMIT).exec();

    findEvents
      .then(function(events) {
        return resolve(events);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};
