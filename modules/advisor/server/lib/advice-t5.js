'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't5HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't5' &&
        this.metrics.form > this.adviceConstants.t5HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't5HardRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't5' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't5HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't5' &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 't5HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't5ModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.period === 't5' &&
        this.metrics.form > this.adviceConstants.t5ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 't5ModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5Intensity5Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't5' &&
        this.plannedActivity.activityType === 'hard' &&
        this.metricsOneDayPrior && _.includes(['rest', 'easy'], this.metricsOneDayPrior.loadRating)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't5Intensity5Rule.';
      this.plannedActivity.intensity = 5;
      R.stop();
    }
  },
  {
    'name': 't5Terrain3Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't5' &&
        this.plannedActivity.activityType === 'moderate' &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't5Terrain3Rule.';
      this.plannedActivity.terrain = 3;
      R.stop();
    }
  },
  {
    'name': 't5StopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 't5'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 't5StopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t5Rules = rules;
