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
  adviceLoad = require('../../server/lib/advice-load');

var user,
  trainingDate,
  trainingDay,
  plannedActivity,
  metrics,
  source = 'advised',
  lowLoadFactorEasy = 0.30,
  highLoadFactorEasy = 0.60,
  lowLoadFactorModerate = 1.0,
  highLoadFactorModerate = 1.2,
  lowLoadFactorHard = 1.9,
  highLoadFactorHard = 2.1,
  lowLoadFactorGoal = 2.5,
  highLoadFactorGoal = 2.5;

describe('advice-load Unit Tests:', function() {

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      plannedActivity = util.getPlannedActivity(trainingDay, source);
      metrics = util.getMetrics(trainingDay, 'actual');
      done();
    });
  });

  describe('Method setLoadRecommendations', function() {
    it('should return error if no user', function(done) {
      return adviceLoad.setLoadRecommendations(null, null, 'advised', function(err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });

    it('should return error if no trainingDay', function(done) {
      return adviceLoad.setLoadRecommendations(user, null, 'advised', function(err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    // it('should return estimatedLoad for target loads if this is an event day and estimate is provided', function(done) {
    //   plannedActivity.activityType = 'event';
    //   trainingDay.estimatedLoad = 234;
    //   trainingDay.scheduledEventRanking = 2;

    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 5;
    //   metrics.sevenDayRampRate = 6;

    //   return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
    //     should.not.exist(err);
    //     should.exist(trainingDay);
    //     let plannedActivity = util.getPlannedActivity(trainingDay, source);
    //     (plannedActivity.targetMinLoad).should.equal(234);
    //     (plannedActivity.targetMaxLoad).should.equal(234);
    //     done();
    //   });
    // });

    it('should return computed target loads if this is an event day but no estimate is provided', function(done) {
      trainingDay.scheduledEventRanking = 1;
      plannedActivity.activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorGoal);
        (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorGoal);
        done();
      });
    });

    it('should return target loads of zero if this is a user-scheduled off day', function(done) {
      trainingDay.scheduledEventRanking = 9; //off day
      plannedActivity.activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.targetMinLoad).should.equal(0);
        (plannedActivity.targetMaxLoad).should.equal(0);
        done();
      });
    });

    it('should return estimatedLoad from goal event +/- 5% for target loads if recommending simulation', function(done) {
      testHelpers.createGoalEvent(user, new Date(), 2, function(err) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        plannedActivity.activityType = 'simulation';

        metrics.targetAvgDailyLoad = 100;
        metrics.sevenDayTargetRampRate = 5;
        metrics.sevenDayRampRate = 6;

        return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(Math.round(567 * 0.95));
          (plannedActivity.targetMaxLoad).should.equal(Math.round(567 * 1.05));
          done();
        });
      });
    });

    it('should return unadjusted recommendation regardless of ramp rates if recommending easy workout', function(done) {
      plannedActivity.activityType = 'easy';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorEasy);
        (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorEasy);
        done();
      });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayTargetRampRate equals sevenDayRampRate', function(done) {
      plannedActivity.activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 5;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayRampRate is zero', function(done) {
      plannedActivity.activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 0;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        let plannedActivity = util.getPlannedActivity(trainingDay, source);
        (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return increased recommendation if recommending hard workout and sevenDayTargetRampRate is slightly greater than sevenDayRampRate', function (done) {
      plannedActivity.activityType = 'hard';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayAverageRampRate = 5.9;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (plannedActivity.targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (plannedActivity.targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return decreased recommendation if recommending moderate workout and sevenDayTargetRampRate is slightly less than sevenDayRampRate', function (done) {
      plannedActivity.activityType = 'moderate';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5.9;
      metrics.sevenDayAverageRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (plannedActivity.targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
        (plannedActivity.targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
        done();
      });
    });

    it('should not increase recommendation more than limit if recommending hard workout and sevenDayTargetRampRate is greater than sevenDayRampRate', function (done) {
      plannedActivity.activityType = 'hard';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 9;
      metrics.sevenDayAverageRampRate = 1;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (plannedActivity.targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (plannedActivity.targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
        (plannedActivity.targetMinLoad).should.be.belowOrEqual(Math.round(metrics.targetAvgDailyLoad * lowLoadFactorHard * (1 + adviceConstants.rampRateAdjustmentLimit)));
        (plannedActivity.targetMaxLoad).should.be.belowOrEqual(Math.round(metrics.targetAvgDailyLoad * highLoadFactorHard * (1 + adviceConstants.rampRateAdjustmentLimit)));
        done();
      });
    });

    it('should return not decrease recommendation more than limit if recommending moderate workout and sevenDayTargetRampRate is less than sevenDayRampRate', function (done) {
      plannedActivity.activityType = 'moderate';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 0;
      metrics.sevenDayAverageRampRate = 9;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (plannedActivity.targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
        (plannedActivity.targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
        (plannedActivity.targetMinLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * lowLoadFactorModerate * (1 - adviceConstants.rampRateAdjustmentLimit));
        (plannedActivity.targetMaxLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * highLoadFactorModerate * (1 - adviceConstants.rampRateAdjustmentLimit));
        done();
      });
    });

  });

  afterEach(function(done) {
    TrainingDay.remove().exec(function() {
      User.remove().exec(done);
    });
  });
});
