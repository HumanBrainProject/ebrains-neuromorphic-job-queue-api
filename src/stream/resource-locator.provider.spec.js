describe('clbResourceLocator service', function() {
  var service;
  var provider;
  var scope;
  var actual;

  var assign = function(result) {
    actual = result;
  };

  beforeEach(function() {
    angular.module('locService', [])
    .factory('myLocService', function() {
      return function() {
        return 'http://handler-service.com/';
      };
    });
    angular.mock.module('locService');
  });

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
    provider.urlHandlers.length = 0;
  }));

  describe('urlFor(ref, activity)', function() {
    it('get the reference and the activity', function() {
      var ref = {type: 't', id: 'i'};
      var activity = {};
      var handler = jasmine.createSpy('urlFor');
      provider.registerUrlHandler(handler);
      service.urlFor(ref, activity);
      scope.$digest();
      expect(handler).toHaveBeenCalledWith(ref, activity);
    });

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

    describe('using angular service', function() {
      beforeEach(function() {
        provider.registerUrlHandler('myLocService');
      });

      it('can register a new handler service', function() {
        expect(provider.urlHandlers).toEqual(['myLocService']);
      });

      it('should resolve service', function() {
        service.urlFor({type: 'HBPType', id: '1'})
        .then(assign)
        .catch(function(err) {
          fail('Raised an error ' + err);
        });
        scope.$digest();
        expect(actual).toBe('http://handler-service.com/');
      });
    });
  });
});
