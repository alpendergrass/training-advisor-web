'use strict';

module.exports = {};

//This is the minimum duration from season start to first goal event: 16 weeks.
module.exports.minimumNumberOfTrainingDays = 112;

//This is the maximum duration from season start to first goal event: 26 weeks.
module.exports.maximumNumberOfTrainingDays = 182;

//This is how far out we will look when considering the current season.
module.exports.maximumNumberOfDaysToLookAhead = 182;

//These should include goal event, i.e., includes first week of race period.
//with base + build portion = 86% and minimumNumberOfTrainingDays of 112, computed peak period is 16 days.
//with maximumNumberOfTrainingDays of 182, is 25 days.
//Friel says peak should be 1-2 weeks. Add a week for the race and we get 21 days.
module.exports.minimumNumberOfPeakDays = 14; 
module.exports.maximumNumberOfPeakDays = 21; 

module.exports.TPAutoDownloadLookbackNumberOfDays = '3';

//Skip lesser event if within this many days of goal event.
module.exports.priority2EventCutOffThreshold = 5; 
module.exports.priority3EventCutOffThreshold = 7; 

module.exports.basePortionOfTotalTrainingDays = 0.48;
module.exports.buildPortionOfTotalTrainingDays = 0.38;

//If it has been this many days since FTP was updated, start nagging user to test.
module.exports.testingNagDayCount = 21;

//Form must be greater than this before we will recommend testing.
module.exports.testingEligibleFormThreshold = -7.5;

//If form is less than or equal to this, we recommend an easy day if...see code.
module.exports.easyDaytNeededThreshold = -10;

//If form is ever less than or equal to this, we recommend rest.
module.exports.restNeededThreshold = -30;

//If form is less than or equal to this during peak period, we recommend rest.
//I made it one less than restNeededForTestingThreshold to get unit tests to work. 
//If we find it needs to be greater then we may need to modify or remove a test.
module.exports.restNeededForPeakingThreshold = -21;

//If testing is due and form is less than or equal to this, we recommend rest.
module.exports.restNeededForTestingThreshold = -20;

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
    lowLoadFactor: 0.3,
    highLoadFactor: 1.9
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
    activityType: 'goal',
    lowLoadFactor: 1.4,
    highLoadFactor: 1.9
    // intensity:  0.95
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

