'use strict';

var path = require('path'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  util = require('../lib/util'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

exports.validateStravaWebhookSubscription = function(req, res) {
  // We will use curl on CL to request subscription.
  // Strava will challenge subscription request.

  // {
  //   "hub.mode": "subscribe",
  //   "hub.verify_token": "STRAVA",
  //   "hub.challenge": "15f7d1a91c1f40f8a748fd134752feb3"
  // }

  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === 'STRAVA') {
    return res.json({ 'hub.challenge': req.query['hub.challenge'] });
  }

  // If challenge response is accepted, Strava will respond with:
  // {
  //   "id": 1,
  //   "object_type": "activity",
  //   "aspect_type": "create",
  //   "callback_url": "http://a-valid.com/url",
  //   "created_at": "2015-04-29T18:11:09.400558047-07:00",
  //   "updated_at": "2015-04-29T18:11:09.400558047-07:00"
  // }

  console.log('req.query: ', req.query);
  return res.status(200).send();
};

exports.postStravaWebhookEvent = function(req, res) {

  // EXAMPLE POST BODY
  // {
  //   "subscription_id": "1",
  //   "owner_id": 13408,
  //   "object_id": 12312312312,
  //   "object_type": "activity",
  //   "aspect_type": "create",
  //   "event_time": 1297286541
  // }

  console.log('postStravaWebhookEvent for user: ', req.body.owner_id || 'no owner_id received');

  util.storeEvent(req.body)
    .then(function(event) {
      return res.status(200).send();
    })
    .catch(function(err) {
      // No reason to tell Strata about the error.
      console.log('postStravaWebhookEvent error.');
      return res.status(200).send();
    });
};
