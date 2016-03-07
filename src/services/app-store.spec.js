describe('hbpCollaboratoryAppStore', function() {
  var backend;
  var store;

  beforeEach(module('hbpCollaboratoryAppStore'));

  beforeEach(inject(function(
    $httpBackend,
    hbpCollaboratoryAppStore
  ) {
    backend = $httpBackend;
    store = hbpCollaboratoryAppStore;
  }));

  afterEach(function() {
    backend.verifyNoOutstandingExpectation();
    backend.verifyNoOutstandingRequest();
  });

  describe('list', function() {
    it('should return a list of apps', function() {
      var apps;
      backend.expectGET('http://collab/v0/extension/').respond(200, {
        results: [{
          title: 'Test',
          description: 'The Description'
        }]
      });
      store.list().then(function(r) {
        apps = r;
      });
      backend.flush(1);
      expect(apps).toBeDefined();
      expect(apps.length).toBe(1);
    });

    it('should return all pages of the list', function() {
      var apps;
      backend.expectGET('http://collab/v0/extension/').respond(200, {
        results: [{
          title: 'Test',
          description: 'The Description'
        }],
        next: 'http://collab/v0/extension/?page=1'
      });
      backend.expectGET('http://collab/v0/extension/?page=1').respond(200, {
        results: [{
          title: 'Test 2',
          description: 'The Description 2'
        }]
      });
      store.list().then(function(r) {
        apps = r;
      });
      backend.flush(2);
      expect(apps).toBeDefined();
      expect(apps.length).toBe(2);
    });
  });

  describe('findById', function() {
    it('should return an App', function() {
      var app;
      backend.expectGET('http://collab/v0/extension/1/').respond(200, {
        title: 'Test',
        description: 'The description'
      });
      store.getById(1).then(function(r) {
        app = r;
      });
      backend.flush(1);
      expect(app.title).toBe('Test');
    });
  });

  describe('findOne', function() {
    it('should return an App', function() {
      backend.expectGET('http://collab/v0/extension/?title=Test').respond(200, {
        results: [{
          title: 'Test',
          description: 'The description'
        }]
      });
      store.findOne({
        title: 'Test'
      });
      backend.flush(1);
    });
  });
});
