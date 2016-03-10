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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJzZXJ2aWNlcy9zdG9yYWdlLmpzIiwiYXV0b21hdG9yL3Rhc2tzL2NyZWF0ZS1jb2xsYWIuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLW5hdi1pdGVtLmpzIiwiYXV0b21hdG9yL3Rhc2tzL3N0b3JhZ2UuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQTZCQSxRQUFRLE9BQU8sNkJBQTZCO0VBQzFDO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTs7Q0FFRCxRQUFRLCtEQUE2QixTQUFTO0VBQzdDLElBQUksTUFBTTtFQUNWO0VBQ0EsSUFBSSxXQUFXOzs7Ozs7Ozs7RUFTZixTQUFTLGdCQUFnQixNQUFNLElBQUk7SUFDakMsU0FBUyxRQUFROzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0VBNEJuQixTQUFTLEtBQUssTUFBTSxZQUFZLFNBQVM7SUFDdkMsSUFBSTtNQUNGLE9BQU8sSUFBSSxLQUFLLE1BQU0sWUFBWTtNQUNsQyxPQUFPLElBQUk7TUFDWCxLQUFLLE1BQU0sYUFBYTtNQUN4QixNQUFNLGdCQUFnQixNQUFNO1FBQzFCLE1BQU07UUFDTixTQUFTLGtCQUFrQixPQUFPLE9BQU87UUFDekMsTUFBTTtVQUNKLE9BQU87VUFDUCxNQUFNO1VBQ04sWUFBWTtVQUNaLFNBQVM7Ozs7Ozs7Ozs7Ozs7OztFQWVqQixTQUFTLGVBQWUsT0FBTztJQUM3QixJQUFJLFdBQVc7SUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sUUFBUTtNQUMzQixPQUFPOztJQUVULEtBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLFFBQVEsS0FBSztNQUNyQyxJQUFJLFVBQVUsTUFBTTtNQUNwQixLQUFLLElBQUksUUFBUSxTQUFTO1FBQ3hCLElBQUks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QUtBLFFBQVEsT0FBTyxvQkFBb0I7RUFDakM7RUFDQTtFQUNBOztBQUVGIiwiZmlsZSI6ImFuZ3VsYXItaGJwLWNvbGxhYm9yYXRvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGlzIGFuIEFuZ3VsYXJKUyBmYWN0b3J5IHRoYXRcbiAqIHByb3ZpZGUgdGFzayBhdXRvbWF0aW9uIHRvIGFjY29tcGxpc2ggYSBzZXF1ZW5jZSBvZlxuICogY29tbW9uIG9wZXJhdGlvbiBpbiBDb2xsYWJvcmF0b3J5LlxuICpcbiAqIEhvdyB0byBhZGQgbmV3IHRhc2tzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE5ldyB0YXNrcyBjYW4gYmUgYWRkZWQgYnkgY2FsbGluZyBgYGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyYGAuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9ICRxIGluamVjdGVkIGRlcGVuZGVuY3lcbiAqIEByZXR1cm4ge29iamVjdH0gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvciBhbmd1bGFyIHNlcnZpY2VcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNyZWF0ZSBhIENvbGxhYiB3aXRoIGEgZmV3IG5hdmlnYXRpb24gaXRlbXM8L2NhcHRpb24+XG4gKiAvLyBDcmVhdGUgYSBDb2xsYWIgd2l0aCBhIGZldyBuYXZpZ2F0aW9uIGl0ZW1zLlxuICogYW5ndWxhci5tb2R1bGUoJ015TW9kdWxlJywgWydoYnBDb2xsYWJvcmF0b3J5J10pXG4gKiAucnVuKGZ1bmN0aW9uKGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IsICRsb2cpIHtcbiAqICAgdmFyIGNvbmZpZyA9IHtcbiAqICAgICB0aXRsZTogJ015IEN1c3RvbSBDb2xsYWInLFxuICogICAgIGNvbnRlbnQ6ICdNeSBDb2xsYWIgQ29udGVudCcsXG4gKiAgICAgcHJpdmF0ZTogZmFsc2VcbiAqICAgfVxuICogICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2soY29uZmlnKS5ydW4oKS50aGVuKGZ1bmN0aW9uKGNvbGxhYikge1xuICogICBcdCAkbG9nLmluZm8oJ0NyZWF0ZWQgQ29sbGFiJywgY29sbGFiKTtcbiAqICAgfSlcbiAqIH0pXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgW1xuICAnYmJwQ29uZmlnJyxcbiAgJ2hicENvbW1vbicsXG4gICdoYnBEb2N1bWVudENsaWVudCcsXG4gICdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlTdG9yYWdlJ1xuXSlcbi5mYWN0b3J5KCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgZnVuY3Rpb24gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcihcbiAgJHEsICRsb2csIGhicEVycm9yU2VydmljZVxuKSB7XG4gIHZhciBoYW5kbGVycyA9IHt9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiB0YXNrIG5hbWUuXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtICB7c3RyaW5nfSAgIG5hbWUgaGFuZGxlIGFjdGlvbnMgd2l0aCB0aGUgc3BlY2lmaWVkIG5hbWVcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHQgdGhlIGN1cnJlbnQgY29udGV4dCBpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJIYW5kbGVyKG5hbWUsIGZuKSB7XG4gICAgaGFuZGxlcnNbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZXNwYWNlIFRhc2tzXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQGRlc2NcbiAgICogQXZhaWxhYmxlIHRhc2tzLlxuICAgKi9cblxuICAvKipcbiAgICogSW5zdGFudGlhdGUgYSBuZXcgVGFzayBpbnRhbmNlIHRoYXQgd2lsbCBydW4gdGhlIGNvZGUgZGVzY3JpYmUgZm9yXG4gICAqIGEgaGFuZGxlcnMgd2l0aCB0aGUgZ2l2ZSBgYG5hbWVgYC5cbiAgICpcbiAgICogVGhlIGRlc2NyaXB0b3IgaXMgcGFzc2VkIHRvIHRoZSB0YXNrIGFuZCBwYXJhbWV0cml6ZSBpdC5cbiAgICogVGhlIHRhc2sgY29udGV4dCBpcyBjb21wdXRlZCBhdCB0aGUgdGltZSB0aGUgdGFzayBpcyByYW4uIEEgZGVmYXVsdCBjb250ZXh0XG4gICAqIGNhbiBiZSBnaXZlbiBhdCBsb2FkIHRpbWUgYW5kIGl0IHdpbGwgYmUgZmVkIHdpdGggdGhlIHJlc3VsdCBvZiBlYWNoIHBhcmVudFxuICAgKiAoYnV0IG5vdCBzaWJsaW5nKSB0YXNrcyBhcyB3ZWxsLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBuYW1lIG9mIHRoZSB0YXNrIHRvIGluc3RhbnRpYXRlXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvcl0gYSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IHdpbGwgZGV0ZXJtaW5lXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIHRhc2sgdG8gcnVuIGFuZCBpbiB3aGljaCBvcmRlclxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3IuYWZ0ZXJdIGFuIGFycmF5IG9mIHRhc2sgdG8gcnVuIGFmdGVyIHRoaXMgb25lXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gYSBkZWZhdWx0IGNvbnRleHQgdG8gcnVuIHRoZSB0YXNrIHdpdGhcbiAgICpcbiAgICogQHJldHVybiB7VGFza30gLSB0aGUgbmV3IHRhc2sgaW5zdGFuY2VcbiAgICovXG4gIGZ1bmN0aW9uIHRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IFRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICRsb2cuZXJyb3IoJ0VYQ0VQVElPTicsIGV4KTtcbiAgICAgIHRocm93IGhicEVycm9yU2VydmljZS5lcnJvcih7XG4gICAgICAgIHR5cGU6ICdJbnZhbGlkVGFzaycsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHRhc2sgJyArIG5hbWUgKyAnOiAnICsgZXgsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBjYXVzZTogZXgsXG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICBkZXNjcmlwdG9yOiBkZXNjcmlwdG9yLFxuICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBhcnJheSBvZiB0YXNrcyBnaXZlbiBhbiBhcnJheSBjb250YWluaW5nIG9iamVjdCB3aGVyZVxuICAgKiB0aGUga2V5IGlzIHRoZSB0YXNrIG5hbWUgdG8gcnVuIGFuZCB0aGUgdmFsdWUgaXMgdGhlIGRlc2NyaXB0b3JcbiAgICogcGFyYW1ldGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGFmdGVyIHRoZSBjb250ZW50IG9mIGBgZGVzY3JpcHRvci5hZnRlcmBgXG4gICAqIEByZXR1cm4ge0FycmF5L1Rhc2t9IGFycmF5IG9mIHN1YnRhc2tzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdWJ0YXNrcyhhZnRlcikge1xuICAgIHZhciBzdWJ0YXNrcyA9IFtdO1xuICAgIGlmICghYWZ0ZXIgfHwgIWFmdGVyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHN1YnRhc2tzO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFmdGVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdGFza0RlZiA9IGFmdGVyW2ldO1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiB0YXNrRGVmKSB7XG4gICAgICAgIGlmICh0YXNrRGVmLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgc3VidGFza3MucHVzaCh0YXNrKG5hbWUsIHRhc2tEZWZbbmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VidGFza3M7XG4gIH1cblxuICAvKipcbiAgICogQGNsYXNzIFRhc2tcbiAgICogQGRlc2NcbiAgICogSW5zdGFudGlhdGUgYSB0YXNrIGdpdmVuIHRoZSBnaXZlbiBgY29uZmlnYC5cbiAgICogVGhlIHRhc2sgY2FuIHRoZW4gYmUgcnVuIHVzaW5nIHRoZSBgcnVuKClgIGluc3RhbmNlIG1ldGhvZC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIG5hbWUgb2YgdGhlIHRhc2sgdG8gaW5zdGFudGlhdGVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yXSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgd2lsbCBkZXRlcm1pbmVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggdGFzayB0byBydW4gYW5kIGluIHdoaWNoIG9yZGVyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvci5hZnRlcl0gYW4gYXJyYXkgb2YgdGFzayB0byBydW4gYWZ0ZXIgdGhpcyBvbmVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSBhIGRlZmF1bHQgY29udGV4dCB0byBydW4gdGhlIHRhc2sgd2l0aFxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBzZWUgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2tcbiAgICpcbiAgICovXG4gIGZ1bmN0aW9uIFRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIGlmICghaGFuZGxlcnNbbmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGFza05vdEZvdW5kJyk7XG4gICAgfVxuICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yIHx8IHt9O1xuICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IHt9O1xuICAgIHRoaXMuc3RhdGUgPSAnaWRsZSc7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yO1xuICAgIHRoaXMuZGVmYXVsdENvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuc3RhdGUgPSAnaWRsZSc7XG4gICAgdGhpcy5wcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB0aGlzLnN1YnRhc2tzID0gY3JlYXRlU3VidGFza3MoZGVzY3JpcHRvci5hZnRlcik7XG4gIH1cblxuICBUYXNrLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBMYXVuY2ggdGhlIHRhc2suXG4gICAgICpcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29udGV4dCBjdXJyZW50IGNvbnRleHQgd2lsbCBiZSBtZXJnZWQgaW50byB0aGUgZGVmYXVsdFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIG9uZS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRvIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSB0YXNrXG4gICAgICovXG4gICAgcnVuOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAvLyBydW4gYW4gaW50YW5jZSBvZiB0YXNrIG9ubHkgb25jZS5cbiAgICAgIGlmIChzZWxmLnN0YXRlICE9PSAnaWRsZScpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQgPSBhbmd1bGFyLmV4dGVuZCh7fSwgdGhpcy5kZWZhdWx0Q29udGV4dCwgY29udGV4dCk7XG4gICAgICB2YXIgb25TdWNjZXNzID0gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIHZhciBzdWJDb250ZXh0ID0gYW5ndWxhci5jb3B5KGNvbnRleHQpO1xuICAgICAgICBzdWJDb250ZXh0W3NlbGYubmFtZV0gPSByZXN1bHQ7XG4gICAgICAgIHJldHVybiBzZWxmLnJ1blN1YnRhc2tzKHN1YkNvbnRleHQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYuc3RhdGUgPSAnc3VjY2Vzcyc7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgc2VsZi5zdGF0ZSA9ICdlcnJvcic7XG4gICAgICAgIC8vIG5vb3Agb3BlcmF0aW9uIGlmIGlzIGFscmVhZHkgb25lXG4gICAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmVycm9yKGVycikpO1xuICAgICAgfTtcbiAgICAgIHNlbGYuc3RhdGUgPSAncHJvZ3Jlc3MnO1xuICAgICAgc2VsZi5wcm9taXNlID0gJHEud2hlbihoYW5kbGVyc1tzZWxmLm5hbWVdKHNlbGYuZGVzY3JpcHRvciwgY29udGV4dCkpXG4gICAgICAgIC50aGVuKG9uU3VjY2VzcylcbiAgICAgICAgLmNhdGNoKG9uRXJyb3IpO1xuICAgICAgcmV0dXJuIHNlbGYucHJvbWlzZTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUnVuIGFsbCBzdWJ0YXNrcyBvZiB0aGUgdGhpcyB0YXNrcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge29iamVjdH0gY29udGV4dCB0aGUgY3VycmVudCBjb250ZXh0XG4gICAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgIGFsbCB0aGUgcmVzdWx0cyBpbiBhbiBhcnJheVxuICAgICAqL1xuICAgIHJ1blN1YnRhc2tzOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaCh0aGlzLnN1YnRhc2tzLCBmdW5jdGlvbih0YXNrKSB7XG4gICAgICAgIHByb21pc2VzLnB1c2godGFzay5ydW4oY29udGV4dCkpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiBhIEhicEVycm9yIHdoZW4gYSBwYXJhbWV0ZXIgaXMgbWlzc2luZy5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGtleSAgICBuYW1lIG9mIHRoZSBrZXlcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcgdGhlIGludmFsaWQgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICogQHJldHVybiB7SGJwRXJyb3J9ICAgICAgYSBIYnBFcnJvciBpbnN0YW5jZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gbWlzc2luZ0RhdGFFcnJvcihrZXksIGNvbmZpZykge1xuICAgIHJldHVybiBoYnBFcnJvclNlcnZpY2Uoe1xuICAgICAgdHlwZTogJ0tleUVycm9yJyxcbiAgICAgIG1lc3NhZ2U6ICdNaXNzaW5nIGAnICsga2V5ICsgJ2Aga2V5IGluIGNvbmZpZycsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIGNvbmZpZzogY29uZmlnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlIHRoYXQgYWxsIHBhcmFtZXRlcnMgbGlzdGVkIGFmdGVyIGNvbmZpZyBhcmUgcHJlc2VudHMuXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcgdGFzayBkZXNjcmlwdG9yXG4gICAqIEByZXR1cm4ge29iamVjdH0gY3JlYXRlZCBlbnRpdGllc1xuICAgKi9cbiAgZnVuY3Rpb24gZW5zdXJlUGFyYW1ldGVycyhjb25maWcpIHtcbiAgICB2YXIgcGFyYW1ldGVycyA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2UoMSk7XG4gICAgZm9yICh2YXIgcCBpbiBwYXJhbWV0ZXJzKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChwYXJhbWV0ZXJzW3BdKSkge1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KG1pc3NpbmdEYXRhRXJyb3IocCwgY29uZmlnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkcS53aGVuKGNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFuIG9iamVjdCB0aGF0IG9ubHkgY29udGFpbnMgYXR0cmlidXRlc1xuICAgKiBmcm9tIHRoZSBgYXR0cnNgIGxpc3QuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcga2V5LXZhbHVlIHN0b3JlXG4gICAqIEBwYXJhbSAge0FycmF5fSBhdHRycyAgIGEgbGlzdCBvZiBrZXlzIHRvIGV4dHJhY3QgZnJvbSBgY29uZmlnYFxuICAgKiBAcmV0dXJuIHtvYmplY3R9ICAgICAgICBrZXktdmFsdWUgc3RvcmUgY29udGFpbmluZyBvbmx5IGtleXMgZnJvbSBhdHRyc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCBpbiBgY29uZmlnYFxuICAgKi9cbiAgZnVuY3Rpb24gZXh0cmFjdEF0dHJpYnV0ZXMoY29uZmlnLCBhdHRycykge1xuICAgIHZhciByID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGF0dHJzLCBmdW5jdGlvbihhKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoY29uZmlnW2FdKSkge1xuICAgICAgICByW2FdID0gY29uZmlnW2FdO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBoYW5kbGVyczogaGFuZGxlcnMsXG4gICAgcmVnaXN0ZXJIYW5kbGVyOiByZWdpc3RlckhhbmRsZXIsXG4gICAgdGFzazogdGFzayxcbiAgICBleHRyYWN0QXR0cmlidXRlczogZXh0cmFjdEF0dHJpYnV0ZXMsXG4gICAgZW5zdXJlUGFyYW1ldGVyczogZW5zdXJlUGFyYW1ldGVyc1xuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOiAwICovXG5cbi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmVcbiAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5XG4gKiBAZGVzY1xuICogaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlIGNhbiBiZSB1c2VkIHRvIGZpbmQgYW5kIHdvcmsgd2l0aCB0aGVcbiAqIHJlZ2lzdGVyZWQgSEJQIENvbGxhYm9yYXRvcnkgYXBwbGljYXRpb25zLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJywgWydiYnBDb25maWcnLCAnaGJwQ29tbW9uJ10pXG4uY29uc3RhbnQoJ2ZvbGRlckFwcElkJywgJ19fY29sbGFiX2ZvbGRlcl9fJylcbi5zZXJ2aWNlKCdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLCBmdW5jdGlvbihcbiAgJHEsICRodHRwLCAkY2FjaGVGYWN0b3J5LFxuICBoYnBFcnJvclNlcnZpY2UsIGJicENvbmZpZywgaGJwVXRpbFxuKSB7XG4gIHZhciBhcHBzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdfX2FwcHNDYWNoZV9fJyk7XG4gIHZhciB1cmxCYXNlID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9leHRlbnNpb24vJztcbiAgdmFyIGFwcHMgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBAY2xhc3MgQXBwXG4gICAqIEBkZXNjIGNsaWVudCByZXByZXNlbnRhdGlvbiBvZiBhbiBhcHBsaWNhdGlvblxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmVcbiAgICogQHBhcmFtICB7b2JqZWN0fSBbYXR0cnNdIGEgbGlzdCBvZiBhdHRyaWJ1dGVzIHRvIHNldCB0byB0aGUgQXBwIGluc3RhbmNlXG4gICAqL1xuICB2YXIgQXBwID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgYW5ndWxhci5mb3JFYWNoKGF0dHJzLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICBzZWxmW2tdID0gdjtcbiAgICB9KTtcbiAgfTtcbiAgQXBwLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBUcmFuc2Zvcm0gYW4gQXBwIGluc3RhbmNlIGludG8gYW4gb2JqZWN0IHJlcHJlbnNlbnRhdGlvbiBjb21wYXRpYmxlIHdpdGhcbiAgICAgKiB0aGUgYmFja2VuZCBzY2hlbWEuIFRoaXMgb2JqZWN0IGNhbiB0aGVuIGJlIGVhc2lseSBjb252ZXJ0ZWQgdG8gYSBKU09OXG4gICAgICogc3RyaW5nLlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBcHBTdG9yZS5BcHBcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IHNlcnZlciByZXByZXNlbnRhdGlvbiBvZiBhbiBBcHAgaW5zdGFuY2VcbiAgICAgKi9cbiAgICB0b0pzb246IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmRlc2NyaXB0aW9uLFxuICAgICAgICBlZGl0X3VybDogdGhpcy5lZGl0VXJsLFxuICAgICAgICBydW5fdXJsOiB0aGlzLnJ1blVybCxcbiAgICAgICAgdGl0bGU6IHRoaXMudGl0bGVcbiAgICAgIH07XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gYXBwIGluc3RhbmNlIGZyb20gYSBzZXJ2ZXIgcmVwcmVzZW50YXRpb24uXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBcHBTdG9yZS5BcHBcbiAgICogQHBhcmFtICB7b2JqZWN0fSBqc29uIGNvbnZlcnRlZCBmcm9tIHRoZSBzZXJ2ZXIgSlNPTiBzdHJpbmdcbiAgICogQHJldHVybiB7QXBwfSB0aGUgbmV3IEFwcCBpbnN0YW5jZVxuICAgKi9cbiAgQXBwLmZyb21Kc29uID0gZnVuY3Rpb24oanNvbikge1xuICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgcmV0dXJuIG5ldyBBcHAoe1xuICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICBkZWxldGVkOiBqc29uLmRlbGV0ZWQsXG4gICAgICBkZXNjcmlwdGlvbjoganNvbi5kZXNjcmlwdGlvbixcbiAgICAgIGVkaXRVcmw6IGpzb24uZWRpdF91cmwsXG4gICAgICBydW5Vcmw6IGpzb24ucnVuX3VybCxcbiAgICAgIHRpdGxlOiBqc29uLnRpdGxlLFxuICAgICAgY3JlYXRlZEJ5OiBqc29uLmNyZWF0ZWRfYnlcbiAgICB9KTtcbiAgfTtcblxuICBhcHBzQ2FjaGUucHV0KCdfX2NvbGxhYl9mb2xkZXJfXycsIHtcbiAgICBpZDogJ19fY29sbGFiX2ZvbGRlcl9fJyxcbiAgICB0aXRsZTogJ0ZvbGRlcidcbiAgfSk7XG5cbiAgdmFyIGxvYWRBbGwgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbihycykge1xuICAgICAgaWYgKHJzLmhhc05leHQpIHtcbiAgICAgICAgcmV0dXJuIGxvYWRBbGwocnMubmV4dCgpKTtcbiAgICAgIH1cbiAgICAgIGFwcHMgPSBycy5yZXN1bHRzO1xuICAgICAgcmV0dXJuIGFwcHM7XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBcHBTdG9yZVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIHRoZSBsaXN0IG9mIGFsbCBhcHBsaWNhdGlvbnNcbiAgICovXG4gIHZhciBsaXN0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFhcHBzKSB7XG4gICAgICByZXR1cm4gbG9hZEFsbChoYnBVdGlsLnBhZ2luYXRlZFJlc3VsdFNldCgkaHR0cC5nZXQodXJsQmFzZSksIHtcbiAgICAgICAgZmFjdG9yeTogQXBwLmZyb21Kc29uXG4gICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiAkcS53aGVuKGFwcHMpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSBhbiBBcHAgaW5zdGFuY2UgZnJvbSBpdHMgaWQuXG4gICAqIEBwYXJhbSAge251bWJlcn0gaWQgdGhlIGFwcCBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGFuIGFwcCBpbnN0YW5jZVxuICAgKi9cbiAgdmFyIGdldEJ5SWQgPSBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaWQpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKG51bGwpO1xuICAgIH1cbiAgICB2YXIgZXh0ID0gYXBwc0NhY2hlLmdldChpZCk7XG4gICAgaWYgKGV4dCkge1xuICAgICAgcmV0dXJuICRxLndoZW4oZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuICRodHRwLmdldCh1cmxCYXNlICsgaWQgKyAnLycpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBhcHBzQ2FjaGUucHV0KGlkLCBBcHAuZnJvbUpzb24ocmVzLmRhdGEpKTtcbiAgICAgIHJldHVybiBhcHBzQ2FjaGUuZ2V0KGlkKTtcbiAgICB9LCBmdW5jdGlvbihyZXMpIHtcbiAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmh0dHBFcnJvcihyZXMpKTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlXG4gICAqIEBwYXJhbSAge29iamVjdH0gcGFyYW1zIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiBhbiBBcHAgaW5zdGFuY2VcbiAgICovXG4gIHZhciBmaW5kT25lID0gZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgcmV0dXJuICRodHRwLmdldCh1cmxCYXNlLCB7cGFyYW1zOiBwYXJhbXN9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgdmFyIHJlc3VsdHMgPSByZXMuZGF0YS5yZXN1bHRzO1xuICAgICAgLy8gUmVqZWN0IGlmIG1vcmUgdGhhbiBvbmUgcmVzdWx0c1xuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5lcnJvcih7XG4gICAgICAgICAgdHlwZTogJ1Rvb01hbnlSZXN1bHRzJyxcbiAgICAgICAgICBtZXNzYWdlOiAnTXVsdGlwbGUgYXBwcyBoYXMgYmVlbiByZXRyaWV2ZWQgJyArXG4gICAgICAgICAgICAgICAgICAgJ3doZW4gb25seSBvbmUgd2FzIGV4cGVjdGVkLicsXG4gICAgICAgICAgZGF0YTogcmVzLmRhdGFcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgLy8gTnVsbCB3aGVuIG5vIHJlc3VsdFxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gQnVpbGQgdGhlIGFwcCBpZiBleGFjdGx5IG9uZSByZXN1bHRcbiAgICAgIHZhciBhcHAgPSBBcHAuZnJvbUpzb24ocmVzdWx0c1swXSk7XG4gICAgICBhcHBzQ2FjaGUucHV0KGFwcC5pZCwgYXBwKTtcbiAgICAgIHJldHVybiBhcHA7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGxpc3Q6IGxpc3QsXG4gICAgZ2V0QnlJZDogZ2V0QnlJZCxcbiAgICBmaW5kT25lOiBmaW5kT25lXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6WzIsIHtwcm9wZXJ0aWVzOiBcIm5ldmVyXCJ9XSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2MgaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlIHByb3ZpZGVzIHRvb2xzIHRvIGNyZWF0ZSBhbmQgbWFuYWdlXG4gKiAgICAgICBuYXZpZ2F0aW9uIGl0ZW1zLlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJywgWydoYnBDb21tb24nLCAndXVpZDQnXSlcbi5zZXJ2aWNlKCdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLCBmdW5jdGlvbigkcSwgJGh0dHAsICRsb2csXG4gICAgJGNhY2hlRmFjdG9yeSwgJHRpbWVvdXQsIG9yZGVyQnlGaWx0ZXIsIHV1aWQ0LFxuICAgIGhicFV0aWwsIGJicENvbmZpZykge1xuICB2YXIgY29sbGFiQXBpVXJsID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9jb2xsYWIvJztcbiAgLy8gYSBjYWNoZSB3aXRoIGluZGl2aWR1YWwgbmF2IGl0ZW1zXG4gIHZhciBjYWNoZU5hdkl0ZW1zID0gJGNhY2hlRmFjdG9yeSgnbmF2SXRlbScpO1xuXG4gIC8vIGEgY2FjaGUgd2l0aCB0aGUgcHJvbWlzZXMgb2YgZWFjaCBjb2xsYWIncyBuYXYgdHJlZSByb290XG4gIHZhciBjYWNoZU5hdlJvb3RzID0gJGNhY2hlRmFjdG9yeSgnbmF2Um9vdCcpO1xuXG4gIC8qKlxuICAgKiBAY2xhc3MgTmF2SXRlbVxuICAgKiBAZGVzY1xuICAgKiBDbGllbnQgcmVwcmVzZW50YXRpb24gb2YgYSBuYXZpZ2F0aW9uIGl0ZW0uXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZVxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGF0dHIgYXR0cmlidXRlcyBvZiB0aGUgbmV3IGluc3RhbmNlXG4gICAqL1xuICB2YXIgTmF2SXRlbSA9IGZ1bmN0aW9uKGF0dHIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgYW5ndWxhci5mb3JFYWNoKGF0dHIsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHNlbGZba10gPSB2O1xuICAgIH0pO1xuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHRoaXMuY29udGV4dCkpIHtcbiAgICAgIHRoaXMuY29udGV4dCA9IHV1aWQ0LmdlbmVyYXRlKCk7XG4gICAgfVxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKHRoaXMuY2hpbGRyZW4pKSB7XG4gICAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgfVxuICB9O1xuICBOYXZJdGVtLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBAZGVzY1xuICAgICAqIFJldHVybiBhIHNlcnZlciBvYmplY3QgcmVwcmVzZW50YXRpb24gdGhhdCBjYW4gYmUgZWFzaWx5IHNlcmlhbGl6ZWRcbiAgICAgKiB0byBKU09OIGFuZCBzZW5kIHRvIHRoZSBiYWNrZW5kLlxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBzZXJ2ZXIgb2JqZWN0IHJlcHJlc2VudGF0aW9uXG4gICAgICovXG4gICAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgYXBwX2lkOiB0aGlzLmFwcElkLFxuICAgICAgICBjb2xsYWI6IHRoaXMuY29sbGFiSWQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxuICAgICAgICBvcmRlcl9pbmRleDogdGhpcy5vcmRlcixcbiAgICAgICAgdHlwZTogdGhpcy50eXBlIHx8ICh0aGlzLmZvbGRlciA/ICdGTycgOiAnSVQnKSxcbiAgICAgICAgcGFyZW50OiB0aGlzLnBhcmVudElkXG4gICAgICB9O1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLk5hdkl0ZW1cbiAgICAgKiBAcGFyYW0gIHtvYmplY3R9IGF0dHJzIE5hdkl0ZW0gaW5zdGFuY2UgYXR0cmlidXRlc1xuICAgICAqIEByZXR1cm4ge05hdkl0ZW10fSB0aGlzIGluc3RhbmNlXG4gICAgICovXG4gICAgdXBkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFtcbiAgICAgICAgJ2lkJywgJ25hbWUnLCAnY2hpbGRyZW4nLCAnY29udGV4dCcsXG4gICAgICAgICdjb2xsYWJJZCcsICdhcHBJZCcsICdvcmRlcicsICdmb2xkZXInLFxuICAgICAgICAncGFyZW50SWQnLCAndHlwZSdcbiAgICAgIF0sIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGF0dHJzW2FdKSkge1xuICAgICAgICAgIHRoaXNbYV0gPSBhdHRyc1thXTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLk5hdkl0ZW1cbiAgICAgKiBAcmV0dXJuIHtOYXZJdGVtfSB0aGlzIGluc3RhbmNlXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBlbnN1cmVDYWNoZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgY2FjaGVOYXZJdGVtcy5wdXQoa2V5KHRoaXMuY29sbGFiSWQsIHRoaXMuaWQpLCB0aGlzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfTtcbiAgLyoqXG4gICAqIE1hbmFnZSBgYWNjYCBhY2N1bXVsYXRvciB3aXRoIGFsbCB0aGUgZGF0YSBmcm9tIGpzb25BcnJheSBhbmQgcmV0dXJuIGl0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtpbnR9IGNvbGxhYklkICB0aGUgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge2FycmF5fSBqc29uQXJyYXkgZGVzY3JpcHRpb24gb2YgdGhlIGNoaWxkcmVuXG4gICAqIEBwYXJhbSAge0FycmF5fSBhY2MgICAgICAgdGhlIGFjY3VtdWxhdG9yXG4gICAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICAgdGhlIGNoaWxkcmVuXG4gICAqL1xuICBmdW5jdGlvbiBjaGlsZHJlbkZyb21Kc29uKGNvbGxhYklkLCBqc29uQXJyYXksIGFjYykge1xuICAgIGFjYyA9IGFjYyB8fCBbXTtcbiAgICAvLyBhbiB1bmRlZmluZWQgYXJyYXkgbWVhbnMgd2UgYWJvcnQgdGhlIHByb2Nlc3NcbiAgICAvLyB3aGVyZSBhbiBlbXB0eSBhcnJheSB3aWxsIGVuc3VyZSB0aGUgcmVzdWx0aW5nIGFycmF5XG4gICAgLy8gaXMgZW1wdHkgYXMgd2VsbC5cbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChqc29uQXJyYXkpKSB7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH1cblxuICAgIGFjYy5sZW5ndGggPSAwO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChqc29uQXJyYXksIGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIGFjYy5wdXNoKE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIGpzb24pKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xuICB9XG4gIC8qKlxuICAgKiBCdWlsZCBhbiBpbnN0YW5jZSBmcm9tIHRoZSBzZXJ2ZXIgb2JqZWN0IHJlcHJlc2VudGF0aW9uLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbVxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGpzb24gc2VydmVyIG9iamVjdCByZXByZXNlbnRhdGlvblxuICAgKiBAcmV0dXJuIHtOYXZJdGVtfSBuZXcgaW5zdGFuY2Ugb2YgTmF2SXRlbVxuICAgKi9cbiAgTmF2SXRlbS5mcm9tSnNvbiA9IGZ1bmN0aW9uKGNvbGxhYklkLCBqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICB2YXIgYXR0cnMgPSB7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGFwcElkOiBqc29uLmFwcF9pZCxcbiAgICAgIGNvbGxhYklkOiBjb2xsYWJJZCxcbiAgICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICAgIGNvbnRleHQ6IGpzb24uY29udGV4dCxcbiAgICAgIG9yZGVyOiBqc29uLm9yZGVyX2luZGV4LFxuICAgICAgZm9sZGVyOiBqc29uLnR5cGUgPT09ICdGTycsXG4gICAgICB0eXBlOiBqc29uLnR5cGUsXG4gICAgICBwYXJlbnRJZDoganNvbi5wYXJlbnQsXG4gICAgICBjaGlsZHJlbjogY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbi5jaGlsZHJlbilcbiAgICB9O1xuICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBhdHRycy5pZCk7XG4gICAgdmFyIGNhY2hlZCA9IGNhY2hlTmF2SXRlbXMuZ2V0KGspO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIHJldHVybiBjYWNoZWQudXBkYXRlKGF0dHJzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBOYXZJdGVtKGF0dHJzKS5lbnN1cmVDYWNoZWQoKTtcbiAgfTtcblxuICAvKipcbiAgICogUmV0cmlldmUgdGhlIHJvb3QgaXRlbSBvZiB0aGUgZ2l2ZW4gY29sbGFiLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmVcbiAgICogQHBhcmFtICB7bnVtYmVyfSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGUgcm9vdCBuYXYgaXRlbVxuICAgKi9cbiAgdmFyIGdldFJvb3QgPSBmdW5jdGlvbihjb2xsYWJJZCkge1xuICAgIHZhciB0cmVlUHJvbWlzZSA9IGNhY2hlTmF2Um9vdHMuZ2V0KGNvbGxhYklkKTtcblxuICAgIGlmICghdHJlZVByb21pc2UpIHtcbiAgICAgIHRyZWVQcm9taXNlID0gJGh0dHAuZ2V0KGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvYWxsLycpLnRoZW4oXG4gICAgICAgIGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgICAgICB2YXIgcm9vdDtcbiAgICAgICAgICB2YXIgaTtcbiAgICAgICAgICB2YXIgaXRlbTtcbiAgICAgICAgICB2YXIgZGF0YSA9IG9yZGVyQnlGaWx0ZXIocmVzcC5kYXRhLCAnK29yZGVyX2luZGV4Jyk7XG5cbiAgICAgICAgICAvLyBmaWxsIGluIHRoZSBjYWNoZVxuICAgICAgICAgIGZvciAoaSA9IDA7IGkgIT09IGRhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGl0ZW0gPSBOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCBkYXRhW2ldKTtcbiAgICAgICAgICAgIGlmIChpdGVtLmNvbnRleHQgPT09ICdyb290Jykge1xuICAgICAgICAgICAgICByb290ID0gaXRlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBsaW5rIGNoaWxkcmVuIGFuZCBwYXJlbnRzXG4gICAgICAgICAgZm9yIChpID0gMDsgaSAhPT0gZGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaXRlbSA9IGNhY2hlTmF2SXRlbXMuZ2V0KGtleShjb2xsYWJJZCwgZGF0YVtpXS5pZCkpO1xuICAgICAgICAgICAgaWYgKGl0ZW0ucGFyZW50SWQpIHtcbiAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IGNhY2hlTmF2SXRlbXMuZ2V0KGtleShjb2xsYWJJZCwgaXRlbS5wYXJlbnRJZCkpO1xuICAgICAgICAgICAgICBwYXJlbnQuY2hpbGRyZW4ucHVzaChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcm9vdDtcbiAgICAgICAgfSxcbiAgICAgICAgaGJwVXRpbC5mZXJyXG4gICAgICApO1xuXG4gICAgICBjYWNoZU5hdlJvb3RzLnB1dChjb2xsYWJJZCwgdHJlZVByb21pc2UpO1xuICAgIH1cblxuICAgIHJldHVybiB0cmVlUHJvbWlzZTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge251bWJlcn0gbm9kZUlkICAgbm9kZSBJRFxuICAgKiBAcmV0dXJuIHtOYXZJdGVtfSB0aGUgbWF0Y2hpbmcgbmF2IGl0ZW1cbiAgICovXG4gIHZhciBnZXROb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5vZGVJZCkge1xuICAgIHJldHVybiBnZXRSb290KGNvbGxhYklkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGsgPSBrZXkoY29sbGFiSWQsIG5vZGVJZCk7XG4gICAgICB2YXIgaXRlbSA9IGNhY2hlTmF2SXRlbXMuZ2V0KGspO1xuXG4gICAgICBpZiAoIWl0ZW0pIHtcbiAgICAgICAgJGxvZy5lcnJvcigndW5rbm93biBuYXYgaXRlbScsIGspO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9KTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge251bWJlcn0gbmF2SXRlbSAgdGhlIE5hdkl0ZW0gaW5zdGFuY2UgdG8gYWRkIHRvIHRoZSBuYXZpZ2F0aW9uXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGFkZGVkIE5hdkl0ZW0gaW5zdGFuY2VcbiAgICovXG4gIHZhciBhZGROb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAucG9zdChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycsIG5hdkl0ZW0udG9Kc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuICAgICAgcmV0dXJuIE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIHJlc3AuZGF0YSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge05hdkl0ZW19IG5hdkl0ZW0gdGhlIE5hdkl0ZW0gaW5zdGFuY2UgdG8gcmVtb3ZlIGZyb20gdGhlIG5hdmlnYXRpb25cbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiBhbiB1bmRlZmluZWQgaXRlbSBhdCB0aGUgZW5kXG4gICAqL1xuICB2YXIgZGVsZXRlTm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgcmV0dXJuICRodHRwLmRlbGV0ZShjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgKyBuYXZJdGVtLmlkICsgJy8nKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgY2FjaGVOYXZJdGVtcy5yZW1vdmUoa2V5KGNvbGxhYklkLCBuYXZJdGVtLmlkKSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICAvKipcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlXG4gICAqIEBwYXJhbSAge251bWJlcn0gY29sbGFiSWQgY29sbGFiIElEXG4gICAqIEBwYXJhbSAge05hdkl0ZW19IG5hdkl0ZW0gdGhlIGluc3RhbmNlIHRvIHVwZGF0ZVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRoZSB1cGRhdGVkIGluc3RhbmNlXG4gICAqL1xuICB2YXIgdXBkYXRlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICBuYXZJdGVtLmNvbGxhYklkID0gY29sbGFiSWQ7XG4gICAgcmV0dXJuICRodHRwLnB1dChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgK1xuICAgICAgbmF2SXRlbS5pZCArICcvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8vIG9yZGVyaW5nIG9wZXJhdGlvbiBuZWVkcyB0byBiZSBnbG9iYWxseSBxdWV1ZWQgdG8gZW5zdXJlIGNvbnNpc3RlbmN5LlxuICB2YXIgaW5zZXJ0UXVldWUgPSAkcS53aGVuKCk7XG5cbiAgLyoqXG4gICAqIEluc2VydCBub2RlIGluIHRoZSB0aHJlZS5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgIGlkIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSAgICBOYXYgaXRlbSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBwYXJlbnRJdGVtIHBhcmVudCBpdGVtXG4gICAqIEBwYXJhbSAge2ludH0gaW5zZXJ0QXQgICBhZGQgdG8gdGhlIG1lbnVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIGEgcHJvbWlzZSB0aGF0IHdpbGxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGUgdXBkYXRlIG5hdiBpdGVtXG4gICAqL1xuICBmdW5jdGlvbiBpbnNlcnROb2RlKGNvbGxhYklkLCBuYXZJdGVtLCBwYXJlbnRJdGVtLCBpbnNlcnRBdCkge1xuICAgIHJldHVybiBpbnNlcnRRdWV1ZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbmF2SXRlbS5vcmRlciA9IGluc2VydEF0ICsgMTsgLy8gZmlyc3QgaXRlbSBvcmRlcl9pbmRleCBtdXN0IGJlIDFcbiAgICAgIG5hdkl0ZW0ucGFyZW50SWQgPSBwYXJlbnRJdGVtLmlkO1xuICAgICAgcmV0dXJuIHVwZGF0ZShjb2xsYWJJZCwgbmF2SXRlbSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGtleSBmb3IgY2hhY2hpbmcgYSBuYXYgaXRlbS5cbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7aW50fSBub2RlSWQgICBOYXZJdGVtIElEXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgdGhlIHVuaXF1ZSBrZXlcbiAgICovXG4gIGZ1bmN0aW9uIGtleShjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGNvbGxhYklkICsgJy0tJyArIG5vZGVJZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgTmF2SXRlbTogTmF2SXRlbSxcbiAgICBnZXRSb290OiBnZXRSb290LFxuICAgIGdldE5vZGU6IGdldE5vZGUsXG4gICAgYWRkTm9kZTogYWRkTm9kZSxcbiAgICBzYXZlTm9kZTogdXBkYXRlLFxuICAgIGRlbGV0ZU5vZGU6IGRlbGV0ZU5vZGUsXG4gICAgaW5zZXJ0Tm9kZTogaW5zZXJ0Tm9kZVxuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOiAwICovXG4vKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5XG4gKiBAZGVzY1xuICogc3RvcmFnZVV0aWwgcHJvdmlkZXMgdXRpbGl0eSBmdW5jdGlvbnMgdG8gZWFzZSB0aGUgaW50ZXJhY3Rpb24gb2YgYXBwcyB3aXRoIHN0b3JhZ2UuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZScsIFsnaGJwQ29tbW9uJ10pXG4uZmFjdG9yeSgnaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2UnLFxuICBmdW5jdGlvbiBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZShoYnBVdGlsLCBoYnBFbnRpdHlTdG9yZSwgaGJwRXJyb3JTZXJ2aWNlKSB7XG4gICAgLyoqXG4gICAgICogUmV0cmlldmUgdGhlIGtleSB0byBsb29rdXAgZm9yIG9uIGVudGl0aWVzIGdpdmVuIHRoZSBjdHhcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBwYXJhbSAge3N0cmluZ30gY3R4IGFwcGxpY2F0aW9uIGNvbnRleHQgVVVJRFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gICAgIG5hbWUgb2YgdGhlIGVudGl0eSBhdHRyaWJ1dGUgdGhhdCBzaG91bGQgYmUgdXNlZFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgZnVuY3Rpb24gbWV0YWRhdGFLZXkoY3R4KSB7XG4gICAgICByZXR1cm4gJ2N0eF8nICsgY3R4O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBuYW1lIHNldENvbnRleHRNZXRhZGF0YVxuICAgICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlTdG9yYWdlXG4gICAgICogQGRlc2NcbiAgICAgKiB0aGUgZnVuY3Rpb24gbGlua3MgdGhlIGNvbnRleHRJZCB3aXRoIHRoZSBkb2MgYnJvd3NlciBlbnRpdHkgaW4gaW5wdXRcbiAgICAgKiBieSBzZXR0aW5nIGEgc3BlY2lmaWMgbWV0YWRhdGEgb24gdGhlIGVudGl0eS5cbiAgICAgKlxuICAgICAqIEVudGl0eSBvYmplY3QgaW4gaW5wdXQgbXVzdCBjb250YWluIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAgICAgKiAtIF9lbnRpdHlUeXBlXG4gICAgICogLSBfdXVpZFxuICAgICAqXG4gICAgICogSW4gY2FzZSBvZiBlcnJvciwgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCBhIGBIYnBFcnJvcmAgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGVudGl0eSBkb2MgYnJvd3NlciBlbnRpdHlcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbnRleHRJZCBjb2xsYWIgYXBwIGNvbnRleHQgaWRcbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGVkXG4gICAgICovXG4gICAgZnVuY3Rpb24gc2V0Q29udGV4dE1ldGFkYXRhKGVudGl0eSwgY29udGV4dElkKSB7XG4gICAgICB2YXIgbmV3TWV0YWRhdGEgPSB7fTtcbiAgICAgIG5ld01ldGFkYXRhW21ldGFkYXRhS2V5KGNvbnRleHRJZCldID0gMTtcblxuICAgICAgcmV0dXJuIGhicEVudGl0eVN0b3JlLmFkZE1ldGFkYXRhKGVudGl0eSwgbmV3TWV0YWRhdGEpXG4gICAgICAuY2F0Y2goaGJwRXJyb3JTZXJ2aWNlLmVycm9yKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBnZXRFbnRpdHlCeUNvbnRleHRcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBkZXNjXG4gICAgICogdGhlIGZ1bmN0aW9uIGdldHMgdGhlIGVudGl0eSBsaW5rZWQgdG8gdGhlIGNvbnRleHRJZCBpbiBpbnB1dC5cbiAgICAgKlxuICAgICAqIEluIGNhc2Ugb2YgZXJyb3IsIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIHdpdGggYSBgSGJwRXJyb3JgIGluc3RhbmNlLlxuICAgICAqXG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZXh0SWQgY29sbGFiIGFwcCBjb250ZXh0IGlkXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldEVudGl0eUJ5Q29udGV4dChjb250ZXh0SWQpIHtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHt9O1xuICAgICAgcXVlcnlQYXJhbXNbbWV0YWRhdGFLZXkoY29udGV4dElkKV0gPSAxO1xuXG4gICAgICByZXR1cm4gaGJwRW50aXR5U3RvcmUucXVlcnkocXVlcnlQYXJhbXMpLnRoZW4obnVsbCwgaGJwVXRpbC5mZXJyKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBkZWxldGVDb250ZXh0TWV0YWRhdGFcbiAgICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAqIEBkZXNjXG4gICAgICogdGhlIGZ1bmN0aW9uIHVubGluayB0aGUgY29udGV4dElkIGZyb20gdGhlIGVudGl0eSBpbiBpbnB1dFxuICAgICAqIGJ5IGRlbGV0aW5nIHRoZSBjb250ZXh0IG1ldGFkYXRhLlxuICAgICAqXG4gICAgICogRW50aXR5IG9iamVjdCBpbiBpbnB1dCBtdXN0IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgICAqIC0gX2VudGl0eVR5cGVcbiAgICAgKiAtIF91dWlkXG4gICAgICpcbiAgICAgKiBJbiBjYXNlIG9mIGVycm9yLCB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIGEgYEhicEVycm9yYCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gZW50aXR5IGRvYyBicm93c2VyIGVudGl0eVxuICAgICAqIEBwYXJhbSAge1N0cmluZ30gY29udGV4dElkIGNvbGxhYiBhcHAgY29udGV4dCBpZFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIG9wZXJhdGlvbiBpcyBjb21wbGV0ZWRcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBkZWxldGVDb250ZXh0TWV0YWRhdGEoZW50aXR5LCBjb250ZXh0SWQpIHtcbiAgICAgIHZhciBrZXkgPSBtZXRhZGF0YUtleShjb250ZXh0SWQpO1xuXG4gICAgICByZXR1cm4gaGJwRW50aXR5U3RvcmUuZGVsZXRlTWV0YWRhdGEoZW50aXR5LCBba2V5XSlcbiAgICAgIC50aGVuKG51bGwsIGhicEVycm9yU2VydmljZS5lcnJvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgdXBkYXRlQ29udGV4dE1ldGFkYXRhXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAZGVzY1xuICAgICAqIHRoZSBmdW5jdGlvbiBkZWxldGUgdGhlIGNvbnRleHRJZCBmcm9tIHRoZSBgb2xkRW50aXR5YCBtZXRhZGF0YSBhbmQgYWRkXG4gICAgICogaXQgYXMgYG5ld0VudGl0eWAgbWV0YWRhdGEuXG4gICAgICpcbiAgICAgKiBFbnRpdHkgb2JqZWN0cyBpbiBpbnB1dCBtdXN0IGNvbnRhaW4gdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICAgICAqIC0gX2VudGl0eVR5cGVcbiAgICAgKiAtIF91dWlkXG4gICAgICpcbiAgICAgKiBJbiBjYXNlIG9mIGVycm9yLCB0aGUgcHJvbWlzZSBpcyByZWplY3RlZCB3aXRoIGEgYEhicEVycm9yYCBpbnN0YW5jZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge09iamVjdH0gbmV3RW50aXR5IGRvYyBicm93c2VyIGVudGl0eSB0byBsaW5rIHRvIHRoZSBjb250ZXh0XG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBvbGRFbnRpdHkgZG9jIGJyb3dzZXIgZW50aXR5IHRvIHVubGluayBmcm9tIHRoZSBjb250ZXh0XG4gICAgICogQHBhcmFtICB7U3RyaW5nfSBjb250ZXh0SWQgY29sbGFiIGFwcCBjb250ZXh0IGlkXG4gICAgICogQHJldHVybiB7UHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiB0aGUgb3BlcmF0aW9uIGlzIGNvbXBsZXRlZFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIHVwZGF0ZUNvbnRleHRNZXRhZGF0YShuZXdFbnRpdHksIG9sZEVudGl0eSwgY29udGV4dElkKSB7XG4gICAgICByZXR1cm4gZGVsZXRlQ29udGV4dE1ldGFkYXRhKG9sZEVudGl0eSwgY29udGV4dElkKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gc2V0Q29udGV4dE1ldGFkYXRhKG5ld0VudGl0eSwgY29udGV4dElkKTtcbiAgICAgIH0pLmNhdGNoKGhicEVycm9yU2VydmljZS5lcnJvcik7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQG5hbWUgZ2V0UHJvamVjdEJ5Q29sbGFiXG4gICAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2VcbiAgICAgKiBAZGVzY1xuICAgICAqIHRoZSBmdW5jdGlvbiByZXR1cm5zIHRoZSBzdG9yYWdlIHByb2plY3Qgb2YgdGhlIGNvbGxhYklkIGluIGlucHV0LlxuICAgICAqXG4gICAgICogSW4gY2FzZSBvZiBlcnJvciwgdGhlIHByb21pc2UgaXMgcmVqZWN0ZWQgd2l0aCBhIGBIYnBFcnJvcmAgaW5zdGFuY2UuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtTdHJpbmd9IGNvbGxhYklkIGNvbGxhYiBpZFxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIHRoZSBwcm9qZWN0IGRldGFpbHNcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcm9qZWN0QnlDb2xsYWIoY29sbGFiSWQpIHtcbiAgICAgIHZhciBxdWVyeVBhcmFtcyA9IHtcbiAgICAgICAgbWFuYWdlZF9ieV9jb2xsYWI6IGNvbGxhYklkXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGhicEVudGl0eVN0b3JlLnF1ZXJ5KHF1ZXJ5UGFyYW1zKS50aGVuKG51bGwsIGhicFV0aWwuZmVycik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNldENvbnRleHRNZXRhZGF0YTogc2V0Q29udGV4dE1ldGFkYXRhLFxuICAgICAgZ2V0RW50aXR5QnlDb250ZXh0OiBnZXRFbnRpdHlCeUNvbnRleHQsXG4gICAgICBkZWxldGVDb250ZXh0TWV0YWRhdGE6IGRlbGV0ZUNvbnRleHRNZXRhZGF0YSxcbiAgICAgIHVwZGF0ZUNvbnRleHRNZXRhZGF0YTogdXBkYXRlQ29udGV4dE1ldGFkYXRhLFxuICAgICAgZ2V0UHJvamVjdEJ5Q29sbGFiOiBnZXRQcm9qZWN0QnlDb2xsYWJcbiAgICB9O1xuICB9KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicENvbGxhYlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2NvbGxhYicsIGNyZWF0ZUNvbGxhYik7XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiBjcmVhdGVDb2xsYWJcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrc1xuICAgKiBAZGVzY1xuICAgKiAgQ3JlYXRlIGEgY29sbGFiIGRlZmluZWQgYnkgdGhlIGdpdmVuIG9wdGlvbnMuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZXNjcmlwdG9yIC0gUGFyYW1ldGVycyB0byBjcmVhdGUgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRvci5uYW1lIC0gTmFtZSBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLmRlc2NyaXB0aW9uIC0gRGVzY3JpcHRpb24gaW4gbGVzcyB0aGFuIDE0MCBjaGFyYWN0ZXJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0b3IucHJpdmFjeV0gLSAncHJpdmF0ZScgb3IgJ3B1YmxpYycuIE5vdGVzIHRoYXQgb25seVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgSEJQIE1lbWJlcnMgY2FuIGNyZWF0ZSBwcml2YXRlIGNvbGxhYlxuICAgKiBAcGFyYW0ge0FycmF5fSBbYWZ0ZXJdIC0gZGVzY3JpcHRvciBvZiBzdWJ0YXNrc1xuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAtIHByb21pc2Ugb2YgYSBjb2xsYWJcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYihkZXNjcmlwdG9yKSB7XG4gICAgdmFyIGF0dHIgPSBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLmV4dHJhY3RBdHRyaWJ1dGVzKFxuICAgICAgZGVzY3JpcHRvcixcbiAgICAgIFsndGl0bGUnLCAnY29udGVudCcsICdwcml2YXRlJ11cbiAgICApO1xuICAgICRsb2cuZGVidWcoJ0NyZWF0ZSBjb2xsYWInLCBkZXNjcmlwdG9yKTtcbiAgICByZXR1cm4gaGJwQ29sbGFiU3RvcmUuY3JlYXRlKGF0dHIpO1xuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShcbiAgJGxvZyxcbiAgaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IsXG4gIGhicENvbGxhYm9yYXRvcnlTdG9yYWdlLFxuICBoYnBFbnRpdHlTdG9yZVxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCduYXYnLCBjcmVhdGVOYXZJdGVtKTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG5hdiBpdGVtLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZXNjcmlwdG9yIGEgZGVzY3JpcHRvciBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRvci5uYW1lIG5hbWUgb2YgdGhlIG5hdiBpdGVtXG4gICAqIEBwYXJhbSB7Q29sbGFifSBkZXNjcmlwdG9yLmNvbGxhYklkIGNvbGxhYiBpbiB3aGljaCB0byBhZGQgdGhlIGl0ZW0gaW4uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLmFwcCBhcHAgbmFtZSBsaW5rZWQgdG8gdGhlIG5hdiBpdGVtXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gdGhlIGN1cnJlbnQgcnVuIGNvbnRleHRcbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0LmNvbGxhYl0gYSBjb2xsYWIgaW5zdGFuY2UgY3JlYXRlZCBwcmV2aW91c2x5XG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgYSBOYXZJdGVtIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVOYXZJdGVtKGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgY29sbGFiSWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLmNvbGxhYikgfHxcbiAgICAgICAgKGNvbnRleHQgJiYgY29udGV4dC5jb2xsYWIuaWQpO1xuICAgIH07XG4gICAgdmFyIGZpbmRBcHAgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUuZmluZE9uZSh7dGl0bGU6IGRlc2NyaXB0b3IuYXBwfSk7XG4gICAgfTtcbiAgICB2YXIgY3JlYXRlTmF2ID0gZnVuY3Rpb24oYXBwKSB7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLmdldFJvb3QoY29sbGFiSWQoKSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHBhcmVudEl0ZW0pIHtcbiAgICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5hZGROb2RlKGNvbGxhYklkKCksXG4gICAgICAgICAgbmV3IGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtKHtcbiAgICAgICAgICAgIGNvbGxhYjogY29sbGFiSWQoKSxcbiAgICAgICAgICAgIG5hbWU6IGRlc2NyaXB0b3IubmFtZSxcbiAgICAgICAgICAgIGFwcElkOiBhcHAuaWQsXG4gICAgICAgICAgICBwYXJlbnRJZDogcGFyZW50SXRlbS5pZFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIHZhciBsaW5rVG9TdG9yYWdlID0gZnVuY3Rpb24obmF2KSB7XG4gICAgICBpZiAoIWRlc2NyaXB0b3IuZW50aXR5KSB7XG4gICAgICAgIHJldHVybiBuYXY7XG4gICAgICB9XG4gICAgICB2YXIgc2V0TGluayA9IGZ1bmN0aW9uKGVudGl0eSkge1xuICAgICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2Uuc2V0Q29udGV4dE1ldGFkYXRhKGVudGl0eSwgbmF2LmNvbnRleHQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBuYXY7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIC8vIEl0IG1pZ2h0IGJlIHRoZSBuYW1lIHVzZWQgaW4gYSBwcmV2aW91cyBzdG9yYWdlIHRhc2suXG4gICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0LnN0b3JhZ2UgJiYgY29udGV4dC5zdG9yYWdlW2Rlc2NyaXB0b3IuZW50aXR5XSkge1xuICAgICAgICByZXR1cm4gc2V0TGluayhjb250ZXh0LnN0b3JhZ2VbZGVzY3JpcHRvci5lbnRpdHldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5nZXQoZGVzY3JpcHRvci5lbnRpdHkpLnRoZW4oc2V0TGluayk7XG4gICAgfTtcbiAgICAkbG9nLmRlYnVnKCdDcmVhdGUgbmF2IGl0ZW0nLCBkZXNjcmlwdG9yLCBjb250ZXh0KTtcbiAgICByZXR1cm4gZmluZEFwcChkZXNjcmlwdG9yLmFwcClcbiAgICAudGhlbihjcmVhdGVOYXYpXG4gICAgLnRoZW4obGlua1RvU3RvcmFnZSk7XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVDb2xsYWJTZXJ2aWNlKFxuICAkbG9nLCAkcSwgaGJwRW50aXR5U3RvcmUsXG4gIGhicEVycm9yU2VydmljZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcixcbiAgaGJwQ29sbGFib3JhdG9yeVN0b3JhZ2Vcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignc3RvcmFnZScsIHN0b3JhZ2UpO1xuXG4gIC8qKlxuICAgKiBDb3B5IGZpbGVzIGFuZCBmb2xkZXJzIHRvIHRoZSBkZXN0aW5hdGlvbiBjb2xsYWIgc3RvcmFnZS5cbiAgICpcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrc1xuICAgKiBAcGFyYW0ge29iamVjdH0gZGVzY3JpcHRvciB0aGUgdGFzayBjb25maWd1cmF0aW9uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZXNjcmlwdG9yLnN0b3JhZ2UgYSBvYmplY3Qgd2hlcmUga2V5cyBhcmUgdGhlIGZpbGUgcGF0aCBpbiB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBjb2xsYWIgYW5kIHZhbHVlIGFyZSB0aGUgVVVJRCBvZiB0aGVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eSB0byBjb3B5IGF0IHRoaXMgcGF0aC5cbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yLmNvbGxhYl0gaWQgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29udGV4dCB0aGUgY3VycmVudCB0YXNrIGNvbnRleHRcbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0LmNvbGxhYl0gdGhlIGNvbGxhYiBpbiB3aGljaCBlbnRpdGllcyB3aWxsIGJlIGNvcGllZFxuICAgKiBAcmV0dXJuIHtvYmplY3R9IGNyZWF0ZWQgZW50aXRpZXMgd2hlcmUga2V5cyBhcmUgdGhlIHNhbWUgYXMgcHJvdmlkZWQgaW5cbiAgICogICAgICAgICAgICAgICAgICBjb25maWcuc3RvcmFnZVxuICAgKi9cbiAgZnVuY3Rpb24gc3RvcmFnZShkZXNjcmlwdG9yLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuZW5zdXJlUGFyYW1ldGVycyhcbiAgICAgIGRlc2NyaXB0b3IsICdzdG9yYWdlJ1xuICAgICkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5U3RvcmFnZVxuICAgICAgICAuZ2V0UHJvamVjdEJ5Q29sbGFiKGRlc2NyaXB0b3IuY29sbGFiIHx8IGNvbnRleHQuY29sbGFiLmlkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0RW50aXR5KSB7XG4gICAgICAgICAgdmFyIHByb21pc2VzID0ge307XG4gICAgICAgICAgYW5ndWxhci5mb3JFYWNoKGRlc2NyaXB0b3Iuc3RvcmFnZSwgZnVuY3Rpb24odmFsdWUsIG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgICAgICAgICBwcm9taXNlc1tuYW1lXSA9IChcbiAgICAgICAgICAgICAgICBoYnBFbnRpdHlTdG9yZS5jb3B5KHZhbHVlLCBwcm9qZWN0RW50aXR5Ll91dWlkKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAkbG9nLndhcm4oJ0ludmFsaWQgY29uZmlndXJhdGlvbiBmb3Igc3RvcmFnZSB0YXNrJywgZGVzY3JpcHRvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5XG4gKiBAZGVzY1xuICogUHJvdmlkZXMgYW5ndWxhciBzZXJ2aWNlcyB0byB3b3JrIHdpdGggSEJQIENvbGxhYm9yYXRvcnkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5JywgW1xuICAnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsXG4gICdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJ1xuXSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
