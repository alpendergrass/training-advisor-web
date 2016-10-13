'use strict';

var rules = [
  {
    'name': 'choiceInTransitionRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.period === 'transition'));
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'choice';
      this.trainingDay.plannedActivities[0].rationale += ' Is transition period, user can slack off if he/she desires.';
      this.trainingDay.plannedActivities[0].advice += '  You are in transition. You should take a break from training. Now is a good time for cross-training. If you ride, keep it mellow and fun.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.choiceRules = rules;
