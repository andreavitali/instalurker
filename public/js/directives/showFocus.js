/*
 * Set focus on element when the value of the show-focus attribute is true
 */
instaLurker.directive('showFocus', ['$timeout', function($timeout) {
    return {
        link:function(scope, element, attrs) {
            scope.$watch(attrs.showFocus,
                function (newValue) {
                    $timeout(function() {
                        if(newValue) {
                            element[0].focus();
                            element[0].select();
                        }
                    });
                },true);
        }
    }
}]);
