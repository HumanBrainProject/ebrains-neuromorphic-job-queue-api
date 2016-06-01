/**
 * @namespace hbpCollaboratory
 * @desc
 * ``hbpCollaboratory`` module is a shell around various AngularJS modules that
 *  interface with the HBP Collaboratory.
 *
 * - :doc:`clb-app <module:clb-app>` provides utilities to retrieve current
 *   HBP Collaboratory Context in an app and to communicate with the current
 *   Collaboratory instance.
 * - :doc:`clb-automator <module:clb-automator>` to automate a serie of
 *   Collaboratory actions.
 * - :doc:`clb-feed <module:clb-feed>` retrieve and display stream of activities.
 */
angular.module('hbpCollaboratory', [
  'clb-automator',
  'clb-app',
  'clb-storage',
  'clb-datetime',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore',
  'clb-form',
  'clb-stream'
]);

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
angular.module('clb-app', ['hbpCommon']);

angular.module('clb-datetime', []);

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
  'bbpConfig',
  'hbpCommon',
  'hbpDocumentClient',
  'hbpCollaboratoryAppStore',
  'hbpCollaboratoryNavStore',
  'clb-storage'
]);

/**
 * @namespace clb-form
 * @memberof hbpCollaboratory
 * @desc
 * clb-form provides directive to ease creation of forms.
 */
angular.module('clb-form', []);

/**
 * @module clb-storage
 */
angular.module('clb-storage', ['hbpCommon', 'hbpDocumentClient']);

/**
 * @module clb-stream
 * @desc
 * The `clb-stream` module contains a service and a few directives to retrieve
 * and display the HBP Collaboratory stream provided
 * by the various applications.
 */

angular.module('clb-stream', ['bbpConfig', 'clb-datetime', 'hbpCommon']);


clbApp.$inject = ['$q', '$rootScope', '$timeout', '$window', 'hbpErrorService'];angular.module('clb-app')
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
 * @param  {object} $q AngularJS service injection
 * @param  {object} $rootScope AngularJS service injection
 * @param  {object} $timeout AngularJS service injection
 * @param  {object} $window AngularJS service injection
 * @param  {object} hbpErrorService AngularJS service injection
 * @return {object}         the service singleton
 */
function clbApp(
  $q,
  $rootScope,
  $timeout,
  $window,
  hbpErrorService
) {
  'use strict';
  var eventId = 0;
  var sentMessages = {};

  /**
   * @module hbpCollaboratoryAppToolkit
   */
  function AppToolkit() { }
  AppToolkit.prototype = {
    emit: emit,
    context: context
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
      sentMessages[message.origin].reject(hbpErrorService.error(message.data));
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
      d.reject(hbpErrorService.error({
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
      d.reject(hbpErrorService.error(err));
    });
    return d.promise;
  }
  return new AppToolkit();
}

/* global deferredBootstrapper, window, document */
(function() {
  'use strict';
  angular.clbBootstrap = clbBootstrap;

  /**
   * Bootstrap AngularJS application with the environment configuration loaded.
   * @param {string} module the name of the Angular application module to load.
   * @param {objects} options pass those options to deferredBootstrap
   * @return {Promise} return once the environment has been bootstrapped
   */
  function clbBootstrap(module, options) {
    if (!options.env) {
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
      module: 'clb-app',
      resolve: {
        CLB_ENVIRONMENT: function($q, $http) {
          // Remove any previously defined CLB_ENVIRONMENT
          // As this results in unpredictable results when multiple apps
          // use this strategy.
          var invoker = angular.module(['clb-app'])._invokeQueue;
          for (var i = 0; i < invoker.length; i++) {
            var inv = invoker[i];
            if (inv[2][0] === 'CLB_ENVIRONMENT') {
              invoker.splice(i, 1);
              i--;
            }
          }
          if (angular.isString(options.env)) {
            return $http.get(options.env);
          }
          return $q.when(options.env);
        }
      }
    }];
    return deferredBootstrapper.bootstrap(options);
  }
})();

/* global window */

