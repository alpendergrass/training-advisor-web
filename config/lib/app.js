'use strict';


var config = require('../config'),
  mongoose = require('./mongoose'),
  express = require('./express'),
  chalk = require('chalk'),
  seed = require('./seed'),
  later = require('later'),
  nodemailer = require('nodemailer');

var smtpTransport = nodemailer.createTransport(config.mailer.options),
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
  mongoose.connect(function (db) {
    // Initialize express
    var app = express.init(db);

    if (process.env.TZ) {
      console.log(chalk.red('***** Server timezone manually set to: ', process.env.TZ));
    }

    // //Schedule workout download job.
    // // var textSched = later.parse.text('every 1 min'); //time is GMT
    // var textSched = later.parse.text('at 06:20 every 1 day'); //time is GMT

    // if (textSched.error > -1) {
    //   mailOptions.subject += ': Error';
    //   mailOptions.text = 'Auto-download scheduling error: ' + textSched.error + ' (-1 is no error)';
    //   console.log(mailOptions.text);
    //   smtpTransport.sendMail(mailOptions, function (err) {
    //     if (err) {
    //       console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
    //     }
    //   });
    // } else {
    //   mailOptions.subject += ': Info';
    //   mailOptions.text = 'next auto-download occurs: ' + later.schedule(textSched).next(1);
    //   console.log(mailOptions.text);
    //   smtpTransport.sendMail(mailOptions, function (err) {
    //     if (err) {
    //       console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
    //     }
    //   });
    //   var timer = later.setInterval(downloadTP, textSched);
    // }

    if (callback) callback(app, db, config);
  });
};

function downloadTP() {
  var downloadTrainingPeaks = require('../../modules/trainingdays/server/lib/download-trainingpeaks');
  console.log(new Date() + ' Running scheduled TP download job.');
  downloadTrainingPeaks.batchDownloadActivities(function(err) {
    if (err) {
      mailOptions.subject = mailSubjectPrefix + ': Error';
      mailOptions.text = 'downloadTrainingPeaks.batchDownloadActivities returned error: ' + JSON.stringify(err);
      console.log(mailOptions.text);
      smtpTransport.sendMail(mailOptions, function (err) {
        if (err) {
          console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
        }
      });
    } else {
      mailOptions.subject = mailSubjectPrefix + ': Info';
      mailOptions.text = 'downloadTrainingPeaks.batchDownloadActivities completed successfully.';
      console.log(mailOptions.text);
      smtpTransport.sendMail(mailOptions, function (err) {
        if (err) {
          console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
        }
      });
    }
  });
}

module.exports.start = function start(callback) {
  var _this = this;

  _this.init(function (app, db, config) {

    // Start the app by listening on <port>
    app.listen(config.port, function () {

      // Logging initialization
      console.log('--');
      console.log(chalk.green(config.app.title));
      console.log(chalk.green('Environment:\t\t\t' + process.env.NODE_ENV));
      console.log(chalk.green('Port:\t\t\t\t' + config.port));
      console.log(chalk.green('Database:\t\t\t\t' + config.db.uri));
      if (process.env.NODE_ENV === 'secure') {
        console.log(chalk.green('HTTPs:\t\t\t\ton'));
      }
      console.log(chalk.green('App version:\t\t\t' + config.meanjs.version));
      if (config.meanjs['meanjs-version'])
        console.log(chalk.green('MEAN.JS version:\t\t\t' + config.meanjs['meanjs-version']));
      console.log('--');

      mailOptions.subject = mailSubjectPrefix + ': Started';
      mailOptions.text = 'App instance has been started.';
      smtpTransport.sendMail(mailOptions, function (err) {
        if (err) {
          console.log('smtpTransport.sendMail returned error: ' + JSON.stringify(err));
        }
      });

      if (callback) callback(app, db, config);
    });
  });
};
