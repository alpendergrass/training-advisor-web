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

module.exports.TPAutoDownloadLookbackNumberOfDays = '3';

//Skip lesser event if within this many days of goal event.
module.exports.priority2EventCutOffThreshold = 5;
module.exports.priority3EventCutOffThreshold = 9;

//If it has been this many days since FTP was updated, start nagging user to test.
module.exports.testingNagDayCount = 26;

module.exports.testingEligibleFormThreshold = -1;
module.exports.testingDueEasyDayThreshold = -25;

// module.exports.easyDayThreshold = -30;
module.exports.restDayThreshold = -48;

module.exports.t1HardDayThreshold = -34;
module.exports.t1ModerateDayThreshold = -38;
module.exports.t1EasyDayThreshold = -42;

module.exports.t2HardDayThreshold = -32;
module.exports.t2ModerateDayThreshold = -36;
module.exports.t2EasyDayThreshold = -40;

module.exports.t3HardDayThreshold = -30;
module.exports.t3ModerateDayThreshold = -34;
module.exports.t3EasyDayThreshold = -38;

module.exports.t4HardDayThreshold = -28;
module.exports.t4ModerateDayThreshold = -32;
module.exports.t4EasyDayThreshold = -36;

module.exports.t5HardDayThreshold = -26;
module.exports.t5ModerateDayThreshold = -30;
module.exports.t5EasyDayThreshold = -34;

module.exports.t6HardDayThreshold = -30;
module.exports.t6ModerateDayThreshold = -34;
module.exports.t6EasyDayThreshold = -38;

module.exports.raceHardDayThreshold = -20;
module.exports.raceModerateDayThreshold = -24;
module.exports.raceEasyDayThreshold = -28;

// This is the target ramp rate we use in t6 and race periods.
module.exports.peakRaceTargetRampRate = -3.5;

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

module.exports.smallClimbingDay = 200; //meters at least.
module.exports.moderateClimbingDay = 400; //meters at least.
module.exports.bigClimbingDay = 800; //meters at least.
