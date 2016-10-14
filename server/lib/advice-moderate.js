'use strict';

var _ = require('lodash');

var rules = [
  {
    'name': 'moderateAfterHardIfRestTomorrowRule',
    'condition': function(R) {
      R.when(this && this.wentHardYesterday &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.tomorrowDayOfWeek) > -1)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'moderate';
      this.trainingDay.plannedActivities[0].rationale += ' Yesterday was a hard day, tomorrow is a preferred rest day so recommending moderate.';
      this.trainingDay.plannedActivities[0].advice += ' Yesterday was a hard day and tomorrow is a planned rest day, so';
      if (this.trainingDay.period === 'base' || this.trainingDay.period === 'transition') {
        this.trainingDay.plannedActivities[0].rationale += ` We are in ${this.trainingDay.period} so recommending endurance ride.`;
        this.trainingDay.plannedActivities[0].advice += ' do an endurance ride today. Intensity should be around 0.80.';
      } else {
        this.trainingDay.plannedActivities[0].rationale += ` We are in ${this.trainingDay.period} so recommending tempo ride.`;
        this.trainingDay.plannedActivities[0].advice += ' ride tempo today. Intensity should be around 0.85.';
      }
      R.stop();
    }
  }
];

module.exports = {};

module.exports.moderateRules = rules;
