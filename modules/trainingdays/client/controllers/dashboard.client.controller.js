'use strict';

angular.module('trainingDays')
  .controller('DashboardController', ['$scope', '$location', '$compile', 'Authentication', 'TrainingDays', 'Util', '_', 'moment',
    function($scope, $location, $compile, Authentication, TrainingDays, Util, _, moment) {
      $scope.authentication = Authentication;

      var jQuery = window.jQuery;
      angular.element(document).ready(function() {
        jQuery('[data-toggle="popover"]').popover({ trigger: 'hover' });
      });

    }
  ]);
