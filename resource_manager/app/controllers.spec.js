describe('ViewProjectCtrl', function() {
  var $controller, ViewProjectCtrl, ProjectsFactory, scope;
  var mockUserDirectory, mockCollabStore;
  var $q, $httpBackend, $location;

  var PUBLIC_COLLAB = '2330';
  var ALICE = '300005';
  var TEST_CONTEXT = '909006c3-12e5-45fd-b287-f095c48122e8';
  var INVALID_CONTEXT = 'thereisnowaythisisgoingtowork'

  var sampleProject = {
    'accepted': false,
    'context': TEST_CONTEXT,
    'collab': PUBLIC_COLLAB,
    'owner': ALICE,
    'title': "An unsubmitted resource request used for testing",
    'abstract': "Do not submit, delete or change the status",
    'description': "kejxfg nsgxfnaiugnf\n",
    'status': 'in preparation'
  }

  beforeEach(angular.mock.module('request-app'));

  // Provide mock dependencies
  beforeEach(function () {

      mockUserDirectory = {
          getCurrentUser: function() {
            return {
                then: function () {
                        return 'foo';
                      }
                };
            }
      };

      mockCollabStore = {
          context: {
              get: function(context) {
                  return {
                      then: function() {
                        return 'bar';
                      }
                  }
              }
          }
      }

      module(function ($provide) {
          $provide.value('hbpIdentityUserDirectory', mockUserDirectory);
          $provide.value('hbpCollabStore', mockCollabStore);
      });

  });

  // Inject:
  //     the $controller service to create instances of the controller (UsersController) we want to test
  //     the $q and $httpBackend services so we can intercept API calls and return mock values
  //     the services/components needed by our controller
  beforeEach(inject(function(_$controller_, _$rootScope_, _$location_, _Projects_, _$q_, _$httpBackend_) {
    $controller = _$controller_;
    scope = _$rootScope_.$new();
    ProjectsFactory = _Projects_;
    $q = _$q_;
    $httpBackend = _$httpBackend_;
    $location = _$location_;

    // Spy and force a mock return value when ProjectsFactory.get() is called
    spyOn(ProjectsFactory, 'get').and.callThrough();
    $httpBackend.whenGET('/projects/' + TEST_CONTEXT).respond(200, sampleProject);
    $httpBackend.whenGET('/projects/' + INVALID_CONTEXT).respond(404, "Not found");

  }));

  describe('with valid context', function() {

    beforeEach(function() {
        spyOn($location, 'search').and.callFake(function() {
            return {ctx: TEST_CONTEXT}
        });

        ViewProjectCtrl = $controller('ViewProjectCtrl',
                                      {
                                         '$scope': scope,
                                         '$location': $location,
                                         'Projects': ProjectsFactory,
                                      }
                                     );
        $httpBackend.flush();
    });

    it('should be defined', function() {
      expect(ViewProjectCtrl).toBeDefined();
    });

    it('should initialize with a call to Projects.get()', function() {
      expect(ProjectsFactory.get).toHaveBeenCalledWith({id: TEST_CONTEXT}, jasmine.any(Function), jasmine.any(Function));
    });

    it('should retrieve a project', function() {
      expect(scope.haveProject).toEqual(true);
    });

    it('should retrieve the correct project', function() {
      expect(scope.project).toBeDefined;
      expect(scope.project).not.toBeNull;
      expect(scope.project.context).toEqual(TEST_CONTEXT);
      expect(scope.project.description).toEqual(sampleProject.description);
    });

    it('should set the correct partial template', function() {
      expect(scope.partial).toEqual('static/templates/inpreparation.tpl.html');
    });

  });

  describe('with invalid context', function() {

    beforeEach(function() {
        spyOn($location, 'search').and.callFake(function() {
            return {ctx: INVALID_CONTEXT}
        });

        ViewProjectCtrl = $controller('ViewProjectCtrl',
                                      {
                                         '$scope': scope,
                                         '$location': $location,
                                         'Projects': ProjectsFactory,
                                      }
                                     );
        $httpBackend.flush();
    });

    it('should be defined', function() {
      expect(ViewProjectCtrl).toBeDefined();
    });

    it('should not retrieve a project', function() {
      expect(scope.project).toBeNull;
      expect(scope.haveProject).toEqual(false);
    });

    it('should set the correct partial template', function() {
      expect(scope.partial).toEqual('static/templates/intro.tpl.html');
    });

  });

});

