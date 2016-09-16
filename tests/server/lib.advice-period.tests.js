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
          (periodData.period).should.match('transition');
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

    it('should return totalTrainingDays equal minimumNumberOfTrainingDays if total counted training days is grater than the minimum but a recent goal exists', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
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

        testHelpers.createGoalEvent(user, trainingDate, 1, function(err) {
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

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays + 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('transition');
            done();
          });
        });
      });
    });

    it('should not return error if total training days is equal to the mamimum', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, 0, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays, function(err) {
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

    it('should return base period if start date and trainingDate are the same', function (done) {
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
            (periodData.period).should.match('base');
            done();
          });
        });
      });
    });

    it('should return peak period if goal date is day after trainingDate', function (done) {
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
            (periodData.period).should.match('peak');
            done();
          });
        });
      });
    });

    it('should return base period if trainingDate is last day of base period', function (done) {
      //Total period must be of sufficient length so that period lengths are not adjusted due to peak min duration.
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.basePortionOfTotalTrainingDays * 200, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 200 - (adviceConstants.basePortionOfTotalTrainingDays * 200), function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('base');
            done();
          });
        });
      });
    });

    it('should return build period if trainingDate is first day of build period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, (adviceConstants.basePortionOfTotalTrainingDays * adviceConstants.minimumNumberOfTrainingDays) + 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - ((adviceConstants.basePortionOfTotalTrainingDays * adviceConstants.minimumNumberOfTrainingDays) + 1), function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('build');
            done();
          });
        });
      });
    });

    it('should return build period if trainingDate is last day of build period', function (done) {
      var daysBack = Math.round((adviceConstants.basePortionOfTotalTrainingDays + adviceConstants.buildPortionOfTotalTrainingDays) * adviceConstants.minimumNumberOfTrainingDays);
      var daysForward = adviceConstants.minimumNumberOfTrainingDays - daysBack;
      // console.log('daysBack: ' + daysBack);
      // console.log('daysForward: ' + daysForward);
      testHelpers.createStartingPoint(user, trainingDate, daysBack, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, daysForward, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            // console.log('periodData: ' + JSON.stringify(periodData));
            (periodData.period).should.match('build');
            done();
          });
        });
      });
    });

    //With current minimumNumberOfTrainingDays, computed peak is always more than minimumNumberOfPeakDays.
    // it('should return peak period if trainingDate is last day of computed build period but computed peak period is less than minimum duration', function (done) {
    //   testHelpers.createStartingPoint(user, trainingDate, Math.round(((adviceConstants.basePortionOfTotalTrainingDays + adviceConstants.buildPortionOfTotalTrainingDays) * adviceConstants.minimumNumberOfTrainingDays) / 2), 1, 1, function(err) {
    //     if (err) {
    //       console.log('createStartingPoint: ' + err);
    //     }

    //     testHelpers.createGoalEvent(user, trainingDate, Math.round(adviceConstants.minimumNumberOfPeakDays / 2), function(err) {
    //       if (err) {
    //         console.log('createGoalEvent: ' + err);
    //       }
          
    //       return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
    //         should.not.exist(err);
    //         (periodData.period).should.match('peak');
    //         done();
    //       });
    //     });
    //   });
    // });

    it('should return peak period if trainingDate is first day of peak period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, ((adviceConstants.basePortionOfTotalTrainingDays + adviceConstants.buildPortionOfTotalTrainingDays) * adviceConstants.minimumNumberOfTrainingDays) + 1, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfPeakDays - 1, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.period).should.match('peak');
            done();
          });
        });
      });
    });

    it('should return peak period duration greater than or equal to minimumNumberOfPeakDays if short total training period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays - 14, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 14, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            //console.log('periodData: ' + JSON.stringify(periodData));
            (periodData.peakPeriodDays).should.be.aboveOrEqual(adviceConstants.minimumNumberOfPeakDays);
            done();
          });
        });
      });
    });

    it('should return peak period duration of maximumNumberOfPeakDays if long total training period', function (done) {
      testHelpers.createStartingPoint(user, trainingDate, adviceConstants.maximumNumberOfTrainingDays - 10, 1, 1, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 10, function(err) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }
          
          return advicePeriod.getPeriod(user, trainingDay, function (err, periodData) {
            should.not.exist(err);
            (periodData.peakPeriodDays).should.equal(adviceConstants.maximumNumberOfPeakDays);
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
          
          // console.log('trainingDay: ' + trainingDay);
          // console.log('goalDay: ' + goalDay);

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
