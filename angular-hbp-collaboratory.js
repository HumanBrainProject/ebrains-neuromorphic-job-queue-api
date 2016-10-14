// The MIT License (MIT)
//
// Copyright (c) 2016 EPFL, Human Brain Project
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function(){
"use strict"

/**
 * Module to load all the core modules. Try to use the sub-modules instead.
 * @module hbpCollaboratoryCore
 */
interceptorConfig.$inject = ['$httpProvider'];
httpRequestInterceptor.$inject = ['$q'];
clbAuth.$inject = ['$injector'];
clbAutomator.$inject = ['$q', '$log', 'clbError'];
clbCollabTeamRole.$inject = ['clbAuthHttp', '$log', '$q', 'clbEnv', 'clbError'];
clbCollabTeam.$inject = ['clbAuthHttp', '$log', '$q', 'lodash', 'clbEnv', 'clbError', 'clbCollabTeamRole', 'clbUser'];
clbCollab.$inject = ['$log', '$q', '$cacheFactory', 'clbAuthHttp', 'lodash', 'clbContext', 'clbEnv', 'clbError', 'clbResultSet', 'clbUser', 'ClbCollabModel', 'ClbContextModel'];
clbContext.$inject = ['clbAuthHttp', '$q', 'clbError', 'clbEnv', 'ClbContextModel'];
clbCtxData.$inject = ['clbAuthHttp', '$q', 'uuid4', 'clbEnv', 'clbError'];
clbEnv.$inject = ['$injector'];
clbGroup.$inject = ['$rootScope', '$q', 'clbAuthHttp', '$cacheFactory', 'lodash', 'clbEnv', 'clbError', 'clbResultSet', 'clbIdentityUtil'];
clbUser.$inject = ['$rootScope', '$q', 'clbAuthHttp', '$cacheFactory', '$log', 'lodash', 'clbEnv', 'clbError', 'clbResultSet', 'clbIdentityUtil'];
clbIdentityUtil.$inject = ['$log', 'lodash'];
clbResultSet.$inject = ['clbAuthHttp', '$q', 'clbError'];
clbStorage.$inject = ['$http', '$q', '$log', 'uuid4', 'clbEnv', 'clbError', 'clbUser', 'clbResultSet'];
clbResourceLocator.$inject = ['$q', '$log', '$injector', 'clbError'];
clbStream.$inject = ['clbAuthHttp', 'clbEnv', 'clbError', 'clbResultSet', 'moment'];
clbConfirm.$inject = ['$rootScope', '$uibModal'];
clbErrorDialog.$inject = ['$uibModal', 'clbError'];
clbApp.$inject = ['$log', '$q', '$rootScope', '$timeout', '$window', 'clbError'];
authProvider.$inject = ['clbAppHello', 'clbEnvProvider'];
clbAuthHttp.$inject = ['$http', 'clbAuth'];
ActivityController.$inject = ['$scope', '$sce', '$log', '$window', '$q', '$compile', 'clbResourceLocator', 'clbErrorDialog'];
FeedController.$inject = ['$rootScope', 'clbStream', 'clbUser'];
clbUsercardPopoverDirective.$inject = ['$log', '$q', 'clbUser', 'clbUsercardPopover'];
clbUserCardPopoverService.$inject = ['$rootScope'];
clbUsercard.$inject = ['lodash'];
clbUsercardCacheTemplate.$inject = ['$templateCache'];
clbError.$inject = ['$q'];
clbFileBrowserPath.$inject = ['clbStorage'];
clbFileBrowser.$inject = ['lodash'];
clbFileChooser.$inject = ['$q', '$log'];
angular.module('hbpCollaboratoryCore', [
  'clb-app',
  'clb-automator',
  'clb-collab',
  'clb-ctx-data',
  'clb-env',
  'clb-error',
  'clb-identity',
  'clb-rest',
  'clb-storage',
  'clb-stream'
]);

/**
 * Module to load the UI part of angular-hbp-collaboratory. Try to use the
 * sub-modules instead.
 * @module hbpCollaboratoryUI
 */
angular.module('hbpCollaboratoryUI', [
  'clb-ui-dialog',
  'clb-ui-error',
  'clb-ui-form',
  'clb-ui-identity',
  'clb-ui-loading',
  'clb-ui-storage',
  'clb-ui-stream'
]);

/**
 * @namespace hbpCollaboratory
 * @desc
 * ``hbpCollaboratory`` module is a shell around various AngularJS modules that
 *  interface with the HBP Collaboratory. It loads both the core modules and
 *  the UI modules, as well as the backward compatibility modules.
 */
angular.module('hbpCollaboratory', [
  'hbpCollaboratoryCore',
  'hbpCollaboratoryUI'
]);

/**
 * @typedef {string} UUID A string formatted as a valid UUID4
 */

/**
 * @module clb-auth
 * @desc
 * ``clb-auth`` provides a library based on hello.js
 * to authenticate into the Collaboratory.
 */
angular.module('clb-auth', ['clb-env']);

/**
 * @module clb-automator
 * @desc
 * `clb-automator` module provides an automation library for the Collaboratory
 * using the AngularJS service :ref:`clbAutomator <module-clb-automator.clbAutomator>`.
 * It supports object describing a serie of actions that have to be run
 * either concurrently or sequentially.
 *
 * It is used for example to script the creation of new custom collab in
 * the `Create New Collab` functionality in `collaboratory-extension-core`.
 */
angular.module('clb-automator', [
  'clb-app',
  'clb-env',
  'clb-error',
  'clb-collab',
  'clb-storage'
]);

/**
 * @module clb-collab
 * @desc
 * Contain services to interact with collabs (e.g.: retriving collab informations or
 * team members).
 */
angular.module('clb-collab', [
  'lodash',
  'clb-app',
  'clb-env',
  'clb-error',
  'clb-identity',
  'clb-rest',
  'uuid4'
]);

/**
 * Provides a key value store where keys are context UUID
 * and values are string.
 *
 * @module clb-context-data
 */
angular.module('clb-ctx-data', ['uuid4', 'clb-app', 'clb-env', 'clb-error']);

/**
 * @module clb-env
 * @desc
 * ``clb-env`` module provides a way to information from the global environment.
 */

angular.module('clb-env', []);

angular.module('clb-identity', [
  'lodash',
  'clb-app',
  'clb-env',
  'clb-error',
  'clb-rest'
]);

/* global _ */
/**
 * Fix some compatibility issues with previous angular-hbp-common.
 * @module lodash
 * @private
 */
angular.module('lodash', [])
.constant('lodash', _)
.run(['$log', 'lodash', function($log, lodash) {
  // keep lodash compatibility with older versions
  if (!lodash.indexBy) {
    $log.debug('define some lodash 3 functions from lodash 3');
    lodash.indexBy = lodash.keyBy;
    lodash.pluck = lodash.map;
  }
  if (!lodash.keyBy) {
    $log.debug('define some lodash 4 functions from lodash 3');
    lodash.keyBy = lodash.indexBy;
  }
}]);

/**
 * @module clb-rest
 * @desc
 * ``clb-rest`` module contains util for simplifying access to Rest service.
 */
angular.module('clb-rest', ['clb-app', 'clb-error']);

/**
 * @module clb-storage
 * @desc
 * The ``clb-storage`` module contains tools needed to access and work with the
 * HBP Document Service. It is targeted to integrate easily with the HBP
 * Collaboratory, even if the service is more generic.
 */
angular.module('clb-storage', [
  'uuid4',
  'clb-error',
  'clb-env',
  'clb-rest',
  'clb-identity'
]);

/**
 * @module clb-stream
 * @desc
 * The `clb-stream` module contains a service and a few directives to retrieve
 * and display the HBP Collaboratory stream provided
 * by the various applications.
 */

angular.module('clb-stream', [
  'clb-app',
  'clb-env',
  'clb-error',
  'clb-rest',
  'clb-identity',
  'angularMoment'
]);

/**
 * @module clb-ui-dialog
 */
angular.module('clb-ui-dialog', ['ui.bootstrap.modal']);

/**
 * @module clb-ui-error
 */
angular.module('clb-ui-error', [
  'clb-error',
  'ui.bootstrap.alert',
  'ui.bootstrap.modal',
  'uib/template/alert/alert.html'
]);

/**
 * @module clb-ui-form
 * @desc
 * clb-ui-form provides directive to ease creation of forms.
 */
angular.module('clb-ui-form', []);

/**
 * Provides a simple loading directive.
 * @module clb-ui-loading
 */
angular.module('clb-ui-loading', []);

/* global hello */

/**
 * @module clb-app
 * @desc
 * ``clb-app`` module provides utilities to retrieve current
 * HBP Collaboratory Context in an app and to communicate with the current
 * Collaboratory instance.
 *
 * This module must be bootstraped using ``angular.clbBootstrap`` function as
 * it needs to load the global environment loaded in CLB_ENBIRONMENT angular
 * constant.
 */
angular.module('clb-app', ['clb-env', 'clb-error'])
.constant('clbAppHello', hello);

/**
 * @module clb-ui-stream
 */
angular.module('clb-ui-stream', [
  'angularMoment',
  'clb-stream',
  'clb-ui-error'
]);

/**
 * Provides UI widgets around user and groups.
 * @module clb-ui-identity
 */
angular.module('clb-ui-identity', ['lodash', 'clb-identity']);

angular.module('clb-error', []);

/**
 * The ``clb-ui-storage`` module provides Angular directive to work
 * with the HBP Collaboratory storage.
 *
 *
 * Featured Component
 * ------------------
 *
 * - The directive :doc:`clb-file-browser <module-clb-ui-storage.clb-file-browser>`
 *   provides an easy to use browser which let the user upload new files,
 *   create folder and act as file selector.
 * @module clb-ui-storage
 */
angular.module('clb-ui-storage', [
  'ui.bootstrap',
  'clb-ui-error',
  'clb-storage'
]);

/* global hello */
angular.module('clb-auth')
.config(interceptorConfig)
.factory('httpRequestInterceptor', httpRequestInterceptor)
.provider('clbAuth', clbAuth);

function interceptorConfig($httpProvider) {
  $httpProvider.interceptors.push('httpRequestInterceptor');
}

function httpRequestInterceptor($q) {
  return {
    request: function (requestConfig) {
      // TODO: get token from somewhere
      var token = 'TOKEN';
      requestConfig.headers.Authorization = 'Bearer ' + token;
      return requestConfig;
    },
    responseError: function(rejection) {
      // TODO: check bbpOidcClient...
      return $q.reject(rejection);
    }
  };
}

function clbAuth($injector) {
  hello.init({
    hbp: {
      oauth: {
        version: 2,
        auth: 'https://services.humanbrainproject.eu/oidc/authorize',
        grant: 'https://services.humanbrainproject.eu/oidc/token'
      },
      scope: {
        basic: 'openid profiles'
      },
      scope_delim: ' ',
      get: {
        me: 'userinfo'
      },
      base: 'https://services.humanbrainproject.eu/oidc/'
    }
  }, {client_id: 'portal-client', redirect_uri: document.URL});
  return {
    $get: function() {
      return hello('hbp');
    }
  };
}

angular.module('clb-automator')
.factory('clbAutomator', clbAutomator);

/**
 * @namespace Tasks
 * @memberof module:clb-automator
 * @desc
 * Document a list of available tasks.
 */

/**
 * @namespace clbAutomator
 * @memberof module:clb-automator
 * @desc
 * clbAutomator is an AngularJS factory that
 * provide task automation to accomplish a sequence of
 * common operation in Collaboratory.
 *
 * How to add new tasks
 * --------------------
 *
 * New tasks can be added by calling ``clbAutomator.registerHandler``.
 *
 * You can see a few example of tasks in the `tasks` folder.
 *
 * Evaluate the automator
 * ----------------------
 *
 * From the root of this project, you can start a server that will let
 * you write a descriptor and run it.
 *
 * .. code-block:: bash
 *
 *    gulp example
 *
 * @example <caption>Create a Collab with a few navigation items</caption>
 * // Create a Collab with a few navigation items.
 * angular.module('MyModule', ['clb-automator'])
 * .run(function(clbAutomator, $log) {
 *   var config = {
 *     title: 'My Custom Collab',
 *     content: 'My Collab Content',
 *     private: false
 *   };
 *   clbAutomator.task(config).run().then(function(collab) {
 *   	 $log.info('Created Collab', collab);
 *   });
 * })
 * @example <caption>Create a Collab with entities and navigation items</caption>
 * clbAutomator.run({
 *   "collab": {
 *     "title": "Test Collab Creation",
 *     "content": "My Collab Description",
 *     "private": true,
 *     "after": [
 *       {
 *         "storage": {
 *           "entities": {
 *             // Use one of your file UUID here.
 *             "sample.ipynb": "155c1bcc-ee9c-43e2-8190-50c66befa1fa"
 *           },
 *           "after": [{
 *             "nav": {
 *               "name": "Example Code",
 *               "app": "Jupyter Notebook",
 *               "entity": "sample.ipynb"
 *             }
 *           }]
 *         }
 *       },
 *       {
 *         "nav": {
 *           "name": "Empty Notebook",
 *           "app": "Jupyter Notebook"
 *         }
 *       },
 *       {
 *         "nav": {
 *           "name": "Introduction",
 *           "app": "Rich Text Editor"
 *         }
 *       }
 *     ]
 *   }
 * }).then(function(collab) {
 *   $log.info('Created Collab', collab);
 * });
 *
 * @example <caption>Create a Collab with a pre-filled overview</caption>
 * clbAutomator.run({
 *   "collab": {
 *     "title": "Test Collab With Pre Filled Overview",
 *     "content": "Test collab creation with  a pre filled overview",
 *     "private": true,
 *     "after": [{
 *       "overview": {
 *         // Use one of your HTML file UUID here.
 *         "entity": "155c1bcc-ee9c-43e2-8190-50c66befa1fa"
 *       }
 *     }]
 *   }
 * }).then(function(collab) {
 *   $log.info('Created Collab', collab);
 * });
 * @param {object} $q injected service
 * @param {object} $log injected service
 * @param {object} clbError injected service
 * @return {object} the clbAutomator Angular service singleton
 */
function clbAutomator(
  $q,
  $log,
  clbError
) {
  var handlers = {};

  /**
   * Register a handler function for the given task name.
   * @memberof module:clb-automator.clb-automator
   * @param  {string}   name handle actions with the specified name
   * @param  {Function} fn a function that accept the current context in
   *                       parameter.
   */
  function registerHandler(name, fn) {
    handlers[name] = fn;
  }

  /**
   * Instantiate a new Task intance that will run the code describe for
   * a handlers with the give ``name``.
   *
   * The descriptor is passed to the task and parametrize it.
   * The task context is computed at the time the task is ran. A default context
   * can be given at load time and it will be fed with the result of each parent
   * (but not sibling) tasks as well.
   *
   * @memberof module:clb-automator.clbAutomator
   * @param {string} name the name of the task to instantiate
   * @param {object} [descriptor] a configuration object that will determine
   *                            which task to run and in which order
   * @param {object} [descriptor.after] an array of task to run after this one
   * @param {object} [context] a default context to run the task with
   *
   * @return {Task} - the new task instance
   */
  function task(name, descriptor, context) {
    try {
      return new Task(name, descriptor, context);
    } catch (ex) {
      $log.error('EXCEPTION', ex);
      throw clbError.error({
        type: 'InvalidTask',
        message: 'Invalid task ' + name + ': ' + ex,
        data: {
          cause: ex,
          name: name,
          descriptor: descriptor,
          context: context
        }
      });
    }
  }

  /**
   * Directly generate tasks from given description and run them.
   *
   * @memberof module:clb-automator.clbAutomator
   * @param  {object} descriptor description of the tasks to run
   * @param  {object} [context]  the initial context
   * @return {Promise} promise of the top level task result
   */
  function run(descriptor, context) {
    for (var name in descriptor) {
      if (descriptor.hasOwnProperty(name)) {
        return task(name, descriptor[name], context).run();
      }
    }
    return $q.reject(clbError.error({
      type: 'NoTaskFound',
      message: 'No task found in descriptor',
      data: descriptor
    }));
  }

  /**
   * Create an array of tasks given an array containing object where
   * the key is the task name to run and the value is the descriptor
   * parameter.
   *
   * @memberof module:clb-automator.clbAutomator
   * @param  {object} after the content of ``descriptor.after``
   * @return {Array/Task} array of subtasks
   * @private
   */
  function createSubtasks(after) {
    var subtasks = [];
    if (!after || !after.length) {
      return subtasks;
    }
    for (var i = 0; i < after.length; i++) {
      var taskDef = after[i];
      for (var name in taskDef) {
        if (taskDef.hasOwnProperty(name)) {
          subtasks.push(task(name, taskDef[name]));
        }
      }
    }
    return subtasks;
  }

  /**
   * @class Task
   * @memberof module:clb-automator.clbAutomator
   * @desc
   * Instantiate a task given the given `config`.
   * The task can then be run using the `run()` instance method.
   * @param {string} name the name of the task to instantiate
   * @param {object} [descriptor] a configuration object that will determine
   *                            which task to run and in which order
   * @param {object} [descriptor.after] an array of task to run after this one
   * @param {object} [context] a default context to run the task with
   * @see module:clb-automator.task
   *
   */
  function Task(name, descriptor, context) {
    if (!handlers[name]) {
      throw new Error('TaskNotFound');
    }
    descriptor = descriptor || {};
    context = context || {};
    this.state = 'idle';
    this.name = name;
    this.descriptor = descriptor;
    this.defaultContext = context;
    this.state = 'idle';
    this.promise = null;
    this.error = null;
    this.subtasks = createSubtasks(descriptor.after);
  }

  Task.prototype = {
    /**
     * Launch the task.
     *
     * @memberof module:clb-automator.clbAutomator.Task
     * @param {object} context current context will be merged into the default
     *                         one.
     * @return {Promise} promise to return the result of the task
     */
    run: function(context) {
      var self = this;
      // run an intance of task only once.
      if (self.state !== 'idle') {
        return self.promise;
      }
      context = angular.extend({}, this.defaultContext, context);
      var onSuccess = function(result) {
        var subContext = angular.copy(context);
        subContext[self.name] = result;
        return self.runSubtasks(subContext)
        .then(function() {
          self.state = 'success';
          return result;
        });
      };
      var onError = function(err) {
        self.state = 'error';
        // noop operation if is already one
        return $q.reject(clbError.error(err));
      };
      self.state = 'progress';
      self.promise = $q.when(handlers[self.name](self.descriptor, context))
        .then(onSuccess)
        .catch(onError);
      return self.promise;
    },

    /**
     * Run all subtasks of the this tasks.
     *
     * @memberof module:clb-automator.clbAutomator.Task
     * @param  {object} context the current context
     * @return {Array}          all the results in an array
     */
    runSubtasks: function(context) {
      var promises = [];
      angular.forEach(this.subtasks, function(task) {
        promises.push(task.run(context));
      });
      return $q.all(promises);
    }
  };

  /**
   * Return a HbpError when a parameter is missing.
   * @memberof module:clb-automator.clbAutomator
   * @param  {string} key    name of the key
   * @param  {object} config the invalid configuration object
   * @return {HbpError}      a HbpError instance
   * @private
   */
  function missingDataError(key, config) {
    return clbError({
      type: 'KeyError',
      message: 'Missing `' + key + '` key in config',
      data: {
        config: config
      }
    });
  }

  /**
   * Ensure that all parameters listed after config are presents.
   * @memberof module:clb-automator.clbAutomator
   * @param  {object} config task descriptor
   * @return {object} created entities
   */
  function ensureParameters(config) {
    var parameters = Array.prototype.splice(1);
    for (var p in parameters) {
      if (angular.isUndefined(parameters[p])) {
        return $q.reject(missingDataError(p, config));
      }
    }
    return $q.when(config);
  }

  /**
   * Return an object that only contains attributes
   * from the `attrs` list.
   *
   * @memberof module:clb-automator.clbAutomator
   * @param  {object} config key-value store
   * @param  {Array} attrs   a list of keys to extract from `config`
   * @return {object}        key-value store containing only keys from attrs
   *                         found in `config`
   */
  function extractAttributes(config, attrs) {
    var r = {};
    angular.forEach(attrs, function(a) {
      if (angular.isDefined(config[a])) {
        r[a] = config[a];
      }
    });
    return r;
  }

  return {
    run: run,
    task: task,
    handlers: handlers,
    registerHandler: registerHandler,
    extractAttributes: extractAttributes,
    ensureParameters: ensureParameters
  };
}

angular.module('clb-automator')
.run(['$log', '$q', 'clbCollab', 'clbAutomator', function createCollab(
  $log,
  $q,
  clbCollab,
  clbAutomator
) {
  clbAutomator.registerHandler('collab', createCollab);

  /**
   * @function createCollab
   * @memberof module:clb-automator.Tasks
   * @desc
   *  Create a collab defined by the given options.
   * @param {object} descriptor - Parameters to create the collab
   * @param {string} descriptor.name - Name of the collab
   * @param {string} descriptor.description - Description in less than 140 characters
   *                                       of the collab
   * @param {string} [descriptor.privacy] - 'private' or 'public'. Notes that only
   *                                   HBP Members can create private collab
   * @param {Array} [after] - descriptor of subtasks
   * @return {Promise} - promise of a collab
   */
  function createCollab(descriptor) {
    var attr = clbAutomator.extractAttributes(
      descriptor,
      ['title', 'content', 'private']
    );
    $log.debug('Create collab', descriptor);
    return clbCollab.create(attr);
  }
}]);

angular.module('clb-automator')
.run(['$log', 'clbCollabApp', 'clbCollabNav', 'clbAutomator', 'clbStorage', function createNavItem(
  $log,
  clbCollabApp,
  clbCollabNav,
  clbAutomator,
  clbStorage
) {
  clbAutomator.registerHandler('nav', createNavItem);

  /**
   * Create a new nav item.
   * @memberof module:clb-automator.Tasks
   * @param {object} descriptor a descriptor description
   * @param {string} descriptor.name name of the nav item
   * @param {Collab} descriptor.collabId collab in which to add the item in.
   * @param {string} descriptor.app app name linked to the nav item
   * @param {object} [context] the current run context
   * @param {object} [context.collab] a collab instance created previously
   * @return {Promise} promise of a NavItem instance
   */
  function createNavItem(descriptor, context) {
    var collabId = function() {
      return (descriptor && descriptor.collab) ||
        (context && context.collab.id);
    };
    var findApp = function(app) {
      return clbCollabApp.findOne({title: app});
    };
    var createNav = function(app) {
      return clbCollabNav.getRoot(collabId())
      .then(function(parentItem) {
        return clbCollabNav.addNode(collabId(),
          new clbCollabNav.NavItem({
            collab: collabId(),
            name: descriptor.name,
            appId: app.id,
            parentId: parentItem.id
          })
        );
      });
    };
    var linkToStorage = function(nav) {
      if (!descriptor.entity) {
        return nav;
      }
      var setLink = function(entity) {
        return clbStorage.setContextMetadata(entity, nav.context)
        .then(function() {
          return nav;
        });
      };
      // It might be the name used in a previous storage task.
      if (context && context.storage && context.storage[descriptor.entity]) {
        return setLink(context.storage[descriptor.entity]);
      }
      return clbStorage.getEntity(descriptor.entity).then(setLink);
    };

    $log.debug('Create nav item', descriptor, context);

    return clbAutomator.ensureParameters(descriptor, 'app', 'name')
    .then(function() {
      return findApp(descriptor.app)
      .then(createNav)
      .then(linkToStorage);
    });
  }
}]);

angular.module('clb-automator')
.run(['$log', '$q', 'clbAuthHttp', 'clbEnv', 'clbStorage', 'clbError', 'clbAutomator', 'clbCollabNav', 'clbCollabApp', function createOverview(
  $log, $q, clbAuthHttp, clbEnv, clbStorage, clbError,
  clbAutomator, clbCollabNav, clbCollabApp
) {
  clbAutomator.registerHandler('overview', overview);

  /**
   * Set the content of the overview page.
   * If an 'entity' is specified, it will use the content of that storage file
   * If an 'app' name is specified, it will use that app for the overview page
   *
   * The collab is indicated either by an id in `descriptor.collab` or a
   * collab object in `context.collab`.
   *
   * @memberof module:clb-automator.Tasks
   * @param {object} descriptor the task configuration
   * @param {object} [descriptor.collab] id of the collab
   * @param {string} [descriptor.entity] either a label that can be found in
   *                 ``context.entities`` or a FileEntity UUID
   * @param {string} [descriptor.app] the name of an application
   * @param {object} context the current task context
   * @param {object} [context.collab] the collab in which entities will be copied
   * @param {object} [context.entities] a list of entities to lookup in for
   *                   descriptor.entiry value
   * @return {object} created entities where keys are the same as provided in
   *                  config.storage
   */
  function overview(descriptor, context) {
    $log.debug('Set the content of the overview page');
    var collabId = descriptor.collab || context.collab.id;
    var createContentFile = function(overview, descriptor, context) {
      $log.debug('Fill overview page with content from entity');

      return fetchSourceContent(descriptor, context)
        .then(function(source) {
          return clbAuthHttp.post(
            clbEnv.get('api.richtext.v0') + '/richtext/', {
              ctx: overview.context,
              raw: source
            });
        });
    };

    var updateAppId = function(overview, descriptor) {
      $log.debug('Replace the overview page application id');

      return clbCollabApp.findOne({title: descriptor.app})
        .then(function(app) {
          overview.update({appId: app.id});
          return clbCollabNav.saveNode(collabId, overview);
        });
    };

    return clbCollabNav
      .getRoot(collabId)
      .then(function(rootNav) {
        var overview = rootNav.children[0];

        var updateOverview = descriptor.app ?
          updateAppId(overview, descriptor) :
          createContentFile(overview, descriptor, context);

        return updateOverview.then(function() {
          return overview;
        });
      });
  }

  /**
   * Download file entity content.
   *
   * @param {object} descriptor the task configuration
   * @param {string} descriptor.entity either the label to find in
   *                 ``context.entities`` or a the entity UUID.
   * @param {object} context the current task context
   * @param {object} context.entities optional entities in which to lookup for one
   * @return {Promise} the promise of the entity content string
   * @private
   */
  function fetchSourceContent(descriptor, context) {
    var uuid;
    if (context && context.entities && context.entities[descriptor.entity]) {
      uuid = context.entities[descriptor.entity]._uuid;
    } else {
      uuid = descriptor.entity;
    }
    return clbStorage.getContent(uuid);
  }
}]);

angular.module('clb-automator')
.run(['$log', '$q', 'clbError', 'clbAutomator', 'clbStorage', function createStorage(
  $log,
  $q,
  clbError,
  clbAutomator,
  clbStorage
) {
  clbAutomator.registerHandler('storage', storage);

  /**
   * Copy files and folders to the destination collab storage.
   *
   * @memberof module:clb-automator.Tasks
   * @param {object} descriptor the task configuration
   * @param {object} descriptor.storage a object where keys are the file path in the
   *                                new collab and value are the UUID of the
   *                                entity to copy at this path.
   * @param {object} [descriptor.collab] id of the collab
   * @param {object} context the current task context
   * @param {object} [context.collab] the collab in which entities will be copied
   * @return {object} created entities where keys are the same as provided in
   *                  config.storage
   */
  function storage(descriptor, context) {
    return clbAutomator.ensureParameters(
      descriptor, 'entities'
    ).then(function() {
      return clbStorage
        .getEntity({collab: descriptor.collab || context.collab.id})
        .then(function(projectEntity) {
          var promises = {};
          angular.forEach(descriptor.entities, function(value, name) {
            if (angular.isString(value)) {
              $log.debug("Copy entity with UUID", value);
              promises[name] = (
                clbStorage.copy(value, projectEntity._uuid));
            } else {
              $log.warn('Invalid configuration for storage task', descriptor);
            }
          });
          return $q.all(promises);
        });
    });
  }
}]);

/* eslint camelcase: 0 */

/**
 * @namespace clbCollabApp
 * @memberof module:clb-collab
 * @desc
 * clbCollabApp can be used to find and work with the
 * registered HBP Collaboratory applications.
 */
angular.module('clb-collab')
.constant('folderAppId', '__collab_folder__')
.service('clbCollabApp', ['$q', 'clbAuthHttp', '$cacheFactory', 'clbError', 'clbEnv', 'clbResultSet', function(
  $q, clbAuthHttp, $cacheFactory,
  clbError, clbEnv, clbResultSet
) {
  var appsCache = $cacheFactory('__appsCache__');
  var urlBase = clbEnv.get('api.collab.v0') + '/extension/';
  var apps = null;

  /**
   * @class App
   * @desc client representation of an application
   * @memberof module:clb-collab
   * @param  {object} [attrs] a list of attributes to set to the App instance
   */
  var App = function(attrs) {
    var self = this;
    angular.forEach(attrs, function(v, k) {
      self[k] = v;
    });
  };
  App.prototype = {
    /**
     * Transform an App instance into an object reprensentation compatible with
     * the backend schema. This object can then be easily converted to a JSON
     * string.
     * @memberof module:clb-collab.App
     * @return {object} server representation of an App instance
     */
    toJson: function() {
      return {
        id: this.id,
        description: this.description,
        edit_url: this.editUrl,
        run_url: this.runUrl,
        title: this.title
      };
    }
  };

  /**
   * Create an app instance from a server representation.
   * @memberof module:clb-collab.App
   * @param  {object} json converted from the server JSON string
   * @return {App} the new App instance
   */
  App.fromJson = function(json) {
    /* jshint camelcase: false */
    return new App({
      id: json.id,
      deleted: json.deleted,
      description: json.description,
      editUrl: json.edit_url,
      runUrl: json.run_url,
      title: json.title,
      createdBy: json.created_by
    });
  };

  appsCache.put('__collab_folder__', {
    id: '__collab_folder__',
    title: 'Folder'
  });

  var loadAll = function(promise) {
    return promise.then(function(rs) {
      if (rs.hasNext) {
        return loadAll(rs.next());
      }
      apps = rs.results;
      return apps;
    });
  };

  /**
   * @memberof module:clb-collab.clbCollabApp
   * @return {Promise} promise of the list of all applications
   */
  var list = function() {
    if (!apps) {
      return loadAll(clbResultSet.get(clbAuthHttp.get(urlBase), {
        factory: App.fromJson
      }));
    }
    return $q.when(apps);
  };

  /**
   * Retrieve an App instance from its id.
   * @memberof module:clb-collab.clbCollabApp
   * @param  {number} id the app id
   * @return {Promise} promise of an app instance
   */
  var getById = function(id) {
    if (!id) {
      return $q.when(null);
    }
    var ext = appsCache.get(id);
    if (ext) {
      return $q.when(ext);
    }
    return clbAuthHttp.get(urlBase + id + '/').then(function(res) {
      appsCache.put(id, App.fromJson(res.data));
      return appsCache.get(id);
    }, function(res) {
      return $q.reject(clbError.httpError(res));
    });
  };

  /**
   * @memberof module:clb-collab.clbCollabApp
   * @param  {object} params query parameters
   * @return {Promise} promise of an App instance
   */
  var findOne = function(params) {
    return clbAuthHttp.get(urlBase, {params: params}).then(function(res) {
      var results = res.data.results;
      // Reject if more than one results
      if (results.length > 1) {
        return $q.reject(clbError.error({
          type: 'TooManyResults',
          message: 'Multiple apps has been retrieved ' +
                   'when only one was expected.',
          data: res.data
        }));
      }
      // Null when no result
      if (results.length === 0) {
        return null;
      }
      // Build the app if exactly one result
      var app = App.fromJson(results[0]);
      appsCache.put(app.id, app);
      return app;
    }, clbError.rejectHttpError);
  };

  return {
    list: list,
    getById: getById,
    findOne: findOne
  };
}]);

/* eslint camelcase:[2, {properties: "never"}] */

/**
 * @namespace clbCollabNav
 * @memberof module:clb-collab
 * @desc clbCollabNav provides tools to create and manage
 *       navigation items.
 */
angular.module('clb-collab')
.service('clbCollabNav', ['$q', 'clbAuthHttp', '$log', '$cacheFactory', '$timeout', 'orderByFilter', 'uuid4', 'clbEnv', 'clbError', function($q, clbAuthHttp, $log,
    $cacheFactory, $timeout, orderByFilter, uuid4,
    clbEnv, clbError) {
  var collabApiUrl = clbEnv.get('api.collab.v0') + '/collab/';
  // a cache with individual nav items
  var cacheNavItems = $cacheFactory('navItem');

  // a cache with the promises of each collab's nav tree root
  var cacheNavRoots = $cacheFactory('navRoot');

  /**
   * @class NavItem
   * @desc
   * Client representation of a navigation item.
   * @memberof module:clb-collab.clbCollabNav
   * @param  {object} attr attributes of the new instance
   */
  var NavItem = function(attr) {
    var self = this;
    angular.forEach(attr, function(v, k) {
      self[k] = v;
    });
    if (angular.isUndefined(this.context)) {
      this.context = uuid4.generate();
    }
    if (angular.isUndefined(this.children)) {
      this.children = [];
    }
  };
  NavItem.prototype = {
    /**
     * @desc
     * Return a server object representation that can be easily serialized
     * to JSON and send to the backend.
     * @memberof module:clb-collab.clbCollabNav.NavItem
     * @return {object} server object representation
     */
    toJson: function() {
      /* jshint camelcase: false */
      return {
        id: this.id,
        app_id: this.appId,
        collab: this.collabId,
        name: this.name,
        context: this.context,
        order_index: this.order,
        type: this.type || (this.folder ? 'FO' : 'IT'),
        parent: this.parentId
      };
    },
    /**
     * @memberof module:clb-collab.clbCollabNav.NavItem
     * @param  {object} attrs NavItem instance attributes
     * @return {NavItemt} this instance
     */
    update: function(attrs) {
      angular.forEach([
        'id', 'name', 'children', 'context',
        'collabId', 'appId', 'order', 'folder',
        'parentId', 'type'
      ], function(a) {
        if (angular.isDefined(attrs[a])) {
          this[a] = attrs[a];
        }
      }, this);

      return this;
    },
    /**
     * @memberof module:clb-collab.clbCollabNav.NavItem
     * @return {NavItem} this instance
     * @private
     */
    ensureCached: function() {
      cacheNavItems.put(key(this.collabId, this.id), this);
      return this;
    }
  };
  /**
   * Manage `acc` accumulator with all the data from jsonArray and return it.
   *
   * @param  {int} collabId  the collab ID
   * @param  {array} jsonArray description of the children
   * @param  {Array} acc       the accumulator
   * @return {Array}           the children
   */
  function childrenFromJson(collabId, jsonArray, acc) {
    acc = acc || [];
    // an undefined array means we abort the process
    // where an empty array will ensure the resulting array
    // is empty as well.
    if (angular.isUndefined(jsonArray)) {
      return acc;
    }

    acc.length = 0;
    angular.forEach(jsonArray, function(json) {
      acc.push(NavItem.fromJson(collabId, json));
    });
    return acc;
  }
  /**
   * Build an instance from the server object representation.
   *
   * @memberof module:clb-collab.clbCollabNav.NavItem
   * @param  {number} collabId collab ID
   * @param  {string} json server object representation
   * @return {NavItem} new instance of NavItem
   */
  NavItem.fromJson = function(collabId, json) {
    /* jshint camelcase: false */
    var attrs = {
      id: json.id,
      appId: json.app_id,
      collabId: collabId,
      name: json.name,
      context: json.context,
      order: json.order_index,
      folder: json.type === 'FO',
      type: json.type,
      parentId: json.parent,
      children: childrenFromJson(collabId, json.children)
    };
    var k = key(collabId, attrs.id);
    var cached = cacheNavItems.get(k);
    if (cached) {
      return cached.update(attrs);
    }
    return new NavItem(attrs).ensureCached();
  };

  /**
   * Retrieve the root item of the given collab.
   *
   * @memberof module:clb-collab.clbCollabNav
   * @param  {number} collabId collab ID
   * @return {Promise} promise the root nav item
   */
  var getRoot = function(collabId) {
    var treePromise = cacheNavRoots.get(collabId);

    if (!treePromise) {
      treePromise = clbAuthHttp.get(collabApiUrl + collabId + '/nav/all/').then(
        function(resp) {
          var root;
          var i;
          var item;
          var data = orderByFilter(resp.data, '+order_index');

          // fill in the cache
          for (i = 0; i !== data.length; ++i) {
            item = NavItem.fromJson(collabId, data[i]);
            if (item.context === 'root') {
              root = item;
            }
          }

          // link children and parents
          for (i = 0; i !== data.length; ++i) {
            item = cacheNavItems.get(key(collabId, data[i].id));
            if (item.parentId) {
              var parent = cacheNavItems.get(key(collabId, item.parentId));
              parent.children.push(item);
            }
          }

          return root;
        },
        clbError.rejectHttpError
      );

      cacheNavRoots.put(collabId, treePromise);
    }

    return treePromise;
  };

  /**
   * @memberof module:clb-collab.clbCollabNav
   * @param  {number} collabId collab ID
   * @param  {number} nodeId   node ID
   * @return {NavItem} the matching nav item
   */
  var getNode = function(collabId, nodeId) {
    return getRoot(collabId).then(function() {
      var k = key(collabId, nodeId);
      var item = cacheNavItems.get(k);

      if (!item) {
        $log.error('unknown nav item', k);
      }

      return item;
    });
  };

  /**
   * @memberof module:clb-collab.clbCollabNav
   * @param  {str} ctx The context UUID
   * @return {Promise}   The promise of a NavItem
   */
  var getNodeFromContext = function(ctx) {
    var url = [
      clbEnv.get('api.collab.v0'),
      'collab/context',
      ctx
    ].join('/') + '/';
    return clbAuthHttp.get(url)
    .then(function(res) {
      var nav = NavItem.fromJson(res.data.collab.id, res.data);
      var k = key(nav.collabId, nav.id);
      if (cacheNavItems.get(k)) {
        nav = cacheNavItems.get(k).update(nav);
      } else {
        cacheNavItems.put(k, nav);
      }
      return nav;
    }, function(res) {
      return $q.reject(clbError.rejectHttpError(res));
    });
  };

  /**
   * @memberof module:clb-collab.clbCollabNav
   * @param  {number} collabId collab ID
   * @param  {number} navItem  the NavItem instance to add to the navigation
   * @return {Promise} promise of the added NavItem instance
   */
  var addNode = function(collabId, navItem) {
    return clbAuthHttp.post(collabApiUrl + collabId + '/nav/', navItem.toJson())
    .then(function(resp) {
      return NavItem.fromJson(collabId, resp.data);
    }, clbError.rejectHttpError);
  };

  /**
   * @memberof module:clb-collab.clbCollabNav
   * @param  {number} collabId collab ID
   * @param  {NavItem} navItem the NavItem instance to remove from the navigation
   * @return {Promise} promise of an undefined item at the end
   */
  var deleteNode = function(collabId, navItem) {
    return clbAuthHttp.delete(
      collabApiUrl + collabId + '/nav/' + navItem.id + '/')
    .then(function() {
      cacheNavItems.remove(key(collabId, navItem.id));
    }, clbError.rejectHttpError);
  };

  /**
   * @memberof module:clb-collab.clbCollabNav
   * @param  {number} collabId collab ID
   * @param  {NavItem} navItem the instance to update
   * @return {Promise} promise the updated instance
   */
  var update = function(collabId, navItem) {
    navItem.collabId = collabId;
    return clbAuthHttp.put(collabApiUrl + collabId + '/nav/' +
      navItem.id + '/', navItem.toJson())
    .then(function(resp) {
      return NavItem.fromJson(collabId, resp.data);
    }, clbError.rejectHttpError);
  };

  // ordering operation needs to be globally queued to ensure consistency.
  var insertQueue = $q.when();

  /**
   * Insert node in the three.
   *
   * A queue is used to ensure that the insert operation does not conflict
   * on a single client.
   *
   * @memberof module:clb-collab.clbCollabNav
   * @param  {int} collabId   id of the collab
   * @param  {NavItem} navItem    Nav item instance
   * @param  {NavItem} parentItem parent item
   * @param  {int} insertAt   add to the menu
   * @return {Promise}        a promise that will
   *                          return the update nav item
   */
  function insertNode(collabId, navItem, parentItem, insertAt) {
    return insertQueue.then(function() {
      // first item order_index must be 1
      navItem.order = (insertAt === -1 ? 1 : insertAt + 1);
      navItem.parentId = parentItem.id;
      return update(collabId, navItem);
    });
  }

  /**
   * Return a unique key for chaching a nav item.
   * @param  {int} collabId collab ID
   * @param  {int} nodeId   NavItem ID
   * @return {string}       the unique key
   * @private
   */
  function key(collabId, nodeId) {
    return collabId + '--' + nodeId;
  }

  return {
    NavItem: NavItem,
    getRoot: getRoot,
    getNode: getNode,
    getNodeFromContext: getNodeFromContext,
    addNode: addNode,
    saveNode: update,
    deleteNode: deleteNode,
    insertNode: insertNode
  };
}]);

angular.module('clb-collab')
.factory('clbCollabTeamRole', clbCollabTeamRole);

/**
 * @namespace clbCollabTeamRole
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp    Angular DI
 * @param  {object} $log     Angular DI
 * @param  {object} $q       Angular DI
 * @param  {object} clbEnv   Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}          Angular Service
 */
function clbCollabTeamRole(clbAuthHttp, $log, $q, clbEnv, clbError) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var rolesCache = {};

  return {
    get: get,
    set: set
  };

  /**
   * Retrieve the role of a user.
   * @param  {int}    collabId  Collab ID
   * @param  {string} userId    User ID
   * @return {string}           The user role
   */
  function get(collabId, userId) {
    if (!userId) {
      $log.error('Must provide userId: ', collabId, userId);
      return;
    }
    if (!rolesCache[collabId]) {
      rolesCache[collabId] = {};
    }
    if (rolesCache[collabId] && rolesCache[collabId][userId]) {
      return $q.when(rolesCache[collabId][userId]);
    }
    return clbAuthHttp.get(collabUrl + collabId + '/team/role/' + userId + '/')
    .then(function(res) {
      rolesCache[collabId][userId] = res.data.role;
      return $q.when(rolesCache[collabId][userId]);
    }, function(res) {
      if (res.status === 404) {
        rolesCache[collabId][userId] = undefined;
        return $q.when(rolesCache[collabId][userId]);
      }
      clbError.rejectHttpError(res);
    });
  }

  /**
   * Set the role of a User within a Collab.
   * @param {int} collabId    Collab ID
   * @param {string} userId   User ID
   * @param {string} role     Role description
   * @return {Promise}        Resolve when the role is set.
   */
  function set(collabId, userId, role) {
    var thisUrl = collabUrl + collabId + '/team/role/' + userId + '/';
    if (rolesCache[collabId] && rolesCache[collabId][userId]) {
      rolesCache[collabId][userId] = role;
      return clbAuthHttp.put(thisUrl, {role: role})
      .catch(function(resp) {
        if (resp.status === 404) { // should have been a POST...
          return clbAuthHttp.post(thisUrl, {role: role})
          .catch(clbError.rejectHttpError);
        }
        return clbError.rejectHttpError(resp);
      });
    }
    if (!rolesCache[collabId]) {
      rolesCache[collabId] = {};
    }
    rolesCache[collabId][userId] = role;
    return clbAuthHttp.post(thisUrl, {role: role})
    .catch(clbError.rejectHttpError);
  }
}

