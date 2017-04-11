'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceEngine = require('../../server/lib/advice-engine');

var user,
  source = 'advised',
  trainingDate,
  trainingDay;

describe('advice-test Unit Tests:', function () {
  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
  });

  describe('Test Rules', function () {
    it('should not return test recommendation if testing is not due', function (done) {
      user.ftpLog[0].ftpDateNumeric = util.toNumericDate(moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days').toDate())

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.not.match('test');
        done();
      });
    });

    it('should return test recommendation if testing is due and form is recovered', function (done) {
      user.ftpLog[0].ftpDateNumeric = util.toNumericDate(moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days').toDate())
      trainingDay.form = adviceConstants.testingEligibleFormThreshold + 0.1;

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/test/);
        done();
      });
    });

    it('should not return test recommendation if testing is due and form is recovered but in t6 period', function (done) {
      user.ftpLog[0].ftpDateNumeric = util.toNumericDate(moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days').toDate())
      trainingDay.form = adviceConstants.testingEligibleFormThreshold + 0.1;
      trainingDay.period = 't6';

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.not.match('test');
        done();
      });
    });

  });

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
