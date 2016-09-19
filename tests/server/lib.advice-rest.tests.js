'use strict';


var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceRest = require('../../server/lib/advice-rest');

var user, trainingDate, trainingDay;

describe('advice-rest Unit Tests:', function () {

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

  describe('Method checkRest', function () {
    it('should return error if no user', function (done) {
      return adviceRest.checkRest(null, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceRest.checkRest(user, null, function (err, user, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should return rest if today is a preferred rest day', function (done) {
      user.preferredRestDays = [moment(trainingDate).day().toString()];

      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('Is a preferred rest day');
        done();
      });
    });
    
    it('should not return rest if today is not a preferred rest day, testing is not overdue and not overly fatigued', function (done) {
      user.preferredRestDays = [moment(trainingDate).add(1, 'days').day().toString()];
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');
      trainingDay.form = adviceConstants.restNeededThreshold + 0.1;
    
      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.not.match(/rest/);
        done();
      });
    });
    
    it('should return rest if overly fatigued', function (done) {
      trainingDay.form = adviceConstants.restNeededThreshold;
      
      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('Sufficiently fatigued to recommend rest');
        done();
      });
    });
    
    it('should return rest if overly fatigued for peak period', function (done) {
      trainingDay.form = adviceConstants.restNeededForPeakingThreshold;
      trainingDay.period = 'peak';
    
      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('Sufficiently fatigued to recommend rest');
        done();
      });
    });
    
    it('should return no recommendation if testing is not due and not overly fatigued', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');
      trainingDay.form = adviceConstants.restNeededThreshold + 0.1;

      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        done();
      });
    });

    it('should return rest recommendation if testing is due and somewhat fatigued', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.restNeededForTestingThreshold;

      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
        (trainingDay.plannedActivities[0].rationale).should.containEql('Rest recommended in preparation for testing');
        done();
      });
    });

    it('should return no recommendation if testing is due and somewhat fatigued but in peak period', function (done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      trainingDay.form = adviceConstants.restNeededForTestingThreshold;
      trainingDay.period = 'peak';

      return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
        should.not.exist(err);
        should.exist(user);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match('');
        done();
      });
    });

    it('should return rest recommendation if goal event is in two days', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextGoalEvent = 2;

        return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          //console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('goal event is in two days');
          done();
        });
      });
    });

    it('should return rest recommendation if priority 2 event is in one day', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextPriority2Event = 1;

        return adviceRest.checkRest(user, trainingDay, function (err, user, trainingDay) {
          should.not.exist(err);
          should.exist(user);
          should.exist(trainingDay);
          //console.log('returned trainingDay: ' + trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/rest/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('priority 2 event is in one day');
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
