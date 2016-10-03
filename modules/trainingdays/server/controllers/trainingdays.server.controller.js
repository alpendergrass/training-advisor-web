'use strict';

var path = require('path'),
  moment = require('moment'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
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

function generateRecurrences(req, callback) {
  //Our first event will be on current day is current day is a selected day of week.
  //If not it will be the first selected DOW after current day.
  //If skipping one or more weeks, do not schedule anything in skipped week(s).
  //That is, we only schedule events in selected weeks.

  var spec = req.body.recurrenceSpec,
    startDate = moment(req.body.date),
    nextDate,
    endDate = moment(req.body.recurrenceSpec.endsOn).add(1, 'day'), //.endOf('day'),
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

function createTrainingDay(req, callback) {
  //It is possible that a document already exists for this day in which case we will update.
  dbUtil.getTrainingDayDocument(req.user, req.body.date, function(err, trainingDay) {
    if (err) {
      return callback(err, null);
    }

    if (req.body.startingPoint || req.body.fitnessAndFatigueTrueUp) {
      //Preserve existing name, if any.
      trainingDay.name = trainingDay.name? trainingDay.name + ', ' + req.body.name : req.body.name;
      trainingDay.startingPoint = req.body.startingPoint;
      trainingDay.fitnessAndFatigueTrueUp = req.body.fitnessAndFatigueTrueUp;
      trainingDay.fitness = req.body.fitness;
      trainingDay.fatigue = req.body.fatigue;
      //Normally form is calculated using the preceding day's fitness and fatigue but we do not have prior day here.
      trainingDay.form = Math.round((req.body.fitness - req.body.fatigue) * 100) / 100;
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
    //trainingDay.targetIntensity = 0;
    trainingDay.sevenDayTargetRampRate = 0;
    trainingDay.dailyTargetRampRate = 0;
    trainingDay.targetAvgDailyLoad = 0;

    trainingDay.save(function(err) {
      if (err) {
        return callback(err, null);
      }

      return callback(null, trainingDay);
    });
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

        statusMessage = {
          type: 'info',
          text: 'Events have been added. You should update your season.',
          title: 'Season Update',
          created: Date.now(),
          username: user.username
        };

        dbUtil.sendMessageToUser(statusMessage, user);
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

      user.planGenNeeded = true;

      user.save(function(err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        if (trainingDay.startingPoint || trainingDay.fitnessAndFatigueTrueUp || trainingDay.scheduledEventRanking) {
          statusMessage = {
            type: 'info',
            text: 'A key training day has been added or updated. You should update your season.',
            title: 'Season Update',
            created: Date.now(),
            username: user.username
          };

          dbUtil.sendMessageToUser(statusMessage, user);
        }
        res.json(trainingDay);
      });
    });
  }
};

exports.read = function(req, res) {
  // Return the current trainingDay retrieved in trainingDayByID().
  res.json(req.trainingDay);
};

exports.getDay = function(req, res) {
  dbUtil.getTrainingDayDocument(req.user, req.params.trainingDate, function(err, trainingDay) {
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
    recomputeAdvice = false,
    params = {};

  if (req.body.fitness !== trainingDay.fitness || req.body.fatigue !== trainingDay.fatigue) {
    //user has updated F&F, which should only be done in a F&F true-up.
    trainingDay.fitnessAndFatigueTrueUp = true;
  }

  //If a change was made that would affect existing advice, let's recompute.
  if (trainingDay.plannedActivities[0] && trainingDay.plannedActivities[0].advice &&
    (trainingDay.scheduledEventRanking !== req.body.scheduledEventRanking ||
      trainingDay.estimatedLoad !== req.body.estimatedLoad ||
      trainingDay.completedActivities !== req.body.completedActivities
    )
  ) {
    recomputeAdvice = true;
  }

  trainingDay.name = req.body.name;
  trainingDay.date = new Date(req.body.date);
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

    params.user = req.user;
    params.trainingDate = new Date(trainingDay.date);

    if (recomputeAdvice) {
      params.alternateActivity = null;
      params.alertUser = true;

      adviceEngine.advise(params, function(err, trainingDay) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        return res.json(trainingDay);
      });
    } else {
      // update metrics for trainingDay just in case.
      adviceMetrics.updateMetrics(params, function(err, trainingDay) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        var statusMessage = {
          type: 'info',
          text: 'Your training day has been updated. You should update your season.',
          title: 'Season Update',
          created: Date.now(),
          username: req.user.username
        };

        dbUtil.sendMessageToUser(statusMessage, req.user);
        return res.json(trainingDay);
      });
    }
  });
};

exports.delete = function(req, res) {
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

      statusMessage = {
        type: 'info',
        text: 'A training day has been removed. You should update your season.',
        title: 'Season Update',
        created: Date.now(),
        username: user.username
      };

      dbUtil.sendMessageToUser(statusMessage, user);
      res.json(trainingDay);
    });
  });
};

exports.list = function(req, res) {
  //Returns all existing trainingDays.
  //Note that this will include sim clone days so there could be dups for some days.
  var user = req.user,
    today = req.query.clientDate; //need to use current date from client to avoid time zone issues.

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
    today = new Date(req.params.today),
    effectiveStartDate,
    effectiveGoalDate,
    dates = {};

  dbUtil.getStartDay(user, today, function(err, startDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    if (startDay) {
      effectiveStartDate = startDay.date;
    } else {
      effectiveStartDate = moment(today).subtract(1, 'day');
    }

    //Get future goal days to determine end of season.
    dbUtil.getFuturePriorityDays(user, today, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd, function(err, goalDays) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      if (goalDays.length > 0) {
        //Use last goal to end season.
        effectiveGoalDate = goalDays[goalDays.length - 1].date;
      } else {
        effectiveGoalDate = moment(today).add(1, 'day');
      }

      dbUtil.getTrainingDays(user, effectiveStartDate, effectiveGoalDate, function(err, trainingDays) {
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
  params.trainingDate = req.params.trainingDate;
  params.alternateActivity = req.query.alternateActivity;
  params.alertUser = true;

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
  params.trainingDate = req.params.trainingDate;

  adviceEngine.generatePlan(params, function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json('Plan generated');
    }
  });
};

exports.getSimDay = function(req, res) {
  // We save a clone of TD before returning a what-if day
  // unless a clone already exists.

  var trainingDay = req.trainingDay;

  if (trainingDay.isSimDay) {
    // This day has aready been simmed.
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
    downloadStrava.downloadActivities(req.user, trainingDay, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      return res.json(trainingDay);
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
