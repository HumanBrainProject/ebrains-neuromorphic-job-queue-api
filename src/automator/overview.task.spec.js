/* eslint-plugin eslint-plugin-jasmine */
describe('overview task handler', function() {
  var data;
  var scope;
  var overview;
  var backend;
  var navStore;
  var storage;
  var q;

  beforeEach(module('clb-automator'));
  beforeEach(inject(function(
    $rootScope,
    $httpBackend,
    $q,
    clbAutomator,
    clbCollabNav,
    clbStorage
  ) {
    backend = $httpBackend;
    overview = clbAutomator.handlers.overview;
    scope = $rootScope;
    navStore = clbCollabNav;
    storage = clbStorage;
    q = $q;
  }));
  beforeEach(function() {
    data = {
      fileEntity: {
        _uuid: '123',
        _name: 'text.html',
        _entityType: 'file',
        _contentType: 'text/html'
      },
      fileContent: 'Lorem ipsum dolor...',
      collab: {
        id: 1,
        title: 'My Collab',
        content: 'Description'
      },
      expectedNavItem: {
        id: 2,
        context: 'aaa-bbb',
        parent: 10,
        appId: 3
      },
      appResponse: {
        count: 1,
        results: [{
          id: 4
        }]
      },
      rootNavItem: {
        context: 'root',
        children: [{
          id: 10,
          context: 'ccc-ddd',
          appId: 1,
          update: function() { },
          toJson: function() { }
        }]
      }
    };
  });

  it('should declare an overview handler', function() {
    expect(overview).toBeDefined();
  });

  it('should fill content using only descriptor', inject(function() {
    spyOn(navStore, 'getRoot')
      .and.returnValue(q.when(data.rootNavItem));
    spyOn(storage, 'getContent')
      .and.returnValue(q.when(data.fileContent));
    backend.expectPOST('http://richtext/v0/richtext/').respond(201);
    overview({
      collab: data.collab.id,
      entity: data.fileEntity._uuid
    }).then(function(res) {
      expect(res).toEqual(data.expectedNavItem);
    });
    scope.$digest();
  }));

  it('should fill content using mainly context', inject(function() {
    spyOn(navStore, 'getRoot')
      .and.returnValue(q.when(data.rootNavItem));
    spyOn(storage, 'getContent')
      .and.returnValue(q.when(data.fileContent));
    backend.expectPOST('http://richtext/v0/richtext/').respond(201);
    overview(
      {
        entity: 'file'
      },
      {
        entities: {
          file: data.fileEntity
        },
        collab: data.collab
      }).then(function(res) {
        expect(res).toEqual(data.expectedNavItem);
      });
    scope.$digest();
  }));

  it('should update content appId', inject(function() {
    spyOn(navStore, 'getRoot')
      .and.returnValue(q.when(data.rootNavItem));
    backend.expectGET('http://collab/v0/extension/?title=My+app+name')
      .respond(200, data.appResponse);
    backend.expectPUT('http://collab/v0/collab/1/nav/10/').respond(200, {});

    spyOn(data.rootNavItem.children[0], 'update').and.callFake(function(appid) {
      data.expectedNavItem.appId = appid.appId;
    });
    overview(
      {
        app: 'My app name'
      },
      {
        entities: {
          file: data.fileEntity
        },
        collab: data.collab
      }).then(function() {
        expect(data.expectedNavItem.appId)
          .toEqual(data.appResponse.results[0].id);
      });
    backend.flush();
    scope.$digest();
  }));
});
