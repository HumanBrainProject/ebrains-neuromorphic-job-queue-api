(function() {
  'use strict';

  angular.module('clb-stream')
  .factory('clbStream', clbStream);

  /**
   * ``clbStream`` service is used to retrieve feed of activities
   * given a user, a collab or a specific context.
   *
   * @memberof module:clb-stream
   * @namespace clbStream
   * @param {function} $http angular dependency injection
   * @param {function} $log angular dependency injection
   * @param {function} bbpConfig angular dependency injection
   * @param {function} hbpUtil angular dependency injection
   * @return {object} the clbActivityStream service
   */
  function clbStream($http, $log, bbpConfig, hbpUtil) {
    return {
      getStream: getStream
    };

    /* -------------------- */

    /**
     * Get a feed of activities regarding an item type and id.
     * @memberof module:clb-stream.clbStream
     * @param  {string} type The type of object to get the feed for
     * @param  {string|int} id   The id of the object to get the feed for
     * @return {Promise}         resolve to the feed of activities
     */
    function getStream(type, id) {
      var url = hbpUtil.format('{0}/stream/{1}:{2}/', [
        bbpConfig.get('api.stream.v0'),
        type,
        id
      ]);
      return hbpUtil.paginatedResultSet($http.get(url), {
        resultsFactory: function(results) {
          if (!(results && results.length)) {
            return;
          }
          for (var i = 0; i < results.length; i++) {
            var activity = results[i];
            if (activity.time) {
              activity.time = new Date(Date.parse(activity.time));
            }
          }
        }
      })
      .catch(hbpUtil.ferr);
    }
  }
})();
