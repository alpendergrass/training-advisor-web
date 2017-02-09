'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't1HardRule',
    'priority': 9,
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
    'name': 't1HardAfterTwoModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t1HardAfterTwoModerateRule.';
      R.next();
    }
  },
  {
    'name': 't1HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1'], this.trainingDay.period) &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t1HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't1ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1'], this.trainingDay.period)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t1ModerateDefaultRule.';
      R.next();
    }
  },
  {
    'name': 't1HardAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't1' &&
        _.includes(['hard'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t1HardAdviceRule.';
      this.plannedActivity.advice += ` If you have time, you should do a long endurance workout today.
 Endurance means most of your time should be spent in power zone 2.
 If limited time, ride easy tempo - low zone 3.
 This is the time of the season to build your endurance engine.
 Cross-training is still an option at this point in the season but keep the focus on endurance.
 If power data is not available for your selected activity you will need to estimate your training load.`;
      R.stop();
    }
  },
  {
    'name': 't1ModerateAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't1' &&
        _.includes(['moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t1ModerateAdviceRule.';
      this.plannedActivity.advice += ` You should do a moderate endurance (power zone 2) workout today.
 If time is limited, ride easy tempo - low zone 3.
 Cross-training is still on the table. Just remember to estimate your training load for the day if power data is not available.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t1Rules = rules;
