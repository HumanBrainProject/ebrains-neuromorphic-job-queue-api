/* eslint-plugin eslint-plugin-jasmine */
describe('createNavItem', function() {
  var createNavItem;
  var data;
  var scope;
  var navStore;
  var appStore;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function(
    $rootScope,
    hbpCollaboratoryAutomator,
    hbpCollaboratoryNavStore,
    hbpCollaboratoryAppStore
  ) {
    createNavItem = hbpCollaboratoryAutomator.handlers.nav;
    navStore = hbpCollaboratoryNavStore;
    appStore = hbpCollaboratoryAppStore;
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
        name: 'My test collab'
      }
    };
  });

  it('should create a nav item', inject(function($q) {
    spyOn(appStore, 'findOne').and.returnValue($q.when(data.app));
    spyOn(navStore, 'getRoot').and.returnValue($q.when(data.parent));
    spyOn(navStore, 'addNode');
    var config = angular.extend({collab: data.collab}, data.mandatory);
    createNavItem(config);
    scope.$digest();
    expect(navStore.addNode).toHaveBeenCalled();
    expect(navStore.addNode.calls.mostRecent().args[0]).toBe(data.collab.id);
    expect(navStore.addNode.calls.mostRecent().args[1].name)
    .toBe(data.mandatory.name);
    expect(navStore.addNode.calls.mostRecent().args[1].appId).toBe(data.app.id);
  }));

  it('should return the nav item', inject(function($q) {
    var nav;
    spyOn(appStore, 'findOne').and.returnValue($q.when(data.app));
    spyOn(navStore, 'getRoot').and.returnValue($q.when(data.parent));
    spyOn(navStore, 'addNode').and.returnValue($q.when(data.navItem));
    var config = angular.extend({collab: data.collab}, data.mandatory);
    createNavItem(config).then(function(r) {
      nav = r;
    });
    scope.$digest();
    expect(nav).toBeDefined();
    expect(nav.appId).toBe(data.navItem.appId);
  }));
});
