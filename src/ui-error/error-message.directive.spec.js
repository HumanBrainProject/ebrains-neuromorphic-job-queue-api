describe('clbErrorMessage', function() {
  'use strict';

  var scope;
  var $compile;
  var errorValidation;
  var errorPermissions;
  var errorGeneric;
  var element;

  beforeEach(module('clb-ui-error'));

  beforeEach(inject(function($rootScope, $templateCache, $window, _$compile_) {
    scope = $rootScope.$new();
    $compile = _$compile_;
    jasmine.cacheTemplate($templateCache,
      'error-message.directive.html',
      'src/ui-error/'
    );
  }));

  beforeEach(function() {
    errorValidation = {
      code: 422,
      data: {
        email: ['Invalid e-mail address', 'can not be null'],
        phone: ['Invalid phone number']
      },
      message: 'Validation error.',
      type: 'Validation'
    };
    errorPermissions = {
      code: 403,
      message: 'Permission denied.',
      type: 'PermissionDenied'
    };
    errorGeneric = {
      code: 400,
      data: {params: ['SP12']},
      message: 'User doesn\'t belong to SP12',
      type: 'SpError'
    };
  });

  it('should display all validation errors', function() {
    scope.theError = errorValidation;
    element = angular.element(
      '<clb-error-message clb-error="theError"></clb-error-message>');
    $compile(element)(scope);
    scope.$digest();

    var lis = element[0].querySelectorAll('li');
    expect(lis.length).toBe(2, element);
    expect(angular.element(lis[0]).html())
      .toContain(errorValidation.data.email[0]);
    expect(angular.element(lis[0]).html())
      .toContain(errorValidation.data.email[1]);
    expect(angular.element(lis[1]).html())
      .toContain(errorValidation.data.phone[0]);
  });

  it('should display a generic permission denied error', function() {
    scope.theError = errorPermissions;
    element = angular.element(
      '<clb-error-message clb-error="theError"></clb-error-message>');
    $compile(element)(scope);
    scope.$digest();
    expect(element[0].querySelector('div[role="alert"]')).toBeDefined();
    expect(element[0].querySelector('div.alert')).toBeDefined();
  });

  it('should display the error message in the error', function() {
    scope.theError = errorGeneric;
    element = angular.element(
      '<clb-error-message clb-error="theError"></clb-error-message>');
    $compile(element)(scope);
    scope.$digest();
    expect(element[0].querySelector('div[role="alert"]')).toBeDefined();
    expect(element[0].querySelector('div.alert')).toBeDefined();
    expect(angular.element(element[0].querySelector('div.alert')).html())
      .toContain(errorGeneric.message);
  });

  it('should not display an error if there is no error', function() {
    scope.theError = undefined;
    element = angular.element(
      '<clb-error-message clb-error="theError"></clb-error-message>');
    $compile(element)(scope);
    scope.$digest();
    expect(element[0].querySelector('div[role="alert"]')).toBe(null);
    expect(element[0].querySelector('div.alert')).toBe(null);
  });
});
