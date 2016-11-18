'use strict';

var rules = [
  {
    'name': 'testingDueAndFormIsRecoveredRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 't0') &&
        (this.testingIsDue) &&
        (this.metrics.form > this.adviceConstants.testingEligibleFormThreshold)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'test';
      this.plannedActivity.rationale += ' Testing is due and form is sufficiently recovered for testing.';
      this.plannedActivity.advice += ` Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
 Be sure to update your Tacit Training profile with your new threshold and the date you did the test.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.testRules = rules;
