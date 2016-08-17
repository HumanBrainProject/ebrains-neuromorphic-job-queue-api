describe('clbAuthHttp', function() {
  var spyHttp;
  var authHttp;
  var setToken;

  angular.module('mockHttp', [])
  .provider('$http', function() {
    spyHttp = jasmine.createSpy('$http');
    spyHttp.GET = jasmine.createSpy('$http.GET');
    return {
      $get: function() {
        return spyHttp;
      }
    };
  });

  beforeEach(angular.mock.module('clb-app'));
  beforeEach(angular.mock.module('mockHttp'));

  beforeEach(inject(function(clbAuthHttp, clbAppHello) {
    setToken = function(token) {
      if (token) {
        clbAppHello.utils.store('hbp', {
          access_token: token, // eslint-disable-line camelcase
          token_type: 'Bearer', // eslint-disable-line camelcase
          expires: Number.MAX_SAFE_INTEGER
        });
      } else {
        clbAppHello.utils.store('hbp', null);
      }
    };
    authHttp = clbAuthHttp;
  }));

  afterEach(inject(function(clbAppHello) {
    clbAppHello.utils.store('hbp', null);
  }));

  describe('clbAuthHttp(config)', function() {
    describe('when authenticated', function() {
      beforeEach(function() {
        setToken('aaaa');
      });

      it('should add the header option', function() {
        authHttp({method: 'GET', url: 'https://test.com'});
        expect(spyHttp).toHaveBeenCalledWith({
          method: 'GET',
          url: 'https://test.com',
          headers: {
            Authorization: 'Bearer aaaa'
          }
        });
      });

      it('should add the authorization header', function() {
        authHttp({method: 'GET', url: 'https://test.com', headers: {ContentType: 'text/plain'}});
        expect(spyHttp).toHaveBeenCalledWith({
          method: 'GET',
          url: 'https://test.com',
          headers: {
            ContentType: 'text/plain',
            Authorization: 'Bearer aaaa'
          }
        });
      });
    });

    describe('when not authenticated', function() {
      beforeEach(function() {
        setToken(null);
      });

      it('should add the header option', function() {
        var config = {method: 'GET', url: 'https://test.com'};
        authHttp(angular.extend({}, config));
        expect(spyHttp).toHaveBeenCalledWith(config);
      });

      it('should add the authorization header', function() {
        var config = {
          method: 'GET',
          url: 'https://test.com',
          headers: {ContentType: 'text/plain'}
        };
        authHttp(angular.extend({}, config));
        expect(spyHttp).toHaveBeenCalledWith(config);
      });
    });
  });

  describe('get, head, delete', function() {
    angular.forEach(['get', 'head', 'delete'], function(verb) {
      it('should call clbAuthHttp()', function() {
        setToken('aaaa');
        authHttp[verb]('https://test/com');
        expect(spyHttp).toHaveBeenCalledWith({
          url: 'https://test/com',
          method: verb.toUpperCase(),
          headers: {
            Authorization: 'Bearer aaaa'
          }
        });
      });

      it('should call clbAuthHttp() without credentials', function() {
        authHttp[verb]('https://test/com');
        expect(spyHttp).toHaveBeenCalledWith({
          url: 'https://test/com',
          method: verb.toUpperCase()
        });
      });
    });

    angular.forEach(['post', 'patch', 'put'], function(verb) {
      it('should call clbAuthHttp()', function() {
        setToken('aaaa');
        authHttp[verb]('https://test/com', {a: 1});
        expect(spyHttp).toHaveBeenCalledWith({
          url: 'https://test/com',
          method: verb.toUpperCase(),
          data: {a: 1},
          headers: {
            Authorization: 'Bearer aaaa'
          }
        });
      });

      it('should preserve the headers', function() {
        setToken('aaaa');
        authHttp[verb]('https://test/com', {a: 1}, {
          headers: {ContentType: 'text/plain'}
        });
        expect(spyHttp).toHaveBeenCalledWith({
          url: 'https://test/com',
          method: verb.toUpperCase(),
          data: {a: 1},
          headers: {
            ContentType: 'text/plain',
            Authorization: 'Bearer aaaa'
          }
        });
      });
    });
  });
});
