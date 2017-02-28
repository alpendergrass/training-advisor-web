'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  err;

module.exports = {};

module.exports.createUser = function(callback) {
  // let timezone = 'America/Denver';
  // let timezone = 'Europe/Berlin';
  let timezone = 'Australia/Adelaide';
  // 'America/New_York'
  let today = util.getTodayInUserTimezone({ timezone: timezone });
  let ftpLog = [{
    ftp: 250,
    ftpDate: moment(today).subtract(1, 'days'), //by default, let's make testing not due
    ftpDateNumeric: util.toNumericDate(moment(today).subtract(1, 'days').toDate(), { timezone: timezone }),
    ftpSource: 'manual'
  }];

  var user = new User({
    firstName: 'Full',
    lastName: 'Name',
    displayName: 'Full Name',
    email: 'test@test.com',
    provider: 'strava',
    providerData: {},
    username: 'testUsername',
    password: 'M3@n.jsI$Aw3$0m3',
    timezone: timezone,
    ftpLog: ftpLog
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

module.exports.createTrainingDayObject = function(trainingDate, user) {
  var plannedActivities = [],
    plannedMetrics = {
      metricsType: 'planned'
    },
    actualMetrics = {
      metricsType: 'actual',
    },
    metrics = [];

  metrics.push(plannedMetrics);
  metrics.push(actualMetrics);

  plannedActivities[0] = {};
  plannedActivities[0].activityType = '';


  // Normally we get dateNumeric from client-side and use it to populate date.
  // Imitating that here.
  let dateNumeric = util.toNumericDate(trainingDate, user);

  var trainingDay = new TrainingDay({
    date: moment.tz(dateNumeric.toString(), user.timezone).toDate(),
    dateNumeric: dateNumeric,
    name: 'Incoming trainingDay',
    plannedActivities: plannedActivities,
    metrics: metrics,
    user: user
  });

  return trainingDay;
};

module.exports.createStartingPoint = function(user, trainingDate, daysBack, fitness, fatigue, callback) {
  var computedDate = moment(trainingDate).subtract(daysBack, 'days'),
    trainingDay = this.createTrainingDayObject(computedDate, user),
    actualMetrics = _.find(trainingDay.metrics, ['metricsType', 'actual']),
    plannedMetrics = _.find(trainingDay.metrics, ['metricsType', 'planned']);

  trainingDay.name = 'Starting point trainingDay';
  trainingDay.startingPoint = true;
  actualMetrics.fitness = fitness;
  actualMetrics.fatigue = fatigue;
  plannedMetrics.fitness = fitness;
  plannedMetrics.fatigue = fatigue;

  trainingDay.save(function (err) {
    if (err) {
      console.log('createStartingPoint save error: ' + err);
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
};

module.exports.createGoalEvent = function(user, trainingDate, daysForward, callback) {
  var computedDate = moment(trainingDate).add(daysForward, 'days'),
    trainingDay = this.createTrainingDayObject(computedDate, user);

  trainingDay.name = 'Goal trainingDay';
  trainingDay.scheduledEventRanking = 1;
  trainingDay.estimatedLoad = 567;

  trainingDay.save(function (err) {
    if (err) {
      console.log('createGoalEvent save error: ' + err);
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
};

module.exports.createTrainingDay = function(user, aDate, completedActivities, callback) {
  var trainingDay = this.createTrainingDayObject(moment(aDate), user);

  trainingDay.name = 'Existing trainingDay';
  trainingDay.completedActivities = completedActivities || [];
  trainingDay.plannedActivities = [];

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

