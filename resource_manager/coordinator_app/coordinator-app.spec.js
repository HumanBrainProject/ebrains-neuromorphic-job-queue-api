describe('Coordinator controller and factory', function() {
    var User, Projects, Quotas;
    var $httpBackend;

    var testUser = {};
    var testProject = {
        "status": "under review", 
        "description": "fdsfdsfds", 
        "title": "FF", 
        "abstract": "fedds", 
        "collab": "4293", 
        "quotas": [], 
        "duration": 0, 
        "context": "7e3d3bb7-95bd-4679-8da0-d3cc921cc0f0", 
        "owner": "304621", 
        "resource_uri": "/projects/7e3d3bb7-95bd-4679-8da0-d3cc921cc0f0"
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

        // spyOn(User).and.callThrough();
        // spyOn(Projects).and.callThrough();

    });
    // A simple test to verify the factory exists
    it('should exist User Factory', function() {
        expect(User).toBeDefined();
    });
    // it('test result User factory', function() {
    //     $httpBackend.expectGET(window.base_url + window.ver_api + "/user/1/?format=json").respond(testUser);
    //     expect(User).not.toHaveBeenCalled();
    // });
    it('should exist Projects Factory', function() {
        expect(Projects).toBeDefined();
    });
    // it('test Projects factory', function(){
    //     spyOn(Projects, 'id').and.callThrough();
    //     $httpBackend.expectGET("https://quotas.hbpneuromorphic.eu/projects/7e3d3bb7-95bd-4679-8da0-d3cc921cc0f0").respond(testProject);
    //     expect(Projects.id).not.toHaveBeenCalled();
    //     expect(result).toEqual({});
    //     var rs1;
    //     rs1 = Projects({id:'7e3d3bb7-95bd-4679-8da0-d3cc921cc0f0'}, function(res){
    //         result = res;
    //     });
        
    //     // Flush pending HTTP requests
    //     $httpBackend.flush();
    //     expect(Projects).toHaveBeenCalledWith({id:'7e3d3bb7-95bd-4679-8da0-d3cc921cc0f0'}, jasmine.any(Function));
    //     expect(result).toBeDefined();
    //     expect(result.description).toEqual(testProject.description);
    // });
    it('should exist Quotas Factory', function() {
        expect(Quotas).toBeDefined();
    });

    describe('RequestListController', function(){
        var $controller, $rootScope, controller, Projects, User;
        beforeEach(inject(angular.mock.inject(function(_$controller_, _$rootScope_, _Projects_, _User_){
            $controller = _$controller_;
            $rootScope = _$rootScope_;
            Projects = _Projects_;
            User = _User_;
            controller = $controller('RequestListController', { $scope: $scope });;
        })));
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
            controller = $controller('RequestDetailController', { $scope: $scope });;
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
        });
    });
});