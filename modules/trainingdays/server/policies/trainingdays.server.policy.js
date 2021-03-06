'use strict';

var acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

// Invoke TrainingDays Permissions
exports.invokeRolesPolicies = function () {
  acl.allow([{
    roles: ['admin'],
    allows: [{
      resources: '/api/trainingDays',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/:trainingDayId',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getSeason/:todayNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getSimDay/:trainingDayId',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/finalizeSim/:commit',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getDay/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getAdvice/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/refreshAdvice/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getLoadSummary/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/getFutureEvents/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/genPlan/:trainingDateNumeric',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/downloadActivities/:trainingDate',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/downloadAllActivities/:todayNumeric',
      permissions: '*'
    }]
  }, {
    roles: ['user'],
    allows: [{
      resources: '/api/trainingDays',
      permissions: ['get', 'post']
    }, {
      resources: '/api/trainingDays/:trainingDayId',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getSeason/:todayNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getSimDay/:trainingDayId',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/finalizeSim/:commit',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getDay/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getAdvice/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/refreshAdvice/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getLoadSummary/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/getFutureEvents/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/genPlan/:trainingDateNumeric',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/downloadActivities/:trainingDate',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/downloadAllActivities/:todayNumeric',
      permissions: ['get']
    }]
  }]);
  // } , {
  //   roles: ['guest'],
  //   allows: [{
  //     resources: '/api/trainingDays/strava/webhook',
  //     permissions: ['get', 'post']
  //   }]
};

// Check If TrainingDays Policy Allows
exports.isAllowed = function (req, res, next) {
  var roles = (req.user) ? req.user.roles : ['guest'];

  // If an trainingDay is being processed and the current user created it then allow any manipulation
  if (req.trainingDay && req.user && req.trainingDay.user.id === req.user.id) {
    return next();
  }

  // Check for user roles
  acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function (err, isAllowed) {
    if (err) {
      // An authorization error occurred.
      return res.status(500).send('Unexpected authorization error');
    } else {
      if (isAllowed) {
        // Access granted! Invoke next middleware
        return next();
      } else {
        return res.status(403).json({
          message: 'User is not authorized'
        });
      }
    }
  });
};
