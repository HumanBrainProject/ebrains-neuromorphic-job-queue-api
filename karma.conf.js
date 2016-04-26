var mainBowerFiles = require('main-bower-files');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-spec-reporter',
      'karma-coverage'
    ],
    files: mainBowerFiles({filter: '**/*.js', includeDev: true}).concat([
      'src/main.js',
      'src/*/*.js',
      'src/**/*.js',
      'src/main.spec.js',
      'src/**/*.spec.js'
    ]),
    browsers: ['PhantomJS'],
    frameworks: ['jasmine'],
    reporters: ['spec', 'coverage'],
    preprocessors: {
      'src/**/!(*.spec).js': ['coverage']
    },
    coverageReporter: {
      type: 'text-summary'
    }
  });
};
