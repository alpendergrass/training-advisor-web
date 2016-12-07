'use strict';

var // path = require('path'),
  should = require('should'),
  // _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  EventModel = mongoose.model('Event'),
  util = require('../../server/lib/util');

describe('util Unit Tests:', function() {

  // beforeEach(function(done) {
  // });

  describe('Method storeEvent', function() {
    it('should return event if saved successfully.', function(done) {
      let newEvent = {
        owner_id: 13408,
        object_id: 795663388,
        object_type: 'activity',
        aspect_type: 'create',
        event_time: 1297286541
      };

      util.storeEvent(newEvent)
        .then(function(event) {
          should.exist(event);
          should.equal(event.objectId, newEvent.object_id);
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('should return error if unrecognized event data.', function(done) {
      let newEvent = {
        owner_id: 13408,
        object_id: 795663388,
        object_type: 'notActivity',
        aspect_type: 'create',
        event_time: 1297286541
      };

      util.storeEvent(newEvent)
        .then(function(event) {
          done(new Error('storeEvent: should not be here.'));
        })
        .catch(function(err) {
          should.exist(err);
          (err.message).should.containEql('unrecognized webhook data');
          done();
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
