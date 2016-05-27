/* eslint camelcase: 0 */
/**
 * @namespace clbStorage
 * @memberof module:clb-storage
 * @desc
 * storageUtil provides utility functions to ease the interaction of apps with storage.
 */
angular.module('clb-storage')
.factory('clbStorage',
  function clbStorage(hbpUtil, hbpEntityStore, hbpErrorService) {
    /**
     * Retrieve the key to lookup for on entities given the ctx
     * @memberof module:clbStorage
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

      return hbpEntityStore.addMetadata(entity, newMetadata)
      .catch(hbpErrorService.error);
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

      return hbpEntityStore.query(queryParams).catch(hbpUtil.ferr);
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

      return hbpEntityStore.deleteMetadata(entity, [key])
      .then(null, hbpErrorService.error);
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
     * @return {Promise} a promise that resolves when the operation is completed
     */
    function updateContextMetadata(newEntity, oldEntity, contextId) {
      return deleteContextMetadata(oldEntity, contextId).then(function() {
        return setContextMetadata(newEntity, contextId);
      }).catch(hbpErrorService.error);
    }

    /**
     * @name getProjectByCollab
     * @memberof module:clb-storage.clbStorage
     * @desc
     * the function returns the storage project of the collabId in input.
     *
     * In case of error, the promise is rejected with a `HbpError` instance.
     *
     * @param  {String} collabId collab id
     * @return {Promise} a promise that resolves to the project details
     */
    function getProjectByCollab(collabId) {
      var queryParams = {
        managed_by_collab: collabId
      };
      return hbpEntityStore.query(queryParams).catch(hbpUtil.ferr);
    }

    return {
      setContextMetadata: setContextMetadata,
      getEntityByContext: getEntityByContext,
      deleteContextMetadata: deleteContextMetadata,
      updateContextMetadata: updateContextMetadata,
      getProjectByCollab: getProjectByCollab
    };
  });
