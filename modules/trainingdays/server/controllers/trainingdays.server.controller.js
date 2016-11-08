'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  util = require('../lib/util'),
  dbUtil = require('../lib/db-util'),
  downloadStrava = require('../lib/download-strava'),
  downloadTrainingPeaks = require('../lib/download-trainingpeaks'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  advicePeriod = require(path.resolve('./modules/advisor/server/lib/advice-period')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

function getTrainingDay(id, callback) {
  TrainingDay.findById(id).populate('user', 'displayName thresholdPower').exec(function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    return callback(null, trainingDay);
  });
}

function createTrainingDay(req, callback) {
  //This function is used to create start days, true-up days and events.
  //It is possible that a document already exists for this day so we must treat this as an update.
  let numericDate = util.toNumericDate(req.body.date);

  dbUtil.getTrainingDayDocument(req.user, numericDate, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    let actualMetrics = util.getMetrics(trainingDay, 'actual');

    if (req.body.startingPoint || req.body.fitnessAndFatigueTrueUp) {
      //Preserve existing name, if any.
      trainingDay.name = trainingDay.name? trainingDay.name + ', ' + req.body.name : req.body.name;
      trainingDay.startingPoint = req.body.startingPoint;
      trainingDay.fitnessAndFatigueTrueUp = req.body.fitnessAndFatigueTrueUp;
      actualMetrics.fitness = req.body.actualFitness;
      actualMetrics.fatigue = req.body.actualFatigue;
      // Normally form is calculated using the preceding day's fitness and fatigue but for a start day
      // we do not have prior day and for a true-up day we treat as a new start.
      actualMetrics.form = Math.round((req.body.actualFitness - req.body.actualFatigue) * 100) / 100;

      if (req.body.startingPoint) {
        // Planning metrics should not be affected by a true-up. I think.
        let plannedMetrics = util.getMetrics(trainingDay, 'planned');
        plannedMetrics.fitness = req.body.actualFitness;
        plannedMetrics.fatigue = req.body.actualFatigue;
        plannedMetrics.form = actualMetrics.form;
      }
    } else if (req.body.scheduledEventRanking) {
      trainingDay.name = req.body.name;
      trainingDay.scheduledEventRanking = Math.round(req.body.scheduledEventRanking); //This will do a string to number conversion.
      trainingDay.estimatedLoad = req.body.estimatedLoad;

      if (req.body.recurrenceSpec) {
        trainingDay.recurrenceSpec = req.body.recurrenceSpec;
        trainingDay.eventRecurrenceID = req.body.eventRecurrenceID;
      }
    }

    trainingDay.notes = req.body.notes || '';
    trainingDay.period = '';
    trainingDay.plannedActivities = [];

    actualMetrics.sevenDayRampRate = 0;
    actualMetrics.sevenDayTargetRampRate = 0;
    actualMetrics.dailyTargetRampRate = 0;
    actualMetrics.rampRateAdjustmentFactor = 1;
    actualMetrics.targetAvgDailyLoad = 0;
    actualMetrics.loadRating = '';

    trainingDay.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      if (req.body.startingPoint || req.body.fitnessAndFatigueTrueUp) {
        adviceEngine.refreshAdvice(req.user, trainingDay)
          .then(function(trainingDay) {
            if (req.body.startingPoint) {
              // Refresh plan metrics from start.
              // TODO: likely need to regen plan.
              let params = {};
              params.user = req.user;
              params.numericDate = trainingDay.dateNumeric;
              params.metricsType = 'planned';

              adviceMetrics.updateMetrics(params, function(err, trainingDay) {
                if (err) {
                  return callback(err, null);
                }

                return callback(null, trainingDay);
              });
            } else {
              return callback(null, trainingDay);
            }
          })
          .catch(function(err) {
            return callback(err, null);
          });
      } else {
        return callback(null, trainingDay);
      }
    });
  });
}

