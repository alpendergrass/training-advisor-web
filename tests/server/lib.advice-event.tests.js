'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  // advisorTestHelpers = require(path.resolve('./util/test-helpers'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceMetrics = require('../../server/lib/advice-metrics'),
  adviceEvent = require('../../server/lib/advice-event'),
  adviceEngine = require('../../server/lib/advice-engine');

var user, trainingDate, trainingDay;

describe('advice-event Unit Tests:', function () {

  beforeEach(function (done) {

    // advisorTestHelpers.initRuleEngine(function(err, r) {
    //   if (err) {
    //     return done(err);
    //   }

    //   R = r;

    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
    // });
  });

  describe('Event Rules', function () {
    it('should return goal rationale if today is a priority 1 event', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 1;

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            //console.log('returned trainingDay: ' + trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.match(/event/);
            (trainingDay.plannedActivities[0].rationale).should.containEql('priority 1 (goal) event');
            done();
          });
        });
      });
    });

    it('should return medium priority rationale if today is a priority 2 event', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 2;

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            //console.log('returned trainingDay: ' + trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.match(/event/);
            (trainingDay.plannedActivities[0].rationale).should.containEql('medium priority');
            done();
          });
        });
      });
    });

    it('should return low priority rationale if today is a priority 3 event', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 3;

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            //console.log('returned trainingDay: ' + trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.match(/event/);
            (trainingDay.plannedActivities[0].rationale).should.containEql('low priority');
            done();
          });
        });
      });
    });

    it('should not return goal if today is not a priority (goal) event', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.not.match(/event/);
            done();
          });
        });
      });
    });

    it('should not return goal if today is a priority 2 event but in peak period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 2;
          trainingDay.period = 'peak';

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.not.match(/event/);
            done();
          });
        });
      });
    });

    it('should not return goal if today is a priority 3 event but in peak period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 3;
          trainingDay.period = 'peak';

          return adviceEngine._testGenerateAdvice(user, trainingDay, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            (trainingDay.plannedActivities[0].activityType).should.not.match(/event/);
            done();
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
