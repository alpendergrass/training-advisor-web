'use strict';
var _ = require('lodash');

// Rule priority guide:
// Event priorities are 90 - 99.
// Test: 80 - 89.
// Default: 70 - 79, 1 for catch-all load rule.
// By period activityType rules: 2 - 9.
// Rule priority only applies if ALL rules have (non-zero) priority. Done.

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
      this.plannedActivity.advice += ' Today is one of your planned rest days, so rest. Put your feet up. Recovery is when your body becomes stronger.';
      R.stop();
    }
  },
  {
    'name': 'defaultLoadIsRestRule',
    'priority': 1,
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'rest';
      this.plannedActivity.rationale += ' defaultLoadIsRestRule.';
      this.plannedActivity.advice += ` You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.
      The focus of this workout is recovery. Recovery is essential to supercompensation, the process by which you become stronger.`;
      R.stop();
    }
  },
  {
    'name': 'defaultEasyAdviceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType &&
       this.plannedActivity.activityType === 'easy'
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
    'name': 'enduranceIsDefaultAdviceRule',
    'priority': -99,
    'condition': function(R) {
      R.when(this && this.plannedActivity.activityType);
    },
    'consequence': function(R) {
      this.plannedActivity.rationale += ' enduranceIsDefaultAdviceRule.';
      this.plannedActivity.advice += ` You should do an endurance (power zone 2) ride today.
 Focus on keeping your pace steady and and your cadence high.
 Your goal is to build a strong, efficient foundation for future higher intensity efforts.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.defaultRules = rules;
