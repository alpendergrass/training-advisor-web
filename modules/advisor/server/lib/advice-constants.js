'use strict';

module.exports = {};

//This is the minimum duration from season start to  start of race period -> 15 weeks
module.exports.minimumNumberOfTrainingDays = 105;

//This is the maximum duration from season start to start of race period -> 22 weeks
module.exports.maximumNumberOfTrainingDays = 154;

module.exports.minimumNumberOfRaceDays = 7;
module.exports.maximumNumberOfRaceDays = 21;

module.exports.midSeasonTransitionNumberOfDays = 5;

module.exports.maxDaysToLookAheadForFutureGoals = module.exports.maximumNumberOfTrainingDays + module.exports.maximumNumberOfRaceDays;
module.exports.maxDaysToLookAheadForSeasonEnd = 366;
module.exports.monthsToVirtualGoal = 4;

module.exports.trainingPeriodLookups = [
  {
    period: 't1',
    start: 1.0,
    end: 0.815
  }, {
    period: 't2',
    start: 0.815,
    end: 0.63
  }, {
    period: 't3',
    start: 0.63,
    end: 0.445
  }, {
    period: 't4',
    start: 0.445,
    end: 0.26
  }, {
    period: 't5',
    start: 0.26,
    end: 0.075
  }, {
    period: 't6',
    start: 0.075,
    end: 0.0
  }
];

//Skip lesser event if within this many days of goal event.
module.exports.priority2EventCutOffThreshold = 5;
module.exports.priority3EventCutOffThreshold = 9;

//If it has been this many days since FTP was updated, start nagging user to test.
module.exports.testingNagDayCount = 26;

module.exports.testingEligibleFormThreshold = -1;
module.exports.testingDueEasyDayThreshold = -25;

// The thresholds below will be adjusted base on user rate of recovery setting.
module.exports.t1HardDayThreshold = -30;
module.exports.t1ModerateDayThreshold = -34;
module.exports.t1EasyDayThreshold = -38;

module.exports.t2HardDayThreshold = -30;
module.exports.t2ModerateDayThreshold = -34;
module.exports.t2EasyDayThreshold = -38;

module.exports.t3HardDayThreshold = -30;
module.exports.t3ModerateDayThreshold = -34;
module.exports.t3EasyDayThreshold = -38;

module.exports.t4HardDayThreshold = -28;
module.exports.t4ModerateDayThreshold = -32;
module.exports.t4EasyDayThreshold = -36;

module.exports.t5HardDayThreshold = -26;
module.exports.t5ModerateDayThreshold = -30;
module.exports.t5EasyDayThreshold = -34;

module.exports.t6HardDayThreshold = -12;
module.exports.t6ModerateDayThreshold = -16;
module.exports.t6EasyDayThreshold = -20;

module.exports.raceHardDayThreshold = -12;
module.exports.raceModerateDayThreshold = -16;
module.exports.raceEasyDayThreshold = -20;

// This is the target ramp rate we use in t6 and race periods.
// We want TSB to rise when tapering so we will let CTL decay somewhat.
module.exports.peakRaceTargetRampRate = -1;

// This is the target ramp rate we use in transition periods.
module.exports.transitionTargetRampRate = 4.0;

//This is the maximum amount by which we will tweak (+/-) load advice
//to try to bring actual ramp rate closer to target rate.
module.exports.rampRateAdjustmentLimit = 0.05;

//CTL Time Constant is 42 by default in TP and Strava.
module.exports.defaultFitnessTimeConstant = 42;

//ATL Time Constant is 7 by default in TP and Strava.
//We may tweak it based on user feedback.
module.exports.defaultFatigueTimeConstant = 7;
module.exports.minimumFatigueTimeConstant = 5;
module.exports.maximumFatigueTimeConstant = 9;

module.exports.loadAdviceLookups = [
  {
    activityType: 'choice',
    lowLoadFactor: 0.0,
    highLoadFactor: 1.5
  }, {
    activityType: 'rest',
    lowLoadFactor: 0,
    highLoadFactor: 0.20
  }, {
    activityType: 'easy',
    lowLoadFactor: 0.20,
    highLoadFactor: 0.40
  }, {
    activityType: 'moderate',
    lowLoadFactor: 0.9,
    highLoadFactor: 1.1
  }, {
    activityType: 'hard',
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
  }, {
    activityType: 'test',
    lowLoadFactor: 1,
    highLoadFactor: 1
  }, {
    activityType: 'event1',
    // goal event
    // load factors are high to counteract the negative ramp rate used in race period.
    lowLoadFactor: 2.1,
    highLoadFactor: 2.6
  }, {
    activityType: 'event2',
    // medium priority event
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
  }, {
    activityType: 'event3',
    // low priority event
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
  }, {
    activityType: 'event9',
    // off day
    lowLoadFactor: 0,
    highLoadFactor: 0
  }
];

// Use these values for generated activities used in planGen.
module.exports.intensityEstimateLookups = [
  {
    activityType: 'easy',
    period: 't1',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 't2',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 't3',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 't4',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 't5',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 't6',
    intensity: 0.65
  }, {
    activityType: 'easy',
    period: 'race',
    intensity: 0.65
  }, {
    activityType: 'moderate',
    period: 't1',
    intensity: 0.75
  }, {
    activityType: 'moderate',
    period: 't2',
    intensity: 0.75
  }, {
    activityType: 'moderate',
    period: 't3',
    intensity: 0.75
  }, {
    activityType: 'moderate',
    period: 't4',
    intensity: 0.80
  }, {
    activityType: 'moderate',
    period: 't5',
    intensity: 0.85
  }, {
    activityType: 'moderate',
    period: 't6',
    intensity: 0.95
  }, {
    activityType: 'moderate',
    period: 'race',
    intensity: 0.95
  }, {
    activityType: 'hard',
    period: 't1',
    intensity: 0.70
  }, {
    activityType: 'hard',
    period: 't2',
    intensity: 0.70
  }, {
    activityType: 'hard',
    period: 't3',
    intensity: 0.70
  }, {
    activityType: 'hard',
    period: 't4',
    intensity: 0.75
  }, {
    activityType: 'hard',
    period: 't5',
    intensity: 0.80
  }, {
    activityType: 'hard',
    period: 't6',
    intensity: 0.85
  }, {
    activityType: 'hard',
    period: 'race',
    intensity: 0.85
  }, {
    activityType: 'event',
    period: 't1',
    intensity: 0.80
  }, {
    activityType: 'event',
    period: 't2',
    intensity: 0.80
  }, {
    activityType: 'event',
    period: 't3',
    intensity: 0.83
  }, {
    activityType: 'event',
    period: 't4',
    intensity: 0.85
  }, {
    activityType: 'event',
    period: 't5',
    intensity: 0.90
  }, {
    activityType: 'event',
    period: 't6',
    intensity: 0.90
  }, {
    activityType: 'event',
    period: 'race',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't1',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't2',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't3',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't4',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't5',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 't6',
    intensity: 0.90
  }, {
    activityType: 'test',
    period: 'race',
    intensity: 0.90
  }
];


module.exports.loadRatingLookups = [
  {
    rating: 'rest',
    upperLoadFactor: 0.00,
  }, {
    rating: 'easy',
    upperLoadFactor: 0.70,
  }, {
    rating: 'moderate',
    upperLoadFactor: 1.25,
  }
];

module.exports.smallClimbingDay = 300; //meters at least.
module.exports.moderateClimbingDay = 500; //meters at least.
module.exports.bigClimbingDay = 900; //meters at least.
