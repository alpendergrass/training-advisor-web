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
      this.plannedActivity.advice += ' You are peaking for your goal event. You should do a shorter but intense ride today.';
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
 //  {
 //    'name': 'sufficientlyFatiguedInRaceToNeedRestRule',
 //    'condition': function(R) {
 //      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 'race' &&
 //        this.metrics.form <= this.adviceConstants.restNeededForRacingThreshold
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.activityType = 'rest';
 //      this.plannedActivity.rationale += ' Sufficiently fatigued to recommend rest.';
 //      this.plannedActivity.advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.';
 //      R.stop();
 //    }
 //  },
 //  {
 //    'name': 'easyAfterHardInRaceRule',
 //    'condition': function(R) {
 //      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 'race' && this.wentHardYesterday);
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.activityType = 'easy';
 //      this.plannedActivity.rationale += ' Yesterday was hard, in race or race, so recommending easy.';
 //      this.plannedActivity.advice += ` Yesterday was a hard day and you are peaking so go easy today. This should be a zone 1 - 2 ride.
 // As always, take the day off if you feel you need the rest. Sufficient recovery is critical at this point in your season.`;
 //      R.stop();
 //    }
 //  },
];

module.exports = {};

module.exports.raceRules = rules;
