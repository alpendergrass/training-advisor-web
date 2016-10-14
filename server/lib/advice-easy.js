'use strict';

var path = require('path'),
  _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoose = require('mongoose'),
  async = require('async'),
  TrainingDay = mongoose.model('TrainingDay'),
  dbUtil = require(path.resolve('./modules/trainingdays/server/lib/db-util')),
  adviceUtil = require('./advice-util'),
  adviceConstants = require('./advice-constants'),
  err;

var rules = [
  {
    'name': 'easyAfterHardInPeakOrRaceRule',
    'condition': function(R) {
      R.when(this && this.wentHardYesterday &&
        (this.trainingDay.period === 'peak' || this.trainingDay.period === 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, in peak or race, so recommending easy.';
      this.trainingDay.plannedActivities[0].advice += `  Yesterday was a hard day and you are peaking so go easy today. Intensity should be below 0.75.
 As always, take the day off if you feel you need the rest.`;
      R.stop();
    }
  },
  {
    'name': 'easyAfterHardWithRestNotScheduledForTomorrowRule',
    'condition': function(R) {
      R.when(this && !this.testingIsDue && this.wentHardYesterday &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race') &&
        (this.trainingDay.form <= this.adviceConstants.easyDaytNeededThreshold) &&
        (_.indexOf(this.trainingDay.user.preferredRestDays, this.tomorrowDayOfWeek) < 0)
        //TODO: check if tomorrow is a scheduled off day.
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, form is below easyDaytNeededThreshold, tomorrow is not a preferred rest day, so recommending easy.';
      this.trainingDay.plannedActivities[0].advice += `  Yesterday was a hard day and form is somewhat low so go easy today. Intensity should be below 0.75.
 Take the day off if you feel you need to rest.`;
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededThreeDaysPriorGoalEventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextGoalEvent === 3) ;
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as goal event is in three days.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as your goal event is in three days.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededDayBeforeGoalEventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextGoalEvent === 1) ;
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as goal event is tomorrow.';
      this.trainingDay.plannedActivities[0].advice += ` An easy day is recommended as your goal event is tomorrow.
 You may do a few 90% sprints to sharpen the legs but otherwise keep it very relaxed.`;
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForPriority2EventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextPriority2Event === 2 &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 2 event is in two days.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a medium priority event in two days.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForPriority3EventRule',
    'condition': function(R) {
      R.when(this && this.trainingDay.daysUntilNextPriority3Event === 1 &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race')
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 3 event is in one day.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a low priority event scheduled for tomorrow.';
      R.stop();
    }
  },
  {
    'name': 'easyDayNeededInPrepForTestingRule',
    'condition': function(R) {
      R.when(this && this.testingIsDue &&
        (this.trainingDay.period !== 'peak' && this.trainingDay.period !== 'race' && this.trainingDay.period !== 'transition') &&
        this.trainingDay.form <= this.adviceConstants.testingEligibleFormThreshold
      );
    },
    'consequence': function(R) {
      this.trainingDay.plannedActivities[0].activityType = 'easy';
      this.trainingDay.plannedActivities[0].rationale += ' Testing is due. Recommending easy in preparation for testing.';
      this.trainingDay.plannedActivities[0].advice += ' An easy day or rest is needed in preparation for testing. Your form is not sufficiently recovered for testing.';
      R.stop();
    }
  }
];

module.exports = {};

module.exports.easyRules = rules;

module.exports.checkEasy = function(user, trainingDay, callback) {

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
    async.apply(shouldWeGoEasy, user, trainingDay),
    isAnEasyDayNeededInPrepForGoalEvent,
    isAnEasyDayNeededInPrepForPriority2Event,
    isAnEasyDayNeededInPrepForPriority3Event,
    isAnEasyDayNeededInPrepForTesting
  ],
    function(err, user, trainingDay) {
      if (err) {
        return callback(err, null, null);
      }

      return callback(null, user, trainingDay);
    }
  );
};

function shouldWeGoEasy(user, trainingDay, callback) {
  dbUtil.didWeGoHardTheDayBefore(user, trainingDay.date, function(err, wentHard) {
    if (err) {
      return callback(err, null, null);
    }

    if (wentHard) {
      //Yesterday was a hard day
      if (trainingDay.period === 'peak' || trainingDay.period === 'race') {
        //we are peaking so lets go easy
        trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, we are peaking, so recommending easy.';
        trainingDay.plannedActivities[0].advice += ' Yesterday was a hard day and you are peaking so go easy today. Intensity should be below 0.75.';
        trainingDay.plannedActivities[0].advice += ' As always, take the day off if you feel you need the rest.';
        trainingDay.plannedActivities[0].activityType = 'easy';
      }
      else if (trainingDay.form <= adviceConstants.easyDaytNeededThreshold) {
        //form is below our easy threshold so if tomorrow is not rest day, go easy.
        //Otherwise we will likely be recommending rest tomorrow.

        //We have to convert trainingDay.date to user local time first to get the right day of the week.
        var tomorrowDayOfWeek = moment.tz(trainingDay.date, user.timezone).add(1, 'days').day().toString();

        if (_.indexOf(user.preferredRestDays, tomorrowDayOfWeek) < 0) {
          //Tomorrow's day of week is not in user's list of preferred rest days.
          trainingDay.plannedActivities[0].rationale += ' Yesterday was hard, tomorrow is not a preferred rest day, so recommending easy.';
          trainingDay.plannedActivities[0].advice += ' Yesterday was a hard day and form is somewhat low so go easy today. Intensity should be below 0.75.';
          trainingDay.plannedActivities[0].advice += ' Take the day off if you feel you need to rest.';
          trainingDay.plannedActivities[0].activityType = 'easy';
        }
      }
    }

    return callback(null, user, trainingDay);
  });
}

function isAnEasyDayNeededInPrepForGoalEvent (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextGoalEvent && trainingDay.daysUntilNextGoalEvent < 4) {
    //A rest day rule may override this rule.
    trainingDay.plannedActivities[0].rationale += ' Easy day recommended as goal event is in the next three days.';
    if (trainingDay.daysUntilNextGoalEvent === 1) {
      trainingDay.plannedActivities[0].advice += ' An easy day is recommended as your goal event is tomorrow. You may do a few 90% sprints to sharpen the legs but otherwise keep it very relaxed.';
    } else {
      trainingDay.plannedActivities[0].advice += ' An easy day is recommended as your goal event is soon.';
    }
    trainingDay.plannedActivities[0].activityType = 'easy';
  }

  return callback(null, user, trainingDay);
}

