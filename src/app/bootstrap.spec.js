/* global window,document */
describe('angular.clbBootstrap', function() {
  var appElement;
  beforeEach(function() {
    // Remove default setup
    window.bbpConfig = undefined;
    appElement = document.createElement('DIV');
    document.body.appendChild(appElement);
  });

  afterEach(inject(function($rootScope) {
    appElement.remove();
    $rootScope.$digest();
  }));

  describe('CLB_ENVIRONMENT', function() {
    it('should be available during module config phase', function(done) {
      var expected = {value: 1};
      angular.module('myApp2', ['clb-app'])
      .config(function(CLB_ENVIRONMENT) {
        expect(CLB_ENVIRONMENT).toBe(expected);
        done();
      });
      angular.clbBootstrap('myApp2', {env: expected, element: appElement});
    });

    it('should be available during module run phase', function(done) {
      var expected = {value: 2};
      angular.module('myApp3', ['clb-app'])
      .run(function(CLB_ENVIRONMENT) {
        expect(CLB_ENVIRONMENT).toBe(expected);
        done();
      });
      angular.clbBootstrap('myApp3', {env: expected, element: appElement});
    });
  });

  it('should load environment object', function(done) {
    var expected = {value: 3};
    angular.module('myApp4', ['clb-app'])
    .run(function(CLB_ENVIRONMENT) {
      expect(CLB_ENVIRONMENT).toBe(expected);
      done();
    });
    angular.clbBootstrap('myApp4', {env: expected, element: appElement});
  });

  it('should load environment through bbpConfig', function(done) {
    window.bbpConfig = {val: true};
    angular.module('myApp5', ['clb-app'])
    .run(function(CLB_ENVIRONMENT) {
      expect(CLB_ENVIRONMENT).toBeDefined();
      expect(CLB_ENVIRONMENT).toBe(window.bbpConfig);
      done();
    });
    angular.clbBootstrap('myApp5', {element: appElement});
  });
});
