// window.base_url = 'https://127.0.0.1:8000/app/';
// var ctx = "86c8aff9-89ed-4d04-a996-81c3987a52f7";
window.base_url = 'https://127.0.0.1:8000';
window.ver_api = '/api/v2/';
var collab_id = 4293;

describe('ListQueue', function() {
    console.log("begining nmpi.ListQueue");
    var $controller, $rootScope, controller, Queue, User, Collab;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _Queue_, _User_, _Collab_, _Results_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        Queue = _Queue_;
        User = _User_;
        Collab = _Collab_;
        Results = _Results_;
        controller = $controller('ListQueue', { $scope: $scope });
        //console.log("injected controller : " + JSON.stringify(controller) );
    })));
    
    // Verify our controller exists
    it('ListQueue controller should be defined', function() {
        expect(controller).toBeDefined();
    });

    it('test $scope.changePage', function() {
        $scope.changePage(3);
        expect($scope.curPage).toBe(3);
    });

    it('test $scope.get_queue', function() {
        console.log("collab_id : " + collab_id);
        //$httpBackend.flush();
        spyOn(Queue, 'get').and.callThrough();
        spyOn(User, 'get').and.callThrough();
        spyOn(Collab, 'get').and.callThrough();
        $httpBackend.expectGET(window.base_url + window.ver_api + 'queue/?collab_id=' + collab_id).respond(200);
        $httpBackend.expectGET("https://services.humanbrainproject.eu/idm/v1/api/user/").respond(200);
        $httpBackend.expectGET("https://services.humanbrainproject.eu/collab/v0/collab/").respond(200);
        $scope.get_queue(collab_id);
        //$httpBackend.flush();
        console.log("$scope.queue.objects : " + JSON.stringify($scope.queue.objects));
    });

    it('test $scope.get_results', function(){
        spyOn(Results, 'get').and.callThrough();
        $httpBackend.expectGET(window.base_url + window.ver_api + 'results/?collab_id=' + collab_id).respond(200);
        $scope.get_results(collab_id);
        //$httpBackend.flush();
        // angular.forEach($scope.results.objects, function(value, key) {
        //     console.log(key + ': ' + value);
        // });
        console.log("$scope.results : " + JSON.stringify($scope.results));
        //console.dir($scope.results);
        //console.log("$scope.numberOfPages : " + $scope.numPages);
    });

    // it('test $scope.numberOfPages', function(){
    //     $scope.pageSize = 20;
    //     result = $scope.numberOfPages();
    //     console.log("result : " + $scope.numberOfPages);
    // });
});

