angular.module('clb-ui-loading')
.directive('clbPerformAction', clbPerformAction);

/**
 * @namespace clbPerformAction
 * @memberof module:clb-ui-loading
 *
 * @desc
 * clbPerformAction directive run an action when the given control is clicked.
 * it can be added as an attribute. While the action is running, the control
 * is disabled.
 *
 * @param {function} clbPerformAction  the code to run when the button is clicked.
 *                     this function must return a promise.
 * @param {string}   clbLoadingMessage text replacement for the element content.
 * @return {object}                      Directive Descriptor
 * @example <caption>use perform action to disable a button while code is running</caption>
 * <div ng-controller="myController">
 *  <input class="btn btn-primary" type="submit" clb-perform-action="doSomething()">
 * </div>
 */
function clbPerformAction() {
  return {
    restrict: 'A',
    scope: {
      action: '&clbPerformAction'
    },
    link: function(scope, element, attrs) {
      var onComplete = function() {
        element.html(scope.text);
        element.attr('disabled', false);
        element.removeClass('loading');
      };
      var run = function() {
        if (scope.loadingMessage) {
          element.html(scope.loadingMessage);
        }
        element.addClass('loading');
        element.attr('disabled', true);
        scope.action().then(onComplete, onComplete);
      };
      scope.loadingMessage = attrs.clbLoadingMessage;
      scope.text = scope.text || element.html();
      element.on('click', run);
    }
  };
}
