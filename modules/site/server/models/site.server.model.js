'use strict';


var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var SiteSchema = new Schema({
  allowRegistrations: {
    type: Boolean,
    default: false
  }
});

mongoose.model('Site', SiteSchema);
