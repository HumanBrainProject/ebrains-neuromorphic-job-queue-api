(function() {
  'use strict';
  angular.module('clb-stream')
  .directive('clbFeed', clbFeed);

  /**
   * @name clbFeed
   * @desc
   * ``clb-feed`` directive displays a feed of activity retrieved by
   * the HBP Stream service. It handles scrolling and loading of activities.
   * Each activity is rendered using the ``clb-activity`` directive.
   *
   * @memberof module:clb-stream
   * @return {object} the directive
   */
  function clbFeed() {
    return {
      restrict: 'E',
      scope: {
        feedType: '=clbFeedType',
        feedId: '=clbFeedId'
      },
      controller: ActivityController,
      controllerAs: 'vm',
      bindToController: true,
      templateUrl: 'feed.directive.html',
      link: function(scope, elt) {
        elt.addClass('clb-feed');
      }
    };
  }

  /**
   * ViewModel of an activity used to render the clb-activity directive
   * @param {object} $log angular injection
   * @param {object} clbStream angular injection
   */
  function ActivityController($log, clbStream) {
    var vm = this;

    activate();

    /* ------------- */
    /**
     * init controller
     */
    function activate() {
      clbStream.getStream(vm.feedType, vm.feedId).then(function(rs) {
        vm.activities = rs;
      })
      .catch(function(err) {
        vm.error = err.message;
      });
    }
  }
})();
