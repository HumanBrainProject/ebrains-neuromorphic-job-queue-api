describe('clbResourceLocator service', function() {
  var service;
  var provider;
  var scope;
  var actual;

  var assign = function(result) {
    actual = result;
  };

  beforeEach(module('clb-stream', function(clbResourceLocatorProvider) {
    provider = clbResourceLocatorProvider;
  }));

  beforeEach(inject(function(
    clbResourceLocator,
    $rootScope
  ) {
    service = clbResourceLocator;
    scope = $rootScope;
  }));

  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
    actual = undefined;
  }));

  describe('urlFor(ref)', function() {
    it('reject the promise if there is no handler', function() {
      service.urlFor({type: 'unknow', id: 1}).catch(assign);
      scope.$digest();
      expect(actual).toBeHbpError();
      expect(actual.type).toBe('ObjectTypeException');
      expect(actual.message).toBe('Unkown object type <unknow>');
    });

    it('reject the promise if there is no reference', function() {
      service.urlFor().catch(assign);
      scope.$digest();
      expect(actual).toBeHbpError();
      expect(actual.type).toBe('AttributeError');
      expect(actual.message).toBe('Invalid object reference <undefined>');
    });

    it('return the URL from the first valid handler', function() {
      provider.registerUrlHandler(function() {
        return;
      });
      provider.registerUrlHandler(function() {
        return 'http://test.com';
      });
      provider.registerUrlHandler(function() {
        return 'http://toolate.com';
      });
      service.urlFor({type: 'test', id: 1}).then(assign);
      scope.$digest();
      expect(actual).toBe('http://test.com');
    });
  });

  describe('registerUrlHandler()', function() {
    beforeEach(function() {
      provider.urlHandlers.length = 0;
    });
    it('can register a new handler function', function() {
      var handler = function() {
        return 'http://verystatichandler.com/';
      };

      provider.registerUrlHandler(handler);
      expect(provider.urlHandlers).toEqual([handler]);
    });
  });
});
