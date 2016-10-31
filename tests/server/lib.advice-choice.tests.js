'use strict';


var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceEngine = require('../../server/lib/advice-engine');

var user, trainingDate, trainingDay;

describe('advice-choice Unit Tests:', function () {

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

  describe('Choice Rules', function () {
    it('should return choice recommendation if in transition period', function (done) {
      trainingDay.period = 'transition';
      return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/choice/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('Is transition period, user can slack off');
        done();
      });
    });

    it('should not return choice recommendation if not in transition period', function (done) {
      trainingDay.period = 'base';
      return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.not.match(/choice/);
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
