'use strict';

var moment = require('moment-timezone'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  err;
require('lodash-migrate');

mongoose.Promise = global.Promise;

module.exports = {};

module.exports.getTrainingDayDocument = function(user, trainingDate, callback) {
  //If requested training day does not exist it will be created and returned.
  //This should be the only place in the app where a new training day is created from scratch.
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  getTrainingDaysForDate(user, trainingDate, function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    }

    if (trainingDays.length < 1) {
      var newTrainingDay = new TrainingDay();
      newTrainingDay.date = moment(trainingDate).toDate();
      newTrainingDay.user = user;
      newTrainingDay.save(function(err, trainingDay) {
        if (err) {
          return callback(err, null);
        }

        return callback(null, trainingDay);
      });
    } else {
      if (trainingDays.length > 1) {
        err = new RangeError('Multiple trainingDay documents returned for date ' + moment(trainingDate).toDate());
        return callback(err, null);

      }
      return callback(null, trainingDays[0]);
    }
  });
};

module.exports.getExistingTrainingDayDocument = function(user, trainingDate, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  getTrainingDaysForDate(user, trainingDate, function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    }

    if (trainingDays.length < 1) {
      return callback(null, null);
    }

    if (trainingDays.length > 1) {
      err = new RangeError('Multiple trainingDay documents returned for date ' + moment(trainingDate).toDate());
      return callback(err, null);
    }

    return callback(null, trainingDays[0]);
  });
};

module.exports.getTrainingDays = function(user, startDate, endDate, callback) {
  //Will return a trainingDay doc for each day between startDate and endDate inclusive.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(startDate).isValid()) {
    err = new TypeError('getTrainingDays startDate ' + startDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!moment(endDate).isValid()) {
    err = new TypeError('getTrainingDays endDate ' + endDate + ' is not a valid date');
    return callback(err, null);
  }

  var trainingDays = [],
    // currentNumeric = toNumericDate(startDate),
    // endNumeric = toNumericDate(endDate),
    currentDate = moment(startDate),
    timezone = user.timezone || 'America/Denver';
  // console.log('endDate: ', endDate);

  async.whilst(
    function() {
      // currentNumeric = toNumericDate(currentDate);
      return currentDate.isSameOrBefore(endDate);
      // return currentNumeric <= endNumeric;
    },
    function(callback) {
      module.exports.getTrainingDayDocument(user, currentDate.toDate(), function(err, trainingDay) {
        if (err) {
          console.log('err: ', err);
          return callback(err, null);
        }
        trainingDays.push(trainingDay);
        currentDate = moment.tz(currentDate, timezone).add(1, 'day');
        callback(null, trainingDay);
      });
    },
    function (err, lastDay) {
      if (err) {
        return callback(err, null);
      }
      return callback(null, trainingDays);
    }
  );
};

module.exports.getStartDay = function(user, searchDate, callback) {
  //select most recent starting trainingDay.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate);

  if (!trainingDate.isValid()) {
    err = new TypeError('searchDate ' + searchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    startingPoint: true,
    date: { $lte: trainingDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ date: -1 }).limit(1)
  .exec(function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    }

    if (trainingDays.length === 0) {
      return callback(null, null);
    }

    return callback(null, trainingDays[0]);
  });
};

module.exports.getFuturePriorityDays = function(user, searchDate, priority, numberOfDaysOut, callback) {
  //select priority n trainingDays after searchDate. Include searchDate
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate),
    maxDate = moment(searchDate).add(numberOfDaysOut, 'days');

  if (!trainingDate.isValid()) {
    err = new TypeError('searchDate ' + searchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    scheduledEventRanking: priority,
    date: { $gte: trainingDate, $lte: maxDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ date: 1 })
  .exec(function(err, priorityDays) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, priorityDays);
  });
};

module.exports.getPriorPriorityDays = function(user, searchDate, priority, numberOfDaysBack, callback) {
  //select priority n trainingDays before searchDate.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate),
    timezone = user.timezone || 'America/Denver',
    minDate = moment.tz(searchDate, timezone).subtract(numberOfDaysBack, 'days');
    // minDate = moment(searchDate).subtract(numberOfDaysBack, 'days');

  if (!trainingDate.isValid()) {
    err = new TypeError('searchDate ' + searchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    scheduledEventRanking: priority,
    date: { $lt: trainingDate, $gte: minDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ date: 1 })
  .exec(function(err, priorityDays) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, priorityDays);
  });
};

