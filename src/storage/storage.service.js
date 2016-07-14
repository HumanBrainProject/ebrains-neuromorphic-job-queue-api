/* eslint max-lines:0 camelcase:0 */

angular.module('clb-storage')
.factory('clbStorage', clbStorage);

/**
 * @typedef {object} EntityDescriptor
 * @memberof module:clb-storage
 * @property {UUID} _uuid         The entity UUID
 * @property {string} _entityType The entity type (e.g.: ``file``, ``folder``, ``project``)
 * @desc
 * Describe an arbitrary entity in the storage stytem. The principal types are
 *
 * - `file`: the entity is a file whose content can be retrieved
 * - `folder`: the entity is a folder and can be the parent of other entities
 * - `project`: First level folder. It behave like a folder but also defines the ACL for all the children
 */

/**
 * @namespace clbStorage
 * @memberof module:clb-storage
 * @desc
 * The ``clbStorage`` service provides utility functions to ease the interaction
 * of apps with storage.
 * @param  {object} $http        Angular DI
 * @param  {object} $q           Angular DI
 * @param  {object} $log         Angular DI
 * @param  {object} uuid4        Angular DI
 * @param  {object} clbEnv       Angular DI
 * @param  {object} clbError     Angular DI
 * @param  {object} clbUser      Angular DI
 * @param  {object} clbResultSet Angular DI
 * @return {object}              Angular DI
 */
