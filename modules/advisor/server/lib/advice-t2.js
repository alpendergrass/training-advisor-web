'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't2HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't2' &&
        this.metrics.form > this.adviceConstants.t2HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't2HardRule.';
      R.next();
    }
  },
  {
    'name': 't2HardAfterTwoModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't2' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't2HardAfterTwoModerateRule.';
      R.next();
    }
  },
  {
    'name': 't2HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't2' &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't2HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't2ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't2'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't2ModerateDefaultRule.';
      R.next();
    }
  },
  {
    'name': 't2Terrain3Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't2' &&
        this.plannedActivity.activityType === 'moderate' &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't2Terrain3Rule.';
      this.plannedActivity.terrain = 3;
      R.stop();
    }
  },
  {
    'name': 't2StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't2'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't4StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t2Rules = rules;
