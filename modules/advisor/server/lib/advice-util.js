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
    // TODO: should we return true here?
    return false;
  }

  var now = moment(trainingDay.dateNumeric.toString());
  var testDate = moment(user.ftpLog[0].ftpDateNumeric.toString()).toDate(); //first ftp should be most recent.
  var howLongSinceLastTest = now.diff(testDate, 'days');

  if (howLongSinceLastTest < adviceConstants.testingNagDayCount) {
    return false;
  }

  // If no last recommendation date is set, recommend testing.
  if (!user.lastTestRecommendationDateNumeric) {
    return true;
  }

  // If last recommendation date is same as trainingDay date, we are reprocessing a day so re-recommend testing.
  if (user.lastTestRecommendationDateNumeric === trainingDay.dateNumeric) {
    return true;
  }

  var recommendationDate = moment(user.lastTestRecommendationDateNumeric.toString());
  var howLongSinceLastRecommendation = now.diff(recommendationDate, 'days');
  // Allow test recommendation to repeat twice.
  return howLongSinceLastRecommendation >= adviceConstants.testingNagDayCount - 2;
};
