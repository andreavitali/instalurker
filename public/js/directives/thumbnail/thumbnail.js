instaLurker.directive('thumbnail', function(){
    return {
        restrict: 'E',
        replace: true,
        scope: {
            media: '='
        },
        controller:['$scope', '$rootScope', '$document', '$state', '$modal', function($scope, $rootScope, $document, $state, $modal) {
            // Go to media state
/*            $scope.goToMedia = function() {
                $window.localStorage.currentMedia = JSON.stringify($scope.media);
                $state.go('media',{id:$scope.media.id});
            };*/

            // Open modal function
            $scope.openModal = function() {
                var modalInstance = $modal.open({
                    templateUrl: 'views/media.html',
                    windowClass: 'custom-modal',
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
                    // scroll top to compensate fixed navbar
                    var navBar = $document.find("#navBarContainer");
                    if(navBar.css('position') === 'fixed')
                        $document.scrollTop($document.scrollTop() - navBar.height());
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
