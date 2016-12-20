angular.module('clb-ui-identity')
.factory('clbUsercardPopover', clbUserCardPopoverService);

/**
 * A singleton to manage clb-usercard-popover instances
 * @namespace clbUserCardPopoverService
 * @memberof module:clb-ui-identity
 * @private
 * @param {object} $rootScope DI
 * @return {object} factory descriptor
 */
function clbUserCardPopoverService($rootScope) {
  return {
    open: function(element) {
      $rootScope.$broadcast('clbUsercardPopover.open', element);
    }
  };
}
