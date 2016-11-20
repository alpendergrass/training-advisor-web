'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't1HardRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't1' &&
        !this.wentHardYesterday &&
        this.metrics.form > this.adviceConstants.t1HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Recommend hard based on t1 threshold.';
      R.next();
    }
  },
  {
    'name': 't1ModerateRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't1' &&
        this.metrics.form > this.adviceConstants.t1ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' Recommend moderate based on t1 threshold.';
      R.next();
    }
  },
  {
    'name': 't1EasyRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't1' &&
        this.metrics.form > this.adviceConstants.t1EasyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Recommend easy based on t1 threshold.';
      this.plannedActivity.advice += ' Easy dude.';
      // R.next();
      R.stop();
    }
  },
  {
    'name': 't1EnduranceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't1' &&
        _.includes(['hard', 'moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You should do a long endurance ride today as you appear to be sufficiently rested.
 Most of your time should be spent in power zone 2. Intensity will be low but if you hit your target load you will be fatigued after this ride.
 During your ride you should periodically increase your cadence beyond your normal confort range. Learing to spin a higher cadence will make
 you a more efficient cyclist.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t1Rules = rules;
