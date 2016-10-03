'use strict';


var sitePolicy = require('../policies/site.server.policy'),
  site = require('../controllers/site.server.controller');

module.exports = function (app) {
  app.route('/api/site')
    .get(sitePolicy.isAllowed, site.read)
    .put(sitePolicy.isAllowed, site.update);
};
