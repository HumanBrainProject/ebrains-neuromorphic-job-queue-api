/**
 * @namespace hbpCollaboratoryAutomator
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
          return $q.reject();
        });
      });

      return $q.all(this.promises)
      .then(function() {
        self.state = 'success';
        return results;
      })
      .catch(function() {
        self.state = 'error';
        return results;
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

angular.module('hbpCollaboratoryNavStore', ['hbpCommon'])
.service('hbpCollaboratoryNavStore', ['$q', '$http', '$log', '$cacheFactory', '$timeout', 'orderByFilter', 'hbpUtil', 'bbpConfig', function($q, $http, $log,
    $cacheFactory, $timeout, orderByFilter,
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
      ['name', 'description', 'private']
    );

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
          hbpCollaboratoryAutomator.task(
            {nav: angular.extend({collab: collab}, n)}
          ).run();
        });
      });
      return promise;
    }
  }
}]);

angular.module('hbpCollaboratoryAutomator')
.run(['hbpCollaboratoryAppStore', 'hbpCollaboratoryNavStore', 'hbpCollaboratoryAutomator', function createNavItem(
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
    return hbpCollaboratoryAppStore.findOne(config.app)
    .then(function(app) {
      var nav = new hbpCollaboratoryNavStore.NavItem({
        collabId: collab.id,
        name: config.name,
        appId: app.id
      });
      return hbpCollaboratoryNavStore.addNode(collab.id, nav);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImF1dG9tYXRvci9hdXRvbWF0b3IuanMiLCJzZXJ2aWNlcy9hcHAtc3RvcmUuanMiLCJzZXJ2aWNlcy9uYXYtc3RvcmUuanMiLCJhdXRvbWF0b3IvdGFza3MvY3JlYXRlLWNvbGxhYi5qcyIsImF1dG9tYXRvci90YXNrcy9jcmVhdGUtbmF2LWl0ZW0uanMiLCJhdXRvbWF0b3IvdGFza3Mvc3RvcmFnZS5qcyIsIm1haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQUdBLFFBQVEsT0FBTyw2QkFBNkI7RUFDMUM7RUFDQTtFQUNBO0VBQ0E7RUFDQTs7Q0FFRCxRQUFRLG9DQUE2QixTQUFTLDBCQUEwQixJQUFJO0VBQzNFLElBQUksV0FBVzs7Ozs7Ozs7RUFRZixTQUFTLGdCQUFnQixNQUFNLElBQUk7SUFDakMsU0FBUyxRQUFROzs7Ozs7Ozs7O0VBVW5CLFNBQVMsS0FBSyxRQUFRO0lBQ3BCLE9BQU8sSUFBSSxLQUFLOzs7Ozs7OztFQVFsQixTQUFTLEtBQUssUUFBUTtJQUNwQixLQUFLLFFBQVE7SUFDYixLQUFLLFNBQVM7OztFQUdoQixLQUFLLFlBQVk7SUFDZixLQUFLLFdBQVc7TUFDZCxJQUFJLE9BQU87TUFDWCxLQUFLLFFBQVE7TUFDYixLQUFLLFdBQVc7TUFDaEIsS0FBSyxTQUFTO01BQ2QsSUFBSSxVQUFVO01BQ2QsUUFBUSxRQUFRLEtBQUssUUFBUSxTQUFTLE1BQU0sTUFBTTtRQUNoRCxLQUFLLFNBQVMsUUFBUSxTQUFTLE1BQU07U0FDcEMsS0FBSyxTQUFTLEdBQUc7OztVQUdoQixRQUFRLFFBQVE7O1NBRWpCLE1BQU0sU0FBUyxLQUFLO1VBQ25CLEtBQUssT0FBTyxRQUFRO1VBQ3BCLE9BQU8sR0FBRzs7OztNQUlkLE9BQU8sR0FBRyxJQUFJLEtBQUs7T0FDbEIsS0FBSyxXQUFXO1FBQ2YsS0FBSyxRQUFRO1FBQ2IsT0FBTzs7T0FFUixNQUFNLFdBQVc7UUFDaEIsS0FBSyxRQUFRO1FBQ2IsT0FBTzs7Ozs7Ozs7Ozs7Ozs7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SUFBSSxDQUFDLFFBQVEsUUFBUSxTQUFTO01BQzVCLFNBQVM7O0lBRVgsT0FBTzs7O0FBR1g7QUNuQkEsUUFBUSxPQUFPLG9CQUFvQjtFQUNqQztFQUNBO0VBQ0E7O0FBRUYiLCJmaWxlIjoiYW5ndWxhci1oYnAtY29sbGFib3JhdG9yeS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQG5hbWVzcGFjZSBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgW1xuICAnYmJwQ29uZmlnJyxcbiAgJ2hicENvbW1vbicsXG4gICdoYnBEb2N1bWVudENsaWVudCcsXG4gICdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLFxuICAnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJ1xuXSlcbi5mYWN0b3J5KCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJywgZnVuY3Rpb24gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvcigkcSkge1xuICB2YXIgaGFuZGxlcnMgPSB7fTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSBoYW5kbGVyIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gdGFzayBuYW1lLlxuICAgKiBAcGFyYW0gIHtzdHJpbmd9ICAgbmFtZSBoYW5kbGUgYWN0aW9ucyB3aXRoIHRoZSBzcGVjaWZpZWQgbmFtZVxuICAgKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gYSBmdW5jdGlvbiB0aGF0IGFjY2VwdCB0aGUgY3VycmVudCBjb250ZXh0IGluXG4gICAqICAgICAgICAgICAgICAgICAgICAgICBwYXJhbWV0ZXIuXG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3RlckhhbmRsZXIobmFtZSwgZm4pIHtcbiAgICBoYW5kbGVyc1tuYW1lXSA9IGZuO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyB0YXNrLlxuICAgKiBAbWVtYmVyb2YgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvclxuICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIGEgY29uZmlndXJhdGlvbiBvYmplY3QgdGhhdCB3aWxsIGRldGVybWluZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWNoIHRhc2sgdG8gcnVuIGFuZCBpbiB3aGljaCBvcmRlci5cbiAgICogQHJldHVybiB7VGFza30gLSB0YXNrXG4gICAqL1xuICBmdW5jdGlvbiB0YXNrKGNvbmZpZykge1xuICAgIHJldHVybiBuZXcgVGFzayhjb25maWcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBjbGFzcyBUYXNrXG4gICAqIEBtZW1iZXJvZiBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSB0YXNrIGNvbmZpZ3VyYXRpb25cbiAgICovXG4gIGZ1bmN0aW9uIFRhc2soY29uZmlnKSB7XG4gICAgdGhpcy5zdGF0ZSA9ICdpZGxlJztcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgfVxuXG4gIFRhc2sucHJvdG90eXBlID0ge1xuICAgIHJ1bjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICBzZWxmLnN0YXRlID0gJ3Byb2dyZXNzJztcbiAgICAgIHNlbGYucHJvbWlzZXMgPSB7fTtcbiAgICAgIHNlbGYuZXJyb3JzID0ge307XG4gICAgICB2YXIgcmVzdWx0cyA9IHt9O1xuICAgICAgYW5ndWxhci5mb3JFYWNoKHNlbGYuY29uZmlnLCBmdW5jdGlvbihkYXRhLCBuYW1lKSB7XG4gICAgICAgIHNlbGYucHJvbWlzZXNbbmFtZV0gPSBoYW5kbGVyc1tuYW1lXShkYXRhKVxuICAgICAgICAudGhlbihmdW5jdGlvbihyKSB7XG4gICAgICAgICAgLy8gbGV0IHN0aWxsIGd1ZXNzIHRoZSByZXN1bHRzXG4gICAgICAgICAgLy8gZXZlbiBpbiBjYXNlIGFuIGVycm9yIG9jY3Vycy5cbiAgICAgICAgICByZXN1bHRzW25hbWVdID0gcjtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIHNlbGYuZXJyb3JzW25hbWVdID0gZXJyO1xuICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuICRxLmFsbCh0aGlzLnByb21pc2VzKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHNlbGYuc3RhdGUgPSAnc3VjY2Vzcyc7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSlcbiAgICAgIC5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgc2VsZi5zdGF0ZSA9ICdlcnJvcic7XG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBSZXR1cm4gYW4gb2JqZWN0IHRoYXQgb25seSBjb250YWlucyBhdHRyaWJ1dGVzXG4gICAqIGZyb20gdGhlIGBhdHRyc2AgbGlzdC5cbiAgICpcbiAgICogQHBhcmFtICB7b2JqZWN0fSBjb25maWcga2V5LXZhbHVlIHN0b3JlXG4gICAqIEBwYXJhbSAge0FycmF5fSBhdHRycyAgIGEgbGlzdCBvZiBrZXlzIHRvIGV4dHJhY3QgZnJvbSBgY29uZmlnYFxuICAgKiBAcmV0dXJuIHtvYmplY3R9ICAgICAgICBrZXktdmFsdWUgc3RvcmUgY29udGFpbmluZyBvbmx5IGtleXMgZnJvbSBhdHRyc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICBmb3VuZCBpbiBgY29uZmlnYFxuICAgKi9cbiAgZnVuY3Rpb24gZXh0cmFjdEF0dHJpYnV0ZXMoY29uZmlnLCBhdHRycykge1xuICAgIHZhciByID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKGF0dHJzLCBmdW5jdGlvbihhKSB7XG4gICAgICBpZiAoYW5ndWxhci5pc0RlZmluZWQoY29uZmlnW2FdKSkge1xuICAgICAgICByW2FdID0gY29uZmlnW2FdO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBoYW5kbGVyczogaGFuZGxlcnMsXG4gICAgcmVnaXN0ZXJIYW5kbGVyOiByZWdpc3RlckhhbmRsZXIsXG4gICAgdGFzazogdGFzayxcbiAgICBleHRyYWN0QXR0cmlidXRlczogZXh0cmFjdEF0dHJpYnV0ZXNcbiAgfTtcbn0pO1xuIiwiLyogZXNsaW50IGNhbWVsY2FzZTogMCAqL1xuXG5hbmd1bGFyLm1vZHVsZSgnaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlJywgWydiYnBDb25maWcnLCAnaGJwQ29tbW9uJ10pXG4uY29uc3RhbnQoJ2ZvbGRlckFwcElkJywgJ19fY29sbGFiX2ZvbGRlcl9fJylcbi5zZXJ2aWNlKCdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnLCBmdW5jdGlvbihcbiAgJHEsICRodHRwLCAkY2FjaGVGYWN0b3J5LFxuICBoYnBFcnJvclNlcnZpY2UsIGJicENvbmZpZywgaGJwVXRpbFxuKSB7XG4gIHZhciBhcHBzQ2FjaGUgPSAkY2FjaGVGYWN0b3J5KCdfX2FwcHNDYWNoZV9fJyk7XG4gIHZhciB1cmxCYXNlID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9leHRlbnNpb24vJztcbiAgdmFyIGFwcHMgPSBudWxsO1xuXG4gIHZhciBBcHAgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0cnMsIGZ1bmN0aW9uKHYsIGspIHtcbiAgICAgIHNlbGZba10gPSB2O1xuICAgIH0pO1xuICB9O1xuICBBcHAucHJvdG90eXBlID0ge1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuZGVzY3JpcHRpb24sXG4gICAgICAgIGVkaXRfdXJsOiB0aGlzLmVkaXRVcmwsXG4gICAgICAgIHJ1bl91cmw6IHRoaXMucnVuVXJsLFxuICAgICAgICB0aXRsZTogdGhpcy50aXRsZVxuICAgICAgfTtcbiAgICB9XG4gIH07XG4gIEFwcC5mcm9tSnNvbiA9IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgIHJldHVybiBuZXcgQXBwKHtcbiAgICAgIGlkOiBqc29uLmlkLFxuICAgICAgZGVsZXRlZDoganNvbi5kZWxldGVkLFxuICAgICAgZGVzY3JpcHRpb246IGpzb24uZGVzY3JpcHRpb24sXG4gICAgICBlZGl0VXJsOiBqc29uLmVkaXRfdXJsLFxuICAgICAgcnVuVXJsOiBqc29uLnJ1bl91cmwsXG4gICAgICB0aXRsZToganNvbi50aXRsZSxcbiAgICAgIGNyZWF0ZWRCeToganNvbi5jcmVhdGVkX2J5XG4gICAgfSk7XG4gIH07XG5cbiAgYXBwc0NhY2hlLnB1dCgnX19jb2xsYWJfZm9sZGVyX18nLCB7XG4gICAgaWQ6ICdfX2NvbGxhYl9mb2xkZXJfXycsXG4gICAgdGl0bGU6ICdGb2xkZXInXG4gIH0pO1xuXG4gIHZhciBsb2FkQWxsID0gZnVuY3Rpb24ocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlLnRoZW4oZnVuY3Rpb24ocnMpIHtcbiAgICAgIGlmIChycy5oYXNOZXh0KSB7XG4gICAgICAgIHJldHVybiBsb2FkQWxsKHJzLm5leHQoKSk7XG4gICAgICB9XG4gICAgICBhcHBzID0gcnMucmVzdWx0cztcbiAgICAgIHJldHVybiBhcHBzO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBnZXRBcHBzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFhcHBzKSB7XG4gICAgICByZXR1cm4gbG9hZEFsbChoYnBVdGlsLnBhZ2luYXRlZFJlc3VsdFNldCgkaHR0cC5nZXQodXJsQmFzZSksIHtcbiAgICAgICAgZmFjdG9yeTogQXBwLmZyb21Kc29uXG4gICAgICB9KSk7XG4gICAgfVxuICAgIHJldHVybiAkcS53aGVuKGFwcHMpO1xuICB9O1xuXG4gIHZhciBnZXRCeUlkID0gZnVuY3Rpb24oaWQpIHtcbiAgICBpZiAoIWlkKSB7XG4gICAgICByZXR1cm4gJHEud2hlbihudWxsKTtcbiAgICB9XG4gICAgdmFyIGV4dCA9IGFwcHNDYWNoZS5nZXQoaWQpO1xuICAgIGlmIChleHQpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKGV4dCk7XG4gICAgfVxuICAgIHJldHVybiAkaHR0cC5nZXQodXJsQmFzZSArIGlkICsgJy8nKS50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgYXBwc0NhY2hlLnB1dChpZCwgQXBwLmZyb21Kc29uKHJlcy5kYXRhKSk7XG4gICAgICByZXR1cm4gYXBwc0NhY2hlLmdldChpZCk7XG4gICAgfSwgZnVuY3Rpb24ocmVzKSB7XG4gICAgICByZXR1cm4gJHEucmVqZWN0KGhicEVycm9yU2VydmljZS5odHRwRXJyb3IocmVzKSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIGZpbmRPbmUgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgcmV0dXJuICRodHRwLmdldCh1cmxCYXNlLCB7cGFyYW1zOiBvcHRpb25zfSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgIHZhciByZXN1bHRzID0gcmVzLmRhdGEucmVzdWx0cztcbiAgICAgIC8vIFJlamVjdCBpZiBtb3JlIHRoYW4gb25lIHJlc3VsdHNcbiAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgcmV0dXJuICRxLnJlamVjdChoYnBFcnJvclNlcnZpY2UuZXJyb3Ioe1xuICAgICAgICAgIHR5cGU6ICdUb29NYW55UmVzdWx0cycsXG4gICAgICAgICAgbWVzc2FnZTogJ011bHRpcGxlIGFwcHMgaGFzIGJlZW4gcmV0cmlldmVkICcgK1xuICAgICAgICAgICAgICAgICAgICd3aGVuIG9ubHkgb25lIHdhcyBleHBlY3RlZC4nLFxuICAgICAgICAgIGRhdGE6IHJlcy5kYXRhXG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIC8vIE51bGwgd2hlbiBubyByZXN1bHRcbiAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIEJ1aWxkIHRoZSBhcHAgaWYgZXhhY3RseSBvbmUgcmVzdWx0XG4gICAgICB2YXIgYXBwID0gQXBwLmZyb21Kc29uKHJlc3VsdHNbMF0pO1xuICAgICAgYXBwc0NhY2hlLnB1dChhcHAuaWQsIGFwcCk7XG4gICAgICByZXR1cm4gYXBwO1xuICAgIH0sIGhicFV0aWwuZmVycik7XG4gIH07XG5cbiAgcmV0dXJuIHtcbiAgICBsaXN0OiBnZXRBcHBzLFxuICAgIGdldEJ5SWQ6IGdldEJ5SWQsXG4gICAgZmluZE9uZTogZmluZE9uZVxuICB9O1xufSk7XG4iLCIvKiBlc2xpbnQgY2FtZWxjYXNlOlsyLCB7cHJvcGVydGllczogXCJuZXZlclwifV0gKi9cbid1c2Ugc3RyaWN0JztcblxuYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsIFsnaGJwQ29tbW9uJ10pXG4uc2VydmljZSgnaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlJywgZnVuY3Rpb24oJHEsICRodHRwLCAkbG9nLFxuICAgICRjYWNoZUZhY3RvcnksICR0aW1lb3V0LCBvcmRlckJ5RmlsdGVyLFxuICAgIGhicFV0aWwsIGJicENvbmZpZykge1xuICB2YXIgY29sbGFiQXBpVXJsID0gYmJwQ29uZmlnLmdldCgnYXBpLmNvbGxhYi52MCcpICsgJy9jb2xsYWIvJztcbiAgLy8gYSBjYWNoZSB3aXRoIGluZGl2aWR1YWwgbmF2IGl0ZW1zXG4gIHZhciBjYWNoZU5hdkl0ZW1zID0gJGNhY2hlRmFjdG9yeSgnbmF2SXRlbScpO1xuXG4gIC8vIGEgY2FjaGUgd2l0aCB0aGUgcHJvbWlzZXMgb2YgZWFjaCBjb2xsYWIncyBuYXYgdHJlZSByb290XG4gIHZhciBjYWNoZU5hdlJvb3RzID0gJGNhY2hlRmFjdG9yeSgnbmF2Um9vdCcpO1xuXG4gIHZhciBOYXZJdGVtID0gZnVuY3Rpb24oYXR0cikge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBhbmd1bGFyLmZvckVhY2goYXR0ciwgZnVuY3Rpb24odiwgaykge1xuICAgICAgc2VsZltrXSA9IHY7XG4gICAgfSk7XG4gICAgaWYgKGFuZ3VsYXIuaXNVbmRlZmluZWQodGhpcy5jaGlsZHJlbikpIHtcbiAgICAgIHRoaXMuY2hpbGRyZW4gPSBbXTtcbiAgICB9XG4gIH07XG4gIE5hdkl0ZW0ucHJvdG90eXBlID0ge1xuICAgIHRvSnNvbjogZnVuY3Rpb24oKSB7XG4gICAgICAvKiBqc2hpbnQgY2FtZWxjYXNlOiBmYWxzZSAqL1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgIGFwcF9pZDogdGhpcy5hcHBJZCxcbiAgICAgICAgY29sbGFiOiB0aGlzLmNvbGxhYklkLFxuICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICAgICAgb3JkZXJfaW5kZXg6IHRoaXMub3JkZXIsXG4gICAgICAgIHR5cGU6IHRoaXMudHlwZSB8fCAodGhpcy5mb2xkZXIgPyAnRk8nIDogJ0lUJyksXG4gICAgICAgIHBhcmVudDogdGhpcy5wYXJlbnRJZFxuICAgICAgfTtcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oYXR0cnMpIHtcbiAgICAgIGFuZ3VsYXIuZm9yRWFjaChbXG4gICAgICAgICdpZCcsICduYW1lJywgJ2NoaWxkcmVuJywgJ2NvbnRleHQnLFxuICAgICAgICAnY29sbGFiSWQnLCAnYXBwSWQnLCAnb3JkZXInLCAnZm9sZGVyJyxcbiAgICAgICAgJ3BhcmVudElkJywgJ3R5cGUnXG4gICAgICBdLCBmdW5jdGlvbihhKSB7XG4gICAgICAgIGlmIChhbmd1bGFyLmlzRGVmaW5lZChhdHRyc1thXSkpIHtcbiAgICAgICAgICB0aGlzW2FdID0gYXR0cnNbYV07XG4gICAgICAgIH1cbiAgICAgIH0sIHRoaXMpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGVuc3VyZUNhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBjYWNoZU5hdkl0ZW1zLnB1dChrZXkodGhpcy5jb2xsYWJJZCwgdGhpcy5pZCksIHRoaXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICB9O1xuICAvKipcbiAgICogTWFuYWdlIGBhY2NgIGFjY3VtdWxhdG9yIHdpdGggYWxsIHRoZSBkYXRhIGZyb20ganNvbkFycmF5IGFuZCByZXR1cm4gaXQuXG4gICAqXG4gICAqIEBwYXJhbSAge2ludH0gY29sbGFiSWQgIHRoZSBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7YXJyYXl9IGpzb25BcnJheSBkZXNjcmlwdGlvbiBvZiB0aGUgY2hpbGRyZW5cbiAgICogQHBhcmFtICB7QXJyYXl9IGFjYyAgICAgICB0aGUgYWNjdW11bGF0b3JcbiAgICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgICB0aGUgY2hpbGRyZW5cbiAgICovXG4gIGZ1bmN0aW9uIGNoaWxkcmVuRnJvbUpzb24oY29sbGFiSWQsIGpzb25BcnJheSwgYWNjKSB7XG4gICAgYWNjID0gYWNjIHx8IFtdO1xuICAgIC8vIGFuIHVuZGVmaW5lZCBhcnJheSBtZWFucyB3ZSBhYm9ydCB0aGUgcHJvY2Vzc1xuICAgIC8vIHdoZXJlIGFuIGVtcHR5IGFycmF5IHdpbGwgZW5zdXJlIHRoZSByZXN1bHRpbmcgYXJyYXlcbiAgICAvLyBpcyBlbXB0eSBhcyB3ZWxsLlxuICAgIGlmIChhbmd1bGFyLmlzVW5kZWZpbmVkKGpzb25BcnJheSkpIHtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfVxuXG4gICAgYWNjLmxlbmd0aCA9IDA7XG4gICAgYW5ndWxhci5mb3JFYWNoKGpzb25BcnJheSwgZnVuY3Rpb24oanNvbikge1xuICAgICAgYWNjLnB1c2goTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwganNvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiBhY2M7XG4gIH1cbiAgTmF2SXRlbS5mcm9tSnNvbiA9IGZ1bmN0aW9uKGNvbGxhYklkLCBqc29uKSB7XG4gICAgLyoganNoaW50IGNhbWVsY2FzZTogZmFsc2UgKi9cbiAgICB2YXIgYXR0cnMgPSB7XG4gICAgICBpZDoganNvbi5pZCxcbiAgICAgIGFwcElkOiBqc29uLmFwcF9pZCxcbiAgICAgIGNvbGxhYklkOiBjb2xsYWJJZCxcbiAgICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICAgIGNvbnRleHQ6IGpzb24uY29udGV4dCxcbiAgICAgIG9yZGVyOiBqc29uLm9yZGVyX2luZGV4LFxuICAgICAgZm9sZGVyOiBqc29uLnR5cGUgPT09ICdGTycsXG4gICAgICB0eXBlOiBqc29uLnR5cGUsXG4gICAgICBwYXJlbnRJZDoganNvbi5wYXJlbnQsXG4gICAgICBjaGlsZHJlbjogY2hpbGRyZW5Gcm9tSnNvbihjb2xsYWJJZCwganNvbi5jaGlsZHJlbilcbiAgICB9O1xuICAgIHZhciBrID0ga2V5KGNvbGxhYklkLCBhdHRycy5pZCk7XG4gICAgdmFyIGNhY2hlZCA9IGNhY2hlTmF2SXRlbXMuZ2V0KGspO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIHJldHVybiBjYWNoZWQudXBkYXRlKGF0dHJzKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBOYXZJdGVtKGF0dHJzKS5lbnN1cmVDYWNoZWQoKTtcbiAgfTtcblxuICB2YXIgZ2V0Um9vdCA9IGZ1bmN0aW9uKGNvbGxhYklkKSB7XG4gICAgdmFyIHRyZWVQcm9taXNlID0gY2FjaGVOYXZSb290cy5nZXQoY29sbGFiSWQpO1xuXG4gICAgaWYgKCF0cmVlUHJvbWlzZSkge1xuICAgICAgdHJlZVByb21pc2UgPSAkaHR0cC5nZXQoY29sbGFiQXBpVXJsICsgY29sbGFiSWQgKyAnL25hdi9hbGwvJykudGhlbihcbiAgICAgICAgZnVuY3Rpb24ocmVzcCkge1xuICAgICAgICAgIHZhciByb290O1xuICAgICAgICAgIHZhciBpO1xuICAgICAgICAgIHZhciBpdGVtO1xuICAgICAgICAgIHZhciBkYXRhID0gb3JkZXJCeUZpbHRlcihyZXNwLmRhdGEsICcrb3JkZXJfaW5kZXgnKTtcblxuICAgICAgICAgIC8vIGZpbGwgaW4gdGhlIGNhY2hlXG4gICAgICAgICAgZm9yIChpID0gMDsgaSAhPT0gZGF0YS5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaXRlbSA9IE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIGRhdGFbaV0pO1xuICAgICAgICAgICAgaWYgKGl0ZW0uY29udGV4dCA9PT0gJ3Jvb3QnKSB7XG4gICAgICAgICAgICAgIHJvb3QgPSBpdGVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGxpbmsgY2hpbGRyZW4gYW5kIHBhcmVudHNcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpICE9PSBkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBkYXRhW2ldLmlkKSk7XG4gICAgICAgICAgICBpZiAoaXRlbS5wYXJlbnRJZCkge1xuICAgICAgICAgICAgICB2YXIgcGFyZW50ID0gY2FjaGVOYXZJdGVtcy5nZXQoa2V5KGNvbGxhYklkLCBpdGVtLnBhcmVudElkKSk7XG4gICAgICAgICAgICAgIHBhcmVudC5jaGlsZHJlbi5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByb290O1xuICAgICAgICB9LFxuICAgICAgICBoYnBVdGlsLmZlcnJcbiAgICAgICk7XG5cbiAgICAgIGNhY2hlTmF2Um9vdHMucHV0KGNvbGxhYklkLCB0cmVlUHJvbWlzZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWVQcm9taXNlO1xuICB9O1xuXG4gIHZhciBnZXQgPSBmdW5jdGlvbihjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGdldFJvb3QoY29sbGFiSWQpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgayA9IGtleShjb2xsYWJJZCwgbm9kZUlkKTtcbiAgICAgIHZhciBpdGVtID0gY2FjaGVOYXZJdGVtcy5nZXQoayk7XG5cbiAgICAgIGlmICghaXRlbSkge1xuICAgICAgICAkbG9nLmVycm9yKCd1bmtub3duIG5hdiBpdGVtJywgayk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpdGVtO1xuICAgIH0pO1xuICB9O1xuXG4gIHZhciBhZGROb2RlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICByZXR1cm4gJGh0dHAucG9zdChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycsIG5hdkl0ZW0udG9Kc29uKCkpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzcCkge1xuICAgICAgcmV0dXJuIE5hdkl0ZW0uZnJvbUpzb24oY29sbGFiSWQsIHJlc3AuZGF0YSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgZGVsZXRlTm9kZSA9IGZ1bmN0aW9uKGNvbGxhYklkLCBuYXZJdGVtKSB7XG4gICAgcmV0dXJuICRodHRwLmRlbGV0ZShjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgKyBuYXZJdGVtLmlkICsgJy8nKVxuICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgY2FjaGVOYXZJdGVtcy5yZW1vdmUoa2V5KGNvbGxhYklkLCBuYXZJdGVtLmlkKSk7XG4gICAgfSwgaGJwVXRpbC5mZXJyKTtcbiAgfTtcblxuICB2YXIgdXBkYXRlID0gZnVuY3Rpb24oY29sbGFiSWQsIG5hdkl0ZW0pIHtcbiAgICBuYXZJdGVtLmNvbGxhYklkID0gY29sbGFiSWQ7XG4gICAgcmV0dXJuICRodHRwLnB1dChjb2xsYWJBcGlVcmwgKyBjb2xsYWJJZCArICcvbmF2LycgK1xuICAgICAgbmF2SXRlbS5pZCArICcvJywgbmF2SXRlbS50b0pzb24oKSlcbiAgICAudGhlbihmdW5jdGlvbihyZXNwKSB7XG4gICAgICByZXR1cm4gTmF2SXRlbS5mcm9tSnNvbihjb2xsYWJJZCwgcmVzcC5kYXRhKTtcbiAgICB9LCBoYnBVdGlsLmZlcnIpO1xuICB9O1xuXG4gIC8vIG9yZGVyaW5nIG9wZXJhdGlvbiBuZWVkcyB0byBiZSBnbG9iYWxseSBxdWV1ZWQgdG8gZW5zdXJlIGNvbnNpc3RlbmN5LlxuICB2YXIgaW5zZXJ0UXVldWUgPSAkcS53aGVuKCk7XG5cbiAgLyoqXG4gICAqIEluc2VydCBub2RlIGluIHRoZSB0aHJlZS5cbiAgICpcbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCAgIGlkIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtICB7TmF2SXRlbX0gbmF2SXRlbSAgICBOYXYgaXRlbSBpbnN0YW5jZVxuICAgKiBAcGFyYW0gIHtOYXZJdGVtfSBwYXJlbnRJdGVtIHBhcmVudCBpdGVtXG4gICAqIEBwYXJhbSAge2ludH0gaW5zZXJ0QXQgICBhZGQgdG8gdGhlIG1lbnVcbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgIGEgcHJvbWlzZSB0aGF0IHdpbGxcbiAgICogICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGUgdXBkYXRlIG5hdiBpdGVtXG4gICAqL1xuICBmdW5jdGlvbiBpbnNlcnROb2RlKGNvbGxhYklkLCBuYXZJdGVtLCBwYXJlbnRJdGVtLCBpbnNlcnRBdCkge1xuICAgIHJldHVybiBpbnNlcnRRdWV1ZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgbmF2SXRlbS5vcmRlciA9IGluc2VydEF0ICsgMTsgLy8gZmlyc3QgaXRlbSBvcmRlcl9pbmRleCBtdXN0IGJlIDFcbiAgICAgIG5hdkl0ZW0ucGFyZW50SWQgPSBwYXJlbnRJdGVtLmlkO1xuICAgICAgcmV0dXJuIHVwZGF0ZShjb2xsYWJJZCwgbmF2SXRlbSk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgdW5pcXVlIGtleSBmb3IgY2hhY2hpbmcgYSBuYXYgaXRlbS5cbiAgICogQHBhcmFtICB7aW50fSBjb2xsYWJJZCBjb2xsYWIgSURcbiAgICogQHBhcmFtICB7aW50fSBub2RlSWQgICBOYXZJdGVtIElEXG4gICAqIEByZXR1cm4ge3N0cmluZ30gICAgICAgdGhlIHVuaXF1ZSBrZXlcbiAgICovXG4gIGZ1bmN0aW9uIGtleShjb2xsYWJJZCwgbm9kZUlkKSB7XG4gICAgcmV0dXJuIGNvbGxhYklkICsgJy0tJyArIG5vZGVJZDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgTmF2SXRlbTogTmF2SXRlbSxcbiAgICBnZXRSb290OiBnZXRSb290LFxuICAgIGdldE5vZGU6IGdldCxcbiAgICBhZGROb2RlOiBhZGROb2RlLFxuICAgIHNhdmVOb2RlOiB1cGRhdGUsXG4gICAgZGVsZXRlTm9kZTogZGVsZXRlTm9kZSxcbiAgICBpbnNlcnROb2RlOiBpbnNlcnROb2RlXG4gIH07XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicENvbGxhYlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2NvbGxhYicsIGNyZWF0ZUNvbGxhYik7XG5cbiAgLyoqXG4gICAqIEBuYW1lIGNyZWF0ZUNvbGxhYlxuICAgKiBAZGVzY3JpcHRpb25cbiAgICogIENyZWF0ZSBhIGNvbGxhYiBkZWZpbmVkIGJ5IHRoZSBnaXZlbiBvcHRpb25zLlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIFBhcmFtZXRlcnMgdG8gY3JlYXRlIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMubmFtZSAtIE5hbWUgb2YgdGhlIGNvbGxhYlxuICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5kZXNjcmlwdGlvbiAtIERlc2NyaXB0aW9uIGluIGxlc3MgdGhhbiAxNDAgY2hhcmFjdGVyc1xuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9mIHRoZSBjb2xsYWJcbiAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMucHJpdmFjeSAtICdwcml2YXRlJyBvciAncHVibGljJy4gTm90ZXMgdGhhdCBvbmx5XG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBIQlAgTWVtYmVycyBjYW4gY3JlYXRlIHByaXZhdGUgY29sbGFiXG4gICAqIEBwYXJhbSB7QXJyYXl8b2JqZWN0fSBuYXYgLSBvbmUgb3IgbW9yZSBuYXYgaXRlbSBkZXNjcmlwdG9yIHRoYXQgd2lsbCBiZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3NlZCB0byB0aGUgbmF2IHRhc2suXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IC0gV2lsbCByZXRyaWV2ZSBhIGNvbGxhYiBvciBhIEhicEVycm9yXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVDb2xsYWIob3B0aW9ucykge1xuICAgIHZhciBhdHRyID0gaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5leHRyYWN0QXR0cmlidXRlcyhcbiAgICAgIG9wdGlvbnMsXG4gICAgICBbJ25hbWUnLCAnZGVzY3JpcHRpb24nLCAncHJpdmF0ZSddXG4gICAgKTtcblxuICAgIHJldHVybiBoYnBDb2xsYWJTdG9yZS5jcmVhdGUoYXR0cikudGhlbihmdW5jdGlvbihjb2xsYWIpIHtcbiAgICAgIHJldHVybiAkcS53aGVuKGNyZWF0ZU5hdkl0ZW1zKGNvbGxhYiwgb3B0aW9ucy5uYXYpKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gY29sbGFiO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIENyZWF0ZSBuYXZpZ2F0aW9uIGl0ZW1zIGZvciB0aGUgZ2l2ZW4gY29sbGFiIHVzaW5nXG4gICAgICogaW5mb3JtYXRpb24gZnJvbSBuYXZDb25maWcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gIHtDb2xsYWJ9IGNvbGxhYiAgICBbZGVzY3JpcHRpb25dXG4gICAgICogQHBhcmFtICB7QXJyYXl8b2JqZWN0fSBuYXZDb25maWcgY29uZmlndXJhdGlvbiBmb3Igb25lIG9yIG1vcmUgbmF2aWdhdGlvblxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5cbiAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgIHJlc29sdmUgb25jZSBldmVyeSBuYXYgaXRlbSBoYXMgYmVlbiBjcmVhdGVkLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU5hdkl0ZW1zKGNvbGxhYiwgbmF2Q29uZmlnKSB7XG4gICAgICBpZiAoIW5hdkNvbmZpZykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIWFuZ3VsYXIuaXNBcnJheShuYXZDb25maWcpKSB7XG4gICAgICAgIG5hdkNvbmZpZyA9IFtuYXZDb25maWddO1xuICAgICAgfVxuICAgICAgdmFyIHByb21pc2UgPSAkcS53aGVuKCk7XG4gICAgICBhbmd1bGFyLmZvckVhY2gobmF2Q29uZmlnLCBmdW5jdGlvbihuKSB7XG4gICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnRhc2soXG4gICAgICAgICAgICB7bmF2OiBhbmd1bGFyLmV4dGVuZCh7Y29sbGFiOiBjb2xsYWJ9LCBuKX1cbiAgICAgICAgICApLnJ1bigpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfVxuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShcbiAgaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5TmF2U3RvcmUsXG4gIGhicENvbGxhYm9yYXRvcnlBdXRvbWF0b3Jcbikge1xuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yLnJlZ2lzdGVySGFuZGxlcignbmF2JywgY3JlYXRlTmF2SXRlbSk7XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5ldyBuYXYgaXRlbS5cbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBhIGNvbmZpZyBkZXNjcmlwdGlvblxuICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLm5hbWUgbmFtZSBvZiB0aGUgbmF2IGl0ZW1cbiAgICogQHBhcmFtIHtDb2xsYWJ9IGNvbmZpZy5jb2xsYWIgY29sbGFiIGluIHdoaWNoIHRvIGFkZCB0aGUgaXRlbSBpbi5cbiAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy5hcHAgYXBwIG5hbWUgbGlua2VkIHRvIHRoZSBuYXYgaXRlbVxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIGEgTmF2SXRlbSBpbnN0YW5jZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlTmF2SXRlbShjb25maWcpIHtcbiAgICB2YXIgY29sbGFiID0gY29uZmlnLmNvbGxhYjtcbiAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeUFwcFN0b3JlLmZpbmRPbmUoY29uZmlnLmFwcClcbiAgICAudGhlbihmdW5jdGlvbihhcHApIHtcbiAgICAgIHZhciBuYXYgPSBuZXcgaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLk5hdkl0ZW0oe1xuICAgICAgICBjb2xsYWJJZDogY29sbGFiLmlkLFxuICAgICAgICBuYW1lOiBjb25maWcubmFtZSxcbiAgICAgICAgYXBwSWQ6IGFwcC5pZFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gaGJwQ29sbGFib3JhdG9yeU5hdlN0b3JlLmFkZE5vZGUoY29sbGFiLmlkLCBuYXYpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsImFuZ3VsYXIubW9kdWxlKCdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJylcbi5ydW4oZnVuY3Rpb24gY3JlYXRlQ29sbGFiU2VydmljZShcbiAgJGxvZywgJHEsIGhicENvbGxhYlN0b3JlLFxuICBoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yXG4pIHtcbiAgaGJwQ29sbGFib3JhdG9yeUF1dG9tYXRvci5yZWdpc3RlckhhbmRsZXIoJ2NwJywgY29weSk7XG5cbiAgLyoqXG4gICAqIENvcHkgYSBmaWxlIG9yIHJlY3Vyc2l2ZWx5IGEgZm9sZGVyXG4gICAqIEBwYXJhbSB7YXJyYXkvb2JqZWN0fSAgY29uZmlnIGEgY29uZmlnIGRlc2NyaXB0aW9uXG4gICAqIEByZXR1cm4ge2FycmF5L2VudGl0eX0gY3JlYXRlZCBlbnRpdGllc1xuICAgKi9cbiAgZnVuY3Rpb24gY29weShjb25maWcpIHtcbiAgICBpZiAoIWFuZ3VsYXIuaXNBcnJheShjb25maWcpKSB7XG4gICAgICBjb25maWcgPSBbXTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn0pO1xuIiwiYW5ndWxhci5tb2R1bGUoJ2hicENvbGxhYm9yYXRvcnknLCBbXG4gICdoYnBDb2xsYWJvcmF0b3J5QXV0b21hdG9yJyxcbiAgJ2hicENvbGxhYm9yYXRvcnlOYXZTdG9yZScsXG4gICdoYnBDb2xsYWJvcmF0b3J5QXBwU3RvcmUnXG5dKTtcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
