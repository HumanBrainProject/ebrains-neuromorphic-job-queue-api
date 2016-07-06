var mainBowerFiles = require('main-bower-files');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-spec-reporter',
      'karma-coverage',
      'karma-html2js-preprocessor'
    ],
    files: mainBowerFiles({filter: '**/*.js', includeDev: true}).concat([
      'src/main.js',
      'src/**/*.module.js',
      'src/**/*.js',
      'src/main.spec.js',
      'src/**/*.spec.js',
      'src/**/*.html'
    ]),
    browsers: ['PhantomJS'],
    frameworks: ['jasmine'],
    reporters: ['progress', 'coverage'],
    preprocessors: {
      'src/**/!(*.spec).js': ['coverage'],
      'src/**/*.html': ['html2js']
    },
    coverageReporter: {
      type: 'text-summary'
    }
  });
};