(function() {
  clbEnv.$inject = ['$injector'];
  angular.module('clb-app')
  .provider('clbEnv', clbEnv);

  /**
   * Get environement information using dotted notation.
   * @param {object} $injector AngularJS injection
   * @return {object} provider
   */
  function clbEnv($injector) {
    var env;
    try {
      env = $injector.get('CLB_ENVIRONMENT');
    } catch (ex) {
      env = window.bbpConfig;
    }
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
     * @memberof module:clb-app.clbEnv
     * @param {string} key the environment variable to retrieve, using a key.
     * @param {any} [defaultValue] an optional default value.
     * @return {any} the value or ``defaultValue`` if the asked for configuration
     *               is not defined.
     */
    function get(key, defaultValue) {
      var parts = key.split('.');
      var cursor = env;
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
})();

/* global moment */
angular.module('clb-datetime', [])
.constant('moment', moment);

(function() {
  'use strict';
  clbTimeAgo.$inject = ['moment'];
  angular.module('clb-datetime')
  .filter('clbTimeAgo', clbTimeAgo);

  /**
   * @name clbTimeAgo
   * @desc
   * ``clbTimeAgo`` filter retrieves a string representing the time spent
   * between now and the given date representation.
   *
   * @memberof module:clb-datetime
   * @param  {object} moment AngularJS injection
   * @return {function} the filter function
   */
  function clbTimeAgo(moment) {
    return function(input) {
      return moment(input).fromNow();
    };
  }
})();


clbAutomator.$inject = ['$q', '$log', 'hbpErrorService'];angular.module('clb-automator')
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
 * @param {object} hbpErrorService injected service
 * @return {object} the clbAutomator Angular service singleton
 */
function clbAutomator(
  $q,
  $log,
  hbpErrorService
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
      throw hbpErrorService.error({
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
    return $q.reject(hbpErrorService.error({
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
        return $q.reject(hbpErrorService.error(err));
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
    return hbpErrorService({
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
.run(['$log', '$q', 'hbpCollabStore', 'clbAutomator', function createCollab(
  $log, $q, hbpCollabStore,
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
    return hbpCollabStore.create(attr);
  }
}]);

angular.module('clb-automator')
.run(['$log', 'hbpCollaboratoryAppStore', 'hbpCollaboratoryNavStore', 'clbAutomator', 'clbStorage', 'hbpEntityStore', function createNavItem(
  $log,
  hbpCollaboratoryAppStore,
  hbpCollaboratoryNavStore,
  clbAutomator,
  clbStorage,
  hbpEntityStore
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
      return hbpCollaboratoryAppStore.findOne({title: app});
    };
    var createNav = function(app) {
      return hbpCollaboratoryNavStore.getRoot(collabId())
      .then(function(parentItem) {
        return hbpCollaboratoryNavStore.addNode(collabId(),
          new hbpCollaboratoryNavStore.NavItem({
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
      return hbpEntityStore.get(descriptor.entity).then(setLink);
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
.run(['$log', '$q', '$http', 'bbpConfig', 'hbpFileStore', 'hbpErrorService', 'clbAutomator', 'hbpCollaboratoryNavStore', 'hbpCollaboratoryAppStore', function createOverview(
  $log, $q, $http, bbpConfig, hbpFileStore, hbpErrorService,
  clbAutomator, hbpCollaboratoryNavStore, hbpCollaboratoryAppStore
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
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
    $log.debug("Set the content of the overview page");
    var collabId = descriptor.collab || context.collab.id;
    var createContentFile = function(overview, descriptor, context) {
      $log.debug("Fill overview page with content from entity");

      return fetchSourceContent(descriptor, context)
        .then(function(source) {
          return $http.post(bbpConfig.get('api.richtext.v0') + '/richtext/', {
            ctx: overview.context,
            raw: source
          });
        });
    };

    var updateAppId = function(overview, descriptor) {
      $log.debug("Replace the overview page application id");

      return hbpCollaboratoryAppStore.findOne({title: descriptor.app})
        .then(function(app) {
          overview.update({appId: app.id});
          return hbpCollaboratoryNavStore.saveNode(collabId, overview);
        });
    };

    return hbpCollaboratoryNavStore
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
    return hbpFileStore.getContent(uuid);
  }
}]);

angular.module('clb-automator')
.run(['$log', '$q', 'hbpEntityStore', 'hbpErrorService', 'clbAutomator', 'clbStorage', function createStorage(
  $log, $q, hbpEntityStore,
  hbpErrorService,
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
        .getProjectByCollab(descriptor.collab || context.collab.id)
        .then(function(projectEntity) {
          var promises = {};
          angular.forEach(descriptor.entities, function(value, name) {
            if (angular.isString(value)) {
              $log.debug("Copy entity with UUID", value);
              promises[name] = (
                hbpEntityStore.copy(value, projectEntity._uuid));
            } else {
              $log.warn('Invalid configuration for storage task', descriptor);
            }
          });
          return $q.all(promises);
        });
    });
  }
}]);

/**
 * @namespace clbFormControlFocus
 * @memberof clb-form
 * @desc
 * The ``clbFormControlFocus`` Directive mark a form element as the one that
 * should receive the focus first.
 * @example <caption>Give the focus to the search field</caption>
 * angular.module('exampleApp', ['clb-form']);
 *
 * // HTML snippet:
 * // <form ng-app="exampleApp"><input type="search" clb-form-control-focus></form>
 */
angular.module('clb-form')
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
 * @memberof clb-form
 * @desc
 * ``clbFormGroupState`` directive flag the current form group with
 * the class has-error or has-success depending on its form field
 * current state.
 *
 * @example
 * <caption>Track a field validity at the ``.form-group`` level</caption>
 * angular.module('exampleApp', ['hbpCollaboratory']);
 */
angular.module('clb-form')
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

/* eslint camelcase: 0 */

/**
 * @namespace hbpCollaboratoryAppStore
 * @memberof hbpCollaboratory
 * @desc
 * hbpCollaboratoryAppStore can be used to find and work with the
 * registered HBP Collaboratory applications.
 */
angular.module('hbpCollaboratoryAppStore', ['bbpConfig', 'hbpCommon'])
.constant('folderAppId', '__collab_folder__')
.service('hbpCollaboratoryAppStore', ['$q', '$http', '$cacheFactory', 'hbpErrorService', 'bbpConfig', 'hbpUtil', function(
  $q, $http, $cacheFactory,
  hbpErrorService, bbpConfig, hbpUtil
) {
  var appsCache = $cacheFactory('__appsCache__');
  var urlBase = bbpConfig.get('api.collab.v0') + '/extension/';
  var apps = null;

  /**
   * @class App
   * @desc client representation of an application
   * @memberof hbpCollaboratory.hbpCollaboratoryAppStore
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
     * @memberof hbpCollaboratory.hbpCollaboratoryAppStore.App
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAppStore.App
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAppStore
   * @return {Promise} promise of the list of all applications
   */
  var list = function() {
    if (!apps) {
      return loadAll(hbpUtil.paginatedResultSet($http.get(urlBase), {
        factory: App.fromJson
      }));
    }
    return $q.when(apps);
  };

  /**
   * Retrieve an App instance from its id.
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
    return $http.get(urlBase + id + '/').then(function(res) {
      appsCache.put(id, App.fromJson(res.data));
      return appsCache.get(id);
    }, function(res) {
      return $q.reject(hbpErrorService.httpError(res));
    });
  };

  /**
   * @memberof hbpCollaboratory.hbpCollaboratoryAppStore
   * @param  {object} params query parameters
   * @return {Promise} promise of an App instance
   */
  var findOne = function(params) {
    return $http.get(urlBase, {params: params}).then(function(res) {
      var results = res.data.results;
      // Reject if more than one results
      if (results.length > 1) {
        return $q.reject(hbpErrorService.error({
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
    }, hbpUtil.ferr);
  };

  return {
    list: list,
    getById: getById,
    findOne: findOne
  };
}]);

/* eslint camelcase:[2, {properties: "never"}] */
'use strict';

/**
 * @namespace hbpCollaboratoryNavStore
 * @memberof hbpCollaboratory
 * @desc hbpCollaboratoryNavStore provides tools to create and manage
 *       navigation items.
 */
angular.module('hbpCollaboratoryNavStore', ['hbpCommon', 'uuid4'])
.service('hbpCollaboratoryNavStore', ['$q', '$http', '$log', '$cacheFactory', '$timeout', 'orderByFilter', 'uuid4', 'hbpUtil', 'bbpConfig', function($q, $http, $log,
    $cacheFactory, $timeout, orderByFilter, uuid4,
    hbpUtil, bbpConfig) {
  var collabApiUrl = bbpConfig.get('api.collab.v0') + '/collab/';
  // a cache with individual nav items
  var cacheNavItems = $cacheFactory('navItem');

  // a cache with the promises of each collab's nav tree root
  var cacheNavRoots = $cacheFactory('navRoot');

  /**
   * @class NavItem
   * @desc
   * Client representation of a navigation item.
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
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
     * @memberof hbpCollaboratory.hbpCollaboratoryNavStore.NavItem
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
     * @memberof hbpCollaboratory.hbpCollaboratoryNavStore.NavItem
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
     * @memberof hbpCollaboratory.hbpCollaboratoryNavStore.NavItem
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
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore.NavItem
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
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
   * @param  {number} collabId collab ID
   * @return {Promise} promise the root nav item
   */
  var getRoot = function(collabId) {
    var treePromise = cacheNavRoots.get(collabId);

    if (!treePromise) {
      treePromise = $http.get(collabApiUrl + collabId + '/nav/all/').then(
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
        hbpUtil.ferr
      );

      cacheNavRoots.put(collabId, treePromise);
    }

    return treePromise;
  };

  /**
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
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
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
   * @param  {str} ctx The context UUID
   * @return {Promise}   The promise of a NavItem
   */
  var getNodeFromContext = function(ctx) {
    var url = hbpUtil.format('{0}/{1}/{2}/', [
      bbpConfig.get('api.collab.v0'),
      'collab/context', ctx
    ]);
    return $http.get(url)
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
      return $q.reject(hbpUtil.ferr(res));
    });
  };

  /**
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
   * @param  {number} collabId collab ID
   * @param  {number} navItem  the NavItem instance to add to the navigation
   * @return {Promise} promise of the added NavItem instance
   */
  var addNode = function(collabId, navItem) {
    return $http.post(collabApiUrl + collabId + '/nav/', navItem.toJson())
    .then(function(resp) {
      return NavItem.fromJson(collabId, resp.data);
    }, hbpUtil.ferr);
  };

  /**
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
   * @param  {number} collabId collab ID
   * @param  {NavItem} navItem the NavItem instance to remove from the navigation
   * @return {Promise} promise of an undefined item at the end
   */
  var deleteNode = function(collabId, navItem) {
    return $http.delete(collabApiUrl + collabId + '/nav/' + navItem.id + '/')
    .then(function() {
      cacheNavItems.remove(key(collabId, navItem.id));
    }, hbpUtil.ferr);
  };

  /**
   * @memberof hbpCollaboratory.hbpCollaboratoryNavStore
   * @param  {number} collabId collab ID
   * @param  {NavItem} navItem the instance to update
   * @return {Promise} promise the updated instance
   */
  var update = function(collabId, navItem) {
    navItem.collabId = collabId;
    return $http.put(collabApiUrl + collabId + '/nav/' +
      navItem.id + '/', navItem.toJson())
    .then(function(resp) {
      return NavItem.fromJson(collabId, resp.data);
    }, hbpUtil.ferr);
  };

  // ordering operation needs to be globally queued to ensure consistency.
  var insertQueue = $q.when();

  /**
   * Insert node in the three.
   *
   * A queue is used to ensure that the insert operation does not conflict
   * on a single client.
   *
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

/* eslint camelcase: 0 */
/**
 * @namespace clbStorage
 * @memberof module:clb-storage
 * @desc
 * storageUtil provides utility functions to ease the interaction of apps with storage.
 */
angular.module('clb-storage')
.factory('clbStorage',
  ['hbpUtil', 'hbpEntityStore', 'hbpErrorService', function clbStorage(hbpUtil, hbpEntityStore, hbpErrorService) {
    /**
     * Retrieve the key to lookup for on entities given the ctx
     * @memberof module:clbStorage
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

      return hbpEntityStore.addMetadata(entity, newMetadata)
      .catch(hbpErrorService.error);
    }

    /**
     * @name getEntityByContext
     * @memberof module:clb-storage.clbStorage
     * @desc
     * the function gets the entity linked to the contextId in input.
     *
     * In case of error, the promise is rejected with a `HbpError` instance.
     *
     * @param  {String} contextId collab app context id
     * @return {Promise} a promise that resolves when the operation is completed
     */
    function getEntityByContext(contextId) {
      var queryParams = {};
      queryParams[metadataKey(contextId)] = 1;

      return hbpEntityStore.query(queryParams).catch(hbpUtil.ferr);
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

      return hbpEntityStore.deleteMetadata(entity, [key])
      .then(null, hbpErrorService.error);
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
     * @return {Promise} a promise that resolves when the operation is completed
     */
    function updateContextMetadata(newEntity, oldEntity, contextId) {
      return deleteContextMetadata(oldEntity, contextId).then(function() {
        return setContextMetadata(newEntity, contextId);
      }).catch(hbpErrorService.error);
    }

    /**
     * @name getProjectByCollab
     * @memberof module:clb-storage.clbStorage
     * @desc
     * the function returns the storage project of the collabId in input.
     *
     * In case of error, the promise is rejected with a `HbpError` instance.
     *
     * @param  {String} collabId collab id
     * @return {Promise} a promise that resolves to the project details
     */
    function getProjectByCollab(collabId) {
      var queryParams = {
        managed_by_collab: collabId
      };
      return hbpEntityStore.query(queryParams).catch(hbpUtil.ferr);
    }

    return {
      setContextMetadata: setContextMetadata,
      getEntityByContext: getEntityByContext,
      deleteContextMetadata: deleteContextMetadata,
      updateContextMetadata: updateContextMetadata,
      getProjectByCollab: getProjectByCollab
    };
  }]);

(function() {
  'use strict';
  ActivityController.$inject = ['$log', 'clbResourceLocator'];
  angular.module('clb-stream')
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
   * @memberof module:clb-stream
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
      template:'<a class=clb-activity-summary ng-href={{vm.primaryLink}}>{{vm.activity.summary}}</a> <span class=clb-activity-time>{{vm.activity.time|clbTimeAgo}}</span>',
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
   * @param {object} $log angular injection
   * @param {object} clbResourceLocator angular injection
   */
  function ActivityController($log, clbResourceLocator) {
    var vm = this;

    activate();

    /* ------------- */
    /**
     * init controller
     */
    function activate() {
      clbResourceLocator.urlFor(vm.activity.object)
      .then(function(url) {
        vm.primaryLink = url;
      })
      .catch(function(err) {
        $log.error(err);
      });
    }
  }
})();

(function() {
  'use strict';
  ActivityController.$inject = ['$log', 'clbStream'];
  angular.module('clb-stream')
  .directive('clbFeed', clbFeed);

  /**
   * @name clbFeed
   * @desc
   * ``clb-feed`` directive displays a feed of activity retrieved by
   * the HBP Stream service. It handles scrolling and loading of activities.
   * Each activity is rendered using the ``clb-activity`` directive.
   *
   * @memberof module:clb-stream
   * @return {object} the directive
   */
  function clbFeed() {
    return {
      restrict: 'E',
      scope: {
        feedType: '=clbFeedType',
        feedId: '=clbFeedId'
      },
      controller: ActivityController,
      controllerAs: 'vm',
      bindToController: true,
      template:'<ul class=feed><li ng-if=vm.error><div class="alert alert-warning"><strong>Load Error:</strong> {{vm.error}}</div></li><li ng-if="!vm.activities && !vm.error"><hbp-loading></hbp-loading></li><li ng-repeat="a in vm.activities.results" clb-activity=a></li><li ng-if=vm.activities.hasNext><a href=# class="btn btn-default">More</a></li></ul>',
      link: function(scope, elt) {
        elt.addClass('clb-feed');
      }
    };
  }

  /**
   * ViewModel of an activity used to render the clb-activity directive
   * @param {object} $log angular injection
   * @param {object} clbStream angular injection
   */
  function ActivityController($log, clbStream) {
    var vm = this;

    activate();

    /* ------------- */
    /**
     * init controller
     */
    function activate() {
      clbStream.getStream(vm.feedType, vm.feedId).then(function(rs) {
        vm.activities = rs;
      })
      .catch(function(err) {
        vm.error = err.message;
      });
    }
  }
})();

(function() {
  'use strict';
  clbResourceLocator.$inject = ['$q', '$log', 'hbpErrorService', 'hbpUtil'];
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
      return provider;
    }

    return provider;
  }

  /**
   * @name clbResourceLocator
   * @desc
   * resourceLocator service
   * @memberof module:clb-stream
   * @param {object} $q AngularJS injection
   * @param {object} $log AngularJS injection
   * @param {object} hbpErrorService AngularJS injection
   * @param {object} hbpUtil AngularJS injection
   * @return {object} the service singleton
   */
  function clbResourceLocator($q, $log, hbpErrorService, hbpUtil) {
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
     * @return {string} a atring representing the URL for this object reference
     */
    function urlFor(ref) {
      if (!validRef(ref)) {
        return $q.reject(invalidReferenceException(ref));
      }
      var next = function(i) {
        if (i < urlHandlers.length) {
          return $q.when(urlHandlers[i](ref)).then(function(url) {
            if (angular.isString(url)) {
              $log.debug('generated URL', url);
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
      return hbpErrorService.error({
        type: 'ObjectTypeException',
        message: hbpUtil.format(
          'Unkown object type <{0}>', [ref && ref.type]),
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
      return hbpErrorService.error({
        type: 'AttributeError',
        message: hbpUtil.format('Invalid object reference <' + ref + '>'),
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
})();

(function() {
  'use strict';

  clbStream.$inject = ['$http', '$log', 'bbpConfig', 'hbpUtil'];
  angular.module('clb-stream')
  .factory('clbStream', clbStream);

  /**
   * ``clbStream`` service is used to retrieve feed of activities
   * given a user, a collab or a specific context.
   *
   * @memberof module:clb-stream
   * @namespace clbStream
   * @param {function} $http angular dependency injection
   * @param {function} $log angular dependency injection
   * @param {function} bbpConfig angular dependency injection
   * @param {function} hbpUtil angular dependency injection
   * @return {object} the clbActivityStream service
   */
  function clbStream($http, $log, bbpConfig, hbpUtil) {
    return {
      getStream: getStream
    };

    /* -------------------- */

    /**
     * Get a feed of activities regarding an item type and id.
     * @memberof module:clb-stream.clbStream
     * @param  {string} type The type of object to get the feed for
     * @param  {string|int} id   The id of the object to get the feed for
     * @return {Promise}         resolve to the feed of activities
     */
    function getStream(type, id) {
      var url = hbpUtil.format('{0}/stream/{1}:{2}/', [
        bbpConfig.get('api.stream.v0'),
        type,
        id
      ]);
      return hbpUtil.paginatedResultSet($http.get(url), {
        resultsFactory: function(results) {
          if (!(results && results.length)) {
            return;
          }
          for (var i = 0; i < results.length; i++) {
            var activity = results[i];
            if (activity.time) {
              activity.time = new Date(Date.parse(activity.time));
            }
          }
        }
      })
      .catch(hbpUtil.ferr);
    }
  }
})();

//# sourceMappingURL=angular-hbp-collaboratory.js.map
