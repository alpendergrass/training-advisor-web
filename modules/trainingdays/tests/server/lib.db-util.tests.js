'use strict';

/**
 * Module dependencies.
 */
var should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require('./util/test-helpers'),
  dbUtil = require('../../server/lib/db-util');

/**
 * Globals
 */
var user, trainingDate, endDate, trainingDay;

describe('db-util Unit Tests:', function () {

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;    

      trainingDate = moment().startOf('day').toDate();
      endDate = moment().add(2, 'days').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      done();
    });
  });

  describe('Method getTrainingDayDocument', function () {
    it('should return error if no user', function (done) {
      return dbUtil.getTrainingDayDocument(null, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if invalid trainingDate', function (done) {
      return dbUtil.getTrainingDayDocument(user, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('trainingDate null is not a valid date');
        done();
      });
    });

    it('should return new trainingDay doc if none exists for trainingDate', function (done) {
      return dbUtil.getTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
        should.not.exist(err);
        should.exist(trainingDay);
        done();
      });
    });

    it('should return existing trainingDay doc if one exists for trainingDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.getTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          //console.log('trainingDay:' + trainingDay);
          (trainingDay.name).should.match(/Existing trainingDay/);
          done();
        });
      });
    });

    it('should return error if multiple documents exist for trainingDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
          if (err) {
            console.log('createTrainingDay error: ' + err);
          }

          return dbUtil.getTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
            should.exist(err);
            (err.message).should.containEql('Multiple trainingDay documents returned for date');
            done();
          });
        });
      });
    });

  });

  describe('Method getExistingTrainingDayDocument', function () {
    it('should return error if no user', function (done) {
      return dbUtil.getExistingTrainingDayDocument(null, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if invalid trainingDate', function (done) {
      return dbUtil.getExistingTrainingDayDocument(user, null, function (err, trainingDay) {
        should.exist(err);
        (err.message).should.match('trainingDate null is not a valid date');
        done();
      });
    });

    it('should return null if no trainingDay doc exists for trainingDate', function (done) {
      return dbUtil.getExistingTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
        should.not.exist(err);
        should.not.exist(trainingDay);
        done();
      });
    });

    it('should return existing trainingDay doc if one exists for trainingDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.getExistingTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
          should.not.exist(err);
          should.exist(trainingDay);
          //console.log('trainingDay:' + trainingDay);
          (trainingDay.name).should.match(/Existing trainingDay/);
          done();
        });
      });
    });

    it('should return error if multiple documents exist for trainingDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
          if (err) {
            console.log('createTrainingDay error: ' + err);
          }

          return dbUtil.getExistingTrainingDayDocument(user, trainingDate, function (err, trainingDay) {
            should.exist(err);
            (err.message).should.containEql('Multiple trainingDay documents returned for date');
            done();
          });
        });
      });
    });
  });

  describe('Method getTrainingDays', function () {
    it('should return error if no user', function (done) {
      return dbUtil.getTrainingDays(null, null, null, function (err, trainingDays) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if invalid startDate', function (done) {
      return dbUtil.getTrainingDays(user, null, null, function (err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('startDate');
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return error if invalid endDate', function (done) {
      return dbUtil.getTrainingDays(user, trainingDate, null, function (err, trainingDays) {
        should.exist(err);
        (err.message).should.containEql('endDate');
        (err.message).should.containEql('is not a valid date');
        done();
      });
    });

    it('should return three trainingDay docs if no trainingDay exists between startDate and endDate', function (done) {
      return dbUtil.getTrainingDays(user, trainingDate, endDate, function (err, trainingDays) {
        should.not.exist(err);
        should.exist(trainingDays);
        (trainingDays.length).should.equal(3);
        done();
      });
    });

    it('should return return three trainingDay docs if one exists for startDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.getTrainingDays(user, trainingDate, endDate, function (err, trainingDays) {
          should.not.exist(err);
          should.exist(trainingDay);
          (trainingDays.length).should.equal(3);
          done();
        });
      });
    });

    it('should return three trainingDay docs if one exists for endDate', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testHelpers.createTrainingDay(user, endDate, null, function(err) {
          if (err) {
            console.log('createTrainingDay error: ' + err);
          }

          return dbUtil.getTrainingDays(user, trainingDate, endDate, function (err, trainingDays) {
            should.not.exist(err);
            should.exist(trainingDay);
            (trainingDays.length).should.equal(3);
            done();
          });
        });
      });
    });

  });

  describe('Method clearFutureMetricsAndAdvice', function () {
    it('should return error if no user', function (done) {
      return dbUtil.clearFutureMetricsAndAdvice(null, null, function (err, rawResponse) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return error if invalid trainingDate', function (done) {
      return dbUtil.clearFutureMetricsAndAdvice(user, null, function (err, rawResponse) {
        should.exist(err);
        (err.message).should.match('startDate null is not a valid date');
        done();
      });
    });

    it('should return match count of 0 and modified count of zero if no trainingDay docs exist past trainingDate', function (done) {
      return dbUtil.clearFutureMetricsAndAdvice(user, trainingDate, function (err, rawResponse) {
        should.not.exist(err);
        (rawResponse.n).should.equal(0);
        (rawResponse.nModified).should.equal(0);
        done();
      });
    });

    it('should return match count of 0 and modified count of 0 if one clean trainingDay exists past today', function (done) {
      testHelpers.createTrainingDay(user, trainingDate, null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.clearFutureMetricsAndAdvice(user, moment(trainingDate).subtract(1, 'day').toDate(), function (err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(0);
          done();
        });
      });
    });

    it('should return match count of 1 and modified count of 0 if one clean trainingDay exists past trainingDate', function (done) {
      //Not sure why I have to add 1 second for the method (which used $gte on date) to include my created TD. 
      //If I use .startOf('day') on my trainingDate here and below then $gte included my created TD. 
      //I'm not going to worry about it right now as it seems to work correctly in real use but it bugs me...
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.clearFutureMetricsAndAdvice(user, moment(trainingDate).subtract(2, 'days').toDate(), function (err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(0);
          done();
        });
      });
    });

    it('should return match count of 1 and modified count of 1 if one dirty trainingDay exists past trainingDate', function (done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testTD.fitness = 99;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.clearFutureMetricsAndAdvice(user, moment(trainingDate).subtract(2, 'days').toDate(), function (err, rawResponse) {
            should.not.exist(err);
            (rawResponse.n).should.equal(1);
            (rawResponse.nModified).should.equal(1);
            done();
          });
        });
      });
    });

    it('should return match count of 0 and modified count of 0 if one dirty trainingDay exists past trainingDate but is true-up day', function (done) {
      testHelpers.createTrainingDay(user, moment(trainingDate).subtract(1, 'day').add(1, 'second').toDate(), null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        testTD.fitness = 99;
        testTD.fitnessAndFatigueTrueUp = true;

        testHelpers.updateTrainingDay(testTD, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.clearFutureMetricsAndAdvice(user, moment(trainingDate).subtract(2, 'days').toDate(), function (err, rawResponse) {
            should.not.exist(err);
            (rawResponse.n).should.equal(0);
            (rawResponse.nModified).should.equal(0);
            done();
          });
        });
      });
    });

    it('should return match count of 0 and modified count of 0 if one dirty trainingDay exists past trainingDate but is startingPoint day', function (done) {
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

          return dbUtil.clearFutureMetricsAndAdvice(user, moment(trainingDate).subtract(2, 'days').toDate(), function (err, rawResponse) {
            should.not.exist(err);
            (rawResponse.n).should.equal(0);
            (rawResponse.nModified).should.equal(0);
            done();
          });
        });
      });
    });
  });

  describe('Method removePlanningActivities', function () {
    it('should return error if no user', function (done) {
      return dbUtil.removePlanningActivities(null, function (err, rawResponse) {
        should.exist(err);
        (err.message).should.match('valid user is required');
        done();
      });
    });
    
    it('should return match count of 0 and modified count of 0 if no trainingDay docs exist', function (done) {
      return dbUtil.removePlanningActivities(user, function (err, rawResponse) {
        should.not.exist(err);
        (rawResponse.n).should.equal(0);
        (rawResponse.nModified).should.equal(0);
        done();
      });
    });

    it('should return match count of 1 and modified count of 0 if one clean trainingDay exists', function (done) {
      //Not sure why I have to add 1 second for the method (which used $gte on date) to include my created TD. 
      //If I use .startOf('day') on my trainingDate here and below then $gte included my created TD. 
      //I'm not going to worry about it right now as it seems to work correctly in real use but it bugs me...
      testHelpers.createTrainingDay(user, trainingDate, null, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.removePlanningActivities(user, function (err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(0);
          done();
        });
      });
    });

    it('should return match count of 1 and modified count of 1 if one dirty trainingDay exists', function (done) {
      var completedActivities = [{
        load: 999,
        source: 'plangeneration'
      }];

      testHelpers.createTrainingDay(user, trainingDate, completedActivities, function(err, testTD) {
        if (err) {
          console.log('createTrainingDay error: ' + err);
        }

        return dbUtil.removePlanningActivities(user, function (err, rawResponse) {
          should.not.exist(err);
          (rawResponse.n).should.equal(1);
          (rawResponse.nModified).should.equal(1);
          done();
        });
      });
    });

  });

  describe('Method didWeGoHardTheDayBefore', function () {
    it('should return true if yesterday was a hard day', function (done) {
      var yesterday = moment(trainingDate).subtract(1, 'days');
      testHelpers.createTrainingDay(user, yesterday, null, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        createdTrainingDay.loadRating = 'hard';
        testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.date, function (err, wentHard) {
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

    it('should return false if yesterday was not a hard day', function (done) {
      var yesterday = moment(trainingDate).subtract(1, 'days');
      testHelpers.createTrainingDay(user, yesterday, null, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        createdTrainingDay.loadRating = 'moderate';
        testHelpers.updateTrainingDay(createdTrainingDay, function(err) {
          if (err) {
            console.log('updateTrainingDay: ' + err);
          }

          return dbUtil.didWeGoHardTheDayBefore(user, trainingDay.date, function (err, wentHard) {
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

  afterEach(function (done) {
    TrainingDay.remove().exec(function () {
      User.remove().exec(done);
    });
  });
});
