/**
 * @namespace clbFormGroupState
 * @memberof module:clb-ui-form
 * @desc
 * ``clbFormGroupState`` directive flag the current form group with
 * the class has-error or has-success depending on its form field
 * current state.
 *
 * @example
 * <caption>Track a field validity at the ``.form-group`` level</caption>
 * angular.module('exampleApp', ['hbpCollaboratory']);
 */
angular.module('clb-ui-form')
.directive('clbFormGroupState', function formGroupState() {
  return {
    type: 'A',
    scope: {
      model: '=clbFormGroupState'
    },
    link: function formGroupStateLink(scope, elt) {
      scope.$watchGroup(['model.$touched', 'model.$valid'], function() {
        if (!scope.model) {
          return;
        }
        elt.removeClass('has-error', 'has-success');
        if (!scope.model.$touched) {
          return;
        }
        if (scope.model.$valid) {
          elt.addClass('has-success');
        } else {
          elt.addClass('has-error');
        }
      }, true);
    }
  };
});
