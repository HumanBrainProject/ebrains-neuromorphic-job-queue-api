angular.module('clb-app')
.factory('clbPaginatedResultSet', clbPaginatedResultSet);

/**
 * @namespace clbPaginatedResultSet
 * @memberof module:clb-app
 * @param  {object} $http           Angular Injection
 * @param  {object} $q              Angular Injection
 * @param  {object} clbError Angular Injection
 * @return {object}                 Angular Service
 */
function clbPaginatedResultSet($http, $q, clbError) {
  /**
   * @attribute ResultSetEOL
   * @memberof module:clb-app.clbPaginatedResultSet
   * @desc error thrown when hbpUtil.ResultSet is crawled when at an
   *       extremity.
   */
  var ResultSetEOL = clbError.error({
    type: 'ResultSet::EOL',
    message: 'End of list reached'
  });

  return {
    get: getPaginatedResultSet,
    EOL: ResultSetEOL
  };

  /**
   * @name get
   * @memberof module:clb-app.clbPaginatedResultSet
   * @desc
   * Return a promise that will resolve once the result set first page is loaded.
   *
   * The promise contains the `instance` of the result set as well.
   *
   * @param  {Object} res     a HTTPResponse or a promise which resolve to a HTTPResponse
   * @param  {Object} [options] configuration
   * @param  {string} [options.nextUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch next results
   * @param  {string} [options.previousUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch previous results
   * @param  {string} [options.resultKey] name of (or dot notation path to) the attribute containing an array with all the results
   * @param  {string} [options.countKey] name of (or dot notation path to) the attribute containing the number of results returned
   * @param  {function} [options.resultsFactory] a function to which a new array of results is passed.
   *                    The function can return `undefined`, a `promise` or an `array` as result.
   * @return {ResultSet}a new instance of ResultSet
   */
  function getPaginatedResultSet(res, options) {
    return new ResultSet(res, options).promise;
  }

  /**
   * @class ResultSet
   * @memberof module:clb-app.clbPaginatedResultSet
   * @desc
   * Build a result set with internal support for fetching next and previous results.
   *
   * @param {Object} pRes the promise of the first result page
   * @param {Object} options various options to specify how to handle the pagination
   * @see {module:clb-app.clbPaginatedResultSet.get}
   */
  function ResultSet(pRes, options) {
    var self = this;

    self.results = [];
    self.error = null;
    self.hasNext = null;
    self.hasPrevious = null;
    self.promise = null;
    self.errorHandler = null;
    self.next = enqueue(next);
    self.previous = enqueue(previous);
    self.toArray = enqueue(toArray);
    self.count = -1;

    options = angular.extend({
      resultKey: 'results',
      nextUrlKey: 'next',
      previousUrlKey: 'previous',
      countKey: 'count'
    }, options);

    self.promise = $q.when(pRes)
    .then(initialize)
    .catch(handleError);
    self.promise.instance = self;

    /**
     * @name next
     * @memberOf hbpUtil.ResultSet
     * @desc
     * Retrieve the next result page.
     * @memberof module:clb-app.clbPaginatedResultSet.ResultSet
     *
     * @return {Object} a promise that will resolve when the next page is fetched.
     */
    function next() {
      if (!self.hasNext) {
        return $q.reject(ResultSetEOL);
      }
      return $http.get(self.nextUrl)
      .then(handleNextResults);
    }

    /**
     * @name previous
     * @memberOf hbpUtil.ResultSet
     * @desc
     * Retrieve the previous result page
     *
     * @return {Object} a promise that will resolve when the previous page is fetched.
     */
    function previous() {
      if (!self.hasPrevious) {
        return $q.reject(ResultSetEOL);
      }
      return $http.get(self.previousUrl)
      .then(handlePreviousResults);
    }

    /**
     * @name toArray
     * @memberof hbpUtil.ResultSet
     * @desc
     * Retrieve an array containing ALL the results. Beware that this
     * can be very long to resolve depending on your dataset.
     *
     * @return {Promise} a promise that will resolve to the array when
     * all data has been fetched.
     */
    function toArray() {
      if (self.hasNext) {
        return next().then(toArray);
      }
      return self.results.slice();
    }

    /**
     * parse the next result set according to options.
     * @param  {HTTPResponse} res response containing the results.
     * @return {ResultSet} self for chaining
     * @private
     */
    function handleNextResults(res) {
      var rs = res.data;
      var result = at(rs, options.resultKey);

      var fResult;
      if (options.resultsFactory) {
        fResult = options.resultsFactory(result);
      }
      return $q.when(fResult)
      .then(function(computedResult) {
        self.results.push.apply(self.results, (computedResult || result));
        counting(rs);
        bindNext(rs);
        return self;
      });
    }

    /**
     * parse the previous result set according to options.
     * @param  {HTTPResponse} res response containing the results.
     * @return {ResultSet} self for chaining
     * @private
     */
    function handlePreviousResults(res) {
      var rs = res.data;
      var result = at(rs, options.resultKey);
      var fResult;
      if (options.resultsFactory) {
        fResult = options.resultsFactory(result);
      }
      return $q.when(fResult)
      .then(function(computedResult) {
        self.results.unshift.apply(self.results, (computedResult || result));
        counting(rs);
        bindPrevious(rs);
        return self;
      });
    }

    /**
     * @name at
     * @desc
     * Lodash 'at' function replacement. This is needed because the 'at' function
     * supports Object as first arg only starting from v4.0.0.
     * Migration to that version has big impacts.
     *
     * See: https://lodash.com/docs#at
     * @param {object} obj the object to search in
     * @param {string} desc the dotted path to the location
     * @return {instance} the found value
     * @private
     */
    function at(obj, desc) {
      var arr = desc.split('.');
      while (arr.length && obj) {
        obj = obj[arr.shift()];
      }
      return obj;
    }

    /**
     * Handle an error retrieved by calling
     * ``options.errorHandler``, passing the ``ClbError`` instance in parameter
     * if ``options.errorHandler`` is a function.
     * Then reject the current request with the same error instance.
     * @param  {object} res the HTTP error object
     * @return {Promise} rejected Promise with the error.
     * @private
     */
    function handleError(res) {
      self.error = clbError.httpError(res);
      if (angular.isFunction(options.errorHandler)) {
        options.errorHandler(self.error);
      }
      return $q.reject(self.error);
    }

    /**
     * Configure the next page state of the result set.
     * @param  {object} rs the last page results.
     * @private
     */
    function bindNext(rs) {
      self.nextUrl = at(rs, options.nextUrlKey);
      self.hasNext = Boolean(self.nextUrl);
    }

    /**
     * Configure the previous page state of the result set.
     * @param  {object} rs the last page results.
     * @private
     */
    function bindPrevious(rs) {
      self.previousUrl = at(rs, options.previousUrlKey);
      self.hasPrevious = Boolean(self.previousUrl);
    }

    /**
     * Set the current count of results.
     * @param  {object} rs the last page results.
     * @private
     */
    function counting(rs) {
      var c = at(rs, options.countKey);
      if (angular.isDefined(c)) {
        self.count = c;
      }
    }

    /**
     * Ensure that we don't mess with query result order.
     * @param  {Function} fn the next function to run once all pending calls
     *                       have been resolved.
     * @return {Promise}     the promise will resolve when this function had run.
     * @private
     */
    function enqueue(fn) {
      return function() {
        self.promise = $q
        .when(self.promise.then(fn))
        .catch(handleError);
        self.promise.instance = self;
        return self.promise;
      };
    }

    /**
     * Bootstrap the pagination.
     * @param  {HTTPResponse|Promise} res Angular HTTP Response
     * @return {ResultSet} self for chaining
     */
    function initialize(res) {
      return handleNextResults(res)
      .then(function() {
        bindPrevious(res.data);
        return self;
      });
    }
  }
}
