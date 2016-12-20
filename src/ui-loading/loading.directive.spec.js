describe('hbpLoading directive: ', function() {
  beforeEach(module('clb-ui-loading'));
  var rootScope;
  var scope;
  var compile;
  var $q;
  var element;
  var actionDefered;
  var instantiate;

  beforeEach(inject(function($rootScope, _$compile_, _$q_, $templateCache) {
    rootScope = $rootScope;
    compile = _$compile_;
    $q = _$q_;
    jasmine.cacheTemplate($templateCache,
      'loading.directive.html',
      'src/ui-loading/');
  }));

  beforeEach(function() {
    actionDefered = $q.defer();
    rootScope.run = function() {
      return actionDefered.promise;
    };
    instantiate = function() {
      compile(element)(rootScope);
      rootScope.$digest();
      scope = element.isolateScope();
    };
    element = angular.element(
      '<clb-loading clb-promise="run()" clb-message="\'Loading...\'">' +
      '</clb-loading>');
  });

  it('should run the loading', function() {
    instantiate();
    expect(scope.loading).toBe(true);
  });

  it('should run the loading whitouth arguments', function() {
    element = angular.element('<clb-loading></clb-loading>');
    instantiate();
    expect(scope.loading).toBe(true);
    expect(scope.message).toBe('Loading...');
  });

  describe('stop', function() {
    beforeEach(function() {
      instantiate();
    });

    it('should hide the element when promise is resolved', function() {
      actionDefered.resolve('OK');
      scope.$digest();
      expect(scope.loading).toBe(false);
    });

    it('should hide the element when promise is rejected', function() {
      actionDefered.reject('KO');
      scope.$digest();
      expect(scope.loading).toBe(false);
    });
  });
});
