'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't6HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
        this.metrics.form > this.adviceConstants.t6HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t6HardRule.';
      this.plannedActivity.advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
      R.next();
    }
  },
  {
    'name': 't6ModerateAfterTwoHardRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t6'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'hard' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t6ModerateAfterTwoHardRule.';
      R.next();
    }
  },
//  {
 //    'name': 't6ModerateRule',
 //    'priority': 2,
 //    'condition': function(R) {
 //      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
 //        this.metrics.form > this.adviceConstants.t6ModerateDayThreshold
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.activityType = 'moderate';
 //      this.plannedActivity.rationale += ' Recommend moderate based on t6 threshold.';
 //      R.next();
 //    }
 //  },
 //  {
 //    'name': 't6EasyRule',
 //    'priority': 1,
 //    'condition': function(R) {
 //      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
 //        this.metrics.form > this.adviceConstants.t6EasyDayThreshold
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.activityType = 'easy';
 //      this.plannedActivity.rationale += ' Recommend easy based on t6 threshold.';
 //      this.plannedActivity.advice += ' Easy dude.';
 //      // R.next();
 //      R.stop();
 //    }
 //  },
 //  {
 //    'name': 't6TempoRule',
 //    'priority': -1,
 //    'condition': function(R) {
 //      R.when(this &&
 //        this.trainingDay.period === 't6' &&
 //        _.includes(['moderate'], this.plannedActivity.activityType)
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.advice += ` Tempo
 // baby.`;
 //      R.stop();
 //    }
 //  },
 //  {
 //    'name': 't6EnduranceRule',
 //    'priority': -1,
 //    'condition': function(R) {
 //      R.when(this &&
 //        this.trainingDay.period === 't6' &&
 //        _.includes(['hard'], this.plannedActivity.activityType)
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.advice += ` You appear to be sufficiently rested to do a long endurance ride today. This is the time of the season to build your base.
 // Focus on keeping your cadence high but your effort light. Learning to ride at a higher cadence will slow the onset of fatigue. You should target power zone 2.
 // The effort is low but you will be tired after this ride if you hit your target load.`;
 //      R.stop();
 //    }
 //  }
  // {
  //   'name': 't6HhardRule',
  //   'priority': -1,
  //   'condition': function(R) {
  //     R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6');
  //   },
  //   'consequence': function(R) {
  //     this.plannedActivity.activityType = 'hard';
  //     this.plannedActivity.rationale += ' Is race period, recommending hard ride but load will be smaller than typical hard ride.';
  //     this.plannedActivity.advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
  //     R.stop();
  //   }
  // }
];

module.exports = {};

module.exports.t6Rules = rules;
