'use strict';

require('newrelic');

var path = require('path'),
  config = require('../config'),
  mongoose = require('./mongoose'),
  express = require('./express'),
  chalk = require('chalk'),
  seed = require('./seed'),
  later = require('later'),
  nodemailer = require('nodemailer'),
  sendinBlue = require('nodemailer-sendinblue-transport');

var smtpTransport = nodemailer.createTransport(sendinBlue(config.mailer.options)),
  mailSubjectPrefix = 'TacitTraining - ' + process.env.NODE_ENV,
  mailOptions = {
    to: config.mailer.from,
    from: config.mailer.from,
    subject: '',
    html: '',
    text: ''
  };

function seedDB() {
  if (config.seedDB && config.seedDB.seed) {
    console.log(chalk.bold.red('Warning:  Database seeding is turned on'));
    seed.start();
  }
}

// Initialize Models
mongoose.loadModels(seedDB);

module.exports.loadModels = function loadModels() {
  mongoose.loadModels();
};

module.exports.init = function init(callback) {
  mongoose.connect(function(db) {
    // Initialize express
    var app = express.init(db);

    if (process.env.TZ) {
      console.log(chalk.blue('Server timezone manually set to: ', process.env.TZ));
    }

    // Schedule events jobs:
    // only run this on first instance.
    var instanceIndex = process.env.CF_INSTANCE_INDEX || 0;

    if (instanceIndex > 0) {
      console.log(chalk.green('Skipping scheduling of scheduled jobs - not running on first instance.'));
    } else {
      var eventsUtil = require(path.resolve('./modules/events/server/lib/util')),
        userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
        sched = later.parse.recur().every(1).minute();

      later.setInterval(eventsUtil.processEvents, sched);

      sched = later.parse.recur().every(12).hour();
      later.setInterval(eventsUtil.purgeEvents, sched);

      sched = later.parse.recur().every(14).hour();
      later.setInterval(userUtil.scrubInactiveUsers, sched);
    }

    if (callback) callback(null, app, db, config);
  });
};

module.exports.start = function start(callback) {
  var _this = this;

  _this.init(function(err, app, db, config) {

    if (err) {
      console.log(chalk.red('App init failed with error: ', err));
      return;
    }

    // Start the app by listening on <port>
    app.listen(config.port, function() {

      // Logging initialization
      console.log('--');
      console.log(chalk.green(config.app.title));
      console.log(chalk.green('Environment:\t\t\t' + process.env.NODE_ENV));
      console.log(chalk.green('Port:\t\t\t\t' + config.port));
      console.log(chalk.green('Database:\t\t\t\t' + config.db.uri));
      if (process.env.NODE_ENV === 'secure') {
        console.log(chalk.green('HTTPs:\t\t\t\ton'));
      }
      console.log(chalk.green('App version:\t\t\t' + config.trainingAdvisor.version));
      console.log('--');

      if (process.env.NODE_ENV === 'cloud-foundry') {
        mailOptions.subject = mailSubjectPrefix + ': Started';
        mailOptions.text = 'App instance has been started.';
        smtpTransport.sendMail(mailOptions, function(err) {
          if (err) {
            console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
          }
        });
      }
    });

    if (callback) callback(app, db, config);
  });
};
