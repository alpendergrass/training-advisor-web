'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require(path.resolve('./modules/trainingdays/tests/server/util/test-helpers')),
  adviceConstants = require('../../server/lib/advice-constants'),
  advicePeriod = require('../../server/lib/advice-period');

var user, trainingDate, trainingDay;

describe('advice-period Unit Tests:', function () {

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

  describe('Method getPeriod', function () {
    it('should return error if no user', function (done) {
      return advicePeriod.getPeriod(null, null, function (err, periodData) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });

    it('should return error if period start does not exist', function (done) {
      return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
        should.exist(err);
        (err.message).should.containEql('Starting date for current training period was not found.');
        done();
      });
    });

    it('should return transition period if no goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
          should.not.exist(err);
          (periodData.period).should.match('t0');
          done();
        });
      });
    });

    it('should not return error if start and goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 30, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 30, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            done();
          });
        });
      });
    });

    it('should not return error if recent goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 30, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 30, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          testHelpers.createGoalEvent(user, trainingDate, -1, function(err) {
            if (err) {
              console.log('createGoalEvent - past goal: ' + err);
            }

            return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
              should.not.exist(err);
              (periodData.totalTrainingDays).should.equal(adviceConstants.minimumNumberOfTrainingDays);
              done();
            });
          });
        });
      });
    });

    it('should return totalTrainingDays equal minimumNumberOfTrainingDays if total counted training days is less than the minimum', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.totalTrainingDays).should.equal(adviceConstants.minimumNumberOfTrainingDays);
            done();
          });
        });
      });
    });

    it('should not return error if total training days is equal to the minimum', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.totalTrainingDays).should.equal(adviceConstants.minimumNumberOfTrainingDays);
            done();
          });
        });
      });
    });

    it('should return totalTrainingDays equal maximumNumberOfTrainingDays if total counted training days is greater that the maximum', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfRaceDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.totalTrainingDays).should.equal(adviceConstants.maximumNumberOfTrainingDays);
            done();
          });
        });
      });
    });

    it('should return transition period if goal is further out than the maximum number of training days', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.maxDaysToLookAheadForFutureGoals + 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t0');
            done();
          });
        });
      });
    });

    it('should not return error if total training days is equal to the maximum', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays + adviceConstants.maximumNumberOfRaceDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.totalTrainingDays).should.equal(adviceConstants.maximumNumberOfTrainingDays);
            done();
          });
        });
      });
    });

    it('should return t1 period if start date and trainingDate are the same', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t1');
            done();
          });
        });
      });
    });

    it('should return race period if goal date is day after trainingDate', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('race');
            done();
          });
        });
      });
    });

    it('should return t1 period if trainingDate is last day of t1 period', function (done) {
      // 0.815 is end of t1 from trainingPeriodLookups.
      let daysIntoSeason = Math.round((1 - 0.815) * adviceConstants.minimumNumberOfTrainingDays);

      testHelpers.createStartingPoint(user, trainingDate, daysIntoSeason, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, (adviceConstants.minimumNumberOfTrainingDays - daysIntoSeason) + adviceConstants.minimumNumberOfRaceDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t1');
            done();
          });
        });
      });
    });

    it('should return t2 period if trainingDate is first day of t2 period', function (done) {
      // 0.815 is start of t2 from trainingPeriodLookups.
      let daysIntoSeason = Math.round((1 - 0.815) * adviceConstants.minimumNumberOfTrainingDays);

      testHelpers.createStartingPoint(user, trainingDate, daysIntoSeason + 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, (adviceConstants.minimumNumberOfTrainingDays - daysIntoSeason) + adviceConstants.minimumNumberOfRaceDays - 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t2');
            done();
          });
        });
      });
    });

    it('should return t6 period if trainingDate is first day of t6 period', function (done) {
      // 0.075 is start of t6 from trainingPeriodLookups.
      let daysIntoSeason = Math.round((1 - 0.075) * adviceConstants.minimumNumberOfTrainingDays);

      testHelpers.createStartingPoint(user, trainingDate, daysIntoSeason + 1, 1, 1, function(err, startingPoint) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, (adviceConstants.minimumNumberOfTrainingDays - daysIntoSeason) + adviceConstants.minimumNumberOfRaceDays - 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t6');
            done();
          });
        });
      });
    });

    it('should return t6 period if trainingDate is last day of t6 period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfRaceDays, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('t6');
            done();
          });
        });
      });
    });

    it('should return 1 daysUntilNextGoalEvent if goal is tomorrow', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err, goalDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            // console.log('periodData: ' + JSON.stringify(periodData));
            (periodData.daysUntilNextGoalEvent).should.equal(1);
            done();
          });
        });
      });
    });

    it('should return 1 daysUntilNextPriority2Event if priority 2 event is tomorrow and 20 daysUntilNextGoalEvent if goal is in 20 days', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 20, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 20, function(err, goalDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          testHelpers.createTrainingDay(user, moment(trainingDate).add(1, 'day'), null, function(err, createdTrainingDay) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            createdTrainingDay.scheduledEventRanking = 2;

            testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
              if (err) {
                console.log('updateTrainingDay: ' + err);
              }

              return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
                should.not.exist(err);
                //console.log('periodData: ' + JSON.stringify(periodData));
                (periodData.daysUntilNextPriority2Event).should.equal(1);
                (periodData.daysUntilNextGoalEvent).should.equal(20);
                done();
              });
            });
          });
        });
      });
    });

    it('should return 1 daysUntilNextPriority3Event if priority 3 event is tomorrow', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 20, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 20, function(err, goalDay) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          testHelpers.createTrainingDay(user, moment(trainingDate).add(1, 'day'), null, function(err, createdTrainingDay) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            createdTrainingDay.scheduledEventRanking = 3;

            testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
              if (err) {
                console.log('updateTrainingDay: ' + err);
              }

              return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
                should.not.exist(err);
                // console.log('periodData: ' + JSON.stringify(periodData));
                (periodData.daysUntilNextPriority3Event).should.equal(1);
                done();
              });
            });
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
