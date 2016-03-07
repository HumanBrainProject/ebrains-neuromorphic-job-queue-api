/* global window */
beforeEach(function() {
  window.bbpConfig = {
    auth: {
      clientId: 'aaa-001',
      url: 'http://test-auth.test'
    },
    api: {
      user: {
        v0: 'http://user/v0',
        v1: 'http://user/v1'
      },
      collab: {
        v0: 'http://collab/v0'
      }
    }
  };

  jasmine.addMatchers({
    toDefine: function() {
      return {
        compare: function(actual, properties) {
          var props = angular.isArray(properties) ? properties : [properties];
          var result = true;
          angular.forEach(props, function(p) {
            result = result && angular.isDefined(actual[p]);
          });
          return {pass: result};
        }
      };
    }
  });
});
