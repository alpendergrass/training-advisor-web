'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't2TempoRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't2' &&
        //TODO: need to increase occurrence of moderate workouts in t1, 2.
        _.includes(['moderate'], this.plannedActivity.activityType)
        // (this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` Tempo
 baby.`;
      R.stop();
    }
  },
  {
    'name': 't2EnduranceRule',
    'priority': -1,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't2' &&
        _.includes(['hard'], this.plannedActivity.activityType)
        // (this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You appear to be sufficiently rested to do a long endurance ride today. This is the time of the season to build your base.
 Focus on keeping your cadence high but your effort light. You should target power zone 2.
 The effort is low but you will be fatigued after this ride if you hit your target load.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t2Rules = rules;
