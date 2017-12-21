// Karma configuration
// Generated on Fri Oct 13 2017 11:53:28 GMT+0200 (CEST)
var PATH_MODULE = '/home/jonathan/node_modules';
var URL_FILES = '/Users/jojo/Documents_2/hbp/hbp_neuromorphic_platform/job_manager/nmpi-job-manager-app';
module.exports = function(config) {
    config.set({
  
      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',
  
  
      // frameworks to use
      // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
      frameworks: ['jasmine'],
  
      plugins: [
        require('karma-jasmine'),
        require('karma-chrome-launcher'),
        require('karma-jasmine-html-reporter'),
        require('jasmine-core'),
        require('karma-phantomjs-launcher'),
        require('karma-jasmine'),
        require('karma-spec-reporter'),
        require('karma-junit-reporter'),
      ],
  
      // list of files / patterns to load in the browser
      files: [
        // PATH_MODULE + '/angular/angular.js',
        URL_FILES + '/angular/angular.js',
        // PATH_MODULE + '/angular-mocks/angular-mocks.js',
        URL_FILES + '/angular-mocks/angular-mocks.js',
        URL_FILES + '/angular-ui-router/release/angular-ui-router.js',

        'app.js',
        
        URL_FILES + '/nmpi/dataitem/model.js',
        URL_FILES + '/nmpi/collab/model.js',
        URL_FILES + '/nmpi/user/model.js',
        URL_FILES + '/nmpi/queue/model.js',
        URL_FILES + '/nmpi/queue/controllers.js',

        URL_FILES + '/hello/dist/hello.js',
        URL_FILES + '/hello/dist/hello.all.js',
    
        URL_FILES + '/jquery/dist/jquery.min.js',
        URL_FILES + '/lodash/lodash.min.js',
        // URL_FILES + '/angular/angular.js',
    
        URL_FILES + '/angular-bootstrap/ui-bootstrap-tpls.min.js',
        URL_FILES + '/hbp-collaboratory-theme/dist/javascripts/bootstrap.min.js',
        URL_FILES + '/angular-deferred-bootstrap/angular-deferred-bootstrap.min.js',
        URL_FILES + '/angular-bootstrap/ui-bootstrap-tpls.js',
        URL_FILES + '/ng-tags-input/ng-tags-input.js',
    
        URL_FILES + '/angular-bbp-config/angular-bbp-config.js',
        URL_FILES + '/bbp-oidc-client/angular-bbp-oidc-client.js',
        // URL_FILES + '/angular-ui-router/release/angular-ui-router.min.js',
        URL_FILES + '/angular-resource/angular-resource.min.js',
        URL_FILES + '/marked-hbp/marked.min.js',
    
        URL_FILES + '/angular-hbp-common/dist/angular-hbp-common.min.js',
        URL_FILES + '/angular-hbp-collaboratory/angular-hbp-collaboratory.js',
        URL_FILES + '/codemirror/lib/codemirror.js',
        URL_FILES + '/codemirror/mode/python/python.js',
        URL_FILES + '/angular-ui-codemirror/ui-codemirror.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/app/app.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/app/app.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/app/auth.provider.js',
        URL_FILES + '/angular-hbp-collaboratory/src/app/authHttp.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/error/error.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/error/error.service.js',
    
        URL_FILES + '/angular-uuid4/angular-uuid4.js',
    
        URL_FILES + '/angular-deferred-bootstrap/angular-deferred-bootstrap.js',
    
        URL_FILES + '/moment/moment.js',
    
        URL_FILES + '/angular-moment/angular-moment.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/env/env.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/env/env.provider.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/automator/automator.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/automator/automator.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab.model.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/clb-collab-app.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab-nav.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab-team-role.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/collab-team.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/context.model.js',
        URL_FILES + '/angular-hbp-collaboratory/src/collab/context.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/lodash/lodash.module.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/identity/identity.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/identity/group.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/identity/user.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/identity/util.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/rest/rest.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/rest/pagination.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/storage/storage.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/storage/storage.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ctx-data/clb-ctx-data.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ctx-data/clb-ctx-data.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/stream/stream.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/stream/resource-locator.provider.js',
        URL_FILES + '/angular-hbp-collaboratory/src/stream/stream.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-dialog/ui-dialog.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-dialog/confirm.service.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-error/ui-error.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-error/error-dialog.factory.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-error/error-message.directive.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-form/ui-form.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-form/form-control-focus.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-form/form-group-state.directive.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-identity/ui-identity.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-identity/user-avatar.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-identity/usercard-popover.service.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-identity/usercard-popover.tpl.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-identity/usercard.directive.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-loading/ui-loading.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-loading/loading.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-loading/perform-action.directive.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/ui-storage.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/file-browser-folder.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/file-browser-path.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/file-browser-tooltip.tpl.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/file-browser.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-storage/file-upload.directive.js',
    
        URL_FILES + '/angular-hbp-collaboratory/src/ui-stream/ui-stream.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-stream/activity.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-stream/feed.directive.js',
        URL_FILES + '/angular-hbp-collaboratory/src/ui-stream/ui-stream.module.js',
        URL_FILES + '/angular-hbp-collaboratory/src/main.js',
        URL_FILES + '/angular-hbp-collaboratory/src/main.spec.js',
        
        'user/model.js',
        'user/model.spec.js',
        'collab/model.js',
        'collab/model.spec.js',
        'dataitem/model.js',
        'dataitem/model.spec.js',
        'queue/model.js',
        'queue/model.spec.js',
        'queue/controllers.js',
        'queue/controllers.spec.js',
      ],
  
  
      // list of files to exclude
      exclude: [
      ],
  
  
      // preprocess matching files before serving them to the browser
      // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
      preprocessors: {
      },
  
  
      // test results reporter to use
      // possible values: 'dots', 'progress'
      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: ['spec'],
  
  
      // web server port
      port: 9876,
  
  
      // enable / disable colors in the output (reporters and logs)
      colors: true,
  
  
      // level of logging
      // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
      logLevel: config.LOG_DEBUG,
  
  
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
  