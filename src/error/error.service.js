/* global document */

angular.module('clb-error')
.factory('clbError', clbError);

/**
 * @class ClbError
 * @memberof module:clb-error
 * @desc
 * ``ClbError`` describes a standard error object used
 * to display error message or intropect the situation.
 *
 * A ``ClbError`` instance provides the following properties:
 *
 * * ``type`` a camel case name of the error type.
 * * `message` a human readable message of the error that should
 * be displayed to the end user.
 * * ``data`` any important data that might help the software to
 * inspect the issue and take a recovering action.
 * * ``code`` an error numerical code.
 *
 * The ClbError extends the native Javascript Error instance so it also provides:
 * * ``name`` which is equal to the type
 * * ``stack`` the stack trace of the error (when available)
 *
 * Only ``type``, ``message``, and ``code`` should be considered to be present.
 * They receive default values when not specified by the situation.
 *
 * @param {object} [options] the parameters to use to build the error
 * @param {string} [options.type] the error type (default to ``'UnknownError'``)
 * @param {string} [options.message] the error message (default to ``'An unknown error occurred'``)
 * @param {int} [options.code] the error code (default to ``-1``)
 * @param {object} [options.data] any data that can be useful to deal with the error
 */
function ClbError(options) {
  options = angular.extend({
    type: 'UnknownError',
    message: 'An unknown error occurred.',
    code: -1
  }, options);
  this.type = options.type || options.name;
  this.name = this.type; // Conform to Error class
  this.message = options.message;
  this.data = options.data;
  this.code = options.code;
  this.stack = (new Error()).stack;
  if (options instanceof Error) {
    // in case this is a javascript exception, keep the raw cause in data.cause
    this.data = angular.extend({cause: options}, this.data);
  }
}
// Extend the Error prototype
ClbError.prototype = Object.create(Error.prototype);
ClbError.prototype.toString = function() {
  return String(this.type) + ':' + this.message;
};

/**
 * @namespace clbError
 * @memberof module:clb-error
 * @desc
 * ``clbError`` provides helper functions that all return an
 * ``ClbError`` instance given a context object.
 * @param {object} $q AngularJS injection
 * @return {object} the service singleton
 */
function clbError($q) {
  return {
    rejectHttpError: function(err) {
      return $q.reject(httpError(err));
    },
    httpError: httpError,

    /**
     * Build a ``ClbError`` instance from the provided options.
     *
     * - param  {Object} options argument passed to ``ClbError`` constructor
     * - return {ClbError} the resulting error
     * @memberof module:clb-error.clbError
     * @param  {object} options [description]
     * @return {object}         [description]
     */
    error: function(options) {
      if (options && options instanceof ClbError) {
        return options;
      }
      return new ClbError(options);
    }
  };

  /**
   * @desc
   * return a `ClbError` instance built from a HTTP response.
   *
   * In an ideal case, the response contains json data with an error object.
   * It also fallback to a reason field and fill default error message for
   * standard HTTP status error.
   * @memberof module:clb-error.clbError
   * @param  {HttpResponse} response Angular $http Response object
   * @return {ClbError} a valid ClbError
   */
  function httpError(response) {
    // return argument if it is already an
    // instance of ClbError
    if (response && response instanceof ClbError) {
      return response;
    }

    if (response.status === undefined) {
      return new ClbError({
        message: 'Cannot parse error, invalid format.'
      });
    }
    var error = new ClbError({code: response.status});

    if (error.code === 0) {
      error.type = 'ClientError';
      error.message = 'The client cannot run the request.';
      return error;
    }
    if (error.code === 404) {
      error.type = 'NotFound';
      error.message = 'Resource not found';
      return error;
    }
    if (error.code === 403) {
      error.type = 'Forbidden';
      error.message = 'Permission denied: you are not allowed to display ' +
                      'the page or perform the operation';
      return error;
    }
    if (error.code === 502) {
      error.type = 'BadGateway';
      error.message = '502 Bad Gateway Error';
      if (response.headers('content-type') === 'text/html') {
        var doc = document.createElement('div');
        doc.innerHTML = response.data;
        var titleNode = doc.getElementsByTagName('title')[0];
        if (titleNode) {
          error.message = titleNode.innerHTML;
        }
      }
      return error;
    }
    if (response.data) {
      var errorSource = response.data;
      if (errorSource.error) {
        errorSource = errorSource.error;
      }
      if (errorSource.type) {
        error.type = errorSource.type;
      }
      if (errorSource.data) {
        error.data = errorSource.data;
      }
      if (errorSource.message) {
        error.message = errorSource.message;
      } else if (errorSource.reason) {
        error.type = 'Error';
        error.message = errorSource.reason;
      }

      if (!errorSource.type && !errorSource.data &&
        !errorSource.message && !errorSource.reason) {
        // unkown format, return raw data
        error.data = errorSource;
      }
    }
    return error;
  }
}
