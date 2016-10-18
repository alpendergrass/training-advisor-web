'use strict';

var rules = [{
  //Trello: we should check our TSB to make sure it is not too low to handle this.
  'name': 'simulationIfPreferredSimulationDayInBuildRule',
  'condition': function(R) {
    R.when(this && this.trainingDay.period === 'build' &&
      (this.trainingDay.user.preferredSimulationDay && this.trainingDay.user.preferredSimulationDay === this.todayDayOfWeek)
    );
  },
  'consequence': function(R) {
    this.trainingDay.plannedActivities[0].activityType = 'simulation';
    this.trainingDay.plannedActivities[0].rationale += ' We are in a build period, we are sufficiently rested and today is our preferred simulation day.';
    this.trainingDay.plannedActivities[0].advice += ' Today is your preferred simulation day, so do a ride similar to your goal event.';
    R.stop();
  }
// Trello: re-implement simulation overdue rule.
// function isSimulationOverdue(today, trainingDay, callback) {
//   //Assuming our training date is today,
//   //have we not done a race simulation in the last seven days (?)
//   var aWeekAgo = moment.tz(today, timezone).subtract(7, 'days');

//   var countQuery = TrainingDay
//     .where('date').gte(aWeekAgo).lt(today)
//     .where('completedActivities.activityType').in(['simulation'])
//     .count();

//   countQuery.exec(function (err, count) {
//     if (err) {
//       return callback(err, null);
//     }

//     if (count < 1) {
//       trainingDay.plannedActivities[0].rationale += ' Simulation is overdue.';
//     }

//     return callback(null, count < 1);
//   });
// }
}];

module.exports = {};

module.exports.simulationRules = rules;
