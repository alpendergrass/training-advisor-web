'use strict';

var should = require('should'),
  request = require('supertest'),
  path = require('path'),
  mongoose = require('mongoose'),
  User = mongoose.model('User'),
  TrainingDay = mongoose.model('TrainingDay'),
  testHelpers = require('./util/test-helpers'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  express = require(path.resolve('./config/lib/express'));

var app, agent, credentials, user, trainingDay;

describe('TrainingDay server routes tests', function() {
  before(function(done) {
    // Get application
    app = express.init(mongoose);
    agent = request.agent(app);

    done();
  });

  beforeEach(function(done) {
    credentials = {
      username: 'username',
      password: 'M3@n.jsI$Aw3$0m3'
    };

    user = new User({
      firstName: 'Full',
      lastName: 'Name',
      displayName: 'Full Name',
      email: 'test@test.com',
      provider: 'local',
      username: credentials.username,
      password: credentials.password
    });

    // Save a user to the test db and create new trainingDay
    user.save(function(err) {
      if (err) {
        console.log('user.save error: ' + err);
        return done(err);
      }

      testHelpers.createStartingPoint(user, new Date(), 1, 9, 9, function(err, startDay) {
        if (err) {
          console.log('createStartingPoint: ' + err);
          return done(err);
        }

        trainingDay = testHelpers.createTrainingDayObject(new Date(), user);
        done();
      });
    });
  });

  it('should be able to save a trainingDay if logged in', function(done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function(signinErr, signinRes) {
        if (signinErr) {
          return done(signinErr);
        }
        var userId = user.id;

        // Save a new trainingDay
        agent.post('/api/trainingDays')
          .send(trainingDay)
          .expect(200)
          .end(function(trainingDaySaveErr, trainingDaySaveRes) {
            if (trainingDaySaveErr) {
              console.log('trainingDaySaveErr: ', trainingDaySaveErr);
              return done(trainingDaySaveErr);
            }

            // Get a list of trainingDays
            agent.get('/api/trainingDays')
              .end(function(trainingDaysGetErr, trainingDaysGetRes) {
                if (trainingDaysGetErr) {
                  console.log('trainingDaysGetErr: ', trainingDaysGetErr);
                  return done(trainingDaysGetErr);
                }
                //console.log('trainingDays Retrieved');

                // Get trainingDays list
                var trainingDays = trainingDaysGetRes.body;
                (trainingDays[0].user._id).should.equal(userId);
                done();
              });
          });
      });
  });

  it('should not be able to save a trainingDay if not logged in', function(done) {
    agent.post('/api/trainingDays')
      .send(trainingDay)
      .expect(403)
      .end(function(trainingDaySaveErr, trainingDaySaveRes) {
        done(trainingDaySaveErr);
      });
  });

  it('should not be able to save a trainingDay if no date is provided', function(done) {
    // Invalidate title field
    trainingDay.date = null;

    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function(signinErr, signinRes) {
        if (signinErr) {
          return done(signinErr);
        }

        var userId = user.id;

        // Save a new trainingDay
        agent.post('/api/trainingDays')
          .send(trainingDay)
          .expect(400)
          .end(function(trainingDaySaveErr, trainingDaySaveRes) {
            (trainingDaySaveRes.body.message).should.containEql('numericDate is required');
            done(trainingDaySaveErr);
          });
      });
  });

  it('should be able to update a trainingDay if signed in', function(done) {
    //We need starting point and goal event in order to update a trainingDay
    //because updateMetrics() will be triggered and getPeriod() will be called.
    var trainingDate = new Date();
    testHelpers.createGoalEvent(user, trainingDate, adviceConstants.minimumNumberOfTrainingDays, function(err) {
      if (err) {
        console.log('createGoalEvent: ' + err);
      }

      agent.post('/api/auth/signin')
        .send(credentials)
        .expect(200)
        .end(function(signinErr, signinRes) {
          // Handle signin error
          if (signinErr) {
            return done(signinErr);
          }

          // Get the userId
          var userId = user.id;

          // Save a new trainingDay
          agent.post('/api/trainingDays')
            .send(trainingDay)
            .expect(200)
            .end(function(trainingDaySaveErr, trainingDaySaveRes) {
              // Handle trainingDay save error
              if (trainingDaySaveErr) {
                return done(trainingDaySaveErr);
              }

              //We need a valid trainingDay object for the coming PUT to succeed.
              trainingDay = trainingDaySaveRes.body;
              // Update trainingDay name
              trainingDay.name = 'WHY YOU GOTTA BE SO MEAN?';

              // Update an existing trainingDay
              agent.put('/api/trainingDays/' + trainingDaySaveRes.body._id)
                .send(trainingDay)
                .expect(200)
                .end(function(trainingDayUpdateErr, trainingDayUpdateRes) {
                  // Handle trainingDay update error
                  if (trainingDayUpdateErr) {
                    return done(trainingDayUpdateErr);
                  }

                  // Set assertions
                  (trainingDayUpdateRes.body._id).should.equal(trainingDaySaveRes.body._id);
                  (trainingDayUpdateRes.body.name).should.match('WHY YOU GOTTA BE SO MEAN?');

                  // Call the assertion callback
                  done();
                });
            });
        });
    });
  });

  it('should not be able to get a list of trainingDays if not signed in', function(done) {
    // Create new trainingDay model instance
    var trainingDayObj = new TrainingDay(trainingDay);

    // Save the trainingDay
    trainingDayObj.save(function() {
      // Request trainingDays
      request(app).get('/api/trainingDays')
        .expect(403)
        .end(function(req, res) {
          // Set assertion
          //res.body.should.be.instanceof(Array).and.have.lengthOf(1);
          (res.body.message).should.match('User is not authorized');

          // Call the assertion callback
          done();
        });
    });
  });

  it('should be able to get a list of trainingDays if signed in', function(done) {
    // Create new trainingDay model instance
    var trainingDayObj = new TrainingDay(trainingDay);
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function(signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save the trainingDay
        agent.post('/api/trainingDays')
          .send(trainingDay)
          .expect(200)
          .end(function(trainingDaySaveErr, trainingDaySaveRes) {
            // Handle trainingDay save error
            if (trainingDaySaveErr) {
              return done(trainingDaySaveErr);
            }

            agent.get('/api/trainingDays')
              .end(function(req, res) {
                // Set assertion
                res.body.should.be.instanceof(Array).and.have.lengthOf(2);

                // Call the assertion callback
                done();
              });
          });
      });
  });

  it('should not be able to get a single trainingDay if not signed in', function(done) {
    // Create new trainingDay model instance
    var trainingDayObj = new TrainingDay(trainingDay);

    // Save the trainingDay
    trainingDayObj.save(function() {
      request(app).get('/api/trainingDays/' + trainingDayObj._id)
        .expect(403)
        .end(function(req, res) {
          // Set assertion
          //res.body.should.be.instanceof(Array).and.have.lengthOf(1);
          (res.body.message).should.match('User is not authorized');

          // Call the assertion callback
          done();
        });
    });
  });

  it('should be able to get a single trainingDay if signed in', function(done) {
    // Create new trainingDay model instance
    var trainingDayObj = new TrainingDay(trainingDay);
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function(signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        var userId = user.id;

        // Save the trainingDay
        agent.post('/api/trainingDays')
          .send(trainingDay)
          .expect(200)
          .end(function(trainingDaySaveErr, trainingDaySaveRes) {
            if (trainingDaySaveErr) {
              return done(trainingDaySaveErr);
            }

            agent.get('/api/trainingDays/' + trainingDaySaveRes.body._id)
              .end(function(req, res) {
                res.body.should.be.instanceof(Object).and.have.property('dateNumeric', trainingDay.dateNumeric);
                done();
              });
          });
      });
  });

  it('should return proper error for single trainingDay with an invalid Id, if not signed in', function(done) {
    // test is not a valid mongoose Id
    request(app).get('/api/trainingDays/test')
      .end(function(req, res) {
        // Set assertion
        res.body.should.be.instanceof(Object).and.have.property('message', 'TrainingDay ID is invalid');

        // Call the assertion callback
        done();
      });
  });

  it('should return proper error for single trainingDay which does not exist, if not signed in', function(done) {
    // This is a valid mongoose Id but a non-existent trainingDay
    request(app).get('/api/trainingDays/559e9cd815f80b4c256a8f41')
      .end(function(req, res) {
        // Set assertion
        res.body.should.be.instanceof(Object).and.have.property('message', 'No trainingDay with that identifier has been found');

        // Call the assertion callback
        done();
      });
  });

  it('should be able to delete an trainingDay if signed in', function(done) {
    agent.post('/api/auth/signin')
      .send(credentials)
      .expect(200)
      .end(function(signinErr, signinRes) {
        // Handle signin error
        if (signinErr) {
          return done(signinErr);
        }

        // Get the userId
        var userId = user.id;

        // Save a new trainingDay
        agent.post('/api/trainingDays')
          .send(trainingDay)
          .expect(200)
          .end(function(trainingDaySaveErr, trainingDaySaveRes) {
            // Handle trainingDay save error
            if (trainingDaySaveErr) {
              return done(trainingDaySaveErr);
            }

            // Delete an existing trainingDay
            agent.delete('/api/trainingDays/' + trainingDaySaveRes.body._id)
              .send(trainingDay)
              .expect(200)
              .end(function(trainingDayDeleteErr, trainingDayDeleteRes) {
                // Handle trainingDay error error
                if (trainingDayDeleteErr) {
                  return done(trainingDayDeleteErr);
                }

                // Set assertions
                (trainingDayDeleteRes.body._id).should.equal(trainingDaySaveRes.body._id);

                // Call the assertion callback
                done();
              });
          });
      });
  });

  it('should not be able to delete a trainingDay if not signed in', function(done) {
    // Set trainingDay user
    trainingDay.user = user;

    // Create new trainingDay model instance
    var trainingDayObj = new TrainingDay(trainingDay);

    // Save the trainingDay
    trainingDayObj.save(function() {
      // Try deleting trainingDay
      request(app).delete('/api/trainingDays/' + trainingDayObj._id)
        .expect(403)
        .end(function(trainingDayDeleteErr, trainingDayDeleteRes) {
          // Set message assertion
          (trainingDayDeleteRes.body.message).should.match('User is not authorized');

          // Handle trainingDay error error
          done(trainingDayDeleteErr);
        });
    });
  });

  afterEach(function(done) {
    User.remove().exec(function() {
      TrainingDay.remove().exec(done);
    });
  });
});
