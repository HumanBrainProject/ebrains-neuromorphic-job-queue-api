/* global deferredBootstrapper, window, document */

/**
 * @namespace angular
 */

angular.clbBootstrap = clbBootstrap;

/**
 * Bootstrap AngularJS application with the HBP environment loaded.
 *
 * It is very important to load the HBP environement *before* starting
 * the application. This method let you do that synchronously or asynchronously.
 * Whichever method you choose, the values in your environment should look
 * very similar to the one in _`https://collab.humanbrainproject.eu/config.json`,
 * customized with your own values.
 *
 * At least ``auth.clientId`` should be edited in the config.json file.
 *
 * @memberof angular
 * @param {string} module the name of the Angular application module to load.
 * @param {object} options pass those options to deferredBootstrap
 * @param {object} options.env HBP environment JSON (https://collab.humanbrainproject.eu/config.json)
 * @return {Promise} return once the environment has been bootstrapped
 * @example <caption>Bootstrap the environment synchronously</caption>
 * angular.clbBootstrap('myApp', {
 *   env: { } // content from https://collab.humanbrainproject.eu/config.json
 * })
 * @example <caption>Bootstrap the environment asynchronously</caption>
 * angular.clbBootstrap('myApp', {
 *   env: 'https://my-project-website/config.json'
 * })
 * @example <caption>Using backward compatibility</caption>
 * window.bbpConfig = { } // content from https://collab.humanbrainproject.eu/config.json
 * angular.clbBoostrap('myApp')
 */
function clbBootstrap(module, options) {
  if (window.bbpConfig) {
    options.env = window.bbpConfig;
  }
  if (!options.element) {
    options.element = document.body;
  }
  options.module = module;
  if (!options.moduleResolves) {
    options.moduleResolves = {};
  }
  options.moduleResolves = [{
    module: 'clb-env',
    resolve: {
      // use injection here as it is not resolved automatically on build.
      CLB_ENVIRONMENT: ['$q', '$http', function($q, $http) {
        // Remove any previously defined CLB_ENVIRONMENT
        // As this results in unpredictable results when multiple apps
        // use this strategy.
        var invoker = angular.module(['clb-env'])._invokeQueue;
        for (var i = 0; i < invoker.length; i++) {
          var inv = invoker[i];
          if (inv[2][0] === 'CLB_ENVIRONMENT') {
            invoker.splice(i, 1);
            i--;
          }
        }
        if (angular.isString(options.env)) {
          return $http.get(options.env)
          .then(function(res) {
            // Set bbpConfig for backward compatibility
            window.bbpConfig = res.data;
            return res.data;
          });
        }
        // Set bbpConfig for backward compatibility
        if (!window.bbpConfig) {
          window.bbpConfig = options.env;
        }
        return $q.when(options.env);
      }]
    }
  }];
  return deferredBootstrapper.bootstrap(options);
}
