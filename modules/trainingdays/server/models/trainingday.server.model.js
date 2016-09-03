'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  moment = require('moment');

// var ratings = {
//   values: 'too hard|about right|too easy'.split('|'),
//   message: 'The value of `{PATH}` ({VALUE}) is not a valid value.'
// };
var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';
var plannedActivityTypes = {
  values: 'goal|simulation|test|hard|moderate|easy|rest|choice|'.split('|'),
  message: invalidDataErrorMessage
};
var plannedActivitySources = {
  values: 'advised|requested'.split('|'),
  message: invalidDataErrorMessage
};
var loadRatings = {
  values: 'hard|moderate|easy|rest'.split('|'),
  message: invalidDataErrorMessage
};
var periods = {
  values: 'peak|build|base|transition|'.split('|'),
  message: invalidDataErrorMessage
};
var completedActivitySources = {
  values: 'manual|strava|trainingpeaks|plangeneration'.split('|'),
  message: invalidDataErrorMessage
};
// var priorities = {
//   values: 'A|B|C|'.split('|'),
//   message: invalidDataErrorMessage
// };

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
var minFitnessOrFatigueValue = [0, minMessage];
var maxFitnessOrFatigueValue = [199, maxMessage];
var minLoadValue = [0, minMessage];
var maxLoadValue = [999, maxMessage];
var minDurationValue = [0, minMessage];
var maxDurationValue = [9999, maxMessage];
var minTrainingEffortFeedback = [-2, minMessage];
var maxTrainingEffortFeedback = [2, maxMessage]; 

var TrainingDaySchema = new Schema({
  created: {
    type: Date,
    default: Date.now
  },
  date: {
    type: Date,
    required: 'Date is required'
  },
  dateNumeric: {
    type: Number,
    default: 0
  },
  //CTL
  fitness: {
    type: Number,
    min: minFitnessOrFatigueValue,
    max: maxFitnessOrFatigueValue, 
    default: 0
  },
  //ATL
  fatigue: {
    type: Number,
    min: minFitnessOrFatigueValue,
    max: maxFitnessOrFatigueValue, 
    default: 0
  },
  //TSB
  form: {
    type: Number,
    default: 0
  },
  //weekly fitness (CTL) ramp rate
  startingPoint: {
    type: Boolean,
    default: false
  },
  //We set this flag to supress recomputation if the user manually updates F&F.
  fitnessAndFatigueTrueUp: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  estimatedGoalLoad: {
    type: Number,
    default: 0
  },
  eventPriority: {
    type: Number,
    min: 0,
    max: 3, 
    default: 0
  },
  eventRecurrenceID: {
    type: Number,
    default: null
  },
  recurrenceSpec: {
    everyNTimeUnits: {
      type: Number,
      default: 0
    },
    daysOfWeek: {},
    endsOn: {
      type: Date,
      default: null
    },
  },
  daysUntilNextGoalEvent: {
    type: Number,
    default: 0
  },
  daysUntilNextPriority2Event: {
    type: Number,
    default: 0
  },
  daysUntilNextPriority3Event: {
    type: Number,
    default: 0
  },
  period: {
    type: String,
    enum: periods,
    default: ''
  },
  //weekly target fitness (CTL) ramp rate
  sevenDayRampRate: {
    type: Number,
    default: 0
  },
  sevenDayTargetRampRate: {
    type: Number,
    default: 0
  },
  //daily target fitness (CTL) ramp rate
  dailyTargetRampRate: {
    type: Number,
    default: 0
  },
  rampRateAdjustmentFactor: {
    type: Number,
    default: 1
  },
  targetAvgDailyLoad: {
    type: Number,
    default: 0
  },
  loadRating: {
    type: String,
    default: 'rest',
    enum: loadRatings
  },
  trainingEffortFeedback: {
    type: Number,
    min: minTrainingEffortFeedback,
    max: maxTrainingEffortFeedback, 
    default: null
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  plannedActivities: [{
    created: {
      type: Date,
      default: Date.now
    },
    activityType: {
      type: String,
      enum: plannedActivityTypes,
      default: ''
    },
    source: {
      type: String,
      default: 'advised',
      enum: plannedActivitySources
    },
    targetMinLoad: {
      type: Number,
      min: minLoadValue,
      max: maxLoadValue, 
      default: 0
    },
    targetMaxLoad: {
      type: Number,
      min: minLoadValue,
      max: maxLoadValue,
      default: 0
    },
    rationale: {
      type: String,
      default: '',
      trim: true
    },
    advice: {
      type: String,
      default: '',
      trim: true
    },
  }],
  completedActivities: [{
    created: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      default: 'manual',
      enum: completedActivitySources
    },
    sourceID: {
      type: String,
      default: '',
      trim: true      
    },
    name: {
      type: String,
      default: '',
      trim: true
    },
    load: {
      type: Number,
      min: 0,
      max: 999,
      default: 0
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  }],
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

TrainingDaySchema.pre('save', function(next) {
  var dateString = moment(this.get('date')).format('YYYYMMDD');
  this.dateNumeric = parseInt(dateString, 10);
  next();
});

mongoose.model('TrainingDay', TrainingDaySchema);
