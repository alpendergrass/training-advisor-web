'use strict';

var path = require('path'),
  mongoose = require('mongoose'),
  Site = mongoose.model('Site'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

exports.read = function (req, res) {
  Site.findOne().exec(function (err, site) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    //Note that site will be null the first time this is called.
    res.json(site);
  });
};

exports.update = function (req, res) {

  if (req.body._id) {
    Site.findById(req.body._id, function(err, site) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      site.allowRegistrations = req.body.allowRegistrations;

      site.save(function(err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        return res.json(site);
      });
    });
  } else {
    //We should only hit this once ever.
    var site = new Site();
    site.allowRegistrations = req.body.allowRegistrations;

    site.save(function (err, site) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      return res.json(site);
    });
  }
};
