angular.module('hbpCollaboratoryAutomator')
.run(function createCollabService(
  $log, $q, hbpEntityStore,
  hbpErrorService,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('storage', storage);

  /**
   * Return a HbpError when a parameter is missing.
   *
   * @param  {string} key    name of the key
   * @param  {object} config the invalid configuration object
   * @return {HbpError}      a HbpError instance
   */
  function missingDataError(key, config) {
    return hbpErrorService({
      type: 'KeyError',
      message: 'Missing `' + key + '` key in config',
      data: {
        config: config
      }
    });
  }

  /**
   * Ensure that all parameters listed after config are presents
   * @param  {object} config task descriptor
   * @return {object} created entities
   */
  function ensureParameters(config) {
    var parameters = Array.prototype.splice(1);
    for (var p in parameters) {
      if (angular.isUndefined(parameters[p])) {
        return $q.reject(missingDataError(p, config));
      }
    }
    return $q.when(config);
  }

  /**
   * Copy files and folders to the destination collab storage.
   *
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
   * @param {object} config the task configuration
   * @param {object} config.storage a object where keys are the file path in the
   *                                new collab and value are the UUID of the
   *                                entity to copy at this path.
   * @param {object} config.collab the collab in which entities will be copied
   * @return {object} created entities where keys are the same as provided in
   *                  config.storage
   */
  function storage(config) {
    return ensureParameters(config, 'storage', 'collab').then(function() {
      return hbpEntityStore.getPath('/' + config.collab.title)
      .then(function(projectEntity) {
        var promises = {};
        angular.forEach(config.storage, function(value, name) {
          console.log(value, angular.isString(value));
          if (angular.isString(value)) {
            promises[name] = (hbpEntityStore.copy(value, projectEntity._uuid));
          } else {
            $log.warn('Invalid configuration for storage task', config);
          }
        });
        console.log(promises, config.storage);
        return $q.all(promises);
      });
    });
  }
});
