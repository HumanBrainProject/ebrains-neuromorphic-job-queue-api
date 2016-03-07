/* eslint-plugin eslint-plugin-jasmine */
/* global window */
describe('createCollab', function() {
  var createCollab;
  var automator;
  var data;
  var scope;
  var store;
  var storeCreateReturnValue;

  beforeEach(function() {
    window.bbpConfig = {
      auth: {
        clientId: 'aa',
        url: 'https://auth'
      },
      api: {
        user: {
          v0: 'https://userv0',
          v1: 'https://userv1'
        },
        collab: {
          v0: 'https://collabv0'
        }
      }
    };
  });
  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    $q,
    hbpCollaboratoryAutomator,
    hbpCollabStore
  ) {
    createCollab = hbpCollaboratoryAutomator.handlers.collab;
    store = hbpCollabStore;
    scope = $rootScope;
    automator = hbpCollaboratoryAutomator;
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

  describe('nav items', function() {
    beforeEach(inject(function($q) {
      spyOn(automator.handlers, 'nav').and.returnValue($q.when({}));
    }));

    it('should create one nav item', function() {
      var navConfig = {app: 'Test', name: 'My Label'};
      var c = angular.extend({nav: navConfig}, data.mandatory);
      createCollab(c);
      scope.$digest();
      expect(automator.handlers.nav).toHaveBeenCalledWith(
        angular.extend(navConfig, {collab: data.collab}));
    });

    it('should create multiple nav item', function() {
      var navConfig = [
        {app: 'Test 1', name: 'My Label 1'},
        {app: 'Test 2', name: 'My Label 2'}
      ];
      var c = angular.extend({nav: navConfig}, data.mandatory);
      createCollab(c);
      scope.$digest();
      expect(automator.handlers.nav).toHaveBeenCalledWith(
        angular.extend(navConfig[0], {collab: data.collab}));
      expect(automator.handlers.nav).toHaveBeenCalledWith(
        angular.extend(navConfig[1], {collab: data.collab}));
    });
  });
});
