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
  adviceMetrics = require('../../server/lib/advice-metrics'),
  adviceModerate = require('../../server/lib/advice-moderate');

var user, trainingDate, trainingDay;

describe('advice-moderate Unit Tests:', function () {

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

  describe('Method checkModerate', function () {
    it('should return error if no user', function (done) {
      return adviceModerate.checkModerate(null, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceModerate.checkModerate(user, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should not return a recommendation if yesterday was a not a hard day', function (done) {
      var yesterday = moment(trainingDate).subtract(1, 'days');
      var completedActivities = [{
        activityType: 'moderate'
      }];

      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceModerate.checkModerate(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          // console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match('');
          done();
        });
      });
    });

    it('should not return a recommendation if yesterday was a hard day but tomorrow is not a preferred rest day', function (done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      var yesterday = moment(trainingDate).subtract(1, 'days');
      var completedActivities = [{
        activityType: 'simulation'
      }];

      testHelpers.createTrainingDay(user,yesterday, completedActivities, function(err) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        return adviceModerate.checkModerate(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          // console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match('');
          done();
        });
      });
    });

    it('should return moderate if yesterday was a hard day and tomorrow is a preferred rest day', function (done) {
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

            return adviceMetrics.updateMetrics(user, yesterday, function (err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);

              return adviceModerate.checkModerate(user, trainingDay, function (err, user, trainingDay) {
                should.not.exist(err);
                should.exist(user);
                should.exist(trainingDay);
                // console.log('returned trainingDay: ' + trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match(/moderate/);
                (trainingDay.plannedActivities[0].rationale).should.containEql('Yesterday was a hard day. Tomorrow is a preferred rest day.');
                done();
              });
            });
          });
        });
      });
    });
    
    it('should not return a recommendation if yesterday was a hard day and tomorrow is a preferred rest day but we are in peak period', function (done) {
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

            return adviceMetrics.updateMetrics(user, yesterday, function (err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);

              trainingDay.period = 'peak';
              return adviceModerate.checkModerate(user, trainingDay, function (err, user, trainingDay) {
                should.not.exist(err);
                should.exist(user);
                should.exist(trainingDay);
                // console.log('returned trainingDay: ' + trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match('');
                done();
              });
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
