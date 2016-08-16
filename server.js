'use strict';

//load environment variables from .env file
require('dotenv-safe').load();
var app = require('./config/lib/app');
var server = app.start();
