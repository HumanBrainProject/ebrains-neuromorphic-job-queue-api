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
 * New tasks can be added by calling ``hbpCollaboratoryAutomator.register``.
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
.factory('hbpCollaboratoryAutomator', ['$q', function hbpCollaboratoryAutomator($q) {
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
   * @namespace Tasks
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @desc
   * Available tasks.
   */

  /**
   * Create a new task.
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @param {object} config a configuration object that will determine
   *                        which task to run and in which order.
   * @return {Task} - task
   */
  function task(config) {
    return new Task(config);
  }

  /**
   * @class Task
   * @desc
   * Instantiate a task given the given `config`.
   * The task can then be run using the `run()` instance method.
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator
   * @param {object} config task configuration
   */
  function Task(config) {
    this.state = 'idle';
    this.config = config;
  }

  Task.prototype = {
    /**
     * Launch the task.
     * @return {Promise} promise to return the result of the task
     */
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
   * @param {object} options - Parameters to create the collab
   * @param {string} options.name - Name of the collab
   * @param {string} options.description - Description in less than 140 characters
   *                                       of the collab
   * @param {string} options.privacy - 'private' or 'public'. Notes that only
   *                                   HBP Members can create private collab
   * @param {Array|object} nav - one or more nav item descriptor that will be
   *                           passed to the nav task.
   * @return {Promise} - Will retrieve a collab or a HbpError
   */
  function createCollab(options) {
    var attr = hbpCollaboratoryAutomator.extractAttributes(
      options,
      ['title', 'content', 'private']
    );
    $log.debug('Create collab', options);
    return hbpCollabStore.create(attr).then(function(collab) {
      return $q.when(createNavItems(collab, options.nav)).then(function() {
        return collab;
      });
    });

    /**
     * Create navigation items for the given collab using
     * information from navConfig.
     *
     * @param  {Collab} collab    [description]
     * @param  {Array|object} navConfig configuration for one or more navigation
     *                        item.
     * @return {Promise}      resolve once every nav item has been created.
     * @private
     */
    function createNavItems(collab, navConfig) {
      if (!navConfig) {
        return;
      }
      if (!angular.isArray(navConfig)) {
        navConfig = [navConfig];
      }
      var promise = $q.when();
      angular.forEach(navConfig, function(n) {
        promise.then(function() {
          return hbpCollaboratoryAutomator.task(
            {nav: angular.extend({collab: collab}, n)}
          ).run();
        });
      });
      return promise;
    }
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
   * @param {object} config a config description
   * @param {string} config.name name of the nav item
   * @param {Collab} config.collab collab in which to add the item in.
   * @param {string} config.app app name linked to the nav item
   * @return {Promise} promise of a NavItem instance
   */
  function createNavItem(config) {
    var collab = config.collab;
    $log.debug('Create nav item', config);
    return hbpCollaboratoryAppStore.findOne({
      title: config.app
    })
    .then(function(app) {
      return hbpCollaboratoryNavStore.getRoot(collab.id)
      .then(function(parentItem) {
        var nav = new hbpCollaboratoryNavStore.NavItem({
          collabId: collab.id,
          name: config.name,
          appId: app.id,
          parentId: parentItem.id
        });
        return hbpCollaboratoryNavStore.addNode(collab.id, nav);
      });
    });
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['$log', '$q', 'hbpCollabStore', 'hbpCollaboratoryAutomator', function createCollabService(
  $log, $q, hbpCollabStore,
  hbpCollaboratoryAutomator
) {
  hbpCollaboratoryAutomator.registerHandler('cp', copy);

  /**
   * Copy a file or recursively a folder
   * @memberof hbpCollaboratory.hbpCollaboratoryAutomator.Tasks
   * @param {array/object}  config a config description
   * @return {array/entity} created entities
   */
  function copy(config) {
    if (!angular.isArray(config)) {
      config = [];
    }
    return null;
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLWNvbGxhYi5qcyIsImF1dG9tYXRvci90YXNrcy9jcmVhdGUtbmF2LWl0ZW0uanMiLCJhdXRvbWF0b3IvdGFza3Mvc3RvcmFnZS5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBNkJBLFFBQVEsT0FBTyw2QkFBNkI7RUFDMUM7RUFDQTtFQUNBO0VBQ0E7RUFDQTs7Q0FFRCxRQUFRLG9DQUE2QixTQUFTLDBCQUEwQixJQUFJO0VBQzNFLElBQUksV0FBVzs7Ozs7Ozs7RUFRZixTQUFTLGdCQUFnQixNQUFNLElBQUk7SUFDakMsU0FBUyxRQUFROzs7Ozs7Ozs7Ozs7Ozs7OztFQWlCbkIsU0FBUyxLQUFLLFFBQVE7SUFDcEIsT0FBTyxJQUFJLEtBQUs7Ozs7Ozs7Ozs7O0VBV2xCLFNBQVMsS0FBSyxRQUFRO0lBQ3BCLEtBQUssUUFBUTtJQUNiLEtBQUssU0FBUzs7O0VBR2hCLEtBQUssWUFBWTs7Ozs7SUFLZixLQUFLLFdBQVc7TUFDZCxJQUFJLE9BQU87TUFDWCxLQUFLLFFBQVE7TUFDYixLQUFLLFdBQVc7TUFDaEIsS0FBSyxTQUFTO01BQ2QsSUFBSSxVQUFVO01BQ2QsUUFBUSxRQUFRLEtBQUssUUFBUSxTQUFTLE1BQU0sTUFBTTtRQUNoRCxLQUFLLFNBQVMsUUFBUSxTQUFTLE1BQU07U0FDcEMsS0FBSyxTQUFTLEdBQUc7OztVQUdoQixRQUFRLFFBQVE7O1NBRWpCLE1BQU0sU0FBUyxLQUFLO1VBQ25CLEtBQUssT0FBTyxRQUFRO1VBQ3BCLE9BQU8sR0FBRyxPQUFPOzs7O01BSXJCLE9BQU8sR0FBRyxJQUFJLEtBQUs7T0FDbEIsS0FBSyxXQUFXO1FBQ2YsS0FBSyxRQUFRO1FBQ2IsT0FBTzs7T0FFUixN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QVMsWUFBWTtRQUN6QixJQUFJLE1BQU0sSUFBSSx5QkFBeUIsUUFBUTtVQUM3QyxVQUFVLE9BQU87VUFDakIsTUFBTSxPQUFPO1VBQ2IsT0FBTyxJQUFJO1VBQ1gsVUFBVSxXQUFXOztRQUV2QixPQUFPLHlCQUF5QixRQUFRLE9BQU8sSUFBSTs7Ozs7QUFLM0Q7QUN0Q0EsUUFBUSxPQUFPO0NBQ2Qsa0VBQUksU0FBUztFQUNaLE1BQU0sSUFBSTtFQUNWO0VBQ0E7RUFDQSwwQkFBMEIsZ0JBQWdCLE1BQU07Ozs7Ozs7O0VBUWhELFNBQVMsS0FBSyxRQUFRO0lBQ3BCLElBQUksQ0FBQyxRQUFRLFFBQVEsU0FBUztNQUM1QixTQUFTOztJQUVYLE9BQU87OztBQUdYO0FDcEJBOzs7OztBQUtBLFFBQVEsT0FBTyxvQkFBb0I7RUFDakM7RUFDQTtFQUNBOztBQUVGIiwiZmlsZSI6ImFuZ3VsYXItaGJwLWNvbGxhYm9yYXRvcnkuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBuYW1lc3BhY2UgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlcbiAqIEBkZXNjXG4gKiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGlzIGFuIEFuZ3VsYXJKUyBmYWN0b3J5IHRoYXRcbiAqIHByb3ZpZGUgdGFzayBhdXRvbWF0aW9uIHRvIGFjY29tcGxpc2ggYSBzZXF1ZW5jZSBvZlxuICogY29tbW9uIG9wZXJhdGlvbiBpbiBDb2xsYWJvcmF0b3J5LlxuICpcbiAqIEhvdyB0byBhZGQgbmV3IHRhc2tzXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIE5ldyB0YXNrcyBjYW4gYmUgYWRkZWQgYnkgY2FsbGluZyBgYGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJgYC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gJHEgaW5qZWN0ZWQgZGVwZW5kZW5jeVxuICogQHJldHVybiB7b2JqZWN0fSBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yIGFuZ3VsYXIgc2VydmljZVxuICogQGV4YW1wbGUgPGNhcHRpb24+Q3JlYXRlIGEgQ29sbGFiIHdpdGggYSBmZXcgbmF2aWdhdGlvbiBpdGVtczwvY2FwdGlvbj5cbiAqIC8vIENyZWF0ZSBhIENvbGxhYiB3aXRoIGEgZmV3IG5hdmlnYXRpb24gaXRlbXMuXG4gKiBhbmd1bGFyLm1vZHVsZSgnTXlNb2R1bGUnLCBbJ2hicENvbGxhYm9yYXRvcnknXSlcbiAqIC5ydW4oZnVuY3Rpb24oaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvciwgJGxvZykge1xuICogICB2YXIgY29uZmlnID0ge1xuICogICAgIHRpdGxlOiAnTXkgQ3VzdG9tIENvbGxhYicsXG4gKiAgICAgY29udGVudDogJ015IENvbGxhYiBDb250ZW50JyxcbiAqICAgICBwcml2YXRlOiBmYWxzZVxuICogICB9XG4gKiAgIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IudGFzayhjb25maWcpLnJ1bigpLnRoZW4oZnVuY3Rpb24oY29sbGFiKSB7XG4gKiAgIFx0ICRsb2cuaW5mbygnQ3JlYXRlZCBDb2xsYWInLCBjb2xsYWIpO1xuICogICB9KVxuICogfSlcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InLCBbXG4gICdiYnBDb25maWcnLFxuICAnaGJwQ29tbW9uJyxcbiAgJ2hicERvY3VtZW50Q2xpZW50JyxcbiAgJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsXG4gICdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnXG5dKVxuLmZhY3RvcnkoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InLCBmdW5jdGlvbiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yKCRxKSB7XG4gIHZhciBoYW5kbGVycyA9IHt9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiB0YXNrIG5hbWUuXG4gICAqIEBwYXJhbSAge3N0cmluZ30gICBuYW1lIGhhbmRsZSBhY3Rpb25zIHdpdGggdGhlIHNwZWNpZmllZCBuYW1lXG4gICAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0IHRoZSBjdXJyZW50IGNvbnRleHQgaW5cbiAgICogICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlci5cbiAgICovXG4gIGZ1bmN0aW9uIHJlZ2lzdGVySGFuZGxlcihuYW1lLCBmbikge1xuICAgIGhhbmRsZXJzW25hbWVdID0gZm47XG4gIH1cblxuICAvKipcbiAgICogQG5hbWVzcGFjZSBUYXNrc1xuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBkZXNjXG4gICAqIEF2YWlsYWJsZSB0YXNrcy5cbiAgICovXG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyB0YXNrLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgYSBjb25maWd1cmF0aW9uIG9iamVjdCB0aGF0IHdpbGwgZGV0ZXJtaW5lXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgd2hpY2ggdGFzayB0byBydW4gYW5kIGluIHdoaWNoIG9yZGVyLlxuICAgKiBAcmV0dXJuIHtUYXNrfSAtIHRhc2tcbiAgICovXG4gIGZ1bmN0aW9uIHRhc2soY29uZmlnKSB7XG4gICAgcmV0dXJuIG5ldyBUYXNrKGNvbmZpZyk7XG4gIH1cblxuICAvKipcbiAgICogQGNsYXNzIFRhc2tcbiAgICogQGRlc2NcbiAgICogSW5zdGFudGlhdGUgYSB0YXNrIGdpdmVuIHRoZSBnaXZlbiBgY29uZmlnYC5cbiAgICogVGhlIHRhc2sgY2FuIHRoZW4gYmUgcnVuIHVzaW5nIHRoZSBgcnVuKClgIGluc3RhbmNlIG1ldGhvZC5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIHRhc2sgY29uZmlndXJhdGlvblxuICAgKi9cbiAgZnVuY3Rpb24gVGFzayhjb25maWcpIHtcbiAgICB0aGlzLnN0YXRlID0gJ2lkbGUnO1xuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xuICB9XG5cbiAgVGFzay5wcm90b3R5cGUgPSB7XG4gICAgLyoqXG4gICAgICogTGF1bmNoIHRoZSB0YXNrLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2UgdG8gcmV0dXJuIHRoZSByZXN1bHQgb2YgdGhlIHRhc2tcbiAgICAgKi9cbiAgICBydW46IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc2VsZi5zdGF0ZSA9ICdwcm9ncmVzcyc7XG4gICAgICBzZWxmLnByb21pc2VzID0ge307XG4gICAgICBzZWxmLmVycm9ycyA9IHt9O1xuICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLmNvbmZpZywgZnVuY3Rpb24oZGF0YSwgbmFtZSkge1xuICAgICAgICBzZWxmLnByb21pc2VzW25hbWVdID0gaGFuZGxlcnNbbmFtZV0oZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocikge1xuICAgICAgICAgIC8vIGxldCBzdGlsbCBndWVzcyB0aGUgcmVzdWx0c1xuICAgICAgICAgIC8vIGV2ZW4gaW4gY2FzZSBhbiBlcnJvciBvY2N1cnMuXG4gICAgICAgICAgcmVzdWx0c1tuYW1lXSA9IHI7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBzZWxmLmVycm9yc1tuYW1lXSA9IGVycjtcbiAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiAkcS5hbGwodGhpcy5wcm9taXNlcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnN0YXRlID0gJ3N1Y2Nlc3MnO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSAnZXJyb3InO1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycik7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgdGhhdCBvbmx5IGNvbnRhaW5zIGF0dHJpYnV0ZXNcbiAgICogZnJvbSB0aGUgYGF0dHJzYCBsaXN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbmZpZyBrZXktdmFsdWUgc3RvcmVcbiAgICogQHBhcmFtICB7QXJyYXl9IGF0dHJzICAgYSBsaXN0IG9mIGtleXMgdG8gZXh0cmFjdCBmcm9tIGBjb25maWdgXG4gICAqIEByZXR1cm4ge29iamVjdH0gICAgICAgIGtleS12YWx1ZSBzdG9yZSBjb250YWluaW5nIG9ubHkga2V5cyBmcm9tIGF0dHJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kIGluIGBjb25maWdgXG4gICAqL1xuICBmdW5jdGlvbiBleHRyYWN0QXR0cmlidXRlcyhjb25maWcsIGF0dHJzKSB7XG4gICAgdmFyIHIgPSB7fTtcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChjb25maWdbYV0pKSB7XG4gICAgICAgIHJbYV0gPSBjb25maWdbYV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGhhbmRsZXJzOiBoYW5kbGVycyxcbiAgICByZWdpc3RlckhhbmRsZXI6IHJlZ2lzdGVySGFuZGxlcixcbiAgICB0YXNrOiB0YXNrLFxuICAgIGV4dHJhY3RBdHRyaWJ1dGVzOiBleHRyYWN0QXR0cmlidXRlc1xuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOiAwICovXG5cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLCBbJ2JicENvbmZpZycsICdoYnBDb21tb24nXSlcbi5jb25zdGFudCgnZm9sZGVyQXBwSWQnLCAnX19jb2xsYWJfZm9sZGVyX18nKVxuLnNlcnZpY2UoJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsIGZ1bmN0aW9uKFxuICAkcSwgJGh0dHAsICRjYWNoZUZhY3RvcnksXG4gIGhicEVycm9yU2VydmljZSwgYmJwQ29uZmlnLCBoYnBVdGlsXG4pIHtcbiAgdmFyIGFwcHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ19fYXBwc0NhY2hlX18nKTtcbiAgdmFyIHVybEJhc2UgPSBiYnBDb25maWcuZ2V0KCdhcGkuY29sbGFiLnYwJykgKyAnL2V4dGVuc2lvbi8nO1xuICB2YXIgYXBwcyA9IG51bGw7XG5cbiAgdmFyIEFwcCA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRycywgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gIH07XG4gIEFwcC5wcm90b3R5cGUgPSB7XG4gICAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5kZXNjcmlwdGlvbixcbiAgICAgICAgZWRpdF91cmw6IHRoaXMuZWRpdFVybCxcbiAgICAgICAgcnVuX3VybDogdGhpcy5ydW5VcmwsXG4gICAgICAgIHRpdGxlOiB0aGlzLnRpdGxlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbiAgQXBwLmZyb21Kc29uID0gZnVuY3Rpb24oanNvbikge1xuICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgcmV0dXJuIG5ldyBBcHAoe1xuICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICBkZWxldGVkOiBqc29uLmRlbGV0ZWQsXG4gICAgICBkZXNjcmlwdGlvbjoganNvbi5kZXNjcmlwdGlvbixcbiAgICAgIGVkaXRVcmw6IGpzb24uZWRpdF91cmwsXG4gICAgICBydW5Vcmw6IGpzb24ucnVuX3VybCxcbiAgICAgIHRpdGxlOiBqc29uLnRpdGxlLFxuICAgICAgY3JlYXRlZEJ5OiBqc29uLmNyZWF0ZWRfYnlcbiAgICB9KTtcbiAgfTtcblxuICBhcHBzQ2FjaGUucHV0KCdfX2NvbGxhYl9mb2xkZXJfXycsIHtcbiAgICBpZDogJ19fY29sbGFiX2ZvbGRlcl9fJyxcbiAgICB0aXRsZTogJ0ZvbGRlcidcbiAgfSk7XG5cbiAgdmFyIGxvYWRBbGwgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbihycykge1xuICAgICAgaWYgKHJzLmhhc05leHQpIHtcbiAgICAgICAgcmV0dXJuIGxvYWRBbGwocnMubmV4dCgpKTtcbiAgICAgIH1cbiAgICAgIGFwcHMgPSBycy5yZXN1bHRzO1xuICAgICAgcmV0dXJuIGFwcHM7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGdldEFwcHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWFwcHMpIHtcbiAgICAgIHJldHVybiBsb2FkQWxsKGhicFV0aWwucGFnaW5hdGVkUmVzdWx0U2V0KCRodHRwLmdldCh1cmxCYXNlKSwge1xuICAgICAgICBmYWN0b3J5OiBBcHAuZnJvbUpzb25cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuICRxLndoZW4oYXBwcyk7XG4gIH07XG5cbiAgdmFyIGdldEJ5SWQgPSBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaWQpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKG51bGwpO1xuICAgIH1cbiAgICB2YXIgZXh0ID0gYXBwc0NhY2hlLmdldChpZCk7XG4gICAgaWYgKGV4dCkge1xuICAgICAgcmV0dXJuICRxLndoZW4oZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuICRodHRwLmdldCh1cmxCYXNlICsgaWQgKyAnLycpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBhcHBzQ2FjaGUucHV0KGlkLCBBcHAuZnJvbUpzb24ocmVzLmRhdGEpKTtcbiAgICAgIHJldHVybiBhcHBzQ2FjaGUuZ2V0KGlkKTtcbiAgICB9LCBmdW5jdGlvbihyZXMpIHtcbiAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmh0dHBFcnJvcihyZXMpKTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZmluZE9uZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KHVybEJhc2UsIHtwYXJhbXM6IG9wdGlvbnN9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgdmFyIHJlc3VsdHMgPSByZXMuZGF0YS5yZXN1bHRzO1xuICAgICAgLy8gUmVqZWN0IGlmIG1vcmUgdGhhbiBvbmUgcmVzdWx0c1xuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5lcnJvcih7XG4gICAgICAgICAgdHlwZTogJ1Rvb01hbnlSZXN1bHRzJyxcbiAgICAgICAgICBtZXNzYWdlOiAnTXVsdGlwbGUgYXBwcyBoYXMgYmVlbiByZXRyaWV2ZWQgJyArXG4gICAgICAgICAgICAgICAgICAgJ3doZW4gb25seSBvbmUgd2FzIGV4cGVjdGVkLicsXG4gICAgICAgICAgZGF0YTogcmVzLmRhdGFcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgLy8gTnVsbCB3aGVuIG5vIHJlc3VsdFxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gQnVpbGQgdGhlIGFwcCBpZiBleGFjdGx5IG9uZSByZXN1bHRcbiAgICAgIHZhciBhcHAgPSBBcHAuZnJvbUpzb24ocmVzdWx0c1swXSk7XG4gICAgICBhcHBzQ2FjaGUucHV0KGFwcC5pZCwgYXBwKTtcbiAgICAgIHJldHVybiBhcHA7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGxpc3Q6IGdldEFwcHMsXG4gICAgZ2V0QnlJZDogZ2V0QnlJZCxcbiAgICBmaW5kT25lOiBmaW5kT25lXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6WzIsIHtwcm9wZXJ0aWVzOiBcIm5ldmVyXCJ9XSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJywgWydoYnBDb21tb24nLCAndXVpZDQnXSlcbi5zZXJ2aWNlKCdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLCBmdW5jdGlvbigkcSwgJGh0dHAsICRsb2csXG4gICAgJGNhY2hlRmFjdG9yeSwgJHRpbWVvdXQsIG9yZGVyQnlGaWx0ZXIsIHV1aWQ0LFxuICAgIGhicFV0aWwsIGJicENvbmZpZykge1xuICB2YXIgY29sbGFiQXBpVXJsID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9jb2xsYWIvJztcbiAgLy8gYSBjYWNoZSB3aXRoIGluZGl2aWR1YWwgbmF2IGl0ZW1zXG4gIHZhciBjYWNoZU5hdkl0ZW1zID0gJGNhY2hlRmFjdG9yeSgnbmF2SXRlbScpO1xuXG4gIC8vIGEgY2FjaGUgd2l0aCB0aGUgcHJvbWlzZXMgb2YgZWFjaCBjb2xsYWIncyBuYXYgdHJlZSByb290XG4gIHZhciBjYWNoZU5hdlJvb3RzID0gJGNhY2hlRmFjdG9yeSgnbmF2Um9vdCcpO1xuXG4gIHZhciBOYXZJdGVtID0gZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0ciwgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jb250ZXh0KSkge1xuICAgICAgdGhpcy5jb250ZXh0ID0gdXVpZDQuZ2VuZXJhdGUoKTtcbiAgICB9XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jaGlsZHJlbikpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB9XG4gIH07XG4gIE5hdkl0ZW0ucHJvdG90eXBlID0ge1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGFwcF9pZDogdGhpcy5hcHBJZCxcbiAgICAgICAgY29sbGFiOiB0aGlzLmNvbGxhYklkLFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICAgICAgb3JkZXJfaW5kZXg6IHRoaXMub3JkZXIsXG4gICAgICAgIHR5cGU6IHRoaXMudHlwZSB8fCAodGhpcy5mb2xkZXIgPyAnRk8nIDogJ0lUJyksXG4gICAgICAgIHBhcmVudDogdGhpcy5wYXJlbnRJZFxuICAgICAgfTtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChbXG4gICAgICAgICdpZCcsICduYW1lJywgJ2NoaWxkcmVuJywgJ2NvbnRleHQnLFxuICAgICAgICAnY29sbGFiSWQnLCAnYXBwSWQnLCAnb3JkZXInLCAnZm9sZGVyJyxcbiAgICAgICAgJ3BhcmVudElkJywgJ3R5cGUnXG4gICAgICBdLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRyc1thXSkpIHtcbiAgICAgICAgICB0aGlzW2FdID0gYXR0cnNbYV07XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGVuc3VyZUNhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnB1dChrZXkodGhpcy5jb2xsYWJJZCwgdGhpcy5pZCksIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogTWFuYWdlIGBhY2NgIGFjY3VtdWxhdG9yIHdpdGggYWxsIHRoZSBkYXRhIGZyb20ganNvbkFycmF5IGFuZCByZXR1cm4gaXQuXG4gICAqXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgIHRoZSBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7YXJyYXl9IGpzb25BcnJheSBkZXNjcmlwdGlvbiBvZiB0aGUgY2hpbGRyZW5cbiAgICogQHBhcmFtICB7QXJyYXl9IGFjYyAgICAgICB0aGUgYWNjdW11bGF0b3JcbiAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgICB0aGUgY2hpbGRyZW5cbiAgICovXG4gIGZ1bmN0aW9uIGNoaWxkcmVuRnJvbUpzb24oY29sbGFiSWQsIGpzb25BcnJheSwgYWNjKSB7XG4gICAgYWNjID0gYWNjIHx8IFtdO1xuICAgIC8vIGFuIHVuZGVmaW5lZCBhcnJheSBtZWFucyB3ZSBhYm9ydCB0aGUgcHJvY2Vzc1xuICAgIC8vIHdoZXJlIGFuIGVtcHR5IGFycmF5IHdpbGwgZW5zdXJlIHRoZSByZXN1bHRpbmcgYXJyYXlcbiAgICAvLyBpcyBlbXB0eSBhcyB3ZWxsLlxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGpzb25BcnJheSkpIHtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuXG4gICAgYWNjLmxlbmd0aCA9IDA7XG4gICAgYW5ndWxhci5mb3JFYWNoKGpzb25BcnJheSwgZnVuY3Rpb24oanNvbikge1xuICAgICAgYWNjLnB1c2goTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwganNvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG4gIH1cbiAgTmF2SXRlbS5mcm9tSnNvbiA9IGZ1bmN0aW9uKGNvbGxhYklkLCBqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICB2YXIgYXR0cnMgPSB7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGFwcElkOiBqc29uLmFwcF9pZCxcbiAgICAgIGNvbGxhYklkOiBjb2xsYWJJZCxcbiAgICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICAgIGNvbnRleHQ6IGpzb24uY29udGV4dCxcbiAgICAgIG9yZGVyOiBqc29uLm9yZGVyX2luZGV4LFxuICAgICAgZm9sZGVyOiBqc29uLnR5cGUgPT09ICdGTycsXG4gICAgICB0eXBlOiBqc29uLnR5cGUsXG4gICAgICBwYXJlbnRJZDoganNvbi5wYXJlbnQsXG4gICAgICBjaGlsZHJlbjogY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbi5jaGlsZHJlbilcbiAgICB9O1xuICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBhdHRycy5pZCk7XG4gICAgdmFyIGNhY2hlZCA9IGNhY2hlTmF2SXRlbXMuZ2V0KGspO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIHJldHVybiBjYWNoZWQudXBkYXRlKGF0dHJzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBOYXZJdGVtKGF0dHJzKS5lbnN1cmVDYWNoZWQoKTtcbiAgfTtcblxuICB2YXIgZ2V0Um9vdCA9IGZ1bmN0aW9uKGNvbGxhYklkKSB7XG4gICAgdmFyIHRyZWVQcm9taXNlID0gY2FjaGVOYXZSb290cy5nZXQoY29sbGFiSWQpO1xuXG4gICAgaWYgKCF0cmVlUHJvbWlzZSkge1xuICAgICAgdHJlZVByb21pc2UgPSAkaHR0cC5nZXQoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi9hbGwvJykudGhlbihcbiAgICAgICAgZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgIHZhciByb290O1xuICAgICAgICAgIHZhciBpO1xuICAgICAgICAgIHZhciBpdGVtO1xuICAgICAgICAgIHZhciBkYXRhID0gb3JkZXJCeUZpbHRlcihyZXNwLmRhdGEsICcrb3JkZXJfaW5kZXgnKTtcblxuICAgICAgICAgIC8vIGZpbGwgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgZm9yIChpID0gMDsgaSAhPT0gZGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaXRlbSA9IE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIGRhdGFbaV0pO1xuICAgICAgICAgICAgaWYgKGl0ZW0uY29udGV4dCA9PT0gJ3Jvb3QnKSB7XG4gICAgICAgICAgICAgIHJvb3QgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGxpbmsgY2hpbGRyZW4gYW5kIHBhcmVudHNcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBkYXRhW2ldLmlkKSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5wYXJlbnRJZCkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBpdGVtLnBhcmVudElkKSk7XG4gICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByb290O1xuICAgICAgICB9LFxuICAgICAgICBoYnBVdGlsLmZlcnJcbiAgICAgICk7XG5cbiAgICAgIGNhY2hlTmF2Um9vdHMucHV0KGNvbGxhYklkLCB0cmVlUHJvbWlzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWVQcm9taXNlO1xuICB9O1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbihjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGdldFJvb3QoY29sbGFiSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgayA9IGtleShjb2xsYWJJZCwgbm9kZUlkKTtcbiAgICAgIHZhciBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG5cbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAkbG9nLmVycm9yKCd1bmtub3duIG5hdiBpdGVtJywgayk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBhZGROb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAucG9zdChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycsIG5hdkl0ZW0udG9Kc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuICAgICAgcmV0dXJuIE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIHJlc3AuZGF0YSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgZGVsZXRlTm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgcmV0dXJuICRodHRwLmRlbGV0ZShjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgKyBuYXZJdGVtLmlkICsgJy8nKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgY2FjaGVOYXZJdGVtcy5yZW1vdmUoa2V5KGNvbGxhYklkLCBuYXZJdGVtLmlkKSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgdXBkYXRlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICBuYXZJdGVtLmNvbGxhYklkID0gY29sbGFiSWQ7XG4gICAgcmV0dXJuICRodHRwLnB1dChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgK1xuICAgICAgbmF2SXRlbS5pZCArICcvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8vIG9yZGVyaW5nIG9wZXJhdGlvbiBuZWVkcyB0byBiZSBnbG9iYWxseSBxdWV1ZWQgdG8gZW5zdXJlIGNvbnNpc3RlbmN5LlxuICB2YXIgaW5zZXJ0UXVldWUgPSAkcS53aGVuKCk7XG5cbiAgLyoqXG4gICAqIEluc2VydCBub2RlIGluIHRoZSB0aHJlZS5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgIGlkIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSAgICBOYXYgaXRlbSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBwYXJlbnRJdGVtIHBhcmVudCBpdGVtXG4gICAqIEBwYXJhbSAge2ludH0gaW5zZXJ0QXQgICBhZGQgdG8gdGhlIG1lbnVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIGEgcHJvbWlzZSB0aGF0IHdpbGxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGUgdXBkYXRlIG5hdiBpdGVtXG4gICAqL1xuICBmdW5jdGlvbiBpbnNlcnROb2RlKGNvbGxhYklkLCBuYXZJdGVtLCBwYXJlbnRJdGVtLCBpbnNlcnRBdCkge1xuICAgIHJldHVybiBpbnNlcnRRdWV1ZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbmF2SXRlbS5vcmRlciA9IGluc2VydEF0ICsgMTsgLy8gZmlyc3QgaXRlbSBvcmRlcl9pbmRleCBtdXN0IGJlIDFcbiAgICAgIG5hdkl0ZW0ucGFyZW50SWQgPSBwYXJlbnRJdGVtLmlkO1xuICAgICAgcmV0dXJuIHVwZGF0ZShjb2xsYWJJZCwgbmF2SXRlbSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGtleSBmb3IgY2hhY2hpbmcgYSBuYXYgaXRlbS5cbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7aW50fSBub2RlSWQgICBOYXZJdGVtIElEXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgdGhlIHVuaXF1ZSBrZXlcbiAgICovXG4gIGZ1bmN0aW9uIGtleShjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGNvbGxhYklkICsgJy0tJyArIG5vZGVJZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgTmF2SXRlbTogTmF2SXRlbSxcbiAgICBnZXRSb290OiBnZXRSb290LFxuICAgIGdldE5vZGU6IGdldCxcbiAgICBhZGROb2RlOiBhZGROb2RlLFxuICAgIHNhdmVOb2RlOiB1cGRhdGUsXG4gICAgZGVsZXRlTm9kZTogZGVsZXRlTm9kZSxcbiAgICBpbnNlcnROb2RlOiBpbnNlcnROb2RlXG4gIH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicENvbGxhYlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2NvbGxhYicsIGNyZWF0ZUNvbGxhYik7XG5cbiAgLyoqXG4gICAqIEBmdW5jdGlvbiBjcmVhdGVDb2xsYWJcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrc1xuICAgKiBAZGVzY1xuICAgKiAgQ3JlYXRlIGEgY29sbGFiIGRlZmluZWQgYnkgdGhlIGdpdmVuIG9wdGlvbnMuXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gUGFyYW1ldGVycyB0byBjcmVhdGUgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5uYW1lIC0gTmFtZSBvZiB0aGUgY29sbGFiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmRlc2NyaXB0aW9uIC0gRGVzY3JpcHRpb24gaW4gbGVzcyB0aGFuIDE0MCBjaGFyYWN0ZXJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5wcml2YWN5IC0gJ3ByaXZhdGUnIG9yICdwdWJsaWMnLiBOb3RlcyB0aGF0IG9ubHlcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEhCUCBNZW1iZXJzIGNhbiBjcmVhdGUgcHJpdmF0ZSBjb2xsYWJcbiAgICogQHBhcmFtIHtBcnJheXxvYmplY3R9IG5hdiAtIG9uZSBvciBtb3JlIG5hdiBpdGVtIGRlc2NyaXB0b3IgdGhhdCB3aWxsIGJlXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFzc2VkIHRvIHRoZSBuYXYgdGFzay5cbiAgICogQHJldHVybiB7UHJvbWlzZX0gLSBXaWxsIHJldHJpZXZlIGEgY29sbGFiIG9yIGEgSGJwRXJyb3JcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYihvcHRpb25zKSB7XG4gICAgdmFyIGF0dHIgPSBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLmV4dHJhY3RBdHRyaWJ1dGVzKFxuICAgICAgb3B0aW9ucyxcbiAgICAgIFsndGl0bGUnLCAnY29udGVudCcsICdwcml2YXRlJ11cbiAgICApO1xuICAgICRsb2cuZGVidWcoJ0NyZWF0ZSBjb2xsYWInLCBvcHRpb25zKTtcbiAgICByZXR1cm4gaGJwQ29sbGFiU3RvcmUuY3JlYXRlKGF0dHIpLnRoZW4oZnVuY3Rpb24oY29sbGFiKSB7XG4gICAgICByZXR1cm4gJHEud2hlbihjcmVhdGVOYXZJdGVtcyhjb2xsYWIsIG9wdGlvbnMubmF2KSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGNvbGxhYjtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIG5hdmlnYXRpb24gaXRlbXMgZm9yIHRoZSBnaXZlbiBjb2xsYWIgdXNpbmdcbiAgICAgKiBpbmZvcm1hdGlvbiBmcm9tIG5hdkNvbmZpZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge0NvbGxhYn0gY29sbGFiICAgIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcGFyYW0gIHtBcnJheXxvYmplY3R9IG5hdkNvbmZpZyBjb25maWd1cmF0aW9uIGZvciBvbmUgb3IgbW9yZSBuYXZpZ2F0aW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICBpdGVtLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgcmVzb2x2ZSBvbmNlIGV2ZXJ5IG5hdiBpdGVtIGhhcyBiZWVuIGNyZWF0ZWQuXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBmdW5jdGlvbiBjcmVhdGVOYXZJdGVtcyhjb2xsYWIsIG5hdkNvbmZpZykge1xuICAgICAgaWYgKCFuYXZDb25maWcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFhbmd1bGFyLmlzQXJyYXkobmF2Q29uZmlnKSkge1xuICAgICAgICBuYXZDb25maWcgPSBbbmF2Q29uZmlnXTtcbiAgICAgIH1cbiAgICAgIHZhciBwcm9taXNlID0gJHEud2hlbigpO1xuICAgICAgYW5ndWxhci5mb3JFYWNoKG5hdkNvbmZpZywgZnVuY3Rpb24obikge1xuICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IudGFzayhcbiAgICAgICAgICAgIHtuYXY6IGFuZ3VsYXIuZXh0ZW5kKHtjb2xsYWI6IGNvbGxhYn0sIG4pfVxuICAgICAgICAgICkucnVuKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVOYXZJdGVtKFxuICAkbG9nLFxuICBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCduYXYnLCBjcmVhdGVOYXZJdGVtKTtcblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IG5hdiBpdGVtLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeS5oYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLlRhc2tzXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgYSBjb25maWcgZGVzY3JpcHRpb25cbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5uYW1lIG5hbWUgb2YgdGhlIG5hdiBpdGVtXG4gICAqIEBwYXJhbSB7Q29sbGFifSBjb25maWcuY29sbGFiIGNvbGxhYiBpbiB3aGljaCB0byBhZGQgdGhlIGl0ZW0gaW4uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcuYXBwIGFwcCBuYW1lIGxpbmtlZCB0byB0aGUgbmF2IGl0ZW1cbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiBhIE5hdkl0ZW0gaW5zdGFuY2VcbiAgICovXG4gIGZ1bmN0aW9uIGNyZWF0ZU5hdkl0ZW0oY29uZmlnKSB7XG4gICAgdmFyIGNvbGxhYiA9IGNvbmZpZy5jb2xsYWI7XG4gICAgJGxvZy5kZWJ1ZygnQ3JlYXRlIG5hdiBpdGVtJywgY29uZmlnKTtcbiAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLmZpbmRPbmUoe1xuICAgICAgdGl0bGU6IGNvbmZpZy5hcHBcbiAgICB9KVxuICAgIC50aGVuKGZ1bmN0aW9uKGFwcCkge1xuICAgICAgcmV0dXJuIGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5nZXRSb290KGNvbGxhYi5pZClcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHBhcmVudEl0ZW0pIHtcbiAgICAgICAgdmFyIG5hdiA9IG5ldyBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuTmF2SXRlbSh7XG4gICAgICAgICAgY29sbGFiSWQ6IGNvbGxhYi5pZCxcbiAgICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgICBhcHBJZDogYXBwLmlkLFxuICAgICAgICAgIHBhcmVudElkOiBwYXJlbnRJdGVtLmlkXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLmFkZE5vZGUoY29sbGFiLmlkLCBuYXYpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlBdXRvbWF0b3InKVxuLnJ1bihmdW5jdGlvbiBjcmVhdGVDb2xsYWJTZXJ2aWNlKFxuICAkbG9nLCAkcSwgaGJwQ29sbGFiU3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3Jcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignY3AnLCBjb3B5KTtcblxuICAvKipcbiAgICogQ29weSBhIGZpbGUgb3IgcmVjdXJzaXZlbHkgYSBmb2xkZXJcbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnkuaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5UYXNrc1xuICAgKiBAcGFyYW0ge2FycmF5L29iamVjdH0gIGNvbmZpZyBhIGNvbmZpZyBkZXNjcmlwdGlvblxuICAgKiBAcmV0dXJuIHthcnJheS9lbnRpdHl9IGNyZWF0ZWQgZW50aXRpZXNcbiAgICovXG4gIGZ1bmN0aW9uIGNvcHkoY29uZmlnKSB7XG4gICAgaWYgKCFhbmd1bGFyLmlzQXJyYXkoY29uZmlnKSkge1xuICAgICAgY29uZmlnID0gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59KTtcbiIsIi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5XG4gKiBAZGVzY1xuICogUHJvdmlkZXMgYW5ndWxhciBzZXJ2aWNlcyB0byB3b3JrIHdpdGggSEJQIENvbGxhYm9yYXRvcnkuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5JywgW1xuICAnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsXG4gICdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJ1xuXSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
