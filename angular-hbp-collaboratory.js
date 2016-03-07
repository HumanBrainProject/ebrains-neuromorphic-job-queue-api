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
   * @name createCollab
   * @description
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
     * @private
     * Create navigation items for the given collab using
     * information from navConfig.
     *
     * @param  {Collab} collab    [description]
     * @param  {Array|object} navConfig configuration for one or more navigation
     *                        item.
     * @return {Promise}      resolve once every nav item has been created.
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

angular.module('hbpCollaboratory', [
  'hbpCollaboratoryAutomator',
  'hbpCollaboratoryNavStore',
  'hbpCollaboratoryAppStore'
]);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLWNvbGxhYi5qcyIsImF1dG9tYXRvci90YXNrcy9jcmVhdGUtbmF2LWl0ZW0uanMiLCJhdXRvbWF0b3IvdGFza3Mvc3RvcmFnZS5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsUUFBUSxPQUFPLDZCQUE2QjtFQUMxQztFQUNBO0VBQ0E7RUFDQTtFQUNBOztDQUVELFFBQVEsb0NBQTZCLFNBQVMsMEJBQTBCLElBQUk7RUFDM0UsSUFBSSxXQUFXOzs7Ozs7OztFQVFmLFNBQVMsZ0JBQWdCLE1BQU0sSUFBSTtJQUNqQyxTQUFTLFFBQVE7Ozs7Ozs7Ozs7RUFVbkIsU0FBUyxLQUFLLFFBQVE7SUFDcEIsT0FBTyxJQUFJLEtBQUs7Ozs7Ozs7O0VBUWxCLFNBQVMsS0FBSyxRQUFRO0lBQ3BCLEtBQUssUUFBUTtJQUNiLEtBQUssU0FBUzs7O0VBR2hCLEtBQUssWUFBWTtJQUNmLEtBQUssV0FBVztNQUNkLElBQUksT0FBTztNQUNYLEtBQUssUUFBUTtNQUNiLEtBQUssV0FBVztNQUNoQixLQUFLLFNBQVM7TUFDZCxJQUFJLFVBQVU7TUFDZCxRQUFRLFFBQVEsS0FBSyxRQUFRLFNBQVMsTUFBTSxNQUFNO1FBQ2hELEtBQUssU0FBUyxRQUFRLFNBQVMsTUFBTTtTQUNwQyxLQUFLLFNBQVMsR0FBRzs7O1VBR2hCLFFBQVEsUUFBUTs7U0FFakIsTUFBTSxTQUFTLEtBQUs7VUFDbkIsS0FBSyxPQUFPLFFBQVE7VUFDcEIsT0FBTyxHQUFHLE9BQU87Ozs7TUFJckIsT0FBTyxHQUFHLElBQUksS0FBSztPQUNsQixLQUFLLFdBQVc7UUFDZixLQUFLLFFBQVE7UUFDYixPQUFPOztPQUVSLE1BQU0sU0FBUyxLQUFLO1FBQ25CLEtBQUssUUFB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QkFBeUIsUUFBUTtVQUM3QyxVQUFVLE9BQU87VUFDakIsTUFBTSxPQUFPO1VBQ2IsT0FBTyxJQUFJO1VBQ1gsVUFBVSxXQUFXOztRQUV2QixPQUFPLHlCQUF5QixRQUFRLE9BQU8sSUFBSTs7Ozs7QUFLM0Q7QUNyQ0EsUUFBUSxPQUFPO0NBQ2Qsa0VBQUksU0FBUztFQUNaLE1BQU0sSUFBSTtFQUNWO0VBQ0E7RUFDQSwwQkFBMEIsZ0JBQWdCLE1BQU07Ozs7Ozs7RUFPaEQsU0FBUyxLQUFLLFFBQVE7SUFDcEIsSUFBSSxDQUFDLFFBQVEsUUFBUSxTQUFTO01BQzVCLFNBQVM7O0lBRVgsT0FBTzs7O0FBR1g7QUNuQkEsUUFBUSxPQUFPLG9CQUFvQjtFQUNqQztFQUNBO0VBQ0E7O0FBRUYiLCJmaWxlIjoiYW5ndWxhci1oYnAtY29sbGFib3JhdG9yeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gKlxuICogQGV4YW1wbGVcbiAqIGFuZ3VsYXIubW9kdWxlKCdNeU1vZHVsZScsIFsnaGJwQ29sbGFib3JhdG9yeSddKVxuICogLnJ1bihmdW5jdGlvbihoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLCAkbG9nKSB7XG4gKiAgIHZhciBjb25maWcgPSB7XG4gKiAgICAgdGl0bGU6ICdNeSBDdXN0b20gQ29sbGFiJyxcbiAqICAgICBjb250ZW50OiAnTXkgQ29sbGFiIENvbnRlbnQnLFxuICogICAgIHByaXZhdGU6IGZhbHNlXG4gKiAgIH1cbiAqICAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci50YXNrKGNvbmZpZykucnVuKCkudGhlbihmdW5jdGlvbihjb2xsYWIpIHtcbiAqICAgXHQgJGxvZy5pbmZvKCdDcmVhdGVkIENvbGxhYicsIGNvbGxhYik7XG4gKiAgIH0pXG4gKiB9KVxuICovXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIFtcbiAgJ2JicENvbmZpZycsXG4gICdoYnBDb21tb24nLFxuICAnaGJwRG9jdW1lbnRDbGllbnQnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZSdcbl0pXG4uZmFjdG9yeSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsIGZ1bmN0aW9uIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IoJHEpIHtcbiAgdmFyIGhhbmRsZXJzID0ge307XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIHRhc2sgbmFtZS5cbiAgICogQHBhcmFtICB7c3RyaW5nfSAgIG5hbWUgaGFuZGxlIGFjdGlvbnMgd2l0aCB0aGUgc3BlY2lmaWVkIG5hbWVcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGZuIGEgZnVuY3Rpb24gdGhhdCBhY2NlcHQgdGhlIGN1cnJlbnQgY29udGV4dCBpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyLlxuICAgKi9cbiAgZnVuY3Rpb24gcmVnaXN0ZXJIYW5kbGVyKG5hbWUsIGZuKSB7XG4gICAgaGFuZGxlcnNbbmFtZV0gPSBmbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuZXcgdGFzay5cbiAgICogQG1lbWJlcm9mIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3JcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBhIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHRoYXQgd2lsbCBkZXRlcm1pbmVcbiAgICogICAgICAgICAgICAgICAgICAgICAgICB3aGljaCB0YXNrIHRvIHJ1biBhbmQgaW4gd2hpY2ggb3JkZXIuXG4gICAqIEByZXR1cm4ge1Rhc2t9IC0gdGFza1xuICAgKi9cbiAgZnVuY3Rpb24gdGFzayhjb25maWcpIHtcbiAgICByZXR1cm4gbmV3IFRhc2soY29uZmlnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAY2xhc3MgVGFza1xuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gdGFzayBjb25maWd1cmF0aW9uXG4gICAqL1xuICBmdW5jdGlvbiBUYXNrKGNvbmZpZykge1xuICAgIHRoaXMuc3RhdGUgPSAnaWRsZSc7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gIH1cblxuICBUYXNrLnByb3RvdHlwZSA9IHtcbiAgICBydW46IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgc2VsZi5zdGF0ZSA9ICdwcm9ncmVzcyc7XG4gICAgICBzZWxmLnByb21pc2VzID0ge307XG4gICAgICBzZWxmLmVycm9ycyA9IHt9O1xuICAgICAgdmFyIHJlc3VsdHMgPSB7fTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChzZWxmLmNvbmZpZywgZnVuY3Rpb24oZGF0YSwgbmFtZSkge1xuICAgICAgICBzZWxmLnByb21pc2VzW25hbWVdID0gaGFuZGxlcnNbbmFtZV0oZGF0YSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocikge1xuICAgICAgICAgIC8vIGxldCBzdGlsbCBndWVzcyB0aGUgcmVzdWx0c1xuICAgICAgICAgIC8vIGV2ZW4gaW4gY2FzZSBhbiBlcnJvciBvY2N1cnMuXG4gICAgICAgICAgcmVzdWx0c1tuYW1lXSA9IHI7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBzZWxmLmVycm9yc1tuYW1lXSA9IGVycjtcbiAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiAkcS5hbGwodGhpcy5wcm9taXNlcylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLnN0YXRlID0gJ3N1Y2Nlc3MnO1xuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSAnZXJyb3InO1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycik7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgdGhhdCBvbmx5IGNvbnRhaW5zIGF0dHJpYnV0ZXNcbiAgICogZnJvbSB0aGUgYGF0dHJzYCBsaXN0LlxuICAgKlxuICAgKiBAcGFyYW0gIHtvYmplY3R9IGNvbmZpZyBrZXktdmFsdWUgc3RvcmVcbiAgICogQHBhcmFtICB7QXJyYXl9IGF0dHJzICAgYSBsaXN0IG9mIGtleXMgdG8gZXh0cmFjdCBmcm9tIGBjb25maWdgXG4gICAqIEByZXR1cm4ge29iamVjdH0gICAgICAgIGtleS12YWx1ZSBzdG9yZSBjb250YWluaW5nIG9ubHkga2V5cyBmcm9tIGF0dHJzXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgIGZvdW5kIGluIGBjb25maWdgXG4gICAqL1xuICBmdW5jdGlvbiBleHRyYWN0QXR0cmlidXRlcyhjb25maWcsIGF0dHJzKSB7XG4gICAgdmFyIHIgPSB7fTtcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKGEpIHtcbiAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChjb25maWdbYV0pKSB7XG4gICAgICAgIHJbYV0gPSBjb25maWdbYV07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHI7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGhhbmRsZXJzOiBoYW5kbGVycyxcbiAgICByZWdpc3RlckhhbmRsZXI6IHJlZ2lzdGVySGFuZGxlcixcbiAgICB0YXNrOiB0YXNrLFxuICAgIGV4dHJhY3RBdHRyaWJ1dGVzOiBleHRyYWN0QXR0cmlidXRlc1xuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOiAwICovXG5cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLCBbJ2JicENvbmZpZycsICdoYnBDb21tb24nXSlcbi5jb25zdGFudCgnZm9sZGVyQXBwSWQnLCAnX19jb2xsYWJfZm9sZGVyX18nKVxuLnNlcnZpY2UoJ2hicENvbGxhYm9yYXRvcnlBcHBTdG9yZScsIGZ1bmN0aW9uKFxuICAkcSwgJGh0dHAsICRjYWNoZUZhY3RvcnksXG4gIGhicEVycm9yU2VydmljZSwgYmJwQ29uZmlnLCBoYnBVdGlsXG4pIHtcbiAgdmFyIGFwcHNDYWNoZSA9ICRjYWNoZUZhY3RvcnkoJ19fYXBwc0NhY2hlX18nKTtcbiAgdmFyIHVybEJhc2UgPSBiYnBDb25maWcuZ2V0KCdhcGkuY29sbGFiLnYwJykgKyAnL2V4dGVuc2lvbi8nO1xuICB2YXIgYXBwcyA9IG51bGw7XG5cbiAgdmFyIEFwcCA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGFuZ3VsYXIuZm9yRWFjaChhdHRycywgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gIH07XG4gIEFwcC5wcm90b3R5cGUgPSB7XG4gICAgdG9Kc29uOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5kZXNjcmlwdGlvbixcbiAgICAgICAgZWRpdF91cmw6IHRoaXMuZWRpdFVybCxcbiAgICAgICAgcnVuX3VybDogdGhpcy5ydW5VcmwsXG4gICAgICAgIHRpdGxlOiB0aGlzLnRpdGxlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbiAgQXBwLmZyb21Kc29uID0gZnVuY3Rpb24oanNvbikge1xuICAgIC8qIGpzaGludCBjYW1lbGNhc2U6IGZhbHNlICovXG4gICAgcmV0dXJuIG5ldyBBcHAoe1xuICAgICAgaWQ6IGpzb24uaWQsXG4gICAgICBkZWxldGVkOiBqc29uLmRlbGV0ZWQsXG4gICAgICBkZXNjcmlwdGlvbjoganNvbi5kZXNjcmlwdGlvbixcbiAgICAgIGVkaXRVcmw6IGpzb24uZWRpdF91cmwsXG4gICAgICBydW5Vcmw6IGpzb24ucnVuX3VybCxcbiAgICAgIHRpdGxlOiBqc29uLnRpdGxlLFxuICAgICAgY3JlYXRlZEJ5OiBqc29uLmNyZWF0ZWRfYnlcbiAgICB9KTtcbiAgfTtcblxuICBhcHBzQ2FjaGUucHV0KCdfX2NvbGxhYl9mb2xkZXJfXycsIHtcbiAgICBpZDogJ19fY29sbGFiX2ZvbGRlcl9fJyxcbiAgICB0aXRsZTogJ0ZvbGRlcidcbiAgfSk7XG5cbiAgdmFyIGxvYWRBbGwgPSBmdW5jdGlvbihwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbihycykge1xuICAgICAgaWYgKHJzLmhhc05leHQpIHtcbiAgICAgICAgcmV0dXJuIGxvYWRBbGwocnMubmV4dCgpKTtcbiAgICAgIH1cbiAgICAgIGFwcHMgPSBycy5yZXN1bHRzO1xuICAgICAgcmV0dXJuIGFwcHM7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGdldEFwcHMgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWFwcHMpIHtcbiAgICAgIHJldHVybiBsb2FkQWxsKGhicFV0aWwucGFnaW5hdGVkUmVzdWx0U2V0KCRodHRwLmdldCh1cmxCYXNlKSwge1xuICAgICAgICBmYWN0b3J5OiBBcHAuZnJvbUpzb25cbiAgICAgIH0pKTtcbiAgICB9XG4gICAgcmV0dXJuICRxLndoZW4oYXBwcyk7XG4gIH07XG5cbiAgdmFyIGdldEJ5SWQgPSBmdW5jdGlvbihpZCkge1xuICAgIGlmICghaWQpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKG51bGwpO1xuICAgIH1cbiAgICB2YXIgZXh0ID0gYXBwc0NhY2hlLmdldChpZCk7XG4gICAgaWYgKGV4dCkge1xuICAgICAgcmV0dXJuICRxLndoZW4oZXh0KTtcbiAgICB9XG4gICAgcmV0dXJuICRodHRwLmdldCh1cmxCYXNlICsgaWQgKyAnLycpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICBhcHBzQ2FjaGUucHV0KGlkLCBBcHAuZnJvbUpzb24ocmVzLmRhdGEpKTtcbiAgICAgIHJldHVybiBhcHBzQ2FjaGUuZ2V0KGlkKTtcbiAgICB9LCBmdW5jdGlvbihyZXMpIHtcbiAgICAgIHJldHVybiAkcS5yZWplY3QoaGJwRXJyb3JTZXJ2aWNlLmh0dHBFcnJvcihyZXMpKTtcbiAgICB9KTtcbiAgfTtcblxuICB2YXIgZmluZE9uZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KHVybEJhc2UsIHtwYXJhbXM6IG9wdGlvbnN9KS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgdmFyIHJlc3VsdHMgPSByZXMuZGF0YS5yZXN1bHRzO1xuICAgICAgLy8gUmVqZWN0IGlmIG1vcmUgdGhhbiBvbmUgcmVzdWx0c1xuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5lcnJvcih7XG4gICAgICAgICAgdHlwZTogJ1Rvb01hbnlSZXN1bHRzJyxcbiAgICAgICAgICBtZXNzYWdlOiAnTXVsdGlwbGUgYXBwcyBoYXMgYmVlbiByZXRyaWV2ZWQgJyArXG4gICAgICAgICAgICAgICAgICAgJ3doZW4gb25seSBvbmUgd2FzIGV4cGVjdGVkLicsXG4gICAgICAgICAgZGF0YTogcmVzLmRhdGFcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgLy8gTnVsbCB3aGVuIG5vIHJlc3VsdFxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgLy8gQnVpbGQgdGhlIGFwcCBpZiBleGFjdGx5IG9uZSByZXN1bHRcbiAgICAgIHZhciBhcHAgPSBBcHAuZnJvbUpzb24ocmVzdWx0c1swXSk7XG4gICAgICBhcHBzQ2FjaGUucHV0KGFwcC5pZCwgYXBwKTtcbiAgICAgIHJldHVybiBhcHA7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGxpc3Q6IGdldEFwcHMsXG4gICAgZ2V0QnlJZDogZ2V0QnlJZCxcbiAgICBmaW5kT25lOiBmaW5kT25lXG4gIH07XG59KTtcbiIsIi8qIGVzbGludCBjYW1lbGNhc2U6WzIsIHtwcm9wZXJ0aWVzOiBcIm5ldmVyXCJ9XSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJywgWydoYnBDb21tb24nLCAndXVpZDQnXSlcbi5zZXJ2aWNlKCdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLCBmdW5jdGlvbigkcSwgJGh0dHAsICRsb2csXG4gICAgJGNhY2hlRmFjdG9yeSwgJHRpbWVvdXQsIG9yZGVyQnlGaWx0ZXIsIHV1aWQ0LFxuICAgIGhicFV0aWwsIGJicENvbmZpZykge1xuICB2YXIgY29sbGFiQXBpVXJsID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9jb2xsYWIvJztcbiAgLy8gYSBjYWNoZSB3aXRoIGluZGl2aWR1YWwgbmF2IGl0ZW1zXG4gIHZhciBjYWNoZU5hdkl0ZW1zID0gJGNhY2hlRmFjdG9yeSgnbmF2SXRlbScpO1xuXG4gIC8vIGEgY2FjaGUgd2l0aCB0aGUgcHJvbWlzZXMgb2YgZWFjaCBjb2xsYWIncyBuYXYgdHJlZSByb290XG4gIHZhciBjYWNoZU5hdlJvb3RzID0gJGNhY2hlRmFjdG9yeSgnbmF2Um9vdCcpO1xuXG4gIHZhciBOYXZJdGVtID0gZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0ciwgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jb250ZXh0KSkge1xuICAgICAgdGhpcy5jb250ZXh0ID0gdXVpZDQuZ2VuZXJhdGUoKTtcbiAgICB9XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jaGlsZHJlbikpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB9XG4gIH07XG4gIE5hdkl0ZW0ucHJvdG90eXBlID0ge1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGFwcF9pZDogdGhpcy5hcHBJZCxcbiAgICAgICAgY29sbGFiOiB0aGlzLmNvbGxhYklkLFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICAgICAgb3JkZXJfaW5kZXg6IHRoaXMub3JkZXIsXG4gICAgICAgIHR5cGU6IHRoaXMudHlwZSB8fCAodGhpcy5mb2xkZXIgPyAnRk8nIDogJ0lUJyksXG4gICAgICAgIHBhcmVudDogdGhpcy5wYXJlbnRJZFxuICAgICAgfTtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChbXG4gICAgICAgICdpZCcsICduYW1lJywgJ2NoaWxkcmVuJywgJ2NvbnRleHQnLFxuICAgICAgICAnY29sbGFiSWQnLCAnYXBwSWQnLCAnb3JkZXInLCAnZm9sZGVyJyxcbiAgICAgICAgJ3BhcmVudElkJywgJ3R5cGUnXG4gICAgICBdLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRyc1thXSkpIHtcbiAgICAgICAgICB0aGlzW2FdID0gYXR0cnNbYV07XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGVuc3VyZUNhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnB1dChrZXkodGhpcy5jb2xsYWJJZCwgdGhpcy5pZCksIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogTWFuYWdlIGBhY2NgIGFjY3VtdWxhdG9yIHdpdGggYWxsIHRoZSBkYXRhIGZyb20ganNvbkFycmF5IGFuZCByZXR1cm4gaXQuXG4gICAqXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgIHRoZSBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7YXJyYXl9IGpzb25BcnJheSBkZXNjcmlwdGlvbiBvZiB0aGUgY2hpbGRyZW5cbiAgICogQHBhcmFtICB7QXJyYXl9IGFjYyAgICAgICB0aGUgYWNjdW11bGF0b3JcbiAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgICB0aGUgY2hpbGRyZW5cbiAgICovXG4gIGZ1bmN0aW9uIGNoaWxkcmVuRnJvbUpzb24oY29sbGFiSWQsIGpzb25BcnJheSwgYWNjKSB7XG4gICAgYWNjID0gYWNjIHx8IFtdO1xuICAgIC8vIGFuIHVuZGVmaW5lZCBhcnJheSBtZWFucyB3ZSBhYm9ydCB0aGUgcHJvY2Vzc1xuICAgIC8vIHdoZXJlIGFuIGVtcHR5IGFycmF5IHdpbGwgZW5zdXJlIHRoZSByZXN1bHRpbmcgYXJyYXlcbiAgICAvLyBpcyBlbXB0eSBhcyB3ZWxsLlxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGpzb25BcnJheSkpIHtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuXG4gICAgYWNjLmxlbmd0aCA9IDA7XG4gICAgYW5ndWxhci5mb3JFYWNoKGpzb25BcnJheSwgZnVuY3Rpb24oanNvbikge1xuICAgICAgYWNjLnB1c2goTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwganNvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG4gIH1cbiAgTmF2SXRlbS5mcm9tSnNvbiA9IGZ1bmN0aW9uKGNvbGxhYklkLCBqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICB2YXIgYXR0cnMgPSB7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGFwcElkOiBqc29uLmFwcF9pZCxcbiAgICAgIGNvbGxhYklkOiBjb2xsYWJJZCxcbiAgICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICAgIGNvbnRleHQ6IGpzb24uY29udGV4dCxcbiAgICAgIG9yZGVyOiBqc29uLm9yZGVyX2luZGV4LFxuICAgICAgZm9sZGVyOiBqc29uLnR5cGUgPT09ICdGTycsXG4gICAgICB0eXBlOiBqc29uLnR5cGUsXG4gICAgICBwYXJlbnRJZDoganNvbi5wYXJlbnQsXG4gICAgICBjaGlsZHJlbjogY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbi5jaGlsZHJlbilcbiAgICB9O1xuICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBhdHRycy5pZCk7XG4gICAgdmFyIGNhY2hlZCA9IGNhY2hlTmF2SXRlbXMuZ2V0KGspO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIHJldHVybiBjYWNoZWQudXBkYXRlKGF0dHJzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBOYXZJdGVtKGF0dHJzKS5lbnN1cmVDYWNoZWQoKTtcbiAgfTtcblxuICB2YXIgZ2V0Um9vdCA9IGZ1bmN0aW9uKGNvbGxhYklkKSB7XG4gICAgdmFyIHRyZWVQcm9taXNlID0gY2FjaGVOYXZSb290cy5nZXQoY29sbGFiSWQpO1xuXG4gICAgaWYgKCF0cmVlUHJvbWlzZSkge1xuICAgICAgdHJlZVByb21pc2UgPSAkaHR0cC5nZXQoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi9hbGwvJykudGhlbihcbiAgICAgICAgZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgIHZhciByb290O1xuICAgICAgICAgIHZhciBpO1xuICAgICAgICAgIHZhciBpdGVtO1xuICAgICAgICAgIHZhciBkYXRhID0gb3JkZXJCeUZpbHRlcihyZXNwLmRhdGEsICcrb3JkZXJfaW5kZXgnKTtcblxuICAgICAgICAgIC8vIGZpbGwgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgZm9yIChpID0gMDsgaSAhPT0gZGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaXRlbSA9IE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIGRhdGFbaV0pO1xuICAgICAgICAgICAgaWYgKGl0ZW0uY29udGV4dCA9PT0gJ3Jvb3QnKSB7XG4gICAgICAgICAgICAgIHJvb3QgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGxpbmsgY2hpbGRyZW4gYW5kIHBhcmVudHNcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBkYXRhW2ldLmlkKSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5wYXJlbnRJZCkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBpdGVtLnBhcmVudElkKSk7XG4gICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByb290O1xuICAgICAgICB9LFxuICAgICAgICBoYnBVdGlsLmZlcnJcbiAgICAgICk7XG5cbiAgICAgIGNhY2hlTmF2Um9vdHMucHV0KGNvbGxhYklkLCB0cmVlUHJvbWlzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWVQcm9taXNlO1xuICB9O1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbihjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGdldFJvb3QoY29sbGFiSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgayA9IGtleShjb2xsYWJJZCwgbm9kZUlkKTtcbiAgICAgIHZhciBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG5cbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAkbG9nLmVycm9yKCd1bmtub3duIG5hdiBpdGVtJywgayk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBhZGROb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAucG9zdChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycsIG5hdkl0ZW0udG9Kc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuICAgICAgcmV0dXJuIE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIHJlc3AuZGF0YSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgZGVsZXRlTm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgcmV0dXJuICRodHRwLmRlbGV0ZShjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgKyBuYXZJdGVtLmlkICsgJy8nKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgY2FjaGVOYXZJdGVtcy5yZW1vdmUoa2V5KGNvbGxhYklkLCBuYXZJdGVtLmlkKSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgdXBkYXRlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICBuYXZJdGVtLmNvbGxhYklkID0gY29sbGFiSWQ7XG4gICAgcmV0dXJuICRodHRwLnB1dChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgK1xuICAgICAgbmF2SXRlbS5pZCArICcvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8vIG9yZGVyaW5nIG9wZXJhdGlvbiBuZWVkcyB0byBiZSBnbG9iYWxseSBxdWV1ZWQgdG8gZW5zdXJlIGNvbnNpc3RlbmN5LlxuICB2YXIgaW5zZXJ0UXVldWUgPSAkcS53aGVuKCk7XG5cbiAgLyoqXG4gICAqIEluc2VydCBub2RlIGluIHRoZSB0aHJlZS5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgIGlkIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSAgICBOYXYgaXRlbSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBwYXJlbnRJdGVtIHBhcmVudCBpdGVtXG4gICAqIEBwYXJhbSAge2ludH0gaW5zZXJ0QXQgICBhZGQgdG8gdGhlIG1lbnVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIGEgcHJvbWlzZSB0aGF0IHdpbGxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGUgdXBkYXRlIG5hdiBpdGVtXG4gICAqL1xuICBmdW5jdGlvbiBpbnNlcnROb2RlKGNvbGxhYklkLCBuYXZJdGVtLCBwYXJlbnRJdGVtLCBpbnNlcnRBdCkge1xuICAgIHJldHVybiBpbnNlcnRRdWV1ZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbmF2SXRlbS5vcmRlciA9IGluc2VydEF0ICsgMTsgLy8gZmlyc3QgaXRlbSBvcmRlcl9pbmRleCBtdXN0IGJlIDFcbiAgICAgIG5hdkl0ZW0ucGFyZW50SWQgPSBwYXJlbnRJdGVtLmlkO1xuICAgICAgcmV0dXJuIHVwZGF0ZShjb2xsYWJJZCwgbmF2SXRlbSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGtleSBmb3IgY2hhY2hpbmcgYSBuYXYgaXRlbS5cbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7aW50fSBub2RlSWQgICBOYXZJdGVtIElEXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgdGhlIHVuaXF1ZSBrZXlcbiAgICovXG4gIGZ1bmN0aW9uIGtleShjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGNvbGxhYklkICsgJy0tJyArIG5vZGVJZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgTmF2SXRlbTogTmF2SXRlbSxcbiAgICBnZXRSb290OiBnZXRSb290LFxuICAgIGdldE5vZGU6IGdldCxcbiAgICBhZGROb2RlOiBhZGROb2RlLFxuICAgIHNhdmVOb2RlOiB1cGRhdGUsXG4gICAgZGVsZXRlTm9kZTogZGVsZXRlTm9kZSxcbiAgICBpbnNlcnROb2RlOiBpbnNlcnROb2RlXG4gIH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicENvbGxhYlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2NvbGxhYicsIGNyZWF0ZUNvbGxhYik7XG5cbiAgLyoqXG4gICAqIEBuYW1lIGNyZWF0ZUNvbGxhYlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogIENyZWF0ZSBhIGNvbGxhYiBkZWZpbmVkIGJ5IHRoZSBnaXZlbiBvcHRpb25zLlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFBhcmFtZXRlcnMgdG8gY3JlYXRlIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMubmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5kZXNjcmlwdGlvbiAtIERlc2NyaXB0aW9uIGluIGxlc3MgdGhhbiAxNDAgY2hhcmFjdGVyc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMucHJpdmFjeSAtICdwcml2YXRlJyBvciAncHVibGljJy4gTm90ZXMgdGhhdCBvbmx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIQlAgTWVtYmVycyBjYW4gY3JlYXRlIHByaXZhdGUgY29sbGFiXG4gICAqIEBwYXJhbSB7QXJyYXl8b2JqZWN0fSBuYXYgLSBvbmUgb3IgbW9yZSBuYXYgaXRlbSBkZXNjcmlwdG9yIHRoYXQgd2lsbCBiZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3NlZCB0byB0aGUgbmF2IHRhc2suXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IC0gV2lsbCByZXRyaWV2ZSBhIGNvbGxhYiBvciBhIEhicEVycm9yXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVDb2xsYWIob3B0aW9ucykge1xuICAgIHZhciBhdHRyID0gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5leHRyYWN0QXR0cmlidXRlcyhcbiAgICAgIG9wdGlvbnMsXG4gICAgICBbJ3RpdGxlJywgJ2NvbnRlbnQnLCAncHJpdmF0ZSddXG4gICAgKTtcbiAgICAkbG9nLmRlYnVnKCdDcmVhdGUgY29sbGFiJywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGhicENvbGxhYlN0b3JlLmNyZWF0ZShhdHRyKS50aGVuKGZ1bmN0aW9uKGNvbGxhYikge1xuICAgICAgcmV0dXJuICRxLndoZW4oY3JlYXRlTmF2SXRlbXMoY29sbGFiLCBvcHRpb25zLm5hdikpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBjb2xsYWI7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQ3JlYXRlIG5hdmlnYXRpb24gaXRlbXMgZm9yIHRoZSBnaXZlbiBjb2xsYWIgdXNpbmdcbiAgICAgKiBpbmZvcm1hdGlvbiBmcm9tIG5hdkNvbmZpZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSAge0NvbGxhYn0gY29sbGFiICAgIFtkZXNjcmlwdGlvbl1cbiAgICAgKiBAcGFyYW0gIHtBcnJheXxvYmplY3R9IG5hdkNvbmZpZyBjb25maWd1cmF0aW9uIGZvciBvbmUgb3IgbW9yZSBuYXZpZ2F0aW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICBpdGVtLlxuICAgICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgcmVzb2x2ZSBvbmNlIGV2ZXJ5IG5hdiBpdGVtIGhhcyBiZWVuIGNyZWF0ZWQuXG4gICAgICovXG4gICAgZnVuY3Rpb24gY3JlYXRlTmF2SXRlbXMoY29sbGFiLCBuYXZDb25maWcpIHtcbiAgICAgIGlmICghbmF2Q29uZmlnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghYW5ndWxhci5pc0FycmF5KG5hdkNvbmZpZykpIHtcbiAgICAgICAgbmF2Q29uZmlnID0gW25hdkNvbmZpZ107XG4gICAgICB9XG4gICAgICB2YXIgcHJvbWlzZSA9ICRxLndoZW4oKTtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChuYXZDb25maWcsIGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2soXG4gICAgICAgICAgICB7bmF2OiBhbmd1bGFyLmV4dGVuZCh7Y29sbGFiOiBjb2xsYWJ9LCBuKX1cbiAgICAgICAgICApLnJ1bigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShcbiAgJGxvZyxcbiAgaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3Jcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignbmF2JywgY3JlYXRlTmF2SXRlbSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBuYXYgaXRlbS5cbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBhIGNvbmZpZyBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLm5hbWUgbmFtZSBvZiB0aGUgbmF2IGl0ZW1cbiAgICogQHBhcmFtIHtDb2xsYWJ9IGNvbmZpZy5jb2xsYWIgY29sbGFiIGluIHdoaWNoIHRvIGFkZCB0aGUgaXRlbSBpbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5hcHAgYXBwIG5hbWUgbGlua2VkIHRvIHRoZSBuYXYgaXRlbVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGEgTmF2SXRlbSBpbnN0YW5jZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShjb25maWcpIHtcbiAgICB2YXIgY29sbGFiID0gY29uZmlnLmNvbGxhYjtcbiAgICAkbG9nLmRlYnVnKCdDcmVhdGUgbmF2IGl0ZW0nLCBjb25maWcpO1xuICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUuZmluZE9uZSh7XG4gICAgICB0aXRsZTogY29uZmlnLmFwcFxuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oYXBwKSB7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLmdldFJvb3QoY29sbGFiLmlkKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocGFyZW50SXRlbSkge1xuICAgICAgICB2YXIgbmF2ID0gbmV3IGhicENvbGxhYm9yYXRvcnlOYXZTdG9yZS5OYXZJdGVtKHtcbiAgICAgICAgICBjb2xsYWJJZDogY29sbGFiLmlkLFxuICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgIGFwcElkOiBhcHAuaWQsXG4gICAgICAgICAgcGFyZW50SWQ6IHBhcmVudEl0ZW0uaWRcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUuYWRkTm9kZShjb2xsYWIuaWQsIG5hdik7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSk7XG4iLCJhbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicpXG4ucnVuKGZ1bmN0aW9uIGNyZWF0ZUNvbGxhYlNlcnZpY2UoXG4gICRsb2csICRxLCBoYnBDb2xsYWJTdG9yZSxcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuKSB7XG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3IucmVnaXN0ZXJIYW5kbGVyKCdjcCcsIGNvcHkpO1xuXG4gIC8qKlxuICAgKiBDb3B5IGEgZmlsZSBvciByZWN1cnNpdmVseSBhIGZvbGRlclxuICAgKiBAcGFyYW0ge2FycmF5L29iamVjdH0gIGNvbmZpZyBhIGNvbmZpZyBkZXNjcmlwdGlvblxuICAgKiBAcmV0dXJuIHthcnJheS9lbnRpdHl9IGNyZWF0ZWQgZW50aXRpZXNcbiAgICovXG4gIGZ1bmN0aW9uIGNvcHkoY29uZmlnKSB7XG4gICAgaWYgKCFhbmd1bGFyLmlzQXJyYXkoY29uZmlnKSkge1xuICAgICAgY29uZmlnID0gW107XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5JywgW1xuICAnaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcicsXG4gICdoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJ1xuXSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
