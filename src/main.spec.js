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
    },
    stream: {
      v0: 'http://stream/v0'
    }
  }
};

window.bbpConfig = angular.copy(globalConfig);

beforeEach(function() {
  window.bbpConfig = angular.copy(globalConfig);
  var checkToDefine = function(actual, properties) {
    var props = angular.isArray(properties) ? properties : [properties];
    var result = true;
    angular.forEach(props, function(p) {
      result = result && angular.isDefined(actual[p]);
    });
    return result;
  };

  jasmine.addMatchers({
    toBeAPromise: function() {
      return {
        compare: function(actual) {
          var result = checkToDefine(actual, ['then', 'catch']);
          return {pass: result};
        }
      };
    },
    toDefine: function() {
      return {
        compare: function(actual, properties) {
          var result = checkToDefine(actual, properties);
          return {pass: result};
        }
      };
    },
    toBeAPaginatedResultSet: function() {
      return {
        compare: function(actual) {
          var result = angular.isDefined(actual.next);
          result = result && angular.isDefined(actual.results);
          result = result && angular.isDefined(actual.hasNext);
          return {pass: result};
        }
      };
    },
    toBeInstanceOf: function() {
      return {
        compare: function(actual, expectedClass) {
          var result = {pass: (actual instanceof expectedClass)};
          if (result.pass) {
            result.message = 'Expected "' + actual + '" to be an instanceof "' +
                              expectedClass + '", but it is not.';
          } else {
            result.message = 'Expected "' + actual + '" to be an instanceof "' +
                              expectedClass + '".';
          }
          return result;
        }
      };
    },
    toBeSameTypeAs: function() {
      return {
        compare: function(actual, expected) {
          var result = {pass: typeof actual === typeof expected};
          if (result.pass) {
            result.message = 'Expected type of "' + actual +
                             '" NOT to be of type"' + (typeof expected);
          } else {
            result.message = 'Expected type of "' + actual +
                             '" to be "' + (typeof expected) + '" but is "' +
                             (typeof actual) + '".';
          }
          return result;
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
