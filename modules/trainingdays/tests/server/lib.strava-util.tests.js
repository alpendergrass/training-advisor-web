'use strict';

var path = require('path'),
  should = require('should'),
  mongoose = require('mongoose'),
  moment = require('moment'),
  proxyquire = require('proxyquire').noPreserveCache(),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  util = require(path.resolve('./modules/trainingdays/server/lib/util')),
  testHelpers = require('./util/test-helpers'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants'));

var stravaUtil,
  stravaStub,
  user,
  today,
  todayNumeric,
  workoutDate,
  workoutDateOffset,
  trainingDate,
  trainingDay,
  startingPoint,
  downloadAllStartDateNumeric,
  activityID = 752757127,
  activity,
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
  }],
  noWattagePayload = [{
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
      user.providerData.premium = true;
      user.markModified('providerData');

      user.save()
        .then(function(user) {

          // We need start_date_local to be a local date but formatted as utc.
          // moment.utc(workoutDate).format() gives us the correct format but converts to utc.
          // If we add the offset from utc before we call moment.utc() then we
          // end up with local time in utc format.
          // offset -360 for MDT.

          today = util.getTodayInUserTimezone(user);
          todayNumeric = coreUtil.toNumericDate(today, user);
          workoutDateOffset = moment(todayNumeric.toString()).utcOffset();
          workoutDate = moment(todayNumeric.toString()).add(workoutDateOffset, 'minutes').subtract(1, 'day').toDate();

          activity = {
            id: activityID,
            name: 'Lunch Ride',
            type: 'Ride',
            start_date_local: moment.utc(workoutDate).format(), // Strava returns this format.
            weighted_average_watts: 189,
            device_watts: true,
            suffer_score: 99,
            moving_time: 9342,
            total_elevation_gain: 123
          };

          trainingDate = moment(todayNumeric.toString()).subtract(1, 'day').startOf('day').toDate();
          downloadAllStartDateNumeric = coreUtil.toNumericDate(moment(todayNumeric.toString()).subtract(1, 'day'));

          trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);

          // user.timezone:  America/Denver
          // today:  2017-02-25T07:00:00.000Z
          // todayNumeric:  20170225
          // workoutDateOffset:  -420
          // workoutDate:  2017-02-24T00:00:00.000Z
          // start_date_local: moment.utc(workoutDate).format():  2017-02-24T00:00:00Z
          // trainingDate:  2017-02-24T07:00:00.000Z
          // downloadAllStartDateNumeric:  20170224
          // trainingDay.dateNumeric:  20170224

          //Need a starting day to avoid error from update metrics.
          testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err, newStartingPoint) {
            if (err) {
              console.log('createStartingPoint: ' + err);
            }

            startingPoint = newStartingPoint;

            stravaStub.activities.get = function(parm, callback) {
              return callback(null, activity);
            };

            stravaStub.streams.activity = function(parm, callback) {
              return callback(null, wattagePayload);
            };

            stravaStub.athlete.get = function(parm, callback) {
              return callback(null, { ftp: 456 });
            };

            done();
          });
        });
    });
  });

  // *** Testing promises ***
  // fetchActivity() returns a promise.
  //
  // If we are not calling other methods first, we can simply return our fetchActivity() promise
  // and mocha will handle promise as expected.
  // But note that we still need our done() callback if we are calling other async (e.g. helper)
  // functions to set up our test prior to running our function under test.
  //
  // In our then() we provide both success and error handlers to handle output from our test.
  // If we are using done, we also provide a catch() handler to handle errors thrown by our
  // assertions in our then() function.

  describe('Method fetchActivity', function() {
    it('should return an error when strava.activities.get fails', function() {
      stravaStub.activities.get = function(parm, callback) {
        return callback(new Error('Stubbed activities.get error'));
      };

      return stravaUtil.fetchActivity(user, 99)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('strava.activities.get access failed');
        });
    });

    it('should return an error when strava.athlete.listActivities returns payload.errors', function() {
      stravaStub.activities.get = function(parm, callback) {
        return callback(null, { message: 'payload error message', errors: ['payload Error'] });
      };

      return stravaUtil.fetchActivity(user, 99)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('payload error message');
        });
    });

    it('should return an error when strava.streams.activity fails', function() {
      stravaStub.streams.activity = function(parm, callback) {
        return callback(new Error('Stubbed streams.activity error'), null);
      };

      return stravaUtil.fetchActivity(user, 99)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('strava.streams.activity failed');
        });
    });

    it('should resolve when activity is returned', function() {
      return stravaUtil.fetchActivity(user, activityID)
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          should.equal(td.completedActivities[0].loadIsFromEstimatedPower, false);
        },
        function(err) {
          throw err;
        });
    });

    it('should resolve when activity with estimated watts is returned', function() {
      activity.weighted_average_watts = null;
      activity.average_watts = 189;
      activity.device_watts = false;

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, estimatedWattagePayload);
      };

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          should.equal(td.completedActivities[0].loadIsFromEstimatedPower, true);
        },
        function(err) {
          throw err;
        });
    });

    it('should return error when ftp has not been set ', function(done) {
      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: null });
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      user.ftpLog = [];

      user.save(function (err) {
        if (err) {
          console.log('user save error: ' + err);
          done(err);
        }

        return stravaUtil.fetchActivity(user, activityID) //.should.be.rejected();
          .then(function(result) {
            done(new Error('Promise was unexpectedly fulfilled in missing ftp test. Result: ' + result));
          },
          function(err) {
            should.exist(err);
            (err.message).should.containEql('user ftp is not set');
            done();
          }).catch(function (err) {
            done(err);
          });
      });
    });

    it('user.ftpLog should not contain new FTP when autoUpdateFtpFromStrava is false', function() {
      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      user.autoUpdateFtpFromStrava = false;

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(1);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('manual');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.not.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should not contain new FTP when FTP from Strava is null', function() {
      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: null });
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(1);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('manual');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.not.equal(null);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should contain new FTP when updated FTP is fetched from Strava', function() {
      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(2);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('strava');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('should return error when ftp is null ', function(done) {
      // This should not happen in production...anymore.
      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      startingPoint.user.ftpLog[0].ftp = null;

      testHelpers.updateTrainingDay(startingPoint, function(err) {
        if (err) {
          console.log('updateTrainingDay: ' + err);
        }

        return stravaUtil.fetchActivity(user, activityID) //.should.be.rejected();
          .then(function(result) {
            done(new Error('Promise was unexpectedly fulfilled in null ftp test. Result: ' + result));
          },
          function(err) {
            should.exist(err);
            (err.message).should.containEql('has no valid ftp');
            done();
          }).catch(function (err) {
            done(err);
          });
      });
    });

    it('should return error when ftp is zero ', function(done) {
      // This should not happen in production.
      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, wattagePayload);
      };

      startingPoint.user.ftpLog[0].ftp = 0;

      testHelpers.updateTrainingDay(startingPoint, function(err) {
        if (err) {
          console.log('updateTrainingDay: ' + err);
        }

        return stravaUtil.fetchActivity(user, activityID) //.should.be.rejected();
          .then(function(result) {
            done(new Error('Promise was unexpectedly fulfilled in null ftp test. Result: ' + result));
          },
          function(err) {
            should.exist(err);
            (err.message).should.containEql('load or intensity calculated to Infinity');
            done();
          }).catch(function (err) {
            done(err);
          });
      });
    });

    it('should resolve when activity has estimated watts and suffer score and user.favorSufferScoreOverEstimatedPower ', function(done) {
      activity.weighted_average_watts = null;
      activity.average_watts = 189;
      activity.device_watts = false;

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, estimatedWattagePayload);
      };

      startingPoint.user.favorSufferScoreOverEstimatedPower = true;

      testHelpers.updateTrainingDay(startingPoint, function(err) {
        if (err) {
          console.log('updateTrainingDay: ' + err);
        }

        return stravaUtil.fetchActivity(user, activityID)
          .then(function(td) {
            should.equal(td.completedActivities.length, 1);
            should.equal(td.completedActivities[0].name, activity.name);
            should.equal(td.completedActivities[0].load, activity.suffer_score);
            should.equal(td.completedActivities[0].loadIsSufferScore, true);
            should.equal(td.completedActivities[0].loadIsFromEstimatedPower, false);
            done();
          },
          function(err) {
            done(err);
          }).catch(function (err) {
            done(err);
          });
      });
    });

    it('should resolve with no trainingDay when activity has no estimated watts and no suffer score ', function() {
      activity.weighted_average_watts = null;
      activity.suffer_score = null;
      activity.device_watts = false;

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, noWattagePayload);
      };

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(td) {
          should.not.exist(td);
        },
        function(err) {
          throw err;
        });
    });

    it('should resolve with no trainingDay when activity is not a ride ', function() {
      activity.type = 'Run';

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, noWattagePayload);
      };

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(td) {
          should.not.exist(td);
        },
        function(err) {
          throw err;
        });
    });

    it('should resolve when activity has suffer score but no watts ', function() {
      activity.weighted_average_watts = null;
      activity.device_watts = false;

      stravaStub.streams.activity = function(parm, callback) {
        return callback(null, noWattagePayload);
      };

      return stravaUtil.fetchActivity(user, activityID)
        .then(function(td) {
          should.equal(td.completedActivities.length, 1);
          should.equal(td.completedActivities[0].name, activity.name);
          should.equal(td.completedActivities[0].loadIsSufferScore, true);
          should.equal(td.completedActivities[0].load, activity.suffer_score);
        },
        function(err) {
          throw err;
        });
    });

    it('should resolve when activity is returned but it has been downloaded previously', function(done) {
      stravaUtil.fetchActivity(user, activityID)
        .then(function() {
          return stravaUtil.fetchActivity(user, activityID)
            .then(function(td) {
              should.not.exist(td);
              // should.equal(td.completedActivities.length, 1);
              // should.equal(td.completedActivities[0].name, activity.name);
              done();
            },
            function(err) {
              // should.not.exist(err);
              done(err);
            });
        },
        function(err) {
          // should.not.exist(err);
          done(err);
        });
    });

  });

  describe('Method downloadActivities', function() {
    it('should return an error when strava.athlete.listActivities fails', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(new Error('Stubbed athlete.listActivities error'));
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('athlete.listActivities error');
        });
    });

    it('should return an error when strava.streams.activity fails', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'VirtualRide',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(new Error('Stubbed streams.activity error'), null);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('strava.streams.activity failed');
        });
    });

    it('should return an error when strava.athlete.listActivities returns payload.errors', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, { message: 'payload error message', errors: ['payload Error'] });
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('payload error message');
        });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities returns no activities', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('found no Strava activities for the day');
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should not contain new FTP when autoUpdateFtpFromStrava is false', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      user.autoUpdateFtpFromStrava = false;

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(1);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('manual');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.not.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should not contain new FTP when FTP from Strava is null', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: null });
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(1);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('manual');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.not.equal(null);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should contain new FTP when updated FTP is fetched from Strava', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.user.ftpLog.length).should.equal(2);
          (returnedTrainingDay.user.ftpLog[0].ftpSource).should.equal('strava');
          (returnedTrainingDay.user.ftpLog[0].ftp).should.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities activities exist but none for requested day', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'VirtualRide',
        start_date_local: moment.utc(workoutDate).subtract(1, 'day').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }, {
        id: 752757129,
        name: 'Lunch Ride',
        type: 'VirtualRide',
        start_date_local: moment.utc(workoutDate).add(1, 'day').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('found no new Strava activities for the day');
        },
        function(err) {
          throw err;
        });
    });

    it('should return one completedActivity when strava.athlete.listActivities returns one activity for requested day', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('downloaded one new Strava activity');
          (returnedTrainingDay.completedActivities.length).should.equal(1);
        },
        function(err) {
          throw err;
        });
    });

    it('should return two completedActivities when strava.athlete.listActivities returns two activities for requested day', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }, {
        id: 752757128,
        name: 'Dinner Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).add(1, 'second').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('downloaded 2 new Strava activities');
          (returnedTrainingDay.completedActivities.length).should.equal(2);
        },
        function(err) {
          throw err;
        });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities returns one activity for requested day but it has been downloaded previously', function(done) {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaUtil.downloadActivities(user, trainingDay)
        .then(function(firstReturnedTrainingDay) {
          return stravaUtil.downloadActivities(user, firstReturnedTrainingDay)
            .then(function(returnedTrainingDay) {
              (returnedTrainingDay.lastStatus.text).should.containEql('found no new Strava activities for the day');
              (returnedTrainingDay.completedActivities.length).should.equal(1);
              done();
            },
            function(err) {
              // should.not.exist(err);
              done(err);
            });
        },
        function(err) {
          // should.not.exist(err);
          done(err);
        });
    });

    it('should return correct load for completedActivity when strava.athlete.listActivities returns activity for requested day', function() {
      var activities = [{
          id: activityID,
          name: 'Lunch Ride',
          type: 'Ride',
          start_date_local: moment.utc(workoutDate).format(),
          weighted_average_watts: 189,
          device_watts: true,
          moving_time: 9342
        }],
        weightedAverageWatts = 189,
        intensity = Math.round((weightedAverageWatts / user.ftpLog[0].ftp) * 100) / 100,
        expectedLoad = Math.round(((9342 * weightedAverageWatts * intensity) / (user.ftpLog[0].ftp * 3600)) * 100);

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('downloaded one new Strava activity');
          (returnedTrainingDay.completedActivities.length).should.equal(1);
          (returnedTrainingDay.completedActivities[0].load).should.equal(expectedLoad);
        },
        function(err) {
          throw err;
        });
    });

    it('should return correct load for completedActivity when new ftp is fetched from Strava', function() {
      // New ftp date will be today so we need to be processing today's TD and activity.
      trainingDate = moment(todayNumeric.toString()).startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      workoutDate = moment(todayNumeric.toString()).add(workoutDateOffset, 'minutes').toDate();

      var activities = [{
          id: activityID,
          name: 'Lunch Ride',
          type: 'Ride',
          start_date_local: moment.utc(workoutDate).format(),
          weighted_average_watts: 189,
          device_watts: true,
          moving_time: 9342
        }],
        newFtp = 456,
        weightedAverageWatts = 189,
        intensity = Math.round((weightedAverageWatts / newFtp) * 100) / 100,
        expectedLoad = Math.round(((9342 * weightedAverageWatts * intensity) / (newFtp * 3600)) * 100);

      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: newFtp });
      };

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      user.autoUpdateFtpFromStrava = true;
      return stravaUtil.downloadActivities(user, trainingDay)
        .then(function(returnedTrainingDay) {
          (returnedTrainingDay.lastStatus.text).should.containEql('downloaded one new Strava activity');
          (returnedTrainingDay.completedActivities.length).should.equal(1);
          (returnedTrainingDay.completedActivities[0].load).should.equal(expectedLoad);
        },
        function(err) {
          throw err;
        });
    });

  });

  describe('Method downloadAllActivities', function() {
    it('should return an error when strava.athlete.listActivities fails', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(new Error('Stubbed athlete.listActivities error'));
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('athlete.listActivities error');
        });
    });

    it('should return an error when strava.streams.activity fails', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaStub.streams.activity = function(parm, callback) {
        return callback(new Error('Stubbed streams.activity error'), null);
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('strava.streams.activity failed');
        });
    });

    it('should return an error when strava.athlete.listActivities returns payload.errors', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, { message: 'payload error message', errors: ['payload Error'] });
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(result) {
          throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
        },
        function(err) {
          should.exist(err);
          (err.message).should.containEql('payload error message');
        });
    });

    it('user.ftpLog should not contain new FTP when autoUpdateFtpFromStrava is false', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      user.autoUpdateFtpFromStrava = false;

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function() {
          (user.ftpLog.length).should.equal(1);
          (user.ftpLog[0].ftpSource).should.equal('manual');
          (user.ftpLog[0].ftp).should.not.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should not contain new FTP when FTP from Strava is null', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: null });
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function() {
          (user.ftpLog.length).should.equal(1);
          (user.ftpLog[0].ftpSource).should.equal('manual');
          (user.ftpLog[0].ftp).should.not.equal(null);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should contain new FTP when updated FTP is fetched from Strava', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function() {
          (user.ftpLog.length).should.equal(2);
          (user.ftpLog[0].ftpSource).should.equal('strava');
          (user.ftpLog[0].ftp).should.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('should return appropriate statusMessage when strava.athlete.listActivities returns no activities', function() {
      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, []);
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(statusMessage) {
          (statusMessage.text).should.containEql('No Strava activities were returned');
        },
        function(err) {
          throw err;
        });
    });

    it('should download two activities when activities exist for two different days', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).subtract(1, 'day').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }, {
        id: 752757129,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).add(1, 'day').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(statusMessage) {
          (statusMessage.text).should.containEql('downloaded 2 Strava activities');
        },
        function(err) {
          throw err;
        });
    });

    it('should download one activity when one eligible activity exists', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(statusMessage) {
          (statusMessage.text).should.containEql('downloaded one Strava activity');
        },
        function(err) {
          throw err;
        });
    });

    it('should download two activities when two activities exist for a single day', function() {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }, {
        id: 752757128,
        name: 'Dinner Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).add(1, 'second').format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(statusMessage) {
          (statusMessage.text).should.containEql('downloaded 2 Strava activities');
        },
        function(err) {
          throw err;
        });
    });

    it('should return appropriate statusMessage when one activity exists for requested day but it has been downloaded previously', function(done) {
      var activities = [{
        id: activityID,
        name: 'Lunch Ride',
        type: 'Ride',
        start_date_local: moment.utc(workoutDate).format(),
        weighted_average_watts: 189,
        device_watts: true,
        moving_time: 9342
      }];

      stravaStub.athlete.listActivities = function(parm, callback) {
        return callback(null, activities);
      };

      stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
        .then(function(firstReturnedTrainingDay) {
          return stravaUtil.downloadAllActivities(user, downloadAllStartDateNumeric)
            .then(function(statusMessage) {
              (statusMessage.text).should.containEql('No Strava activities are missing');
              done();
            },
            function(err) {
              done(err);
            });
        },
        function(err) {
          done(err);
        });
    });

  });


  describe('Method getFTP', function() {
    it('user.ftpLog should contain new FTP though autoUpdateFtpFromStrava is false', function() {

      user.autoUpdateFtpFromStrava = false;

      return stravaUtil.getFTP(user, true)
        .then(function(response) {
          (response.user.ftpLog.length).should.equal(2);
          (response.user.ftpLog[0].ftpSource).should.equal('strava');
          (response.user.ftpLog[0].ftp).should.equal(456);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should not contain new FTP when FTP from Strava is null', function() {
      stravaStub.athlete.get = function(parm, callback) {
        return callback(null, { ftp: null });
      };

      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.getFTP(user, true)
        .then(function(response) {
          (response.user.ftpLog.length).should.equal(1);
          (response.user.ftpLog[0].ftpSource).should.equal('manual');
          (response.user.ftpLog[0].ftp).should.not.equal(null);
        },
        function(err) {
          throw err;
        });
    });

    it('user.ftpLog should contain new FTP when updated FTP is fetched from Strava', function() {
      user.autoUpdateFtpFromStrava = true;

      return stravaUtil.getFTP(user, true)
        .then(function(response) {
          (response.user.ftpLog.length).should.equal(2);
          (response.user.ftpLog[0].ftpSource).should.equal('strava');
          (response.user.ftpLog[0].ftp).should.equal(456);
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
