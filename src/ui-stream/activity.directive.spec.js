describe('clbActivity directive', function() {
  var compile;
  var scope;
  var resourceLocator;
  var $window;

  beforeEach(module('clb-ui-stream'));

  beforeEach(function() {
    $window = {
      location: null, // used in tests
      setTimeout: jasmine.createSpy('setTimeout')
    };
    module(function($provide) {
      $provide.value('$window', $window);
    });
  });

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

  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

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
    scope.$digest();
    expect(summary.text()).toMatch(scope.activity.summary);
  });

  describe('activity can provide references', function() {
    it('should generate links', inject(function($q) {
      scope.activity.references = {
        actor: {
          indices: [0, 4]
        }
      };
      spyOn(resourceLocator, 'urlFor').and.returnValue($q.when('/software/1'));
      var element = compile(
        '<div clb-activity="activity"></div>')(scope);
      scope.$digest();
      var vm = element.isolateScope().vm;
      expect(vm.parts[0]).toEqual({
        tag: 'actor',
        ref: jasmine.any(Object),
        text: 'John',
        $$hashKey: jasmine.any(String)
      });
    }));
  });

  describe('references are clickable', function() {
    var dScope;
    var init;

    beforeEach(function() {
      init = function(summary, references) {
        var s = scope.$new();
        s.activity = {
          summary: summary,
          references: references
        };
        var element = compile(
          '<div clb-activity="activity"></div>')(s);
        scope.$digest();
        dScope = element.isolateScope();
      };
    });

    it('should split for a reference at the beginning', function() {
      init('summary', {
        actor: {
          indices: [0, 3]
        }
      });
      expect(dScope.vm.parts.length).toBe(2);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('mary');
    });

    it('should split for a reference at the end', function() {
      init('summary', {
        actor: {
          indices: [3, 7]
        }
      });
      expect(dScope.vm.parts.length).toBe(2);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('mary');
    });

    it('should split for a reference in the middle', function() {
      init('summary', {
        actor: {
          indices: [3, 5]
        }
      });
      expect(dScope.vm.parts.length).toBe(3);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('ma');
      expect(dScope.vm.parts[2].text).toBe('ry');
    });

    it('should split for two following references', function() {
      init('summary', {
        actor: {
          indices: [3, 5]
        },
        object: {
          indices: [5, 6]
        }
      });
      expect(dScope.vm.parts.length).toBe(4);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('ma');
      expect(dScope.vm.parts[2].text).toBe('r');
      expect(dScope.vm.parts[3].text).toBe('y');
    });

    it('should split for two inverted following references', function() {
      init('summary', {
        actor: {
          indices: [5, 6]
        },
        object: {
          indices: [3, 5]
        }
      });
      expect(dScope.vm.parts.length).toBe(4);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('ma');
      expect(dScope.vm.parts[2].text).toBe('r');
      expect(dScope.vm.parts[3].text).toBe('y');
    });

    it('should split for beginning and end references', function() {
      init('summary', {
        actor: {
          indices: [0, 5]
        },
        object: {
          indices: [5, 7]
        }
      });
      expect(dScope.vm.parts.length).toBe(2);
      expect(dScope.vm.parts[0].text).toBe('summa');
      expect(dScope.vm.parts[1].text).toBe('ry');
    });

    it('should split for end and beginning references', function() {
      init('summary', {
        actor: {
          indices: [5, 7]
        },
        object: {
          indices: [0, 5]
        }
      });
      expect(dScope.vm.parts.length).toBe(2);
      expect(dScope.vm.parts[0].text).toBe('summa');
      expect(dScope.vm.parts[1].text).toBe('ry');
    });

    it('should split for two unlinked references', function() {
      init('summary', {
        actor: {
          indices: [3, 4]
        },
        object: {
          indices: [5, 6]
        }
      });
      expect(dScope.vm.parts.length).toBe(5);
      expect(dScope.vm.parts[0].text).toBe('sum');
      expect(dScope.vm.parts[1].text).toBe('m');
      expect(dScope.vm.parts[2].text).toBe('a');
      expect(dScope.vm.parts[3].text).toBe('r');
      expect(dScope.vm.parts[4].text).toBe('y');
    });
  });
});
