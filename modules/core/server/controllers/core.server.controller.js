'use strict';

var releaseNotes = require('../lib/release-notes');

// Render the main application page
exports.renderIndex = function (req, res) {

  //coreUtil.logAnalytics(req, { path: '/', title: 'Index' });

  res.render('modules/core/server/views/index', {
    user: req.user || null
  });
};

// Render the server error page
exports.renderServerError = function (req, res) {
  res.status(500).render('modules/core/server/views/500', {
    error: 'Oops! Something went wrong...'
  });
};

// Render the server not found responses
// Performs content-negotiation on the Accept HTTP header
exports.renderNotFound = function (req, res) {
  res.status(404).format({
    'text/html': function () {
      res.render('modules/core/server/views/404', {
        url: req.originalUrl
      });
    },
    'application/json': function () {
      res.json({
        error: 'Path not found'
      });
    },
    'default': function () {
      res.send('Path not found');
    }
  });
};

exports.getAppVersion = function (req, res) {
  return res.json({ 'appVersion': req.app.locals.version });
};

exports.getReleaseNotes = function (req, res) {
  return res.json({ 'releaseNotes': releaseNotes.notes });
};
