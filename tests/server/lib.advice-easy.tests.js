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
  adviceEasy = require('../../server/lib/advice-easy');

var user, trainingDate, trainingDay;

describe('advice-easy Unit Tests:', function () {

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

  describe('Method checkEasy', function () {
    it('should return error if no user', function (done) {
      return adviceEasy.checkEasy(null, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceEasy.checkEasy(user, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should return easy if yesterday was a hard day, form is below easy day threshold and tomorrow is a not preferred rest day', function (done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
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
              //we have to update metrics in order for yesrday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);
              trainingDay.form = adviceConstants.easyDaytNeededThreshold;

              return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
                should.not.exist(err);
                should.exist(user);
                should.exist(trainingDay);
                //console.log('returned trainingDay: ' + trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
                done();
              });
            });
          });
        });
      });
    });

    it('should not return easy if yesterday was a hard day and tomorrow is a not preferred rest day but form is above easy day threshold', function (done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
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
              //we have to update metrics in order for yesrday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);
              trainingDay.form = adviceConstants.easyDaytNeededThreshold + 1;

              return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
                should.not.exist(err);
                should.exist(user);
                should.exist(trainingDay);
                //console.log('returned trainingDay: ' + trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match('');
                done();
              });
            });
          });
        });
      });
    });

    it('should return easy if yesterday was a hard day and we are peaking', function (done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
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
              //we have to update metrics in order for yesrday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);
              trainingDay.period = 'peak';

              return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
                should.not.exist(err);
                should.exist(user);
                should.exist(trainingDay);
                //console.log('returned trainingDay: ' + trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
                done();
              });
            });
          });
        });
      });
    });

    it('should return easy recommendation if testing is due and somewhat fatigued', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.testingEligibleFormThreshold;

      return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
        done();
      });
    });

    it('should return easy recommendation if goal event is in less than 4 days', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextGoalEvent = 3;

        return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          //console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('goal event is in the next three days');
          done();
        });
      });
    });

    it('should return easy recommendation if priority 2 event is in two days', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextPriority2Event = 2;

        return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          //console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('priority 2 event is in two days');
          done();
        });
      });
    });

    it('should return easy recommendation if priority 3 event is in one day', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextPriority3Event = 1;

        return adviceEasy.checkEasy(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          //console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('priority 3 event is in one day');
          done();
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
