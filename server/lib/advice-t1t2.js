'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't1HardRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t1HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t1HardRule.';
      R.next();
    }
  },
  {
    'name': 't2HardRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t2'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t2HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t2HardRule.';
      R.next();
    }
  },
  {
    'name': 't1t2HardAfterTwoModerateRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t1t2HardAfterTwoModerateRule.';
      R.next();
    }
  },
  {
    'name': 't1t2HardAfterRestRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2'], this.trainingDay.period) &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t1t2HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't1ModerateDefaultRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2'], this.trainingDay.period)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t1t2ModerateDefaultRule.';
      R.next();
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

module.exports.t1t2Rules = rules;
