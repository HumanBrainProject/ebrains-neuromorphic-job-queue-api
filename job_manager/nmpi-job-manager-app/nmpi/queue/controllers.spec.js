window.base_url = 'https://127.0.0.1:8000/app/';
var ctx = "86c8aff9-89ed-4d04-a996-81c3987a52f7";
var collab_id = '4293';

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
    it('ListQueue controller should be defined', function() {
        console.log("controller ListQueue : " + controller );
        console.log("begining ListQueue should be defined");
        expect(controller).toBeDefined();
    });

    it('test $scope.changePage', function() {
        $scope.changePage(3);
        expect($scope.curPage).toBe(3);
    });

    it('test $scope.get_results', function(){
        $scope.get_results(collab_id);
        // angular.forEach($scope.results.objects, function(value, key) {
        //     console.log(key + ': ' + value);
        // });
        console.log("$scope.results : ");
        console.dir($scope.results);
        //console.log("$scope.numberOfPages : " + $scope.numPages);
    });

    it('test $scope.get_queue', function(){
        $scope.get_queue(collab_id);
        console.log("$scope.queue : " + $scope.queue);
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

    // Verify our controller exists
    it('AddJob controller should be defined', function() {
        expect(controller).toBeDefined();
    });

    it('test $scope.addInput', function() {
        var test_length = $scope.inputs.length;
        $scope.addInput();
        expect($scope.inputs.length).toBe(test_length + 1);
    });

    it('test $scope.removeInput', function() {
        $scope.inputs.length = 1;
        var test_length = $scope.inputs.length;
        $scope.removeInput();
        expect($scope.inputs.length).toBe(test_length - 1);
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
    it('ReSubmitJob controller should be defined', function() {
        expect(controller).toBeDefined();
    });

    it('test $scope.addInput', function() {
        var test_length = $scope.inputs.length;
        $scope.addInput();
        expect($scope.inputs.length).toBe(test_length + 1);
    });

    it('test $scope.removeInput', function() {
        $scope.inputs.length = 1;
        var test_length = $scope.inputs.length;
        $scope.removeInput();
        expect($scope.inputs.length).toBe(test_length - 1);
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
    it('UiStorageController controller should be defined', function() {
        expect(controller).toBeDefined();
    });


});
