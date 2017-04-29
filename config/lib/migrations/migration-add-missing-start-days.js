'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  tdLib = require(path.resolve('./modules/trainingdays/server/lib/trainingdays')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics'));

mongoose.Promise = global.Promise;

var createdCount = 0;

module.exports = {
  id: 'migration-add-missing-start-days',

  up: function(db, callback) {
    console.log('Starting migration-add-missing-start-days migration: ', new Date().toString());
    var getUsers = User.find({}).sort('-created').exec();

    getUsers
      .then(function(users) {

        // We are using reduce function here to process each user sequentially.
        // Using Promise.all we were running out of memory and/or timing out
        // when running against production DB.
        users.reduce(function(promise, user) {
          return promise.then(function(results) {
            return addStart(user)
              .then(function (result) {
                results.push(result);
                return results;
              });
          });
        }, Promise.resolve([]))
        .then(function(results) {
          console.log(`${results.length} users processed.`);
          // console.log(results);
          console.log(`${createdCount} start days created.`);
          console.log('migration-add-missing-start-days migration complete: ', new Date().toString());
          return callback(null);
        })
        .catch(function(err) {
          return callback(err);
        });
      })
      .catch(function(err) {
        return callback(err);
      });
  },

  down: function(db, callback) {
    console.log('Rollback not possible.');
    callback();
  }
};

function addStart(user) {
  return new Promise(function(resolve, reject) {
    dbUtil.getStartDay(user, coreUtil.toNumericDate(moment()), function(err, startDay) {
      let result = { userID: user.id, error: err };
      if (err) {
        console.log('Migration error - getStartDay failed for user: ', user.username);
        result.hasStart = null;
        return resolve(result);
      }

      if (startDay) {
        result.hasStart = true;
        return resolve(result);
      }

      // Create start day for user.
      result.hasStart = false;
      createdCount++;

      let req = { user: user, body: {} };
      req.body.startingPoint = true;
      req.body.dateNumeric = coreUtil.toNumericDate(moment().subtract(30, 'days'));
      req.body.name = '';
      req.body.actualFitness = 30;
      req.body.actualFatigue = 30;
      req.body.notes = '';

      tdLib.createTrainingDay(req, function(err, trainingDay) {
        if (err) {
          console.log('Migration error - create start day failed for user: ', user.username);
          console.log('Migration error - createTrainingDay err: ', err);
          result.error = err;
        } else {
          console.log('Migration - created start day for user: ', user.username);
        }

        return resolve(result);
      });
    });
  });
}
