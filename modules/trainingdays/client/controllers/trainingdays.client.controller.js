'use strict';

angular.module('trainingDays')
  .controller('TrainingDaysController', ['$scope', '$compile', '$anchorScroll', 'Authentication', 'TrainingDays', '_', 'moment',
    function($scope, $compile, $anchorScroll, Authentication, TrainingDays, _, moment) {
      $scope.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      });

      //The following makes lodash available in html.
      $scope._ = _;
      $scope.today = moment().startOf('day').toDate();

      // //Create socket for server-to-client messaging.
      // //Make sure the Socket is connected
      // if (!Socket.socket) {
      //   Socket.connect();
      // }

      // //The following will remove any listeners. We create a new one below.
      // Socket.init();

      // // Add an event listener to the 'trainingDayMessage' event
      // Socket.on('trainingDayMessage', function(message) {
      //   toastr[message.type](message.text, message.title);
      // });

      $scope.listTrainingDays = function() {
        // This page is now Admin only.

        var getAllTrainingDays = function(callback) {
          $scope.trainingDaysAll = TrainingDays.query({ clientDate: moment().startOf('day').toDate() }, function() {
            //not sure why Mongo/Mongoose returns a string for a date field but
            //we need trainingDay.date to be a valid date object for comparison purposes in the view.
            _.forEach($scope.trainingDaysAll, function(td) {
              //Note that we are not using dateNumeric here.
              td.date = new Date(td.date);
            });

            if (callback) {
              return callback();
            }
          });
        };

        getAllTrainingDays(function() {
          $scope.trainingDays = $scope.trainingDaysAll;
        });
      };
    }
  ]);
