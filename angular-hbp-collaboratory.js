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
  'hbpCollaboratoryNavStore'
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

    runSubtasks: function(context) {
      var promises = [];
      angular.forEach(this.subtasks, function(task) {
        promises.push(task.run(context));
      });
      return $q.all(promises);
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
}]);

/* eslint camelcase: 0 */

angular.module('hbpCollaboratoryAppStore', ['bbpConfig', 'hbpCommon'])
.constant('folderAppId', '__collab_folder__')
.service('hbpCollaboratoryAppStore', ['$q', '$http', '$cacheFactory', 'hbpErrorService', 'bbpConfig', 'hbpUtil', function(
  $q, $http, $cacheFactory,
  hbpErrorService, bbpConfig, hbpUtil
) {
  var appsCache = $cacheFactory('__appsCache__');
  var urlBase = bbpConfig.get('api.collab.v0') + '/extension/';
  var apps = null;

  var App = function(attrs) {
    var self = this;
    angular.forEach(attrs, function(v, k) {
      self[k] = v;
    });
  };
  App.prototype = {
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

  var getApps = function() {
    if (!apps) {
      return loadAll(hbpUtil.paginatedResultSet($http.get(urlBase), {
        factory: App.fromJson
      }));
    }
    return $q.when(apps);
  };

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

  var findOne = function(options) {
    return $http.get(urlBase, {params: options}).then(function(res) {
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
    list: getApps,
    getById: getById,
    findOne: findOne
  };
}]);

/* eslint camelcase:[2, {properties: "never"}] */
'use strict';

angular.module('hbpCollaboratoryNavStore', ['hbpCommon', 'uuid4'])
.service('hbpCollaboratoryNavStore', ['$q', '$http', '$log', '$cacheFactory', '$timeout', 'orderByFilter', 'uuid4', 'hbpUtil', 'bbpConfig', function($q, $http, $log,
    $cacheFactory, $timeout, orderByFilter, uuid4,
    hbpUtil, bbpConfig) {
  var collabApiUrl = bbpConfig.get('api.collab.v0') + '/collab/';
  // a cache with individual nav items
  var cacheNavItems = $cacheFactory('navItem');

  // a cache with the promises of each collab's nav tree root
  var cacheNavRoots = $cacheFactory('navRoot');

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

  var get = function(collabId, nodeId) {
    return getRoot(collabId).then(function() {
      var k = key(collabId, nodeId);
      var item = cacheNavItems.get(k);

      if (!item) {
        $log.error('unknown nav item', k);
      }

      return item;
    });
  };

  var addNode = function(collabId, navItem) {
    return $http.post(collabApiUrl + collabId + '/nav/', navItem.toJson())
    .then(function(resp) {
      return NavItem.fromJson(collabId, resp.data);
    }, hbpUtil.ferr);
  };

  var deleteNode = function(collabId, navItem) {
    return $http.delete(collabApiUrl + collabId + '/nav/' + navItem.id + '/')
    .then(function() {
      cacheNavItems.remove(key(collabId, navItem.id));
    }, hbpUtil.ferr);
  };

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
    getNode: get,
    addNode: addNode,
    saveNode: update,
    deleteNode: deleteNode,
    insertNode: insertNode
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
.run(['$log', 'hbpCollaboratoryAppStore', 'hbpCollaboratoryNavStore', 'hbpCollaboratoryAutomator', function createNavItem(
  $log,
  hbpCollaboratoryAppStore,
  hbpCollaboratoryNavStore,
  hbpCollaboratoryAutomator
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
      return (descriptor && descriptor.collabId) ||
        (context && context.collab.id);
    };
    $log.debug('Create nav item', descriptor, context);
    return hbpCollaboratoryAppStore.findOne({
      title: descriptor.app
    })
    .then(function(app) {
      return hbpCollaboratoryNavStore.getRoot(collabId())
      .then(function(parentItem) {
        var nav = new hbpCollaboratoryNavStore.NavItem({
          collabId: collabId(),
          name: descriptor.name,
          appId: app.id,
          parentId: parentItem.id
        });
        return hbpCollaboratoryNavStore.addNode(collabId(), nav);
      });
    });
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', '$q', 'hbpCollaboratoryAutomator', function createNavItem(
  $log,
  $q,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('jupyterNotebook', jupyterNotebook);

  /**
   * Create JupyterNotebook navigation item.
   *
   * The notebook add the NavItem instance in the context
   * using the key ``jupyterNotebook``.
   *
   * @param  {object} descriptor can contain a ipynb file identifier
   * @param  {object} [descriptor.entity] name of an entities in ``context.storage``
   * @param  {string} context must contain a storage entry with the name
   *                          defined in descriptor.entity if present
   * @return {NavItem} the notebook navitem
   */
  function jupyterNotebook(descriptor, context) {
    $log.debug('jupyterNotebook is not implemented');
    $log.debug(descriptor, context);
    return $q.when({});
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', '$q', 'hbpEntityStore', 'hbpErrorService', 'hbpCollaboratoryAutomator', function createCollabService(
  $log, $q, hbpEntityStore,
  hbpErrorService,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('storage', storage);

  /**
   * Return a HbpError when a parameter is missing.
   *
   * @param  {string} key    name of the key
   * @param  {object} config the invalid configuration object
   * @return {HbpError}      a HbpError instance
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
   * Ensure that all parameters listed after config are presents
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
   * Copy files and folders to the destination collab storage.
   *
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
   * @param {object} config the task configuration
   * @param {object} config.storage a object where keys are the file path in the
   *                                new collab and value are the UUID of the
   *                                entity to copy at this path.
   * @param {object} config.collab the collab in which entities will be copied
   * @return {object} created entities where keys are the same as provided in
   *                  config.storage
   */
  function storage(config) {
    return ensureParameters(config, 'storage', 'collab').then(function() {
      return hbpEntityStore.getPath('/' + config.collab.title)
      .then(function(projectEntity) {
        var promises = {};
        angular.forEach(config.storage, function(value, name) {
          console.log(value, angular.isString(value));
          if (angular.isString(value)) {
            promises[name] = (hbpEntityStore.copy(value, projectEntity._uuid));
          } else {
            $log.warn('Invalid configuration for storage task', config);
          }
        });
        console.log(promises, config.storage);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLWNvbGxhYi5qcyIsImF1dG9tYXRvci90YXNrcy9jcmVhdGUtbmF2LWl0ZW0uanMiLCJhdXRvbWF0b3IvdGFza3MvanVweXRlci1ub3RlYm9vay5qcyIsImF1dG9tYXRvci90YXNrcy9zdG9yYWdlLmpzIiwibWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUE2QkEsUUFBUSxPQUFPLDZCQUE2QjtFQUMxQztFQUNBO0VBQ0E7RUFDQTtFQUNBOztDQUVELFFBQVEsK0RBQTZCLFNBQVM7RUFDN0MsSUFBSSxNQUFNO0VBQ1Y7RUFDQSxJQUFJLFdBQVc7Ozs7Ozs7OztFQVNmLFNBQVMsZ0JBQWdCLE1BQU0sSUFBSTtJQUNqQyxTQUFTLFFBQVE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUE0Qm5CLFNBQVMsS0FBSyxNQUFNLFlBQVksU0FBUztJQUN2QyxJQUFJO01BQ0YsT0FBTyxJQUFJLEtBQUssTUFBTSxZQUFZO01BQ2xDLE9BQU8sSUFBSTtNQUNYLEtBQUssTUFBTSxhQUFhO01BQ3hCLE1BQU0sZ0JBQWdCLE1BQU07UUFDMUIsTUFBTTtRQUNOLFNBQVMsa0JBQWtCLE9BQU8sT0FBTztRQUN6QyxNQUFNO1VBQ0osT0FBTztVQUNQLE1BQU07VUFDTixZQUFZO1VBQ1osU0FBUzs7Ozs7Ozs7Ozs7Ozs7O0VBZWpCLFNBQVMsZUFBZSxPQUFPO0lBQzdCLElBQUksV0FBVztJQUNmLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxRQUFRO01BQzNCLE9BQU87O0lBRVQsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxLQUFLO01BQ3JDLElBQUksVUFBVSxNQUFNO01BQ3BCLEtBQUssSUFBSSxRQUFRLFNBQVM7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USxPQUFPO0NBQ2QscUZBQUksU0FBUztFQUNaLE1BQU0sSUFBSTtFQUNWO0VBQ0E7RUFDQTtFQUNBLDBCQUEwQixnQkFBZ0IsV0FBVzs7Ozs7Ozs7O0VBU3JELFNBQVMsaUJBQWlCLEtBQUssUUFBUTtJQUNyQyxPQUFPLGdCQUFnQjtNQUNyQixNQUFNO01BQ04sU0FBUyxjQUFjLE1BQU07TUFDN0IsTUFBTTtRQUNKLFFBQVE7Ozs7Ozs7Ozs7RUFVZCxTQUFTLGlCQUFpQixRQUFRO0lBQ2hDLElBQUksYUFBYSxNQUFNLFVBQVUsT0FBTztJQUN4QyxLQUFLLElBQUksS0FBSyxZQUFZO01BQ3hCLElBQUksUUFBUSxZQUFZLFdBQVcsS0FBSztRQUN0QyxPQUFPLEdBQUcsT0FBTyxpQkFBaUIsR0FBRzs7O0lBR3pDLE9BQU8sR0FBRyxLQUFLOzs7Ozs7Ozs7Ozs7Ozs7RUFlakIsU0FBUyxRQUFRLFFBQVE7SUFDdkIsT0FBTyxpQkFBaUIsUUFBUSxXQUFXLFVBQVUsS0FBSyxXQUFXO01BQ25FLE9BQU8sZUFBZSxRQUFRLE1BQU0sT0FBTyxPQUFPO09BQ2pELEtBQUssU0FBUyxlQUFlO1FBQzVCLElBQUksV0FBVztRQUNmLFFBQVEsUUFBUSxPQUFPLFNBQVMsU0FBUyxPQUFPLE1BQU07VUFDcEQsUUFBUSxJQUFJLE9BQU8sUUFBUSxTQUFTO1VBQ3BDLElBQUksUUFBUSxTQUFTLFFBQVE7WUFDM0IsU0FBUyxTQUFTLGVBQWUsS0FBSyxPQUFPLGNBQWM7aUJBQ3REO1lBQ0wsS0FBSyxLQUFLLDBDQUEwQzs7O1FBR3hELFFBQVEsSUFBSSxVQUFVLE9BQU87UUFDN0IsT0FBTyxHQUFHLElBQUk7Ozs7O0FBS3RCO0FDdkVBOzs7OztBQUtBLFFBQVEsT0FBTyxvQkFBb0I7RUFDakM7RUFDQTtFQUNBOztBQUVGIiwiZmlsZSI6ImFuZ3VsYXItaGJwLWNvbGxhYm9yYXRvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGlzIGFuIEFuZ3VsYXJKUyBmYWN0b3J5IHRoYXRcbiAqIHByb3ZpZGUgdGFzayBhdXRvbWF0aW9uIHRvIGFjY29tcGxpc2ggYSBzZXF1ZW5jZSBvZlxuICogY29tbW9uIG9wZXJhdGlvbiBpbiBDb2xsYWJvcmF0b3J5LlxuICpcbiAqIEhvdyB0byBhZGQgbmV3IHRhc2tzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE5ldyB0YXNrcyBjYW4gYmUgYWRkZWQgYnkgY2FsbGluZyBgYGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyYGAuXG4gKlxuICogQHBhcmFtIHtvYmplY3R9ICRxIGluamVjdGVkIGRlcGVuZGVuY3lcbiAqIEByZXR1cm4ge29iamVjdH0gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvciBhbmd1bGFyIHNlcnZpY2VcbiAqIEBleGFtcGxlIDxjYXB0aW9uPkNyZWF0ZSBhIENvbGxhYiB3aXRoIGEgZmV3IG5hdmlnYXRpb24gaXRlbXM8L2NhcHRpb24+XG4gKiAvLyBDcmVhdGUgYSBDb2xsYWIgd2l0aCBhIGZldyBuYXZpZ2F0aW9uIGl0ZW1zLlxuICogYW5ndWxhci5tb2R1bGUoJ015TW9kdWxlJywgWydoYnBDb2xsYWJvcmF0b3J5J10pXG4gKiAucnVuKGZ1bmN0aW9uKGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IsICRsb2cpIHtcbiAqICAgdmFyIGNvbmZpZyA9IHtcbiAqICAgICB0aXRsZTogJ015IEN1c3RvbSBDb2xsYWInLFxuICogICAgIGNvbnRlbnQ6ICdNeSBDb2xsYWIgQ29udGVudCcsXG4gKiAgICAgcHJpdmF0ZTogZmFsc2VcbiAqICAgfVxuICogICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2soY29uZmlnKS5ydW4oKS50aGVuKGZ1bmN0aW9uKGNvbGxhYikge1xuICogICBcdCAkbG9nLmluZm8oJ0NyZWF0ZWQgQ29sbGFiJywgY29sbGFiKTtcbiAqICAgfSlcbiAqIH0pXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgW1xuICAnYmJwQ29uZmlnJyxcbiAgJ2hicENvbW1vbicsXG4gICdoYnBEb2N1bWVudENsaWVudCcsXG4gICdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJ1xuXSlcbi5mYWN0b3J5KCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgZnVuY3Rpb24gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcihcbiAgJHEsICRsb2csIGhicEVycm9yU2VydmljZVxuKSB7XG4gIHZhciBoYW5kbGVycyA9IHt9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiB0YXNrIG5hbWUuXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtICB7c3RyaW5nfSAgIG5hbWUgaGFuZGxlIGFjdGlvbnMgd2l0aCB0aGUgc3BlY2lmaWVkIG5hbWVcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHQgdGhlIGN1cnJlbnQgY29udGV4dCBpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJIYW5kbGVyKG5hbWUsIGZuKSB7XG4gICAgaGFuZGxlcnNbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBAbmFtZXNwYWNlIFRhc2tzXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQGRlc2NcbiAgICogQXZhaWxhYmxlIHRhc2tzLlxuICAgKi9cblxuICAvKipcbiAgICogSW5zdGFudGlhdGUgYSBuZXcgVGFzayBpbnRhbmNlIHRoYXQgd2lsbCBydW4gdGhlIGNvZGUgZGVzY3JpYmUgZm9yXG4gICAqIGEgaGFuZGxlcnMgd2l0aCB0aGUgZ2l2ZSBgYG5hbWVgYC5cbiAgICpcbiAgICogVGhlIGRlc2NyaXB0b3IgaXMgcGFzc2VkIHRvIHRoZSB0YXNrIGFuZCBwYXJhbWV0cml6ZSBpdC5cbiAgICogVGhlIHRhc2sgY29udGV4dCBpcyBjb21wdXRlZCBhdCB0aGUgdGltZSB0aGUgdGFzayBpcyByYW4uIEEgZGVmYXVsdCBjb250ZXh0XG4gICAqIGNhbiBiZSBnaXZlbiBhdCBsb2FkIHRpbWUgYW5kIGl0IHdpbGwgYmUgZmVkIHdpdGggdGhlIHJlc3VsdCBvZiBlYWNoIHBhcmVudFxuICAgKiAoYnV0IG5vdCBzaWJsaW5nKSB0YXNrcyBhcyB3ZWxsLlxuICAgKlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBuYW1lIG9mIHRoZSB0YXNrIHRvIGluc3RhbnRpYXRlXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvcl0gYSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IHdpbGwgZGV0ZXJtaW5lXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIHRhc2sgdG8gcnVuIGFuZCBpbiB3aGljaCBvcmRlclxuICAgKiBAcGFyYW0ge29iamVjdH0gW2Rlc2NyaXB0b3IuYWZ0ZXJdIGFuIGFycmF5IG9mIHRhc2sgdG8gcnVuIGFmdGVyIHRoaXMgb25lXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gYSBkZWZhdWx0IGNvbnRleHQgdG8gcnVuIHRoZSB0YXNrIHdpdGhcbiAgICpcbiAgICogQHJldHVybiB7VGFza30gLSB0aGUgbmV3IHRhc2sgaW5zdGFuY2VcbiAgICovXG4gIGZ1bmN0aW9uIHRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gbmV3IFRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICRsb2cuZXJyb3IoJ0VYQ0VQVElPTicsIGV4KTtcbiAgICAgIHRocm93IGhicEVycm9yU2VydmljZS5lcnJvcih7XG4gICAgICAgIHR5cGU6ICdJbnZhbGlkVGFzaycsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnZhbGlkIHRhc2sgJyArIG5hbWUgKyAnOiAnICsgZXgsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBjYXVzZTogZXgsXG4gICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICBkZXNjcmlwdG9yOiBkZXNjcmlwdG9yLFxuICAgICAgICAgIGNvbnRleHQ6IGNvbnRleHRcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhbiBhcnJheSBvZiB0YXNrcyBnaXZlbiBhbiBhcnJheSBjb250YWluaW5nIG9iamVjdCB3aGVyZVxuICAgKiB0aGUga2V5IGlzIHRoZSB0YXNrIG5hbWUgdG8gcnVuIGFuZCB0aGUgdmFsdWUgaXMgdGhlIGRlc2NyaXB0b3JcbiAgICogcGFyYW1ldGVyLlxuICAgKlxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGFmdGVyIHRoZSBjb250ZW50IG9mIGBgZGVzY3JpcHRvci5hZnRlcmBgXG4gICAqIEByZXR1cm4ge0FycmF5L1Rhc2t9IGFycmF5IG9mIHN1YnRhc2tzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVTdWJ0YXNrcyhhZnRlcikge1xuICAgIHZhciBzdWJ0YXNrcyA9IFtdO1xuICAgIGlmICghYWZ0ZXIgfHwgIWFmdGVyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHN1YnRhc2tzO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFmdGVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdGFza0RlZiA9IGFmdGVyW2ldO1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiB0YXNrRGVmKSB7XG4gICAgICAgIGlmICh0YXNrRGVmLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgc3VidGFza3MucHVzaCh0YXNrKG5hbWUsIHRhc2tEZWZbbmFtZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VidGFza3M7XG4gIH1cblxuICAvKipcbiAgICogQGNsYXNzIFRhc2tcbiAgICogQGRlc2NcbiAgICogSW5zdGFudGlhdGUgYSB0YXNrIGdpdmVuIHRoZSBnaXZlbiBgY29uZmlnYC5cbiAgICogVGhlIHRhc2sgY2FuIHRoZW4gYmUgcnVuIHVzaW5nIHRoZSBgcnVuKClgIGluc3RhbmNlIG1ldGhvZC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgdGhlIG5hbWUgb2YgdGhlIHRhc2sgdG8gaW5zdGFudGlhdGVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtkZXNjcmlwdG9yXSBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgd2lsbCBkZXRlcm1pbmVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggdGFzayB0byBydW4gYW5kIGluIHdoaWNoIG9yZGVyXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbZGVzY3JpcHRvci5hZnRlcl0gYW4gYXJyYXkgb2YgdGFzayB0byBydW4gYWZ0ZXIgdGhpcyBvbmVcbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0XSBhIGRlZmF1bHQgY29udGV4dCB0byBydW4gdGhlIHRhc2sgd2l0aFxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBzZWUgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2tcbiAgICpcbiAgICovXG4gIGZ1bmN0aW9uIFRhc2sobmFtZSwgZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgIGlmICghaGFuZGxlcnNbbmFtZV0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGFza05vdEZvdW5kJyk7XG4gICAgfVxuICAgIGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yIHx8IHt9O1xuICAgIGNvbnRleHQgPSBjb250ZXh0IHx8IHt9O1xuICAgIHRoaXMuc3RhdGUgPSAnaWRsZSc7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yO1xuICAgIHRoaXMuZGVmYXVsdENvbnRleHQgPSBjb250ZXh0O1xuICAgIHRoaXMuc3RhdGUgPSAnaWRsZSc7XG4gICAgdGhpcy5wcm9taXNlID0gbnVsbDtcbiAgICB0aGlzLmVycm9yID0gbnVsbDtcbiAgICB0aGlzLnN1YnRhc2tzID0gY3JlYXRlU3VidGFza3MoZGVzY3JpcHRvci5hZnRlcik7XG4gIH1cblxuICBUYXNrLnByb3RvdHlwZSA9IHtcbiAgICAvKipcbiAgICAgKiBMYXVuY2ggdGhlIHRhc2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29udGV4dCBjdXJyZW50IGNvbnRleHQgd2lsbCBiZSBtZXJnZWQgaW50byB0aGUgZGVmYXVsdFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgIG9uZS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIHRvIHJldHVybiB0aGUgcmVzdWx0IG9mIHRoZSB0YXNrXG4gICAgICovXG4gICAgcnVuOiBmdW5jdGlvbihjb250ZXh0KSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAvLyBydW4gYW4gaW50YW5jZSBvZiB0YXNrIG9ubHkgb25jZS5cbiAgICAgIGlmIChzZWxmLnN0YXRlICE9PSAnaWRsZScpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIGNvbnRleHQgPSBhbmd1bGFyLmV4dGVuZCh7fSwgdGhpcy5kZWZhdWx0Q29udGV4dCwgY29udGV4dCk7XG4gICAgICB2YXIgb25TdWNjZXNzID0gZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICAgIHZhciBzdWJDb250ZXh0ID0gYW5ndWxhci5jb3B5KGNvbnRleHQpO1xuICAgICAgICBzdWJDb250ZXh0W3NlbGYubmFtZV0gPSByZXN1bHQ7XG4gICAgICAgIHJldHVybiBzZWxmLnJ1blN1YnRhc2tzKHN1YkNvbnRleHQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHNlbGYuc3RhdGUgPSAnc3VjY2Vzcyc7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdmFyIG9uRXJyb3IgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgc2VsZi5zdGF0ZSA9ICdlcnJvcic7XG4gICAgICAgIC8vIG5vb3Agb3BlcmF0aW9uIGlmIGlzIGFscmVhZHkgb25lXG4gICAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmVycm9yKGVycikpO1xuICAgICAgfTtcbiAgICAgIHNlbGYuc3RhdGUgPSAncHJvZ3Jlc3MnO1xuICAgICAgc2VsZi5wcm9taXNlID0gJHEud2hlbihoYW5kbGVyc1tzZWxmLm5hbWVdKHNlbGYuZGVzY3JpcHRvciwgY29udGV4dCkpXG4gICAgICAgIC50aGVuKG9uU3VjY2VzcylcbiAgICAgICAgLmNhdGNoKG9uRXJyb3IpO1xuICAgICAgcmV0dXJuIHNlbGYucHJvbWlzZTtcbiAgICB9LFxuXG4gICAgcnVuU3VidGFza3M6IGZ1bmN0aW9uKGNvbnRleHQpIHtcbiAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKHRoaXMuc3VidGFza3MsIGZ1bmN0aW9uKHRhc2spIHtcbiAgICAgICAgcHJvbWlzZXMucHVzaCh0YXNrLnJ1bihjb250ZXh0KSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiAkcS5hbGwocHJvbWlzZXMpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogUmV0dXJuIGFuIG9iamVjdCB0aGF0IG9ubHkgY29udGFpbnMgYXR0cmlidXRlc1xuICAgKiBmcm9tIHRoZSBgYXR0cnNgIGxpc3QuXG4gICAqXG4gICAqIEBwYXJhbSAge29iamVjdH0gY29uZmlnIGtleS12YWx1ZSBzdG9yZVxuICAgKiBAcGFyYW0gIHtBcnJheX0gYXR0cnMgICBhIGxpc3Qgb2Yga2V5cyB0byBleHRyYWN0IGZyb20gYGNvbmZpZ2BcbiAgICogQHJldHVybiB7b2JqZWN0fSAgICAgICAga2V5LXZhbHVlIHN0b3JlIGNvbnRhaW5pbmcgb25seSBrZXlzIGZyb20gYXR0cnNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgZm91bmQgaW4gYGNvbmZpZ2BcbiAgICovXG4gIGZ1bmN0aW9uIGV4dHJhY3RBdHRyaWJ1dGVzKGNvbmZpZywgYXR0cnMpIHtcbiAgICB2YXIgciA9IHt9O1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRycywgZnVuY3Rpb24oYSkge1xuICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGNvbmZpZ1thXSkpIHtcbiAgICAgICAgclthXSA9IGNvbmZpZ1thXTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcjtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgIHJlZ2lzdGVySGFuZGxlcjogcmVnaXN0ZXJIYW5kbGVyLFxuICAgIHRhc2s6IHRhc2ssXG4gICAgZXh0cmFjdEF0dHJpYnV0ZXM6IGV4dHJhY3RBdHRyaWJ1dGVzXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6IDAgKi9cblxuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsIFsnYmJwQ29uZmlnJywgJ2hicENvbW1vbiddKVxuLmNvbnN0YW50KCdmb2xkZXJBcHBJZCcsICdfX2NvbGxhYl9mb2xkZXJfXycpXG4uc2VydmljZSgnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJywgZnVuY3Rpb24oXG4gICRxLCAkaHR0cCwgJGNhY2hlRmFjdG9yeSxcbiAgaGJwRXJyb3JTZXJ2aWNlLCBiYnBDb25maWcsIGhicFV0aWxcbikge1xuICB2YXIgYXBwc0NhY2hlID0gJGNhY2hlRmFjdG9yeSgnX19hcHBzQ2FjaGVfXycpO1xuICB2YXIgdXJsQmFzZSA9IGJicENvbmZpZy5nZXQoJ2FwaS5jb2xsYWIudjAnKSArICcvZXh0ZW5zaW9uLyc7XG4gIHZhciBhcHBzID0gbnVsbDtcblxuICB2YXIgQXBwID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgYW5ndWxhci5mb3JFYWNoKGF0dHJzLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICBzZWxmW2tdID0gdjtcbiAgICB9KTtcbiAgfTtcbiAgQXBwLnByb3RvdHlwZSA9IHtcbiAgICB0b0pzb246IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmRlc2NyaXB0aW9uLFxuICAgICAgICBlZGl0X3VybDogdGhpcy5lZGl0VXJsLFxuICAgICAgICBydW5fdXJsOiB0aGlzLnJ1blVybCxcbiAgICAgICAgdGl0bGU6IHRoaXMudGl0bGVcbiAgICAgIH07XG4gICAgfVxuICB9O1xuICBBcHAuZnJvbUpzb24gPSBmdW5jdGlvbihqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICByZXR1cm4gbmV3IEFwcCh7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGRlbGV0ZWQ6IGpzb24uZGVsZXRlZCxcbiAgICAgIGRlc2NyaXB0aW9uOiBqc29uLmRlc2NyaXB0aW9uLFxuICAgICAgZWRpdFVybDoganNvbi5lZGl0X3VybCxcbiAgICAgIHJ1blVybDoganNvbi5ydW5fdXJsLFxuICAgICAgdGl0bGU6IGpzb24udGl0bGUsXG4gICAgICBjcmVhdGVkQnk6IGpzb24uY3JlYXRlZF9ieVxuICAgIH0pO1xuICB9O1xuXG4gIGFwcHNDYWNoZS5wdXQoJ19fY29sbGFiX2ZvbGRlcl9fJywge1xuICAgIGlkOiAnX19jb2xsYWJfZm9sZGVyX18nLFxuICAgIHRpdGxlOiAnRm9sZGVyJ1xuICB9KTtcblxuICB2YXIgbG9hZEFsbCA9IGZ1bmN0aW9uKHByb21pc2UpIHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJzKSB7XG4gICAgICBpZiAocnMuaGFzTmV4dCkge1xuICAgICAgICByZXR1cm4gbG9hZEFsbChycy5uZXh0KCkpO1xuICAgICAgfVxuICAgICAgYXBwcyA9IHJzLnJlc3VsdHM7XG4gICAgICByZXR1cm4gYXBwcztcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZ2V0QXBwcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghYXBwcykge1xuICAgICAgcmV0dXJuIGxvYWRBbGwoaGJwVXRpbC5wYWdpbmF0ZWRSZXN1bHRTZXQoJGh0dHAuZ2V0KHVybEJhc2UpLCB7XG4gICAgICAgIGZhY3Rvcnk6IEFwcC5mcm9tSnNvblxuICAgICAgfSkpO1xuICAgIH1cbiAgICByZXR1cm4gJHEud2hlbihhcHBzKTtcbiAgfTtcblxuICB2YXIgZ2V0QnlJZCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKCFpZCkge1xuICAgICAgcmV0dXJuICRxLndoZW4obnVsbCk7XG4gICAgfVxuICAgIHZhciBleHQgPSBhcHBzQ2FjaGUuZ2V0KGlkKTtcbiAgICBpZiAoZXh0KSB7XG4gICAgICByZXR1cm4gJHEud2hlbihleHQpO1xuICAgIH1cbiAgICByZXR1cm4gJGh0dHAuZ2V0KHVybEJhc2UgKyBpZCArICcvJykudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIGFwcHNDYWNoZS5wdXQoaWQsIEFwcC5mcm9tSnNvbihyZXMuZGF0YSkpO1xuICAgICAgcmV0dXJuIGFwcHNDYWNoZS5nZXQoaWQpO1xuICAgIH0sIGZ1bmN0aW9uKHJlcykge1xuICAgICAgcmV0dXJuICRxLnJlamVjdChoYnBFcnJvclNlcnZpY2UuaHR0cEVycm9yKHJlcykpO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBmaW5kT25lID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHJldHVybiAkaHR0cC5nZXQodXJsQmFzZSwge3BhcmFtczogb3B0aW9uc30pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IHJlcy5kYXRhLnJlc3VsdHM7XG4gICAgICAvLyBSZWplY3QgaWYgbW9yZSB0aGFuIG9uZSByZXN1bHRzXG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmVycm9yKHtcbiAgICAgICAgICB0eXBlOiAnVG9vTWFueVJlc3VsdHMnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdNdWx0aXBsZSBhcHBzIGhhcyBiZWVuIHJldHJpZXZlZCAnICtcbiAgICAgICAgICAgICAgICAgICAnd2hlbiBvbmx5IG9uZSB3YXMgZXhwZWN0ZWQuJyxcbiAgICAgICAgICBkYXRhOiByZXMuZGF0YVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgICAvLyBOdWxsIHdoZW4gbm8gcmVzdWx0XG4gICAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICAvLyBCdWlsZCB0aGUgYXBwIGlmIGV4YWN0bHkgb25lIHJlc3VsdFxuICAgICAgdmFyIGFwcCA9IEFwcC5mcm9tSnNvbihyZXN1bHRzWzBdKTtcbiAgICAgIGFwcHNDYWNoZS5wdXQoYXBwLmlkLCBhcHApO1xuICAgICAgcmV0dXJuIGFwcDtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIHJldHVybiB7XG4gICAgbGlzdDogZ2V0QXBwcyxcbiAgICBnZXRCeUlkOiBnZXRCeUlkLFxuICAgIGZpbmRPbmU6IGZpbmRPbmVcbiAgfTtcbn0pO1xuIiwiLyogZXNsaW50IGNhbWVsY2FzZTpbMiwge3Byb3BlcnRpZXM6IFwibmV2ZXJcIn1dICovXG4ndXNlIHN0cmljdCc7XG5cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLCBbJ2hicENvbW1vbicsICd1dWlkNCddKVxuLnNlcnZpY2UoJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsIGZ1bmN0aW9uKCRxLCAkaHR0cCwgJGxvZyxcbiAgICAkY2FjaGVGYWN0b3J5LCAkdGltZW91dCwgb3JkZXJCeUZpbHRlciwgdXVpZDQsXG4gICAgaGJwVXRpbCwgYmJwQ29uZmlnKSB7XG4gIHZhciBjb2xsYWJBcGlVcmwgPSBiYnBDb25maWcuZ2V0KCdhcGkuY29sbGFiLnYwJykgKyAnL2NvbGxhYi8nO1xuICAvLyBhIGNhY2hlIHdpdGggaW5kaXZpZHVhbCBuYXYgaXRlbXNcbiAgdmFyIGNhY2hlTmF2SXRlbXMgPSAkY2FjaGVGYWN0b3J5KCduYXZJdGVtJyk7XG5cbiAgLy8gYSBjYWNoZSB3aXRoIHRoZSBwcm9taXNlcyBvZiBlYWNoIGNvbGxhYidzIG5hdiB0cmVlIHJvb3RcbiAgdmFyIGNhY2hlTmF2Um9vdHMgPSAkY2FjaGVGYWN0b3J5KCduYXZSb290Jyk7XG5cbiAgdmFyIE5hdkl0ZW0gPSBmdW5jdGlvbihhdHRyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRyLCBmdW5jdGlvbih2LCBrKSB7XG4gICAgICBzZWxmW2tdID0gdjtcbiAgICB9KTtcbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCh0aGlzLmNvbnRleHQpKSB7XG4gICAgICB0aGlzLmNvbnRleHQgPSB1dWlkNC5nZW5lcmF0ZSgpO1xuICAgIH1cbiAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZCh0aGlzLmNoaWxkcmVuKSkge1xuICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgIH1cbiAgfTtcbiAgTmF2SXRlbS5wcm90b3R5cGUgPSB7XG4gICAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgYXBwX2lkOiB0aGlzLmFwcElkLFxuICAgICAgICBjb2xsYWI6IHRoaXMuY29sbGFiSWQsXG4gICAgICAgIG5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxuICAgICAgICBvcmRlcl9pbmRleDogdGhpcy5vcmRlcixcbiAgICAgICAgdHlwZTogdGhpcy50eXBlIHx8ICh0aGlzLmZvbGRlciA/ICdGTycgOiAnSVQnKSxcbiAgICAgICAgcGFyZW50OiB0aGlzLnBhcmVudElkXG4gICAgICB9O1xuICAgIH0sXG4gICAgdXBkYXRlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgYW5ndWxhci5mb3JFYWNoKFtcbiAgICAgICAgJ2lkJywgJ25hbWUnLCAnY2hpbGRyZW4nLCAnY29udGV4dCcsXG4gICAgICAgICdjb2xsYWJJZCcsICdhcHBJZCcsICdvcmRlcicsICdmb2xkZXInLFxuICAgICAgICAncGFyZW50SWQnLCAndHlwZSdcbiAgICAgIF0sIGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNEZWZpbmVkKGF0dHJzW2FdKSkge1xuICAgICAgICAgIHRoaXNbYV0gPSBhdHRyc1thXTtcbiAgICAgICAgfVxuICAgICAgfSwgdGhpcyk7XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZW5zdXJlQ2FjaGVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGNhY2hlTmF2SXRlbXMucHV0KGtleSh0aGlzLmNvbGxhYklkLCB0aGlzLmlkKSwgdGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH07XG4gIC8qKlxuICAgKiBNYW5hZ2UgYGFjY2AgYWNjdW11bGF0b3Igd2l0aCBhbGwgdGhlIGRhdGEgZnJvbSBqc29uQXJyYXkgYW5kIHJldHVybiBpdC5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgdGhlIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHthcnJheX0ganNvbkFycmF5IGRlc2NyaXB0aW9uIG9mIHRoZSBjaGlsZHJlblxuICAgKiBAcGFyYW0gIHtBcnJheX0gYWNjICAgICAgIHRoZSBhY2N1bXVsYXRvclxuICAgKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgIHRoZSBjaGlsZHJlblxuICAgKi9cbiAgZnVuY3Rpb24gY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbkFycmF5LCBhY2MpIHtcbiAgICBhY2MgPSBhY2MgfHwgW107XG4gICAgLy8gYW4gdW5kZWZpbmVkIGFycmF5IG1lYW5zIHdlIGFib3J0IHRoZSBwcm9jZXNzXG4gICAgLy8gd2hlcmUgYW4gZW1wdHkgYXJyYXkgd2lsbCBlbnN1cmUgdGhlIHJlc3VsdGluZyBhcnJheVxuICAgIC8vIGlzIGVtcHR5IGFzIHdlbGwuXG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQoanNvbkFycmF5KSkge1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9XG5cbiAgICBhY2MubGVuZ3RoID0gMDtcbiAgICBhbmd1bGFyLmZvckVhY2goanNvbkFycmF5LCBmdW5jdGlvbihqc29uKSB7XG4gICAgICBhY2MucHVzaChOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCBqc29uKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbiAgfVxuICBOYXZJdGVtLmZyb21Kc29uID0gZnVuY3Rpb24oY29sbGFiSWQsIGpzb24pIHtcbiAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgIHZhciBhdHRycyA9IHtcbiAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgYXBwSWQ6IGpzb24uYXBwX2lkLFxuICAgICAgY29sbGFiSWQ6IGNvbGxhYklkLFxuICAgICAgbmFtZToganNvbi5uYW1lLFxuICAgICAgY29udGV4dDoganNvbi5jb250ZXh0LFxuICAgICAgb3JkZXI6IGpzb24ub3JkZXJfaW5kZXgsXG4gICAgICBmb2xkZXI6IGpzb24udHlwZSA9PT0gJ0ZPJyxcbiAgICAgIHR5cGU6IGpzb24udHlwZSxcbiAgICAgIHBhcmVudElkOiBqc29uLnBhcmVudCxcbiAgICAgIGNoaWxkcmVuOiBjaGlsZHJlbkZyb21Kc29uKGNvbGxhYklkLCBqc29uLmNoaWxkcmVuKVxuICAgIH07XG4gICAgdmFyIGsgPSBrZXkoY29sbGFiSWQsIGF0dHJzLmlkKTtcbiAgICB2YXIgY2FjaGVkID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG4gICAgaWYgKGNhY2hlZCkge1xuICAgICAgcmV0dXJuIGNhY2hlZC51cGRhdGUoYXR0cnMpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IE5hdkl0ZW0oYXR0cnMpLmVuc3VyZUNhY2hlZCgpO1xuICB9O1xuXG4gIHZhciBnZXRSb290ID0gZnVuY3Rpb24oY29sbGFiSWQpIHtcbiAgICB2YXIgdHJlZVByb21pc2UgPSBjYWNoZU5hdlJvb3RzLmdldChjb2xsYWJJZCk7XG5cbiAgICBpZiAoIXRyZWVQcm9taXNlKSB7XG4gICAgICB0cmVlUHJvbWlzZSA9ICRodHRwLmdldChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2L2FsbC8nKS50aGVuKFxuICAgICAgICBmdW5jdGlvbihyZXNwKSB7XG4gICAgICAgICAgdmFyIHJvb3Q7XG4gICAgICAgICAgdmFyIGk7XG4gICAgICAgICAgdmFyIGl0ZW07XG4gICAgICAgICAgdmFyIGRhdGEgPSBvcmRlckJ5RmlsdGVyKHJlc3AuZGF0YSwgJytvcmRlcl9pbmRleCcpO1xuXG4gICAgICAgICAgLy8gZmlsbCBpbiB0aGUgY2FjaGVcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgZGF0YVtpXSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5jb250ZXh0ID09PSAncm9vdCcpIHtcbiAgICAgICAgICAgICAgcm9vdCA9IGl0ZW07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gbGluayBjaGlsZHJlbiBhbmQgcGFyZW50c1xuICAgICAgICAgIGZvciAoaSA9IDA7IGkgIT09IGRhdGEubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIGl0ZW0gPSBjYWNoZU5hdkl0ZW1zLmdldChrZXkoY29sbGFiSWQsIGRhdGFbaV0uaWQpKTtcbiAgICAgICAgICAgIGlmIChpdGVtLnBhcmVudElkKSB7XG4gICAgICAgICAgICAgIHZhciBwYXJlbnQgPSBjYWNoZU5hdkl0ZW1zLmdldChrZXkoY29sbGFiSWQsIGl0ZW0ucGFyZW50SWQpKTtcbiAgICAgICAgICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHJvb3Q7XG4gICAgICAgIH0sXG4gICAgICAgIGhicFV0aWwuZmVyclxuICAgICAgKTtcblxuICAgICAgY2FjaGVOYXZSb290cy5wdXQoY29sbGFiSWQsIHRyZWVQcm9taXNlKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJlZVByb21pc2U7XG4gIH07XG5cbiAgdmFyIGdldCA9IGZ1bmN0aW9uKGNvbGxhYklkLCBub2RlSWQpIHtcbiAgICByZXR1cm4gZ2V0Um9vdChjb2xsYWJJZCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBub2RlSWQpO1xuICAgICAgdmFyIGl0ZW0gPSBjYWNoZU5hdkl0ZW1zLmdldChrKTtcblxuICAgICAgaWYgKCFpdGVtKSB7XG4gICAgICAgICRsb2cuZXJyb3IoJ3Vua25vd24gbmF2IGl0ZW0nLCBrKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGl0ZW07XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGFkZE5vZGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbmF2SXRlbSkge1xuICAgIHJldHVybiAkaHR0cC5wb3N0KGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIHZhciBkZWxldGVOb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAuZGVsZXRlKGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJyArIG5hdkl0ZW0uaWQgKyAnLycpXG4gICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnJlbW92ZShrZXkoY29sbGFiSWQsIG5hdkl0ZW0uaWQpKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIHZhciB1cGRhdGUgPSBmdW5jdGlvbihjb2xsYWJJZCwgbmF2SXRlbSkge1xuICAgIG5hdkl0ZW0uY29sbGFiSWQgPSBjb2xsYWJJZDtcbiAgICByZXR1cm4gJGh0dHAucHV0KGNvbGxhYkFwaVVybCArIGNvbGxhYklkICsgJy9uYXYvJyArXG4gICAgICBuYXZJdGVtLmlkICsgJy8nLCBuYXZJdGVtLnRvSnNvbigpKVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3ApIHtcbiAgICAgIHJldHVybiBOYXZJdGVtLmZyb21Kc29uKGNvbGxhYklkLCByZXNwLmRhdGEpO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgLy8gb3JkZXJpbmcgb3BlcmF0aW9uIG5lZWRzIHRvIGJlIGdsb2JhbGx5IHF1ZXVlZCB0byBlbnN1cmUgY29uc2lzdGVuY3kuXG4gIHZhciBpbnNlcnRRdWV1ZSA9ICRxLndoZW4oKTtcblxuICAvKipcbiAgICogSW5zZXJ0IG5vZGUgaW4gdGhlIHRocmVlLlxuICAgKlxuICAgKiBAcGFyYW0gIHtpbnR9IGNvbGxhYklkICAgaWQgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBuYXZJdGVtICAgIE5hdiBpdGVtIGluc3RhbmNlXG4gICAqIEBwYXJhbSAge05hdkl0ZW19IHBhcmVudEl0ZW0gcGFyZW50IGl0ZW1cbiAgICogQHBhcmFtICB7aW50fSBpbnNlcnRBdCAgIGFkZCB0byB0aGUgbWVudVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgYSBwcm9taXNlIHRoYXQgd2lsbFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoZSB1cGRhdGUgbmF2IGl0ZW1cbiAgICovXG4gIGZ1bmN0aW9uIGluc2VydE5vZGUoY29sbGFiSWQsIG5hdkl0ZW0sIHBhcmVudEl0ZW0sIGluc2VydEF0KSB7XG4gICAgcmV0dXJuIGluc2VydFF1ZXVlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICBuYXZJdGVtLm9yZGVyID0gaW5zZXJ0QXQgKyAxOyAvLyBmaXJzdCBpdGVtIG9yZGVyX2luZGV4IG11c3QgYmUgMVxuICAgICAgbmF2SXRlbS5wYXJlbnRJZCA9IHBhcmVudEl0ZW0uaWQ7XG4gICAgICByZXR1cm4gdXBkYXRlKGNvbGxhYklkLCBuYXZJdGVtKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gYSB1bmlxdWUga2V5IGZvciBjaGFjaGluZyBhIG5hdiBpdGVtLlxuICAgKiBAcGFyYW0gIHtpbnR9IGNvbGxhYklkIGNvbGxhYiBJRFxuICAgKiBAcGFyYW0gIHtpbnR9IG5vZGVJZCAgIE5hdkl0ZW0gSURcbiAgICogQHJldHVybiB7c3RyaW5nfSAgICAgICB0aGUgdW5pcXVlIGtleVxuICAgKi9cbiAgZnVuY3Rpb24ga2V5KGNvbGxhYklkLCBub2RlSWQpIHtcbiAgICByZXR1cm4gY29sbGFiSWQgKyAnLS0nICsgbm9kZUlkO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBOYXZJdGVtOiBOYXZJdGVtLFxuICAgIGdldFJvb3Q6IGdldFJvb3QsXG4gICAgZ2V0Tm9kZTogZ2V0LFxuICAgIGFkZE5vZGU6IGFkZE5vZGUsXG4gICAgc2F2ZU5vZGU6IHVwZGF0ZSxcbiAgICBkZWxldGVOb2RlOiBkZWxldGVOb2RlLFxuICAgIGluc2VydE5vZGU6IGluc2VydE5vZGVcbiAgfTtcbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVDb2xsYWJTZXJ2aWNlKFxuICAkbG9nLCAkcSwgaGJwQ29sbGFiU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3Jcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignY29sbGFiJywgY3JlYXRlQ29sbGFiKTtcblxuICAvKipcbiAgICogQGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBkZXNjXG4gICAqICBDcmVhdGUgYSBjb2xsYWIgZGVmaW5lZCBieSB0aGUgZ2l2ZW4gb3B0aW9ucy5cbiAgICogQHBhcmFtIHtvYmplY3R9IGRlc2NyaXB0b3IgLSBQYXJhbWV0ZXJzIHRvIGNyZWF0ZSB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLm5hbWUgLSBOYW1lIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0b3IuZGVzY3JpcHRpb24gLSBEZXNjcmlwdGlvbiBpbiBsZXNzIHRoYW4gMTQwIGNoYXJhY3RlcnNcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRvci5wcml2YWN5XSAtICdwcml2YXRlJyBvciAncHVibGljJy4gTm90ZXMgdGhhdCBvbmx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIQlAgTWVtYmVycyBjYW4gY3JlYXRlIHByaXZhdGUgY29sbGFiXG4gICAqIEBwYXJhbSB7QXJyYXl9IFthZnRlcl0gLSBkZXNjcmlwdG9yIG9mIHN1YnRhc2tzXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IC0gcHJvbWlzZSBvZiBhIGNvbGxhYlxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlQ29sbGFiKGRlc2NyaXB0b3IpIHtcbiAgICB2YXIgYXR0ciA9IGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuZXh0cmFjdEF0dHJpYnV0ZXMoXG4gICAgICBkZXNjcmlwdG9yLFxuICAgICAgWyd0aXRsZScsICdjb250ZW50JywgJ3ByaXZhdGUnXVxuICAgICk7XG4gICAgJGxvZy5kZWJ1ZygnQ3JlYXRlIGNvbGxhYicsIGRlc2NyaXB0b3IpO1xuICAgIHJldHVybiBoYnBDb2xsYWJTdG9yZS5jcmVhdGUoYXR0cik7XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVOYXZJdGVtKFxuICAkbG9nLFxuICBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCduYXYnLCBjcmVhdGVOYXZJdGVtKTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG5hdiBpdGVtLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBkZXNjcmlwdG9yIGEgZGVzY3JpcHRvciBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRvci5uYW1lIG5hbWUgb2YgdGhlIG5hdiBpdGVtXG4gICAqIEBwYXJhbSB7Q29sbGFifSBkZXNjcmlwdG9yLmNvbGxhYklkIGNvbGxhYiBpbiB3aGljaCB0byBhZGQgdGhlIGl0ZW0gaW4uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdG9yLmFwcCBhcHAgbmFtZSBsaW5rZWQgdG8gdGhlIG5hdiBpdGVtXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBbY29udGV4dF0gdGhlIGN1cnJlbnQgcnVuIGNvbnRleHRcbiAgICogQHBhcmFtIHtvYmplY3R9IFtjb250ZXh0LmNvbGxhYl0gYSBjb2xsYWIgaW5zdGFuY2UgY3JlYXRlZCBwcmV2aW91c2x5XG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgYSBOYXZJdGVtIGluc3RhbmNlXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVOYXZJdGVtKGRlc2NyaXB0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgY29sbGFiSWQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLmNvbGxhYklkKSB8fFxuICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0LmNvbGxhYi5pZCk7XG4gICAgfTtcbiAgICAkbG9nLmRlYnVnKCdDcmVhdGUgbmF2IGl0ZW0nLCBkZXNjcmlwdG9yLCBjb250ZXh0KTtcbiAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLmZpbmRPbmUoe1xuICAgICAgdGl0bGU6IGRlc2NyaXB0b3IuYXBwXG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihhcHApIHtcbiAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuZ2V0Um9vdChjb2xsYWJJZCgpKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocGFyZW50SXRlbSkge1xuICAgICAgICB2YXIgbmF2ID0gbmV3IGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtKHtcbiAgICAgICAgICBjb2xsYWJJZDogY29sbGFiSWQoKSxcbiAgICAgICAgICBuYW1lOiBkZXNjcmlwdG9yLm5hbWUsXG4gICAgICAgICAgYXBwSWQ6IGFwcC5pZCxcbiAgICAgICAgICBwYXJlbnRJZDogcGFyZW50SXRlbS5pZFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5hZGROb2RlKGNvbGxhYklkKCksIG5hdik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZU5hdkl0ZW0oXG4gICRsb2csXG4gICRxLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2p1cHl0ZXJOb3RlYm9vaycsIGp1cHl0ZXJOb3RlYm9vayk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBKdXB5dGVyTm90ZWJvb2sgbmF2aWdhdGlvbiBpdGVtLlxuICAgKlxuICAgKiBUaGUgbm90ZWJvb2sgYWRkIHRoZSBOYXZJdGVtIGluc3RhbmNlIGluIHRoZSBjb250ZXh0XG4gICAqIHVzaW5nIHRoZSBrZXkgYGBqdXB5dGVyTm90ZWJvb2tgYC5cbiAgICpcbiAgICogQHBhcmFtICB7b2JqZWN0fSBkZXNjcmlwdG9yIGNhbiBjb250YWluIGEgaXB5bmIgZmlsZSBpZGVudGlmaWVyXG4gICAqIEBwYXJhbSAge29iamVjdH0gW2Rlc2NyaXB0b3IuZW50aXR5XSBuYW1lIG9mIGFuIGVudGl0aWVzIGluIGBgY29udGV4dC5zdG9yYWdlYGBcbiAgICogQHBhcmFtICB7c3RyaW5nfSBjb250ZXh0IG11c3QgY29udGFpbiBhIHN0b3JhZ2UgZW50cnkgd2l0aCB0aGUgbmFtZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5lZCBpbiBkZXNjcmlwdG9yLmVudGl0eSBpZiBwcmVzZW50XG4gICAqIEByZXR1cm4ge05hdkl0ZW19IHRoZSBub3RlYm9vayBuYXZpdGVtXG4gICAqL1xuICBmdW5jdGlvbiBqdXB5dGVyTm90ZWJvb2soZGVzY3JpcHRvciwgY29udGV4dCkge1xuICAgICRsb2cuZGVidWcoJ2p1cHl0ZXJOb3RlYm9vayBpcyBub3QgaW1wbGVtZW50ZWQnKTtcbiAgICAkbG9nLmRlYnVnKGRlc2NyaXB0b3IsIGNvbnRleHQpO1xuICAgIHJldHVybiAkcS53aGVuKHt9KTtcbiAgfVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlNlcnZpY2UoXG4gICRsb2csICRxLCBoYnBFbnRpdHlTdG9yZSxcbiAgaGJwRXJyb3JTZXJ2aWNlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ3N0b3JhZ2UnLCBzdG9yYWdlKTtcblxuICAvKipcbiAgICogUmV0dXJuIGEgSGJwRXJyb3Igd2hlbiBhIHBhcmFtZXRlciBpcyBtaXNzaW5nLlxuICAgKlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9IGtleSAgICBuYW1lIG9mIHRoZSBrZXlcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcgdGhlIGludmFsaWQgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICogQHJldHVybiB7SGJwRXJyb3J9ICAgICAgYSBIYnBFcnJvciBpbnN0YW5jZVxuICAgKi9cbiAgZnVuY3Rpb24gbWlzc2luZ0RhdGFFcnJvcihrZXksIGNvbmZpZykge1xuICAgIHJldHVybiBoYnBFcnJvclNlcnZpY2Uoe1xuICAgICAgdHlwZTogJ0tleUVycm9yJyxcbiAgICAgIG1lc3NhZ2U6ICdNaXNzaW5nIGAnICsga2V5ICsgJ2Aga2V5IGluIGNvbmZpZycsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIGNvbmZpZzogY29uZmlnXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRW5zdXJlIHRoYXQgYWxsIHBhcmFtZXRlcnMgbGlzdGVkIGFmdGVyIGNvbmZpZyBhcmUgcHJlc2VudHNcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcgdGFzayBkZXNjcmlwdG9yXG4gICAqIEByZXR1cm4ge29iamVjdH0gY3JlYXRlZCBlbnRpdGllc1xuICAgKi9cbiAgZnVuY3Rpb24gZW5zdXJlUGFyYW1ldGVycyhjb25maWcpIHtcbiAgICB2YXIgcGFyYW1ldGVycyA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2UoMSk7XG4gICAgZm9yICh2YXIgcCBpbiBwYXJhbWV0ZXJzKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc1VuZGVmaW5lZChwYXJhbWV0ZXJzW3BdKSkge1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KG1pc3NpbmdEYXRhRXJyb3IocCwgY29uZmlnKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAkcS53aGVuKGNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogQ29weSBmaWxlcyBhbmQgZm9sZGVycyB0byB0aGUgZGVzdGluYXRpb24gY29sbGFiIHN0b3JhZ2UuXG4gICAqXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5LmhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IuVGFza3NcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyB0aGUgdGFzayBjb25maWd1cmF0aW9uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcuc3RvcmFnZSBhIG9iamVjdCB3aGVyZSBrZXlzIGFyZSB0aGUgZmlsZSBwYXRoIGluIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IGNvbGxhYiBhbmQgdmFsdWUgYXJlIHRoZSBVVUlEIG9mIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5IHRvIGNvcHkgYXQgdGhpcyBwYXRoLlxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnLmNvbGxhYiB0aGUgY29sbGFiIGluIHdoaWNoIGVudGl0aWVzIHdpbGwgYmUgY29waWVkXG4gICAqIEByZXR1cm4ge29iamVjdH0gY3JlYXRlZCBlbnRpdGllcyB3aGVyZSBrZXlzIGFyZSB0aGUgc2FtZSBhcyBwcm92aWRlZCBpblxuICAgKiAgICAgICAgICAgICAgICAgIGNvbmZpZy5zdG9yYWdlXG4gICAqL1xuICBmdW5jdGlvbiBzdG9yYWdlKGNvbmZpZykge1xuICAgIHJldHVybiBlbnN1cmVQYXJhbWV0ZXJzKGNvbmZpZywgJ3N0b3JhZ2UnLCAnY29sbGFiJykudGhlbihmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoYnBFbnRpdHlTdG9yZS5nZXRQYXRoKCcvJyArIGNvbmZpZy5jb2xsYWIudGl0bGUpXG4gICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0RW50aXR5KSB7XG4gICAgICAgIHZhciBwcm9taXNlcyA9IHt9O1xuICAgICAgICBhbmd1bGFyLmZvckVhY2goY29uZmlnLnN0b3JhZ2UsIGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgICAgY29uc29sZS5sb2codmFsdWUsIGFuZ3VsYXIuaXNTdHJpbmcodmFsdWUpKTtcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHByb21pc2VzW25hbWVdID0gKGhicEVudGl0eVN0b3JlLmNvcHkodmFsdWUsIHByb2plY3RFbnRpdHkuX3V1aWQpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGxvZy53YXJuKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24gZm9yIHN0b3JhZ2UgdGFzaycsIGNvbmZpZyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc29sZS5sb2cocHJvbWlzZXMsIGNvbmZpZy5zdG9yYWdlKTtcbiAgICAgICAgcmV0dXJuICRxLmFsbChwcm9taXNlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeVxuICogQGRlc2NcbiAqIFByb3ZpZGVzIGFuZ3VsYXIgc2VydmljZXMgdG8gd29yayB3aXRoIEhCUCBDb2xsYWJvcmF0b3J5LlxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeScsIFtcbiAgJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZSdcbl0pO1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
