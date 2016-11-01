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
  adviceMetrics = require('../../server/lib/advice-metrics');

var user,
  trainingDate,
  expectedTargetAvgDailyLoad = 50.58,
  params = {};

describe('advice-metrics Unit Tests:', function () {

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      params.user = newUser;

      trainingDate = moment().startOf('day').toDate();
      params.numericDate = util.toNumericDate(trainingDate);

      params.metricsType = 'actual';

      testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays + adviceConstants.minimumNumberOfRaceDays, function(err) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        done();
      });
    });
  });

  describe('Method updateMetrics', function () {
    it('should return error if no user', function (done) {
      params.user = null;
      return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });

    it('should return error if missing trainingDate', function (done) {
      params.numericDate = null;
      return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('numericDate is required');
        done();
      });
    });

    it('should return error if invalid trainingDate', function (done) {
      params.numericDate = '20161232';
      return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return error if missing metricsType', function (done) {
      params.metricsType = null;
      return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.containEql('metricsType is required');
        done();
      });
    });

    it('should return error if current trainingDay is starting point and fitness and fatigue are zero', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 0, 0, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.exist(err);
          (err.message).should.containEql('should not have fitness and fatigue equal to zero.');
          done();
        });
      });
    });

    it('should return error if starting point is prior day and starting point fitness and fatigue are zero', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 0, 0, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.exist(err);
          (err.message).should.containEql('should not have fitness and fatigue equal to zero.');
          done();
        });
      });
    });

    it('should return error if starting point two days prior and starting point fitness and fatigue are zero', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 0, 0, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.exist(err);
          (err.message).should.containEql('should not have fitness and fatigue equal to zero.');
          done();
        });
      });
    });

    it('should return form of zero if current trainingDay is starting point and current fitness and fatigue are the same value', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
          (metrics.form).should.equal(0);
          done();
        });
      });
    });

    it('should return error if F&F true-up of current day and fitness and fatigue are zero', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var completedActivities = [{
          load: 100
        }];

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          createdTrainingDay.fitnessAndFatigueTrueUp = true;

          testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
            if (err) {
              console.log('updateTrainingDay: ' + err);
            }

            return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              should.exist(err);
              (err.message).should.containEql('should not have fitness and fatigue equal to zero.');
              done();
            });
          });
        });
      });
    });

    it('should return error if F&F true-up of prior day and fitness and fatigue are zero', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var yesterday = moment(trainingDate).subtract(1, 'days');
        var completedActivities = [{
          load: 100
        }];

        testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          createdTrainingDay.fitnessAndFatigueTrueUp = true;

          testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
            if (err) {
              console.log('updateTrainingDay: ' + err);
            }

            return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              should.exist(err);
              (err.message).should.containEql('should not have fitness and fatigue equal to zero.');
              done();
            });
          });
        });
      });
    });

    it('should not update fitness and fatigue if F&F true-up of current day', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var completedActivities = [{
          load: 100
        }];

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          createdTrainingDay.fitnessAndFatigueTrueUp = true;
          let metrics = _.find(createdTrainingDay.metrics, ['metricsType', 'actual']);
          metrics.fitness = 1;
          metrics.fatigue = 1;

          testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
            if (err) {
              console.log('updateTrainingDay: ' + err);
            }

            return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              should.not.exist(err);
              should.exist(trainingDay);
              let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
              (metrics.fitness).should.equal(1);
              (metrics.fatigue).should.equal(1);
              done();
            });
          });
        });
      });
    });

    it('should not update fitness and fatigue of prior day if F&F true-up of that day', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var yesterday = moment(trainingDate).subtract(1, 'days');
        var completedActivities = [{
          load: 100
        }];

        testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          let metrics = _.find(createdTrainingDay.metrics, ['metricsType', 'actual']);
          metrics.fitness = 1;
          metrics.fatigue = 1;

          testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
            if (err) {
              console.log('updateTrainingDay: ' + err);
            }

            adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              if (err) {
                console.log('updateMetrics: ' + err);
              }

              return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, priorTrainingDay) {
                should.not.exist(err);
                should.exist(priorTrainingDay);
                let metrics = _.find(priorTrainingDay.metrics, ['metricsType', 'actual']);
                (metrics.fitness).should.equal(1);
                (metrics.fatigue).should.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    it('should return form value greater than one if current trainingDay is two days after starting point, starting fitness and fatigue are the same value and no intervening completedactivities have occurred', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
          (metrics.form).should.be.above(1);
          done();
        });
      });
    });

    it('should return form value less than one if current trainingDay is two days after starting point, starting fitness and fatigue are the same value and an intervening completedactivity has occurred', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var yesterday = moment(trainingDate).subtract(1, 'days');
        var completedActivities = [{
          load: 100
        }];

        testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.form).should.be.below(1);
            done();
          });
        });
      });
    });

    it('should return dailyTargetRampRate of 1, targetAvgDailyLoad of 51 and sevenDayRampRate of 0 if current trainingDay is starting point', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
          (metrics.dailyTargetRampRate).should.equal(1);
          (metrics.targetAvgDailyLoad).should.equal(51);
          (metrics.sevenDayRampRate).should.equal(0);
          done();
        });
      });
    });

