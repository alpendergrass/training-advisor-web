'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't5HardRule',
    'priority': 3,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't5' &&
        this.metrics.form > this.adviceConstants.t5HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Recommend hard based on t5 threshold.';
      R.next();
    }
  },
  {
    'name': 't5ModerateRule',
    'priority': 2,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't5' &&
        this.metrics.form > this.adviceConstants.t5ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' Recommend moderate based on t5 threshold.';
      R.next();
    }
  },
  {
    'name': 't5EasyRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't5' &&
        this.metrics.form > this.adviceConstants.t5EasyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Recommend easy based on t5 threshold.';
      this.plannedActivity.advice += ' Easy dude.';
      // R.next();
      R.stop();
    }
  },
  {
    'name': 't5TempoRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't5' &&
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
    'name': 't5EnduranceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't5' &&
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

module.exports.t5Rules = rules;
