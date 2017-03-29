'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't3HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't3' &&
        this.metrics.form > this.adviceConstants.t3HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't3HardRule.';
      R.next();
    }
  },
  {
    'name': 't3HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't3' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't3HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't3HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't3' &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't3HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't3ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't3'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't3ModerateDefaultRule.';
      R.next();
    }
  },
  {
    'name': 't3Terrain5Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'hard' &&
        (this.nextGoal && this.nextGoal.eventTerrain > 3) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.bigClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.bigClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't3Terrain5Rule.';
      this.plannedActivity.terrain = 5;
      R.stop();
    }
  },
  {
    'name': 't3Terrain3Rule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'hard' &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't3Terrain3Rule.';
      this.plannedActivity.terrain = 3;
      R.stop();
    }
  },
  {
    'name': 't3StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't3'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't3StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t3Rules = rules;
