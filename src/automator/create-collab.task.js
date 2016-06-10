angular.module('clb-automator')
.run(function createCollab(
  $log,
  $q,
  clbCollab,
  clbAutomator
) {
  clbAutomator.registerHandler('collab', createCollab);

  /**
   * @function createCollab
   * @memberof module:clb-automator.Tasks
   * @desc
   *  Create a collab defined by the given options.
   * @param {object} descriptor - Parameters to create the collab
   * @param {string} descriptor.name - Name of the collab
   * @param {string} descriptor.description - Description in less than 140 characters
   *                                       of the collab
   * @param {string} [descriptor.privacy] - 'private' or 'public'. Notes that only
   *                                   HBP Members can create private collab
   * @param {Array} [after] - descriptor of subtasks
   * @return {Promise} - promise of a collab
   */
  function createCollab(descriptor) {
    var attr = clbAutomator.extractAttributes(
      descriptor,
      ['title', 'content', 'private']
    );
    $log.debug('Create collab', descriptor);
    return clbCollab.create(attr);
  }
});
