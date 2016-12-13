'use strict';

angular.module('trainingDays').service('Season', ['TrainingDays', '_', 'moment',
  function (TrainingDays, _, moment) {
    var getSeason = function(callback) {
      var season = {};
      season.needsPlanGen = false;

      TrainingDays.getSeason({
        today: moment().startOf('day').toDate().toISOString()
      }, function(seasonDays) {
        // Return user object as notifications may have been updated.
        season.days = seasonDays;
        season.user = seasonDays[0].user;

        _.forEach(seasonDays, function(td) {
          td.date = moment(td.dateNumeric.toString()).toDate();

          if (moment(td.date).isSame(moment(), 'day')) {
            td.htmlID = 'today';
          }
        });

        season.hasStart = _.find(seasonDays, function(td) {
          return td.startingPoint && moment(td.date).isBefore(moment());
        });

        //Find first future goal TD if any.
        season.hasEnd = _.chain(seasonDays)
          .filter(function(td) {
            return td.scheduledEventRanking === 1 && moment(td.date).isAfter(moment());
          })
          .sortBy(['date'])
          .head()
          .value();

        if (season.hasEnd) {
          season.needsPlanGen = (season.user.notifications &&
            _.find(season.user.notifications, function(n) {
              return n.notificationType === 'plangen';
            })
          );
        }

        // Get yesterday if it exists.
        season.yesterday = _.find(seasonDays, function(td) {
          return moment(td.date).isSame((moment().subtract(1, 'day')), 'day');
        });

        return callback(null, season);
      }, function(errorResponse) {
        var errorMessage;

        if (errorResponse.data && errorResponse.data.message) {
          errorMessage = errorResponse.data.message;
        } else {
          //Maybe this: errorResponse = Object {data: null, status: -1, config: Object, statusText: ''}
          errorMessage = 'Server error prevented season retrieval';
        }

        return callback(errorMessage, null);
      });
    };

    return {
      getSeason: getSeason
    };
  }
]);
