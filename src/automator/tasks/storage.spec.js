/* eslint-plugin eslint-plugin-jasmine */
describe('createNavItem', function() {
  var data;
  var scope;
  var copyEntity;
  var entityStore;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    hbpCollaboratoryAutomator,
    hbpEntityStore
  ) {
    copyEntity = hbpCollaboratoryAutomator.handlers.storage;
    entityStore = hbpEntityStore;
    scope = $rootScope;
  }));
  beforeEach(function() {
    data = {
      fileEntity: {
        _uuid: '123',
        _name: 'image.png',
        _entityType: 'file',
        _contentType: 'image/png'
      },
      rootEntity: {
        _uuid: 'root'
      },
      newEntity: {
        _uuid: '421',
        _name: 'test.png',
        _entityType: 'file',
        _contentType: 'image/png',
        _parent: 'root'
      },
      collab: {
        id: 1,
        title: 'My Collab',
        content: 'Description'
      }
    };
  });

  it('should declare a storage handler', function() {
    expect(copyEntity).toBeDefined();
  });

  it('should copy a file to root', inject(function($q) {
    spyOn(entityStore, 'getPath').and.returnValue($q.when(data.rootEntity));
    spyOn(entityStore, 'copy').and.returnValue($q.when(data.newEntity));
    var config = {
      collab: data.collab,
      storage: {
        'test.png': '123'
      }
    };
    copyEntity(config)
    .then(function(result) {
      expect(result).toEqual({
        'test.png': data.newEntity
      });
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
    });
    scope.$digest();
    expect(entityStore.getPath).toHaveBeenCalledWith('/' + data.collab.title);
    expect(entityStore.copy).toHaveBeenCalledWith(
      data.fileEntity._uuid,
      data.rootEntity._uuid
    );
  }));
});
