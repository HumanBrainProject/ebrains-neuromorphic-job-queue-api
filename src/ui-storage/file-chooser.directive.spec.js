describe('clb-file-chooser', function() {
  var scope;
  var compile;
  var element;
  var entities;

  beforeEach(module('clb-ui-storage'));
  beforeEach(inject(function(
    $rootScope,
    $q,
    $compile,
    $templateCache,
    clbStorage,
    clbResultSet
  ) {
    jasmine.cacheTemplate($templateCache,
      'file-chooser.directive.html',
      'src/ui-storage/');
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
      'error-message.directive.html',
      'src/ui-error/');

    element = angular.element('<clb-file-chooser ng-model="someVM.entity" ' +
      'clb-root="someVM.root"></clb-file-chooser>');
    scope = $rootScope;
    entities = {
      file: {
        _uuid: '1CDC0F80-1861-434C-B9EF-34CD8C3D73FA',
        _entityType: 'file',
        _parent: '14367A38-50C9-4C09-A3E8-4443D7624867',
        _name: 'file'
      },
      file2: {
        _uuid: '3CEB0A3C-A0B2-4A52-9FB9-7B95612815C4',
        _entityType: 'file',
        _parent: '14367A38-50C9-4C09-A3E8-4443D7624867',
        _name: 'file2'
      },
      folder: {
        _uuid: 'A83C3563-ECDE-432E-A3EC-5B9902C5B234',
        _entityType: 'folder',
        _parent: '14367A38-50C9-4C09-A3E8-4443D7624867'
      },
      project: {
        _uuid: '14367A38-50C9-4C09-A3E8-4443D7624867',
        _entityType: 'project'
      }
    };

    spyOn(clbStorage, 'getChildren')
    .and.callFake(function(parent, options) {
      expect(options.accept).toBeDefined(parent);
      expect(entities[options.accept]).toBeDefined(options.accept);
      return clbResultSet.get({data: {
        results: {
          file: [entities.file, entities.file2],
          folder: [entities.folder],
          project: [entities.project]
        }[options.accept]
      }});
    });
    spyOn(clbStorage, 'getEntity')
    .and.callFake(function(locator) {
      expect(locator).toBe(entities.project._uuid);
      return $q.when(entities.project);
    });
    spyOn(clbStorage, 'getUserAccess')
    .and.returnValue($q.when({
      canRead: true
    }));

    compile = function() {
      scope.someVM = {
        entity: entities.file,
        root: entities.project
      };
      $compile(element)(scope);
      scope.$digest();
    };
  }));

  afterEach(inject(function($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

  it('should load the root project', inject(function(clbStorage) {
    compile();
    expect(clbStorage.getChildren)
      .toHaveBeenCalledWith(entities.project, jasmine.any(Object));
  }));

  it('should be recognised', function() {
    compile();
    expect(element.isolateScope()).toBeDefined();
  });

  it('should use clb-file-chooser', function() {
    compile();
    expect(element.find('clb-file-browser').length).toBe(1);
  });

  it('should assign ngModel as the controller', function() {
    compile();
    expect(element.isolateScope().ngModel).toBeDefined();
  });

  it('should set the initial value', inject(function(clbStorage) {
    compile();
    expect(clbStorage.getChildren)
      .toHaveBeenCalledWith(entities.project, {
        accept: ['file'],
        acceptLink: false
      });
    expect(element.isolateScope().ngModel).toBe(entities.file);
    expect(element.find('clb-file-browser').isolateScope()
      .browserView.selectedEntity).toBe(entities.file);
  }));

  it('should choose another file', function() {
    compile();
    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(entities.file2);
    scope.$digest();
    element.isolateScope().doChooseEntity();
    expect(scope.someVM.entity).toBe(entities.file);
    scope.$digest();
    expect(element.isolateScope().ngModel).toBe(entities.file2);
    expect(scope.someVM.entity).toBe(entities.file2);
  });

  it('should select the current entity by default', function() {
    compile();
    element.isolateScope().doChooseEntity();
    scope.$digest();
    expect(scope.someVM.entity).toBe(entities.file);
  });

  it('should have no effect if no file are selected', function() {
    compile();
    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(null);
    scope.$digest();
    element.isolateScope().doChooseEntity();
    scope.$digest();
    expect(scope.someVM.entity).toBe(entities.file);
  });

  it('should change selection multiple time', function() {
    compile();
    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(entities.file2);
    scope.$digest();
    element.isolateScope().doChooseEntity();
    scope.$digest();
    expect(scope.someVM.entity).toBe(entities.file2);

    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(entities.file);
    scope.$digest();
    element.isolateScope().doChooseEntity();
    scope.$digest();
    expect(scope.someVM.entity).toBe(entities.file);
  });

  it('should emit clbFileChooser:fileSelected event', function() {
    var actual;
    scope.$on('clbFileChooser:fileSelected', function(evt, value) {
      actual = value;
    });
    compile();
    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(entities.file2);
    scope.$digest();
    element.isolateScope().doChooseEntity();
    scope.$digest();
    expect(actual).toBe(entities.file2);
  });

  it('should emit clbFileChooser:cancelSelection event', function() {
    var actual;
    scope.$on('clbFileChooser:cancelSelection', function(evt, value) {
      actual = value;
    });
    compile();
    element.find('clb-file-browser').isolateScope()
      .browserView.handleFocus(entities.file2);
    scope.$digest();
    element.isolateScope().doCancel();
    scope.$digest();
    expect(actual).toBe(entities.file);
  });

  describe('clb-validate', function() {
    var checkRule;
    beforeEach(function() {
      entities.file._contentType = 'image/png';
      entities.file2._contentType = 'text/html';

      // compile with the given rules and entities.file selected.
      // Then trigger focus event on entities.file2 and check
      // that the expectation (file or file2) are met.
      checkRule = function(rule, expected) {
        element = angular.element('<clb-file-chooser ' +
          'ng-model="someVM.entity" ' +
          'clb-validate="' + rule + '" ' +
          'clb-root="someVM.root"></clb-file-chooser>');
        compile();
        element.find('clb-file-browser').isolateScope()
          .browserView.handleFocus(entities.file2);
        scope.$digest();
        element.isolateScope().doChooseEntity();
        scope.$digest();
        expect(scope.someVM.entity).toBe(expected);
      };
    });

    it('can accept entities based on mimeType', function() {
      checkRule('\'text/html\'', entities.file2);
      checkRule('\'text/plain\'', entities.file);
      entities.file2 = undefined;
      checkRule('re', entities.file);
    });

    it('can accept entities based on array of mimeType', function() {
      checkRule('[\'image/png\', \'text/html\']',
        entities.file2, entities.file2);
      checkRule('[\'image/png\']', entities.file);
      entities.file2 = undefined;
      checkRule('re', entities.file);
    });

    it('can accept entities based on a regular expression', function() {
      scope.re = /ext\//;
      checkRule('re', entities.file2);
      scope.re = /^ext\//;
      checkRule('re', entities.file);
      scope.re = /^ext\//;
      entities.file2 = undefined;
      checkRule('re', entities.file);
    });

    it('can accept a function', function() {
      scope.test = function() {
        return true;
      };
      checkRule('test', entities.file2);

      scope.test = function() {
        return false;
      };
      checkRule('test', entities.file);
    });

    it('can accept an async function', inject(function($q) {
      scope.test = function() {
        return $q.when(true);
      };
      checkRule('test', entities.file2);

      scope.test = function() {
        return $q.when(false);
      };
      checkRule('test', entities.file);
    }));
  });
});
