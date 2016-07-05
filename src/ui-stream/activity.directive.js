angular.module('clb-ui-stream')
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
 * @memberof module:clb-ui-stream
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
        scope.$watch('vm.primaryLink', function(val) {
          if (val) {
            elt.addClass('clb-activity-activable');
          } else {
            elt.removeClass('clb-activity-activable');
          }
        });
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
 * @param {object} $sce      DI
 * @param {object} $log      DI
 * @param {object} $location DI
 * @param {object} clbResourceLocator DI
 */
function ActivityController($sce, $log, $location, clbResourceLocator) {
  var vm = this;
  vm.navigate = function() {
    $location.url(vm.primaryLink);
  };

  activate();

  /* ------------- */

  /**
   * init controller
   */
  function activate() {
    clbResourceLocator.urlFor(vm.activity.object, vm.activity)
    .then(function(url) {
      vm.primaryLink = url;
    })
    .catch(function(err) {
      $log.error(err);
    });
  }
}
