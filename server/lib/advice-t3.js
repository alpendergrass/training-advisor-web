'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't3HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t3'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t3HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t3HardRule.';
      R.next();
    }
  },
  {
    'name': 't3HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t3'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t3HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't3HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t3'], this.trainingDay.period) &&
        this.metricsOneDayPrior && (this.metricsOneDayPrior.loadRating === 'rest')
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t3HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't3ModerateDefaultRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t3'], this.trainingDay.period)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t3ModerateDefaultRule.';
      R.next();
    }
  },
  {
    'name': 't3LongHillsAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'hard' &&
        (this.nextGoal && this.nextGoal.eventTerrain > 3) &&
        (!this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.bigClimbingDay) &&
        (!this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.bigClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t3LongHillsAdviceRule.';
      this.plannedActivity.advice += ` Today you should do a long climbing ride at a moderate pace. Do longer climbs if they are available.
 Climb steady at a high cadence and keep power in Zone 4 or below when climbing.
 Keep an eye on your Training Load to make sure you do not overdo it.`;
      R.stop();
    }
  },
  {
    'name': 't3MediumHillsAdviceRule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'hard' &&
        (!this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t3MediumHillsAdviceRule.';
      this.plannedActivity.advice += ` Today you should do a long ride with some shorter climbs at a moderate pace.
 Keep cadence high and power in Zone 4 or below when climbing.
 Monitor your Training Load to make sure you stay within your daily Load targets.`;
      R.stop();
    }
  },
  {
    'name': 't3TempoAdviceRule',
    'priority': -5,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'hard' &&
        (this.nextGoal && this.nextGoal.eventTerrain < 2) &&
        (!this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t3TempoAdviceRule.';
      this.plannedActivity.advice += ` Today you should do a long tempo ride.
 Tempo means you should spend much of your ride in power zone 3. Early in your ride zone 3 will feel easy
 but resist the temptation to go harder. Sustaining a tempo pace for an extended time is challenging.
 If your route includes hills keep effort in Zone 4 or below while climbing.
 As allways, keep cadence high.`;
      R.stop();
    }
  },
  {
    'name': 't3EnduranceAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't3' &&
        this.plannedActivity.activityType === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t3EnduranceAdviceRule.';
      this.plannedActivity.advice += ` Today you should do an endurance ride of moderate duration.
 Remember, endurance means spending most of your time in zone 2. When climbing your effort will rise beyond zone 2
 but stay out of zone 5. On the descents you should let effort fall into zone 1.
 Whenever you think about it, increase your cadence a bit.`;
      R.stop();
    }
  },
];

module.exports = {};

module.exports.t3Rules = rules;
