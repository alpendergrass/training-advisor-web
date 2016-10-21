'use strict';

var moment = require('moment'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  err;
require('lodash-migrate');

mongoose.Promise = global.Promise;

function getTrainingDay(user, numericDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericDate.toString()).isValid()) {
    err = new TypeError('numericDate ' + numericDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = TrainingDay
    .where('user').equals(user)
    .where('dateNumeric').equals(numericDate)
    .where('cloneOfId').equals(null);

  query.findOne().populate('user').exec(function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
}

function toNumericDate(date) {
  var dateString = moment(date).format('YYYYMMDD');
  return parseInt(dateString, 10);
}

module.exports = {};

module.exports.toNumericDate = toNumericDate;

module.exports.getTrainingDayDocument = function(user, numericDate, callback) {
  //If requested training day does not exist it will be created and returned.
  //This should be the only place in the app where a new training day is created from scratch.
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  getTrainingDay(user, numericDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    if (!trainingDay) {
      var newTrainingDay = new TrainingDay();
      newTrainingDay.dateNumeric = numericDate;
      newTrainingDay.date = moment(numericDate.toString()).toDate();
      newTrainingDay.user = user;
      newTrainingDay.save(function(err, createdTrainingDay) {
        if (err) {
          return callback(err, null);
        }

        return callback(null, createdTrainingDay);
      });
    } else {
      return callback(null, trainingDay);
    }
  });
};

module.exports.getExistingTrainingDayDocument = function(user, numericDate, callback) {
  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  getTrainingDay(user, numericDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
};

module.exports.getTrainingDays = function(user, numericStartDate, numericEndDate, callback) {
  //Will return a trainingDay doc for each day between startDate and endDate inclusive.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericStartDate.toString()).isValid()) {
    err = new TypeError('getTrainingDays numericStartDate ' + numericStartDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!moment(numericEndDate.toString()).isValid()) {
    err = new TypeError('getTrainingDays numericEndDate ' + numericEndDate + ' is not a valid date');
    return callback(err, null);
  }

  var trainingDays = [],
    currentNumeric = numericStartDate;

  async.whilst(
    function() {
      return currentNumeric <= numericEndDate;
    },
    function(callback) {
      module.exports.getTrainingDayDocument(user, currentNumeric, function(err, trainingDay) {
        if (err) {
          console.log('err: ', err);
          return callback(err, null);
        }
        trainingDays.push(trainingDay);
        currentNumeric = toNumericDate(moment(currentNumeric.toString()).add(1, 'day'));
        callback(null, trainingDay);
      });
    },
    function(err, lastDay) {
      if (err) {
        return callback(err, null);
      }
      return callback(null, trainingDays);
    }
  );
};

module.exports.getStartDay = function(user, numericSearchDate, callback) {
  //select most recent starting trainingDay.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    startingPoint: true,
    dateNumeric: { $lte: numericSearchDate },
    // date: { $lte: trainingDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ dateNumeric: -1 }).limit(1)
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

module.exports.getFuturePriorityDays = function(user, numericSearchDate, priority, numberOfDaysOut, callback) {
  //select priority n trainingDays after searchDate. Include searchDate
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  // var trainingDate = moment(searchDate),
  var numericMaxDate = toNumericDate(moment(numericSearchDate.toString()).add(numberOfDaysOut, 'days'));

  var query = {
    user: user,
    scheduledEventRanking: priority,
    dateNumeric: { $gte: numericSearchDate, $lte: numericMaxDate },
    // date: { $gte: trainingDate, $lte: maxDate },
    cloneOfId: null
  };

  TrainingDay.find(query).sort({ dateNumeric: 1 })
    .exec(function(err, priorityDays) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, priorityDays);
    });
};

module.exports.getPriorPriorityDays = function(user, numericSearchDate, priority, numberOfDaysBack, callback) {
  //select priority n trainingDays before searchDate.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  var numericMinDate = toNumericDate(moment(numericSearchDate).subtract(numberOfDaysBack, 'days'));

  var query = {
    user: user,
    scheduledEventRanking: priority,
    dateNumeric: { $lt: numericSearchDate, $gte: numericMinDate },
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

module.exports.getMostRecentGoalDay = function(user, numericSearchDate, callback) {
  //select most recent goal trainingDay before today.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  var query = {
    user: user,
    scheduledEventRanking: 1,
    dateNumeric: { $lt: numericSearchDate },
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

module.exports.clearFutureMetricsAndAdvice = function(user, numericDate, callback) {
  //Only clear thru tomorrow. We don't want to wipe out our plan.
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  if (!moment(numericDate.toString()).isValid()) {
    err = new TypeError('numericDate ' + numericDate + ' is not a valid date');
    return callback(err, null);
  }

  // If trainingDate is tomorrow (in user's timezone) or later, we do not want to do anything.
  // Normally this should never happen but let's make sure.
  var tomorrowNumeric = toNumericDate(moment().add(1, 'day')), //potential timezone issue here.
    startNumeric = toNumericDate(moment(numericDate.toString()).add(1, 'day'));

  if (startNumeric > tomorrowNumeric) {
    return callback(null, null);
  }

  TrainingDay.update({
    user: user,
    dateNumeric: { $gte: startNumeric, $lte: tomorrowNumeric },
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
      cloneOfId: { $ne: null }
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

  TrainingDay.remove({
    user: user,
    isSimDay: true
  }, function(err) {
    if (err) {
      return callback(err);
    }

    TrainingDay.update({
      user: user,
      cloneOfId: { $ne: null }
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

      return callback(null);
    });
  });
};

module.exports.clearPlanningData = function(user, numericDate) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('valid user is required');
      return reject(err);
    }

    if (!moment(numericDate.toString()).isValid()) {
      err = new TypeError('numericDate ' + numericDate + ' is not a valid date');
      return reject(err);
    }

    TrainingDay.update({
      user: user,
      dateNumeric: { $gte: numericDate },
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

module.exports.removePlanningActivities = function(user) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('valid user is required');
      return reject(err);
    }

    TrainingDay.update({
      user: user
    }, {
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

module.exports.didWeGoHardTheDayBefore = function(user, numericSearchDate, callback) {
  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null);
  }

  var numericYesterday = toNumericDate(moment(numericSearchDate.toString()).subtract(1, 'day'));

  // We need to check for the existence of completedActivities below
  // as the loadRating could be from a genPlan where the completedActivities
  // were generated then removed.
  var query = TrainingDay
    .where('user').equals(user)
    .where('cloneOfId').equals(null)
    .where('dateNumeric').equals(numericYesterday)
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
