// ==========================================================================
// Controllers
// ==========================================================================

// Navbar controller
instaLurker.controller('NavBarCtrl', ['$scope', '$window', '$rootScope', '$auth', '$location', 'InstagramAPI',
    function($scope, $window, $rootScope, $auth, $location, InstagramAPI) {

    this.isAuthenticated = function() {
        return $auth.isAuthenticated();
    };

    this.instagramLogin = function() {
        $auth.authenticate('instagram')
            .then(function(response) {
                $window.localStorage.currentUser = JSON.stringify(response.data.user);
                $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
            })
            .catch(function(response) {
                console.log(response.data);
            });
    };

    this.logout = function() {
        $auth.logout();
        delete $window.localStorage.currentUser;
    };

    this.isActive = function(routeName) {
        return routeName === $location.path();
    };

    this.searchUsers = function(q) {
        return InstagramAPI.search(q).then(function(result){
            return result.data;
        });
    };
}]);

// Home controller
instaLurker.controller('HomeCtrl', ['popular', function(popular) {
    this.popularData = popular.data.data;
}]);

// User controller
instaLurker.controller('UserCtrl',['user', 'InstagramAPI', '$auth', '$stateParams', function(user, InstagramAPI, $auth, $stateParams) {
    var userCtrl = this;

    if(!user.data.data) { // private profile
        userCtrl.isPrivate = true;
        userCtrl.user = {'username':$stateParams.username};
    }
    else {
        userCtrl.user = user.data.userInfo;
        userCtrl.data = user.data.data;
        userCtrl.next_max_id = user.data.pagination ? user.data.pagination.next_max_id : 0;
    }

    this.loadMore = function() {
        if(userCtrl.next_max_id > 0) {
            userCtrl.loading = true;
            InstagramAPI.userMore(userCtrl.user.id, userCtrl.next_max_id)
                .then(function (result) {
                    userCtrl.data = userCtrl.data.concat(result.data.data);
                    userCtrl.next_max_id = result.data.pagination.next_max_id;
                    userCtrl.loading = false;
                });
        }
    };

    this.isAuthenticated = function() {
        return $auth.isAuthenticated();
    };
}]);

// Followed list controller
instaLurker.controller('FollowedListCtrl', ['usersData', function(usersData) {
    var followedListCtrl = this;
    followedListCtrl.users = usersData.data;
    angular.forEach(followedListCtrl.users, function(user) {
        user.followed = true;
    });

    followedListCtrl.orderByField = 'username';

    // Functions
    this.removeUser = function(user) {
        var idx = followedListCtrl.users.indexOf(user);
        followedListCtrl.users.splice(idx, 1);
    };
}]);

/*
// Media controller
instaLurker.controller('MediaCtrl', function($scope, media) {
    $scope.media = media.data;
});*/
