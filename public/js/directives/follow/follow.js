instaLurker.directive('follow', function(){
    return {
        restrict: 'E',
        replace: true,
        scope: {
            user: '=',
            onUnfollow: '&',
            onFollow: '&'
        },
        controller:['$scope', 'FollowedAPI', function($scope, FollowedAPI) {
            $scope.makeRequest = function() {
                $scope.requesting = true;
                var followRequest = !$scope.user.followed;
                var promise = followRequest ? FollowedAPI.follow($scope.user) : FollowedAPI.unfollow($scope.user.id);
                promise.then(function() {
                    $scope.requesting = false;
                    $scope.user.followed = !$scope.user.followed;
                    // Callbacks
                    if(!followRequest)
                        $scope.onUnfollow($scope.user);
                    else
                        $scope.onFollow($scope.user);
                }, function() {
                    $scope.requesting = false;
                });
            }
        }],
        templateUrl: 'js/directives/follow/follow.html',
        link: function (scope, elem, attrs) {
            if("small" in attrs) scope.isSmall = true;
        }
    }
});
