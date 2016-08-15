angular.module('clb-collab')
.factory('clbCollabTeamRole', clbCollabTeamRole);

/**
 * @namespace clbCollabTeamRole
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp    Angular DI
 * @param  {object} $log     Angular DI
 * @param  {object} $q       Angular DI
 * @param  {object} clbEnv   Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}          Angular Service
 */
function clbCollabTeamRole(clbAuthHttp, $log, $q, clbEnv, clbError) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var rolesCache = {};

  return {
    get: get,
    set: set
  };

  /**
   * Retrieve the role of a user.
   * @param  {int}    collabId  Collab ID
   * @param  {string} userId    User ID
   * @return {string}           The user role
   */
  function get(collabId, userId) {
    if (!userId) {
      $log.error('Must provide userId: ', collabId, userId);
      return;
    }
    if (!rolesCache[collabId]) {
      rolesCache[collabId] = {};
    }
    if (rolesCache[collabId] && rolesCache[collabId][userId]) {
      return $q.when(rolesCache[collabId][userId]);
    }
    return clbAuthHttp.get(collabUrl + collabId + '/team/role/' + userId + '/')
    .then(function(res) {
      rolesCache[collabId][userId] = res.data.role;
      return $q.when(rolesCache[collabId][userId]);
    }, function(res) {
      if (res.status === 404) {
        rolesCache[collabId][userId] = undefined;
        return $q.when(rolesCache[collabId][userId]);
      }
      clbError.rejectHttpError(res);
    });
  }

  /**
   * Set the role of a User within a Collab.
   * @param {int} collabId    Collab ID
   * @param {string} userId   User ID
   * @param {string} role     Role description
   * @return {Promise}        Resolve when the role is set.
   */
  function set(collabId, userId, role) {
    var thisUrl = collabUrl + collabId + '/team/role/' + userId + '/';
    if (rolesCache[collabId] && rolesCache[collabId][userId]) {
      rolesCache[collabId][userId] = role;
      return clbAuthHttp.put(thisUrl, {role: role})
      .catch(function(resp) {
        if (resp.status === 404) { // should have been a POST...
          return clbAuthHttp.post(thisUrl, {role: role})
          .catch(clbError.rejectHttpError);
        }
        return clbError.rejectHttpError(resp);
      });
    }
    if (!rolesCache[collabId]) {
      rolesCache[collabId] = {};
    }
    rolesCache[collabId][userId] = role;
    return clbAuthHttp.post(thisUrl, {role: role})
    .catch(clbError.rejectHttpError);
  }
}
