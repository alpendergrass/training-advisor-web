'use strict';

angular.module('trainingDays')
  .service('Feedback', ['$uibModal', '_', 'moment',
    function($uibModal, _, moment) {

      this.show = function(trainingDay) {
        var trainingEffortRatings = [
          { value: '2', text: 'Great!' },
          { value: '1', text: 'Very Good.' },
          { value: '0', text: 'Good.' },
          { value: '-1', text: 'Tired.' },
          { value: '-2', text: 'Very Tired!' }
        ];

        return $uibModal.open({
          templateUrl: '/modules/trainingdays/client/views/partials/feedback.client.view.html',
          size: 'sm',
          controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
            $scope.relativeDay = moment(trainingDay.date).calendar(null, {
              sameDay: '[today]',
              nextDay: '[tomorrow]',
              nextWeek: 'dddd',
              lastDay: '[yesterday]',
              lastWeek: '[last] dddd',
              sameElse: 'MMM D'
            });
            //By setting $scope.trainingEffortFeedback to '' we disable the Save button
            //until the user makes a selection.
            $scope.trainingEffortFeedback = '';
            $scope.trainingEffortRatings = trainingEffortRatings;
            $scope.giveFeedback = function() {
              trainingDay.trainingEffortFeedback = $scope.trainingEffortFeedback;
              $uibModalInstance.close(trainingDay);
            };
            $scope.cancelFeedback = function() {
              trainingDay.trainingEffortFeedback = 0;
              $uibModalInstance.dismiss('cancel');
            };
          }],
          resolve: {
            trainingEffortRatings: function() {
              return trainingEffortRatings;
            }
          }
        }).result;
      };
    }
  ]);
