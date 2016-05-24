angular.module('clb-automator')
.run(function createOverview(
  $log, $q, $http, bbpConfig, hbpFileStore, hbpErrorService,
  clbAutomator, hbpCollaboratoryNavStore
) {
  clbAutomator.registerHandler('overview', overview);

  /**
   * Set the content of the overview page using
   * the content of a file in storage.
   *
   * The collab is indicated either by an id in `descriptor.collab` or a
   * collab object in `context.collab`.
   *
   * @memberof module:clb-automator.Tasks
   * @param {object} descriptor the task configuration
   * @param {object} [descriptor.collab] id of the collab
   * @param {string} descriptor.entity either a label that can be found in
   *                 ``context.entities`` or a FileEntity UUID
   * @param {object} context the current task context
   * @param {object} [context.collab] the collab in which entities will be copied
   * @param {object} [context.entities] a list of entities to lookup in for
   *                   descriptor.entiry value
   * @return {object} created entities where keys are the same as provided in
   *                  config.storage
   */
  function overview(descriptor, context) {
    $log.debug("Fill overview page with content from entity");
    var fetch = {
      rootNav: hbpCollaboratoryNavStore.getRoot(
        descriptor.collab || context.collab.id),
      source: fetchSourceContent(descriptor, context)
    };
    return $q.all(fetch)
    .then(function(results) {
      var overview = results.rootNav.children[0];
      return $http.post(bbpConfig.get('api.richtext.v0') + '/richtext/', {
        ctx: overview.context,
        raw: results.source
      }).then(function() {
        return overview;
      });
    });
  }

  /**
   * Download file entity content.
   *
   * @param {object} descriptor the task configuration
   * @param {string} descriptor.entity either the label to find in
   *                 ``context.entities`` or a the entity UUID.
   * @param {object} context the current task context
   * @param {object} context.entities optional entities in which to lookup for one
   * @return {Promise} the promise of the entity content string
   * @private
   */
  function fetchSourceContent(descriptor, context) {
    var uuid;
    if (context && context.entities && context.entities[descriptor.entity]) {
      uuid = context.entities[descriptor.entity]._uuid;
    } else {
      uuid = descriptor.entity;
    }
    return hbpFileStore.getContent(uuid);
  }
});
