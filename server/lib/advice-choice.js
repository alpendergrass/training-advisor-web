'use strict';

var rules = [
  {
    'name': 'choiceInTransitionRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.period === 'transition'));
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'choice';
      this.plannedActivity.rationale += ' Is transition period, user can slack off if he/she desires.';
      this.plannedActivity.advice += '  You are in transition. You should take a break from training. Now is a good time for cross-training. If you ride, keep it mellow and fun.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.choiceRules = rules;
