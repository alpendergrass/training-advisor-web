'use strict';

var moment = require('moment'),
  // _ = require('lodash'),
  // mongoose = require('mongoose'),
  // TrainingDay = mongoose.model('TrainingDay'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.isTestingDue = function(user, trainingDay, callback) {
  var now = moment(trainingDay.date).startOf('day');
  var testDate = moment(user.thresholdPowerTestDate).startOf('day');
  var howLong = now.diff(testDate, 'days');
  return callback(null, howLong >= adviceConstants.testingNagDayCount);
};
