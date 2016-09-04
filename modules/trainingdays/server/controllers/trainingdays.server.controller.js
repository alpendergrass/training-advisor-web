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

exports.create = function (req, res) {
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
      
      user.save(function (err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } 

        statusMessage = {
          type: 'info',
          text: 'Events have been added. You should update your training plan.',
          title: 'Training Plan Update',
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
      
      user.save(function (err) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } 

        statusMessage = {
          type: 'info',
          text: 'A training day has been added or updated. You should update your training plan.',
          title: 'Training Plan Update',
          created: Date.now(),
          username: user.username
        };

        dbUtil.sendMessageToUser(statusMessage, user);
        res.json(trainingDay);
      });
    });
  }
};

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
    function (callback) {
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
    } else if (req.body.eventPriority) {
      trainingDay.name = req.body.name;
      trainingDay.eventPriority = Math.round(req.body.eventPriority); //This will do a string conversion.
      trainingDay.estimatedGoalLoad = req.body.estimatedGoalLoad;

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

    trainingDay.save(function (err) {
      if (err) {
        return callback(err, null);
      } 

      return callback(null, trainingDay);
    });
  });
}

// Show the current trainingDay
exports.read = function (req, res) {
  res.json(req.trainingDay);
};

exports.update = function (req, res) {
  var trainingDay = req.trainingDay,
    params = {};

  trainingDay.name = req.body.name;
  trainingDay.date = new Date(req.body.date);
  trainingDay.fitness = req.body.fitness;
  trainingDay.fatigue = req.body.fatigue;
  trainingDay.eventPriority = req.body.eventPriority;
  trainingDay.estimatedGoalLoad = req.body.estimatedGoalLoad;
  trainingDay.trainingEffortFeedback = req.body.trainingEffortFeedback;
  trainingDay.notes = req.body.notes;
  trainingDay.completedActivities = req.body.completedActivities;

  getTrainingDay(trainingDay.id, function(err, existingTrainingDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else if (!existingTrainingDay) {
      return res.status(404).send({
        message: 'No existingTrainingDay with that identifier has been found to update'
      });
    }
    
    if (existingTrainingDay.fitness !== trainingDay.fitness || existingTrainingDay.fatigue !== trainingDay.fatigue) {
      //user has updated F&F, which should only be done in a F&F true-up.
      trainingDay.fitnessAndFatigueTrueUp = true;
    }

    trainingDay.save(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } 

      //If a change was made that would affect existing advice, let's recompute.
      if (existingTrainingDay.plannedActivities[0] && existingTrainingDay.plannedActivities[0].advice && 
        (trainingDay.eventPriority !== existingTrainingDay.eventPriority || 
          trainingDay.estimatedGoalLoad !== existingTrainingDay.estimatedGoalLoad || 
          trainingDay.completedActivities !== existingTrainingDay.completedActivities
        )
      ) {
        params.user = req.user;
        params.trainingDate = new Date(trainingDay.date);
        params.alternateActivity = null;
        params.alertUser = true;

        adviceEngine.advise(params, function (err, trainingDay) {
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          }

          return res.json(trainingDay);
        });
      } else { // if (trainingDay.completedActivities !== existingTrainingDay.completedActivities) {
        // update metrics for trainingDay just in case.
        adviceMetrics.updateMetrics(req.user, trainingDay.date, function(err, trainingDay) {
          if (err) {
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          }

          return res.json(trainingDay);
        });
      } // else {
      //   return res.json(trainingDay);
      // }
    });
  });
};

exports.delete = function (req, res) {
  var trainingDay = req.trainingDay,
    user = req.user,
    statusMessage = {};

  trainingDay.remove(function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } 

    user.planGenNeeded = true;
    
    user.save(function (err) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } 

      statusMessage = {
        type: 'info',
        text: 'A training day has been removed. You should update your training plan.',
        title: 'Training Plan Update',
        created: Date.now(),
        username: user.username
      };

      dbUtil.sendMessageToUser(statusMessage, user);
      res.json(trainingDay);
    });
  });
};

exports.list = function (req, res) {
  //Returns all existing trainingDays.
  var user = req.user,
    today = req.query.clientDate; //need to use current date from client to avoid time zone issues.

  //Call updateMetics for today so that any missing trainingDays will be generated.
  //Note that if user deleted a past training day but we have valid metrics for subsequent days,
  //the deleted day will not be recreated. We will ignore this scenario unless/until it becomes an issue.
//  adviceMetrics.updateMetrics(user, today, false, function(err, trainingDay) {
  //ignore any errors. For example if we have not start day we will get an error.
  TrainingDay.find({ user: user.id }).sort('-date').populate('user', 'displayName').exec(function (err, trainingDays) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(trainingDays);
    }
  });
