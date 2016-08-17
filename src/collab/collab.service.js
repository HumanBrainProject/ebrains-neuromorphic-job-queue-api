/* eslint camelcase:0 */
angular.module('clb-collab')
.factory('clbCollab', clbCollab);

/**
 * @namespace clbCollab
 * @memberof module:clb-collab
 * @desc
 * Provide a javascript client to query the Collab REST service.
 *
 * @param  {object} $log             Angular injection
 * @param  {object} $q               Angular injection
 * @param  {object} $cacheFactory    Angular injection
 * @param  {object} clbAuthHttp            Angular injection
 * @param  {object} lodash           Angular injection
 * @param  {object} clbContext       Angular injection
 * @param  {object} clbEnv           Angular injection
 * @param  {object} clbError         Angular injection
 * @param  {object} clbResultSet     Angular injection
 * @param  {object} clbUser          Angular injection
 * @param  {object} ClbCollabModel   Angular injection
 * @param  {object} ClbContextModel  Angular injection
 * @return {object}                  Angular Service
 */
function clbCollab(
  $log,
  $q,
  $cacheFactory,
  clbAuthHttp,
  lodash,
  clbContext,
  clbEnv,
  clbError,
  clbResultSet,
  clbUser,
  ClbCollabModel,
  ClbContextModel
) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var myCollabsUrl = urlBase + '/mycollabs/';
  var collabCache = $cacheFactory('clbCollabInstances');
  var ongoingCollabGetRequests = {};

  return {
    Collab: ClbCollabModel,   // backward compatibility
    Context: ClbContextModel, // backward compatibility
    context: clbContext,      // backward compatibility
    get: get,
    getByLabel: getByLabel,
    list: list,
    mine: mine,
    create: create,
    save: save,
    delete: deleteCollab
  };

  /**
   * Retrieve the promise of an ongoing request if it exists.
   * @param  {string} key caching key
   * @return {Promise}    the existing promise
   * @private
   */
  function getPromiseFromCache(key) {
    var collab = collabCache.get(key);
    if (collab) {
      return $q.when(collab);
    }
    if (ongoingCollabGetRequests[key]) {
      return ongoingCollabGetRequests[key];
    }
  }

  /**
   * Retrieve a collab.
   * @param  {string} url [description]
   * @param  {string} key cache key to retrieve
   * @return {Promise}    Resolve to a collab
   * @private
   */
  function getter(url, key) {
    if (!key) {
      return $q.reject(clbError.error({message: 'id parameter is required'}));
    }

    var promise = getPromiseFromCache(key);
    if (promise) {
      return promise;
    }

    ongoingCollabGetRequests[key] = clbAuthHttp.get(url + key + '/')
    .then(function(res) {
      ongoingCollabGetRequests[key] = null;
      return ClbCollabModel.fromJson(res.data);
    }, function(res) {
      ongoingCollabGetRequests[key] = null;
      return clbError.rejectHttpError(res);
    });
    return ongoingCollabGetRequests[key];
  }

  /**
   * Retrieve a collab given its id.
   * @param  {int} id the Collab ID
   * @return {Promise}    Will resolve to a ClbCollabModel
   */
  function get(id) {
    id = (id && id.id) || id;
    return getter(collabUrl, id).then(function(collab) {
      collabCache.put(collab.id, collab);
      return collab;
    });
  }

  /**
   * Ensure the collab is in cache for the given label.
   * @param  {ClbCollabModel} collab instance to cache
   * @param  {string} label   the label
   * @return {ClbCollabModel} the cached collab
   * @private
   */
  function cacheCollabWithLabel(collab, label) {
    // ensure the collab is in cache for this label
    // to avoid duplicate reference for it.
    if (!collab._label) {
      collab._label = label;
      collabCache.put(label, collab);
      collabCache.put(collab.id, collab);
    }
    return collab;
  }

  /**
   * Retrieve a collab using a string label.
   * @param  {string} label the label associated to the Collab
   * @return {Promise}      will resolve to a ClbCollabModel instance
   */
  function getByLabel(label) {
    return getter(urlBase + '/r/', label).then(function(collab) {
      // Ensure the collab has not been fetched by id already.
      // This might occurs if the collab was fetched by id the first
      // time. In this case, no way to know its associated label.
      var promise = getPromiseFromCache(collab.id);
      if (promise) {
        return promise.then(function(c) {
          return cacheCollabWithLabel(c, label);
        });
      }
      return cacheCollabWithLabel(collab, label);
    });
  }

  /**
   * @name list
   * @desc
   * list return the a hbpUtil.ResultSet instance containing the collab
   * matching the given parameters.
   *
   * @param {Object} [options] the request options
   * @param {string} [options.search] search string to filter the results
   * @param {(string|string[])} [options.id] string or array of collab ids
   * @param {int}  [options.pageSize=25] number of result per page
   * @param {int}  [options.page] the page to retrive
   * @param {Object} [options.params] DEPRECATED any query parameter
   * @param {string} [options.url] DEPRECATED overide the default URL
   * @return {hbpUtil.ResultSet} a result set of results
   */
  function list(options) {
    var url = collabUrl;
    var request;
    // support old signature (url, options)
    if (angular.isString(options)) {
      url = options;
      options = arguments[1];
    }
    options = angular.extend({}, options);

    if (angular.isArray(options.id)) {
      options.id = options.id.join(',');
    }

    if (options.pageSize) {
      options.page_size = options.pageSize;
    }

    if (options.url) { // Deprecated URL support
      request = clbAuthHttp.get(options.url);
    } else {
      request = clbAuthHttp.get(url, {
        params: angular.extend(
          {},
          options.params,
          lodash.pick(options, ['search', 'id', 'page_size', 'page'])
        )
      });
    }
    return clbResultSet.get(request, {
      resultsFactory: resultsFactory
    });
  }

  /**
   * @name mine
   * @description
   * `mine` return a hbpUtil.ResultSet of the user collabs.
   *
   * @param {Object} [options] request options
   * @param {string} [options.search] search string to filter the results
   * @param {int}  [options.pageSize] number of result per page
   * @param {int}  [options.page] the page to retrive
   * @return {hbpUtil.ResultSet} the current user collabs
   */
  function mine(options) {
    options = angular.extend({}, options);
    var params = angular.extend({}, lodash.pick(options, ['search']));
    return clbResultSet.get(clbAuthHttp.get(myCollabsUrl, {params: params}), {
      resultsFactory: resultsFactory
    });
  }

  /**
   * Create a new collab using a model instance or the server data representation.
   * @param  {object|ClbCollabModel} jsonCollab JSON representation of the new collab
   * @return {Promise}           Resolve to the new Collab
   */
  function create(jsonCollab) {
    var c = ClbCollabModel.fromJson(jsonCollab);
    return clbAuthHttp.post(collabUrl, c.toJson()).then(function(res) {
      c.update(res.data);
      collabCache.put(c.id, c);
      return c;
    }, clbError.rejectHttpError);
  }

  /**
   * Save a collab using its JSON server representation or a collab instance.
   * @param  {object|ClbCollabModel} jsonCollab JSON representation of a Collab
   * @return {Promise}           resolve to the Collab instance.
   */
  function save(jsonCollab) {
    var c = ClbCollabModel.fromJson(jsonCollab);
    return clbAuthHttp.put(collabUrl + c.id + '/', c.toJson())
    .then(function(res) {
      c.update(res.data);
      collabCache.put(c.id, c);
      return c;
    }, clbError.rejectHttpError);
  }

  /**
   * @function delete
   * @desc
   * Delete the collab.
   * @param  {ClbCollabModel} collab The collab instance to delete
   * @return {Promise}       Resolve once the delete operation is completed
   */
  function deleteCollab(collab) {
    return clbAuthHttp.delete(collabUrl + collab.id + '/').then(
      function() {
        collabCache.remove(collab.id);
        if (collab._label) {
          collabCache.remove(collab._label);
        }
      }, clbError.rejectHttpError
    );
  }

  /**
   * Build the instance from a result list.
   *
   * @param  {array} results Array of object
   * @return {array}         Array of Collab
   */
  function resultsFactory(results) {
    return lodash.map(results, ClbCollabModel.fromJson);
  }
}
