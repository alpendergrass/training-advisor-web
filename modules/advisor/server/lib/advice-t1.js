'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't1HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't1' &&
        this.metrics.form > this.adviceConstants.t1HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't1HardRule.';
      R.next();
    }
  },
  {
    'name': 't1HardAfterTwoModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't1' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't1HardAfterTwoModerateRule.';
      R.next();
    }
  },
  {
    'name': 't1HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't1' &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't1HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't1ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't1'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't1ModerateDefaultRule.';
      R.next();
    }
  },
  {
    'name': 't1StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't1'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't1StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t1Rules = rules;
