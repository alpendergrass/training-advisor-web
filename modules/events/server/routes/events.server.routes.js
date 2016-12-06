'use strict';

var events = require('../controllers/events.server.controller');

module.exports = function (app) {
  app.route('/api/events/strava/webhook')
    .get(events.validateStravaWebhookSubscription)
    .post(events.postStravaWebhookEvent);
};
