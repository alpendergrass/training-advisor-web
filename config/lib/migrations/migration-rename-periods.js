'use strict';
var path = require('path'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay');

mongoose.Promise = global.Promise;

module.exports = {
  id: 'migration-rename-periods',

  up: function(db, callback) {
    console.log('Starting migration-rename-periods: ', new Date().toString());

    TrainingDay.update({
      period: 'base'
    }, {
      $set: {
        period: 't1'
      }
    }, {
      multi: true
    }, function(err, rawResponse) {
      if (err) {
        return callback(err);
      }

      TrainingDay.update({
        period: 'build'
      }, {
        $set: {
          period: 't4'
        }
      }, {
        multi: true
      }, function(err, rawResponse) {
        if (err) {
          return callback(err);
        }

        TrainingDay.update({
          period: 'transition'
        }, {
          $set: {
            period: 't0'
          }
        }, {
          multi: true
        }, function(err, rawResponse) {
          if (err) {
            return callback(err);
          }

          console.log('migration-rename-periods complete: ', new Date().toString());
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

