/* eslint-plugin eslint-plugin-jasmine */
describe('collab task handler', function() {
  var createCollab;
  var data;
  var scope;
  var store;
  var storeCreateReturnValue;

  beforeEach(module('clb-automator'));
  beforeEach(inject(function(
    $rootScope,
    $q,
    clbAutomator,
    clbCollab
  ) {
    createCollab = clbAutomator.handlers.collab;
    store = clbCollab;
    scope = $rootScope;
    data = {
      mandatory: {
        title: 'My test collab',
        content: 'My test collab description'
      },
      collab: {id: 11}
    };
    storeCreateReturnValue = $q.when(data.collab);
    spyOn(store, 'create').and.callFake(function() {
      return storeCreateReturnValue;
    });
  }));

  it('should create a collab', function() {
    createCollab(data.mandatory);
    scope.$digest();
    expect(store.create).toHaveBeenCalledWith(data.mandatory);
  });

  it('should return the created collab', function() {
    var collab;
    createCollab(data.mandatory).then(function(r) {
      collab = r;
    });
    scope.$digest();
    expect(collab).toEqual({id: 11});
  });

  ['title', 'content', 'private'].forEach(function(attr) {
    it('should use ' + attr + ' parameter', function() {
      var invalidConfig = {
        not: 'a valid param'
      };
      var testConfig = {};
      testConfig[attr] = 'ok';
      createCollab(angular.extend(invalidConfig, testConfig, data.mandatory));
      expect(store.create).toHaveBeenCalledWith(
        angular.extend(testConfig, data.mandatory));
    });
  });

  describe('error handling', function() {
    it('should reject promise on error', inject(function($q) {
      var expected = {type: 'error'};
      storeCreateReturnValue = $q.reject(expected);

      createCollab(angular.extend(data.mandatory))
      .then(function() {
        expect(true).toBe(false, 'Should not resolve the promise.');
      })
      .catch(function(err) {
        expect(err).toBe(expected);
      });
    }));
  });
});
