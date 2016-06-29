angular.module('clb-ui-storage')
.directive('clbFileBrowser', clbFileBrowser);

// --------------- //

/**
 * @namespace clbFileBrowser
 * @desc
 * clbFileBrowser Directive
 *
 * This directive renders a file browser. It handles creation of folder,
 * mutliple file uploads and selection of entity. Focus selection change can be
 * detected by listening to the event ``clbFileBrowser:focusChanged``.
 *
 *
 * Attributes
 * ----------
 *
 * ===================================  ==========================================================
 * Parameter                            Description
 * ===================================  ==========================================================
 * ``{EntityDescriptor} [clb-root]``    A project or a folder that will be the root of the tree.
 * ``{EntityDescriptor} [clb-entity]``  The selected entity.
 * ===================================  ==========================================================
 *
 *
 * Events
 * ------
 *
 * ================================  ==========================================================
 * clbFileBrowser:focusChanged       Emitted when the user focus a new file or folder
 * clbFileBrowser:startCreateFolder  Emitted when the user start to create a new folder
 * ================================  ==========================================================
 *
 * @example <caption>Simple directive usage</caption>
 * <clb-file-browser clb-root="someProjectEntity"
 *                   clb-entity="someSubFolderEntity">
 * </clb-file-browser>
 *
 * @memberof module:clb-ui-storage
 * @return {object} Angular Directive
 * @param {object} lodash Angular DI
 */
