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
      R.next();
    }
  },
  {
    'name': 't6ModerateAfterTwoHardRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.period === 't6' &&
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
  {
    'name': 't6CruxHillAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't6' &&
        _.includes(['hard'], this.plannedActivity.activityType) &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.smallClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.smallClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t6CruxHillAdviceRule.';
      this.plannedActivity.advice += ` Your goal today is to do a climb that simulates the one you
 expect to be most significant in your goal event, the climb most likely to determine how well you do.
 Visualize racing the climb and hitting the top in the lead.
 The number of times you do the climb will be determined by the length and steepness of the climb but
 be careful not to do too much.
 Your Training Load targets will help you guage how much work to do.
 Your are peaking for your goal and are looking to put the right finishing touch on your fitness.`;
      R.stop();
    }
  },
  {
    'name': 't6ThresholdAdviceRule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't6' &&
        _.includes(['hard'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t6ThresholdAdviceRule.';
      this.plannedActivity.advice += ` You should work on threshold (Zone 4) power today.
 Warm up well, then ride for an extended period at this pace, using your Training Load targets
 to guide the duration of the effort.
 Since you are peaking for your goal event, intensity should be high but your load targets are smaller.`;
      R.stop();
    }
  },
  {
    'name': 't6EnduranceAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't6' &&
        _.includes(['moderate'], this.plannedActivity.activityType)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t6EnduranceAdviceRule.';
      this.plannedActivity.advice += ` Today an shorter durantion endurance (power zone 2) ride is in order.
 You are peaking for your goal event and it is important to maintain endurace.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t6Rules = rules;
