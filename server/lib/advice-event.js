'use strict';


var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceConstants = require('./advice-constants'),
  adviceUtil = require('./advice-util'),
  err;


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
        (!this.isTestingDue)
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
        (!this.isTestingDue)
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
    'name': 'nonGoalEventTestDueRule',
    'condition': function(R) {
      R.when(this && !this.nextCheck && //have to include test on nextCheck to keep this rule from triggering itself.
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (this.isTestingDue)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.trainingDay.plannedActivities[0].rationale += ` Today is a priority ${this.trainingDay.scheduledEventRanking} event but testing is due. Recommending skipping.`;
      this.trainingDay.plannedActivities[0].advice += ` You have a non-goal event scheduled for today. However, testing is due.
 You should skip this event.`;
      R.stop();
    }
  },
  {
    'name': 'nonGoalEventInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && this.nextCheck !== 'impendingGoal' && //have to include test on nextCheck to keep this rule from triggering itself.
        (this.trainingDay.scheduledEventRanking === 2 || this.trainingDay.scheduledEventRanking === 3) &&
        (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race')
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.nextCheck = 'impendingGoal';
      this.nextParm = this.trainingDay.scheduledEventRanking === 2? this.adviceConstants.priority2EventCutOffThreshold : this.adviceConstants.priority3EventCutOffThreshold;
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
      R.when(this && (this.nextCheck === 'impendingGoal') &&
        (this.trainingDay.daysUntilNextGoalEvent < this.nextParm)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.nextCheck = null;
      this.nextParm = null;
      this.trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
      this.trainingDay.plannedActivities[0].advice += ' You should skip this event.';
      R.next();
    }
  },
  {
    'name': 'cautionDueToImpendingGoalRule',
    'condition': function(R) {
      R.when(this && (this.nextCheck === 'impendingGoal') &&
        (this.trainingDay.daysUntilNextGoalEvent >= this.nextParm)
      );
    },
    'consequence': function(R) {
      this.result = true;
      this.nextCheck = null;
      this.nextParm = null;
      this.trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
      this.trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will help you prepare for your goal event.';
      R.next();
    }
  }
];



module.exports = {};

module.exports.eventRules = rules;

module.exports.checkEvent = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== ''){
    return callback(null, user, trainingDay);
  }

  if (trainingDay.scheduledEventRanking) {
    switch (trainingDay.scheduledEventRanking) {
      case 1:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 1 (goal) event.';
        trainingDay.plannedActivities[0].advice += ' Today is a goal event. Give it your all. Good luck!';
        trainingDay.plannedActivities[0].activityType = 'event';
        break;
      case 2:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 2 (medium priority) event.';
        trainingDay.plannedActivities[0].advice += ' You have a medium priority event scheduled for today.';
        if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
          trainingDay.plannedActivities[0].rationale += ' In ' + trainingDay.period + ' period. Goal event is ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          trainingDay.plannedActivities[0].advice += ' However, your next goal event is only ' + trainingDay.daysUntilNextGoalEvent + ' days away. ';
          if (trainingDay.daysUntilNextGoalEvent < adviceConstants.priority2EventCutOffThreshold) {
            trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
            trainingDay.plannedActivities[0].advice += ' You should skip this event.';
          } else {
            trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
            trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will not compromise your goal.';
          }
        } else if (adviceUtil.isTestingDue(user, trainingDay)) {
          trainingDay.plannedActivities[0].rationale += ' Testing is due. Recommending skipping.';
          trainingDay.plannedActivities[0].advice += ' However, testing is due. You should skip this event.';
        } else {
          trainingDay.plannedActivities[0].advice += ' If you feel good go for the podium but if you do not have the legs, sit in. You do not want to risk your season today.';
          trainingDay.plannedActivities[0].activityType = 'event';
        }
        break;
      case 3:
        trainingDay.plannedActivities[0].rationale += ' Today is a priority 3 (low priority) event.';
        trainingDay.plannedActivities[0].advice += ' You have a low priority event scheduled for today.';
        if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
          trainingDay.plannedActivities[0].rationale += ' In ' + trainingDay.period + ' period. Goal event is ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          trainingDay.plannedActivities[0].advice += ' However, your next goal event is only ' + trainingDay.daysUntilNextGoalEvent + ' days away.';
          if (trainingDay.daysUntilNextGoalEvent < adviceConstants.priority3EventCutOffThreshold) {
            trainingDay.plannedActivities[0].rationale += ' Recommending skipping.';
            trainingDay.plannedActivities[0].advice += ' You should skip this event.';
          } else {
            trainingDay.plannedActivities[0].rationale += ' Recommending caution.';
            trainingDay.plannedActivities[0].advice += ' Only do this event if you feel certain it will help you prepare for your goal event.';
          }
        } else if (adviceUtil.isTestingDue(user, trainingDay)) {
          trainingDay.plannedActivities[0].rationale += ' Testing is due. Recommending skipping.';
          trainingDay.plannedActivities[0].advice += ' However, testing is due. You should skip this event.';
        } else {
          trainingDay.plannedActivities[0].advice += ' Your primary objective today is to get a quality, race-pace workout. If you feel good go hard but if not, sit in or drop out. Race results are not important. Remember that your future goals are the reason you are riding today.';
          trainingDay.plannedActivities[0].activityType = 'event';
        }
        break;
      case 9:
        trainingDay.plannedActivities[0].rationale += ' Today is a scheduled off day.';
        trainingDay.plannedActivities[0].advice += ' You have scheduled the day off. Enjoy your day.';
        trainingDay.plannedActivities[0].activityType = 'event';
        break;
    }
  }

  return callback(null, user, trainingDay);
};
