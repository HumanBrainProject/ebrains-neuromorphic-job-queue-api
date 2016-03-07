/* eslint camelcase: 0 */

angular.module('hbpCollaboratoryAppStore', ['bbpConfig', 'hbpCommon'])
.constant('folderAppId', '__collab_folder__')
.service('hbpCollaboratoryAppStore', function(
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
});
