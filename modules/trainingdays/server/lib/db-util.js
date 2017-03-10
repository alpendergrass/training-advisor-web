'use strict';

var moment = require('moment-timezone'),
  _ = require('lodash'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require('./util'),
  err;

mongoose.Promise = global.Promise;

function getTrainingDay(user, numericDate, callback) {
  if (!user) {
    err = new TypeError('getTrainingDay valid user is required');
    return callback(err, null);
  }

  if (!numericDate) {
    err = new TypeError('numericDate is required to getTrainingDay');
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

  query.findOne().populate('user', '-salt -password').exec(function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
}

module.exports = {};

module.exports.getTrainingDayDocument = function(user, numericDate) {
  //If requested training day does not exist it will be created and returned.
  //This should be the only place in the app where a new training day is created from scratch.
  return new Promise(function(resolve, reject) {
    getTrainingDay(user, numericDate, function(err, trainingDay) {
      if (err) {
        return reject(err);
      }

      if (!trainingDay) {
        var newTrainingDay = new TrainingDay(),
          timezone = user.timezone || 'America/New_York',
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
            return reject(err);
          }

          return resolve(createdTrainingDay);
        });
      } else {
        return resolve(trainingDay);
      }
    });
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
      module.exports.getTrainingDayDocument(user, currentNumeric)
        .then(function(trainingDay) {
          trainingDays.push(trainingDay);
          currentNumeric = util.toNumericDate(moment(currentNumeric.toString()).add(1, 'day'));
          callback(null, trainingDay);
        })
        .catch(function(err) {
          console.log('err: ', err);
          return callback(err, null);
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

module.exports.removeSubsequentStartingPoints = function(user, numericDate) {
  return new Promise(function(resolve, reject) {
    TrainingDay.update({
      user: user,
      startingPoint: true,
      dateNumeric: { $gt: numericDate },
    }, {
      $set: {
        startingPoint: false
      }
    }, {
      multi: true
    }).exec()
      .then(function() {
        return resolve();
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};

module.exports.getFuturePriorityDays = function(user, numericSearchDate, priority, numberOfDaysOut) {
  //select priority n trainingDays after searchDate. Include searchDate
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('getFuturePriorityDays valid user is required');
      return reject(err);
    }

    if (!numericSearchDate) {
      err = new TypeError('numericSearchDate is required to getFuturePriorityDays');
      return reject(err);
    }

    if (!moment(numericSearchDate.toString()).isValid()) {
      err = new TypeError('getFuturePriorityDays numericSearchDate ' + numericSearchDate + ' is not a valid date');
      return reject(err);
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
          return reject(err);
        }

        return resolve(priorityDays);
      });
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

module.exports.clearFutureMetricsAndAdvice = function(params, callback) {
  // Note: we clear numericDate and following day metrics. We used to start with the day after numericDate.
  // For actual metrics we only need to clear thru tomorrow. Should be no actual metrics past tomorrow.
  // But for planned we should clear all.
  // For now we clear all in either scenario.

  if (!params.user) {
    err = new TypeError('clearFutureMetricsAndAdvice valid user is required');
    return callback(err, null);
  }

  if (!params.numericDate) {
    err = new TypeError('clearFutureMetricsAndAdvice numericDate is required');
    return callback(err, null);
  }

  if (!moment(params.numericDate.toString()).isValid()) {
    err = new TypeError('clearFutureMetricsAndAdvice numericDate ' + params.numericDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!params.metricsType) {
    err = new TypeError('clearFutureMetricsAndAdvice metricsType is required');
    return callback(err, null);
  }

  let source;

  if (params.source) {
    //'advised', 'plangeneration' or 'requested'
    source = params.source;
  } else {
    source = params.metricsType === 'actual' ? 'advised' : 'plangeneration';
  }

  TrainingDay.update({
    user: params.user,
    dateNumeric: { $gte: params.numericDate },
    cloneOfId: null
  }, {
    $pull: { plannedActivities: { source: source } }
  }, {
    multi: true
  }, function(err, rawResponse) {
    if (err) {
      return callback(err, null);
    }

    TrainingDay.update({
      user: params.user,
      dateNumeric: { $gte: params.numericDate },
      startingPoint: false,
      cloneOfId: null,
      'metrics.metricsType': params.metricsType,
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
      }
    }, {
      multi: true
    }, function(err, rawResponse) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, rawResponse);
    });
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

module.exports.removePlanGenerationActivities = function(user, numericDate) {
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('removePlanGenerationActivities valid user is required');
      return reject(err);
    }

    if (!numericDate) {
      err = new TypeError('removePlanGenerationActivities numericDate is required');
      return reject(err);
    }

    if (!moment(numericDate.toString()).isValid()) {
      err = new TypeError('removePlanGenerationActivities numericDate ' + numericDate + ' is not a valid date');
      return reject(err);
    }

    TrainingDay.update({
      user: user,
      dateNumeric: { $gt: numericDate }
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
      err = new TypeError('removePlanGenerationCompletedActivities valid user is required');
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

  if (!numericSearchDate) {
    err = new TypeError('numericSearchDate is required by didWeGoHardTheDayBefore');
    return callback(err, null);
  }

  if (!moment(numericSearchDate.toString()).isValid()) {
    err = new TypeError('didWeGoHardTheDayBefore numericSearchDate ' + numericSearchDate + ' is not a valid date');
    return callback(err, null);
  }

  if (!metricsType) {
    err = new TypeError('metricsType is required by didWeGoHardTheDayBefore');
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
    .where('metrics').elemMatch({ metricsType: metricsType, loadRating: 'hard' });

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

module.exports.computeAverageRampRate = function(user, numericSearchDate, metricsType) {
  // Compute average ramp rate for previous 7 days.
  return new Promise(function(resolve, reject) {
    if (!user) {
      err = new TypeError('computeAverageRampRate valid user is required');
      return reject(err);
    }

    if (!numericSearchDate) {
      err = new TypeError('numericSearchDate is required to computeAverageRampRate');
      return reject(err);
    }

    if (!moment(numericSearchDate.toString()).isValid()) {
      err = new TypeError('computeAverageRampRate numericSearchDate ' + numericSearchDate + ' is not a valid date');
      return reject(err);
    }

    if (!metricsType) {
      err = new TypeError('metricsType is required to computeAverageRampRate');
      return reject(err);
    }

    let numericStartDate = util.toNumericDate(moment(numericSearchDate.toString()).subtract(7, 'days'));

    TrainingDay.aggregate([{
      $match: {
        $and: [
          { user: user._id },
          { dateNumeric: { $gte: numericStartDate, $lt: numericSearchDate } }
        ]
      }
    },
    { $project: { _id: '$dateNumeric', metrics: 1 } },
    { $unwind: '$metrics' },
    { $match: { 'metrics.metricsType': metricsType } }, {
      $group: {
        _id: null,
        averageRampRate: { $avg: '$metrics.sevenDayRampRate' },
        dayCount: { $sum: 1 }
      }
    }], function(err, results) {
      if (err) {
        return reject(err);
      }

      return resolve(results);
    });
  });
};
