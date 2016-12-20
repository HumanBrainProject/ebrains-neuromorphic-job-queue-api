/* global window */

angular.module('clb-env')
.provider('clbEnv', clbEnv);

/**
 * Get environement information using dotted notation with the `clbEnv` provider
 * or service.
 *
 * Before being used, clbEnv must be initialized with the context values. You
 * can do so by setting up a global bbpConfig variable or using
 * :ref:`angular.clbBootstrap <angular.clbBootstrap>`.
 *
 * @function clbEnv
 * @memberof module:clb-env
 * @param {object} $injector AngularJS injection
 * @return {object} provider
 * @example <caption>Basic usage of clbEnv</caption>
 * angular.module('myApp', ['clbEnv', 'rest'])
 * .service('myService', function(clbEnv, clbResultSet) {
 *   return {
 *     listCollab: function() {
 *       // return a paginated list of all collabs
 *       return clbResultSet.get($http.get(clbEnv.get('api.collab.v0') + '/'));
 *     }
 *   };
 * });
 * @example <caption>Use clbEnv in your configuration</caption>
 * angular.module('myApp', ['clbEnv', 'rest'])
 * .config(function(clbEnvProvider, myAppServiceProvider) {
 *   // also demonstrate how we accept a custom variable.
 *   myAppServiceProvider.setMaxFileUpload(clbEnvProvider.get('myapp.maxFileUpload', '1m'))
 * });
 */
function clbEnv($injector) {
  return {
    get: get,
    $get: function() {
      return {
        get: get
      };
    }
  };

  /**
   * ``get(key, [defaultValue])`` provides configuration value loaded at
   * the application bootstrap.
   *
   * Accept a key and an optional default
   * value. If the key cannot be found in the configurations, it will return
   * the provided default value. If the defaultValue is undefied, it will
   * throw an error.
   *
   * To ensures that those data are available when angular bootstrap the
   * application, use angular.clbBootstrap(module, options).
   *
   * @memberof module:clb-env.clbEnv
   * @param {string} key the environment variable to retrieve, using a key.
   * @param {any} [defaultValue] an optional default value.
   * @return {any} the value or ``defaultValue`` if the asked for configuration
   *               is not defined.
   */
  function get(key, defaultValue) {
    var parts = key.split('.');
    var cursor = (window.bbpConfig ?
                  window.bbpConfig : $injector.get('CLB_ENVIRONMENT'));
    for (var i = 0; i < parts.length; i++) {
      if (!(cursor && cursor.hasOwnProperty(parts[i]))) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error('UnkownConfigurationKey: <' + key + '>');
      }
      cursor = cursor[parts[i]];
    }
    return cursor;
  }
}
