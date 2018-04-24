describe('Collab and Context factory', function() {
    // Before each test load our api.users module
    beforeEach(angular.mock.module('request-app'));

    // Before each test set our injected Projects factory (_Projects_) to our local Projects variable
    beforeEach(inject(function(_Projects_) {
        Projects = _Projects_;
    }));

    // Before each test set our injected Quotas factory (_Quotas_) to our local Quotas variable
    beforeEach(inject(function(_Quotas_) {
        Quotas = _Quotas_;
    }));

    // A simple test to verify the factory exists
    it('should exist Projects Factory', function() {
        expect(Projects).toBeDefined();
    });

    it('should exist Quotas Factory', function() {
        expect(Quotas).toBeDefined();
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