function clbStorage(
  $http,
  $q,
  $log,
  uuid4,
  clbEnv,
  clbError,
  clbUser,
  clbResultSet
) {
  var baseUrl = clbEnv.get('api.document.v0');
  var maxFileSize = clbEnv.get('hbpFileStore.maxFileUploadSize', 41943040);
  var entityUrl = baseUrl + '/entity';
  var fileUrl = baseUrl + '/file';
  var promises = {};
  return {
    getEntity: getEntity,
    getAbsolutePath: getAbsolutePath,
    upload: upload,
    query: query,
    getContent: getContent,
    downloadUrl: downloadUrl,
    getChildren: getChildren,
    getUserAccess: getUserAccess,
    getAncestors: getAncestors,
    isContainer: isContainer,
    copy: copy,
    create: create,
    delete: deleteEntity,
    setContextMetadata: setContextMetadata,
    deleteContextMetadata: deleteContextMetadata,
    updateContextMetadata: updateContextMetadata,
    addMetadata: addMetadata,
    deleteMetadata: deleteMetadata
  };

  // -------------------- //

  /**
   * Get an entity (e.g.: a project, a file or a folder) using a locator. The
   * only accepted locator at this time is the entity UUID.
   *
   * - the entity UUID
   * - an entity representation with ``{_uuid: ENTITY_UUID}``
   * - the entity related context ``{ctx: CONTEXT_UUID}``
   * - the entity collab ID ``{collab: COLLAB_ID}``
   * - the entity absolute path
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {any} locator  Describe the entity to retrieve (see description).
   * @return {Promise}               Return a :doc:`module-clb-storage.EntityDescriptor` when fulfilled
   *                                 or reject a :doc:`module-clb-error.ClbError`
   */
  function getEntity(locator) {
    if (!locator) {
      return $q.reject(clbError.error({
        type: 'InvalidArgument',
        message: 'locator argument is mandatory'
      }));
    }
    $log.debug('clbStorage.getEntity using locator', locator);
    if (angular.isString(locator) && uuid4.validate(locator)) {
      return getEntityByUUID(locator);
    }
    if (angular.isObject(locator)) {
      if (uuid4.validate(locator._uuid)) {
        return getEntityByUUID(locator._uuid);
      }
      if (locator.ctx && uuid4.validate(locator.ctx)) {
        return getEntityByContext(locator.ctx);
      }
      if (locator.collab) {
        return getCollabHome(locator.collab);
      }
    }
    return $q.reject(clbError.error({
      type: 'InvalidArgument',
      message: 'Unable to locate entity because the `locator` argument' +
               ' is not valid: ' + String(locator),
      code: -10,
      data: {
        locator: locator
      }
    }));
  }

  /**
   * Return the absolute path of the entity
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {object|UUID}   entity UUID or descriptor
   * @return {Promise}       return a path string when fulfilled.
   */
  function getAbsolutePath(entity) {
    if (!entity) {
      return $q.when(null);
    }
    var uuid = entity._uuid || entity;
    return $http.get(baseUrl + '/entity_path/' + uuid)
    .then(function(res) {
      return res.data._path;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Ensure there is only one async `fn` run named `k` at once.
   * subsequent call to runOnce with the same `k` value will
   * return the promise of the running async function.
   * @memberof module:clb-storage.clbStorage
   * @param  {string}   k  The key
   * @param  {Function} fn The function that retrieve a Promise
   * @return {Promise}     Resolve to the function result
   * @private
   */
  function runOnce(k, fn) {
    if (!promises[k]) {
      promises[k] = fn().finally(function() {
        promises[k] = null;
      });
    }
    return promises[k];
  }

  /**
   * @memberof module:clb-storage.clbStorage
   * @param  {string} uuid Entity UUID
   * @return {Promise}     Resolve to the entity Descriptor
   * @private
   */
  function getEntityByUUID(uuid) {
    var url = entityUrl + '/' + uuid;
    var k = 'GET ' + url;
    return runOnce(k, function() {
      return $http.get(url).then(function(data) {
        return data.data;
      }).catch(clbError.rejectHttpError);
    });
  }

  /**
   * Query entities by attributes or metadata.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} params Query Parameters
   * @return {Promise}      Return the results
   */
  function query(params) {
    $log.debug('clbStorage.query with', params);
    return $http.get(entityUrl + '/', {
      params: params
    }).then(function(response) {
      return response.data;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Retrieve the key to lookup for on entities given the ctx
   * @memberof module:clb-storage.clbStorage
   * @param  {string} ctx application context UUID
   * @return {string}     name of the entity attribute that should be used
   * @private
   */
  function metadataKey(ctx) {
    return 'ctx_' + ctx;
  }

  /**
   * @name setContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function links the contextId with the doc browser entity in input
   * by setting a specific metadata on the entity.
   *
   * Entity object in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} entity doc browser entity
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function setContextMetadata(entity, contextId) {
    var newMetadata = {};
    newMetadata[metadataKey(contextId)] = 1;
    return addMetadata(entity, newMetadata);
  }

  /**
   * @function
   * @desc
   * the function gets the entity linked to the contextId in input.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   * @private
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function getEntityByContext(contextId) {
    var queryParams = {};
    queryParams[metadataKey(contextId)] = 1;
    return query(queryParams).catch(clbError.rejectHttpError);
  }

  /**
   * @name deleteContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function unlink the contextId from the entity in input
   * by deleting the context metadata.
   *
   * Entity object in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} entity doc browser entity
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function deleteContextMetadata(entity, contextId) {
    var key = metadataKey(contextId);

    return deleteMetadata(entity, [key]);
  }

  /**
   * @name updateContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function delete the contextId from the `oldEntity` metadata and add
   * it as `newEntity` metadata.
   *
   * Entity objects in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} newEntity doc browser entity to link to the context
   * @param  {Object} oldEntity doc browser entity to unlink from the context
   * @param  {String} contextId collab app context id
   * @return {Promise}          Resolves when the operation is completed
   */
  function updateContextMetadata(newEntity, oldEntity, contextId) {
    return deleteContextMetadata(oldEntity, contextId).then(function() {
      return setContextMetadata(newEntity, contextId);
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Add metadata to the provided entity and returns a promise that resolves to an object
   * containing all the new metadata. The promise fails if one of the metadata already exists.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} entity   Entity Descriptor
   * @param {object} metadata key/value store where keys are the metadata name to set
   * @return {Promise}        Resolves after the operation is completed
   */
  function addMetadata(entity, metadata) {
    return $http.post(baseUrl + '/' + entity._entityType + '/' +
    entity._uuid + '/metadata', metadata)
    .then(function(response) {
      return response.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Delete metadata keys in input from the provided entity and returns a promise that resolves to an object
   * containing all the remaining metadata. The promise fails if one of the metadata doesn't exist.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} entity      Entity Descriptor
   * @param {array} metadataKeys Array of metatdata keys to delete
   * @return {Promise}           Resolve to the metadata
   */
  function deleteMetadata(entity, metadataKeys) {
    return $http.delete(baseUrl + '/' + entity._entityType + '/' +
      entity._uuid + '/metadata', {data: {keys: metadataKeys}})
    .then(function(response) {
      return response.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * @function
   * @private
   * @desc
   * When the promise is fulfilled, the function returns the :doc:`module-clb-storage.EntityDescriptor` of the ``collabId`` in input.
   *
   * In case of error, the promise is rejected with a :doc:`module-clb-error.ClbError` instance.
   *
   * @param  {int}    collabId collab id
   * @return {Promise}         Return the project :doc:`module-clb-storage.EntityDescriptor` linked to
   *                           this collab or reject a :doc:`module-clb-error.ClbError`.
   */
  function getCollabHome(collabId) {
    var queryParams = {
      managed_by_collab: collabId
    };
    return query(queryParams);
  }

  /**
   * Create a new entity.
   * @memberof module:clb-storage.clbStorage
   * @param  {string} type           Entity Type (e.g.: file, folder, project)
   * @param  {string|object} parent  Parent UUID or entity descriptor
   * @param  {string} name           File name
   * @param  {object} options        Extend the entity descriptor with those data
   * @return {Promise}               Resolve once done
   */
  function create(type, parent, name, options) {
    return $http.post(
      baseUrl + '/' + type.split(':')[0],
      angular.extend({
        _name: name,
        _parent: (parent && parent._uuid) || parent
      }, options)
    )
    .then(function(res) {
      return res.data;
    })
    .catch(function(err) {
      if (err.code === 0) {
        err = clbError.error({
          type: 'Aborted',
          message: 'Network unreachable',
          code: 0
        });
      } else {
        err = clbError.httpError(err);
      }
      if (err.message.match(/already exists/)) {
        err.type = 'FileAlreadyExistError';
      } else {
        err.type = 'EntityCreationError';
      }
      err.cause = err.type; // preserve legacy API
      return $q.reject(err);
    });
  }

  /**
   * Copy a file to a destination folder
   * @memberof module:clb-storage.clbStorage
   * @param  {string} srcId        UUID of the entity to copy
   * @param  {string} destFolderId UUID of the target directory
   * @return {Promise}             Resolves when done
   */
  function copy(srcId, destFolderId) {
    return getEntity(srcId).then(function(src) {
      return create(src._entityType, destFolderId, src._name, {
        _description: src._description,
        _contentType: src._contentType
      })
      .then(function(dest) {
        var url = [baseUrl, dest._entityType, dest._uuid, 'content'].join('/');
        return $http.put(url, {}, {
          headers: {'X-Copy-From': src._uuid}
        }).then(function() {
          return dest;
        }).catch(function(err) {
          $q.reject(clbError.httpError(err));
        });
      });
    });
  }

  /**
   * Retrieves the content of a file given its id.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {string} id FileEntity UUID
   * @param  {object} [customConfig] contains extra configuration
   * @return {Promise}   The raw content
   */
  function getContent(id, customConfig) {
    var config = {
      method: 'GET',
      url: fileUrl + '/' + id + '/content',
      transformResponse: function(data) {
        return data;
      }
    };
    if (angular.isDefined(customConfig)) {
      angular.extend(config, customConfig);
    }
    return $http(config).then(function(data) {
      return data.data;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * @desc
   * Get current user access right to the provided entity.
   *
   * The returned promise will be resolved
   * with an object literal containing three boolean
   * flags corresponding the user access:
   *
   * - canRead
   * - canWrite
   * - canManage
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {module:clb-storage.EntityDescriptor} entity The entity to retrieve user access for
   * @return {object} Contains ``{boolean} canRead``, ``{boolean} canWrite``, ``{boolean} canManage``
   */
  function getUserAccess(entity) {
    return $q.all({
      acl: $http.get(baseUrl + '/' + entity._entityType + '/' +
        entity._uuid + '/acl'),
      user: clbUser.getCurrentUser()
    })
    .then(function(aggregatedData) {
      var acls = aggregatedData.acl.data; // expected resp: { 111: 'write', 222: 'manage', groupX: 'manage'}
      var user = aggregatedData.user;

      var access = {
        canRead: false,
        canWrite: false,
        canManage: false
      };

      for (var id in acls) {
        if (Object.prototype.hasOwnProperty.call(acls, id)) {
          var acl = acls[id];
          if (id === user.id || user.groups.indexOf(id) >= 0) {
            access.canRead = access.canRead ||
              acl === 'read' || acl === 'write' || acl === 'manage';
            access.canWrite = access.canWrite ||
              acl === 'write' || acl === 'manage';
            access.canManage = access.canManage || acl === 'manage';
          }
        }
      }
      return access;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * @desc
   * Retrieve children entities of a 'parent' entity according to the options and
   * add them to the children list.
   * The returned promise will be resolved with the
   * list of fetched children and a flag indicating if more results are available
   * in the queried direction.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {module:clb-storage.EntityDescriptor} parent The parent entity
   * @param {object} [options] Options to make the query
   * @param {array/string} [options.accept] Array of accepted _entityType
   * @param {boolean|array/string} [options.acceptLink] ``true`` or an array of accepted linked _entityType
   * @param {string} [options.sort] Property to sort on
   * @param {string} [options.filter] The result based on Acls. Values: ``read`` (default), ``write``
   * @param {UUID} [options.until] Fetch results until the given id (exclusive with from)
   * @param {UUID} [options.from] Fetch results from the given id (exclusive with until)
   * @param {int} [options.pageSize] The number of results per page. Default is provided by the service. Set to 0 to fetch all the records.
   * @return {Promise} When fulfilled, return a paginated result set. You can also access it immediately using ``promise.instance``
   */
  function getChildren(parent, options) {
    options = angular.extend({}, options);
    var url;
    if (parent) {
      url = baseUrl + '/' + parent._entityType + '/' +
      (parent._uuid) + '/children';
    } else { // root projects
      url = baseUrl + '/project';
    }
    var params = {
      filter: buildEntityTypeFilter(options.accept, options.acceptLink),
      sort: options.sort ? options.sort : '_name',
      from: options.from,
      until: options.until,
      access: options.access,
      limit: options.pageSize > 0 ? options.pageSize : null
    };
    return clbResultSet.get($http.get(url, {params: params}), {
      resultKey: 'result',
      hasNextHandler: function(res) {
        return Boolean(res.hasMore);
      },
      nextHandler: function(rs) {
        var p = angular.extend({}, params);
        p.from = rs.nextId;
        return $http.get(url, {params: p});
      },
      hasPreviousHandler: function(res) {
        return Boolean(res.hasPrevious);
      },
      previousHandler: function(rs) {
        var p = angular.extend({}, params);
        p.until = rs.previousId;
        return $http.get(url, {params: p});
      },
      resultsFactory: function(results, rs) {
        if (rs.hasMore) {
          var lastItem = rs.result.pop();
          rs.nextId = lastItem._uuid;
        }
        if (rs.hasPrevious) {
          var firstItem = rs.result.shift();
          rs.previousId = firstItem._uuid;
        }
      }
    });
  }

  /**
   * @private
   * @param  {array/string} accept Fill this array with accepted types
   * @param  {boolean} acceptLink Should the link be accepted as well
   * @return {string}             a query string to append to the URL
   */
  function buildEntityTypeFilter(accept, acceptLink) {
    if (acceptLink) {
      if (acceptLink === true) {
        acceptLink = [].concat(accept);
      }
      for (var i = 0; i < acceptLink.length; i++) {
        acceptLink.push('link:' + acceptLink[i]);
      }
    }
    if (accept && accept.length > 0) {
      return '_entityType=' + accept.join('+');
    }
  }

  /**
   * Set the content of a file entity.
   * @param  {File} file  The file with the content to upload
   * @param  {module:clb-storage.EntityDescriptor} entity The entity to upload
   * @param  {object} config configuration to use
   * @return {Promise}       Return once fulfilled
   */
  function uploadFile(file, entity, config) {
    var d = $q.defer();
    $http.post(fileUrl + '/' + entity._uuid + '/content/upload', file,
      angular.extend({
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }, config
    )
    ).success(function(entity) {
      d.notify({
        lengthComputable: true,
        total: file.size,
        loaded: file.size
      });
      d.resolve(entity);
    }).error(function(err, status) {
      var uploadError = function() {
        if (!err || status === 0) {
          return clbError.error({
            type: 'Aborted'
          });
        }
        return clbError.error('UploadError', {
          message: err.message,
          data: {
            file: file,
            entity: entity,
            cause: err
          }
        });
      };
      deleteEntity(entity).then(function() {
        d.reject(uploadError(err));
      }, function(deleteErr) {
        $log.error('Unable to remove previously created entity', deleteErr);
        d.reject(uploadError(err));
      });
    });
    return d.promise;
  }

  /**
   * Create file entity and upload the content of the given file.
   *
   * `options` should contain a `parent` key containing the parent entity.
   *
   * Possible error causes:
   *
   * - FileTooBig
   * - UploadError - generic error for content upload requests
   * - EntityCreationError - generic error for entity creation requests
   * - FileAlreadyExistError
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {File} file The file descriptor to upload
   * @param {Object} options The list of options
   * @return {Promise} a Promise that notify about progress and resolve
   *   with the new entity object.
   *
   */
  function upload(file, options) {
    options = options || {};
    var d = $q.defer();
    var dAbort = $q.defer();

    d.promise.abort = function() {
      dAbort.resolve();
    };

    if (file.size > maxFileSize) {
      d.reject(clbError.error({
        type: 'FileTooBig',
        message: 'The file `' + file.name + '` is too big(' + file.size +
          ' bytes), max file size is ' + maxFileSize + ' bytes.'
      }));
      return d.promise;
    }

    var entityOpts = {
      _contentType: fixMimeType(file)
    };
    create(
      'file',
      options.parent && options.parent._uuid,
      file.name,
      entityOpts
    ).then(function(entity) {
      d.notify({
        lengthComputable: true,
        total: file.size,
        loaded: 0
      });

      uploadFile(file, entity, {
        timeout: dAbort.promise,
        uploadProgress: function(event) {
          d.notify(event);
        }
      }).then(
        function(entity) {
          d.promise.abort = function() {
            deleteEntity(entity).then(function() {
              dAbort.resolve();
            });
          };
          d.resolve(entity);
        },
        d.reject,
        d.notify
      );
    }, d.reject);

    return d.promise;
  }

  /**
   * Return a good enough mimetype.
   * @private
   * @param  {File} file File to guess a mimetype for
   * @return {string}    The good enough mime type
   */
  function fixMimeType(file) {
    // Best match are found by the browser
    if (file.type) {
      return file.type;
    }

    var extension = file.name.match(/\.([a-z0-9]+)$/);
    if (!extension) {
      return;
    }
    extension = extension[1];
    // ipynb is not an official mime-type
    if (extension.match(/^(j|i)pynb$/)) {
      return 'application/x-ipynb+json';
    }
    // In worst case, return a dummy value that is consistent
    // for a given file extension and valid from the point of view
    // of the specification.
    return 'application/x-' + extension;
  }

  /**
   * Remotly delete an entity.
   * @param  {module:clb-storage.EntityDescriptor} entity The entity to delete
   * @return {Promise}        Return once fulfilled
   */
  function deleteEntity(entity) {
    return $http.delete(entityUrl + '/' + entity._uuid)
    .catch(clbError.rejectHttpError);
  }

  /**
   * Return true if the entity is a container (e.g.: a project, a folder, ...)
   * @param  {EntityDescriptor} entity The entity to evaluate
   * @return {Boolean}                 Return true if it is a container
   */
  function isContainer(entity) {
    return Boolean(entity._entityType &&
      entity._entityType.match(/project|folder/));
  }

  /**
   * Retrieve an array of entities from root to the current entity
   * (where `root` and `entity` are omitted).
   * @function
   * @param {module:clb-storage.EntityDescriptor} entity The entity to get ancestors from
   * @param {module:clb-storage.EntityDescriptor} [root] The entity even oldest than the oldest ancestors to retrieve
   * @return {Promise} Return an array of EntityDescriptor once fulfilled
   */
  function getAncestors(entity, root) {
    // End recursion condition
    if (!entity || !entity._parent || (root && entity._parent === root._uuid)) {
      return $q.when([]);
    }

    var onError = function(err) {
      $q.reject(clbError.error({
        type: 'EntityAncestorRetrievalError',
        message: 'Cannot retrieve some ancestors from entity ' + entity._name,
        data: {
          entity: entity,
          root: root,
          cause: err
        }
      }));
    };

    var recurse = function(parent) {
      return getAncestors(parent, root)
      .then(function(ancestors) {
        ancestors.push(parent);
        return ancestors;
      });
    };

    return getEntity(entity._parent)
      .then(recurse, onError);
  }

  /**
   * Asynchronously ask for a short-lived (a few seconds),
   * presigned URL that can be used to access and
   * download a file without authentication headers.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {module:clb-storage.EntityDescriptor} entity The file to download
   * @return {Promise}        Return a string containing the URL once the Promise
   *                          is fulfilled.
   */
  function downloadUrl(entity) {
    var id = entity._uuid || entity;
    return $http.get(baseUrl + '/file/' + id + '/content/secure_link')
    .then(function(response) {
      return baseUrl + response.data.signed_url;
    }).catch(clbError.rejectHttpError);
  }
}
