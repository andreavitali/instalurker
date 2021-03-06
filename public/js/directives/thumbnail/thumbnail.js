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
                        $scope.media = media;
                        $scope.cancel = function () {
                            $rootScope.currentModal = undefined;
                            $modalInstance.close();
                        };
                        $scope.goPrev = function() {
                            if($scope.media.prev) {
                                $scope.media = $scope.media.prev;
                                $scope.$apply();
                            }
                        };
                        $scope.goNext = function() {
                            if($scope.media.next) {
                                $scope.media = $scope.media.next;
                                $scope.$apply();
                            }
                        };

                        // Key navigation
                        function keyNavigation(keyevent) {
                            if(keyevent.keyCode == 37) $scope.goPrev();
                            else if(keyevent.keyCode == 39) $scope.goNext();
                            //$scope.apply();
                        }
                        $document.on('keyup', keyNavigation);
                        $scope.$on('$destroy', function () {
                            $document.off('keyup', keyNavigation);
                        });
                    }],
                    resolve: {
                        media: function () {
                            return $scope.media;
                        }
                    }
                });
                modalInstance.result.then(function(){
                    //var navBar = $document.find("#navBarContainer");
                    //$document.scrollTop($document.scrollTop() - navBar.height());
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
