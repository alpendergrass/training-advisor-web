'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  async = require('async'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  tdLib = require('../lib/trainingdays'),
  util = require('../lib/util'),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  dbUtil = require('../lib/db-util'),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util')),
  stravaUtil = require('../lib/strava-util'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  advicePeriod = require(path.resolve('./modules/advisor/server/lib/advice-period')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

function getTrainingDay(id, callback) {
  TrainingDay.findById(id).populate('user', '-salt -password').exec(function(err, trainingDay) {
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
    endDate = moment.tz(req.body.recurrenceSpec.endsOn, req.user.timezone).add(1, 'day'),
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
            req.body.dateNumeric = coreUtil.toNumericDate(nextDate.toDate());
            tdLib.createTrainingDay(req, function(err, createdTrainingDay) {
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
    statusMessage = {},
    notifications = [];

  let path = '/api/trainingDays/create';
  let pageData = { path: path };
  let eventData = { category: 'Training Day', action: 'Create', value: req.body.dateNumeric, path: path };

  if (req.body.startingPoint) {
    pageData.title = 'Create Start';
    eventData.label = 'Start';
  } else if (req.body.scheduledEventRanking) {
    pageData.title = 'Schedule Event';
    switch (req.body.scheduledEventRanking) {
      case '1':
        eventData.label = 'Goal Event';
        break;
      case '2':
        eventData.label = 'Medium Priority Event';
        break;
      case '3':
        eventData.label = 'Low Priority Event';
        break;
      case '9':
        eventData.label = 'Off Day';
        break;
      default:
        eventData.label = 'Unrecognized Event';
        break;
    }
  } else {
    pageData.title = 'Unknown Create';
    eventData.label = 'Unknown';
  }

  coreUtil.logAnalytics(req, pageData, eventData);

  if (req.body.startingPoint) {
    // Remove notification if it exists.
    notifications.push({ notificationType: 'start', lookup: '' });
  }

  if (req.body.scheduledEventRanking === '1') {
    // Remove notification if it exists.
    notifications.push({ notificationType: 'goal', lookup: '' });
  }

  if (req.body.recurrenceSpec && req.body.recurrenceSpec.endsOn) {
    generateRecurrences(req, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      notifications.push({ notificationType: 'plangen', lookup: '', add: true });

      userUtil.updateNotifications(user, notifications, true)
        .then(function(response) {
          trainingDay.user = response.user;
          return res.json(trainingDay);
        })
        .catch(function(err) {
          console.log('updateNotifications failed in TD.create: ', err);
          return res.json(trainingDay);
        });
    });
  } else {
    tdLib.createTrainingDay(req, function(err, trainingDay) {
      if (err) {
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      let today = util.getTodayInUserTimezone(user);

      if (moment(trainingDay.date).isAfter(today) || req.body.startingPoint) {
        notifications.push({ notificationType: 'plangen', lookup: '', add: true });
      }

      if (notifications.length > 0) {
        userUtil.updateNotifications(user, notifications, true)
          .then(function(response) {
            console.log('response.saved: ', response.saved);
            trainingDay.user = response.user;
            return res.json(trainingDay);
          })
          .catch(function(err) {
            console.log('updateNotifications failed in TD.create: ', err);
            return res.json(trainingDay);
          });
      } else {
        return res.json(trainingDay);
      }
    });
  }
};

exports.read = function(req, res) {
  // Return the current trainingDay retrieved in trainingDayByID().
  coreUtil.logAnalytics(req, { path: '/api/trainingDays/:trainingDayId/read', title: 'My Training Day' });
  console.log('My Training Day active user: ', req.user.username);
  res.json(req.trainingDay);
};

exports.getDay = function(req, res) {
  dbUtil.getTrainingDayDocument(req.user, parseInt(req.params.trainingDateNumeric, 10))
    .then(function(trainingDay) {
      res.json(trainingDay);
    })
    .catch(function(err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
};

exports.update = function(req, res) {
  var trainingDay = req.trainingDay,
    refreshAdvice = false,
    params = {},
    notifications = [];

  let pageData = null;
  let eventData = { category: 'Training Day', action: 'Update', value: req.body.dateNumeric, path: '/api/trainingDays/:trainingDayId/update' };

  if (trainingDay.isSimDay) {
    eventData.label = 'Sim Day';
  } else if (trainingDay.name !== req.body.name) {
    eventData.label = 'Training Day Name';
  } else if (trainingDay.scheduledEventRanking !== req.body.scheduledEventRanking) {
    eventData.label = 'Scheduled Event Ranking';
  } else if (trainingDay.estimatedLoad !== req.body.estimatedLoad) {
    eventData.label = 'Estimated Load';
  } else if (trainingDay.eventTerrain !== req.body.eventTerrain) {
    eventData.label = 'Event Terrain';
  } else if (trainingDay.notes !== req.body.notes) {
    eventData.label = 'Training Day Notes';
  } else if (!_.isEqual(trainingDay.completedActivities, req.body.completedActivities)) {
    eventData.label = 'Completed Activities';
  }

  coreUtil.logAnalytics(req, pageData, eventData);

  // If a change was made that would affect current advice, let's recompute.
  // Is not possible in the UI to change event ranking or estimated load of past events.
  if (!_.isEqual(trainingDay.completedActivities, req.body.completedActivities) ||
    trainingDay.scheduledEventRanking !== req.body.scheduledEventRanking ||
    trainingDay.estimatedLoad !== req.body.estimatedLoad ||
    trainingDay.eventTerrain !== req.body.eventTerrain
  ) {
    refreshAdvice = true;
  }

  trainingDay.name = req.body.name;
  trainingDay.scheduledEventRanking = req.body.scheduledEventRanking;
  trainingDay.estimatedLoad = req.body.estimatedLoad;
  trainingDay.eventTerrain = req.body.eventTerrain;
  trainingDay.notes = req.body.notes;
  trainingDay.completedActivities = req.body.completedActivities;
  // trainingEffortFeedback will only come with updated completedActivities.
  trainingDay.trainingEffortFeedback = req.body.trainingEffortFeedback;

  trainingDay.save(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    let user = req.user;

    if (trainingDay.scheduledEventRanking === 1) {
      // We prefer to know terrain for goal events.
      if (trainingDay.eventTerrain) {
        notifications.push({ notificationType: 'terrain', lookup: trainingDay.id });
      } else {
        notifications.push({ notificationType: 'terrain', lookup: trainingDay.id, add: true });
      }

      if (trainingDay.estimatedLoad) {
        notifications.push({ notificationType: 'loadestimate', lookup: trainingDay.id });
      } else {
        notifications.push({ notificationType: 'loadestimate', lookup: trainingDay.id, add: true });
      }
    }

    if (refreshAdvice) {
      userUtil.updateNotifications(user, notifications, true)
        .then(function(response) {
          user = response.user;
          return adviceEngine.refreshAdvice(user, trainingDay);
        })
        .then(function(response) {
          response.trainingDay.user = user;
          return res.json(response.trainingDay);
        })
        .catch(function(err) {
          if (err.message === 'Starting date for current training period was not found.') {
            // Ignore this. Not likely and we will nag them about it in other ways.
            return res.json(trainingDay);
          }

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
  // Rarely will a user be deleting a TD.

  var trainingDay = req.trainingDay,
    user = req.user,
    statusMessage = {};

  let pageData = null;
  let eventData = { category: 'Training Day', action: 'Delete', path: '/api/trainingDays/:trainingDayId/delete' };

  coreUtil.logAnalytics(req, pageData, eventData);
  trainingDay.remove(function(err) {
    if (err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    let notifications = [{ notificationType: 'plangen', lookup: '', add: true }];
    notifications.push({ notificationType: '[[all]]', lookup: trainingDay.id });

    userUtil.updateNotifications(req.user, notifications, true)
      .then(function(response) {
        trainingDay.user = response.user;
        return res.json(trainingDay);
      })
      .catch(function(err) {
        console.log('updateNotifications failed in TD.delete: ', err);
        return res.json(trainingDay);
      });
  });
};

exports.list = function(req, res) {
  //Returns all existing trainingDays.
  //Note that this will include sim clone days so there could be dups for some days.
  var user = req.user;

  let path = '/api/trainingDays/list';
  let pageData = { path: path, title: 'List Training Days' };
  let eventData = { category: 'Training Day', action: 'List', path: path };

  coreUtil.logAnalytics(req, pageData, eventData);

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
    numericToday = parseInt(req.params.todayNumeric, 10),
    numericEffectiveStartDate,
    numericEffectiveGoalDate,
    dates = {},
    notifications = [];

  console.log('My Season active user: ', user.username);

  let path = '/api/trainingDays/getSeason/:todayNumeric';
  let pageData = { path: path };
  // We may decide to not log season page hits because we would get a lot of false positives
  // from season updates and running simulations.
  // Also from redirects from other pages, like getAdvice and profile updates.
  // I guess this is the price we pay from doing it all server-side.
  // Any way to know if previous referrer was season? Always store last referrer in session?
  // I do not like coupling server-side processing to a UI like this though.
  //let pageData = req.headers.referer.includes('calendar') ? { path: path } : null;

  // Let's not log getSeason event as it is not an explicit user action.
  // let eventData = { category: 'Training Day', action: 'Get Season', value: numericToday, path: path };

  // coreUtil.logAnalytics(req, pageData, eventData);
  coreUtil.logAnalytics(req, pageData);

  dbUtil.getStartDay(user, numericToday, function(err, startDay) {
    if (err) {
      console.log('getSeason getStartDay err: ', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    if (startDay) {
      numericEffectiveStartDate = startDay.dateNumeric;
      // This notification should not exist but somehow our notifications are out of sync
      // after the first creation of a start day. Does not happen on subsequent start creations.
      notifications.push({ notificationType: 'start', lookup: '' });
    } else {
      // Set notification.
      console.log('adding start notify: ');
      notifications.push({ notificationType: 'start', lookup: '', add: true });
      numericEffectiveStartDate = coreUtil.toNumericDate(moment(numericToday.toString()).subtract(1, 'day'));
    }

    //Get future goal days to determine end of season.
    dbUtil.getFuturePriorityDays(user, numericToday, 1, adviceConstants.maxDaysToLookAheadForSeasonEnd)
      .then(function(goalDays) {
        if (goalDays.length > 0) {
          // Remove any goal-needed notifications. We should not have to do this but
          // for the first goal created by a user, the notification removal is not persisted.
          // It is removed from the user object and saved but when getSeason is subsequently called,
          // the req.user object passed in has the notification still.
          notifications.push({ notificationType: 'goal', lookup: '' });
          //Use last goal to end season.
          numericEffectiveGoalDate = goalDays[goalDays.length - 1].dateNumeric;
          _.forEach(goalDays, function(goalDay) {
            if (!goalDay.eventTerrain) {
              notifications.push({ notificationType: 'terrain', lookup: goalDay.id, add: true });
            } else {
              // Remove any potentially erroneous terrain notifications. Can occur if user recreates a goal.
              notifications.push({ notificationType: 'terrain', lookup: goalDay.id });
            }
            if (!goalDay.estimatedLoad) {
              notifications.push({ notificationType: 'loadestimate', lookup: goalDay.id, add: true });
            } else {
              notifications.push({ notificationType: 'loadestimate', lookup: goalDay.id });
            }
          });
        } else {
          notifications.push({ notificationType: 'goal', lookup: '', add: true });
          numericEffectiveGoalDate = coreUtil.toNumericDate(moment(numericToday.toString()).add(3, 'months'));
        }

        dbUtil.getTrainingDays(user, numericEffectiveStartDate, numericEffectiveGoalDate, function(err, trainingDays) {
          if (err) {
            console.log('getSeason getTrainingDays err: ', err);
            return res.status(400).send({
              message: errorHandler.getErrorMessage(err)
            });
          } else {
            if (notifications.length > 0) {
              userUtil.updateNotifications(user, notifications, true)
                .then(function(response) {
                  // We will use user in first day to refresh notifications.
                  trainingDays[0].user = response.user;
                  return res.json(trainingDays);
                })
                .catch(function(err) {
                  console.log('updateNotifications failed in TD.getSeason: ', err);
                  return res.json(trainingDays);
                });
            } else {
              return res.json(trainingDays);
            }
          }
        });
      })
      .catch(function(err) {
        console.log('getSeason err: ', err);
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      });
  });
};

exports.getAdvice = function(req, res) {
  var params = {};
  params.user = req.user;
  params.numericDate = parseInt(req.params.trainingDateNumeric, 10);
  params.alternateActivity = req.query.alternateActivity;
  params.selectNewWorkout = JSON.parse(req.query.selectNewWorkout); // Converts string to boolean.
  params.source = params.alternateActivity ? 'requested' : 'advised';

  let path = '/api/trainingDays/getAdvice/:trainingDateNumeric';
  // Do not log page hit if request comes from My Training Day page or Dashboard.
  let pageData = req.headers.referer.includes('getAdvice') ? { path: path, title: 'Get Advice' } : null;
  let eventData = { category: 'Training Day', action: params.alternateActivity ? 'Request Alternative Activity' : 'Get Advice', value: params.numericDate, path: path };

  coreUtil.logAnalytics(req, pageData, eventData);

  adviceEngine.advise(params, function(err, trainingDay) {
    if (err) {
      console.log('getAdvice err: ', err);
      let statusCode = 400;
      let message = errorHandler.getErrorMessage(err);

      if (message === 'Starting date for current training period was not found.') {
        statusCode = 418;
      }

      return res.status(statusCode).send({
        message: message
      });
    } else {
      res.json(trainingDay);
    }
  });
};

exports.refreshAdvice = function(req, res) {
  let numericDate = parseInt(req.params.trainingDateNumeric, 10);
  let selectNewWorkout = JSON.parse(req.query.selectNewWorkout); // Converts string to boolean.

  let path = '/api/trainingDays/refreshAdvice/:trainingDateNumeric';
  // Do not log page hit if request comes from My Training Day page.
  let pageData = { path: path, title: 'Dashboard' };
  let eventData = { category: 'Training Day', action: 'Refresh Advice', value: numericDate, path: path };

  coreUtil.logAnalytics(req, pageData, eventData);

  dbUtil.getTrainingDayDocument(req.user, numericDate)
    .then(function(trainingDay) {
      return adviceEngine.refreshAdvice(req.user, trainingDay, selectNewWorkout);
    })
    .then(function(response) {
      return res.json(response);
    })
    .catch(function(err) {
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
};

exports.getLoadSummary = function(req, res) {
  let numericEndDate = parseInt(req.params.trainingDateNumeric, 10);

  dbUtil.aggregateLoad(req.user, numericEndDate) //, params.metricsType)
    .then(function(results) {
      let aggregation = {
        loadSummary: results
      };
      res.json(aggregation);
    })
    .catch(function(err) {
      console.log('getLoadSummary err: ', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
};

exports.getFutureEvents = function(req, res) {
  // Get all future events including off days.
  var params = {},
    user = req.user,
    numericDate = parseInt(req.params.trainingDateNumeric, 10);

  // let pageData = null;
  // let eventData = { category: 'Training Day', action: params.isSim ? 'Run Sim' : 'Update Plan', value: params.numericDate, path: '/api/trainingDays/genPlan/:trainingDateNumeric' };

  // coreUtil.logAnalytics(req, pageData, eventData);

  dbUtil.getFuturePriorityDays(user, numericDate, null, adviceConstants.maxDaysToLookAheadForFutureGoals)
    .then(function(priorityDays) {
      return res.json(priorityDays);
    })
    .catch(function(err) {
      console.log('getFutureEvents getFuturePriorityDays err: ', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    });
};

exports.genPlan = function(req, res) {
  var params = {};
  params.user = req.user;
  params.numericDate = parseInt(req.params.trainingDateNumeric, 10);
  params.isSim = JSON.parse(req.query.isSim); // Converts string to boolean.

  let pageData = null;
  let eventData = { category: 'Training Day', action: params.isSim ? 'Run Sim' : 'Update Plan', value: params.numericDate, path: '/api/trainingDays/genPlan/:trainingDateNumeric' };

  coreUtil.logAnalytics(req, pageData, eventData);

  let genPlanResponse = null;

  adviceEngine.generatePlan(params)
    .then(function(response) {
      genPlanResponse = response;

      if (params.isSim) {
        // Don't mess with notifications if we are running a sim.
        return Promise.resolve({ user: response.user, saved: false });
      }

      //remove genPlan notification if it exists
      let notifications = [{ notificationType: 'plangen', lookup: '' }];
      return userUtil.updateNotifications(response.user, notifications, true);
    })
    .then(function(response) {
      genPlanResponse.user = response.user;
      res.json(genPlanResponse);
    })
    .catch(function(err) {
      if (!genPlanResponse) {
        console.log('genPlan err: ', err);
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      } else {
        console.log('genPlan updateNotifications err: ', err);
        // Ignore this error, we don't care that much about notifications.
        res.json(genPlanResponse);
      }
    });
};

exports.getSimDay = function(req, res) {
  // We save a clone of TD before returning a what-if day
  // unless a clone already exists.

  var trainingDay = req.trainingDay;

  let pageData = null;
  let eventData = { category: 'Training Day', action: 'Get Sim Day', value: trainingDay.dateNumeric, path: '/api/trainingDays/getSimDay/:trainingDayId' };

  coreUtil.logAnalytics(req, pageData, eventData);

  if (trainingDay.isSimDay) {
    // This day has already been simmed.
    res.json(trainingDay);
  } else {
    dbUtil.makeSimDay(trainingDay, function(err, simDay) {
      if (err) {
        console.log('getSimDay err: ', err);
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
    //Revert Simulation is usually a passive clean-up call when displaying season.
    let pageData = null;
    // let eventData = { category: 'Training Day', action: req.params.commit === 'yes' ? 'Commit Simulation' : 'Revert Simulation', path: '/api/trainingDays/finalizeSim/:commit' };
    let eventData = { category: 'Training Day', action: 'Commit Simulation', path: '/api/trainingDays/finalizeSim/:commit' };

    coreUtil.logAnalytics(req, pageData, eventData);
  }

  if (req.params.commit === 'yes') {
    dbUtil.commitSimulation(req.user, function(err) {
      if (err) {
        console.log('finalizeSim commitSimulation err: ', err);
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      // Remove any plan gen notification that might exist.
      let notifications = [{ notificationType: 'plangen', lookup: '' }];
      userUtil.updateNotifications(req.user, notifications, true)
        .then(function(response) {
          return res.json('Simulation committed');
        })
        .catch(function(err) {
          console.log('finalizeSim - updateNotifications err: ', err);
          return res.json('Simulation committed');
        });
    });
  } else {
    dbUtil.revertSimulation(req.user, function(err) {
      if (err) {
        console.log('finalizeSim revertSimulation err: ', err);
        return res.status(400).send({
          message: errorHandler.getErrorMessage(err)
        });
      }

      return res.json('Simulation reverted');
    });
  }
};

exports.downloadActivities = function(req, res) {
  var trainingDay = req.trainingDay;

  let pageData = null;
  let eventData = { category: 'Training Day', action: 'Download Activities', value: trainingDay.dateNumeric, path: '/api/trainingDays/downloadActivities/:trainingDayId' };

  coreUtil.logAnalytics(req, pageData, eventData);

  if (req.query.provider === 'strava') {
    stravaUtil.downloadActivities(req.user, trainingDay)
      .then(function(response) {
        return res.json(response);
      })
      .catch(function(err) {
        console.log('Strava downloadActivities err: ', err);
        let statusCode = 400;
        let message = errorHandler.getErrorMessage(err);

        if (message === 'Starting date for current training period was not found.') {
          statusCode = 418;
        }

        return res.status(statusCode).send({
          message: message
        });
      });
  }
};

exports.downloadAllActivities = function(req, res) {
  let pageData = null;
  let eventData = { category: 'Training Day', action: 'Download All Activities', path: '/api/trainingDays/downloadAllActivities' };

  coreUtil.logAnalytics(req, pageData, eventData);

  let user = req.user;
  let numericToday = parseInt(req.params.todayNumeric, 10);
  let replaceExisting = JSON.parse(req.query.replaceExisting); // Converts string to boolean.
  let syncResponse = null;

  dbUtil.getStartDay(user, numericToday, function(err, startDay) {
    if (err) {
      console.log('Strava downloadAllActivities getStartDay err: ', err);
      return res.status(400).send({
        message: errorHandler.getErrorMessage(err)
      });
    }

    if (!startDay) {
      return res.status(418).send({
        message: 'A start day is required in order to sync with Strava.'
      });
    }

    let notifications = [];
    // We remove this notification before downloadAll because this is the only way
    // we could find to keep it from reappearing. Stupid notifications.
    notifications.push({ notificationType: 'stravasync', lookup: '' });

    userUtil.updateNotifications(user, notifications, true)
      .then(function(response) {
        let numericLimitDate = coreUtil.toNumericDate(moment(numericToday.toString()).subtract(2, 'months'));
        if (numericLimitDate < startDay.dateNumeric) {
          numericLimitDate = startDay.dateNumeric;
        }

        return stravaUtil.downloadAllActivities(user, numericLimitDate, replaceExisting);
      })
      .then(function(response) {
        syncResponse = response;

        if (syncResponse.activityCount > 0) {
          notifications = [];
          notifications.push({ notificationType: 'plangen', lookup: '', add: true });
          return userUtil.updateNotifications(user, notifications, true);
        } else {
          return Promise.resolve({ user: user });
        }
      })
      .then(function(response) {
        return res.json({ user: response.user, message: syncResponse });
      })
      .catch(function(err) {
        if (syncResponse) {
          return res.json(syncResponse);
        } else {
          console.log('Strava downloadAllActivities err: ', err);
          return res.status(400).send({
            message: errorHandler.getErrorMessage(err)
          });
        }
      });
  });
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
