// Karma configuration
// Generated on Wed Nov 15 2017 09:45:21 GMT+0100 (CET)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
        './lib/angular/angular.js',
        './lib/angular-ui-router/release/angular-ui-router.js',
        './lib/angular-resource/angular-resource.js',
        './lib/angular-bootstrap/ui-bootstrap-tpls.js',
        //'./lib/angular-bbp-config/angular-bbp-config.js',
        //'./lib/bbp-oidc-client/angular-bbp-oidc-client.js',
        //'./lib/angular-hbp-common/dist/angular-hbp-common.js',
        './app/mocks/angular-hbp-common.js',
        //'./lib/marked-hbp/marked.js',
        './node_modules/angular-mocks/angular-mocks.js',           // loads our modules for tests
        './app/module.js',                                         // our angular app
        './app/services.spec.js',                                  // our test files
        './app/controllers.spec.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
       'app/module.js': ['coverage']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['spec', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
