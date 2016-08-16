'use strict';

/**
 * Module dependencies.
 */
var acl = require('acl');

// Using the memory backend
acl = new acl(new acl.memoryBackend());

/**
 * Invoke TrainingDays Permissions
 */
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
      resources: '/api/trainingDays/getAdvice/:trainingDate',
      permissions: '*'
    }, {
      resources: '/api/trainingDays/downloadActivities/:trainingDate',
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
      resources: '/api/trainingDays/getAdvice/:trainingDate',
      permissions: ['get']
    }, {
      resources: '/api/trainingDays/downloadActivities/:trainingDate',
      permissions: ['get']
    }]
  }
  // , {
  //   roles: ['guest'],
  //   allows: [{
  //     resources: '/api/trainingDays',
  //     permissions: ['get']
  //   }, {
  //     resources: '/api/trainingDays/:trainingDayId',
  //     permissions: ['get']
  //   }]
  // }
  ]);
};

/**
 * Check If TrainingDays Policy Allows
 */
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
