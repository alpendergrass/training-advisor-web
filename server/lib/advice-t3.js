'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't3HardRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't3' &&
        this.metrics.form > this.adviceConstants.t3HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Recommend hard based on t3 threshold.';
      R.next();
    }
  },
  {
    'name': 't3ModerateRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't3' &&
        this.metrics.form > this.adviceConstants.t3ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' Recommend moderate based on t3 threshold.';
      R.next();
    }
  },
  {
    'name': 't3EasyRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't3' &&
        this.metrics.form > this.adviceConstants.t3EasyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Recommend easy based on t3 threshold.';
      this.plannedActivity.advice += ' Easy dude.';
      // R.next();
      R.stop();
    }
  },
  {
    'name': 't3TempoRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't3' &&
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
    'name': 't3EnduranceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't3' &&
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

module.exports.t3Rules = rules;
