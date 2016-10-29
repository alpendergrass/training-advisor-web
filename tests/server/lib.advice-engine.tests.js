'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
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
      params.metricsType = 'actual';

      trainingDate = new Date().toISOString();
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
      params.numericDate = dbUtil.toNumericDate(trainingDate);

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

        params.numericDate = dbUtil.toNumericDate(trainingDate);

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

          params.numericDate = dbUtil.toNumericDate(trainingDate);

          return adviceEngine.advise(params, function (err, trainingDay) {
            should.not.exist(err);
            (trainingDay.plannedActivities[0].activityType).should.not.match('');
            (trainingDay.plannedActivities[0].source).should.match('advised');
            (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(0);
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

          params.numericDate = dbUtil.toNumericDate(trainingDate);
          params.alternateActivity = 'hard';

          return adviceEngine.advise(params, function (err, trainingDay) {
            should.not.exist(err);
            (trainingDay.plannedActivities[0].activityType).should.match(params.alternateActivity);
            (trainingDay.plannedActivities[0].source).should.match('requested');
            (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(0);
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

          params.numericDate = dbUtil.toNumericDate(trainingDate);

          adviceEngine.advise(params, function (err, trainingDay) {
            params.alternateActivity = 'moderate';
            return adviceEngine.advise(params, function (err, trainingDay) {
              // console.log('trainingDay:' + trainingDay);
              should.not.exist(err);
              (trainingDay.plannedActivities[1].activityType).should.match(params.alternateActivity);
              (trainingDay.plannedActivities[1].source).should.match('requested');
              (trainingDay.plannedActivities[1].targetMinLoad).should.be.above(0);
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
