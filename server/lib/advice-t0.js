'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't0EasyRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && _.includes(['moderate', 'hard'], this.metricsOneDayPrior.loadRating)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' t0EasyRule.';
      this.plannedActivity.advice += ' You expended some energy yesterday. You should do an easy workout today to ensure good recovery. You may want to consider cross-training. If you ride, keep it in zone 1-2.';
      R.stop();
    }
  },
  {
    'name': 't0ModerateRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t0ModerateRule.';
      this.plannedActivity.advice += ' You should do a moderate workout today. Consider cross-training options. If you ride, keep it in zone 2. The focus is on endurance.';
      R.stop();
    }
  },
  {
    'name': 't0ChoiceRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0');
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'choice';
      this.plannedActivity.rationale += ' t0ChoiceRule.';
      this.plannedActivity.advice += ' Today is a good day for cross-training. Enjoy yourself. If you ride, keep it mellow and fun.';
      R.stop();
    }
  },
];

module.exports = {};

module.exports.t0Rules = rules;