//  });
};

exports.getSeason = function (req, res) {
  //TODO: allow for retrieval of prior/future seasons.
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
      effectiveStartDate = moment(today).subtract('1', 'day');
      // err = new TypeError('A start day is required.');
      // return res.status(400).send({
      //   message: errorHandler.getErrorMessage(err)
      // });
    }

    console.log('getSeason startDay.date: ' + (startDay ? startDay.date : 'none'));
    console.log('getSeason effectiveStartDate: ' + effectiveStartDate);

    //Get next goal day. Look up to one year out. Seems kind of excessive.
    //TODO: get thru last goal.
    dbUtil.getNextPriorityDay(user, today, 1, 365, function(err, goalDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      if (goalDay) {
        effectiveGoalDate = goalDay.date;
      } else {
        effectiveGoalDate = moment(today).add('1', 'day');
      }

      console.log('getSeason goalDay.date: ' + (goalDay? goalDay.date : 'none'));
      console.log('effectiveGoalDate: ' + effectiveGoalDate);

      // dbUtil.getMostRecentGoalDay(user, today, function(err, mostRecentGoalDay) {
      //   if (err) {
      //     return res.status(400).send({
      //       message: errorHandler.getErrorMessage(err)
      //     });
      //   }

      //   dates.nextGoalDate = goalDay? moment(goalDay.date) : moment(today).add('1', 'day');

      //   console.log('getSeason dates.nextGoalDate.toDate(): ' + dates.nextGoalDate.toDate());

      //   if (startDay) {
      //     dates.startDate = moment(startDay.date);
      //     dates.mostRecentGoalDate = mostRecentGoalDay? moment(mostRecentGoalDay.date) : null;
      //     effectiveStartDate = advicePeriod.determineEffectiveStartDate(dates);       
      //   } else {
      //     effectiveStartDate = moment(today).subtract('1', 'day');
      //   }

        // //Let's not confuse the user by using a start date prior to the date they said to start on.
        // if (startDay && effectiveStartDate.isBefore(startDay.date)) {
        //   effectiveStartDate = moment(startDay.date);
        // }

        // console.log('getSeason effectiveStartDate.toDate(): ' + effectiveStartDate.toDate());

      dbUtil.getTrainingDays(user, effectiveStartDate, effectiveGoalDate, function(err, trainingDays) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        } else {
          res.json(trainingDays);
        }
      });
      // });
    });
  });
};

exports.getAdvice = function (req, res) {
  //Request advice for trainingDate and return trainingDay.
  var params = {};
  params.user = req.user;
  params.trainingDate = req.params.trainingDate;
  params.alternateActivity = req.query.alternateActivity;
  params.alertUser = true;
  
  adviceEngine.advise(params, function (err, trainingDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json(trainingDay);
    }
  });
};

exports.genPlan = function (req, res) {
  var params = {};
  params.user = req.user;
  params.startDate = req.params.startDate;
  
  adviceEngine.generatePlan(params, function (err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } else {
      res.json('Plan generated');
    }
  });
};

exports.downloadActivities = function (req, res) {
  getTrainingDay(req.params.trainingDayId, function(err, trainingDay) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    } 

    if (!trainingDay) {
      return res.status(404).send({
        message: 'No trainingDay with that identifier has been found'
      });
    }

    if (req.query.provider === 'strava') {
      downloadStrava.downloadActivities(req.user, trainingDay, function (err, trainingDay) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        return res.json(trainingDay);
      });
    }

    if (req.query.provider === 'trainingpeaks') {
      downloadTrainingPeaks.downloadActivities(req.user, trainingDay, function (err, trainingDay) {
        if (err) {
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }

        return res.json(trainingDay);
      });
    }

  });
};

//TrainingDay middleware
exports.trainingDayByID = function (req, res, next, id) {

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

function getTrainingDay(id, callback) {
  TrainingDay.findById(id).populate('user', 'displayName thresholdPower').exec(function (err, trainingDay) {
    if (err) {
      return callback(err, null);
    } 

    return callback(null, trainingDay); 
  });
}  