angular.module('clb-collab')
.factory('clbCollabTeam', clbCollabTeam);

/**
 * Angular client to access Collab Team REST endpoint.
 *
 * @namespace clbCollabTeam
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp             Angular DI
 * @param  {object} $log              Angular DI
 * @param  {object} $q                Angular DI
 * @param  {object} lodash            Angular DI
 * @param  {object} clbEnv            Angular DI
 * @param  {object} clbError          Angular DI
 * @param  {object} clbCollabTeamRole Angular DI
 * @param  {object} clbUser           Angular DI
 * @return {object}                   Angular Service
 */
function clbCollabTeam(
  clbAuthHttp,
  $log,
  $q,
  lodash,
  clbEnv,
  clbError,
  clbCollabTeamRole,
  clbUser
) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';

  return {
    add: add,
    delete: remove, // backward compatibility
    remove: remove,
    list: list,
    userInTeam: userInTeam,
    roles: clbCollabTeamRole // backward compatibility
  };

  /**
   * Add a team member to a Collab.
   * @param  {int} collabId the Collab id
   * @param  {string} userId the User id
   * @return {Promise} resolve after the user has been added
   */
  function add(collabId, userId) {
    return clbAuthHttp.put(collabUrl + collabId + '/team/', {
      users: [userId]
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Remove a team member from a Collab.
   * @param  {int} collabId the Collab id
   * @param  {string} userId the User id
   * @return {Promise} resolve after the user has been added
   */
  function remove(collabId, userId) {
    return clbAuthHttp({
      method: 'DELETE',
      url: collabUrl + collabId + '/team/',
      data: {users: [userId]},
      headers: {'Content-Type': 'application/json'}
    }).catch(clbError.rejectHttpError);
  }

  /**
   * List team members from the Collab.
   * @param  {int} collabId The collab ID
   * @return {Promise}      Resolve to an array of user with injected membership
   *                        informations.
   */
  function list(collabId) {
    return clbAuthHttp.get(collabUrl + collabId + '/team/')
    .then(function(res) {
      var indexedTeam = lodash.keyBy(res.data, 'user_id');
      return clbUser.list({
        pageSize: 0,
        filter: {
          id: lodash.keys(indexedTeam)
        }
      }).then(function(data) {
        return lodash.reduce(data.results, function(res, user) {
          var membershipInfo = indexedTeam[parseInt(user.id, 10)];
          if (membershipInfo) {
            res.push(angular.extend({}, user, {
              membershipId: membershipInfo.user_id,
              role: membershipInfo.role
            }));
          }
          return res;
        }, []);
      });
    }, clbError.rejectHttpError);
  }

  /**
   * Return true if the current user is in the team
   * @param  {int} collabId The collab ID
   * @return {Promise}      Resolve to a boolean
   */
  function userInTeam(collabId) {
    return clbUser.getCurrentUserOnly().then(function(me) {
      return clbAuthHttp.get(collabUrl + collabId + '/team/')
      .then(function(list) {
        return lodash.keyBy(
          list.data, 'user_id')[parseInt(me.id, 10)] !== undefined;
      });
    });
  }
}

angular.module('clb-collab')
.factory('ClbCollabModel', function() {
  /**
   * Representation of a Collab.
   * @memberof module:clb-collab
   * @param {object} [attributes] initial values
   */
  function ClbCollabModel(attributes) {
    if (!attributes) {
      attributes = {};
    }
    this.id = attributes.id;
    this.created = attributes.created || null;
    this.edited = attributes.edited || null;
    this.title = attributes.title || '';
    this.content = attributes.content || '';
    this.private = attributes.private || false;
    this.deleted = attributes.deleted || null;
  }
  ClbCollabModel.prototype = {
    toJson: function() {
      return {
        id: this.id,
        title: this.title,
        content: this.content,
        private: this.private
      };
    },
    update: function(attrs) {
      angular.forEach(['id', 'title', 'content', 'private'], function(a) {
        if (attrs[a] !== undefined) {
          this[a] = attrs[a];
        }
      }, this);
    }
  };
  ClbCollabModel.fromJson = function(json) {
    if (json.toJson) {
      return json;
    }
    var c = new ClbCollabModel(json);
    return c;
  };
  return ClbCollabModel;
});

/* eslint camelcase:0 */
angular.module('clb-collab')
.factory('clbCollab', clbCollab);

/**
 * @namespace clbCollab
 * @memberof module:clb-collab
 * @desc
 * Provide a javascript client to query the Collab REST service.
 *
 * @param  {object} $log             Angular injection
 * @param  {object} $q               Angular injection
 * @param  {object} $cacheFactory    Angular injection
 * @param  {object} clbAuthHttp            Angular injection
 * @param  {object} lodash           Angular injection
 * @param  {object} clbContext       Angular injection
 * @param  {object} clbEnv           Angular injection
 * @param  {object} clbError         Angular injection
 * @param  {object} clbResultSet     Angular injection
 * @param  {object} clbUser          Angular injection
 * @param  {object} ClbCollabModel   Angular injection
 * @param  {object} ClbContextModel  Angular injection
 * @return {object}                  Angular Service
 */
function clbCollab(
  $log,
  $q,
  $cacheFactory,
  clbAuthHttp,
  lodash,
  clbContext,
  clbEnv,
  clbError,
  clbResultSet,
  clbUser,
  ClbCollabModel,
  ClbContextModel
) {
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var myCollabsUrl = urlBase + '/mycollabs/';
  var collabCache = $cacheFactory('clbCollabInstances');
  var ongoingCollabGetRequests = {};

  return {
    Collab: ClbCollabModel,   // backward compatibility
    Context: ClbContextModel, // backward compatibility
    context: clbContext,      // backward compatibility
    get: get,
    getByLabel: getByLabel,
    list: list,
    mine: mine,
    create: create,
    save: save,
    delete: deleteCollab
  };

  /**
   * Retrieve the promise of an ongoing request if it exists.
   * @param  {string} key caching key
   * @return {Promise}    the existing promise
   * @private
   */
  function getPromiseFromCache(key) {
    var collab = collabCache.get(key);
    if (collab) {
      return $q.when(collab);
    }
    if (ongoingCollabGetRequests[key]) {
      return ongoingCollabGetRequests[key];
    }
  }

  /**
   * Retrieve a collab.
   * @param  {string} url [description]
   * @param  {string} key cache key to retrieve
   * @return {Promise}    Resolve to a collab
   * @private
   */
  function getter(url, key) {
    if (!key) {
      return $q.reject(clbError.error({message: 'id parameter is required'}));
    }

    var promise = getPromiseFromCache(key);
    if (promise) {
      return promise;
    }

    ongoingCollabGetRequests[key] = clbAuthHttp.get(url + key + '/')
    .then(function(res) {
      ongoingCollabGetRequests[key] = null;
      return ClbCollabModel.fromJson(res.data);
    }, function(res) {
      ongoingCollabGetRequests[key] = null;
      return clbError.rejectHttpError(res);
    });
    return ongoingCollabGetRequests[key];
  }

  /**
   * Retrieve a collab given its id.
   * @param  {int} id the Collab ID
   * @return {Promise}    Will resolve to a ClbCollabModel
   */
  function get(id) {
    id = (id && id.id) || id;
    return getter(collabUrl, id).then(function(collab) {
      collabCache.put(collab.id, collab);
      return collab;
    });
  }

  /**
   * Ensure the collab is in cache for the given label.
   * @param  {ClbCollabModel} collab instance to cache
   * @param  {string} label   the label
   * @return {ClbCollabModel} the cached collab
   * @private
   */
  function cacheCollabWithLabel(collab, label) {
    // ensure the collab is in cache for this label
    // to avoid duplicate reference for it.
    if (!collab._label) {
      collab._label = label;
      collabCache.put(label, collab);
      collabCache.put(collab.id, collab);
    }
    return collab;
  }

  /**
   * Retrieve a collab using a string label.
   * @param  {string} label the label associated to the Collab
   * @return {Promise}      will resolve to a ClbCollabModel instance
   */
  function getByLabel(label) {
    return getter(urlBase + '/r/', label).then(function(collab) {
      // Ensure the collab has not been fetched by id already.
      // This might occurs if the collab was fetched by id the first
      // time. In this case, no way to know its associated label.
      var promise = getPromiseFromCache(collab.id);
      if (promise) {
        return promise.then(function(c) {
          return cacheCollabWithLabel(c, label);
        });
      }
      return cacheCollabWithLabel(collab, label);
    });
  }

  /**
   * @name list
   * @desc
   * list return the a hbpUtil.ResultSet instance containing the collab
   * matching the given parameters.
   *
   * @param {Object} [options] the request options
   * @param {string} [options.search] search string to filter the results
   * @param {(string|string[])} [options.id] string or array of collab ids
   * @param {int}  [options.pageSize=25] number of result per page
   * @param {int}  [options.page] the page to retrive
   * @param {Object} [options.params] DEPRECATED any query parameter
   * @param {string} [options.url] DEPRECATED overide the default URL
   * @return {hbpUtil.ResultSet} a result set of results
   */
  function list(options) {
    var url = collabUrl;
    var request;
    // support old signature (url, options)
    if (angular.isString(options)) {
      url = options;
      options = arguments[1];
    }
    options = angular.extend({}, options);

    if (angular.isArray(options.id)) {
      options.id = options.id.join(',');
    }

    if (options.pageSize) {
      options.page_size = options.pageSize;
    }

    if (options.url) { // Deprecated URL support
      request = clbAuthHttp.get(options.url);
    } else {
      request = clbAuthHttp.get(url, {
        params: angular.extend(
          {},
          options.params,
          lodash.pick(options, ['search', 'id', 'page_size', 'page'])
        )
      });
    }
    return clbResultSet.get(request, {
      resultsFactory: resultsFactory
    });
  }

  /**
   * @name mine
   * @description
   * `mine` return a hbpUtil.ResultSet of the user collabs.
   *
   * @param {Object} [options] request options
   * @param {string} [options.search] search string to filter the results
   * @param {int}  [options.pageSize] number of result per page
   * @param {int}  [options.page] the page to retrive
   * @return {hbpUtil.ResultSet} the current user collabs
   */
  function mine(options) {
    options = angular.extend({}, options);
    var params = angular.extend({}, lodash.pick(options, ['search']));
    return clbResultSet.get(clbAuthHttp.get(myCollabsUrl, {params: params}), {
      resultsFactory: resultsFactory
    });
  }

  /**
   * Create a new collab using a model instance or the server data representation.
   * @param  {object|ClbCollabModel} jsonCollab JSON representation of the new collab
   * @return {Promise}           Resolve to the new Collab
   */
  function create(jsonCollab) {
    var c = ClbCollabModel.fromJson(jsonCollab);
    return clbAuthHttp.post(collabUrl, c.toJson()).then(function(res) {
      c.update(res.data);
      collabCache.put(c.id, c);
      return c;
    }, clbError.rejectHttpError);
  }

  /**
   * Save a collab using its JSON server representation or a collab instance.
   * @param  {object|ClbCollabModel} jsonCollab JSON representation of a Collab
   * @return {Promise}           resolve to the Collab instance.
   */
  function save(jsonCollab) {
    var c = ClbCollabModel.fromJson(jsonCollab);
    return clbAuthHttp.put(collabUrl + c.id + '/', c.toJson())
    .then(function(res) {
      c.update(res.data);
      collabCache.put(c.id, c);
      return c;
    }, clbError.rejectHttpError);
  }

  /**
   * @function delete
   * @desc
   * Delete the collab.
   * @param  {ClbCollabModel} collab The collab instance to delete
   * @return {Promise}       Resolve once the delete operation is completed
   */
  function deleteCollab(collab) {
    return clbAuthHttp.delete(collabUrl + collab.id + '/').then(
      function() {
        collabCache.remove(collab.id);
        if (collab._label) {
          collabCache.remove(collab._label);
        }
      }, clbError.rejectHttpError
    );
  }

  /**
   * Build the instance from a result list.
   *
   * @param  {array} results Array of object
   * @return {array}         Array of Collab
   */
  function resultsFactory(results) {
    return lodash.map(results, ClbCollabModel.fromJson);
  }
}

angular.module('clb-collab')
.factory('ClbContextModel', ['ClbCollabModel', function(ClbCollabModel) {
  /**
   * Representation of a Collab Context.
   * @memberof module:clb-collab
   */
  function ClbContextModel() {}
  ClbContextModel.fromJson = function(json) {
    var c = new ClbContextModel();
    c.context = json.context;
    c.appId = json.app_id;
    c.name = json.name;
    c.navId = json.id;
    c.collab = ClbCollabModel.fromJson(json.collab);
    c.toJson = function() {
      return {
        context: json.context,
        appId: json.app_id,
        name: c.name
      };
    };
    return c;
  };
  return ClbContextModel;
}]);

angular.module('clb-collab')
.factory('clbContext', clbContext);

/**
 * @namespace clbContext
 * @memberof module:clb-collab
 * @param  {object} clbAuthHttp             Angular DI
 * @param  {object} $q                Angular DI
 * @param  {object} clbError          Angular DI
 * @param  {object} clbEnv            Angular DI
 * @param  {class}  ClbContextModel   Angular DI
 * @return {object}                   the service
 */
function clbContext(clbAuthHttp, $q, clbError, clbEnv, ClbContextModel) {
  var ongoingContextRequests = {};
  var urlBase = clbEnv.get('api.collab.v0');
  var collabUrl = urlBase + '/collab/';
  var contextUrl = collabUrl + 'context/';

  return {
    get: get
  };

  /**
   * @memberof module:clb-collab.clbContext
   * @param  {string} uuid UUID of the context
   * @return {Promise}     Resolve to the ClbContextModel instance
   */
  function get(uuid) {
    if (!uuid) {
      return $q.reject(clbError.error({
        message: 'uuid parameter is required'
      }));
    }
    // return the promise of an ongoing request
    if (ongoingContextRequests[uuid]) {
      return ongoingContextRequests[uuid];
    }
    // proceed to the request
    ongoingContextRequests[uuid] =
      clbAuthHttp.get(contextUrl + uuid + '/', {cache: true})
    .then(function(res) {
      ongoingContextRequests[uuid] = null;
      return ClbContextModel.fromJson(res.data);
    }, function(res) {
      ongoingContextRequests[uuid] = null;
      return clbError.rejectHttpError(res);
    });
    return ongoingContextRequests[uuid];
  }
}

angular.module('clb-ctx-data')
.factory('clbCtxData', clbCtxData);

/**
 * A service to retrieve data for a given ctx. This is a convenient
 * way to store JSON data for a given context. Do not use it for
 * Sensitive data. There is no data migration functionality available, so if
 * the expected data format change, you are responsible to handle the old
 * format on the client side.
 *
 * @namespace clbCtxData
 * @memberof clb-ctx-data
 * @param  {object} clbAuthHttp    Angular DI
 * @param  {object} $q       Angular DI
 * @param  {object} uuid4     Angular DI
 * @param  {object} clbEnv   Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}          Angular Service Descriptor
 */
function clbCtxData(clbAuthHttp, $q, uuid4, clbEnv, clbError) {
  var configUrl = clbEnv.get('api.collab.v0') + '/config/';
  return {
    /**
     * Return an Array or an Object containing the data or
     * ``undefined`` if there is no data stored.
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx   the current context UUID
     * @return {Promise}    fullfil to {undefined|object|array}
     */
    get: function(ctx) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.get(configUrl + ctx + '/')
      .then(function(res) {
        try {
          return angular.fromJson(res.data.content);
        } catch (ex) {
          return $q.reject(clbError.error({
            type: 'InvalidData',
            message: 'Cannot parse JSON string: ' + res.data.content,
            code: -2,
            data: {
              cause: ex
            }
          }));
        }
      })
      .catch(function(err) {
        if (err.code === 404) {
          return;
        }
        return clbError.rejectHttpError(err);
      });
    },

    /**
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx The context UUID
     * @param  {array|object|string|number} data JSON serializable data
     * @return {Promise} Return the data when fulfilled
     */
    save: function(ctx, data) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.put(configUrl + ctx + '/', {
        context: ctx,
        content: angular.toJson(data)
      }).then(function() {
        return data;
      })
      .catch(clbError.rejectHttpError);
    },

    /**
     * @memberof module:clb-ctx-data.clbCtxData
     * @param  {UUID} ctx The context UUID
     * @return {Promise}  fulfilled once deleted
     */
    delete: function(ctx) {
      if (!uuid4.validate(ctx)) {
        return $q.reject(invalidUuidError(ctx));
      }
      return clbAuthHttp.delete(configUrl + ctx + '/')
      .then(function() {
        return true;
      })
      .catch(clbError.rejectHttpError);
    }
  };

  /**
   * Generate the appropriate error when context is invalid.
   * @param  {any} badCtx  the wrong ctx
   * @return {HbpError}    The Error
   */
  function invalidUuidError(badCtx) {
    return clbError.error({
      type: 'InvalidArgument',
      message: 'Provided ctx must be a valid UUID4 but is: ' + badCtx,
      data: {
        argName: 'ctx',
        argPosition: 0,
        argValue: badCtx
      },
      code: -3
    });
  }
}

