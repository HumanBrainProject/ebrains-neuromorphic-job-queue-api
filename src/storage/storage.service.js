/* eslint camelcase: 0 */

angular.module('clb-storage')
.factory('clbStorage', clbStorage);

/**
 * @namespace clbStorage
 * @memberof module:clb-storage
 * @desc
 * The ``clbStorage`` service provides utility functions to ease the interaction
 * of apps with storage.
 * @param  {object} $http    Angular DI
 * @param  {object} $q       Angular DI
 * @param  {object} uuid4    Angular DI
 * @param  {object} clbEnv   Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}          Angular DI
 */
function clbStorage(
  $http,
  $q,
  uuid4,
  clbEnv,
  clbError
) {
  var baseUrl = clbEnv.get('api.document.v0');
  var entityUrl = baseUrl + '/entity';
  var fileUrl = baseUrl + '/file/';
  var promises = {};
  return {
    getEntityByContext: getEntityByContext,
    getCollabHome: getCollabHome,
    getEntity: getEntity,
    query: query,
    getContent: getContent,
    copy: copy,
    create: create,
    setContextMetadata: setContextMetadata,
    deleteContextMetadata: deleteContextMetadata,
    updateContextMetadata: updateContextMetadata,
    addMetadata: addMetadata,
    deleteMetadata: deleteMetadata
  };

  // -------------------- //

  /**
   * Get an entity (e.g.: a project, a file or a folder):
   *
   * - the entity uuid
   * - an entity representation with ``{_uuid: ENTITY_ID}``
   * - the entity collab ID and a relative path
   * - the entity absolute path
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {string|object} locator  Describe the entity to retrieve
   * @param {string} [locator._uuid] An entity descriptor containing ``_uuid``
   * @param {string} [locator.path]  Use with ``locator.collab`` to retrieve the
   *                                 local path within a collab.
   * @param {int} [locator.collab]   The collab ID to retrieve the storage from.
   * @return {Promise}               Resolve to an entity descriptor
   */
  function getEntity(locator) {
    if (uuid4.validate(locator)) {
      return getEntityByUUID(locator);
    }
    return $q.reject(clbError.error({
      type: 'InvalidArgument',
      message: 'locator must be a valid UUID4'
    }));
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
      });
    });
  }

  /**
   * Query entities by attributes or metadata.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} params Query Parameters
   * @return {Promise}      Resolve to a ResultSet instance
   */
  function query(params) {
    return $http.get(entityUrl + '/', {
      params: params
    }).then(function(response) {
      return response.data;
    });
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
   * @name getEntityByContext
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function gets the entity linked to the contextId in input.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
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
   * @name getCollabHome
   * @memberof module:clb-storage.clbStorage
   * @desc
   * The function returns the storage project of the collabId in input.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String} collabId collab id
   * @return {Promise} a promise that resolves to the project details
   */
  function getCollabHome(collabId) {
    var queryParams = {
      managed_by_collab: collabId
    };
    return query(queryParams)
    .catch(clbError.rejectHttpError);
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
        _parent: parent && parent._uuid || parent
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
   * @return {Promise}   The raw content
   */
  function getContent(id) {
    return $http({
      method: 'GET',
      url: fileUrl(id + '/content'),
      transformResponse: function(data) {
        return data;
      }
    }).then(function(data) {
      return data.data;
    }).catch(clbError.rejectHttpError);
  }
}
