/**
 * @namespace hbpCollaboratory
 * @desc
 * ``hbpCollaboratory`` module is a shell around various AngularJS modules that
 *  interface with the HBP Collaboratory.
 *
 * - :doc:`clb-app <module:clb-app>` provides utilities to retrieve current
 *   HBP Collaboratory Context in an app and to communicate with the current
 *   Collaboratory instance.
 * - :doc:`clb-automator <module:clb-automator>` to automate a serie of
 *   Collaboratory actions.
 * - :doc:`clb-feed <module:clb-feed>` retrieve and display stream of activities.
 */
angular.module('hbpCollaboratory', [
  'clb-automator',
  'clb-env',
  'clb-error',
  'clb-app',
  'clb-storage',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore',
  'clb-form',
  'clb-stream',
  'clb-identity',
  'clb-collab',
  'ngLodash'
]).run(function(lodash) {
  // keep lodash compatibility with older versions
  if (!lodash.indexBy) {
    lodash.indexBy = lodash.keyBy;
  }
  if (!lodash.keyBy) {
    lodash.keyBy = lodash.indexBy;
  }
});
