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

var errCount = 0;

module.exports = {
  id: 'migration-add-dailyload-to-metrics',

  up: function(db, callback) {
    console.log('Starting migration-add-dailyload-to-metrics migration: ', new Date().toString());
    var getUsers = User.find({}).sort('-created').exec();

    getUsers
      .then(function(users) {

        // We are using reduce function here to process each user sequentially.
        // Using Promise.all we were running out of memory and/or timing out
        // when running against production DB.
        users.reduce(function(promise, user) {
          return promise.then(function(results) {
            return addDailyLoad(user)
              .then(function (result) {
                results.push(result);
                return results;
              });
          });
        }, Promise.resolve([]))

        // return Promise.all(users.map(function(user) {
        //   return addDailyLoad(user);
        // }));
        .then(function(results) {
          console.log(`${results.length} users processed.`);
          console.log('migration-add-dailyload-to-metrics migration complete: ', new Date().toString());
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

function addDailyLoad(user) {
  return new Promise(function(resolve, reject) {
    var getTDs = TrainingDay.find({ user: user }).exec();

    getTDs.then(function(trainingDays) {
    //   return Promise.all(trainingDays.map(function(td) {
    //     if (td.planLoad) {
    //       let plannedMetrics = util.getMetrics(td, 'planned');
    //       plannedMetrics.totalLoad = td.planLoad;
    //     }

    //     if (td.completedActivities && td.completedActivities.length > 0) {
    //       let actualMetrics = util.getMetrics(td, 'actual');
    //       if (actualMetrics) {
    //         actualMetrics.totalLoad = _.sumBy(td.completedActivities, 'load');
    //       }
    //     }

    //     return td.save();
    //   }));
    // })
      trainingDays.reduce(function(promise, trainingDay) {
        return promise.then(function(results) {
          return computeDailyLoad(trainingDay)
            .then(function (result) {
              results.push(result);
              return results;
            });
        });
      }, Promise.resolve([]))
      .then(function(results) {
        console.log(`${results.length} trainingDays processed for user ${user.username}.`);
        return resolve(true);
      })
      .catch(function(err) {
        console.log('migration-add-dailyload-to-metrics failed for user: ', user.username);
        console.log('err: ', err);
        errCount++;
        console.log('errCount: ', errCount);

        if (errCount > 10) {
          return reject(err);
        } else {
          return resolve();
        }
      });
    })
    .catch(function(err) {
      return reject(err);
    });
  });
}

function computeDailyLoad(td) {
  let tdDirty = false;

  return new Promise(function(resolve, reject) {
    if (td.planLoad) {
      tdDirty = true;
      let plannedMetrics = util.getMetrics(td, 'planned');
      plannedMetrics.totalLoad = td.planLoad;
    }

    if (td.completedActivities && td.completedActivities.length > 0) {
      tdDirty = true;
      let actualMetrics = util.getMetrics(td, 'actual');
      if (actualMetrics) {
        actualMetrics.totalLoad = _.sumBy(td.completedActivities, 'load');
      }
    }

    if (!tdDirty) {
      return resolve(td);
    }

    td.save()
      .then(function(tdSaved) {
        return resolve(true);
      })
      .catch(function (err) {
        return reject(err);
      });
  });
}
