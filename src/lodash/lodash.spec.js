/* global window */
describe('legacy patching', function() {
  beforeEach(angular.mock.module('lodash'));
  it('should patch lodash', function() {
    expect(window._).toBeDefined();
    expect(window._.keyBy).toBeDefined();
    expect(window._.indexBy).toBeDefined();
    expect(window._.pluck).toBeDefined();
    expect(window._.map).toBeDefined();
  });
});
