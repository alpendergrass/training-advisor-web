'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceEngine = require('../../server/lib/advice-engine');

var user,
  trainingDate,
  trainingDay,
  source = 'advised';

describe('advice-event Unit Tests:', function() {

  beforeEach(function(done) {
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

  describe('Event Rules', function() {
    it('should return goal rationale if today is a priority 1 event', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err, trainingDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 1;

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.match(/event/);
            (plannedActivity.rationale).should.containEql('priority 1 (goal) event');
            done();
          });
        });
      });
    });

    it('should return medium priority rationale if today is a priority 2 event', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err, trainingDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 2;

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.match(/event/);
            (plannedActivity.rationale).should.containEql('medium priority');
            done();
          });
        });
      });
    });

    it('should return low priority rationale if today is a priority 3 event', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 0, function(err, trainingDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 3;

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.match(/event/);
            (plannedActivity.rationale).should.containEql('low priority');
            done();
          });
        });
      });
    });

    it('should not return goal if today is not a priority (goal) event', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.not.match(/event/);
            done();
          });
        });
      });
    });

    it('should not return goal if today is a priority 2 event but in t6 period', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 2;
          trainingDay.period = 't6';

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.not.match(/event/);
            done();
          });
        });
      });
    });

    it('should not return goal if today is a priority 3 event but in t6 period', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          trainingDay.scheduledEventRanking = 3;
          trainingDay.period = 't6';

          return adviceEngine._testGenerateAdvice(user, trainingDay, source, function(err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let plannedActivity = util.getPlannedActivity(trainingDay, source);
            (plannedActivity.activityType).should.not.match(/event/);
            done();
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
