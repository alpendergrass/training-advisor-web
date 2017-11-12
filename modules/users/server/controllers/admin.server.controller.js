'use strict';

var path = require('path'),
  mongoose = require('mongoose');

mongoose.Promise = global.Promise;

var User = mongoose.model('User'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

//Add mongoose middleware for pagination and filtering.
require('mongoose-middleware').initialize(mongoose);


// Show the current user
exports.read = function (req, res) {
  res.json(req.model);
};

exports.update = function (req, res) {
  var user = req.model;

  //For security purposes only merge these parameters
  user.firstName = req.body.firstName;
  user.lastName = req.body.lastName;
  user.displayName = user.firstName + ' ' + user.lastName;
  user.emailNewsletter = req.body.emailNewsletter;
  user.roles = req.body.roles;

  user.save(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    res.json(user);
  });
};

exports.delete = function (req, res) {
  var user = req.model;


  //TODO: should remove all related docs also.
  user.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    res.json(user);
  });
};

exports.impersonate = function(req, res, next) {
  var user = req.model;

  req.login(user, function(err) {
    if (err) {
      res.status(400).send(err);
    } else {
      res.json(user);
    }
  });
};

exports.list = function (req, res) {
  User.find({}, '-salt -password').sort('-created').populate('user', 'displayName').exec(function (err, users) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    res.json(users);
  });
};

exports.listSome = function (req, res) {
  let begin = parseInt(req.query.begin, 10);
  let sort = req.query.sort;
  let filter = req.query.filter;
  let count = 2; //50
  console.log('filter: ', filter);


  let options = {
    filters : {
      field : ['firstName', 'lastName', 'email', 'username', 'loginCount', 'lastLogin', 'updated', 'created', 'roles'],
      keyword : {
        fields : ['firstName', 'lastName', 'email', 'username'],
        term : filter
      }
    },
    sort : sort,
    start : begin,
    count : count
  };

  console.log('options: ', options);

  User
    .find()
    .field(options)
    .keyword(options)
    .order(options)
    .page(options)
    .then((users) => {
      res.json(users);
    })
    .catch((err) => {
      console.log('listSome err: ', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });

};

// User middleware
exports.userByID = function (req, res, next, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('User is invalid - id: ', id);
    return res.status(400).send({
      message: 'User is invalid'
    });
  }

  User.findById(id, '-salt -password').exec(function (err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return next(new Error('Failed to load user ' + id));
    }

    req.model = user;
    next();
  });
};
