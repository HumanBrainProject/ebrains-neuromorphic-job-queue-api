/* global hello */

/**
 * @module clb-app
 * @desc
 * ``clb-app`` module provides utilities to retrieve current
 * HBP Collaboratory Context in an app and to communicate with the current
 * Collaboratory instance.
 *
 * This module must be bootstraped using ``angular.clbBootstrap`` function as
 * it needs to load the global environment loaded in CLB_ENBIRONMENT angular
 * constant.
 */
angular.module('clb-app', ['clb-env', 'clb-error'])
.constant('clbAppHello', hello);
