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
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryStorage'
])
.factory('hbpCollaboratoryAutomator', ['$q', '$log', 'hbpErrorService', function hbpCollaboratoryAutomator(
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
}]);

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
   * @param  {int} collabId   id of the collab
   * @param  {NavItem} navItem    Nav item instance
   * @param  {NavItem} parentItem parent item
   * @param  {int} insertAt   add to the menu
   * @return {Promise}        a promise that will
   *                          return the update nav item
   */
  function insertNode(collabId, navItem, parentItem, insertAt) {
    return insertQueue.then(function() {
      navItem.order = insertAt + 1; // first item order_index must be 1
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
    addNode: addNode,
    saveNode: update,
    deleteNode: deleteNode,
    insertNode: insertNode
  };
}]);

/* eslint camelcase: 0 */
/**
 * @namespace hbpCollaboratoryStorage
 * @memberof hbpCollaboratory
 * @desc
 * storageUtil provides utility functions to ease the interaction of apps with storage.
 */
angular.module('hbpCollaboratoryStorage', ['hbpCommon'])
.factory('hbpCollaboratoryStorage',
  ['hbpUtil', 'hbpEntityStore', 'hbpErrorService', function hbpCollaboratoryStorage(hbpUtil, hbpEntityStore, hbpErrorService) {
    /**
     * Retrieve the key to lookup for on entities given the ctx
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
     * @param  {string} ctx application context UUID
     * @return {string}     name of the entity attribute that should be used
     * @private
     */
    function metadataKey(ctx) {
      return 'ctx_' + ctx;
    }

    /**
     * @name setContextMetadata
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
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
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
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

      return hbpEntityStore.query(queryParams).then(null, hbpUtil.ferr);
    }

    /**
     * @name deleteContextMetadata
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
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
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
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
     * @memberof hbpCollaboratory.hbpCollaboratoryStorage
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
      return hbpEntityStore.query(queryParams).then(null, hbpUtil.ferr);
    }

    return {
      setContextMetadata: setContextMetadata,
      getEntityByContext: getEntityByContext,
      deleteContextMetadata: deleteContextMetadata,
      updateContextMetadata: updateContextMetadata,
      getProjectByCollab: getProjectByCollab
    };
  }]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', '$q', 'hbpCollabStore', 'hbpCollaboratoryAutomator', function createCollabService(
  $log, $q, hbpCollabStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('collab', createCollab);

  /**
   * @function createCollab
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
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
    var attr = hbpCollaboratoryAutomator.extractAttributes(
      descriptor,
      ['title', 'content', 'private']
    );
    $log.debug('Create collab', descriptor);
    return hbpCollabStore.create(attr);
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', 'hbpCollaboratoryAppStore', 'hbpCollaboratoryNavStore', 'hbpCollaboratoryAutomator', 'hbpCollaboratoryStorage', 'hbpEntityStore', function createNavItem(
  $log,
  hbpCollaboratoryAppStore,
  hbpCollaboratoryNavStore,
  hbpCollaboratoryAutomator,
  hbpCollaboratoryStorage,
  hbpEntityStore
) {
  hbpCollaboratoryAutomator.registerHandler('nav', createNavItem);

  /**
   * Create a new nav item.
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
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
        return hbpCollaboratoryStorage.setContextMetadata(entity, nav.context)
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

    return hbpCollaboratoryAutomator.ensureParameters(descriptor, 'app', 'name')
    .then(function() {
      return findApp(descriptor.app)
      .then(createNav)
      .then(linkToStorage);
    });
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', '$q', 'hbpEntityStore', 'hbpErrorService', 'hbpCollaboratoryAutomator', 'hbpCollaboratoryStorage', function createCollabService(
  $log, $q, hbpEntityStore,
  hbpErrorService,
  hbpCollaboratoryAutomator,
  hbpCollaboratoryStorage
) {
  hbpCollaboratoryAutomator.registerHandler('storage', storage);

  /**
   * Copy files and folders to the destination collab storage.
   *
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
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
    return hbpCollaboratoryAutomator.ensureParameters(
      descriptor, 'entities'
    ).then(function() {
      return hbpCollaboratoryStorage
        .getProjectByCollab(descriptor.collab || context.collab.id)
        .then(function(projectEntity) {
          var promises = {};
          angular.forEach(descriptor.entities, function(value, name) {
            if (angular.isString(value)) {
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
 * @namespace hbpCollaboratory
 * @desc
 * Provides angular services to work with HBP Collaboratory.
 */
angular.module('hbpCollaboratory', [
  'hbpCollaboratoryAutomator',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore'
]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwiYXV0b21hdG9yL3Rhc2tzL2NyZWF0ZS1jb2xsYWIuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLW5hdi1pdGVtLmpzIiwiYXV0b21hdG9yL3Rhc2tzL3N0b3JhZ2UuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlDQSxRQUFRLE9BQU8sNkJBQTZCO0VBQzFDO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTs7Q0FFRCxRQUFRLCtEQUE2QixTQUFTO0VBQzdDLElBQUksTUFBTTtFQUNWO0VBQ0EsSUFBSSxXQUFXOzs7Ozs7Ozs7RUFTZixTQUFTLGdCQUFnQixNQUFNLElBQUk7SUFDakMsU0FBUyxRQUFROzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBNEJuQixTQUFTLEtBQUssTUFBTSxZQUFZLFNBQVM7SUFDdkMsSUFBSTtNQUNGLE9BQU8sSUFBSSxLQUFLLE1BQU0sWUFBWTtNQUNsQyxPQUFPLElBQUk7TUFDWCxLQUFLLE1BQU0sYUFBYTtNQUN4QixNQUFNLGdCQUFnQixNQUFNO1FBQzFCLE1BQU07UUFDTixTQUFTLGtCQUFrQixPQUFPLE9BQU87UUFDekMsTUFBTTtVQUNKLE9BQU87VUFDUCxNQUFNO1VBQ04sWUFBWTtVQUNaLFNBQVM7Ozs7Ozs7Ozs7Ozs7RUFhakIsU0FBUyxJQUFJLFlBQVksU0FBUztJQUNoQyxLQUFLLElBQUksUUFBUSxZQUFZO01BQzNCLElBQUksV0FBVyxlQUFlLE9BQU87UUFDbkMsT0FBTyxLQUFLLE1BQU0sV0FBVyxPQUFPLFNBQVM7OztJQUdqRCxPQUFPLEdBQUcsT0FBTyxnQkFBZ0IsTUFBTTtNQUNyQyxNQUFNO01BQ04sU0FBUztNQUNULE1B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QUssV0FBVztNQUNoQixPQUFPO1NBQ0osbUJBQW1CLFdBQVcsVUFBVSxRQUFRLE9BQU87U0FDdkQsS0FBSyxTQUFTLGVBQWU7VUFDNUIsSUFBSSxXQUFXO1VBQ2YsUUFBUSxRQUFRLFdBQVcsVUFBVSxTQUFTLE9BQU8sTUFBTTtZQUN6RCxJQUFJLFFBQVEsU0FBUyxRQUFRO2NBQzNCLFNBQVM7Z0JBQ1AsZUFBZSxLQUFLLE9BQU8sY0FBYzttQkFDdEM7Y0FDTCxLQUFLLEtBQUssMENBQTBDOzs7VUFHeEQsT0FBTyxHQUFHLElBQUk7Ozs7O0FBS3hCO0FDNUNBOzs7OztBQUtBLFFBQVEsT0FBTyxvQkFBb0I7RUFDakM7RUFDQTtFQUNBOztBQUVGIiwiZmlsZSI6ImFuZ3VsYXItaGJwLWNvbGxhYm9yYXRvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGlzIGFuIEFuZ3VsYXJKUyBmYWN0b3J5IHRoYXRcbiAqIHByb3ZpZGUgdGFzayBhdXRvbWF0aW9uIHRvIGFjY29tcGxpc2ggYSBzZXF1ZW5jZSBvZlxuICogY29tbW9uIG9wZXJhdGlvbiBpbiBDb2xsYWJvcmF0b3J5LlxuICpcbiAqIEhvdyB0byBhZGQgbmV3IHRhc2tzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE5ldyB0YXNrcyBjYW4gYmUgYWRkZWQgYnkgY2FsbGluZyBgYGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyYGAuXG4gKlxuICogWW91IGNhbiBzZWUgYSBmZXcgZXhhbXBsZSBvZiB0YXNrcyBpbiB0aGUgYHRhc2tzYCBmb2xkZXIuXG4gKlxuICogRXZhbHVhdGUgdGhlIGF1dG9tYXRvclxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEZyb20gdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LCB5b3UgY2FuIHN0YXJ0IGEgc2VydmVyIHRoYXQgd2lsbCBsZXRcbiAqIHlvdSB3cml0ZSBhIGRlc2NyaXB0b3IgYW5kIHJ1biBpdC5cbiAqXG4gKiAuLiBjb2RlLWJsb2NrOjogYmFzaFxuICpcbiAqICAgIGd1bHAgZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSAkcSBpbmplY3RlZCBkZXBlbmRlbmN5XG4gKiBAcmV0dXJuIHtvYmplY3R9IGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IgYW5ndWxhciBzZXJ2aWNlXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5DcmVhdGUgYSBDb2xsYWIgd2l0aCBhIGZldyBuYXZpZ2F0aW9uIGl0ZW1zPC9jYXB0aW9uPlxuICogLy8gQ3JlYXRlIGEgQ29sbGFiIHdpdGggYSBmZXcgbmF2aWdhdGlvbiBpdGVtcy5cbiAqIGFuZ3VsYXIubW9kdWxlKCdNeU1vZHVsZScsIFsnaGJwQ29sbGFib3JhdG9yeSddKVxuICogLnJ1bihmdW5jdGlvbihoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLCAkbG9nKSB7XG4gKiAgIHZhciBjb25maWcgPSB7XG4gKiAgICAgdGl0bGU6ICdNeSBDdXN0b20gQ29sbGFiJyxcbiAqICAgICBjb250ZW50OiAnTXkgQ29sbGFiIENvbnRlbnQnLFxuICogICAgIHByaXZhdGU6IGZhbHNlXG4gKiAgIH1cbiAqICAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci50YXNrKGNvbmZpZykucnVuKCkudGhlbihmdW5jdGlvbihjb2xsYWIpIHtcbiAqICAgXHQgJGxvZy5pbmZvKCdDcmVhdGVkIENvbGxhYicsIGNvbGxhYik7XG4gKiAgIH0pXG4gKiB9KVxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIFtcbiAgJ2JicENvbmZpZycsXG4gICdoYnBDb21tb24nLFxuICAnaGJwRG9jdW1lbnRDbGllbnQnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsXG4gICdoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZSdcbl0pXG4uZmFjdG9yeSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIGZ1bmN0aW9uIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IoXG4gICRxLCAkbG9nLCBoYnBFcnJvclNlcnZpY2Vcbikge1xuICB2YXIgaGFuZGxlcnMgPSB7fTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gdGFzayBuYW1lLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSAge3N0cmluZ30gICBuYW1lIGhhbmRsZSBhY3Rpb25zIHdpdGggdGhlIHNwZWNpZmllZCBuYW1lXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0IHRoZSBjdXJyZW50IGNvbnRleHQgaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlci5cbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVySGFuZGxlcihuYW1lLCBmbikge1xuICAgIGhhbmRsZXJzW25hbWVdID0gZm47XG4gIH1cblxuICAvKipcbiAgICogQG5hbWVzcGFjZSBUYXNrc1xuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBkZXNjXG4gICAqIEF2YWlsYWJsZSB0YXNrcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlIGEgbmV3IFRhc2sgaW50YW5jZSB0aGF0IHdpbGwgcnVuIHRoZSBjb2RlIGRlc2NyaWJlIGZvclxuICAgKiBhIGhhbmRsZXJzIHdpdGggdGhlIGdpdmUgYGBuYW1lYGAuXG4gICAqXG4gICAqIFRoZSBkZXNjcmlwdG9yIGlzIHBhc3NlZCB0byB0aGUgdGFzayBhbmQgcGFyYW1ldHJpemUgaXQuXG4gICAqIFRoZSB0YXNrIGNvbnRleHQgaXMgY29tcHV0ZWQgYXQgdGhlIHRpbWUgdGhlIHRhc2sgaXMgcmFuLiBBIGRlZmF1bHQgY29udGV4dFxuICAgKiBjYW4gYmUgZ2l2ZW4gYXQgbG9hZCB0aW1lIGFuZCBpdCB3aWxsIGJlIGZlZCB3aXRoIHRoZSByZXN1bHQgb2YgZWFjaCBwYXJlbnRcbiAgICogKGJ1dCBub3Qgc2libGluZykgdGFza3MgYXMgd2VsbC5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgbmFtZSBvZiB0aGUgdGFzayB0byBpbnN0YW50aWF0ZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3JdIGEgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCB3aWxsIGRldGVybWluZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGljaCB0YXNrIHRvIHJ1biBhbmQgaW4gd2hpY2ggb3JkZXJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yLmFmdGVyXSBhbiBhcnJheSBvZiB0YXNrIHRvIHJ1biBhZnRlciB0aGlzIG9uZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIGEgZGVmYXVsdCBjb250ZXh0IHRvIHJ1biB0aGUgdGFzayB3aXRoXG4gICAqXG4gICAqIEByZXR1cm4ge1Rhc2t9IC0gdGhlIG5ldyB0YXNrIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiB0YXNrKG5hbWUsIGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBUYXNrKG5hbWUsIGRlc2NyaXB0b3IsIGNvbnRleHQpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAkbG9nLmVycm9yKCdFWENFUFRJT04nLCBleCk7XG4gICAgICB0aHJvdyBoYnBFcnJvclNlcnZpY2UuZXJyb3Ioe1xuICAgICAgICB0eXBlOiAnSW52YWxpZFRhc2snLFxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB0YXNrICcgKyBuYW1lICsgJzogJyArIGV4LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgY2F1c2U6IGV4LFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgZGVzY3JpcHRvcjogZGVzY3JpcHRvcixcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaXJlY3RseSBnZW5lcmF0ZSB0YXNrcyBmcm9tIGdpdmVuIGRlc2NyaXB0aW9uIGFuZCBydW4gdGhlbS5cbiAgICpcbiAgICogQHBhcmFtICB7b2JqZWN0fSBkZXNjcmlwdG9yIGRlc2NyaXB0aW9uIG9mIHRoZSB0YXNrcyB0byBydW5cbiAgICogQHBhcmFtICB7b2JqZWN0fSBbY29udGV4dF0gIHRoZSBpbml0aWFsIGNvbnRleHRcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiB0aGUgdG9wIGxldmVsIHRhc2sgcmVzdWx0XG4gICAqL1xuICBmdW5jdGlvbiBydW4oZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIGZvciAodmFyIG5hbWUgaW4gZGVzY3JpcHRvcikge1xuICAgICAgaWYgKGRlc2NyaXB0b3IuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHRhc2sobmFtZSwgZGVzY3JpcHRvcltuYW1lXSwgY29udGV4dCkucnVuKCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmVycm9yKHtcbiAgICAgIHR5cGU6ICdOb1Rhc2tGb3VuZCcsXG4gICAgICBtZXNzYWdlOiAnTm8gdGFzayBmb3VuZCBpbiBkZXNjcmlwdG9yJyxcbiAgICAgIGRhdGE6IGRlc2NyaXB0b3JcbiAgICB9KSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGFycmF5IG9mIHRhc2tzIGdpdmVuIGFuIGFycmF5IGNvbnRhaW5pbmcgb2JqZWN0IHdoZXJlXG4gICAqIHRoZSBrZXkgaXMgdGhlIHRhc2sgbmFtZSB0byBydW4gYW5kIHRoZSB2YWx1ZSBpcyB0aGUgZGVzY3JpcHRvclxuICAgKiBwYXJhbWV0ZXIuXG4gICAqXG4gICAqIEBwYXJhbSAge29iamVjdH0gYWZ0ZXIgdGhlIGNvbnRlbnQgb2YgYGBkZXNjcmlwdG9yLmFmdGVyYGBcbiAgICogQHJldHVybiB7QXJyYXkvVGFza30gYXJyYXkgb2Ygc3VidGFza3NcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZVN1YnRhc2tzKGFmdGVyKSB7XG4gICAgdmFyIHN1YnRhc2tzID0gW107XG4gICAgaWYgKCFhZnRlciB8fCAhYWZ0ZXIubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gc3VidGFza3M7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWZ0ZXIubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB0YXNrRGVmID0gYWZ0ZXJbaV07XG4gICAgICBmb3IgKHZhciBuYW1lIGluIHRhc2tEZWYpIHtcbiAgICAgICAgaWYgKHRhc2tEZWYuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICBzdWJ0YXNrcy5wdXNoKHRhc2sobmFtZSwgdGFza0RlZltuYW1lXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdWJ0YXNrcztcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2xhc3MgVGFza1xuICAgKiBAZGVzY1xuICAgKiBJbnN0YW50aWF0ZSBhIHRhc2sgZ2l2ZW4gdGhlIGdpdmVuIGBjb25maWdgLlxuICAgKiBUaGUgdGFzayBjYW4gdGhlbiBiZSBydW4gdXNpbmcgdGhlIGBydW4oKWAgaW5zdGFuY2UgbWV0aG9kLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgbmFtZSBvZiB0aGUgdGFzayB0byBpbnN0YW50aWF0ZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3JdIGEgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCB3aWxsIGRldGVybWluZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGljaCB0YXNrIHRvIHJ1biBhbmQgaW4gd2hpY2ggb3JkZXJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yLmFmdGVyXSBhbiBhcnJheSBvZiB0YXNrIHRvIHJ1biBhZnRlciB0aGlzIG9uZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIGEgZGVmYXVsdCBjb250ZXh0IHRvIHJ1biB0aGUgdGFzayB3aXRoXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHNlZSBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IudGFza1xuICAgKlxuICAgKi9cbiAgZnVuY3Rpb24gVGFzayhuYW1lLCBkZXNjcmlwdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFoYW5kbGVyc1tuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUYXNrTm90Rm91bmQnKTtcbiAgICB9XG4gICAgZGVzY3JpcHRvciA9IGRlc2NyaXB0b3IgfHwge307XG4gICAgY29udGV4dCA9IGNvbnRleHQgfHwge307XG4gICAgdGhpcy5zdGF0ZSA9ICdpZGxlJztcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMuZGVzY3JpcHRvciA9IGRlc2NyaXB0b3I7XG4gICAgdGhpcy5kZWZhdWx0Q29udGV4dCA9IGNvbnRleHQ7XG4gICAgdGhpcy5zdGF0ZSA9ICdpZGxlJztcbiAgICB0aGlzLnByb21pc2UgPSBudWxsO1xuICAgIHRoaXMuZXJyb3IgPSBudWxsO1xuICAgIHRoaXMuc3VidGFza3MgPSBjcmVhdGVTdWJ0YXNrcyhkZXNjcmlwdG9yLmFmdGVyKTtcbiAgfVxuXG4gIFRhc2sucHJvdG90eXBlID0ge1xuICAgIC8qKlxuICAgICAqIExhdW5jaCB0aGUgdGFzay5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuVGFza1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb250ZXh0IGN1cnJlbnQgY29udGV4dCB3aWxsIGJlIG1lcmdlZCBpbnRvIHRoZSBkZWZhdWx0XG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgb25lLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdG8gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIHRhc2tcbiAgICAgKi9cbiAgICBydW46IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIC8vIHJ1biBhbiBpbnRhbmNlIG9mIHRhc2sgb25seSBvbmNlLlxuICAgICAgaWYgKHNlbGYuc3RhdGUgIT09ICdpZGxlJykge1xuICAgICAgICByZXR1cm4gc2VsZi5wcm9taXNlO1xuICAgICAgfVxuICAgICAgY29udGV4dCA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCB0aGlzLmRlZmF1bHRDb250ZXh0LCBjb250ZXh0KTtcbiAgICAgIHZhciBvblN1Y2Nlc3MgPSBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgICAgdmFyIHN1YkNvbnRleHQgPSBhbmd1bGFyLmNvcHkoY29udGV4dCk7XG4gICAgICAgIHN1YkNvbnRleHRbc2VsZi5uYW1lXSA9IHJlc3VsdDtcbiAgICAgICAgcmV0dXJuIHNlbGYucnVuU3VidGFza3Moc3ViQ29udGV4dClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgc2VsZi5zdGF0ZSA9ICdzdWNjZXNzJztcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICB2YXIgb25FcnJvciA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgICBzZWxmLnN0YXRlID0gJ2Vycm9yJztcbiAgICAgICAgLy8gbm9vcCBvcGVyYXRpb24gaWYgaXMgYWxyZWFkeSBvbmVcbiAgICAgICAgcmV0dXJuICRxLnJlamVjdChoYnBFcnJvclNlcnZpY2UuZXJyb3IoZXJyKSk7XG4gICAgICB9O1xuICAgICAgc2VsZi5zdGF0ZSA9ICdwcm9ncmVzcyc7XG4gICAgICBzZWxmLnByb21pc2UgPSAkcS53aGVuKGhhbmRsZXJzW3NlbGYubmFtZV0oc2VsZi5kZXNjcmlwdG9yLCBjb250ZXh0KSlcbiAgICAgICAgLnRoZW4ob25TdWNjZXNzKVxuICAgICAgICAuY2F0Y2gob25FcnJvcik7XG4gICAgICByZXR1cm4gc2VsZi5wcm9taXNlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW4gYWxsIHN1YnRhc2tzIG9mIHRoZSB0aGlzIHRhc2tzLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7b2JqZWN0fSBjb250ZXh0IHRoZSBjdXJyZW50IGNvbnRleHRcbiAgICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgYWxsIHRoZSByZXN1bHRzIGluIGFuIGFycmF5XG4gICAgICovXG4gICAgcnVuU3VidGFza3M6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKHRoaXMuc3VidGFza3MsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgcHJvbWlzZXMucHVzaCh0YXNrLnJ1bihjb250ZXh0KSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIGEgSGJwRXJyb3Igd2hlbiBhIHBhcmFtZXRlciBpcyBtaXNzaW5nLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSAge3N0cmluZ30ga2V5ICAgIG5hbWUgb2YgdGhlIGtleVxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbmZpZyB0aGUgaW52YWxpZCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgKiBAcmV0dXJuIHtIYnBFcnJvcn0gICAgICBhIEhicEVycm9yIGluc3RhbmNlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBtaXNzaW5nRGF0YUVycm9yKGtleSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIGhicEVycm9yU2VydmljZSh7XG4gICAgICB0eXBlOiAnS2V5RXJyb3InLFxuICAgICAgbWVzc2FnZTogJ01pc3NpbmcgYCcgKyBrZXkgKyAnYCBrZXkgaW4gY29uZmlnJyxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgY29uZmlnOiBjb25maWdcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnN1cmUgdGhhdCBhbGwgcGFyYW1ldGVycyBsaXN0ZWQgYWZ0ZXIgY29uZmlnIGFyZSBwcmVzZW50cy5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbmZpZyB0YXNrIGRlc2NyaXB0b3JcbiAgICogQHJldHVybiB7b2JqZWN0fSBjcmVhdGVkIGVudGl0aWVzXG4gICAqL1xuICBmdW5jdGlvbiBlbnN1cmVQYXJhbWV0ZXJzKGNvbmZpZykge1xuICAgIHZhciBwYXJhbWV0ZXJzID0gQXJyYXkucHJvdG90eXBlLnNwbGljZSgxKTtcbiAgICBmb3IgKHZhciBwIGluIHBhcmFtZXRlcnMpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHBhcmFtZXRlcnNbcF0pKSB7XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QobWlzc2luZ0RhdGFFcnJvcihwLCBjb25maWcpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICRxLndoZW4oY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gb2JqZWN0IHRoYXQgb25seSBjb250YWlucyBhdHRyaWJ1dGVzXG4gICAqIGZyb20gdGhlIGBhdHRyc2AgbGlzdC5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbmZpZyBrZXktdmFsdWUgc3RvcmVcbiAgICogQHBhcmFtICB7QXJyYXl9IGF0dHJzICAgYSBsaXN0IG9mIGtleXMgdG8gZXh0cmFjdCBmcm9tIGBjb25maWdgXG4gICAqIEByZXR1cm4ge29iamVjdH0gICAgICAgIGtleS12YWx1ZSBzdG9yZSBjb250YWluaW5nIG9ubHkga2V5cyBmcm9tIGF0dHJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kIGluIGBjb25maWdgXG4gICAqL1xuICBmdW5jdGlvbiBleHRyYWN0QXR0cmlidXRlcyhjb25maWcsIGF0dHJzKSB7XG4gICAgdmFyIHIgPSB7fTtcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChjb25maWdbYV0pKSB7XG4gICAgICAgIHJbYV0gPSBjb25maWdbYV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHJ1bjogcnVuLFxuICAgIHRhc2s6IHRhc2ssXG4gICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgIHJlZ2lzdGVySGFuZGxlcjogcmVnaXN0ZXJIYW5kbGVyLFxuICAgIGV4dHJhY3RBdHRyaWJ1dGVzOiBleHRyYWN0QXR0cmlidXRlcyxcbiAgICBlbnN1cmVQYXJhbWV0ZXJzOiBlbnN1cmVQYXJhbWV0ZXJzXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6IDAgKi9cblxuLyoqXG4gKiBAbmFtZXNwYWNlIGhicENvbGxhYm9yYXRvcnlBcHBTdG9yZVxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUgY2FuIGJlIHVzZWQgdG8gZmluZCBhbmQgd29yayB3aXRoIHRoZVxuICogcmVnaXN0ZXJlZCBIQlAgQ29sbGFib3JhdG9yeSBhcHBsaWNhdGlvbnMuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLCBbJ2JicENvbmZpZycsICdoYnBDb21tb24nXSlcbi5jb25zdGFudCgnZm9sZGVyQXBwSWQnLCAnX19jb2xsYWJfZm9sZGVyX18nKVxuLnNlcnZpY2UoJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsIGZ1bmN0aW9uKFxuICAkcSwgJGh0dHAsICRjYWNoZUZhY3RvcnksXG4gIGhicEVycm9yU2VydmljZSwgYmJwQ29uZmlnLCBoYnBVdGlsXG4pIHtcbiAgdmFyIGFwcHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ19fYXBwc0NhY2hlX18nKTtcbiAgdmFyIHVybEJhc2UgPSBiYnBDb25maWcuZ2V0KCdhcGkuY29sbGFiLnYwJykgKyAnL2V4dGVuc2lvbi8nO1xuICB2YXIgYXBwcyA9IG51bGw7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBBcHBcbiAgICogQGRlc2MgY2xpZW50IHJlcHJlc2VudGF0aW9uIG9mIGFuIGFwcGxpY2F0aW9uXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBcHBTdG9yZVxuICAgKiBAcGFyYW0gIHtvYmplY3R9IFthdHRyc10gYSBsaXN0IG9mIGF0dHJpYnV0ZXMgdG8gc2V0IHRvIHRoZSBBcHAgaW5zdGFuY2VcbiAgICovXG4gIHZhciBBcHAgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHNlbGZba10gPSB2O1xuICAgIH0pO1xuICB9O1xuICBBcHAucHJvdG90eXBlID0ge1xuICAgIC8qKlxuICAgICAqIFRyYW5zZm9ybSBhbiBBcHAgaW5zdGFuY2UgaW50byBhbiBvYmplY3QgcmVwcmVuc2VudGF0aW9uIGNvbXBhdGlibGUgd2l0aFxuICAgICAqIHRoZSBiYWNrZW5kIHNjaGVtYS4gVGhpcyBvYmplY3QgY2FuIHRoZW4gYmUgZWFzaWx5IGNvbnZlcnRlZCB0byBhIEpTT05cbiAgICAgKiBzdHJpbmcuXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLkFwcFxuICAgICAqIEByZXR1cm4ge29iamVjdH0gc2VydmVyIHJlcHJlc2VudGF0aW9uIG9mIGFuIEFwcCBpbnN0YW5jZVxuICAgICAqL1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuZGVzY3JpcHRpb24sXG4gICAgICAgIGVkaXRfdXJsOiB0aGlzLmVkaXRVcmwsXG4gICAgICAgIHJ1bl91cmw6IHRoaXMucnVuVXJsLFxuICAgICAgICB0aXRsZTogdGhpcy50aXRsZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBhcHAgaW5zdGFuY2UgZnJvbSBhIHNlcnZlciByZXByZXNlbnRhdGlvbi5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLkFwcFxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGpzb24gY29udmVydGVkIGZyb20gdGhlIHNlcnZlciBKU09OIHN0cmluZ1xuICAgKiBAcmV0dXJuIHtBcHB9IHRoZSBuZXcgQXBwIGluc3RhbmNlXG4gICAqL1xuICBBcHAuZnJvbUpzb24gPSBmdW5jdGlvbihqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICByZXR1cm4gbmV3IEFwcCh7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGRlbGV0ZWQ6IGpzb24uZGVsZXRlZCxcbiAgICAgIGRlc2NyaXB0aW9uOiBqc29uLmRlc2NyaXB0aW9uLFxuICAgICAgZWRpdFVybDoganNvbi5lZGl0X3VybCxcbiAgICAgIHJ1blVybDoganNvbi5ydW5fdXJsLFxuICAgICAgdGl0bGU6IGpzb24udGl0bGUsXG4gICAgICBjcmVhdGVkQnk6IGpzb24uY3JlYXRlZF9ieVxuICAgIH0pO1xuICB9O1xuXG4gIGFwcHNDYWNoZS5wdXQoJ19fY29sbGFiX2ZvbGRlcl9fJywge1xuICAgIGlkOiAnX19jb2xsYWJfZm9sZGVyX18nLFxuICAgIHRpdGxlOiAnRm9sZGVyJ1xuICB9KTtcblxuICB2YXIgbG9hZEFsbCA9IGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJzKSB7XG4gICAgICBpZiAocnMuaGFzTmV4dCkge1xuICAgICAgICByZXR1cm4gbG9hZEFsbChycy5uZXh0KCkpO1xuICAgICAgfVxuICAgICAgYXBwcyA9IHJzLnJlc3VsdHM7XG4gICAgICByZXR1cm4gYXBwcztcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxpc3Qgb2YgYWxsIGFwcGxpY2F0aW9uc1xuICAgKi9cbiAgdmFyIGxpc3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWFwcHMpIHtcbiAgICAgIHJldHVybiBsb2FkQWxsKGhicFV0aWwucGFnaW5hdGVkUmVzdWx0U2V0KCRodHRwLmdldCh1cmxCYXNlKSwge1xuICAgICAgICBmYWN0b3J5OiBBcHAuZnJvbUpzb25cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuICRxLndoZW4oYXBwcyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIGFuIEFwcCBpbnN0YW5jZSBmcm9tIGl0cyBpZC5cbiAgICogQHBhcmFtICB7bnVtYmVyfSBpZCB0aGUgYXBwIGlkXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgYW4gYXBwIGluc3RhbmNlXG4gICAqL1xuICB2YXIgZ2V0QnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKCFpZCkge1xuICAgICAgcmV0dXJuICRxLndoZW4obnVsbCk7XG4gICAgfVxuICAgIHZhciBleHQgPSBhcHBzQ2FjaGUuZ2V0KGlkKTtcbiAgICBpZiAoZXh0KSB7XG4gICAgICByZXR1cm4gJHEud2hlbihleHQpO1xuICAgIH1cbiAgICByZXR1cm4gJGh0dHAuZ2V0KHVybEJhc2UgKyBpZCArICcvJykudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIGFwcHNDYWNoZS5wdXQoaWQsIEFwcC5mcm9tSnNvbihyZXMuZGF0YSkpO1xuICAgICAgcmV0dXJuIGFwcHNDYWNoZS5nZXQoaWQpO1xuICAgIH0sIGZ1bmN0aW9uKHJlcykge1xuICAgICAgcmV0dXJuICRxLnJlamVjdChoYnBFcnJvclNlcnZpY2UuaHR0cEVycm9yKHJlcykpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmVcbiAgICogQHBhcmFtICB7b2JqZWN0fSBwYXJhbXMgcXVlcnkgcGFyYW1ldGVyc1xuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGFuIEFwcCBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIGZpbmRPbmUgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KHVybEJhc2UsIHtwYXJhbXM6IHBhcmFtc30pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IHJlcy5kYXRhLnJlc3VsdHM7XG4gICAgICAvLyBSZWplY3QgaWYgbW9yZSB0aGFuIG9uZSByZXN1bHRzXG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmVycm9yKHtcbiAgICAgICAgICB0eXBlOiAnVG9vTWFueVJlc3VsdHMnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdNdWx0aXBsZSBhcHBzIGhhcyBiZWVuIHJldHJpZXZlZCAnICtcbiAgICAgICAgICAgICAgICAgICAnd2hlbiBvbmx5IG9uZSB3YXMgZXhwZWN0ZWQuJyxcbiAgICAgICAgICBkYXRhOiByZXMuZGF0YVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgICAvLyBOdWxsIHdoZW4gbm8gcmVzdWx0XG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICAvLyBCdWlsZCB0aGUgYXBwIGlmIGV4YWN0bHkgb25lIHJlc3VsdFxuICAgICAgdmFyIGFwcCA9IEFwcC5mcm9tSnNvbihyZXN1bHRzWzBdKTtcbiAgICAgIGFwcHNDYWNoZS5wdXQoYXBwLmlkLCBhcHApO1xuICAgICAgcmV0dXJuIGFwcDtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgbGlzdDogbGlzdCxcbiAgICBnZXRCeUlkOiBnZXRCeUlkLFxuICAgIGZpbmRPbmU6IGZpbmRPbmVcbiAgfTtcbn0pO1xuIiwiLyogZXNsaW50IGNhbWVsY2FzZTpbMiwge3Byb3BlcnRpZXM6IFwibmV2ZXJcIn1dICovXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5XG4gKiBAZGVzYyBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUgcHJvdmlkZXMgdG9vbHMgdG8gY3JlYXRlIGFuZCBtYW5hZ2VcbiAqICAgICAgIG5hdmlnYXRpb24gaXRlbXMuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLCBbJ2hicENvbW1vbicsICd1dWlkNCddKVxuLnNlcnZpY2UoJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsIGZ1bmN0aW9uKCRxLCAkaHR0cCwgJGxvZyxcbiAgICAkY2FjaGVGYWN0b3J5LCAkdGltZW91dCwgb3JkZXJCeUZpbHRlciwgdXVpZDQsXG4gICAgaGJwVXRpbCwgYmJwQ29uZmlnKSB7XG4gIHZhciBjb2xsYWJBcGlVcmwgPSBiYnBDb25maWcuZ2V0KCdhcGkuY29sbGFiLnYwJykgKyAnL2NvbGxhYi8nO1xuICAvLyBhIGNhY2hlIHdpdGggaW5kaXZpZHVhbCBuYXYgaXRlbXNcbiAgdmFyIGNhY2hlTmF2SXRlbXMgPSAkY2FjaGVGYWN0b3J5KCduYXZJdGVtJyk7XG5cbiAgLy8gYSBjYWNoZSB3aXRoIHRoZSBwcm9taXNlcyBvZiBlYWNoIGNvbGxhYidzIG5hdiB0cmVlIHJvb3RcbiAgdmFyIGNhY2hlTmF2Um9vdHMgPSAkY2FjaGVGYWN0b3J5KCduYXZSb290Jyk7XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBOYXZJdGVtXG4gICAqIEBkZXNjXG4gICAqIENsaWVudCByZXByZXNlbnRhdGlvbiBvZiBhIG5hdmlnYXRpb24gaXRlbS5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge29iamVjdH0gYXR0ciBhdHRyaWJ1dGVzIG9mIHRoZSBuZXcgaW5zdGFuY2VcbiAgICovXG4gIHZhciBOYXZJdGVtID0gZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0ciwgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jb250ZXh0KSkge1xuICAgICAgdGhpcy5jb250ZXh0ID0gdXVpZDQuZ2VuZXJhdGUoKTtcbiAgICB9XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jaGlsZHJlbikpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB9XG4gIH07XG4gIE5hdkl0ZW0ucHJvdG90eXBlID0ge1xuICAgIC8qKlxuICAgICAqIEBkZXNjXG4gICAgICogUmV0dXJuIGEgc2VydmVyIG9iamVjdCByZXByZXNlbnRhdGlvbiB0aGF0IGNhbiBiZSBlYXNpbHkgc2VyaWFsaXplZFxuICAgICAqIHRvIEpTT04gYW5kIHNlbmQgdG8gdGhlIGJhY2tlbmQuXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLk5hdkl0ZW1cbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IHNlcnZlciBvYmplY3QgcmVwcmVzZW50YXRpb25cbiAgICAgKi9cbiAgICB0b0pzb246IGZ1bmN0aW9uKCkge1xuICAgICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICBhcHBfaWQ6IHRoaXMuYXBwSWQsXG4gICAgICAgIGNvbGxhYjogdGhpcy5jb2xsYWJJZCxcbiAgICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXG4gICAgICAgIG9yZGVyX2luZGV4OiB0aGlzLm9yZGVyLFxuICAgICAgICB0eXBlOiB0aGlzLnR5cGUgfHwgKHRoaXMuZm9sZGVyID8gJ0ZPJyA6ICdJVCcpLFxuICAgICAgICBwYXJlbnQ6IHRoaXMucGFyZW50SWRcbiAgICAgIH07XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbVxuICAgICAqIEBwYXJhbSAge29iamVjdH0gYXR0cnMgTmF2SXRlbSBpbnN0YW5jZSBhdHRyaWJ1dGVzXG4gICAgICogQHJldHVybiB7TmF2SXRlbXR9IHRoaXMgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICBhbmd1bGFyLmZvckVhY2goW1xuICAgICAgICAnaWQnLCAnbmFtZScsICdjaGlsZHJlbicsICdjb250ZXh0JyxcbiAgICAgICAgJ2NvbGxhYklkJywgJ2FwcElkJywgJ29yZGVyJywgJ2ZvbGRlcicsXG4gICAgICAgICdwYXJlbnRJZCcsICd0eXBlJ1xuICAgICAgXSwgZnVuY3Rpb24oYSkge1xuICAgICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoYXR0cnNbYV0pKSB7XG4gICAgICAgICAgdGhpc1thXSA9IGF0dHJzW2FdO1xuICAgICAgICB9XG4gICAgICB9LCB0aGlzKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbVxuICAgICAqIEByZXR1cm4ge05hdkl0ZW19IHRoaXMgaW5zdGFuY2VcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGVuc3VyZUNhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnB1dChrZXkodGhpcy5jb2xsYWJJZCwgdGhpcy5pZCksIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogTWFuYWdlIGBhY2NgIGFjY3VtdWxhdG9yIHdpdGggYWxsIHRoZSBkYXRhIGZyb20ganNvbkFycmF5IGFuZCByZXR1cm4gaXQuXG4gICAqXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgIHRoZSBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7YXJyYXl9IGpzb25BcnJheSBkZXNjcmlwdGlvbiBvZiB0aGUgY2hpbGRyZW5cbiAgICogQHBhcmFtICB7QXJyYXl9IGFjYyAgICAgICB0aGUgYWNjdW11bGF0b3JcbiAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgICB0aGUgY2hpbGRyZW5cbiAgICovXG4gIGZ1bmN0aW9uIGNoaWxkcmVuRnJvbUpzb24oY29sbGFiSWQsIGpzb25BcnJheSwgYWNjKSB7XG4gICAgYWNjID0gYWNjIHx8IFtdO1xuICAgIC8vIGFuIHVuZGVmaW5lZCBhcnJheSBtZWFucyB3ZSBhYm9ydCB0aGUgcHJvY2Vzc1xuICAgIC8vIHdoZXJlIGFuIGVtcHR5IGFycmF5IHdpbGwgZW5zdXJlIHRoZSByZXN1bHRpbmcgYXJyYXlcbiAgICAvLyBpcyBlbXB0eSBhcyB3ZWxsLlxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGpzb25BcnJheSkpIHtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuXG4gICAgYWNjLmxlbmd0aCA9IDA7XG4gICAgYW5ndWxhci5mb3JFYWNoKGpzb25BcnJheSwgZnVuY3Rpb24oanNvbikge1xuICAgICAgYWNjLnB1c2goTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwganNvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG4gIH1cbiAgLyoqXG4gICAqIEJ1aWxkIGFuIGluc3RhbmNlIGZyb20gdGhlIHNlcnZlciBvYmplY3QgcmVwcmVzZW50YXRpb24uXG4gICAqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge3N0cmluZ30ganNvbiBzZXJ2ZXIgb2JqZWN0IHJlcHJlc2VudGF0aW9uXG4gICAqIEByZXR1cm4ge05hdkl0ZW19IG5ldyBpbnN0YW5jZSBvZiBOYXZJdGVtXG4gICAqL1xuICBOYXZJdGVtLmZyb21Kc29uID0gZnVuY3Rpb24oY29sbGFiSWQsIGpzb24pIHtcbiAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgIHZhciBhdHRycyA9IHtcbiAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgYXBwSWQ6IGpzb24uYXBwX2lkLFxuICAgICAgY29sbGFiSWQ6IGNvbGxhYklkLFxuICAgICAgbmFtZToganNvbi5uYW1lLFxuICAgICAgY29udGV4dDoganNvbi5jb250ZXh0LFxuICAgICAgb3JkZXI6IGpzb24ub3JkZXJfaW5kZXgsXG4gICAgICBmb2xkZXI6IGpzb24udHlwZSA9PT0gJ0ZPJyxcbiAgICAgIHR5cGU6IGpzb24udHlwZSxcbiAgICAgIHBhcmVudElkOiBqc29uLnBhcmVudCxcbiAgICAgIGNoaWxkcmVuOiBjaGlsZHJlbkZyb21Kc29uKGNvbGxhYklkLCBqc29uLmNoaWxkcmVuKVxuICAgIH07XG4gICAgdmFyIGsgPSBrZXkoY29sbGFiSWQsIGF0dHJzLmlkKTtcbiAgICB2YXIgY2FjaGVkID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG4gICAgaWYgKGNhY2hlZCkge1xuICAgICAgcmV0dXJuIGNhY2hlZC51cGRhdGUoYXR0cnMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE5hdkl0ZW0oYXR0cnMpLmVuc3VyZUNhY2hlZCgpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgcm9vdCBpdGVtIG9mIHRoZSBnaXZlbiBjb2xsYWIuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoZSByb290IG5hdiBpdGVtXG4gICAqL1xuICB2YXIgZ2V0Um9vdCA9IGZ1bmN0aW9uKGNvbGxhYklkKSB7XG4gICAgdmFyIHRyZWVQcm9taXNlID0gY2FjaGVOYXZSb290cy5nZXQoY29sbGFiSWQpO1xuXG4gICAgaWYgKCF0cmVlUHJvbWlzZSkge1xuICAgICAgdHJlZVByb21pc2UgPSAkaHR0cC5nZXQoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi9hbGwvJykudGhlbihcbiAgICAgICAgZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgIHZhciByb290O1xuICAgICAgICAgIHZhciBpO1xuICAgICAgICAgIHZhciBpdGVtO1xuICAgICAgICAgIHZhciBkYXRhID0gb3JkZXJCeUZpbHRlcihyZXNwLmRhdGEsICcrb3JkZXJfaW5kZXgnKTtcblxuICAgICAgICAgIC8vIGZpbGwgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgZm9yIChpID0gMDsgaSAhPT0gZGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaXRlbSA9IE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIGRhdGFbaV0pO1xuICAgICAgICAgICAgaWYgKGl0ZW0uY29udGV4dCA9PT0gJ3Jvb3QnKSB7XG4gICAgICAgICAgICAgIHJvb3QgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGxpbmsgY2hpbGRyZW4gYW5kIHBhcmVudHNcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBkYXRhW2ldLmlkKSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5wYXJlbnRJZCkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBpdGVtLnBhcmVudElkKSk7XG4gICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByb290O1xuICAgICAgICB9LFxuICAgICAgICBoYnBVdGlsLmZlcnJcbiAgICAgICk7XG5cbiAgICAgIGNhY2hlTmF2Um9vdHMucHV0KGNvbGxhYklkLCB0cmVlUHJvbWlzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWVQcm9taXNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7bnVtYmVyfSBub2RlSWQgICBub2RlIElEXG4gICAqIEByZXR1cm4ge05hdkl0ZW19IHRoZSBtYXRjaGluZyBuYXYgaXRlbVxuICAgKi9cbiAgdmFyIGdldE5vZGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGdldFJvb3QoY29sbGFiSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgayA9IGtleShjb2xsYWJJZCwgbm9kZUlkKTtcbiAgICAgIHZhciBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG5cbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAkbG9nLmVycm9yKCd1bmtub3duIG5hdiBpdGVtJywgayk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7bnVtYmVyfSBuYXZJdGVtICB0aGUgTmF2SXRlbSBpbnN0YW5jZSB0byBhZGQgdG8gdGhlIG5hdmlnYXRpb25cbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiB0aGUgYWRkZWQgTmF2SXRlbSBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIGFkZE5vZGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbmF2SXRlbSkge1xuICAgIHJldHVybiAkaHR0cC5wb3N0KGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSB0aGUgTmF2SXRlbSBpbnN0YW5jZSB0byByZW1vdmUgZnJvbSB0aGUgbmF2aWdhdGlvblxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGFuIHVuZGVmaW5lZCBpdGVtIGF0IHRoZSBlbmRcbiAgICovXG4gIHZhciBkZWxldGVOb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJyArIG5hdkl0ZW0uaWQgKyAnLycpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnJlbW92ZShrZXkoY29sbGFiSWQsIG5hdkl0ZW0uaWQpKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSB0aGUgaW5zdGFuY2UgdG8gdXBkYXRlXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhlIHVwZGF0ZWQgaW5zdGFuY2VcbiAgICovXG4gIHZhciB1cGRhdGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbmF2SXRlbSkge1xuICAgIG5hdkl0ZW0uY29sbGFiSWQgPSBjb2xsYWJJZDtcbiAgICByZXR1cm4gJGh0dHAucHV0KGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJyArXG4gICAgICBuYXZJdGVtLmlkICsgJy8nLCBuYXZJdGVtLnRvSnNvbigpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgIHJldHVybiBOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCByZXNwLmRhdGEpO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgLy8gb3JkZXJpbmcgb3BlcmF0aW9uIG5lZWRzIHRvIGJlIGdsb2JhbGx5IHF1ZXVlZCB0byBlbnN1cmUgY29uc2lzdGVuY3kuXG4gIHZhciBpbnNlcnRRdWV1ZSA9ICRxLndoZW4oKTtcblxuICAvKipcbiAgICogSW5zZXJ0IG5vZGUgaW4gdGhlIHRocmVlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtpbnR9IGNvbGxhYklkICAgaWQgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBuYXZJdGVtICAgIE5hdiBpdGVtIGluc3RhbmNlXG4gICAqIEBwYXJhbSAge05hdkl0ZW19IHBhcmVudEl0ZW0gcGFyZW50IGl0ZW1cbiAgICogQHBhcmFtICB7aW50fSBpbnNlcnRBdCAgIGFkZCB0byB0aGUgbWVudVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgYSBwcm9taXNlIHRoYXQgd2lsbFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoZSB1cGRhdGUgbmF2IGl0ZW1cbiAgICovXG4gIGZ1bmN0aW9uIGluc2VydE5vZGUoY29sbGFiSWQsIG5hdkl0ZW0sIHBhcmVudEl0ZW0sIGluc2VydEF0KSB7XG4gICAgcmV0dXJuIGluc2VydFF1ZXVlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBuYXZJdGVtLm9yZGVyID0gaW5zZXJ0QXQgKyAxOyAvLyBmaXJzdCBpdGVtIG9yZGVyX2luZGV4IG11c3QgYmUgMVxuICAgICAgbmF2SXRlbS5wYXJlbnRJZCA9IHBhcmVudEl0ZW0uaWQ7XG4gICAgICByZXR1cm4gdXBkYXRlKGNvbGxhYklkLCBuYXZJdGVtKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSB1bmlxdWUga2V5IGZvciBjaGFjaGluZyBhIG5hdiBpdGVtLlxuICAgKiBAcGFyYW0gIHtpbnR9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtpbnR9IG5vZGVJZCAgIE5hdkl0ZW0gSURcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgICB0aGUgdW5pcXVlIGtleVxuICAgKi9cbiAgZnVuY3Rpb24ga2V5KGNvbGxhYklkLCBub2RlSWQpIHtcbiAgICByZXR1cm4gY29sbGFiSWQgKyAnLS0nICsgbm9kZUlkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBOYXZJdGVtOiBOYXZJdGVtLFxuICAgIGdldFJvb3Q6IGdldFJvb3QsXG4gICAgZ2V0Tm9kZTogZ2V0Tm9kZSxcbiAgICBhZGROb2RlOiBhZGROb2RlLFxuICAgIHNhdmVOb2RlOiB1cGRhdGUsXG4gICAgZGVsZXRlTm9kZTogZGVsZXRlTm9kZSxcbiAgICBpbnNlcnROb2RlOiBpbnNlcnROb2RlXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6IDAgKi9cbi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBzdG9yYWdlVXRpbCBwcm92aWRlcyB1dGlsaXR5IGZ1bmN0aW9ucyB0byBlYXNlIHRoZSBpbnRlcmFjdGlvbiBvZiBhcHBzIHdpdGggc3RvcmFnZS5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlTdG9yYWdlJywgWydoYnBDb21tb24nXSlcbi5mYWN0b3J5KCdoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZScsXG4gIGZ1bmN0aW9uIGhicENvbGxhYm9yYXRvcnlTdG9yYWdlKGhicFV0aWwsIGhicEVudGl0eVN0b3JlLCBoYnBFcnJvclNlcnZpY2UpIHtcbiAgICAvKipcbiAgICAgKiBSZXRyaWV2ZSB0aGUga2V5IHRvIGxvb2t1cCBmb3Igb24gZW50aXRpZXMgZ2l2ZW4gdGhlIGN0eFxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQHBhcmFtICB7c3RyaW5nfSBjdHggYXBwbGljYXRpb24gY29udGV4dCBVVUlEXG4gICAgICogQHJldHVybiB7c3RyaW5nfSAgICAgbmFtZSBvZiB0aGUgZW50aXR5IGF0dHJpYnV0ZSB0aGF0IHNob3VsZCBiZSB1c2VkXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBtZXRhZGF0YUtleShjdHgpIHtcbiAgICAgIHJldHVybiAnY3R4XycgKyBjdHg7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgc2V0Q29udGV4dE1ldGFkYXRhXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAZGVzY1xuICAgICAqIHRoZSBmdW5jdGlvbiBsaW5rcyB0aGUgY29udGV4dElkIHdpdGggdGhlIGRvYyBicm93c2VyIGVudGl0eSBpbiBpbnB1dFxuICAgICAqIGJ5IHNldHRpbmcgYSBzcGVjaWZpYyBtZXRhZGF0YSBvbiB0aGUgZW50aXR5LlxuICAgICAqXG4gICAgICogRW50aXR5IG9iamVjdCBpbiBpbnB1dCBtdXN0IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgICAqIC0gX2VudGl0eVR5cGVcbiAgICAgKiAtIF91dWlkXG4gICAgICpcbiAgICAgKiBJbiBjYXNlIG9mIGVycm9yLCB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIGEgYEhicEVycm9yYCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZW50aXR5IGRvYyBicm93c2VyIGVudGl0eVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gY29udGV4dElkIGNvbGxhYiBhcHAgY29udGV4dCBpZFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZXRDb250ZXh0TWV0YWRhdGEoZW50aXR5LCBjb250ZXh0SWQpIHtcbiAgICAgIHZhciBuZXdNZXRhZGF0YSA9IHt9O1xuICAgICAgbmV3TWV0YWRhdGFbbWV0YWRhdGFLZXkoY29udGV4dElkKV0gPSAxO1xuXG4gICAgICByZXR1cm4gaGJwRW50aXR5U3RvcmUuYWRkTWV0YWRhdGEoZW50aXR5LCBuZXdNZXRhZGF0YSlcbiAgICAgIC5jYXRjaChoYnBFcnJvclNlcnZpY2UuZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIGdldEVudGl0eUJ5Q29udGV4dFxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQGRlc2NcbiAgICAgKiB0aGUgZnVuY3Rpb24gZ2V0cyB0aGUgZW50aXR5IGxpbmtlZCB0byB0aGUgY29udGV4dElkIGluIGlucHV0LlxuICAgICAqXG4gICAgICogSW4gY2FzZSBvZiBlcnJvciwgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCBhIGBIYnBFcnJvcmAgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRleHRJZCBjb2xsYWIgYXBwIGNvbnRleHQgaWRcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0RW50aXR5QnlDb250ZXh0KGNvbnRleHRJZCkge1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge307XG4gICAgICBxdWVyeVBhcmFtc1ttZXRhZGF0YUtleShjb250ZXh0SWQpXSA9IDE7XG5cbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5xdWVyeShxdWVyeVBhcmFtcykudGhlbihudWxsLCBoYnBVdGlsLmZlcnIpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIGRlbGV0ZUNvbnRleHRNZXRhZGF0YVxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQGRlc2NcbiAgICAgKiB0aGUgZnVuY3Rpb24gdW5saW5rIHRoZSBjb250ZXh0SWQgZnJvbSB0aGUgZW50aXR5IGluIGlucHV0XG4gICAgICogYnkgZGVsZXRpbmcgdGhlIGNvbnRleHQgbWV0YWRhdGEuXG4gICAgICpcbiAgICAgKiBFbnRpdHkgb2JqZWN0IGluIGlucHV0IG11c3QgY29udGFpbiB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAgICogLSBfZW50aXR5VHlwZVxuICAgICAqIC0gX3V1aWRcbiAgICAgKlxuICAgICAqIEluIGNhc2Ugb2YgZXJyb3IsIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggYSBgSGJwRXJyb3JgIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBlbnRpdHkgZG9jIGJyb3dzZXIgZW50aXR5XG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZXh0SWQgY29sbGFiIGFwcCBjb250ZXh0IGlkXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGRlbGV0ZUNvbnRleHRNZXRhZGF0YShlbnRpdHksIGNvbnRleHRJZCkge1xuICAgICAgdmFyIGtleSA9IG1ldGFkYXRhS2V5KGNvbnRleHRJZCk7XG5cbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5kZWxldGVNZXRhZGF0YShlbnRpdHksIFtrZXldKVxuICAgICAgLnRoZW4obnVsbCwgaGJwRXJyb3JTZXJ2aWNlLmVycm9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSB1cGRhdGVDb250ZXh0TWV0YWRhdGFcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBkZXNjXG4gICAgICogdGhlIGZ1bmN0aW9uIGRlbGV0ZSB0aGUgY29udGV4dElkIGZyb20gdGhlIGBvbGRFbnRpdHlgIG1ldGFkYXRhIGFuZCBhZGRcbiAgICAgKiBpdCBhcyBgbmV3RW50aXR5YCBtZXRhZGF0YS5cbiAgICAgKlxuICAgICAqIEVudGl0eSBvYmplY3RzIGluIGlucHV0IG11c3QgY29udGFpbiB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAgICogLSBfZW50aXR5VHlwZVxuICAgICAqIC0gX3V1aWRcbiAgICAgKlxuICAgICAqIEluIGNhc2Ugb2YgZXJyb3IsIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggYSBgSGJwRXJyb3JgIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBuZXdFbnRpdHkgZG9jIGJyb3dzZXIgZW50aXR5IHRvIGxpbmsgdG8gdGhlIGNvbnRleHRcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG9sZEVudGl0eSBkb2MgYnJvd3NlciBlbnRpdHkgdG8gdW5saW5rIGZyb20gdGhlIGNvbnRleHRcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRleHRJZCBjb2xsYWIgYXBwIGNvbnRleHQgaWRcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gdXBkYXRlQ29udGV4dE1ldGFkYXRhKG5ld0VudGl0eSwgb2xkRW50aXR5LCBjb250ZXh0SWQpIHtcbiAgICAgIHJldHVybiBkZWxldGVDb250ZXh0TWV0YWRhdGEob2xkRW50aXR5LCBjb250ZXh0SWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzZXRDb250ZXh0TWV0YWRhdGEobmV3RW50aXR5LCBjb250ZXh0SWQpO1xuICAgICAgfSkuY2F0Y2goaGJwRXJyb3JTZXJ2aWNlLmVycm9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBnZXRQcm9qZWN0QnlDb2xsYWJcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBkZXNjXG4gICAgICogdGhlIGZ1bmN0aW9uIHJldHVybnMgdGhlIHN0b3JhZ2UgcHJvamVjdCBvZiB0aGUgY29sbGFiSWQgaW4gaW5wdXQuXG4gICAgICpcbiAgICAgKiBJbiBjYXNlIG9mIGVycm9yLCB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIGEgYEhicEVycm9yYCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gY29sbGFiSWQgY29sbGFiIGlkXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIHByb2plY3QgZGV0YWlsc1xuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldFByb2plY3RCeUNvbGxhYihjb2xsYWJJZCkge1xuICAgICAgdmFyIHF1ZXJ5UGFyYW1zID0ge1xuICAgICAgICBtYW5hZ2VkX2J5X2NvbGxhYjogY29sbGFiSWRcbiAgICAgIH07XG4gICAgICByZXR1cm4gaGJwRW50aXR5U3RvcmUucXVlcnkocXVlcnlQYXJhbXMpLnRoZW4obnVsbCwgaGJwVXRpbC5mZXJyKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc2V0Q29udGV4dE1ldGFkYXRhOiBzZXRDb250ZXh0TWV0YWRhdGEsXG4gICAgICBnZXRFbnRpdHlCeUNvbnRleHQ6IGdldEVudGl0eUJ5Q29udGV4dCxcbiAgICAgIGRlbGV0ZUNvbnRleHRNZXRhZGF0YTogZGVsZXRlQ29udGV4dE1ldGFkYXRhLFxuICAgICAgdXBkYXRlQ29udGV4dE1ldGFkYXRhOiB1cGRhdGVDb250ZXh0TWV0YWRhdGEsXG4gICAgICBnZXRQcm9qZWN0QnlDb2xsYWI6IGdldFByb2plY3RCeUNvbGxhYlxuICAgIH07XG4gIH0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVDb2xsYWJTZXJ2aWNlKFxuICAkbG9nLCAkcSwgaGJwQ29sbGFiU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3Jcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignY29sbGFiJywgY3JlYXRlQ29sbGFiKTtcblxuICAvKipcbiAgICogQGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBkZXNjXG4gICAqICBDcmVhdGUgYSBjb2xsYWIgZGVmaW5lZCBieSB0aGUgZ2l2ZW4gb3B0aW9ucy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRlc2NyaXB0b3IgLSBQYXJhbWV0ZXJzIHRvIGNyZWF0ZSB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLm5hbWUgLSBOYW1lIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0b3IuZGVzY3JpcHRpb24gLSBEZXNjcmlwdGlvbiBpbiBsZXNzIHRoYW4gMTQwIGNoYXJhY3RlcnNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRvci5wcml2YWN5XSAtICdwcml2YXRlJyBvciAncHVibGljJy4gTm90ZXMgdGhhdCBvbmx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIQlAgTWVtYmVycyBjYW4gY3JlYXRlIHByaXZhdGUgY29sbGFiXG4gICAqIEBwYXJhbSB7QXJyYXl9IFthZnRlcl0gLSBkZXNjcmlwdG9yIG9mIHN1YnRhc2tzXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IC0gcHJvbWlzZSBvZiBhIGNvbGxhYlxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29sbGFiKGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgYXR0ciA9IGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuZXh0cmFjdEF0dHJpYnV0ZXMoXG4gICAgICBkZXNjcmlwdG9yLFxuICAgICAgWyd0aXRsZScsICdjb250ZW50JywgJ3ByaXZhdGUnXVxuICAgICk7XG4gICAgJGxvZy5kZWJ1ZygnQ3JlYXRlIGNvbGxhYicsIGRlc2NyaXB0b3IpO1xuICAgIHJldHVybiBoYnBDb2xsYWJTdG9yZS5jcmVhdGUoYXR0cik7XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVOYXZJdGVtKFxuICAkbG9nLFxuICBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcixcbiAgaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2UsXG4gIGhicEVudGl0eVN0b3JlXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ25hdicsIGNyZWF0ZU5hdkl0ZW0pO1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgbmF2IGl0ZW0uXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuVGFza3NcbiAgICogQHBhcmFtIHtvYmplY3R9IGRlc2NyaXB0b3IgYSBkZXNjcmlwdG9yIGRlc2NyaXB0aW9uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLm5hbWUgbmFtZSBvZiB0aGUgbmF2IGl0ZW1cbiAgICogQHBhcmFtIHtDb2xsYWJ9IGRlc2NyaXB0b3IuY29sbGFiSWQgY29sbGFiIGluIHdoaWNoIHRvIGFkZCB0aGUgaXRlbSBpbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0b3IuYXBwIGFwcCBuYW1lIGxpbmtlZCB0byB0aGUgbmF2IGl0ZW1cbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSB0aGUgY3VycmVudCBydW4gY29udGV4dFxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHQuY29sbGFiXSBhIGNvbGxhYiBpbnN0YW5jZSBjcmVhdGVkIHByZXZpb3VzbHlcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiBhIE5hdkl0ZW0gaW5zdGFuY2VcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZU5hdkl0ZW0oZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIHZhciBjb2xsYWJJZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIChkZXNjcmlwdG9yICYmIGRlc2NyaXB0b3IuY29sbGFiKSB8fFxuICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0LmNvbGxhYi5pZCk7XG4gICAgfTtcbiAgICB2YXIgZmluZEFwcCA9IGZ1bmN0aW9uKGFwcCkge1xuICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlBcHBTdG9yZS5maW5kT25lKHt0aXRsZTogYXBwfSk7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlTmF2ID0gZnVuY3Rpb24oYXBwKSB7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLmdldFJvb3QoY29sbGFiSWQoKSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHBhcmVudEl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5hZGROb2RlKGNvbGxhYklkKCksXG4gICAgICAgICAgbmV3IGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtKHtcbiAgICAgICAgICAgIGNvbGxhYjogY29sbGFiSWQoKSxcbiAgICAgICAgICAgIG5hbWU6IGRlc2NyaXB0b3IubmFtZSxcbiAgICAgICAgICAgIGFwcElkOiBhcHAuaWQsXG4gICAgICAgICAgICBwYXJlbnRJZDogcGFyZW50SXRlbS5pZFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBsaW5rVG9TdG9yYWdlID0gZnVuY3Rpb24obmF2KSB7XG4gICAgICBpZiAoIWRlc2NyaXB0b3IuZW50aXR5KSB7XG4gICAgICAgIHJldHVybiBuYXY7XG4gICAgICB9XG4gICAgICB2YXIgc2V0TGluayA9IGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2Uuc2V0Q29udGV4dE1ldGFkYXRhKGVudGl0eSwgbmF2LmNvbnRleHQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBuYXY7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIC8vIEl0IG1pZ2h0IGJlIHRoZSBuYW1lIHVzZWQgaW4gYSBwcmV2aW91cyBzdG9yYWdlIHRhc2suXG4gICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0LnN0b3JhZ2UgJiYgY29udGV4dC5zdG9yYWdlW2Rlc2NyaXB0b3IuZW50aXR5XSkge1xuICAgICAgICByZXR1cm4gc2V0TGluayhjb250ZXh0LnN0b3JhZ2VbZGVzY3JpcHRvci5lbnRpdHldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5nZXQoZGVzY3JpcHRvci5lbnRpdHkpLnRoZW4oc2V0TGluayk7XG4gICAgfTtcblxuICAgICRsb2cuZGVidWcoJ0NyZWF0ZSBuYXYgaXRlbScsIGRlc2NyaXB0b3IsIGNvbnRleHQpO1xuXG4gICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuZW5zdXJlUGFyYW1ldGVycyhkZXNjcmlwdG9yLCAnYXBwJywgJ25hbWUnKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGZpbmRBcHAoZGVzY3JpcHRvci5hcHApXG4gICAgICAudGhlbihjcmVhdGVOYXYpXG4gICAgICAudGhlbihsaW5rVG9TdG9yYWdlKTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlNlcnZpY2UoXG4gICRsb2csICRxLCBoYnBFbnRpdHlTdG9yZSxcbiAgaGJwRXJyb3JTZXJ2aWNlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLFxuICBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCdzdG9yYWdlJywgc3RvcmFnZSk7XG5cbiAgLyoqXG4gICAqIENvcHkgZmlsZXMgYW5kIGZvbGRlcnMgdG8gdGhlIGRlc3RpbmF0aW9uIGNvbGxhYiBzdG9yYWdlLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZXNjcmlwdG9yIHRoZSB0YXNrIGNvbmZpZ3VyYXRpb25cbiAgICogQHBhcmFtIHtvYmplY3R9IGRlc2NyaXB0b3Iuc3RvcmFnZSBhIG9iamVjdCB3aGVyZSBrZXlzIGFyZSB0aGUgZmlsZSBwYXRoIGluIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IGNvbGxhYiBhbmQgdmFsdWUgYXJlIHRoZSBVVUlEIG9mIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5IHRvIGNvcHkgYXQgdGhpcyBwYXRoLlxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3IuY29sbGFiXSBpZCBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb250ZXh0IHRoZSBjdXJyZW50IHRhc2sgY29udGV4dFxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHQuY29sbGFiXSB0aGUgY29sbGFiIGluIHdoaWNoIGVudGl0aWVzIHdpbGwgYmUgY29waWVkXG4gICAqIEByZXR1cm4ge29iamVjdH0gY3JlYXRlZCBlbnRpdGllcyB3aGVyZSBrZXlzIGFyZSB0aGUgc2FtZSBhcyBwcm92aWRlZCBpblxuICAgKiAgICAgICAgICAgICAgICAgIGNvbmZpZy5zdG9yYWdlXG4gICAqL1xuICBmdW5jdGlvbiBzdG9yYWdlKGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5lbnN1cmVQYXJhbWV0ZXJzKFxuICAgICAgZGVzY3JpcHRvciwgJ2VudGl0aWVzJ1xuICAgICkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAgICAuZ2V0UHJvamVjdEJ5Q29sbGFiKGRlc2NyaXB0b3IuY29sbGFiIHx8IGNvbnRleHQuY29sbGFiLmlkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0RW50aXR5KSB7XG4gICAgICAgICAgdmFyIHByb21pc2VzID0ge307XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRlc2NyaXB0b3IuZW50aXRpZXMsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgcHJvbWlzZXNbbmFtZV0gPSAoXG4gICAgICAgICAgICAgICAgaGJwRW50aXR5U3RvcmUuY29weSh2YWx1ZSwgcHJvamVjdEVudGl0eS5fdXVpZCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgJGxvZy53YXJuKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gZm9yIHN0b3JhZ2UgdGFzaycsIGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2NcbiAqIFByb3ZpZGVzIGFuZ3VsYXIgc2VydmljZXMgdG8gd29yayB3aXRoIEhCUCBDb2xsYWJvcmF0b3J5LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeScsIFtcbiAgJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZSdcbl0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
