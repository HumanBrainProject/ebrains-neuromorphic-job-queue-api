/* global window */
var globalConfig = {
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
    },
    document: {
      v0: 'http://document/v0'
    },
    richtext: {
      v0: 'http://richtext/v0'
    }
  }
};

window.bbpConfig = angular.copy(globalConfig);

beforeEach(function() {
  window.bbpConfig = angular.copy(globalConfig);

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
    },
    toBeHbpError: function() {
      return {
        compare: function(actual) {
          var result = angular.isDefined(actual.type);
          result = result && angular.isDefined(actual.code);
          result = result && angular.isDefined(actual.message);
          return {pass: result};
        }
      };
    }
  });
});
