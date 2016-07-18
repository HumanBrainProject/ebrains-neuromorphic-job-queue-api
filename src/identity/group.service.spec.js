/* eslint max-nested-callbacks:[2,6] */
/* eslint-disable max-len */
describe('clbGroup', function() {
  beforeEach(module('clb-identity'));

  var $window;
  var $httpBackend;
  var clbGroup;
  var stubV1;

  beforeEach(inject(function(_$httpBackend_, _$window_, _clbGroup_) {
    // inject global variables
    $httpBackend = _$httpBackend_;
    clbGroup = _clbGroup_;
    $window = _$window_;
    stubV1 = {
      group: {
        _embedded: {
          groups: [{
            name: "hbp-dev-sp01-leader",
            humanReadableName: null,
            description: "Subproject SP01 leader",
            _links: {
              self: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6"
              },
              group: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6"
              },
              members: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/members"
              },
              createdBy: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/createdBy"
              },
              updatedBy: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/updatedBy"
              },
              admins: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/admins"
              },
              adminGroups: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/adminGroups"
              },
              subGroups: {
                href: "https://services-dev.humanbrainproject.eu/idm/v1/api/group/6/subGroups"
              }
            }
          }]
        },
        _links: {
        },
        page: {
          size: 10,
          totalElements: 1,
          totalPages: 1,
          number: 0
        }
      }
    };
  }));

  afterEach(function() {
    // Ensure all mocked requests were properly resolved.
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  describe('Tests clbGroup', function() {
    var group1;
    var members1;
    var host = 'http://user/v1';
    var u1 = {
      id: 'u1'
    };
    var u2 = {
      id: 'u2'
    };
    beforeEach(inject(function() {
      members1 = [u1, u2];
    }));

    describe('v1', function() {
      beforeEach(function() {
        group1 = {
          name: 'gname',
          description: 'gdesc'
        };
        host = 'http://user/v1';
      });

      it('should get a group', function() {
        var group;
        clbGroup.get("gname").then(function(g) {
          group = g;
        });
        $httpBackend.expectGET(host + '/group/gname').respond(200, group1);
        $httpBackend.flush();
        expect(group.name).toBe(group1.name);
      });

      it('should get a group by name', function() {
        var group;
        clbGroup.getByName("hbp-dev-sp01-leader").then(function(g) {
          group = g;
        });

        var expUrl = host + '/group/search?name=hbp-dev-sp01-leader&page=0&pageSize=50';
        $httpBackend.expectGET(expUrl).respond(200, stubV1.group);
        $httpBackend.flush();
        expect(group.name).toBe(stubV1.group._embedded.groups[0].name);
      });

      describe('paginatedResultSet understand the API', function() {
        var rs;
        beforeEach(function() {
          clbGroup.list().then(function(res) {
            rs = res;
          });
          $httpBackend.expectGET(host + '/group?page=0&pageSize=50').respond(200, stubV1.group);
          $httpBackend.flush();
        });

        it('should return all group', function() {
          expect(rs.results.length).toBe(stubV1.group._embedded.groups.length);
        });

        it('should have group.name', function() {
          var group = rs.results[0];
          expect(group.name).toBe('hbp-dev-sp01-leader');
        });

        it('should have group.description', function() {
          var group = rs.results[0];
          expect(group.description).toBe('Subproject SP01 leader');
        });
      });

      it('should list groups with default values', function() {
        var data;
        clbGroup.list().then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group?page=0&pageSize=50').respond(200, stubV1.group);
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list groups with custom params with old sort syntax', function() {
        var data;
        var params = {
          pageSize: 44,
          page: 9,
          sort: ['name', 'id'],
          filter: {
            name: 'aldo'
          }
        };

        clbGroup.list(params).then(function(d) {
          data = d;
        });

        var expUrl = host + '/group/search?name=' + params.filter.name +
        '&page=' + params.page + '&pageSize=' + params.pageSize + '&sort=name';
        $httpBackend.expectGET(expUrl).respond(200, stubV1.group);
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list groups with custom params', function() {
        var data;
        var params = {
          pageSize: 44,
          page: 9,
          sort: 'name',
          filter: {
            name: 'aldo'
          }
        };

        clbGroup.list(params).then(function(d) {
          data = d;
        });

        var expUrl = host + '/group/search?name=' + params.filter.name + '&page=' +
        params.page + '&pageSize=' + params.pageSize + '&sort=name';
        $httpBackend.expectGET(expUrl).respond(200, stubV1.group);
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list group members', function() {
        var data;
        clbGroup.getMembers('gid').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/gid/members?page=0&pageSize=50').respond(200, members1);
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list member-groups', function() {
        var data;
        var groups = [];
        clbGroup.getMemberGroups('gid').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/gid/member-groups?page=0&pageSize=50').respond(200, {results: groups});
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list admin-groups', function() {
        var data;
        var groups = [];
        clbGroup.getAdminGroups('gid').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/gid/admin-groups?page=0&pageSize=50').respond(200, {results: groups});
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list parent-groups', function() {
        var data;
        var groups = [];
        clbGroup.getParentGroups('gid').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/gid/parent-groups?page=0&pageSize=50').respond(200, {results: groups});
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should list managed-groups', function() {
        var data;
        var groups = [];
        clbGroup.getManagedGroups('gid').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/gid/managed-groups?page=0&pageSize=50').respond(200, {results: groups});
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      it('should search for groups', function() {
        var data;
        clbGroup.search('test').then(function(d) {
          data = d;
        });
        $httpBackend.expectGET(host + '/group/searchByText?page=0&pageSize=50&str=test')
        .respond(200, stubV1.group);
        $httpBackend.flush();
        expect(data.results).toBeDefined();
      });

      describe('addMembers', function() {
        it('should accept 1 user', function() {
          var data;
          clbGroup.addMembers('gid', 'u3').then(function(d) {
            data = d;
          });
          $httpBackend.expectPOST(host + '/group/gid/members/u3').respond(201, null);
          $httpBackend.flush();
          expect(data).toEqual(['u3']);
        });

        it('should accept multiple users', function() {
          var data;
          clbGroup.addMembers('gid', ['u3', 'u4']).then(function(d) {
            data = d;
          });
          $httpBackend.expectPOST(host + '/group/gid/members/u3').respond(201);
          $httpBackend.expectPOST(host + '/group/gid/members/u4').respond(201);
          $httpBackend.flush();
          expect(data).toEqual(['u3', 'u4']);
        });
      });

      describe('removeMembers', function() {
        it('should accept 1 user', function() {
          var data;
          clbGroup.removeMembers('gid', 'u3').then(function(d) {
            data = d;
          });
          $httpBackend.expect('DELETE', host + '/group/gid/members/u3').respond(204);
          $httpBackend.flush();
          expect(data).toEqual(['u3']);
        });

        it('should accept multiple users', function() {
          var data;
          clbGroup.removeMembers('gid', ['u3', 'u4']).then(function(d) {
            data = d;
          });
          $httpBackend.expect('DELETE', host + '/group/gid/members/u3').respond(204);
          $httpBackend.expect('DELETE', host + '/group/gid/members/u4').respond(204);
          $httpBackend.flush();
          expect(data).toEqual(['u3', 'u4']);
        });
      });
    });

    describe('create', function() {
      beforeEach(function() {
        $window.bbpConfig.collab = {
          features: {
            identity: {
              userApiV1: true
            }
          }
        };
      });

      afterEach(function() {
        $window.bbpConfig.collab = {
          features: {
            identity: {
              userApiV1: true
            }
          }
        };
      });

      it('should accept name and description string', function() {
        var data;
        clbGroup.create('test', 'test me')
        .then(function(res) {
          data = res;
        });
        var expected = {name: 'test', description: 'test me', id: 1};
        $httpBackend.expectPOST(host + '/group', {name: 'test', description: 'test me'}).respond(201, expected);
        $httpBackend.flush();
        expect(data).toBeDefined();
      });

      it('should retrieve a HbpError in case of failure', function() {
        var data;
        clbGroup.create('test', 'test me')
        .catch(function(err) {
          data = err;
        });
        $httpBackend.expectPOST(host + '/group', {name: 'test', description: 'test me'}).respond(422);
        $httpBackend.flush();
        expect(data).toBeDefined();
      });
    });

    describe('update', function() {
      var _config;
      beforeEach(function() {
        _config = $window.bbpConfig.collab;
        $window.bbpConfig.collab = {
          features: {
            identity: {
              userApiV1: true
            }
          }
        };
      });

      afterEach(function() {
        $window.bbpConfig.collab = _config;
      });

      it('should accept a group instance', function() {
        var data;
        var group = {name: 'test', description: 'updated'};
        clbGroup.update(group)
        .then(function(res) {
          data = res;
        });
        var expected = {name: 'test', description: 'updated', id: 1};
        $httpBackend.expectPATCH(host + '/group/test', {description: 'updated'}).respond(200, expected);
        $httpBackend.flush();
        expect(data).toBeDefined();
        expect(data).toEqual(expected);
        expect(data).toBe(group);
      });

      it('should retrieve a HbpError in case of failure', function() {
        var data;
        var group = {name: 'test', description: 'updated'};
        clbGroup.update(group)
        .catch(function(err) {
          data = err;
        });
        $httpBackend.expectPATCH(host + '/group/test', {description: 'updated'}).respond(422);
        $httpBackend.flush();
        expect(data).toBeDefined();
      });
    });

    describe('delete', function() {
      beforeEach(function() {
        $window.bbpConfig.collab = {
          features: {
            identity: {
              userApiV1: true
            }
          }
        };
      });

      afterEach(function() {
        $window.bbpConfig.collab = {
          features: {
            identity: {
              userApiV1: true
            }
          }
        };
      });

      it('should accept groupId as a parameter', function() {
        var data;
        var done;
        clbGroup.delete(1)
        .then(function(res) {
          data = res;
          done = true;
        });
        $httpBackend.expectDELETE(host + '/group/1').respond(200);
        $httpBackend.flush();
        expect(done).toBe(true);
        expect(data).toBeUndefined();
      });

      it('should retrieve a HbpError in case of failure', function() {
        var data;
        clbGroup.delete(1)
        .catch(function(err) {
          data = err;
        });
        $httpBackend.expectDELETE(host + '/group/1').respond(422);
        $httpBackend.flush();
        expect(data).toBeDefined();
        expect(data.type).toBeDefined();
        expect(data.code).toBe(422);
      });
    });
  });
});
