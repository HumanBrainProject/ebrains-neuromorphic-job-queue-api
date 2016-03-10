/* eslint-plugin eslint-plugin-jasmine */
describe('nav task handler', function() {
  var createNavItem;
  var data;
  var scope;
  var entityStore;
  var navStore;
  var appStore;
  var storage;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    hbpEntityStore,
    hbpCollaboratoryAutomator,
    hbpCollaboratoryNavStore,
    hbpCollaboratoryAppStore,
    hbpCollaboratoryStorage
  ) {
    createNavItem = hbpCollaboratoryAutomator.handlers.nav;
    entityStore = hbpEntityStore;
    navStore = hbpCollaboratoryNavStore;
    appStore = hbpCollaboratoryAppStore;
    storage = hbpCollaboratoryStorage;
    scope = $rootScope;
  }));
  beforeEach(function() {
    data = {
      app: {
        id: 2,
        title: 'My Test App'
      },
      collab: {
        id: 1
      },
      mandatory: {
        name: 'My test collab',
        app: 'My Test App'
      },
      parent: {
        id: 21,
        appId: 20,
        collabId: 1,
        name: 'My test collab'
      },
      navItem: {
        appId: 2,
        collabId: 1,
        name: 'My test collab',
        context: 'bbb-ccc'
      },
      entity: {
        _uuid: 'aaa',
        _entityType: 'file'
      }
    };
  });

  beforeEach(inject(function($q) {
    spyOn(appStore, 'findOne').and.returnValue($q.when(data.app));
    spyOn(navStore, 'getRoot').and.returnValue($q.when(data.parent));
    spyOn(navStore, 'addNode').and.returnValue($q.when(data.navItem));
  }));

  it('should create a nav item', function() {
    var descriptor = angular.extend(data.mandatory);
    createNavItem(descriptor, {collab: data.collab});
    scope.$digest();
    expect(navStore.addNode.calls.mostRecent().args[0]).toBe(data.collab.id);
  });

  it('should create a nav item', function() {
    var descriptor = angular.extend({collab: data.collab.id}, data.mandatory);
    createNavItem(descriptor);
    scope.$digest();
    expect(navStore.addNode).toHaveBeenCalled();
    expect(navStore.addNode.calls.mostRecent().args[0]).toBe(data.collab.id);
    expect(navStore.addNode.calls.mostRecent().args[1].name)
    .toBe(data.mandatory.name);
    expect(navStore.addNode.calls.mostRecent().args[1].appId).toBe(data.app.id);
  });

  it('should return the nav item', function() {
    var nav;
    var config = angular.extend({collab: data.collab}, data.mandatory);
    createNavItem(config)
    .then(function(r) {
      nav = r;
    })
    .catch(function(err) {
      expect(err).toBeUndefined();
    });
    scope.$digest();
    expect(nav).toBeDefined();
    expect(nav.appId).toBe(data.navItem.appId);
  });

  describe('support entity metadata to ctx linking', function() {
    beforeEach(inject(function($q) {
      spyOn(storage, 'setContextMetadata').and.returnValue($q.when({}));
    }));

    it('should use the storage in context', function() {
      var descriptor = angular.extend({entity: 'image.png'}, data.mandatory);
      var context = {
        storage: {
          'image.png': data.entity
        },
        collab: data.collab
      };
      createNavItem(descriptor, context);
      scope.$digest();
      expect(storage.setContextMetadata)
      .toHaveBeenCalledWith(data.entity, data.navItem.context);
    });

    it('can use a uuid provided in the descriptor', inject(function($q) {
      spyOn(entityStore, 'get').and.returnValue($q.when(data.entity));
      var descriptor = angular.extend({
        entity: data.entity._uuid,
        collab: data.collab.id
      }, data.mandatory);
      createNavItem(descriptor);
      scope.$digest();
      expect(entityStore.get)
      .toHaveBeenCalledWith(data.entity._uuid);
      expect(storage.setContextMetadata)
      .toHaveBeenCalledWith(data.entity, data.navItem.context);
    }));
  });
});