/* global window */

angular.module('clb-env')
.provider('clbEnv', clbEnv);

/**
 * Get environement information using dotted notation with the `clbEnv` provider
 * or service.
 *
 * Before being used, clbEnv must be initialized with the context values. You
 * can do so by setting up a global bbpConfig variable or using
 * :ref:`angular.clbBootstrap <angular.clbBootstrap>`.
 *
 * @function clbEnv
 * @memberof module:clb-env
 * @param {object} $injector AngularJS injection
 * @return {object} provider
 * @example <caption>Basic usage of clbEnv</caption>
 * angular.module('myApp', ['clbEnv', 'rest'])
 * .service('myService', function(clbEnv, clbResultSet) {
 *   return {
 *     listCollab: function() {
 *       // return a paginated list of all collabs
 *       return clbResultSet.get($http.get(clbEnv.get('api.collab.v0') + '/'));
 *     }
 *   };
 * });
 * @example <caption>Use clbEnv in your configuration</caption>
 * angular.module('myApp', ['clbEnv', 'rest'])
 * .config(function(clbEnvProvider, myAppServiceProvider) {
 *   // also demonstrate how we accept a custom variable.
 *   myAppServiceProvider.setMaxFileUpload(clbEnvProvider.get('myapp.maxFileUpload', '1m'))
 * });
 */
function clbEnv($injector) {
  return {
    get: get,
    $get: function() {
      return {
        get: get
      };
    }
  };

  /**
   * ``get(key, [defaultValue])`` provides configuration value loaded at
   * the application bootstrap.
   *
   * Accept a key and an optional default
   * value. If the key cannot be found in the configurations, it will return
   * the provided default value. If the defaultValue is undefied, it will
   * throw an error.
   *
   * To ensures that those data are available when angular bootstrap the
   * application, use angular.clbBootstrap(module, options).
   *
   * @memberof module:clb-env.clbEnv
   * @param {string} key the environment variable to retrieve, using a key.
   * @param {any} [defaultValue] an optional default value.
   * @return {any} the value or ``defaultValue`` if the asked for configuration
   *               is not defined.
   */
  function get(key, defaultValue) {
    var parts = key.split('.');
    var cursor = (window.bbpConfig ?
                  window.bbpConfig : $injector.get('CLB_ENVIRONMENT'));
    for (var i = 0; i < parts.length; i++) {
      if (!(cursor && cursor.hasOwnProperty(parts[i]))) {
        if (defaultValue !== undefined) {
          return defaultValue;
        }
        throw new Error('UnkownConfigurationKey: <' + key + '>');
      }
      cursor = cursor[parts[i]];
    }
    return cursor;
  }
}

angular.module('clb-identity')
.factory('clbGroup', clbGroup);

/**
 * ``clbGroup`` service let you retrieve and edit groups.
 *
 * @namespace clbGroup
 * @memberof module:clb-identity
 * @param  {object} $rootScope      Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $cacheFactory   Angular DI
 * @param  {object} lodash          Angular DI
 * @param  {object} clbEnv          Angular DI
 * @param  {object} clbError        Angular DI
 * @param  {object} clbResultSet    Angular DI
 * @param  {object} clbIdentityUtil Angular DI
 * @return {object} Angular Service
 */
