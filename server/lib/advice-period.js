'use strict';


var path = require('path'),
  moment = require('moment'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceConstants = require('./advice-constants'),
  err;

module.exports = {};

module.exports.getPeriod = function(user, trainingDay, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  determinePeriod(user, trainingDay, function(err, periodData) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, periodData);
  });
};

function determinePeriod(user, trainingDay, callback) {
  async.parallel(
    {
      startDate: function(callback) {
        dbUtil.getStartDay(user, trainingDay.date, function(err, startDay) {
          if (err) {
            return callback(err);
          }

          if (startDay) {
            return callback(null, moment(startDay.date));
          }

          err = new TypeError('Starting date for current training period was not found.');
          return callback(err, null);
        });
      },
      futureGoalDays: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.date, 1, adviceConstants.maxDaysToLookAheadForFutureGoals, function(err, priorityDays) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDays.length > 0) {
            return callback(null, priorityDays);
          }

          return callback(null, null);
        });
      },
      nextPriority2Date: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.date, 2, adviceConstants.maxDaysToLookAheadForFutureGoals, function(err, priorityDays) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDays.length > 0) {
            return callback(null, moment(priorityDays[0].date));
          }

          return callback(null, null);
        });
      },
      nextPriority3Date: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.date, 3, adviceConstants.maxDaysToLookAheadForFutureGoals, function(err, priorityDays) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDays.length > 0) {
            return callback(null, moment(priorityDays[0].date));
          }

          return callback(null, null);
        });
      },
      mostRecentGoalDate: function(callback) {
        dbUtil.getMostRecentGoalDay(user, trainingDay.date, function(err, goalDay) {
          if (err) {
            return callback(err, null);
          }
          if (goalDay) {
            return callback(null, moment(goalDay.date));
          }

          return callback(null, null);
        });
      }
    },
    function(err, results) {
      //results is: {startDate: <date>, mostRecentGoalDate: <date>, ...}
      if (err) {
        return callback(err, null);
      }

      var trainingDate = moment(trainingDay.date),
        startDate,
        firstGoalDateInRacePeriod,
        totalTrainingDays,
        buildPeriodStart,
        peakPeriodStart,
        racePeriodStart,
        daysDiff,
        basePeriodAdjustment,
        lastRaceSearchDate,
        lastRace,
        periodData = {};

      if (results.nextPriority2Date) {
        periodData.daysUntilNextPriority2Event = results.nextPriority2Date.diff(trainingDate, 'days');
      } else {
        periodData.daysUntilNextPriority2Event = 0;
      }

      if (results.nextPriority3Date) {
        periodData.daysUntilNextPriority3Event = results.nextPriority3Date.diff(trainingDate, 'days');
      } else {
        periodData.daysUntilNextPriority3Event = 0;
      }

      if (!results.futureGoalDays) {
        //no next goal
        periodData.period = 'transition';
        periodData.totalTrainingDays = 0;
        periodData.basePeriodDays = 0;
        periodData.buildPeriodDays = 0;
        periodData.peakPeriodDays = 0;
        periodData.racePeriodDays = 0;
        periodData.daysUntilNextGoalEvent = 0;
        return callback(null, periodData);
      }

      dbUtil.getPriorPriorityDays(user, results.futureGoalDays[0].date, 1, adviceConstants.maximumNumberOfRaceDays, function(err, priorGoalDays) {
        if (err) {
          return callback(err, null);
        }

        if (priorGoalDays.length > 0) {
          firstGoalDateInRacePeriod = moment(priorGoalDays[0].date);
        } else {
          firstGoalDateInRacePeriod = moment(results.futureGoalDays[0].date);
        }
        results.endOfTrainingPeriod = moment(firstGoalDateInRacePeriod).subtract(7, 'days');

        determineEffectiveStartDate(results, function(err, startDate) {
          if (err) {
            return callback(err, null);
          }

          //Determine how many days total between start and goal. Add one to make it inclusive.
          periodData.totalTrainingDays = results.endOfTrainingPeriod.diff(startDate, 'days'); // + 1;

          //Compute number of days for each period.
          periodData.basePeriodDays = Math.round(periodData.totalTrainingDays * adviceConstants.basePortionOfTotalTrainingDays);
          periodData.buildPeriodDays = Math.round(periodData.totalTrainingDays * adviceConstants.buildPortionOfTotalTrainingDays);
          periodData.peakPeriodDays = periodData.totalTrainingDays - (periodData.basePeriodDays + periodData.buildPeriodDays);

          //Adjust peak period duration by reallocating days from/to base and build periods if required.
          if (periodData.peakPeriodDays < adviceConstants.minimumNumberOfPeakDays) {
            daysDiff = adviceConstants.minimumNumberOfPeakDays - periodData.peakPeriodDays;
            periodData.peakPeriodDays = adviceConstants.minimumNumberOfPeakDays;
            basePeriodAdjustment = (Math.round(daysDiff * adviceConstants.basePortionOfTotalTrainingDays));
            periodData.basePeriodDays = periodData.basePeriodDays - basePeriodAdjustment;
            periodData.buildPeriodDays = periodData.buildPeriodDays - (daysDiff - basePeriodAdjustment);
          } else if (periodData.peakPeriodDays > adviceConstants.maximumNumberOfPeakDays) {
            daysDiff = periodData.peakPeriodDays - adviceConstants.maximumNumberOfPeakDays;
            periodData.peakPeriodDays = adviceConstants.maximumNumberOfPeakDays;
            periodData.basePeriodDays = periodData.basePeriodDays + (Math.round(daysDiff * adviceConstants.basePortionOfTotalTrainingDays));
            periodData.buildPeriodDays = periodData.buildPeriodDays + (Math.round(daysDiff * adviceConstants.buildPortionOfTotalTrainingDays));
          }

          //Use last goal date within maximumNumberOfRaceDays of start of race period to define number of race days, with min of minimumNumberOfRaceDays
          lastRaceSearchDate = moment(results.endOfTrainingPeriod).add(adviceConstants.maximumNumberOfRaceDays, 'days');
          lastRace = _.findLast(results.futureGoalDays, function(goalDay) {
            return moment(goalDay.date).isSameOrBefore(lastRaceSearchDate, 'day');
          });

          if (lastRace) {
            periodData.racePeriodDays = moment(lastRace.date).diff(results.endOfTrainingPeriod, 'days');
            if (periodData.racePeriodDays < adviceConstants.minimumNumberOfRaceDays) {
              periodData.racePeriodDays = adviceConstants.minimumNumberOfRaceDays;
            }
          } else {
            //We should never get here, should always be at least one future goal. I think.
            periodData.racePeriodDays = adviceConstants.minimumNumberOfRaceDays;
          }

          //Compute starting day count for each period. Let's make it obvious.
          buildPeriodStart = periodData.basePeriodDays + 1;
          peakPeriodStart = periodData.basePeriodDays + periodData.buildPeriodDays + 1;
          racePeriodStart = periodData.basePeriodDays + periodData.buildPeriodDays + periodData.peakPeriodDays + 1;

          //Determine how many days we are into training.
          periodData.currentDayCount = trainingDate.diff(startDate, 'days');

          //Assign period.
          if (periodData.currentDayCount >= racePeriodStart) {
            periodData.period = 'race';
          } else if (periodData.currentDayCount >= peakPeriodStart) {
            periodData.period = 'peak';
          } else if (periodData.currentDayCount >= buildPeriodStart) {
            periodData.period = 'build';
          } else {
            periodData.period = 'base';
          }

          //If base or build and last goal was less than midSeasonTransitionNumberOfDays ago, reset period to transition.
          if (periodData.period === 'base' || periodData.period === 'build') {
            if (trainingDate.diff(results.mostRecentGoalDate, 'days') <= adviceConstants.midSeasonTransitionNumberOfDays) {
              periodData.period = 'transition';
            }
          }

          periodData.daysUntilNextGoalEvent = moment(results.futureGoalDays[0].date).diff(trainingDate, 'days');

          return callback(null, periodData);
        });
      });
    }
  );
}

