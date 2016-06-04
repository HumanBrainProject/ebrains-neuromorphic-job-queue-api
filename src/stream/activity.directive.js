(function() {
  'use strict';
  angular.module('clb-stream')
  .directive('clbActivity', clbActivity);

  /**
   * @name clbActivity
   * @desc
   * ``clb-activity`` directive is displays an activity retrieved by
   * the HBP Stream service in a common way.
   *
   * It try to look up for a detailled description of the event and fallback
   * to the summary if he cannot.
   *
   * @memberof module:clb-stream
   * @return {object} the directive
   */
  function clbActivity() {
    return {
      restrict: 'A',
      scope: {
        activity: '=clbActivity'
      },
      controller: ActivityController,
      controllerAs: 'vm',
      bindToController: true,
      templateUrl: 'activity.directive.html',
      link: {
        post: function(scope, elt, attr, ctrl) {
          elt.addClass('clb-activity').addClass(ctrl.verbClass);
          scope.$watch('vm.activity.verb', function(newVal) {
            if (newVal) {
              elt.addClass('clb-activity-' + newVal.toLowerCase());
            }
          });
        }
      }
    };
  }

  /**
   * ViewModel of an activity used to render the clb-activity directive
   * @param {object} $log angular injection
   * @param {object} clbResourceLocator angular injection
   */
  function ActivityController($log, clbResourceLocator) {
    var vm = this;

    activate();

    /* ------------- */
    /**
     * init controller
     */
    function activate() {
      clbResourceLocator.urlFor(vm.activity.object)
      .then(function(url) {
        vm.primaryLink = url;
      })
      .catch(function(err) {
        $log.error(err);
      });
    }
  }
})();
