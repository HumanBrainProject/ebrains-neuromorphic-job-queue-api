angular.module('clb-ui-identity')
.directive('clbUsercard', clbUsercard)
.run(clbUsercardCacheTemplate);

/**
 * Display general user informations.
 *
 * Attributes
 * ----------
 *
 * ==================  ====================================
 * Name                Description
 * ==================  ====================================
 * clb-user            The ClbUser instance to display
 * clb-template        URL of a custom template to use
 * ==================  ====================================
 *
 *
 * @param  {object} lodash Angular DI
 * @memberof module:clb-ui-identity
 * @return {object}        Directive Descriptor
 * @example <caption>Display user informations</caption>
 * <clb-usercard clb-user="vm.currentUser"></clb-usercard>
 * @example <caption>Using a different templates</caption>
 * <clb-usercard clb-user="vm.currentUser" clb-template="custom/simple-user.html">
 * </clb-usercard>
 */
function clbUsercard(lodash) {
  'use strict';
  return {
    restrict: 'EA',
    scope: {
      user: '=clbUser'
    },
    templateUrl: function(tElement, tAttrs) {
      return tAttrs.clbTemplate || 'usercard.directive.html';
    },
    link: {
      pre: function(scope) {
        scope.$watch('user', function(newValue) {
          scope.institution = newValue &&
            lodash.find(newValue.institutions, 'primary');
          scope.email = newValue &&
            lodash(newValue.emails).filter('primary').map('value').first();
          scope.phone = newValue &&
            lodash(newValue.phones).filter('primary').map('value').first();
          scope.ims = newValue && newValue.ims;
        });
      }
    }
  };
}

/**
 * During the build, templateUrl will be replaced by the inline template.
 * We need to inject it in template cache as it is used for displaying
 * the tooltip. Does it smell like a hack? sure, it is a hack!
 * @param  {object} $templateCache Angular DI
 * @private
 */
function clbUsercardCacheTemplate($templateCache) {
  //
  var injector = {
    templateUrl: 'usercard.directive.html'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('usercard.directive.html', injector.template);
  }
}
