'use strict';


var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.checkModerate = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== '') {
    return callback(null, user, trainingDay);
  }

  if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
    //Never do a moderate ride when peaking.
    return callback(null, user, trainingDay);
  }

  shouldWeGoModerate(user, trainingDay, function(err, shouldGoModerate) {
    if (err) {
      return callback(err, null, null);
    }

    if (shouldGoModerate) {
      trainingDay.plannedActivities[0].activityType = 'moderate';
    }

    return callback(null, user, trainingDay);
  });
};

function shouldWeGoModerate(user, trainingDay, callback) {
  dbUtil.didWeGoHardTheDayBefore(user, trainingDay.date, function(err, wentHard) {
    if (err) {
      return callback(err, null);
    }

    if (wentHard) {
      //Yesterday was a hard day, so if tomorrow is rest day go moderate.
      //We have to convert trainingDay.date to user local time first to get the right day of the week.
      var tomorrowDayOfWeek = moment(trainingDay.date).add(1, 'days').tz(user.timezone).day().toString();

      if (_.indexOf(user.preferredRestDays, tomorrowDayOfWeek) > -1) {
        //Tomorrow's day of week is in user's list of preferred rest days.
        trainingDay.plannedActivities[0].rationale += ' Yesterday was a hard day. Tomorrow is a preferred rest day.';
        trainingDay.plannedActivities[0].advice += ' Yesterday was a hard day and tomorrow is a planned rest day, so';
        if (trainingDay.period === 'base' || trainingDay.period === 'transition') {
          trainingDay.plannedActivities[0].rationale += ' We are in ' + trainingDay.period + ' so recommending endurance ride.';
          trainingDay.plannedActivities[0].advice += ' do an endurance ride today.';
          trainingDay.plannedActivities[0].advice += ' Intensity should be around 0.80.';
        } else {
          trainingDay.plannedActivities[0].rationale += ' We are in build so recommending tempo ride.';
          trainingDay.plannedActivities[0].advice += ' ride tempo today.';
          trainingDay.plannedActivities[0].advice += ' Intensity should be around 0.85.';
        }
        return callback(null, true);
      }

      //We will likely be recommending rest tomorrow.
      return callback(null, false);
    }

    return callback(null, false);
  });
}
