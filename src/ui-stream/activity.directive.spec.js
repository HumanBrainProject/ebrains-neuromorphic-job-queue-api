describe('clbActivity directive', function() {
  var compile;
  var scope;
  var resourceLocator;

  beforeEach(module('clb-ui-stream'));
  beforeEach(inject(function(
    $compile,
    $rootScope,
    $window,
    $templateCache,
    clbResourceLocator
  ) {
    compile = $compile;
    scope = $rootScope;
    resourceLocator = clbResourceLocator;
    jasmine.cacheTemplate($templateCache,
      'activity.directive.html',
      'src/ui-stream/');
    jasmine.cacheTemplate($templateCache,
      'feed.directive.html',
      'src/ui-stream/');
  }));

  beforeEach(function() {
    scope.activity = {
      actor: {id: '1', type: 'HBPUser', state: null},
      object: {id: 'softwarecat', type: 'HBPSoftware', state: null},
      summary: 'John registered new version `2.1.2` of software `softwarecat`',
      target: {id: 'general', type: 'HBPSoftwareCatalog', state: null},
      verb: 'REGISTER',
      time: new Date(Date.parse('2016-05-24T15:30:18.122882Z'))
    };
  });

  it('should define activity classes', function() {
    var element = compile(
      '<div clb-activity="activity"></div>')(scope);
    scope.$digest();
    expect(element.hasClass('clb-activity')).toBe(true);
    expect(element.hasClass('clb-activity-register'))
      .toBe(true, element[0].className);
  });

  it('should display the activity summary', function() {
    var element = compile(
      '<div clb-activity="activity"></div>')(scope);
    scope.$digest();
    var summary = angular.element(
      element[0].querySelector('.clb-activity-summary'));
    expect(summary.length).toBe(1, element.html());
    expect(summary.text())
      .toBe(scope.activity.summary);
  });

  describe('activity are clickable', function() {
    it('should generate the primaryLink', inject(function($q, $location) {
      spyOn(resourceLocator, 'urlFor').and.returnValue($q.when('/software/1'));
      var element = compile(
        '<div clb-activity="activity"></div>')(scope);
      scope.$digest();
      var vm = element.isolateScope().vm;
      expect(vm.navigate).toBeDefined();
      spyOn($location, 'url');
      vm.navigate();
      scope.$digest();
      expect($location.url).toHaveBeenCalledWith('/software/1');
    }));

    it('should have .clb-activity-activable when a primary link exists',
    inject(function($q) {
      spyOn(resourceLocator, 'urlFor').and.returnValue($q.when('/software/1'));
      var element = compile(
        '<div clb-activity="activity"></div>')(scope);
      scope.$digest();
      expect(element.hasClass('clb-activity-activable')).toBe(true);
    }));

    it('should not have .clb-activity-activable when no primary link exists',
    inject(function($q) {
      spyOn(resourceLocator, 'urlFor').and.returnValue($q.when(null));
      var element = compile(
        '<div clb-activity="activity"></div>')(scope);
      scope.$digest();
      expect(element.hasClass('clb-activity-activable')).toBe(false);
    }));
  });
});
