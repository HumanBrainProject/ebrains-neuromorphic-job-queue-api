angular.module('clb-collab')
.factory('clbContext', clbContext);

/**
 * @namespace clbContext
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp             Angular DI
 * @param  {object} $q                Angular DI
 * @param  {object} clbError          Angular DI
 * @param  {object} clbEnv            Angular DI
 * @param  {class}  ClbContextModel   Angular DI
 * @return {object}                   the service
 */
function clbContext(clbAuthHttp, $q, clbError, clbEnv, ClbContextModel) {
  var ongoingContextRequests = {};
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var contextUrl = collabUrl + 'context/';

  return {
    get: get
  };

  /**
   * @memberof module:clb-collab.clbContext
   * @param  {string} uuid UUID of the context
   * @return {Promise}     Resolve to the ClbContextModel instance
   */
  function get(uuid) {
    if (!uuid) {
      return $q.reject(clbError.error({
        message: 'uuid parameter is required'
      }));
    }
    // return the promise of an ongoing request
    if (ongoingContextRequests[uuid]) {
      return ongoingContextRequests[uuid];
    }
    // proceed to the request
    ongoingContextRequests[uuid] =
      clbAuthHttp.get(contextUrl + uuid + '/', {cache: true})
    .then(function(res) {
      ongoingContextRequests[uuid] = null;
      return ClbContextModel.fromJson(res.data);
    }, function(res) {
      ongoingContextRequests[uuid] = null;
      return clbError.rejectHttpError(res);
    });
    return ongoingContextRequests[uuid];
  }
}
