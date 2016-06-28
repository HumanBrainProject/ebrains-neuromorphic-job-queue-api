angular.module('clb-ui-loading')
.directive('clbLoading', clbLoading);

/**
 * The directive clbLoading displays a simple loading message. If a promise
 * is given, the loading indicator will disappear once it is resolved.
 *
 * Attributes
 * ----------
 *
 * =======================  ===================================================
 * Name                     Description
 * =======================  ===================================================
 * {Promise} [clb-promise]  Hide the loading message upon fulfilment.
 * {string} [clb-message]   Displayed loading string (default=``'loading...'``)
 * =======================  ===================================================
 *
 * @memberof module:clb-ui-loading
 * @return {object} Angular directive descriptor
 * @example <caption>Directive Usage Example</caption>
 * <hbp-loading hbp-promise="myAsyncFunc()" hbp-message="'Loading My Async Func'">
 * </hbp-loading>
 */
function clbLoading() {
  return {
    restrict: 'E',
    scope: {
      promise: '=?clbPromise',
      message: '=?clbMessage'
    },
    templateUrl: 'loading.directive.html',
    link: function(scope) {
      scope.loading = true;
      scope.message = scope.message || 'Loading...';
      if (scope.promise) {
        var complete = function() {
          scope.loading = false;
        };
        scope.promise.then(complete, complete);
      }
    }
  };
}
