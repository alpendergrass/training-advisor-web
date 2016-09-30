'use strict';

module.exports = {};

//This is the minimum duration from season start to first goal event: 16 weeks.
//TODO: this should be until start of race period -> 15 weeks
module.exports.minimumNumberOfTrainingDays = 105;

//This is the maximum duration from season start to first goal event: 26 weeks.
//TODO: this should be until start of race period -> 25 weeks
module.exports.maximumNumberOfTrainingDays = 175;


//TODO: this should be until start of race period.
module.exports.basePortionOfTotalTrainingDays = 0.52;
module.exports.buildPortionOfTotalTrainingDays = 0.41;

//Friel says peak should be 1-2 weeks.
module.exports.minimumNumberOfPeakDays = 7;
module.exports.maximumNumberOfPeakDays = 14;

//Friel also says that race period should be 1-3 weeks.
module.exports.minimumNumberOfRaceDays = 7;
module.exports.maximumNumberOfRaceDays = 21;

module.exports.midSeasonTransitionNumberOfDays = 5;

module.exports.maxDaysToLookAheadForFutureGoals = module.exports.maximumNumberOfTrainingDays + module.exports.maximumNumberOfRaceDays;
module.exports.maxDaysToLookAheadForSeasonEnd = 366;

module.exports.TPAutoDownloadLookbackNumberOfDays = '3';

//Skip lesser event if within this many days of goal event.
//TODO: maybe just no 2/3 events in race period?
module.exports.priority2EventCutOffThreshold = 7;
module.exports.priority3EventCutOffThreshold = 11;

//If it has been this many days since FTP was updated, start nagging user to test.
module.exports.testingNagDayCount = 21;

//Form must be greater than this before we will recommend testing.
module.exports.testingEligibleFormThreshold = -7.5;

//If form is less than or equal to this, we recommend an easy day if...see code.
module.exports.easyDaytNeededThreshold = -10;

//If form is ever less than or equal to this, we recommend rest.
module.exports.restNeededThreshold = -25;

//If testing is due and form is less than or equal to this, we recommend rest.
module.exports.restNeededForTestingThreshold = -11;

//If form is less than or equal to this during peak period, we recommend rest.
//I made it one less than restNeededForTestingThreshold to get unit tests to work.
//If we find it needs to be greater then we may need to modify or remove a test.
module.exports.restNeededForPeakingThreshold = -16;

module.exports.restNeededForRacingThreshold = -12;

//We apply this factor to make the NP (weighted_average_watts) reported by Strava
//to more closely match Garmin/TP.
module.exports.stravaNPFudgeFactor = 1.055;

//This is the maximum amount by which we will tweak (+/-) load advice
//to try to bring actual ramp rate closer to target rate.
module.exports.rampRateAdjustmentLimit = 0.2;

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
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.9
  }, {
    activityType: 'simulation',
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.9
  }, {
    activityType: 'test',
    lowLoadFactor: 1,
    highLoadFactor: 1
    // intensity:  1.0
  }, {
    activityType: 'event1',
    //goal event
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.95
  }, {
    activityType: 'event2',
    //medium priority event
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.95
  }, {
    activityType: 'event3',
    //low priority event
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.95
  }, {
    activityType: 'event9',
    //off day
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

