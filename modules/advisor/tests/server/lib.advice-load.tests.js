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
  lowLoadFactorEasy = 0.20,
  highLoadFactorEasy = 0.40,
  lowLoadFactorModerate = 0.9,
  highLoadFactorModerate = 1.1,
  lowLoadFactorHard = 1.4,
  highLoadFactorHard = 1.9,
  lowLoadFactorGoal = 2.1,
  highLoadFactorGoal = 2.6;

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
    it('should return error if no trainingDay', function() {
      return adviceLoad.setLoadRecommendations(null, 'advised')
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.match('valid trainingDay is required');
        });
    });

    // it('should return estimatedLoad for target loads if this is an event day and estimate is provided', function() {
    //   plannedActivity.activityType = 'event';
    //   trainingDay.estimatedLoad = 234;
    //   trainingDay.scheduledEventRanking = 2;

    //   metrics.targetAvgDailyLoad = 100;
    //   metrics.sevenDayTargetRampRate = 5;
    //   metrics.sevenDayRampRate = 6;

    //   return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
    //     .then(function(trainingDay) {
    //     should.exist(trainingDay);
    //     let plannedActivity = util.getPlannedActivity(trainingDay, source);
    //     (plannedActivity.targetMinLoad).should.equal(234);
    //     (plannedActivity.targetMaxLoad).should.equal(234);
    //     done();
    //   });
    // });

    it('should return computed target loads if this is an event day', function() {
      trainingDay.scheduledEventRanking = 1;
      plannedActivity.activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorGoal);
          (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorGoal);
        },
        function(err) {
          throw err;
        });
    });

    it('should return target loads of zero if this is a user-scheduled off day', function() {
      trainingDay.scheduledEventRanking = 9; //off day
      plannedActivity.activityType = 'event';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(0);
          (plannedActivity.targetMaxLoad).should.equal(0);
        },
        function(err) {
          throw err;
        });
    });

    it('should return unadjusted recommendation regardless of ramp rates if recommending easy workout', function() {
      plannedActivity.activityType = 'easy';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 6;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorEasy);
          (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorEasy);
        },
        function(err) {
          throw err;
        });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayTargetRampRate equals sevenDayRampRate', function() {
      plannedActivity.activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 5;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
          (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        },
        function(err) {
          throw err;
        });
    });

    it('should return unadjusted recommendation if recommending hard workout and sevenDayRampRate is zero', function() {
      plannedActivity.activityType = 'hard';

      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5;
      metrics.sevenDayRampRate = 0;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          let plannedActivity = util.getPlannedActivity(trainingDay, source);
          (plannedActivity.targetMinLoad).should.equal(metrics.targetAvgDailyLoad * lowLoadFactorHard);
          (plannedActivity.targetMaxLoad).should.equal(metrics.targetAvgDailyLoad * highLoadFactorHard);
        },
        function(err) {
          throw err;
        });
    });

    it('should return increased recommendation if recommending hard workout and sevenDayTargetRampRate is slightly greater than sevenDayRampRate', function() {
      plannedActivity.activityType = 'hard';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 6;
      metrics.sevenDayAverageRampRate = 5.9;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          (plannedActivity.targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
          (plannedActivity.targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
        },
        function(err) {
          throw err;
        });
    });

    it('should return decreased recommendation if recommending moderate workout and sevenDayTargetRampRate is slightly less than sevenDayRampRate', function() {
      plannedActivity.activityType = 'moderate';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 5.9;
      metrics.sevenDayAverageRampRate = 6;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          (plannedActivity.targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
          (plannedActivity.targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
        },
        function(err) {
          throw err;
        });
    });

    it('should not increase recommendation more than limit if recommending hard workout and sevenDayTargetRampRate is greater than sevenDayRampRate', function() {
      plannedActivity.activityType = 'hard';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 9;
      metrics.sevenDayAverageRampRate = 1;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          (plannedActivity.targetMinLoad).should.be.above(metrics.targetAvgDailyLoad * lowLoadFactorHard);
          (plannedActivity.targetMaxLoad).should.be.above(metrics.targetAvgDailyLoad * highLoadFactorHard);
          (plannedActivity.targetMinLoad).should.be.belowOrEqual(Math.round(metrics.targetAvgDailyLoad * lowLoadFactorHard * (1 + adviceConstants.rampRateAdjustmentLimit)));
          (plannedActivity.targetMaxLoad).should.be.belowOrEqual(Math.round(metrics.targetAvgDailyLoad * highLoadFactorHard * (1 + adviceConstants.rampRateAdjustmentLimit)));
        },
        function(err) {
          throw err;
        });
    });

    it('should return not decrease recommendation more than limit if recommending moderate workout and sevenDayTargetRampRate is less than sevenDayRampRate', function() {
      plannedActivity.activityType = 'moderate';
      metrics.targetAvgDailyLoad = 100;
      metrics.sevenDayTargetRampRate = 0;
      metrics.sevenDayAverageRampRate = 9;

      return adviceLoad.setLoadRecommendations(trainingDay, 'advised')
        .then(function(trainingDay) {
          should.exist(trainingDay);
          (plannedActivity.targetMinLoad).should.be.below(metrics.targetAvgDailyLoad * lowLoadFactorModerate);
          (plannedActivity.targetMaxLoad).should.be.below(metrics.targetAvgDailyLoad * highLoadFactorModerate);
          (plannedActivity.targetMinLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * lowLoadFactorModerate * (1 - adviceConstants.rampRateAdjustmentLimit));
          (plannedActivity.targetMaxLoad).should.be.aboveOrEqual(metrics.targetAvgDailyLoad * highLoadFactorModerate * (1 - adviceConstants.rampRateAdjustmentLimit));
        },
        function(err) {
          throw err;
        });
    });

  });

  afterEach(function(done) {
    TrainingDay.remove().exec(function() {
      User.remove().exec(done);
    });
  });
});
