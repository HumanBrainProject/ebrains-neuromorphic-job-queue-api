/* eslint require-jsdoc:0 valid-jsdoc:0 */
angular.module('clb-app')
.provider('clbAuth', authProvider);

function authProvider(clbAppHello, clbEnvProvider) {
  return {
    $get: function($http, $log, $q, $rootScope, $timeout, clbEnv, clbError) {
      _addHbpProvider();
      _loadApplicationInfo();
      _bindEvents();
      var _readEnvOnce = false;

      return {
        login: login,
        logout: logout,
        getAuthInfo: getAuthInfo
      };

      function login(options) {
        var d = $q.defer();
        if (!_readEnvOnce) {
          _readEnvOnce = true;
          var envToken = _readTokenFromEnv();
          if (envToken) {
            // The token delivered by the backend is considered valid.
            var authInfo = getAuthInfo(envToken);
            d.resolve(authInfo);
            $rootScope.$broadcast('clbAuth.changed', authInfo);
            return d.promise;
          }
        }
        clbAppHello.login('hbp', options)
        .then(function(res) {
          d.resolve(getAuthInfo(res.authResponse));
        }, function(err) {
          d.reject(_formatError(err));
        });
        return d.promise;
      }

      function logout(options) {
        var info = getAuthInfo();
        if (!info) {
          return $q.when(true);
        }
        var d = $q.defer();
        clbAppHello.logout('hbp', options)
        .then(function() {
          return d.resolve(true);
        }, function(err) {
          d.reject(_formatError(err));
        });
        return d.promise;
      }

      function getAuthInfo(authResponse) {
        authResponse = authResponse || clbAppHello.getAuthResponse('hbp');
        if (!authResponse) {
          return null;
        }
        return {
          accessToken: authResponse.access_token,
          tokenType: authResponse.token_type,
          // When no scopes are specified, the server will generate a token
          // with the app default scopes. In this case hello.js don't know what
          // they are so we set the value to undefined by convention.
          scope: authResponse.scope || undefined,
          expires: authResponse.expires
        };
      }

      function _readTokenFromEnv() {
        var authInfo = clbEnv.get('auth.token', false);
        if (!authInfo) {
          return;
        }
        var now = (new Date()).getTime() / 1e3;
        if (!authInfo.expires && authInfo.expires_in) {
          authInfo.expires = (now) + authInfo.expires_in;
        }
        if (!authInfo.expires || now < authInfo.expires) {
          clbAppHello.utils.store('hbp', authInfo);
          return authInfo;
        }
      }

      function _formatError(err) {
        return clbError.error({
          type: err.error.code,
          message: err.error.message,
          data: err
        });
      }

      function _bindEvents() {
        clbAppHello.on('auth.login', _handleAuthInfoChange);
        clbAppHello.on('auth.logout', _handleAuthInfoChange);
      }

      function _handleAuthInfoChange(data, name) {
        if (data.network !== 'hbp') {
          return;
        }
        $log.debug('propagate auth event from original event', name);
        $timeout(function() {
          $rootScope.$broadcast('clbAuth.changed', getAuthInfo());
        }, 0);
      }

      /**
       * Define a new provider Hello.js provider for HBP
       */
      function _addHbpProvider() {
        clbAppHello.init({
          hbp: {
            name: 'Human Brain Project',
            oauth: {
              version: '2',
              auth: clbEnvProvider.get('auth.url') + '/authorize',
              grant: clbEnvProvider.get('auth.url') + '/token'
            },
            // API base URL
            base: clbEnvProvider.get('auth.url') + '/',
            scope_delim: ' ', // eslint-disable-line camelcase
            login: function(p) {
              // Reauthenticate
              if (p.options.force) {
                p.qs.prompt = 'login';
              }
              if (!p.qs.scope) {
                delete p.qs.scope;
              }
            },
            logout: function(callback, p) {
              $http.post(clbEnv.get('auth.url') + '/slo', {
                token: p.authResponse.access_token
              }, {
                withCredentials: true
              })
              .then(function() {
                callback();
              })
              .catch(function(err) {
                $log.error('Cannot kill the global session');
                $log.debug(err);
                callback();
              });
            }
          }
        });
      }

      /**
       * Set the current application data.
       */
      function _loadApplicationInfo() {
        clbAppHello.init({
          hbp: clbEnvProvider.get('auth.clientId')
        }, {
          default_service: 'hbp', // eslint-disable-line camelcase
          display: 'page',
          scope: clbEnvProvider.get('auth.scopes', null),
          force: false
        });
      }
    }
  };
}
