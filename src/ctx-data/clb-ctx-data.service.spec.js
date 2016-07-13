/* eslint require-jsdoc:0 */
describe('clbCtxData', function() {
  'use strict';

  // injected variables available for all tests
  var $httpBackend;
  var $rootScope;
  var clbCtxData;
  var ctx;
  var newCtx;
  var data;
  var newData;
  var host;
  var config;
  var newConfig;
  var actual;

  function assignActual(value) {
    actual = value;
  }

  // load main module
  beforeEach(module('clb-ctx-data'));

  beforeEach(inject(function(_$httpBackend_, _$rootScope_, _clbCtxData_) {
    // inject global variables
    $httpBackend = _$httpBackend_;
    $rootScope = _$rootScope_;
    clbCtxData = _clbCtxData_;
    host = 'http://collab/v0';
    ctx = 'D18A953D-21A6-4FCC-AAB7-524B83F79D17';
    newCtx = '3538BE2B-79E8-492C-93ED-0CAC8530E1E2';
    data = {foo: 'baz'};
    newData = 'Goal!';

    config = {
      context: ctx,
      content: angular.toJson(data)
    };
    newConfig = {
      context: newCtx,
      content: angular.toJson(newData)
    };
    $rootScope = _$rootScope_;
  }));

  afterEach(function() {
    // Ensure all mocked requests were properly resolved.
    $httpBackend.verifyNoOutstandingRequest();
    $httpBackend.verifyNoOutstandingExpectation();
    actual = undefined;
  });
  it('should get config', function() {
    clbCtxData.get(ctx).then(assignActual);
    $httpBackend.expectGET(host + '/config/' + ctx + '/')
      .respond(200, config);
    $httpBackend.flush();
    expect(actual).toEqual(data);
  });

  it('should get undefined when no data exists', function() {
    clbCtxData.get(ctx).then(assignActual);
    $httpBackend.expectGET(host + '/config/' + ctx + '/')
      .respond(404);
    $httpBackend.flush();
    expect(actual).toBeUndefined();
  });

  it('should throw an exception when an error is returned', function() {
    clbCtxData.get(ctx).catch(assignActual);
    $httpBackend.expectGET(host + '/config/' + ctx + '/')
      .respond(500);
    $httpBackend.flush();
    expect(actual).toBeHbpError();
  });

  it('should create a config', function() {
    clbCtxData.save(newCtx, newData).then(assignActual);
    $httpBackend.expectPUT(host + '/config/' + newCtx + '/')
      .respond(201, newConfig);
    $httpBackend.flush();
    expect(actual).toEqual(newData);
  });

  it('should update a config', function() {
    clbCtxData.save(ctx, newData).then(assignActual);
    $httpBackend.expectPUT(host + '/config/' + ctx + '/', {
      context: ctx,
      content: '"Goal!"'
    }).respond(200, {ctx: ctx, data: angular.toJson(newData)});
    $httpBackend.flush();
    expect(actual).toEqual(newData);
  });

  it('get forbid bad UUID format', function() {
    clbCtxData.save('NOPE', newData).catch(assignActual);
    $rootScope.$digest();
    expect(actual).toBeHbpError();
  });

  it('save forbid bad UUID format', function() {
    clbCtxData.save('NOPE', newData).catch(assignActual);
    $rootScope.$digest();
    expect(actual).toBeHbpError();
  });

  it('delete forbid bad UUID format', function() {
    clbCtxData.save('NOPE', newData).catch(assignActual);
    $rootScope.$digest();
    expect(actual).toBeHbpError();
  });

  it('should delete a config', function() {
    clbCtxData.delete(ctx).then(assignActual);
    $httpBackend.expectDELETE(host + '/config/' + ctx + '/')
      .respond(204);
    $httpBackend.flush();
    expect(actual).toBe(true);
  });
});
