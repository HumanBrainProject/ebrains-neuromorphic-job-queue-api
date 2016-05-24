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
 *   Collaboratory actions
 */
angular.module('hbpCollaboratory', [
  'clb-automator',
  'clb-app',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore',
  'clb-form'
]);
