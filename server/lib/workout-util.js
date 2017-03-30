'use strict';

var path = require('path'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  Workout = mongoose.model('Workout'),
  User = mongoose.model('User'),
  tdUtil = require(path.resolve('./modules/trainingdays/server/lib/util')),
  err;

mongoose.Promise = global.Promise;

var selectWorkout = function(workouts, trainingDay) {
  return new Promise((resolve, reject) => {
    // Look for workouts in workouts that are not in user.workoutLog.
    // If we find some, add the first to the end of the log and return this workout
    // Otherwise, find the first match in the log, remove it from the log, add it to the end of the log and return this workout
    // And save user before we exit.

    // When running planGen, when we come back here after genning plan (due to a call to refreshAdvice),
    // User.findOne below returns a user with a workoutLog containing all the workouts we used while
    // creating the plan even though we explicitly saved and restored the list before/after genning.
    // Somehow we are getting an out of date user below. Don't know how...

    let selectedWorkout = null;

    let extractName = function(workout) {
      return workout.name;
    };

    User.findOne({ _id: trainingDay.user }).exec()
      .then(user => {
        let workoutLog = user.workoutLog;
        let workoutList = _.flatMap(workouts, extractName);

        let eligibleWorkouts = _.difference(workoutList, workoutLog);
        // Creates an array of first array values not included in the second array.
        // The order of result values is determined by the first array.

        if (eligibleWorkouts.length > 0) {
          selectedWorkout = _.find(workouts, ['name', eligibleWorkouts[0]]);
        } else {
          // We need to find the oldest matching workout and select it.
          // workoutLog is a LILO list so workout closest to the top is oldest.

          let perviouslyOfferredWorkouts = _.intersection(workoutLog, workoutList);
          // The order and references of result values are determined by the first array.
          // So we will use the first in the returned array.

          if (perviouslyOfferredWorkouts.length > 0) {
            selectedWorkout = _.find(workouts, ['name', perviouslyOfferredWorkouts[0]]);
            _.pull(workoutLog, perviouslyOfferredWorkouts[0]);
          }
        }

        if (selectedWorkout) {
          // Add selected workout to the end of the log.
          workoutLog.push(selectedWorkout.name);
          // user.workoutLog = workoutLog;
          // return user.save(); // 'VersionError'
          return User.update({ _id: user.id }, { $set: { workoutLog: workoutLog } }).exec();
        } else {
          return Promise.resolve();
        }
      })
      .then(() => {
        return resolve(selectedWorkout);
      })
      .catch(err => {
        console.log('selectWorkout User.findOne err: ', err);
        return reject(err);
      });
  });
};

module.exports = {};

module.exports.getWorkout = function(trainingDay, source) {
  return new Promise((resolve, reject) => {
    let plannedActivity = tdUtil.getPlannedActivity(trainingDay, source);

    // For testing purposes uncomment the levelOfDetail clause below but know that
    // the user.workoutLog will be corrupted as a result.
    if (source === 'plangeneration') { //&& trainingDay.user.levelOfDetail < 3) {
      return resolve(trainingDay);
    }

    if (plannedActivity.advice !== '') {
      return resolve(trainingDay);
    }

    var query = {
      period: trainingDay.period,
      loadRating: plannedActivity.activityType,
      intensityRating: plannedActivity.intensity || 0,
      terrainRating: plannedActivity.terrain || 0
    };

    Workout.find(query).sort({ name: 1 }).exec()
      .then(workouts => {
        if (workouts.length > 0) {
          return selectWorkout(workouts, trainingDay);
        } else {
          Promise.resolve(null);
        }
      })
      .then(selectedWorkout => {
        if (selectedWorkout) {
          plannedActivity.advice += selectedWorkout.instruction;
          plannedActivity.rationale += `${selectedWorkout.name}.`;
          // plannedActivity.finalized = true;
        }

        return resolve(trainingDay);
      })
      .catch(err => {
        console.log('getWorkout Workout.findOne err: ', err);
        return reject(err);
      });
  });
};
