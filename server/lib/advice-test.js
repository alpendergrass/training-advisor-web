'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 'testingDueAndFormIsRecoveredRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue &&
        !_.includes(['t0', 't6', 'race'], this.plannedActivity.period) &&
        // (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 't0') &&
        this.metrics.form > this.adviceConstants.testingEligibleFormThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'test';
      this.plannedActivity.rationale += ' Testing is due and form is sufficiently recovered for testing.';
      this.plannedActivity.advice += ` Testing is due and form is sufficiently recovered for testing. Do a functional threshold power (FTP) test.
 Be sure to update your Tacit Training profile with your new threshold and the date you did the test.`;
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForTestingRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue &&
        !_.includes(['t0', 't6', 'race'], this.plannedActivity.period) &&
        this.metrics.form <= this.adviceConstants.testingEligibleFormThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Testing is due. Recommending easy in preparation for testing.';
      this.plannedActivity.advice += ` An easy day or rest is needed in preparation for testing. Your form is not sufficiently recovered for testing.
 Easy means a zone 1 - 2 ride.`;
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForTestingRule',
    // Depending on values of various thresholds, we may never get here.
    // E.g., if restNeededForPeakingThreshold is greater than restNeededForTestingThreshold.
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.testingIsDue &&
        !_.includes(['t0', 't6', 'race'], this.plannedActivity.period) &&
        this.metrics.form <= this.adviceConstants.restNeededForTestingThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Testing is due. Rest recommended in preparation for testing.';
      this.plannedActivity.advice += ' Testing is due but form is not sufficiently recovered for testing. Rest is needed in preparation for testing, so rest today.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.testRules = rules;
