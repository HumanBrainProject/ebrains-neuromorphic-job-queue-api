angular.module('hbpCollaboratoryAutomator')
.run(function createCollabService(
  $log, $q, hbpCollabStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('collab', createCollab);

  /**
   * @name createCollab
   * @description
   *  Create a collab defined by the given options.
   * @param {object} options - Parameters to create the collab
   * @param {string} options.name - Name of the collab
   * @param {string} options.description - Description in less than 140 characters
   *                                       of the collab
   * @param {string} options.privacy - 'private' or 'public'. Notes that only
   *                                   HBP Members can create private collab
   * @param {Array|object} nav - one or more nav item descriptor that will be
   *                           passed to the nav task.
   * @return {Promise} - Will retrieve a collab or a HbpError
   */
  function createCollab(options) {
    var attr = hbpCollaboratoryAutomator.extractAttributes(
      options,
      ['title', 'content', 'private']
    );
    $log.debug('Create collab', options);
    return hbpCollabStore.create(attr).then(function(collab) {
      return $q.when(createNavItems(collab, options.nav)).then(function() {
        return collab;
      });
    });

    /**
     * @private
     * Create navigation items for the given collab using
     * information from navConfig.
     *
     * @param  {Collab} collab    [description]
     * @param  {Array|object} navConfig configuration for one or more navigation
     *                        item.
     * @return {Promise}      resolve once every nav item has been created.
     */
    function createNavItems(collab, navConfig) {
      if (!navConfig) {
        return;
      }
      if (!angular.isArray(navConfig)) {
        navConfig = [navConfig];
      }
      var promise = $q.when();
      angular.forEach(navConfig, function(n) {
        promise.then(function() {
          return hbpCollaboratoryAutomator.task(
            {nav: angular.extend({collab: collab}, n)}
          ).run();
        });
      });
      return promise;
    }
  }
});
