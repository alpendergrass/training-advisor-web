'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  coreUtil = require(path.resolve('./modules/core/server/lib/util')),
  util = require('./util'),
  dbUtil = require('./db-util'),
  strava = require('strava-v3'),
  err;

var getAccessToken = function(user) {
  // If/until we enable other providers, token will always be in providerData.
  return user.provider === 'strava' ? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;
};

var updateFtpFromStrava = function(user, getRequestedByUser) {
  return new Promise(function(resolve, reject) {
    let response = {
      user: user,
      updated: false
    };

    if ((user.providerData && !user.providerData.premium) || !user.autoUpdateFtpFromStrava && !getRequestedByUser) {
      return resolve(response);
    }

    strava.athlete.get({ 'access_token': getAccessToken(user) }, function(err, payload) {
      if (err) {
        return reject(new Error(`updateFtpFromStrava - strava.athlete.get failed for user: ${user.username}, error: ${err}`));
      }

      if (payload.errors) {
        return reject(new Error(`updateFtpFromStrava - strava.athlete.get returned errors for user: ${user.username}, payload: ${JSON.stringify(payload)}`));
      }

      // We have gotten a few null FTP values from Strava.
      if (!payload.ftp || !Number.isInteger(payload.ftp)) {
        return resolve(response);
      }

      // If getRequestedByUser, let's use the Strava FTP even if same as current FTP.
      if (!user.ftpLog || user.ftpLog.length < 1 || payload.ftp !== user.ftpLog[0].ftp || getRequestedByUser) {
        // With a manual FTP update, we get dateNumeric from client-side and use it to populate date.
        // Imitating that here.
        let today = util.getTodayInUserTimezone(user);
        let ftpDateNumeric = coreUtil.toNumericDate(today, user);
        let ftpDate = moment.tz(ftpDateNumeric.toString(), user.timezone).toDate();

        let newFtp = {
          ftp: payload.ftp,
          ftpDate: ftpDate,
          ftpDateNumeric: ftpDateNumeric,
          ftpSource: 'strava'
        };

        //Sort ftpLog by newest to oldest test date.
        user.ftpLog = _.orderBy(user.ftpLog, 'ftpDate', 'desc');

        // If we download ftp for same date as latest existing, replace existing.
        if (user.ftpLog.length > 0 && user.ftpLog[0].ftpDateNumeric === newFtp.ftpDateNumeric) {
          user.ftpLog[0] = newFtp;
        } else {
          user.ftpLog.push(newFtp);
          user.ftpLog = _.orderBy(user.ftpLog, 'ftpDate', 'desc');
        }

        user.save()
          .then(function(updatedUser) {
            response.user = updatedUser;
            response.updated = true;
            return resolve(response);
          })
          .catch(function(err) {
            return reject(err);
          });
      } else {
        return resolve(response);
      }

    });

  });
};

var getWeightedAverageWatts = function(user, stravaActivity) {
  return new Promise(function(resolve, reject) {
    // We compute weightedAverageWatts rather than use Strava's as I find it gets us closer to the others.
    // 2/8/17: Strava's weighted_average_watts is a lot closer to my computations (and others) than they
    // used to be, beginning 12/10/16 or thereabouts. They must have made a change to their calculations.
    // TODO: consider using stravaActivity.weighted_average_watts if we have power meter wattage if performance becomes an issue.

    let activityTypes;

    // If not stravaActivity.device_watts then this is a ride without a power meter
    // so we will use their estimated power to compute weightedAverageWatts.
    if (stravaActivity.device_watts) {
      activityTypes = 'time,watts';
    } else {
      activityTypes = 'time,watts_calc';
    }

    strava.streams.activity({ 'access_token': getAccessToken(user), 'id': stravaActivity.id, 'types': activityTypes }, function(err, payload) {
      if (err) {
        return reject(new Error(`strava.streams.activity failed. username: ${user.username}, stravaActivity: ${stravaActivity}, err: ${err}`));
      }

      let wattageElement;

      if (stravaActivity.device_watts) {
        wattageElement = _.find(payload, ['type', 'watts']);
      } else {
        wattageElement = _.find(payload, ['type', 'watts_calc']);
      }

      if (_.isUndefined(wattageElement)) {
        return resolve(0);
      }

      let wattageArray = wattageElement.data;

      if (_.isEmpty(wattageArray) || _.isEmpty(wattageArray)) {
        return resolve(0);
      }

      let times = _.find(payload, ['type', 'time']).data;

      // Normalized power formula from Training and Racing With a Power Meter, 2nd edition, pg. 120:
      // 1. Starting at the beginning of the data and calculating a 30-second rolling average for power;
      // 2. Raising the values obtained in step 1 to the 4th power;
      // 3. Taking the average of all the values obtained in step 2; and
      // 4. Taking the fourth root of the number obtained in step 3.

      let duration;
      let accumulatedTime = 0;
      let accumulatedPower = 0;
      let sampleCount = 0;
      let rollingAverages = [];

      for (var i = 1; i < wattageArray.length; i++) {
        // From Stravistix: if not a trainer ride, only use samples where velocity is greater than 3.5 Kph - not sure why.
        // Seems to me that if anything perhaps I should drop zero power recs but the general consensus is to include zeros.
        duration = (times[i] - times[i - 1]);
        accumulatedTime += duration;
        accumulatedPower += wattageArray[i];
        sampleCount++;

        if (accumulatedTime >= 30) {
          rollingAverages.push(Math.pow((accumulatedPower / sampleCount), 4));
          accumulatedTime = 0;
          accumulatedPower = 0;
          sampleCount = 0;
        }
      }

      let rollingAveragesAverage = _.reduce(rollingAverages, function(sum, n) {
        return sum + n;
      }, 0) / rollingAverages.length;

      let weightedAverageWatts = Math.pow(rollingAveragesAverage, 1 / 4);

      resolve(Math.round(weightedAverageWatts));
    });
  });
};

