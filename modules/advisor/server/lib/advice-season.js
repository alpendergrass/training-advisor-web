'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 'seasonHardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2', 't3', 't4', 't5', 't6', 'race'], this.trainingDay.period) &&
        this.metrics.form > this.hardDayThreshold &&
        !(this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'hard' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'hard')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 'seasonHardRule.';
      R.next();
    }
  },
  {
    'name': 'seasonModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2', 't3', 't4', 't5', 't6', 'race'], this.trainingDay.period) &&
        this.metrics.form > this.moderateDayThreshold &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating !== 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 'seasonModerateRule.';
      R.next();
    }
  },
  {
    'name': 'seasonEasyRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t1', 't2', 't3', 't4', 't5', 't6', 'race'], this.trainingDay.period) &&
        this.metrics.form > this.easyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += 'seasonEasyRule.';
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
    'name': 'raceTerrain1Rule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 'race' &&
        _.includes(['hard'], this.plannedActivity.activityType) &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.smallClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.smallClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 'raceTerrain1Rule.';
      this.plannedActivity.terrain = 1;
      R.stop();
    }
  },
  {
    'name': 'seasonStopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        _.includes(['t1', 't2', 't3', 't4', 't5', 't6', 'race'], this.trainingDay.period)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 'seasonStopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.inSeasonRules = rules;
