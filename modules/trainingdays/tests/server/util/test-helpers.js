'use strict';

var moment = require('moment'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  err;

module.exports = {};

module.exports.createUser = function(callback) {
  var user = new User({
    firstName: 'Full',
    lastName: 'Name',
    displayName: 'Full Name',
    email: 'test@test.com',
    provider: 'strava',
    username: 'testUsername',
    password: 'M3@n.jsI$Aw3$0m3',
    thresholdPower: 250,
    thresholdPowerTestDate: moment().subtract(1, 'days') //by default, let's make testing not due
  });

  user.save(function (err) {
    if (err) {
      console.log('user.save error: ' + err);
      User.remove();
      return callback(err, null);
    }

    return callback(null, user);
  });
};

module.exports.updateUser = function(user, callback) {
  user.save(function (err) {
    if (err) {
      console.log('user.save error: ' + err);
      User.remove();
      return callback(err, null);
    }

    return callback(null, user);
  });
};

module.exports.createStartingPoint = function(user, trainingDate, daysBack, fitness, fatigue, callback) {
  var trainingDay = new TrainingDay({
    date: moment(trainingDate).subtract(daysBack, 'days'),
    name: 'Starting point trainingDay',
    startingPoint: true,
    fitness: fitness,
    fatigue: fatigue,
    user: user
  });

  trainingDay.save(function (err) {
    if (err) {
      console.log('createStartingPoint save error: ' + err);
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
};

module.exports.createGoalEvent = function(user, trainingDate, daysForward, callback) {
  var trainingDay = new TrainingDay({
    date: moment(trainingDate).add(daysForward, 'days'),
    name: 'Goal trainingDay',
    eventPriority: 1,
    estimatedGoalLoad: 567,
    user: user
  });

  trainingDay.save(function (err) {
    if (err) {
      console.log('createGoalEvent save error: ' + err);
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
};

module.exports.createTrainingDayObject = function(trainingDate, user) {
  var plannedActivities = [];
  plannedActivities[0] = {};
  plannedActivities[0].activityType = '';
  
  var trainingDay = new TrainingDay({
    date: trainingDate,
    name: 'Incoming trainingDay',
    plannedActivities: plannedActivities,
    user: user
  });

  return trainingDay;
};

module.exports.createTrainingDay = function(user, aDate, completedActivities, callback) {
  var trainingDay = new TrainingDay({
    date: moment(aDate),
    name: 'Existing trainingDay',
    completedActivities: completedActivities || [],
    user: user
  });

  trainingDay.save(function (err) {
    if (err) {
      console.log('createTrainingDay save error: ' + err);
      return callback(err, null);
    }
    return callback(null, trainingDay);
  });
};

module.exports.updateTrainingDay = function(trainingDay, callback) {
  trainingDay.save(function (err) {
    if (err) {
      console.log('updateTrainingDay save error: ' + err);
      return callback(err);
    }
    return callback(null);
  });
};

module.exports.getTrainingDay = function(id, callback) {
  TrainingDay.findById(id).populate('user').exec(function (err, trainingDay) {
    if (err) {
      console.log('getTrainingDay findById error: ' + err);
      return callback(err, null);
    } 

    return callback(null, trainingDay); 
  });
}; 

