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
  trainingDate,
  trainingDay,
  source = 'advised';

describe('advice-hard Unit Tests:', function () {

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

  describe('Hard Rules', function () {
    it('should return hard recommendation if in t6 period and no other recommendation applies', function (done) {
      trainingDay.period = 't6';
      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/hard/);
        (plannedActivity.rationale).should.containEql('recommending hard ride but load will be smaller');
        done();
      });
    });

    it('should return hard recommendation if in race period and no other recommendation applies', function (done) {
      trainingDay.period = 'race';
      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/hard/);
        (plannedActivity.rationale).should.containEql('recommending hard ride but load will be smaller');
        done();
      });
    });

    it('should return hard recommendation if no other recommendation applies', function (done) {
      return adviceEngine._testGenerateAdvice(user, trainingDay, source, true, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/hard/);
        (plannedActivity.rationale).should.containEql('No other recommendation, so hard');
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