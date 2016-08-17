angular.module('clb-ctx-data')
.factory('clbCtxData', clbCtxData);

/**
 * A service to retrieve data for a given ctx. This is a convenient
 * way to store JSON data for a given context. Do not use it for
 * Sensitive data. There is no data migration functionality available, so if
 * the expected data format change, you are responsible to handle the old
 * format on the client side.
 *
 * @namespace clbCtxData
 * @memberof clb-ctx-data
 * @param  {object} clbAuthHttp    Angular DI
 * @param  {object} $q       Angular DI
 * @param  {object} uuid4     Angular DI
 * @param  {object} clbEnv   Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}          Angular Service Descriptor
 */
function clbCtxData(clbAuthHttp, $q, uuid4, clbEnv, clbError) {
  var configUrl = clbEnv.get('api.collab.v0') + '/config/';
  return {
    /**
     * Return an Array or an Object containing the data or
     * ``undefined`` if there is no data stored.
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx   the current context UUID
     * @return {Promise}    fullfil to {undefined|object|array}
     */
    get: function(ctx) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.get(configUrl + ctx + '/')
      .then(function(res) {
        try {
          return angular.fromJson(res.data.content);
        } catch (ex) {
          return $q.reject(clbError.error({
            type: 'InvalidData',
            message: 'Cannot parse JSON string: ' + res.data.content,
            code: -2,
            data: {
              cause: ex
            }
          }));
        }
      })
      .catch(function(err) {
        if (err.code === 404) {
          return;
        }
        return clbError.rejectHttpError(err);
      });
    },

    /**
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx The context UUID
     * @param  {array|object|string|number} data JSON serializable data
     * @return {Promise} Return the data when fulfilled
     */
    save: function(ctx, data) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.put(configUrl + ctx + '/', {
        context: ctx,
        content: angular.toJson(data)
      }).then(function() {
        return data;
      })
      .catch(clbError.rejectHttpError);
    },

    /**
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx The context UUID
     * @return {Promise}  fulfilled once deleted
     */
    delete: function(ctx) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.delete(configUrl + ctx + '/')
      .then(function() {
        return true;
      })
      .catch(clbError.rejectHttpError);
    }
  };

  /**
   * Generate the appropriate error when context is invalid.
   * @param  {any} badCtx  the wrong ctx
   * @return {HbpError}    The Error
   */
  function invalidUuidError(badCtx) {
    return clbError.error({
      type: 'InvalidArgument',
      message: 'Provided ctx must be a valid UUID4 but is: ' + badCtx,
      data: {
        argName: 'ctx',
        argPosition: 0,
        argValue: badCtx
      },
      code: -3
    });
  }
}
