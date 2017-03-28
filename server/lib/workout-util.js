'use strict';

var path = require('path'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  Workout = mongoose.model('Workout'),
  tdUtil = require(path.resolve('./modules/trainingdays/server/lib/util')),
  err;

mongoose.Promise = global.Promise;

module.exports = {};

module.exports.getWorkout = function(trainingDay, source) {
  // params = {
  //   period: 't0',
  //   loadRating: 'hard',
  //   terrain: 0, //default
  //   format: 'unstructured' //default
  // }

  // Could use $sample (aggregation) to get random workout from matching workouts.
  // https://docs.mongodb.com/master/reference/operator/aggregation/sample/

  return new Promise(function(resolve, reject) {
    let plannedActivity = tdUtil.getPlannedActivity(trainingDay, source);

    if (source === 'plangeneration' & trainingDay.user.levelOfDetail < 3) {
      return resolve(trainingDay);
    }

    if (plannedActivity.advice !== '') {
      return resolve(trainingDay);
    }

    var query = {
      period: trainingDay.period,
      loadRating: plannedActivity.activityType,
      terrain: plannedActivity.terrain || 0,
      format: 'unstructured'
    };

    Workout.find(query).exec()
      .then(function(workouts) {
        if (workouts.length > 0) {
          plannedActivity.advice = workouts[0].instruction;
          plannedActivity.rationale += `${workouts[0].name}.`;
          plannedActivity.finalized = true;
        }

        return resolve(trainingDay);
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};
