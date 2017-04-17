'use strict';

var util = require('../lib/util');

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

  // callback_url=http://www.tacittraining.com/api/events/strava/webhook

  // Strava webhook:
  // {
  //   "subscription_id": "1",
  //   "owner_id": 13408,
  //   "object_id": 12312312312,
  //   "object_type": "activity",
  //   "aspect_type": "create",
  //   "event_time": 1297286541
  // }

  console.log(`postStravaWebhookEvent for owner_id: ${req.body.owner_id || 'no owner_id received'}, object_id: ${req.body.object_id || 'no object_id received'}`);

  util.storeStravaEvent(req.body)
    .then(function(event) {
      return res.status(200).send();
    })
    .catch(function(err) {
      // No reason to tell Strata about the error.
      console.log('postStravaWebhookEvent error. req.body: ', JSON.stringify(req.body));
      return res.status(200).send();
    });
};

exports.postSendInBlueWebhookEvent = function(req, res) {

  // callback_url=http://www.tacittraining.com/api/events/sendinblue/campaign_webhook

  // Unsubscribe postSendInBlueWebhookEvent req.body (payload differs by event):
  // {
  //    "id":20650,
  //    "camp_id":1,
  //    "email":"gus@tacittraining.com",
  //    "campaign name":"Test Campaign",
  //    "date_sent":"",
  //    "date_event":"2017-01-07 14:52:37", --> eventTime
  //    "event":"unsubscribe", --> aspectType
  //    "tag":"",
  //    "ts_sent":null,
  //    "ts_event":1483797157,
  //    "list_id":[
  //       4
  //    ]
  // }

  // console.log('postSendInBlueWebhookEvent for email: ', req.body.email || 'no email received');

  util.storeSendInBlueEvent(req.body)
    .then(function(event) {
      return res.status(200).send();
    })
    .catch(function(err) {
      // No reason to tell them about the error.
      // Probably for an event we do not care about.
      // console.log('postSendInBlueWebhookEvent error. req.body: ', JSON.stringify(req.body));
      return res.status(200).send();
    });
};
