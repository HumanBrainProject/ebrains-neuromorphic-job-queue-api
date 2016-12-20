/* eslint max-nested-callbacks:[2,5] */
describe('clbUser', function() {
  beforeEach(module('clb-identity'));

  var $scope;
  var $httpBackend;
  var $q;
  var $window;
  var userDirectory;
  var userApiUrl;
  var me;
  var user;
  var groups;

  beforeEach(inject(function(_$window_) {
    $window = _$window_;
    // enable user api v1
    $window.bbpConfig.collab = {
      features: {
        identity: {
          userApiV1: true
        }
      }
    };
  }));

  beforeEach(inject(function(
    $rootScope,
    _$httpBackend_,
    _$q_,
    clbUser,
    clbEnv
  ) {
    $scope = $rootScope.$new();
    $httpBackend = _$httpBackend_;
    $q = _$q_;
    userDirectory = clbUser;
    userApiUrl = clbEnv.get('api.user.v1') + '/';
    me = {
      id: '111',
      username: 'user111',
      displayName: 'Homer Simpsons',
      emails: [{
        value: 'user111@domain.com',
        primary: true
      }]
    };
    user = {
      id: '923288',
      givenName: 'Bruce',
      familyName: 'Wayne',
      displayName: 'Mr Bruce Wayne',
      emails: [{
        value: 'batman@example.com',
        primary: true
      }],
      birthdate: '1939-05-01',
      gender: 'MALE',
      subproject: '6'
    };

    groups = [{name: 'S444'}, {name: 'S555'}];
  }));

  var veryLongId1 = '';
  var veryLongId2 = '';
  var listResponse;
  beforeEach(function() {
    $httpBackend.whenGET(userApiUrl + 'user/search?id=foo&id=gul&id=Sbar')
    .respond(200, {
      _embedded: {
        users: [{
          id: 'Sbar',
          displayName: 'Sbar-name'
        }, {
          id: 'foo',
          displayName: 'foo-name'
        }, {
          id: 'gul',
          displayName: 'gul-name'}
        ]}
    });
    for (var i = 0; i < 1000; i++) {
      veryLongId1 += 'a';
      veryLongId2 += 'b';
    }
    $httpBackend.whenGET(userApiUrl + 'user/search?id=' + veryLongId1)
    .respond(200, {
      _embedded: {
        users: [{
          id: veryLongId1,
          displayName: 'name'
        }]
      }
    });
    $httpBackend.whenGET(userApiUrl + 'user/search?id=' + veryLongId2)
    .respond(200, {
      _embedded: {
        users: [{
          id: veryLongId2,
          displayName: 'name'
        }]
      }});

    $httpBackend.whenGET(userApiUrl + 'user/me')
    .respond(200, me);
    $httpBackend.whenGET(userApiUrl + 'user/search?id=' + user.id)
    .respond(200, {_embedded: {users: [user]}});

    $httpBackend.whenGET(userApiUrl + 'user/me/member-groups').respond(200, {
      _embedded: {
        groups: groups.slice(0, 1)
      },
      _links: {
        next: {
          href: userApiUrl + 'user/me/member-groups_SECONDPAGE'
        }
      }
    });

    $httpBackend.whenGET(userApiUrl + 'user/me/member-groups_SECONDPAGE')
    .respond(200, {
      _embedded: {
        groups: groups.slice(1)
      }
    });

    $httpBackend.whenPOST(userApiUrl + 'user').respond(201);

    listResponse = {
      _embedded: {
        users: []
      },
      a: {
        b: {href: 'nextUrl'}
      },
      _links: {
        a: {href: 'nextUrl'},
        next: {href: 'nextUrl'},
        prev: {href: 'prevUrl'}
      }
    };
    $httpBackend.whenGET(new RegExp(userApiUrl + 'user?.*'))
    .respond(200, listResponse);
    $httpBackend.whenGET(listResponse._links.next.href)
    .respond(200, listResponse);
    $httpBackend.whenGET(listResponse._links.prev.href)
    .respond(200, listResponse);
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  it('should call to the rest service and return information', function() {
    var result;
    $httpBackend.expectGET(userApiUrl + 'user/search?id=foo&id=gul&id=Sbar');
    userDirectory.get(['foo', 'Sbar', 'gul']).then(function(users) {
      result = users;
    });
    $httpBackend.flush(1);
    expect(result.foo).not.toBe(undefined);
    expect(result.foo.displayName).toBe('foo-name');
    expect(result.gul).not.toBe(undefined);
    expect(result.gul.displayName).toBe('gul-name');
    expect(result.Sbar).not.toBe(undefined);
    expect(result.Sbar.displayName).toBe('Sbar-name');
  });

  it('should support single id call', function() {
    var result;
    $httpBackend.expectGET(userApiUrl + 'user/search?id=foo')
    .respond(200, {
      _embedded: {
        users: [{
          id: 'foo',
          displayName: 'foo-name'
        }]
      }
    });
    userDirectory.get('foo').then(function(users) {
      result = users;
    });
    $httpBackend.flush(1);
    expect(result.displayName).toBe('foo-name');
  });

  it('should support single array id call', function() {
    var result;
    $httpBackend.expectGET(userApiUrl + 'user/search?id=foo')
    .respond(200, {
      _embedded: {
        users: [{
          id: 'foo',
          displayName: 'foo-name'
        }]
      }
    });
    userDirectory.get(['foo']).then(function(users) {
      result = users;
    });
    $httpBackend.flush(1);
    expect(result.foo.displayName).toBe('foo-name');
  });

  it('should split the call in URL no longer than 2000 chars', function() {
    var result;
    $httpBackend.expectGET(userApiUrl + 'user/search?id=' + veryLongId1);
    $httpBackend.expectGET(userApiUrl + 'user/search?id=' + veryLongId2);
    userDirectory.get([veryLongId1, veryLongId2]).then(function(users) {
      result = users;
    });
    $httpBackend.flush(2);
    expect(result[veryLongId1]).not.toBe(undefined);
    expect(result[veryLongId1].displayName).toBe('name');
    expect(result[veryLongId2]).not.toBe(undefined);
    expect(result[veryLongId2].displayName).toBe('name');
  });

  describe('getCurrentUserOnly', function() {
    it('should call the right rest services', function() {
      $httpBackend.expectGET(userApiUrl + 'user/me');

      userDirectory.getCurrentUserOnly();

      $httpBackend.flush(1);
    });

    it('should call the right rest services only the first time', function() {
      $httpBackend.expectGET(userApiUrl + 'user/me');

      userDirectory.getCurrentUserOnly();

      $httpBackend.flush(1);
      var result = userDirectory.getCurrentUserOnly();
      expect(result.groups).toBe(undefined);
    });

    it('should really return a user and no groups', function() {
      var user;
      userDirectory.getCurrentUserOnly().then(function(u) {
        user = u;
      });

      $httpBackend.flush();
      expect(user.displayName).toBeDefined();
      expect(user.groups).toBeUndefined();
    });
  });

  describe('getCurrentUser', function() {
    it('should call the right rest services', function() {
      $httpBackend.expectGET(userApiUrl + 'user/me');
      $httpBackend.expectGET(userApiUrl + 'user/me/member-groups');
      $httpBackend.expectGET(userApiUrl + 'user/me/member-groups_SECONDPAGE');

      userDirectory.getCurrentUser();

      $httpBackend.flush(3);
    });

    it('should call the right rest services only the first time', function() {
      $httpBackend.expectGET(userApiUrl + 'user/me');
      $httpBackend.expectGET(userApiUrl + 'user/me/member-groups');
      $httpBackend.expectGET(userApiUrl + 'user/me/member-groups_SECONDPAGE');

      userDirectory.getCurrentUser();

      $httpBackend.flush(3);
      userDirectory.getCurrentUser();
    });

    it('should really return a user and groups', function() {
      var user;
      userDirectory.getCurrentUser().then(function(u) {
        user = u;
      });

      $httpBackend.flush();
      expect(user.displayName).toBeDefined();
      expect(user.groups).toBeDefined();
    });
  });

  describe('create', function() {
    it('Should call the right rest service', function() {
      var user = {
        givenName: 'Bruce',
        familyName: 'Wayne',
        email: 'batman@example.com',
        birthdate: '1939-05-01',
        gender: 'MALE',
        subproject: '6'
      };

      $httpBackend.expectPOST(userApiUrl + 'user', user);
      userDirectory.create(user);

      $httpBackend.flush(1);
    });
  });

  describe('update', function() {
    var data;

    beforeEach(function() {
      data = {
        emails: [{
          value: 'batman@dc-comics.com',
          primary: true
        }]
      };
    });

    describe('using the user object', function() {
      beforeEach(function() {
        listResponse.result = [user];
        $httpBackend.whenPATCH(userApiUrl + 'user/' + user.id, user)
        .respond(user);

        $httpBackend.expectPATCH(userApiUrl + 'user/' + user.id, user);
      });

      it('should send all informations', function() {
        userDirectory.update(user);
        $httpBackend.flush();
      });

      it('should retrieve a promise', function() {
        var result = userDirectory.update(user);
        expect(result).toBeDefined();
        expect(result.then).toBeDefined();
        $httpBackend.flush();
      });

      it('should resolve to the updated user', function() {
        var updatedUser;
        var called;

        $httpBackend.expectGET(userApiUrl + 'user/search?id=923288');

        userDirectory.update(user).then(function(user) {
          called = true;
          updatedUser = user;
        });
        $httpBackend.flush();
        $scope.$digest();

        expect(called).toBe(true);
        expect(updatedUser).toEqual(user);
      });
    });

    describe('using user id and data', function() {
      beforeEach(function() {
        listResponse.result = [user];
        $httpBackend.whenPATCH(userApiUrl + 'user/' + user.id, data)
        .respond(user);
        $httpBackend.expectPATCH(userApiUrl + 'user/' + user.id, data);
      });

      it('should send all data', function() {
        userDirectory.update(user.id, data);
        $httpBackend.flush();
      });
    });

    describe('using user and data', function() {
      beforeEach(function() {
        listResponse.result = [user];
        $httpBackend.whenPATCH(userApiUrl + 'user/' + user.id, data)
        .respond(user);
        $httpBackend.expectPATCH(userApiUrl + 'user/' + user.id, data);
      });

      it('should send all data', function() {
        userDirectory.update(user, data);
        $httpBackend.flush();
      });
    });

    describe('refresh cache', function() {
      var cache;
      var data;
      var expectedMe;
      beforeEach(inject(function($cacheFactory, $rootScope) {
        cache = $cacheFactory.get('clbUser');
        cache.removeAll();

        data = {emails: [{value: 'user111@domain.com', primary: true}]};
        $httpBackend.whenPATCH(userApiUrl + 'user/' + user.id, data)
        .respond(200, angular.extend({}, user, data));
        $httpBackend.whenPATCH(userApiUrl + 'user/' + me.id, data)
        .respond(200, angular.extend({}, me, data));

        // preload the cache, try and only load the user first, then
        // load the groups
        userDirectory.getCurrentUserOnly();
        userDirectory.getCurrentUser();
        userDirectory.get([user.id]);
        $httpBackend.flush();
        $rootScope.$digest();

        expectedMe = angular.extend({}, me, {groups: groups});
      }));

      it('should cache the current user', function() {
        expect(cache.get('_currentUser_'))
        .toDeepEqual(expectedMe);
      });

      it('should cache the user', function() {
        expect(cache.get(user.id)).toDeepEqual(user);
      });

      it('should update the cache with the corresponding id', function() {
        var expectedUser = angular.extend({}, user, data);
        var done = false;
        $httpBackend.expectPATCH(userApiUrl + 'user/' + user.id, data);
        $httpBackend.expectGET(userApiUrl + 'user/search?id=' + user.id)
        .respond({_embedded: {users: [expectedUser]}});
        userDirectory.update(user, data).then(function() {
          expect(cache.get(user.id)).toDeepEqual(expectedUser);
          done = true;
        });
        $httpBackend.flush();

        expect(done).toBe(true);
      });

      it('should update the cache of the current user', function() {
        expectedMe = angular.extend(expectedMe, data);
        var done = false;
        userDirectory.update(me, data).then(function() {
          expect(cache.get('_currentUser_')).toBeUndefined();
          expect(cache.get(me.id)).toDeepEqual(expectedMe);
          done = true;
        });
        $httpBackend.expectPATCH(userApiUrl + 'user/' + me.id, data);
        $httpBackend.expectGET(userApiUrl + 'user/search?id=' + me.id)
        .respond({_embedded: {users: [expectedMe]}});
        $httpBackend.flush();
        expect(done).toBe(true);
      });
    });
  });

  it('should search for users', function() {
    var results;
    $httpBackend.expectGET(userApiUrl +
      'user/searchByText?page=0&pageSize=50&str=test')
    .respond(200, { /* paginated result set */});
    userDirectory.search('test').then(function(r) {
      results = r;
    });
    $httpBackend.flush();
    expect(results).toBeDefined();
  });

  describe('list user profiles', function() {
    it('should call the right rest service', function() {
      var options = {
        page: 0,
        pageSize: 30,
        filter: {
          username: 'olga'
        },
        sort: 'username'
      };

      $httpBackend.expectGET(userApiUrl +
        'user/search?username=olga&page=0&pageSize=30&sort=username')
      .respond(200, {/* some stuff */});
      userDirectory.list(options);

      $httpBackend.flush(1);
    });

    it('should set default values', function() {
      $httpBackend.expectGET(userApiUrl +
        'user?page=0&pageSize=50&sort=familyName');
      userDirectory.list();
      $httpBackend.flush(1);
    });

    it('should support filtering on multiple values', function() {
      var options = {
        page: 0,
        pageSize: 30,
        filter: {
          username: ['olga', 'wanda']
        }
      };
      $httpBackend.expectGET(userApiUrl +
        'user/search?username=olga&username=wanda&page=0' +
        '&pageSize=30&sort=familyName')
      .respond(200, { /* some stuff */});
      userDirectory.list(options);

      $httpBackend.flush(1);
    });

    it('should support filtering on username and accountType', function() {
      var options = {
        page: 0,
        pageSize: 30,
        filter: {
          username: ['olga', 'wanda'],
          accountType: 'HBP_MEMBER'
        }
      };
      $httpBackend.expectGET(userApiUrl + 'user/search?username=olga&' +
        'username=wanda&accountType=HBP_MEMBER&page=0&pageSize=30' +
        '&sort=familyName')
      .respond(200, { /* some stuff */});
      userDirectory.list(options);

      $httpBackend.flush(1);
    });

    it('should support reverse sorting', function() {
      var options = {
        page: 0,
        pageSize: 30,
        sort: '-username'
      };
      $httpBackend.expectGET(userApiUrl +
        'user?page=0&pageSize=30&sort=username,desc')
      .respond(200, { /* some stuff */});
      userDirectory.list(options);

      $httpBackend.flush(1);
    });

    it('should fail when a not supported filter is provided', function() {
      var options = {
        filter: {
          something: 'somevalue'
        }
      };
      var error;
      userDirectory.list(options).then(null, function(err) {
        error = err;
      });

      $scope.$digest();

      expect(error).toBeDefined();
      expect(error.type).toBe('FilterNotSupportedError');
    });

    it('should provide next and prev functions', function() {
      var checkResponse = function(response) {
        expect(response.next).toBeDefined();
        expect(response.previous).toBeDefined();
        expect(response.results).toBeDefined();

        expect(angular.isFunction(response.previous)).toBe(true);
        expect(angular.isFunction(response.next)).toBe(true);
        expect(angular.isArray(response.results)).toBe(true);
      };

      var response;
      userDirectory.list().then(function(data) {
        response = data;
        checkResponse(data);
      });

      $httpBackend.flush(1);

      $httpBackend.expectGET('nextUrl');
      $httpBackend.expectGET('prevUrl');
      response.next().then(function(data) {
        checkResponse(data);
      });

      response.previous().then(function(data) {
        checkResponse(data);
      });

      $httpBackend.flush(2);
    });
  });

  describe('isGroupMember', function() {
    beforeEach(function() {
      spyOn(userDirectory, 'getCurrentUser').and.returnValue($q.when({
        groups: [{name: 'S000'}, {name: 'S111'}, {name: 'S222'}]
      }));
    });

    it('should be true if the user belongs to the group', function() {
      var result;
      userDirectory.isGroupMember('S000').then(function(r) {
        result = r;
      });
      $scope.$digest();

      expect(result).toBe(true);
    });

    it('should be true if at least one group match', function() {
      var result;
      userDirectory.isGroupMember(['S111', 'S222', 'S333']).then(function(r) {
        result = r;
      });
      $scope.$digest();

      expect(result).toBe(true);
    });

    it('should be false if the group don\'t match', function() {
      var result;
      userDirectory.isGroupMember('S333').then(function(r) {
        result = r;
      });
      $scope.$digest();

      expect(result).toBe(false);
    });

    it('should be false if there is no matching groups', function() {
      var result;
      userDirectory.isGroupMember(['S333', 'S555']).then(function(r) {
        result = r;
      });
      $scope.$digest();

      expect(result).toBe(false);
    });
  });

  describe('memberGroups', function() {
    it('calls the member-groups endpoint for the given user id', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/1000/member-groups?page=0&pageSize=50&sort=name');
      userDirectory.memberGroups('1000');
      $httpBackend.flush();
    });

    it('calls the member-groups endpoint for the current user', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/me/member-groups?page=0&pageSize=50&sort=name');
      userDirectory.memberGroups();
      $httpBackend.flush();
    });

    it('retrieve a ResultSet', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/1000/member-groups?page=0&pageSize=50&sort=name')
      .respond(200, {
        _embedded: {
          groups: []
        }
      });
      userDirectory.memberGroups('1000').then(function(r) {
        expect(r.results).toBeDefined();
      });
    });
  });

  describe('adminGroups', function() {
    it('should retrieve admin groups of current user', function() {
      var result;
      $httpBackend.expectGET(userApiUrl +
        'user/me/admin-groups?page=0&pageSize=50&sort=name')
      .respond(200, {
        _embedded: {
          groups: [{
            name: 'g1'
          }, {
            name: 'g2'
          }]
        }
      });
      userDirectory.adminGroups()
      .then(function(rs) {
        result = rs;
      })
      .catch(function(err) {
        expect(err).toBeNull('an exception occured');
      });
      $httpBackend.flush(1);
      expect(result.results).toEqual([{
        name: 'g1'
      }, {
        name: 'g2'
      }]);
    });

    it('should retrive admin groups of another user', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/1200/admin-groups?page=0&pageSize=50&sort=name');
      userDirectory.adminGroups('1200');
      $httpBackend.flush(1);
    });

    it('should retrieve filtered list of admin groups', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/me/admin-groups?name=one&name=two&page=0&pageSize=50&sort=name')
      .respond(200, {/* recordset */});
      userDirectory.adminGroups({filter: {
        name: ['one', 'two']
      }})
      .catch(function(err) {
        expect(err).toBeNull('an exception occured');
      });
      $httpBackend.flush(1);
    });

    it('should retrieve the group with a different page size', function() {
      $httpBackend.expectGET(userApiUrl +
        'user/me/admin-groups?page=0&pageSize=500&sort=name')
      .respond(200, {/* recordset */});
      userDirectory.adminGroups({
        pageSize: 500
      })
      .catch(function(err) {
        expect(err).toBeNull('an exception occured');
      });
      $httpBackend.flush(1);
    });
  });
});
