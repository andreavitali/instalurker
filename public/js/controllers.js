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
instaLurker.controller('UserCtrl',['user', 'InstagramAPI', '$auth', '$stateParams', '$filter', function(user, InstagramAPI, $auth, $stateParams, $filter) {
    var userCtrl = this;

    if(!user.data.data) { // private profile
        userCtrl.isPrivate = true;
        userCtrl.user = {'username':$stateParams.username};
    }
    else {
        userCtrl.user = user.data.userInfo;
        userCtrl.data = user.data.data;
        setShowMonthYear(userCtrl.data);
        userCtrl.next_max_id = user.data.pagination ? user.data.pagination.next_max_id : undefined;
    }

    this.loadMore = function() {
        if(userCtrl.next_max_id) {
            userCtrl.loading = true;
            InstagramAPI.userMore(userCtrl.user.id, userCtrl.next_max_id)
                .then(function (result) {
                    setShowMonthYear(result.data.data, userCtrl.data);
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

    // Default value
    followedListCtrl.orderByField = 'username';

    // Functions
    this.removeUser = function(user) {
        var idx = followedListCtrl.users.indexOf(user);
        followedListCtrl.users.splice(idx, 1);
    };
}]);

// MyFeed controller
instaLurker.controller('MyFeedCtrl',['InstagramAPI', function(InstagramAPI) {
    var myFeedCtrl = this;

    // First load
    myFeedCtrl.loading = true;
    InstagramAPI.myFeed()
        .then(function (result) {
            myFeedCtrl.data = result.data;
            myFeedCtrl.next_max_timestamp = result.data[result.data.length - 1].created_time;
            myFeedCtrl.loading = false;
        });

    // Load more...
    this.loadMore = function() {
        if(myFeedCtrl.next_max_timestamp > 0) {
            myFeedCtrl.loading = true;
            InstagramAPI.myFeed(myFeedCtrl.next_max_timestamp)
                .then(function (result) {
                    if(result.data.length === 0) {
                        myFeedCtrl.next_max_timestamp = 0;
                    }
                    else {
                        myFeedCtrl.data = myFeedCtrl.data.concat(result.data);
                        myFeedCtrl.next_max_timestamp = result.data[result.data.length - 1].created_time;
                    }
                    myFeedCtrl.loading = false;
                });
        }
    };
}]);

// Show "Month Year" over thumbnail if it's the first of that month
var setShowMonthYear = function(data, prevData) {
    var prevMonth = prevData ? new Date(prevData[prevData.length-1].created_time*1000).getMonth() : undefined;
    angular.forEach(data, function(item, index) {
        var currentItemMonth = new Date(item.created_time*1000).getMonth();
        item.showMonthYear = (index === 0 && !prevMonth)
            || (index === 0 && currentItemMonth != prevMonth
            || (index !== 0 && currentItemMonth != new Date(data[index-1].created_time*1000).getMonth()));
    });
};

/*
// Media controller
instaLurker.controller('MediaCtrl', function($scope, media) {
    $scope.media = media.data;
});*/
