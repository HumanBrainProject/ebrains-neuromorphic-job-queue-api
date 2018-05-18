describe('Coordinator controller and factory', function() {
    window.base_url = 'https://127.0.0.1:8001';
    window.ver_api = '/v1/api';
    var user_test = '304621';
    var project_test = '1542c7cd-497a-4cf1-a689-c19eac3dc1a0';

    var User, Projects, Quotas;
    var $httpBackend;

    var testUser = {};
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
    beforeEach(angular.mock.module('request-coordinator-app'));

    beforeEach(inject(function(_User_, _Projects_, _Quotas_, _$httpBackend_) {
        User = _User_;
        Projects = _Projects_;
        Quotas = _Quotas_;
        $httpBackend = _$httpBackend_;
    }));
    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
    });

    describe('RequestListController', function(){
        var $controller, $rootScope, controller, Projects, User;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_, _Projects_, _User_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            Projects = _Projects_;
            User = _User_;

            spyOn(User, 'get').and.callThrough();
            spyOn(Projects, 'get').and.callThrough();
            spyOn(Projects, 'update').and.callThrough();
            spyOn(Quotas, 'get').and.callThrough();
            spyOn(Quotas, 'save').and.callThrough();  

            $httpBackend.expectGET(window.base_url + "/projects/").respond(200);
            controller = $controller('RequestListController', { $scope: $scope });
            $httpBackend.flush();
        })));
        it('should exist User Factory', function() {
            expect(User).toBeDefined();
        });
        it('should exist User.get', function() {
            expect(User.get).toBeDefined();
        });
        it('test result User.get', function() {
            $httpBackend.expectGET("https://services.humanbrainproject.eu/idm" + window.ver_api + "/user/" + user_test).respond(testUser);
            // expect(User.get).not.toHaveBeenCalled();
            expect(result).toEqual({});
            var rs1;
            rs1 = User.get({id:user_test}, function(res){
                result = res;
            });
            // Flush pending HTTP requests
            $httpBackend.flush();
            expect(User.get).toHaveBeenCalledWith({id:user_test}, jasmine.any(Function));
        });
        it('should exist Projects Factory', function() {
            expect(Projects).toBeDefined();
        });
        it('should exist Projects.get', function() {
            expect(Projects.get).toBeDefined();
        });
        
        it('should exist Projects.update', function() {
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
        
            $httpBackend.expectPUT(base_url + "/projects/" + project_test).respond(200);
            rs_update = Projects.update(update_testProject);
            $httpBackend.flush();
            expect(JSON.stringify(rs_update)).toEqual(JSON.stringify(update_testProject));
        });

        it('should exist Quotas Factory', function() {
            expect(Quotas).toBeDefined();
        });
        it('should exist Quotas.get', function() {
            expect(Quotas.get).toBeDefined();
        });
        it('should exist Quotas.save', function() {
            expect(Quotas.save).toBeDefined();
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
        it('RequestListController controller should be defined', function() {
            expect(controller).toBeDefined();
        });
        it('test $scope.setTab', function() {
            var array_tab = ['under review', 'accepted', 'rejected', 'in preparation'];
            for(var i= 0; i < array_tab.length; i++)
            {
                console.log("test $scope.setTab('"+array_tab[i]+"')");
                $scope.setTab(array_tab[i]);
                expect($scope.css[array_tab[i]]).toEqual('btn btn-primary');
                expect($scope.selectedTab).toEqual(array_tab[i]);
            }
        });
    });

    describe('RequestDetailController', function(){
        var $controller, $rootScope, controller, Projects, Quotas, User;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_, _Projects_, _Quotas_, _User_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            Projects = _Projects_;
            Quotas = _Quotas_;
            User = _User_;
            controller = $controller('RequestDetailController', { $scope: $scope });
            // $httpBackend.flush();
        })));
        it('RequestDetailController controller should be defined', function() {
            expect(controller).toBeDefined();
        });
        // it('test $scope.accept', function($scope) {
        //     $scope.accept();
        //     $httpBackend.flush();
        //     expect(project["status"]).toEqual("accepted");
        // });
        if('test addQuota', function($scope){
            $scope.addQuota();
            $httpBackend.flush();
        });
    });
});