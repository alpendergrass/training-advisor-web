'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
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
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');

      return adviceUtil.isTestingDue(user, trainingDay, function (err, testingIsDue) {
        if (err) {
          console.log('isTestingDue: ' + err);
        }

        should.not.exist(err);
        (testingIsDue).should.match(true);
        done();
      });
    });

    it('should return false if testing is not due', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');

      return adviceUtil.isTestingDue(user, trainingDay, function (err, testingIsDue) {
        if (err) {
          console.log('isTestingDue: ' + err);
        }

        should.not.exist(err);
        (testingIsDue).should.match(false);
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
