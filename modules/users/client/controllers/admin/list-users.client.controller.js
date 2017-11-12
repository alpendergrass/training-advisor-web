'use strict';

angular.module('users.admin').controller('UserListController', ['$scope', '$filter', 'orderByFilter', 'moment', 'Admin',
  function ($scope, $filter, orderByFilter, moment, Admin) {
    $scope.moment = moment;

    $scope.initPage = function () {
      $scope.itemsPerPage = 2; //50;
      $scope.currentPage = 1;
      $scope.filter = '';
      $scope.sort = '-created'
      $scope.propertyName = null;
      $scope.reverse = true;
      $scope.getUserChunk();
    };

    $scope.getUserChunk = function () {
      var begin = (($scope.currentPage - 1) * $scope.itemsPerPage);

      Admin.listSome({
        begin: begin,
        filter: $scope.filter,
        sort: $scope.sort
      }, function (listData) {
        console.log('listData: ', listData);
        $scope.totalUsers = listData.total;
        $scope.usersSorted = $scope.users = listData.results;
        $scope.filterLength = listData.total; //$scope.filteredItems.length;
      });
    };

    $scope.pageChanged = function () {
      $scope.getUserChunk();
    };

    $scope.sortBy = function(propertyName) {
      console.log('propertyName: ', propertyName);
      $scope.reverse = ($scope.propertyName === propertyName) ? !$scope.reverse : true;
      console.log('$scope.reverse: ', $scope.reverse);
      $scope.propertyName = propertyName;
      $scope.sort = $scope.reverse ? '-' + propertyName : propertyName;
      $scope.getUserChunk();
    };

    $scope.initPage();
  }
]);
