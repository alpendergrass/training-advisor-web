'use strict';

var rules = [
  {
    'name': 'testingDueAndFormIsRecoveredRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        (this.testingIsDue) &&
        (this.metrics.form > this.adviceConstants.testingEligibleFormThreshold)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'test';
      this.trainingDay.plannedActivities[0].rationale += ' Testing is due and form is sufficiently recovered for testing.';
      this.trainingDay.plannedActivities[0].advice += ` Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
 Be sure to update your Tacit Training profile with your new threshold and the date you did the test.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.testRules = rules;
