'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var invalidDataErrorMessage = 'The value of `{PATH}` ({VALUE}) is not a valid value.';

var metricsTypes = {
  values: 'planned|actual'.split('|'),
  message: invalidDataErrorMessage
};
var plannedActivityTypes = {
  values: 'event|simulation|test|hard|moderate|easy|rest|choice|'.split('|'),
  message: invalidDataErrorMessage
};
var plannedActivitySources = {
  values: 'advised|requested|plangeneration'.split('|'),
  message: invalidDataErrorMessage
};
var loadRatings = {
  values: 'hard|moderate|easy|rest|'.split('|'),
  message: invalidDataErrorMessage
};
var periods = {
  values: 'race|peak|t0|t1|t2|t3|t4|t5|'.split('|'),
  message: invalidDataErrorMessage
};
var completedActivitySources = {
  values: 'manual|strava|trainingpeaks|plangeneration'.split('|'),
  message: invalidDataErrorMessage
};

var minMessage = 'The value of `{PATH}` ({VALUE}) is less than the limit ({MIN}).';
var maxMessage = 'The value of `{PATH}` ({VALUE}) exceeds the limit ({MAX}).';
var minFitnessOrFatigueValue = [0, minMessage];
var maxFitnessOrFatigueValue = [999, maxMessage];
var minLoadValue = [0, minMessage];
var maxLoadValue = [9999, maxMessage];
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
    required: 'numericDate is required'
  },
  cloneOfId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  isSimDay: {
    type: Boolean,
    default: false
  },
  fitness: {
    type: Number,
    min: minFitnessOrFatigueValue,
    max: maxFitnessOrFatigueValue,
    default: 0
  },
  fatigue: {
    type: Number,
    min: minFitnessOrFatigueValue,
    max: maxFitnessOrFatigueValue,
    default: 0
  },
  form: {
    type: Number,
    default: 0
  },
  startingPoint: {
    type: Boolean,
    default: false
  },
  //We set this flag to suppress recomputation if the user manually updates F&F.
  fitnessAndFatigueTrueUp: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    default: '',
    trim: true
  },
  estimatedLoad: {
    type: Number,
    default: 0
  },
  expectedIntensity: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  expectedTerrain: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  scheduledEventRanking: {
    type: Number,
    min: 0,
    max: 9,
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
  metrics: [{
    metricsType: {
      type: String,
      enum: metricsTypes,
      required: 'metricsType is required'
    },
    fitness: {
      type: Number,
      min: minFitnessOrFatigueValue,
      max: maxFitnessOrFatigueValue,
      default: 0
    },
    fatigue: {
      type: Number,
      min: minFitnessOrFatigueValue,
      max: maxFitnessOrFatigueValue,
      default: 0
    },
    form: {
      type: Number,
      default: 0
    },
    sevenDayRampRate: {
      type: Number,
      default: 0
    },
    sevenDayAverageRampRate: {
      type: Number,
      default: 0
    },
    sevenDayTargetRampRate: {
      type: Number,
      default: 0
    },
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
      default: '',
      enum: loadRatings
    },
  }],
  // Legacy below
  sevenDayRampRate: {
    type: Number,
    default: 0
  },
  sevenDayTargetRampRate: {
    type: Number,
    default: 0
  },
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
    default: '',
    enum: loadRatings
  },
  // Legacy above
  planLoad: {
    type: Number,
    default: 0
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
    }
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
  lastStatus: {},
  user: {
    type: Schema.ObjectId,
    ref: 'User'
  }
});

mongoose.model('TrainingDay', TrainingDaySchema);
