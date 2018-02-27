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
    var testPostQueue = {"list_endpoint": "/api/v2/queue", "schema": "/api/v2/queue/schema"};
    var testResults = {"list_endpoint": "/api/v2/results", "schema": "/api/v2/results/schema"}
    var testUpdateResult = {"code": "ddd8888", "collab_id": "4293", "command": "83", "comments": [{"content": "test comment", "created_time": "2018-02-05T12:38:25+00:00", "id": 1, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/1", "user": "me"}, {"content": "fdsfds", "created_time": "2018-02-21T15:49:27.995907+00:00", "id": 2, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/2", "user": "304621"}, {"content": "ffsdfds3 89389", "created_time": "2018-02-21T15:54:41.717406+00:00", "id": 3, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/3", "user": "304621"}, {"content": "fsdfdsq fghgjg", "created_time": "2018-02-21T16:15:36.833107+00:00", "id": 4, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/4", "user": "304621"}, {"content": "389!uçnjkddsf fdisuqh\"'çàj dsfjq", "created_time": "2018-02-21T16:38:42.353741+00:00", "id": 5, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/5", "user": "304621"}, {"content": "jjkkj ezoprez 83'çà'ezrajh", "created_time": "2018-02-22T09:50:49.200960+00:00", "id": 6, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/6", "user": "304621"}, {"content": "jjkkj ezoprez 83'çà'ezrajh", "created_time": "2018-02-22T09:51:03.887441+00:00", "id": 7, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/7", "user": "304621"}, {"content": "epepepepep vyvyvyvyvyvyvyv", "created_time": "2018-02-22T10:38:10.382165+00:00", "id": 8, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/8", "user": "304621"}], "hardware_config": {"menu": {"id": "file", "popup": {"menuitem": [{"onclick": "CreateNewDoc()", "value": "New"}, {"onclick": "OpenDoc()", "value": "Open"}, {"onclick": "CloseDoc()", "value": "Close"}]}, "value": "File"}}, "hardware_platform": "rrr", "id": 1, "input_data": [], "output_data": [], "provenance": null, "resource_uri": "/api/v2/results/1", "resource_usage": null, "status": "finished", "tags": ["test-tag-01", "glglgl", "fffd", "fdsfd", "ttttt", "dsop393r"], "timestamp_completion": null, "timestamp_submission": "2018-02-02T13:31:02+00:00", "user_id": "me"};
    var testComment = {"content": "ffdfdfsfds", "created_time": "2017-11-30T16:17:21", "id": 1, "job": "/api/v2/results/1", "resource_uri": "/api/v2/comment/1", "user": "me"};
    var testPostComment = {"content": "test_post_comment", "job": "/api/v2/results/1", "user": "me"};
    var testUpdateComment = {"content": "test_post_comment_MAJ333", "job": "/api/v2/results/1", "user": "me"};
    var testLog = {"list_endpoint": "/api/v2/log", "schema": "/api/v2/log/schema"};
    var testTags = {"list_endpoint": "/api/v2/tags", "schema": "/api/v2/tags/schema"};

    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));

    beforeEach(inject(function(_Queue_, _Results_, _Comment_, _Log_, _Tags_, _$httpBackend_, _$q_, _$location_) {
        Queue = _Queue_;
        Results = _Results_;
        Comment = _Comment_;
        Log = _Log_;
        Tags = _Tags_;
        $httpBackend = _$httpBackend_;
        $q = _$q_;
        $location = _$location_;
    }));

    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
        
        // Spy and force the return value when UsersFactory.all() is called
        spyOn(Queue, 'get').and.callThrough();
        spyOn(Queue, 'save').and.callThrough();
        spyOn(Queue, 'del').and.callThrough();
        spyOn(Queue, 'update').and.callThrough();
        spyOn(Results, 'get').and.callThrough();
        spyOn(Results, 'del').and.callThrough();
        spyOn(Results, 'update').and.callThrough();
        spyOn(Comment, 'get').and.callThrough();
        spyOn(Comment, 'save').and.callThrough();
        spyOn(Comment, 'del').and.callThrough();
        spyOn(Comment, 'update').and.callThrough();
        spyOn(Log, 'get').and.callThrough();
        spyOn(Tags, 'get').and.callThrough();
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
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Queue.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        expect(result.list_endpoint).toEqual(testQueue.list_endpoint);
    });

    it('should exist Queue.save', function() {
        expect(Queue.save).toBeDefined();
    });
    it('test result Queue.save', function() {
        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectPOST(window.base_url + window.ver_api + "queue/?format=json").respond(200);
        // post new queue
        expect(Queue.save).toBeDefined();
        rs_save = Queue.save(testPostQueue);
        console.log("rs_save : " + JSON.stringify(rs_save));
        $httpBackend.flush();
        expect(Queue.save).toHaveBeenCalledWith( testPostQueue );
    });

    it('should exist Queue.del', function() {
        expect(Queue.del).toBeDefined();
    });

    it('test result Queue.del', function(){
        $httpBackend.expectDELETE(window.base_url + window.ver_api + "queue/1/?format=json").respond(200);
        expect(Queue.del).not.toHaveBeenCalled();
        rs_delete = Queue.del({id:'1'});
        $httpBackend.flush();
        expect(Queue.del).toHaveBeenCalledWith({id:'1'});
    });

    it('should exist Queue.update', function() {
        expect(Queue.update).toBeDefined();
    });

    it('test result Queue.update', function(){
        $httpBackend.expectPUT(window.base_url + window.ver_api + "queue/?format=json").respond(200);
        expect(Queue.update).not.toHaveBeenCalled();
        rs_update = Queue.update({id:'1', hardware_platform:'rrrwwww23', statud:'finished'});
        $httpBackend.flush();
        //console.log("rs_update : " + JSON.stringify(rs_update));
        expect(Queue.update).toHaveBeenCalledWith({id:'1', hardware_platform:'rrrwwww23', statud:'finished'});
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

    it('test result Results.del', function(){
        $httpBackend.expectDELETE(window.base_url + window.ver_api + "results/1/?format=json").respond(200);
        expect(Results.del).not.toHaveBeenCalled();
        rs_delete = Results.del({id:'1'});
        $httpBackend.flush();
        expect(Results.del).toHaveBeenCalledWith({id:'1'});
    });

    it('should exist Results.update', function() {
        expect(Results.update).toBeDefined();
    });

    it('test result Results.update', function(){
        $httpBackend.expectPUT(window.base_url + window.ver_api + "results/?format=json").respond(200);
        expect(Results.update).not.toHaveBeenCalled();
        rs_update = Results.update(testUpdateResult);
        $httpBackend.flush();
        expect(Results.update).toHaveBeenCalledWith(testUpdateResult);
    });

    it('should exist Comment Factory', function() {
        expect(Comment).toBeDefined();
    });

    it('should exist Comment.get', function() {
        expect(Comment.get).toBeDefined();
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
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Comment.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(comment).toBeDefined();
        expect(comment.content).toEqual(testComment.content);
    });

    it('should exist Comment.save', function() {
        expect(Comment.save).toBeDefined();
    });

    it('test result Comment.save', function() {
        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectPOST(window.base_url + window.ver_api + "comment/?format=json").respond(200);
        // post new comment
        expect(Comment.save).toBeDefined();
        rs_save = Comment.save(testPostComment);
        expect(Comment.save).toHaveBeenCalledWith( testPostComment );
        $httpBackend.flush();
    });

    it('should exist Comment.del', function() {
        expect(Comment.del).toBeDefined();
    });

    it('test result Comment.del', function() {
        $httpBackend.expectDELETE(window.base_url + window.ver_api + "comment/1/?format=json").respond(200);
        expect(Comment.del).not.toHaveBeenCalled();
        rs_delete = Comment.del({id:'1'});
        $httpBackend.flush();
        expect(Comment.del).toHaveBeenCalledWith({id:'1'});
    });

    it('should exist Comment.update', function() {
        expect(Comment.update).toBeDefined();
    });

    it('test result Comment.update', function(){
        $httpBackend.expectPUT(window.base_url + window.ver_api + "comment/?format=json").respond(200);
        expect(Comment.update).not.toHaveBeenCalled();
        rs_update = Comment.update(testUpdateComment);
        $httpBackend.flush();
        expect(Comment.update).toHaveBeenCalledWith(testUpdateComment);
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
            console.log("log result : "+JSON.stringify(result));
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Log.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        expect(result.list_endpoint).toEqual(testLog.list_endpoint);
    });

    it('should exist Tags.get', function(){
        expect(Tags.get).toBeDefined();
    });

    it('test result Tags.get', function(){
        $httpBackend.expectGET(window.base_url + window.ver_api + "tags/1/?format=json").respond(testTags);
        expect(Tags.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = Tags.get({id:'1'}, function(res){
            result = res;
            console.log("tags result : " + JSON.stringify(result));
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(Tags.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        expect(result.list_endpoint).toEqual(testTags.list_endpoint);
    });
  });