function clbFileBrowser(lodash) {
  return {
    restrict: 'E',
    scope: {
      entity: '=?clbEntity',
      root: '=clbRoot'
    },
    templateUrl: 'file-browser.directive.html',
    link: clbFileBrowserLink,
    controllerAs: 'browserView',
    controller: FileBrowserViewModel
  };

  /**
   * @namespace FileBrowserViewModel
   * @desc
   * ViewModel of the clbFileBrowser directive. This instance is
   * accessible by all direct children of the file browser.
   *
   * It is responsible to handle all the interactions between the user
   * and the services. It does not update the views directly but sends
   * the relevant events when necessary.
   * @memberof module:clb-ui-storage.clbFileBrowser
   * @param {object} $scope     Angular DI
   * @param {object} $log       Angular DI
   * @param {object} $q         Angular DI
   * @param {object} $timeout   Angular DI
   * @param {object} clbStorage Angular DI
   */
  function FileBrowserViewModel(
    $scope,
    $log,
    $q,
    $timeout,
    clbStorage
  ) {
    var vm = this;
    vm.currentEntity = null; // the (container) entity that this view currently describe
    vm.folders = []; // array of displayed folder
    vm.hasMoreFolders = false;
    vm.files = [];   // array of displayed files
    vm.uploads = []; // array of file currently uploading
    vm.hasMoreFiles = false;
    vm.selectedEntity = null; // currently focused entity
    vm.rootEntity = null; // the top level entity;
    vm.isRoot = true;
    vm.error = null;
    vm.isLoading = true;
    vm.canEdit = false;
    vm.thumbnailUrl = null; // current file thumbnail if any

    vm.init = init;
    vm.handleFocus = handleFocusEvent;
    vm.handleNavigation = handleNavigationEvent;
    vm.loadMoreFiles = loadMoreFiles;
    vm.loadMoreFolders = loadMoreFolders;
    vm.onFileChanged = onFileChanged;
    vm.startCreateFolder = startCreateFolder;
    vm.doCreateFolder = doCreateFolder;
    vm.cancelCreateFolder = cancelCreateFolder;
    vm.defineThumbnailUrl = defineThumbnailUrl;
    vm.isEmpty = isEmpty;

    // ---------------- //

    var currentUpdate;
    var folderLoader;
    var fileLoader;

    /**
     * Initialize the controller
     * @param  {EntityDescriptor} rootEntity    Cannot get past this ancestor
     * @param  {EntityDescriptor} currentEntity The selected entity
     * @private
     */
    function init(rootEntity, currentEntity) {
      vm.rootEntity = rootEntity;
      currentUpdate = update(currentEntity || rootEntity);
    }

    /**
     * @method handleFocus
     * @desc
     * When the user focus on a browser item,
     * emit a 'clbFileBrowser:focusChanged' event.
     *
     * The event signature is (event, newEntity, previousEntity).
     *
     * @param  {Object} entity selected entity
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function handleFocusEvent(entity) {
      if (entity === vm.selectedEntity) {
        return;
      }
      $scope.$emit('clbFileBrowser:focusChanged', entity, vm.selectedEntity);
      vm.selectedEntity = entity;
    }

    /**
     * @method handleNavigation
     * @desc When the current context change, trigger a navigation update.
     *
     * This will render the view for the new current entity. All navigations
     * are chained to ensure that the future view will end in a consistant
     * state. As multiple requests are needed to render a view, request result
     * would sometimes finish after a new navigation event already occured.
     *
     * @param  {Object} entity the new current entity
     * @return {promise} resolve when the navigation is done.
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function handleNavigationEvent(entity) {
      if (angular.isUndefined(entity) || entity === vm.currentEntity) {
        return;
      }
      currentUpdate = currentUpdate.finally(function() {
        return update(entity);
      });
      return currentUpdate;
    }

    /**
     * Handle error case
     * @private
     * @param {object} err The error to set
     */
    function setError(err) {
      $log.error('error catched by file browser:', err);
      vm.error = err;
      vm.isLoading = false;
    }

    /**
     * @private
     */
    function startCreateFolder() {
      vm.showCreateFolder = true;
      $timeout(function() {
        // the event is captured by the directive scope in order to update
        // the DOM. I choose to not update the DOM in the ViewModel but
        // rather in the directive link function.
        $scope.$emit('clbFileBrowser:startCreateFolder');
      });
    }

    /**
     * @private
     * @param  {Event} $event The browser event
     */
    function doCreateFolder($event) {
      $event.preventDefault();
      clbStorage.create('folder', vm.currentEntity, vm.newFolderName)
      .then(function(entity) {
        vm.newFolderName = '';
        return update(entity);
      })
      .then(function() {
        vm.showFileUpload = true;
      })
      .catch(setError);
    }

    /**
     * @private
     */
    function cancelCreateFolder() {
      vm.newFolderName = '';
      vm.showCreateFolder = false;
    }

    /**
     * Promise fulfilment contains the nearest container. Either the current
     * entity if it is a container, or its parent.
     * @param  {EntityDescriptor} entity The starting point entity
     * @return {Promise}          Fulfilment of the promise retrieve a container entity
     */
    function nearestContainer(entity) {
      if (!entity) {
        return $q.when(null);
      }
      if (clbStorage.isContainer(entity)) {
        return $q.when(entity);
      }
      // Set the currentEntity to the parent and then focus the file
      return clbStorage.getEntity(entity._parent);
    }

    /**
     * [update description]
     * @param  {EntityDescriptor} entity [description]
     * @return {Promise}        Resolve after update completion
     */
    function update(entity) {
      return nearestContainer(entity).then(function(container) {
        vm.isLoading = true;
        vm.currentEntity = container;
        vm.selectedEntity = entity;
        vm.error = null;
        vm.parent = null;
        vm.files = null;
        vm.folders = null;
        vm.uploads = [];
        vm.showFileUpload = false;
        vm.showCreateFolder = false;
        assignIsRoot(container);
        assignCanEdit(container);

        // special exit case for the storage root
        if (!container) {
          return clbStorage.getChildren(null)
          .then(function(rs) {
            return rs.toArray();
          })
          .then(function(projects) {
            vm.folders = projects;
            vm.isLoading = false;
          })
          .catch(setError);
        }

        var promises = [];

        // define the new parent entity
        if (!vm.isRoot && container._parent) {
          promises.push(
            clbStorage.getEntity(container._parent).then(assignParentEntity)
          );
        }

        // define the view folders
        folderLoader = clbStorage.getChildren(container, {
          accept: ['folder'],
          acceptLink: false
        }).instance;
        vm.folders = folderLoader.results;
        promises.push(
          folderLoader.promise
          .then(afterLoadFolders)
        );

        fileLoader = clbStorage.getChildren(container, {
          accept: ['file'],
          acceptLink: false
        }).instance;
        vm.files = fileLoader.results;
        promises.push(
          fileLoader.promise
          .then(afterLoadFiles)
        );

        return $q.all(promises).then(function() {
          vm.isLoading = false;
        });
      })
      .catch(setError);
    }

    /**
     * Load the next page of file entities for the current entity.
     *
     * @return {Promise} resolve when the files are loaded
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function loadMoreFiles() {
      return fileLoader.next()
      .then(afterLoadFiles)
      .catch(setError);
    }

    /**
     * Load the next page of folder entities for the current entity.
     *
     * @return {Promise} resolve when the folders are loaded
     * @memberof module:clb-ui-storage.clbFileBrowser.FileBrowserViewModel
     */
    function loadMoreFolders() {
      return folderLoader.next()
      .then(afterLoadFolders)
      .catch(setError);
    }

    /**
     * @private
     */
    function afterLoadFiles() {
      vm.hasMoreFiles = fileLoader.hasNext;
    }

    /**
     * @private
     */
    function afterLoadFolders() {
      vm.hasMoreFolders = folderLoader.hasNext;
    }

    /**
     * @private
     * @param  {EntityDescriptor} entity [description]
     */
    function assignIsRoot(entity) {
      if (!entity) {
        vm.isRoot = true;
      } else if (vm.rootEntity) {
        vm.isRoot = (entity._uuid === vm.rootEntity._uuid);
      } else {
        vm.isRoot = false;
      }
    }

    /**
     * @private
     * @param  {EntityDescriptor} entity The parent entity
     */
    function assignParentEntity(entity) {
      vm.parent = entity;
    }

    /**
     * Upload files that the user just added to the uploader widget.
     *
     * @param  {Array} files array of File
     */
    function onFileChanged(files) {
      lodash.each(files, function(f) {
        upload(f)
        .then(function(entity) {
          vm.files.push(entity);
        });
      });
      vm.showFileUpload = false;
    }

    /**
     * Create a file entity and upload its associated content.
     *
     * @param  {File} file the file to create and upload
     * @return {Promise} resolve when the file has been uploaded
     */
    function upload(file) {
      var uploadInfo = {
        content: file,
        state: null
      };
      vm.uploads.push(uploadInfo);
      return clbStorage.upload(file, {
        parent: vm.currentEntity
      })
      .then(function(entity) {
        // update file status
        file.state = 'success';
        lodash.remove(vm.uploads, function(info) {
          return info === uploadInfo;
        });
        return entity;
      }, function(err) {
        $log.error('upload error:', err);
        uploadInfo.state = 'error';
        setError(err);
        return $q.reject(err);
      }, function(progressEvent) {
        if (progressEvent && progressEvent.lengthComputable) {
          // update file status
          uploadInfo.state = 'progress';
          uploadInfo.progress = progressEvent;
          uploadInfo.progress.percentage = (progressEvent.loaded * 100) /
            progressEvent.total;
        }
      });
    }

    /**
     * Set the thumbnailUrl.
     * @param  {EntityDescriptor} file a file entity
     */
    function defineThumbnailUrl(file) {
      vm.thumbnailUrl = null;
      if (file._contentType && file._contentType.match(/^image\//)) {
        clbStorage.downloadUrl(file).then(function(res) {
          vm.thumbnailUrl = res;
        });
      }
    }

    var lastAssignCanEditRequest = $q.when();
    /**
     * @private
     * @param  {EntityDescriptor} entity a file entity
     * @return {Promise}        [description]
     */
    function assignCanEdit(entity) {
      lastAssignCanEditRequest = lastAssignCanEditRequest
      .then(function() {
        if (!entity) {
          vm.canEdit = false;
          return;
        }
        return clbStorage.getUserAccess(entity).then(function(acl) {
          vm.canEdit = acl.canWrite;
        });
      });
      return lastAssignCanEditRequest;
    }

    /**
     * @private
     * @return {boolean} if the current folder is empty
     */
    function isEmpty() {
      return !vm.isLoading &&
        (!vm.folders || vm.folders.length === 0) &&
        (!vm.files || vm.files.length === 0);
    }
  }
}

/**
 * @private
 * @param  {object} scope   Angular DI
 * @param  {Element} elt    Angular DI
 * @param  {object} attrs   Angular DI
 * @param  {object} ctrl    Angular DI
 */
function clbFileBrowserLink(scope, elt, attrs, ctrl) {
  // run the init function once, when the root has been defined.
  // this ensure the main page is not loaded first with all projects,
  // then with the correct root.
  var delWaitForRootWatcher = scope.$watch('root', function(root) {
    if (angular.isUndefined(root)) {
      return;
    }
    ctrl.init(root, scope.entity);
    var delEntityWatcher = scope.$watch('entity', function(value) {
      ctrl.handleNavigation(value);
    });
    scope.$on('$destroy', delEntityWatcher);
    delWaitForRootWatcher();
  });
  scope.$on('$destroy', delWaitForRootWatcher);
  scope.$on('clbFileBrowser:startCreateFolder', function(evt) {
    evt.preventDefault();
    elt[0].querySelector('.new-folder-name').focus();
  });
}
