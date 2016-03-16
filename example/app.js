/* global window */

// Those configurations should be generated during your app deployment.
// Remember they can be served as well by a file on your server.
window.bbpConfig = {
  auth: {
    clientId: 'portal-client',
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
};

angular.module('customCollabApp', [
  'ui.codemirror',
  'hbpCollaboratory',
  'hbpCollaboratoryAppToolkit'
])
.controller('MainController', function(
  $log,
  $filter,
  hbpCollaboratoryAutomator,
  hbpCollaboratoryAppToolkit
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
    hbpCollaboratoryAutomator.run(data)
    .then(function(collab) {
      $log.info('Created Collab', collab);
      hbpCollaboratoryAppToolkit.emit('collab.open', collab);
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
