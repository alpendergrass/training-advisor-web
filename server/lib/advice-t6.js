'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't6HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
        this.metrics.form > this.adviceConstants.t6HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't6HardRule.';
      R.next();
    }
  },
  {
    'name': 't6ModerateAfterTwoHardRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'hard' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't6ModerateAfterTwoHardRule.';
      R.next();
    }
  },
  {
    'name': 't6Terrain1Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't6' &&
        _.includes(['hard'], this.plannedActivity.activityType) &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.smallClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.smallClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't6Terrain1Rule.';
      this.plannedActivity.terrain = 1;
      R.stop();
    }
  },
  {
    'name': 't6StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't6'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't6StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t6Rules = rules;
