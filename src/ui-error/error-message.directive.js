angular.module('clb-ui-error')
.directive('clbErrorMessage', clbErrorMessage);

/**
 * The ``clb-error-message`` directive displays an error.
 *
 *
 * clb-error is a HbpError instance, built by the HbpErrorService
 *
 * @namespace clbErrorMessage
 * @memberof module:clb-ui-error
 * @example <caption>Retrieve the current context object</caption>
 * <div ng-controller='SomeController'>
 *   Validation error:
 *   <clb-error-message clb-error='error'></clb-error-message>
 *   Permission denied error:
 *   <clb-error-message clb-error='errorPermissions'></clb-error-message>
 * </div>
 * @return {object} The directive
 **/
function clbErrorMessage() {
  return {
    restrict: 'E',
    scope: {
      error: '=?clbError'
    },
    templateUrl: 'error-message.directive.html'
  };
}
