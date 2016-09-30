'use strict';

var moment = require('moment'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.isTestingDue = function(user, trainingDay) {
  var now = moment(trainingDay.date);
  var testDate = moment(user.thresholdPowerTestDate);
  var howLong = now.diff(testDate, 'days');
  return howLong >= adviceConstants.testingNagDayCount;
};
