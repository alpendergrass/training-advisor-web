'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't4HardRule',
    'priority': 9,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t4'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t4HardDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t4HardRule.';
      R.next();
    }
  },
  {
    'name': 't4HardAfterModerateRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t4'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t4HardAfterModerateRule.';
      R.next();
    }
  },
  {
    'name': 't4HardAfterRestRule',
    'priority': 7,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t4'], this.trainingDay.period) &&
        this.metricsOneDayPrior && this.metricsOneDayPrior.loadRating === 'rest'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' t4HardAfterRestRule.';
      R.next();
    }
  },
  {
    'name': 't4ModerateRule',
    'priority': 5,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        _.includes(['t4'], this.trainingDay.period) &&
        this.metrics.form > this.adviceConstants.t4ModerateDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' t4ModerateRule.';
      R.next();
    }
  },
  {
    'name': 't4GoalHillsAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't4' &&
        this.plannedActivity.activityType === 'hard' &&
        (this.nextGoal && this.nextGoal.eventTerrain > 2) &&
        (!this.metricsOneDayPrior || !this.metricsOneDayPrior.totalElevationGain || this.metricsOneDayPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay) &&
        (!this.metricsTwoDaysPrior || !this.metricsTwoDaysPrior.totalElevationGain || this.metricsTwoDaysPrior.totalElevationGain < this.adviceConstants.moderateClimbingDay)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t4GoalHillsAdviceRule.';
      this.plannedActivity.advice += ` Today you should seek out hills similar to your goal event.
 Climb strongly but do not over do it. You want to be able to put in a hard but sustainable effort on every climb.
 Use your Training Load targets to determine ride duration.`;
      R.stop();
    }
  },
  {
    'name': 't4IntensityAdviceRule',
    'priority': -3,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't4' &&
        this.plannedActivity.activityType === 'hard'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t4IntensityAdviceRule.';
      this.plannedActivity.advice += ` Today you should work on fast intensity.
 Your focus should be on maintaing a Zone 5 effort for several minutes at a time.
 A fast group ride can be an excellent way to do this workout. If you are feeling strong,
 go to the front and take a hard pull several times during the course of this ride.
 Just be careful that you keep enough in reserve to stay with the group after your pull.`;
      R.stop();
    }
  },
  {
    'name': 't4Zone4SteadyAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.trainingDay.period === 't4' &&
        this.plannedActivity.activityType === 'moderate'
      );
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' t4Zone4SteadyAdviceRule.';
      this.plannedActivity.advice += ` Your workout today should focus on riding a hard pace for an extended duration.
 Look for opportunities to ride 5 to 10 minutes in Zone 4 on flat or rolling terrain.
 These efforts require close attention to maintain a hard but sustainable pace.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t4Rules = rules;