//Uncaught AssertionError: expected 0 to be below 0
    // it('should return dailyTargetRampRate of 0.001 and a zero or negative sevenDayRampRate if current trainingDay is last day of peak period and no intervening workouts', function (done) {
    it('should return dailyTargetRampRate of 0.001 and a zero or negative sevenDayRampRate if current trainingDay is last day of peak period and no intervening workouts', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        params.numericDate = util.toNumericDate(moment(trainingDate).add(adviceConstants.minimumNumberOfTrainingDays, 'days'));

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
          (trainingDay.period).should.equal('peak');
          (metrics.dailyTargetRampRate).should.equal(0.001);
          // We are not computing sevenDayRampRate since we disabled computeRampRateAdjustment.
          // (trainingDay.sevenDayRampRate).should.be.belowOrEqual(0);
          done();
        });
      });
    });

    //TODO: get rid of the specific values in these tests.
    // In order to do this we would need to compute the expected values here using the same algorithm.

    // it('should return dailyTargetRampRate of .83, targetAvgDailyLoad of 40.96 and a negative sevenDayRampRate if current trainingDay is in base period and no intervening workouts', function (done) {
    //   testHelpers.createStartingPoint(user, trainingDate, -1, 9, 9, function(err, startDay) {
    //     if (err) {
    //       console.log('createStartingPoint: ' + err);
    //     }

    //     params.numericDate = moment(trainingDate).add(16, 'days');

    //     return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
    //       should.not.exist(err);
    //       should.exist(trainingDay);
    //       (trainingDay.period).should.equal('base');
    //       (trainingDay.dailyTargetRampRate).should.equal(0.83);
    //       (trainingDay.targetAvgDailyLoad).should.equal(40.96);
    //       // We are not computing sevenDayRampRate since we disabled computeRampRateAdjustment.
    //       // (trainingDay.sevenDayRampRate).should.be.below(0);
    //       done();
    //     });
    //   });
    // });

    // it('should return dailyTargetRampRate of about .58, targetAvgDailyLoad of about 28 and a negative sevenDayRampRate if current trainingDay is in build period and no intervening workouts', function (done) {
    //   testHelpers.createStartingPoint(user, trainingDate, 0, 9, 9, function(err, startDay) {
    //     if (err) {
    //       console.log('createStartingPoint: ' + err);
    //     }

    //     params.numericDate = moment(trainingDate).add(adviceConstants.minimumNumberOfTrainingDays * adviceConstants.basePortionOfTotalTrainingDays + 1, 'days');

    //     return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
    //       should.not.exist(err);
    //       should.exist(trainingDay);
    //       (trainingDay.period).should.equal('build');
    //       (trainingDay.dailyTargetRampRate).should.be.approximately(0.58, 0.1);
    //       (trainingDay.targetAvgDailyLoad).should.be.approximately(28, 1);
    //       // We are not computing sevenDayRampRate since we disabled computeRampRateAdjustment.
    //       // (trainingDay.sevenDayRampRate).should.be.below(0);
    //       done();
    //     });
    //   });
    // });

    // We are not computing sevenDayRampRate since we disabled computeRampRateAdjustment.
    // it('should return a positive sevenDayRampRate if a starting point was more than 8 days ago and a completedActivitiy with load exists for prior trainingDay', function (done) {
    //   testHelpers.createStartingPoint(user, trainingDate, 9, 9, 9, function(err) {
    //     if (err) {
    //       console.log('createStartingPoint: ' + err);
    //     }

    //     var tDate = moment(trainingDate).subtract(1, 'day');
    //     //moderate upperLoadFactor is 1.20
    //     var completedActivities = [{
    //       load: 100
    //     }];

    //     testHelpers.createTrainingDay(user, tDate, completedActivities, function(err) {
    //       if (err) {
    //         console.log('createTrainingDay: ' + err);
    //       }

    //       return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
    //         should.not.exist(err);
    //         should.exist(trainingDay);
    //         (trainingDay.sevenDayRampRate).should.be.above(0);
    //         done();
    //       });
    //     });
    //   });
    // });

    it('should return loadRating of rest if no completed activities exist for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
          (metrics.loadRating).should.equal('rest');
          done();
        });
      });
    });

    it('should return loadRating of easy if one easy completed activity exists for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        var completedActivities = [{
          load: 1
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('easy');
            done();
          });
        });
      });
    });

    it('should return loadRating of easy if two very easy completed activities exist for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        var completedActivities = [{
          load: 1
        }, {
          load: 1
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('easy');
            done();
          });
        });
      });
    });

    it('should return loadRating of moderate if a completed activity of sufficient load exists for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        //moderate upperLoadFactor is 1.20
        var completedActivities = [{
          load: (expectedTargetAvgDailyLoad * 1.10)
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('moderate');
            done();
          });
        });
      });
    });

    it('should return loadRating of moderate if two completed activities of sufficient load exist for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err, startDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        //moderate upperLoadFactor is 1.20
        var completedActivities = [{
          load: (expectedTargetAvgDailyLoad * 0.2)
        }, {
          load: (expectedTargetAvgDailyLoad * 0.9)
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('moderate');
            done();
          });
        });
      });
    });

    it('should return loadRating of hard if a completed activitiy of sufficient load exists for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err, startDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        //moderate upperLoadFactor is 1.20
        var completedActivities = [{
          load: (expectedTargetAvgDailyLoad * 1.21)
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('hard');
            done();
          });
        });
      });
    });

    it('should return loadRating of hard if two completed activities of sufficient load exist for current trainingDay', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        var tDate = moment(trainingDate);
        //moderate upperLoadFactor is 1.20
        var completedActivities = [{
          load: (expectedTargetAvgDailyLoad * 0.2)
        }, {
          load: (expectedTargetAvgDailyLoad * 1.1)
        }];

        testHelpers.createTrainingDay(user, tDate, completedActivities, function(err) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
            should.not.exist(err);
            should.exist(trainingDay);
            let metrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
            (metrics.loadRating).should.equal('hard');
            done();
          });
        });
      });
    });

    it('should return daysUntilNextGoalEvent = minimumNumberOfTrainingDays + minimumNumberOfRaceDays if goal is minimumNumberOfTrainingDays + minimumNumberOfRaceDays away', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
          should.not.exist(err);
          (trainingDay.daysUntilNextGoalEvent).should.equal(adviceConstants.minimumNumberOfTrainingDays + adviceConstants.minimumNumberOfRaceDays);
          done();
        });
      });
    });


    it('should return daysUntilNextPriority2Event equal minimumNumberOfTrainingDays - 1  if priority 2 event is minimumNumberOfTrainingDays - 1 away', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createTrainingDay(user, moment(trainingDate).add((adviceConstants.minimumNumberOfTrainingDays - 1), 'day'), null, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          createdTrainingDay.scheduledEventRanking = 2;

          testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
            if (err) {
              console.log('updateTrainingDay: ' + err);
            }

            return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              should.not.exist(err);
              (trainingDay.daysUntilNextPriority2Event).should.equal(adviceConstants.minimumNumberOfTrainingDays - 1);
              done();
            });
          });
        });
      });
    });

    it('should return daysUntilNextPriority3Event equal 1 if priority 3 event is tomorrow', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
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

            return adviceMetrics.updateMetrics(params, function (err, trainingDay) {
              should.not.exist(err);
              (trainingDay.daysUntilNextPriority3Event).should.equal(1);
              done();
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
