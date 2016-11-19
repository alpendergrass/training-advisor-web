'use strict';

module.exports = {};

//This is the minimum duration from season start to  start of race period -> 15 weeks
module.exports.minimumNumberOfTrainingDays = 105;

//This is the maximum duration from season start to start of race period -> 25 weeks
module.exports.maximumNumberOfTrainingDays = 182;

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

module.exports.minimumNumberOfRaceDays = 7;
module.exports.maximumNumberOfRaceDays = 21;

module.exports.midSeasonTransitionNumberOfDays = 5;

module.exports.maxDaysToLookAheadForFutureGoals = module.exports.maximumNumberOfTrainingDays + module.exports.maximumNumberOfRaceDays;
module.exports.maxDaysToLookAheadForSeasonEnd = 366;

module.exports.TPAutoDownloadLookbackNumberOfDays = '3';

//Skip lesser event if within this many days of goal event.
module.exports.priority2EventCutOffThreshold = 5;
module.exports.priority3EventCutOffThreshold = 9;

//If it has been this many days since FTP was updated, start nagging user to test.
module.exports.testingNagDayCount = 24;

//Form must be greater than this before we will recommend testing.
module.exports.testingEligibleFormThreshold = -5;

//If form is ever less than or equal to this, we recommend rest.
module.exports.restNeededThreshold = -32;

//If testing is due and form is less than or equal to this, we recommend rest.
module.exports.restNeededForTestingThreshold = -18;

//If form is less than or equal to this during t6 period, we recommend rest.
//I made it one less than restNeededForTestingThreshold to get unit tests to work.
//If we find it needs to be greater then we may need to modify or remove a test.

module.exports.restNeededForRacingThreshold = -12;

//If form is less than or equal to this, we recommend an easy day if...see code.
module.exports.easyDaytNeededThreshold = -28;

module.exports.t1ModerateDayThreshold = -26;
module.exports.t1HardDayThreshold = -18;

module.exports.t2ModerateDayThreshold = -26;
module.exports.t2HardDayThreshold = -18;

module.exports.t3ModerateDayThreshold = -25;
module.exports.t3HardDayThreshold = -18;

module.exports.t4ModerateDayThreshold = -26;
module.exports.t4HardDayThreshold = -18;

module.exports.t5HardDayThreshold = -18;

module.exports.t6ModerateDayThreshold = -21;
module.exports.t6HardDayThreshold = -18;
module.exports.t6RestNeededThreshold = -30;

module.exports.raceModerateDayThreshold = -21;
module.exports.raceHardDayThreshold = -18;

//We apply this factor to make the NP (weighted_average_watts) reported by Strava
//to more closely match Garmin/TP.
module.exports.stravaNPFudgeFactor = 1.055;

// This is the target ramp rate we use in t6 and race periods.
module.exports.peakRaceTargetRampRate = -3.5;

// This is the target ramp rate we use in transition periods.
module.exports.transitionTargetRampRate = 0.01;

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
    highLoadFactor: 0.4
    // intensity:  0.8
  }, {
    activityType: 'rest',
    lowLoadFactor: 0,
    highLoadFactor: 0.20
    // intensity:  0.0
  }, {
    activityType: 'easy',
    lowLoadFactor: 0.30,
    highLoadFactor: 0.60
    // intensity:  0.7
  }, {
    activityType: 'moderate',
    lowLoadFactor: 1.0,
    highLoadFactor: 1.2
    // intensity:  0.8
  }, {
    activityType: 'hard',
    lowLoadFactor: 1.7,
    highLoadFactor: 1.9
    // intensity:  0.9
  }, {
    activityType: 'simulation',
    lowLoadFactor: 1.9,
    highLoadFactor: 2.1
    // intensity:  0.9
  }, {
    activityType: 'test',
    lowLoadFactor: 1,
    highLoadFactor: 1
    // intensity:  1.0
  }, {
    activityType: 'event1',
    // goal event
    // If we do not have estimated load for the event, we are basically guessing.
    // load factors are high to counteract the negative ramp rate used in race period.
    lowLoadFactor: 2.9,
    highLoadFactor: 3.1
    // intensity:  0.95
  }, {
    activityType: 'event2',
    // medium priority event
    lowLoadFactor: 1.9,
    highLoadFactor: 2.1
    // intensity:  0.95
  }, {
    activityType: 'event3',
    // low priority event
    lowLoadFactor: 1.9,
    highLoadFactor: 2.1
    // intensity:  0.95
  }, {
    activityType: 'event9',
    // off day
    lowLoadFactor: 0,
    highLoadFactor: 0
    // intensity:  0.0
  }
];

module.exports.loadRatingLookups = [
  {
    rating: 'rest',
    upperLoadFactor: 0.00,
  }, {
    rating: 'easy',
    upperLoadFactor: 0.60,
  }, {
    rating: 'moderate',
    upperLoadFactor: 1.20,
  }
];

