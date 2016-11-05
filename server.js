'use strict';

//load environment variables from .env file
require('dotenv-safe').load();
var app = require('./config/lib/app');
var migration = require('./config/lib/migration');

var server = app.start();

migration.migrate();
