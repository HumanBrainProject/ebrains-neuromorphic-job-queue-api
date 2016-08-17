/* eslint camelcase: 0 */
angular.module('customCollabApp', [
  'ui.codemirror',
  'clb-ui-error',
  'clb-env',
  'clb-app',
  'hbpCollaboratory'
])
.controller('UiAuthController', function($scope, clbAuth) {
  var vm = this;
  vm.authInfo = clbAuth.getAuthInfo();
  var unbind = $scope.$on('clbAuth.changed', function(event, authInfo) {
    console.log('New AuthInfo', authInfo);
    vm.authInfo = authInfo;
  });
  $scope.$on('$destroy', unbind);
  vm.login = function() {
    clbAuth.login().then(function(info) {
      console.log('after login', info);
    }, function(err) {
      console.log('error while login', err);
    });
  };

  vm.forceLogin = function() {
    clbAuth.login({force: true}).then(function(info) {
      console.log('after force login', info.authResponse);
    }, function(err) {
      console.log('error while login', err);
    });
  };

  vm.logout = function() {
    clbAuth.logout().then(function(info) {
      console.log('logged out', info);
    });
  };

  vm.forceLogout = function() {
    clbAuth.logout({force: true}).then(function(info) {
      console.log('logged out and killed session', info);
    });
  };
})
.controller('UiIdentityController', function($scope, clbUser) {
  var vm = this;
  $scope.$on('clbAuth.changed', function(event, authInfo) {
    if (authInfo) {
      clbUser.getCurrentUser().then(function(me) {
        vm.user = me;
      });
    } else {
      vm.user = null;
    }
  });
})
.controller('CollabConfigurationController', function(
  $log,
  $filter,
  clbAutomator,
  clbApp
) {
  var vm = this;
  vm.configJson = '';
  vm.handleSubmit = handleSubmit;

  return activate();
  /**
   * Create the collab given form content.
   * @param  {Event} event DOM Event
   */
  function handleSubmit(event) {
    event.preventDefault();
    var data = angular.fromJson(vm.configJson);
    clbAutomator.run(data)
    .then(function(collab) {
      $log.info('Created Collab', collab);
      clbApp.emit('collab.open', collab);
    })
    .catch(function(err) {
      $log.error('Cannot Create Collab', err);
      vm.error = err;
    });
  }

  /**
   * @private
   * init script
   */
  function activate() {
    vm.configJson = angular.toJson({
      collab: {
        title: 'Test Collab Creator ' + $filter('date')(new Date(), 'medium'),
        content: 'My Collab Description',
        private: true, // Please remember that only HBP Member can create private collabs
        after: [{
          storage: {
            entities: {
              'sample.ipynb': '155c1bcc-ee9c-43e2-8190-50c66befa1fa'
            },
            after: {
              nav: {
                name: 'Example Code',
                app: 'Jupyter Notebook',
                entity: 'sample.ipynb'
              }
            }
          }
        }, {
          nav: {
            name: 'Empty Notebook',
            app: 'Jupyter Notebook'
          }
        }, {
          nav: {
            name: 'Introduction',
            app: 'Rich Text Editor'
          }
        }]
      }
    }, true);
  }
});

// You can find a complete configuration file at:
// https://collab.humanbrainproject.eu/config.json
// Try to use its live representation to benefit
// from automatic configuration update.
angular.clbBootstrap('customCollabApp', {env: {
  auth: {
    clientId: '2cb12cf8-abc5-4d07-9c67-b5f8b3efe12f',
    url: 'https://services.humanbrainproject.eu/oidc'
  },
  api: {
    collab: {
      v0: 'https://services.humanbrainproject.eu/collab/v0'
    },
    document: {
      v0: 'https://services.humanbrainproject.eu/document/v0/api'
    },
    user: {
      v1: 'https://services.humanbrainproject.eu/idm/v1/api',
      v0: 'https://services.humanbrainproject.eu/oidc/v0/api'
    },
    richtext: {
      v0: 'https://services.humanbrainproject.eu/richtxt-app/api'
    }
  }
}});
