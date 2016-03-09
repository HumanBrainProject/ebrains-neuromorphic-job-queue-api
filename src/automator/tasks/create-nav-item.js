angular.module('hbpCollaboratoryAutomator')
.run(function createNavItem(
  $log,
  hbpCollaboratoryAppStore,
  hbpCollaboratoryNavStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('nav', createNavItem);

  /**
   * Create a new nav item.
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
   * @param {object} config a config description
   * @param {string} config.name name of the nav item
   * @param {Collab} config.collab collab in which to add the item in.
   * @param {string} config.app app name linked to the nav item
   * @return {Promise} promise of a NavItem instance
   */
  function createNavItem(config) {
    var collab = config.collab;
    $log.debug('Create nav item', config);
    return hbpCollaboratoryAppStore.findOne({
      title: config.app
    })
    .then(function(app) {
      return hbpCollaboratoryNavStore.getRoot(collab.id)
      .then(function(parentItem) {
        var nav = new hbpCollaboratoryNavStore.NavItem({
          collabId: collab.id,
          name: config.name,
          appId: app.id,
          parentId: parentItem.id
        });
        return hbpCollaboratoryNavStore.addNode(collab.id, nav);
      });
    });
  }
});
