'use strict';

const  _ = require('lodash'),
  ua = require('universal-analytics');

module.exports = {};

module.exports.logAnalytics = function(req, pageData, eventData) {

  if (!req.user) {
    return;
  }

  try {
    var visitor = ua(req.app.locals.googleAnalyticsTrackingID, req.user.id, { strictCidFormat: false });

    if (pageData && pageData.path) {
      if (!pageData.title) {
        // If we are not passed a page title, we will use the last node of referer.
        // req.headers.referer: "http://localhost:3000/season"
        // req.headers.referer: "http://localhost:3000/trainingDays/calendar"
        pageData.title = _.startCase(req.headers.referer.replace(/^(\w+)(\:{1})(\/{2})(\w+)(\:?)(\w*)(\/?)(\w*)(\/{1})/, ''));
      }
      console.log('pageData: ', pageData);
      visitor.pageview({ dp: pageData.path, dt: pageData.title, dh: req.app.locals.googleAnalyticsHost }).send();
    }

    if (eventData) {
      let eventParms = {
        ec: eventData.category,
        ea: eventData.action,
        el: eventData.label || null,
        ev: eventData.value || null,
        dp: eventData.path || null
      };
      console.log('eventData: ', eventData);
      visitor.event(eventParms).send();
    }
    return;
  } catch (err) {
    console.log('logAnalytics error: ', err);
    // We don't want to blow up if analytics logging does not work.
    return;
  }
};
