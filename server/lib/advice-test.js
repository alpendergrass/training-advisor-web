'use strict';

var moment = require('moment'),
  mongoose = require('mongoose'),
  async = require('async'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceUtil = require('./advice-util'),
  adviceConstants = require('./advice-constants'),
  err;

var rules = [
  {
    'name': 'testingDueAndFormIsRecoveredRule',
    'condition': function(R) {
      R.when(this && !this.nextCheck && //have to include test on nextCheck to keep this rule from triggering itself.
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (this.isTestingDue) &&
        (this.trainingDay.form > this.adviceConstants.testingEligibleFormThreshold)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].activityType = 'test';
      this.trainingDay.plannedActivities[0].rationale += `  Form is sufficiently recovered for testing.`;
      this.trainingDay.plannedActivities[0].advice += `  Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
  Be sure to update your Tacit Training profile with your new threshold and the date you did the test.`;
      R.stop();
    }
  } //,
  // {
  //   'name': 'testingDueButFormIsNotRecoveredRule',
  //   'condition': function(R) {
  //     R.when(this && !this.nextCheck && //have to include test on nextCheck to keep this rule from triggering itself.
  //       (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
  //       (this.isTestingDue) &&
  //       (this.trainingDay.form <= this.adviceConstants.testingEligibleFormThreshold)
  //     );
  //   },
  //   'consequence': function(R) {
  //     this.result = true;
  //     this.trainingDay.plannedActivities[0].rationale += `  Form is sufficiently recovered for testing.`;
  //     this.trainingDay.plannedActivities[0].advice += `  Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
  // Be sure to update your Tacit Training profile with your new threshold and the date you did the test.`;
  //     R.next();
  //   }
  // },
];

module.exports = {};

module.exports.testRules = rules;

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

  if (trainingDay.period === 'peak' || trainingDay.period === 'race' || trainingDay.period === 'transition') {
    //No testing when peaking, race or in transition.
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
  if (adviceUtil.isTestingDue(user, trainingDay)) {
    trainingDay.plannedActivities[0].rationale += ' Testing is due.';
    trainingDay.plannedActivities[0].activityType = 'test';
  }

  return callback(null, user, trainingDay);
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
