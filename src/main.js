/**
 * @namespace hbpCollaboratory
 * @desc
 * ``hbpCollaboratory`` module is a shell around various AngularJS modules that
 * to interface with the HBP Collaboratory.
 *
 * - :doc:`clb-automator <module:clb-automator>` to automate a serie of
 *   Collaboratory actions
 * - :doc:`clb-app <module:clb-app>` provides utilities to retrieve current
 *   HBP Collaboratory Context in an app and to communicate with the current
 *   Collaboratory instance.
 */
angular.module('hbpCollaboratory', [
  'clb-automator',
  'clb-app',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore',
  'hbpCollaboratoryForm'
]);
