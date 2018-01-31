window.base_url = 'https://127.0.0.1:8000/app/';
ctx = "86c8aff9-89ed-4d04-a996-81c3987a52f7";

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
    var fixture = '<ul class="nav nav-tabs"><li id="li_code_editor" class="nav-link"><a class="nav-link" ng-click="toggleTabs(\'code_editor\')">Editor</a></li><li id="li_upload_link" class="nav-link"><a class="nav-link" ng-click="toggleTabs(\'upload_link\')">From Git repository or zip archive</a></li><li id="li_upload_script" class="nav-link active"><a class="nav-link" ng-click="toggleTabs(\'upload_script\')">From Collab storage</a></li></ul>';

    document.body.insertAdjacentHTML('afterbegin', fixture);

    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('AddJob', { $scope: $scope });
    })));
    beforeEach(function() {
        $httpBackend.whenGET(window.base_url + "#/queue?ctx=" + ctx).respond(9999);
        $httpBackend.whenGET(window.base_url + "#/queue/create?ctx=" + ctx).respond(8888);
    });

    // Verify our controller exists
    it('AddJob should be defined', function() {
        expect(controller).toBeDefined();
    });
    
    if('test User.get', function() {
        User.get();
    });

    it('test $scope.toggleTabs', function() {
        $scope.toggleTabs("code_editor");
        expect($scope.msg_required).toBe("Please enter your code in the text area.");
        var li = document.getElementById("li_code_editor");
        expect(li.className).toBe("nav-link active");
        
        $scope.toggleTabs("upload_link");
        expect($scope.msg_required).toBe("Please enter a Git repository URL or the URL of a zip archive containing your code.");
        var li = document.getElementById("li_upload_link");
        expect(li.className).toBe("nav-link active");

        $scope.toggleTabs("upload_script");
        expect($scope.msg_required).toBe("Please select a file or folder to submit an existing script.");
        var li = document.getElementById("li_upload_script");
        expect(li.className).toBe("nav-link active");
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
