angular.module('clb-collab')
.factory('clbCollabTeam', clbCollabTeam);

/**
 * Angular client to access Collab Team REST endpoint.
 *
 * @namespace clbCollabTeam
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp             Angular DI
 * @param  {object} $log              Angular DI
 * @param  {object} $q                Angular DI
 * @param  {object} lodash            Angular DI
 * @param  {object} clbEnv            Angular DI
 * @param  {object} clbError          Angular DI
 * @param  {object} clbCollabTeamRole Angular DI
 * @param  {object} clbUser           Angular DI
 * @return {object}                   Angular Service
 */
function clbCollabTeam(
  clbAuthHttp,
  $log,
  $q,
  lodash,
  clbEnv,
  clbError,
  clbCollabTeamRole,
  clbUser
) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';

  return {
    add: add,
    delete: remove, // backward compatibility
    remove: remove,
    list: list,
    userInTeam: userInTeam,
    roles: clbCollabTeamRole // backward compatibility
  };

  /**
   * Add a team member to a Collab.
   * @param  {int} collabId the Collab id
   * @param  {string} userId the User id
   * @return {Promise} resolve after the user has been added
   */
  function add(collabId, userId) {
    return clbAuthHttp.put(collabUrl + collabId + '/team/', {
      users: [userId]
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Remove a team member from a Collab.
   * @param  {int} collabId the Collab id
   * @param  {string} userId the User id
   * @return {Promise} resolve after the user has been added
   */
  function remove(collabId, userId) {
    return clbAuthHttp({
      method: 'DELETE',
      url: collabUrl + collabId + '/team/',
      data: {users: [userId]},
      headers: {'Content-Type': 'application/json'}
    }).catch(clbError.rejectHttpError);
  }

  /**
   * List team members from the Collab.
   * @param  {int} collabId The collab ID
   * @return {Promise}      Resolve to an array of user with injected membership
   *                        informations.
   */
  function list(collabId) {
    return clbAuthHttp.get(collabUrl + collabId + '/team/')
    .then(function(res) {
      var indexedTeam = lodash.keyBy(res.data, 'user_id');
      return clbUser.list({
        pageSize: 0,
        filter: {
          id: lodash.keys(indexedTeam)
        }
      }).then(function(data) {
        return lodash.reduce(data.results, function(res, user) {
          var membershipInfo = indexedTeam[parseInt(user.id, 10)];
          if (membershipInfo) {
            res.push(angular.extend({}, user, {
              membershipId: membershipInfo.user_id,
              role: membershipInfo.role
            }));
          }
          return res;
        }, []);
      });
    }, clbError.rejectHttpError);
  }

  /**
   * Return true if the current user is in the team
   * @param  {int} collabId The collab ID
   * @return {Promise}      Resolve to a boolean
   */
  function userInTeam(collabId) {
    return clbUser.getCurrentUserOnly().then(function(me) {
      return clbAuthHttp.get(collabUrl + collabId + '/team/')
      .then(function(list) {
        return lodash.keyBy(
          list.data, 'user_id')[parseInt(me.id, 10)] !== undefined;
      });
    });
  }
}