describe('DetailQueue', function() {
    var Log;

    var $controller, $rootScope, controller;
    beforeEach(angular.mock.module('ui.router'));
    beforeEach(angular.mock.module('nmpi'));
    
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _Log_, _$httpBackend_, _$stateParams_, _$window_ ) {
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
    it('test $scope.del_job', function() {
        $stateParams.eId = "1";
        $scope.is_test = true;
        $httpBackend.flush();
        
        $scope.job.id = '1';
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

        $httpBackend.expectDELETE(window.base_url + window.ver_api + "results/?format=json").respond(200);
        $scope.del_job($stateParams.eId);
        $httpBackend.flush();
        expect($scope.win_href).toEqual('app/#/queue');

        $httpBackend.expectDELETE(window.base_url + window.ver_api + "results/?format=json").respond(200);
        $rootScope.ctx = "86c8aff9-89ed-4d04-a996-81c3987a52f7"
        $rootScope.with_ctx = true;
        $scope.del_job($stateParams.eId);
        $httpBackend.flush();
        expect($scope.win_href).toEqual('app/#/queue?ctx=' + $rootScope.ctx);
    });
    it('test $scope.addTag', function() {
        $httpBackend.flush();
        $stateParams.eId = "1";
        
        $scope.job.id = '1';
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
        $scope.job.tags = new Array();
        var tag = {
            name: 'test_tag',
        };
        $httpBackend.expectPUT(window.base_url + window.ver_api + "results/?format=json").respond(200);
        $scope.addTag($scope.job, tag ,$stateParams.eId );
        expect($scope.job.tags[0]).toBe(tag.name);
        $httpBackend.flush();
    });
    it('test $scope.removeTag', function() {
        $httpBackend.flush();
        $stateParams.eId = "1";
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
        $scope.job.tags = ['tag_001', 'tag_002', 'tag_003'];
        var tag = {
            name:'tag_001'
        };
        $httpBackend.expectPUT(window.base_url + window.ver_api + "results/?format=json").respond(200);
        $scope.removeTag($scope.job, tag, $stateParams.eId);
        $httpBackend.flush();
        expect($scope.job.tags.length).toBe(2);
        expect($scope.job.tags[0]).toBe('tag_002');
        expect($scope.job.tags[1]).toBe('tag_003');
    });
    it('test $scope.submit_comment', function() {
        $httpBackend.flush();
        $stateParams.eId = "1";
        $scope.job.code = 'https://github.com/HumanBrainProject/hbp_neuromorphic_platform.git';
        $scope.job.hardware_platform = 'SpiNNaker';
        $scope.job.status = "finished";
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
        $scope.job.tags = ['tag_001', 'tag_002', 'tag_003'];
        $scope.job.comment = "";
        $scope.job.resource_uri = '/api/v2/queue/1';

        $scope.comment.content = "test_comment 1 kdkd";
        $scope.comment.user = '304621';
        var sauv_comment = $scope.comment;
        $httpBackend.expectPOST(window.base_url + window.ver_api + "comment/?format=json").respond(200, $scope.comment);
        $scope.submit_comment($scope.comment, $scope.job);
        $httpBackend.flush();
        expect(sauv_comment).toBe($scope.job.comments[0]);
    });

    it('test $scope.getLog', function() {
        $httpBackend.flush();
        spyOn(Log, 'get').and.callThrough();
        $stateParams.eId = "1";
        var mock_log = {
            content: "This is the log"
        }
        $httpBackend.expectGET(window.base_url + window.ver_api + "log/" + $stateParams.eId + "/?format=json").respond(200, mock_log);
        //console.log("beforee getLog execution");
        $scope.getLog();
        $httpBackend.flush();
        console.log("log : " + JSON.stringify($scope.log));
        expect($scope.log.content).toEqual("This is the log");
    });
    it('test $scope.copyData', function() {
        var target = "collab";
        $httpBackend.flush();
        $stateParams.eId = 1;
        $httpBackend.expectGET('/copydata/' + target + '/' + $stateParams.eId).respond(200);
        $scope.copyData(target);
        $httpBackend.flush();
        //console.log("$scope.msg : " + JSON.stringify($scope.msg));
        expect($scope.status).toBe(200);
        expect($scope.config.url).toBe("/copydata/collab/1");
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

    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _$location_, _$httpBackend_, _Queue_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        $location = _$location_;
        $httpBackend = _$httpBackend_;
        Queue = _Queue_;
        controller = $controller('AddJob', { $scope: $scope });

        var fake_context = {
            collab: {
                id: 99999
            }
        };
        $httpBackend.expectGET('https://services.humanbrainproject.eu/idm/v1/api/user/me').respond(200, {});
        $httpBackend.expectGET('https://services.humanbrainproject.eu/collab/v0/collab/context/').respond(200, fake_context);
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
        $httpBackend.expectGET("static/nmpi/queue/list.tpl.html").respond(200);  // should redirect to list view on success
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
    beforeEach(inject(angular.mock.inject(function( _$controller_, _$rootScope_, _$location_, _$httpBackend_, _Queue_ ) {
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
        $controller = _$controller_;
        $location = _$location_;
        $httpBackend = _$httpBackend_;
        Queue = _Queue_;

        controller = $controller('ReSubmitJob', { $scope: $scope });
        var fake_context = {
            collab: {
                id: 99999
            }
        };
        $httpBackend.expectGET('https://services.humanbrainproject.eu/idm/v1/api/user/me').respond(200, {});
        $httpBackend.expectGET('https://services.humanbrainproject.eu/collab/v0/collab/context/').respond(200, fake_context);
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

    it('test $scope.savejob (ReSubmitJob)', function(){
        spyOn(Queue, 'save').and.callThrough();
        $httpBackend.expectPOST(window.base_url + window.ver_api + "queue/?format=json").respond(200);
        //$httpBackend.expectPOST(window.base_url + window.ver_api + "results/?format=json").respond(200);
        //$httpBackend.expectGET("https://services.humanbrainproject.eu/idm/v1/api/user/me").respond(200);
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
        $httpBackend.expectGET("static/nmpi/queue/resubmit.tpl.html").respond(200);  // should redirect to list view on success
        $scope.savejob();
        //$httpBackend.flush();
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
