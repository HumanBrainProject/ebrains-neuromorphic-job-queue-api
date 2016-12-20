/**
 * @module clb-storage
 * @desc
 * The ``clb-storage`` module contains tools needed to access and work with the
 * HBP Document Service. It is targeted to integrate easily with the HBP
 * Collaboratory, even if the service is more generic.
 */
angular.module('clb-storage', [
  'uuid4',
  'clb-error',
  'clb-env',
  'clb-rest',
  'clb-identity'
]);
