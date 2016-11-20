'use strict';

var _ = require('lodash'),
  moment = require('moment'),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.isTestingDue = function(user, trainingDay) {
  if (_.includes(['t0', 't6', 'race'], trainingDay.period)) {
    return false;
  }

  var now = moment(trainingDay.dateNumeric.toString());
  var testDate = moment(user.thresholdPowerTestDate);
  var howLong = now.diff(testDate, 'days');
  return howLong >= adviceConstants.testingNagDayCount;
};
