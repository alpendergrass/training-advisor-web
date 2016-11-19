'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't0ChoiceRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't0');
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'choice';
      this.plannedActivity.rationale += ' Is t0 period, user choice activity.';
      this.plannedActivity.advice += '  You should take a break from training. Now is a good time for cross-training. If you ride, keep it mellow and fun.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t0Rules = rules;
