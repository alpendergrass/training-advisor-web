'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't5HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t5HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t5HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't5ModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t5'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t5ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t5ModerateRule.';
      R.next();
    }
  },
  {
    'name': 't5RaceIntensityAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't5' &&
        this.plannedActivity.activityType === 'hard' &&
        this.metricsOneDayPrior && _.includes(['rest', 'easy'], this.metricsOneDayPrior.loadRating)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t5RaceIntensityAdviceRule.';
      this.plannedActivity.advice += ` Today you should work on race-pace intensity.
 If riding in a group, look for opportunities to attack in situations similar to what you might expect in your goal event
 If others are in an attacking mood, cover those attacks.
 If riding alone use your imagination to visualize race scenarios and ride as is you are racing them.
 The goal today is to simulate the intensity of your goal event.`;
      R.stop();
    }
  },
  {
    'name': 't5GoalHillsAdviceRule',
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
      this.plannedActivity.rationale += ' t5GoalHillsAdviceRule.';
      this.plannedActivity.advice += ` Today is a climbing day. Ride hills similar to the ones in your goal event.
 Focus on climbing strongly without going into the red.
 Monitor total Training Load during your ride to ensure you stay within your target load range.`;
      R.stop();
    }
  },
  {
    'name': 't5ThresholdAdviceRule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't5' &&
        _.includes(['hard', 'moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t5ThresholdAdviceRule.';
      this.plannedActivity.advice += ` Your goal today is to work on riding for an extended period at threshold power.
 Threshold is Zone 4. After a good warmup, if the legs feel good, ride for at least 15 minutes at this pace,
 longer if you feel capable.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t5Rules = rules;
