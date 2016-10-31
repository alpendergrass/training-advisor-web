'use strict';

var path = require('path'),
  _ = require('lodash'),
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
  source = 'advised',
  metrics;

describe('advice-rest Unit Tests:', function() {

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
      done();
    });
  });

  describe('Rest Rules', function() {
    it('should return rest if today is a preferred rest day', function(done) {
      user.preferredRestDays = [moment(trainingDate).day().toString()];

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/rest/);
        (plannedActivity.rationale).should.containEql('preferred rest day');
        done();
      });
    });

    it('should not return rest if today is not a preferred rest day, testing is not overdue and not overly fatigued', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(1, 'days').day().toString()];
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');
      metrics.form = adviceConstants.restNeededThreshold + 0.1;

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.not.match(/rest/);
        done();
      });
    });

    it('should return rest if overly fatigued', function(done) {
      metrics.form = adviceConstants.restNeededThreshold;

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/rest/);
        (plannedActivity.rationale).should.containEql('Sufficiently fatigued to recommend rest');
        done();
      });
    });

    it('should return rest if overly fatigued for peak period', function(done) {
      metrics.form = adviceConstants.restNeededForPeakingThreshold;
      trainingDay.period = 'peak';

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/rest/);
        (plannedActivity.rationale).should.containEql('Sufficiently fatigued to recommend rest');
        done();
      });
    });

    it('should not return rest if testing is not due and not overly fatigued', function(done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract((adviceConstants.testingNagDayCount - 1), 'days');
      metrics.form = adviceConstants.restNeededThreshold + 0.1;

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.not.match(/rest/);
        done();
      });
    });

    it('should return rest recommendation if testing is due and somewhat fatigued', function(done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      metrics.form = adviceConstants.restNeededForTestingThreshold;

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.match(/rest/);
        (plannedActivity.rationale).should.containEql('Rest recommended in preparation for testing');
        done();
      });
    });

    it('should not return rest if testing is due and somewhat fatigued but in peak period', function(done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      metrics.form = adviceConstants.restNeededForTestingThreshold;
      trainingDay.period = 'peak';

      return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.activityType).should.not.match(/rest/);
        done();
      });
    });

    it('should return rest recommendation if goal event is in two days', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        trainingDay.daysUntilNextGoalEvent = 2;

        return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.activityType).should.match(/rest/);
          (plannedActivity.rationale).should.containEql('goal event is in two days');
          done();
        });
      });
    });

    it('should return rest recommendation if priority 2 event is in one day', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        trainingDay.daysUntilNextPriority2Event = 1;

        return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.activityType).should.match(/rest/);
          (plannedActivity.rationale).should.containEql('priority 2 event is in one day');
          done();
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
