/* eslint max-lines: 0 */

angular.module('clb-identity')
.factory('clbUser', clbUser);

/**
 * ``clbUser`` service let you retrieve and edit user and groups.
 *
 * @namespace clbUser
 * @memberof module:clb-identity
 * @param  {object} $rootScope      Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $cacheFactory   Angular DI
 * @param  {object} $log            Angular DI
 * @param  {object} lodash          Angular DI
 * @param  {object} clbEnv          Angular DI
 * @param  {object} clbError        Angular DI
 * @param  {object} clbResultSet    Angular DI
 * @param  {object} clbIdentityUtil Angular DI
 * @return {object} Angular Service
 */
function clbUser(
  $rootScope,
  $q,
  clbAuthHttp,
  $cacheFactory,
  $log,
  lodash,
  clbEnv,
  clbError,
  clbResultSet,
  clbIdentityUtil
) {
  var userCache = $cacheFactory('clbUser');
  var userUrl = clbEnv.get('api.user.v1') + '/user';
  // key used to store the logged in user in the cache
  var currentUserKey = '_currentUser_';
  activate();

  return {
    get: getPromiseId2userInfo,
    getCurrentUserOnly: getCurrentUserOnly,
    getCurrentUser: getCurrentUser,
    create: create,
    update: update,
    list: list,
    search: search,
    isGroupMember: isGroupMember,
    adminGroups: adminGroups,
    memberGroups: groups
  };

  /**
   * Bootstrap the service
   * @private
   */
  function activate() {
    $rootScope.$on('user:disconnected', function() {
      userCache.removeAll();
    });
  }

  /**
   * Create requests with a maximum length of 2000 chars.
   * @param  {array/any} source Array of params to generate URL for
   * @param  {string} urlPrefix   The beginning of the URL
   * @param  {string} destination An array to put all the URL into
   * @param  {string} argName     Name of the argument
   * @private
   */
  function splitInURl(source, urlPrefix, destination, argName) {
    if (source.length === 0) {
      return;
    }
    var url = urlPrefix + source[0];
    var sep = '&' + argName + '=';
    for (var i = 1; i < source.length; i++) {
      if (url.length + source[i].length + sep.length < 2000) {
        // If we still have enough room in the url we add the id to it
        url += sep + source[i];
      } else {
        // We flush the call and start a new one
        destination.push(url);
        url = urlPrefix + source[i];
      }
    }
    destination.push(url);
  }

  /**
   * Add a list of user to the cache.
   * @param {array} addedUserList Array of users to add
   * @param {object} response A key/value store where key is the user id
   * @private
   */
  function addToCache(addedUserList, response) {
    for (var i = 0; i < addedUserList.length; i++) {
      var addedUser = addedUserList[i];
      if (addedUser.displayName === undefined) {
        addedUser.displayName = addedUser.name;
      }
      // add to response
      response[addedUser.id] = addedUser;
      // add to cache
      userCache.put(addedUser.id, addedUser);
    }
  }

  /**
   * @desc
   * Return a promise that will resolve to a list of groups and users
   * based on the given array of ``ids``.
   *
   * In case of error, the promise is rejected with a ``ClbError`` instance.
   *
   * Return a promise with an map of id->userInfo based on the
   * provided list of IDs.
   * @function get
   * @memberof module:clb-identity.clbUser
   * @param  {array|string} ids One or more ID
   * @return {Promise}   Resolve to a map of ID/UserInfo
   * @private
   */
  function getPromiseId2userInfo(ids) {
    var deferred = $q.defer();

    var uncachedUser = [];
    var response = {};
    var urls = [];
    var single = false; // flag to support single user call

    if (!ids) {
      ids = [];
    }

    if (!angular.isArray(ids)) {
      ids = [ids];
      single = true;
    }

    var rejectDeferred = function() {
      deferred.reject.apply(deferred, ids);
    };
    var processResponseAndCarryOn = function(data) {
      // atm group and user api response data format is different
      var items;
      if (data.data.result) {
        items = data.data.result;
      } else if (data.data._embedded.users) {
        items = data.data._embedded.users;
      } else if (data.data._embedded.groups) {
        items = data.data._embedded.groups;
      } else if (data.data.content) {
        items = data.data.content;
      } else {
        $log.error('Unable to find a resultset in data', data);
      }
      addToCache(items, response);
      if (urls && urls.length > 0) {
        return clbAuthHttp.get(urls.shift())
        .then(processResponseAndCarryOn, rejectDeferred);
      }
      deferred.resolve(single ? response[ids[0]] : response);
    };

    angular.forEach(ids, function(id) {
      var user = userCache.get(id);
      if (user) { // The id is already cached
        response[id] = user;
      } else {
        uncachedUser.push(id);
      }
    });

    if (uncachedUser.length === 0) {
      // All ids are already available -> we resolve the promise
      deferred.resolve(single ? response[ids[0]] : response);
    } else {
      // Get the list of URLs to call
      var userBaseUrl = '/search?id=';
      splitInURl(uncachedUser, userUrl + userBaseUrl, urls, 'id');

      // Async calls and combination of result
      clbAuthHttp.get(urls.shift())
      .then(processResponseAndCarryOn, rejectDeferred);
    }

    return deferred.promise;
  }

   /**
    * @name isGroupMember
    * @desc
    * Return a promise that will resolve to true if the current user is a member of one of the groups in input.
    *
    * `groups` can be either a string or an array.
    *
    * @memberof module:clb-identity.clbUser
    * @function
    * @param  {array}  groups A list of groups
    * @return {Promise}       Resolve to a boolean
    */
  function isGroupMember(groups) {
    return this.getCurrentUser().then(function(user) {
      var compFunc = function(group) {
        return lodash.some(user.groups, function(g) {
          return g.name === group;
        });
      };
      var groupList = lodash.isArray(groups) ? groups : [groups];
      return lodash.some(groupList, compFunc);
    });
  }

  /**
   * Promise a ResultSet containing the groups that the user is member of.
   *
   * @param  {string} [userId] the user id or 'me' if unspecified
   * @param  {object} options optional request parameters
   * @param  {int} options.pageSize the size of a result page
   * @return {Promise}      will return a ResultSet of groups
   */
  function groups(userId, options) {
    if (angular.isObject(userId)) {
      options = userId;
      userId = 'me';
    }
    userId = userId || 'me';
    options = angular.extend({sort: 'name'}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = userUrl + '/' + userId + '/member-groups';
    if (options.filter) {
      try {
        url += '?' + appendFilterToPath(options.filter, ['name']);
      } catch (ex) {
        return $q.reject(ex);
      }
    }
    return clbResultSet.get(
      clbAuthHttp.get(url, {params: params}),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * Promise a ResultSet containing the groups that the user can administrate.
   *
   * @param  {string} [userId] the user id or 'me' if unspecified
   * @param  {object} options optional request parameters
   * @param  {int} options.pageSize the size of a result page
   * @return {Promise}      will return a ResultSet of groups
   */
  function adminGroups(userId, options) {
    if (angular.isObject(userId)) {
      options = userId;
      userId = 'me';
    }
    userId = userId || 'me';
    options = angular.extend({sort: 'name'}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = [userUrl, userId, 'admin-groups'].join('/');
    if (options.filter) {
      try {
        url += '?' + appendFilterToPath(options.filter, ['name']);
      } catch (ex) {
        return $q.reject(ex);
      }
    }
    return clbResultSet.get(
      clbAuthHttp.get(url, {
        params: params
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * Append a list of filters to an URL.
   * @param  {object} [filter] Keys are filter names and value is the filter string
   * @param  {array}  [supportedFilters] list of authorised keys for the filter property
   * @throws {HbpError} FilterNotSupportedError
   * @return {string}   resulting path
   * @private
   */
  function appendFilterToPath(filter, supportedFilters) {
    if (!filter) {
      return;
    }
    var queryString = '';
    var fn = function(k) {
      return function(vi) {
        queryString += k + '=' + encodeURIComponent(vi) + '&';
      };
    };
    for (var k in filter) {
      if (Object.prototype.hasOwnProperty.call(filter, k)) {
        if (supportedFilters.indexOf(k) === -1) {
          throw clbError.error({
            type: 'FilterNotSupportedError',
            message: 'Cannot filter on property: ' + k
          });
        }
        var v = filter[k];
        if (angular.isArray(v)) {
          lodash.each(v, fn(k));
        } else {
          queryString += k + '=' + encodeURIComponent(v) + '&';
        }
      }
    }
    return queryString.slice(0, -1);
  }

  /**
   * Return pagination config to pass to ``clbResultSet.get``.
   * @param  {string} pluralType Plural form to look for in the results
   * @param  {function} factory  Factory function to use to build a batch of results
   * @return {object}            Options to pass to ``clbResultSet.get``
   */
  function paginationOptions(pluralType, factory) {
    return {
      resultKey: '_embedded.' + pluralType,
      nextUrlKey: '_links.next.href',
      previousUrlKey: '_links.prev.href',
      countKey: 'page.totalElements',
      resultsFactory: factory
    };
  }

  /**
   * @name getCurrentUserOnly
   * @desc
   * Return a promise that will resolve to the current user, NOT including group
   * info.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @memberof module:clb-identity.clbUser
   * @return {Promise} Resolve to the current user
   */
  function getCurrentUserOnly() {
    var user = userCache.get(currentUserKey);
    if (user) {
      return $q.when(user);
    }
    // load it from user profile service
    return clbAuthHttp.get(userUrl + '/me').then(
      function(userData) {
        // merge groups into user profile
        var profile = userData.data;

        // add to cache
        userCache.put(currentUserKey, profile);
        return profile;
      }, clbError.rejectHttpError);
  }

  /**
   * @name getCurrentUser
   * @desc
   * Return a promise that will resolve to the current user.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @return {Promise} Resolve to the Current User
   */
  function getCurrentUser() {
    var user = userCache.get(currentUserKey);
    if (user && user.groups) {
      return $q.when(user);
    }

    var request = {};
    if (!user) {
      request.user = this.getCurrentUserOnly();
    }

    request.groups = clbResultSet.get(
      clbAuthHttp.get(userUrl + '/me/member-groups'),
      paginationOptions('groups')
    ).then(function(rs) {
      return rs.toArray();
    });

    // load it from user profile service
    return $q.all(request).then(function(aggregatedData) {
      // merge groups into user profile
      var profile = aggregatedData.user || user;
      profile.groups = aggregatedData.groups;

      // add to cache
      userCache.put(currentUserKey, profile);
      return profile;
    }, clbError.rejectHttpError);
  }

  /**
   * @name create
   * @desc
   * Create the given `user`.
   *
   * The method return a promise that will resolve to the created user instance.
   * In case of error, a `HbpError` instance is retrieved.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param {object} user Data to build the user from
   * @return {Promise} Resolve to the new User
   */
  function create(user) {
    return clbAuthHttp.post(userUrl, user).then(
      function() {
        return user;
      },
      clbError.rejectHttpError
    );
  }

  /**
   * @name update
   * @desc
   * Update the described `user` with the given `data`.
   *
   * If data is omitted, `user` is assumed to be the updated user object that
   * should be persisted. When data is present, user can be either a `User`
   * instance or the user id.
   *
   * The method return a promise that will resolve to the updated user instance.
   * Note that this instance is a copy of the user. If you own a user instance
   * already, you cannot assume this method will update it.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param  {object} user User to update
   * @param  {object} [data] Data to update the user with if not already in ``user`` instance
   * @return {Promise}       Resolve to the User instance
   */
  function update(user, data) {
    data = data || user;
    var id = (typeof user === 'string' ? user : user.id);
    return clbAuthHttp.patch(userUrl + '/' + id, data).then(
      function() {
        userCache.remove(id);
        var cachedCurrentUser = userCache.get(currentUserKey);
        if (cachedCurrentUser && cachedCurrentUser.id === id) {
          userCache.remove(currentUserKey);
        }
        return getPromiseId2userInfo([id]).then(
          function(users) {
            return lodash.first(lodash.values(users));
          }
        );
      },
      clbError.rejectHttpError
    );
  }

  /**
   * @name list
   * @desc
   * Retrieves a list of users filtered, sorted and paginated according to the options.
   *
   * The returned promise will be resolved with the list of fetched user profiles
   * and 2 fuctions (optional) to load next page and/or previous page.
   * {{next}} and {{prev}} returns a promise that will be resolved with an object
   * like the one returned by the current function.
   *
   * Return object example:
   * {
   *  results: [...],
   *  next: function() {},
   *  prev: function() {}
   * }
   *
   * Available options:
   *
   * * sort: property to sort on. prepend '-' to reverse order.
   * * page: page to be loaded (default: 0)
   * * pageSize: max number or items to be loaded (default: 10, when 0 all records are loaded)
   * * filter: an Object containing the field name as key and
   *       the query as a String or an Array of strings
   * * managedOnly: returns only the users managed by the current logged in user
   *
   * Supported filter values:
   *
   * * ``'displayName'``
   * * ``'email'``
   * * ``'id'``
   * * ``'username'``
   * * ``'accountType'``
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param {object} [options] Parameters to use
   * @param {string} [options.sort] Attribute to sort the user with (default to ``'familyName'``)
   * @param {string} [options.filter] Object containing query filters
   * @param {function} [options.factory] A function that accept an array of user data and build object from them
   * @param {int} [options.pageSize] The number of result per page ; if 0, load all results
   * @param {int} [options.page] The result page to retrieve
   * @return {Promise} Resolve to the user ResultSet instance
   */
  function list(options) {
    var opt = angular.extend({
      sort: 'familyName'
    }, options);
    var endpoint = userUrl;

    // append filter part to endpoint
    if (opt.filter) {
      var supportedFilters = [
        'displayName',
        'email',
        'id',
        'username',
        'accountType'
      ];
      try {
        endpoint += '/search?' + appendFilterToPath(
          opt.filter, supportedFilters);
      } catch (ex) {
        return $q.reject(ex);
      }
    }

    var pageOptions = paginationOptions('users', opt.factory);
    var params = clbIdentityUtil.queryParams(opt);

    var result = clbResultSet.get(clbAuthHttp.get(endpoint, {
      params: params
    }), pageOptions);

    // if pageSize=0 load everything
    return (opt.pageSize === 0) ? result.instance.all() : result;
  }

  /**
   * Promise a list of users who matched the given query string.
   *
   * @memberof module:clb-identity.clbUser
   * @param  {string} queryString the search query
   * @param  {object} [options]   query options
   * @param  {int} [options.pageSize] the number of result to retrieve
   * @param  {function} [options.factory] the factory function to use
   * @return {Promise} will return a ResultSet containing the results
   */
  function search(queryString, options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    params.str = queryString;
    var url = userUrl + '/searchByText';

    return clbResultSet.get(clbAuthHttp.get(url, {
      params: params
    }), paginationOptions('users', options.factory));
  }
}
