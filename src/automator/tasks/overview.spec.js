/* eslint-plugin eslint-plugin-jasmine */
describe('overview task handler', function() {
  var data;
  var scope;
  var overview;
  var backend;
  var navStore;
  var fileStore;
  var q;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    $httpBackend,
    $q,
    hbpCollaboratoryAutomator,
    hbpCollaboratoryNavStore,
    hbpFileStore
  ) {
    backend = $httpBackend;
    overview = hbpCollaboratoryAutomator.handlers.overview;
    scope = $rootScope;
    navStore = hbpCollaboratoryNavStore;
    fileStore = hbpFileStore;
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
      rootNavItem: {
        context: 'root',
        children: [{
          id: 10,
          context: 'ccc-ddd',
          appId: 1
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
    spyOn(fileStore, 'getContent')
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
    spyOn(fileStore, 'getContent')
      .and.returnValue(q.when(data.fileContent));
    backend.expectPOST('http://richtext/v0/richtext/').respond(201);
    overview({
      entity: 'file'
    }, {
      entities: {
        file: data.fileEntity
      },
      collab: data.collab
    }).then(function(res) {
      expect(res).toEqual(data.expectedNavItem);
    });
    scope.$digest();
  }));
});
