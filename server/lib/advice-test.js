'use strict';

var moment = require('moment'),
  mongoose = require('mongoose'),
  async = require('async'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceUtil = require('./advice-util'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.checkTest = function(user, trainingDay, callback) {

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

  if (trainingDay.period === 'peak' || trainingDay.period === 'transition') {
    //No testing when peaking or in transition.
    return callback(null, user, trainingDay);          
  }

  async.waterfall([
    async.apply(checkIsTestingDue, user, trainingDay),
    isFormRecovered
  ],
    function(err, user, trainingDay) {
      if (err) {
        return callback(err, null, null);
      }

      return callback(null, user, trainingDay);
    }
  );
};

function checkIsTestingDue (user, trainingDay, callback) {
  adviceUtil.isTestingDue(user, trainingDay, function (err, testingDue) {
    if (err) {
      return callback(err, null, null);
    } 

    if (testingDue) {
      trainingDay.plannedActivities[0].rationale += ' Testing is due.';
      trainingDay.plannedActivities[0].activityType = 'test';
    } 

    return callback(null, user, trainingDay);
  });
}

function isFormRecovered (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== 'test') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  //TSB is recovered if greater than threshold.
  if (trainingDay.form > adviceConstants.testingEligibleFormThreshold) {
    trainingDay.plannedActivities[0].rationale += ' Form is sufficiently recovered for testing.';   
    trainingDay.plannedActivities[0].advice += ' Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.';
    trainingDay.plannedActivities[0].advice += ' Be sure to update your Tacit Training profile with your new threshold and the date you did the test.';
  } else {
    trainingDay.plannedActivities[0].rationale += ' However, form is not sufficiently recovered for testing.';
    trainingDay.plannedActivities[0].advice += ' Testing is due but form is not sufficiently recovered for testing.';
    trainingDay.plannedActivities[0].activityType = '';
  }

  return callback(null, user, trainingDay);
}
