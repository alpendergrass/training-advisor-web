'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't0ChoiceRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'choice';
      this.plannedActivity.rationale += ' t0ChoiceRule.';
      this.plannedActivity.advice += ' You should take a break from training. Now is a good time for cross-training. If you ride, keep it mellow and fun.';
      R.stop();
    }
  },
  {
    'name': 't0EasyRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' t0EasyRule.';
      this.plannedActivity.advice += ' You expended some energy yesterday. You should do an easy workout today. You may want to consider cross-training. If you ride, keep it mellow and fun.';
      R.stop();
    }
  },
  {
    'name': 't0ModerateRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t0ModerateRule.';
      this.plannedActivity.advice += ' You should do a moderate workout today. Consider cross-training options. If you ride, keep it in zone 2.';
      R.stop();
    }
  },
  {
    'name': 't0HardRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating !== 'hard' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating !== 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t0HardRule.';
      this.plannedActivity.advice += ' Feel free to do a hard workout today and remember cross-training is an option.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t0Rules = rules;
