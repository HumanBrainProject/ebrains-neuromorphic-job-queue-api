'use strict';

describe('Directive: clbUsercardPopover', function() {
  var $compile;
  var $q;
  var service;

  var element;
  var scope;

  beforeEach(module('clb-ui-identity'));

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    $rootScope,
    _$compile_,
    _$q_,
    clbUser,
    $templateCache
  ) {
    scope = $rootScope.$new();
    $compile = _$compile_;
    $q = _$q_;
    service = clbUser;

    scope.me = {
      id: '123123',
      displayName: 'John Doe',
      emails: [
        {value: 'john@doe.com'},
        {value: 'john.doe@epfl.ch', primary: true}
      ],
      phones: [
        {value: '1-2223-444'},
        {value: '1-2223-666', primary: true},
        {value: '1-2223-555'}
      ],
      ims: [{value: 'skype://johndoe', primary: true}],
      username: 'jdoe'
    };

    spyOn(service, 'get')
      .and.returnValue($q.when($rootScope.me));

    jasmine.cacheTemplate($templateCache,
      'usercard-popover.directive.html',
      'src/ui-identity/');
  }));

  describe('basic usage', function() {
    beforeEach(function() {
      element = angular.element('<a clb-usercard-popover="me">Tadaaa</a>');
      $compile(element)(scope);
      scope.$digest();
    });

    it('use popover directive', function() {
      expect(element.find('span').attr('uib-popover-template')).toBeDefined();
    });

    it('It is a transclude directive', function() {
      expect(angular.element(element.find('span')[0]).text()).toBe('Tadaaa');
    });
  });

  describe('using the user id', function() {
    beforeEach(function() {
      element = angular.element(
        '<a clb-usercard-popover="me.id">Tadaaa</a>');
      $compile(element)(scope);
      scope.$digest();
    });

    it('lookup for the user object', function() {
      expect(service.get).toHaveBeenCalledWith('123123');
    });
  });
});
