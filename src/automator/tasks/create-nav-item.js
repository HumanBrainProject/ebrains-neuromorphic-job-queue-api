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
   * @param {object} descriptor a descriptor description
   * @param {string} descriptor.name name of the nav item
   * @param {Collab} descriptor.collabId collab in which to add the item in.
   * @param {string} descriptor.app app name linked to the nav item
   * @param {object} [context] the current run context
   * @param {object} [context.collab] a collab instance created previously
   * @return {Promise} promise of a NavItem instance
   */
  function createNavItem(descriptor, context) {
    var collabId = function() {
      return (descriptor && descriptor.collabId) ||
        (context && context.collab.id);
    };
    $log.debug('Create nav item', descriptor, context);
    return hbpCollaboratoryAppStore.findOne({
      title: descriptor.app
    })
    .then(function(app) {
      return hbpCollaboratoryNavStore.getRoot(collabId())
      .then(function(parentItem) {
        var nav = new hbpCollaboratoryNavStore.NavItem({
          collabId: collabId(),
          name: descriptor.name,
          appId: app.id,
          parentId: parentItem.id
        });
        return hbpCollaboratoryNavStore.addNode(collabId(), nav);
      });
    });
  }
});
