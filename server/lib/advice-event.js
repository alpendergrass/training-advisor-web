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
      this.plannedActivity.rationale += ' Today is a scheduled off day.';
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
      this.plannedActivity.rationale += ' Today is a priority 1 (goal) event.';
      this.plannedActivity.advice += ' Today is a goal event. Give it your all. Good luck!';
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
      this.plannedActivity.rationale += ' Today is a medium priority event.';
      this.plannedActivity.advice += ` You have a medium priority event scheduled for today.
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
      this.plannedActivity.rationale += ' Today is a low priority event.';
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
      this.plannedActivity.rationale += ` Today is a priority ${this.trainingDay.scheduledEventRanking} event but testing is due. Recommending skipping.`;
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
      this.plannedActivity.rationale += ` Today is a priority ${this.trainingDay.scheduledEventRanking} event. In ${this.trainingDay.period} period.
Goal event is ${this.trainingDay.daysUntilNextGoalEvent} days away.`;
      this.plannedActivity.advice += ` You have a non-goal event scheduled for today.
However, your next goal event is only ${this.trainingDay.daysUntilNextGoalEvent} days away.`;
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
      this.plannedActivity.rationale += ' Recommending skipping.';
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
      this.plannedActivity.rationale += ' Recommending caution.';
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
      this.plannedActivity.rationale += ' twoDaysBeforeGoalEventRule.';
      this.plannedActivity.advice += ' Easy day is recommended as your goal event is in two days. Just loosen the legs.';
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
 You may do a few 90% sprints to sharpen the legs but otherwise keep it relaxed.`;
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
      this.plannedActivity.advice += ' An easy day is recommended as you have a medium priority event tomorrow.';
      R.stop();
    }
  }
  // {
  //   'name': 'easyDayNeededInPrepForPriority2EventRule',
  //   'priority': 94,
  //   'condition': function(R) {
  //     R.when(this && !this.plannedActivity.activityType &&
  //       this.trainingDay.daysUntilNextPriority2Event === 2 &&
  //       (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race')
  //     );
  //   },
  //   'consequence': function(R) {
  //     this.plannedActivity.activityType = 'easy';
  //     this.plannedActivity.rationale += ' Easy day recommended as priority 2 event is in two days.';
  //     this.plannedActivity.advice += ' An easy day is recommended as you have a medium priority event in two days. Keep the effort in zone 2 or below.';
  //     R.stop();
  //   }
  // },
  // {
  //   'name': 'easyDayNeededThreeDaysPriorGoalEventRule',
  //   'priority': 93,
  //   'condition': function(R) {
  //     R.when(this && !this.plannedActivity.activityType &&
  //       this.trainingDay.daysUntilNextGoalEvent === 3
  //     );
  //   },
  //   'consequence': function(R) {
  //     this.plannedActivity.activityType = 'easy';
  //     this.plannedActivity.rationale += ' Easy day recommended as goal event is in three days.';
  //     this.plannedActivity.advice += ' An easy day is recommended as your goal event is in three days. This should be a zone 1 - 2 ride. Resist the urge to go hard, save it for your event!';
  //     R.stop();
  //   }
  // },
  // {
  //   'name': 'easyDayNeededInPrepForPriority3EventRule',
  //   'priority': 93,
  //   'condition': function(R) {
  //     R.when(this && !this.plannedActivity.activityType &&
  //       this.trainingDay.daysUntilNextPriority3Event === 1 &&
  //       (this.trainingDay.period !== 't6' && this.trainingDay.period !== 'race')
  //     );
  //   },
  //   'consequence': function(R) {
  //     this.plannedActivity.activityType = 'easy';
  //     this.plannedActivity.rationale += ' Easy day recommended as priority 3 event is in one day.';
  //     this.plannedActivity.advice += ' An easy day is recommended as you have a low priority event scheduled for tomorrow. Today should be an short endurance ride.';
  //     R.stop();
  //   }
  // },
];

module.exports = {};

module.exports.eventRules = rules;
