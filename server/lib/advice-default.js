'use strict';
var _ = require('lodash');


var rules = [
  {
    'name': 'preferredRestDayRule',
    'priority': 77,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.trainingDay.scheduledEventRanking === 0 &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.todayDayOfWeek) > -1)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' preferredRestDayRule.';
      this.plannedActivity.advice += ' Today is one of your planned rest days, so rest. Put your feet up.';
      R.stop();
    }
  },
  {
    'name': 'defaultRestRule',
    'priority': 75,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.metrics.form <= this.adviceConstants.restDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' defaultRestRule.';
      this.plannedActivity.advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin. The focus of this workout is recovery.';
      R.stop();
    }
  },
  {
    'name': 'defaultEasyRule',
    'priority': 73,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        this.metrics.form <= this.adviceConstants.easyDayThreshold
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'easy';
      this.plannedActivity.rationale += ' defaultEasyRule.';
      this.plannedActivity.advice += ` Your form suggests you go easy today. You should do a easy endurance ride today.
 Easy endurance means you should target lower power zone 2 but if you feel tired, make this a zone 1 recovery ride.
 When in doubt, go easy. Recovery is what enables you to go faster and farther when it is time to go hard again.`;
      R.stop();
    }
  },
  {
    'name': 'hardIsDefaultRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType);
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'hard';
      this.plannedActivity.rationale += ' hardIsDefaultRule.';
      this.plannedActivity.advice += ` hard
 dude.`;
      R.next();
    }
  }
];

module.exports = {};

module.exports.defaultRules = rules;
