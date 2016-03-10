angular.module('hbpCollaboratoryAutomator')
.run(function createNavItem(
  $log,
  $q,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('jupyterNotebook', jupyterNotebook);

  /**
   * Create JupyterNotebook navigation item.
   *
   * The notebook add the NavItem instance in the context
   * using the key ``jupyterNotebook``.
   *
   * @param  {object} descriptor can contain a ipynb file identifier
   * @param  {object} [descriptor.entity] name of an entities in ``context.storage``
   * @param  {string} context must contain a storage entry with the name
   *                          defined in descriptor.entity if present
   * @return {NavItem} the notebook navitem
   */
  function jupyterNotebook(descriptor, context) {
    $log.debug('jupyterNotebook is not implemented');
    $log.debug(descriptor, context);
    return $q.when({});
  }
});
