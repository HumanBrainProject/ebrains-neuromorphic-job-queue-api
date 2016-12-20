(function() {

window.base_url = '';

angular.module('request-app', ['ngResource', 'ui.bootstrap', 'hbpCommon'],
               function($locationProvider) {
                   $locationProvider.html5Mode(true);
               })
    .config(function($resourceProvider) {
        $resourceProvider.defaults.stripTrailingSlashes = false;
    })
    .factory('Projects', function ($resource) {
                 return $resource(window.base_url + '/projects/:id',
                                  {id: '@id'},
                                  {update: {method: 'PUT', params: {id: '@id'}}});
    })
    .factory('Quotas', function ($resource) {
                 return $resource(window.base_url + '/projects/:projectId/quotas/:id',
                                  {id: '@id', project_id: '@projectId'});
    })
    .controller('HelloCtrl', function ($scope) {
        $scope.thing = {
            name: 'World'
        };
    })
    .controller('ViewProjectCtrl', function($scope, $location, Projects, hbpIdentityUserDirectory, hbpCollabStore) {
        var context = $location.search()['ctx'];
        hbpIdentityUserDirectory.getCurrentUser().then(function (profile) {
            $scope.current_user = profile;
        });
        hbpCollabStore.context.get(context).then(function (contextObj) {
            $scope.contextObj = contextObj;
        });
        Projects.get({id: context},
                     function(project, responseHeaders) {
                         // project proposal exists
                         $scope.project = project;
                         $scope.haveProject = true;
                         switch (project.status) {
                            case "in preparation":
                                $scope.partial = 'static/templates/inpreparation.tpl.html';
                                break;
                            case "accepted":
                                $scope.partial = 'static/templates/accepted.tpl.html';
                                break;
                            case "under review":
                                $scope.partial = 'static/templates/underreview.tpl.html';
                                break;
                            case "rejected":
                                $scope.partial = 'static/templates/rejected.tpl.html';
                                break;
                            default:
                                $scope.partial = 'static/templates/error.tpl.html';
                         }
                     },
                     function(httpResponse) {
                         // project proposal does not exist, or error
                         $scope.project = null;
                         $scope.haveProject = false;
                         $scope.partial = 'static/templates/intro.tpl.html';
                     }
        );
    })
    .controller('EditProjectCtrl', function($scope, $location, $timeout, Projects, hbpIdentityUserDirectory, hbpCollabStore) {
        var ctx = $location.search()['ctx'];
        $scope.saved = false;
        var updateScope = function(project, responseHeaders) {
            // success callback
            $scope.createMode = false;
            if ($scope.project.submitted) {
                $scope.status = 'submitted';
            }
            $scope.saved = true;
            $timeout(function(){
                $scope.saved = false;
            }, 5000);
        };
        var createOrUpdateProject = function() {
            if ($scope.createMode) {
                $scope.project = Projects.save($scope.project, updateScope);
            } else {
                Projects.update({id: ctx}, $scope.project, updateScope);
            }
        };
        Projects.get({id: ctx},
                     function(project, responseHeaders) {
                         // project proposal exists
                         $scope.parentUrl = window.parent.location;
                         $scope.project = project;
                         $scope.createMode = false;
                         $scope.status = project.status;
                         // todo: only define these functions if the project has not been submitted
                         $scope.save_changes = createOrUpdateProject;
                         $scope.submit_proposal = function() {
                             $scope.project.submitted = true;
                             createOrUpdateProject();
                         };
                     },
                     function(httpResponse) {
                         // project proposal does not exist, or error
                         $scope.createMode = true;
                         $scope.project = {
                            'context': ctx,
                            'submitted': false
                         };
                         $scope.status = 'in preparation';
                         hbpIdentityUserDirectory.getCurrentUser().then(function (profile) {
                            $scope.project.owner = profile.id;
                         });
                         hbpCollabStore.context.get(ctx).then(function (context) {
                            $scope.project.collab = context.collab.id;
                         });
                         $scope.save_changes = createOrUpdateProject;
                         $scope.submit_proposal = function() {
                             $scope.project.submitted = true;
                             createOrUpdateProject();
                         };
                     }
        );
    })

// Bootstrap function
angular.bootstrap().invoke(function($http, $log) {
  $http.get('/config.json').then(function(res) {
    window.bbpConfig = res.data;
    angular.element(document).ready(function() {
      angular.bootstrap(document, ['request-app']);
    });
  }, function() {
    $log.error('Cannot boot request-app application');
    window.location.href = '/login/hbp/?next=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  });
});

}());