'use strict';

var should = require('should'),
  request = require('supertest'),
  path = require('path'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  express = require(path.resolve('./config/lib/express'));

var app, agent;

describe('Events server routes tests', function() {
  before(function(done) {
    // Get application
    app = express.init(mongoose);
    agent = request.agent(app);

    done();
  });

  // beforeEach(function(done) {
  // });

  it('should be able to postStravaWebhookEvent.', function(done) {
    let stravaEvent = {
      'subscription_id': '1',
      'owner_id': 13408,
      'object_id': 795663388,
      'object_type': 'activity',
      'aspect_type': 'create',
      'event_time': 1297286541
    };

    agent.post('/api/events/strava/webhook')
      .send(stravaEvent)
      .expect(200)
      .end(function(saveErr, saveRes) {
        return done(saveErr);
      });
  });

  it('should be able to postStravaWebhookEvent with no data.', function(done) {
    agent.post('/api/events/strava/webhook')
      .send()
      .expect(200)
      .end(function(saveErr, saveRes) {
        return done(saveErr);
      });
  });

  afterEach(function(done) {
    EventModel.remove().exec()
      .then(function(response) {
        done();
      });
  });
});
