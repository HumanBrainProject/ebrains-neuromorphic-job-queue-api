angular.module('hbpCollaboratoryAutomator')
.run(function createNavItem(
  hbpCollaboratoryAppStore,
  hbpCollaboratoryNavStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('nav', createNavItem);

  /**
   * Create a new nav item.
   * @param {object} config a config description
   * @param {string} config.name name of the nav item
   * @param {Collab} config.collab collab in which to add the item in.
   * @param {string} config.app app name linked to the nav item
   * @return {Promise} promise of a NavItem instance
   */
  function createNavItem(config) {
    var collab = config.collab;
    return hbpCollaboratoryAppStore.findOne(config.app)
    .then(function(app) {
      var nav = new hbpCollaboratoryNavStore.NavItem({
        collabId: collab.id,
        name: config.name,
        appId: app.id
      });
      return hbpCollaboratoryNavStore.addNode(collab.id, nav);
    });
  }
});
