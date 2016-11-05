'use strict';

var _ = require('lodash');
require('lodash-migrate');

var rules = [
  {
    'name': 'preferredRestDayRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.scheduledEventRanking === 0 &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.todayDayOfWeek) > -1)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' This is a preferred rest day.';
      this.plannedActivity.advice += ' Today is one of your planned rest days, so rest.';
      R.stop();
    }
  },
  {
    'name': 'sufficientlyFatiguedToNeedRestRule',
    'condition': function(R) {
      R.when(this &&
        this.metrics.form <= this.adviceConstants.restNeededThreshold ||
        (this.trainingDay.period === 'peak' && this.metrics.form <= this.adviceConstants.restNeededForPeakingThreshold) ||
        (this.trainingDay.period === 'race' && this.metrics.form <= this.adviceConstants.restNeededForRacingThreshold)
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
    'name': 'restNeededInPrepForGoalEventRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.daysUntilNextGoalEvent === 2)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Rest recommended as goal event is in two days.';
      this.plannedActivity.advice += ' Rest is needed as your goal event is in two days. If you ride, go very easy, just loosen the legs.';
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForPriority2EventRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (this.trainingDay.daysUntilNextPriority2Event === 1)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Rest recommended as priority 2 event is in one day.';
      this.plannedActivity.advice += ' Rest is recommended as you have a medium priority event tomorrow. If you ride, go easy.';
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForTestingRule',
    // Depending on values of various thresholds, we may never get here.
    // E.g., if restNeededForPeakingThreshold is greater than restNeededForTestingThreshold.
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        (this.testingIsDue) &&
        (this.metrics.form <= this.adviceConstants.restNeededForTestingThreshold)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' Testing is due. Rest recommended in preparation for testing.';
      this.plannedActivity.advice += ' Testing is due but form is not sufficiently recovered for testing. Rest is needed in preparation for testing, so rest today.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.restRules = rules;
