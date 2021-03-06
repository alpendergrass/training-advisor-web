'use strict';


var _ = require('lodash'),
  mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var User = mongoose.model('User');


/**
 * User middleware
 */
exports.userByID = function (req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('User is invalid - id: ', id);
    return res.status(400).send({
      message: 'User is invalid'
    });
  }

  User.findOne({
    _id: id
  }).exec(function (err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Failed to load User ' + id));
    }

    req.profile = user;
    next();
  });
};
