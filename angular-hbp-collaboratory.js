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
    handlers: handlers,
    registerHandler: registerHandler,
    task: task,
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
    var findApp = function() {
      return hbpCollaboratoryAppStore.findOne({title: descriptor.app});
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
    return findApp(descriptor.app)
    .then(createNav)
    .then(linkToStorage);
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
      descriptor, 'storage'
    ).then(function() {
      return hbpCollaboratoryStorage
        .getProjectByCollab(descriptor.collab || context.collab.id)
        .then(function(projectEntity) {
          var promises = {};
          angular.forEach(descriptor.storage, function(value, name) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwiYXV0b21hdG9yL3Rhc2tzL2NyZWF0ZS1jb2xsYWIuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLW5hdi1pdGVtLmpzIiwiYXV0b21hdG9yL3Rhc2tzL3N0b3JhZ2UuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXlDQSxRQUFRLE9BQU8sNkJBQTZCO0VBQzFDO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTs7Q0FFRCxRQUFRLCtEQUE2QixTQUFTO0VBQzdDLElBQUksTUFBTTtFQUNWO0VBQ0EsSUFBSSxXQUFXOzs7Ozs7Ozs7RUFTZixTQUFTLGdCQUFnQixNQUFNLElBQUk7SUFDakMsU0FBUyxRQUFROzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBNEJuQixTQUFTLEtBQUssTUFBTSxZQUFZLFNBQVM7SUFDdkMsSUFBSTtNQUNGLE9BQU8sSUFBSSxLQUFLLE1BQU0sWUFBWTtNQUNsQyxPQUFPLElBQUk7TUFDWCxLQUFLLE1BQU0sYUFBYTtNQUN4QixNQUFNLGdCQUFnQixNQUFNO1FBQzFCLE1BQU07UUFDTixTQUFTLGtCQUFrQixPQUFPLE9BQU87UUFDekMsTUFBTTtVQUNKLE9BQU87VUFDUCxNQUFNO1VBQ04sWUFBWTtVQUNaLFNBQVM7Ozs7Ozs7Ozs7Ozs7OztFQWVqQixTQUFTLGVBQWUsT0FBTztJQUM3QixJQUFJLFdBQVc7SUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sUUFBUTtNQUMzQixPQUFPOztJQUVULEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsS0FBSztNQUNyQyxJQUFJLFVBQVUsTUFBTTtNQUNwQixLQUFLLElBQUksUUFBUSxTQUFT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O0FDNUNBOzs7OztBQUtBLFFBQVEsT0FBTyxvQkFBb0I7RUFDakM7RUFDQTtFQUNBOztBQUVGIiwiZmlsZSI6ImFuZ3VsYXItaGJwLWNvbGxhYm9yYXRvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGlzIGFuIEFuZ3VsYXJKUyBmYWN0b3J5IHRoYXRcbiAqIHByb3ZpZGUgdGFzayBhdXRvbWF0aW9uIHRvIGFjY29tcGxpc2ggYSBzZXF1ZW5jZSBvZlxuICogY29tbW9uIG9wZXJhdGlvbiBpbiBDb2xsYWJvcmF0b3J5LlxuICpcbiAqIEhvdyB0byBhZGQgbmV3IHRhc2tzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE5ldyB0YXNrcyBjYW4gYmUgYWRkZWQgYnkgY2FsbGluZyBgYGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyYGAuXG4gKlxuICogWW91IGNhbiBzZWUgYSBmZXcgZXhhbXBsZSBvZiB0YXNrcyBpbiB0aGUgYHRhc2tzYCBmb2xkZXIuXG4gKlxuICogRXZhbHVhdGUgdGhlIGF1dG9tYXRvclxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIEZyb20gdGhlIHJvb3Qgb2YgdGhpcyBwcm9qZWN0LCB5b3UgY2FuIHN0YXJ0IGEgc2VydmVyIHRoYXQgd2lsbCBsZXRcbiAqIHlvdSB3cml0ZSBhIGRlc2NyaXB0b3IgYW5kIHJ1biBpdC5cbiAqXG4gKiAuLiBjb2RlLWJsb2NrOjogYmFzaFxuICpcbiAqICAgIGd1bHAgZXhhbXBsZVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSAkcSBpbmplY3RlZCBkZXBlbmRlbmN5XG4gKiBAcmV0dXJuIHtvYmplY3R9IGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IgYW5ndWxhciBzZXJ2aWNlXG4gKiBAZXhhbXBsZSA8Y2FwdGlvbj5DcmVhdGUgYSBDb2xsYWIgd2l0aCBhIGZldyBuYXZpZ2F0aW9uIGl0ZW1zPC9jYXB0aW9uPlxuICogLy8gQ3JlYXRlIGEgQ29sbGFiIHdpdGggYSBmZXcgbmF2aWdhdGlvbiBpdGVtcy5cbiAqIGFuZ3VsYXIubW9kdWxlKCdNeU1vZHVsZScsIFsnaGJwQ29sbGFib3JhdG9yeSddKVxuICogLnJ1bihmdW5jdGlvbihoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLCAkbG9nKSB7XG4gKiAgIHZhciBjb25maWcgPSB7XG4gKiAgICAgdGl0bGU6ICdNeSBDdXN0b20gQ29sbGFiJyxcbiAqICAgICBjb250ZW50OiAnTXkgQ29sbGFiIENvbnRlbnQnLFxuICogICAgIHByaXZhdGU6IGZhbHNlXG4gKiAgIH1cbiAqICAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci50YXNrKGNvbmZpZykucnVuKCkudGhlbihmdW5jdGlvbihjb2xsYWIpIHtcbiAqICAgXHQgJGxvZy5pbmZvKCdDcmVhdGVkIENvbGxhYicsIGNvbGxhYik7XG4gKiAgIH0pXG4gKiB9KVxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIFtcbiAgJ2JicENvbmZpZycsXG4gICdoYnBDb21tb24nLFxuICAnaGJwRG9jdW1lbnRDbGllbnQnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsXG4gICdoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZSdcbl0pXG4uZmFjdG9yeSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIGZ1bmN0aW9uIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IoXG4gICRxLCAkbG9nLCBoYnBFcnJvclNlcnZpY2Vcbikge1xuICB2YXIgaGFuZGxlcnMgPSB7fTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gdGFzayBuYW1lLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSAge3N0cmluZ30gICBuYW1lIGhhbmRsZSBhY3Rpb25zIHdpdGggdGhlIHNwZWNpZmllZCBuYW1lXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0IHRoZSBjdXJyZW50IGNvbnRleHQgaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlci5cbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVySGFuZGxlcihuYW1lLCBmbikge1xuICAgIGhhbmRsZXJzW25hbWVdID0gZm47XG4gIH1cblxuICAvKipcbiAgICogQG5hbWVzcGFjZSBUYXNrc1xuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBkZXNjXG4gICAqIEF2YWlsYWJsZSB0YXNrcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIEluc3RhbnRpYXRlIGEgbmV3IFRhc2sgaW50YW5jZSB0aGF0IHdpbGwgcnVuIHRoZSBjb2RlIGRlc2NyaWJlIGZvclxuICAgKiBhIGhhbmRsZXJzIHdpdGggdGhlIGdpdmUgYGBuYW1lYGAuXG4gICAqXG4gICAqIFRoZSBkZXNjcmlwdG9yIGlzIHBhc3NlZCB0byB0aGUgdGFzayBhbmQgcGFyYW1ldHJpemUgaXQuXG4gICAqIFRoZSB0YXNrIGNvbnRleHQgaXMgY29tcHV0ZWQgYXQgdGhlIHRpbWUgdGhlIHRhc2sgaXMgcmFuLiBBIGRlZmF1bHQgY29udGV4dFxuICAgKiBjYW4gYmUgZ2l2ZW4gYXQgbG9hZCB0aW1lIGFuZCBpdCB3aWxsIGJlIGZlZCB3aXRoIHRoZSByZXN1bHQgb2YgZWFjaCBwYXJlbnRcbiAgICogKGJ1dCBub3Qgc2libGluZykgdGFza3MgYXMgd2VsbC5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgbmFtZSBvZiB0aGUgdGFzayB0byBpbnN0YW50aWF0ZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3JdIGEgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCB3aWxsIGRldGVybWluZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGljaCB0YXNrIHRvIHJ1biBhbmQgaW4gd2hpY2ggb3JkZXJcbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yLmFmdGVyXSBhbiBhcnJheSBvZiB0YXNrIHRvIHJ1biBhZnRlciB0aGlzIG9uZVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIGEgZGVmYXVsdCBjb250ZXh0IHRvIHJ1biB0aGUgdGFzayB3aXRoXG4gICAqXG4gICAqIEByZXR1cm4ge1Rhc2t9IC0gdGhlIG5ldyB0YXNrIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiB0YXNrKG5hbWUsIGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIG5ldyBUYXNrKG5hbWUsIGRlc2NyaXB0b3IsIGNvbnRleHQpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAkbG9nLmVycm9yKCdFWENFUFRJT04nLCBleCk7XG4gICAgICB0aHJvdyBoYnBFcnJvclNlcnZpY2UuZXJyb3Ioe1xuICAgICAgICB0eXBlOiAnSW52YWxpZFRhc2snLFxuICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCB0YXNrICcgKyBuYW1lICsgJzogJyArIGV4LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgY2F1c2U6IGV4LFxuICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgZGVzY3JpcHRvcjogZGVzY3JpcHRvcixcbiAgICAgICAgICBjb250ZXh0OiBjb250ZXh0XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gYXJyYXkgb2YgdGFza3MgZ2l2ZW4gYW4gYXJyYXkgY29udGFpbmluZyBvYmplY3Qgd2hlcmVcbiAgICogdGhlIGtleSBpcyB0aGUgdGFzayBuYW1lIHRvIHJ1biBhbmQgdGhlIHZhbHVlIGlzIHRoZSBkZXNjcmlwdG9yXG4gICAqIHBhcmFtZXRlci5cbiAgICpcbiAgICogQHBhcmFtICB7b2JqZWN0fSBhZnRlciB0aGUgY29udGVudCBvZiBgYGRlc2NyaXB0b3IuYWZ0ZXJgYFxuICAgKiBAcmV0dXJuIHtBcnJheS9UYXNrfSBhcnJheSBvZiBzdWJ0YXNrc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlU3VidGFza3MoYWZ0ZXIpIHtcbiAgICB2YXIgc3VidGFza3MgPSBbXTtcbiAgICBpZiAoIWFmdGVyIHx8ICFhZnRlci5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBzdWJ0YXNrcztcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhZnRlci5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHRhc2tEZWYgPSBhZnRlcltpXTtcbiAgICAgIGZvciAodmFyIG5hbWUgaW4gdGFza0RlZikge1xuICAgICAgICBpZiAodGFza0RlZi5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgIHN1YnRhc2tzLnB1c2godGFzayhuYW1lLCB0YXNrRGVmW25hbWVdKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1YnRhc2tzO1xuICB9XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBUYXNrXG4gICAqIEBkZXNjXG4gICAqIEluc3RhbnRpYXRlIGEgdGFzayBnaXZlbiB0aGUgZ2l2ZW4gYGNvbmZpZ2AuXG4gICAqIFRoZSB0YXNrIGNhbiB0aGVuIGJlIHJ1biB1c2luZyB0aGUgYHJ1bigpYCBpbnN0YW5jZSBtZXRob2QuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBuYW1lIG9mIHRoZSB0YXNrIHRvIGluc3RhbnRpYXRlXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvcl0gYSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IHdpbGwgZGV0ZXJtaW5lXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIHRhc2sgdG8gcnVuIGFuZCBpbiB3aGljaCBvcmRlclxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3IuYWZ0ZXJdIGFuIGFycmF5IG9mIHRhc2sgdG8gcnVuIGFmdGVyIHRoaXMgb25lXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gYSBkZWZhdWx0IGNvbnRleHQgdG8gcnVuIHRoZSB0YXNrIHdpdGhcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAc2VlIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci50YXNrXG4gICAqXG4gICAqL1xuICBmdW5jdGlvbiBUYXNrKG5hbWUsIGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWhhbmRsZXJzW25hbWVdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Rhc2tOb3RGb3VuZCcpO1xuICAgIH1cbiAgICBkZXNjcmlwdG9yID0gZGVzY3JpcHRvciB8fCB7fTtcbiAgICBjb250ZXh0ID0gY29udGV4dCB8fCB7fTtcbiAgICB0aGlzLnN0YXRlID0gJ2lkbGUnO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5kZXNjcmlwdG9yID0gZGVzY3JpcHRvcjtcbiAgICB0aGlzLmRlZmF1bHRDb250ZXh0ID0gY29udGV4dDtcbiAgICB0aGlzLnN0YXRlID0gJ2lkbGUnO1xuICAgIHRoaXMucHJvbWlzZSA9IG51bGw7XG4gICAgdGhpcy5lcnJvciA9IG51bGw7XG4gICAgdGhpcy5zdWJ0YXNrcyA9IGNyZWF0ZVN1YnRhc2tzKGRlc2NyaXB0b3IuYWZ0ZXIpO1xuICB9XG5cbiAgVGFzay5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogTGF1bmNoIHRoZSB0YXNrLlxuICAgICAqXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbnRleHQgY3VycmVudCBjb250ZXh0IHdpbGwgYmUgbWVyZ2VkIGludG8gdGhlIGRlZmF1bHRcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBvbmUuXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0byByZXR1cm4gdGhlIHJlc3VsdCBvZiB0aGUgdGFza1xuICAgICAqL1xuICAgIHJ1bjogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgLy8gcnVuIGFuIGludGFuY2Ugb2YgdGFzayBvbmx5IG9uY2UuXG4gICAgICBpZiAoc2VsZi5zdGF0ZSAhPT0gJ2lkbGUnKSB7XG4gICAgICAgIHJldHVybiBzZWxmLnByb21pc2U7XG4gICAgICB9XG4gICAgICBjb250ZXh0ID0gYW5ndWxhci5leHRlbmQoe30sIHRoaXMuZGVmYXVsdENvbnRleHQsIGNvbnRleHQpO1xuICAgICAgdmFyIG9uU3VjY2VzcyA9IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgICB2YXIgc3ViQ29udGV4dCA9IGFuZ3VsYXIuY29weShjb250ZXh0KTtcbiAgICAgICAgc3ViQ29udGV4dFtzZWxmLm5hbWVdID0gcmVzdWx0O1xuICAgICAgICByZXR1cm4gc2VsZi5ydW5TdWJ0YXNrcyhzdWJDb250ZXh0KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBzZWxmLnN0YXRlID0gJ3N1Y2Nlc3MnO1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIHZhciBvbkVycm9yID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSAnZXJyb3InO1xuICAgICAgICAvLyBub29wIG9wZXJhdGlvbiBpZiBpcyBhbHJlYWR5IG9uZVxuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5lcnJvcihlcnIpKTtcbiAgICAgIH07XG4gICAgICBzZWxmLnN0YXRlID0gJ3Byb2dyZXNzJztcbiAgICAgIHNlbGYucHJvbWlzZSA9ICRxLndoZW4oaGFuZGxlcnNbc2VsZi5uYW1lXShzZWxmLmRlc2NyaXB0b3IsIGNvbnRleHQpKVxuICAgICAgICAudGhlbihvblN1Y2Nlc3MpXG4gICAgICAgIC5jYXRjaChvbkVycm9yKTtcbiAgICAgIHJldHVybiBzZWxmLnByb21pc2U7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJ1biBhbGwgc3VidGFza3Mgb2YgdGhlIHRoaXMgdGFza3MuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbnRleHQgdGhlIGN1cnJlbnQgY29udGV4dFxuICAgICAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICBhbGwgdGhlIHJlc3VsdHMgaW4gYW4gYXJyYXlcbiAgICAgKi9cbiAgICBydW5TdWJ0YXNrczogZnVuY3Rpb24oY29udGV4dCkge1xuICAgICAgdmFyIHByb21pc2VzID0gW107XG4gICAgICBhbmd1bGFyLmZvckVhY2godGhpcy5zdWJ0YXNrcywgZnVuY3Rpb24odGFzaykge1xuICAgICAgICBwcm9taXNlcy5wdXNoKHRhc2sucnVuKGNvbnRleHQpKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcyk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSBIYnBFcnJvciB3aGVuIGEgcGFyYW1ldGVyIGlzIG1pc3NpbmcuXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtICB7c3RyaW5nfSBrZXkgICAgbmFtZSBvZiB0aGUga2V5XG4gICAqIEBwYXJhbSAge29iamVjdH0gY29uZmlnIHRoZSBpbnZhbGlkIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAqIEByZXR1cm4ge0hicEVycm9yfSAgICAgIGEgSGJwRXJyb3IgaW5zdGFuY2VcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIG1pc3NpbmdEYXRhRXJyb3Ioa2V5LCBjb25maWcpIHtcbiAgICByZXR1cm4gaGJwRXJyb3JTZXJ2aWNlKHtcbiAgICAgIHR5cGU6ICdLZXlFcnJvcicsXG4gICAgICBtZXNzYWdlOiAnTWlzc2luZyBgJyArIGtleSArICdgIGtleSBpbiBjb25maWcnLFxuICAgICAgZGF0YToge1xuICAgICAgICBjb25maWc6IGNvbmZpZ1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuc3VyZSB0aGF0IGFsbCBwYXJhbWV0ZXJzIGxpc3RlZCBhZnRlciBjb25maWcgYXJlIHByZXNlbnRzLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSAge29iamVjdH0gY29uZmlnIHRhc2sgZGVzY3JpcHRvclxuICAgKiBAcmV0dXJuIHtvYmplY3R9IGNyZWF0ZWQgZW50aXRpZXNcbiAgICovXG4gIGZ1bmN0aW9uIGVuc3VyZVBhcmFtZXRlcnMoY29uZmlnKSB7XG4gICAgdmFyIHBhcmFtZXRlcnMgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlKDEpO1xuICAgIGZvciAodmFyIHAgaW4gcGFyYW1ldGVycykge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQocGFyYW1ldGVyc1twXSkpIHtcbiAgICAgICAgcmV0dXJuICRxLnJlamVjdChtaXNzaW5nRGF0YUVycm9yKHAsIGNvbmZpZykpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gJHEud2hlbihjb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgdGhhdCBvbmx5IGNvbnRhaW5zIGF0dHJpYnV0ZXNcbiAgICogZnJvbSB0aGUgYGF0dHJzYCBsaXN0LlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSAge29iamVjdH0gY29uZmlnIGtleS12YWx1ZSBzdG9yZVxuICAgKiBAcGFyYW0gIHtBcnJheX0gYXR0cnMgICBhIGxpc3Qgb2Yga2V5cyB0byBleHRyYWN0IGZyb20gYGNvbmZpZ2BcbiAgICogQHJldHVybiB7b2JqZWN0fSAgICAgICAga2V5LXZhbHVlIHN0b3JlIGNvbnRhaW5pbmcgb25seSBrZXlzIGZyb20gYXR0cnNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgaW4gYGNvbmZpZ2BcbiAgICovXG4gIGZ1bmN0aW9uIGV4dHJhY3RBdHRyaWJ1dGVzKGNvbmZpZywgYXR0cnMpIHtcbiAgICB2YXIgciA9IHt9O1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRycywgZnVuY3Rpb24oYSkge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGNvbmZpZ1thXSkpIHtcbiAgICAgICAgclthXSA9IGNvbmZpZ1thXTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgIHJlZ2lzdGVySGFuZGxlcjogcmVnaXN0ZXJIYW5kbGVyLFxuICAgIHRhc2s6IHRhc2ssXG4gICAgZXh0cmFjdEF0dHJpYnV0ZXM6IGV4dHJhY3RBdHRyaWJ1dGVzLFxuICAgIGVuc3VyZVBhcmFtZXRlcnM6IGVuc3VyZVBhcmFtZXRlcnNcbiAgfTtcbn0pO1xuIiwiLyogZXNsaW50IGNhbWVsY2FzZTogMCAqL1xuXG4vKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlXG4gKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2NcbiAqIGhicENvbGxhYm9yYXRvcnlBcHBTdG9yZSBjYW4gYmUgdXNlZCB0byBmaW5kIGFuZCB3b3JrIHdpdGggdGhlXG4gKiByZWdpc3RlcmVkIEhCUCBDb2xsYWJvcmF0b3J5IGFwcGxpY2F0aW9ucy5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsIFsnYmJwQ29uZmlnJywgJ2hicENvbW1vbiddKVxuLmNvbnN0YW50KCdmb2xkZXJBcHBJZCcsICdfX2NvbGxhYl9mb2xkZXJfXycpXG4uc2VydmljZSgnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJywgZnVuY3Rpb24oXG4gICRxLCAkaHR0cCwgJGNhY2hlRmFjdG9yeSxcbiAgaGJwRXJyb3JTZXJ2aWNlLCBiYnBDb25maWcsIGhicFV0aWxcbikge1xuICB2YXIgYXBwc0NhY2hlID0gJGNhY2hlRmFjdG9yeSgnX19hcHBzQ2FjaGVfXycpO1xuICB2YXIgdXJsQmFzZSA9IGJicENvbmZpZy5nZXQoJ2FwaS5jb2xsYWIudjAnKSArICcvZXh0ZW5zaW9uLyc7XG4gIHZhciBhcHBzID0gbnVsbDtcblxuICAvKipcbiAgICogQGNsYXNzIEFwcFxuICAgKiBAZGVzYyBjbGllbnQgcmVwcmVzZW50YXRpb24gb2YgYW4gYXBwbGljYXRpb25cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlXG4gICAqIEBwYXJhbSAge29iamVjdH0gW2F0dHJzXSBhIGxpc3Qgb2YgYXR0cmlidXRlcyB0byBzZXQgdG8gdGhlIEFwcCBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIEFwcCA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRycywgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gIH07XG4gIEFwcC5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogVHJhbnNmb3JtIGFuIEFwcCBpbnN0YW5jZSBpbnRvIGFuIG9iamVjdCByZXByZW5zZW50YXRpb24gY29tcGF0aWJsZSB3aXRoXG4gICAgICogdGhlIGJhY2tlbmQgc2NoZW1hLiBUaGlzIG9iamVjdCBjYW4gdGhlbiBiZSBlYXNpbHkgY29udmVydGVkIHRvIGEgSlNPTlxuICAgICAqIHN0cmluZy5cbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUuQXBwXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBzZXJ2ZXIgcmVwcmVzZW50YXRpb24gb2YgYW4gQXBwIGluc3RhbmNlXG4gICAgICovXG4gICAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5kZXNjcmlwdGlvbixcbiAgICAgICAgZWRpdF91cmw6IHRoaXMuZWRpdFVybCxcbiAgICAgICAgcnVuX3VybDogdGhpcy5ydW5VcmwsXG4gICAgICAgIHRpdGxlOiB0aGlzLnRpdGxlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGFwcCBpbnN0YW5jZSBmcm9tIGEgc2VydmVyIHJlcHJlc2VudGF0aW9uLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUuQXBwXG4gICAqIEBwYXJhbSAge29iamVjdH0ganNvbiBjb252ZXJ0ZWQgZnJvbSB0aGUgc2VydmVyIEpTT04gc3RyaW5nXG4gICAqIEByZXR1cm4ge0FwcH0gdGhlIG5ldyBBcHAgaW5zdGFuY2VcbiAgICovXG4gIEFwcC5mcm9tSnNvbiA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgIHJldHVybiBuZXcgQXBwKHtcbiAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgZGVsZXRlZDoganNvbi5kZWxldGVkLFxuICAgICAgZGVzY3JpcHRpb246IGpzb24uZGVzY3JpcHRpb24sXG4gICAgICBlZGl0VXJsOiBqc29uLmVkaXRfdXJsLFxuICAgICAgcnVuVXJsOiBqc29uLnJ1bl91cmwsXG4gICAgICB0aXRsZToganNvbi50aXRsZSxcbiAgICAgIGNyZWF0ZWRCeToganNvbi5jcmVhdGVkX2J5XG4gICAgfSk7XG4gIH07XG5cbiAgYXBwc0NhY2hlLnB1dCgnX19jb2xsYWJfZm9sZGVyX18nLCB7XG4gICAgaWQ6ICdfX2NvbGxhYl9mb2xkZXJfXycsXG4gICAgdGl0bGU6ICdGb2xkZXInXG4gIH0pO1xuXG4gIHZhciBsb2FkQWxsID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocnMpIHtcbiAgICAgIGlmIChycy5oYXNOZXh0KSB7XG4gICAgICAgIHJldHVybiBsb2FkQWxsKHJzLm5leHQoKSk7XG4gICAgICB9XG4gICAgICBhcHBzID0gcnMucmVzdWx0cztcbiAgICAgIHJldHVybiBhcHBzO1xuICAgIH0pO1xuICB9O1xuXG4gIC8qKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiB0aGUgbGlzdCBvZiBhbGwgYXBwbGljYXRpb25zXG4gICAqL1xuICB2YXIgbGlzdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghYXBwcykge1xuICAgICAgcmV0dXJuIGxvYWRBbGwoaGJwVXRpbC5wYWdpbmF0ZWRSZXN1bHRTZXQoJGh0dHAuZ2V0KHVybEJhc2UpLCB7XG4gICAgICAgIGZhY3Rvcnk6IEFwcC5mcm9tSnNvblxuICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gJHEud2hlbihhcHBzKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0cmlldmUgYW4gQXBwIGluc3RhbmNlIGZyb20gaXRzIGlkLlxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGlkIHRoZSBhcHAgaWRcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiBhbiBhcHAgaW5zdGFuY2VcbiAgICovXG4gIHZhciBnZXRCeUlkID0gZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoIWlkKSB7XG4gICAgICByZXR1cm4gJHEud2hlbihudWxsKTtcbiAgICB9XG4gICAgdmFyIGV4dCA9IGFwcHNDYWNoZS5nZXQoaWQpO1xuICAgIGlmIChleHQpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKGV4dCk7XG4gICAgfVxuICAgIHJldHVybiAkaHR0cC5nZXQodXJsQmFzZSArIGlkICsgJy8nKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgYXBwc0NhY2hlLnB1dChpZCwgQXBwLmZyb21Kc29uKHJlcy5kYXRhKSk7XG4gICAgICByZXR1cm4gYXBwc0NhY2hlLmdldChpZCk7XG4gICAgfSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5odHRwRXJyb3IocmVzKSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBcHBTdG9yZVxuICAgKiBAcGFyYW0gIHtvYmplY3R9IHBhcmFtcyBxdWVyeSBwYXJhbWV0ZXJzXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgYW4gQXBwIGluc3RhbmNlXG4gICAqL1xuICB2YXIgZmluZE9uZSA9IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgIHJldHVybiAkaHR0cC5nZXQodXJsQmFzZSwge3BhcmFtczogcGFyYW1zfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIHZhciByZXN1bHRzID0gcmVzLmRhdGEucmVzdWx0cztcbiAgICAgIC8vIFJlamVjdCBpZiBtb3JlIHRoYW4gb25lIHJlc3VsdHNcbiAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmV0dXJuICRxLnJlamVjdChoYnBFcnJvclNlcnZpY2UuZXJyb3Ioe1xuICAgICAgICAgIHR5cGU6ICdUb29NYW55UmVzdWx0cycsXG4gICAgICAgICAgbWVzc2FnZTogJ011bHRpcGxlIGFwcHMgaGFzIGJlZW4gcmV0cmlldmVkICcgK1xuICAgICAgICAgICAgICAgICAgICd3aGVuIG9ubHkgb25lIHdhcyBleHBlY3RlZC4nLFxuICAgICAgICAgIGRhdGE6IHJlcy5kYXRhXG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIC8vIE51bGwgd2hlbiBubyByZXN1bHRcbiAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIEJ1aWxkIHRoZSBhcHAgaWYgZXhhY3RseSBvbmUgcmVzdWx0XG4gICAgICB2YXIgYXBwID0gQXBwLmZyb21Kc29uKHJlc3VsdHNbMF0pO1xuICAgICAgYXBwc0NhY2hlLnB1dChhcHAuaWQsIGFwcCk7XG4gICAgICByZXR1cm4gYXBwO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBsaXN0OiBsaXN0LFxuICAgIGdldEJ5SWQ6IGdldEJ5SWQsXG4gICAgZmluZE9uZTogZmluZE9uZVxuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOlsyLCB7cHJvcGVydGllczogXCJuZXZlclwifV0gKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBAbmFtZXNwYWNlIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZSBwcm92aWRlcyB0b29scyB0byBjcmVhdGUgYW5kIG1hbmFnZVxuICogICAgICAgbmF2aWdhdGlvbiBpdGVtcy5cbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsIFsnaGJwQ29tbW9uJywgJ3V1aWQ0J10pXG4uc2VydmljZSgnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJywgZnVuY3Rpb24oJHEsICRodHRwLCAkbG9nLFxuICAgICRjYWNoZUZhY3RvcnksICR0aW1lb3V0LCBvcmRlckJ5RmlsdGVyLCB1dWlkNCxcbiAgICBoYnBVdGlsLCBiYnBDb25maWcpIHtcbiAgdmFyIGNvbGxhYkFwaVVybCA9IGJicENvbmZpZy5nZXQoJ2FwaS5jb2xsYWIudjAnKSArICcvY29sbGFiLyc7XG4gIC8vIGEgY2FjaGUgd2l0aCBpbmRpdmlkdWFsIG5hdiBpdGVtc1xuICB2YXIgY2FjaGVOYXZJdGVtcyA9ICRjYWNoZUZhY3RvcnkoJ25hdkl0ZW0nKTtcblxuICAvLyBhIGNhY2hlIHdpdGggdGhlIHByb21pc2VzIG9mIGVhY2ggY29sbGFiJ3MgbmF2IHRyZWUgcm9vdFxuICB2YXIgY2FjaGVOYXZSb290cyA9ICRjYWNoZUZhY3RvcnkoJ25hdlJvb3QnKTtcblxuICAvKipcbiAgICogQGNsYXNzIE5hdkl0ZW1cbiAgICogQGRlc2NcbiAgICogQ2xpZW50IHJlcHJlc2VudGF0aW9uIG9mIGEgbmF2aWdhdGlvbiBpdGVtLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7b2JqZWN0fSBhdHRyIGF0dHJpYnV0ZXMgb2YgdGhlIG5ldyBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIE5hdkl0ZW0gPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRyLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICBzZWxmW2tdID0gdjtcbiAgICB9KTtcbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCh0aGlzLmNvbnRleHQpKSB7XG4gICAgICB0aGlzLmNvbnRleHQgPSB1dWlkNC5nZW5lcmF0ZSgpO1xuICAgIH1cbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCh0aGlzLmNoaWxkcmVuKSkge1xuICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIH1cbiAgfTtcbiAgTmF2SXRlbS5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogQGRlc2NcbiAgICAgKiBSZXR1cm4gYSBzZXJ2ZXIgb2JqZWN0IHJlcHJlc2VudGF0aW9uIHRoYXQgY2FuIGJlIGVhc2lseSBzZXJpYWxpemVkXG4gICAgICogdG8gSlNPTiBhbmQgc2VuZCB0byB0aGUgYmFja2VuZC5cbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gc2VydmVyIG9iamVjdCByZXByZXNlbnRhdGlvblxuICAgICAqL1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGFwcF9pZDogdGhpcy5hcHBJZCxcbiAgICAgICAgY29sbGFiOiB0aGlzLmNvbGxhYklkLFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICAgICAgb3JkZXJfaW5kZXg6IHRoaXMub3JkZXIsXG4gICAgICAgIHR5cGU6IHRoaXMudHlwZSB8fCAodGhpcy5mb2xkZXIgPyAnRk8nIDogJ0lUJyksXG4gICAgICAgIHBhcmVudDogdGhpcy5wYXJlbnRJZFxuICAgICAgfTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtXG4gICAgICogQHBhcmFtICB7b2JqZWN0fSBhdHRycyBOYXZJdGVtIGluc3RhbmNlIGF0dHJpYnV0ZXNcbiAgICAgKiBAcmV0dXJuIHtOYXZJdGVtdH0gdGhpcyBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChbXG4gICAgICAgICdpZCcsICduYW1lJywgJ2NoaWxkcmVuJywgJ2NvbnRleHQnLFxuICAgICAgICAnY29sbGFiSWQnLCAnYXBwSWQnLCAnb3JkZXInLCAnZm9sZGVyJyxcbiAgICAgICAgJ3BhcmVudElkJywgJ3R5cGUnXG4gICAgICBdLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRyc1thXSkpIHtcbiAgICAgICAgICB0aGlzW2FdID0gYXR0cnNbYV07XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtXG4gICAgICogQHJldHVybiB7TmF2SXRlbX0gdGhpcyBpbnN0YW5jZVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZW5zdXJlQ2FjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGNhY2hlTmF2SXRlbXMucHV0KGtleSh0aGlzLmNvbGxhYklkLCB0aGlzLmlkKSwgdGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBNYW5hZ2UgYGFjY2AgYWNjdW11bGF0b3Igd2l0aCBhbGwgdGhlIGRhdGEgZnJvbSBqc29uQXJyYXkgYW5kIHJldHVybiBpdC5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgdGhlIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHthcnJheX0ganNvbkFycmF5IGRlc2NyaXB0aW9uIG9mIHRoZSBjaGlsZHJlblxuICAgKiBAcGFyYW0gIHtBcnJheX0gYWNjICAgICAgIHRoZSBhY2N1bXVsYXRvclxuICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgIHRoZSBjaGlsZHJlblxuICAgKi9cbiAgZnVuY3Rpb24gY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbkFycmF5LCBhY2MpIHtcbiAgICBhY2MgPSBhY2MgfHwgW107XG4gICAgLy8gYW4gdW5kZWZpbmVkIGFycmF5IG1lYW5zIHdlIGFib3J0IHRoZSBwcm9jZXNzXG4gICAgLy8gd2hlcmUgYW4gZW1wdHkgYXJyYXkgd2lsbCBlbnN1cmUgdGhlIHJlc3VsdGluZyBhcnJheVxuICAgIC8vIGlzIGVtcHR5IGFzIHdlbGwuXG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoanNvbkFycmF5KSkge1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9XG5cbiAgICBhY2MubGVuZ3RoID0gMDtcbiAgICBhbmd1bGFyLmZvckVhY2goanNvbkFycmF5LCBmdW5jdGlvbihqc29uKSB7XG4gICAgICBhY2MucHVzaChOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCBqc29uKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbiAgfVxuICAvKipcbiAgICogQnVpbGQgYW4gaW5zdGFuY2UgZnJvbSB0aGUgc2VydmVyIG9iamVjdCByZXByZXNlbnRhdGlvbi5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLk5hdkl0ZW1cbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7c3RyaW5nfSBqc29uIHNlcnZlciBvYmplY3QgcmVwcmVzZW50YXRpb25cbiAgICogQHJldHVybiB7TmF2SXRlbX0gbmV3IGluc3RhbmNlIG9mIE5hdkl0ZW1cbiAgICovXG4gIE5hdkl0ZW0uZnJvbUpzb24gPSBmdW5jdGlvbihjb2xsYWJJZCwganNvbikge1xuICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgdmFyIGF0dHJzID0ge1xuICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICBhcHBJZDoganNvbi5hcHBfaWQsXG4gICAgICBjb2xsYWJJZDogY29sbGFiSWQsXG4gICAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgICBjb250ZXh0OiBqc29uLmNvbnRleHQsXG4gICAgICBvcmRlcjoganNvbi5vcmRlcl9pbmRleCxcbiAgICAgIGZvbGRlcjoganNvbi50eXBlID09PSAnRk8nLFxuICAgICAgdHlwZToganNvbi50eXBlLFxuICAgICAgcGFyZW50SWQ6IGpzb24ucGFyZW50LFxuICAgICAgY2hpbGRyZW46IGNoaWxkcmVuRnJvbUpzb24oY29sbGFiSWQsIGpzb24uY2hpbGRyZW4pXG4gICAgfTtcbiAgICB2YXIgayA9IGtleShjb2xsYWJJZCwgYXR0cnMuaWQpO1xuICAgIHZhciBjYWNoZWQgPSBjYWNoZU5hdkl0ZW1zLmdldChrKTtcbiAgICBpZiAoY2FjaGVkKSB7XG4gICAgICByZXR1cm4gY2FjaGVkLnVwZGF0ZShhdHRycyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgTmF2SXRlbShhdHRycykuZW5zdXJlQ2FjaGVkKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHJpZXZlIHRoZSByb290IGl0ZW0gb2YgdGhlIGdpdmVuIGNvbGxhYi5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdGhlIHJvb3QgbmF2IGl0ZW1cbiAgICovXG4gIHZhciBnZXRSb290ID0gZnVuY3Rpb24oY29sbGFiSWQpIHtcbiAgICB2YXIgdHJlZVByb21pc2UgPSBjYWNoZU5hdlJvb3RzLmdldChjb2xsYWJJZCk7XG5cbiAgICBpZiAoIXRyZWVQcm9taXNlKSB7XG4gICAgICB0cmVlUHJvbWlzZSA9ICRodHRwLmdldChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2L2FsbC8nKS50aGVuKFxuICAgICAgICBmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgdmFyIHJvb3Q7XG4gICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgICAgdmFyIGRhdGEgPSBvcmRlckJ5RmlsdGVyKHJlc3AuZGF0YSwgJytvcmRlcl9pbmRleCcpO1xuXG4gICAgICAgICAgLy8gZmlsbCBpbiB0aGUgY2FjaGVcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgZGF0YVtpXSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5jb250ZXh0ID09PSAncm9vdCcpIHtcbiAgICAgICAgICAgICAgcm9vdCA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gbGluayBjaGlsZHJlbiBhbmQgcGFyZW50c1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgIT09IGRhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGl0ZW0gPSBjYWNoZU5hdkl0ZW1zLmdldChrZXkoY29sbGFiSWQsIGRhdGFbaV0uaWQpKTtcbiAgICAgICAgICAgIGlmIChpdGVtLnBhcmVudElkKSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSBjYWNoZU5hdkl0ZW1zLmdldChrZXkoY29sbGFiSWQsIGl0ZW0ucGFyZW50SWQpKTtcbiAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHJvb3Q7XG4gICAgICAgIH0sXG4gICAgICAgIGhicFV0aWwuZmVyclxuICAgICAgKTtcblxuICAgICAgY2FjaGVOYXZSb290cy5wdXQoY29sbGFiSWQsIHRyZWVQcm9taXNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJlZVByb21pc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IG5vZGVJZCAgIG5vZGUgSURcbiAgICogQHJldHVybiB7TmF2SXRlbX0gdGhlIG1hdGNoaW5nIG5hdiBpdGVtXG4gICAqL1xuICB2YXIgZ2V0Tm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBub2RlSWQpIHtcbiAgICByZXR1cm4gZ2V0Um9vdChjb2xsYWJJZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBub2RlSWQpO1xuICAgICAgdmFyIGl0ZW0gPSBjYWNoZU5hdkl0ZW1zLmdldChrKTtcblxuICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICRsb2cuZXJyb3IoJ3Vua25vd24gbmF2IGl0ZW0nLCBrKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IG5hdkl0ZW0gIHRoZSBOYXZJdGVtIGluc3RhbmNlIHRvIGFkZCB0byB0aGUgbmF2aWdhdGlvblxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIHRoZSBhZGRlZCBOYXZJdGVtIGluc3RhbmNlXG4gICAqL1xuICB2YXIgYWRkTm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgcmV0dXJuICRodHRwLnBvc3QoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi8nLCBuYXZJdGVtLnRvSnNvbigpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgIHJldHVybiBOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCByZXNwLmRhdGEpO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBuYXZJdGVtIHRoZSBOYXZJdGVtIGluc3RhbmNlIHRvIHJlbW92ZSBmcm9tIHRoZSBuYXZpZ2F0aW9uXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgYW4gdW5kZWZpbmVkIGl0ZW0gYXQgdGhlIGVuZFxuICAgKi9cbiAgdmFyIGRlbGV0ZU5vZGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbmF2SXRlbSkge1xuICAgIHJldHVybiAkaHR0cC5kZWxldGUoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi8nICsgbmF2SXRlbS5pZCArICcvJylcbiAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIGNhY2hlTmF2SXRlbXMucmVtb3ZlKGtleShjb2xsYWJJZCwgbmF2SXRlbS5pZCkpO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBuYXZJdGVtIHRoZSBpbnN0YW5jZSB0byB1cGRhdGVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGUgdXBkYXRlZCBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgbmF2SXRlbS5jb2xsYWJJZCA9IGNvbGxhYklkO1xuICAgIHJldHVybiAkaHR0cC5wdXQoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi8nICtcbiAgICAgIG5hdkl0ZW0uaWQgKyAnLycsIG5hdkl0ZW0udG9Kc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuICAgICAgcmV0dXJuIE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIHJlc3AuZGF0YSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICAvLyBvcmRlcmluZyBvcGVyYXRpb24gbmVlZHMgdG8gYmUgZ2xvYmFsbHkgcXVldWVkIHRvIGVuc3VyZSBjb25zaXN0ZW5jeS5cbiAgdmFyIGluc2VydFF1ZXVlID0gJHEud2hlbigpO1xuXG4gIC8qKlxuICAgKiBJbnNlcnQgbm9kZSBpbiB0aGUgdGhyZWUuXG4gICAqXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgICBpZCBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSAge05hdkl0ZW19IG5hdkl0ZW0gICAgTmF2IGl0ZW0gaW5zdGFuY2VcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gcGFyZW50SXRlbSBwYXJlbnQgaXRlbVxuICAgKiBAcGFyYW0gIHtpbnR9IGluc2VydEF0ICAgYWRkIHRvIHRoZSBtZW51XG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICBhIHByb21pc2UgdGhhdCB3aWxsXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhlIHVwZGF0ZSBuYXYgaXRlbVxuICAgKi9cbiAgZnVuY3Rpb24gaW5zZXJ0Tm9kZShjb2xsYWJJZCwgbmF2SXRlbSwgcGFyZW50SXRlbSwgaW5zZXJ0QXQpIHtcbiAgICByZXR1cm4gaW5zZXJ0UXVldWUudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIG5hdkl0ZW0ub3JkZXIgPSBpbnNlcnRBdCArIDE7IC8vIGZpcnN0IGl0ZW0gb3JkZXJfaW5kZXggbXVzdCBiZSAxXG4gICAgICBuYXZJdGVtLnBhcmVudElkID0gcGFyZW50SXRlbS5pZDtcbiAgICAgIHJldHVybiB1cGRhdGUoY29sbGFiSWQsIG5hdkl0ZW0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIHVuaXF1ZSBrZXkgZm9yIGNoYWNoaW5nIGEgbmF2IGl0ZW0uXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge2ludH0gbm9kZUlkICAgTmF2SXRlbSBJRFxuICAgKiBAcmV0dXJuIHtzdHJpbmd9ICAgICAgIHRoZSB1bmlxdWUga2V5XG4gICAqL1xuICBmdW5jdGlvbiBrZXkoY29sbGFiSWQsIG5vZGVJZCkge1xuICAgIHJldHVybiBjb2xsYWJJZCArICctLScgKyBub2RlSWQ7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIE5hdkl0ZW06IE5hdkl0ZW0sXG4gICAgZ2V0Um9vdDogZ2V0Um9vdCxcbiAgICBnZXROb2RlOiBnZXROb2RlLFxuICAgIGFkZE5vZGU6IGFkZE5vZGUsXG4gICAgc2F2ZU5vZGU6IHVwZGF0ZSxcbiAgICBkZWxldGVOb2RlOiBkZWxldGVOb2RlLFxuICAgIGluc2VydE5vZGU6IGluc2VydE5vZGVcbiAgfTtcbn0pO1xuIiwiLyogZXNsaW50IGNhbWVsY2FzZTogMCAqL1xuLyoqXG4gKiBAbmFtZXNwYWNlIGhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2NcbiAqIHN0b3JhZ2VVdGlsIHByb3ZpZGVzIHV0aWxpdHkgZnVuY3Rpb25zIHRvIGVhc2UgdGhlIGludGVyYWN0aW9uIG9mIGFwcHMgd2l0aCBzdG9yYWdlLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2UnLCBbJ2hicENvbW1vbiddKVxuLmZhY3RvcnkoJ2hicENvbGxhYm9yYXRvcnlTdG9yYWdlJyxcbiAgZnVuY3Rpb24gaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2UoaGJwVXRpbCwgaGJwRW50aXR5U3RvcmUsIGhicEVycm9yU2VydmljZSkge1xuICAgIC8qKlxuICAgICAqIFJldHJpZXZlIHRoZSBrZXkgdG8gbG9va3VwIGZvciBvbiBlbnRpdGllcyBnaXZlbiB0aGUgY3R4XG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAcGFyYW0gIHtzdHJpbmd9IGN0eCBhcHBsaWNhdGlvbiBjb250ZXh0IFVVSURcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBuYW1lIG9mIHRoZSBlbnRpdHkgYXR0cmlidXRlIHRoYXQgc2hvdWxkIGJlIHVzZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIGZ1bmN0aW9uIG1ldGFkYXRhS2V5KGN0eCkge1xuICAgICAgcmV0dXJuICdjdHhfJyArIGN0eDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBzZXRDb250ZXh0TWV0YWRhdGFcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBkZXNjXG4gICAgICogdGhlIGZ1bmN0aW9uIGxpbmtzIHRoZSBjb250ZXh0SWQgd2l0aCB0aGUgZG9jIGJyb3dzZXIgZW50aXR5IGluIGlucHV0XG4gICAgICogYnkgc2V0dGluZyBhIHNwZWNpZmljIG1ldGFkYXRhIG9uIHRoZSBlbnRpdHkuXG4gICAgICpcbiAgICAgKiBFbnRpdHkgb2JqZWN0IGluIGlucHV0IG11c3QgY29udGFpbiB0aGUgZm9sbG93aW5nIHByb3BlcnRpZXM6XG4gICAgICogLSBfZW50aXR5VHlwZVxuICAgICAqIC0gX3V1aWRcbiAgICAgKlxuICAgICAqIEluIGNhc2Ugb2YgZXJyb3IsIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggYSBgSGJwRXJyb3JgIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBlbnRpdHkgZG9jIGJyb3dzZXIgZW50aXR5XG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZXh0SWQgY29sbGFiIGFwcCBjb250ZXh0IGlkXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHNldENvbnRleHRNZXRhZGF0YShlbnRpdHksIGNvbnRleHRJZCkge1xuICAgICAgdmFyIG5ld01ldGFkYXRhID0ge307XG4gICAgICBuZXdNZXRhZGF0YVttZXRhZGF0YUtleShjb250ZXh0SWQpXSA9IDE7XG5cbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5hZGRNZXRhZGF0YShlbnRpdHksIG5ld01ldGFkYXRhKVxuICAgICAgLmNhdGNoKGhicEVycm9yU2VydmljZS5lcnJvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgZ2V0RW50aXR5QnlDb250ZXh0XG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAZGVzY1xuICAgICAqIHRoZSBmdW5jdGlvbiBnZXRzIHRoZSBlbnRpdHkgbGlua2VkIHRvIHRoZSBjb250ZXh0SWQgaW4gaW5wdXQuXG4gICAgICpcbiAgICAgKiBJbiBjYXNlIG9mIGVycm9yLCB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIGEgYEhicEVycm9yYCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gY29udGV4dElkIGNvbGxhYiBhcHAgY29udGV4dCBpZFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRFbnRpdHlCeUNvbnRleHQoY29udGV4dElkKSB7XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7fTtcbiAgICAgIHF1ZXJ5UGFyYW1zW21ldGFkYXRhS2V5KGNvbnRleHRJZCldID0gMTtcblxuICAgICAgcmV0dXJuIGhicEVudGl0eVN0b3JlLnF1ZXJ5KHF1ZXJ5UGFyYW1zKS50aGVuKG51bGwsIGhicFV0aWwuZmVycik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgZGVsZXRlQ29udGV4dE1ldGFkYXRhXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAZGVzY1xuICAgICAqIHRoZSBmdW5jdGlvbiB1bmxpbmsgdGhlIGNvbnRleHRJZCBmcm9tIHRoZSBlbnRpdHkgaW4gaW5wdXRcbiAgICAgKiBieSBkZWxldGluZyB0aGUgY29udGV4dCBtZXRhZGF0YS5cbiAgICAgKlxuICAgICAqIEVudGl0eSBvYmplY3QgaW4gaW5wdXQgbXVzdCBjb250YWluIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICAgKiAtIF9lbnRpdHlUeXBlXG4gICAgICogLSBfdXVpZFxuICAgICAqXG4gICAgICogSW4gY2FzZSBvZiBlcnJvciwgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCBhIGBIYnBFcnJvcmAgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGVudGl0eSBkb2MgYnJvd3NlciBlbnRpdHlcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRleHRJZCBjb2xsYWIgYXBwIGNvbnRleHQgaWRcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gZGVsZXRlQ29udGV4dE1ldGFkYXRhKGVudGl0eSwgY29udGV4dElkKSB7XG4gICAgICB2YXIga2V5ID0gbWV0YWRhdGFLZXkoY29udGV4dElkKTtcblxuICAgICAgcmV0dXJuIGhicEVudGl0eVN0b3JlLmRlbGV0ZU1ldGFkYXRhKGVudGl0eSwgW2tleV0pXG4gICAgICAudGhlbihudWxsLCBoYnBFcnJvclNlcnZpY2UuZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHVwZGF0ZUNvbnRleHRNZXRhZGF0YVxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQGRlc2NcbiAgICAgKiB0aGUgZnVuY3Rpb24gZGVsZXRlIHRoZSBjb250ZXh0SWQgZnJvbSB0aGUgYG9sZEVudGl0eWAgbWV0YWRhdGEgYW5kIGFkZFxuICAgICAqIGl0IGFzIGBuZXdFbnRpdHlgIG1ldGFkYXRhLlxuICAgICAqXG4gICAgICogRW50aXR5IG9iamVjdHMgaW4gaW5wdXQgbXVzdCBjb250YWluIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICAgKiAtIF9lbnRpdHlUeXBlXG4gICAgICogLSBfdXVpZFxuICAgICAqXG4gICAgICogSW4gY2FzZSBvZiBlcnJvciwgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCBhIGBIYnBFcnJvcmAgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IG5ld0VudGl0eSBkb2MgYnJvd3NlciBlbnRpdHkgdG8gbGluayB0byB0aGUgY29udGV4dFxuICAgICAqIEBwYXJhbSAge09iamVjdH0gb2xkRW50aXR5IGRvYyBicm93c2VyIGVudGl0eSB0byB1bmxpbmsgZnJvbSB0aGUgY29udGV4dFxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gY29udGV4dElkIGNvbGxhYiBhcHAgY29udGV4dCBpZFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiB1cGRhdGVDb250ZXh0TWV0YWRhdGEobmV3RW50aXR5LCBvbGRFbnRpdHksIGNvbnRleHRJZCkge1xuICAgICAgcmV0dXJuIGRlbGV0ZUNvbnRleHRNZXRhZGF0YShvbGRFbnRpdHksIGNvbnRleHRJZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHNldENvbnRleHRNZXRhZGF0YShuZXdFbnRpdHksIGNvbnRleHRJZCk7XG4gICAgICB9KS5jYXRjaChoYnBFcnJvclNlcnZpY2UuZXJyb3IpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIGdldFByb2plY3RCeUNvbGxhYlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQGRlc2NcbiAgICAgKiB0aGUgZnVuY3Rpb24gcmV0dXJucyB0aGUgc3RvcmFnZSBwcm9qZWN0IG9mIHRoZSBjb2xsYWJJZCBpbiBpbnB1dC5cbiAgICAgKlxuICAgICAqIEluIGNhc2Ugb2YgZXJyb3IsIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggYSBgSGJwRXJyb3JgIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBjb2xsYWJJZCBjb2xsYWIgaWRcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byB0aGUgcHJvamVjdCBkZXRhaWxzXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UHJvamVjdEJ5Q29sbGFiKGNvbGxhYklkKSB7XG4gICAgICB2YXIgcXVlcnlQYXJhbXMgPSB7XG4gICAgICAgIG1hbmFnZWRfYnlfY29sbGFiOiBjb2xsYWJJZFxuICAgICAgfTtcbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5xdWVyeShxdWVyeVBhcmFtcykudGhlbihudWxsLCBoYnBVdGlsLmZlcnIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzZXRDb250ZXh0TWV0YWRhdGE6IHNldENvbnRleHRNZXRhZGF0YSxcbiAgICAgIGdldEVudGl0eUJ5Q29udGV4dDogZ2V0RW50aXR5QnlDb250ZXh0LFxuICAgICAgZGVsZXRlQ29udGV4dE1ldGFkYXRhOiBkZWxldGVDb250ZXh0TWV0YWRhdGEsXG4gICAgICB1cGRhdGVDb250ZXh0TWV0YWRhdGE6IHVwZGF0ZUNvbnRleHRNZXRhZGF0YSxcbiAgICAgIGdldFByb2plY3RCeUNvbGxhYjogZ2V0UHJvamVjdEJ5Q29sbGFiXG4gICAgfTtcbiAgfSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlNlcnZpY2UoXG4gICRsb2csICRxLCBoYnBDb2xsYWJTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCdjb2xsYWInLCBjcmVhdGVDb2xsYWIpO1xuXG4gIC8qKlxuICAgKiBAZnVuY3Rpb24gY3JlYXRlQ29sbGFiXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuVGFza3NcbiAgICogQGRlc2NcbiAgICogIENyZWF0ZSBhIGNvbGxhYiBkZWZpbmVkIGJ5IHRoZSBnaXZlbiBvcHRpb25zLlxuICAgKiBAcGFyYW0ge29iamVjdH0gZGVzY3JpcHRvciAtIFBhcmFtZXRlcnMgdG8gY3JlYXRlIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0b3IubmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRvci5kZXNjcmlwdGlvbiAtIERlc2NyaXB0aW9uIGluIGxlc3MgdGhhbiAxNDAgY2hhcmFjdGVyc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdG9yLnByaXZhY3ldIC0gJ3ByaXZhdGUnIG9yICdwdWJsaWMnLiBOb3RlcyB0aGF0IG9ubHlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhCUCBNZW1iZXJzIGNhbiBjcmVhdGUgcHJpdmF0ZSBjb2xsYWJcbiAgICogQHBhcmFtIHtBcnJheX0gW2FmdGVyXSAtIGRlc2NyaXB0b3Igb2Ygc3VidGFza3NcbiAgICogQHJldHVybiB7UHJvbWlzZX0gLSBwcm9taXNlIG9mIGEgY29sbGFiXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVDb2xsYWIoZGVzY3JpcHRvcikge1xuICAgIHZhciBhdHRyID0gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5leHRyYWN0QXR0cmlidXRlcyhcbiAgICAgIGRlc2NyaXB0b3IsXG4gICAgICBbJ3RpdGxlJywgJ2NvbnRlbnQnLCAncHJpdmF0ZSddXG4gICAgKTtcbiAgICAkbG9nLmRlYnVnKCdDcmVhdGUgY29sbGFiJywgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIGhicENvbGxhYlN0b3JlLmNyZWF0ZShhdHRyKTtcbiAgfVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZU5hdkl0ZW0oXG4gICRsb2csXG4gIGhicENvbGxhYm9yYXRvcnlBcHBTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLFxuICBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZSxcbiAgaGJwRW50aXR5U3RvcmVcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignbmF2JywgY3JlYXRlTmF2SXRlbSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBuYXYgaXRlbS5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrc1xuICAgKiBAcGFyYW0ge29iamVjdH0gZGVzY3JpcHRvciBhIGRlc2NyaXB0b3IgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0b3IubmFtZSBuYW1lIG9mIHRoZSBuYXYgaXRlbVxuICAgKiBAcGFyYW0ge0NvbGxhYn0gZGVzY3JpcHRvci5jb2xsYWJJZCBjb2xsYWIgaW4gd2hpY2ggdG8gYWRkIHRoZSBpdGVtIGluLlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRvci5hcHAgYXBwIG5hbWUgbGlua2VkIHRvIHRoZSBuYXYgaXRlbVxuICAgKiBAcGFyYW0ge29iamVjdH0gW2NvbnRleHRdIHRoZSBjdXJyZW50IHJ1biBjb250ZXh0XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dC5jb2xsYWJdIGEgY29sbGFiIGluc3RhbmNlIGNyZWF0ZWQgcHJldmlvdXNseVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGEgTmF2SXRlbSBpbnN0YW5jZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShkZXNjcmlwdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGNvbGxhYklkID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5jb2xsYWIpIHx8XG4gICAgICAgIChjb250ZXh0ICYmIGNvbnRleHQuY29sbGFiLmlkKTtcbiAgICB9O1xuICAgIHZhciBmaW5kQXBwID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLmZpbmRPbmUoe3RpdGxlOiBkZXNjcmlwdG9yLmFwcH0pO1xuICAgIH07XG4gICAgdmFyIGNyZWF0ZU5hdiA9IGZ1bmN0aW9uKGFwcCkge1xuICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5nZXRSb290KGNvbGxhYklkKCkpXG4gICAgICAudGhlbihmdW5jdGlvbihwYXJlbnRJdGVtKSB7XG4gICAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuYWRkTm9kZShjb2xsYWJJZCgpLFxuICAgICAgICAgIG5ldyBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbSh7XG4gICAgICAgICAgICBjb2xsYWI6IGNvbGxhYklkKCksXG4gICAgICAgICAgICBuYW1lOiBkZXNjcmlwdG9yLm5hbWUsXG4gICAgICAgICAgICBhcHBJZDogYXBwLmlkLFxuICAgICAgICAgICAgcGFyZW50SWQ6IHBhcmVudEl0ZW0uaWRcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICB2YXIgbGlua1RvU3RvcmFnZSA9IGZ1bmN0aW9uKG5hdikge1xuICAgICAgaWYgKCFkZXNjcmlwdG9yLmVudGl0eSkge1xuICAgICAgICByZXR1cm4gbmF2O1xuICAgICAgfVxuICAgICAgdmFyIHNldExpbmsgPSBmdW5jdGlvbihlbnRpdHkpIHtcbiAgICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlTdG9yYWdlLnNldENvbnRleHRNZXRhZGF0YShlbnRpdHksIG5hdi5jb250ZXh0KVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gbmF2O1xuICAgICAgICB9KTtcbiAgICAgIH07XG4gICAgICAvLyBJdCBtaWdodCBiZSB0aGUgbmFtZSB1c2VkIGluIGEgcHJldmlvdXMgc3RvcmFnZSB0YXNrLlxuICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC5zdG9yYWdlICYmIGNvbnRleHQuc3RvcmFnZVtkZXNjcmlwdG9yLmVudGl0eV0pIHtcbiAgICAgICAgcmV0dXJuIHNldExpbmsoY29udGV4dC5zdG9yYWdlW2Rlc2NyaXB0b3IuZW50aXR5XSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaGJwRW50aXR5U3RvcmUuZ2V0KGRlc2NyaXB0b3IuZW50aXR5KS50aGVuKHNldExpbmspO1xuICAgIH07XG4gICAgJGxvZy5kZWJ1ZygnQ3JlYXRlIG5hdiBpdGVtJywgZGVzY3JpcHRvciwgY29udGV4dCk7XG4gICAgcmV0dXJuIGZpbmRBcHAoZGVzY3JpcHRvci5hcHApXG4gICAgLnRoZW4oY3JlYXRlTmF2KVxuICAgIC50aGVuKGxpbmtUb1N0b3JhZ2UpO1xuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicEVudGl0eVN0b3JlLFxuICBoYnBFcnJvclNlcnZpY2UsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IsXG4gIGhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ3N0b3JhZ2UnLCBzdG9yYWdlKTtcblxuICAvKipcbiAgICogQ29weSBmaWxlcyBhbmQgZm9sZGVycyB0byB0aGUgZGVzdGluYXRpb24gY29sbGFiIHN0b3JhZ2UuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuVGFza3NcbiAgICogQHBhcmFtIHtvYmplY3R9IGRlc2NyaXB0b3IgdGhlIHRhc2sgY29uZmlndXJhdGlvblxuICAgKiBAcGFyYW0ge29iamVjdH0gZGVzY3JpcHRvci5zdG9yYWdlIGEgb2JqZWN0IHdoZXJlIGtleXMgYXJlIHRoZSBmaWxlIHBhdGggaW4gdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgY29sbGFiIGFuZCB2YWx1ZSBhcmUgdGhlIFVVSUQgb2YgdGhlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkgdG8gY29weSBhdCB0aGlzIHBhdGguXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvci5jb2xsYWJdIGlkIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbnRleHQgdGhlIGN1cnJlbnQgdGFzayBjb250ZXh0XG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dC5jb2xsYWJdIHRoZSBjb2xsYWIgaW4gd2hpY2ggZW50aXRpZXMgd2lsbCBiZSBjb3BpZWRcbiAgICogQHJldHVybiB7b2JqZWN0fSBjcmVhdGVkIGVudGl0aWVzIHdoZXJlIGtleXMgYXJlIHRoZSBzYW1lIGFzIHByb3ZpZGVkIGluXG4gICAqICAgICAgICAgICAgICAgICAgY29uZmlnLnN0b3JhZ2VcbiAgICovXG4gIGZ1bmN0aW9uIHN0b3JhZ2UoZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLmVuc3VyZVBhcmFtZXRlcnMoXG4gICAgICBkZXNjcmlwdG9yLCAnc3RvcmFnZSdcbiAgICApLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgICAgLmdldFByb2plY3RCeUNvbGxhYihkZXNjcmlwdG9yLmNvbGxhYiB8fCBjb250ZXh0LmNvbGxhYi5pZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdEVudGl0eSkge1xuICAgICAgICAgIHZhciBwcm9taXNlcyA9IHt9O1xuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChkZXNjcmlwdG9yLnN0b3JhZ2UsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgcHJvbWlzZXNbbmFtZV0gPSAoXG4gICAgICAgICAgICAgICAgaGJwRW50aXR5U3RvcmUuY29weSh2YWx1ZSwgcHJvamVjdEVudGl0eS5fdXVpZCkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgJGxvZy53YXJuKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gZm9yIHN0b3JhZ2UgdGFzaycsIGRlc2NyaXB0b3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2NcbiAqIFByb3ZpZGVzIGFuZ3VsYXIgc2VydmljZXMgdG8gd29yayB3aXRoIEhCUCBDb2xsYWJvcmF0b3J5LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeScsIFtcbiAgJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZSdcbl0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
