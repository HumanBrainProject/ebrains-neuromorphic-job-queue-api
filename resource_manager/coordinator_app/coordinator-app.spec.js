describe('Coordinator controller and factory', function() {
    var User, Projects, Quotas;
    beforeEach(angular.mock.module('request-coordinator-app'));

    beforeEach(inject(function(_User_, _Projects_, _Quotas_) {
        User = _User_;
        Projects = _Projects_;
        Quotas = _Quotas_;
    }));

    // A simple test to verify the factory exists
    it('should exist User Factory', function() {
        expect(User).toBeDefined();
    });

    it('should exist Projects Factory', function() {
        expect(Projects).toBeDefined();
    });

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
    });
});