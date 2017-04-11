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
      numericStartDate: function(callback) {
        dbUtil.getStartDay(user, trainingDay.dateNumeric, function(err, startDay) {
          if (err) {
            return callback(err);
          }

          if (startDay) {
            return callback(null, startDay.dateNumeric);
          }

          // Note that UI logic is tied to the following error message string.
          err = new TypeError('Starting date for current training period was not found.');
          return callback(err, null);
        });
      },
      futureGoalDays: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.dateNumeric, 1, adviceConstants.maxDaysToLookAheadForFutureGoals)
          .then(function(priorityDays) {
            if (priorityDays.length > 0) {
              return callback(null, priorityDays);
            }

            return callback(null, null);
          })
          .catch(function(err) {
            return callback(err, null);
          });
      },
      numericNextPriority2Date: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.dateNumeric, 2, adviceConstants.maxDaysToLookAheadForFutureGoals)
          .then(function(priorityDays) {
            if (priorityDays.length > 0) {
              return callback(null, priorityDays[0].dateNumeric);
            }

            return callback(null, null);
          })
          .catch(function(err) {
            return callback(err, null);
          });
      },
      numericNextPriority3Date: function(callback) {
        dbUtil.getFuturePriorityDays(user, trainingDay.dateNumeric, 3, adviceConstants.maxDaysToLookAheadForFutureGoals)
          .then(function(priorityDays) {
            if (priorityDays.length > 0) {
              return callback(null, priorityDays[0].dateNumeric);
            }

            return callback(null, null);
          })
          .catch(function(err) {
            return callback(err, null);
          });
      },
      numericMostRecentGoalDate: function(callback) {
        dbUtil.getMostRecentGoalDay(user, trainingDay.dateNumeric, function(err, goalDay) {
          if (err) {
            return callback(err, null);
          }
          if (goalDay) {
            return callback(null, goalDay.dateNumeric);
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

      var trainingDate = moment(trainingDay.dateNumeric.toString()),
        startDate,
        firstGoalDateInRacePeriod,
        totalTrainingDays,
        racePeriodStart,
        daysDiff,
        basePeriodAdjustment,
        lastRaceSearchDate,
        lastRace,
        periodData = {};

      if (results.numericNextPriority2Date) {
        periodData.daysUntilNextPriority2Event = moment(results.numericNextPriority2Date.toString()).diff(trainingDate, 'days');
      } else {
        periodData.daysUntilNextPriority2Event = 0;
      }

      if (results.numericNextPriority3Date) {
        periodData.daysUntilNextPriority3Event = moment(results.numericNextPriority3Date.toString()).diff(trainingDate, 'days');
      } else {
        periodData.daysUntilNextPriority3Event = 0;
      }

      if (!results.futureGoalDays) {
        //no next goal
        periodData.period = 't0';
        periodData.totalTrainingDays = 0;
        periodData.daysUntilNextGoalEvent = 0;
        return callback(null, periodData);
      }

      dbUtil.getPriorPriorityDays(user, results.futureGoalDays[0].dateNumeric, 1, adviceConstants.maximumNumberOfRaceDays, function(err, priorGoalDays) {
        if (err) {
          return callback(err, null);
        }

        if (priorGoalDays.length > 0) {
          firstGoalDateInRacePeriod = moment(priorGoalDays[0].dateNumeric.toString());
        } else {
          firstGoalDateInRacePeriod = moment(results.futureGoalDays[0].dateNumeric.toString());
        }

        results.endOfTrainingPeriod = moment(firstGoalDateInRacePeriod).subtract(7, 'days');

        determineEffectiveStartDate(results, function(err, startDate) {
          if (err) {
            return callback(err, null);
          }

          //Determine how many days total between start and beginning of race period.
          periodData.totalTrainingDays = results.endOfTrainingPeriod.diff(startDate, 'days');

          //Determine how many days we are into training.
          racePeriodStart = periodData.totalTrainingDays + 1;
          periodData.currentDayCount = trainingDate.diff(startDate, 'days');

          //Assign period.
          if (moment(trainingDate).isBefore(startDate)) {
            periodData.period = 't0';
          } else {
            if (periodData.currentDayCount >= racePeriodStart) {
              periodData.period = 'race';
            } else {
              periodData.period = assignTrainingPeriod(periodData.totalTrainingDays, periodData.currentDayCount);
            }
          }

          //If we are in a training period and last goal was less than midSeasonTransitionNumberOfDays ago, reset period to transition.
          if (_.includes(['t1', 't2', 't3', 't4', 't5' ], periodData.period)) {
            if (results.numericMostRecentGoalDate && trainingDate.diff(results.numericMostRecentGoalDate.toString(), 'days') <= adviceConstants.midSeasonTransitionNumberOfDays) {
              periodData.period = 't0';
            }
          }

          periodData.daysUntilNextGoalEvent = moment(results.futureGoalDays[0].dateNumeric.toString()).diff(trainingDate, 'days');

          return callback(null, periodData);
        });
      });
    }
  );
}

function assignTrainingPeriod(totalTrainingDays, currentDayCount) {
  let percentageOfTrainingTimeRemaining = (totalTrainingDays - currentDayCount) / totalTrainingDays;

  let periodEntry = _.find(adviceConstants.trainingPeriodLookups, function(lookup) {
    return (percentageOfTrainingTimeRemaining <= lookup.start && percentageOfTrainingTimeRemaining >= lookup.end);
  });

  return periodEntry.period;
}

function determineEffectiveStartDate(dates, callback) {
  var effectiveStartDate = dates.endOfTrainingPeriod.clone(); //Will be modified or replaced below.

  if (dates.endOfTrainingPeriod.diff(dates.numericStartDate.toString(), 'days') < adviceConstants.minimumNumberOfTrainingDays) {
    //Computed training duration is shorter than the minimum.
    //Use minimum training duration.
    effectiveStartDate.subtract(adviceConstants.minimumNumberOfTrainingDays, 'days');
  } else if (dates.endOfTrainingPeriod.diff(dates.numericStartDate.toString(), 'days') > adviceConstants.maximumNumberOfTrainingDays) {
    //Computed training duration is longer than the maximum.
    //Use maximum training duration.
    effectiveStartDate.subtract(adviceConstants.maximumNumberOfTrainingDays, 'days');
  } else {
    //Training duration using user-supplied start date is within minimum and maximum durations.
    effectiveStartDate = moment(dates.numericStartDate.toString());
    // effectiveStartDate = dates.startDate.clone();
  }

  return callback(null, effectiveStartDate);
}
