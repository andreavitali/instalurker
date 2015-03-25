// ==========================================================================
// Main module
// ==========================================================================

var instaLurker = angular.module('InstaLurker', ['ui.router','satellizer','infinite-scroll','ngProgressLite','linkify','envConstant']);

// Startup
instaLurker.run(['$rootScope', '$window', '$auth', 'ngProgressLite', function($rootScope, $window, $auth, ngProgressLite) {
    // If authenticated load user on start and redirect to 'MyFeed' page
    if ($auth.isAuthenticated()) {
        $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
        //$state.go('myfeed');
    }

    // Loading progressbar and cancel routing to private path
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
        if (toState !== null && toState.authRequired && !$auth.isAuthenticated()) {
            event.preventDefault();
        }
        else {
            $rootScope.searchActive = false;
            $rootScope.fixView = false;
            ngProgressLite.start();
        }
    });
    $rootScope.$on('$stateChangeSuccess', function () {
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
            controller: 'HomeCtrl as homeCtrl',
            resolve: {
                popular: function(InstagramAPI) {
                    return InstagramAPI.popular();
                }
            }
        })
        .state('myfeed', {
            url: '/myfeed',
            templateUrl: 'views/myfeed.html',
            authRequired: true
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
        });
/*        .state('media', {
            url: '/media/:id',
            templateUrl:'views/media.html',
            controller:'MediaCtrl',
            resolve: {
                media: function(InstagramAPI, $stateParams) {
                    return InstagramAPI.media($stateParams.id);
                }
            }
        });*/

    // Instagram authentication
    $authProvider.oauth2({
        name: 'instagram',
        url: ENV.appURI + 'api/auth/instagram',
        redirectUri: ENV.appURI,
        clientId: '85973222e459460bb99f8a229e0ce798',
        authorizationEndpoint: 'https://api.instagram.com/oauth/authorize'
    });

    // Enable video play
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://scontent*.cdninstagram.com/**',
        'https://distillery*.instagram.com/**'
    ]);
}]);
