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
module.exports.testingEasyDayThreshold = -25;

module.exports.easyDayThreshold = -30;
module.exports.restDayThreshold = -40;

module.exports.t1HardDayThreshold = -22;
module.exports.t2HardDayThreshold = -20;
module.exports.t3HardDayThreshold = -18;

module.exports.t4HardDayThreshold = -14;
module.exports.t4ModerateDayThreshold = -16;

module.exports.t5HardDayThreshold = -12;
module.exports.t5ModerateDayThreshold = -16;

module.exports.t6HardDayThreshold = -18;

module.exports.raceHardDayThreshold = -15;

//If form is less than or equal to this during t6 period, we recommend rest.
//I made it one less than restNeededForTestingThreshold to get unit tests to work.
//If we find it needs to be greater then we may need to modify or remove a test.
module.exports.restNeededForRacingThreshold = -12;

// //If form is less than or equal to this, we recommend an easy day if...see code.
// module.exports.easyDaytNeededThreshold = -32;

//We apply this factor to make the NP (weighted_average_watts) reported by Strava
//to more closely match Garmin/TP.
module.exports.stravaNPFudgeFactor = 1.055;

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
  //   activityType: 'simulation',
  //   lowLoadFactor: 1.9,
  //   highLoadFactor: 2.1
  // }, {
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
    upperLoadFactor: 0.40,
  }, {
    rating: 'moderate',
    upperLoadFactor: 1.10,
  }
];

