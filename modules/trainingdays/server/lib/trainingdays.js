'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  util = require('./util'),
  dbUtil = require('./db-util'),
  adviceMetrics = require(path.resolve('./modules/advisor/server/lib/advice-metrics'));

module.exports = {};

module.exports.createTrainingDay = function(req, callback) {
  //This function is used to create start days and events.
  //It is possible that a document already exists for this day so we must treat this as an update.
  let numericDate = parseInt(req.body.dateNumeric, 10);

  dbUtil.getTrainingDayDocument(req.user, numericDate)
    .then(function(trainingDay) {
      let actualMetrics = util.getMetrics(trainingDay, 'actual');

      if (req.body.startingPoint) {
        //Preserve existing name, if any.
        if (typeof req.body.name !== 'undefined') {
          trainingDay.name = trainingDay.name ? trainingDay.name + ', ' + req.body.name : req.body.name;
        }

        trainingDay.startingPoint = req.body.startingPoint;
        actualMetrics.fitness = req.body.actualFitness;
        actualMetrics.fatigue = req.body.actualFatigue;
        // Normally form is calculated using the preceding day's fitness and fatigue
        // but for a start day we do not have prior day.
        actualMetrics.form = Math.round((req.body.actualFitness - req.body.actualFatigue) * 100) / 100;

        let plannedMetrics = util.getMetrics(trainingDay, 'planned');
        plannedMetrics.fitness = req.body.actualFitness;
        plannedMetrics.fatigue = req.body.actualFatigue;
        plannedMetrics.form = actualMetrics.form;
      } else if (req.body.scheduledEventRanking) {
        // If not an event we should not be here but just to be safe...
        trainingDay.name = req.body.name;
        trainingDay.scheduledEventRanking = Math.round(req.body.scheduledEventRanking); //This will do a string to number conversion.
        trainingDay.estimatedLoad = req.body.estimatedLoad;
        trainingDay.eventTerrain = req.body.eventTerrain;

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

        if (req.body.startingPoint) {
          dbUtil.removeSubsequentStartingPoints(req.user, trainingDay.dateNumeric)
            .then(function() {
              // Refresh *plan* metrics from start.
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
            })
            .catch(function(err) {
              return callback(err, null);
            });
        } else {
          return callback(null, trainingDay);
        }
      });
    })
    .catch(function(err) {
      return callback(err, null);
    });
};
