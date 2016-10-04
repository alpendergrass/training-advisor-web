'use strict';


var path = require('path'),
  _ = require('lodash'),
  moment = require('moment'),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics')),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  dbUtil = require('./db-util'),
  strava = require('strava-v3'),
  err;

module.exports = {};

module.exports.downloadActivities = function(user, trainingDay, callback) {
  var searchDate = moment(trainingDay.date).unix(),
    thruDate = moment(trainingDay.date).add(1, 'day'),
    newActivity = {},
    fudgedNP,
    activityCount = 0,
    countPhrase = '',
    intensity,
    accessToken,
    statusMessage = {
      type: '',
      text: '',
      title: 'Strava Download',
      created: Date.now(),
      username: user.username
    },
    params = {};

  console.log('trainingDay: ' + moment(trainingDay.date).toDate());
  console.log('Strava searchDate: ' + moment.unix(searchDate).toDate());

  accessToken = user.provider ==='strava'? user.providerData.accessToken : user.additionalProvidersData.strava.accessToken;
  //retrieve activities from strava
  strava.athlete.listActivities({ 'access_token': accessToken, 'after': searchDate },function(err, payload) {
    if(err) {
      statusMessage.text = 'Strava access failed: ' + (err.msg || '');
      statusMessage.type = 'error';
      dbUtil.sendMessageToUser(statusMessage, user);
      return callback(err, null);
    }

    if(payload.errors) {
      console.log('Strava access failed: ' + payload.message);
      console.log(JSON.stringify(payload));
      statusMessage.text = 'Strava access failed: ' + payload.message;
      statusMessage.type = 'error';
      dbUtil.sendMessageToUser(statusMessage, user);
      return callback(err, null);
    }

    console.log('strava activities returned: ' + payload.length);

    if (payload.length < 1) {
      statusMessage.text = 'We found no Strava activities for the day.';
      statusMessage.type = 'info';
      dbUtil.sendMessageToUser(statusMessage, user);
      return callback(null, trainingDay);
    }

    _.forEach(payload, function(stravaActivity) {
      console.log('stravaActivity.id: ' + stravaActivity.id);
      console.log('stravaActivity.start_date: ' + stravaActivity.start_date); //2016-09-29T16:17:15Z
      console.log('stravaActivity.start_date moment: ' + moment(stravaActivity.start_date).toDate()); //Thu Sep 29 2016 10:17:15 GMT-0600 (MDT)
      console.log('thruDate: ', thruDate.toDate());

      // stravaActivity.start_date_local is formatted as UTC:
      // 2016-09-29T10:17:15Z
      // moment treats start_date_local as UTC so moment(stravaActivity.start_date_local).toDate() results in a MDT:
      // Thu Sep 29 2016 04:17:15 GMT-0600 (MDT)
      // Not sure what start_date_local is good for.

      // If stravaActivity.weighted_average_watts is undefined then this is a ride without a power meter or a manually created activity.
      // We use stravaActivity.start_date which is UTC as is our trainingDay.date. We check within a day's span
      // because trainingDay.date UTC could be the day before the Strava activity date.

      if (stravaActivity.id && stravaActivity.weighted_average_watts &&
        moment(stravaActivity.start_date).isBetween(trainingDay.date, thruDate)) {
        if (!_.find(trainingDay.completedActivities, 'sourceID', stravaActivity.id.toString())) {
          activityCount++;
          //Strava NP is consistently lower than Garmin device and website and TrainingPeaks. We try to compensate here.
          fudgedNP = Math.round(stravaActivity.weighted_average_watts * adviceConstants.stravaNPFudgeFactor);
          // IF = NP/FTP
          intensity = Math.round((fudgedNP / trainingDay.user.thresholdPower) * 100) / 100;
          // TSS = [(s x W x IF) / (FTP x 3600)] x 100
          // where s is duration in seconds, W is Normalized Power in watts, IF is Intensity Factor, FTP is FTP and 3.600 is number of seconds in 1 hour.
          newActivity.load = Math.round(((stravaActivity.moving_time * fudgedNP * intensity) / (trainingDay.user.thresholdPower * 3600)) * 100);
          console.log('===> We found a keeper...');
          console.log('stravaActivity.weighted_average_watts: ' + stravaActivity.weighted_average_watts);
          console.log('fudgedNP: ' + fudgedNP);
          console.log('stravaActivity.elapsed_time: ' + stravaActivity.elapsed_time);
          console.log('stravaActivity.moving_time: ' + stravaActivity.moving_time);
          console.log('trainingDay.user.thresholdPower: ' + trainingDay.user.thresholdPower);
          console.log('intensity: ' + intensity);
          console.log('load: ' + newActivity.load);
          newActivity.source = 'strava';
          newActivity.sourceID = stravaActivity.id;
          newActivity.name = stravaActivity.name;
          //newActivity.intensity = intensity;
          newActivity.notes = stravaActivity.name;
          // newActivity.notes = 'Strava reports weighted average watts of ' + stravaActivity.weighted_average_watts;
          // newActivity.notes += '. We are using adjusted NP of ' + fudgedNP + '.';
          trainingDay.completedActivities.push(newActivity);
          newActivity = {};
        }
      }
    });

    if (activityCount < 1) {
      statusMessage.text = 'We found no new Strava activities for the day. Note that activities without power data are not downloaded.';
      statusMessage.type = 'info';
      dbUtil.sendMessageToUser(statusMessage, user);
      return callback(null, trainingDay);
    }

    if (activityCount > 1) {
      countPhrase = activityCount + ' new Strava activities';
    } else {
      countPhrase = 'one new Strava activitiy';
    }

    trainingDay.save(function (err) {
      if (err) {
        statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to save the data.';
        statusMessage.type = 'error';
        dbUtil.sendMessageToUser(statusMessage, user);
        return callback(err, null);
      }

      //Update metrics for trainingDay as completedActivities likely has changed.
      params = {
        user: user,
        trainingDate: trainingDay.date
      };

      adviceMetrics.updateMetrics(params, function(err, trainingDay) {
        if (err) {
          statusMessage.text = 'We downloaded ' + countPhrase + ' but encountered an error when we tried to update your training metrics.';
          statusMessage.type = 'warning';
          dbUtil.sendMessageToUser(statusMessage, user);
          return callback(err, null);
        }

        statusMessage.text = 'We downloaded ' + countPhrase + '. You should update your season.';
        statusMessage.type = 'success';
        dbUtil.sendMessageToUser(statusMessage, user);
        return callback(null, trainingDay);
      });
    });
  });
};
