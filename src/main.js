/**
 * Module to load all the core modules. Try to use the sub-modules instead.
 * @module hbpCollaboratoryCore
 */
angular.module('hbpCollaboratoryCore', [
  'clb-app',
  'clb-automator',
  'clb-collab',
  'clb-ctx-data',
  'clb-env',
  'clb-error',
  'clb-identity',
  'clb-rest',
  'clb-storage',
  'clb-stream'
]);

/**
 * Module to load the UI part of angular-hbp-collaboratory. Try to use the
 * sub-modules instead.
 * @module hbpCollaboratoryUI
 */
angular.module('hbpCollaboratoryUI', [
  'clb-ui-dialog',
  'clb-ui-error',
  'clb-ui-form',
  'clb-ui-identity',
  'clb-ui-loading',
  'clb-ui-storage',
  'clb-ui-stream'
]);

/**
 * @namespace hbpCollaboratory
 * @desc
 * ``hbpCollaboratory`` module is a shell around various AngularJS modules that
 *  interface with the HBP Collaboratory. It loads both the core modules and
 *  the UI modules, as well as the backward compatibility modules.
 */
angular.module('hbpCollaboratory', [
  'hbpCollaboratoryCore',
  'hbpCollaboratoryUI'
]);

/**
 * @typedef {string} UUID A string formatted as a valid UUID4
 */
