angular.module('app', ['fbo']).controller('controller', ['$scope', function ($scope) {
  $scope.value = 1;
  $scope.update = function () {
    $scope.html = "<span class='class-" + $scope.value + "'><i fbo-parse='{value}'></i></span>";
    $scope.date = Date.now();
  };
}]);