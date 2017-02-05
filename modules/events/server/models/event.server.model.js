'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';

var statusValues = {
  values: 'new|fetched|applied|skipped|error|unrecognized'.split('|'),
  message: invalidDataErrorMessage
};

var sourceValues = {
  values: 'strava|sendinblue'.split('|'),
  message: invalidDataErrorMessage
};

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
var minFitnessOrFatigueValue = [0, minMessage];
var maxFitnessOrFatigueValue = [999, maxMessage];

var EventSchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'strava',
    enum: sourceValues
  },
  processed: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    default: 'new',
    enum: statusValues
  },
  errorDetail: {
    type: String,
    default: ''
  },
  eventTime: {
    type: Date,
    required: 'eventTime is required'
  },
  ownerId: {
    type: Number,
    default: 0
  },
  objectId: {
    type: Number,
    default: 0
  },
  objectType: {
    type: String,
    default: ''
  },
  objectValue: {
    type: String,
    default: ''
  },
  aspectType: {
    type: String,
    default: ''
  },
  eventData: {
    type: String,
    default: ''
  }
});

mongoose.model('Event', EventSchema);
