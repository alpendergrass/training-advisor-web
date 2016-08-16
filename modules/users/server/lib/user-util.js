'use strict';

var path = require('path'),
  moment = require('moment'),
  _ = require('lodash'),
  mongoose = require('mongoose'),
  TrainingDay = mongoose.model('TrainingDay'),
  User = mongoose.model('User'),
  adviceConstants = require(path.resolve('./modules/advisor/server/lib/advice-constants')),
  err;

module.exports = {};

module.exports.updateFatigueTimeConstant = function(id, trainingEffortFeedback, callback) {
  //Adjust user.fatigueTimeConstant based on trainingDay.trainingEffortFeedback
  var computedConstant;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    err = new TypeError('user id is not valid');
    return callback(err, null);
  }

  User.findById(id, '-salt -password').exec(function(err, user) {
    if (err) {
      return callback(err, null);
    }

    if (!user) {
      return callback(new Error('Failed to load user ' + id), null);
    }

    // console.log('trainingEffortFeedback: ' + trainingEffortFeedback);
    // console.log('user.fatigueTimeConstant: ' + user.fatigueTimeConstant);

    if (trainingEffortFeedback === null || trainingEffortFeedback === 0) {
      //No need to adjust user's fatigueTimeConstant
      return callback(null, user.fatigueTimeConstant);
    }

    computedConstant = user.fatigueTimeConstant + trainingEffortFeedback;
    // console.log('computedConstant: ' + computedConstant);

    if (computedConstant < adviceConstants.minimumFatigueTimeConstant) {
      user.fatigueTimeConstant = adviceConstants.minimumFatigueTimeConstant;
    } else if (computedConstant > adviceConstants.maximumFatigueTimeConstant) {
      user.fatigueTimeConstant = adviceConstants.maximumFatigueTimeConstant;
    } else {
      user.fatigueTimeConstant = computedConstant;
    }

    // console.log('user.fatigueTimeConstant: ' + user.fatigueTimeConstant);

    user.save(function (err) {
      if (err) {
        return callback(err, null);
      }
      return callback(null, user.fatigueTimeConstant);
    });
  });
};

module.exports.getTrainingPeaksAutoDownloadUsers = function(callback) {

  var query = User.where('trainingPeaksCredentials.autoDownload').equals(true);

  query.find().exec(function(err, users) {
    if (err) {
      return callback(err, null);
    } 
    
    return callback(null, users);
  });
};
