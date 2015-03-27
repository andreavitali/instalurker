// ==========================================================================
// Services
// ==========================================================================

// Instagram API proxy
instaLurker.factory('InstagramAPI', ['$http', function($http) {
    var instagramAPI = {};
    instagramAPI.popular = function() {
        return $http.get("/api/popular");
    };
    instagramAPI.search = function(q) {
        return $http.get('/api/search/'+ q);
    };
    instagramAPI.user = function(username) {
        return $http.get('/api/user/'+username);
    };
    instagramAPI.userMore = function(id, next_max_id) {
        return $http.get('/api/user/'+id+'/'+next_max_id);
    };
    instagramAPI.myFeed = function(max_timestamp) {
        return $http.get('/api/feed/'+max_timestamp);
    };
    return instagramAPI;
}]);

// Followed users API proxy
instaLurker.factory('FollowedAPI', ['$http', function($http) {
    var followedAPI = {};
    followedAPI.list = function() {
        return $http.get('/api/followed');
    };
    followedAPI.follow = function(user) {
        return $http.post('/api/followed/', user);
    };
    followedAPI.unfollow = function(id) {
        return $http.delete('/api/followed/'+id);
    };
    return followedAPI;
}]);