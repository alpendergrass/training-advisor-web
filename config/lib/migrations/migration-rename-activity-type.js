'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay');

mongoose.Promise = global.Promise;

module.exports = {
  id: 'migration-rename-activity-type',

  up: function(db, callback) {
    console.log('Starting migration-rename-activity-type: ', new Date().toString());

    TrainingDay.update({
      plannedActivities: { $elemMatch: { source: 'advised', activityType: 'simulation' } }
    }, {
      $set: {
        'plannedActivities.$.activityType': 'hard'
      }
    }, {
      multi: true
    }, function(err, rawResponse) {
      if (err) {
        return callback(err);
      }

      console.log('advised rawResponse.n: ', rawResponse.n);
      console.log('advised rawResponse.nModified: ', rawResponse.nModified);

      TrainingDay.update({
        plannedActivities: { $elemMatch: { source: 'requested', activityType: 'simulation' } }
      }, {
        $set: {
          'plannedActivities.$.activityType': 'hard'
        }
      }, {
        multi: true
      }, function(err, rawResponse) {
        if (err) {
          return callback(err);
        }

        console.log('requested rawResponse.n: ', rawResponse.n);
        console.log('requested rawResponse.nModified: ', rawResponse.nModified);

        TrainingDay.update({
          plannedActivities: { $elemMatch: { source: 'plangeneration', activityType: 'simulation' } }
        }, {
          $set: {
            'plannedActivities.$.activityType': 'hard'
          }
        }, {
          multi: true
        }, function(err, rawResponse) {
          if (err) {
            return callback(err);
          }

          console.log('plangeneration rawResponse.n: ', rawResponse.n);
          console.log('plangeneration rawResponse.nModified: ', rawResponse.nModified);

          console.log('migration-rename-activity-type complete: ', new Date().toString());
          return callback(null);
        });
      });
    });
  },

  down: function(db, callback) {
    console.log('Rollback not possible.');
    callback();

  }
};

