'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util'));

mongoose.Promise = global.Promise;

module.exports = {
  id: 'planning-metrics.js',

  up: function(db, callback) {
    var getUsers = User.find({}).sort('-created').exec();

    getUsers.then(function(users) {
      return Promise.all(users.map(function(user) {
        return migrateMetrics(user);
      }));
    })
    .then(function(results) {
      console.log(`${results.length} users processed.`);
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

function migrateMetrics(user) {
  return new Promise(function(resolve, reject) {
    dbUtil.revertSimulation(user, function(err) {
      if (err) {
        return reject(err);
      }

      dbUtil.removePlanningActivities(user)
        .then(function() {
          return removeMetrics(user);
        })
        .then(function() {
          return resolve(createNewMetrics(user));
        })
        .catch(function(err) {
          return reject(err);
        });
    });
  });
}

function removeMetrics(user) {
  //Remove all except for start days and true-ups.
  return new Promise(function(resolve, reject) {
    TrainingDay.update({
      user: user,
      fitnessAndFatigueTrueUp: false,
      startingPoint: false,
    }, {
      $set: {
        fitness: 0,
        fatigue: 0,
        form: 0,
        sevenDayRampRate: 0,
        sevenDayTargetRampRate: 0,
        dailyTargetRampRate: 0,
        rampRateAdjustmentFactor: 1,
        targetAvgDailyLoad: 0,
        loadRating: '',
        plannedActivities: []
      }
    }, {
      multi: true
    }, function(err, rawResponse) {
      if (err) {
        return reject(err);
      }

      return resolve();
    });
  });
}

function createNewMetrics(user) {
  return new Promise(function(resolve, reject) {
    var getTDs = TrainingDay.find({ user: user }).exec();

    getTDs.then(function(trainingDays) {
      return Promise.all(trainingDays.map(function(td) {
        let plannedMetrics = {
          metricsType: 'planned',
          fitness: td.startingPoint ? td.fitness : 0,
          fatigue: td.startingPoint ? td.fatigue : 0,
          form: td.startingPoint ? td.form : 0
        };

        let actualMetrics = {
          metricsType: 'actual',
          fitness: td.fitness,
          fatigue: td.fatigue,
          form: td.form
        };

        // Remove metrics if existing. Should only happen if we have to rerun migration I think.
        td.metrics = [];
        td.metrics.push(plannedMetrics);
        td.metrics.push(actualMetrics);
        return td.save();
      }));
    })
    .then(function(results) {
      console.log(`${results.length} trainingDays processed for user ${user.username}.`);
      return resolve(true);
    })
    .catch(function(err) {
      return reject(err);
    });
  });
}
