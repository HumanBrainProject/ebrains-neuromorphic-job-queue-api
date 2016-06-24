/* eslint max-nested-callbacks:[2, 6] */
describe('clbFileBrowser', function() {
  // injected services
  var $rootScope;
  var $compile;
  var $q;

  var scope;
  var isolatedScope;
  var entityFile;
  var entityFolder;
  var element;
  var storage;
  var resultSet;
  var clbError;
  var fileResultSet;
  var folderResultSet;
  var fakeGetChildren;
  var entityProject;

  beforeEach(module('clb-ui-storage'));
  beforeEach(inject(function(
    _$rootScope_,
    _$compile_,
    _$q_,
    $templateCache,
    _clbError_,
    clbStorage,
    clbResultSet
  ) {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $q = _$q_;
    storage = clbStorage;
    resultSet = clbResultSet;
    clbError = _clbError_;

    jasmine.cacheTemplate($templateCache,
      'file-browser.directive.html',
      'src/ui-storage/');
    jasmine.cacheTemplate($templateCache,
      'file-browser-folder.directive.html',
      'src/ui-storage/');
    jasmine.cacheTemplate($templateCache,
      'file-browser-path.directive.html',
      'src/ui-storage/');
    jasmine.cacheTemplate($templateCache,
      'file-browser-tooltip.directive.html',
      'src/ui-storage/');
    jasmine.cacheTemplate($templateCache,
      'file-upload.directive.html',
      'src/ui-storage/');
    jasmine.cacheTemplate($templateCache,
      'error-message.directive.html',
      'src/ui-error/');
  }));

  beforeEach(function() {
    entityFile = {
      _uuid: 'AA7D6620-CB56-4D0C-AAE1-D1DEBCFBEFF1',
      _entityType: 'file',
      _name: 'myfile',
      _parent: '51677A22-F12E-45CD-9E43-007EE3E2F314'
    };
    entityFolder = {
      _uuid: '51677A22-F12E-45CD-9E43-007EE3E2F314',
      _name: 'myfolder',
      _entityType: 'folder',
      _parent: '5E5D28DF-2B75-40E7-8918-72F885C52A48'
    };
    entityProject = {
      _uuid: '5E5D28DF-2B75-40E7-8918-72F885C52A48',
      _name: 'someproject',
      _entityType: 'project'
    };
    // The content of data does not match the one from the server.
    // It is using the default from clbResultSet, not the heavily modified
    // version from clbStorage.
    fileResultSet = resultSet.get({data: {
      results: [entityFile]
    }}).instance;

    folderResultSet = resultSet.get({data: {
      results: [entityFolder]
    }}).instance;

    fakeGetChildren = function(parent, options) {
      if (options && options.accept[0] === 'file') {
        return fileResultSet.promise;
      }
      return folderResultSet.promise;
    };

    scope = $rootScope.$new();
    scope.clbRoot = null;
    element = angular.element(
      '<clb-file-browser clb-root="clbRoot" clb-entity="clbEntity">' +
      '</clb-file-browser>');
  });

  // Prevent request mismatch
  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

  describe('projects listing', function() {
    it('should call getChildren with null parameter', function() {
      spyOn(storage, 'getChildren').and
      .returnValue(resultSet.get({}));
      $compile(element)(scope);
      scope.$apply();
      isolatedScope = element.isolateScope();
      expect(storage.getChildren).toHaveBeenCalledWith(null);
    });

    it('should retrieve all projects', function() {
      var rs = resultSet.get({data: {results: [entityProject]}}).instance;
      spyOn(storage, 'getChildren').and
      .returnValue(rs.promise);
      spyOn(rs, 'toArray').and.callThrough();
      $compile(element)(scope);
      scope.$apply();
      isolatedScope = element.isolateScope();
      expect(rs.toArray).toHaveBeenCalledWith();
      expect(isolatedScope.browserView.folders).toEqual(rs.results);
      expect(isolatedScope.browserView.folders.length).toBe(1);
    });
  });

  describe('when clbEntity is a file', function() {
    var compile;
    beforeEach(function() {
      spyOn(storage, 'getEntity')
      .and.callFake(function(locator) {
        if (locator === entityFolder._uuid) {
          return $q.when(entityFolder);
        } else if (locator === entityFile._uuid) {
          return $q.when(entityFile);
        } else if (locator === entityProject._uuid) {
          return $q.when(entityProject);
        }
        fail('Unexpected locator:' + locator);
      });

      spyOn(storage, 'getUserAccess')
      .and.returnValue($q.when({canRead: true}));

      spyOn(storage, 'getAncestors')
      .and.callFake(function(entity) {
        expect(entity).toBe(entityFolder);
        return $q.when([entityFolder]);
      });

      spyOn(storage, 'getChildren')
      .and.callFake(fakeGetChildren);

      scope.clbEntity = entityFile;

      compile = function() {
        $compile(element)(scope);
        scope.$apply();
        isolatedScope = element.isolateScope();
      };
    });

    it('should resolve the parent entity', function() {
      compile();
      expect(storage.getEntity).toHaveBeenCalledWith(entityFolder._uuid);
    });

    it('should list parent entity children', function() {
      compile();
      expect(storage.getChildren).toHaveBeenCalledWith(entityFolder, {
        accept: ['file'],
        acceptLink: false
      });
      expect(storage.getChildren).toHaveBeenCalledWith(entityFolder, {
        accept: ['folder'],
        acceptLink: false
      });
    });

    it('should faile if the parent cannot be fetched', function() {
      storage.getEntity.and.callFake(function(locator) {
        expect(locator).toBe(-1);
        return $q.reject({message: 'Error'});
      });
      entityFile._parent = -1;
      compile();
      expect(isolatedScope.browserView.error.message).toBe('Error');
    });
  });

  describe('when clbEntity is a project', function() {
    var project;

    beforeEach(function() {
      project = {
        _uuid: '5E5D28DF-2B75-40E7-8918-72F885C52A48',
        _name: 'someproject',
        _entityType: 'project'
      };

      spyOn(storage, 'getChildren')
      .and.callFake(fakeGetChildren);

      spyOn(storage, 'getEntity')
      .and.returnValue($q.when(project));

      // Ignore access rights
      spyOn(storage, 'getUserAccess')
      .and.returnValue($q.when({}));

      scope.clbEntity = project;
      $compile(element)(scope);
      scope.$apply();
      isolatedScope = element.isolateScope();
    });

    it('should set the project as the current item', function() {
      expect(isolatedScope.browserView.currentEntity).toBe(project);
    });

    it('should set the parent as null', function() {
      expect(isolatedScope.browserView.parent).toBeNull();
    });

    it('should query for the project folders', function() {
      expect(storage.getChildren)
      .toHaveBeenCalledWith(project, jasmine.any(Object));
      expect(isolatedScope.browserView.folders.length).toBe(1);
    });

    describe('selected item', function() {
      it('should select the current item by default', function() {
        expect(isolatedScope.browserView.selectedEntity).toBe(project);
      });
      it('should select another when needed', function() {
        isolatedScope.browserView.handleFocus(entityFile);
        expect(isolatedScope.browserView.selectedEntity).toBe(entityFile);
      });
    });

    describe('navigate to a folder', function() {
      beforeEach(function() {
        // Add pagination to results
        fileResultSet = resultSet.get({data: {
          results: [entityFile], next: 'more files'
        }}).instance;

        folderResultSet = resultSet.get({data: {
          results: [entityFolder], next: 'more folders'
        }}).instance;

        spyOn(storage, 'getAncestors').and.returnValue($q.when([project]));
        isolatedScope.browserView.handleNavigation(entityFolder);
        scope.$apply();
      });

      it('update the currentEntity', function() {
        expect(storage.getAncestors).toHaveBeenCalledWith(entityFolder, null);
        expect(isolatedScope.browserView.currentEntity).toBe(entityFolder);
      });

      it('is not the root entity anymore', function() {
        expect(isolatedScope.browserView.isRoot).toBe(false);
      });

      it('update the selected entity', function() {
        expect(isolatedScope.browserView.selectedEntity).toBe(entityFolder);
      });

      it('should use project as parent entity', function() {
        expect(isolatedScope.browserView.parent).toBe(project);
      });

      describe('and load more', function() {
        it('should load more files', function() {
          expect(isolatedScope.browserView.hasMoreFiles).toBe(true);
          spyOn(fileResultSet, 'next').and.callFake(function() {
            fileResultSet.hasNext = false;
            return $q.when();
          });
          storage.getChildren.and.returnValue(
            resultSet.get({data: {results: []}}));
          isolatedScope.browserView.loadMoreFiles();
          scope.$apply();
          expect(isolatedScope.browserView.hasMoreFiles).toBe(false);
        });
        it('should load more folders', function() {
          expect(isolatedScope.browserView.hasMoreFolders).toBe(true);
          spyOn(folderResultSet, 'next').and.callFake(function() {
            folderResultSet.hasNext = false;
            return $q.when();
          });
          isolatedScope.browserView.loadMoreFolders();
          scope.$apply();
          expect(isolatedScope.browserView.hasMoreFolders).toBe(false);
        });
      });
    });

    describe('file upload', function() {
      var vm;
      beforeEach(function() {
        scope.clbEntity = project;
        $compile(element)(scope);
        scope.$apply();
        isolatedScope = element.isolateScope();
        vm = isolatedScope.browserView;
        vm.showFileUpload = true;
        scope.$apply();
      });

      describe('vm.onFileChanged', function() {
        var files;
        beforeEach(function() {
          files = [{
            name: 'FileName.txt',
            type: 'text/plain'
          }];
        });

        it('should add the files to browserView.uploads', function() {
          spyOn(storage, 'upload')
            .and.returnValue($q.when({}));
          vm.onFileChanged(files);
          expect(vm.uploads).toEqual([{content: files[0], state: null}]);
        });

        it('should then add the file in vm.files',
        inject(function(clbStorage) {
          var expectedEntity = {
            _uuid: 555,
            _name: 'FileName.txt',
            _contentType: 'text/plain',
            _parent: scope.clbEntity._uuid
          };
          spyOn(clbStorage, 'upload')
            .and.returnValue($q.when(expectedEntity));
          vm.onFileChanged(files);
          scope.$apply();
          expect(vm.uploads).toEqual([]);
          expect(vm.files).toEqual([entityFile, expectedEntity]);
        }));

        it('should handle progress event', inject(function(clbStorage) {
          var d = $q.defer();
          spyOn(clbStorage, 'upload').and.returnValue(d.promise);
          vm.onFileChanged(files);
          scope.$apply();
          d.notify({
            lengthComputable: true,
            total: 200,
            loaded: 100
          });
          scope.$apply();
          expect(vm.uploads[0].state).toBe('progress');
          expect(vm.uploads[0].progress.percentage).toBe(50);
        }));

        it('should handle errors',
        inject(function(clbStorage, clbError) {
          var err = clbError.error({type: 'TestException'});
          spyOn(clbStorage, 'upload').and.returnValue($q.reject(err));
          vm.onFileChanged(files);
          scope.$apply();
          expect(vm.uploads[0].state).toBe('error');
          expect(vm.error).toBe(err);
        }));
      });
    });

    describe('folder creation', function() {
      var vm;
      beforeEach(function() {
        scope.clbEntity = project;
        $compile(element)(scope);
        scope.$apply();
        isolatedScope = element.isolateScope();
        vm = isolatedScope.browserView;
      });

      it('should emit a clbFileBrowser:startCreateFolder event',
      inject(function($timeout) {
        vm.startCreateFolder();
        var called = false;

        scope.$on('clbFileBrowser:startCreateFolder', function() {
          called = true;
        });
        scope.$apply();
        $timeout.flush();
        expect(called).toBe(true);
      }));

      it('should use browserView.newFolderName', function() {
        var event = {
          preventDefault: jasmine.createSpy('preventDefault')
        };
        spyOn(storage, 'create').and.returnValue($q.when());

        vm.newFolderName = 'My New Folder';
        vm.doCreateFolder(event);
        expect(storage.create).toHaveBeenCalledWith(
          'folder', scope.clbEntity, 'My New Folder');
      });

      describe('then', function() {
        var newFolder;
        beforeEach(function() {
          var event = {
            preventDefault: jasmine.createSpy('preventDefault')
          };
          newFolder = {
            _uuid: 333,
            _name: 'The Folder',
            _entityType: 'folder'
          };
          spyOn(storage, 'create').and.returnValue($q.when(newFolder));
          vm.newFolderName = newFolder.name;
          vm.doCreateFolder(event);
          scope.$apply();
        });

        it('should display the new folder', function() {
          expect(vm.currentEntity).toBe(newFolder);
        });

        it('should display the upload file dialog', function() {
          expect(vm.showFileUpload).toBe(true);
        });
      });
    });

    describe('error handling', function() {
      it('should failed when parent entity cannot be fetched', function() {
        var invalidEntity = {
          _uuid: '51677A22-F12E-45CD-9E43-007EE3E2F314',
          _parent: -1,
          _entityType: 'folder'
        };
        scope.clbEntity = project;
        $compile(element)(scope);
        scope.$apply();
        isolatedScope = element.isolateScope();

        storage.getEntity.and.returnValue($q.reject(clbError.error()));
        isolatedScope.browserView.handleNavigation(invalidEntity);
        scope.$apply();

        expect(isolatedScope.browserView.error).toBeHbpError();
        expect(element.find('clb-error-message').text())
        .toMatch(isolatedScope.browserView.error.message);
      });
    });
  });
});
