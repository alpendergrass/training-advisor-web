'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceUtil = require('../../server/lib/advice-util');

var user, trainingDate, trainingDay;

describe('advice-util Unit Tests:', function () {

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

  describe('Method isTestingDue', function () {
    it('should return true if testing is due', function (done) {
      user.ftpLog[0].ftpDateNumeric = coreUtil.toNumericDate(moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days').toDate());
      (adviceUtil.isTestingDue(user, trainingDay)).should.match(true);
      done();
    });

    it('should return false if testing is not due', function (done) {
      user.ftpLog[0].ftpDateNumeric = coreUtil.toNumericDate(moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days').toDate());
      (adviceUtil.isTestingDue(user, trainingDay)).should.match(false);
      done();
    });

  });

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
