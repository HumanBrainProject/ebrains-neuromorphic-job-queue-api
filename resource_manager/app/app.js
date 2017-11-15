(function() {

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