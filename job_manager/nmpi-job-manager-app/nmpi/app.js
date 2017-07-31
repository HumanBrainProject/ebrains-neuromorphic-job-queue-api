(function() {

  window.base_url = '';
  window.ver_api = '/api/v2/';

  angular.module( 'nmpi', [ 
    'hbpCommon',
    'bbpOidcClient',
    'ui.router',
    'ng',
    'ngResource',
    'hbpCollaboratory',
    'clb-error',
    'clb-ui-error',
    'clb-env',
    'clb-app',
    'ui.codemirror',
    'ngTagsInput'
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
      .state('job_resubmit', {
        url: '/queue/createfrom/:eId?ctx='+$rootScopeProvider.ctx,
        templateUrl: 'static/nmpi/queue/resubmit.tpl.html', 
        controller: 'ReSubmitJob'
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
  .run(function($rootScope, $location, $state) {
        $rootScope.$on('$stateChangeStart', function(e, toState, toParams, fromState, fromParams) {
            if( $location.search().ctx ) {
                $rootScope.ctx = $location.search().ctx;
                $rootScope.with_ctx = true;
            }
            var contextState = $location.search().ctxstate;
            if (contextState && contextState.startsWith('job')) {
                var job_id = contextState.slice(4);
                // don't redirect if we're already heading to the correct state
                if (toState.name === 'job_detail' && toParams.eId == job_id) {
                    return;
                }

                e.preventDefault();
                $state.go('job_detail', { eId: job_id });
            }
        });
  })
  .directive('jsonText', function() {
      return {
          restrict: 'A',
          require: 'ngModel',
          link: function(scope, element, attr, ngModel) {
              function into(input) {
                  if (input.length > 0) {
                      try {
                          return JSON.parse(input);
                      } catch(e) {
                          return false;  // JSON is invalid
                      }
                  } else {  // empty textarea implies an empty object
                     return {};
                  }
              }
              function out(data) {
                  // ensure to pass valid object
                  data = data || {};
                  if (Object.getOwnPropertyNames(data).length > 0) {  // non-empty
                      return JSON.stringify(data, undefined, 2);
                  } else {  // empty object
                      return "";
                  }
              }
              ngModel.$parsers.push(into);
              ngModel.$formatters.push(out);
          }
      };
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
