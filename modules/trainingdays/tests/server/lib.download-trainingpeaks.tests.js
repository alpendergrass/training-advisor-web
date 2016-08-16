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

var downloadTrainingPeaks,
  soapStub,
  getAccessibleAthletesStub,
  getWorkoutsForAccessibleAthleteStub,
  getExtendedWorkoutDataForAccessibleAthleteStub,
  sendMessageToUserStub,
  user, 
  trainingDate,
  trainingDay,
  workoutDay,
  completedActivities = [],
  activity,
  activityDate;

describe('TrainingDay Download TrainingPeaks Unit Tests:', function () {
  before(function (done) {
    soapStub = {};
    sendMessageToUserStub = function(statusMessage, user) {
      console.log('statusMessage: ' + JSON.stringify(statusMessage));
    };
    downloadTrainingPeaks = proxyquire('../../server/lib/download-trainingpeaks', 
      { 'soap': soapStub, './db-util': { 'sendMessageToUser' : sendMessageToUserStub } }
    );

    done();
  });

  beforeEach(function (done) {
    testHelpers.createUser(function(err, newUser) {
      if (err) {
        return done(err);
      }

      user = newUser;
      user.trainingPeaksCredentials.username = 'TPUsername';
      user.trainingPeaksCredentials.password = 'TPPassword';
      user.trainingPeaksCredentials.accountType = 'SelfCoachedPremium';

      trainingDate = moment().startOf('day').toDate();
      trainingDay = testHelpers.createTrainingDayObject(trainingDate, user);
      workoutDay = moment(trainingDate).format(); // 2016-07-23T00:00:00-06:00
      workoutDay = workoutDay.substring(0, workoutDay.length - 6); // 2016-07-23T00:00:00
      completedActivities = [];
      done();
    });
  });

  describe('Method batchDownloadActivities', function () {
    it('should not return an error when no auto-download users exist', function(done) {
      soapStub.createClient = function(url, callback) {return callback(new Error('Stubbed createClient error')); };

      return downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
        should.not.exist(err);
        (individualUserErrors.length).should.be.equal(0);
        done();
      });
    });

    it('should return an error when soap.createClient fails', function(done) {
      soapStub.createClient = function(url, callback) {return callback(new Error('Stubbed createClient error')); };
      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, updatedUser) {
        if (err) {
          console.log('updateUser: ' + err);
        }

        return downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
          should.exist(err);
          //console.log('err.message: ' + err.message);
          (err.message).should.containEql('createClient error');
          done();
        });
      });
    });

    it('should return an error in the errors collection when GetAccessibleAthletes fails for a user', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(new Error('Stubbed getAccessibleAthletes error'), null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, updatedUser) {
        if (err) {
          console.log('updateUser: ' + err);
        }

        return downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
          should.not.exist(err);
          (individualUserErrors.length).should.be.equal(1);
          (individualUserErrors[0].message).should.containEql('getAccessibleAthletes error');
          done();
        });
      });
    });

    it('should return no activities when GetAccessibleAthletes returns no payload', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
            should.not.exist(err);
            (individualUserErrors.length).should.be.equal(0);
            return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
              should.not.exist(err);
              should.exist(storedTrainingDay);
              (storedTrainingDay.completedActivities.length).should.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('should return no activities when GetAccessibleAthletes returns a payload with no athletes', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: [] }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
            should.not.exist(err);
            (individualUserErrors.length).should.be.equal(0);
            return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
              should.not.exist(err);
              should.exist(storedTrainingDay);
              (storedTrainingDay.completedActivities.length).should.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('should return an error in the errors collection when GetAccessibleAthletes returns an invalid personId', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(new Error('Stubbed getWorkoutsForAccessibleAthleteStub error'), null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        return downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
          should.not.exist(err);
          (individualUserErrors.length).should.be.equal(1);
          (individualUserErrors[0].message).should.containEql('getWorkoutsForAccessibleAthleteStub error');
          done();
        });
      });
    });

    it('should return no activities when GetWorkoutsForAccessibleAthlete returns a payload with no activities', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [] } }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
            should.not.exist(err);
            (individualUserErrors.length).should.be.equal(0);
            return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
              should.not.exist(err);
              should.exist(storedTrainingDay);
              (storedTrainingDay.completedActivities.length).should.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('should return no activities when GetExtendedWorkoutDataForAccessibleAthlete does not returns payload for requested workout', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, null);
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
            should.not.exist(err);
            (individualUserErrors.length).should.be.equal(0);
            return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
              should.not.exist(err);
              should.exist(storedTrainingDay);
              (storedTrainingDay.completedActivities.length).should.be.equal(0);
              done();
            });
          });
        });
      });
    });

    it('should return one activity when GetWorkoutsForAccessibleAthlete returns a payload with one workout', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2016-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
          if (err) {
            console.log('createStartingPoint: ' + err);
          }

          testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
              should.not.exist(err);
              (individualUserErrors.length).should.be.equal(0);
              return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
                should.not.exist(err);
                should.exist(storedTrainingDay);
                (storedTrainingDay.completedActivities.length).should.be.equal(1);
                (storedTrainingDay.completedActivities[0].load).should.be.equal(234);
                (storedTrainingDay.completedActivities[0].name).should.match(/Workout Title/);
                done();
              });
            });
          });
        });
      });
    });

    it('should return two activities when GetWorkoutsForAccessibleAthlete returns a payload with two workouts', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }, { 'WorkoutId': 9012, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2016-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }

        testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
          if (err) {
            console.log('createStartingPoint: ' + err);
          }

          testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
            if (err) {
              console.log('createTrainingDay: ' + err);
            }

            downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
              should.not.exist(err);
              (individualUserErrors.length).should.be.equal(0);
              return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
                should.not.exist(err);
                should.exist(storedTrainingDay);
                (storedTrainingDay.completedActivities.length).should.be.equal(2);
                done();
              });
            });
          });
        });
      });
    });
  
    it('should not save activity when GetWorkoutsForAccessibleAthlete returns a payload with an activity that already exists in the database', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2001-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      user.trainingPeaksCredentials.autoDownload = true;

      testHelpers.updateUser(user, function(err, user) {
        if (err) {
          console.log('user: ' + err);
        }
        activityDate = moment(trainingDate).subtract(1, 'day').toDate();
        activity = { 'created': activityDate, 'source': 'trainingpeaks', 'sourceID': '5678', 'name': 'Workout Title', 'load': 234 };
        completedActivities.push(activity);

        testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
          if (err) {
            console.log('createTrainingDay: ' + err);
          }

          testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
            if (err) {
              console.log('createStartingPoint: ' + err);
            }

            downloadTrainingPeaks.batchDownloadActivities(function (err, individualUserErrors) {
              should.not.exist(err);
              (individualUserErrors.length).should.be.equal(0);
              return testHelpers.getTrainingDay(createdTrainingDay.id, function(err, storedTrainingDay) {
                should.not.exist(err);
                should.exist(storedTrainingDay);
                (storedTrainingDay.completedActivities.length).should.be.equal(1);
                (moment(storedTrainingDay.completedActivities[0].created).get('date')).should.be.equal(moment(activityDate).get('date'));
                done();
              });
            });
          });
        });
      });
    });

  });

  describe('Method downloadActivities', function () {
    it('should return an error when soap.createClient fails', function(done) {
      soapStub.createClient = function(url, callback) {return callback(new Error('Stubbed createClient error')); };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.exist(err);
        // console.log('err.message: ' + err.message);
        done();
      });
    });

    it('should return an error when GetAccessibleAthletes fails', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(new Error('Stubbed getAccessibleAthletes error'), null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.exist(err);
        // console.log('err.message: ' + err.message);
        done();
      });
    });

    it('should return no activities when GetAccessibleAthletes returns no payload', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        (trainingDay.completedActivities.length).should.be.equal(0);
        done();
      });
    });

    it('should return no activities when GetAccessibleAthletes returns a payload with no athletes', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: [] }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 'GetAccessibleAthletes': getAccessibleAthletesStub }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        (trainingDay.completedActivities.length).should.be.equal(0);
        done();
      });
    });

    it('should return an error when GetAccessibleAthletes returns an invalid personId', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(new Error('Stubbed getWorkoutsForAccessibleAthleteStub error'), null); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub 
        }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.exist(err);
        console.log('err.message: ' + err.message);
        done();
      });
    });

    it('should return no activities when GetWorkoutsForAccessibleAthlete returns a payload with no activities', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [] } }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub 
        }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        (trainingDay.completedActivities.length).should.be.equal(0);
        done();
      });
    });

    it('should return no activities when GetExtendedWorkoutDataForAccessibleAthlete does not returns payload for requested workout', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, null);
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
        should.not.exist(err);
        (trainingDay.completedActivities.length).should.be.equal(0);
        done();
      });
    });

    it('should return one activity when GetWorkoutsForAccessibleAthlete returns a payload with one workout', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2016-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
          should.not.exist(err);
          (trainingDay.completedActivities.length).should.be.equal(1);
          (trainingDay.completedActivities[0].load).should.be.equal(234);
          (trainingDay.completedActivities[0].name).should.match(/Workout Title/);
          done();
        });
      });
    });

    it('should return two activities when GetWorkoutsForAccessibleAthlete returns a payload with two workouts', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }, { 'WorkoutId': 9012, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2016-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
        if (err) {
          console.log('createStartingPoint: ' + err);
        }

        return downloadTrainingPeaks.downloadActivities(user, trainingDay, function (err, trainingDay) {
          should.not.exist(err);
          (trainingDay.completedActivities.length).should.be.equal(2);
          done();
        });
      });
    });

    it('should not save activity when GetWorkoutsForAccessibleAthlete returns a payload with an activity that already exists in the database', function(done) {
      getAccessibleAthletesStub = function(args, callback) {
        return callback(null, { GetAccessibleAthletesResult: { PersonBase: [ { PersonId: 123 }] } }); 
      };
      getWorkoutsForAccessibleAthleteStub = function(args, callback) {
        return callback(null, { GetWorkoutsForAccessibleAthleteResult: { Workout: [{ 'WorkoutId': 5678, 'WorkoutDay': workoutDay }] } }); 
      };
      getExtendedWorkoutDataForAccessibleAthleteStub = function(args, callback) {
        return callback(null, 
          { GetExtendedWorkoutDataForAccessibleAthleteResult: 
            { pwx: 
              { workout: 
                { 'time': '2001-07-02T10:06:53', 'title': 'Workout Title', 'summarydata': { 'tss': 234 } }
              } 
            } 
          }); 
      };
      soapStub.createClient = function(url, callback) {
        return callback(null, { 
          'GetAccessibleAthletes': getAccessibleAthletesStub,
          'GetWorkoutsForAccessibleAthlete': getWorkoutsForAccessibleAthleteStub,
          'GetExtendedWorkoutDataForAccessibleAthlete': getExtendedWorkoutDataForAccessibleAthleteStub 
        }); 
      };

      activityDate = moment(trainingDate).subtract(1, 'day').toDate();
      activity = { 'created': activityDate, 'source': 'trainingpeaks', 'sourceID': '5678', 'name': 'Workout Title', 'load': 234 };
      completedActivities.push(activity);

      testHelpers.createTrainingDay(user, moment(trainingDate), completedActivities, function(err, createdTrainingDay) {
        if (err) {
          console.log('createTrainingDay: ' + err);
        }

        testHelpers.createStartingPoint(user, trainingDate, 2, 9, 9, function(err) {
          if (err) {
            console.log('createStartingPoint: ' + err);
          }

          return downloadTrainingPeaks.downloadActivities(user, createdTrainingDay, function (err, trainingDay) {
            should.not.exist(err);
            (trainingDay.completedActivities.length).should.be.equal(1);
            (trainingDay.completedActivities[0].created).should.be.equal(activityDate);
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
