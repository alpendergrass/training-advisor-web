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
      this.plannedActivity.rationale += 't0EasyRule.';
      this.plannedActivity.advice += ' ';
      R.next();
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
      this.plannedActivity.rationale += 't0ModerateRule.';
      R.next();
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
      this.plannedActivity.rationale += 't0ChoiceRule.';
      R.next();
    }
  },
  {
    'name': 't0StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't0'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't0StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t0Rules = rules;
