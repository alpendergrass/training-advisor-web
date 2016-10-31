'use strict';


var path = require('path'),
  _ = require('lodash'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  adviceMetrics = require('../../server/lib/advice-metrics'),
  adviceEngine = require('../../server/lib/advice-engine');

var user,
  trainingDate,
  trainingDay,
  yesterday,
  params = {};

describe('advice-easy Unit Tests:', function() {

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      params.user = user;
      trainingDate = moment().startOf('day').toDate();
      yesterday = moment(trainingDate).subtract(1, 'days');
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
  });

  describe('Easy Rules', function() {
    it('should return easy if yesterday was a hard day, form is below easy day threshold and tomorrow is a not preferred rest or off day', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];

      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err, startDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 40, function(err, goalDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            params.numericDate = dbUtil.toNumericDate(yesterday);
            params.metricsType = 'actual';

            adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }

              testHelpers.getTrainingDay(createdTrainingDay.id, function(err, priorTrainingDay) {

                let metrics = util.getMetrics(trainingDay, 'actual');
                metrics.form = adviceConstants.easyDaytNeededThreshold;

                return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
                  should.not.exist(err);
                  should.exist(trainingDay);
                  (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should not return easy if yesterday was a hard day, form is below easy day threshold but tomorrow is an off day', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];

      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err, startDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 40, function(err, goalDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            testHelpers.createTrainingDay(user, moment(trainingDate).add(1, 'day'), null, function(err, createdTrainingDay) {
              if (err) {
                console.log('createTrainingDay: ' + err);
              }

              createdTrainingDay.scheduledEventRanking = 9;

              testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
                if (err) {
                  console.log('updateTrainingDay: ' + err);
                }

                params.numericDate = dbUtil.toNumericDate(yesterday);

                adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
                  //we have to update metrics in order for yesterday's loadRating to be assigned.
                  if (err) {
                    console.log('updateMetrics: ' + err);
                  }

                  let metrics = util.getMetrics(trainingDay, 'actual');
                  metrics.form = adviceConstants.easyDaytNeededThreshold;

                  return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
                    should.not.exist(err);
                    should.exist(trainingDay);
                    (trainingDay.plannedActivities[0].activityType).should.not.match(/easy/);
                    done();
                  });
                });
              });
            });
          });
        });
      });
    });

    it('should not return easy if yesterday was a hard day and tomorrow is a not preferred rest day but form is above easy day threshold', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            params.numericDate = dbUtil.toNumericDate(yesterday);

            return adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }

              let metrics = util.getMetrics(trainingDay, 'actual');
              metrics.form = adviceConstants.easyDaytNeededThreshold + 1;

              return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
                should.not.exist(err);
                should.exist(trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.not.match(/easy/);
                done();
              });
            });
          });
        });
      });
    });

    it('should return easy if yesterday was a hard day and we are peaking', function(done) {
      user.preferredRestDays = [moment(trainingDate).add(2, 'days').day().toString()];
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 40, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        testHelpers.createGoalEvent(user, trainingDate, 40, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          var completedActivities = [{
            load: 999
          }];

          testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            params.numericDate = dbUtil.toNumericDate(yesterday);

            return adviceMetrics.updateMetrics(params, function(err, metricizedTrainingDay) {
              //we have to update metrics in order for yesterday's loadRating to be assigned.
              if (err) {
                console.log('updateMetrics: ' + err);
              }
              //console.log('returned metricizedTrainingDay: ' + metricizedTrainingDay);
              trainingDay.period = 'peak';

              return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
                should.not.exist(err);
                should.exist(trainingDay);
                (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
                done();
              });
            });
          });
        });
      });
    });

    it('should return easy recommendation if testing is due and somewhat fatigued', function(done) {
      user.thresholdPowerTestDate = moment(trainingDate).subtract(adviceConstants.testingNagDayCount, 'days');
      let metrics = util.getMetrics(trainingDay, 'actual');
      metrics.form = adviceConstants.testingEligibleFormThreshold;

      return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
        done();
      });
    });

    it('should return easy recommendation if goal event is in 3 days', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextGoalEvent = 3;

        return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('goal event is in three days');
          done();
        });
      });
    });

    it('should return easy recommendation if goal event is tomorrow', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextGoalEvent = 1;

        return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('goal event is tomorrow');
          done();
        });
      });
    });

    it('should return easy recommendation if priority 2 event is in two days', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextPriority2Event = 2;

        return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('priority 2 event is in two days');
          done();
        });
      });
    });

    it('should return easy recommendation if priority 3 event is in one day', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }
        trainingDay.daysUntilNextPriority3Event = 1;

        return adviceEngine._testGenerateAdvice(user, trainingDay, 'advised', function(err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDay.plannedActivities[0].activityType).should.match(/easy/);
          (trainingDay.plannedActivities[0].rationale).should.containEql('priority 3 event is in one day');
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

