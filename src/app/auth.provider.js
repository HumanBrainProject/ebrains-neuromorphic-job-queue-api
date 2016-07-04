/* eslint require-jsdoc:0 valid-jsdoc:0 */
angular.module('clb-app')
.provider('clbAuth', authProvider);

function authProvider(clbAppHello, clbEnvProvider) {
  return {
    $get: function($log, $q, $rootScope, $timeout, clbError) {
      addHbpProvider();
      loadApplicationInfo();
      bindEvents();

      return {
        login: login,
        logout: logout,
        getAuthInfo: getAuthInfo
      };

      function login(options) {
        $log.debug('Login attempt', options);
        var d = $q.defer();
        clbAppHello.login('hbp', options)
        .then(function(res) {
          d.resolve(getAuthInfo(res));
        }, function(err) {
          d.reject(formatError(err));
        });
        return d.promise;
      }

      function logout() {
        $log.debug('Logout attempt');
        var d = $q.defer();
        clbAppHello.logout('hbp')
        .then(function(res) {
          return d.resolve(res);
        }, function(err) {
          d.reject(formatError(err));
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

      function formatError(err) {
        return clbError.error({
          type: err.error.code,
          message: err.error.message,
          data: err
        });
      }

      function bindEvents() {
        clbAppHello.on('auth.login', handleAuthInfoChange);
        clbAppHello.on('auth.logout', handleAuthInfoChange);
      }

      function handleAuthInfoChange(data, name) {
        if (data.network !== 'hbp') {
          return;
        }
        console.log('Catched hello.js event', name);
        $timeout(function() {
          $rootScope.$broadcast('clbAuth.changed', getAuthInfo());
        }, 0);
      }
    }
  };

  // ------------------- //

  /**
   * Define a new provider Hello.js provider for HBP
   */
  function addHbpProvider() {
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
        }
      }
    });
  }

  /**
   * Set the current application data.
   */
  function loadApplicationInfo() {
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
