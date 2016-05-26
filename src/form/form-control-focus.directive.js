/**
 * @namespace clbFormControlFocus
 * @memberof clb-form
 * @desc
 * The ``clbFormControlFocus`` Directive mark a form element as the one that
 * should receive the focus first.
 * @example <caption>Give the focus to the search field</caption>
 * angular.module('exampleApp', ['clb-form']);
 *
 * // HTML snippet:
 * // <form ng-app="exampleApp"><input type="search" clb-form-control-focus></form>
 */
angular.module('clb-form')
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
