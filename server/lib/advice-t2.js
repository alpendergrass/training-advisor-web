'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't2HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t2'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t2HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t2HardRule.';
      R.stop();
    }
  },
  {
    'name': 't2HardAfterTwoModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t2'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate' &&
        this.metricsTwoDaysPrior && this.metricsTwoDaysPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t2HardAfterTwoModerateRule.';
      R.stop();
    }
  },
  {
    'name': 't2HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t2'], this.trainingDay.period) &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t2HardAfterRestRule.';
      R.stop();
    }
  },
  {
    'name': 't2ModerateHillsRule',
    'priority': 6,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't2' &&
        _.includes(['moderate'], this.plannedActivity.activityType) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t2ModerateHillsAdviceRule.';
      this.plannedActivity.terrain = 3;
      R.stop();
    }
  },
  {
    'name': 't2ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t2'], this.trainingDay.period)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t2ModerateDefaultRule.';
      R.stop();
    }
  }
 //  {
 //    'name': 't2EnduranceAdviceRule',
 //    'priority': -1,
 //    'condition': function(R) {
 //      R.when(this && this.trainingDay.period === 't2' &&
 //        _.includes(['hard'], this.plannedActivity.activityType)
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.rationale += ' t2EnduranceAdviceRule.';
 //      this.plannedActivity.advice += ` A long endurance ride is called for today.
 // Most of your time should be spent in power zone 2. Intensity will be low but if you hit your target Training Load you will be fatigued after this ride.
 // If time is limited, this can be more of a tempo-to-sweet spot ride - zone 3 to low zone 4.
 // If riding in hilly terrain effort will naturally rise above zones 2/3 on the climbs but strive to keep the effort moderate.
 // During your ride, on climbs and on the flats, you should periodically increase your cadence beyond your normal comfort range.
 // Learning to spin a higher cadence will make you a more efficient cyclist.`;
 //      R.stop();
 //    }
 //  },
 //  {
 //    'name': 't2ModerateHillsAdviceRule',
 //    'priority': -1,
 //    'condition': function(R) {
 //      R.when(this && this.trainingDay.period === 't2' &&
 //        _.includes(['moderate'], this.plannedActivity.activityType) &&
 //        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
 //        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.rationale += ' t2ModerateHillsAdviceRule.';
 //      this.plannedActivity.advice += ` Today you should do rolling hills at a moderate pace.
 // Climb steady at a high cadence and try to keep power in Zone 3 - 4 when climbing.
 // It is easy for effort to rise higher than intended when climbing.
 // If hills are not an option in your area a brisk headwind will suffice.
 // Monitor Training Load during your ride to make sure you stay under your upper load target.`;
 //      R.stop();
 //    }
 //  },
 //  {
 //    'name': 't2TempoAdviceRule',
 //    'priority': -5,
 //    'condition': function(R) {
 //      R.when(this && this.trainingDay.period === 't2' &&
 //        _.includes(['moderate'], this.plannedActivity.activityType)
 //      );
 //    },
 //    'consequence': function(R) {
 //      this.plannedActivity.rationale += ' t2TempoAdviceRule.';
 //      this.plannedActivity.advice += ` A tempo ride of moderate duration would be a good choice for today.
 // Tempo means a good portion of your ride should be in power zone 3.
 // Keep tabs on Training Load during your ride to ensure you do sufficient work without overdoing it.`;
 //      R.stop();
 //    }
 //  }
];

module.exports = {};

module.exports.t2Rules = rules;
