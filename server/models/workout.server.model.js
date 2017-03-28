'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';

var periods = {
  values: 'race|t0|t1|t2|t3|t4|t5|t6'.split('|'),
  message: invalidDataErrorMessage
};

var formats = {
  values: 'unstructured|structured'.split('|'),
  message: invalidDataErrorMessage
};

var loadRatings = {
  values: 'hard|moderate|easy|rest'.split('|'),
  message: invalidDataErrorMessage
};

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
var minTerrainValue = [0, minMessage];
var maxTerrainValue = [99999, maxMessage];

var WorkoutSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: 'workout name is required'
  },
  period: {
    type: String,
    enum: periods,
    required: 'workout period is required'
  },
  loadRating: {
    type: String,
    enum: loadRatings,
    required: 'workout loadRating is required'
  },
  // intensityRating: {
  //   type: String,
  //   enum: intensityRatings
  //   required: 'workout intensityRating is required'
  // },
  terrain: {
    type: Number,
    min: minTerrainValue,
    max: maxTerrainValue,
    default: 0
  },
  format: {
    type: String,
    enum: formats,
    default: 'unstructured'
  },
  instruction: {
    type: String,
    default: '',
    trim: true
  }
});

mongoose.model('Workout', WorkoutSchema);
