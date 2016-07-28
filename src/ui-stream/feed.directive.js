angular.module('clb-ui-stream')
.directive('clbFeed', clbFeed);

/**
 * @name clbFeed
 * @desc
 * ``clb-feed`` directive displays a feed of activity retrieved by
 * the HBP Stream service. It handles scrolling and loading of activities.
 * Each activity is rendered using the ``clb-activity`` directive.
 *
 * @memberof module:clb-ui-stream
 * @return {object} the directive
 */
function clbFeed() {
  return {
    restrict: 'E',
    scope: {
      feedType: '=clbFeedType',
      feedId: '=clbFeedId'
    },
    controller: FeedController,
    controllerAs: 'vm',
    bindToController: true,
    templateUrl: 'feed.directive.html',
    link: function(scope, elt) {
      elt.addClass('clb-feed');
      var unbind = scope.$on(
        'clbActivity.interaction',
        function($event, data) {
          data.feedType = scope.feedType;
          scope.$emit('clbFeed.interaction', data);
        }
      );
      scope.$on('$destroy', unbind);
    }
  };
}

/**
 * ViewModel of an activity used to render the clb-activity directive
 * @param {object} $rootScope angular injection
 * @param {object} clbStream DI
 * @param {object} clbUser DI
 */
function FeedController($rootScope, clbStream, clbUser) {
  var vm = this;

  if (vm.feedType === 'HBPCollab') {
    vm.pageSize = 15;
  }

  vm.feedDate = null;

  activate();

  $rootScope.$on('feedDate.changed', function(event, data) {
    vm.feedDate = data;
    activate();
  });
  /* ------------- */

  function hydrateActors(activities) {  // eslint-disable-line require-jsdoc
    if (!activities || activities.length === 0) {
      return;
    }

    var acc = [];
    for (var i = 0; i < activities.length; i++) {
      if (activities[i].actor.type === 'HBPUser') {
        acc.push(activities[i].actor.id);
      }
    }
    return clbUser.get(acc)
    .then(function(users) {
      for (var i = 0; i < activities.length; i++) {
        var actor = activities[i].actor;
        if (actor.type === 'HBPUser' && users[actor.id]) {
          actor.data = users[actor.id];
        }
      }
    });
  }

  /**
   * init controller
   */
  function activate() {
    vm.loadingFeed = true;
    clbStream.getStream(vm.feedType, vm.feedId, {
      resultsFactory: hydrateActors,
      date: vm.feedDate,
      pageSize: vm.pageSize
    })
    .then(function(rs) {
      vm.activities = rs;
    })
    .catch(function(err) {
      vm.error = err.message;
    }).finally(function() {
      vm.loadingFeed = false;
    });
  }
}
