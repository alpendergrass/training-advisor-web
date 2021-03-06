'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';

var periods = {
  values: 'race|t0|t1|t2|t3|t4|t5|t6'.split('|'),
  message: invalidDataErrorMessage
};

var loadRatings = {
  values: 'hard|moderate|easy|rest'.split('|'),
  message: invalidDataErrorMessage
};

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
var minIntensityValue = [0, minMessage];
var maxIntensityValue = [5, maxMessage];
var minTerrainValue = [0, minMessage];
var maxTerrainValue = [5, maxMessage];

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
  terrainRating: {
    type: Number,
    min: minTerrainValue,
    max: maxTerrainValue,
    default: 0
  },
  intensityRating: {
    type: Number,
    min: minIntensityValue,
    max: maxIntensityValue,
    default: 0
  },
  instruction: {
    type: String,
    default: '',
    trim: true
  },
  usageCount: {
    type: Number,
    default: 0
  }
});

mongoose.model('Workout', WorkoutSchema);
