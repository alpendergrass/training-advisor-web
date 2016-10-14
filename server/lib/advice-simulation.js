'use strict';


var moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceConstants = require('./advice-constants'),
  err;

var rules = [{
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
}];

module.exports = {};

module.exports.simulationRules = rules;

module.exports.checkSimulation = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== '') {
    return callback(null, user, trainingDay);
  }

  if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
    //No simulations when peaking or racing.
    return callback(null, user, trainingDay);
  }

  shouldWeDoSimulation(user, trainingDay, function(err, shouldSimulate) {
    if (err) {
      return callback(err, null, null);
    }

    if (shouldSimulate) {
      trainingDay.plannedActivities[0].activityType = 'simulation';
    }

    return callback(null, user, trainingDay);
  });
};

function shouldWeDoSimulation(user, trainingDay, callback) {
  //Are we in a build period and is it the preferred day for a
  //simulation (if preference set)?
  //or have we not done a race simulation in the last seven days (?)?
  //TODO: we should not rely on the user telling us if they did a simulation.
  //we should figure out how to classify a workout as a simulation.
  //TODO: we should check our TSB to make sure it is not too low to handle this.

  //We have to convert trainingDay.date to user local time first to get the right day of the week.
  var todayDayOfWeek = moment.tz(trainingDay.date, user.timezone).day().toString();

  if (trainingDay.period === 'build') {
    trainingDay.plannedActivities[0].rationale += ' We are in a build period.';
    if (user.preferredSimulationDay && user.preferredSimulationDay === todayDayOfWeek) {
      trainingDay.plannedActivities[0].rationale += ' Today is our preferred simulation day.';
      trainingDay.plannedActivities[0].advice += ' Today is your preferred simulation day, so do a ride similar to your goal event.';
      return callback(null, true);
    } else {
      trainingDay.plannedActivities[0].rationale += ' Today is not our preferred simulation day.';
    }

    // TODO: re-implement simulation overdue rule.
    //else {
    //   isSimulationOverdue(today, trainingDay, function(err, simulationOverdue) {
    //     if (err) {
    //       return callback(err, null);
    //     }

    //     if (simulationOverdue){
    //       trainingDay.plannedActivities[0].rationale += ' Simulation is overdue.';
    //     }

    //     return callback(null, simulationOverdue);
    //   });
    // }
  } else {
    trainingDay.plannedActivities[0].rationale += ' We are not in a build period.';
  }

  return callback(null, false);
}

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
//       trainingDay.plannedActivities[0].rationale += ' Simulation is overdue.';
//     }

//     return callback(null, count < 1);
//   });
// }