module.exports.getMostRecentGoalDay = function(user, searchDate, callback) {
  //select most recent goal trainingDay before today.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate);

  if (!trainingDate.isValid()) {
    err = new TypeError('searchDate ' + searchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    scheduledEventRanking: 1,
    date: { $lt: trainingDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ date: -1 }).limit(1)
  .exec(function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    }

    if (trainingDays.length === 0) {
      return callback(null, null);
    }

    return callback(null, trainingDays[0]);
  });
};

module.exports.clearFutureMetricsAndAdvice = function(user, trainingDate, callback) {
  //Only clear thru tomorrow. We don't want to wipe out our plan.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(trainingDate).isValid()) {
    err = new TypeError('trainingDate ' + trainingDate + ' is not a valid date');
    return callback(err, null);
  }

  var start,
    timezone = user.timezone || 'America/Denver',
    tomorrow;

  // If trainingDate is tomorrow (in user's timezone) or later, we do not want to do anything.
  // Normally this should never happen but let's make sure.
  tomorrow = moment().tz(timezone).add(1, 'day').startOf('day');
  start = moment.tz(trainingDate, timezone).add(1, 'day');
  // start = moment(trainingDate).add(1, 'day');

  if (start.isAfter(tomorrow)) {
    return callback(null, null);
  }

  TrainingDay.update({
    user: user,
    date: { $gte: start, $lte: tomorrow },
    fitnessAndFatigueTrueUp: false,
    startingPoint: false,
    cloneOfId: null
  }, {
    $set: {
      fitness: 0,
      fatigue: 0,
      form: 0,
      sevenDayRampRate: 0,
      sevenDayTargetRampRate: 0,
      dailyTargetRampRate: 0,
      rampRateAdjustmentFactor: 1,
      targetAvgDailyLoad: 0,
      loadRating: '',
      plannedActivities: []
    }
  }, {
    multi: true
  }, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, rawResponse);
  });
};

module.exports.makeSimDay = function(trainingDay, callback) {
  var cloneTD = new TrainingDay(trainingDay);
  cloneTD.isNew = true;
  cloneTD._id = mongoose.Types.ObjectId();
  cloneTD.cloneOfId = trainingDay._id;
  cloneTD.isSimDay = false;

  cloneTD.save(function(err) {
    if (err) {
      return callback(err, null);
    }

    trainingDay.isSimDay = true;
    trainingDay.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, trainingDay);
    });
  });
};

module.exports.commitSimulation = function(user, callback) {
  //Make sim days permanent and delete clones of originals.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  TrainingDay.update({
    user: user,
    isSimDay: true
  }, {
    $set: {
      isSimDay: false
    }
  }, {
    multi: true
  }, function(err, rawResponse) {
    if (err) {
      return callback(err);
    }

    TrainingDay.remove({
      user: user,
      cloneOfId: { $ne : null }
    }, function(err) {
      if (err) {
        return callback(err);
      }

      return callback(null);
    });
  });
};

module.exports.revertSimulation = function(user, callback) {
  // Remove sim days and restore the backups.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  TrainingDay.update({
    user: user,
    cloneOfId: { $ne : null }
  }, {
    $set: {
      cloneOfId: null
    }
  }, {
    multi: true
  }, function(err, rawResponse) {
    if (err) {
      return callback(err);
    }

    TrainingDay.remove({
      user: user,
      isSimDay: true
    }, function(err) {
      if (err) {
        return callback(err);
      }

      return callback(null);
    });
  });
};

module.exports.clearPlanningData = function(user, trainingDate) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('valid user is required');
      return reject(err);
    }

    if (!moment(trainingDate).isValid()) {
      err = new TypeError('trainingDate ' + trainingDate + ' is not a valid date');
      return reject(err);
    }

    TrainingDay.update({
      user: user,
      date: { $gte: moment(trainingDate) },
      cloneOfId: null
    }, {
      $set: { loadRating: '', },
      $pull: { completedActivities: { source: 'plangeneration' } }
    }, {
      multi: true
    }, function(err, rawResponse) {
      if (err) {
        return reject(err);
      }

      return resolve(rawResponse);
    });
  });
};

