'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  proxyquire = require('proxyquire').noPreserveCache(),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require('./util/test-helpers'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants'));

var stravaUtil,
  stravaStub,
  user,
  workoutDate,
  workoutDateOffset,
  trainingDate,
  trainingDay,
  wattagePayload = [{
    'type': 'time',
    'data': [
      1,
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000,
      1100
    ],
    'series_type': 'distance',
    'original_size': 7330,
    'resolution': 'low'
  }, {
    'type': 'watts',
    'data': [
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189
    ],
    'series_type': 'distance',
    'original_size': 7330,
    'resolution': 'low'
  }],
  estimatedWattagePayload = [{
    'type': 'time',
    'data': [
      1,
      100,
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000,
      1100
    ],
    'series_type': 'distance',
    'original_size': 7330,
    'resolution': 'low'
  }, {
    'type': 'watts_calc',
    'data': [
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189,
      189
    ],
    'series_type': 'distance',
    'original_size': 7330,
    'resolution': 'low'
  }];

describe('strava-util Unit Tests:', function() {
  before(function(done) {
    stravaStub = {};
    stravaStub.athlete = {};
    stravaStub.streams = {};
    stravaUtil = proxyquire('../../server/lib/strava-util', { 'strava-v3': stravaStub });

    done();
  });

  beforeEach(function(done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      user.providerData.accessToken = 'accessToken';

      // We need start_date_local to be a local date but formatted as utc.
      // moment.utc(workoutDate).format() gives us the correct format but converts to utc.
      // If we add the offset from utc before we call moment.utc() then we
      // end up with local time in utc format.

      //starting from moment().toDate():  2016-10-25T00:11:29.094Z
      workoutDateOffset = moment().utcOffset(); // -360 for MDT
      workoutDate = moment().add(workoutDateOffset, 'minutes').subtract(1, 'day').toDate(); // workout yesterday by default.
      // workoutDate:                      2016-10-23T18:11:29.367Z - this is a JS date
      // moment.utc(workoutDate).format(): 2016-10-23T18:11:29Z
      // Strava returns this format and this is what we do below in each test where we use workoutDate.

      trainingDate = moment().subtract(1, 'day').startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);

      //Need a starting day to avoid error from update metrics.
      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        stravaStub.streams.activity = function(parm, callback) {
          return callback(null, wattagePayload);
        };

        done();
      });
    });
  });

  describe('Method fetchActivity', function() {
    it('should return an error when strava.activities.get fails', function(done) {
      stravaStub.activities.get = function(parm, callback) {
        return callback(new Error('Stubbed activities.get error'));
      };

      stravaUtil.fetchActivity(user, 99)
        .then(function() {
          // Should not be here.
        })
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('strava.activities.get access failed');
          done();
        });
    });

    it('should return an error when strava.athlete.listActivities returns payload.errors', function(done) {
      stravaStub.activities.get = function(parm, callback) {
        return callback(null, { message: 'payload error message', errors: ['payload Error'] });
      };

      stravaUtil.fetchActivity(user, 99)
        .then(function() {
          // Should not be here.
        })
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('payload error message');
          done();
        });
    });

    it('should return an error when strava.streams.activity fails', function(done) {
      var activity = {
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342,
        total_elevation_gain: 123
      };

      stravaStub.activities.get = function(parm, callback) {
        return callback(null, activity);
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(new Error('Stubbed streams.activity error'), null);
      };

      stravaUtil.fetchActivity(user, 99)
        .then(function() {
          // Should not be here.
        })
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('stravaUtil.getAverageWatts returned error');
          done();
        });
    });

    it('should resolve when activity is returned', function(done) {
      var activity = {
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342,
        total_elevation_gain: 123
      };

      stravaStub.activities.get = function(parm, callback) {
        return callback(null, activity);
      };

      stravaUtil.fetchActivity(user, 752757127)
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        });
    });

    it('should resolve when activity with estimated watts is returned', function(done) {
      var activity = {
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        average_watts: 189,
        moving_time: 9342,
        total_elevation_gain: 123
      };

      stravaStub.activities.get = function(parm, callback) {
        return callback(null, activity);
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, estimatedWattagePayload);
      };

      stravaUtil.fetchActivity(user, 752757127)
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        });
    });

    it('should resolve when activity is returned but it has been downloaded previously', function(done) {
      var activity = {
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342,
        total_elevation_gain: 123
      };

      stravaStub.activities.get = function(parm, callback) {
        return callback(null, activity);
      };

      stravaUtil.fetchActivity(user, 752757127)
        .then(function() {
          return stravaUtil.fetchActivity(user, 752757127);
        })
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          done();
        })
        .catch(function(err) {
          should.not.exist(err);
          done();
        });
    });

  });

  describe('Method downloadActivities', function() {
    it('should return an error when strava.athlete.listActivities fails', function(done) {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(new Error('Stubbed athlete.listActivities error'));
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.exist(err);
        (err.message).should.containEql('athlete.listActivities error');
        done();
      });
    });

    it('should return an error when strava.streams.activity fails', function(done) {
      var activities = [{
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(new Error('Stubbed streams.activity error'), null);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.exist(err);
        (err.message).should.containEql('stravaUtil.getAverageWatts returned error');
        done();
      });
    });

    it('should return an error when strava.athlete.listActivities returns payload.errors', function(done) {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, { message: 'payload error message', errors: ['payload Error'] });
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.exist(err);
        (err.message).should.containEql('payload error message');
        done();
      });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities returns no activities', function(done) {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.not.exist(err);
        (returnedTrainingDay.lastStatus.text).should.containEql('found no Strava activities for the day');
        done();
      });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities activities exist but none for requested day', function(done) {
      var activities = [{
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).subtract(1, 'day').format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }, {
        id: 752757129,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).add(1, 'day').format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.not.exist(err);
        (returnedTrainingDay.lastStatus.text).should.containEql('found no new Strava activities for the day');
        done();
      });
    });

    it('should return one completedActivity when strava.athlete.listActivities returns one activity for requested day', function(done) {
      var activities = [{
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.not.exist(err);
        (returnedTrainingDay.lastStatus.text).should.containEql('downloaded one new Strava activity');
        (returnedTrainingDay.completedActivities.length).should.equal(1);
        done();
      });
    });

    it('should return two completedActivities when strava.athlete.listActivities returns two activities for requested day', function(done) {
      var activities = [{
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }, {
        id: 752757128,
        name: 'Dinner Ride',
        start_date_local: moment.utc(workoutDate).add(1, 'second').format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.not.exist(err);
        (returnedTrainingDay.lastStatus.text).should.containEql('downloaded 2 new Strava activities');
        (returnedTrainingDay.completedActivities.length).should.equal(2);
        done();
      });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities returns one activity for requested day but it has been downloaded previously', function(done) {
      var activities = [{
        id: 752757127,
        name: 'Lunch Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaUtil.downloadActivities(user, trainingDay, function(err, firstReturnedTrainingDay) {
        if (err) {
          console.log('firstReturnedTrainingDay err: ', err);
        }

        return stravaUtil.downloadActivities(user, firstReturnedTrainingDay, function(err, returnedTrainingDay) {
          should.not.exist(err);
          (returnedTrainingDay.lastStatus.text).should.containEql('found no new Strava activities for the day');
          (returnedTrainingDay.completedActivities.length).should.equal(1);
          done();
        });
      });
    });

    it('should return correct load for completedActivity when strava.athlete.listActivities returns activity for requested day', function(done) {
      var activities = [{
          id: 752757127,
          name: 'Lunch Ride',
          start_date_local: moment.utc(workoutDate).format(),
          weighted_average_watts: 189,
          moving_time: 9342
        }],
        weightedAverageWatts = 189,
        intensity = Math.round((weightedAverageWatts / user.thresholdPower) * 100) / 100,
        expectedLoad = Math.round(((9342 * weightedAverageWatts * intensity) / (user.thresholdPower * 3600)) * 100);

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay, function(err, returnedTrainingDay) {
        should.not.exist(err);
        (returnedTrainingDay.lastStatus.text).should.containEql('downloaded one new Strava activity');
        (returnedTrainingDay.completedActivities.length).should.equal(1);
        (returnedTrainingDay.completedActivities[0].load).should.equal(expectedLoad);
        done();
      });
    });

  });

  afterEach(function(done) {
    TrainingDay.remove().exec(function() {
      User.remove().exec(done);
    });
  });
});
