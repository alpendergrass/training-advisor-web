'use strict';

const _ = require('lodash'),
  ua = require('universal-analytics');

module.exports = {};

module.exports.logAnalytics = function(req, pageData, eventData, user) {

  if (!req.user && !user) {
    return;
  }

  try {
    var visitor = ua(req.app.locals.googleAnalyticsTrackingID, req.user? req.user.id : user.id, { strictCidFormat: false });

    if (pageData && pageData.path) {
      if (!pageData.title) {
        // If we are not passed a page title, we will use the last node of referer.
        // req.headers.referer: "http://localhost:3000/season"
        // req.headers.referer: "http://localhost:3000/trainingDays/calendar"
        // req.headers.referer: "http://www.tacittraining.com/season"
        pageData.title = _.startCase(req.headers.referer.replace(/^\w+\:{1}\/{2}[\w.:]+\/?\w*\/{1}/, ''));
        console.log('pageData.title: ', pageData.title);
      }

      visitor.pageview({ dp: pageData.path, dt: pageData.title, dh: req.app.locals.googleAnalyticsHost }).send();
    }

    if (eventData) {
      let eventParms = {
        ec: eventData.category,
        ea: eventData.action,
        el: eventData.label || null,
        ev: eventData.value || null,
        // I do not see where event path shows up in GA.
        dp: eventData.path || null
      };

      visitor.event(eventParms).send();
    }
    return;
  } catch (err) {
    console.log('logAnalytics error: ', err);
    // We don't want to blow up if analytics logging does not work.
    return;
  }
};
