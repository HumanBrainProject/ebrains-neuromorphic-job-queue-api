angular.module('clb-ui-identity')
.directive('clbUsercardPopover', clbUsercardPopoverDirective);

/**
 * Display the user summary in a popover element.
 *
 * Only one of those can be open at any time.
 *
 * =======================================  =========================================
 * Name                  Description
 * =======================================  =========================================
 * {string|HBPUser} clb-usercard-popover    The ClbUser instance to display or its ID
 * =======================================  =========================================
 *
 * @namespace clbUsercardPopoverDirective
 * @memberof module:clb-ui-identity
 * @param  {object} $log               DI
 * @param  {object} $q                 DI
 * @param  {object} clbUser            DI
 * @param  {object} clbUsercardPopover DI
 * @return {object}                    Directive Descriptor
 */
function clbUsercardPopoverDirective(
  $log,
  $q,
  clbUser,
  clbUsercardPopover
) {
  return {
    restrict: 'A',
    scope: {
      user: '=clbUsercardPopover'
    },
    transclude: true,
    templateUrl: 'usercard-popover.directive.html',
    controller: function() {
      var vm = this;
      vm.popover = {
        isOpen: false,
        user: null,
        appendToBody: true
      };

      if (vm.user && vm.user.displayName) {
        vm.popover.user = vm.user;
      } else {
        clbUser.get(vm.user).then(function(user) {
          vm.popover.user = user;
        }).catch(function(err) {
          $log.error('Unable to get user with id', vm.user, err);
        });
      }
    },
    controllerAs: 'vm',
    bindToController: true,
    link: function(scope, elt, attrs, vm) {
      var unbind = scope.$on('clbUsercardPopover.open',
        function(event, element) {
          vm.popover.isOpen = (element === elt);
        });

      scope.$on('$destroy', unbind);

      scope.togglePopover = function($event, action) {
        if ($event.isDefaultPrevented()) {
          return;
        }
        $event.preventDefault();
        if (action === 'close') {
          return clbUsercardPopover.open(null);
        }
        clbUsercardPopover.open(vm.popover.isOpen ? null : elt);
      };
    }
  };
}
