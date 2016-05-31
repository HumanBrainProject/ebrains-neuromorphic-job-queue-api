/* global deferredBootstrapper, window, document */
(function() {
  'use strict';
  angular.clbBootstrap = clbBootstrap;

  /**
   * Bootstrap AngularJS application with the environment configuration loaded.
   * @param {string} module the name of the Angular application module to load.
   * @param {objects} options pass those options to deferredBootstrap
   * @return {Promise} return once the environment has been bootstrapped
   */
  function clbBootstrap(module, options) {
    if (!options.env) {
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
      module: 'clb-app',
      resolve: {
        CLB_ENVIRONMENT: function($q, $http) {
          // Remove any previously defined CLB_ENVIRONMENT
          // As this results in unpredictable results when multiple apps
          // use this strategy.
          var invoker = angular.module(['clb-app'])._invokeQueue;
          for (var i = 0; i < invoker.length; i++) {
            var inv = invoker[i];
            if (inv[2][0] === 'CLB_ENVIRONMENT') {
              invoker.splice(i, 1);
              i--;
            }
          }
          if (angular.isString(options.env)) {
            return $http.get(options.env);
          }
          return $q.when(options.env);
        }
      }
    }];
    return deferredBootstrapper.bootstrap(options);
  }
})();
