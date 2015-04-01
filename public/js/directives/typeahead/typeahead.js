instaLurker
/**
* A helper service that can parse typeahead's syntax (string provided by users)
* Extracted to a separate service for ease of unit testing
*/
.factory('typeaheadParser', ['$parse', function ($parse) {

//                      00000111000000000000022200000000000000003333333333333330000000000044000
var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

return {
    parse:function (input) {

        var match = input.match(TYPEAHEAD_REGEXP);
        if (!match) {
            throw new Error(
                "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
                " but got '" + input + "'.");
        }

        return {
            itemName:match[3],
            source:$parse(match[4]),
            viewMapper:$parse(match[2] || match[1]),
            modelMapper:$parse(match[1])
        };
    }
};
}])

/**
* A set of utility methods that can be use to retrieve position of DOM elements.
* It is meant to be used where we need to absolute-position DOM elements in
* relation to other, existing elements (this is the case for tooltips, popovers,
* typeahead suggestions etc.).
*/
.factory('$position', ['$document', '$window', function ($document, $window) {

    function getStyle(el, cssprop) {
        if (el.currentStyle) { //IE
            return el.currentStyle[cssprop];
        } else if ($window.getComputedStyle) {
            return $window.getComputedStyle(el)[cssprop];
        }
        // finally try and get inline style
        return el.style[cssprop];
    }

    /**
     * Checks if a given element is statically positioned
     * @param element - raw DOM element
     */
    function isStaticPositioned(element) {
        return (getStyle(element, "position") || 'static' ) === 'static';
    }

    /**
     * returns the closest, non-statically positioned parentOffset of a given element
     * @param element
     */
    var parentOffsetEl = function (element) {
        var docDomEl = $document[0];
        var offsetParent = element.offsetParent || docDomEl;
        while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
            offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || docDomEl;
    };

    return {
        /**
         * Provides read-only equivalent of jQuery's position function:
         * http://api.jquery.com/position/
         */
        position: function (element) {
            var elBCR = this.offset(element);
            var offsetParentBCR = { top: 0, left: 0 };
            var offsetParentEl = parentOffsetEl(element[0]);
            if (offsetParentEl != $document[0]) {
                offsetParentBCR = this.offset(angular.element(offsetParentEl));
                offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
                offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
            }

            var boundingClientRect = element[0].getBoundingClientRect();
            return {
                width: boundingClientRect.width || element.prop('offsetWidth'),
                height: boundingClientRect.height || element.prop('offsetHeight'),
                top: elBCR.top - offsetParentBCR.top,
                left: elBCR.left - offsetParentBCR.left
            };
        },

        /**
         * Provides read-only equivalent of jQuery's offset function:
         * http://api.jquery.com/offset/
         */
        offset: function (element) {
            var boundingClientRect = element[0].getBoundingClientRect();
            return {
                width: boundingClientRect.width || element.prop('offsetWidth'),
                height: boundingClientRect.height || element.prop('offsetHeight'),
                top: boundingClientRect.top + ($window.pageYOffset || $document[0].body.scrollTop || $document[0].documentElement.scrollTop),
                left: boundingClientRect.left + ($window.pageXOffset || $document[0].body.scrollLeft  || $document[0].documentElement.scrollLeft)
            };
        }
    };
}])