describe('EditProjectCtrl', function() {
  var $controller, EditProjectCtrl, ProjectsFactory, scope;
  var mockUserDirectory, mockCollabStore;
  var $q, $httpBackend, $location;

  var PUBLIC_COLLAB = '2330';
  var ALICE = '300005';
  var TEST_CONTEXT = '909006c3-12e5-45fd-b287-f095c48122e8';
  var INVALID_CONTEXT = 'thereisnowaythisisgoingtowork'

  var sampleProject = {
    'accepted': false,
    'context': TEST_CONTEXT,
    'collab': PUBLIC_COLLAB,
    'owner': ALICE,
    'title': "An unsubmitted resource request used for testing",
    'abstract': "Do not submit, delete or change the status",
    'description': "kejxfg nsgxfnaiugnf\n",
    'status': 'in preparation'
  }

  beforeEach(angular.mock.module('request-app'));

  // Provide mock dependencies
  beforeEach(function () {

      mockUserDirectory = {
          getCurrentUser: function() {
            return {
                then: function () {
                        return 'foo';
                      }
                };
            }
      };

      mockCollabStore = {
          context: {
              get: function(context) {
                  return {
                      then: function() {
                        return 'bar';
                      }
                  }
              }
          }
      }

      module(function ($provide) {
          $provide.value('hbpIdentityUserDirectory', mockUserDirectory);
          $provide.value('hbpCollabStore', mockCollabStore);
      });

  });

  // Inject:
  //     the $controller service to create instances of the controller (UsersController) we want to test
  //     the $q and $httpBackend services so we can intercept API calls and return mock values
  //     the services/components needed by our controller
  beforeEach(inject(function(_$controller_, _$rootScope_, _$location_, _Projects_, _$q_, _$httpBackend_) {
    $controller = _$controller_;
    scope = _$rootScope_.$new();
    ProjectsFactory = _Projects_;
    $q = _$q_;
    $httpBackend = _$httpBackend_;
    $location = _$location_;

    // Spy and force a mock return value when ProjectsFactory.get() is called
    spyOn(ProjectsFactory, 'get').and.callThrough();
    $httpBackend.whenGET('/projects/' + TEST_CONTEXT).respond(200, sampleProject);
    $httpBackend.whenGET('/projects/' + INVALID_CONTEXT).respond(404, "Not found");

  }));

  describe('with valid context', function() {

    beforeEach(function() {
        spyOn($location, 'search').and.callFake(function() {
            return {ctx: TEST_CONTEXT}
        });

        EditProjectCtrl = $controller('EditProjectCtrl',
                                      {
                                         '$scope': scope,
                                         '$location': $location,
                                         'Projects': ProjectsFactory,
                                      }
                                     );
        $httpBackend.flush();
    });

    it('should be defined', function() {
      expect(EditProjectCtrl).toBeDefined();
    });

    it('should initialize with a call to Projects.get()', function() {
      expect(ProjectsFactory.get).toHaveBeenCalledWith({id: TEST_CONTEXT}, jasmine.any(Function), jasmine.any(Function));
    });

    it('should not be in create mode', function() {
      expect(scope.createMode).toEqual(false);
    });

    it('should retrieve the correct project', function() {
      expect(scope.project).toBeDefined;
      expect(scope.project).not.toBeNull;
      expect(scope.project.context).toEqual(TEST_CONTEXT);
      expect(scope.project.description).toEqual(sampleProject.description);
    });

    // todo: test createOrUpdateProject()
    // todo: test save_changes()
    // todo: test submit_project()

  });

  describe('with invalid context', function() {

    beforeEach(function() {
        spyOn($location, 'search').and.callFake(function() {
            return {ctx: INVALID_CONTEXT}
        });

        EditProjectCtrl = $controller('EditProjectCtrl',
                                      {
                                         '$scope': scope,
                                         '$location': $location,
                                         'Projects': ProjectsFactory,
                                      }
                                     );
        $httpBackend.flush();
    });

    it('should be defined', function() {
      expect(EditProjectCtrl).toBeDefined();
    });

    it('should be in create mode', function() {
      expect(scope.createMode).toEqual(true);
    });

    it('should set the project context', function() {
      expect(scope.project.context).toEqual(INVALID_CONTEXT);
    });

    // it('should set the project owner to the logged-in user'
    // it('should set the project collab to the current collab'

    // todo: test save_changes()
    // todo: test submit_project()

  });

});

