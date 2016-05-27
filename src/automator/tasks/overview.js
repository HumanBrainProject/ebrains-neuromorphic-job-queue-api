angular.module('hbpCollaboratoryAutomator')
  .run(function createOverview(
    $log, $q, $http, bbpConfig, hbpFileStore, hbpErrorService,
    hbpCollaboratoryAutomator, hbpCollaboratoryNavStore,
    hbpCollaboratoryAppStore
  ) {
    hbpCollaboratoryAutomator.registerHandler('overview', overview);

    /**
     * Set the content of the overview page.
     * If an 'entity' is specified, it will use the content of that storage file
     * If an 'app' name is specified, it will use that app for the overview page
     *
     * The collab is indicated either by an id in `descriptor.collab` or a
     * collab object in `context.collab`.
     *
     * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
     * @param {object} descriptor the task configuration
     * @param {object} [descriptor.collab] id of the collab
     * @param {string} [descriptor.entity] either a label that can be found in
     *                 ``context.entities`` or a FileEntity UUID
     * @param {string} [descriptor.app] the name of an application
     * @param {object} context the current task context
     * @param {object} [context.collab] the collab in which entities will be copied
     * @param {object} [context.entities] a list of entities to lookup in for
     *                   descriptor.entiry value
     * @return {object} created entities where keys are the same as provided in
     *                  config.storage
     */
    function overview(descriptor, context) {
      $log.debug("Set the content of the overview page");
      var collabId = descriptor.collab || context.collab.id;

      var createContentFile = function(overview, descriptor, context) {
        $log.debug("Fill overview page with content from entity");

        return fetchSourceContent(descriptor, context)
          .then(function(source) {
            return $http.post(bbpConfig.get('api.richtext.v0') + '/richtext/', {
              ctx: overview.context,
              raw: source
            });
          });
      };

      var updateAppId = function(overview, descriptor) {
        $log.debug("Replace the overview page application id");

        return hbpCollaboratoryAppStore.findOne({title: descriptor.app})
          .then(function(app) {
            overview.update({appId: app.id});
            return hbpCollaboratoryNavStore.saveNode(collabId, overview);
          });
      };

      return hbpCollaboratoryNavStore
        .getRoot(collabId)
        .then(function(rootNav) {
          var overview = rootNav.children[0];

          var updateOverview = descriptor.app ?
            updateAppId(overview, descriptor) :
            createContentFile(overview, descriptor, context);

          return updateOverview.then(function() {
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
