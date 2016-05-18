(function() {

window.base_url = '';

angular.module('request-coordinator-app', ['ngResource', 'ui.bootstrap', 'hbpCommon'])
    .config(
        function($httpProvider, $stateProvider, $locationProvider, $rootScopeProvider, $resourceProvider) {
            $resourceProvider.defaults.stripTrailingSlashes = false;
            // Routing
            $stateProvider
                .state('request_list',
                       {
                            url: '/requests',
                            templateUrl: 'static/list.tpl.html',
                            controller: 'RequestListController'
                       })
                .state('request_detail',
                       {
                            url: '/requests/:eId',
                            templateUrl: 'static/detail.tpl.html',
                            controller: 'RequestDetailController'
                       })
        }
    )
    .factory('User', function($resource) {
        return $resource('https://services.humanbrainproject.eu/idm/v1/api/user/:id',
                         { id:'@id' });
    })
    .factory('Projects', function($resource) {
        return $resource(window.base_url + '/projects/:id',
                         {id: '@context'},
                         {update: {method: 'PUT', params: {id: '@context'}}});
    })
    .factory('Quotas', function($resource) {
        return $resource(window.base_url + '/projects/:projectId/quotas/:id',
                         {id: '@id', projectId: '@projectId'});
    })
    .controller('RequestListController', function($scope, Projects, User) {
        $scope.access_requests = {'accepted': [], 'rejected': [],
                                  'in preparation': [], 'under review': []};
        $scope.selectedTab = "under review";
        $scope.setTab = function(tab) {
            $scope.css = {'accepted': "btn btn-default", 'rejected': "btn btn-default",
                          'in preparation': "btn btn-default", 'under review': "btn btn-default"};
            $scope.css[tab] = "btn btn-primary";
            $scope.selectedTab = tab;
        };
        $scope.setTab($scope.selectedTab);
        Projects.query({},
                       function(projects, responseHeaders) {
                           projects.forEach(
                               function(project) {
                                   project.owner = User.get({id:project.owner});
                                   $scope.access_requests[project.status].push(project);
                               }
                           );
                           $scope.projects = projects;
                       },
                       function(httpResponse) {
                           console.log("Something went wrong in the RequestListController")
                       }
        );
    })
    .controller('RequestDetailController', function($scope, $stateParams, Projects, Quotas, User) {
        Projects.get({id: $stateParams.eId},
                     function(project, responseHeaders) {
                         $scope.project = project;
                         User.get(
                             {id:project.owner},
                             function(user, responseHeaders){
                                 var primaryEmail = user.emails.filter(function(entry) {
                                                                           return entry.primary;
                                                                       })[0].value;
                                 user.primaryEmail = primaryEmail;
                                 $scope.project.owner = user;
                                 });
                         $scope.new_quota = {
                             "project": $scope.project.context,
                             "limit": 0,
                             "usage": 0,
                             "units": "core-hours",
                             "platform": "SpiNNaker",
                         };
                         $scope.accept = function() {
                             console.log("Accepted");
                             project["status"] = "accepted";
                             project.$update();
                         };
                         $scope.reject = function() {
                             console.log("Rejected");
                             project["status"] = "rejected";
                             project.$update();
                         };
                         $scope.addQuota = function() {
                             console.log("Adding quota", $scope.new_quota);
                             Quotas.save({projectId: $scope.project.context},
                                         $scope.new_quota,
                                         function(saved_quota, responseHeaders) {
                                             // success callback
                                             $scope.project.quotas.push(saved_quota);
                                             $scope.new_quota = {
                                                 "project": $scope.project.context,
                                                 "limit": 0,
                                                 "usage": 0,
                                                 "units": "core-hours",
                                                 "platform": "SpiNNaker", // would be nice to change this to the opposite of the platform used in saved_quota
                                             }
                                         },
                                         function(httpResponse) {
                                             console.log("Couldn't save quota")
                                         }
                             );
                         };
                         $scope.getUnits = function(quota) {
                             quota.units = {"BrainScaleS": "wafer-hours", "SpiNNaker": "core-hours",
                                            "BrainScaleS-ESS": "core-hours", "Spikey": "hours"}[quota.platform];
                             return quota.units
                         }
                     },
                     function(httpResponse) {
                         console.log("Something went wrong in the RequestDetailController")
                     }
        );
    })

 // Bootstrap function
 angular.bootstrap().invoke(function($http, $log) {
   $http.get('/config.json').then(function(res) {
     window.bbpConfig = res.data;
     angular.element(document).ready(function() {
       angular.bootstrap(document, ['request-coordinator-app']);
       $log.info('Booted access request coordinator application');
     });
   }, function() {
     $log.error('Cannot boot access request application');
     window.location.href = '/login/hbp/?next=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
   });
 });

}());
