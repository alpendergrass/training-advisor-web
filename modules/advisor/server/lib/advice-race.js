'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 'raceHardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 'race' &&
        this.metrics.form > this.adviceConstants.raceHardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += 'raceHardRule.';
      R.next();
    }
  },
  {
    'name': 'raceModerateAfterTwoHardRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['race'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'hard' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += 'raceModerateAfterTwoHardRule.';
      R.next();
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
    'name': 'raceStopRule',
    'priority': -9,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
        this.trainingDay.period === 'race'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += 'raceStopRule.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.raceRules = rules;
