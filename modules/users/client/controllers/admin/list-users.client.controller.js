'use strict';

angular.module('users.admin').controller('UserListController', ['$scope', '$filter', 'orderByFilter', 'moment', 'Admin',
  function ($scope, $filter, orderByFilter, moment, Admin) {
    $scope.moment = moment;
    $scope.propertyName = null;
    $scope.reverse = true;

    Admin.query(function (data) {
      $scope.usersSorted = $scope.users = data;
      $scope.buildPager();
    });

    $scope.buildPager = function () {
      $scope.pagedItems = [];
      $scope.itemsPerPage = 15;
      $scope.currentPage = 1;
      $scope.figureOutItemsToDisplay();
    };

    $scope.figureOutItemsToDisplay = function () {
      $scope.filteredItems = $filter('filter')($scope.usersSorted, {
        $: $scope.search
      });
      $scope.filterLength = $scope.filteredItems.length;
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);
      var end = begin + $scope.itemsPerPage;
      $scope.pagedItems = $scope.filteredItems.slice(begin, end);
    };

    $scope.pageChanged = function () {
      $scope.figureOutItemsToDisplay();
    };

    $scope.sortBy = function(propertyName) {
      $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
      $scope.propertyName = propertyName;
      $scope.usersSorted = orderByFilter($scope.users, $scope.propertyName, $scope.reverse);
      $scope.figureOutItemsToDisplay();
    };
  }
]);