/**
* The directive!
*/
.directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
    function ($compile, $parse, $q, $timeout, $document,$position, typeaheadParser) {

        var HOT_KEYS = [9, 13, 27, 38, 40];

        return {
            require:'ngModel',
            link:function (originalScope, element, attrs, modelCtrl) {

                //SUPPORTED ATTRIBUTES (OPTIONS)

                //minimal no of characters that needs to be entered before typeahead kicks-in
                var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;
                //minimal wait time after last character typed before typehead kicks-in
                var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;
                //should it restrict model values to the ones selected from the popup only?
                var isEditable = originalScope.$eval(attrs.typeaheadEditable) === true;
                //binding to a variable that indicates if matches are being retrieved asynchronously
                var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;
                //a callback executed when a match is selected
                var onSelectCallback = $parse(attrs.typeaheadOnSelect);

                var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

                var appendToBody =  attrs.typeaheadAppendToBody ? $parse(attrs.typeaheadAppendToBody) : false;
                var appendToElement = attrs.typeaheadAppendToElement || undefined;

                //INTERNAL VARIABLES

                //model setter executed upon match selection
                var $setModelValue = $parse(attrs.ngModel).assign;
                //expressions used by typeahead
                var parserResult = typeaheadParser.parse(attrs.typeahead);
                // control has focus?
                var hasFocus;
                // element to append popup to
                var elementToAppendPopup = appendToElement ? $document.find(appendToElement) : undefined;

                //pop-up element used to display matches
                var popUpEl = angular.element('<div typeahead-popup></div>');
                popUpEl.attr({
                    matches: 'matches',
                    active: 'activeIdx',
                    select: 'select(activeIdx)',
                    query: 'query',
                    position: 'position'
                });
                //custom item template
                if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
                    popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
                }

                //create a child scope for the typeahead directive so we are not polluting original scope
                //with typeahead-specific data (matches, query etc.)
                var scope = originalScope.$new();
                originalScope.$on('$destroy', function(){
                    scope.$destroy();
                });

                var resetMatches = function() {
                    scope.matches = [];
                    scope.activeIdx = -1;
                };

                var getPosition = function(element) {
                    var elBCR = this.offset(element);
                    var offsetParentBCR = { top: 0, left: 0 };
                    var offsetParentEl = parentOffsetEl(element[0]);
                    if (offsetParentEl != $document[0]) {
                        offsetParentBCR = this.offset(angular.element(offsetParentEl));
                        offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
                        offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
                    }

                    var boundingClientRect = element[0].getBoundingClientRect();
                    return {
                        width: boundingClientRect.width || element.prop('offsetWidth'),
                        height: boundingClientRect.height || element.prop('offsetHeight'),
                        top: elBCR.top - offsetParentBCR.top,
                        left: elBCR.left - offsetParentBCR.left
                    };
                };

                var getMatchesAsync = function(inputValue) {

                    var locals = {$viewValue: inputValue};
                    isLoadingSetter(originalScope, true);
                    $q.when(parserResult.source(originalScope, locals)).then(function(matches) {

                        //it might happen that several async queries were in progress if a user were typing fast
                        //but we are interested only in responses that correspond to the current view value
                        if (inputValue === modelCtrl.$viewValue && hasFocus) {
                            if (matches.length > 0) {

                                scope.activeIdx = 0;
                                scope.matches.length = 0;

                                //transform labels
                                for(var i=0; i<matches.length; i++) {
                                    locals[parserResult.itemName] = matches[i];
                                    scope.matches.push({
                                        label: parserResult.viewMapper(scope, locals),
                                        model: matches[i]
                                    });
                                }

                                scope.query = inputValue;

                                if(appendToBody)
                                    scope.position = $position.offset(element);
                                else if(appendToElement)
                                    scope.position = $position.position(elementToAppendPopup);
                                else
                                    scope.position = $position.position(element);
                                scope.position.top = scope.position.top + (appendToElement ? elementToAppendPopup.prop('offsetHeight') : element.prop('offsetHeight'));

                            } else {
                                resetMatches();
                            }
                            isLoadingSetter(originalScope, false);
                        }
                    }, function(){
                        resetMatches();
                        isLoadingSetter(originalScope, false);
                    });
                };

                resetMatches();

                //we need to propagate user's query so we can higlight matches
                scope.query = undefined;

                //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
                var timeoutPromise;

                //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
                //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
                modelCtrl.$parsers.unshift(function (inputValue) {

                    if (inputValue && inputValue.length >= minSearch) {
                        if (waitTime > 0) {
                            if (timeoutPromise) {
                                $timeout.cancel(timeoutPromise);//cancel previous timeout
                            }
                            timeoutPromise = $timeout(function () {
                                getMatchesAsync(inputValue);
                            }, waitTime);
                        } else {
                            getMatchesAsync(inputValue);
                        }
                    } else {
                        isLoadingSetter(originalScope, false);
                        resetMatches();
                    }

                    if (isEditable) {
                        return inputValue;
                    } else {
                        if (!inputValue) {
                            // Reset in case user had typed something previously.
                            modelCtrl.$setValidity('editable', true);
                            return inputValue;
                        } else {
                            modelCtrl.$setValidity('editable', false);
                            return undefined;
                        }
                    }
                });

                modelCtrl.$formatters.push(function (modelValue) {

                    var candidateViewValue, emptyViewValue;
                    var locals = {};

                    if (inputFormatter) {

                        locals['$model'] = modelValue;
                        return inputFormatter(originalScope, locals);

                    } else {

                        //it might happen that we don't have enough info to properly render input value
                        //we need to check for this situation and simply return model value if we can't apply custom formatting
                        locals[parserResult.itemName] = modelValue;
                        candidateViewValue = parserResult.viewMapper(originalScope, locals);
                        locals[parserResult.itemName] = undefined;
                        emptyViewValue = parserResult.viewMapper(originalScope, locals);

                        return candidateViewValue!== emptyViewValue ? candidateViewValue : modelValue;
                    }
                });

                scope.select = function (activeIdx) {
                    //called from within the $digest() cycle
                    var locals = {};
                    var model, item;

                    locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
                    model = parserResult.modelMapper(originalScope, locals);
                    $setModelValue(originalScope, model);
                    modelCtrl.$setValidity('editable', true);

                    onSelectCallback(originalScope, {
                        $item: item,
                        $model: model,
                        $label: parserResult.viewMapper(originalScope, locals)
                    });

                    resetMatches();

                    //return focus to the input element if a mach was selected via a mouse click event
                    element[0].focus();
                };

                //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
                element.bind('keydown', function (evt) {

                    //typeahead is open and an "interesting" key was pressed
                    if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
                        return;
                    }

                    evt.preventDefault();

                    if (evt.which === 40) {
                        scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
                        scope.$digest();

                    } else if (evt.which === 38) {
                        scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
                        scope.$digest();

                    } else if (evt.which === 13 || evt.which === 9) {
                        scope.$apply(function () {
                            scope.select(scope.activeIdx);
                        });

                    } else if (evt.which === 27) {
                        evt.stopPropagation();

                        resetMatches();
                        scope.$digest();
                    }
                });

                element.bind('blur', function (evt) {
                    hasFocus = false;
                });

                element.bind('focus', function (evt) {
                    hasFocus = true;
                });

                // Keep reference to click handler to unbind it.
                var dismissClickHandler = function (evt) {
                    if (element[0] !== evt.target) {
                        resetMatches();
                        scope.$digest();
                    }
                };

                $document.bind('click', dismissClickHandler);

                originalScope.$on('$destroy', function(){
                    $document.unbind('click', dismissClickHandler);
                });

                var $popup = $compile(popUpEl)(scope);
                if ( appendToBody ) {
                    $document.find('body').append($popup);
                } else if(appendToElement && elementToAppendPopup) {
                    elementToAppendPopup.after($popup);
                } else {
                    element.after($popup);
                }
            }
        };
    }])

.directive('typeaheadPopup', function () {
    return {
        restrict:'EA',
        scope:{
            matches:'=',
            query:'=',
            active:'=',
            position:'=',
            select:'&'
        },
        replace:true,
        templateUrl:'js/directives/typeahead/typeahead-popup.html',
        link:function (scope, element, attrs) {

            scope.templateUrl = attrs.templateUrl;

            scope.isOpen = function () {
                return scope.matches.length > 0;
            };

            scope.isActive = function (matchIdx) {
                return scope.active == matchIdx;
            };

            scope.selectActive = function (matchIdx) {
                scope.active = matchIdx;
            };

            scope.selectMatch = function (activeIdx) {
                scope.active = activeIdx;
                scope.select({activeIdx:activeIdx});
            };
        }
    };
})

.directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
    return {
        restrict:'EA',
        scope:{
            index:'=',
            match:'='
        },
        link:function (scope, element, attrs) {
            var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'js/directives/typeahead/typeahead-match.html';
            $http.get(tplUrl, {cache: $templateCache}).success(function(tplContent){
                element.replaceWith($compile(tplContent.trim())(scope));
            });
        }
    };
}]);