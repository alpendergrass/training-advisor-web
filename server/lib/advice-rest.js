'use strict';


var _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  async = require('async'),
  TrainingDay = mongoose.model('TrainingDay'),
  adviceUtil = require('./advice-util'),
  adviceConstants = require('./advice-constants'),
  err;

var rules = [
  {
    'name': 'preferredRestDayRule',
    'condition': function(R) {
      R.when(this &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.todayDayOfWeek) > -1)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'rest';
      this.trainingDay.plannedActivities[0].rationale += ` This is a preferred rest day.`;
      this.trainingDay.plannedActivities[0].advice += ` Today is one of your planned rest days, so rest.`;
      R.stop();
    }
  },
  {
    'name': 'sufficientlyFatiguedToNeedRestRule',
    'condition': function(R) {
      R.when(this &&
        this.trainingDay.form <= adviceConstants.restNeededThreshold ||
        (this.trainingDay.period === 'peak' && this.trainingDay.form <= adviceConstants.restNeededForPeakingThreshold) ||
        (this.trainingDay.period === 'race' && this.trainingDay.form <= adviceConstants.restNeededForRacingThreshold)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'rest';
      this.trainingDay.plannedActivities[0].rationale += ` Sufficiently fatigued to recommend rest.`;
      this.trainingDay.plannedActivities[0].advice += ` You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.`;
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForGoalEventRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.daysUntilNextGoalEvent === 2)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'rest';
      this.trainingDay.plannedActivities[0].rationale += ` Rest recommended as goal event is in two days.`;
      this.trainingDay.plannedActivities[0].advice += ` Rest is needed as your goal event is in two days. If you ride, go very easy, just loosen the legs.`;
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForPriority2EventRule',
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.daysUntilNextPriority2Event === 1)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'rest';
      this.trainingDay.plannedActivities[0].rationale += ` Rest recommended as priority 2 event is in one day.`;
      this.trainingDay.plannedActivities[0].advice += ` Rest is recommended as you have a medium priority event tomorrow. If you ride, go easy.`;
      R.stop();
    }
  },
  {
    'name': 'restNeededInPrepForTestingRule',
    // Depending on values of various thresholds, we may never get here.
    // E.g., if restNeededForPeakingThreshold is greater than restNeededForTestingThreshold.
    'condition': function(R) {
      R.when(this &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        (this.isTestingDue) &&
        (this.trainingDay.form <= this.adviceConstants.restNeededForTestingThreshold)
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'rest';
      this.trainingDay.plannedActivities[0].rationale += ` Rest recommended in preparation for testing.`;
      this.trainingDay.plannedActivities[0].advice += ` Rest is needed in preparation for testing, so rest today.`;
      R.stop();
    }
  },
];

module.exports = {};

module.exports.restRules = rules;

module.exports.checkRest = function(user, trainingDay, callback) {

  callback = (typeof callback === 'function') ? callback : function(err, data) {};

  if (!user) {
    err = new TypeError('valid user is required');
    return callback(err, null, null);
  }

  if (!trainingDay) {
    err = new TypeError('valid trainingDay is required');
    return callback(err, null, null);
  }

  if (trainingDay.plannedActivities[0].activityType !== '') {
    return callback(null, user, trainingDay);
  }

  async.waterfall([
    async.apply(isThisAPreferredRestDay, user, trainingDay),
    areWeSufficientlyFatiguedToNeedRest,
    isRestNeededInPrepForGoalEvent,
    isRestNeededInPrepForPriority2Event,
    isRestNeededInPrepForTesting
  ],
    function(err, user, trainingDay) {
      if (err) {
        return callback(err, null, null);
      }

      return callback(null, user, trainingDay);
    }
  );
};

function isThisAPreferredRestDay(user, trainingDay, callback) {

  //We have to convert trainingDay.date to user local time first to get the right day of the week.
  //Otherwise, like in Jesse's case (UTC +1), trainingDay.date, which is a Tuesday in local time,
  //evaluates to Monday on the server, so we are telling Jesse to take Tuesday off
  //when Monday is his preferred off day.
  var todayDayOfWeek = moment.tz(trainingDay.date, user.timezone).day().toString();

  if (_.indexOf(user.preferredRestDays, todayDayOfWeek) > -1) {
    trainingDay.plannedActivities[0].rationale += ' Is a preferred rest day.';
    trainingDay.plannedActivities[0].advice += ' Today is one of your planned rest days, so rest.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function areWeSufficientlyFatiguedToNeedRest (user, trainingDay, callback) {
  //Has TSB been below lower threshold (default is -30)? For two or more days (?)?

  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.form <= adviceConstants.restNeededThreshold ||
    (trainingDay.period === 'peak' && trainingDay.form <= adviceConstants.restNeededForPeakingThreshold) ||
    (trainingDay.period === 'race' && trainingDay.form <= adviceConstants.restNeededForRacingThreshold)) {
    trainingDay.plannedActivities[0].rationale += ' Sufficiently fatigued to recommend rest.';
    trainingDay.plannedActivities[0].advice += ' You are sufficiently fatigued that you need to rest. If you ride go very easy, just spin.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForGoalEvent (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextGoalEvent === 2) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended as goal event is in two days.';
    trainingDay.plannedActivities[0].advice += ' Rest is needed as your goal event is in two days. If you ride, go very easy, just loosen the legs.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForPriority2Event (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextPriority2Event === 1) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended as priority 2 event is in one day.';
    trainingDay.plannedActivities[0].advice += ' Rest is recommended as you have a medium priority event tomorrow. If you ride, go easy.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}

function isRestNeededInPrepForTesting (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  //Depending on values of various thresholds, we may never get here.
  //E.g., if restNeededForPeakingThreshold is greater than restNeededForTestingThreshold.
  if (trainingDay.period === 'peak' || trainingDay.period === 'race' || trainingDay.period === 'transition') {
    //no testing in peak, race or transition periods.
    return callback(null, user, trainingDay);
  }

  if (adviceUtil.isTestingDue(user, trainingDay) && trainingDay.form <= adviceConstants.restNeededForTestingThreshold) {
    trainingDay.plannedActivities[0].rationale += ' Rest recommended in preparation for testing.';
    trainingDay.plannedActivities[0].advice += ' Rest is needed in preparation for testing, so rest today.';
    trainingDay.plannedActivities[0].activityType = 'rest';
  }

  return callback(null, user, trainingDay);
}
