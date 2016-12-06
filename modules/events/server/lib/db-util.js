'use strict';

var mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  err;

module.exports = {};

module.exports.saveEvent = function(event) {
  return new Promise(function(resolve, reject) {
//overkill - do inline?
    event.save()
      .then(function(events) {
        return resolve(events);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

module.exports.getUnprocessedEvents = function() {
  return new Promise(function(resolve, reject) {
    let findEvents = EventModel.find({ 'processed': null }).exec();

    findEvents
      .then(function(events) {
        return resolve(events);
      })
      .catch(function(err) {
        reject(err);
      });
  });
};

// module.exports.updateEvent = function(event) {
//   return new Promise(function(resolve, reject) {
//     let notificationsModified = false;

//     event.save(function(err) {
//       if (err) {
//         return reject(err);
//       }
//       return resolve({ user: user, saved: true });
//     });
//   });
// };
