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

// mongoose.Promise = global.Promise;

var processActivity = function(stravaActivity, trainingDay) {
  let newActivity = {};
  let fudgedNP;
  let intensity;

  if (_.find(trainingDay.completedActivities, { 'sourceID': stravaActivity.id.toString() })) {
    // We have already processed this stravaActivity.
    console.log('stravaActivity has already been processed.');
    return false;
  }

  if (!stravaActivity.weighted_average_watts) {
    // If stravaActivity.weighted_average_watts is undefined then this is a ride without a power meter or a manually created activity.
    console.log('stravaActivity.weighted_average_watts is not present: ', stravaActivity);
    return false;
  }

  //Strava NP is consistently lower than Garmin device and website and TrainingPeaks. We try to compensate here.
  fudgedNP = Math.round(stravaActivity.weighted_average_watts * adviceConstants.stravaNPFudgeFactor);
  // IF = NP/FTP
  intensity = Math.round((fudgedNP / trainingDay.user.thresholdPower) * 100) / 100;
  // TSS = [(s x W x IF) / (FTP x 3600)] x 100
  // where s is duration in seconds, W is Normalized Power in watts, IF is Intensity Factor, FTP is FTP and 3.600 is number of seconds in 1 hour.
  newActivity.intensity = intensity;
  newActivity.load = Math.round(((stravaActivity.moving_time * fudgedNP * intensity) / (trainingDay.user.thresholdPower * 3600)) * 100);
  newActivity.elevationGain = stravaActivity.total_elevation_gain; // in meters
  console.log('Strava: stravaActivity.weighted_average_watts: ' + stravaActivity.weighted_average_watts);
  console.log('Strava: fudgedNP: ' + fudgedNP);
  console.log('Strava: stravaActivity.moving_time: ' + stravaActivity.moving_time);
  console.log('Strava: trainingDay.user.thresholdPower: ' + trainingDay.user.thresholdPower);
  console.log('Strava: intensity: ' + intensity);
  console.log('Strava: load: ' + newActivity.load);
  newActivity.source = 'strava';
  newActivity.sourceID = stravaActivity.id;
  newActivity.name = stravaActivity.name;
  newActivity.notes = stravaActivity.name;
  // newActivity.notes = 'Strava reports weighted average watts of ' + stravaActivity.weighted_average_watts;
  // newActivity.notes += '. We are using adjusted NP of ' + fudgedNP + '.';
  trainingDay.completedActivities.push(newActivity);

  return true;
};

module.exports = {};

module.exports.fetchActivity = function(user, activityId) {
  return new Promise(function(resolve, reject) {
    console.log('Strava: Initiating fetchActivity for TacitTraining user: ', user.username);
    let accessToken = user.provider ==='strava'? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;

    strava.activities.get({ 'access_token': accessToken, 'id': activityId }, function(err, payload) {
      if(err) {
        console.log('strava.activities.get returned error: ', err);
        return reject(err);
      }

      if(payload.errors) {
        console.log('strava.activities.get access failed: ' + payload.message);
        console.log(JSON.stringify(payload));
        return reject(new Error('strava.activities.get access failed: ' + payload.message));
      }

      // console.log('payload: ', payload);

      let numericDate = util.toNumericDate(payload.start_date_local);

      dbUtil.getTrainingDayDocument(user, numericDate, function(err, trainingDay) {
        if (err) {
          return reject(err);
        }

        if (!processActivity(payload, trainingDay)) {
          return resolve();
        }

        console.log('===> Strava fetchActivity: We found a keeper for user ', user.username);

        trainingDay.save(function (err) {
          if (err) {
            console.log('Strava: fetchActivity td.save err: ', err);
            return reject(err);
          }

          // refreshAdvice
          return resolve();
        });
      });
    });
  });
};

module.exports.downloadActivities = function(user, trainingDay, callback) {
  var searchDate = moment(trainingDay.dateNumeric.toString()).unix(),
    activityCount = 0,
    countPhrase = '',
    accessToken,
    statusMessage = {
      type: '',
      text: '',
      title: 'Strava Download',
      created: Date.now(),
      username: user.username
    },
    params = {};

  console.log('Strava: Initiating downloadActivities for TacitTraining user: ', user.username);

  accessToken = user.provider ==='strava'? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;
  //retrieve activities from strava
  strava.athlete.listActivities({ 'access_token': accessToken, 'after': searchDate }, function(err, payload) {
    if(err) {
      // statusMessage.text = 'Strava access failed: ' + (err.msg || '');
      // statusMessage.type = 'error';
      // dbUtil.sendMessageToUser(statusMessage, user);
      return callback(err, null);
    }

    if(payload.errors) {
      console.log('Strava access failed: ' + payload.message);
      console.log(JSON.stringify(payload));
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

    _.forEach(payload, function(stravaActivity) {
      // stravaActivity.start_date_local is formatted as UTC but is a local time: 2016-09-29T10:17:15Z
      var numericStartDateLocal = util.toNumericDate(stravaActivity.start_date_local);

      if (stravaActivity.id && numericStartDateLocal === trainingDay.dateNumeric) {
        if (processActivity(stravaActivity, trainingDay)) {
          console.log('===> Strava: We found a keeper for user ', user.username);
          activityCount++;
        }
      }
    });

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
  });
};