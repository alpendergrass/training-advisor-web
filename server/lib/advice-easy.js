'use strict';

var _ = require('lodash');
require('lodash-migrate');

var rules = [
  {
    'name': 'easyAfterHardInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && this.wentHardYesterday &&
        (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, in peak or race, so recommending easy.';
      this.trainingDay.plannedActivities[0].advice += ` Yesterday was a hard day and you are peaking so go easy today. Intensity should be below 0.75.
 As always, take the day off if you feel you need the rest.`;
      R.stop();
    }
  },
  {
    'name': 'easyAfterHardWithRestNotScheduledForTomorrowRule',
    'condition': function(R) {
      R.when(this && !this.testingIsDue && this.wentHardYesterday &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (this.trainingDay.form <= this.adviceConstants.easyDaytNeededThreshold) &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.tomorrowDayOfWeek)) < 0 &&
        (!this.tomorrowTrainingDay || this.tomorrowTrainingDay.scheduledEventRanking !== 9) // tomorrow is not a scheduled off day.
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, form is below easyDaytNeededThreshold, tomorrow is not a preferred rest day or off day, so recommending easy.';
      this.trainingDay.plannedActivities[0].advice += `  Yesterday was a hard day and form is somewhat low so go easy today. Intensity should be below 0.75.
 Take the day off if you feel you need to rest.`;
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededThreeDaysPriorGoalEventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextGoalEvent === 3) ;
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as goal event is in three days.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as your goal event is in three days.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededDayBeforeGoalEventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextGoalEvent === 1) ;
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as goal event is tomorrow.';
      this.trainingDay.plannedActivities[0].advice += ` An easy day is recommended as your goal event is tomorrow.
 You may do a few 90% sprints to sharpen the legs but otherwise keep it very relaxed.`;
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForPriority2EventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextPriority2Event === 2 &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 2 event is in two days.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a medium priority event in two days.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForPriority3EventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextPriority3Event === 1 &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 3 event is in one day.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a low priority event scheduled for tomorrow.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForTestingRule',
    'condition': function(R) {
      R.when(this && this.testingIsDue &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        this.trainingDay.form <= this.adviceConstants.testingEligibleFormThreshold
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Testing is due. Recommending easy in preparation for testing.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day or rest is needed in preparation for testing. Your form is not sufficiently recovered for testing.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.easyRules = rules;
