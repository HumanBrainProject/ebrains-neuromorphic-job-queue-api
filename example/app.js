/* global window */

// Those configurations should be generated during you app deployment.
// Remember they can be served as well by a file on your server.
window.bbpConfig = {
  auth: {
    clientId: 'portal-client',
    url: 'https://services-dev.humanbrainproject.eu/oidc'
  },
  api: {
    collab: {
      v0: 'https://services-dev.humanbrainproject.eu/collab/v0'
    },
    document: {
      v0: 'https://services-dev.humanbrainproject.eu/document/v0/api'
    },
    user: {
      v1: 'https://services-dev.humanbrainproject.eu/idm/v1/api',
      v0: 'https://services-dev.humanbrainproject.eu/oidc/v0/api'
    }
  }
};

angular.module('customCollabApp', [
  'hbpCollaboratory',
  'hbpCollaboratoryAppToolkit'
])
.controller('MainController', function(
  $log,
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
    hbpCollaboratoryAutomator.task(data).run()
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
        title: 'My Collab Name',
        content: 'My Collab Description',
        private: true, // Please remember that only HBP Member can create private collabs
        nav: [{
          name: 'Example Code',
          app: 'Jupyter Notebook'
        }, {
          name: 'Introduction',
          app: 'Rich Text Editor'
        }]
      }
    }, true);
  }
});
