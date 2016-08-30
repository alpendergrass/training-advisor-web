'use strict';

var moment = require('moment'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  err;

module.exports = {};

module.exports.getTrainingDayDocument = function(user, trainingDate, callback) {
  //If requested training day does not exist it will be created and returned.
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  getTrainingDaysForDate(user, trainingDate, function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    } 
    
    if (trainingDays.length < 1) {
      var newTrainingDay = {};
      var newDate = moment(trainingDate).toDate();
      newTrainingDay.date = newDate;
      newTrainingDay.user = user;
      TrainingDay.create(newTrainingDay, function(err, trainingDay) {
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
  //Will return a trainingDay doc for each day betwen startDate and endDate inclusive.
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
    current = moment(startDate).startOf('day'),
    end = moment(endDate).endOf('day');

  async.whilst(
    function() { 
      return current.isSameOrBefore(end); 
    },
    function(callback) {
      module.exports.getTrainingDayDocument(user, current.toDate(), function(err, trainingDay) {
        if (err) {
          return callback(err, null);
        }

        trainingDays.push(trainingDay);
        callback(null, current.add('1', 'day'));
      });
    },
    function (err, lastDay) {
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

  var query = {
    user: user,
    startingPoint: true,
    date: { $lte: trainingDate }
  };

  TrainingDay.find(query).sort({ date: -1 }).limit(1)
  .exec(function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    } else if (trainingDays.length === 0) {
      return callback(new Error('Starting date for current training period was not found.'), null);
    } 
    
    return callback(null, trainingDays[0]);
  });
};

module.exports.getNextPriorityDay = function(user, searchDate, priority, numberOfDays, callback) {
  //select next priority n trainingDay.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate),
    //TODO: shouldn't we be adding numberOfDays to our start date?
    maxDate = moment(searchDate).add(numberOfDays, 'days'); 

  var query = {
    user: user,
    eventPriority: priority,
    date: { $gt: trainingDate, $lte: maxDate }
  };

  TrainingDay.find(query).sort({ date: 1 }).limit(1)
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

module.exports.getMostRecentGoalDay = function(user, searchDate, callback) {
  //select most recent goal trainingDay before today.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var trainingDate = moment(searchDate); 

  var query = {
    user: user,
    eventPriority: 1,
    date: { $lt: trainingDate }
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

module.exports.clearFutureMetricsAndAdvice = function(user, startDate, callback) {
  var start;

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(startDate).isValid()) {
    err = new TypeError('startDate ' + startDate + ' is not a valid date');
    return callback(err, null);
  }

  start = moment(startDate).add('1', 'day');

  TrainingDay.update({ 
    user: user,
    date: { $gte: start },
    fitnessAndFatigueTrueUp: false,
    startingPoint: false
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

module.exports.removeFutureCompletedActivities = function(user, startDate, callback) {
  //Future CompletedActivities are activities used to generate a plan.
  //We likely just generated a plan.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var start = moment(startDate);

  if (!moment(start).isValid()) {
    err = new TypeError('startDate ' + startDate + ' is not a valid date');
    return callback(err, null);
  }

  TrainingDay.update({ 
    user: user,
    date: { $gte: start.toDate() }
  }, { 
    $set: { 
      completedActivities: []
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

module.exports.didWeGoHardTheDayBefore = function(user, searchDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var yesterday = moment(searchDate).subtract(1, 'day');
  var start = moment(yesterday).startOf('day');
  var end = moment(yesterday).endOf('day');
  var query = TrainingDay
    .where('user').equals(user)
    .where('date').gte(start).lte(end)
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

module.exports.sendMessageToUser = function (message, user) {
  var socketIDlookup = _.find(global.userSocketIDs, function(sock) {
    return sock.username === user.username;
  });

  if (socketIDlookup) {
    console.log('Emitting trainingDayMessage "' + message.text + '" to ' + user.username + ' on socketID: ' + socketIDlookup.socketID);
    global.io.to(socketIDlookup.socketID).emit('trainingDayMessage', message);
  } else {
    console.log('socketIDlookup failed for username ' + user.username);
  }
};

function getTrainingDaysForDate(user, trainingDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var searchDate = moment(trainingDate);

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

  var end = moment(searchDate).add('1', 'day'); //.endOf('day');

  var query = TrainingDay
    .where('user').equals(user)
    .where('date').gte(searchDate).lt(end);

  query.find().populate('user').exec(function(err, trainingDays) {
    if (err) {
      return callback(err, null);
    } 
    
    return callback(null, trainingDays);
  });
}
