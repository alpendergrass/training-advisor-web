'use strict';
var _ = require('lodash');

var rules = [
  {
    'name': 't1EnduranceRule',
    //'priority': -9,
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.period === 't1' &&
        _.includes(['hard', 'moderate'], this.plannedActivity.activityType)
        // (this.testingIsDue)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.advice += ` You should do a long endurance ride today as you appear to be sufficiently rested.
 Most of your time should be spent in power zone 2. Intensity will be low but if you hit your target load you will be fatigued after this ride.
 During your ride you should periodically increase your cadence beyond your normal confort range. Learing to spin a higher cadence will make
 you a more efficient cyclist.`;
      R.stop();
    }
  }
];

module.exports = {};

module.exports.t1Rules = rules;
