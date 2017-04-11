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

  if (!user.ftpLog || user.ftpLog.length < 1) {
    // We should have at least one ftp but possibly not.
    return false;
  }

  var now = moment(trainingDay.dateNumeric.toString());
  var testDate = moment(user.ftpLog[0].ftpDateNumeric.toString()).toDate(); //first ftp should be most recent.
  var howLong = now.diff(testDate, 'days');
  return howLong >= adviceConstants.testingNagDayCount;
};
