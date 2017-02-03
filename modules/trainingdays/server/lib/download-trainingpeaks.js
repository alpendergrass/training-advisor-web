'use strict';

// Module dependencies.
var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  async = require('async'),
  soap = require('soap'),
  util = require('./util'),
  dbUtil = require('./db-util'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  userUtil = require(path.resolve('./modules/users/server/lib/user-util'));


// Globals
var url = 'http://www.trainingpeaks.com/tpwebservices/service.asmx?WSDL',
  activityCount,
  statusMessage = {
    type: '',
    text: '',
    title: 'TrainingPeaks Download',
    created: null,
    username: ''
  },
  offlineMode,
  err,
  individualUserErrors;

module.exports = {};

module.exports.batchDownloadActivities = function(callback) {
  offlineMode = true;
  individualUserErrors = [];

  userUtil.getTrainingPeaksAutoDownloadUsers(function(err, users) {
    if (err) {
      return callback(err, null);
    }

    if (users.length < 1) {
      return callback(null, individualUserErrors);
    }

    soap.createClient(url, function(err, client) {
      if (err) {
        statusMessage.text = 'TrainingPeaks access failed - createClient: ' + (err.msg || '');
        statusMessage.type = 'error';
        logStatus();
        return callback(err, null);
      }

      async.each(users, function(user, callback) {
        activityCount = 0;
        statusMessage.username = user.username;
        //By passing null for trainingDay below we cause trainingDays to be retrieved as needed.
        async.waterfall([
          async.apply(getAthlete, user, null, client),
          getWorkouts,
          processWorkouts
        ],
          function(err, user, trainingDay) {
            if (err) {
              logStatus();
              individualUserErrors.push(err);
              return callback();
            } else if (activityCount < 1) {
              if (statusMessage.text === '') {
                statusMessage.text = 'We found no new TrainingPeaks workouts for the user.';
                statusMessage.type = 'info';
              }

              logStatus();
              return callback();
            } else {
              //trainingDay should be the last day for which workouts were downloaded.
              adviceEngine.refreshAdvice(user, trainingDay)
                .then(function(trainingDay) {
                  statusMessage.text = 'We downloaded ' + activityCount + ' new TrainingPeaks workouts.';
                  statusMessage.type = 'success';
                  logStatus();
                  return callback();
                })
                .catch(function(err) {
                  statusMessage.text = 'We downloaded ' + activityCount + ' new TrainingPeaks workouts but encountered an error when we tried to update metrics.';
                  statusMessage.type = 'warning';
                  logStatus();
                  individualUserErrors.push(err);
                  return callback();
                });
            }
          }
        );
      }, function(err) {
        if (individualUserErrors.length > 0) {
          console.log('TrainingPeaks: individualUserErrors: ' + individualUserErrors);
        }
        return callback(null, individualUserErrors);
      });
    });
  });
};

function logStatus() {
  console.log('TrainingPeaks: batch download: ' + JSON.stringify(statusMessage));
}

module.exports.downloadActivities = function(user, trainingDay, callback) {
  //This method is called for download initiated from the UI.
  offlineMode = false;
  activityCount = 0;
  statusMessage.type = '';
  statusMessage.text = '';
  statusMessage.created = Date.now();
  statusMessage.username = user.username;

  console.log('TrainingPeaks: Initiating downloadActivities for TacitTraining user: ', user.username);

  soap.createClient(url, function(err, client) {
    if (err) {
      // statusMessage.text = 'TrainingPeaks access failed - createClient: ' + (err.msg || '');
      // statusMessage.type = 'error';
      // dbUtil.sendMessageToUser(statusMessage, user);
      return callback(new Error('TrainingPeaks access failed - createClient: ' + (err.msg || '')), null);
    }

    async.waterfall([
      async.apply(getAthlete, user, trainingDay, client),
      getWorkouts,
      processWorkouts
    ],
      function(err, user, trainingDay) {
        var countPhrase = '';

        if (err) {
          // dbUtil.sendMessageToUser(statusMessage, user);
          return callback(new Error(statusMessage.text), null);
        }

        if (activityCount < 1) {
          if (statusMessage.text === '') {
            statusMessage.text = 'We found no new TrainingPeaks workouts for the day.';
            statusMessage.type = 'info';
          }
          // dbUtil.sendMessageToUser(statusMessage, user);
          trainingDay.lastStatus = statusMessage;
          return callback(null, trainingDay);
        }

        if (activityCount > 1) {
          countPhrase = activityCount + ' new TrainingPeaks workouts';
        } else {
          countPhrase = 'one new TrainingPeaks workout';
        }

        trainingDay.save(function(err) {
          if (err) {
            // statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to save the data.';
            // statusMessage.type = 'error';
            // dbUtil.sendMessageToUser(statusMessage, user);
            return callback(new Error('We downloaded ' + countPhrase + ' but encountered an error when we tried to save the data.'), null);
          }

          //refreshAdvice as completedActivities likely has changed.
          adviceEngine.refreshAdvice(user, trainingDay)
            .then(function(trainingDay) {
              statusMessage.text = 'We downloaded ' + countPhrase + '.';
              statusMessage.type = 'success';
              // dbUtil.sendMessageToUser(statusMessage, user);
              trainingDay.lastStatus = statusMessage;
              return callback(null, trainingDay);
            })
            .catch(function(err) {
              statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to update your training metrics.';
              statusMessage.type = 'warning';
              // dbUtil.sendMessageToUser(statusMessage, user);
              trainingDay.lastStatus = statusMessage;
              return callback(null, trainingDay);
            });
        });
      }
    );
  });
};

function getAthlete(user, trainingDay, client, callback) {
  var args = {
    username: user.trainingPeaksCredentials.username,
    password: user.trainingPeaksCredentials.password,
    types: user.trainingPeaksCredentials.accountType
  };

  client.GetAccessibleAthletes(args, function(err, payload) {
    if (err) {
      console.log('TrainingPeaks: access failed for ' + args.username + ' - GetAccessibleAthletes: ' + (err.message || ''));
      statusMessage.username = user.username;
      statusMessage.text = 'TrainingPeaks access failed - ' + (err.message || '');
      statusMessage.type = 'error';
      return callback(err, user, null, null, null);
    }

    if (payload) {
      if (payload.GetAccessibleAthletesResult && payload.GetAccessibleAthletesResult.PersonBase) {
        console.log('TrainingPeaks: athletes returned: ' + payload.GetAccessibleAthletesResult.PersonBase.length);
        console.log('TrainingPeaks: payload.GetAccessibleAthletesResult.PersonBase[0].PersonId: ' + payload.GetAccessibleAthletesResult.PersonBase[0].PersonId);
        return callback(null, user, trainingDay, client, payload.GetAccessibleAthletesResult.PersonBase[0].PersonId);
      } else {
        console.log('TrainingPeaks: access failed for ' + args.username + ' - GetAccessibleAthletes: suspected invalid account type.');
        statusMessage.username = user.username;
        statusMessage.text = 'You must be a premium member to download from TrainingPeaks. Please check account type in your profile.';
        statusMessage.type = 'error';
        return callback(null, user, trainingDay, null, null);
      }
    }

    console.log('TrainingPeaks: No athletes returned for user ' + args.username + ' with account type of ' + args.types);
    statusMessage.text = 'No TrainingPeaks athletes returned for user ' + args.username + ' with account type of ' + args.types;
    statusMessage.type = 'error';
    return callback(null, user, trainingDay, null, null);
  });
}

function getWorkouts(user, trainingDay, client, personId, callback) {
  var args = {},
    startDate,
    endDate;

  if (!personId) {
    //Previous method did not find an athlete.
    return callback(null, user, trainingDay, null, null, null);
  }

  if (trainingDay) {
    //Get workouts for the day.
    startDate = moment(trainingDay.dateNumeric.toString()).format('YYYY-MM-DD');
    endDate = startDate;
  } else {
    //Get all workouts for the last TPAutoDownloadLookbackNumberOfDays days.
    //Trello: Do not download workouts prior to start day.
    startDate = moment().subtract(adviceConstants.TPAutoDownloadLookbackNumberOfDays, 'days').format('YYYY-MM-DD');
    endDate = moment().format('YYYY-MM-DD');
  }

  args = {
    username: user.trainingPeaksCredentials.username,
    password: user.trainingPeaksCredentials.password,
    personId: personId,
    startDate: startDate,
    endDate: endDate
  };

  client.GetWorkoutsForAccessibleAthlete(args, function(err, payload) {
    if (err) {
      statusMessage.text = 'TrainingPeaks access failed - GetWorkoutsForAccessibleAthlete: ' + (err.msg || '');
      statusMessage.type = 'error';
      return callback(err, user, null, null, null, null);
    }

    if (payload && payload.GetWorkoutsForAccessibleAthleteResult && payload.GetWorkoutsForAccessibleAthleteResult.Workout && payload.GetWorkoutsForAccessibleAthleteResult.Workout.length > 0) {
      console.log('TrainingPeaks: workouts returned: ' + payload.GetWorkoutsForAccessibleAthleteResult.Workout.length);
      return callback(null, user, trainingDay, client, personId, payload.GetWorkoutsForAccessibleAthleteResult.Workout);
    }

    console.log('TrainingPeaks: No workouts returned for user ' + args.username + ' with personId of ' + personId);
    statusMessage.text = 'We found no TrainingPeaks workouts for the day.';
    statusMessage.type = 'info';
    return callback(null, user, trainingDay, null, null, null);
  });
}

function processWorkouts(user, trainingDay, client, personId, workouts, callback) {
  var args = {},
    trainingDate,
    offset,
    timezone = user.timezone || 'America/New_York';

  if (!workouts) {
    //Previous method did not find any workouts.
    return callback(null, user, trainingDay);
  }

  async.eachSeries(workouts,
    function(workout, callback) {
      args = {
        username: user.trainingPeaksCredentials.username,
        password: user.trainingPeaksCredentials.password,
        personId: personId,
        workoutId: workout.WorkoutId
      };

      if (offlineMode) {
        //We are possibly processing workouts for multiple days and we need to get trainingDay for each workout.
        //TP returns local dates but calls them UTC. We fix that here.
        trainingDate = moment.utc(workout.WorkoutDay).format(); //2016-07-23T09:36:05Z
        trainingDate = trainingDate.substring(0, trainingDate.length - 1); // 2016-07-23T09:36:05
        offset = moment.tz(workout.WorkoutDay, timezone).format('Z'); //-06:00
        trainingDate = trainingDate + offset; //2016-07-23T09:36:05-06:00

        dbUtil.getTrainingDayDocument(user, util.toNumericDate(trainingDate))
          .then(function(retrievedTrainingDay) {
            trainingDay = retrievedTrainingDay;

            processWorkout(client, args, trainingDay, function(err) {
              if (err) {
                return callback(err);
              }

              trainingDay.save(function(err) {
                if (err) {
                  statusMessage.text = 'We processed workoutId ' + workout.WorkoutId + ' but encountered an error when we tried to save the data.';
                  statusMessage.type = 'error';
                  return callback(err);
                }

                let params = {
                  user: user,
                  numericDate: trainingDay.dateNumeric,
                  metricsType: 'actual'
                };

                adviceMetrics.updateMetrics(params, function(err) {
                  if (err) {
                    statusMessage.text = 'We processed workoutId ' + workout.WorkoutId + ' but encountered an error when we tried to updateMetrics for ' + trainingDay.dateNumeric + '.';
                    statusMessage.type = 'error';
                    return callback(err);
                  }

                  return callback();
                });
              });
            });
          })
          .catch(function(err) {
            statusMessage.text = 'TrainingPeaks download failed - getTrainingDayDocument returned error: ' + (err.msg || '');
            statusMessage.type = 'error';
            return callback(err);
          });
      } else {
        processWorkout(client, args, trainingDay, function(err) {
          //err will be null if processWorkout is successful.
          return callback(err);
        });
      }
    },
    function(err) {
      if (err) {
        return callback(err, user, null);
      }

      return callback(null, user, trainingDay);
    }
  );
}

function processWorkout(client, args, trainingDay, callback) {
  var newActivity = {};

  if (_.find(trainingDay.completedActivities, { 'sourceID': args.workoutId.toString() })) {
    console.log('===> TrainingPeaks: Workout ' + args.workoutId + ' has been previously downloaded.');
    callback();
  } else {
    client.GetExtendedWorkoutDataForAccessibleAthlete(args, function(err, payload) {
      if (err) {
        statusMessage.text = 'TrainingPeaks access failed - GetExtendedWorkoutDataForAccessibleAthlete: ' + (err.msg || '');
        statusMessage.type = 'error';
        return callback(err);
      }

      if (payload && payload.GetExtendedWorkoutDataForAccessibleAthleteResult && payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx && payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout) {
        console.log('===> TrainingPeaks: We found a keeper for TP username ', args.username);
        console.log('TrainingPeaks: workout ' + args.workoutId + ' returned. Timestamp: ' + payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.time);
        activityCount++;
        newActivity.source = 'trainingpeaks';
        newActivity.sourceID = args.workoutId;
        newActivity.name = payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.title;
        newActivity.load = Math.round(payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.summarydata.tss);
        // intensity = Math.round((fudgedNP / trainingDay.user.thresholdPower) * 100) / 100;
        newActivity.notes = payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.title ? payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.title : 'Timestamp: ' + payload.GetExtendedWorkoutDataForAccessibleAthleteResult.pwx.workout.time;
        trainingDay.completedActivities.push(newActivity);
        newActivity = {};
        callback();
      } else {
        console.log('TrainingPeaks: No workout data returned for username ' + args.username + ' with workoutId ' + args.workoutId);
        statusMessage.text = 'No TrainingPeaks workout data returned for user ' + args.username + ' with workoutId of ' + args.workoutId;
        statusMessage.type = 'error';
        return callback(new Error('No TrainingPeaks workout data returned for user ' + args.username + ' with workoutId of ' + args.workoutId));
      }

    });
  }

}
