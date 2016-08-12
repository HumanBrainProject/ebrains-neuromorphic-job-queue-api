describe('clbAuth', function() {
  var service;
  var scope;

  beforeEach(module('clb-app'));
  beforeEach(inject(function($rootScope, clbAuth) {
    service = clbAuth;
    scope = $rootScope;
  }));

  describe('login()', function() {
    var hello;
    beforeEach(inject(function(clbAppHello, $q) {
      hello = clbAppHello;
      spyOn(hello, 'login')
      .and.returnValue($q.when({
        authResponse: {
          access_token: 'aaaa', // eslint-disable-line camelcase
          token_type: 'Bearer', // eslint-disable-line camelcase
          expires: 999.0,
          scope: ''
        },
        network: 'hbp'
      }));
    }));

    it('should call hello.js login function', function() {
      service.login();
      expect(hello.login).toHaveBeenCalledWith('hbp', undefined);
    });

    it('should fulfill to the authInfo', inject(function() {
      var authInfo;
      service.login().then(function(val) {
        authInfo = val;
      });
      scope.$apply();
      expect(authInfo).toEqual({
        accessToken: 'aaaa',
        tokenType: 'Bearer',
        expires: 999.0,
        scope: undefined
      });
    }));
  });

  describe('logout()', function() {
    var hello;
    beforeEach(inject(function($q, clbAppHello) {
      hello = clbAppHello;
      hello.utils.store('hbp', {
        token_type: 'Bearer', // eslint-disable-line camelcase
        access_token: 'aaaa', // eslint-disable-line camelcase
        expires: 999.0,
        scope: ''
      });
      spyOn(hello, 'logout').and.returnValue($q.when({network: 'hbp'}));
    }));

    it('should call the hello.js logout method', function() {
      service.logout();
      expect(hello.logout).toHaveBeenCalledWith('hbp', undefined);
    });

    it('should call the single logout method', inject(function(
      $httpBackend,
      clbEnv
    ) {
      $httpBackend.expectPOST(clbEnv.get('auth.url') + '/slo', {token: 'aaaa'});
      service.logout({force: true});
      expect(hello.logout).toHaveBeenCalledWith('hbp', {force: true});
    }));
  });
});