function generateRecurrences(req, callback) {
  //Our first event will be on current day is current day is a selected day of week.
  //If not it will be the first selected DOW after current day.
  //If skipping one or more weeks, do not schedule anything in skipped week(s).
  //That is, we only schedule events in selected weeks.

  var spec = req.body.recurrenceSpec,
    startDate = moment(req.body.date),
    nextDate,
    timezone = req.user.timezone || 'America/Denver',
    endDate = moment.tz(req.body.recurrenceSpec.endsOn, timezone).add(1, 'day'),
    trainingDay;

  req.body.eventRecurrenceID = Math.floor(Math.random() * 999999999999999) + 1;
  // Math.floor(Math.random() * (max - min + 1)) + min;

  async.whilst(
    function() {
      return startDate.isSameOrBefore(endDate);
    },
    function(callback) {
      async.forEachOfSeries(spec.daysOfWeek, function(value, key, callback) {
        if (value) {
          //set nextDate to day of week in week of startDate.
          nextDate = moment(startDate).day(parseInt(key, 10));

          if (nextDate.isSameOrAfter(startDate) && nextDate.isBefore(endDate)) {
            req.body.date = nextDate.toDate();
            createTrainingDay(req, function(err, createdTrainingDay) {
              if (err) {
                return callback(err);
              }
              trainingDay = createdTrainingDay;
              return callback();
            });
          } else {
            return callback();
          }
        } else {
          return callback();
        }
      }, function(err) {
        if (err) {
          return callback(err);
        }

        //startDate.add(spec.everyNTimeUnits, 'weeks').startOf('week');
        //this is where an error is introduced.
        //startOfWeek() takes us to midnight Sunday in the server time zone  - we lose our local offset.
        //Go to Sunday of next recurrence week. This does not affect time of day.
        startDate.add(spec.everyNTimeUnits, 'weeks').day(0);
        return callback(null);
      });
    },
    function(err) {
      if (err) {
        return callback(err, null);
      }

      //return the last trainingDay created.
      return callback(null, trainingDay);
    });
}

exports.create = function(req, res) {
  var user = req.user,
    statusMessage = {};

  if (req.body.recurrenceSpec && req.body.recurrenceSpec.endsOn) {
    generateRecurrences(req, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      user.planGenNeeded = true;

      user.save(function(err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        // statusMessage = {
        //   type: 'info',
        //   text: 'You should update your season.',
        //   title: 'Events Added',
        //   created: Date.now(),
        //   username: user.username
        // };

        // dbUtil.sendMessageToUser(statusMessage, user);
        res.json(trainingDay);
      });
    });
  } else {
    createTrainingDay(req, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      let today = util.getTodayInTimezone(user.timezone);

      if (moment(trainingDay.date).isAfter(today)) {
        user.planGenNeeded = true;

        user.save(function(err) {
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          }

          // if (trainingDay.startingPoint || trainingDay.fitnessAndFatigueTrueUp || trainingDay.scheduledEventRanking) {
          //   statusMessage = {
          //     type: 'info',
          //     text: 'You should update your season.',
          //     title: 'Training Day Added or Updated',
          //     created: Date.now(),
          //     username: user.username
          //   };

          //   dbUtil.sendMessageToUser(statusMessage, user);
          // }
          res.json(trainingDay);
        });
      } else {
        res.json(trainingDay);
      }
    });
  }
};

exports.read = function(req, res) {
  // Return the current trainingDay retrieved in trainingDayByID().
  res.json(req.trainingDay);
};

exports.getDay = function(req, res) {
  dbUtil.getTrainingDayDocument(req.user, util.toNumericDate(req.params.trainingDate), function(err, trainingDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    res.json(trainingDay);
  });
};

exports.update = function(req, res) {
  var trainingDay = req.trainingDay,
    refreshAdvice = false,
    params = {};

  // If a change was made that would affect current advice, let's recompute.
  // Is not possible in the UI to change event ranking or estimated load of past events.
  if (trainingDay.completedActivities !== req.body.completedActivities ||
    trainingDay.scheduledEventRanking !== req.body.scheduledEventRanking ||
    trainingDay.estimatedLoad !== req.body.estimatedLoad
  ) {
    refreshAdvice = true;
  }

  trainingDay.name = req.body.name;
  trainingDay.fitness = req.body.fitness;
  trainingDay.fatigue = req.body.fatigue;
  trainingDay.scheduledEventRanking = req.body.scheduledEventRanking;
  trainingDay.estimatedLoad = req.body.estimatedLoad;
  trainingDay.trainingEffortFeedback = req.body.trainingEffortFeedback;
  trainingDay.notes = req.body.notes;
  trainingDay.completedActivities = req.body.completedActivities;

  trainingDay.save(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    if (refreshAdvice) {
      adviceEngine.refreshAdvice(req.user, trainingDay)
        .then(function(trainingDay) {
          return res.json(trainingDay);
        })
        .catch(function() {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        });
    } else {
      return res.json(trainingDay);
    }
  });
};

