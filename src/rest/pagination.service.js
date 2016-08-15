angular.module('clb-rest')
.factory('clbResultSet', clbResultSet);

/**
 * @namespace clbResultSet
 * @memberof module:clb-rest
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}                 Angular Service
 */
function clbResultSet(clbAuthHttp, $q, clbError) {
  /**
   * @attribute ResultSetEOL
   * @memberof module:clb-rest.clbResultSet
   * @desc error thrown when module:clb-rest.ResultSet is crawled when at an
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
   * @memberof module:clb-rest.clbResultSet
   * @desc
   * Return a promise that will resolve once the result set first page is loaded.
   *
   * The promise contains the `instance` of the result set as well.
   *
   * @param  {Object} res     a HTTPResponse or a promise which resolve to a HTTPResponse
   * @param  {Object} [options] configuration
   * @param  {string} [options.nextUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch next results
   * @param  {function} [options.hasNextHandler] A function that receive the JSON data as its first argument and must
   *                                             return a boolean value that will be assigned to the ``hasNext`` property.
   *                                             When this option is given, ``options.nextUrlHandler`` SHOULD be defined as well.
   * @param  {function} [options.nextHandler] A function that receive the JSON data as its first argument and must return a promise
   *                                          to the next results. This handler will be called when ``next()`` is called on the
   *                                          RecordSet.
   *                                          When this option is given ``options.hasNextHandler`` MUST be defined as well.
   *                                          When this option is given ``options.nextUrlKey`` is ignored.
   * @param  {string} [options.previousUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch previous results
   * @param  {function} [options.hasPreviousHandler] A function that receive the JSON data as its first argument and must
   *                                                 return a boolean value that will be assigned to the ``hasPrevious`` property.
   *                                                 When this option is given, ``options.previousUrlHandler`` SHOULD be defined as well.
   * @param  {function} [options.previousHandler] A function that receive the JSON data as its first argument and must return a string value
   *                                              that represent the previous URL that will be fetched by a call to ``.previous()``.
   *                                              When this option is given ``options.hasPreviousHandler`` MUST be defined as well.
   *                                              When this option is given ``options.previousUrlKey`` is ignored.
   * @param  {string} [options.resultKey] name of (or dot notation path to) the attribute containing an array with all the results
   * @param  {string} [options.countKey] name of (or dot notation path to) the attribute containing the number of results returned
   * @param  {function} [options.resultsFactory] a function to which a new array of results is passed.
   *                    The function can return ``undefined``, a ``Promise`` or an ``array`` as result.
   * @return {Promise} After the promise is fulfilled, it will return a new instance of :doc:`module-clb-rest.clbResultSet.ResultSet`.
   */
  function getPaginatedResultSet(res, options) {
    return new ResultSet(res, options).promise;
  }

  /**
   * @class ResultSet
   * @memberof module:clb-rest.clbResultSet
   * @desc
   * Build a result set with internal support for fetching next and previous results.
   *
   * @param {Object} pRes the promise of the first result page
   * @param {Object} options various options to specify how to handle the pagination
   * @see {module:clb-rest.clbResultSet.get}
   */
  function ResultSet(pRes, options) {
    var self = this;
    // Hold call to next and previous when using customization.
    var wrappedNextCall;
    var wrappedPreviousCall;

    /**
     * The array containing all fetched results. Previous pages are added
     * to the beginning of the results, next pages at the end.
     * @type {array}
     */
    self.results = [];
    /**
     * Define with the last ClbError instance that occured.
     * @type {module:clb-error.ClbError}
     */
    self.error = null;
    /**
     * ``true`` if there is more results to be loaded.
     * @type {Boolean}
     */
    self.hasNext = null;
    /**
     * ``true`` if there is previous page to be loaded.
     * @type {Boolean}
     */
    self.hasPrevious = null;
    /**
     * The promise associated with the last operation in the queue.
     * @type {Promise}
     */
    self.promise = null;
    /**
     * A function that handle any error during an operation.
     * @type {Function}
     */
    self.errorHandler = null;
    self.next = enqueue(next);
    self.previous = enqueue(previous);
    self.toArray = enqueue(toArray);
    self.all = enqueue(all);
    self.count = -1;

    options = angular.extend({
      resultKey: 'results',
      nextUrlKey: 'next',
      hasNextHandler: function(rs) {
        // by default, has next is defined if the received data
        // defines a next URL.
        return Boolean(at(rs, options.nextUrlKey));
      },
      previousUrlKey: 'previous',
      hasPreviousHandler: function(rs) {
        // by default, has previous is defined if the received data
        // defines a next URL.
        return Boolean(at(rs, options.previousUrlKey));
      },
      countKey: 'count'
    }, options);

    self.promise = $q.when(pRes)
    .then(initialize)
    .catch(handleError);
    self.promise.instance = self;

    /**
     * @name next
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve the next result page.
     * @memberof module:clb-rest.clbResultSet.ResultSet
     *
     * @return {Object} a promise that will resolve when the next page is fetched.
     */
    function next() {
      if (!self.hasNext) {
        return $q.reject(ResultSetEOL);
      }
      var promise = (options.nextHandler ?
        wrappedNextCall() :
        clbAuthHttp.get(self.nextUrl)
      );
      return promise.then(handleNextResults);
    }

    /**
     * @name previous
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve the previous result page
     *
     * @return {Object} a promise that will resolve when the previous page is fetched.
     */
    function previous() {
      if (!self.hasPrevious) {
        return $q.reject(ResultSetEOL);
      }
      var promise = (options.previousHandler ?
        wrappedPreviousCall() :
        clbAuthHttp.get(self.previousUrl)
      );
      return promise.then(handlePreviousResults);
    }

    /**
     * @name toArray
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve an array containing ALL the results. Beware that this
     * can be very long to resolve depending on your dataset.
     *
     * @return {Promise} a promise that will resolve to the array when
     * all data has been fetched.
     */
    function toArray() {
      return all().then(function() {
        return self.results.slice();
      });
    }

    /**
     * Load all pages.
     * @memberof module:clb-rest.ResultSet
     * @return {Promise} Resolve once everything is loaded
     */
    function all() {
      if (self.hasNext) {
        return next().then(all);
      }
      return $q.when(self);
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
        fResult = options.resultsFactory(result, rs);
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
        fResult = options.resultsFactory(result, rs);
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
      self.hasNext = options.hasNextHandler(rs);
      if (options.nextHandler) {
        wrappedNextCall = function() {
          return options.nextHandler(rs);
        };
      } else if (self.hasNext) {
        self.nextUrl = at(rs, options.nextUrlKey);
      } else {
        self.nextUrl = null;
      }
    }

    /**
     * Configure the previous page state of the result set.
     * @param  {object} rs the last page results.
     * @private
     */
    function bindPrevious(rs) {
      self.hasPrevious = options.hasPreviousHandler(rs);
      if (options.previousHandler) {
        wrappedPreviousCall = function() {
          return options.previousHandler(rs);
        };
      } else if (self.hasPrevious) {
        self.previousUrl = at(rs, options.previousUrlKey);
      } else {
        self.previousUrl = null;
      }
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
     * @private
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
