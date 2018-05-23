describe('Resource manager controller and factory', function() {
    window.base_url = 'https://127.0.0.1:8001';
    window.ver_api = '/v1/api';
    var user_test = '304621';
    var project_test = '1542c7cd-497a-4cf1-a689-c19eac3dc1a0';

    var $httpBackend;
    // Before each test load our api.users module
    var Projects, Quotas;

    var testProject = {
        "status": "accepted", 
        "description": "project01 description", 
        "title": "project01", 
        "abstract": "project01 abstract", 
        "collab": "4293", 
        "quotas": [], 
        "duration": 5, 
        "context": "1542c7cd-497a-4cf1-a689-c19eac3dc1a0", 
        "owner": "304621", 
        "start_date": "2018-05-16", 
        "resource_uri": "/projects/1542c7cd-497a-4cf1-a689-c19eac3dc1a0"
    };
    var testQuotas = {
        "platform": "BrainScaleS", 
        "project": project_test, 
        "units": "wafer-hours", 
        "limit": 2.0, 
        "usage": 0.0, 
        "resource_uri": "/projects/" + project_test + "/quotas/2"
    };

    beforeEach(angular.mock.module('request-app'));

    // Before each test set our injected Projects factory (_Projects_) to our local Projects variable
    beforeEach(inject(function(_Projects_, _Quotas_, _$httpBackend_) {
        Projects = _Projects_;
        Quotas = _Quotas_;
        $httpBackend = _$httpBackend_;
        spyOn(Projects, 'get').and.callThrough();
        spyOn(Projects, 'update').and.callThrough();
        spyOn(Quotas, 'get').and.callThrough();
        spyOn(Quotas, 'save').and.callThrough();
    }));
    
    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
    });

    // A simple test to verify the factory exists
    it('should exist Projects Factory', function() {
        expect(Projects).toBeDefined();
    });
    it('should exist Projects.update', function(){
        expect(Projects.update).toBeDefined();
    });
    it('test result Projects.get', function(){
        $httpBackend.expectGET(base_url + "/projects/" + project_test).respond(testProject);
        // expect(Projects.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = Projects.get({id:project_test}, function(res){
            result = res;
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Projects.get).toHaveBeenCalledWith( {id:project_test}, jasmine.any(Function) );
        expect(result).toBeDefined();
        expect(result.status).toEqual(testProject.status);
        expect(result.description).toEqual(testProject.description);
    });
    it('test result Projects.update', function(){
        var update_testProject = {
            "status": "accepted", 
            "description": "project01 description updated", 
            "title": "project01 updated", 
            "abstract": "project01 abstract updated", 
            "collab": "4293", 
            "quotas": [], 
            "duration": 5, 
            "context": "1542c7cd-497a-4cf1-a689-c19eac3dc1a0", 
            "owner": "304621", 
            "start_date": "2018-05-16", 
            "resource_uri": "/projects/1542c7cd-497a-4cf1-a689-c19eac3dc1a0"
        };
        console.log("project_test : " + base_url + "/projects/" + project_test);
        $httpBackend.expectPUT(base_url + "/projects/" + project_test).respond(200);
        rs_update = Projects.update({id: project_test},update_testProject);
        $httpBackend.flush();
        expect(JSON.stringify(rs_update)).toEqual(JSON.stringify(update_testProject));
    });
    it('should exist Quotas Factory', function() {
        expect(Quotas).toBeDefined();
    });
    it('test result Quotas.save', function(){
        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectPOST(window.base_url + "/projects/quotas/").respond(200);
        // post new Quotas
        rs_save = Quotas.save(testQuotas);
        $httpBackend.flush();
        expect(JSON.stringify(rs_save)).toEqual(JSON.stringify(testQuotas));
    });
    it('test result Quotas.get', function(){
        $httpBackend.expectGET(window.base_url + "/projects/quotas/2").respond(testQuotas);
        expect(result).toEqual({});
        var rs1;
        rs1 = Quotas.get({id:'2'}, function(res){
            result = res;
        });
        $httpBackend.flush();
        expect(JSON.stringify(result)).toEqual(JSON.stringify(testQuotas));
    });

    describe('HelloCtrl', function(){
        var $controller, $rootScope, controller;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $scope = $rootScope.$new();
            controller = $controller('HelloCtrl', { $scope: $scope });
        })));
        // Verify our controller exists
        it('HelloCtrl controller should be defined', function() {
            expect(controller).toBeDefined();
        });
        it('HelloCtrl test result', function() {
            expect($scope.thing.name).toEqual("World");
        });
    });

    describe('ViewProjectCtrl', function(){
        var $controller, $rootScope, controller, $location, Projects, hbpIdentityUserDirectory, hbpCollabStore;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_, _$location_, _Projects_, _hbpIdentityUserDirectory_, _hbpCollabStore_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $location = _$location_;
            Projects = _Projects_;
            hbpIdentityUserDirectory = _hbpIdentityUserDirectory_;
            hbpCollabStore = _hbpCollabStore_;
            controller = $controller('ViewProjectCtrl', { $scope: $scope });
        })));
        it('ViewProjectCtrl controller should be defined', function() {
            expect(controller).toBeDefined();
        });
    });

    describe('EditProjectCtrl', function(){
        var $location, $timeout, Projects, hbpIdentityUserDirectory, hbpCollabStore;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_, _$location_, _$timeout_, _Projects_, _hbpIdentityUserDirectory_, _hbpCollabStore_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            $location = _$location_;
            $timeout = _$timeout_;
            Projects = _Projects_;
            hbpIdentityUserDirectory = _hbpIdentityUserDirectory_;
            hbpCollabStore = _hbpCollabStore_;
            controller = $controller('EditProjectCtrl', { $scope: $scope });
        })));
        it('EditProjectCtrl controller should be defined', function() {
            expect(controller).toBeDefined();
        });
    });
});
