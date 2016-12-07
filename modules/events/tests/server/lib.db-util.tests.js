'use strict';

var // path = require('path'),
  should = require('should'),
  // _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  dbUtil = require('../../server/lib/db-util');

describe('db-util Unit Tests:', function() {

  // beforeEach(function(done) {
  // });

  describe('Method getUnprocessedEvents', function() {

    it('should return unprocessed event if one exists.', function(done) {
      let newEvent = new EventModel({
        source: 'strava',
        ownerId: 13408,
        objectId: 795663388,
        objectType: 'activity',
        aspectType: 'create',
        eventTime: moment.unix(1297286541)
      });

      newEvent.save(function(err) {
        if (err) {
          console.log('newEvent.save error: ' + err);
          return done(err);
        }

        dbUtil.getUnprocessedEvents()
          .then(function(events) {
            should.exist(events);
            should.equal(events.length, 1);
            should.equal(events[0].objectId, newEvent.objectId);
            done();
          })
          .catch(function(err) {
            done(err);
          });
      });
    });

    it('should return no unprocessed events if only processed event exists.', function(done) {
      let newEvent = new EventModel({
        source: 'strava',
        ownerId: 13408,
        objectId: 79566339,
        objectType: 'activity',
        aspectType: 'create',
        eventTime: moment.unix(1297286542),
        status: 'fetched'
      });

      newEvent.save(function(err) {
        if (err) {
          console.log('newEvent.save error: ' + err);
          return done(err);
        }

        dbUtil.getUnprocessedEvents()
          .then(function(events) {
            should.exist(events);
            should.equal(events.length, 0);
            done();
          })
          .catch(function(err) {
            done(err);
          });
      });
    });

  });

  afterEach(function(done) {
    EventModel.remove().exec()

      .then(function(response) {
        done();
      });
  });
});
