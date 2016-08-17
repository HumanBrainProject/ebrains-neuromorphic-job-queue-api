angular.module('clb-stream')
.factory('clbStream', clbStream);

/**
 * ``clbStream`` service is used to retrieve feed of activities
 * given a user, a collab or a specific context.
 *
 * @memberof module:clb-stream
 * @namespace clbStream
 * @param {function} clbAuthHttp angular dependency injection
 * @param {function} clbEnv angular dependency injection
 * @param {function} clbError angular dependency injection
 * @param {function} clbResultSet angular dependency injection
 * @param {function} moment angular dependency injection
 * @return {object} the clbActivityStream service
 */
function clbStream(clbAuthHttp, clbEnv, clbError, clbResultSet, moment) {
  return {
    getStream: getStream,
    getHeatmapStream: getHeatmapStream
  };

  /**
   * @name activityListFactoryFunc
   * @desc
   * Return activities
   *
   * @memberof module:clb-stream.clbStream
   * @param {boolean} next indicates if there is next page
   * @return {object} Activities
   */
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
   * Builds the URL options such as the from and to date
   * as well as the page_size
   * @memberof module:clb-stream.clbStream
   * @param {string} url original url
   * @param {object} options  pageSize:15, date:'2016-07-20'
   * @return {string} Built URL
   */
  function buildURLOptions(url, options) {
    // Addition of stream options e.g. date and page_size
    var paramToken = url.indexOf("?") === -1 ? "?" : "&";

    if (options.date) {
      var _targetDate = moment(options.date);
      var format = 'YYYY-MM-DD';
      url += paramToken + "from=" + _targetDate.format(format);
      url += "&to=" + _targetDate.add(1, 'day').format(format);
      paramToken = "&";
    }

    if (options.days) {
      url += paramToken + "days=" + options.days;
    } else if (options.pageSize) {
      url += paramToken + "page_size=" + options.pageSize;
    }

    return url;
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

    url = buildURLOptions(url, options);
    return clbResultSet.get(clbAuthHttp.get(url), options)
    .catch(clbError.rejectHttpError);
  }

  /**
   * Returns a heatmap stream of the number of activities per
   * day for a HBPUser or HBPCollab
   * @param  {string} type The type of object to get the feed for
   * @param  {string|int} id   The id of the object to get the feed for
   * @param  {object} options  Parameters to pass to the query
   * @return {Promise}         resolve to the feed of activities
   */
  function getHeatmapStream(type, id, options) {
    options = angular.extend({resultKey: 'details'}, options);
    options.resultsFactory = activityListFactoryFunc(options.resultsFactory);

    var url = clbEnv.get('api.stream.v0') + '/heatmap/' +
        type + ':' + id + '/';

    url = buildURLOptions(url, options);

    return clbResultSet.get(clbAuthHttp.get(url), options)
        .catch(clbError.rejectHttpError);
  }
}
