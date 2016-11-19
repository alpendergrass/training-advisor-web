'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't6SufficientlyFatiguedToNeedRestRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
        this.metrics.form <= this.adviceConstants.t6RestNeededThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Sufficiently fatigued to recommend rest.';
      this.plannedActivity.advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.';
      R.stop();
    }
  },
  {
    'name': 't6EasyAfterHardRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' && this.wentHardYesterday
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' Yesterday was hard, in t6, so recommending easy.';
      this.plannedActivity.advice += ` Yesterday was a hard day and you are peaking so go easy today. This should be a zone 1 - 2 ride.
 As always, take the day off if you feel you need the rest. Sufficient recovery is critical at this point in your season.`;
      R.stop();
    }
  },
  {
    'name': 't6HardRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' && !this.testingIsDue &&
      this.metrics.form > this.adviceConstants.t6HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Recommend hard based on t6 threshold.';
      R.next();
    }
  },
  {
    'name': 't6ModerateRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' && !this.testingIsDue &&
      this.metrics.form > this.adviceConstants.t6ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' Recommend moderate based on t6 threshold.';
      R.next();
    }
  },
  {
    'name': 't6TempoRule',
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't6' &&
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
    'name': 't6EnduranceRule',
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't6' &&
        _.includes(['hard'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You appear to be sufficiently rested to do a long endurance ride today. This is the time of the season to build your base.
 Focus on keeping your cadence high but your effort light. Learning to ride at a higher cadence will slow the onset of fatigue. You should target power zone 2.
 The effort is low but you will be tired after this ride if you hit your target load.`;
      R.stop();
    }
  },
  {
    'name': 't6HhardRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6');
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' Is race period, recommending hard ride but load will be smaller than typical hard ride.';
      this.plannedActivity.advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t6Rules = rules;
