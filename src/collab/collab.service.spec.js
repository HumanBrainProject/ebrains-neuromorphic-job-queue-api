/* eslint max-nested-callbacks:[1,6] camelcase:0 */
describe('clbCollab Service', function() {
  // injected variables available for all tests
  var $httpBackend;
  var clbCollab;
  var ClbCollabModel;

  // load main module
  beforeEach(module('clb-collab'));

  beforeEach(inject(function(
    _$httpBackend_,
    _clbCollab_,
    _ClbCollabModel_
  ) {
    // inject global variables
    $httpBackend = _$httpBackend_;
    clbCollab = _clbCollab_;
    ClbCollabModel = _ClbCollabModel_;
  }));

  afterEach(function() {
    // Ensure all mocked requests were properly resolved.
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
  });

  describe('Tests clbCollab', function() {
    var $rootScope;
    var collab1;
    var collab2;
    var collab3;
    var collab4;
    var allCollabs;
    var allCollabs2;
    var allCollabsResultSet;
    var allCollabsResultSet2;
    var allCollabsResultSetNext;
    var allCollabsResultSetPrev;
    var collab1Mod;
    var newTitle;
    var newContent;
    var host = 'http://collab/v0';
    var collabUrl = host + '/collab';
    beforeEach(inject(function($q, _$rootScope_) {
      collab1 = {
        id: 1,
        title: 'foo',
        content: 'bar',
        private: false
      };
      collab2 = {
        id: 2,
        title: 'bar',
        content: 'foo',
        private: true
      };
      collab3 = {
        id: 3,
        title: 'barfoo',
        content: 'foobar',
        private: false
      };
      collab4 = {
        id: 4,
        title: 'foobar',
        content: 'barfoo',
        private: true
      };
      $rootScope = _$rootScope_;
      allCollabs = [collab1, collab2];
      allCollabs2 = [collab3, collab4];
      allCollabsResultSet = {
        count: 6,
        results: allCollabs,
        next: collabUrl + '/next/',
        previous: collabUrl + '/prev/'
      };
      allCollabsResultSet2 = {
        count: 6,
        results: allCollabs2,
        next: null,
        previous: null
      };
      allCollabsResultSetNext = {
        count: 6,
        results: allCollabs,
        next: collabUrl + '/next/',
        previous: null
      };
      allCollabsResultSetPrev = {
        count: 6,
        results: allCollabs,
        next: null,
        previous: collabUrl + '/prev/'
      };
      newTitle = 'some title';
      newContent = 'some content';
      collab1Mod = angular.copy(collab1);
      collab1Mod.title = newTitle;
      collab1Mod.content = newContent;
    }));

    describe('conversion', function() {
      it('should generate from JSON representation', function() {
        var collab = ClbCollabModel.fromJson(collab1);
        expect(collab.id).toBe(1);
        expect(collab.title).toBe('foo');
        expect(collab.content).toBe('bar');
        expect(collab.private).toBe(false);
      });

      it('should generate json from Collab instance', function() {
        var collab = new ClbCollabModel({
          id: 1,
          title: 'foo',
          content: 'bar',
          private: true
        });
        var data = collab.toJson();
        expect(data.id).toBe(1);
        expect(data.title).toBe('foo');
        expect(data.content).toBe('bar');
        expect(data.private).toBe(true);
      });
    });

    describe('list', function() {
      it('should get a collab list', function() {
        var list;
        $httpBackend.expectGET(collabUrl + '/')
        .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
        clbCollab.list().then(function(l) {
          list = l;
        });
        $httpBackend.flush();
        $rootScope.$apply();
        expect(list.results.length).toBe(allCollabs.length);
        expect(list.count).toBe(6);
        expect(list.results[0].title).toBe(allCollabs[0].title);
        expect(list[0] instanceof ClbCollabModel);
      });

      it('should accept a search string', function() {
        $httpBackend.expectGET(collabUrl + '/?search=test')
        .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
        clbCollab.list({search: 'test'});
        $httpBackend.flush();
      });

      it('should accept an id argument as string', function() {
        $httpBackend.expectGET(collabUrl + '/?id=1,2,3')
        .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
        clbCollab.list({id: '1,2,3'});
        $httpBackend.flush();
      });

      it('should accept an id argument as array', function() {
        $httpBackend.expectGET(collabUrl + '/?id=1,2,3')
        .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
        clbCollab.list({id: [1, 2, 3]});
        $httpBackend.flush();
      });

      describe('LEGACY', function() {
        it('should support url as first argument and params', function() {
          $httpBackend.expectGET('http://test.me/?id=1,2,3&page_size=12&search=test')
            .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
          clbCollab.list('http://test.me/', {
            params: {
              search: 'test',
              page_size: 12,
              id: '1,2,3'
            }
          });
          $httpBackend.flush();
        });
      });
    });

    it('should get a collab list prev and next', function() {
      var list1;
      clbCollab.list().then(function(l) {
        list1 = l;
      });
      $httpBackend.expectGET(collabUrl + '/')
      .respond(200, JSON.stringify(allCollabsResultSet), {}, '');
      $httpBackend.flush();
      $rootScope.$apply();
      expect(list1.results.length).toBe(allCollabs.length);
      expect(list1.count).toBe(6);
      expect(list1.results[0].title).toBe(allCollabs[0].title);

      var list2;
      $httpBackend.expectGET(collabUrl + '/next/')
      .respond(200, JSON.stringify(allCollabsResultSetPrev), {}, '');
      list1.next().then(function(l) {
        list2 = l;
      });
      $httpBackend.flush();
      expect(list2.results.length).toBe(allCollabs.length * 2);
      expect(list2.count).toBe(6);
      expect(list2.results[allCollabs.length].title)
      .toBe(allCollabs[0].title);

      var list3;
      $httpBackend.expectGET(collabUrl + '/prev/')
      .respond(200, JSON.stringify(allCollabsResultSetNext), {}, '');
      list2.previous().then(function(l) {
        list3 = l;
      });
      $httpBackend.flush();
      expect(list3.results.length).toBe(allCollabs.length * 3);
      expect(list3.count).toBe(6);
      expect(list3.results[0].title).toBe(allCollabs[0].title);
    });

    it('should get collab id 1', function() {
      var cl1;
      clbCollab.get(1).then(function(cl) {
        cl1 = cl;
      });
      $httpBackend.expectGET(collabUrl + '/1/').respond(200, collab1, {}, '');
      $httpBackend.flush();
      $rootScope.$apply();
      expect(cl1.id).toBe(1);
      expect(cl1.title).toBe(collab1.title);
    });

    describe('getByLabel', function() {
      var collab;
      var cache;

      beforeEach(inject(function($cacheFactory) {
        cache = $cacheFactory.get('clbCollabInstances');
        $httpBackend.expectGET(host + '/r/home/').respond(200, collab2, {}, '');
        clbCollab.getByLabel('home').then(function(cl) {
          collab = cl;
        });
        $httpBackend.flush();
        $rootScope.$apply();
      }));

      it('should retrieve a collab given its label', function() {
        expect(collab.id).toBe(2);
      });

      it('should cache the collab using the id', function() {
        expect(cache.get(collab.id)).toBe(collab);
      });

      it('should cache the collab using the label', function() {
        expect(cache.get('home')).toBe(collab);
      });

      it('should remove the collab from cache on remove', function() {
        $httpBackend.expectDELETE([collabUrl, '/', collab2.id, '/'].join(''))
        .respond(200);
        clbCollab.delete(collab);
        $httpBackend.flush(1);
        $rootScope.$apply();
        expect(cache.get('home')).toBeUndefined();
      });

      describe('when collab is first retrieved by id', function() {
        var expected; // hold reference to the expected object.

        beforeEach(function() {
          // retrieve a collab by its id
          $httpBackend.expectGET([collabUrl, '/', 3, '/'].join(''))
          .respond(200, {id: 3, title: 'ByID Collab'}, {}, '');
          clbCollab.get(3).then(function(c) {
            expected = c;
          });
          $httpBackend.flush(1);
          $rootScope.$apply();

          // retrieve a collab by its matching label
          $httpBackend.expectGET([host, '/r/test/'].join(''))
          .respond(200, {id: 3, title: 'ByLabel Collab'}, {}, '');
          clbCollab.getByLabel('test');
          $httpBackend.flush(1);
          $rootScope.$apply();
        });

        afterEach(function() {
          cache.removeAll();
        });

        it('should hold same reference for its label', function() {
          expect(cache.get('test')).toBe(expected);
        });

        it('should hold same reference for its id', function() {
          expect(cache.get(3)).toBe(expected);
        });

        it('should delete both reference from the cache', function() {
          $httpBackend.expectDELETE([collabUrl, '/', 3, '/'].join(''))
          .respond(200);
          clbCollab.delete(expected);
          $httpBackend.flush(1);
          $rootScope.$apply();
          expect(cache.get('test')).toBeUndefined();
        });
      });
    });

    describe('mine()', function() {
      it('should get my collabs', function() {
        var myCl;
        clbCollab.mine().then(function(my) {
          myCl = my;
        });
        $httpBackend.expectGET(host + '/mycollabs/')
        .respond(200, allCollabsResultSetNext, {}, '');
        $httpBackend.flush();

        expect(myCl.results[0].id).toBe(allCollabs[0].id);
        expect(myCl.results[1].content).toBe(allCollabs[1].content);

        $httpBackend.expectGET(host + '/collab/next/')
        .respond(200, allCollabsResultSet2, {}, '');
        myCl.next();
        $httpBackend.flush();
        expect(myCl.results[2].id).toBe(allCollabs2[0].id);
        expect(myCl.results[3].content).toBe(allCollabs2[1].content);
        expect(myCl.results.length)
        .toBe(allCollabs.length + allCollabs2.length);
      });
      it('accept search option', function() {
        clbCollab.mine({search: 'test'});
        $httpBackend.expectGET(host + '/mycollabs/?search=test')
        .respond(200, allCollabsResultSetNext, {}, '');
        $httpBackend.flush();
      });
    });

    describe('create a collab', function() {
      it('should work with a json object', function() {
        var newCl = {
          title: newTitle,
          content: newContent
        };
        var created;
        clbCollab.create(newCl).then(function(nc) {
          created = nc;
        });
        $httpBackend.expectPOST(collabUrl + '/')
        .respond(200, collab1Mod, {}, '');
        $httpBackend.flush();
        $rootScope.$apply();

        expect(created).not.toBe(undefined);
        expect(created.id).toBe(collab1Mod.id);
        expect(created.title).toBe(collab1Mod.title);
        expect(created.content).toBe(collab1Mod.content);
      });

      it('should work with a Collab instance', function() {
        var c = new ClbCollabModel();
        c.title = newTitle;
        c.content = newContent;
        var created;
        clbCollab.create(c).then(function(nc) {
          created = nc;
        });
        $httpBackend.expectPOST(collabUrl + '/')
        .respond(200, collab1Mod, {}, '');
        $httpBackend.flush();
        $rootScope.$apply();

        expect(created).toBe(c);
        expect(c.id).toBeDefined();
      });
    });

    describe('update', function() {
      it('should use a json object', function() {
        var c = angular.copy(collab1);
        c.title = newTitle;
        c.private = true;
        var cc;
        clbCollab.save(c).then(function(nc) {
          cc = nc;
        });

        $httpBackend.expectPUT(collabUrl + '/1/').respond(function() {
          var r = angular.copy(collab1);
          r.title = newTitle;
          r.private = true;
          return [200, r, {}, ''];
        });
        $httpBackend.flush();
        $rootScope.$apply();

        expect(cc.id).toBe(collab1.id);
        expect(cc.title).toBe(newTitle);
        expect(collab1.title).not.toBe(newTitle);
        expect(cc.private).toBe(true);
      });

      it('should work with a collab instance', function() {
        var c = ClbCollabModel.fromJson(collab1);
        c.title = newTitle;
        var cc;
        clbCollab.save(c).then(function(nc) {
          cc = nc;
        });

        $httpBackend.expectPUT(collabUrl + '/1/').respond(function() {
          var r = angular.copy(collab1);
          r.title = newTitle;
          return [200, r, {}, ''];
        });
        $httpBackend.flush();
        $rootScope.$apply();
        expect(cc).toBe(c);
      });
    });

    it('should delete a collab', function() {
      clbCollab.delete(collab1);
      $httpBackend.expectDELETE(collabUrl + '/1/').respond(200, '', {}, '');
      $httpBackend.flush();
      $rootScope.$apply();
    });
  });
});
