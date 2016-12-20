describe('clbResultSet', function() {
  var service;
  var scope;
  var actual;
  var _;
  var backend;
  var baseUrl;
  var expected;
  var $http;

  var assign = function(res) {
    actual = res;
  };

  beforeEach(module('clb-rest'));
  beforeEach(module('lodash'));
  beforeEach(inject(function(
    $rootScope,
    $httpBackend,
    _$http_,
    clbResultSet,
    lodash
  ) {
    service = clbResultSet;
    scope = $rootScope;
    _ = lodash;
    baseUrl = 'http://example.com/paginated';
    expected = ['hello', 'world'];
    backend = $httpBackend;
    $http = _$http_;
  }));

  afterEach(function() {
    actual = undefined;
    backend.verifyNoOutstandingRequest();
    backend.verifyNoOutstandingExpectation();
  });

  it('should retrieve records', function() {
    var rs = service.get($http.get(baseUrl)).instance;
    backend.expectGET(baseUrl).respond({
      results: expected
    });
    backend.flush(1);
    expect(rs.results).toEqual(expected);
  });

  it('should return a promise with an instance attribute', function() {
    var p = service.get($http.get(baseUrl));
    expect(angular.isFunction(p.then)).toBe(true);
    expect(p.instance).toBeDefined();
    expect(p.instance.promise).toBe(p);
    backend.expectGET(baseUrl).respond({results: expected});
    backend.flush(1);
  });

  describe('error handling', function() {
    var handledError;
    var rs;

    beforeEach(function() {
      handledError = null;
      rs = null;
    });

    [{
      name: 'initialize()',
      data: {
        beforeFunc: function() {
          backend.expectGET(baseUrl).respond(500, null);
          rs = service.get($http.get(baseUrl), {
            errorHandler: function(error) {
              handledError = error;
            }
          }).instance;
        }
      }
    }, {
      name: 'without error handler',
      data: {
        beforeFunc: function() {
          backend.expectGET(baseUrl).respond(500, null);
          rs = service.get($http.get(baseUrl)).instance;
        }
      }
    }, {
      name: 'next()',
      data: {
        beforeFunc: function() {
          backend.expectGET(baseUrl).respond({
            results: [],
            next: baseUrl + '/next'
          });
          backend.expectGET(baseUrl + '/next').respond(500, null);
          rs = service.get($http.get(baseUrl), {
            errorHandler: function(error) {
              handledError = error;
            }
          }).instance;
          rs.next();
        }
      }
    }, {
      name: 'previous()',
      data: {
        beforeFunc: function() {
          backend.expectGET(baseUrl).respond({
            results: [],
            previous: baseUrl + '/previous'
          });
          backend.expectGET(baseUrl + '/previous').respond(500, null);
          rs = service.get($http.get(baseUrl), {
            errorHandler: function(error) {
              handledError = error;
            }
          }).instance;
          rs.previous();
        }
      }
    }].forEach(function(spec) {
      describe(spec.name, function() {
        var expectHbpError = function(error) {
          expect(error).toBeDefined('error is undefined');
          expect(error.type).toBeDefined('error.type is undefined');
          expect(error.code).toBeDefined('error.code is undefined');
          expect(error.code).toBe(500);
        };
        beforeEach(spec.data.beforeFunc);
        it('should be a HbpError instance', function() {
          backend.flush();
          expectHbpError(rs.error);
        });
        it('should reject the promise', function() {
          var spy = jasmine.createSpy('errorCallback');
          rs.promise.catch(spy);
          backend.flush();
          expect(spy).toHaveBeenCalled();
        });
        it('should pass the HbpError as the cause for rejection', function() {
          backend.flush();
          expectHbpError(rs.error);
        });
        it('should call the optional error handler', function() {
          backend.flush();
          if (rs.errorHandler) {
            expectHbpError(handledError);
          }
        });
      });
    });
  });

  describe('.count', function() {
    var queryResult;
    var rs;

    beforeEach(inject(function($http) {
      queryResult = {
        results: []
      };
      backend.whenGET(baseUrl).respond(200, queryResult);
      rs = service.get($http.get(baseUrl)).instance;
    }));

    it('should be 0 when there is no records', function() {
      queryResult.count = 0;
      backend.flush();
      expect(rs.count).toBe(0);
    });

    it('should be -1 when the information is not provided', function() {
      backend.flush();
      expect(rs.count).toBe(-1);
    });

    it('should return the provided number', function() {
      queryResult.count = 22;
      backend.flush();
      expect(rs.count).toBe(22);
    });
  });

  describe('pagination', function() {
    var expectedPage;
    var spyOk;
    var spyKo;
    ['previous', 'next'].forEach(function(dir) {
      describe(dir + '()', function() {
        beforeEach(function() {
          spyOk = jasmine.createSpy('callback');
          spyKo = jasmine.createSpy('error');
          expectedPage = {
            next: ['my', 'name'],
            previous: ['ho', 'ah'],
            nextComplete: ['hello', 'world', 'my', 'name'],
            previousComplete: ['ho', 'ah', 'hello', 'world']
          };
          backend.whenGET(baseUrl)
          .respond({
            results: expected,
            next: baseUrl + '/next',
            previous: baseUrl + '/previous'
          });
          backend.whenGET(baseUrl + '/next')
          .respond({results: expectedPage.next});
          backend.whenGET(baseUrl + '/previous')
          .respond({results: expectedPage.previous});
        });

        it('should set .has' + dir + ' to true', function() {
          backend.expectGET(baseUrl);
          var rs = service.get($http.get(baseUrl)).instance;
          backend.flush();
          expect(rs['has' + _.capitalize(dir)]).toBe(true);
        });

        it('should return a promise', function() {
          var rs = service.get($http.get(baseUrl)).instance;
          rs[dir]().then(spyOk, spyKo);
          backend.expectGET(baseUrl);
          backend.expectGET(baseUrl + '/' + dir);
          backend.flush(2);
          expect(spyKo).not.toHaveBeenCalled();
          expect(spyOk).toHaveBeenCalled();
        });

        it('should return a promise with an instance member', function() {
          var rs = service.get($http.get(baseUrl)).instance;
          var p = rs[dir]();
          expect(p.instance).toBeDefined();
          expect(p.instance.promise).toBe(p);
          backend.expectGET(baseUrl);
          backend.expectGET(baseUrl + '/' + dir);
          backend.flush();
        });

        it('should retrive results', function() {
          var rs = service.get($http.get(baseUrl)).instance;
          rs[dir]().then(assign);
          backend.expectGET(baseUrl);
          backend.expectGET(baseUrl + '/' + dir);
          backend.flush();
          expect(actual.results).toEqual(expectedPage[dir + 'Complete']);
          expect(rs.results).toEqual(expectedPage[dir + 'Complete']);
        });
      });
    });
  });

  describe('customization', function() {
    it('accept different result keys', function() {
      var rs = service.get($http.get(baseUrl), {
        nextUrlKey: 'a',
        previousUrlKey: 'b',
        resultKey: 'c',
        countKey: 'd'
      }).instance;
      expected = {
        a: baseUrl + '/next',
        b: baseUrl + '/previous',
        c: ['a'],
        d: 22
      };
      rs.next();
      rs.previous();
      backend.expectGET(baseUrl).respond(expected);
      backend.expectGET(baseUrl + '/next').respond(expected);
      backend.expectGET(baseUrl + '/previous').respond(expected);
      backend.flush();
      expect(rs.results).toEqual(['a', 'a', 'a']);
      expect(rs.count).toBe(22);
    });

    it('accept handlers for hasNext', function() {
      expected = {results: []};
      var rs = service.get($http.get(baseUrl), {
        hasNextHandler: function() {
          return true;
        }
      }).instance;
      expected = {results: []};
      backend.expectGET(baseUrl).respond(expected);
      backend.flush();
      expect(rs.hasNext).toBe(true);
    });
  });

  it('should support a resultsFactory func that mutate results', function() {
    expected = {
      results: [{id: 99}, {id: 100}, {id: 101}]
    };
    var rs = service.get($http.get(baseUrl), {
      resultsFactory: function(results) {
        _.each(results, function(item) {
          item.checked = true;
        });
      }
    }).instance;
    backend.expectGET(baseUrl).respond(expected);
    backend.flush();
    scope.$digest();
    expect(rs.results).toEqual([
      {id: 99, checked: true},
      {id: 100, checked: true},
      {id: 101, checked: true}
    ]);
  });

  it('should support resultsFactory func that replace results', function() {
    expected = {
      results: [{id: 99}, {id: 100}, {id: 101}]
    };
    var item = {id: 1};
    var rs = service.get($http.get(baseUrl), {
      resultsFactory: function(results) {
        return _.map(results, function() {
          return item;
        });
      }
    }).instance;
    backend.expectGET(baseUrl).respond(expected);
    backend.flush();
    scope.$digest();
    expect(rs.results).toEqual([item, item, item]);
  });

  it('should support an asynchronous resultsFactory', inject(function($q) {
    expected = {
      results: [{id: 99}, {id: 100}, {id: 101}]
    };
    var arr = [{id: 1}, {id: 2}, {id: 3}];
    var rs = service.get($http.get(baseUrl), {
      resultsFactory: function() {
        return $q.when(arr);
      }
    }).instance;
    backend.expectGET(baseUrl).respond(expected);
    backend.flush();
    scope.$digest();
    expect(rs.results).toEqual(arr);
  }));

  describe('toArray', function() {
    it('should return the results array', inject(function($q) {
      service.get($q.when({data: {
        results: [1, 2]
      }})).then(function(rs) {
        rs.toArray().then(function(arr) {
          expect(arr).toEqual([1, 2]);
        });
      });
      scope.$digest();
    }));

    it('should resolve only after the initial results', function() {
      var called = false;
      var results;
      var rs = service.get({data: {
        results: [1, 2]
      }}).instance;
      rs.toArray().then(function(arr) {
        called = true;
        results = arr;
      });
      expect(called).toBe(false);
      scope.$digest();
      scope.$digest();
      expect(called).toBe(true);
      expect(results).toEqual([1, 2]);
    });

    it('should work with pagination when called immediately', function() {
      backend.expectGET('http://example.com/').respond(200, {
        results: [1, 2],
        next: 'http://example.com/next'
      });
      backend.expectGET('http://example.com/next').respond(200, {
        results: [3, 4]
      });
      service.get($http.get('http://example.com/')).instance.toArray().then(assign);
      backend.flush();
      expect(actual).toEqual([1, 2, 3, 4]);
    });
  });
});
