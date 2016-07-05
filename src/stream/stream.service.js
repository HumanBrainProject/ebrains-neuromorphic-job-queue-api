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
 * @param {function} clbEnv angular dependency injection
 * @param {function} clbError angular dependency injection
 * @param {function} clbResultSet angular dependency injection
 * @return {object} the clbActivityStream service
 */
function clbStream($http, $log, clbEnv, clbError, clbResultSet) {
  return {
    getStream: getStream
  };

  /* -------------------- */

  // Build activities
  function activityListFactoryFunc(next) { // eslint-disable-line require-jsdoc
    return function(results) {
      if (!(results && results.length)) {
        return;
      }
      for (var i = 0; i < results.length; i++) {
        var activity = results[i];
        if (activity.time) {
          activity.time = new Date(Date.parse(activity.time));
        }
      }
      if (next) {
        return next(results);
      }
      return results;
    };
  }

  /**
   * Get a feed of activities regarding an item type and id.
   * @memberof module:clb-stream.clbStream
   * @param  {string} type The type of object to get the feed for
   * @param  {string|int} id   The id of the object to get the feed for
   * @param  {object} options  Parameters to pass to the query
   * @return {Promise}         resolve to the feed of activities
   */
  function getStream(type, id, options) {
    options = angular.extend({}, options);
    options.resultsFactory = activityListFactoryFunc(
        options.resultsFactory);
    var url = clbEnv.get('api.stream.v0') + '/stream/' +
                         type + ':' + id + '/';
    return clbResultSet.get($http.get(url), options)
    .catch(clbError.rejectHttpError);
  }
}
