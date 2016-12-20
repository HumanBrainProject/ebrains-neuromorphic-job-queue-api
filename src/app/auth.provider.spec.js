/* global window */

describe('clbAuth', function() {
  var service;
  var scope;

  beforeEach(module('clb-app'));
  beforeEach(inject(function($rootScope, clbAuth) {
    service = clbAuth;
    scope = $rootScope;
  }));

  afterEach(inject(function(clbAppHello) {
    clbAppHello.utils.store('hbp', null);
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
          expires: Number.MAX_SAFE_INTEGER,
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
        expires: Number.MAX_SAFE_INTEGER,
        scope: undefined
      });
    }));

    it('can login twice', function() {
      var authInfo;
      service.login();
      scope.$apply();
      service.login().then(function(val) {
        authInfo = val;
      });
      hello.login.and.callThrough();
      scope.$apply();
      expect(authInfo).toEqual({
        accessToken: 'aaaa',
        tokenType: 'Bearer',
        expires: Number.MAX_SAFE_INTEGER,
        scope: undefined
      });
    });
  });

  describe('logout()', function() {
    var hello;
    beforeEach(inject(function($q, clbAppHello) {
      hello = clbAppHello;
      hello.utils.store('hbp', {
        token_type: 'Bearer', // eslint-disable-line camelcase
        access_token: 'aaaa', // eslint-disable-line camelcase
        expires: Number.MAX_SAFE_INTEGER,
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

describe('clbAuth with token from backend', function() {
  var service;
  var token;
  var scope;

  beforeEach(function() {
    token = {
      access_token: 'bbbb',  // eslint-disable-line camelcase
      token_type: 'TOKTYPE', // eslint-disable-line camelcase
      expires_in: 1          // eslint-disable-line camelcase
    };
    window.bbpConfig.auth.token = token;
  });

  beforeEach(module('clb-app'));
  beforeEach(inject(function($rootScope, clbAuth) {
    service = clbAuth;
    scope = $rootScope;
  }));

  afterEach(inject(function(clbAppHello) {
    clbAppHello.utils.store('hbp', null);
  }));

  it('load the token provied in auth.token', inject(function(clbAppHello) {
    spyOn(clbAppHello, 'login').and.callThrough();
    var authInfo;
    service.login().then(function(auth) {
      authInfo = auth;
    });
    scope.$apply();
    expect(authInfo).toBeDefined();
    expect(authInfo.accessToken).toBe(token.access_token);
    expect(authInfo.tokenType).toBe(token.token_type);
    expect(authInfo.scope).toBeUndefined();
  }));

  it('compute expires from expires_in', function() {
    var authInfo;
    service.login().then(function(auth) {
      authInfo = auth;
    });
    scope.$apply();
    expect(authInfo.expires > (new Date()).getTime() / 1e3).toBe(true);
    expect(authInfo.expires < ((new Date()).getTime() / 1e3) + 4).toBe(true);
  });

  it('dont trigger login', inject(function(clbAppHello) {
    spyOn(clbAppHello, 'login').and.callThrough();
    service.login().then(function(authInfo) {
      expect(authInfo.accessToken).toBe(token.access_token);
    });
    expect(clbAppHello.login).not.toHaveBeenCalled();
  }));

  it('has no token before a login attempt', function() {
    expect(service.getAuthInfo()).toBe(null);
  });

  it('trigger login if token expired', inject(function($q, clbAppHello) {
    token.expires = ((new Date()).getTime() / 1e3) - 1;
    spyOn(clbAppHello, 'login').and.returnValue($q.when(token));
    service.login();
    scope.$apply();
    expect(clbAppHello.login).toHaveBeenCalled();
  }));

  it('trigger the clbAuth.changed event', function() {
    var auth;
    scope.$on('clbAuth.changed', function(event, data) {
      auth = data;
    });
    service.login();
    scope.$apply();
    expect(auth.accessToken).toBe(token.access_token);
  });

  it('should look for backend token only once', function(done) {
    inject(function(clbEnv) {
      var loc = window.location;
      var info;
      spyOn(clbEnv, 'get').and.callThrough();
      service.login()
      .then(function(data) {
        info = data;
      });
      scope.$apply();
      expect(clbEnv.get).toHaveBeenCalledWith('auth.token', false);
      expect(info.accessToken).toBe(token.access_token);
      info = undefined;

      // Had to do a lot of crap to deal with the still async hellojs code
      // and the angular synchronous code...
      clbEnv.get.calls.reset();
      service.login().then(function(data) {
        info = data;
      })
      .catch(function(err) {
        expect(false).toBe(true, err);
      });
      // Artificially wait for the hellojs async code to fulfill.
      // It must be quick as the result is stored locally.
      window.setTimeout(function() {
        scope.$apply();
        expect(window.location).toBe(loc);
        expect(info).toBeDefined();
        expect(clbEnv.get).not.toHaveBeenCalled();
        done();
      }, 0, false);
    });
  });
});
