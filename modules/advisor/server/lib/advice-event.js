'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 'offDayRule',
    'priority': 99,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.scheduledEventRanking === 9);
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.activityType = 'event';
      this.plannedActivity.rationale += ' offDayRule.';
      this.plannedActivity.advice += ' You have scheduled the day off. Enjoy your day.';
      R.stop();
    }
  },
  {
    'name': 'goalEventRule',
    'priority': 99,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.scheduledEventRanking === 1);
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.activityType = 'event';
      this.plannedActivity.rationale += ' goalEventRule.';
      this.plannedActivity.advice += ' Today is your goal event. Today is the day you have been training for. Give it your all! Good luck!';
      R.stop();
    }
  },
  {
    'name': 'mediumPriorityEventRule',
    'priority': 99,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.scheduledEventRanking === 2 &&
        (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race') &&
        (!this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.activityType = 'event';
      this.plannedActivity.rationale += ' mediumPriorityEventRule.';
      this.plannedActivity.advice += ` You have a medium priority event scheduled for today.
Your objective today is to simulate your goal event.
If you feel good go for the podium but if you do not have the legs, sit in. You do not want to risk your season today.`;
      R.stop();
    }
  },
  {
    'name': 'lowPriorityEventRule',
    'priority': 99,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingDay.scheduledEventRanking === 3 &&
        (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race') &&
        (!this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.activityType = 'event';
      this.plannedActivity.rationale += ' lowPriorityEventRule.';
      this.plannedActivity.advice += ` You have a low priority event scheduled for today.
Your primary objective today is to get a quality, race-pace workout. If you feel good go hard but if not, sit in or drop out.
Race results are not important. Remember that your future goals are the reason you are riding today.`;
      R.stop();
    }
  },
  {
    'name': 'nonGoalEventButTestingDueRule',
    'priority': 98,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.rationale += ` nonGoalEventButTestingDueRule. Event is priority ${this.trainingDay.scheduledEventRanking}.`;
      this.plannedActivity.advice += ` You have a non-goal event scheduled for today. However, testing is due.
 You should skip this event.`;
      R.next();
    }
  },
  {
    'name': 'nonGoalEventInPeakOrRaceRule',
    'priority': 97,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && !this.trainingState && //have to include test on trainingState to keep this rule from triggering itself.
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period === 't6' || this.trainingDay.period === 'race')
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingState = 'nonGoalEventInPeakOrRace';
      this.plannedActivity.rationale += ` nonGoalEventInPeakOrRaceRule. Event is priority ${this.trainingDay.scheduledEventRanking}. In ${this.trainingDay.period} period.
Goal event is ${this.trainingDay.daysUntilNextGoalEvent} days away.`;
      this.plannedActivity.advice += ` You have a non-goal event scheduled for today.
However, your next goal event is only ${this.trainingDay.daysUntilNextGoalEvent} day(s) away.`;
      R.next();
    }
  },
  {
    'name': 'skipEventForImpendingGoalRule',
    'priority': 96,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingState === 'nonGoalEventInPeakOrRace' &&
        (this.trainingDay.daysUntilNextGoalEvent < (this.trainingDay.scheduledEventRanking === 2? this.adviceConstants.priority2EventCutOffThreshold : this.adviceConstants.priority3EventCutOffThreshold))
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.rationale += ' skipEventForImpendingGoalRule.';
      this.plannedActivity.advice += ' You should skip this event.';
      R.next();
    }
  },
  {
    'name': 'cautionDueToImpendingGoalRule',
    'priority': 96,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType && this.trainingState === 'nonGoalEventInPeakOrRace' &&
        (this.trainingDay.daysUntilNextGoalEvent >= (this.trainingDay.scheduledEventRanking === 2? this.adviceConstants.priority2EventCutOffThreshold : this.adviceConstants.priority3EventCutOffThreshold))
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.plannedActivity.rationale += ' cautionDueToImpendingGoalRule.';
      this.plannedActivity.advice += ' Only do this event if you feel certain it will help you prepare for your goal event.';
      R.next();
    }
  },
  {
    'name': 'twoDaysBeforeGoalEventRule',
    'priority': 95,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        (this.trainingDay.daysUntilNextGoalEvent === 2)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += 'twoDaysBeforeGoalEventRule.';
      this.plannedActivity.advice += ' Easy day is recommended as your goal event is in two days. Just loosen the legs, allow your body to recover and plan your performance.';
      R.stop();
    }
  },
  {
    'name': 'dayBeforeGoalEventRule',
    'priority': 95,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.daysUntilNextGoalEvent === 1
      ) ;
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'moderate';
      this.plannedActivity.rationale += ' dayBeforeGoalEventRule.';
      this.plannedActivity.advice += ` An easy-to-moderate day is recommended as your goal event is tomorrow.
 You may do a few 90% sprints to sharpen the legs but otherwise keep it relaxed. Visualize your best performance!`;
      R.stop();
    }
  },
  {
    'name': 'dayBeforePriority2EventRule',
    'priority': 94,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race') &&
        (this.trainingDay.daysUntilNextPriority2Event === 1)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' dayBeforePriority2EventRule.';
      this.plannedActivity.advice += ' An easy day is recommended as you have a medium priority event tomorrow. The goal today is to get ready to put in a good performance tomorrow';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.eventRules = rules;
