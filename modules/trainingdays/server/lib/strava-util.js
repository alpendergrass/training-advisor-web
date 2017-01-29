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
  return user.provider ==='strava' ? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;
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
        return reject(new Error(`strava.streams.activity failed. username: ${user.username}, activityId: ${stravaActivity.id}, err: ${err}`));
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

      let weightedAverageWatts = Math.pow(rollingAveragesAverage, 1/4);

      resolve(Math.round(weightedAverageWatts));
    });
  });
};

var processActivity = function(stravaActivity, trainingDay) {
  return new Promise(function(resolve, reject) {
    let newActivity = {};

    if (!trainingDay.user.thresholdPower) {
      console.log(`user.thresholdPower is not set, strava activity processing aborted. username: ${trainingDay.user.username}. stravaActivity.id: ${stravaActivity.id.toString()}`);
      reject(new Error(`user.thresholdPower is not set, strava activity processing aborted. username: ${trainingDay.user.username}. stravaActivity.id: ${stravaActivity.id.toString()}`));
    }

    if (_.find(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString() })) {
      // We have already processed this stravaActivity.
      console.log('We have already processed this stravaActivity. stravaActivity.id: ', stravaActivity.id.toString());
      return resolve(false);
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

        return resolve(true);
      })
      .catch(function(err) {
        return reject(new Error(`stravaUtil.getAverageWatts returned error for user: ${trainingDay.user.username}, err: ${err}, payload: ${JSON.stringify(stravaActivity)}`));
      });
  });
};

module.exports = {};

module.exports.fetchActivity = function(user, activityId) {
  // Note that if activityId is for an activity associated with an athlete other than user,
  // Strava will still return the activity, though only a summary.
  // We will process it as if it belongs to user.
  // This should not happen but if we were paranoid...
  // TODO: add check to ensure returned activity belongs to user.

  return new Promise(function(resolve, reject) {
    console.log('Strava: Initiating fetchActivity for TacitTraining user: ', user.username);

    strava.activities.get({ 'access_token': getAccessToken(user), 'id': activityId }, function(err, payload) {
      if (err) {
        return reject(new Error(`strava.activities.get access failed. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
      }

      if (payload.errors) {
        return reject(new Error(`strava.activities.get access returned errors. username: ${user.username}, activityId: ${activityId}, message: ${payload.message}, errors: ${JSON.stringify(payload.errors)}`));
      }

      let numericDate = util.toNumericDate(payload.start_date_local);

      dbUtil.getTrainingDayDocument(user, numericDate, function(err, trainingDay) {
        if (err) {
          return reject(new Error(`Strava fetchActivity - getTrainingDayDocument returned error. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
        }

        processActivity(payload, trainingDay)
          .then(function(success) {
            console.log('fetchActivity success: ', success);
            if (!success) {
              return resolve(trainingDay);
            }

            console.log('===> Strava fetchActivity: We found a keeper for user ', user.username);

            trainingDay.save(function (err) {
              if (err) {
                return reject(new Error(`Strava fetchActivity - trainingDay.save returned error. username: ${user.username}, activityId: ${activityId}, err: ${err}`));
              }

              adviceEngine.refreshAdvice(user, trainingDay)
                .then(function(updatedTrainingDay) {
                  return resolve(updatedTrainingDay);
                })
                .catch(function(err) {
                  console.log(`Strava fetchActivity refreshAdvice  failed. username: ${user.username}, activityId: ${activityId}, err: ${err}`);
                  return resolve(trainingDay);
                });
            });
          })
          .catch(function(err){
            console.log('fetchActivity err: ', err);
            return reject(err);
          });
      });
    });
  });
};

module.exports.downloadActivities = function(user, trainingDay, callback) {
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

  //retrieve activities from strava
  strava.athlete.listActivities({ 'access_token': getAccessToken(user), 'after': searchDate }, function(err, payload) {
    if(err) {
      // statusMessage.text = 'Strava access failed: ' + (err.msg || '');
      // statusMessage.type = 'error';
      // dbUtil.sendMessageToUser(statusMessage, user);
      console.log(`strava.athlete.listActivities failed for user: ${user.username}, error: ${err}`);
      return callback(err, null);
    }

    if(payload.errors) {
      console.log(`strava.athlete.listActivities returned errors for user: ${user.username}, payload: ${JSON.stringify(payload)}`);
      // statusMessage.text = 'Strava access failed: ' + payload.message;
      // statusMessage.type = 'error';
      // dbUtil.sendMessageToUser(statusMessage, user);
      return callback(new Error('Strava access failed: ' + payload.message), null);
    }

    console.log('Strava: activities returned: ' + payload.length);

    if (payload.length < 1) {
      statusMessage.text = 'We found no Strava activities for the day.';
      statusMessage.type = 'info';
      trainingDay.lastStatus = statusMessage;
      // dbUtil.sendMessageToUser(statusMessage, user);
      return callback(null, trainingDay);
    }

    return Promise.all(payload.map(function(stravaActivity) {
      // stravaActivity.start_date_local is formatted as UTC but is a local time: 2016-09-29T10:17:15Z
      var numericStartDateLocal = util.toNumericDate(stravaActivity.start_date_local);

      if (stravaActivity.id && numericStartDateLocal === trainingDay.dateNumeric) {
        return processActivity(stravaActivity, trainingDay)
          .then(function(success) {
            if (success) {
              console.log('===> Strava: We found a keeper for user ', user.username);
              activityCount++;
              return true;
            }
          })
          .catch(function(err){
            throw(err);
          });
      } else {
        return Promise.resolve(true);
      }
    }))
      .then(function(results) {
        if (activityCount < 1) {
          console.log('No new Strava activities for the day.');
          statusMessage.text = 'We found no new Strava activities for the day. Note that activities without power data are not downloaded.';
          statusMessage.type = 'info';
          // dbUtil.sendMessageToUser(statusMessage, user);
          trainingDay.lastStatus = statusMessage;
          return callback(null, trainingDay);
        }

        if (activityCount > 1) {
          countPhrase = activityCount + ' new Strava activities';
        } else {
          countPhrase = 'one new Strava activity';
        }

        trainingDay.save(function (err) {
          if (err) {
            console.log('Strava: downloadActivities td.save err: ', err);
            statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to save the data.';
            statusMessage.type = 'error';
            // dbUtil.sendMessageToUser(statusMessage, user);
            return callback(err, null);
          }

          //refreshAdvice as completedActivities likely has changed.
          adviceEngine.refreshAdvice(user, trainingDay)
            .then(function(updatedTrainingDay) {
              statusMessage.text = 'We downloaded ' + countPhrase + '.';
              statusMessage.type = 'success';
              // dbUtil.sendMessageToUser(statusMessage, user);
              updatedTrainingDay.lastStatus = statusMessage;
              return callback(null, updatedTrainingDay);
            })
            .catch(function(err) {
              console.log('Strava: downloadActivities refreshAdvice err: ', err);
              statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to update your training advice.';
              statusMessage.type = 'warning';
              // dbUtil.sendMessageToUser(statusMessage, user);
              trainingDay.lastStatus = statusMessage;
              return callback(null, trainingDay);
            });
        });
      })
      .catch(function(err) {
        return callback(err, null);
      });
  });
};
