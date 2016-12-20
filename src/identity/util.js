angular.module('clb-identity')
.factory('clbIdentityUtil', clbIdentityUtil);

/* ------------------ */

/**
 * The ``hbpIdentityUtil`` service groups together useful function for the hbpIdentity module.
 * @namespace clbIdentityUtil
 * @memberof module:clb-identity
 * @param  {object} $log   Angular DI
 * @param  {object} lodash Angular DI
 * @return {object}        Angular Service
 */
function clbIdentityUtil($log, lodash) {
  return {
    queryParams: queryParams
  };

  /**
   * @name queryParams
   * @memberof module:clb-identity.clbIdentityUtil
   * @desc
   * Accept an object with the following attributes:
   *
   * - page: the result page to load (default: 0)
   * - pageSize: the size of a page (default: 50)
   * - filter: an Object containing the field name as key and
   *           the query as a String or an Array of strings
   * - sort: the ordering column as a string. prepend with '-' to reverse order.
   *
   * @param  {Object} options sort and filter keys
   * @return {Object} params suitable for $http requests
   */
  function queryParams(options) {
    var defaultOptions = {
      page: 0,
      pageSize: 50
    };
    var opt = angular.extend(defaultOptions, options);

    var sortStr;
    if (opt.sort) {
      var sortVal = opt.sort;
      if (lodash.isArray(sortVal) && sortVal.length > 0) {
        sortVal = sortVal[0];
        $log.warn('Multiple field sorting not supported. Using: ' + sortVal);
      }
      sortStr = lodash(sortVal).toString();

      if (sortStr.charAt(0) === '-') {
        sortStr = sortStr.substring(1) + ',desc';
      }
    }

    return {
      page: opt.page,
      pageSize: opt.pageSize,
      sort: sortStr
    };
  }
}