var processActivity = function(stravaActivity, trainingDay, replaceExisting) {
  return new Promise(function(resolve, reject) {
    let newActivity = {};

    if (!stravaActivity.id) {
      // If Strava returns an error page, like when they are down, this will catch that.
      console.log(`No ID for this stravaActivity: ${JSON.stringify(stravaActivity)}`);
      return resolve();
    }

    if (stravaActivity.type !== 'Ride' && stravaActivity.type !== 'VirtualRide') {
      return resolve();
    }

    if ((!replaceExisting && _.find(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString() })) ||
      (replaceExisting && _.find(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString(), 'edited': true }))) {
      // We have already processed this stravaActivity.
      return resolve();
    }

    if (replaceExisting) {
      let removeThese = _.filter(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString(), 'edited': false });
      _.forEach(removeThese, function(removeThis) {
        trainingDay.completedActivities.pull(removeThis.id);
      });
    }

    getWeightedAverageWatts(trainingDay.user, stravaActivity)
      .then(function(weightedAverageWatts) {
        if (!weightedAverageWatts && !stravaActivity.suffer_score) {
          // console.log(`stravaUtil.getAverageWatts returned no watttage for user: ${trainingDay.user.username} and suffer_score is not provided, payload: ${JSON.stringify(stravaActivity)}`);
          return resolve();
        }

        if ((!weightedAverageWatts || (!stravaActivity.device_watts && trainingDay.user.favorSufferScoreOverEstimatedPower)) && stravaActivity.suffer_score) {
          // If we did not compute weightedAverageWatts, or
          // if we used estimated wattage to compute weightedAverageWatts and the user would rather we use suffer score,
          // we will use suffer score as training load.
          newActivity.load = stravaActivity.suffer_score;
          newActivity.loadIsSufferScore = true;
        } else {
          if (trainingDay.user.ftpLog.length < 1) {
            return reject(new Error(`user ftp is not set, strava activity processing aborted. username: ${trainingDay.user.username}. stravaActivity.id: ${stravaActivity.id.toString()}`));
          }

          let ftp = util.getFTP(trainingDay.user, trainingDay.dateNumeric);

          // IF = NP/FTP
          newActivity.intensity = Math.round((weightedAverageWatts / ftp) * 100) / 100;

          // TSS = [(s x W x IF) / (FTP x 3600)] x 100
          // where s is duration in seconds, W is Normalized Power in watts, IF is Intensity Factor, FTP is FTP and 3.600 is number of seconds in 1 hour.
          newActivity.load = Math.round(((stravaActivity.moving_time * weightedAverageWatts * newActivity.intensity) / (ftp * 3600)) * 100);

          if (!isFinite(newActivity.intensity) || !isFinite(newActivity.load)) {
            return reject(new Error(`load or intensity calculated to Infinity, strava activity processing aborted. username: ${trainingDay.user.username}. stravaActivity.id: ${stravaActivity.id.toString()}`));
          }

          if (!stravaActivity.device_watts) {
            newActivity.loadIsFromEstimatedPower = true;
          }
        }

        newActivity.elevationGain = stravaActivity.total_elevation_gain; // in meters
        newActivity.source = 'strava';
        newActivity.sourceID = stravaActivity.id;
        newActivity.name = stravaActivity.name;
        newActivity.notes = stravaActivity.name;
        trainingDay.completedActivities.push(newActivity);

        return resolve(trainingDay);
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};

var downloadOneOfAll = function(user, activity, replaceExisting, startDateNumeric) {
  let processed = false;

  return new Promise(function(resolve, reject) {
    // activity.start_date_local is formatted as UTC but is a local time: 2016-09-29T10:17:15Z
    let numericDate = coreUtil.toNumericDate(activity.start_date_local);
    return dbUtil.getTrainingDayDocument(user, numericDate)
      .then(function(trainingDay) {
        return processActivity(activity, trainingDay, replaceExisting);
      })
      .then(function(processedTrainingDay) {
        if (processedTrainingDay) {
          processed = true;
          return processedTrainingDay.save();
        }

        return;
      })
      .then(function(savedTrainingDay) {
        if (savedTrainingDay) {
          if (savedTrainingDay.dateNumeric < startDateNumeric) {
            // It's possible we got activities for the day prior to our start data - timezone caution.
            return;
          }

          // RefreshAdvice to ensure metrics are up to date thru tomorrow.
          // TODO: couldn't we just do this once? Call it for the last day processed? Or just updateMetrics?
          return adviceEngine.refreshAdvice(user, savedTrainingDay);
        }
      })
      .then(() => {
        return resolve(processed);
      })
      .catch(err => {
        return reject(err);
      });
  });
};

module.exports = {};

module.exports.getFTP = function(user) {
  return new Promise(function(resolve, reject) {
    updateFtpFromStrava(user, true)
      .then(response => {
        return resolve(response);
      })
      .catch(err => {
        return reject(err);
      });
  });
};


module.exports.fetchActivity = function(user, activityId) {
  return new Promise(function(resolve, reject) {
    console.log('Fetching Strava activity: ', activityId);
    strava.activities.get({ 'access_token': getAccessToken(user), 'id': activityId }, function(err, payload) {
      if (err) {
        return reject(new Error(`strava.activities.get access failed. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
      }

      if (payload.errors) {
        return reject(new Error(`strava.activities.get access returned errors. username: ${user.username}, activityId: ${activityId}, message: ${payload.message}, errors: ${JSON.stringify(payload.errors)}`));
      }

      let numericDate = coreUtil.toNumericDate(payload.start_date_local);

      updateFtpFromStrava(user)
        .then(function(response) {
          return dbUtil.getTrainingDayDocument(response.user, numericDate);
        })
        .then(function(trainingDay) {
          return processActivity(payload, trainingDay);
        })
        .catch(function(err) {
          return reject(err);
        })
        .then(function(trainingDay) {
          if (!trainingDay) {
            // Was resolving here which returned to caller but...
            // .thens below were still running.
            // Apparently I cannot resolve out of the middle of a chain of thens.
            return;
          }

          return trainingDay.save();
        })
        .then(function(trainingDay) {
          if (trainingDay) {
            return adviceEngine.refreshAdvice(user, trainingDay);
          }

          return;
        })
        .then(function(response) {
          // We return trainingDay mainly to aid testing.
          if (response) {
            return resolve(response.trainingDay);
          }

          return resolve();
        })
        .catch(function(err) {
          console.log('fetchActivity rejecting: ', err);
          return reject(new Error(`Strava fetchActivity failed. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
        });
    });
  });
};

module.exports.downloadActivities = function(user, trainingDay) {
  return new Promise(function(resolve, reject) {
    // We need to subtract one day for our search start to make sure we get current day in Australia - it's a time zone thing, of course.
    var searchDate = moment(trainingDay.dateNumeric.toString()).subtract(1, 'day').unix(),
      activityCount = 0,
      countPhrase = '',
      statusMessage = {
        type: '',
        text: '',
        title: 'Strava Download',
        created: Date.now(),
        username: user.username
      },
      params = {};

    console.log('Strava: Initiating downloadActivities for TacitTraining user: ', user.username);

    updateFtpFromStrava(user)
      .then(function(response) {
        let user = response.user;
        // trainingDay.user = user;
        // Retrieve activities from strava.
        // By default only first 30 activities will be returned.
        strava.athlete.listActivities({ 'access_token': getAccessToken(user), 'after': searchDate }, function(err, payload) {
          if (err) {
            return reject(new Error(`strava.athlete.listActivities failed for user: ${user.username}, error: ${err}`));
          }

          if (payload.errors) {
            return reject(new Error(`strava.athlete.listActivities returned errors for user: ${user.username}, payload: ${JSON.stringify(payload)}`));
          }

          if (payload.length < 1) {
            statusMessage.text = 'We found no Strava activities for the day.';
            statusMessage.type = 'info';
            trainingDay.lastStatus = statusMessage;
            return resolve(trainingDay);
          }

          if (!Array.isArray(payload)) {
            // If Strava is down we may get an error page here.
            let errorMsg = 'Strava appears to be down. Please try your download again later.';
            return reject(new Error(errorMsg));
          }

          // Processing sequentially to prevent versionError here.
          payload.reduce(function(promise, stravaActivity) {
            return promise.then(function() {
              var numericStartDateLocal = coreUtil.toNumericDate(stravaActivity.start_date_local);

              if (numericStartDateLocal === trainingDay.dateNumeric) {
                return processActivity(stravaActivity, trainingDay)
                  .then(function(processedTrainingDay) {
                    if (processedTrainingDay) {
                      activityCount++;
                    }

                    return;
                  });
              } else {
                return;
              }
            });
          }, Promise.resolve(false)) // Resolved promise is initial value passed into payload.reduce().
            .then(function(results) {
              if (activityCount < 1) {
                statusMessage.text = 'We found no new Strava activities for the day.';
                statusMessage.type = 'info';
                trainingDay.lastStatus = statusMessage;
                return trainingDay;
              }

              if (activityCount > 1) {
                countPhrase = activityCount + ' new Strava activities';
              } else {
                countPhrase = 'one new Strava activity';
              }

              return trainingDay.save();
            })
            .then(function(savedTrainingDay) {
              if (activityCount < 1) {
                return { trainingDay: savedTrainingDay };
              }

              return adviceEngine.refreshAdvice(user, savedTrainingDay);
            })
            .then(function(response) {
              if (activityCount > 0) {
                statusMessage.text = 'We downloaded ' + countPhrase + '.';
                statusMessage.type = 'success';
                response.trainingDay.lastStatus = statusMessage;
              }
              return resolve(response.trainingDay);
            })
            .catch(function(err) {
              return reject(err);
            });
        });
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};

module.exports.downloadAllActivities = function(user, startDateNumeric, replaceExisting) {
  return new Promise(function(resolve, reject) {
    let searchDate = moment(startDateNumeric.toString()).unix(),
      activityCount = 0,
      countPhrase = '',
      statusMessage = {
        type: '',
        text: '',
        title: 'Strava Sync',
        created: Date.now(),
        username: user.username,
        activityCount: 0
      },
      params = {};

    console.log('Strava: Initiating downloadAllActivities for TacitTraining user: ', user.username);

    updateFtpFromStrava(user)
      .then(function(response) {
        let user = response.user;
        // Retrieve activities from strava.
        // By default only first 30 activities will be returned. You can use the `per_page` parameter to return up to 200.
        strava.athlete.listActivities({ 'access_token': getAccessToken(user), 'after': searchDate, 'per_page': 200 }, function(err, payload) {
          if (err) {
            let errorMsg = `downloadAllActivities - strava.athlete.listActivities failed for user: ${user.username}, error: ${err}`;
            return reject(new Error(errorMsg));
          }

          if (payload.errors) {
            let errorMsg = `downloadAllActivities - strava.athlete.listActivities returned errors for user: ${user.username}, payload.message: ${payload.message}, payload: ${JSON.stringify(payload)}`;
            return reject(new Error(errorMsg));
          }

          // console.log('Strava downloadAllActivities: activities returned: ' + payload.length);

          if (payload.length < 1) {
            statusMessage.text = 'No Strava activities were returned.';
            statusMessage.type = 'info';
            return resolve(statusMessage);
          }

          if (!Array.isArray(payload)) {
            // If Strava is down we may get an error page here.
            let errorMsg = 'Strava appears to be down. Please try your sync again later.';
            return reject(new Error(errorMsg));
          }

          // We are using reduce function here to process each activity sequentially.
          // Using Promise.all we had trainingDay save collisions.
          payload.reduce(function(promise, stravaActivity) {
            return promise.then(function() {
              return downloadOneOfAll(user, stravaActivity, replaceExisting, startDateNumeric)
                .then(processed => {
                  if (processed) {
                    activityCount++;
                  }

                  return;
                });
            });
          }, Promise.resolve()) // Resolved promise is initial value passed into payload.reduce().
            .then(function() {
              statusMessage.activityCount = activityCount;

              if (activityCount < 1) {
                statusMessage.text = 'No Strava activities are missing from Tacit Training.';
                statusMessage.type = 'info';
                return resolve(statusMessage);
              }

              if (activityCount > 1) {
                countPhrase = activityCount + ' Strava activities';
              } else {
                countPhrase = 'one Strava activity';
              }

              statusMessage.text = 'We downloaded ' + countPhrase + '.';
              statusMessage.type = 'success';
              return resolve(statusMessage);
            })
            .catch(function(err) {
              return reject(err);
            });
        });
      })
      .catch(function(err) {
        return reject(err);
      });
  });
};
