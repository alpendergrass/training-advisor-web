'use strict';

//load environment variables from .env file
require('dotenv-safe').load();
var app = require('./config/lib/app');
// var migration = require('./config/lib/migration');

var server = app.start();

// We are now running migrations stand-alone. See ~/migrate.js.
// migration.migrate();
