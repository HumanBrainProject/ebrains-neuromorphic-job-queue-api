// window.base_url = 'https://127.0.0.1:8000/app/';
// var ctx = "86c8aff9-89ed-4d04-a996-81c3987a52f7";
window.base_url = 'https://127.0.0.1:8000';
window.ver_api = '/api/v2/';
var collab_id = 4293;

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
        //console.log("injected controller : " + JSON.stringify(controller) );
    })));
    
    // Verify our controller exists
    it('ListQueue controller should be defined', function() {
        console.log("controller ListQueue : " + JSON.stringify(controller) );
        console.log("begining ListQueue should be defined");
        expect(controller).toBeDefined();
    });

    it('test $scope.changePage', function() {
        $scope.changePage(3);
        expect($scope.curPage).toBe(3);
    });

    it('test $scope.get_queue', function() {
        //$httpBackend.flush();
        //spyOn("");
        $scope.get_queue(collab_id);
    });

    it('test $scope.get_results', function(){
        $scope.get_results(collab_id);
        // angular.forEach($scope.results.objects, function(value, key) {
        //     console.log(key + ': ' + value);
        // });
        console.log("$scope.results : " + JSON.stringify($scope.results));
        //console.dir($scope.results);
        //console.log("$scope.numberOfPages : " + $scope.numPages);
    });

    it('test $scope.get_queue', function(){
        $scope.get_queue(collab_id);
        // $httpBackend.flush();
        // expect($scope.get_queue).toHaveBeenCalledWith({id:collab_id}, jasmine.any(Function));
        // expect($scope.queue).toBeDefined();
        //setTimeout('$scope.get_queue(collab_id);', 1000)
        console.log("$scope.queue : " + JSON.stringify($scope.queue));

    });
});

describe('DetailQueue', function() {
    var Log;

    console.log("begining nmpi.DetailQueue");
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    
    console.log("before inject controller");
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _Log_, _$httpBackend_, _$stateParams_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        controller = $controller('DetailQueue', { $scope: $scope });
        //console.log("injected controller : " + controller );
        Log = _Log_;
        $httpBackend = _$httpBackend_;
        $stateParams = _$stateParams_;
    })));
    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
        $httpBackend.whenGET("https://services.humanbrainproject.eu/idm/v1/api/user/").respond(200);
        $httpBackend.whenGET("https://services.humanbrainproject.eu/idm/v1/api/user/me").respond(200);
        $httpBackend.whenGET("https://services.humanbrainproject.eu/collab/v0/collab/").respond(200);
        $httpBackend.whenGET(window.base_url + window.ver_api + "results/?format=json").respond(200);
        //$httpBackend.whenGET(window.base_url + window.ver_api + "log/?format=json").respond(200);
    });
    // Verify our controller exists
    it('DetailQueue controller should be defined', function() {
        expect(controller).toBeDefined();
    });

    it('test $scope.addTag', function() {
        $httpBackend.flush();
        //console.log(json.stringify())
        
    });
    it('test $scope.removeTag', function() {
        $httpBackend.flush();
    });
    it('test $scope.getLog', function() {
        $httpBackend.flush();
        spyOn(Log, 'get').and.callThrough();
        $stateParams.eId = "1";
        $httpBackend.expectGET(window.base_url + window.ver_api + "log/1/?format=json").respond(200);
        //console.log("beforee getLog execution");
        $scope.getLog();
        $httpBackend.flush();
        console.log("log : " + JSON.stringify($scope.log));
    });
    it('test $scope.copyData', function() {
        $httpBackend.flush();
    });
    it('test $scope.isImage', function() {
        $httpBackend.flush();
        var result_img = $scope.isImage("https://collab.humanbrainproject.eu/assets/hbp_diamond_120.png");
        expect(result_img).toBe(true);
        var result_img = $scope.isImage("toto.jpg");
        expect(result_img).toBe(true);
        var result_img = $scope.isImage("toto.tttt");
        expect(result_img).toBe(false);
    });
});

describe('AddJob', function() {
    var $controller, $rootScope, controller, $location, Queue;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    var fixture = '<ul class="nav nav-tabs"><li id="li_code_editor" class="nav-link"><a class="nav-link" ng-click="toggleTabs(\'code_editor\')">Editor</a></li><li id="li_upload_link" class="nav-link"><a class="nav-link" ng-click="toggleTabs(\'upload_link\')">From Git repository or zip archive</a></li><li id="li_upload_script" class="nav-link active"><a class="nav-link" ng-click="toggleTabs(\'upload_script\')">From Collab storage</a></li></ul>';

    document.body.insertAdjacentHTML('afterbegin', fixture);

    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _$location_, _Queue_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        $location = _$location_;
        Queue = _Queue_;
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

    // it('test $scope.submit', function() {
    //     //console.log("$scope.job : " + JSON.stringify($scope.job));
    //     $scope.job.hardware_platform = 'SpiNNaker';
    //     $scope.job.code = 'https://github.com/HumanBrainProject/hbp_neuromorphic_platform.git';
    //     $scope.job.command = '99';
    //     $scope.job.hardware_config = {"menu":{"id":"file","popup":{"menuitem":[{"onclick":"CreateNewDoc()","value":"New"},{"onclick":"OpenDoc()","value":"Open"},{"onclick":"CloseDoc()","value":"Close"}]},"value":"File"}};
    //     $scope.job.tags = 'toto';
    //     $scope.submit($scope.job);
    // });

    it('test $scope.savejob', function() {
        //console.log("$scope.job : " + JSON.stringify($scope.job));
        spyOn(Queue, 'save').and.callThrough();
        $httpBackend.expectPOST(window.base_url + window.ver_api + "queue/?format=json").respond(200);
        $scope.job.code = 'https://github.com/HumanBrainProject/hbp_neuromorphic_platform.git';
        $scope.job.hardware_platform = 'SpiNNaker';
        $scope.job.status = "submitted";
        $scope.job.command = '99';
        $scope.job.hardware_config = {"menu":{"id":"file","popup":{"menuitem":[{"onclick":"CreateNewDoc()","value":"New"},{"onclick":"OpenDoc()","value":"Open"},{"onclick":"CloseDoc()","value":"Close"}]},"value":"File"}};
        $scope.job.tags = 'toto';
        $scope.job.user_id = '304621';
        $scope.job.collab_id = 4293;
        $scope.job.provanance = {
                "collaboratory": {
                    "nav_item":36930
                }
            };
        console.log("before test $scope.savejob : ");
        $scope.savejob();
        $httpBackend.flush();
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

    it('test $scope.reset', function(){
        $scope.reset();
        expect($scope.msg.show).toBe(false);
        expect($location.$$path).toBe("/queue");
    });
});

describe('ReSubmitJob', function() {
    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _$location_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        $location = _$location_;
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

    it('test $scope.reset', function(){
        $scope.reset();
        expect($scope.msg.show).toBe(false);
        expect($location.$$path).toBe("/queue");
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
