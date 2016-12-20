/* eslint max-nested-callbacks:[2,6] camelcase: 0 */
describe('clbCollabTeam', function() {
  var collabId;
  var collabTeamUrl;
  var teamResponseData;
  var userList;
  var clbUser;

  var $httpBackend;
  var $rootScope;
  var clbCollabTeam;

  beforeEach(module('clb-collab'));

  beforeEach(inject(function(
    _$httpBackend_,
    _$rootScope_,
    $q,
    _clbCollabTeam_,
    clbEnv,
    _clbUser_
  ) {
    $rootScope = _$rootScope_;
    $httpBackend = _$httpBackend_;
    clbCollabTeam = _clbCollabTeam_;
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

  describe('.list(collabId)', function() {
    it('should retrieve a promise', function() {
      $httpBackend.expectGET(collabTeamUrl)
        .respond(200, angular.toJson(teamResponseData));
      var promise = clbCollabTeam.list(collabId);
      expect(promise.then).toBeDefined();
    });

    describe('resolve to a user list', function() {
      var actual;
      beforeEach(function() {
        $httpBackend.expectGET(collabTeamUrl)
          .respond(200, angular.toJson(teamResponseData));
        var promise = clbCollabTeam.list(collabId);
        promise.then(function(data) {
          actual = data;
        });
        $httpBackend.flush(1);
      });

      it('should contains properties from a user', function() {
        expect(clbUser.list).toHaveBeenCalledWith({
          pageSize: 0,
          filter: {
            id: ['123456', '234567']
          }
        });

        expect(actual.length).toBe(2);
        var user = actual[0];
        expect(user.username).toBe('jdoe');
        expect(user.displayName).toBe('John Doe');
      });

      it('should have id set to the OIDC user id', function() {
        var user = actual[0];
        expect(user.id).toBe('123456');
      });

      it('should have membership_id set to the django user id', function() {
        var user = actual[0];
        expect(user.membershipId).toBe(123456);
      });

      it('should have a role property define', function() {
        var user = actual[0];
        expect(user.role).toBe('Data Scientist');
      });
    });

    it('should reject an hbpError', function() {
      var actual;
      $httpBackend.expectGET(collabTeamUrl).respond(500);
      clbCollabTeam.list(collabId).then(null, function(err) {
        actual = err;
      });
      $httpBackend.flush(1);
      $rootScope.$apply();
      expect(actual.code).toBe(500);
    });

    it('should delete a user', function() {
      $httpBackend.expectDELETE(collabTeamUrl).respond(200);
      clbCollabTeam.delete(collabId, 123456);
      $httpBackend.flush();
      $rootScope.$apply();
    });
  });
});
