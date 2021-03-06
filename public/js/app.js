// ==========================================================================
// Main module
// ==========================================================================

var instaLurker = angular.module('InstaLurker', ['ui.router','satellizer','infinite-scroll','ngProgressLite','linkify','envConstant']);

// Startup
instaLurker.run(['$rootScope', '$window', '$auth', 'ngProgressLite','$anchorScroll', function($rootScope, $window, $auth, ngProgressLite, $anchorScroll) {
    // If authenticated load user on start and redirect to 'MyFeed' page
    if ($auth.isAuthenticated()) {
        $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
    }

    // Loading progressbar and cancel routing to private path
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
        if (toState !== null && toState.authRequired && !$auth.isAuthenticated()) {
            event.preventDefault();
        }
        else {
            $rootScope.queryString = toState.name==='user' ? toParams.username : undefined;
            $rootScope.searchActive = false;
            ngProgressLite.start();
        }
    });
    $rootScope.$on('$stateChangeSuccess', function () {
        if($rootScope.currentModal) {
            $rootScope.currentModal.close();
            $rootScope.currentModal = undefined;
            $anchorScroll(0);
        }
        ngProgressLite.done();
    });
    $rootScope.$on('$stateChangeError', function () {
        ngProgressLite.done();
    });
}]);

// Configuration
instaLurker.config(['$stateProvider', '$urlRouterProvider', '$authProvider', '$locationProvider', '$sceDelegateProvider', 'ENV',
    function($stateProvider, $urlRouterProvider, $authProvider, $locationProvider, $sceDelegateProvider, ENV) {

    // Routing
    $locationProvider.html5Mode(true);
    $urlRouterProvider.otherwise('/');

    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'views/home.html',
            controller: 'HomeCtrl as home',
            resolve: {
                popular: function(InstagramAPI) {
                    return InstagramAPI.popular();
                }
            }
        })
        .state('myfeed', {
            url: '/myfeed',
            templateUrl: 'views/myfeed.html',
            authRequired: true,
            controller: 'MyFeedCtrl as myFeed'
        })
        .state('followed', {
            url: '/followed',
            templateUrl: 'views/followed.html',
            controller: 'FollowedListCtrl as followedListCtrl',
            authRequired: true,
            resolve: {
                usersData: function(FollowedAPI) {
                    return FollowedAPI.list();
                }
            }
        })
        .state('user', {
            url: '/user/:username',
            templateUrl: 'views/user.html',
            controller: 'UserCtrl as userCtrl',
            resolve: {
                user: function(InstagramAPI, $stateParams) {
                    return InstagramAPI.user($stateParams.username);
                }
            }
        })
        .state('media', {
            url: '/media/:id',
            templateUrl:'views/media.html',
            controller:'MediaCtrl',
            resolve: {
                media: function($window) {
                    return JSON.parse($window.localStorage.currentMedia);
                }
            }
        });

    // Instagram authentication
    $authProvider.oauth2({
        name: 'instagram',
        url: ENV.appURI + 'api/auth/instagram',
        redirectUri: ENV.appURI,
        clientId: ENV.instagramClientId,
        authorizationEndpoint: 'https://api.instagram.com/oauth/authorize'
    });

    // Enable video play
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://scontent*.cdninstagram.com/**',
        'https://distillery*.instagram.com/**'
    ]);
}]);
