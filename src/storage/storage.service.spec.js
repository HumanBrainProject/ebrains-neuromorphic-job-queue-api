/* eslint camelcase:0 */

describe('clbStorage', function() {
  var backend;
  var service;
  var contextId;
  var actual;
  var assign = function(val) {
    actual = val;
  };
  var entityUrl;
  var baseUrl;
  var fileUrl;
  var entity;

  beforeEach(module('clb-storage'));

  beforeEach(inject(function(
    $q,
    $httpBackend,
    $rootScope,
    clbStorage,
    clbEnv
  ) {
    backend = $httpBackend;
    service = clbStorage;

    baseUrl = function(path) {
      return clbEnv.get('api.document.v0') + '/' + (path ? path : '');
    };

    entityUrl = function(path) {
      return baseUrl('entity/' + (path ? path : ''));
    };

    fileUrl = function(path) {
      return baseUrl('file/' + (path ? path : ''));
    };

    contextId = '30FF9E92-B994-41D2-B6F9-9D03BC8C70AD';
    entity = {
      _uuid: '106884F1-9EA1-4542-AF73-E28F27629400',
      _entityType: 'file'
    };
  }));

  // Prevent request mismatch
  afterEach(function() {
    backend.verifyNoOutstandingExpectation();
    backend.verifyNoOutstandingRequest();
    actual = null;
  });

  describe('isContainer', function() {
    it('should consider folder as a container', function() {
      expect(service.isContainer({_entityType: 'folder'})).toBe(true);
    });
    it('should consider project as a container', function() {
      expect(service.isContainer({_entityType: 'project'})).toBe(true);
    });
    it('should consider folder link as a container', function() {
      expect(service.isContainer({_entityType: 'link:folder'})).toBe(true);
    });
    it('should not consider file as a container', function() {
      expect(service.isContainer({_entityType: 'file'})).toBe(false);
    });
    it('should not consider file link as a container', function() {
      expect(service.isContainer({_entityType: 'link:file'})).toBe(false);
    });
  });

  describe('getEntity', function() {
    describe('by UUID', function() {
      it('accept a string', function() {
        backend.expectGET(entityUrl(entity._uuid))
        .respond(200, entity);
        service.getEntity(entity._uuid).then(assign);
        backend.flush(1);
        expect(actual).toDeepEqual(entity);
      });
      it('accept an entity descriptor', function() {
        backend.expectGET(entityUrl(entity._uuid))
        .respond(200, entity);
        service.getEntity(entity).then(assign);
        backend.flush(1);
        expect(actual).toDeepEqual(entity);
      });
      it('forward any exception', function() {
        backend.expectGET(entityUrl(entity._uuid))
        .respond(500);
        service.getEntity(entity._uuid).then(assign).catch(assign);
        backend.flush(1);
        expect(actual).toBeHbpError();
      });
    });

    describe('by Collab Context', function() {
      it('accept a UUID set as locator.ctx', function() {
        var results = {results: [{}]};
        backend.expectGET(
          entityUrl('?ctx_30FF9E92-B994-41D2-B6F9-9D03BC8C70AD=1'))
        .respond(200, results);
        service.getEntity({
          ctx: contextId
        }).then(assign);
        backend.flush();
        expect(actual).toDeepEqual(results);
      });
      it('forward any exception', function() {
        backend.expectGET(
          entityUrl('?ctx_30FF9E92-B994-41D2-B6F9-9D03BC8C70AD=1')
        ).respond(500);
        service.getEntity({ctx: contextId}).then(assign).catch(assign);
        backend.flush(1);
        expect(actual).toBeHbpError();
      });
    });

    describe('using a collab ID', function() {
      it('accept an ID set as locator.collab', function() {
        var expectedResult = entity;
        backend.expectGET(entityUrl('?managed_by_collab=1'))
        .respond(200, expectedResult);
        service.getEntity({collab: 1}).then(assign).catch(assign);
        backend.flush();
        expect(actual).toDeepEqual(entity);
      });

      it('should forward any server exception', function() {
        backend.expectGET(entityUrl('?managed_by_collab=1'))
        .respond(500);
        service.getEntity({collab: 1}).then(assign).catch(assign);
        backend.flush();
        expect(actual).toBeHbpError();
      });
    });
  });

  describe('getAbsolutePath', function() {
    it('should generate the entity absolute path', function() {
      backend.expectGET(baseUrl('entity_path/' + entity._uuid))
      .respond(200, {
        _uuid: entity._uuid,
        _path: '/A/B/C.txt'
      });
      service.getAbsolutePath(entity).then(assign);
      backend.flush();
      expect(actual).toBe('/A/B/C.txt');
    });
  });

  describe('getChildren', function() {
    describe('root projects', function() {
      var projectEntity;
      beforeEach(function() {
        projectEntity = {
          _uuid: '331C0A79-A12F-46AF-9DE4-09C43C0D8FFB',
          _entityType: 'project'
        };
      });
      it('accept a null parent', function() {
        backend.expectGET(baseUrl('project?sort=_name'))
        .respond({
          result: [projectEntity],
          hasMore: false
        });
        service.getChildren().then(assign);
        backend.flush();
        expect(actual).toBeAPaginatedResultSet();
        expect(actual.results).toDeepEqual([projectEntity]);
      });
      it('retrieve results', function() {
        backend.expectGET(baseUrl('project?sort=_name'))
        .respond({
          result: [projectEntity],
          hasMore: false
        });
        service.getChildren().then(assign);
        backend.flush(1);
        expect(actual.hasNext).toBe(false);
        expect(actual.results).toEqual([projectEntity]);
      });
      it('support pagination', function() {
        backend.expectGET(baseUrl('project?sort=_name'))
        .respond({
          result: [projectEntity],
          hasMore: true
        });
        service.getChildren().then(assign);
        backend.flush(1);
        expect(actual.hasNext).toBe(true);
        expect(actual.results).toEqual([]);

        backend.expectGET(baseUrl('project?from=' + projectEntity._uuid +
        '&sort=_name'))
        .respond({
          result: [projectEntity],
          hasMore: false
        });
        actual.next();
        backend.flush(1);
        expect(actual.hasNext).toBe(false);
        expect(actual.results).toEqual([projectEntity]);
      });
      it('support backward pagination', function() {
        backend.expectGET(baseUrl('project?sort=_name'))
        .respond({
          result: [projectEntity],
          hasPrevious: true
        });
        service.getChildren().then(assign);
        backend.flush(1);
        expect(actual.hasPrevious).toBe(true);
        expect(actual.results).toEqual([]);

        backend.expectGET(baseUrl('project?sort=_name' +
          '&until=' + projectEntity._uuid))
        .respond({
          result: [projectEntity],
          hasPrevious: false
        });
        actual.previous();
        backend.flush(1);
        expect(actual.hasPrevious).toBe(false);
        expect(actual.results).toEqual([projectEntity]);
      });
    });
    describe('from a folder', function() {
      it('accept a parent entity', function() {
        var folder = {
          _uuid: 'ED0FFE22-4C02-4631-B05E-683D6E70784A',
          _entityType: 'folder'
        };
        backend.expectGET(baseUrl('folder/' + folder._uuid +
          '/children?sort=_name')
        ).respond({});
        service.getChildren(folder).then(assign);
        backend.flush();
        expect(actual).toBeAPaginatedResultSet();
      });
    });
  });

  describe('metadata', function() {
    describe('setContextMetadata(entity, contextId)', function() {
      it('should let you define a metadata', function() {
        backend.expectPOST(
          baseUrl('file/' + entity._uuid + '/metadata'), {
            'ctx_30FF9E92-B994-41D2-B6F9-9D03BC8C70AD': 1
          }
        ).respond(201);
        service.setContextMetadata(entity, contextId);
        backend.flush();
      });
      it('return a promise', function() {
        backend.expectPOST(
          baseUrl('file/' + entity._uuid + '/metadata'), {
            'ctx_30FF9E92-B994-41D2-B6F9-9D03BC8C70AD': 1
          }
        ).respond(201);
        expect(service.setContextMetadata(entity, contextId)).toBeAPromise();
        backend.flush();
      });
    });
    describe('deleteContextMetadata(entity, contextId)', function() {
      it('should delete the entity metadata key', function() {
        backend.expectDELETE(
          baseUrl('file/106884F1-9EA1-4542-AF73-E28F27629400/metadata')
        ).respond(200);
        service.deleteContextMetadata(entity, contextId);
        backend.flush();
      });
    });
    describe('updateContextMetadata(newEty, oldEty, contextId)', function() {
      it('should update the context metadata', function() {
        backend.expectDELETE(
          baseUrl('file/106884F1-9EA1-4542-AF73-E28F27629400/metadata')
        ).respond(200);
        var newEntity = {
          _uuid: 'new',
          _entityType: 'file'
        };
        service.updateContextMetadata(newEntity, entity, contextId);

        backend.expectPOST(
          baseUrl('file/new/metadata'), {
            'ctx_30FF9E92-B994-41D2-B6F9-9D03BC8C70AD': 1
          }
        ).respond(201);
        backend.flush(1);
        var expectedMetadata = {};
        expectedMetadata['ctx_' + contextId] = 1;
        backend.flush(1);
      });
    });
  });

  describe('File Upload', function() {
    var standardHeader;
    var parentEntity;
    var fileEntity;
    var newEntityPost;
    var newEntity;

    beforeEach(function() {
      standardHeader = {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=utf-8'
      };
      parentEntity = {
        _uuid: '2E89ED66-0528-4779-BD59-B95239E22821',
        _entityType: 'folder'
      };
      fileEntity = {
        _uuid: '24DB8DF8-18D8-4A48-8895-FA4BDEFB3AC9',
        _name: 'test.png',
        _parent: '07BC1AAE-BE2C-4D4C-8214-7B52928AE4EE',
        _description: 'desc',
        _contentType: 'image/png',
        _entityType: 'file'
      };
      newEntityPost = {
        _name: 'test.png',
        _parent: '2E89ED66-0528-4779-BD59-B95239E22821',
        _description: 'desc',
        _contentType: 'image/png'
      };
      newEntity = angular.extend({}, newEntityPost, {
        _uuid: 'B21BA1CC-502F-4310-98B3-6DECBB2082F8',
        _entityType: 'file'
      });
    });

    afterEach(function() {
      backend.verifyNoOutstandingExpectation();
      backend.verifyNoOutstandingRequest();
    });

    describe('copy', function() {
      it('should copy a file entity', function() {
        backend.expectGET(entityUrl(fileEntity._uuid))
        .respond(200, fileEntity);
        backend.expectPOST(baseUrl('file'), newEntityPost)
        .respond(201, newEntity);
        backend.expectPUT(fileUrl(newEntity._uuid + '/content'),
          {},
          angular.extend({'X-Copy-From': fileEntity._uuid}, standardHeader)
        ).respond(200);
        service.copy(fileEntity._uuid, parentEntity._uuid)
        .then(function(entity) {
          expect(entity).toEqual(newEntity);
        }).catch(function(err) {
          expect(err).toBeUndefined();
        });
        backend.flush(3);
      });

      it('should fail with a terrible error', function() {
        backend.expectGET(entityUrl(fileEntity._uuid))
        .respond(200, fileEntity);
        backend.expectPOST(baseUrl('file'))
        .respond(201, newEntity);
        backend.expectPUT(fileUrl(newEntity._uuid + '/content'))
        .respond(500);
        service.copy(fileEntity._uuid, parentEntity._uuid)
        .then(function(entity) {
          expect(entity).toBeUndefined();
        }).catch(function(err) {
          expect(err.code).toBe(500);
        });
        backend.flush(3);
      });
    });
  });
});
