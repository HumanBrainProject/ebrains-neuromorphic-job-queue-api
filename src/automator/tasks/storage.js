angular.module('hbpCollaboratoryAutomator')
.run(function createCollabService(
  $log, $q, hbpCollabStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('cp', copy);

  /**
   * Copy a file or recursively a folder
   * @param {array/object}  config a config description
   * @return {array/entity} created entities
   */
  function copy(config) {
    if (!angular.isArray(config)) {
      config = [];
    }
    return null;
  }
});
