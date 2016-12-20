/* eslint max-nested-callbacks:[2,6] camelcase: 0 */
describe('clbTeamRole', function() {
  var collabId;
  var collabTeamUrl;
  var teamResponseData;
  var userList;
  var clbUser;

  var $httpBackend;
  var clbCollabTeamRole;

  beforeEach(module('clb-collab'));

  beforeEach(inject(function(
    _$httpBackend_,
    _$rootScope_,
    $q,
    _clbCollab_,
    clbEnv,
    _clbUser_,
    _clbCollabTeamRole_
  ) {
    $httpBackend = _$httpBackend_;
    clbCollabTeamRole = _clbCollabTeamRole_;
    collabId = 3;
    collabTeamUrl = clbEnv.get('api.collab.v0') +
      '/collab/' + collabId + '/team/';
    clbUser = _clbUser_;
    teamResponseData = [{
      username: 'jdoe',
      user_id: 123456,
      role: 'Data Scientist'
    }, {
      username: 'mdoe',
      user_id: 234567,
      role: 'Director'
    }];
    userList = [
      {id: '123456', displayName: 'John Doe', username: 'jdoe'},
      {id: '234567', displayName: 'Marie Doe', username: 'mdoe'}
    ];
    spyOn(clbUser, 'list').and.returnValue($q.when({
      results: userList,
      hasNext: false,
      hasPrevious: false
    }));
  }));

  afterEach(function() {
    // Ensure all mocked requests were properly resolved.
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should return nothing', function() {
    var nowt = clbCollabTeamRole.get(collabId, undefined);
    expect(nowt).toBeUndefined();
  });

  it('should get a cached role', function() {
    /* jshint camelcase: false */
    var user1 = teamResponseData[0];
    $httpBackend.expectGET(collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200, angular.toJson({
      role: user1.role,
      user_id: user1.user_id,
      collab: collabId
    }));
    var role1_promise = clbCollabTeamRole.get(collabId, user1.user_id);
    expect(role1_promise).toBeDefined();
    var role1;
    role1_promise.then(function(d) {
      role1 = d;
      expect(role1).toBe(user1.role);
    });
  });

  it('should get a role from http', function() {
    /* jshint camelcase: false */
    var user1 = {
      user_id: 666,
      role: 'Supplier of vague requirements',
      username: 'lfer'
    };
    var role1 = {
      role: user1.role,
      user: user1.user_id,
      collab: collabId
    };

    $httpBackend.expectGET(collabTeamUrl + 'role/' + user1.user_id + '/')
      .respond(200, angular.toJson(role1));
    clbCollabTeamRole.get(collabId, user1.user_id).then(function(resp) {
      expect(resp).toBe(role1);
    });
  });

  it('should set a role', function() {
    /* jshint camelcase: false */
    var user1 = teamResponseData[0];
    $httpBackend.expectPOST(collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200);
    clbCollabTeamRole.set(collabId, user1.user_id, 'some new role');
    $httpBackend.expectPUT(collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200);
    var newRole = 'some other new role';
    clbCollabTeamRole.set(collabId, user1.user_id, newRole);
    clbCollabTeamRole.get(collabId, user1.user_id)
    .then(function(resp) {
      expect(resp).toBe(newRole);
    });
  });

  it('should set a role on the second attempt', function() {
    var user1 = teamResponseData[0];
    $httpBackend.expectPOST(
      collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200);
    clbCollabTeamRole.set(
      collabId, user1.user_id, 'some new role');
    $httpBackend.flush();
    $httpBackend.expectPUT(collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(404);
    $httpBackend.expectPOST(
      collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200);
    clbCollabTeamRole.set(collabId, user1.user_id, 'some new role');
    $httpBackend.flush();
    var newRole = 'some other new role';
    $httpBackend.expectPUT(collabTeamUrl + 'role/' + user1.user_id + '/')
    .respond(200);
    clbCollabTeamRole.set(collabId, user1.user_id, newRole);
    clbCollabTeamRole.get(collabId, user1.user_id)
    .then(function(resp) {
      expect(resp).toBe(newRole);
    });
    $httpBackend.flush();
  });
});
