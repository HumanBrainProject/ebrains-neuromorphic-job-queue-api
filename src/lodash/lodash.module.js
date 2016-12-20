/* global _ */
/**
 * Fix some compatibility issues with previous angular-hbp-common.
 * @module lodash
 * @private
 */
angular.module('lodash', [])
.constant('lodash', _)
.run(function($log, lodash) {
  // keep lodash compatibility with older versions
  if (!lodash.indexBy) {
    $log.debug('define some lodash 3 functions from lodash 3');
    lodash.indexBy = lodash.keyBy;
    lodash.pluck = lodash.map;
  }
  if (!lodash.keyBy) {
    $log.debug('define some lodash 4 functions from lodash 3');
    lodash.keyBy = lodash.indexBy;
  }
});
