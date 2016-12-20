/**
 * The ``clb-ui-storage`` module provides Angular directive to work
 * with the HBP Collaboratory storage.
 *
 *
 * Featured Component
 * ------------------
 *
 * - The directive :doc:`clb-file-browser <module-clb-ui-storage.clb-file-browser>`
 *   provides an easy to use browser which let the user upload new files,
 *   create folder and act as file selector.
 * @module clb-ui-storage
 */
angular.module('clb-ui-storage', [
  'ui.bootstrap',
  'clb-ui-error',
  'clb-storage'
]);
