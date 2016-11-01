'use strict';

var moment = require('moment-timezone'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require('./util'),
  err;

require('lodash-migrate');

mongoose.Promise = global.Promise;

function getTrainingDay(user, numericDate, callback) {
  if (!user) {
    err = new TypeError('getTrainingDay valid user is required');
    return callback(err, null);
  }

  if (!numericDate) {
    err = new TypeError('getTrainingDay numericDate is required to getTrainingDay');
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

module.exports = {};

module.exports.getTrainingDayDocument = function(user, numericDate, callback) {
  //If requested training day does not exist it will be created and returned.
  //This should be the only place in the app where a new training day is created from scratch.
  callback = (typeof callback === 'function') ? callback : function(err, data) {};


  getTrainingDay(user, numericDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    if (!trainingDay) {
      var newTrainingDay = new TrainingDay(),
        timezone = user.timezone || 'America/Denver',
        plannedMetrics = {
          metricsType: 'planned'
        },
        actualMetrics = {
          metricsType: 'actual',
        };

      newTrainingDay.dateNumeric = numericDate;
      newTrainingDay.date = moment.tz(numericDate.toString(), timezone).toDate();
      newTrainingDay.user = user;
      newTrainingDay.metrics.push(plannedMetrics);
      newTrainingDay.metrics.push(actualMetrics);

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

module.exports.getExistingTrainingDayDocument = function(user, numericDate) {
  return new Promise(function(resolve, reject) {
    getTrainingDay(user, numericDate, function(err, trainingDay) {
      if (err) {
        return reject(err);
      }

      return resolve(trainingDay);
    });
  });
};

module.exports.getTrainingDays = function(user, numericStartDate, numericEndDate, callback) {
  //Will return a trainingDay doc for each day between startDate and endDate inclusive.
  if (!user) {
    err = new TypeError('getTrainingDaysvalid user is required');
    return callback(err, null);
  }

  if (!numericStartDate) {
    err = new TypeError('numericStartDate is required to getTrainingDay');
    return callback(err, null);
  }

  if (!moment(numericStartDate.toString()).isValid()) {
    err = new TypeError('getTrainingDays numericStartDate ' + numericStartDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!numericEndDate) {
    err = new TypeError('numericEndDate is required to getTrainingDay');
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
        currentNumeric = util.toNumericDate(moment(currentNumeric.toString()).add(1, 'day'));
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
    err = new TypeError('getStartDay valid user is required');
    return callback(err, null);
  }

  if (!numericSearchDate) {
    err = new TypeError('getStartDay numericSearchDate is required to getTrainingDay');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('getStartDay numericSearchDate ' + numericSearchDate + ' is not a valid date');
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
    err = new TypeError('getFuturePriorityDays valid user is required');
    return callback(err, null);
  }

  if (!numericSearchDate) {
    err = new TypeError('numericSearchDate is required to getFuturePriorityDays');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('getFuturePriorityDays numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  var numericMaxDate = util.toNumericDate(moment(numericSearchDate.toString()).add(numberOfDaysOut, 'days'));

  var query = {
    user: user,
    scheduledEventRanking: priority,
    dateNumeric: { $gte: numericSearchDate, $lte: numericMaxDate },
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

  if (!numericSearchDate) {
    err = new TypeError('numericSearchDate is required to getPriorPriorityDays');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  var numericMinDate = util.toNumericDate(moment(numericSearchDate.toString()).subtract(numberOfDaysBack, 'days'));

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
    err = new TypeError('getMostRecentGoalDay valid user is required');
    return callback(err, null);
  }

  if (!numericSearchDate) {
    err = new TypeError('getMostRecentGoalDay numericSearchDate is required to getMostRecentGoalDay');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('getMostRecentGoalDay numericSearchDate ' + numericSearchDate + ' is not a valid date');
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

module.exports.clearSubsequentMetricsAndAdvice = function(user, numericDate, metricsType, callback) {
  //Only clear thru tomorrow. Should be no actual metrics past tomorrow.
  //But we might be clearing planned. we should clear all.

  if (!user) {
    err = new TypeError('clearSubsequentMetricsAndAdvice valid user is required');
    return callback(err, null);
  }

  if (!numericDate) {
    err = new TypeError('clearSubsequentMetricsAndAdvice numericDate is required');
    return callback(err, null);
  }

  if (!moment(numericDate.toString()).isValid()) {
    err = new TypeError('clearSubsequentMetricsAndAdvice numericDate ' + numericDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!metricsType) {
    err = new TypeError('clearSubsequentMetricsAndAdvice metricsType is required');
    return callback(err, null);
  }

  // If trainingDate is tomorrow (in user's timezone) or later, we do not want to do anything.
  // Normally this should never happen but let's make sure.
  // var tomorrowNumeric = util.toNumericDate(moment().add(1, 'day')); //potential timezone issue here.
  let startNumeric = util.toNumericDate(moment(numericDate.toString()).add(1, 'day'));
  let source = metricsType === 'actual' ? 'advised' : 'plangeneration';

  // if (startNumeric > tomorrowNumeric) {
  //   return callback(null, null);
  // }

  TrainingDay.update({
    user: user,
    // dateNumeric: { $gte: startNumeric, $lte: tomorrowNumeric },
    dateNumeric: { $gte: startNumeric },
    fitnessAndFatigueTrueUp: false,
    startingPoint: false,
    cloneOfId: null,
    'metrics.metricsType': metricsType,
    'plannedActivities.source': source
  }, {
    $set: {
      'metrics.$.fitness': 0,
      'metrics.$.fatigue': 0,
      'metrics.$.form': 0,
      'metrics.$.sevenDayRampRate': 0,
      'metrics.$.sevenDayTargetRampRate': 0,
      'metrics.$.dailyTargetRampRate': 0,
      'metrics.$.rampRateAdjustmentFactor': 1,
      'metrics.$.targetAvgDailyLoad': 0,
      'metrics.$.loadRating': '',
      'plannedActivities.$': {}
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

// module.exports.clearPlanningData = function(user, numericDate) {
//   return new Promise(function(resolve, reject) {
//     if (!user) {
//       err = new TypeError('clearPlanningData valid user is required');
//       return reject(err);
//     }

//     if (!numericDate) {
//       err = new TypeError('clearPlanningData numericDate is required to getTrainingDay');
//       return reject(err);
//     }

//     if (!moment(numericDate.toString()).isValid()) {
//       err = new TypeError('clearPlanningData numericDate ' + numericDate + ' is not a valid date');
//       return reject(err);
//     }

//     TrainingDay.update({
//       user: user,
//       dateNumeric: { $gte: numericDate },
//       cloneOfId: null,
//       'metrics.metricsType': 'planned'
//     }, {
//       $set: { 'metrics.$.loadRating': '', },
//       $pull: { completedActivities: { source: 'plangeneration' } }
//     }, {
//       multi: true
//     }, function(err, rawResponse) {
//       if (err) {
//         return reject(err);
//       }

//       return resolve(rawResponse);
//     });
//   });
// };

module.exports.removePlanGenerationActivities = function(user) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('removePlanGenerationActivities valid user is required');
      return reject(err);
    }

    TrainingDay.update({
      user: user
    }, {
      $pull: { plannedActivities: { source: 'plangeneration' }, completedActivities: { source: 'plangeneration' } }
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

module.exports.removePlanGenerationCompletedActivities = function(user) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('removePlanGenerationActivities valid user is required');
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

module.exports.copyActualMetricsToPlanned = function(user, numericDate) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('copyActualMetricsToPlanned valid user is required');
      return reject(err);
    }

    if (!numericDate) {
      err = new TypeError('copyActualMetricsToPlanned numericDate is required');
      return reject(err);
    }

    if (!moment(numericDate.toString()).isValid()) {
      err = new TypeError('copyActualMetricsToPlanned numericDate ' + numericDate + ' is not a valid date');
      return reject(err);
    }

    var getTrainingDay = TrainingDay.findOne({
      user: user,
      dateNumeric: numericDate,
      cloneOfId: null
    }).exec();

    getTrainingDay
      .then(function(trainingDay) {
        if (!trainingDay) {
          // This could happen if the first day of our plan gen is a start day.
          return resolve();
        }

        let actualMetrics = _.find(trainingDay.metrics, ['metricsType', 'actual']);
        let plannedMetrics = _.find(trainingDay.metrics, ['metricsType', 'planned']);

        plannedMetrics.fitness = actualMetrics.fitness;
        plannedMetrics.fatigue = actualMetrics.fatigue;
        plannedMetrics.form = actualMetrics.form;
        plannedMetrics.sevenDayRampRate = actualMetrics.sevenDayRampRate;
        plannedMetrics.sevenDayTargetRampRate = actualMetrics.sevenDayTargetRampRate;
        plannedMetrics.dailyTargetRampRate = actualMetrics.dailyTargetRampRate;
        plannedMetrics.rampRateAdjustmentFactor = actualMetrics.rampRateAdjustmentFactor;
        plannedMetrics.targetAvgDailyLoad = actualMetrics.targetAvgDailyLoad;
        plannedMetrics.loadRating = actualMetrics.loadRating;

        trainingDay.save(function(err) {
          if (err) {
            return reject(err);
          }

          return resolve();
        });
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};

module.exports.didWeGoHardTheDayBefore = function(user, numericSearchDate, metricsType, callback) {
  if (!user) {
    err = new TypeError('didWeGoHardTheDayBefore valid user is required');
    return callback(err, null);
  }

  var numericYesterday = util.toNumericDate(moment(numericSearchDate.toString()).subtract(1, 'day'));

  // We need to check for the existence of completedActivities below
  // as the loadRating could be from a genPlan where the completedActivities
  // were generated then removed.
  // TODO: this no longer makes sense to me. This method should work the same regardless
  // now that we have separated planned and actual metrics.
  var query = TrainingDay
    .where('user').equals(user)
    .where('cloneOfId').equals(null)
    .where('dateNumeric').equals(numericYesterday)
    // .where('completedActivities').ne([])
    .where('metrics').elemMatch({ metricsType: metricsType, loadRating: 'hard' });
    // .where('metrics.$.loadRating').in(['simulation', 'hard']);

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
