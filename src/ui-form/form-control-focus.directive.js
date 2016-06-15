/**
 * @namespace clbFormControlFocus
 * @memberof module:clb-ui-form
 * @desc
 * The ``clbFormControlFocus`` Directive mark a form element as the one that
 * should receive the focus first.
 * @example <caption>Give the focus to the search field</caption>
 * angular.module('exampleApp', ['clb-ui-form']);
 *
 * // HTML snippet:
 * // <form ng-app="exampleApp"><input type="search" clb-ui-form-control-focus></form>
 */
angular.module('clb-ui-form')
.directive('clbFormControlFocus', function clbFormControlFocus($timeout) {
  return {
    type: 'A',
    link: function formControlFocusLink(scope, elt) {
      $timeout(function() {
        elt[0].focus();
      }, 0, false);
    }
  };
});
