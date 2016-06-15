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
      v0: 'http://document/v1'
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

/**
 * Enable partial caching on dev but still works when running karma:dist.
 * @param  {object} $templateCache Angular Template Cache Service
 * @param  {string} key            filename as passed to $templateCache.get()
 * @param  {string} [prefix]       prefix to append to retrieve it in window.__html__[]
 * @return {boolean} ``true`` if the operation suceed
 */
jasmine.cacheTemplate = function($templateCache, key, prefix) {
  if (!window.__html__) {
    return false;
  }
  if (window.__html__[(prefix ? prefix : '') + key]) {
    $templateCache.put(
      key,
      window.__html__[(prefix ? prefix : '') + key]
    );
    return true;
  }
  return false;
};

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
          var result = {};
          result.pass = Boolean(actual);
          result.pass = result.pass && angular.isDefined(actual.type);
          result.pass = result.pass && angular.isDefined(actual.code);
          result.pass = result.pass && angular.isDefined(actual.message);
          result.message = (result.pass ?
            String(actual) + ' should not be a HbpError' :
            String(actual) + ' should be a HbpError'
          );
          return result;
        }
      };
    },
    toDeepEqual: function() {
      return {
        compare: function(actual, expected) {
          return {
            pass: angular.equals(actual, expected)
          };
        }
      };
    }
  });
});