function clbGroup(
  $rootScope,
  $q,
  clbAuthHttp,
  $cacheFactory,
  lodash,
  clbEnv,
  clbError,
  clbResultSet,
  clbIdentityUtil
) {
  var groupsCache = $cacheFactory('hbpGroupsCache');
  var groupUrl = clbEnv.get('api.user.v1') + '/group';

  var service = {
    get: get,
    getByName: getByName,
    create: createGroup,
    update: updateGroup,
    delete: deleteGroup,
    getMembers: getMembers,
    getEpflSyncMembers: getEpflSyncMembers,
    getMemberGroups: getMemberGroups,
    getAdmins: getAdmins,
    getAdminGroups: getAdminGroups,
    getParentGroups: getParentGroups,
    getManagedGroups: getManagedGroups,
    list: list,
    search: search
  };

  lodash.each(['members', 'admins', 'member-groups', 'admin-groups'],
    function(rel) {
      var batchQuery = function(groupName, relIds, method) {
        relIds = lodash.isArray(relIds) ? relIds : [relIds];
        return $q.all(lodash.map(relIds, function(relId) {
          var url = [groupUrl, groupName, rel, relId].join('/');
          return clbAuthHttp({
            method: method,
            url: url
          }).then(function() {
            return relId;
          });
        })).catch(clbError.rejectHttpError);
      };
      service[lodash.camelCase('add-' + rel)] = function(groupName, relIds) {
        return batchQuery(groupName, relIds, 'POST');
      };
      service[lodash.camelCase('remove-' + rel)] = function(groupName, relIds) {
        return batchQuery(groupName, relIds, 'DELETE');
      };
    }
  );

  return service;

  /**
   * Return pagination config to pass to ``clbResultSet.get``.
   * @param  {string} pluralType Plural form to look for in the results
   * @param  {function} factory  Factory function to use to build a batch of results
   * @return {object}            Options to pass to ``clbResultSet.get``
   */
  function paginationOptions(pluralType, factory) {
    return {
      nextUrlKey: '_links.next.href',
      previousUrlKey: '_links.prev.href',
      resultKey: '_embedded.' + pluralType,
      countKey: 'page.totalElements',
      resultsFactory: factory
    };
  }

  /**
   * @name get
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a group
   * based on the given `id`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String} groupId name of the group
   * @return {Promise} a promise that resolves to a group
   */
  function get(groupId) {
    return clbAuthHttp.get(groupUrl + '/' + groupId).then(function(resp) {
      return resp.data;
    }, clbError.rejectHttpError);
  }

  /**
   * @name getMembers
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of user
   * representing all the members of `groupId`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupId name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @param  {string} [options.sort] sort key as ``'attributeName,DESC'`` or ``'attributeName,ASC'``
   * @return {Promise} resolve to a ResultSet instance
   */
  function getMembers(groupId, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupId + '/members', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getEpflSyncMembers
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of user
   * representing all the epfl syncronized members of a group.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getEpflSyncMembers(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/epfl-synced-members', {
        params: clbIdentityUtil.queryParams()
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getMemberGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group members of `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getMemberGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/member-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getAdmins
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can administrate `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getAdmins(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/admins', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('users', options.factory)
    );
  }

  /**
   * @name getAdminGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can administrate `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getAdminGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/admin-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getParentGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that are parent to the current `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getParentGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/parent-groups', {
        params: clbIdentityUtil.queryParams()
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name getManagedGroups
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve to a paginatedResultSet of groups
   * representing all the group that can be administred by `groupName`.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {String}  groupName name of the group
   * @param  {object}  [options] query options
   * @param  {function} [options.factory] a function called with a list of
   *                    result to build
   * @return {Promise} resolve to a ResultSet instance
   */
  function getManagedGroups(groupName, options) {
    options = angular.extend({}, options);
    return clbResultSet.get(
      clbAuthHttp.get(groupUrl + '/' + groupName + '/managed-groups', {
        params: clbIdentityUtil.queryParams(options)
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * @name create
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve when the group has been created.
   *
   * In case of error, the promise is rejected with an HbpError instance.
   *
   * @param  {string} name the group name
   * @param {string} description the group description
   * @return {Promise} promise of creation completion
   */
  function createGroup(name, description) {
    return clbAuthHttp.post(groupUrl, {
      name: name,
      description: description
    })
    .then(function(res) {
      return res.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Update the given group.
   *
   * @param  {object} group a group object with a `name` and a `description`
   * @return {Promise} resolve to the updated group once the operation is complete
   */
  function updateGroup(group) {
    return clbAuthHttp.patch(groupUrl + '/' + group.name, {
      // only description field can be updated
      description: group.description
    })
    .then(function(res) {
      return angular.extend(group, res.data);
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * @name create
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Return a promise that will resolve when the group has been created.
   *
   * In case of error, the promise is rejected with an HbpError instance.
   *
   * @param {string} groupId name the group
   * @return {Promise} promise of creation completion
   */
  function deleteGroup(groupId) {
    return clbAuthHttp.delete(groupUrl + '/' + groupId)
    .then(function() {
      return;
    })
    .catch(function(res) {
      return $q.reject(clbError.httpError(res));
    });
  }

  /**
   * @name getByName
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * return the group with the given name.
   * @param {String} groupName name of the group
   * @param {Array}  userIds a list of user id string to add to this group
   * @return {Promise} resolve to a group instance
   */
  function getByName(groupName) {
    var group = groupsCache.get(groupName);
    if (group) {
      return $q.when(group);
    }
    return list({
      filter: {name: groupName}
    }).then(function(resp) {
      var result;
      if (resp.results.length === 1) {
        groupsCache.put(groupName, resp.results[0]);
        result = resp.results[0];
      } else if (resp.results.length === 0) {
        result = undefined;
      } else {
        result = $q.reject(clbError.error({
          type: 'UnexpectedResult',
          message: 'More than one result has been retrieved'
        }));
      }
      return result;
    });
  }

  /**
   * @name list
   * @memberOf module:clb-identity.clbGroup
   * @desc
   * Retrieves a list of users filtered, sorted and paginated according to the options.
   *
   * The returned promise will be resolved with the list of fetched user profiles.
   *
   * Available options:
   *
   * - sort: properties to sort on. prepend '-'' to reverse order.
   * - page: page to be loaded (default: 0)
   * - pageSize: max number or items to be loaded (default: 10)
   * - filter: fiter object, wildcard admitted in the values
   * - factory: a function to be used to create object instance from the
   *            one result
   * @param  {object} options query options (see `available options`)
   * @return {Promise} resolves to a ResultSet instance
   */
  function list(options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = groupUrl;

    if (options.filter) { // search
      var supportedFilters = ['name', 'description'];
      url += '/search?';
      for (var k in options.filter) {
        if (options.filter.hasOwnProperty(k)) {
          if (supportedFilters.indexOf(k) === -1) {
            return $q.reject(clbError.error({
              type: 'FilterNotSupportedError',
              message: 'Cannot filter on property: ' + k
            }));
          }
        }
        var v = options.filter[k];
        if (angular.isArray(v)) {
          for (var i = 0; i < v.length; i++) {
            url += k + '=' + encodeURIComponent(v[i]) + '&';
          }
        } else {
          url += k + '=' + encodeURIComponent(v) + '&';
        }
        url = url.slice(0, -1);
      }
    }

    return clbResultSet.get(clbAuthHttp.get(url, {
      params: lodash.omit(params, 'filter')
    }), paginationOptions('groups', options.factory));
  }

  /**
   * Promise a list of groups who matched the given query string.
   *
   * @param  {string} queryString the search query
   * @param  {object} [options]   query options
   * @param  {int} [options.pageSize] the number of result to retrieve
   * @param {function} [options.factory] the factory function to use
   * @return {Promise} will return a ResultSet containing the results
   */
  function search(queryString, options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    params.str = queryString;
    var url = groupUrl + '/searchByText';
    return clbResultSet.get(clbAuthHttp.get(url, {
      params: params
    }), paginationOptions('groups', options.factory));
  }
}

/* eslint max-lines: 0 */

angular.module('clb-identity')
.factory('clbUser', clbUser);

/**
 * ``clbUser`` service let you retrieve and edit user and groups.
 *
 * @namespace clbUser
 * @memberof module:clb-identity
 * @param  {object} $rootScope      Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $cacheFactory   Angular DI
 * @param  {object} $log            Angular DI
 * @param  {object} lodash          Angular DI
 * @param  {object} clbEnv          Angular DI
 * @param  {object} clbError        Angular DI
 * @param  {object} clbResultSet    Angular DI
 * @param  {object} clbIdentityUtil Angular DI
 * @return {object} Angular Service
 */
function clbUser(
  $rootScope,
  $q,
  clbAuthHttp,
  $cacheFactory,
  $log,
  lodash,
  clbEnv,
  clbError,
  clbResultSet,
  clbIdentityUtil
) {
  var userCache = $cacheFactory('clbUser');
  var userUrl = clbEnv.get('api.user.v1') + '/user';
  // key used to store the logged in user in the cache
  var currentUserKey = '_currentUser_';
  activate();

  return {
    get: getPromiseId2userInfo,
    getCurrentUserOnly: getCurrentUserOnly,
    getCurrentUser: getCurrentUser,
    create: create,
    update: update,
    list: list,
    search: search,
    isGroupMember: isGroupMember,
    adminGroups: adminGroups,
    memberGroups: groups
  };

  /**
   * Bootstrap the service
   * @private
   */
  function activate() {
    $rootScope.$on('user:disconnected', function() {
      userCache.removeAll();
    });
  }

  /**
   * Create requests with a maximum length of 2000 chars.
   * @param  {array/any} source Array of params to generate URL for
   * @param  {string} urlPrefix   The beginning of the URL
   * @param  {string} destination An array to put all the URL into
   * @param  {string} argName     Name of the argument
   * @private
   */
  function splitInURl(source, urlPrefix, destination, argName) {
    if (source.length === 0) {
      return;
    }
    var url = urlPrefix + source[0];
    var sep = '&' + argName + '=';
    for (var i = 1; i < source.length; i++) {
      if (url.length + source[i].length + sep.length < 2000) {
        // If we still have enough room in the url we add the id to it
        url += sep + source[i];
      } else {
        // We flush the call and start a new one
        destination.push(url);
        url = urlPrefix + source[i];
      }
    }
    destination.push(url);
  }

  /**
   * Add a list of user to the cache.
   * @param {array} addedUserList Array of users to add
   * @param {object} response A key/value store where key is the user id
   * @private
   */
  function addToCache(addedUserList, response) {
    for (var i = 0; i < addedUserList.length; i++) {
      var addedUser = addedUserList[i];
      if (addedUser.displayName === undefined) {
        addedUser.displayName = addedUser.name;
      }
      // add to response
      response[addedUser.id] = addedUser;
      // add to cache
      userCache.put(addedUser.id, addedUser);
    }
  }

  /**
   * @desc
   * Return a promise that will resolve to a list of groups and users
   * based on the given array of ``ids``.
   *
   * In case of error, the promise is rejected with a ``ClbError`` instance.
   *
   * Return a promise with an map of id->userInfo based on the
   * provided list of IDs.
   * @function get
   * @memberof module:clb-identity.clbUser
   * @param  {array|string} ids One or more ID
   * @return {Promise}   Resolve to a map of ID/UserInfo
   * @private
   */
  function getPromiseId2userInfo(ids) {
    var deferred = $q.defer();

    var uncachedUser = [];
    var response = {};
    var urls = [];
    var single = false; // flag to support single user call

    if (!ids) {
      ids = [];
    }

    if (!angular.isArray(ids)) {
      ids = [ids];
      single = true;
    }

    var rejectDeferred = function() {
      deferred.reject.apply(deferred, ids);
    };
    var processResponseAndCarryOn = function(data) {
      // atm group and user api response data format is different
      var items;
      if (data.data.result) {
        items = data.data.result;
      } else if (data.data._embedded.users) {
        items = data.data._embedded.users;
      } else if (data.data._embedded.groups) {
        items = data.data._embedded.groups;
      } else if (data.data.content) {
        items = data.data.content;
      } else {
        $log.error('Unable to find a resultset in data', data);
      }
      addToCache(items, response);
      if (urls && urls.length > 0) {
        return clbAuthHttp.get(urls.shift())
        .then(processResponseAndCarryOn, rejectDeferred);
      }
      deferred.resolve(single ? response[ids[0]] : response);
    };

    angular.forEach(ids, function(id) {
      var user = userCache.get(id);
      if (user) { // The id is already cached
        response[id] = user;
      } else {
        uncachedUser.push(id);
      }
    });

    if (uncachedUser.length === 0) {
      // All ids are already available -> we resolve the promise
      deferred.resolve(single ? response[ids[0]] : response);
    } else {
      // Get the list of URLs to call
      var userBaseUrl = '/search?id=';
      splitInURl(uncachedUser, userUrl + userBaseUrl, urls, 'id');

      // Async calls and combination of result
      clbAuthHttp.get(urls.shift())
      .then(processResponseAndCarryOn, rejectDeferred);
    }

    return deferred.promise;
  }

   /**
    * @name isGroupMember
    * @desc
    * Return a promise that will resolve to true if the current user is a member of one of the groups in input.
    *
    * `groups` can be either a string or an array.
    *
    * @memberof module:clb-identity.clbUser
    * @function
    * @param  {array}  groups A list of groups
    * @return {Promise}       Resolve to a boolean
    */
  function isGroupMember(groups) {
    return this.getCurrentUser().then(function(user) {
      var compFunc = function(group) {
        return lodash.some(user.groups, function(g) {
          return g.name === group;
        });
      };
      var groupList = lodash.isArray(groups) ? groups : [groups];
      return lodash.some(groupList, compFunc);
    });
  }

  /**
   * Promise a ResultSet containing the groups that the user is member of.
   *
   * @param  {string} [userId] the user id or 'me' if unspecified
   * @param  {object} options optional request parameters
   * @param  {int} options.pageSize the size of a result page
   * @return {Promise}      will return a ResultSet of groups
   */
  function groups(userId, options) {
    if (angular.isObject(userId)) {
      options = userId;
      userId = 'me';
    }
    userId = userId || 'me';
    options = angular.extend({sort: 'name'}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = userUrl + '/' + userId + '/member-groups';
    if (options.filter) {
      try {
        url += '?' + appendFilterToPath(options.filter, ['name']);
      } catch (ex) {
        return $q.reject(ex);
      }
    }
    return clbResultSet.get(
      clbAuthHttp.get(url, {params: params}),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * Promise a ResultSet containing the groups that the user can administrate.
   *
   * @param  {string} [userId] the user id or 'me' if unspecified
   * @param  {object} options optional request parameters
   * @param  {int} options.pageSize the size of a result page
   * @return {Promise}      will return a ResultSet of groups
   */
  function adminGroups(userId, options) {
    if (angular.isObject(userId)) {
      options = userId;
      userId = 'me';
    }
    userId = userId || 'me';
    options = angular.extend({sort: 'name'}, options);
    var params = clbIdentityUtil.queryParams(options);
    var url = [userUrl, userId, 'admin-groups'].join('/');
    if (options.filter) {
      try {
        url += '?' + appendFilterToPath(options.filter, ['name']);
      } catch (ex) {
        return $q.reject(ex);
      }
    }
    return clbResultSet.get(
      clbAuthHttp.get(url, {
        params: params
      }),
      paginationOptions('groups', options.factory)
    );
  }

  /**
   * Append a list of filters to an URL.
   * @param  {object} [filter] Keys are filter names and value is the filter string
   * @param  {array}  [supportedFilters] list of authorised keys for the filter property
   * @throws {HbpError} FilterNotSupportedError
   * @return {string}   resulting path
   * @private
   */
  function appendFilterToPath(filter, supportedFilters) {
    if (!filter) {
      return;
    }
    var queryString = '';
    var fn = function(k) {
      return function(vi) {
        queryString += k + '=' + encodeURIComponent(vi) + '&';
      };
    };
    for (var k in filter) {
      if (Object.prototype.hasOwnProperty.call(filter, k)) {
        if (supportedFilters.indexOf(k) === -1) {
          throw clbError.error({
            type: 'FilterNotSupportedError',
            message: 'Cannot filter on property: ' + k
          });
        }
        var v = filter[k];
        if (angular.isArray(v)) {
          lodash.each(v, fn(k));
        } else {
          queryString += k + '=' + encodeURIComponent(v) + '&';
        }
      }
    }
    return queryString.slice(0, -1);
  }

  /**
   * Return pagination config to pass to ``clbResultSet.get``.
   * @param  {string} pluralType Plural form to look for in the results
   * @param  {function} factory  Factory function to use to build a batch of results
   * @return {object}            Options to pass to ``clbResultSet.get``
   */
  function paginationOptions(pluralType, factory) {
    return {
      resultKey: '_embedded.' + pluralType,
      nextUrlKey: '_links.next.href',
      previousUrlKey: '_links.prev.href',
      countKey: 'page.totalElements',
      resultsFactory: factory
    };
  }

  /**
   * @name getCurrentUserOnly
   * @desc
   * Return a promise that will resolve to the current user, NOT including group
   * info.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @memberof module:clb-identity.clbUser
   * @return {Promise} Resolve to the current user
   */
  function getCurrentUserOnly() {
    var user = userCache.get(currentUserKey);
    if (user) {
      return $q.when(user);
    }
    // load it from user profile service
    return clbAuthHttp.get(userUrl + '/me').then(
      function(userData) {
        // merge groups into user profile
        var profile = userData.data;

        // add to cache
        userCache.put(currentUserKey, profile);
        return profile;
      }, clbError.rejectHttpError);
  }

  /**
   * @name getCurrentUser
   * @desc
   * Return a promise that will resolve to the current user.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @return {Promise} Resolve to the Current User
   */
  function getCurrentUser() {
    var user = userCache.get(currentUserKey);
    if (user && user.groups) {
      return $q.when(user);
    }

    var request = {};
    if (!user) {
      request.user = this.getCurrentUserOnly();
    }

    request.groups = clbResultSet.get(
      clbAuthHttp.get(userUrl + '/me/member-groups'),
      paginationOptions('groups')
    ).then(function(rs) {
      return rs.toArray();
    });

    // load it from user profile service
    return $q.all(request).then(function(aggregatedData) {
      // merge groups into user profile
      var profile = aggregatedData.user || user;
      profile.groups = aggregatedData.groups;

      // add to cache
      userCache.put(currentUserKey, profile);
      return profile;
    }, clbError.rejectHttpError);
  }

  /**
   * @name create
   * @desc
   * Create the given `user`.
   *
   * The method return a promise that will resolve to the created user instance.
   * In case of error, a `HbpError` instance is retrieved.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param {object} user Data to build the user from
   * @return {Promise} Resolve to the new User
   */
  function create(user) {
    return clbAuthHttp.post(userUrl, user).then(
      function() {
        return user;
      },
      clbError.rejectHttpError
    );
  }

  /**
   * @name update
   * @desc
   * Update the described `user` with the given `data`.
   *
   * If data is omitted, `user` is assumed to be the updated user object that
   * should be persisted. When data is present, user can be either a `User`
   * instance or the user id.
   *
   * The method return a promise that will resolve to the updated user instance.
   * Note that this instance is a copy of the user. If you own a user instance
   * already, you cannot assume this method will update it.
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param  {object} user User to update
   * @param  {object} [data] Data to update the user with if not already in ``user`` instance
   * @return {Promise}       Resolve to the User instance
   */
  function update(user, data) {
    data = data || user;
    var id = (typeof user === 'string' ? user : user.id);
    return clbAuthHttp.patch(userUrl + '/' + id, data).then(
      function() {
        userCache.remove(id);
        var cachedCurrentUser = userCache.get(currentUserKey);
        if (cachedCurrentUser && cachedCurrentUser.id === id) {
          userCache.remove(currentUserKey);
        }
        return getPromiseId2userInfo([id]).then(
          function(users) {
            return lodash.first(lodash.values(users));
          }
        );
      },
      clbError.rejectHttpError
    );
  }

  /**
   * @name list
   * @desc
   * Retrieves a list of users filtered, sorted and paginated according to the options.
   *
   * The returned promise will be resolved with the list of fetched user profiles
   * and 2 fuctions (optional) to load next page and/or previous page.
   * {{next}} and {{prev}} returns a promise that will be resolved with an object
   * like the one returned by the current function.
   *
   * Return object example:
   * {
   *  results: [...],
   *  next: function() {},
   *  prev: function() {}
   * }
   *
   * Available options:
   *
   * * sort: property to sort on. prepend '-' to reverse order.
   * * page: page to be loaded (default: 0)
   * * pageSize: max number or items to be loaded (default: 10, when 0 all records are loaded)
   * * filter: an Object containing the field name as key and
   *       the query as a String or an Array of strings
   * * managedOnly: returns only the users managed by the current logged in user
   *
   * Supported filter values:
   *
   * * ``'displayName'``
   * * ``'email'``
   * * ``'id'``
   * * ``'username'``
   * * ``'accountType'``
   *
   * @memberof module:clb-identity.clbUser
   * @function
   * @param {object} [options] Parameters to use
   * @param {string} [options.sort] Attribute to sort the user with (default to ``'familyName'``)
   * @param {string} [options.filter] Object containing query filters
   * @param {function} [options.factory] A function that accept an array of user data and build object from them
   * @param {int} [options.pageSize] The number of result per page ; if 0, load all results
   * @param {int} [options.page] The result page to retrieve
   * @return {Promise} Resolve to the user ResultSet instance
   */
  function list(options) {
    var opt = angular.extend({
      sort: 'familyName'
    }, options);
    var endpoint = userUrl;

    // append filter part to endpoint
    if (opt.filter) {
      var supportedFilters = [
        'displayName',
        'email',
        'id',
        'username',
        'accountType'
      ];
      try {
        endpoint += '/search?' + appendFilterToPath(
          opt.filter, supportedFilters);
      } catch (ex) {
        return $q.reject(ex);
      }
    }

    var pageOptions = paginationOptions('users', opt.factory);
    var params = clbIdentityUtil.queryParams(opt);

    var result = clbResultSet.get(clbAuthHttp.get(endpoint, {
      params: params
    }), pageOptions);

    // if pageSize=0 load everything
    return (opt.pageSize === 0) ? result.instance.all() : result;
  }

  /**
   * Promise a list of users who matched the given query string.
   *
   * @memberof module:clb-identity.clbUser
   * @param  {string} queryString the search query
   * @param  {object} [options]   query options
   * @param  {int} [options.pageSize] the number of result to retrieve
   * @param  {function} [options.factory] the factory function to use
   * @return {Promise} will return a ResultSet containing the results
   */
  function search(queryString, options) {
    options = angular.extend({}, options);
    var params = clbIdentityUtil.queryParams(options);
    params.str = queryString;
    var url = userUrl + '/searchByText';

    return clbResultSet.get(clbAuthHttp.get(url, {
      params: params
    }), paginationOptions('users', options.factory));
  }
}

angular.module('clb-identity')
.factory('clbIdentityUtil', clbIdentityUtil);

/* ------------------ */

/**
 * The ``hbpIdentityUtil`` service groups together useful function for the hbpIdentity module.
 * @namespace clbIdentityUtil
 * @memberof module:clb-identity
 * @param  {object} $log   Angular DI
 * @param  {object} lodash Angular DI
 * @return {object}        Angular Service
 */
function clbIdentityUtil($log, lodash) {
  return {
    queryParams: queryParams
  };

  /**
   * @name queryParams
   * @memberof module:clb-identity.clbIdentityUtil
   * @desc
   * Accept an object with the following attributes:
   *
   * - page: the result page to load (default: 0)
   * - pageSize: the size of a page (default: 50)
   * - filter: an Object containing the field name as key and
   *           the query as a String or an Array of strings
   * - sort: the ordering column as a string. prepend with '-' to reverse order.
   *
   * @param  {Object} options sort and filter keys
   * @return {Object} params suitable for $http requests
   */
  function queryParams(options) {
    var defaultOptions = {
      page: 0,
      pageSize: 50
    };
    var opt = angular.extend(defaultOptions, options);

    var sortStr;
    if (opt.sort) {
      var sortVal = opt.sort;
      if (lodash.isArray(sortVal) && sortVal.length > 0) {
        sortVal = sortVal[0];
        $log.warn('Multiple field sorting not supported. Using: ' + sortVal);
      }
      sortStr = lodash(sortVal).toString();

      if (sortStr.charAt(0) === '-') {
        sortStr = sortStr.substring(1) + ',desc';
      }
    }

    return {
      page: opt.page,
      pageSize: opt.pageSize,
      sort: sortStr
    };
  }
}

angular.module('clb-rest')
.factory('clbResultSet', clbResultSet);

/**
 * @namespace clbResultSet
 * @memberof module:clb-rest
 * @param  {object} clbAuthHttp           Angular DI
 * @param  {object} $q              Angular DI
 * @param  {object} clbError Angular DI
 * @return {object}                 Angular Service
 */
function clbResultSet(clbAuthHttp, $q, clbError) {
  /**
   * @attribute ResultSetEOL
   * @memberof module:clb-rest.clbResultSet
   * @desc error thrown when module:clb-rest.ResultSet is crawled when at an
   *       extremity.
   */
  var ResultSetEOL = clbError.error({
    type: 'ResultSet::EOL',
    message: 'End of list reached'
  });

  return {
    get: getPaginatedResultSet,
    EOL: ResultSetEOL
  };

  /**
   * @name get
   * @memberof module:clb-rest.clbResultSet
   * @desc
   * Return a promise that will resolve once the result set first page is loaded.
   *
   * The promise contains the `instance` of the result set as well.
   *
   * @param  {Object} res     a HTTPResponse or a promise which resolve to a HTTPResponse
   * @param  {Object} [options] configuration
   * @param  {string} [options.nextUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch next results
   * @param  {function} [options.hasNextHandler] A function that receive the JSON data as its first argument and must
   *                                             return a boolean value that will be assigned to the ``hasNext`` property.
   *                                             When this option is given, ``options.nextUrlHandler`` SHOULD be defined as well.
   * @param  {function} [options.nextHandler] A function that receive the JSON data as its first argument and must return a promise
   *                                          to the next results. This handler will be called when ``next()`` is called on the
   *                                          RecordSet.
   *                                          When this option is given ``options.hasNextHandler`` MUST be defined as well.
   *                                          When this option is given ``options.nextUrlKey`` is ignored.
   * @param  {string} [options.previousUrlKey] name of (or dot notation path to) the attribute containing the URL to fetch previous results
   * @param  {function} [options.hasPreviousHandler] A function that receive the JSON data as its first argument and must
   *                                                 return a boolean value that will be assigned to the ``hasPrevious`` property.
   *                                                 When this option is given, ``options.previousUrlHandler`` SHOULD be defined as well.
   * @param  {function} [options.previousHandler] A function that receive the JSON data as its first argument and must return a string value
   *                                              that represent the previous URL that will be fetched by a call to ``.previous()``.
   *                                              When this option is given ``options.hasPreviousHandler`` MUST be defined as well.
   *                                              When this option is given ``options.previousUrlKey`` is ignored.
   * @param  {string} [options.resultKey] name of (or dot notation path to) the attribute containing an array with all the results
   * @param  {string} [options.countKey] name of (or dot notation path to) the attribute containing the number of results returned
   * @param  {function} [options.resultsFactory] a function to which a new array of results is passed.
   *                    The function can return ``undefined``, a ``Promise`` or an ``array`` as result.
   * @return {Promise} After the promise is fulfilled, it will return a new instance of :doc:`module-clb-rest.clbResultSet.ResultSet`.
   */
  function getPaginatedResultSet(res, options) {
    return new ResultSet(res, options).promise;
  }

  /**
   * @class ResultSet
   * @memberof module:clb-rest.clbResultSet
   * @desc
   * Build a result set with internal support for fetching next and previous results.
   *
   * @param {Object} pRes the promise of the first result page
   * @param {Object} options various options to specify how to handle the pagination
   * @see {module:clb-rest.clbResultSet.get}
   */
  function ResultSet(pRes, options) {
    var self = this;
    // Hold call to next and previous when using customization.
    var wrappedNextCall;
    var wrappedPreviousCall;

    /**
     * The array containing all fetched results. Previous pages are added
     * to the beginning of the results, next pages at the end.
     * @type {array}
     */
    self.results = [];
    /**
     * Define with the last ClbError instance that occured.
     * @type {module:clb-error.ClbError}
     */
    self.error = null;
    /**
     * ``true`` if there is more results to be loaded.
     * @type {Boolean}
     */
    self.hasNext = null;
    /**
     * ``true`` if there is previous page to be loaded.
     * @type {Boolean}
     */
    self.hasPrevious = null;
    /**
     * The promise associated with the last operation in the queue.
     * @type {Promise}
     */
    self.promise = null;
    /**
     * A function that handle any error during an operation.
     * @type {Function}
     */
    self.errorHandler = null;
    self.next = enqueue(next);
    self.previous = enqueue(previous);
    self.toArray = enqueue(toArray);
    self.all = enqueue(all);
    self.count = -1;

    options = angular.extend({
      resultKey: 'results',
      nextUrlKey: 'next',
      hasNextHandler: function(rs) {
        // by default, has next is defined if the received data
        // defines a next URL.
        return Boolean(at(rs, options.nextUrlKey));
      },
      previousUrlKey: 'previous',
      hasPreviousHandler: function(rs) {
        // by default, has previous is defined if the received data
        // defines a next URL.
        return Boolean(at(rs, options.previousUrlKey));
      },
      countKey: 'count'
    }, options);

    self.promise = $q.when(pRes)
    .then(initialize)
    .catch(handleError);
    self.promise.instance = self;

    /**
     * @name next
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve the next result page.
     * @memberof module:clb-rest.clbResultSet.ResultSet
     *
     * @return {Object} a promise that will resolve when the next page is fetched.
     */
    function next() {
      if (!self.hasNext) {
        return $q.reject(ResultSetEOL);
      }
      var promise = (options.nextHandler ?
        wrappedNextCall() :
        clbAuthHttp.get(self.nextUrl)
      );
      return promise.then(handleNextResults);
    }

    /**
     * @name previous
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve the previous result page
     *
     * @return {Object} a promise that will resolve when the previous page is fetched.
     */
    function previous() {
      if (!self.hasPrevious) {
        return $q.reject(ResultSetEOL);
      }
      var promise = (options.previousHandler ?
        wrappedPreviousCall() :
        clbAuthHttp.get(self.previousUrl)
      );
      return promise.then(handlePreviousResults);
    }

    /**
     * @name toArray
     * @memberof module:clb-rest.ResultSet
     * @desc
     * Retrieve an array containing ALL the results. Beware that this
     * can be very long to resolve depending on your dataset.
     *
     * @return {Promise} a promise that will resolve to the array when
     * all data has been fetched.
     */
    function toArray() {
      return all().then(function() {
        return self.results.slice();
      });
    }

    /**
     * Load all pages.
     * @memberof module:clb-rest.ResultSet
     * @return {Promise} Resolve once everything is loaded
     */
    function all() {
      if (self.hasNext) {
        return next().then(all);
      }
      return $q.when(self);
    }

    /**
     * parse the next result set according to options.
     * @param  {HTTPResponse} res response containing the results.
     * @return {ResultSet} self for chaining
     * @private
     */
    function handleNextResults(res) {
      var rs = res.data;
      var result = at(rs, options.resultKey);

      var fResult;
      if (options.resultsFactory) {
        fResult = options.resultsFactory(result, rs);
      }
      return $q.when(fResult)
      .then(function(computedResult) {
        self.results.push.apply(self.results, (computedResult || result));
        counting(rs);
        bindNext(rs);
        return self;
      });
    }

    /**
     * parse the previous result set according to options.
     * @param  {HTTPResponse} res response containing the results.
     * @return {ResultSet} self for chaining
     * @private
     */
    function handlePreviousResults(res) {
      var rs = res.data;
      var result = at(rs, options.resultKey);
      var fResult;
      if (options.resultsFactory) {
        fResult = options.resultsFactory(result, rs);
      }
      return $q.when(fResult)
      .then(function(computedResult) {
        self.results.unshift.apply(self.results, (computedResult || result));
        counting(rs);
        bindPrevious(rs);
        return self;
      });
    }

    /**
     * @name at
     * @desc
     * Lodash 'at' function replacement. This is needed because the 'at' function
     * supports Object as first arg only starting from v4.0.0.
     * Migration to that version has big impacts.
     *
     * See: https://lodash.com/docs#at
     * @param {object} obj the object to search in
     * @param {string} desc the dotted path to the location
     * @return {instance} the found value
     * @private
     */
    function at(obj, desc) {
      var arr = desc.split('.');
      while (arr.length && obj) {
        obj = obj[arr.shift()];
      }
      return obj;
    }

    /**
     * Handle an error retrieved by calling
     * ``options.errorHandler``, passing the ``ClbError`` instance in parameter
     * if ``options.errorHandler`` is a function.
     * Then reject the current request with the same error instance.
     * @param  {object} res the HTTP error object
     * @return {Promise} rejected Promise with the error.
     * @private
     */
    function handleError(res) {
      self.error = clbError.httpError(res);
      if (angular.isFunction(options.errorHandler)) {
        options.errorHandler(self.error);
      }
      return $q.reject(self.error);
    }

    /**
     * Configure the next page state of the result set.
     * @param  {object} rs the last page results.
     * @private
     */
    function bindNext(rs) {
      self.hasNext = options.hasNextHandler(rs);
      if (options.nextHandler) {
        wrappedNextCall = function() {
          return options.nextHandler(rs);
        };
      } else if (self.hasNext) {
        self.nextUrl = at(rs, options.nextUrlKey);
      } else {
        self.nextUrl = null;
      }
    }

    /**
     * Configure the previous page state of the result set.
     * @param  {object} rs the last page results.
     * @private
     */
    function bindPrevious(rs) {
      self.hasPrevious = options.hasPreviousHandler(rs);
      if (options.previousHandler) {
        wrappedPreviousCall = function() {
          return options.previousHandler(rs);
        };
      } else if (self.hasPrevious) {
        self.previousUrl = at(rs, options.previousUrlKey);
      } else {
        self.previousUrl = null;
      }
    }

    /**
     * Set the current count of results.
     * @param  {object} rs the last page results.
     * @private
     */
    function counting(rs) {
      var c = at(rs, options.countKey);
      if (angular.isDefined(c)) {
        self.count = c;
      }
    }

    /**
     * Ensure that we don't mess with query result order.
     * @param  {Function} fn the next function to run once all pending calls
     *                       have been resolved.
     * @return {Promise}     the promise will resolve when this function had run.
     * @private
     */
    function enqueue(fn) {
      return function() {
        self.promise = $q
        .when(self.promise.then(fn))
        .catch(handleError);
        self.promise.instance = self;
        return self.promise;
      };
    }

    /**
     * Bootstrap the pagination.
     * @param  {HTTPResponse|Promise} res Angular HTTP Response
     * @return {ResultSet} self for chaining
     * @private
     */
    function initialize(res) {
      return handleNextResults(res)
      .then(function() {
        bindPrevious(res.data);
        return self;
      });
    }
  }
}

/* eslint max-lines:0 camelcase:0 */

angular.module('clb-storage')
.factory('clbStorage', clbStorage);

/**
 * @typedef {object} EntityDescriptor
 * @memberof module:clb-storage
 * @property {UUID} _uuid         The entity UUID
 * @property {string} _entityType The entity type (e.g.: ``file``, ``folder``, ``project``)
 * @desc
 * Describe an arbitrary entity in the storage stytem. The principal types are
 *
 * - `file`: the entity is a file whose content can be retrieved
 * - `folder`: the entity is a folder and can be the parent of other entities
 * - `project`: First level folder. It behave like a folder but also defines the ACL for all the children
 */

/**
 * @namespace clbStorage
 * @memberof module:clb-storage
 * @desc
 * The ``clbStorage`` service provides utility functions to ease the interaction
 * of apps with storage.
 * @param  {object} $http        Angular DI
 * @param  {object} $q           Angular DI
 * @param  {object} $log         Angular DI
 * @param  {object} uuid4        Angular DI
 * @param  {object} clbEnv       Angular DI
 * @param  {object} clbError     Angular DI
 * @param  {object} clbUser      Angular DI
 * @param  {object} clbResultSet Angular DI
 * @return {object}              Angular DI
 */
function clbStorage(
  $http,
  $q,
  $log,
  uuid4,
  clbEnv,
  clbError,
  clbUser,
  clbResultSet
) {
  var baseUrl = clbEnv.get('api.document.v0');
  var maxFileSize = clbEnv.get('hbpFileStore.maxFileUploadSize', 41943040);
  var entityUrl = baseUrl + '/entity';
  var fileUrl = baseUrl + '/file';
  var promises = {};
  return {
    getEntity: getEntity,
    getAbsolutePath: getAbsolutePath,
    upload: upload,
    query: query,
    getContent: getContent,
    downloadUrl: downloadUrl,
    getChildren: getChildren,
    getUserAccess: getUserAccess,
    getAncestors: getAncestors,
    isContainer: isContainer,
    copy: copy,
    create: create,
    delete: deleteEntity,
    setContextMetadata: setContextMetadata,
    deleteContextMetadata: deleteContextMetadata,
    updateContextMetadata: updateContextMetadata,
    addMetadata: addMetadata,
    deleteMetadata: deleteMetadata
  };

  // -------------------- //

  /**
   * Get an entity (e.g.: a project, a file or a folder) using a locator. The
   * only accepted locator at this time is the entity UUID.
   *
   * - the entity UUID
   * - an entity representation with ``{_uuid: ENTITY_UUID}``
   * - the entity related context ``{ctx: CONTEXT_UUID}``
   * - the entity collab ID ``{collab: COLLAB_ID}``
   * - the entity absolute path
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {any} locator  Describe the entity to retrieve (see description).
   * @return {Promise}               Return a :doc:`module-clb-storage.EntityDescriptor` when fulfilled
   *                                 or reject a :doc:`module-clb-error.ClbError`
   */
  function getEntity(locator) {
    if (!locator) {
      return $q.reject(clbError.error({
        type: 'InvalidArgument',
        message: 'locator argument is mandatory'
      }));
    }
    $log.debug('clbStorage.getEntity using locator', locator);
    if (angular.isString(locator) && uuid4.validate(locator)) {
      return getEntityByUUID(locator);
    }
    if (angular.isObject(locator)) {
      if (uuid4.validate(locator._uuid)) {
        return getEntityByUUID(locator._uuid);
      }
      if (locator.ctx && uuid4.validate(locator.ctx)) {
        return getEntityByContext(locator.ctx);
      }
      if (locator.collab) {
        return getCollabHome(locator.collab);
      }
    }
    return $q.reject(clbError.error({
      type: 'InvalidArgument',
      message: 'Unable to locate entity because the `locator` argument' +
               ' is not valid: ' + String(locator),
      code: -10,
      data: {
        locator: locator
      }
    }));
  }

  /**
   * Return the absolute path of the entity
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {object|UUID}   entity UUID or descriptor
   * @return {Promise}       return a path string when fulfilled.
   */
  function getAbsolutePath(entity) {
    if (!entity) {
      return $q.when(null);
    }
    var uuid = entity._uuid || entity;
    return $http.get(baseUrl + '/entity_path/' + uuid)
    .then(function(res) {
      return res.data._path;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Ensure there is only one async `fn` run named `k` at once.
   * subsequent call to runOnce with the same `k` value will
   * return the promise of the running async function.
   * @memberof module:clb-storage.clbStorage
   * @param  {string}   k  The key
   * @param  {Function} fn The function that retrieve a Promise
   * @return {Promise}     Resolve to the function result
   * @private
   */
  function runOnce(k, fn) {
    if (!promises[k]) {
      promises[k] = fn().finally(function() {
        promises[k] = null;
      });
    }
    return promises[k];
  }

  /**
   * @memberof module:clb-storage.clbStorage
   * @param  {string} uuid Entity UUID
   * @return {Promise}     Resolve to the entity Descriptor
   * @private
   */
  function getEntityByUUID(uuid) {
    var url = entityUrl + '/' + uuid;
    var k = 'GET ' + url;
    return runOnce(k, function() {
      return $http.get(url).then(function(data) {
        return data.data;
      }).catch(clbError.rejectHttpError);
    });
  }

  /**
   * Query entities by attributes or metadata.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} params Query Parameters
   * @return {Promise}      Return the results
   */
  function query(params) {
    $log.debug('clbStorage.query with', params);
    return $http.get(entityUrl + '/', {
      params: params
    }).then(function(response) {
      return response.data;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Retrieve the key to lookup for on entities given the ctx
   * @memberof module:clb-storage.clbStorage
   * @param  {string} ctx application context UUID
   * @return {string}     name of the entity attribute that should be used
   * @private
   */
  function metadataKey(ctx) {
    return 'ctx_' + ctx;
  }

  /**
   * @name setContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function links the contextId with the doc browser entity in input
   * by setting a specific metadata on the entity.
   *
   * Entity object in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} entity doc browser entity
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function setContextMetadata(entity, contextId) {
    var newMetadata = {};
    newMetadata[metadataKey(contextId)] = 1;
    return addMetadata(entity, newMetadata);
  }

  /**
   * @function
   * @desc
   * the function gets the entity linked to the contextId in input.
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   * @private
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function getEntityByContext(contextId) {
    var queryParams = {};
    queryParams[metadataKey(contextId)] = 1;
    return query(queryParams).catch(clbError.rejectHttpError);
  }

  /**
   * @name deleteContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function unlink the contextId from the entity in input
   * by deleting the context metadata.
   *
   * Entity object in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} entity doc browser entity
   * @param  {String} contextId collab app context id
   * @return {Promise} a promise that resolves when the operation is completed
   */
  function deleteContextMetadata(entity, contextId) {
    var key = metadataKey(contextId);

    return deleteMetadata(entity, [key]);
  }

  /**
   * @name updateContextMetadata
   * @memberof module:clb-storage.clbStorage
   * @desc
   * the function delete the contextId from the `oldEntity` metadata and add
   * it as `newEntity` metadata.
   *
   * Entity objects in input must contain the following properties:
   * - _entityType
   * - _uuid
   *
   * In case of error, the promise is rejected with a `HbpError` instance.
   *
   * @param  {Object} newEntity doc browser entity to link to the context
   * @param  {Object} oldEntity doc browser entity to unlink from the context
   * @param  {String} contextId collab app context id
   * @return {Promise}          Resolves when the operation is completed
   */
  function updateContextMetadata(newEntity, oldEntity, contextId) {
    return deleteContextMetadata(oldEntity, contextId).then(function() {
      return setContextMetadata(newEntity, contextId);
    }).catch(clbError.rejectHttpError);
  }

  /**
   * Add metadata to the provided entity and returns a promise that resolves to an object
   * containing all the new metadata. The promise fails if one of the metadata already exists.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} entity   Entity Descriptor
   * @param {object} metadata key/value store where keys are the metadata name to set
   * @return {Promise}        Resolves after the operation is completed
   */
  function addMetadata(entity, metadata) {
    return $http.post(baseUrl + '/' + entity._entityType + '/' +
    entity._uuid + '/metadata', metadata)
    .then(function(response) {
      return response.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * Delete metadata keys in input from the provided entity and returns a promise that resolves to an object
   * containing all the remaining metadata. The promise fails if one of the metadata doesn't exist.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {object} entity      Entity Descriptor
   * @param {array} metadataKeys Array of metatdata keys to delete
   * @return {Promise}           Resolve to the metadata
   */
  function deleteMetadata(entity, metadataKeys) {
    return $http.delete(baseUrl + '/' + entity._entityType + '/' +
      entity._uuid + '/metadata', {data: {keys: metadataKeys}})
    .then(function(response) {
      return response.data;
    })
    .catch(clbError.rejectHttpError);
  }

  /**
   * @function
   * @private
   * @desc
   * When the promise is fulfilled, the function returns the :doc:`module-clb-storage.EntityDescriptor` of the ``collabId`` in input.
   *
   * In case of error, the promise is rejected with a :doc:`module-clb-error.ClbError` instance.
   *
   * @param  {int}    collabId collab id
   * @return {Promise}         Return the project :doc:`module-clb-storage.EntityDescriptor` linked to
   *                           this collab or reject a :doc:`module-clb-error.ClbError`.
   */
  function getCollabHome(collabId) {
    var queryParams = {
      managed_by_collab: collabId
    };
    return query(queryParams);
  }

  /**
   * Create a new entity.
   * @memberof module:clb-storage.clbStorage
   * @param  {string} type           Entity Type (e.g.: file, folder, project)
   * @param  {string|object} parent  Parent UUID or entity descriptor
   * @param  {string} name           File name
   * @param  {object} options        Extend the entity descriptor with those data
   * @return {Promise}               Resolve once done
   */
  function create(type, parent, name, options) {
    return $http.post(
      baseUrl + '/' + type.split(':')[0],
      angular.extend({
        _name: name,
        _parent: (parent && parent._uuid) || parent
      }, options)
    )
    .then(function(res) {
      return res.data;
    })
    .catch(function(err) {
      if (err.code === 0) {
        err = clbError.error({
          type: 'Aborted',
          message: 'Network unreachable',
          code: 0
        });
      } else {
        err = clbError.httpError(err);
      }
      if (err.message.match(/already exists/)) {
        err.type = 'FileAlreadyExistError';
      } else {
        err.type = 'EntityCreationError';
      }
      err.cause = err.type; // preserve legacy API
      return $q.reject(err);
    });
  }

  /**
   * Copy a file to a destination folder
   * @memberof module:clb-storage.clbStorage
   * @param  {string} srcId        UUID of the entity to copy
   * @param  {string} destFolderId UUID of the target directory
   * @return {Promise}             Resolves when done
   */
  function copy(srcId, destFolderId) {
    return getEntity(srcId).then(function(src) {
      return create(src._entityType, destFolderId, src._name, {
        _description: src._description,
        _contentType: src._contentType
      })
      .then(function(dest) {
        var url = [baseUrl, dest._entityType, dest._uuid, 'content'].join('/');
        return $http.put(url, {}, {
          headers: {'X-Copy-From': src._uuid}
        }).then(function() {
          return dest;
        }).catch(function(err) {
          $q.reject(clbError.httpError(err));
        });
      });
    });
  }

  /**
   * Retrieves the content of a file given its id.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {string} id FileEntity UUID
   * @param  {object} [customConfig] contains extra configuration
   * @return {Promise}   The raw content
   */
  function getContent(id, customConfig) {
    var config = {
      method: 'GET',
      url: fileUrl + '/' + id + '/content',
      transformResponse: function(data) {
        return data;
      }
    };
    if (angular.isDefined(customConfig)) {
      angular.extend(config, customConfig);
    }
    return $http(config).then(function(data) {
      return data.data;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * @desc
   * Get current user access right to the provided entity.
   *
   * The returned promise will be resolved
   * with an object literal containing three boolean
   * flags corresponding the user access:
   *
   * - canRead
   * - canWrite
   * - canManage
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {module:clb-storage.EntityDescriptor} entity The entity to retrieve user access for
   * @return {object} Contains ``{boolean} canRead``, ``{boolean} canWrite``, ``{boolean} canManage``
   */
  function getUserAccess(entity) {
    return $q.all({
      acl: $http.get(baseUrl + '/' + entity._entityType + '/' +
        entity._uuid + '/acl'),
      user: clbUser.getCurrentUser()
    })
    .then(function(aggregatedData) {
      var acls = aggregatedData.acl.data; // expected resp: { 111: 'write', 222: 'manage', groupX: 'manage'}
      var user = aggregatedData.user;

      var access = {
        canRead: false,
        canWrite: false,
        canManage: false
      };

      for (var id in acls) {
        if (Object.prototype.hasOwnProperty.call(acls, id)) {
          var acl = acls[id];
          if (id === user.id || user.groups.indexOf(id) >= 0) {
            access.canRead = access.canRead ||
              acl === 'read' || acl === 'write' || acl === 'manage';
            access.canWrite = access.canWrite ||
              acl === 'write' || acl === 'manage';
            access.canManage = access.canManage || acl === 'manage';
          }
        }
      }
      return access;
    }).catch(clbError.rejectHttpError);
  }

  /**
   * @desc
   * Retrieve children entities of a 'parent' entity according to the options and
   * add them to the children list.
   * The returned promise will be resolved with the
   * list of fetched children and a flag indicating if more results are available
   * in the queried direction.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {module:clb-storage.EntityDescriptor} parent The parent entity
   * @param {object} [options] Options to make the query
   * @param {array/string} [options.accept] Array of accepted _entityType
   * @param {boolean|array/string} [options.acceptLink] ``true`` or an array of accepted linked _entityType
   * @param {string} [options.sort] Property to sort on
   * @param {string} [options.filter] The result based on Acls. Values: ``read`` (default), ``write``
   * @param {UUID} [options.until] Fetch results until the given id (exclusive with from)
   * @param {UUID} [options.from] Fetch results from the given id (exclusive with until)
   * @param {int} [options.pageSize] The number of results per page. Default is provided by the service. Set to 0 to fetch all the records.
   * @return {Promise} When fulfilled, return a paginated result set. You can also access it immediately using ``promise.instance``
   */
  function getChildren(parent, options) {
    options = angular.extend({}, options);
    var url;
    if (parent) {
      url = baseUrl + '/' + parent._entityType + '/' +
      (parent._uuid) + '/children';
    } else { // root projects
      url = baseUrl + '/project';
    }
    var params = {
      filter: buildEntityTypeFilter(options.accept, options.acceptLink),
      sort: options.sort ? options.sort : '_name',
      from: options.from,
      until: options.until,
      access: options.access,
      limit: options.pageSize > 0 ? options.pageSize : null
    };
    return clbResultSet.get($http.get(url, {params: params}), {
      resultKey: 'result',
      hasNextHandler: function(res) {
        return Boolean(res.hasMore);
      },
      nextHandler: function(rs) {
        var p = angular.extend({}, params);
        p.from = rs.nextId;
        return $http.get(url, {params: p});
      },
      hasPreviousHandler: function(res) {
        return Boolean(res.hasPrevious);
      },
      previousHandler: function(rs) {
        var p = angular.extend({}, params);
        p.until = rs.previousId;
        return $http.get(url, {params: p});
      },
      resultsFactory: function(results, rs) {
        if (rs.hasMore) {
          var lastItem = rs.result.pop();
          rs.nextId = lastItem._uuid;
        }
        if (rs.hasPrevious) {
          var firstItem = rs.result.shift();
          rs.previousId = firstItem._uuid;
        }
      }
    });
  }

  /**
   * @private
   * @param  {array/string} accept Fill this array with accepted types
   * @param  {boolean} acceptLink Should the link be accepted as well
   * @return {string}             a query string to append to the URL
   */
  function buildEntityTypeFilter(accept, acceptLink) {
    if (acceptLink) {
      if (acceptLink === true) {
        acceptLink = [].concat(accept);
      }
      for (var i = 0; i < acceptLink.length; i++) {
        acceptLink.push('link:' + acceptLink[i]);
      }
    }
    if (accept && accept.length > 0) {
      return '_entityType=' + accept.join('+');
    }
  }

  /**
   * Set the content of a file entity.
   * @param  {File} file  The file with the content to upload
   * @param  {module:clb-storage.EntityDescriptor} entity The entity to upload
   * @param  {object} config configuration to use
   * @return {Promise}       Return once fulfilled
   */
  function uploadFile(file, entity, config) {
    var d = $q.defer();
    $http.post(fileUrl + '/' + entity._uuid + '/content/upload', file,
      angular.extend({
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }, config
    )
    ).success(function(entity) {
      d.notify({
        lengthComputable: true,
        total: file.size,
        loaded: file.size
      });
      d.resolve(entity);
    }).error(function(err, status) {
      var uploadError = function() {
        if (!err || status === 0) {
          return clbError.error({
            type: 'Aborted'
          });
        }
        return clbError.error('UploadError', {
          message: err.message,
          data: {
            file: file,
            entity: entity,
            cause: err
          }
        });
      };
      deleteEntity(entity).then(function() {
        d.reject(uploadError(err));
      }, function(deleteErr) {
        $log.error('Unable to remove previously created entity', deleteErr);
        d.reject(uploadError(err));
      });
    });
    return d.promise;
  }

  /**
   * Create file entity and upload the content of the given file.
   *
   * `options` should contain a `parent` key containing the parent entity.
   *
   * Possible error causes:
   *
   * - FileTooBig
   * - UploadError - generic error for content upload requests
   * - EntityCreationError - generic error for entity creation requests
   * - FileAlreadyExistError
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param {File} file The file descriptor to upload
   * @param {Object} options The list of options
   * @return {Promise} a Promise that notify about progress and resolve
   *   with the new entity object.
   *
   */
  function upload(file, options) {
    options = options || {};
    var d = $q.defer();
    var dAbort = $q.defer();

    d.promise.abort = function() {
      dAbort.resolve();
    };

    if (file.size > maxFileSize) {
      d.reject(clbError.error({
        type: 'FileTooBig',
        message: 'The file `' + file.name + '` is too big(' + file.size +
          ' bytes), max file size is ' + maxFileSize + ' bytes.'
      }));
      return d.promise;
    }

    var entityOpts = {
      _contentType: fixMimeType(file)
    };
    create(
      'file',
      options.parent && options.parent._uuid,
      file.name,
      entityOpts
    ).then(function(entity) {
      d.notify({
        lengthComputable: true,
        total: file.size,
        loaded: 0
      });

      uploadFile(file, entity, {
        timeout: dAbort.promise,
        uploadProgress: function(event) {
          d.notify(event);
        }
      }).then(
        function(entity) {
          d.promise.abort = function() {
            deleteEntity(entity).then(function() {
              dAbort.resolve();
            });
          };
          d.resolve(entity);
        },
        d.reject,
        d.notify
      );
    }, d.reject);

    return d.promise;
  }

  /**
   * Return a good enough mimetype.
   * @private
   * @param  {File} file File to guess a mimetype for
   * @return {string}    The good enough mime type
   */
  function fixMimeType(file) {
    // Best match are found by the browser
    if (file.type) {
      return file.type;
    }

    var extension = file.name.match(/\.([a-z0-9]+)$/);
    if (!extension) {
      return;
    }
    extension = extension[1];
    // ipynb is not an official mime-type
    if (extension.match(/^(j|i)pynb$/)) {
      return 'application/x-ipynb+json';
    }
    // In worst case, return a dummy value that is consistent
    // for a given file extension and valid from the point of view
    // of the specification.
    return 'application/x-' + extension;
  }

  /**
   * Remotly delete an entity.
   * @param  {module:clb-storage.EntityDescriptor} entity The entity to delete
   * @return {Promise}        Return once fulfilled
   */
  function deleteEntity(entity) {
    return $http.delete(entityUrl + '/' + entity._uuid)
    .catch(clbError.rejectHttpError);
  }

  /**
   * Return true if the entity is a container (e.g.: a project, a folder, ...)
   * @param  {EntityDescriptor} entity The entity to evaluate
   * @return {Boolean}                 Return true if it is a container
   */
  function isContainer(entity) {
    return Boolean(entity._entityType &&
      entity._entityType.match(/project|folder/));
  }

  /**
   * Retrieve an array of entities from root to the current entity
   * (where `root` and `entity` are omitted).
   * @function
   * @param {module:clb-storage.EntityDescriptor} entity The entity to get ancestors from
   * @param {module:clb-storage.EntityDescriptor} [root] The entity even oldest than the oldest ancestors to retrieve
   * @return {Promise} Return an array of EntityDescriptor once fulfilled
   */
  function getAncestors(entity, root) {
    // End recursion condition
    if (!entity || !entity._parent || (root && entity._parent === root._uuid)) {
      return $q.when([]);
    }

    var onError = function(err) {
      $q.reject(clbError.error({
        type: 'EntityAncestorRetrievalError',
        message: 'Cannot retrieve some ancestors from entity ' + entity._name,
        data: {
          entity: entity,
          root: root,
          cause: err
        }
      }));
    };

    var recurse = function(parent) {
      return getAncestors(parent, root)
      .then(function(ancestors) {
        ancestors.push(parent);
        return ancestors;
      });
    };

    return getEntity(entity._parent)
      .then(recurse, onError);
  }

  /**
   * Asynchronously ask for a short-lived (a few seconds),
   * presigned URL that can be used to access and
   * download a file without authentication headers.
   *
   * @function
   * @memberof module:clb-storage.clbStorage
   * @param  {module:clb-storage.EntityDescriptor} entity The file to download
   * @return {Promise}        Return a string containing the URL once the Promise
   *                          is fulfilled.
   */
  function downloadUrl(entity) {
    var id = entity._uuid || entity;
    return $http.get(baseUrl + '/file/' + id + '/content/secure_link')
    .then(function(response) {
      return baseUrl + response.data.signed_url;
    }).catch(clbError.rejectHttpError);
  }
}

angular.module('clb-stream')
.provider('clbResourceLocator', clbResourceLocatorProvider);

var urlHandlers = [];

/**
 * Configure the clbResourceLocator service.
 * @return {object} An AngularJS provider instance
 */
function clbResourceLocatorProvider() {
  var provider = {
    $get: clbResourceLocator,
    registerUrlHandler: registerUrlHandler,
    urlHandlers: urlHandlers
  };

  /**
   * Add a function that can generate URL for some types of object reference.
   *
   * The function should return a string representing the URL.
   * Any other response means that the handler is not able to generate a proper
   * URL for this type of object.
   *
   * The function signature is ``function(objectReference) { return 'url' // or nothing}``
   * @memberof module:clb-stream
   * @param  {function} handler a function that can generate URL string for some objects
   * @return {provider} The provider, for chaining.
   */
  function registerUrlHandler(handler) {
    if (angular.isFunction(handler)) {
      urlHandlers.push(handler);
    }
    if (angular.isString(handler)) {
      urlHandlers.push(handler);
    }
    return provider;
  }

  return provider;
}

/**
 * @name clbResourceLocator
 * @desc
 * resourceLocator service
 * @memberof module:clb-stream
 * @param {object} $q        DI
 * @param {object} $log      DI
 * @param {object} $injector DI
 * @param {object} clbError  DI
 * @return {object} the service singleton
 */
function clbResourceLocator($q, $log, $injector, clbError) {
  return {
    urlFor: urlFor
  };

  /**
   * @desc
   * Asynchronous resolution of an object reference to an URL that access
   * this resource.
   *
   * The URL is generated using the registered URL handlers. If no URL
   * can be generated, a HbpError is thrown with ``type==='ObjectTypeException'``.
   * If the object reference is not valid, a HbpError is throw with
   * ``type==='AttributeError'``. In both case ``data.ref will be set with
   * reference for which there is an issue.
   *
   * @memberof module:clb-stream.clbResourceLocator
   * @param  {object} ref object reference
   * @param  {object} activity the associated activity
   * @return {string} a atring representing the URL for this object reference
   */
  function urlFor(ref, activity) {
    if (!validRef(ref)) {
      return $q.reject(invalidReferenceException(ref));
    }
    var next = function(i) {
      if (i < urlHandlers.length) {
        var fn = urlHandlers[i];
        if (angular.isString(fn)) {
          fn = $injector.get(fn);
        }
        return $q.when(fn(ref, activity)).then(function(url) {
          if (angular.isString(url)) {
            return url;
          }
          if (angular.isDefined(url)) {
            $log.warn('unexpected result from URL handler', url);
          }
          return next(i + 1);
        });
      }
      return $q.reject(objectTypeException(ref));
    };
    return next(0);
  }

  /**
   * build an objectTypeException.
   * @private
   * @param  {object} ref ClbObjectReference
   * @return {HbpError}   error to be sent
   */
  function objectTypeException(ref) {
    return clbError.error({
      type: 'ObjectTypeException',
      message: 'Unkown object type <' + (ref && ref.type) + '>',
      data: {ref: ref}
    });
  }

  /**
   * build an objectTypeException.
   * @private
   * @param  {object} ref ClbObjectReference
   * @return {HbpError}   error to be sent
   */
  function invalidReferenceException(ref) {
    return clbError.error({
      type: 'AttributeError',
      message: 'Invalid object reference <' + ref + '>',
      data: {ref: ref}
    });
  }

  /**
   * Return wheter the object reference is valid or not.
   *
   * To be valid an ObjectReference must have a defined ``id`` and ``type``
   * @param  {any} ref the potential object reference
   * @return {boolean} whether it is or not an object reference
   */
  function validRef(ref) {
    return Boolean(ref && ref.id && ref.type);
  }
}

angular.module('clb-stream')
.factory('clbStream', clbStream);

/**
 * ``clbStream`` service is used to retrieve feed of activities
 * given a user, a collab or a specific context.
 *
 * @memberof module:clb-stream
 * @namespace clbStream
 * @param {function} clbAuthHttp angular dependency injection
 * @param {function} clbEnv angular dependency injection
 * @param {function} clbError angular dependency injection
 * @param {function} clbResultSet angular dependency injection
 * @param {function} moment angular dependency injection
 * @return {object} the clbActivityStream service
 */
function clbStream(clbAuthHttp, clbEnv, clbError, clbResultSet, moment) {
  return {
    getStream: getStream,
    getHeatmapStream: getHeatmapStream
  };

  /**
   * @name activityListFactoryFunc
   * @desc
   * Return activities
   *
   * @memberof module:clb-stream.clbStream
   * @param {boolean} next indicates if there is next page
   * @return {object} Activities
   */
  function activityListFactoryFunc(next) { // eslint-disable-line require-jsdoc
    return function(results) {
      if (!(results && results.length)) {
        return;
      }
      for (var i = 0; i < results.length; i++) {
        var activity = results[i];
        if (activity.time) {
          activity.time = new Date(Date.parse(activity.time));
        }
      }
      if (next) {
        return next(results);
      }
      return results;
    };
  }

  /**
   * Builds the URL options such as the from and to date
   * as well as the page_size
   * @memberof module:clb-stream.clbStream
   * @param {string} url original url
   * @param {object} options  pageSize:15, date:'2016-07-20'
   * @return {string} Built URL
   */
  function buildURLOptions(url, options) {
    // Addition of stream options e.g. date and page_size
    var paramToken = url.indexOf("?") === -1 ? "?" : "&";

    if (options.date) {
      var _targetDate = moment(options.date);
      var format = 'YYYY-MM-DD';
      url += paramToken + "from=" + _targetDate.format(format);
      url += "&to=" + _targetDate.add(1, 'day').format(format);
      paramToken = "&";
    }

    if (options.days) {
      url += paramToken + "days=" + options.days;
    } else if (options.pageSize) {
      url += paramToken + "page_size=" + options.pageSize;
    }

    return url;
  }

  /**
   * Get a feed of activities regarding an item type and id.
   * @memberof module:clb-stream.clbStream
   * @param  {string} type The type of object to get the feed for
   * @param  {string|int} id   The id of the object to get the feed for
   * @param  {object} options  Parameters to pass to the query
   * @return {Promise}         resolve to the feed of activities
   */
  function getStream(type, id, options) {
    options = angular.extend({}, options);
    options.resultsFactory = activityListFactoryFunc(
        options.resultsFactory);
    var url = clbEnv.get('api.stream.v0') + '/stream/' +
                         type + ':' + id + '/';

    url = buildURLOptions(url, options);
    return clbResultSet.get(clbAuthHttp.get(url), options)
    .catch(clbError.rejectHttpError);
  }

  /**
   * Returns a heatmap stream of the number of activities per
   * day for a HBPUser or HBPCollab
   * @param  {string} type The type of object to get the feed for
   * @param  {string|int} id   The id of the object to get the feed for
   * @param  {object} options  Parameters to pass to the query
   * @return {Promise}         resolve to the feed of activities
   */
  function getHeatmapStream(type, id, options) {
    options = angular.extend({resultKey: 'details'}, options);
    options.resultsFactory = activityListFactoryFunc(options.resultsFactory);

    var url = clbEnv.get('api.stream.v0') + '/heatmap/' +
        type + ':' + id + '/';

    url = buildURLOptions(url, options);

    return clbResultSet.get(clbAuthHttp.get(url), options)
        .catch(clbError.rejectHttpError);
  }
}

angular.module('clb-ui-dialog')
.factory('clbConfirm', clbConfirm);

/**
 * Service to trigger modal dialog.
 *
 * @namespace clbDialog
 * @memberof module:clb-ui-dialog
 * @param  {object} $rootScope Angular DI
 * @param  {object} $uibModal     Angular DI
 * @return {object}            Service Descriptor
 */
function clbConfirm($rootScope, $uibModal) {
  return {
    open: open
  };

  /**
   * Confirmation dialog
   * @param  {object} options Parameters
   * @return {Promise}        Resolve if the confirmation happens, reject otherwise
   */
  function open(options) {
    options = angular.extend({
      scope: $rootScope,
      title: 'Confirm',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      template: 'Are you sure?',
      closable: true
    }, options);

    var modalScope = options.scope.$new();
    modalScope.title = options.title;
    modalScope.confirmLabel = options.confirmLabel;
    modalScope.cancelLabel = options.cancelLabel;
    modalScope.confirmationContent = options.template;
    modalScope.confirmationContentUrl = options.templateUrl;
    modalScope.closable = options.closable;
    modalScope.securityQuestion = options.securityQuestion;
    modalScope.securityAnswer = options.securityAnswer;

    var instance = $uibModal.open({
      template:'<div class="modal-header"><button type="button" ng-show="closable" class="close" ng-click="$dismiss(\'cancel\')" aria-hidden="true">&times;</button><h4 class="modal-title">{{title}}</h4></div><div class="modal-body"><alert ng-if="error" type="danger">{{error.reason}}</alert><div class="alert alert-warning" ng-show="securityQuestion">Unexpected bad things will happen if you don’t read this!</div><ng-include ng-if="confirmationContentUrl" src="confirmationContentUrl"></ng-include><p ng-if="!confirmationContentUrl">{{confirmationContent}}</p><fieldset class="form-group" ng-show="securityQuestion"><label for="securityAnswer">{{securityQuestion}}</label> <input type="text" class="form-control" name="securityAnswer" ng-model="answer"></fieldset></div><div class="modal-footer"><button class="btn btn-default" ng-click="$dismiss(\'cancel\')">{{cancelLabel}}</button> <button class="btn btn-danger" ng-disabled="securityAnswer && answer !== securityAnswer" ng-click="$close()">{{confirmLabel}}</button></div>',
      show: true,
      backdrop: 'static',
      scope: modalScope,
      keyboard: options.keyboard || options.closable
    });
    return instance.result;
  }
}

angular.module('clb-ui-error')
.factory('clbErrorDialog', clbErrorDialog);

/**
 * The factory ``clbUiError`` instantiates modal error dialogs.
 * Notify the user about the given error.
 * @name clbError
 * @memberof module:clb-ui-error
 * @param  {object} $uibModal Angular DI
 * @param  {object} clbError  Angular DI
 * @return {object}           Angular Factory
 */
function clbErrorDialog($uibModal, clbError) {
  return {
    open: open
  };

  /**
   * Open an error modal dialog
   * @param  {HBPError} error The error do displays
   * @param  {object} options Any options will be passed to $uibModal.open
   * @return {Promse}         The result of $uibModal.open
   */
  function open(error, options) {
    options = angular.extend({
      template:'<div class="error-dialog panel panel-danger"><div class="panel-heading"><h4>{{vm.error.type}}</h4></div><div class="panel-body"><p>{{vm.error.message}}</p></div><div class="panel-footer"><div><button type="button" ng-click="$close(true)" class="btn btn-primary"><span class="glyphicon glyphicon-remove"></span> Close</button> <button type="button" class="btn btn-default pull-right" ng-click="isErrorSourceDisplayed = !isErrorSourceDisplayed">{{isErrorSourceDisplayed ? \'Hide\' : \'Show\'}} scary details <span class="caret"></span></button></div><div uib-collapse="!isErrorSourceDisplayed"><h5>Error Type</h5><pre>{{vm.error.type}}</pre><h6>Error Code</h6><pre>{{vm.error.code}}</pre><h6>Message</h6><pre>{{vm.error.message}}</pre><div ng-if="vm.error.data"><h6>Data</h6><pre>{{vm.error.data}}</pre></div><div><h6>Stack Trace</h6><pre>{{vm.error.stack}}</pre></div></div></div></div>',
      class: 'error-dialog',
      controller: function() {
        var vm = this;
        vm.error = clbError.error(error);
      },
      controllerAs: 'vm',
      bindToController: true
    }, options);
    return $uibModal.open(options).result.catch(function() {
      // resolve anytime.
      return true;
    });
  }
}

angular.module('clb-ui-error')
.directive('clbErrorMessage', clbErrorMessage);

/**
 * The ``clb-error-message`` directive displays an error.
 *
 *
 * clb-error is a HbpError instance, built by the HbpErrorService
 *
 * @namespace clbErrorMessage
 * @memberof module:clb-ui-error
 * @example <caption>Retrieve the current context object</caption>
 * <div ng-controller='SomeController'>
 *   Validation error:
 *   <clb-error-message clb-error='error'></clb-error-message>
 *   Permission denied error:
 *   <clb-error-message clb-error='errorPermissions'></clb-error-message>
 * </div>
 * @return {object} The directive
 **/
function clbErrorMessage() {
  return {
    restrict: 'E',
    scope: {
      error: '=?clbError'
    },
    template:'<uib-alert type="danger" ng-if="error"><div ng-switch on="error.type"><div ng-switch-when="Validation">Validation errors<span ng-show="error.data">:</span><ul><li ng-repeat="(attr, errors) in error.data">{{attr}}: {{errors.join(\', \')}}</li></ul></div><div ng-switch-default>{{error.message}}</div></div></uib-alert>'
  };
}

/**
 * @namespace clbFormControlFocus
 * @memberof module:clb-ui-form
 * @desc
 * The ``clbFormControlFocus`` Directive mark a form element as the one that
 * should receive the focus first.
 * @example <caption>Give the focus to the search field</caption>
 * angular.module('exampleApp', ['clb-ui-form']);
 *
 * // HTML snippet:
 * // <form ng-app="exampleApp"><input type="search" clb-ui-form-control-focus></form>
 */
angular.module('clb-ui-form')
.directive('clbFormControlFocus', ['$timeout', function clbFormControlFocus($timeout) {
  return {
    type: 'A',
    link: function formControlFocusLink(scope, elt) {
      $timeout(function() {
        elt[0].focus();
      }, 0, false);
    }
  };
}]);

/**
 * @namespace clbFormGroupState
 * @memberof module:clb-ui-form
 * @desc
 * ``clbFormGroupState`` directive flag the current form group with
 * the class has-error or has-success depending on its form field
 * current state.
 *
 * @example
 * <caption>Track a field validity at the ``.form-group`` level</caption>
 * angular.module('exampleApp', ['hbpCollaboratory']);
 */
angular.module('clb-ui-form')
.directive('clbFormGroupState', function formGroupState() {
  return {
    type: 'A',
    scope: {
      model: '=clbFormGroupState'
    },
    link: function formGroupStateLink(scope, elt) {
      scope.$watchGroup(['model.$touched', 'model.$valid'], function() {
        if (!scope.model) {
          return;
        }
        elt.removeClass('has-error', 'has-success');
        if (!scope.model.$touched) {
          return;
        }
        if (scope.model.$valid) {
          elt.addClass('has-success');
        } else {
          elt.addClass('has-error');
        }
      }, true);
    }
  };
});

angular.module('clb-ui-loading')
.directive('clbLoading', clbLoading);

/**
 * The directive clbLoading displays a simple loading message. If a promise
 * is given, the loading indicator will disappear once it is resolved.
 *
 * Attributes
 * ----------
 *
 * =======================  ===================================================
 * Name                     Description
 * =======================  ===================================================
 * {Promise} [clb-promise]  Hide the loading message upon fulfilment.
 * {string} [clb-message]   Displayed loading string (default=``'loading...'``)
 * =======================  ===================================================
 *
 * @memberof module:clb-ui-loading
 * @return {object} Angular directive descriptor
 * @example <caption>Directive Usage Example</caption>
 * <hbp-loading hbp-promise="myAsyncFunc()" hbp-message="'Loading My Async Func'">
 * </hbp-loading>
 */
function clbLoading() {
  return {
    restrict: 'E',
    scope: {
      promise: '=?clbPromise',
      message: '=?clbMessage'
    },
    template:'<div class="clb-loading" ng-if="loading"><span class="glyphicon glyphicon-refresh clb-spinning"></span> {{message}}</div>',
    link: function(scope) {
      scope.loading = true;
      scope.message = scope.message || 'Loading...';
      if (scope.promise) {
        var complete = function() {
          scope.loading = false;
        };
        scope.promise.then(complete, complete);
      }
    }
  };
}

angular.module('clb-ui-loading')
.directive('clbPerformAction', clbPerformAction);

/**
 * @namespace clbPerformAction
 * @memberof module:clb-ui-loading
 *
 * @desc
 * clbPerformAction directive run an action when the given control is clicked.
 * it can be added as an attribute. While the action is running, the control
 * is disabled.
 *
 * @param {function} clbPerformAction  the code to run when the button is clicked.
 *                     this function must return a promise.
 * @param {string}   clbLoadingMessage text replacement for the element content.
 * @return {object}                      Directive Descriptor
 * @example <caption>use perform action to disable a button while code is running</caption>
 * <div ng-controller="myController">
 *  <input class="btn btn-primary" type="submit" clb-perform-action="doSomething()">
 * </div>
 */
function clbPerformAction() {
  return {
    restrict: 'A',
    scope: {
      action: '&clbPerformAction'
    },
    link: function(scope, element, attrs) {
      var onComplete = function() {
        element.html(scope.text);
        element.attr('disabled', false);
        element.removeClass('loading');
      };
      var run = function() {
        if (scope.loadingMessage) {
          element.html(scope.loadingMessage);
        }
        element.addClass('loading');
        element.attr('disabled', true);
        scope.action().then(onComplete, onComplete);
      };
      scope.loadingMessage = attrs.clbLoadingMessage;
      scope.text = scope.text || element.html();
      element.on('click', run);
    }
  };
}

angular.module('clb-app')
.factory('clbApp', clbApp);

/**
 * @namespace clbApp
 * @memberof module:clb-app
 * @desc
 * An AngularJS service to interface a web application with the HBP Collaboratory.
 * This library provides a few helper to work within the Collaboratory environment.
 *
 * Usage
 * -----
 *
 * - :ref:`module-clb-app.clbApp.context` is used to set and retrieve
 *   the current context.
 * - :ref:`module-clb-app.clbApp.emit` is used to send a command
 *   to the HBP Collaboratory and wait for its answer.
 *
 * @example <caption>Retrieve the current context object</caption>
 * clbApp.context()
 * .then(function(context) {
 *   console.log(context.ctx, context.state, context.collab);
 * })
 * .catch(function(err) {
 *   // Cannot set the state
 * });
 *
 * @example <caption>Set the current state in order for a user to be able to copy-paste its current URL and reopen the same collab with your app loaded at the same place.</caption>
 * clbApp.context({state: 'lorem ipsum'})
 * .then(function(context) {
 *   console.log(context.ctx, context.state, context.collab);
 * })
 * .catch(function(err) {
 *   // Cannot set the state
 * });
 *
 * @param  {object} $log AngularJS service injection
 * @param  {object} $q AngularJS service injection
 * @param  {object} $rootScope AngularJS service injection
 * @param  {object} $timeout AngularJS service injection
 * @param  {object} $window AngularJS service injection
 * @param  {object} clbError AngularJS service injection
 * @return {object}         the service singleton
 */
function clbApp(
  $log,
  $q,
  $rootScope,
  $timeout,
  $window,
  clbError
) {
  var eventId = 0;
  var sentMessages = {};

  /**
   * Singleton class
   */
  function AppToolkit() { }
  AppToolkit.prototype = {
    emit: emit,
    context: context,
    open: open
  };

  $window.addEventListener('message', function(event) {
    $rootScope.$emit('message', event.data);
  });

  $rootScope.$on('message', function(event, message) {
    if (!message || !message.origin || !sentMessages[message.origin]) {
      return;
    }
    if (message.eventName === 'resolved') {
      sentMessages[message.origin].resolve(message.data);
    } else if (message.eventName === 'error') {
      sentMessages[message.origin].reject(clbError.error(message.data));
    }
    sentMessages[message.origin] = null;
  });

  /**
   * Send a message to the HBP Collaboratory.
   * @memberof module:clb-app.clbApp
   * @param  {string} name name of the event to be propagated
   * @param  {object} data corresponding data to be sent alongside the event
   * @return  {Promise} resolve with the message response
   */
  function emit(name, data) {
    eventId++;
    sentMessages[eventId] = $q.defer();
    var promise = sentMessages[eventId].promise;
    $window.parent.postMessage({
      apiVersion: 1,
      eventName: name,
      data: data,
      ticket: eventId
    }, '*');
    return promise;
  }

  var currentContext;

  /**
   * @typedef HbpCollaboratoryContext
   * @memberof module:clb-app.clbApp
   * @type {object}
   * @property {string} mode - the current mode, either 'run' or 'edit'
   * @property {string} ctx - the UUID of the current context
   * @property {string} state - an application defined state string
   */

   /**
    * @memberof module:clb-app.clbApp
    * @desc
    * Asynchronously retrieve the current HBP Collaboratory Context, including
    * the mode, the ctx UUID and the application state if any.
    * @function context
    * @param {object} data new values to send to HBP Collaboratory frontend
    * @return {Promise} resolve to the context
    * @static
    */
  function context(data) {
    var d = $q.defer();
    var kill = $timeout(function() {
      d.reject(clbError.error({
        type: 'TimeoutException',
        message: 'No context can be retrieved'
      }));
    }, 250);

    if (data) {
      // discard context if new data should be set.
      currentContext = null;
    }

    if (currentContext) {
      // directly return context when cached.
      return d.resolve(currentContext);
    }
    emit('workspace.context', data)
    .then(function(context) {
      $timeout.cancel(kill);
      currentContext = context;
      d.resolve(context);
    })
    .catch(function(err) {
      d.reject(clbError.error(err));
    });
    return d.promise;
  }
  return new AppToolkit();

  /**
   * @desc
   * Open a resource described by the given ObjectReference.
   *
   * The promise will fulfill only if the navigation is possible. Otherwise,
   * an error will be returned.
   * @function open
   * @memberof module:clb-app.clbApp
   * @param {ObjectReference} ref  The object reference to navigate to
   * @return {Promise}  The promise retrieved by the call to emit
   */
  function open(ref) {
    $log.debug('Ask the frontend to navigate to:', ref);
    return emit('resourceLocator.open', {ref: ref});
  }
}

/* eslint require-jsdoc:0 valid-jsdoc:0 */
angular.module('clb-app')
.provider('clbAuth', authProvider);

function authProvider(clbAppHello, clbEnvProvider) {
  return {
    $get: ['$http', '$log', '$q', '$rootScope', '$timeout', 'clbEnv', 'clbError', function($http, $log, $q, $rootScope, $timeout, clbEnv, clbError) {
      _addHbpProvider();
      _loadApplicationInfo();
      _bindEvents();
      var _readEnvOnce = false;

      return {
        login: login,
        logout: logout,
        getAuthInfo: getAuthInfo
      };

      function login(options) {
        var d = $q.defer();
        if (!_readEnvOnce) {
          _readEnvOnce = true;
          var envToken = _readTokenFromEnv();
          if (envToken) {
            // The token delivered by the backend is considered valid.
            var authInfo = getAuthInfo(envToken);
            d.resolve(authInfo);
            $rootScope.$broadcast('clbAuth.changed', authInfo);
            return d.promise;
          }
        }
        clbAppHello.login('hbp', options)
        .then(function(res) {
          d.resolve(getAuthInfo(res.authResponse));
        }, function(err) {
          d.reject(_formatError(err));
        });
        return d.promise;
      }

      function logout(options) {
        var info = getAuthInfo();
        if (!info) {
          return $q.when(true);
        }
        var d = $q.defer();
        clbAppHello.logout('hbp', options)
        .then(function() {
          return d.resolve(true);
        }, function(err) {
          d.reject(_formatError(err));
        });
        return d.promise;
      }

      function getAuthInfo(authResponse) {
        authResponse = authResponse || clbAppHello.getAuthResponse('hbp');
        if (!authResponse) {
          return null;
        }
        return {
          accessToken: authResponse.access_token,
          tokenType: authResponse.token_type,
          // When no scopes are specified, the server will generate a token
          // with the app default scopes. In this case hello.js don't know what
          // they are so we set the value to undefined by convention.
          scope: authResponse.scope || undefined,
          expires: authResponse.expires
        };
      }

      function _readTokenFromEnv() {
        var authInfo = clbEnv.get('auth.token', false);
        if (!authInfo) {
          return;
        }
        var now = (new Date()).getTime() / 1e3;
        if (!authInfo.expires && authInfo.expires_in) {
          authInfo.expires = (now) + authInfo.expires_in;
        }
        if (!authInfo.expires || now < authInfo.expires) {
          clbAppHello.utils.store('hbp', authInfo);
          return authInfo;
        }
      }

      function _formatError(err) {
        return clbError.error({
          type: err.error.code,
          message: err.error.message,
          data: err
        });
      }

      function _bindEvents() {
        clbAppHello.on('auth.login', _handleAuthInfoChange);
        clbAppHello.on('auth.logout', _handleAuthInfoChange);
      }

      function _handleAuthInfoChange(data, name) {
        if (data.network !== 'hbp') {
          return;
        }
        $log.debug('propagate auth event from original event', name);
        $timeout(function() {
          $rootScope.$broadcast('clbAuth.changed', getAuthInfo());
        }, 0);
      }

      /**
       * Define a new provider Hello.js provider for HBP
       */
      function _addHbpProvider() {
        clbAppHello.init({
          hbp: {
            name: 'Human Brain Project',
            oauth: {
              version: '2',
              auth: clbEnvProvider.get('auth.url') + '/authorize',
              grant: clbEnvProvider.get('auth.url') + '/token'
            },
            // API base URL
            base: clbEnvProvider.get('auth.url') + '/',
            scope_delim: ' ', // eslint-disable-line camelcase
            login: function(p) {
              // Reauthenticate
              if (p.options.force) {
                p.qs.prompt = 'login';
              }
              if (!p.qs.scope) {
                delete p.qs.scope;
              }
            },
            logout: function(callback, p) {
              $http.post(clbEnv.get('auth.url') + '/slo', {
                token: p.authResponse.access_token
              }, {
                withCredentials: true
              })
              .then(function() {
                callback();
              })
              .catch(function(err) {
                $log.error('Cannot kill the global session');
                $log.debug(err);
                callback();
              });
            }
          }
        });
      }

      /**
       * Set the current application data.
       */
      function _loadApplicationInfo() {
        clbAppHello.init({
          hbp: clbEnvProvider.get('auth.clientId')
        }, {
          default_service: 'hbp', // eslint-disable-line camelcase
          display: 'page',
          scope: clbEnvProvider.get('auth.scopes', null),
          force: false
        });
      }
    }]
  };
}

angular.module('clb-app')
.factory('clbAuthHttp', clbAuthHttp);

/**
 * Proxy $http to add the HBP bearer token.
 * Also handle 401 Authentication Required errors.
 * See $http service
 *
 * @param  {object} $http   DI
 * @param  {object} clbAuth DI
 * @return {function}       the service
 */
function clbAuthHttp($http, clbAuth) {
  var proxyHttp = function(config) {
    var auth = clbAuth.getAuthInfo();
    if (!auth) {
      return $http(config);
    }
    var authToken = auth.tokenType + ' ' + auth.accessToken;
    if (!config.headers) {
      config.headers = {
        Authorization: authToken
      };
    }
    config.headers.Authorization = authToken;
    return $http(config);
  };
  proxyHttp.get = _wrapper('GET');
  proxyHttp.head = _wrapper('HEAD');
  proxyHttp.delete = _wrapper('DELETE');
  proxyHttp.post = _wrapperData('POST');
  proxyHttp.put = _wrapperData('PUT');
  proxyHttp.patch = _wrapperData('PATCH');
  return proxyHttp;

  /**
   * Handle $http helper call for GET, DELETE, HEAD requests.
   *
   * @param  {string} verb the HTTP verb
   * @return {function}    The function to attach
   */
  function _wrapper(verb) {
    return function(url, config) {
      config = config || {};
      config.method = verb.toUpperCase();
      config.url = url;
      return proxyHttp(config);
    };
  }

  /**
   * Handle $http helper call for PUT, PATCH, POST requests.
   *
   * @param  {string} verb the HTTP verb
   * @return {function}    The function to attach
   */
  function _wrapperData(verb) {
    return function(url, data, config) {
      config = config || {};
      config.method = verb.toUpperCase();
      config.url = url;
      config.data = data;
      return proxyHttp(config);
    };
  }
}

/* global deferredBootstrapper, window, document */

/**
 * @namespace angular
 */

angular.clbBootstrap = clbBootstrap;

/**
 * Bootstrap AngularJS application with the HBP environment loaded.
 *
 * It is very important to load the HBP environement *before* starting
 * the application. This method let you do that synchronously or asynchronously.
 * Whichever method you choose, the values in your environment should look
 * very similar to the one in _`https://collab.humanbrainproject.eu/config.json`,
 * customized with your own values.
 *
 * At least ``auth.clientId`` should be edited in the config.json file.
 *
 * @memberof angular
 * @param {string} module the name of the Angular application module to load.
 * @param {object} options pass those options to deferredBootstrap
 * @param {object} options.env HBP environment JSON (https://collab.humanbrainproject.eu/config.json)
 * @return {Promise} return once the environment has been bootstrapped
 * @example <caption>Bootstrap the environment synchronously</caption>
 * angular.clbBootstrap('myApp', {
 *   env: { } // content from https://collab.humanbrainproject.eu/config.json
 * })
 * @example <caption>Bootstrap the environment asynchronously</caption>
 * angular.clbBootstrap('myApp', {
 *   env: 'https://my-project-website/config.json'
 * })
 * @example <caption>Using backward compatibility</caption>
 * window.bbpConfig = { } // content from https://collab.humanbrainproject.eu/config.json
 * angular.clbBoostrap('myApp')
 */
function clbBootstrap(module, options) {
  if (window.bbpConfig) {
    options.env = window.bbpConfig;
  }
  if (!options.element) {
    options.element = document.body;
  }
  options.module = module;
  if (!options.moduleResolves) {
    options.moduleResolves = {};
  }
  options.moduleResolves = [{
    module: 'clb-env',
    resolve: {
      // use injection here as it is not resolved automatically on build.
      CLB_ENVIRONMENT: ['$q', '$http', function($q, $http) {
        // Remove any previously defined CLB_ENVIRONMENT
        // As this results in unpredictable results when multiple apps
        // use this strategy.
        var invoker = angular.module(['clb-env'])._invokeQueue;
        for (var i = 0; i < invoker.length; i++) {
          var inv = invoker[i];
          if (inv[2][0] === 'CLB_ENVIRONMENT') {
            invoker.splice(i, 1);
            i--;
          }
        }
        if (angular.isString(options.env)) {
          return $http.get(options.env)
          .then(function(res) {
            // Set bbpConfig for backward compatibility
            window.bbpConfig = res.data;
            return res.data;
          });
        }
        // Set bbpConfig for backward compatibility
        if (!window.bbpConfig) {
          window.bbpConfig = options.env;
        }
        return $q.when(options.env);
      }]
    }
  }];
  return deferredBootstrapper.bootstrap(options);
}

angular.module('clb-ui-stream')
.directive('clbActivity', clbActivity);

/**
 * @name clbActivity
 * @desc
 * ``clb-activity`` directive is displays an activity retrieved by
 * the HBP Stream service in a common way.
 *
 * It try to look up for a detailled description of the event and fallback
 * to the summary if he cannot.
 *
 * @memberof module:clb-ui-stream
 * @return {object} the directive
 */
function clbActivity() {
  return {
    restrict: 'A',
    scope: {
      activity: '=clbActivity'
    },
    controller: ActivityController,
    controllerAs: 'vm',
    bindToController: true,
    template:'<div class="clb-activity-metadata"><div class="clb-activity-time" am-time-ago="vm.activity.time"></div><a clb-usercard-popover="vm.activity.actor.data" ng-click="vm.navigate($event, false)"><clb-user-avatar class="clb-activity-avatar" clb-user="vm.activity.actor.data" ng-if="vm.activity.actor.data"></clb-user-avatar></a></div><div class="clb-activity-summary"><span class="clb-activity-link" ng-repeat="p in vm.parts" ng-class="\'clb-activity-link-\' + p.tag"><a ng-if="p.tag && p.ref.type === \'HBPUser\'" clb-usercard-popover="p.ref.id" ng-click="vm.navigate($event, false)">{{p.text}}</a> <a ng-if="p.tag && p.ref.type !== \'HBPUser\'" ng-init="vm.resolveUrl(p)" ng-href="{{p.url}}">{{p.text}}</a> <span ng-if="!p.tag">{{p.text}}</span></span></div>',
    link: {
      post: function(scope, elt, attr, ctrl) {
        elt.addClass('clb-activity').addClass(ctrl.verbClass);
        scope.$watch('vm.activity.verb', function(newVal) {
          if (newVal) {
            elt.addClass('clb-activity-' + newVal.toLowerCase());
          }
        });
      }
    }
  };
}

/**
 * ViewModel of an activity used to render the clb-activity directive
 * @param {object} $scope    DI
 * @param {object} $sce      DI
 * @param {object} $log      DI
 * @param {object} $window   DI
 * @param {object} $q        DI
 * @param {object} $compile  DI
 * @param {object} clbResourceLocator DI
 * @param {object} clbErrorDialog DI
 */
function ActivityController(
  $scope,
  $sce,
  $log,
  $window,
  $q,
  $compile,
  clbResourceLocator,
  clbErrorDialog
) {
  var vm = this;
  vm.navigate = function(event, data) {
    event.preventDefault();
    event.stopPropagation();
    if (!angular.isDefined(data)) {
      $scope.$emit('clbActivity.interaction', {
        action: 'usePrimaryNavigation',
        tag: 'object'
      });
      $window.location = vm.primaryLink;
    } else if (data.ref && data.ref.type && data.ref.id) {
      $scope.$emit('clbActivity.interaction', {
        action: 'useSecondaryNavigation',
        tag: data.tag
      });
      clbResourceLocator.urlFor(data.ref, vm.activity)
      .then(function(url) {
        $window.location = url;
      })
      .catch(function(err) {
        $scope.$emit('clbActivity.interaction', {
          action: 'secondaryNavigationFailed',
          tag: data.tag
        });
        clbErrorDialog.open({
          type: 'Not Found',
          message: 'The system cannot generate a valid URL ' +
                   'to display this object.',
          code: 400,
          data: {
            error: err
          }
        });
      });
    } else {
      $scope.$emit('clbActivity.interaction', {
        action: 'openUserDetails',
        tag: 'actor'
      });
    }
  };

  vm.resolveUrl = function(data) {
    clbResourceLocator.urlFor(data.ref, vm.activity)
    .then(function(url) {
      data.url = url;
    });
  };

  activate();

  /* ------------- */

  /**
   * Replace references in the summary with proper names and links.
   *
   * This is a naive implementation. using an array of string that is
   * concatenated at the end. The advantage is that I don't have to
   * sort the references before processing them so the code is a bit
   * easier to read.
   * @private
   * @return {object} the list of parts as object with keys `tag`, `text` and `ref`.
   */
  function resolveReferences() {
    // Using a linked list to segment the text.
    var root = {
      // root only has a next property
      next: {
        // The node data
        data: {
          tag: null,
          ref: null
        },
        indices: [0, vm.activity.summary.length],
        next: null
      }
    };

    // flatten the list of references
    if (vm.activity.references) {
      for (var tag in vm.activity.references) {
        if (Object.prototype.hasOwnProperty.call(
            vm.activity.references, tag)) {
          var refs = vm.activity.references[tag];
          if (!angular.isArray(refs)) {
            refs = [refs];
          }
          for (var i = 0; i < refs.length; i++) {
            var ref = refs[i];
            processRef(root, tag, ref.indices);
          }
        }
      }
    }

    var head = root.next;
    var parts = [];
    while (head) {
      head.data.text = String.prototype.substring.apply(
        vm.activity.summary, head.indices);
      // disable object link for 'delete' verb
      if (vm.activity.verb === 'DELETE' &&
          head.data.tag === 'object') {
        head.data.tag = null;
      }
      parts.push(head.data);
      head = head.next;
    }
    return parts;
  }

  /**
   * Used by resolveReferences.
   * @private
   * @param  {object} root         The linked list root
   * @param  {string} tag          position in the sentence (actor|object|context)
   * @param  {array}  indices      [startIndex, endIndex]
   */
  function processRef(root, tag, indices) {
    // previous -> head -> next

    var previous = root;
    var head = root.next;
    // Find the last node which has an end index greater
    // than the node to insert. We do not handle the case
    // where the new node is crossing multiple existing nodes as this would
    // be invalid data.
    while (head.next && (
      indices[0] >= head.indices[1] // cannot be inverted
                                    // the head indices[1] is +1 after the
                                    // last char
    )) {
      previous = head;
      head = head.next;
    }

    // previous -> node|head -> next
    var node = {
      next: null,
      indices: indices,
      data: {
        tag: tag,
        ref: vm.activity[tag]
      }
    };

    if (head.indices[0] < indices[0]) {
      // previous -> head:before -> node
      // head -> next
      var before = angular.copy(head);
      before.indices[1] = indices[0]; // stop where the new part begin
      before.next = node;
      previous.next = before;
      previous = before;
    } else if (previous) {
      // previous -> node
      // head -> next
      previous.next = node;
    }

    // previous -> node
    // head -> next
    if (head.indices[1] > indices[1]) {
      // previous -> node -> head -> next
      head.indices[0] = indices[1];
      node.next = head;
    } else {
      // previous -> node -> next
      node.next = head.next;
    }
  }

  /**
   * init controller
   */
  function activate() {
    clbResourceLocator.urlFor(vm.activity.object, vm.activity)
    .then(function(url) {
      vm.primaryLink = url;
    })
    .catch(function(err) {
      $log.warn('unclickable activity', err);
    });

    vm.parts = resolveReferences();
  }
}

angular.module('clb-ui-stream')
.directive('clbFeed', clbFeed);

/**
 * @name clbFeed
 * @desc
 * ``clb-feed`` directive displays a feed of activity retrieved by
 * the HBP Stream service. It handles scrolling and loading of activities.
 * Each activity is rendered using the ``clb-activity`` directive.
 *
 * @memberof module:clb-ui-stream
 * @return {object} the directive
 */
function clbFeed() {
  return {
    restrict: 'E',
    scope: {
      feedType: '=clbFeedType',
      feedId: '=clbFeedId'
    },
    controller: FeedController,
    controllerAs: 'vm',
    bindToController: true,
    template:'<div ng-if="vm.loadingFeed" class="alert alert-info"><div ng-switch on="vm.feedDate"><div ng-switch-when="null">Loading all activities...</div><div class="animate-switch" ng-switch-default>Loading Feed for {{vm.feedDate}}...</div></div></div><p ng-if="vm.feedDate != null">Selected date: {{vm.feedDate}}</p><ul class="feed list-group" ng-if="!vm.loadingFeed" ng-class="{\'feed-empty\': vm.activities.results.length === 0}"><li ng-if="vm.error" class="list-group-item"><div class="alert alert-error"><strong>Load Error:</strong> {{vm.error}}</div></li><li class="list-group-item" ng-if="!vm.activities && !vm.error"><hbp-loading></hbp-loading></li><li class="list-group-item" ng-if="vm.activities.results.length === 0 && vm.feedDate"><div class="alert alert-info">No activities on {{vm.feedDate}}</div></li><li class="list-group-item" ng-if="vm.activities.results.length === 0 && !vm.feedDate"><div class="alert alert-info">No activities to show</div></li><li class="list-group-item" ng-repeat="a in vm.activities.results track by $index" clb-activity="a"></li><li class="list-group-item" ng-if="vm.activities.hasNext"><a clb-perform-action="vm.activities.next()" class="btn btn-default">Show More</a></li></ul>',
    link: function(scope, elt) {
      elt.addClass('clb-feed');
      var unbind = scope.$on(
        'clbActivity.interaction',
        function($event, data) {
          data.feedType = scope.feedType;
          scope.$emit('clbFeed.interaction', data);
        }
      );
      scope.$on('$destroy', unbind);
    }
  };
}

/**
 * ViewModel of an activity used to render the clb-activity directive
 * @param {object} $rootScope angular injection
 * @param {object} clbStream DI
 * @param {object} clbUser DI
 */
function FeedController($rootScope, clbStream, clbUser) {
  var vm = this;

  if (vm.feedType === 'HBPCollab') {
    vm.pageSize = 15;
  }

  vm.feedDate = null;

  activate();

  $rootScope.$on('feedDate.changed', function(event, data) {
    vm.feedDate = data;
    activate();
  });
  /* ------------- */

  function hydrateActors(activities) {  // eslint-disable-line require-jsdoc
    if (!activities || activities.length === 0) {
      return;
    }

    var acc = [];
    for (var i = 0; i < activities.length; i++) {
      if (activities[i].actor.type === 'HBPUser') {
        acc.push(activities[i].actor.id);
      }
    }
    return clbUser.get(acc)
    .then(function(users) {
      for (var i = 0; i < activities.length; i++) {
        var actor = activities[i].actor;
        if (actor.type === 'HBPUser' && users[actor.id]) {
          actor.data = users[actor.id];
        }
      }
    });
  }

  /**
   * init controller
   */
  function activate() {
    vm.loadingFeed = true;
    clbStream.getStream(vm.feedType, vm.feedId, {
      resultsFactory: hydrateActors,
      date: vm.feedDate,
      pageSize: vm.pageSize
    })
    .then(function(rs) {
      vm.activities = rs;
    })
    .catch(function(err) {
      vm.error = err.message;
    }).finally(function() {
      vm.loadingFeed = false;
    });
  }
}

angular.module('clb-ui-identity')
.directive('clbUserAvatar', clbUserAvatar);

/**
 * Display an square icon for a user.
 *
 * Attributes
 * ----------
 *
 * ==================  ====================================
 * Name                Description
 * ==================  ====================================
 * clb-user            The ClbUser instance to display
 * ==================  ====================================
 *
 * @namespace clbUserAvatar
 * @memberof module:clb-ui-identity
 * @return {Object} Directive Descriptor
 * @example <caption>Display user avatar</caption>
 * <clb-user-avatar clb-user="vm.currentUser"></clb-user-avatar>
 */
function clbUserAvatar() {
  'use strict';
  return {
    restrict: 'EA',
    scope: {
      user: '=clbUser'
    },
    template:'<img class="clb-user-avatar-img" ng-if="user.picture" ng-src="{{user.picture}}"><svg class="clb-user-avatar-icon" viewBox="0 0 40 40" preserveAspectRatio="xMidYMid meet" ng-cloak ng-if="!user.picture" ng-class="\'clb-user-avatar-icon-hue-\' + hueNumber"><rect x="0" y="0" width="40" height="40" class="clb-user-avatar-icon-fill"></rect><text x="50%" y="58%" font-size="26px" class="clb-user-avatar-icon-text" dominant-baseline="middle" text-anchor="middle">{{char}}</text></svg>',
    link: function(scope, elt) {
      elt.addClass('clb-user-avatar');
      scope.$watch('user', function() {
        if (!scope.user || !scope.user.displayName) {
          return;
        }

        if (scope.user.displayName) {
          scope.char = scope.user.displayName[0].toUpperCase();
        }
        // Define a hue index to generate a custom class
        var words = scope.user.displayName.split(/\s+/, 2);
        var initials = (String(words[0][0]) +
          (words[1] ? words[1][0] : words[0][1]))
          .toUpperCase();
        scope.hueNumber = (13 * initials.charCodeAt(0) * 23 *
          initials.charCodeAt(1)) % 7 + 1;
      });
    }
  };
}

angular.module('clb-ui-identity')
.directive('clbUsercardPopover', clbUsercardPopoverDirective);

/**
 * Display the user summary in a popover element.
 *
 * Only one of those can be open at any time.
 *
 * =======================================  =========================================
 * Name                  Description
 * =======================================  =========================================
 * {string|HBPUser} clb-usercard-popover    The ClbUser instance to display or its ID
 * =======================================  =========================================
 *
 * @namespace clbUsercardPopoverDirective
 * @memberof module:clb-ui-identity
 * @param  {object} $log               DI
 * @param  {object} $q                 DI
 * @param  {object} clbUser            DI
 * @param  {object} clbUsercardPopover DI
 * @return {object}                    Directive Descriptor
 */
function clbUsercardPopoverDirective(
  $log,
  $q,
  clbUser,
  clbUsercardPopover
) {
  return {
    restrict: 'A',
    scope: {
      user: '=clbUsercardPopover'
    },
    transclude: true,
    template:'<span class="clb-usercard-popover" popover-append-to-body="vm.popover.appendToBody" popover-is-open="vm.popover.isOpen" popover-trigger="outsideClick" ng-click="togglePopover($event)" uib-popover-template="\'usercard-popover.tpl.html\'" ng-transclude></span>',
    controller: function() {
      var vm = this;
      vm.popover = {
        isOpen: false,
        user: null,
        appendToBody: true
      };

      if (vm.user && vm.user.displayName) {
        vm.popover.user = vm.user;
      } else {
        clbUser.get(vm.user).then(function(user) {
          vm.popover.user = user;
        }).catch(function(err) {
          $log.error('Unable to get user with id', vm.user, err);
        });
      }
    },
    controllerAs: 'vm',
    bindToController: true,
    link: function(scope, elt, attrs, vm) {
      var unbind = scope.$on('clbUsercardPopover.open',
        function(event, element) {
          vm.popover.isOpen = (element === elt);
        });

      scope.$on('$destroy', unbind);

      scope.togglePopover = function($event, action) {
        if ($event.isDefaultPrevented()) {
          return;
        }
        $event.preventDefault();
        if (action === 'close') {
          return clbUsercardPopover.open(null);
        }
        clbUsercardPopover.open(vm.popover.isOpen ? null : elt);
      };
    }
  };
}

angular.module('clb-ui-identity')
.factory('clbUsercardPopover', clbUserCardPopoverService);

/**
 * A singleton to manage clb-usercard-popover instances
 * @namespace clbUserCardPopoverService
 * @memberof module:clb-ui-identity
 * @private
 * @param {object} $rootScope DI
 * @return {object} factory descriptor
 */
function clbUserCardPopoverService($rootScope) {
  return {
    open: function(element) {
      $rootScope.$broadcast('clbUsercardPopover.open', element);
    }
  };
}

angular.module('clb-ui-identity')
.run(['$templateCache', function($templateCache) {
  // During the build, templateUrl will be replaced by the inline template.
  // We need to inject it in template cache as it is used for displaying
  // the tooltip. Does it smell like a hack? sure, it is a hack!
  var injector = {
    template:'<clb-usercard clb-user="vm.popover.user" ng-click="togglePopover($event, \'close\')"></clb-usercard>'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('usercard-popover.tpl.html', injector.template);
  }
}]);

angular.module('clb-ui-identity')
.directive('clbUsercard', clbUsercard)
.run(clbUsercardCacheTemplate);

/**
 * Display general user informations.
 *
 * Attributes
 * ----------
 *
 * ==================  ====================================
 * Name                Description
 * ==================  ====================================
 * clb-user            The ClbUser instance to display
 * clb-template        URL of a custom template to use
 * ==================  ====================================
 *
 *
 * @param  {object} lodash Angular DI
 * @memberof module:clb-ui-identity
 * @return {object}        Directive Descriptor
 * @example <caption>Display user informations</caption>
 * <clb-usercard clb-user="vm.currentUser"></clb-usercard>
 * @example <caption>Using a different templates</caption>
 * <clb-usercard clb-user="vm.currentUser" clb-template="custom/simple-user.html">
 * </clb-usercard>
 */
function clbUsercard(lodash) {
  'use strict';
  return {
    restrict: 'EA',
    scope: {
      user: '=clbUser'
    },
    templateUrl: function(tElement, tAttrs) {
      return tAttrs.clbTemplate || 'usercard.directive.html';
    },
    link: {
      pre: function(scope) {
        scope.$watch('user', function(newValue) {
          scope.institution = newValue &&
            lodash.find(newValue.institutions, 'primary');
          scope.email = newValue &&
            lodash(newValue.emails).filter('primary').map('value').first();
          scope.phone = newValue &&
            lodash(newValue.phones).filter('primary').map('value').first();
          scope.ims = newValue && newValue.ims;
        });
      }
    }
  };
}

/**
 * During the build, templateUrl will be replaced by the inline template.
 * We need to inject it in template cache as it is used for displaying
 * the tooltip. Does it smell like a hack? sure, it is a hack!
 * @param  {object} $templateCache Angular DI
 * @private
 */
function clbUsercardCacheTemplate($templateCache) {
  //
  var injector = {
    template:'<div ng-if="user" class="clb-usercard clb-card clb-card-default"><h3 class="clb-usercard-header"><span class="clb-usercard-name">{{user.displayName}}</span> <span class="text-muted clb-usercard-username" uib-popover="{{user.id}}" popover-trigger="mouseenter" popover-popup-close-delay="2000" popover-placement="right">@{{user.username}}</span></h3><div class="clb-usercard-pix"><clb-user-avatar clb-user="user"></clb-user-avatar></div><div class="clb-usercard-institution" ng-if="institution"><span class="clb-usercard-institution-title">{{institution.title}}</span> <span ng-if="institution.title && (institution.name || institution.department)">,</span> <span class="clb-usercard-institution-name">{{institution.name}}</span> <span ng-if="institution.name && institution.department">,</span> <span class="clb-usercard-institution-dept">{{institution.department}}</span></div><div class="clb-usercard-contact"><a class="clb-usercard-contact-item clb-usercard-email" target="_top" href="mailto:{{email}}" ng-if="email"><span class="glyphicon glyphicon-envelope"></span> {{email}}</a> <span class="clb-usercard-contact-item clb-usercard-phone" ng-if="phone"><span class="glyphicon glyphicon-phone"></span> {{phone}}</span> <span class="clb-usercard-contact-item clb-usercard-im-list" ng-if="ims.length"><span class="glyphicon glyphicon-bullhorn"></span> <span ng-repeat-start="im in ims"></span> <span class="clb-usercard-im">{{im.value}}({{im.type}})</span> <span ng-repeat-end></span></span></div></div>'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('usercard.directive.html', injector.template);
  }
}

/* global document */

angular.module('clb-error')
.factory('clbError', clbError);

/**
 * @class ClbError
 * @memberof module:clb-error
 * @desc
 * ``ClbError`` describes a standard error object used
 * to display error message or intropect the situation.
 *
 * A ``ClbError`` instance provides the following properties:
 *
 * * ``type`` a camel case name of the error type.
 * * `message` a human readable message of the error that should
 * be displayed to the end user.
 * * ``data`` any important data that might help the software to
 * inspect the issue and take a recovering action.
 * * ``code`` an error numerical code.
 *
 * The ClbError extends the native Javascript Error instance so it also provides:
 * * ``name`` which is equal to the type
 * * ``stack`` the stack trace of the error (when available)
 *
 * Only ``type``, ``message``, and ``code`` should be considered to be present.
 * They receive default values when not specified by the situation.
 *
 * @param {object} [options] the parameters to use to build the error
 * @param {string} [options.type] the error type (default to ``'UnknownError'``)
 * @param {string} [options.message] the error message (default to ``'An unknown error occurred'``)
 * @param {int} [options.code] the error code (default to ``-1``)
 * @param {object} [options.data] any data that can be useful to deal with the error
 */
function ClbError(options) {
  options = angular.extend({
    type: 'UnknownError',
    message: 'An unknown error occurred.',
    code: -1
  }, options);
  this.type = options.type || options.name;
  this.name = this.type; // Conform to Error class
  this.message = options.message;
  this.data = options.data;
  this.code = options.code;
  this.stack = (new Error()).stack;
  if (options instanceof Error) {
    // in case this is a javascript exception, keep the raw cause in data.cause
    this.data = angular.extend({cause: options}, this.data);
  }
}
// Extend the Error prototype
ClbError.prototype = Object.create(Error.prototype);
ClbError.prototype.toString = function() {
  return String(this.type) + ':' + this.message;
};

/**
 * @namespace clbError
 * @memberof module:clb-error
 * @desc
 * ``clbError`` provides helper functions that all return an
 * ``ClbError`` instance given a context object.
 * @param {object} $q AngularJS injection
 * @return {object} the service singleton
 */
function clbError($q) {
  return {
    rejectHttpError: function(err) {
      return $q.reject(httpError(err));
    },
    httpError: httpError,

    /**
     * Build a ``ClbError`` instance from the provided options.
     *
     * - param  {Object} options argument passed to ``ClbError`` constructor
     * - return {ClbError} the resulting error
     * @memberof module:clb-error.clbError
     * @param  {object} options [description]
     * @return {object}         [description]
     */
    error: function(options) {
      if (options && options instanceof ClbError) {
        return options;
      }
      return new ClbError(options);
    }
  };

  /**
   * @desc
   * return a `ClbError` instance built from a HTTP response.
   *
   * In an ideal case, the response contains json data with an error object.
   * It also fallback to a reason field and fill default error message for
   * standard HTTP status error.
   * @memberof module:clb-error.clbError
   * @param  {HttpResponse} response Angular $http Response object
   * @return {ClbError} a valid ClbError
   */
  function httpError(response) {
    // return argument if it is already an
    // instance of ClbError
    if (response && response instanceof ClbError) {
      return response;
    }

    if (response.status === undefined) {
      return new ClbError({
        message: 'Cannot parse error, invalid format.'
      });
    }
    var error = new ClbError({code: response.status});

    if (error.code === 0) {
      error.type = 'ClientError';
      error.message = 'The client cannot run the request.';
      return error;
    }
    if (error.code === 404) {
      error.type = 'NotFound';
      error.message = 'Resource not found';
      return error;
    }
    if (error.code === 403) {
      error.type = 'Forbidden';
      error.message = 'Permission denied: you are not allowed to display ' +
                      'the page or perform the operation';
      return error;
    }
    if (error.code === 502) {
      error.type = 'BadGateway';
      error.message = '502 Bad Gateway Error';
      if (response.headers('content-type') === 'text/html') {
        var doc = document.createElement('div');
        doc.innerHTML = response.data;
        var titleNode = doc.getElementsByTagName('title')[0];
        if (titleNode) {
          error.message = titleNode.innerHTML;
        }
      }
      return error;
    }
    if (response.data) {
      var errorSource = response.data;
      if (errorSource.error) {
        errorSource = errorSource.error;
      }
      if (errorSource.type) {
        error.type = errorSource.type;
      }
      if (errorSource.data) {
        error.data = errorSource.data;
      }
      if (errorSource.message) {
        error.message = errorSource.message;
      } else if (errorSource.reason) {
        error.type = 'Error';
        error.message = errorSource.reason;
      }

      if (!errorSource.type && !errorSource.data &&
        !errorSource.message && !errorSource.reason) {
        // unkown format, return raw data
        error.data = errorSource;
      }
    }
    return error;
  }
}

angular.module('clb-ui-storage')
.directive('clbFileBrowserFolder', clbFileBrowserFolder);

/**
 * @namespace clbFileBrowserFolder
 * @desc
 * clbFileBrowserFolder directive is a child directive of
 * clbFileBrowser that render a folder item within the file browser view.
 *
 * Available attributes:
 *
 * - clb-ui-storage-folder: the folder entity
 * - [clb-ui-storage-folder-icon]: a class name to display an icon
 * - [clb-ui-storage-folder-label]: a label name (default to folder._name)
 *
 * @example
 * <!-- minimal -->
 * <div clb-ui-storage-folder="folderEntity"></div>
 * <!-- all wings out -->
 * <div clb-ui-storage-folder="folderEntity"
 *      clb-ui-storage-folder-icon="fa fa-level-up"
 *      clb-ui-storage-label="up"></div>
 *
 * @memberof module:clb-ui-storage.clbFileBrowser
 * @return {object} Angular Directive
 */
function clbFileBrowserFolder() {
  return {
    restrict: 'A',
    require: '^clbFileBrowser',
    template:'<div class="clb-file-browser-item clb-file-browser-folder" ng-dblclick="browserView.handleNavigation(folder)" ng-click="browserView.handleFocus(folder)" hbp-on-touch="browserView.handleNavigation(folder)" ng-class="{\'clb-file-browser-item-selected\': browserView.selectedEntity === folder}"><div class="clb-file-browser-label"><i class="fa" ng-class="folderIcon ? folderIcon : \'fa-folder\'"></i><span>{{folderLabel || folder._name}}</span></div></div>',
    scope: {
      folder: '=clbFileBrowserFolder',
      folderIcon: '@clbFileBrowserFolderIcon',
      folderLabel: '@clbFileBrowserFolderLabel'
    },
    link: function(scope, element, attrs, ctrl) {
      // make the parent directive controller available in the scope
      scope.browserView = ctrl;
    }
  };
}

angular.module('clb-ui-storage')
.directive('clbFileBrowserPath', clbFileBrowserPath);

/**
 * @namespace clbFileBrowserPath
 * @desc
 * clbFileBrowserPath directive is a child of clbFileBrowser directive
 * that renders the breadcrumb according to the file browser setup.
 *
 * @example
 * <clb-file-browser-path></clb-file-browser-path>
 *
 * @memberof module:clb-ui-storage.clbFileBrowser
 * @param  {object} clbStorage Angular DI
 * @return {object} Angular Directive
 */
function clbFileBrowserPath(clbStorage) {
  return {
    restrict: 'E',
    require: '^clbFileBrowser',
    template:'<ul class="breadcrumb clb-file-browser-path"><li class="root" ng-if="!browserView.isRoot"><a ng-click="browserView.handleNavigation(browserView.rootEntity)">{{browserView.rootEntity._name || \'[top]\'}}</a></li><li ng-repeat="entity in ancestors"><a ng-click="browserView.handleNavigation(entity)">{{entity._name}}</a></li><li><span class="active">{{browserView.currentEntity._name || \'[top]\'}}</span></li></ul>',
    link: function(scope, element, attrs, ctrl) {
      var handleAncestors = function(ancestors) {
        scope.ancestors = ancestors;
      };

      var update = function() {
        if (ctrl.currentEntity) {
          clbStorage.getAncestors(ctrl.currentEntity, ctrl.rootEntity)
          .then(handleAncestors, ctrl.setError);
        } else {
          handleAncestors(null);
        }
      };

      scope.browserView = ctrl;

      scope.$watch('browserView.currentEntity', function(value) {
        update(value);
      });
    }
  };
}

angular.module('clb-ui-storage')
.run(['$templateCache', function($templateCache) {
  // During the build, templateUrl will be replaced by the inline template.
  // We need to inject it in template cache as it is used for displaying
  // the tooltip. Does it smell like a hack? sure, it is a hack!
  var injector = {
    template:'<div ng-init="browserView.defineThumbnailUrl(file)"><div class="file-browser-thumbnail thumbnail" ng-if="browserView.thumbnailUrl" aria-hidden="true"><img ng-src="{{browserView.thumbnailUrl}}"></div>{{file._name}}</div>'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('file-browser-tooltip.tpl.html', injector.template);
  }
}]);

angular.module('clb-ui-storage')
.directive('clbFileBrowser', clbFileBrowser);

// --------------- //

/**
 * @namespace clbFileBrowser
 * @desc
 * clbFileBrowser Directive
 *
 * This directive renders a file browser. It handles creation of folder,
 * mutliple file uploads and selection of entity. Focus selection change can be
 * detected by listening to the event ``clbFileBrowser:focusChanged``.
 *
 *
 * Attributes
 * ----------
 *
 * ===================================  ==========================================================
 * Parameter                            Description
 * ===================================  ==========================================================
 * ``{EntityDescriptor} [clb-root]``    A project or a folder that will be the root of the tree.
 * ``{EntityDescriptor} [clb-entity]``  The selected entity.
 * ===================================  ==========================================================
 *
 *
 * Events
 * ------
 *
 * ================================  ==========================================================
 * clbFileBrowser:focusChanged       Emitted when the user focus a new file or folder
 * clbFileBrowser:startCreateFolder  Emitted when the user start to create a new folder
 * ================================  ==========================================================
 *
 * @example <caption>Simple directive usage</caption>
 * <clb-file-browser clb-root="someProjectEntity"
 *                   clb-entity="someSubFolderEntity">
 * </clb-file-browser>
 *
 * @memberof module:clb-ui-storage
 * @return {object} Angular Directive
 * @param {object} lodash Angular DI
 */
function clbFileBrowser(lodash) {
  FileBrowserViewModel.$inject = ['$scope', '$log', '$q', '$timeout', 'clbStorage'];
  return {
    restrict: 'E',
    scope: {
      entity: '=?clbEntity',
      root: '=clbRoot'
    },
    template:'<div class="clb-file-browser" in-view-container ng-click="selectItem()"><clb-error-message clb-error="browserView.error"></clb-error-message><div class="navbar navbar-default"><div class="container-fluid"><div class="nav navbar-nav navbar-text"><clb-file-browser-path></clb-file-browser-path></div><div class="dropdown nav navbar-nav pull-right" uib-dropdown ng-if="browserView.canEdit"><button type="button" href class="btn btn-default navbar-btn dropdown-toggle" uib-dropdown-toggle><span class="glyphicon glyphicon-plus"></span> <span class="caret"></span></button><ul class="dropdown-menu" role="menu" uib-dropdown-menu><li ng-if="browserView.canEdit"><a ng-click="browserView.startCreateFolder()"><span class="fa fa-folder"></span> Create Folder</a></li><li ng-if="browserView.canEdit"><a ng-click="browserView.showFileUpload = true"><span class="fa fa-file"></span> Upload File</a></li></ul></div></div></div><div class="clb-file-browser-content"><div ng-if="browserView.isLoading" class="alert alert-info" role="alert">Loading...</div><div class="file-browser-upload" ng-if="browserView.showFileUpload"><button type="button" class="btn close pull-right" ng-click="browserView.showFileUpload = false"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button><clb-file-upload on-drop="browserView.onFileChanged(files)" on-error="browserView.setError(error)"></clb-file-upload></div><div ng-if="browserView.isRoot && browserView.isEmpty()" class="alert alert-info" role="alert">The collab storage is still empty, use the \'+\' button to upload some content.</div><ul><li ng-if="!browserView.isRoot" clb-file-browser-folder="browserView.parent" clb-file-browser-folder-label=".." clb-file-browser-folder-icon="fa-level-up"></li><li ng-repeat="folder in browserView.folders" clb-file-browser-folder="folder"></li><li ng-if="browserView.showCreateFolder" class="clb-file-browser-item"><div class="clb-file-browser-folder"><form class="form form-inline" action="index.html" method="post" ng-submit="browserView.doCreateFolder($event)"><div class="input-group"><input type="text" class="form-control new-folder-name" name="newFolderName" ng-model="browserView.newFolderName"> <span class="input-group-btn"><input class="btn btn-primary" type="submit" name="name" value="Ok"> <button class="btn btn-default" type="button" ng-click="browserView.cancelCreateFolder()"><span aria-hidden="true">&times;</span><span class="sr-only">Cancel</span></button></span></div></form></div></li><li class="clb-file-browser-item" ng-if="browserView.hasMoreFolders"><a class="clb-file-browser-label btn" clb-perform-action="browserView.loadMoreFolders()"><span class="fa fa-refresh"></span> Load More Folders</a></li><li ng-repeat="file in browserView.files" ng-dblclick="browseToEntity(file)" ng-click="browserView.handleFocus(file)" uib-tooltip-template="\'file-browser-tooltip.tpl.html\'" tooltip-placement="bottom" tooltip-popup-delay="600" class="clb-file-browser-item" ng-class="{ \'clb-file-browser-item-selected\': browserView.selectedEntity === file }"><div class="clb-file-browser-label"><hbp-content-icon content="file._contentType"></hbp-content-icon><span>{{file._name || file._uuid}}</span></div></li><li ng-repeat="uploadInfo in browserView.uploads" ng-click="browserView.handleFocus(null)" uib-tooltip="{{uploadInfo.content.name}}" tooltip-placement="bottom" tooltip-popup-delay="600" class="clb-file-browser-item" ng-class="\'clb-file-browser-state-\' + uploadInfo.state"><div class="clb-file-browser-label"><hbp-content-icon content="file._contentType"></hbp-content-icon><span>{{uploadInfo.content.name}}</span></div><div class="clb-file-browser-item-upload progress"><div class="progress-bar" role="progressbar" aria-valuenow="{{uploadInfo.progress}}" aria-valuemin="0" aria-valuemax="100" style="width: {{uploadInfo.progress.percentage}}%"><span class="sr-only">{{uploadInfo.progress.percentage}}% Complete</span></div></div></li><li class="clb-file-browser-item" ng-if="browserView.hasMoreFiles"><a class="clb-file-browser-label btn" clb-perform-action="browserView.loadMoreFiles()"><span class="fa fa-refresh"></span> Load more files</a></li></ul></div></div>',
    link: clbFileBrowserLink,
    controllerAs: 'browserView',
    controller: FileBrowserViewModel
  };

  /**
   * @namespace FileBrowserViewModel
   * @desc
   * ViewModel of the clbFileBrowser directive. This instance is
   * accessible by all direct children of the file browser.
   *
   * It is responsible to handle all the interactions between the user
   * and the services. It does not update the views directly but sends
   * the relevant events when necessary.
   * @memberof module:clb-ui-storage.clbFileBrowser
   * @param {object} $scope     Angular DI
   * @param {object} $log       Angular DI
   * @param {object} $q         Angular DI
   * @param {object} $timeout   Angular DI
   * @param {object} clbStorage Angular DI
   */
  function FileBrowserViewModel(
    $scope,
    $log,
    $q,
    $timeout,
    clbStorage
  ) {
    var vm = this;
    vm.currentEntity = null; // the (container) entity that this view currently describe
    vm.folders = []; // array of displayed folder
    vm.hasMoreFolders = false;
    vm.files = [];   // array of displayed files
    vm.uploads = []; // array of file currently uploading
    vm.hasMoreFiles = false;
    vm.selectedEntity = null; // currently focused entity
    vm.rootEntity = null; // the top level entity;
    vm.isRoot = true;
    vm.error = null;
    vm.isLoading = true;
    vm.canEdit = false;
    vm.thumbnailUrl = null; // current file thumbnail if any

    vm.init = init;
    vm.handleFocus = handleFocusEvent;
    vm.handleNavigation = handleNavigationEvent;
    vm.loadMoreFiles = loadMoreFiles;
    vm.loadMoreFolders = loadMoreFolders;
    vm.onFileChanged = onFileChanged;
    vm.startCreateFolder = startCreateFolder;
    vm.doCreateFolder = doCreateFolder;
    vm.cancelCreateFolder = cancelCreateFolder;
    vm.defineThumbnailUrl = defineThumbnailUrl;
    vm.isEmpty = isEmpty;

    // ---------------- //

    var currentUpdate;
    var folderLoader;
    var fileLoader;

    /**
     * Initialize the controller
     * @param  {EntityDescriptor} rootEntity    Cannot get past this ancestor
     * @param  {EntityDescriptor} currentEntity The selected entity
     * @private
     */
    function init(rootEntity, currentEntity) {
      vm.rootEntity = rootEntity;
      currentUpdate = update(currentEntity || rootEntity);
    }

    /**
     * @method handleFocus
     * @desc
     * When the user focus on a browser item,
     * emit a 'clbFileBrowser:focusChanged' event.
     *
     * The event signature is (event, newEntity, previousEntity).
     *
     * @param  {Object} entity selected entity
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function handleFocusEvent(entity) {
      if (entity === vm.selectedEntity) {
        return;
      }
      $scope.$emit('clbFileBrowser:focusChanged', entity, vm.selectedEntity);
      vm.selectedEntity = entity;
    }

    /**
     * @method handleNavigation
     * @desc When the current context change, trigger a navigation update.
     *
     * This will render the view for the new current entity. All navigations
     * are chained to ensure that the future view will end in a consistant
     * state. As multiple requests are needed to render a view, request result
     * would sometimes finish after a new navigation event already occured.
     *
     * @param  {Object} entity the new current entity
     * @return {promise} resolve when the navigation is done.
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function handleNavigationEvent(entity) {
      if (angular.isUndefined(entity) || entity === vm.currentEntity) {
        return;
      }
      currentUpdate = currentUpdate.finally(function() {
        return update(entity);
      });
      return currentUpdate;
    }

    /**
     * Handle error case
     * @private
     * @param {object} err The error to set
     */
    function setError(err) {
      $log.error('error catched by file browser:', err);
      vm.error = err;
      vm.isLoading = false;
    }

    /**
     * @private
     */
    function startCreateFolder() {
      vm.showCreateFolder = true;
      $timeout(function() {
        // the event is captured by the directive scope in order to update
        // the DOM. I choose to not update the DOM in the ViewModel but
        // rather in the directive link function.
        $scope.$emit('clbFileBrowser:startCreateFolder');
      });
    }

    /**
     * @private
     * @param  {Event} $event The browser event
     */
    function doCreateFolder($event) {
      $event.preventDefault();
      clbStorage.create('folder', vm.currentEntity, vm.newFolderName)
      .then(function(entity) {
        vm.newFolderName = '';
        return update(entity);
      })
      .then(function() {
        vm.showFileUpload = true;
      })
      .catch(setError);
    }

    /**
     * @private
     */
    function cancelCreateFolder() {
      vm.newFolderName = '';
      vm.showCreateFolder = false;
    }

    /**
     * Promise fulfilment contains the nearest container. Either the current
     * entity if it is a container, or its parent.
     * @param  {EntityDescriptor} entity The starting point entity
     * @return {Promise}          Fulfilment of the promise retrieve a container entity
     */
    function nearestContainer(entity) {
      if (!entity) {
        return $q.when(null);
      }
      if (clbStorage.isContainer(entity)) {
        return $q.when(entity);
      }
      // Set the currentEntity to the parent and then focus the file
      return clbStorage.getEntity(entity._parent);
    }

    /**
     * [update description]
     * @param  {EntityDescriptor} entity [description]
     * @return {Promise}        Resolve after update completion
     */
    function update(entity) {
      return nearestContainer(entity).then(function(container) {
        vm.isLoading = true;
        vm.currentEntity = container;
        vm.selectedEntity = entity;
        vm.error = null;
        vm.parent = null;
        vm.files = null;
        vm.folders = null;
        vm.uploads = [];
        vm.showFileUpload = false;
        vm.showCreateFolder = false;
        assignIsRoot(container);
        assignCanEdit(container);

        // special exit case for the storage root
        if (!container) {
          return clbStorage.getChildren(null)
          .then(function(rs) {
            return rs.toArray();
          })
          .then(function(projects) {
            vm.folders = projects;
            vm.isLoading = false;
          })
          .catch(setError);
        }

        var promises = [];

        // define the new parent entity
        if (!vm.isRoot && container._parent) {
          promises.push(
            clbStorage.getEntity(container._parent).then(assignParentEntity)
          );
        }

        // define the view folders
        folderLoader = clbStorage.getChildren(container, {
          accept: ['folder'],
          acceptLink: false
        }).instance;
        vm.folders = folderLoader.results;
        promises.push(
          folderLoader.promise
          .then(afterLoadFolders)
        );

        fileLoader = clbStorage.getChildren(container, {
          accept: ['file'],
          acceptLink: false
        }).instance;
        vm.files = fileLoader.results;
        promises.push(
          fileLoader.promise
          .then(afterLoadFiles)
        );

        return $q.all(promises).then(function() {
          vm.isLoading = false;
        });
      })
      .catch(setError);
    }

    /**
     * Load the next page of file entities for the current entity.
     *
     * @return {Promise} resolve when the files are loaded
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function loadMoreFiles() {
      return fileLoader.next()
      .then(afterLoadFiles)
      .catch(setError);
    }

    /**
     * Load the next page of folder entities for the current entity.
     *
     * @return {Promise} resolve when the folders are loaded
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function loadMoreFolders() {
      return folderLoader.next()
      .then(afterLoadFolders)
      .catch(setError);
    }

    /**
     * @private
     */
    function afterLoadFiles() {
      vm.hasMoreFiles = fileLoader.hasNext;
    }

    /**
     * @private
     */
    function afterLoadFolders() {
      vm.hasMoreFolders = folderLoader.hasNext;
    }

    /**
     * @private
     * @param  {EntityDescriptor} entity [description]
     */
    function assignIsRoot(entity) {
      if (!entity) {
        vm.isRoot = true;
      } else if (vm.rootEntity) {
        vm.isRoot = (entity._uuid === vm.rootEntity._uuid);
      } else {
        vm.isRoot = false;
      }
    }

    /**
     * @private
     * @param  {EntityDescriptor} entity The parent entity
     */
    function assignParentEntity(entity) {
      vm.parent = entity;
    }

    /**
     * Upload files that the user just added to the uploader widget.
     *
     * @param  {Array} files array of File
     */
    function onFileChanged(files) {
      lodash.each(files, function(f) {
        upload(f)
        .then(function(entity) {
          vm.files.push(entity);
        });
      });
      vm.showFileUpload = false;
    }

    /**
     * Create a file entity and upload its associated content.
     *
     * @param  {File} file the file to create and upload
     * @return {Promise} resolve when the file has been uploaded
     */
    function upload(file) {
      var uploadInfo = {
        content: file,
        state: null
      };
      vm.uploads.push(uploadInfo);
      return clbStorage.upload(file, {
        parent: vm.currentEntity
      })
      .then(function(entity) {
        // update file status
        file.state = 'success';
        lodash.remove(vm.uploads, function(info) {
          return info === uploadInfo;
        });
        return entity;
      }, function(err) {
        $log.error('upload error:', err);
        uploadInfo.state = 'error';
        setError(err);
        return $q.reject(err);
      }, function(progressEvent) {
        if (progressEvent && progressEvent.lengthComputable) {
          // update file status
          uploadInfo.state = 'progress';
          uploadInfo.progress = progressEvent;
          uploadInfo.progress.percentage = (progressEvent.loaded * 100) /
            progressEvent.total;
        }
      });
    }

    /**
     * Set the thumbnailUrl.
     * @param  {EntityDescriptor} file a file entity
     */
    function defineThumbnailUrl(file) {
      vm.thumbnailUrl = null;
      if (file._contentType && file._contentType.match(/^image\//)) {
        clbStorage.downloadUrl(file).then(function(res) {
          vm.thumbnailUrl = res;
        });
      }
    }

    var lastAssignCanEditRequest = $q.when();
    /**
     * @private
     * @param  {EntityDescriptor} entity a file entity
     * @return {Promise}        [description]
     */
    function assignCanEdit(entity) {
      lastAssignCanEditRequest = lastAssignCanEditRequest
      .then(function() {
        if (!entity) {
          vm.canEdit = false;
          return;
        }
        return clbStorage.getUserAccess(entity).then(function(acl) {
          vm.canEdit = acl.canWrite;
        });
      });
      return lastAssignCanEditRequest;
    }

    /**
     * @private
     * @return {boolean} if the current folder is empty
     */
    function isEmpty() {
      return !vm.isLoading &&
        (!vm.folders || vm.folders.length === 0) &&
        (!vm.files || vm.files.length === 0);
    }
  }
}

/**
 * @private
 * @param  {object} scope   Angular DI
 * @param  {Element} elt    Angular DI
 * @param  {object} attrs   Angular DI
 * @param  {object} ctrl    Angular DI
 */
function clbFileBrowserLink(scope, elt, attrs, ctrl) {
  // run the init function once, when the root has been defined.
  // this ensure the main page is not loaded first with all projects,
  // then with the correct root.
  var delWaitForRootWatcher = scope.$watch('root', function(root) {
    if (angular.isUndefined(root)) {
      return;
    }
    ctrl.init(root, scope.entity);
    var delEntityWatcher = scope.$watch('entity', function(value) {
      ctrl.handleNavigation(value);
    });
    scope.$on('$destroy', delEntityWatcher);
    delWaitForRootWatcher();
  });
  scope.$on('$destroy', delWaitForRootWatcher);
  scope.$on('clbFileBrowser:startCreateFolder', function(evt) {
    evt.preventDefault();
    elt[0].querySelector('.new-folder-name').focus();
  });
}

angular.module('clb-ui-storage')
.directive('clbFileChooser', clbFileChooser);

/**
 * The ``clbFileChooser`` directive let you browse the storage to pick a file.
 *
 * ====================  ===========================================================
 * Name                  Description
 * ====================  ===========================================================
 * [clb-root]            Cannot go beyond this ancestor in the browser
 * [ng-model]            The ngModel to bind to the chosen value
 * [clb-validate]        a string, array of string, regex or function (can be async)
 * ====================  ===========================================================
 *
 * The directive emit the following events:
 *
 * =============================  ====================================================
 * Name                           Description
 * =============================  ====================================================
 * clbFileChooser:fileSelected    The second parameter is the EntityDescriptor
 * clbFileChooser:cancel          The second parameter is the initial EntityDescriptor
 * =============================  ====================================================
 *
 * @namespace clbFileChooser
 * @memberof module:clb-ui-storage
 * @param {object} $q   Angular DI
 * @param {object} $log Angular DI
 * @return {object} Entity Descriptor
 */
function clbFileChooser($q, $log) {
  return {
    restrict: 'E',
    require: '^ngModel',
    scope: {
      root: '=clbRoot',
      ngModel: '=',
      validate: '=?clbValidate'
    },
    template:'<div class="clb-file-chooser"><clb-file-browser clb-entity="initialValue" clb-root="root"></clb-file-browser><div class="navbar navbar-form"><button type="button" ng-click="doChooseEntity()" class="btn btn-primary" ng-disabled="!canChooseCurrentEntity">Choose</button> <button type="button" ng-click="doCancel()" class="btn btn-default">Cancel</button></div></div>',
    link: clbFileChooserLink
  };

  /**
   * Linking function for the directive.
   * @private
   * @param  {object} scope The scope
   */
  function clbFileChooserLink(scope) {
    /**
     * A promise that fulfill to a boolean.
     * @private
     * @param  {EntityDescriptor}  value The entity to evaluate
     * @return {Boolean}       true if the value can be chosen
     */
    function isValid(value) {
      $log.debug('check validity of', value);
      if (!value) {
        return;
      }
      if (angular.isString(scope.validate)) {
        $log.debug('string comparison', scope.validate === value._contentType);
        return scope.validate === value._contentType;
      }
      if (angular.isArray(scope.validate)) {
        return scope.validate.indexOf(value._contentType) !== -1;
      }
      if (scope.validate instanceof RegExp) {
        return value && value._contentType.match(scope.validate);
      }
      if (angular.isFunction(scope.validate)) {
        return scope.validate(value);
      }
      return true;
    }

    scope.$on('clbFileBrowser:focusChanged', function(event, value) {
      return $q.when(isValid(value)).then(function(result) {
        $log.debug('validi entity', result);
        if (result) {
          scope.currentSelection = value;
        }
        scope.canChooseCurrentEntity = result;
      });
    });

    scope.doChooseEntity = function() {
      if (scope.currentSelection) {
        scope.ngModel = scope.currentSelection;
        $log.debug('file selection changed', scope.currentSelection);
        scope.$emit('clbFileChooser:fileSelected', scope.currentSelection);
      }
    };

    scope.doCancel = function() {
      scope.ngModel = scope.initialValue;
      scope.$emit('clbFileChooser:cancelSelection', scope.initialValue);
    };

    scope.initialValue = scope.ngModel;
    scope.currentSelection = scope.ngModel;
    scope.canChooseCurrentEntity = isValid(scope.currentSelection);
  }
}

/**
 * @namespace clbFileUpload
 * @desc
 * clbFileUpload directive.
 *
 * Provide an upload widget where user can stack files that should be
 * uploaded at some point. The directive doesn't proceed to upload by itself
 * but rather triggers the onDrop callback.
 *
 * The directive accepts the following attributes:
 *
 * - on-drop: a function to call when one or more files are dropped or selected
 *   the callback will receive an array of File instance.
 * - on-error: a function to call when an error occurs. It receives an HbpError
 *   instance in parameter.
 *
 * @example
 * <clb-file-upload on-drop="handleFileUpload(files)"
 *                       on-error="handleError(error)">
 * </clb-file-upload>
 * @memberof module:clb-ui-storage
 */
angular.module('clb-ui-storage')
.directive('clbFileUpload', function() {
  'use strict';
  return {
    template:'<div class="clb-file-upload" ng-class="{\'clb-file-upload-drag-enter\': dragEntered, \'clb-file-upload-drag-leave\': !dragEntered}" ng-cloak><h4>Drop Files Here to Upload</h4><span>or</span><div class="btn btn-default clb-file-upload-btn-file">Select Files <input type="file" multiple onchange="angular.element(this).scope().onFileChanged(this.files)"></div></div>',
    restrict: 'E',
    scope: {
      onDrop: '&',
      onError: '&',
      foldersAllowed: '='
    },
    link: function(scope, element) {
      var processDragOver = function(event) {
        event.preventDefault();
        event.stopPropagation();
      };

      var processDragEnter = function(event) {
        event.preventDefault();
        event.stopPropagation();

        scope.dragEntered = true;
        scope.$apply();
      };

      var processDragLeave = function(event) {
        event.preventDefault();
        event.stopPropagation();

        scope.dragEntered = false;
        scope.$apply();
      };

      scope.processDrop = function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!event.dataTransfer && event.originalEvent) {
          event.dataTransfer = event.originalEvent.dataTransfer;
        }

        scope.dragEntered = false;

        if (!scope.foldersAllowed) {
          var folders = getFolders(event.dataTransfer);
          if (folders.length > 0) {
            var err = new Error('Folders not allowed');
            err.name = 'foldersNotAllowed';
            err.files = folders;
            scope.onError({error: err});
            return false;
          }
        }

        scope.onDrop({files: event.dataTransfer.files});
      };

      /**
       * return the list of folders in the input dataTransfer object
       * @private
       * @param {DataTransfer} dataTransfer contains folder and files
       * @return {array/File}               contain only folders
       */
      function getFolders(dataTransfer) {
        var retList = [];

        // supported by chrome only
        var items = dataTransfer.items;
        if (items) {
          for (var i = 0; i < items.length; i++) {
            if (items[i].webkitGetAsEntry().isDirectory) {
              retList.push(items[i].webkitGetAsEntry().name);
            }
          }
        } else {
          // check if unix folders
          var files = dataTransfer.files;
          for (var j = 0; j < files.length; j++) {
            // assuming that the chances a (dropped) file is exactly multiple of 4k are low
            if (files[j].size % 4096 === 0) {
              retList.push(files[j].name);
            }
          }
        }

        // Safari is detecting the error when trying to upload it

        // not covered case: FF on OSX

        return retList;
      }

      scope.onFileChanged = function(files) {
        scope.onDrop({files: files});
      };

      // enter
      element.on('dragover', processDragOver);
      element.on('dragenter', processDragEnter);
      // exit
      element.on('dragleave', processDragLeave);

      element.on('drop', scope.processDrop);
    }
  };
});

})();

//# sourceMappingURL=maps/angular-hbp-collaboratory.js.map
