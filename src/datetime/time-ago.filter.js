(function() {
  'use strict';
  angular.module('clb-datetime')
  .filter('clbTimeAgo', clbTimeAgo);

  /**
   * @name clbTimeAgo
   * @desc
   * ``clbTimeAgo`` filter retrieves a string representing the time spent
   * between now and the given date representation.
   *
   * @memberof module:clb-datetime
   * @param  {object} moment AngularJS injection
   * @return {function} the filter function
   */
  function clbTimeAgo(moment) {
    return function(input) {
      return moment(input).fromNow();
    };
  }
})();
