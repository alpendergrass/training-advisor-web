'use strict';


var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var SiteSchema = new Schema({
  allowRegistrations: {
    type: Boolean,
    default: false
  }
});

mongoose.model('Site', SiteSchema);
