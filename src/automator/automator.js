/**
 * @namespace hbpCollaboratoryAutomator
 * @memberof hbpCollaboratory
 * @desc
 * hbpCollaboratoryAutomator is an AngularJS factory that
 * provide task automation to accomplish a sequence of
 * common operation in Collaboratory.
 *
 * How to add new tasks
 * --------------------
 *
 * New tasks can be added by calling ``hbpCollaboratoryAutomator.registerHandler``.
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
 * @param {object} $q injected dependency
 * @return {object} hbpCollaboratoryAutomator angular service
 * @example <caption>Create a Collab with a few navigation items</caption>
 * // Create a Collab with a few navigation items.
 * angular.module('MyModule', ['hbpCollaboratory'])
 * .run(function(hbpCollaboratoryAutomator, $log) {
 *   var config = {
 *     title: 'My Custom Collab',
 *     content: 'My Collab Content',
 *     private: false
 *   };
 *   hbpCollaboratoryAutomator.task(config).run().then(function(collab) {
 *   	 $log.info('Created Collab', collab);
 *   });
 * })
 * @example <caption>Create a Collab with entities and navigation items</caption>
 * hbpCollaboratoryAutomator.run({
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
 * hbpCollaboratoryAutomator.run({
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
 */
angular.module('hbpCollaboratoryAutomator', [
  'bbpConfig',
  'hbpCommon',
  'hbpDocumentClient',
  'hbpCollaboratoryAppStore',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryStorage'
])
.factory('hbpCollaboratoryAutomator', function hbpCollaboratoryAutomator(
  $q, $log, hbpErrorService
) {
  var handlers = {};

  /**
   * Register a handler function for the given task name.
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @param  {string}   name handle actions with the specified name
   * @param  {Function} fn a function that accept the current context in
   *                       parameter.
   */
  function registerHandler(name, fn) {
    handlers[name] = fn;
  }

  /**
   * @namespace Tasks
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @desc
   * Available tasks.
   */

  /**
   * Instantiate a new Task intance that will run the code describe for
   * a handlers with the give ``name``.
   *
   * The descriptor is passed to the task and parametrize it.
   * The task context is computed at the time the task is ran. A default context
   * can be given at load time and it will be fed with the result of each parent
   * (but not sibling) tasks as well.
   *
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
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
   * @desc
   * Instantiate a task given the given `config`.
   * The task can then be run using the `run()` instance method.
   * @param {string} name the name of the task to instantiate
   * @param {object} [descriptor] a configuration object that will determine
   *                            which task to run and in which order
   * @param {object} [descriptor.after] an array of task to run after this one
   * @param {object} [context] a default context to run the task with
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @see hbpCollaboratory.hbpCollaboratoryAutomator.task
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
     * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Task
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
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
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
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
});
