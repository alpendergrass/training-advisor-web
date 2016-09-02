'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
  moment = require('moment'),
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

module.exports.determineEffectiveStartDate = function (dates) {
  //Determine effective start date
  
  var startDate = dates.nextGoalDate.clone(); //Will be modified or replaced below.

  //no prior goal event was found.
  //set it to the Unix Epoch.
  if (!dates.mostRecentGoalDate) {
    dates.mostRecentGoalDate = moment(0);
  }

  if (moment(dates.mostRecentGoalDate).isAfter(dates.startDate)) {
    //Next goal is a subsequent goal in current season 
    //or no start was set for current season
    //Default to minimum training duration.
    startDate.subtract(adviceConstants.minimumNumberOfTrainingDays, 'days');
  } else if (dates.nextGoalDate.diff(dates.startDate, 'days') < adviceConstants.minimumNumberOfTrainingDays) {
    //Computed training duration is shorter than the minimum.
    //Use minimum training duration.
    startDate.subtract(adviceConstants.minimumNumberOfTrainingDays, 'days');
  } else if (dates.nextGoalDate.diff(dates.startDate, 'days') > adviceConstants.maximumNumberOfTrainingDays) {
    //Computed training duration is longer than the maximum.
    //Use maximum training duration.
    startDate.subtract(adviceConstants.maximumNumberOfTrainingDays, 'days');
  } else {
    //Training duration using user-supplied start date is within minimum and maximum durations.
    startDate = dates.startDate.clone();
  }

  return startDate;
};

function determinePeriod(user, trainingDay, callback) {

  async.parallel(
    {
      startDate: function(callback) {
        dbUtil.getStartDay(user, trainingDay.date, function(err, startDay) {
          if (err) {
            return callback(err);
          }

          return callback(null, moment(startDay.date));
        });
      },
      nextGoalDate: function(callback) {
        dbUtil.getNextPriorityDay(user, trainingDay.date, 1, adviceConstants.maximumNumberOfTrainingDays, function(err, priorityDay) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDay) {
            return callback(null, moment(priorityDay.date));
          }

          return callback(null, null);
        });
      },
      nextPriority2Date: function(callback) {
        dbUtil.getNextPriorityDay(user, trainingDay.date, 2, adviceConstants.maximumNumberOfTrainingDays, function(err, priorityDay) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDay) {
            return callback(null, moment(priorityDay.date));
          }

          return callback(null, null);
        });
      },
      nextPriority3Date: function(callback) {
        dbUtil.getNextPriorityDay(user, trainingDay.date, 3, adviceConstants.maximumNumberOfTrainingDays, function(err, priorityDay) {
          if (err) {
            return callback(err, null);
          }

          if (priorityDay) {
            return callback(null, moment(priorityDay.date));
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
      //results is: {startDate: <date>, nextGoalDate: <date>, mostRecentGoalDate: <date>, ...}

      if (err) {
        return callback(err, null);
      }

      var trainingDate = moment(trainingDay.date), 
        startDate,
        totalTrainingDays,
        buildPeriodStart,
        peakPeriodStart,
        peakDaysDiff,
        periodData = {};

      if (results.nextGoalDate) {
        startDate = module.exports.determineEffectiveStartDate(results);
        //Determine how many days total between start and goal.
        periodData.totalTrainingDays = results.nextGoalDate.diff(startDate, 'days');

        //Compute starting day number for each period.
        periodData.basePeriodDays = Math.round(periodData.totalTrainingDays * adviceConstants.basePortionOfTotalTrainingDays);
        periodData.buildPeriodDays = Math.round(periodData.totalTrainingDays * adviceConstants.buildPortionOfTotalTrainingDays);
        periodData.peakPeriodDays = periodData.totalTrainingDays - (periodData.basePeriodDays + periodData.buildPeriodDays);

        //Adjust peak period duration by reallocating days from/to base and build periods if required.
        if (periodData.peakPeriodDays < adviceConstants.minimumNumberOfPeakDays) {
          peakDaysDiff = adviceConstants.minimumNumberOfPeakDays - periodData.peakPeriodDays;
          periodData.peakPeriodDays = adviceConstants.minimumNumberOfPeakDays;
          periodData.basePeriodDays = periodData.basePeriodDays - (Math.round(peakDaysDiff * adviceConstants.basePortionOfTotalTrainingDays));
          periodData.buildPeriodDays = periodData.buildPeriodDays - (Math.round(peakDaysDiff * adviceConstants.buildPortionOfTotalTrainingDays));
        }

        if (periodData.peakPeriodDays > adviceConstants.maximumNumberOfPeakDays) {
          peakDaysDiff = periodData.peakPeriodDays - adviceConstants.maximumNumberOfPeakDays;
          periodData.peakPeriodDays = adviceConstants.maximumNumberOfPeakDays;
          periodData.basePeriodDays = periodData.basePeriodDays + (Math.round(peakDaysDiff * adviceConstants.basePortionOfTotalTrainingDays));
          periodData.buildPeriodDays = periodData.buildPeriodDays + (Math.round(peakDaysDiff * adviceConstants.buildPortionOfTotalTrainingDays));
        }

        buildPeriodStart = periodData.basePeriodDays + 1;
        peakPeriodStart = periodData.basePeriodDays + periodData.buildPeriodDays + 1;

        //Determine how many days we are into training.
        periodData.trainingDayCount = moment(trainingDate).diff(startDate, 'days');

        //Assign period.
        if (periodData.trainingDayCount >= peakPeriodStart) {
          periodData.period = 'peak';
        } else if (periodData.trainingDayCount >= buildPeriodStart) {
          periodData.period = 'build';
        } else {
          periodData.period = 'base';
        }

        periodData.daysUntilNextGoalEvent = results.nextGoalDate.diff(trainingDate, 'days');
      } else {
        //no next goal 
        periodData.period = 'transition';
        periodData.totalTrainingDays = 0;
        periodData.basePeriodDays = 0;
        periodData.buildPeriodDays = 0;
        periodData.peakPeriodDays = 0;
        periodData.daysUntilNextGoalEvent = 0;
      }

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

      return callback(null, periodData);
    }
  );
}
