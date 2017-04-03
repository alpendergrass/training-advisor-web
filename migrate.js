'use strict';

//load environment variables from .env file
require('dotenv').load();
var app = require('./config/lib/app');
var migration = require('./config/lib/migration');

app.init(function(err, app, db, config) {
  if (err) {
    console.log(chalk.red('App init failed with error: ', err));
    return;
  }

  migration.migrate()
  .then(function(results){
    process.exit();
  })
  .catch(function(error){
    console.log('migrate error: ', error);
    process.exit();
  });
});
