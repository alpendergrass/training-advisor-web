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
      this.plannedActivity.rationale += ' raceHardRule.';
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
      this.plannedActivity.rationale += ' raceModerateAfterTwoHardRule.';
      R.next();
    }
  },
  {
    'name': 'raceSteepHillAdviceRule',
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
      this.plannedActivity.rationale += ' raceSteepHillAdviceRule.';
      this.plannedActivity.advice += ` Today you should ride a climb similar in pitch to the steepest
 climb in your goal event. Do not climb for more than a few minutes and limit the number of repeats to just a few.
 The goal today is to hone the climbing skills you've been training all season.
 Visualize the race climb. See yourself riding strongly and confidently!`;
      R.stop();
    }
  },
  {
    'name': 'raceThresholdAdviceRule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 'race' &&
        _.includes(['hard', 'moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' raceThresholdAdviceRule.';
      this.plannedActivity.advice += ` Today you should focus on riding at threshold - Zone 4 into lower Zone 5.
 Do a good warm-up, then ride for a moderate period at this pace, using your Training Load targets
 to keep the duration within bounds.
 Intensity will be high but do not jeopardize your race performance by doing too much work today.
 Today you want to put the finishing touch on your race fitness.
 Visualize the crunch segments of your goal event. See yourself riding strongly, head up and confident!`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.raceRules = rules;
