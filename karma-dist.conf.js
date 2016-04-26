var mainBowerFiles = require('main-bower-files');
var conf = require('./karma.conf.js');
module.exports = function(config) {
  conf(config);
  config.set({
    files: mainBowerFiles({filter: '**/*.js', includeDev: true}).concat([
      'angular-hbp-collaboratory.js',
      'src/**/*.spec.js'
    ]),
    reporters: [],
    preprocessors: {}
  });
};
