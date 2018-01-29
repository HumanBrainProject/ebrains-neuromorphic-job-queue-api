describe('ListQueue', function() {
    console.log("begining nmpi.ListQueue");
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    
    console.log("before inject controller");
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('ListQueue', { $scope: $scope });
        console.log("injected controller : " + controller );
    })));
    
    // Verify our controller exists
    it('ListQueue should be defined', function() {
        console.log("controller ListQueue : " + controller );
        console.log("begining ListQueue should be defined");
        expect(controller).toBeDefined();
    });

    it('change page', function() {
        console.log("controller ListQueue : " + controller );
        console.log("begining change page");
        $scope.changePage();
    });
});

describe('AddJob', function() {
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('AddJob', { $scope: $scope });
    })));
    // Verify our controller exists
    it('AddJob should be defined', function() {
        expect(controller).toBeDefined();
    });
});

describe('ReSubmitJob', function() {
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('ReSubmitJob', { $scope: $scope });
    })));
    // Verify our controller exists
    it('ReSubmitJob should be defined', function() {
        expect(controller).toBeDefined();
    });
});

describe('UiStorageController', function() {
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('UiStorageController', { $scope: $scope });
    })));
    // Verify our controller exists
    it('UiStorageController should be defined', function() {
        expect(controller).toBeDefined();
    });
});
