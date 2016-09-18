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
  adviceLoad = require('../../server/lib/advice-load');

var user, 
  trainingDate,
  trainingDay,
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
      done();
    });
  });

  describe('Method setLoadRecommendations', function () {
    it('should return error if no user', function (done) {
      return adviceLoad.setLoadRecommendations(null, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if no trainingDay', function (done) {
      return adviceLoad.setLoadRecommendations(user, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid trainingDay is required');
        done();
      });
    });

    it('should return estimatedGoalLoad for target loads if this is a goal event day and estimate is provided', function (done) {
      trainingDay.plannedActivities[0].activityType = 'event';
      trainingDay.estimatedGoalLoad = 234;
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 5;
      trainingDay.sevenDayRampRate = 6;
      trainingDay.scheduledEventRanking = 1; //A event.

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(234);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(234);
        done();
      });
    });
    
    it('should return computed target loads if this is a goal event day but no estimate is provided', function (done) {
      trainingDay.scheduledEventRanking = 1;
      trainingDay.plannedActivities[0].activityType = 'event';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 6;
      trainingDay.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(trainingDay.targetAvgDailyLoad * lowLoadFactorGoal);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(trainingDay.targetAvgDailyLoad * highLoadFactorGoal);
        done();
      });
    });
    
    it('should return target loads of zero if this is a user-scheduled off day', function (done) {
      trainingDay.scheduledEventRanking = 9; //off day
      trainingDay.plannedActivities[0].activityType = 'event';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 6;
      trainingDay.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(0);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(0);
        done();
      });
    });
    
    it('should return estimatedGoalLoad from goal event +/- 5% for target loads if recommending simulation', function (done) {
      testHelpers.createGoalEvent(user, new Date(), 2, function(err) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }
        
        trainingDay.plannedActivities[0].activityType = 'simulation';
        trainingDay.targetAvgDailyLoad = 100;
        trainingDay.sevenDayTargetRampRate = 5;
        trainingDay.sevenDayRampRate = 6;

        return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
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
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 5;
      trainingDay.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(trainingDay.targetAvgDailyLoad * lowLoadFactorEasy);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(trainingDay.targetAvgDailyLoad * highLoadFactorEasy);
        done();
      });
    });
    
    it('should return unadjusted recommendation if recommending hard workout and sevenDayTargetRampRate equals sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 5;
      trainingDay.sevenDayRampRate = 5;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(trainingDay.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(trainingDay.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayRampRate is zero', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 5;
      trainingDay.sevenDayRampRate = 0;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.equal(trainingDay.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.equal(trainingDay.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return increased recommendation if recommending hard workout and sevenDayTargetRampRate is slightly greater than sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 6;
      trainingDay.sevenDayRampRate = 5.9;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(trainingDay.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.above(trainingDay.targetAvgDailyLoad * highLoadFactorHard);
        done();
      });
    });

    it('should return decreased recommendation if recommending moderate workout and sevenDayTargetRampRate is slightlyless than sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'moderate';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 5.9;
      trainingDay.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.below(trainingDay.targetAvgDailyLoad * lowLoadFactorModerate);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.below(trainingDay.targetAvgDailyLoad * highLoadFactorModerate);
        done();
      });
    });

    it('should not increase recommendation more than limit if recommending hard workout and sevenDayTargetRampRate is greater than sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'hard';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 9;
      trainingDay.sevenDayRampRate = 1;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.above(trainingDay.targetAvgDailyLoad * lowLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.above(trainingDay.targetAvgDailyLoad * highLoadFactorHard);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.belowOrEqual(trainingDay.targetAvgDailyLoad * lowLoadFactorHard * (1 + rampRateAdjustmentLimit));
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.belowOrEqual(trainingDay.targetAvgDailyLoad * highLoadFactorHard * (1 + rampRateAdjustmentLimit));
        done();
      });
    });

    it('should return not decrease recommendation more than limit if recommending moderate workout and sevenDayTargetRampRate is less than sevenDayRampRate', function (done) {
      trainingDay.plannedActivities[0].activityType = 'moderate';
      trainingDay.targetAvgDailyLoad = 100;
      trainingDay.sevenDayTargetRampRate = 0;
      trainingDay.sevenDayRampRate = 9;

      return adviceLoad.setLoadRecommendations(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.below(trainingDay.targetAvgDailyLoad * lowLoadFactorModerate);
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.below(trainingDay.targetAvgDailyLoad * highLoadFactorModerate);
        (trainingDay.plannedActivities[0].targetMinLoad).should.be.aboveOrEqual(trainingDay.targetAvgDailyLoad * lowLoadFactorModerate * (1 - rampRateAdjustmentLimit));
        (trainingDay.plannedActivities[0].targetMaxLoad).should.be.aboveOrEqual(trainingDay.targetAvgDailyLoad * highLoadFactorModerate * (1 - rampRateAdjustmentLimit));
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
