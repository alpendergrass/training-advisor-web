'use strict';

var rules = [
  {
    'name': 'offDayRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.scheduledEventRanking === 9));
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].activityType = 'event';
      this.trainingDay.plannedActivities[0].rationale += ' Today is a scheduled off day.';
      this.trainingDay.plannedActivities[0].advice += ' You have scheduled the day off. Enjoy your day.';
      R.stop();
    }
  },
  {
    'name': 'goalEventRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.scheduledEventRanking === 1));
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].activityType = 'event';
      this.trainingDay.plannedActivities[0].rationale += ' Today is a priority 1 (goal) event.';
      this.trainingDay.plannedActivities[0].advice += ' Today is a goal event. Give it your all. Good luck!';
      R.stop();
    }
  },
  {
    'name': 'mediumPriorityEventRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.scheduledEventRanking === 2) &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (!this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].activityType = 'event';
      this.trainingDay.plannedActivities[0].rationale += ' Today is a medium priority event.';
      this.trainingDay.plannedActivities[0].advice += ` You have a medium priority event scheduled for today.
If you feel good go for the podium but if you do not have the legs, sit in. You do not want to risk your season today.`;
      R.stop();
    }
  },
  {
    'name': 'lowPriorityEventRule',
    'condition': function(R) {
      R.when(this && (this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (!this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].activityType = 'event';
      this.trainingDay.plannedActivities[0].rationale += ' Today is a low priority event.';
      this.trainingDay.plannedActivities[0].advice += ` You have a low priority event scheduled for today.
Your primary objective today is to get a quality, race-pace workout. If you feel good go hard but if not, sit in or drop out.
Race results are not important. Remember that your future goals are the reason you are riding today.`;
      R.stop();
    }
  },
  {
    'name': 'nonGoalEventButTestingDueRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        (this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].rationale += ` Today is a priority ${this.trainingDay.scheduledEventRanking} event but testing is due. Recommending skipping.`;
      this.trainingDay.plannedActivities[0].advice += ` You have a non-goal event scheduled for today. However, testing is due.
 You should skip this event.`;
      R.next();
    }
  },
  {
    'name': 'nonGoalEventInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && !this.trainingState && //have to include test on trainingState to keep this rule from triggering itself.
      // R.when(this && this.trainingState !== 'nonGoalEventInPeakOrRace' && //have to include test on trainingState to keep this rule from triggering itself.
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race')
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingState = 'nonGoalEventInPeakOrRace';
      this.trainingDay.plannedActivities[0].rationale += ` Today is a priority ${this.trainingDay.scheduledEventRanking} event. In ${this.trainingDay.period} period.
Goal event is ${this.trainingDay.daysUntilNextGoalEvent} days away.`;
      this.trainingDay.plannedActivities[0].advice += ` You have a non-goal event scheduled for today.
However, your next goal event is only ${this.trainingDay.daysUntilNextGoalEvent} days away.`;
      R.next();
    }
  },
  {
    'name': 'skipEventForImpendingGoalRule',
    'condition': function(R) {
      R.when(this && (this.trainingState === 'nonGoalEventInPeakOrRace') &&
        (this.trainingDay.daysUntilNextGoalEvent < (this.trainingDay.scheduledEventRanking === 2? this.adviceConstants.priority2EventCutOffThreshold : this.adviceConstants.priority3EventCutOffThreshold))
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
      this.trainingDay.plannedActivities[0].advice += ' You should skip this event.';
      R.next();
    }
  },
  {
    'name': 'cautionDueToImpendingGoalRule',
    'condition': function(R) {
      R.when(this && (this.trainingState === 'nonGoalEventInPeakOrRace') &&
        (this.trainingDay.daysUntilNextGoalEvent < (this.trainingDay.scheduledEventRanking === 2? this.adviceConstants.priority2EventCutOffThreshold : this.adviceConstants.priority3EventCutOffThreshold))
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
      this.trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will help you prepare for your goal event.';
      R.next();
    }
  }
];

module.exports = {};

module.exports.eventRules = rules;
