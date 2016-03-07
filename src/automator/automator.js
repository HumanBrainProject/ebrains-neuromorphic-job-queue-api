/**
 * @namespace hbpCollaboratoryAutomator
 *
 * @example
 * angular.module('MyModule', ['hbpCollaboratory'])
 * .run(function(hbpCollaboratoryAutomator, $log) {
 *   var config = {
 *     title: 'My Custom Collab',
 *     content: 'My Collab Content',
 *     private: false
 *   }
 *   hbpCollaboratoryAutomator.task(config).run().then(function(collab) {
 *   	 $log.info('Created Collab', collab);
 *   })
 * })
 */
angular.module('hbpCollaboratoryAutomator', [
  'bbpConfig',
  'hbpCommon',
  'hbpDocumentClient',
  'hbpCollaboratoryAppStore',
  'hbpCollaboratoryNavStore'
])
.factory('hbpCollaboratoryAutomator', function hbpCollaboratoryAutomator($q) {
  var handlers = {};

  /**
   * Register a handler function for the given task name.
   * @param  {string}   name handle actions with the specified name
   * @param  {Function} fn a function that accept the current context in
   *                       parameter.
   */
  function registerHandler(name, fn) {
    handlers[name] = fn;
  }

  /**
   * Create a new task.
   * @memberof hbpCollaboratoryAutomator
   * @param {object} config a configuration object that will determine
   *                        which task to run and in which order.
   * @return {Task} - task
   */
  function task(config) {
    return new Task(config);
  }

  /**
   * @class Task
   * @memberof hbpCollaboratoryAutomator
   * @param {object} config - task configuration
   */
  function Task(config) {
    this.state = 'idle';
    this.config = config;
  }

  Task.prototype = {
    run: function() {
      var self = this;
      self.state = 'progress';
      self.promises = {};
      self.errors = {};
      var results = {};
      angular.forEach(self.config, function(data, name) {
        self.promises[name] = handlers[name](data)
        .then(function(r) {
          // let still guess the results
          // even in case an error occurs.
          results[name] = r;
        })
        .catch(function(err) {
          self.errors[name] = err;
          return $q.reject(err);
        });
      });

      return $q.all(this.promises)
      .then(function() {
        self.state = 'success';
        return results;
      })
      .catch(function(err) {
        self.state = 'error';
        return $q.reject(err);
      });
    }
  };

  /**
   * Return an object that only contains attributes
   * from the `attrs` list.
   *
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
    handlers: handlers,
    registerHandler: registerHandler,
    task: task,
    extractAttributes: extractAttributes
  };
});
