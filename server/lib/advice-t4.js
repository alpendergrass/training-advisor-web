'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't4HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't4' &&
        this.metrics.form > this.adviceConstants.t4HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't4HardRule.';
      R.next();
    }
  },
  {
    'name': 't4HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't4' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't4HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't4HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't4' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't4HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't4ModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't4' &&
        this.metrics.form > this.adviceConstants.t4ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't4ModerateRule.';
      R.next();
    }
  },
  {
    'name': 't4Terrain3Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't4' &&
        this.plannedActivity.activityType === 'hard' &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't4Terrain3Rule.';
      this.plannedActivity.terrain = 3;
      R.stop();
    }
  },
  {
    'name': 't4StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't4'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't4StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t4Rules = rules;
