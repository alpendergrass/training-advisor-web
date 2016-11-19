'use strict';
var _ = require('lodash');


var rules = [
  {
    'name': 'preferredRestDayRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.scheduledEventRanking === 0 &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.todayDayOfWeek) > -1)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' This is a preferred rest day.';
      this.plannedActivity.advice += ' Today is one of your planned rest days, so rest.';
      R.stop();
    }
  },
  {
    'name': 'sufficientlyFatiguedToNeedRestRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.metrics.form <= this.adviceConstants.restNeededThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Sufficiently fatigued to recommend rest.';
      this.plannedActivity.advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.';
      R.stop();
    }
  },
  {
    'name': 'easyAfterHardWithRestNotScheduledForTomorrowRule',
    'priority': -7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        !this.testingIsDue && //this.wentHardYesterday &&
        (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race') &&
        (this.metrics.form <= this.adviceConstants.easyDaytNeededThreshold) &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.tomorrowDayOfWeek)) < 0 &&
        (!this.subsequentTrainingDay || this.subsequentTrainingDay.scheduledEventRanking !== 9) // tomorrow is not a scheduled off day.
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Yesterday was hard, form is below easyDaytNeededThreshold, tomorrow is not a preferred rest day or off day, so recommending easy.';
      this.plannedActivity.advice += ` Yesterday was a hard day and form is somewhat low so go easy today. You should do a short endurance ride today.
 Endurance means you should target power zone 2 but if you feel tired, make this a zone 1 recovery ride.`;
      R.stop();
    }
  },
  {
    'name': 'hardIsDefaultRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType);
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

module.exports.defaultRules = rules;
