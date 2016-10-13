'use strict';

var _ = require('lodash');

var rules = [
  {
    'name': 'hardInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race'));
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'hard';
      this.trainingDay.plannedActivities[0].rationale += ` Is ${this.trainingDay.period} period, recommending hard ride but load will be smaller than typical hard ride.`;
      this.trainingDay.plannedActivities[0].advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
      R.stop();
    }
  },
  // TODO: I suppose choice rule should be in a separate file.
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
  },
  {
    'name': 'hardIsDefaultRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.plannedActivities[0].activityType === '');
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'hard';
      this.trainingDay.plannedActivities[0].rationale += ' No other recommendation, so hard.';
      this.trainingDay.plannedActivities[0].advice += ` If you feel up to it you should go hard today. You appear to be sufficiently rested.
 Intensity should be high but will vary based on ride duration.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.hardRules = rules;
