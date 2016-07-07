describe('clbStream service', function() {
  var stream;
  var backend;

  beforeEach(module('clb-stream'));

  beforeEach(inject(function($httpBackend, clbStream) {
    stream = clbStream;
    backend = $httpBackend;
  }));

  afterEach(function() {
    backend.verifyNoOutstandingExpectation();
    backend.verifyNoOutstandingRequest();
  });

  describe('getStream', function() {
    it('should send a request to the stream backend', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(200);
      stream.getStream('HBPUser', 'johndoe');
      backend.flush();
    });

    it('should retrieve a promise', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(200);
      var p = stream.getStream('HBPUser', 'johndoe');
      backend.flush();
      expect(p).toBeAPromise();
    });

    it('promise should resolve with a paginated result set', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(200, {
        results: [
          {}, {}
        ],
        next: 'http://next'
      });
      var result;
      stream.getStream('HBPUser', 'johndoe').then(function(rs) {
        result = rs;
      });
      backend.flush();
      expect(result).toBeAPaginatedResultSet();
      expect(result.results.length).toBe(2);
    });

    it('fail and return a HbpError', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(500);
      var result;
      stream.getStream('HBPUser', 'johndoe').catch(function(err) {
        result = err;
      });
      backend.flush();
      expect(result).toBeHbpError();
    });

    it('support resultsFactory in options', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(200, {
        results: [{}]
      });
      stream.getStream('HBPUser', 'johndoe', {
        resultsFactory: function(results) {
          results[0].text = 'Tadaaaa';
        }
      }).then(function(activities) {
        expect(activities.results[0].text).toBe('Tadaaaa');
      });
      backend.flush();
    });

    it('return activity instances', function() {
      backend.expectGET('http://stream/v0/stream/HBPUser:johndoe/').respond(200, {
        results: [
          {
            actor: {id: 'johndoe', type: 'HBPUser', state: null},
            object: {id: 'softwarecat', type: 'HBPSoftware', state: null},
            summary: 'activity summary string',
            target: {id: 'general', type: 'HBPSoftwareCatalog', state: null},
            verb: 'REGISTER',
            time: '2016-05-24T15:30:18.122882Z'
          }
        ]
      });
      var result;
      stream.getStream('HBPUser', 'johndoe').then(function(rs) {
        result = rs.results[0];
      });
      backend.flush();
      expect(result.time).toBeInstanceOf(Date);
      expect(result.actor).toBeDefined();
      expect(result.target).toBeDefined();
      expect(result.object).toBeDefined();
      expect(result.verb).toBeSameTypeAs('');
    });
  });
});
