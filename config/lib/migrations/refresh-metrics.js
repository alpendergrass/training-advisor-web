'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util'));

mongoose.Promise = global.Promise;

module.exports = {
  id: 'refresh-metrics',

  up: function(db, callback) {
    console.log('Starting refresh-metrics migration: ', new Date().toString());
    var getUsers = User.find({}).sort('-created').exec();

    getUsers
      .then(function(users) {
        return Promise.all(users.map(function(user) {
          return refreshMetrics(user);
        }));
      })
      .then(function(results) {
        console.log(`${results.length} users processed.`);
        console.log('refresh-metrics migration complete: ', new Date().toString());
        return callback(null);
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

function refreshMetrics(user) {
  var getPlanStartDay = function(user, numericSearchDate, callback) {
    var query = {
      user: user,
      $or: [{ startingPoint: true }, { fitnessAndFatigueTrueUp: true }],
      dateNumeric: { $lte: numericSearchDate },
      cloneOfId: null
    };

    TrainingDay.find(query).sort({ dateNumeric: -1 }).limit(1)
      .exec(function(err, trainingDays) {
        if (err) {
          return callback(err, null);
        }

        if (trainingDays.length === 0) {
          return callback(null, null);
        }

        return callback(null, trainingDays[0]);
      });
  };

  return new Promise(function(resolve, reject) {
    let timezone = user.timezone || 'America/New_York';
    let today = util.getTodayInTimezone(timezone);

    console.log(`user.username: ${user.username} timezone: ${timezone} today: ${today} started: ${new Date().toString()}`);

    let todayNumeric = util.toNumericDate(today);

    let metricsParams = {
      user: user,
      numericDate: todayNumeric,
      metricsType: 'actual'
    };

    adviceMetrics.updateMetrics(metricsParams, function(err) {
      if (err) {
        console.log(`updateMetrics error for user ${user.username}. Skipping generatePlan. ${err}`);
        return resolve();
      }

      getPlanStartDay(user, todayNumeric, function(err, startDay) {
        if (err) {
          // We should never get here.
          console.log(`getStartDay error for user ${user.username}. Skipping generatePlan. ${err}`);
          return resolve();
        }

        if (startDay) {
          let params = {};
          params.user = user;
          params.numericDate = startDay.dateNumeric;

          adviceEngine.generatePlan(params, function(err, statusMessage) {
            if (err) {
              console.log(`generatePlan error for user ${user.username}. Skipping advise. ${err}`);
              return resolve();
            }

            //getAdvice for today.
            params = {};
            params.user = user;
            params.numericDate = todayNumeric;
            params.alternateActivity = null;
            params.source = 'advised';

            adviceEngine.advise(params, function(err, trainingDay) {
              if (err) {
                console.log(`advise error for user ${user.username}. ${err}`);
                return resolve();
              }
            });

            console.log(`migration succeeded for user ${user.username} ${new Date().toString()}`);
            return resolve();
          });
        } else {
          // We should never get here either.
          console.log(`getStartDay not found for user ${user.username}. Skipping generatePlan. ${err}`);
          return resolve();
        }
      });
    });
  });
}

