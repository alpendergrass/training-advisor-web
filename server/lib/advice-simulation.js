'use strict';
var _ = require('lodash');

var rules = [
  {
    //Trello: we should check our TSB to make sure it is not too low to handle this.
    'name': 'simulationIfPreferredSimulationDayInBuildRule',
    'condition': function(R) {
      R.when(this && !this.plannedActivity.activityType &&
        (this.trainingDay.period === 't4' || this.trainingDay.period === 't5') &&
        (this.trainingDay.user.preferredSimulationDay && this.trainingDay.user.preferredSimulationDay === this.todayDayOfWeek)
      );
    },
    'consequence': function(R) {
      this.plannedActivity.activityType = 'simulation';
      this.plannedActivity.rationale += ' We are in a build period, we are sufficiently rested and today is our preferred simulation day.';
      this.plannedActivity.advice += ' Today is your preferred simulation day, so do a ride similar to your goal event.';
      R.stop();
    }
  // Trello: re-implement simulation overdue rule.
  // function isSimulationOverdue(today, trainingDay, callback) {
  //   //Assuming our training date is today,
  //   //have we not done a race simulation in the last seven days (?)
  //   var aWeekAgo = moment(today).subtract(7, 'days');

  //   var countQuery = TrainingDay
  //     .where('date').gte(aWeekAgo).lt(today)
  //     .where('completedActivities.activityType').in(['simulation'])
  //     .count();

  //   countQuery.exec(function (err, count) {
  //     if (err) {
  //       return callback(err, null);
  //     }

  //     if (count < 1) {
  //       this.plannedActivity.rationale += ' Simulation is overdue.';
  //     }

  //     return callback(null, count < 1);
  //   });
  // }
  }
];

module.exports = {};

module.exports.simulationRules = rules;