function determineEffectiveStartDate(dates, callback) {
  //TODO: we should compute the start of the season based on the date of the first goal in the current
  //race period. Except that we will not know race period until after we set start date.
  //We should look to see if there were any goals within maximumNumberOfRaceDays before next goal.
  //If so we should use the date of the first within that period.
  // var firstGoalDateInRacePeriod;

  // dbUtil.getPriorPriorityDays(user, dates.nextGoalDate, 1, adviceConstants.maximumNumberOfRaceDays, function(err, priorityDays) {
  //   if (err) {
  //     return callback(err, null);
  //   }

  //   if (priorityDays.length > 0) {
  //     firstGoalDateInRacePeriod = moment(priorityDays[0].date);
  //   } else {
  //     firstGoalDateInRacePeriod = dates.nextGoalDate;
  //   }

    // if (!dates.mostRecentGoalDate) {
    //   //no prior goal event was found.
    //   //set it to the Unix Epoch.
    //   dates.mostRecentGoalDate = moment(0);
    // }

  var effectiveStartDate = dates.endOfTrainingPeriod.clone(); //Will be modified or replaced below.

  // if (moment(dates.mostRecentGoalDate).isAfter(dates.startDate)) {
  //   //First season goal has already occurred.
  //   //Next goal is a subsequent goal in current season
  //   //or no start was set for current season
  //   //Default to minimum training duration.
  //   //TODO: maybe we do not need this if condition if we use "firstGoalDateInRacePeriod"
  //   effectiveStartDate.subtract(adviceConstants.minimumNumberOfTrainingDays, 'days');
  // } else
  if (dates.endOfTrainingPeriod.diff(dates.startDate, 'days') < adviceConstants.minimumNumberOfTrainingDays) {
    //Computed training duration is shorter than the minimum.
    //Use minimum training duration.
    effectiveStartDate.subtract(adviceConstants.minimumNumberOfTrainingDays, 'days');
  } else if (dates.endOfTrainingPeriod.diff(dates.startDate, 'days') > adviceConstants.maximumNumberOfTrainingDays) {
    //Computed training duration is longer than the maximum.
    //Use maximum training duration.
    effectiveStartDate.subtract(adviceConstants.maximumNumberOfTrainingDays, 'days');
  } else {
    //Training duration using user-supplied start date is within minimum and maximum durations.
    effectiveStartDate = dates.startDate.clone();
  }

  return callback(null, effectiveStartDate);
  // });
}
