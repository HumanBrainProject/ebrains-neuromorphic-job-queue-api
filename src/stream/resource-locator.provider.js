(function() {
  'use strict';
  angular.module('clb-stream')
  .provider('clbResourceLocator', clbResourceLocatorProvider);

  var urlHandlers = [];

  /**
   * Configure the clbResourceLocator service.
   * @return {object} An AngularJS provider instance
   */
  function clbResourceLocatorProvider() {
    var provider = {
      $get: clbResourceLocator,
      registerUrlHandler: registerUrlHandler,
      urlHandlers: urlHandlers
    };

    /**
     * Add a function that can generate URL for some types of object reference.
     *
     * The function should return a string representing the URL.
     * Any other response means that the handler is not able to generate a proper
     * URL for this type of object.
     *
     * The function signature is ``function(objectReference) { return 'url' // or nothing}``
     * @memberof module:clb-stream
     * @param  {function} handler a function that can generate URL string for some objects
     * @return {provider} The provider, for chaining.
     */
    function registerUrlHandler(handler) {
      if (angular.isFunction(handler)) {
        urlHandlers.push(handler);
      }
      return provider;
    }

    return provider;
  }

  /**
   * @name clbResourceLocator
   * @desc
   * resourceLocator service
   * @memberof module:clb-stream
   * @param {object} $q AngularJS injection
   * @param {object} $log AngularJS injection
   * @param {object} hbpErrorService AngularJS injection
   * @param {object} hbpUtil AngularJS injection
   * @return {object} the service singleton
   */
  function clbResourceLocator($q, $log, hbpErrorService, hbpUtil) {
    return {
      urlFor: urlFor
    };

    /**
     * @desc
     * Asynchronous resolution of an object reference to an URL that access
     * this resource.
     *
     * The URL is generated using the registered URL handlers. If no URL
     * can be generated, a HbpError is thrown with ``type==='ObjectTypeException'``.
     * If the object reference is not valid, a HbpError is throw with
     * ``type==='AttributeError'``. In both case ``data.ref will be set with
     * reference for which there is an issue.
     *
     * @memberof module:clb-stream.clbResourceLocator
     * @param  {object} ref object reference
     * @return {string} a atring representing the URL for this object reference
     */
    function urlFor(ref) {
      if (!validRef(ref)) {
        return $q.reject(invalidReferenceException(ref));
      }
      var next = function(i) {
        if (i < urlHandlers.length) {
          return $q.when(urlHandlers[i](ref)).then(function(url) {
            if (angular.isString(url)) {
              $log.debug('generated URL', url);
              return url;
            }
            if (angular.isDefined(url)) {
              $log.warn('unexpected result from URL handler', url);
            }
            return next(i + 1);
          });
        }
        return $q.reject(objectTypeException(ref));
      };
      return next(0);
    }

    /**
     * build an objectTypeException.
     * @private
     * @param  {object} ref ClbObjectReference
     * @return {HbpError}   error to be sent
     */
    function objectTypeException(ref) {
      return hbpErrorService.error({
        type: 'ObjectTypeException',
        message: hbpUtil.format(
          'Unkown object type <{0}>', [ref && ref.type]),
        data: {ref: ref}
      });
    }

    /**
     * build an objectTypeException.
     * @private
     * @param  {object} ref ClbObjectReference
     * @return {HbpError}   error to be sent
     */
    function invalidReferenceException(ref) {
      return hbpErrorService.error({
        type: 'AttributeError',
        message: hbpUtil.format('Invalid object reference <' + ref + '>'),
        data: {ref: ref}
      });
    }

    /**
     * Return wheter the object reference is valid or not.
     *
     * To be valid an ObjectReference must have a defined ``id`` and ``type``
     * @param  {any} ref the potential object reference
     * @return {boolean} whether it is or not an object reference
     */
    function validRef(ref) {
      return Boolean(ref && ref.id && ref.type);
    }
  }
})();