function isAnEasyDayNeededInPrepForPriority2Event (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextPriority2Event === 2) {
    trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 2 event is in two days.';
    trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a medium priority event in two days. If you ride, go easy.';
    trainingDay.plannedActivities[0].activityType = 'easy';
  }

  return callback(null, user, trainingDay);
}

function isAnEasyDayNeededInPrepForPriority3Event (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.daysUntilNextPriority3Event === 1) {
    trainingDay.plannedActivities[0].rationale += ' Easy day recommended as priority 3 event is in one day.';
    trainingDay.plannedActivities[0].advice += ' An easy day is recommended as you have a low priority event scheduled for tomorrow.';
    trainingDay.plannedActivities[0].activityType = 'easy';
  }

  return callback(null, user, trainingDay);
}

function isAnEasyDayNeededInPrepForTesting (user, trainingDay, callback) {
  if (trainingDay.plannedActivities[0].activityType !== '') {
    //no point in continuing
    return callback(null, user, trainingDay);
  }

  if (trainingDay.period === 'peak' || trainingDay.period === 'race' || trainingDay.period === 'transition') {
    //no testing in peak, race or transition periods.
    return callback(null, user, trainingDay);
  }

  if (adviceUtil.isTestingDue(user, trainingDay) && trainingDay.form <= adviceConstants.testingEligibleFormThreshold) {
    trainingDay.plannedActivities[0].rationale += ' Recommending easy in preparation for testing.';
    trainingDay.plannedActivities[0].advice += ' An easy day or rest is needed in preparation for testing. Intensity should be below 0.75.';
    trainingDay.plannedActivities[0].activityType = 'easy';
  }

  return callback(null, user, trainingDay);
}
