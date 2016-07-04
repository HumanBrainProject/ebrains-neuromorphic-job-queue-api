describe('hbpPerformAction directive: ', function() {
  var scope;
  var compile;
  var $q;
  var element;
  var actionDefered;
  var called;
  var instantiate;

  beforeEach(module('clb-ui-loading'));
  beforeEach(inject(function($rootScope, _$compile_, _$q_) {
    scope = $rootScope.$new();
    compile = _$compile_;
    $q = _$q_;

    instantiate = function() {
      compile(element)(scope);
      scope.$digest();
    };

    actionDefered = $q.defer();
    called = false;
    scope.run = function() {
      called = true;
      return actionDefered.promise;
    };
    element = angular.element('<button clb-perform-action="run()" ' +
      'clb-loading-message="Loading...">Some Text</button>');
  }));

  it('should run the action on click', function() {
    instantiate();
    expect(called).toBe(false);
    element.triggerHandler('click');
    expect(called).toBe(true);
  });

  it('should disable the DOM', function() {
    instantiate();
    element.triggerHandler('click');
    expect(element.attr('disabled')).toBe('disabled');
  });

  it('should re-enable the DOM once done', function() {
    instantiate();
    element.triggerHandler('click');
    actionDefered.resolve();
    scope.$digest();
    expect(element.attr('disabled')).toBeUndefined();
  });

  it('should re-enable the DOM once failed', function() {
    instantiate();
    element.triggerHandler('click');
    actionDefered.reject();
    scope.$digest();
    expect(element.attr('disabled')).toBeUndefined();
  });

  it('should remove the loading class once done', function() {
    instantiate();
    element.triggerHandler('click');
    actionDefered.resolve();
    scope.$digest();
    expect(element.attr('class')).not.toMatch(/loading/);
  });

  it('should remove the loading class once failed', function() {
    instantiate();
    element.triggerHandler('click');
    actionDefered.reject();
    scope.$digest();
    expect(element.attr('class')).not.toMatch(/loading/);
  });

  it('should display a custom loading message', function() {
    instantiate();
    expect(element.html()).toBe('Some Text');
    element.triggerHandler('click');
    expect(element.html()).toBe('Loading...');
  });

  it('should keep the original text by default', function() {
    element = angular.element('<button clb-perform-action="run()">Some Text' +
      '</button>');
    instantiate();
    expect(element.html()).toBe('Some Text');
    element.triggerHandler('click');
    expect(element.html()).toBe('Some Text');
  });
});
