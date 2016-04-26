describe('hbpCollaboratoryForm hc-form-group-state directive', function() {
  var compile;
  var scope;
  var element;
  var form;
  var div;
  var input;

  beforeEach(module('hbpCollaboratoryForm'));
  beforeEach(inject(function($compile, $rootScope) {
    compile = $compile;
    scope = $rootScope;
    scope.theModel = {attr: null};
    element = compile(
      '<form name="form">' +
      '<div class="form-group" hcf-form-group-state="form.attr">' +
      '  <input name="attr" type="text" ng-model="theModel.attr" ' +
      '         ng-required="true">' +
      '</div>' +
      '</form>'
    )(scope);
    form = scope.form;
    div = element.find('div');
    input = element.find('input');
  }));

  it('should set the class to has-error if invalid', function() {
    scope.theModel = {
      attr: {}
    };
    expect(div.hasClass('has-error')).toBe(false);
    input.triggerHandler('focus');
    scope.$digest();
    form.attr.$setViewValue('');
    input.triggerHandler('blur');
    expect(element.hasClass('ng-invalid')).toBe(true);
    expect(div.hasClass('has-error')).toBe(true);
  });

  it('should set the class to has-success when valid', function() {
    scope.theModel = {
      attr: {}
    };
    expect(div.hasClass('has-success')).toBe(false);
    input.triggerHandler('focus');
    scope.$digest();
    form.attr.$setViewValue('ok');
    input.triggerHandler('blur');
    expect(element.hasClass('ng-valid')).toBe(true);
    expect(div.hasClass('has-success')).toBe(true);
  });
});
