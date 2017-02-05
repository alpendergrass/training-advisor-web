'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  adviceEngine = require(path.resolve('./modules/advisor/server/lib/advice-engine')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  util = require('./util'),
  dbUtil = require('./db-util'),
  strava = require('strava-v3'),
  err;

var getAccessToken = function(user) {
  // If/until we enable other providers, token will always be in providerData.
  return user.provider === 'strava' ? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;
};

var getWeightedAverageWatts = function(user, stravaActivity) {
  return new Promise(function(resolve, reject) {
    // We compute weightedAverageWatts rather than use Strava's as I find it gets us closer to the others.
    // If stravaActivity.weighted_average_watts is undefined then this is a ride without a power meter
    // so we will use their estimated power to compute weightedAverageWatts.

    let activityTypes;

    if (stravaActivity.device_watts) {
      activityTypes = 'time,watts';
    } else {
      activityTypes = 'time,watts_calc';
    }
    // average_watts is based on estimated wattage if weighted_average_watts is not present.
    // Need to get stream and compute weighted_average_watts.
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

var processActivity = function(stravaActivity, trainingDay) {
  return new Promise(function(resolve, reject) {
    let newActivity = {};

    if (!trainingDay.user.thresholdPower) {
      reject(new Error(`user.thresholdPower is not set, strava activity processing aborted. username: ${trainingDay.user.username}. stravaActivity.id: ${stravaActivity.id.toString()}`));
    }

    if (!stravaActivity.id) {
      // Not sure why but I added this check at some point.
      console.log(`No ID for this stravaActivity: ${JSON.stringify(stravaActivity)}`);
      return resolve();
    }

    if (_.find(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString() })) {
      // We have already processed this stravaActivity.
      return resolve();
    }

    getWeightedAverageWatts(trainingDay.user, stravaActivity)
      .then(function(weightedAverageWatts) {
        if (!weightedAverageWatts && !stravaActivity.suffer_score) {
          console.log(`stravaUtil.getAverageWatts returned no watttage for user: ${trainingDay.user.username} and suffer_score is not provided, payload: ${JSON.stringify(stravaActivity)}`);
          return resolve(false);
        }

        if ((!weightedAverageWatts || (!stravaActivity.device_watts && trainingDay.user.favorSufferScoreOverEstimatedPower)) && stravaActivity.suffer_score) {
          // If we did not compute weightedAverageWatts, or
          // if we used estimated wattage to compute weightedAverageWatts and the user would rather we use suffer score,
          // we will use suffer score as training load.
          newActivity.load = stravaActivity.suffer_score;
          newActivity.loadIsSufferScore = true;
        } else {
          // IF = NP/FTP
          newActivity.intensity = Math.round((weightedAverageWatts / trainingDay.user.thresholdPower) * 100) / 100;

          // TSS = [(s x W x IF) / (FTP x 3600)] x 100
          // where s is duration in seconds, W is Normalized Power in watts, IF is Intensity Factor, FTP is FTP and 3.600 is number of seconds in 1 hour.
          newActivity.load = Math.round(((stravaActivity.moving_time * weightedAverageWatts * newActivity.intensity) / (trainingDay.user.thresholdPower * 3600)) * 100);

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

module.exports = {};

module.exports.fetchActivity = function(user, activityId) {
  // We return trainingDay if we did something mainly to aid testing.
  return new Promise(function(resolve, reject) {
    strava.activities.get({ 'access_token': getAccessToken(user), 'id': activityId }, function(err, payload) {
      if (err) {
        return reject(new Error(`strava.activities.get access failed. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
      }

      if (payload.errors) {
        return reject(new Error(`strava.activities.get access returned errors. username: ${user.username}, activityId: ${activityId}, message: ${payload.message}, errors: ${JSON.stringify(payload.errors)}`));
      }

      let numericDate = util.toNumericDate(payload.start_date_local);

      dbUtil.getTrainingDayDocument(user, numericDate)
        .then(function(trainingDay) {
          return processActivity(payload, trainingDay);
        })
        .catch(function(err) {
          return reject(err);
        })
        .then(function(trainingDay) {
          if (!trainingDay) {
            return resolve();
          }

          return trainingDay.save();
        })
        .then(function(trainingDay) {
          return adviceEngine.refreshAdvice(user, trainingDay);
        })
        .then(function(trainingDay) {
          return resolve(trainingDay);
        })
        .catch(function(err) {
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

      Promise.all(payload.map(function(stravaActivity) {
        // stravaActivity.start_date_local is formatted as UTC but is a local time: 2016-09-29T10:17:15Z
        var numericStartDateLocal = util.toNumericDate(stravaActivity.start_date_local);

        if (numericStartDateLocal === trainingDay.dateNumeric) {
          return processActivity(stravaActivity, trainingDay)
            .then(function(processedTrainingDay) {
              if (processedTrainingDay) {
                activityCount++;
                return Promise.resolve('processed');
              }

              return Promise.resolve('notProcessed');
            });
        } else {
          return Promise.resolve('notProcessed');
        }
      }))
        .then(function(results) {
          if (activityCount < 1) {
            statusMessage.text = 'We found no new Strava activities for the day. Note that activities without power data are not downloaded.';
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
            return savedTrainingDay;
          }

          return adviceEngine.refreshAdvice(user, savedTrainingDay);
        })
        .then(function(updatedTrainingDay) {
          if (activityCount > 0) {
            statusMessage.text = 'We downloaded ' + countPhrase + '.';
            statusMessage.type = 'success';
            updatedTrainingDay.lastStatus = statusMessage;
          }
          return resolve(updatedTrainingDay);
        })
        .catch(function(err) {
          return reject(err);
        });
    });
  });
};

module.exports.downloadAllActivities = function(user, startDateNumeric) {
  // We need to subtract one day for our search start to make sure we get current day in Australia - it's a time zone thing, of course.
  return new Promise(function(resolve, reject) {
    let searchDate = moment(startDateNumeric.toString()).subtract(1, 'day').unix(),
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

    console.log('Strava: Initiating downloadAllActivities for TacitTraining user: ', user.username);

    // Retrieve activities from strava.
    // By default only first 30 activities will be returned. You can use the `per_page` parameter to return up to 200.
    strava.athlete.listActivities({ 'access_token': getAccessToken(user), 'after': searchDate, 'per_page': 200 }, function(err, payload) {
      if (err) {
        let errorMsg = `downloadAllActivities - strava.athlete.listActivities failed for user: ${user.username}, error: ${err}`;
        console.log(errorMsg);
        return reject(new Error(errorMsg));
      }

      if (payload.errors) {
        let errorMsg = `downloadAllActivities - strava.athlete.listActivities returned errors for user: ${user.username}, payload.message: ${payload.message}, payload: ${JSON.stringify(payload)}`;
        console.log(errorMsg);
        return reject(new Error(errorMsg));
      }

      console.log('Strava downloadAllActivities: activities returned: ' + payload.length);

      if (payload.length < 1) {
        return resolve(0);
      }

      return Promise.all(payload.map(function(stravaActivity) {
        // Do I need to be worried about concurrency here? What if I need to process two activities for the same day?
        // Might one step on the other when I save?

        // stravaActivity.start_date_local is formatted as UTC but is a local time: 2016-09-29T10:17:15Z
        let numericDate = util.toNumericDate(stravaActivity.start_date_local);

        dbUtil.getTrainingDayDocument(user, numericDate)
          .then(function(trainingDay) {
            return processActivity(stravaActivity, trainingDay);
          })
          .then(function(processedTrainingDay) {
            if (processedTrainingDay) {
              console.log('===> Strava: We found a keeper for user ', user.username);
              activityCount++;
              return processedTrainingDay.save();
            }

            return Promise.resolve(true);
          })
          .catch(function(err) {
            let errorMsg = `downloadAllActivities trainingDay.save failed for user: ${user.username}, error: ${err}`;
            console.log('errorMsg: ', errorMsg);
            throw (errorMsg);
          });
      }))
        .then(function(results) {
          if (activityCount < 1) {
            console.log('No new Strava activities.');
            statusMessage.text = 'We found no new Strava activities. Note that activities without power data are not downloaded.';
            statusMessage.type = 'info';
            return resolve(statusMessage);
          }

          if (activityCount > 1) {
            countPhrase = activityCount + ' new Strava activities';
          } else {
            countPhrase = 'one new Strava activity';
          }

          statusMessage.text = 'We downloaded ' + countPhrase + '.';
          statusMessage.type = 'success';
          return resolve(statusMessage);

          //refreshAdvice as completedActivities likely has changed.
          // adviceEngine.refreshAdvice(user, trainingDay)
          //   .then(function(updatedTrainingDay) {
          //     statusMessage.text = 'We downloaded ' + countPhrase + '.';
          //     statusMessage.type = 'success';
          //     updatedTrainingDay.lastStatus = statusMessage;
          //     return callback(null, updatedTrainingDay);
          //   })
          //   .catch(function(err) {
          //     console.log('Strava: downloadActivities refreshAdvice err: ', err);
          //     statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to update your training advice.';
          //     statusMessage.type = 'warning';
          //     trainingDay.lastStatus = statusMessage;
          //     return callback(null, trainingDay);
          //   });
        })
        .catch(function(err) {
          return reject(err);
        });
    });
  });
};
