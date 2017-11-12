'use strict';

angular.module('users.admin').controller('UserListController', ['$scope', '$filter', 'orderByFilter', 'moment', 'Admin',
  function ($scope, $filter, orderByFilter, moment, Admin) {
    $scope.moment = moment;
    $scope.propertyName = null;
    $scope.reverse = true;

    // Admin.listSome({
    //   begin: 0
    // }, function (listData) {
    //   $scope.listData = listData;
    //   $scope.usersSorted = $scope.users = listData.results;
    //   $scope.buildPager();
    // });

    // Admin.query(function (data) {
    //   $scope.usersSorted = $scope.users = data;
    //   $scope.buildPager();
    // });

    $scope.buildPager = function () {
      // $scope.pagedItems = [];
      $scope.itemsPerPage = 2; //50;
      $scope.currentPage = 1;
      $scope.figureOutItemsToDisplay();
    };

    $scope.figureOutItemsToDisplay = function () {
      //TODO: move listSome call to here.

      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);
      // var end = begin + $scope.itemsPerPage;
      // $scope.pagedItems = $scope.filteredItems.slice(begin, end);

      Admin.listSome({
        begin: begin
      }, function (listData) {
        $scope.totalUsers = listData.total;
        $scope.usersSorted = $scope.users = listData.results;
        // $scope.filteredItems = $filter('filter')($scope.usersSorted, {
        //   $: $scope.search
        // });
        $scope.filterLength = listData.total; //$scope.filteredItems.length;
      });





      // $scope.filterLength = $scope.listData.total;
      // // $scope.filterLength = $scope.filteredItems.length;
    };

    $scope.pageChanged = function () {
      $scope.figureOutItemsToDisplay();
    };

    $scope.sortBy = function(propertyName) {
      $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : false;
      $scope.propertyName = propertyName;
      $scope.usersSorted = orderByFilter($scope.users, $scope.propertyName, $scope.reverse);
      // $scope.figureOutItemsToDisplay();
    };

    $scope.buildPager();
  }
]);
