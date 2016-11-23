'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't5HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t5HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't5ModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t5ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t5ModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5EnduranceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't5' &&
        _.includes(['hard', 'moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You should do a long endurance ride today as you appear to be sufficiently rested.
 Most of your time should be spent in power zone 2. Intensity will be low but if you hit your target load you will be fatigued after this ride.
 During your ride you should periodically increase your cadence beyond your normal confort range. Learing to spin a higher cadence will make
 you a more efficient cyclist.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t5Rules = rules;
