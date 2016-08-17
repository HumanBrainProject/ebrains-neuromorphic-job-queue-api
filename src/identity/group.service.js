angular.module('clb-identity')
.factory('clbGroup', clbGroup);

/**
 * ``clbGroup`` service let you retrieve and edit groups.
 *
 * @namespace clbGroup
 * @memberof module:clb-identity
 * @param  {object} $rootScope      Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $cacheFactory   Angular DI
 * @param  {object} lodash          Angular DI
 * @param  {object} clbEnv          Angular DI
 * @param  {object} clbError        Angular DI
 * @param  {object} clbResultSet    Angular DI
 * @param  {object} clbIdentityUtil Angular DI
 * @return {object} Angular Service
 */
function clbGroup(
  $rootScope,
  $q,
  clbAuthHttp,
  $cacheFactory,
  lodash,
  clbEnv,
  clbError,
  clbResultSet,
  clbIdentityUtil
) {
  var groupsCache = $cacheFactory('hbpGroupsCache');
  var groupUrl = clbEnv.get('api.user.v1') + '/group';

  var service = {
    get: get,
    getByName: getByName,
    create: createGroup,
    update: updateGroup,
    delete: deleteGroup,
    getMembers: getMembers,
    getEpflSyncMembers: getEpflSyncMembers,
    getMemberGroups: getMemberGroups,
    getAdmins: getAdmins,
    getAdminGroups: getAdminGroups,
    getParentGroups: getParentGroups,
    getManagedGroups: getManagedGroups,
    list: list,
    search: search
  };

  lodash.each(['members', 'admins', 'member-groups', 'admin-groups'],
    function(rel) {
      var batchQuery = function(groupName, relIds, method) {
        relIds = lodash.isArray(relIds) ? relIds : [relIds];
        return $q.all(lodash.map(relIds, function(relId) {
          var url = [groupUrl, groupName, rel, relId].join('/');
          return clbAuthHttp({
            method: method,
            url: url
          }).then(function() {
            return relId;
          });
        })).catch(clbError.rejectHttpError);
      };
      service[lodash.camelCase('add-' + rel)] = function(groupName, relIds) {
        return batchQuery(groupName, relIds, 'POST');
      };
      service[lodash.camelCase('remove-' + rel)] = function(groupName, relIds) {
        return batchQuery(groupName, relIds, 'DELETE');
      };
    }
  );

  return service;

  /**
   * Return pagination config to pass to ``clbResultSet.get``.
   * @param  {string} pluralType Plural form to look for in the results
   * @param  {function} factory  Factory function to use to build a batch of results
   * @return {object}            Options to pass to ``clbResultSet.get``
   */
  function paginationOptions(pluralType, factory) {
    return {
      nextUrlKey: '_links.next.href',
      previousUrlKey: '_links.prev.href',
      resultKey: '_embedded.' + pluralType,
      countKey: 'page.totalElements',
      resultsFactory: factory
    };
  }

  /**
   * @name get
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a group
   * based on the given `id`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String} groupId name of the group
   * @return {Promise} a promise that resolves to a group
   */
  function get(groupId) {
    return clbAuthHttp.get(groupUrl + '/' + groupId).then(function(resp) {
      return resp.data;
    }, clbError.rejectHttpError);
  }

  /**
   * @name getMembers
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of user
   * representing all the members of `groupId`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupId name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @param  {string} [options.sort] sort key as ``'attributeName,DESC'`` or ``'attributeName,ASC'``
   * @return {Promise} resolve to a ResultSet instance
   */
  function getMembers(groupId, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupId + '/members', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getEpflSyncMembers
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of user
   * representing all the epfl syncronized members of a group.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getEpflSyncMembers(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/epfl-synced-members', {
        params: clbIdentityUtil.queryParams()
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getMemberGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group members of `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getMemberGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/member-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getAdmins
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can administrate `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getAdmins(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/admins', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getAdminGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can administrate `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getAdminGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/admin-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getParentGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that are parent to the current `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getParentGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/parent-groups', {
        params: clbIdentityUtil.queryParams()
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getManagedGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can be administred by `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getManagedGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/managed-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name create
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve when the group has been created.
   *
   * In case of error, the promise is rejected with an HbpError instance.
   *
   * @param  {string} name the group name
   * @param {string} description the group description
   * @return {Promise} promise of creation completion
   */
  function createGroup(name, description) {
    return clbAuthHttp.post(groupUrl, {
      name: name,
      description: description
    })
    .then(function(res) {
      return res.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Update the given group.
   *
   * @param  {object} group a group object with a `name` and a `description`
   * @return {Promise} resolve to the updated group once the operation is complete
   */
  function updateGroup(group) {
    return clbAuthHttp.patch(groupUrl + '/' + group.name, {
      // only description field can be updated
      description: group.description
    })
    .then(function(res) {
      return angular.extend(group, res.data);
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * @name create
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve when the group has been created.
   *
   * In case of error, the promise is rejected with an HbpError instance.
   *
   * @param {string} groupId name the group
   * @return {Promise} promise of creation completion
   */
  function deleteGroup(groupId) {
    return clbAuthHttp.delete(groupUrl + '/' + groupId)
    .then(function() {
      return;
    })
    .catch(function(res) {
      return $q.reject(clbError.httpError(res));
    });
  }

  /**
   * @name getByName
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * return the group with the given name.
   * @param {String} groupName name of the group
   * @param {Array}  userIds a list of user id string to add to this group
   * @return {Promise} resolve to a group instance
   */
  function getByName(groupName) {
    var group = groupsCache.get(groupName);
    if (group) {
      return $q.when(group);
    }
    return list({
      filter: {name: groupName}
    }).then(function(resp) {
      var result;
      if (resp.results.length === 1) {
        groupsCache.put(groupName, resp.results[0]);
        result = resp.results[0];
      } else if (resp.results.length === 0) {
        result = undefined;
      } else {
        result = $q.reject(clbError.error({
          type: 'UnexpectedResult',
          message: 'More than one result has been retrieved'
        }));
      }
      return result;
    });
  }

  /**
   * @name list
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Retrieves a list of users filtered, sorted and paginated according to the options.
   *
   * The returned promise will be resolved with the list of fetched user profiles.
   *
   * Available options:
   *
   * - sort: properties to sort on. prepend '-'' to reverse order.
   * - page: page to be loaded (default: 0)
   * - pageSize: max number or items to be loaded (default: 10)
   * - filter: fiter object, wildcard admitted in the values
   * - factory: a function to be used to create object instance from the
   *            one result
   * @param  {object} options query options (see `available options`)
   * @return {Promise} resolves to a ResultSet instance
   */
  function list(options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = groupUrl;

    if (options.filter) { // search
      var supportedFilters = ['name', 'description'];
      url += '/search?';
      for (var k in options.filter) {
        if (options.filter.hasOwnProperty(k)) {
          if (supportedFilters.indexOf(k) === -1) {
            return $q.reject(clbError.error({
              type: 'FilterNotSupportedError',
              message: 'Cannot filter on property: ' + k
            }));
          }
        }
        var v = options.filter[k];
        if (angular.isArray(v)) {
          for (var i = 0; i < v.length; i++) {
            url += k + '=' + encodeURIComponent(v[i]) + '&';
          }
        } else {
          url += k + '=' + encodeURIComponent(v) + '&';
        }
        url = url.slice(0, -1);
      }
    }

    return clbResultSet.get(clbAuthHttp.get(url, {
      params: lodash.omit(params, 'filter')
    }), paginationOptions('groups', options.factory));
  }

  /**
   * Promise a list of groups who matched the given query string.
   *
   * @param  {string} queryString the search query
   * @param  {object} [options]   query options
   * @param  {int} [options.pageSize] the number of result to retrieve
   * @param {function} [options.factory] the factory function to use
   * @return {Promise} will return a ResultSet containing the results
   */
  function search(queryString, options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    params.str = queryString;
    var url = groupUrl + '/searchByText';
    return clbResultSet.get(clbAuthHttp.get(url, {
      params: params
    }), paginationOptions('groups', options.factory));
  }
}
