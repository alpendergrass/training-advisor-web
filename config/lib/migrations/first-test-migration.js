'use strict';
// var mongoose = require('mongoose'),
//   _ = require('lodash'),
//   moment = require('moment-timezone'),
//   TrainingDay = mongoose.model('TrainingDay'),
//   User = mongoose.model('User');

// For each user
//   For each TD (starting with oldest)
//     Determine how many days between current day and the next
//     Set date to current + difference in the user's TZ.
//   Next TD
// Next user

module.exports = {
  id: 'first-test-migration.js',

  up: function(db, callback) {
    // return callback(new Error('test error'));
    return callback();



    //Uses MongoDB native driver to run commands on database
    //http://mongodb.github.io/node-mongodb-native/2.2/

    // db.collection('testcollection').insert({ name: 'initial-setup' }, callback);

    // var collection = db.collection('users');
    // var cursor = collection.find();
    // var count = 0;

    // cursor.each(function(err, doc) {
    //   if (err) callback(err);

    //   if (doc) {
    //     count = count + 1;
    //   } else {
    //     if (cursor.isClosed()) {
    //       console.log('all users have been processed: ', count);
    //     }
    //     var err = new Error('test error');
    //     callback(err);
    //   }
    // });


    //Using Mongoose.
    // var count = 0;
    // User.find({}).sort('-created').exec(function(err, users) {
    //   if (err) {
    //     return callback(err);
    //   }

    //   _.forEach(users, function(user, index) {
    //     fixDates(user, function(err) {
    //       if (err) {
    //         return callback(err);
    //       }

    //       count = count + 1;
    //       console.log('processed user: ', user.username);
    //       if (index >= users.length - 1) {
    //         console.log('all users have been processed: ', count);
    //         return callback(null);
    //         //callback(new Error('test error'));
    //       }
    //     });
    //   });
    // });

  },

  down: function(db, callback) {
    // db.collection('testcollection').remove({ name: 'initial-setup' }, callback);
    // console.log('Rollback not possible.');
    callback();
  }
};

// function fixDates(user, callback) {
//   var dayDiff = 0,
//     timezone = user.timezone || 'America/Denver';

//   TrainingDay.find({ user: user }).sort('date').exec(function(err, trainingDays) {
//     console.log('fixing dates for user: ', user.username);
//     if (err) {
//       callback(err);
//     }

//     if (trainingDays.length > 0) {
//       console.log(`${user.username} has ${trainingDays.length} trainingDays.`);
//       console.log('start date: ', trainingDays[0].date);

//       _.forEach(trainingDays, function(td, index) {
//         if (index >= trainingDays.length - 1) {
//           //last td - all done.
//           return callback();
//         }

//         console.log('before date: ', trainingDays[index + 1].date);
//         dayDiff = moment(trainingDays[index + 1].date).diff(td.date, 'days');
//         console.log('dayDiff: ', dayDiff);
//         trainingDays[index + 1].date = moment.tz(td.date, timezone).add(dayDiff, 'days');
//         console.log('after date: ', trainingDays[index + 1].date);
//       });

//     } else {
//       console.log('No trainingDays found for user: ', user.username);
//       return callback();
//     }
//   });
// }
