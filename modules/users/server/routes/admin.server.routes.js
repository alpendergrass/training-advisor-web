'use strict';


var adminPolicy = require('../policies/admin.server.policy'),
  admin = require('../controllers/admin.server.controller');

module.exports = function (app) {
  // User route registration first. Ref: #713
  require('./users.server.routes.js')(app);

  // Users collection routes
  app.route('/api/users')
    .get(adminPolicy.isAllowed, admin.list);

  app.route('/api/users/listSome')
    .get(adminPolicy.isAllowed, admin.listSome);

  // Single user routes
  app.route('/api/users/:userId')
    .get(adminPolicy.isAllowed, admin.read)
    .put(adminPolicy.isAllowed, admin.update)
    .delete(adminPolicy.isAllowed, admin.delete);

  app.route('/api/users/impersonate/:userId')
    .get(adminPolicy.isAllowed, admin.impersonate);

  // Finish by binding the user middleware
  app.param('userId', admin.userByID);
};