exports.delete = function(req, res) {
  // Rarely will a user be deleting a TD. I don't allow normal users to do this.

  var trainingDay = req.trainingDay,
    user = req.user,
    statusMessage = {};

  trainingDay.remove(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    user.planGenNeeded = true;

    user.save(function(err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      // statusMessage = {
      //   type: 'info',
      //   text: 'You should update your season.',
      //   title: 'Training Day Removed',
      //   created: Date.now(),
      //   username: user.username
      // };

      // dbUtil.sendMessageToUser(statusMessage, user);
      res.json(trainingDay);
    });
  });
};

exports.list = function(req, res) {
  //Returns all existing trainingDays.
  //Note that this will include sim clone days so there could be dups for some days.
  var user = req.user;

  TrainingDay.find({ user: user.id }).sort('-date').populate('user', 'displayName').exec(function(err, trainingDays) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(trainingDays);
    }
  });
};

exports.getSeason = function(req, res) {
  var user = req.user,
    numericToday = util.toNumericDate(req.params.today),
    numericEffectiveStartDate,
    numericEffectiveGoalDate,
    dates = {};

  console.log('Active user: ', user.username);

  dbUtil.getStartDay(user, numericToday, function(err, startDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    if (startDay) {
      numericEffectiveStartDate = startDay.dateNumeric;
    } else {
      numericEffectiveStartDate = util.toNumericDate(moment(numericToday.toString()).subtract(1, 'day'));
    }

    //Get future goal days to determine end of season.
    dbUtil.getFuturePriorityDays(user, numericToday, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd, function(err, goalDays) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      if (goalDays.length > 0) {
        //Use last goal to end season.
        numericEffectiveGoalDate = goalDays[goalDays.length - 1].dateNumeric;
      } else {
        numericEffectiveGoalDate = util.toNumericDate(moment(numericToday.toString()).add(1, 'month'));
      }

      dbUtil.getTrainingDays(user, numericEffectiveStartDate, numericEffectiveGoalDate, function(err, trainingDays) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.json(trainingDays);
        }
      });
    });
  });
};

exports.getAdvice = function(req, res) {
  var params = {};
  params.user = req.user;
  params.numericDate = util.toNumericDate(req.params.trainingDate);
  params.alternateActivity = req.query.alternateActivity;
  params.source = params.alternateActivity ? 'requested' : 'advised';

  adviceEngine.advise(params, function(err, trainingDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(trainingDay);
    }
  });
};

exports.genPlan = function(req, res) {
  var params = {};
  params.user = req.user;
  params.numericDate = util.toNumericDate(req.params.trainingDate);

  adviceEngine.generatePlan(params, function(err, statusMessage) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(statusMessage);
    }
  });
};

exports.getSimDay = function(req, res) {
  // We save a clone of TD before returning a what-if day
  // unless a clone already exists.

  var trainingDay = req.trainingDay;

  if (trainingDay.isSimDay) {
    // This day has already been simmed.
    res.json(trainingDay);
  } else {
    dbUtil.makeSimDay(trainingDay, function(err, simDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      res.json(simDay);
    });
  }
};

exports.finalizeSim = function(req, res) {
  if (req.params.commit === 'yes') {
    dbUtil.commitSimulation(req.user, function(err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      res.json('Simulation committed');
    });
  } else {
    dbUtil.revertSimulation(req.user, function(err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      res.json('Simulation reverted');
    });
  }
};

exports.downloadActivities = function(req, res) {
  var trainingDay = req.trainingDay;

  if (req.query.provider === 'strava') {
    downloadStrava.downloadActivities(req.user, trainingDay, function(err, response) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      return res.json(response);
    });
  }

  if (req.query.provider === 'trainingpeaks') {
    downloadTrainingPeaks.downloadActivities(req.user, trainingDay, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      return res.json(trainingDay);
    });
  }
};

//TrainingDay middleware
exports.trainingDayByID = function(req, res, next, id) {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({
      message: 'TrainingDay ID is invalid'
    });
  }

  getTrainingDay(id, function(err, trainingDay) {
    if (err) {
      return next(err);
    } else if (!trainingDay) {
      return res.status(404).send({
        message: 'No trainingDay with that identifier has been found'
      });
    }

    req.trainingDay = trainingDay;

    next();
  });
};
