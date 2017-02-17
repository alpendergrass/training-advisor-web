'use strict';

// https://github.com/awapps/mongration

var path = require('path'),
  chalk = require('chalk'),
  config = require('../config'),
  Migration = require('mongration').Migration;

module.exports = {};

module.exports.migrate = function() {
  if (!process.env.RUN_MIGRATIONS || process.env.RUN_MIGRATIONS === 'false') {
    //Seems I should not have to explicitly check for false, but I do.
    console.log(chalk.green('Skipping migrations.'));
    return Promise.resolve();
  }

  console.log('process.env.CF_INSTANCE_INDEX: ', process.env.CF_INSTANCE_INDEX);

  var instanceIndex = process.env.CF_INSTANCE_INDEX || 0;

  if (instanceIndex > 0) {
    console.log(chalk.green('Skipping migrations - not running on first instance.'));
    return Promise.resolve();
  }

  console.log(chalk.green('Running migrations.'));

  var migrationConfig = {
      mongoUri: config.db.uri,
      migrationCollection: 'migrations'
    },
    migration = new Migration(migrationConfig);

  // migration.addAllFromPath(path.join(__dirname, './migrations/'));
  migration.add(path.join(__dirname, './migrations/restructure-metrics.js'));
  migration.add(path.join(__dirname, './migrations/refresh-metrics.js'));
  migration.add(path.join(__dirname, './migrations/migration-rename-periods.js'));
  migration.add(path.join(__dirname, './migrations/migration-rename-activity-type.js'));
  // migration.add(path.join(__dirname, './migrations/migration-restructure-ftp.js'));
  // List future migrations here. Leave previous in place above.

  return new Promise(function(resolve, reject) {
    console.log('Starting migration: ', new Date().toString());
    migration.migrate(function(err, results) {
      if (err) {
        console.log(chalk.red('Migration failed with error: ', err));
        return reject(err);
      }

      // console.log(chalk.green('Migration results: ', results));
      console.log('Migration results: ', results);
      console.log('Migration complete: ', new Date().toString());
      return resolve(results);
    });
  });
};
