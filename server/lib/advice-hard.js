'use strict';

var rules = [
  {
    'name': 'hardInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race'));
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ` Is ${this.trainingDay.period} period, recommending hard ride but load will be smaller than typical hard ride.`;
      this.plannedActivity.advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
      R.stop();
    }
  },
  {
    'name': 'hardIsDefaultRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType === '');
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' No other recommendation, so hard.';
      this.plannedActivity.advice += ` If you feel up to it you should go hard today. You appear to be sufficiently rested.
 Intensity should be high but will vary based on ride duration.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.hardRules = rules;
