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
  return new Promise((resolve, reject) => {
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
      intensityRating: plannedActivity.intensity || 0,
      terrainRating: plannedActivity.terrain || 0,
      format: 'unstructured'
    };

    Workout.find(query).exec()
      .then(workouts => {
        if (workouts.length > 0) {
          plannedActivity.advice += workouts[0].instruction;
          plannedActivity.rationale += `${workouts[0].name}.`;
          // plannedActivity.finalized = true;
        }

        // Could use $sample (aggregation) to get random workout from matching workouts.
        // https://docs.mongodb.com/master/reference/operator/aggregation/sample/

        return resolve(trainingDay);
      })
      .catch(err => {
        return reject(err);
      });
  });
};
