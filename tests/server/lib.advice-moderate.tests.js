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
  adviceMetrics = require('../../server/lib/advice-metrics'),
  adviceEngine = require('../../server/lib/advice-engine');

var user,
  trainingDate,
  trainingDay,
  source = 'advised',
  params = {};

describe('advice-moderate Unit Tests:', function() {

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      params.user = user;
      params.metricsType = 'actual';
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
  });

  describe('Moderate Tests', function() {
    it('should not return moderate if yesterday was a not a hard day', function(done) {
      var yesterday = moment(trainingDate).subtract(1, 'days');
      var completedActivities = [{
        activityType: 'moderate'
      }];

      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.activityType).should.not.match(/moderate/);
          done();
        });
      });
    });

    it('should not return moderate if yesterday was a hard day but tomorrow is not a preferred rest day', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      var yesterday = moment(trainingDate).subtract(1, 'days');
      var completedActivities = [{
        activityType: 'simulation'
      }];

      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.activityType).should.not.match(/moderate/);
          done();
        });
      });
    });

    it('should return moderate if yesterday was a hard day and tomorrow is a preferred rest day', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(1, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, 60, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 60, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var yesterday = moment(trainingDate).subtract(1, 'days');
          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            params.numericDate = dbUtil.toNumericDate(yesterday);

            return adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }

              return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
                should.not.exist(err);
                should.exist(trainingDay);
                let plannedActivity = util.getPlannedActivity(trainingDay, source);
                (plannedActivity.activityType).should.match(/moderate/);
                (plannedActivity.rationale).should.containEql('Yesterday was a hard day, tomorrow is a preferred rest day');
                done();
              });
            });
          });
        });
      });
    });

    it('should not return moderate if yesterday was a hard day and tomorrow is a preferred rest day but we are in peak period', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(1, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 2, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var yesterday = moment(trainingDate).subtract(1, 'days');
          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            params.numericDate = dbUtil.toNumericDate(yesterday);

            return adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }

              trainingDay.period = 'peak';
              return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
                should.not.exist(err);
                should.exist(trainingDay);
                let plannedActivity = util.getPlannedActivity(trainingDay, source);
                (plannedActivity.activityType).should.not.match(/moderate/);
                done();
              });
            });
          });
        });
      });
    });

  });

  afterEach(function(done) {
    TrainingDay.remove().exec(function() {
      User.remove().exec(done);
    });
  });
});
