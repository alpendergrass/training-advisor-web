'use strict';


var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceTest = require('../../server/lib/advice-test');

var user, trainingDate, trainingDay;

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

  describe('Method checkTest', function () {
    it('should return error if no user', function (done) {
      return adviceTest.checkTest(null, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceTest.checkTest(user, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should return no recommendation if testing is not due', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');

      return adviceTest.checkTest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        done();
      });
    });

    it('should not return a recommendation if testing is due but form is not recovered', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.testingEligibleFormThreshold;

      return adviceTest.checkTest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        // console.log('returned trainingDay: ' + trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        (trainingDay.plannedActivities[0].rationale).should.containEql('Testing is due');
        done();
      });
    });

    it('should return test recommendation if testing is due and form is recovered', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.testingEligibleFormThreshold + 0.1;

      return adviceTest.checkTest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/test/);
        done();
      });
    });
    
    it('should return no recommendation if testing is due and form is recovered but in peak period', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.testingEligibleFormThreshold + 0.1;
      trainingDay.period = 'peak';

      return adviceTest.checkTest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
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
