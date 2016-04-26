/**
 * @namespace hcFormControlFocus
 * @memberof hbpCollaboratoryForm
 * @desc
 * The ``hcFormControlFocus`` Directive mark a form element as the one that
 * should receive the focus first.
 * @example <caption>Give the focus to the search field</caption>
 * angular.module('exampleApp', ['formControlFocus']);
 *
 * // HTML snippet:
 * // <form ng-app="exampleApp"><input type="search" hc-form-control-focus></form>
 */
angular.module('hbpCollaboratoryForm')
.directive('hcfFormControlFocus', function hcfFormControlFocus($timeout) {
  return {
    type: 'A',
    link: function formControlFocusLink(scope, elt) {
      $timeout(function() {
        elt[0].focus();
      }, 0, false);
    }
  };
});
