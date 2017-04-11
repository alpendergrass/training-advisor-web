'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 'testingDueAndFormIsRecoveredRule',
    'priority': 89,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue &&
        this.metrics.form > this.adviceConstants.testingEligibleFormThreshold
      );
    },
    'consequence': function(R) {
      let recordFTPPhrase = this.trainingDay.user.autoUpdateFtpFromStrava ? 'enter your FTP in Strava under Settings | My Performance' : 'update your Tacit Training profile with your new threshold and the date you did the test';
      this.plannedActivity.activityType = 'test';
      this.plannedActivity.rationale += 'testingDueAndFormIsRecoveredRule.';
      this.plannedActivity.advice += ` Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
 A complete warm-up is important before testing. Then do a few short, hard efforts to prepare your legs for the challenge to come.
 After a few minutes recovery start your test. This is going to hurt but give it your all!
 See our FAQ for additional guidance on testing protocols.
 Afterwards, ${recordFTPPhrase}.`;
      R.stop();
    }
  },
  {
    'name': 'testingDueEasyDayRule',
    'priority': 87,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue &&
        this.metrics.form > this.adviceConstants.testingEasyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += 'testingDueEasyDayRule.';
      this.plannedActivity.advice += ` An easy day or rest is needed in preparation for testing. Your form is not sufficiently recovered for testing.
 Easy means a zone 1 - 2 ride. You need to be fully recovered to ensure valid test results.`;
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForTestingRule',
    'priority': 80,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue);
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' restNeededInPrepForTestingRule.';
      this.plannedActivity.advice += ` Testing is due but form is not sufficiently recovered for testing. Rest is needed in preparation for testing, so rest today.
 Full recovery is needed to ensure valid test results.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.testRules = rules;
