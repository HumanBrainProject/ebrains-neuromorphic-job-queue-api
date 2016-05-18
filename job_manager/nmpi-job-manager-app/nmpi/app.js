(function() {

  window.base_url = '';
  window.ver_api = '/api/v2/';

  angular.module( 'nmpi', [ 
    'hbpCommon',
    'bbpOidcClient',
    'ui.router',
    'ng',
    'ngResource'
  ])

  .config(
    function ( $httpProvider, $stateProvider, $locationProvider, $rootScopeProvider, $resourceProvider ) 
    {
      $resourceProvider.defaults.stripTrailingSlashes = false;
      // Routing
      $stateProvider
      .state('job_list', {
        url: '/queue',
        templateUrl: 'static/nmpi/queue/list.tpl.html',   
        controller: 'ListQueue'
      })
      .state('job_create', {
        url: '/queue/create',
        templateUrl: 'static/nmpi/queue/create.tpl.html', 
        controller: 'AddJob'
      })
      .state('job_detail', {
        url: '/queue/:eId',
        templateUrl: 'static/nmpi/queue/detail.tpl.html', 
        controller: 'DetailQueue'
      })
    }
  )
  .filter('extractInitialComment', function() {
        return function(str, truncateAt) {
            var re = /\w+/;
            var output;
            truncateAt = typeof truncateAt !== 'undefined' ? truncateAt : 100;

            var encoding_pos = str.indexOf('coding: utf-8');
            if (encoding_pos != -1) {
                str = str.substring(encoding_pos + 13);
            }

            var match_pos = str.search(re);
            if (match_pos != -1) {
                output = str.substring(match_pos, match_pos + truncateAt);
            } else {
                output = str;
            }
            return output;
        }
  })


 // Bootstrap function
 angular.bootstrap().invoke(function($http, $log) {
   $http.get('/config.json').then(function(res) {
     window.bbpConfig = res.data;
     angular.element(document).ready(function() {
       angular.bootstrap(document, ['nmpi']);
       $log.info('Booted nmpi application');
     });
   }, function() {
     $log.error('Cannot boot nmpi application');
     window.location.href = '/login/hbp/?next=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
   });
 });

}());
