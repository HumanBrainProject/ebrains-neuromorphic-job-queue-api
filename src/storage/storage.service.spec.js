/* eslint camelcase:0 */

describe('clbStorage service', function() {
  var backend;
  var entityStore;
  var q;
  var service;
  var contextId;
  var actual;
  var scope;
  var assign = function(val) {
    actual = val;
  };
  var entity;

  beforeEach(module('clb-storage'));
  beforeEach(inject(function(
    $q,
    $httpBackend,
    $rootScope,
    hbpEntityStore,
    clbStorage
  ) {
    backend = $httpBackend;
    entityStore = hbpEntityStore;
    q = $q;
    service = clbStorage;
    scope = $rootScope;

    contextId = '30FF9E92-B994-41D2-B6F9-9D03BC8C70AD';
    entity = {
      _uuid: '106884F1-9EA1-4542-AF73-E28F27629400'
    };
  }));

  // Prevent request mismatch
  afterEach(function() {
    backend.verifyNoOutstandingExpectation();
    backend.verifyNoOutstandingRequest();
    actual = null;
  });

  describe('setContextMetadata(entity, contextId)', function() {
    it('should let you define a metadata', function() {
      var expectedArgs = [entity, {}];
      expectedArgs[1]['ctx_' + contextId] = 1;
      spyOn(entityStore, 'addMetadata').and.returnValue(q.when());
      service.setContextMetadata(entity, contextId);
      expect(entityStore.addMetadata)
        .toHaveBeenCalledWith(expectedArgs[0], expectedArgs[1]);
    });
    it('return a promise', function() {
      spyOn(entityStore, 'addMetadata').and.returnValue(q.when(entity));
      expect(service.setContextMetadata(entity, contextId)).toBeAPromise();
    });
  });
  describe('getEntityByContext()', function() {
    it('should retrieve a context', function() {
      var results = {results: [{}]};
      spyOn(entityStore, 'query')
        .and.returnValue(q.when(results));
      service.getEntityByContext(contextId).then(assign);
      scope.$digest();
      expect(actual).toBe(results);
    });
  });
  describe('deleteContextMetadata(entity, contextId)', function() {
    it('should delete the entity metadata key', function() {
      spyOn(entityStore, 'deleteMetadata').and.returnValue(q.when());
      service.deleteContextMetadata(entity, contextId);
      expect(entityStore.deleteMetadata)
        .toHaveBeenCalledWith(entity, ['ctx_' + contextId]);
    });
  });
  describe('updateContextMetadata(newEty, oldEty, contextId)', function() {
    it('should update the context metadata', function() {
      spyOn(entityStore, 'deleteMetadata').and.returnValue(q.when());
      spyOn(entityStore, 'addMetadata').and.returnValue(q.when());

      var newEntity = {
        _uuid: 'new'
      };
      service.updateContextMetadata(newEntity, entity, contextId);
      expect(entityStore.deleteMetadata)
        .toHaveBeenCalledWith(entity, ['ctx_' + contextId]);
      scope.$digest();
      var expectedMetadata = {};
      expectedMetadata['ctx_' + contextId] = 1;
      expect(entityStore.addMetadata)
        .toHaveBeenCalledWith(newEntity, expectedMetadata);
    });
  });
  describe('getProjectByCollab(collabId)', function() {
    it('should retrieve a project entity given a collab', function() {
      var expectedResult = {results: [entity]};
      spyOn(entityStore, 'query').and.returnValue(q.when(expectedResult));
      service.getProjectByCollab(1).then(assign);
      expect(entityStore.query).toHaveBeenCalledWith({managed_by_collab: 1});
      scope.$digest();
      expect(actual).toBe(expectedResult);
    });
  });
});
