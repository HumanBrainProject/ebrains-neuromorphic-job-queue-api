/* eslint-plugin eslint-plugin-jasmine */
describe('storage task handler', function() {
  var data;
  var scope;
  var copyEntity;
  var entityStore;
  var storage;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    hbpCollaboratoryAutomator,
    hbpEntityStore,
    hbpCollaboratoryStorage
  ) {
    copyEntity = hbpCollaboratoryAutomator.handlers.storage;
    entityStore = hbpEntityStore;
    storage = hbpCollaboratoryStorage;
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
    spyOn(storage, 'getProjectByCollab')
      .and.returnValue($q.when(data.rootEntity));
    spyOn(entityStore, 'copy').and.returnValue($q.when(data.newEntity));
    var config = {
      collab: data.collab.id,
      entities: {
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
    expect(storage.getProjectByCollab).toHaveBeenCalledWith(data.collab.id);
    expect(entityStore.copy).toHaveBeenCalledWith(
      data.fileEntity._uuid,
      data.rootEntity._uuid
    );
  }));
});
