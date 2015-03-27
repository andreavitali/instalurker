instaLurker.directive('thumbnail', function(){
    return {
        restrict: 'E',
        replace: true,
        scope: {
            media: '='
        },
        controller:['$scope', '$rootScope', '$modal', function($scope, $rootScope, $modal) {
          $scope.openModal = function() {
              $rootScope.fixView = true;
              var modalInstance = $modal.open({
                  templateUrl: 'views/media.html',
                  windowClass: 'small-modal',
                  controller: ['$scope', '$modalInstance', 'media', function($scope, $modalInstance, media) {
                      $scope.cancel = function () {
                          $modalInstance.close();
                      };
                      $scope.media = media;
                  }],
                  resolve: {
                      media: function () {
                          return $scope.media;
                      }
                  }
              });
              modalInstance.result.then(function(){
                  $rootScope.fixView = false;
              });
              $rootScope.currentModal = modalInstance;
          };
        }],
        templateUrl: 'js/directives/thumbnail/thumbnail.html',
        link: function (scope, elem, attrs) {
            if("userFeed" in attrs) scope.userFeed = true;
            if("myFeed" in attrs) scope.myFeed = true;
        }
    }
});
