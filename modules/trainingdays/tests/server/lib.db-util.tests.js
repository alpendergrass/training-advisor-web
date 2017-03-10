'use strict';

var path = require('path'),
  should = require('should'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require('./util/test-helpers'),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  dbUtil = require('../../server/lib/db-util');

var user, trainingDate, numericDate, tomorrowDate, numericEndDate, endDate, trainingDay, metricsParams;

describe('db-util Unit Tests:', function() {

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;

      trainingDate = moment().startOf('day').toDate();
      numericDate = util.toNumericDate(trainingDate);
      tomorrowDate = moment().add(1, 'day').toDate();
      // numericTomorrowDate = util.toNumericDate(tomorrowDate);
      endDate = moment().add(2, 'days').toDate();
      numericEndDate = util.toNumericDate(endDate);
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);

      metricsParams = {
        user: user,
        numericDate: numericDate,
        metricsType: 'actual'
      };

      done();
    });
  });

  describe('Method getTrainingDayDocument', function() {
    it('should return error if no user', function(done) {
      dbUtil.getTrainingDayDocument(null, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('valid user is required');
          done();
        });
    });

    it('should return error if null trainingDate', function(done) {
      dbUtil.getTrainingDayDocument(user, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('numericDate is required to getTrainingDay');
          done();
        });
    });

    it('should return error if invalid trainingDate', function(done) {
      dbUtil.getTrainingDayDocument(user, 'asdf')
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('not a valid date');
          done();
        });
    });

    it('should return new trainingDay doc if none exists for trainingDate', function(done) {
      dbUtil.getTrainingDayDocument(user, numericDate)
        .then(function(trainingDay) {
          should.exist(trainingDay);
          done();
        });
    });

    it('should return existing trainingDay doc if one exists for trainingDate', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.getTrainingDayDocument(user, numericDate)
          .then(function(trainingDay) {
            should.exist(trainingDay);
            (trainingDay.name).should.match(/Existing trainingDay/);
            done();
          });
      });
    });

    it('should return only sim day trainingDay doc if both a sim day and a clone day exist', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err, newTrainingDay) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.makeSimDay(newTrainingDay, function(err, simDay) {
          if (err) {
            console.log('makeSimDay: ' + err);
          }

          dbUtil.getTrainingDayDocument(user, numericDate)
            .then(function(trainingDay) {
              should.exist(trainingDay);
              (trainingDay._id).should.match(simDay._id);
              (trainingDay.isSimDay).should.match(true);
              done();
            });
        });
      });
    });

  });

  describe('Method getExistingTrainingDayDocument', function() {
    it('should return error if no user', function(done) {
      dbUtil.getExistingTrainingDayDocument(null, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('valid user is required');
          done();
        });
    });

    it('should return error if null trainingDate', function(done) {
      dbUtil.getExistingTrainingDayDocument(user, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('numericDate is required to getTrainingDay');
          done();
        });
    });

    it('should return error if invalid trainingDate', function(done) {
      dbUtil.getExistingTrainingDayDocument(user, 'asdf')
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('not a valid date');
          done();
        });
    });

    it('should return null if no trainingDay doc exists for trainingDate', function(done) {
      dbUtil.getExistingTrainingDayDocument(user, numericDate)
        .then(function(trainingDay) {
          should.not.exist(trainingDay);
          done();
        });
    });

    it('should return existing trainingDay doc if one exists for trainingDate', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.getExistingTrainingDayDocument(user, numericDate)
          .then(function(trainingDay) {
            should.exist(trainingDay);
            (trainingDay.name).should.match(/Existing trainingDay/);
            done();
          });
      });
    });

    it('should return sim trainingDay doc if both a sim day and a clone day exist', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err, newTrainingDay) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.makeSimDay(newTrainingDay, function(err, simDay) {
          if (err) {
            console.log('makeSimDay: ' + err);
          }

          dbUtil.getExistingTrainingDayDocument(user, numericDate)
            .then(function(trainingDay) {
              should.exist(trainingDay);
              (trainingDay.name).should.match(/Existing trainingDay/);
              (trainingDay._id).should.match(simDay._id);
              (trainingDay.isSimDay).should.match(true);
              done();
            });
        });
      });
    });

  });

  describe('Method getTrainingDays', function() {
    it('should return error if no user', function(done) {
      return dbUtil.getTrainingDays(null, null, null, function(err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('valid user is required');
        done();
      });
    });

    it('should return error if missing startDate', function(done) {
      return dbUtil.getTrainingDays(user, null, null, function(err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('numericStartDate is required to getTrainingDay');
        done();
      });
    });

    it('should return error if missing endDate', function(done) {
      return dbUtil.getTrainingDays(user, numericDate, null, function(err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('numericEndDate is required to getTrainingDay');
        done();
      });
    });

    it('should return error if invalid startDate', function(done) {
      return dbUtil.getTrainingDays(user, 'asdf', null, function(err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('numericStartDate');
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return error if invalid endDate', function(done) {
      return dbUtil.getTrainingDays(user, numericDate, 'qwr', function(err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('numericEndDate');
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return three trainingDay docs if no trainingDay exists between startDate and endDate', function(done) {
      return dbUtil.getTrainingDays(user, numericDate, numericEndDate, function(err, trainingDays) {
        should.not.exist(err);
        should.exist(trainingDays);
        (trainingDays.length).should.equal(3);
        done();
      });
    });

    it('should return return three trainingDay docs if one exists for startDate', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.getTrainingDays(user, numericDate, numericEndDate, function(err, trainingDays) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDays.length).should.equal(3);
          done();
        });
      });
    });

    it('should return three trainingDay docs if one exists for endDate', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testHelpers.createTrainingDay(user, endDate, null, function(err) {
          if (err) {
            console.log('createTrainingDay error: ' + err);
          }

          return dbUtil.getTrainingDays(user, numericDate, numericEndDate, function(err, trainingDays) {
            should.not.exist(err);
            should.exist(trainingDay);
            (trainingDays.length).should.equal(3);
            done();
          });
        });
      });
    });
  });

  describe('Method getStartDay', function() {
    it('should return error if no user', function(done) {
      return dbUtil.getStartDay(null, null, function(err, startDay) {
        should.exist(err);
        (err.message).should.containEql('valid user is required');
        done();
      });
    });

    it('should return error if invalid trainingDate', function(done) {
      return dbUtil.getStartDay(user, null, function(err, startDay) {
        should.exist(err);
        (err.message).should.containEql('numericSearchDate is required to getTrainingDay');
        done();
      });
    });

    it('should return null if start day does not exist', function(done) {
      return dbUtil.getStartDay(user, numericDate, function(err, startDay) {
        should.not.exist(err);
        should.equal(startDay, null);
        done();
      });
    });

    it('should return start day if start day exists', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 1, 1, function(err, newStartDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return dbUtil.getStartDay(user, numericDate, function(err, startDay) {
          should.not.exist(err);
          (startDay.date.toString()).should.be.equal(newStartDay.date.toString());
          done();
        });
      });
    });

    it('should return sim start day if start day and clone exists', function(done) {
      testHelpers.createStartingPoint(user, trainingDate, 20, 1, 1, function(err, newStartDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        dbUtil.makeSimDay(newStartDay, function(err, simDay) {
          if (err) {
            console.log('makeSimDay: ' + err);
          }

          return dbUtil.getStartDay(user, numericDate, function(err, startDay) {
            should.not.exist(err);
            (startDay.date.toString()).should.be.equal(newStartDay.date.toString());
            (startDay._id).should.match(simDay._id);
            (startDay.isSimDay).should.match(true);
            done();
          });
        });
      });
    });
  });

  describe('Method getFuturePriorityDays', function() {
    it('should return error if no user', function(done) {
      dbUtil.getFuturePriorityDays(null, null, null, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('valid user is required');
          done();
        });
    });

    it('should return error if missing trainingDate', function(done) {
      dbUtil.getFuturePriorityDays(user, null, null, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('numericSearchDate is required');
          done();
        });
    });

    it('should return error if invalid trainingDate', function(done) {
      dbUtil.getFuturePriorityDays(user, 'asdf', null, null)
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('is not a valid date');
          done();
        });
    });

    it('should return empty array if no priority days exist', function(done) {
      dbUtil.getFuturePriorityDays(user, numericDate, 1, 10)
        .then(function(priorityDays) {
          priorityDays.should.have.length(0);
          done();
        });
    });

    it('should return empty array if no days of requested priority exist', function(done) {
      testHelpers.createGoalEvent(user, trainingDate, 10, function(err) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        dbUtil.getFuturePriorityDays(user, numericDate, 2, 11)
          .then(function(priorityDays) {
            priorityDays.should.have.length(0);
            done();
          });
      });
    });

    it('should return array of one goal day if one goal day exists within time limit', function(done) {
      testHelpers.createGoalEvent(user, trainingDate, 10, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        dbUtil.getFuturePriorityDays(user, numericDate, 1, 10)
          .then(function(priorityDays) {
            priorityDays.should.have.length(1);
            (priorityDays[0].date.toString()).should.be.equal(newGoalDay.date.toString());
            done();
          });
      });
    });

    it('should return sim goal day if goal day and clone exists', function(done) {
      testHelpers.createGoalEvent(user, trainingDate, 10, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        dbUtil.makeSimDay(newGoalDay, function(err, simDay) {
          if (err) {
            console.log('makeSimDay: ' + err);
          }

          dbUtil.getFuturePriorityDays(user, numericDate, 1, 10)
            .then(function(priorityDays) {
              priorityDays.should.have.length(1);
              (priorityDays[0].date.toString()).should.be.equal(newGoalDay.date.toString());
              (priorityDays[0]._id).should.match(simDay._id);
              (priorityDays[0].isSimDay).should.match(true);
              done();
            });
        });
      });
    });

    it('should return array of two goal days if two goal days exist within time limit', function(done) {
      testHelpers.createGoalEvent(user, trainingDate, 10, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        testHelpers.createGoalEvent(user, trainingDate, 20, function(err, newGoalDay2) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          dbUtil.getFuturePriorityDays(user, numericDate, 1, 20)
            .then(function(priorityDays) {
              priorityDays.should.have.length(2);
              (priorityDays[0].date.toString()).should.be.equal(newGoalDay.date.toString());
              (priorityDays[1].date.toString()).should.be.equal(newGoalDay2.date.toString());
              done();
            });
        });
      });
    });
  });

  describe('Method getMostRecentGoalDay', function() {
    it('should return error if no user', function(done) {
      return dbUtil.getMostRecentGoalDay(null, null, function(err, mostRecentGoalDay) {
        should.exist(err);
        (err.message).should.containEql('valid user is required');
        done();
      });
    });

    it('should return error if missing trainingDate', function(done) {
      return dbUtil.getMostRecentGoalDay(user, null, function(err, mostRecentGoalDay) {
        should.exist(err);
        (err.message).should.containEql('numericSearchDate is required');
        done();
      });
    });

    it('should return null if no prior goal days exist', function(done) {
      return dbUtil.getMostRecentGoalDay(user, numericDate, function(err, mostRecentGoalDay) {
        should.not.exist(err);
        should.equal(mostRecentGoalDay, null);
        done();
      });
    });

    it('should return goal day if one prior goal day exists', function(done) {
      testHelpers.createGoalEvent(user, moment(trainingDate).subtract(10, 'days').toDate(), 0, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        return dbUtil.getMostRecentGoalDay(user, numericDate, function(err, mostRecentGoalDay) {
          should.not.exist(err);
          (mostRecentGoalDay.date.toString()).should.be.equal(newGoalDay.date.toString());
          done();
        });
      });
    });

    it('should return sim goal day if one prior goal day and a clone exist', function(done) {
      testHelpers.createGoalEvent(user, moment(trainingDate).subtract(10, 'days').toDate(), 0, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        dbUtil.makeSimDay(newGoalDay, function(err, simDay) {
          if (err) {
            console.log('makeSimDay: ' + err);
          }

          return dbUtil.getMostRecentGoalDay(user, numericDate, function(err, mostRecentGoalDay) {
            should.not.exist(err);
            (mostRecentGoalDay.date.toString()).should.be.equal(newGoalDay.date.toString());
            (mostRecentGoalDay._id).should.match(simDay._id);
            (mostRecentGoalDay.isSimDay).should.match(true);
            done();
          });
        });
      });
    });

    it('should return most recent goal day if two prior goal days exist', function(done) {
      testHelpers.createGoalEvent(user, moment(trainingDate).subtract(10, 'days'), 0, function(err, newGoalDay) {
        if (err) {
          console.log('createGoalEvent: ' + err);
        }

        testHelpers.createGoalEvent(user, moment(trainingDate).subtract(20, 'days'), 0, function(err, newGoalDay2) {
          if (err) {
            console.log('createGoalEvent: ' + err);
          }

          return dbUtil.getMostRecentGoalDay(user, numericDate, function(err, mostRecentGoalDay) {
            should.not.exist(err);
            (mostRecentGoalDay.date.toString()).should.be.equal(newGoalDay.date.toString());
            done();
          });
        });
      });
    });

  });


  describe('Method clearFutureMetricsAndAdvice', function() {
    it('should return error if no user', function(done) {
      metricsParams.user = null;
      return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
        should.exist(err);
        (err.message).should.containEql('valid user is required');
        done();
      });
    });

    it('should return error if null trainingDate', function(done) {
      metricsParams.numericDate = null;
      return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
        should.exist(err);
        (err.message).should.containEql('numericDate is required');
        done();
      });
    });

    it('should return error if invalid trainingDate', function(done) {
      metricsParams.numericDate = 'NaN';
      return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
        should.exist(err);
        (err.message).should.containEql('not a valid date');
        done();
      });
    });

    it('should return error if missing metricsType', function(done) {
      metricsParams.metricsType = null;
      return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
        should.exist(err);
        (err.message).should.containEql('metricsType is required');
        done();
      });
    });

    // it('should return null rawResponse if trainingDate is tomorrow', function(done) {
    //   return dbUtil.clearFutureMetricsAndAdvice(user, util.toNumericDate(moment(trainingDate).add(1, 'day')), metricsType, function(err, rawResponse) {
    //     should.not.exist(err);
    //     should.not.exist(rawResponse);
    //     done();
    //   });
    // });

    it('should return match count of 0 and modified count of 0 if no trainingDay docs exist past trainingDate', function(done) {
      metricsParams.numericDate = util.toNumericDate(moment(trainingDate).subtract(1, 'day'));
      return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
        should.not.exist(err);
        (rawResponse.n).should.equal(0);
        (rawResponse.nModified).should.equal(0);
        done();
      });
    });

    it('should return match count of 1 and modified count of 0 if one clean trainingDay exists past today', function(done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).add(1, 'day'), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(0);
          done();
        });
      });
    });

    it('should return match count of 1 and modified count of 0 if one clean trainingDay exists past trainingDate', function(done) {
      //Not sure why I have to add 1 second for the method (which used $gte on date) to include my created TD.
      //If I use .startOf('day') on my trainingDate here and below then $gte included my created TD.
      //I'm not going to worry about it right now as it seems to work correctly in real use but it bugs me...
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        metricsParams.numericDate = util.toNumericDate(moment(trainingDate).subtract(2, 'days'));
        dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(0);
          done();
        });
      });
    });

    it('should return match count of 1 and modified count of 1 if one dirty trainingDay exists past trainingDate', function(done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        let metrics = _.find(testTD.metrics, ['metricsType', 'actual']);
        metrics.fitness = 99;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          metricsParams.numericDate = util.toNumericDate(moment(trainingDate).subtract(2, 'days'));
          return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
            should.not.exist(err);
            (rawResponse.n).should.equal(1);
            (rawResponse.nModified).should.equal(1);
            done();
          });
        });
      });
    });

    it('should return match count of 1 and modified count of 1 if one dirty trainingDay exists past trainingDate and is sim day with clone', function(done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        let metrics = _.find(testTD.metrics, ['metricsType', 'actual']);
        metrics.fitness = 99;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          dbUtil.makeSimDay(testTD, function(err, simDay) {
            if (err) {
              console.log('makeSimDay: ' + err);
            }

            metricsParams.numericDate = util.toNumericDate(moment(trainingDate).subtract(2, 'days'));
            return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
              should.not.exist(err);
              (rawResponse.n).should.equal(1);
              (rawResponse.nModified).should.equal(1);
              done();
            });
          });
        });
      });
    });

    it('should return match count of 0 and modified count of 0 if one dirty trainingDay exists past trainingDate but is startingPoint day', function(done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testTD.fitness = 99;
        testTD.startingPoint = true;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          metricsParams.numericDate = util.toNumericDate(moment(trainingDate).subtract(2, 'days'));
          return dbUtil.clearFutureMetricsAndAdvice(metricsParams, function(err, rawResponse) {
            should.not.exist(err);
            (rawResponse.n).should.equal(0);
            (rawResponse.nModified).should.equal(0);
            done();
          });
        });
      });
    });
  });

  // describe('Method clearPlanningData', function() {
  //   it('should return error if no user', function(done) {
  //     dbUtil.clearPlanningData(null, null)
  //       .catch(function(err) {
  //         (err.message).should.containEql('valid user is required');
  //         done();
  //       });
  //   });

  //   it('should return error if missing date', function(done) {
  //     dbUtil.clearPlanningData(user, null)
  //       .catch(function(err) {
  //         (err.message).should.containEql('numericDate is required');
  //         done();
  //       });
  //   });

  //   it('should return error if invalid date', function(done) {
  //     dbUtil.clearPlanningData(user, 'erty')
  //       .catch(function(err) {
  //         (err.message).should.containEql('not a valid date');
  //         done();
  //       });
  //   });

  //   it('should return match count of 0 and modified count of 0 if no trainingDay docs exist', function(done) {
  //     dbUtil.clearPlanningData(user, numericDate)
  //       .then(function(rawResponse) {
  //         (rawResponse.n).should.equal(0);
  //         (rawResponse.nModified).should.equal(0);
  //         done();
  //       });
  //   });

  //   it('should return match count of 1 and modified count of 0 if one clean trainingDay exists', function(done) {
  //     testHelpers.createTrainingDay(user, trainingDate, null, function(err, testTD) {
  //       if (err) {
  //         console.log('createTrainingDay error: ' + err);
  //       }

  //       dbUtil.clearPlanningData(user, numericDate)
  //         .then(function(rawResponse) {
  //           (rawResponse.n).should.equal(1);
  //           (rawResponse.nModified).should.equal(0);
  //           done();
  //         });
  //     });
  //   });

  //   it('should return match count of 1 and modified count of 1 if one dirty trainingDay exists', function(done) {
  //     var completedActivities = [{
  //       load: 999,
  //       source: 'plangeneration'
  //     }];

  //     testHelpers.createTrainingDay(user, trainingDate, completedActivities, function(err, testTD) {
  //       if (err) {
  //         console.log('createTrainingDay error: ' + err);
  //       }

  //       dbUtil.clearPlanningData(user, numericDate)
  //         .then(function(rawResponse) {
  //           (rawResponse.n).should.equal(1);
  //           (rawResponse.nModified).should.equal(1);
  //           done();
  //         });
  //     });
  //   });

  // });

  describe('Method removePlanGenerationActivities', function() {
    it('should return error if no user', function(done) {
      dbUtil.removePlanGenerationActivities(null, null)
        .catch(function(err) {
          (err.message).should.containEql('valid user is required');
          done();
        });
    });

    it('should return error if missing date', function(done) {
      dbUtil.removePlanGenerationActivities(user, null)
        .catch(function(err) {
          (err.message).should.containEql('numericDate is required');
          done();
        });
    });

    it('should return error if invalid date', function(done) {
      dbUtil.removePlanGenerationActivities(user, 'erty')
        .catch(function(err) {
          (err.message).should.containEql('not a valid date');
          done();
        });
    });

    it('should return match count of 0 and modified count of 0 if no trainingDay docs exist', function(done) {
      dbUtil.removePlanGenerationActivities(user, numericDate)
        .then(function(rawResponse) {
          (rawResponse.n).should.equal(0);
          (rawResponse.nModified).should.equal(0);
          done();
        },
        function(err) {
          // should.not.exist(err);
          done(err);
        });
    });

    it('should return match count of 0 and modified count of 0 if only prior trainingDay exists', function(done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.removePlanGenerationActivities(user, numericDate)
          .then(function(rawResponse) {
            (rawResponse.n).should.equal(0);
            (rawResponse.nModified).should.equal(0);
            done();
          },
          function(err) {
            // should.not.exist(err);
            done(err);
          });
      });
    });

    it('should return match count of 1 and modified count of 0 if one clean trainingDay exists', function(done) {
      testHelpers.createTrainingDay(user, tomorrowDate, null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.removePlanGenerationActivities(user, numericDate)
          .then(function(rawResponse) {
            (rawResponse.n).should.equal(1);
            (rawResponse.nModified).should.equal(0);
            done();
          },
          function(err) {
            // should.not.exist(err);
            done(err);
          });
      });
    });

    it('should return match count of 1 and modified count of 1 if one trainingDay with plangeneration completedActivities exists', function(done) {
      var completedActivities = [{
        load: 999,
        source: 'plangeneration'
      }];

      testHelpers.createTrainingDay(user, tomorrowDate, completedActivities, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        dbUtil.removePlanGenerationActivities(user, numericDate)
          .then(function(rawResponse) {
            (rawResponse.n).should.equal(1);
            (rawResponse.nModified).should.equal(1);
            done();
          },
          function(err) {
            // should.not.exist(err);
            done(err);
          });
      });
    });

    it('should return match count of 1 and modified count of 1 if one trainingDay with plangeneration plannedActivities exists', function(done) {
      testHelpers.createTrainingDay(user, tomorrowDate, null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        var plannedActivities = [{
          source: 'plangeneration'
        }];

        testTD.plannedActivities = plannedActivities;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          dbUtil.removePlanGenerationActivities(user, numericDate)
            .then(function(rawResponse) {
              (rawResponse.n).should.equal(1);
              (rawResponse.nModified).should.equal(1);
              done();
            },
            function(err) {
              // should.not.exist(err);
              done(err);
            });
        });
      });
    });

    it('should return match count of 1 and modified count of 1 if one trainingDay with plangeneration plannedActivities and completedActivities exists', function(done) {
      var completedActivities = [{
        load: 999,
        source: 'plangeneration'
      }];

      testHelpers.createTrainingDay(user, tomorrowDate, completedActivities, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        var plannedActivities = [{
          source: 'plangeneration'
        }];

        testTD.plannedActivities = plannedActivities;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          dbUtil.removePlanGenerationActivities(user, numericDate)
            .then(function(rawResponse) {
              (rawResponse.n).should.equal(1);
              (rawResponse.nModified).should.equal(1);
              done();
            },
            function(err) {
              // should.not.exist(err);
              done(err);
            });
        });
      });
    });

  });

  describe('Method didWeGoHardTheDayBefore', function() {
    it('should return true if yesterday was a hard day', function(done) {
      var completedActivities = [{
        load: 999,
        source: 'plangeneration'
      }];

      var yesterday = moment(trainingDate).subtract(1, 'days');

      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        let metrics = _.find(createdTrainingDay.metrics, ['metricsType', 'actual']);
        metrics.loadRating = 'hard';

        testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.dateNumeric, 'actual', function(err, wentHard) {
            if (err) {
              console.log('didWeGoHardTheDayBefore: ' + err);
            }

            should.not.exist(err);
            (wentHard).should.match(true);
            done();
          });
        });
      });
    });

    // it('should return false if yesterday was a hard day but no completedActivities', function(done) {
    //   var yesterday = moment(trainingDate).subtract(1, 'days');
    //   testHelpers.createTrainingDay(user, yesterday, null, function(err, createdTrainingDay) {
    //     if (err) {
    //       console.log('createTrainingDay: ' + err);
    //     }

    //     let metrics = _.find(createdTrainingDay.metrics, ['metricsType', 'actual']);
    //     metrics.loadRating = 'hard';

    //     testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
    //       if (err) {
    //         console.log('updateTrainingDay: ' + err);
    //       }

    //       return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.dateNumeric, 'actual', function(err, wentHard) {
    //         if (err) {
    //           console.log('didWeGoHardTheDayBefore: ' + err);
    //         }

    //         should.not.exist(err);
    //         (wentHard).should.match(false);
    //         done();
    //       });
    //     });
    //   });
    // });

    it('should return false if yesterday was not a hard day', function(done) {
      var completedActivities = [{
        load: 22,
        source: 'plangeneration'
      }];
      var yesterday = moment(trainingDate).subtract(1, 'days');
      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        createdTrainingDay.loadRating = 'moderate';
        testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.dateNumeric, 'actual', function(err, wentHard) {
            if (err) {
              console.log('didWeGoHardTheDayBefore: ' + err);
            }

            should.not.exist(err);
            (wentHard).should.match(false);
            done();
          });
        });
      });
    });

    it('should return false if yesterday was a sim and not a hard day but a clone exists that was a hard day', function(done) {
      var completedActivities = [{
        load: 22,
        source: 'plangeneration'
      }];
      var yesterday = moment(trainingDate).subtract(1, 'days');
      testHelpers.createTrainingDay(user, yesterday, completedActivities, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        createdTrainingDay.loadRating = 'hard';
        testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          dbUtil.makeSimDay(createdTrainingDay, function(err, simDay) {
            if (err) {
              console.log('makeSimDay: ' + err);
            }

            createdTrainingDay.loadRating = 'moderate';
            testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
              if (err) {
                console.log('updateTrainingDay: ' + err);
              }

              return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.dateNumeric, 'actual', function(err, wentHard) {
                if (err) {
                  console.log('didWeGoHardTheDayBefore: ' + err);
                }

                should.not.exist(err);
                (wentHard).should.match(false);
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('Method makeSimDay', function() {
    it('should return isSimDay is true and create a clone of the day', function(done) {
      dbUtil.makeSimDay(trainingDay, function(err, simDay) {
        if (err) {
          console.log('makeSimDay: ' + err);
        }

        should.not.exist(err);
        (simDay.isSimDay).should.match(true);
        should.equal(simDay.cloneOfId, null);

        return TrainingDay.find({ cloneOfId: { $ne: null } }, function(err, trainingDays) {
          trainingDays.should.have.length(1);
          (trainingDays[0].cloneOfId).should.match(simDay._id);
          done();
        });
      });
    });
  });

  describe('Method commitSimulation', function() {
    it('should keep sim day and remove clone day', function(done) {
      dbUtil.makeSimDay(trainingDay, function(err, simDay) {
        if (err) {
          console.log('makeSimDay: ' + err);
        }

        dbUtil.commitSimulation(user, function(err) {
          if (err) {
            console.log('commitSimulation: ' + err);
          }

          return TrainingDay.find({}, function(err, trainingDays) {
            trainingDays.should.have.length(1);
            (trainingDays[0]._id).should.match(simDay._id);
            done();
          });
        });
      });
    });
  });

  describe('Method revertSimulation', function() {
    it('should remove sim day and keep clone day', function(done) {
      dbUtil.makeSimDay(trainingDay, function(err, simDay) {
        if (err) {
          console.log('makeSimDay: ' + err);
        }

        dbUtil.revertSimulation(user, function(err) {
          if (err) {
            console.log('revertSimulation: ' + err);
          }

          return TrainingDay.find({}, function(err, trainingDays) {
            trainingDays.should.have.length(1);
            (trainingDays[0]._id).should.not.match(simDay._id);
            should.equal(trainingDays[0].cloneOfId, null);
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
