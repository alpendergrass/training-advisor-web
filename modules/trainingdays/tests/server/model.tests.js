'use strict';


var should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require('./util/test-helpers');

/**
 * Globals
 */
var user,
  trainingDate,
  trainingDay;

/**
 * Unit tests
 */
describe('TrainingDay Model Unit Tests:', function () {

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

  describe('Method Save', function () {
    it('should be able to save without problems', function (done) {
      trainingDay.save(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should be able to show an error when try to save without date', function (done) {
      trainingDay.date = null;

      trainingDay.save(function (err) {
        should.exist(err);
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
