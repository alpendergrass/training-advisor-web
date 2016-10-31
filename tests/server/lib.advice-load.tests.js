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
  metrics,
  lowLoadFactorEasy = 0.30,
  highLoadFactorEasy = 0.60,
  lowLoadFactorModerate = 1.0,
  highLoadFactorModerate = 1.2,
  lowLoadFactorHard = 1.4,
  highLoadFactorHard = 1.9,
  lowLoadFactorGoal = 1.4,
  highLoadFactorGoal = 1.9,
  rampRateAdjustmentLimit = 0.2;

describe('advice-load Unit Tests:', function () {

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      metrics = util.getMetrics(trainingDay, 'actual');
      done();
    });
  });

  describe('Method setLoadRecommendations', function () {
    it('should return error if no user', function (done) {
      return adviceLoad.setLoadRecommendations(null, null, 'advised', function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });

    it('should return error if no trainingDay', function (done) {
      return adviceLoad.setLoadRecommendations(user, null, 'advised', function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should return estimatedLoad for target loads if this is an event day and estimate is provided', function (done) {
      trainingDay.plannedActivities[0].activityType = 'event';
      trainingDay.estimatedLoad = 234;
      trainingDay.scheduledEventRanking = 2;

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(234);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(234);
        done();
      });
    });

    it('should return computed target loads if this is an event day but no estimate is provided', function (done) {
      trainingDay.scheduledEventRanking = 1;
      trainingDay.plannedActivities[0].activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorGoal);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorGoal);
        done();
      });
    });

    it('should return target loads of zero if this is a user-scheduled off day', function (done) {
      trainingDay.scheduledEventRanking = 9; //off day
      trainingDay.plannedActivities[0].activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(0);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(0);
        done();
      });
    });

    it('should return estimatedLoad from goal event +/- 5% for target loads if recommending simulation', function (done) {
      testHelpers.createGoalEvent(user, new Date(), 2, function(err) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        trainingDay.plannedActivities[0].activityType = 'simulation';

        metrics.targetAvgDailyLoad = 100;
        metrics.sevenDayTargetRampRate = 5;
        metrics.sevenDayRampRate = 6;

        return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].targetMinLoad).should.equal(Math.round(567 * 0.95));
          (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(Math.round(567 * 1.05));
          done();
        });
      });
    });

    it('should return unadjusted recommendation regardless of ramp rates if recommending easy workout', function (done) {
      trainingDay.plannedActivities[0].activityType = 'easy';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorEasy);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorEasy);
        done();
      });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayTargetRampRate equals sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 5;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayRampRate is zero', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 0;

      return adviceLoad.setLoadRecommendations(user, trainingDay, 'advised', function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    //9/20/16: I'm turning off ramp rate adjustment until I have higher confidence in doing this.

    // it('should return increased recommendation if recommending hard workout and sevenDayTargetRampRate is slightly greater than sevenDayRampRate', function (done) {
    //   trainingDay.plannedActivities[0].activityType = 'hard';
    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 6;
    //   metrics.sevenDayRampRate = 5.9;

    //   return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
    //     should.not.exist(err);
    //     should.exist(trainingDay);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
    //     done();
    //   });
    // });

    // it('should return decreased recommendation if recommending moderate workout and sevenDayTargetRampRate is slightlyless than sevenDayRampRate', function (done) {
    //   trainingDay.plannedActivities[0].activityType = 'moderate';
    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 5.9;
    //   metrics.sevenDayRampRate = 6;

    //   return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
    //     should.not.exist(err);
    //     should.exist(trainingDay);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
    //     done();
    //   });
    // });

    // it('should not increase recommendation more than limit if recommending hard workout and sevenDayTargetRampRate is greater than sevenDayRampRate', function (done) {
    //   trainingDay.plannedActivities[0].activityType = 'hard';
    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 9;
    //   metrics.sevenDayRampRate = 1;

    //   return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
    //     should.not.exist(err);
    //     should.exist(trainingDay);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.belowOrEqual(metrics.targetAvgDailyLoad * lowLoadFactorHard * (1 + rampRateAdjustmentLimit));
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.belowOrEqual(metrics.targetAvgDailyLoad * highLoadFactorHard * (1 + rampRateAdjustmentLimit));
    //     done();
    //   });
    // });

    // it('should return not decrease recommendation more than limit if recommending moderate workout and sevenDayTargetRampRate is less than sevenDayRampRate', function (done) {
    //   trainingDay.plannedActivities[0].activityType = 'moderate';
    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 0;
    //   metrics.sevenDayRampRate = 9;

    //   return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
    //     should.not.exist(err);
    //     should.exist(trainingDay);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
    //     (trainingDay.plannedActivities[0].targetMinLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * lowLoadFactorModerate * (1 - rampRateAdjustmentLimit));
    //     (trainingDay.plannedActivities[0].targetMaxLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * highLoadFactorModerate * (1 - rampRateAdjustmentLimit));
    //     done();
    //   });
    // });

  });

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
