/* global document,window */
describe('clbEnv Service', function() {
  var appElement;
  var clbEnv;
  var clbEnvProvider;

  beforeEach(function(done) {
    window.bbpConfig = undefined;
    var env = {
      test: true,
      nested: {
        val: {
          ue: 'nested'
        }
      }
    };
    appElement = document.createElement('DIV');
    document.body.appendChild(appElement);
    angular.module('myApp4', ['clb-env']).config(function(_clbEnvProvider_) {
      clbEnvProvider = _clbEnvProvider_;
    });
    angular.clbBootstrap('myApp4', {env: env, element: appElement})
    .then(function() {
      module('myApp4');
      done();
    });
  });

  beforeEach(inject(function(_clbEnv_) {
    clbEnv = _clbEnv_;
  }));

  afterEach(function() {
    appElement.remove();
  });

  it('should retrieve an existing value', function() {
    expect(clbEnv.get('test')).toBe(true);
  });
  it('should retrieve an existing value over a default value', function() {
    expect(clbEnv.get('test', false)).toBe(true);
  });
  it('should retrieve default value over undefined', function() {
    expect(clbEnv.get('inexistant', false)).toBe(false);
  });
  it('should throw if both default and value are undefined', function() {
    expect(function() {
      clbEnv.get('inexistant');
    }).toThrow();
  });
  it('should retrieve nested attribute using dot notation', function() {
    expect(clbEnv.get('nested.val.ue')).toEqual('nested');
  });

  describe('Provider', function() {
    it('should return the same values', function() {
      expect(clbEnv.get('test')).toBe(clbEnvProvider.get('test'));
    });
  });
});
