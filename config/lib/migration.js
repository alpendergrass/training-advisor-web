'use strict';

var path = require('path'),
  chalk = require('chalk'),
  config = require('../config'),
  Migration = require('mongration').Migration;

// var db = mongoose.connect(config.db.uri, config.db.options, function (err) {

module.exports = {};

module.exports.migrate = function() {
  if (process.env.RUN_MIGRATIONS === 'false') {
    console.log(chalk.green('Skipping migrations'));
    return Promise.resolve();
  }

  console.log(chalk.red('Running migrations'));

  var migrationConfig = {
      mongoUri: config.db.uri,
      migrationCollection: 'migrationversion'
    },
    migration = new Migration(migrationConfig);

  migration.addAllFromPath(path.join(__dirname, './migrations/'));

  return new Promise(function(resolve, reject) {
    migration.migrate(function(err, results) {
      if (err) {
        console.log('Migration error: ', err);
        reject(err);
      }

      console.log('Migration results: ', results);
      resolve(results);
    });
  });
};