module.exports.removePlanningActivities = function(user, callback) {
  //plangeneration CompletedActivities are activities used to generate a plan.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  TrainingDay.update({
    user: user
  }, {
    $pull: { completedActivities: { source: 'plangeneration' } }
  }, {
    multi: true
  }, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, rawResponse);
  });
};

module.exports.didWeGoHardTheDayBefore = function(user, searchDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var timezone = user.timezone || 'America/Denver',
    start = moment.tz(searchDate, timezone).subtract(1, 'day'),
    // start = moment(searchDate).subtract(1, 'day'),
    end = moment(searchDate);

  // We need to check for the existence of completedActivities below
  // as the loadRating could be from a genPlan where the completedActivities
  // were generated then removed.
  var query = TrainingDay
    .where('user').equals(user)
    .where('cloneOfId').equals(null)
    .where('date').gte(start).lte(end)
    .where('completedActivities').ne([])
    .where('loadRating').in(['simulation', 'hard']);

  query.findOne().exec(function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    if (!trainingDay) {
      return callback(null, false);
    }
    return callback(null, true);
  });
};

// module.exports.sendMessageToUser = function (message, user) {
//   var socketIDlookup = _.find(global.userSocketIDs, function(sock) {
//     return sock.username === user.username;
//   });

//   if (socketIDlookup) {
//     console.log('Emitting trainingDayMessage "' + message.text + '" to ' + user.username + ' on socketID ' + socketIDlookup.socketID);
//     global.io.to(socketIDlookup.socketID).emit('trainingDayMessage', message);
//   } else {
//     console.log('socketIDlookup failed for username ' + user.username);
//   }
// };

function getTrainingDaysForDate(user, trainingDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var searchDate = moment(trainingDate),
    searchDateNumeric,
    end,
    timezone = user.timezone || 'America/Denver';

  if (!moment(searchDate).isValid()) {
    err = new TypeError('trainingDate ' + trainingDate + ' is not a valid date');
    return callback(err, null);
  }

  //We are assuming that our searchDate is midnight local (browser) time.
  //We add 1 day to the time to get the end of our search span.
  //(Note that originally we added 24 hours which broke on days that DST started or ended.)
  //Mongo stores times in GMT so our search start and end date should
  //likewise be converted to GMT for the query below.

  //In general our convention for date handling it to always use dates with time
  //set to midnight local (browser) time. On the server we do not have to worry
  //about server local time.

  //We were getting tripped up as the date coming in from the browser was
  //in GMT like so: 2016-06-20T06:00:00.000Z. When we parsed this date
  //when running on my server here (which is in mountain time zone) it
  //produced a searchDate like: Mon Jun 20 2016 00:00:00 GMT-0600 (MDT)
  //which worked fine with the query I was using originally using startOf day and
  //endOf day.
  //But when this code ran on the Bluemix server, with time set to GMT,
  //trainingDate of 2016-06-20T06:00:00.000Z was being parsed to
  //Mon Jun 20 2016 06:00:00 GMT+0000 (UTC). Applying startOf to
  //this GMT date resulted in midnight GMT on June 19 6PM in browser local time. The
  //end date was also off by 6 hours.

  end = moment.tz(searchDate, timezone).add(1, 'day');

  var query = TrainingDay
    .where('user').equals(user)
    .where('date').gte(searchDate).lt(end)
    .where('cloneOfId').equals(null);

  //No longer using dates in query. Using dateNumeric which is an integer derived from 'YYYYMMDD'.
  //This is a step in simplifying date queries by removing the time component.

  // searchDateNumeric = toNumericDate(searchDate);

  // var query = TrainingDay
  //   .where('user').equals(user)
  //   .where('dateNumeric').equals(searchDateNumeric)
  //   .where('cloneOfId').equals(null);

  query.find().populate('user').exec(function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, trainingDays);
  });
}

function toNumericDate(date) {
  var dateString = moment(date).format('YYYYMMDD');
  return parseInt(dateString, 10);
}
