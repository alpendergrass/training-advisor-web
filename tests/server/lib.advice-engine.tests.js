'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceEngine = require('../../server/lib/advice-engine');

var user, trainingDay, trainingDate, params;

describe('advice-engine Unit Tests:', function () {

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      params = {};
      params.user = user;
      params.source = 'advised';
      params.selectNewWorkout = true;

      trainingDate = new Date();
      params.numericDate = util.toNumericDate(trainingDate);

      done();
    });
  });

  describe('Method advise', function () {
    it('should return error if no user', function (done) {
      params.user = null;

      return adviceEngine.advise(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('valid user is required');
        done();
      });
    });

    it('should return error if no adviceDate', function (done) {
      params.numericDate = null;

      return adviceEngine.advise(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('numericDate is required');
        done();
      });
    });

    it('should return error if invalid adviceDate', function (done) {
      params.numericDate = 'notAValidDate';

      return adviceEngine.advise(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return error if start day does not exist', function (done) {

      return adviceEngine.advise(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('Starting date for current training period was not found.');
        done();
      });
    });

    it('should not return error if no goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceEngine.advise(params, function (err, trainingDay) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should return recommendation if start and goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 30, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 30, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return adviceEngine.advise(params, function (err, trainingDay) {
            should.not.exist(err);
            let plannedActivity = util.getPlannedActivity(trainingDay, params.source);
            (plannedActivity.activityType).should.not.match('');
            (plannedActivity.source).should.match('advised');
            (plannedActivity.targetMinLoad).should.be.above(0);
            done();
          });
        });
      });
    });

    it('should return requested activity with load if specific activity is requested', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          params.alternateActivity = 'hard';
          params.source = 'requested';

          return adviceEngine.advise(params, function (err, trainingDay) {
            should.not.exist(err);
            let plannedActivity = util.getPlannedActivity(trainingDay, params.source);
            (plannedActivity.activityType).should.match(params.alternateActivity);
            (plannedActivity.source).should.match('requested');
            (plannedActivity.targetMinLoad).should.be.above(0);
            // console.log('trainingDay:' + trainingDay);
            done();
          });
        });
      });
    });

    it('should return requested activity if specific activity is requested after advice has been given', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          adviceEngine.advise(params, function (err, trainingDay) {

            params.alternateActivity = 'moderate';
            params.source = 'requested';

            return adviceEngine.advise(params, function (err, trainingDay) {
              // console.log('trainingDay:' + trainingDay);
              should.not.exist(err);
              let plannedActivity = util.getPlannedActivity(trainingDay, params.source);
              (plannedActivity.activityType).should.match(params.alternateActivity);
              (plannedActivity.source).should.match('requested');
              (plannedActivity.targetMinLoad).should.be.above(0);
              done();
            });
          });
        });
      });
    });

  });

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
