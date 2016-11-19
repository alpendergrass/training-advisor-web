'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't4HardRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't4' && !this.testingIsDue &&
      this.metrics.form > this.adviceConstants.t4HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Recommend hard based on t4 threshold.';
      R.next();
    }
  },
  {
    'name': 't4ModerateRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't4' && !this.testingIsDue &&
      this.metrics.form > this.adviceConstants.t4ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' Recommend moderate based on t4 threshold.';
      R.next();
    }
  },
  {
    'name': 't4TempoRule',
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't4' &&
        _.includes(['moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` Tempo
 baby.`;
      R.stop();
    }
  },
  {
    'name': 't4EnduranceRule',
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't4' &&
        _.includes(['hard'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You appear to be sufficiently rested to do a long endurance ride today. This is the time of the season to build your base.
 Focus on keeping your cadence high but your effort light. Learning to ride at a higher cadence will slow the onset of fatigue. You should target power zone 2.
 The effort is low but you will be tired after this ride if you hit your target load.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t4Rules = rules;
