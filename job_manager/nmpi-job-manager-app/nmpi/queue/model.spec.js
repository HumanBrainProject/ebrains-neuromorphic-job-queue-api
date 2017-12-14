// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('Queue factory', function() {  
    var Queue;
    var Results;
    var Comment;
    var Log;
    var $httpBackend;
    var $q;
    var $location;

    window.base_url = 'https://127.0.0.1:8000';
    //window.base_url = '';
    window.ver_api = '/api/v2/';

    var testQueue = {"list_endpoint": "/api/v2/queue", "schema": "/api/v2/queue/schema"};
    var testResults = {"list_endpoint": "/api/v2/results", "schema": "/api/v2/results/schema"}
    var testComment = {"content": "ffdfdfsfds", "created_time": "2017-11-30T16:17:21", "id": 1, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/1", "user": "me"};
    var testPostComment = {"content": "test_post_comment", "job": "/api/v2/results/1", "user": "me"};
    var testLog = {"list_endpoint": "/api/v2/log", "schema": "/api/v2/log/schema"};

    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));

    beforeEach(inject(function(_Queue_, _Results_, _Comment_, _Log_, _$httpBackend_, _$q_, _$location_) {
        Queue = _Queue_;
        Results = _Results_;
        Comment = _Comment_;
        Log = _Log_;
        $httpBackend = _$httpBackend_;
        $q = _$q_;
        $location = _$location_;
    }));

    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
        
        // Spy and force the return value when UsersFactory.all() is called
        spyOn(Queue, 'get').and.callThrough();
        spyOn(Results, 'get').and.callThrough();
        spyOn(Comment, 'get').and.callThrough();
        spyOn(Comment, 'save').and.callThrough();
        spyOn(Log, 'get').and.callThrough();
    });

    it('should exist Queue Factory', function() {
        expect(Queue).toBeDefined();
    });

    it('should exist Queue.get', function() {
        expect(Queue.get).toBeDefined();
    });

    it('test result Queue.get', function() {
        $httpBackend.expectGET(window.base_url + window.ver_api + "queue/1/?format=json").respond(testQueue);
        expect(Queue.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = Queue.get({id:'1'}, function(res){
            result = res;
            // console.log('queue 1 : ' + JSON.stringify(queue));
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        //console.log('rs1 : ' + JSON.stringify(rs1));
        expect(Queue.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        // console.log("result.list_endpoint : " + result.list_endpoint);
        // console.log("testQueue.list_endpoint " + testQueue.list_endpoint);
        expect(result.list_endpoint).toEqual(testQueue.list_endpoint);
    });

    it('should exist Queue.save', function() {
        expect(Queue.save).toBeDefined();
    });

    it('should exist Queue.delete', function() {
        expect(Queue.delete).toBeDefined();
    });

    it('should exist Queue.update', function() {
        expect(Queue.update).toBeDefined();
    });

    it('should exist Results Factory', function() {
        expect(Results).toBeDefined();
    });

    it('should exist Results.get', function() {
        expect(Results.get).toBeDefined();
    });

    it('test result Results.get', function() {
        $httpBackend.expectGET(window.base_url + window.ver_api + "results/1/?format=json").respond(testResults);
        expect(Results.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = Results.get({id:'1'}, function(res){
            result = res;
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Results.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        expect(result.list_endpoint).toEqual(testResults.list_endpoint);
    });

    it('should exist Results.del', function() {
        expect(Results.del).toBeDefined();
    });

    it('should exist Results.update', function() {
        expect(Results.update).toBeDefined();
    });

    it('should exist Comment Factory', function() {
        expect(Comment).toBeDefined();
    });

    it('should exist Comment.get', function() {
        expect(Comment.get).toBeDefined();
    });
        
    it('should exist Comment.save', function() {
        expect(Comment.save).toBeDefined();
    });

    it('should exist Comment.del', function() {
        expect(Comment.del).toBeDefined();
    });

    it('should exist Comment.update', function() {
        expect(Comment.update).toBeDefined();
    });

    it('should exist Log Factory', function() {
        expect(Log).toBeDefined();
    });

    it('should exist Log.get', function() {
        expect(Log.get).toBeDefined();
    });

    it('test result Log.get', function() {
        $httpBackend.expectGET(window.base_url + window.ver_api + "log/1/?format=json").respond(testLog);
        expect(Log.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = Log.get({id:'1'}, function(res){
            result = res;
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Log.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        expect(result.list_endpoint).toEqual(testLog.list_endpoint);
    });

    it('test result Comment.get', function() {
        var comment;

        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectGET(window.base_url + window.ver_api + "comment/1/?format=json").respond(testComment);
        expect(Comment.get).not.toHaveBeenCalled();
        expect(result).toEqual({});

        var rs1;
        rs1 = Comment.get({id:'1'}, function(res){
            comment = res;
            //console.log('comment 1 : ' + comment.content);
        });

        // Flush pending HTTP requests
        $httpBackend.flush();
        //console.log('rs1 : ' + JSON.stringify(rs1));
        expect(Comment.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(comment).toBeDefined();
        //console.log("comment.content : " + comment.content);
        expect(comment.content).toEqual(testComment.content);
    });
    
    it('test result Comment.post', function() {
        var comment;
        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectPOST(window.base_url + window.ver_api + "comment/?format=json").respond(testPostComment);
        $httpBackend.expectGET(window.base_url + window.ver_api + "comment/?format=json").respond(testComment);

        // post new comment
        //expect(Comment.save).toBeDefined();
        
        //expect(Comment.save).not.toHaveBeenCalled();
        expect(Comment.get).not.toHaveBeenCalled();

        console.log('testPostComment : ' + testPostComment.content);
        rs_save = Comment.save(testPostComment);
        console.log("rs_save : " + rs_save.content);
        //expect(Comment.save).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(Comment.save).toHaveBeenCalledWith( testPostComment );
        //$httpBackend.flush();
        
        // get posted comment
        rs_test_get = Comment.get( function(res){
            comment = res;
            console.log('comment 1 : ' + comment.content);
        });
        console.log("rs_test_get : " + JSON.stringify(rs_test_get));
        $httpBackend.flush();
        expect(Comment.get).toHaveBeenCalledWith( jasmine.any(Function));
        expect(comment.content).toEqual(testComment.content);

        // delete posted comment

        //expect(result).toEqual({});

    });

    // it('test result Queue.get', function() {
    //     var comment;
    // });
  });