// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('Queue factory', function() {  
    var Queue;
    var Results;
    var Comment;
    var Log;

    var testComment = {
        id: '1',
        content: 'toto',
        created_time: '2017-11-14 15:41:49',
        user: 'me',
        job_id: '1',
    }; 

    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));
  
    // Before each test set our injected User factory (_User_) to our local User variable
    beforeEach(inject(function(_Queue_) {
        Queue = _Queue_;
    }));

    beforeEach(inject(function(_Results_) {
        Results = _Results_;
    }));

    beforeEach(inject(function(_Comment_) {
        Comment = _Comment_;
    }));

    beforeEach(inject(function(_Log_) {
        Log = _Log_;
    }));
  
    it('should exist Queue Factory', function() {
        expect(Queue).toBeDefined();
    });

    it('should exist Queue.get', function() {
        expect(Queue.get).toBeDefined();
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

    it('test result Comment.get', function() {
        expect(Comment.get(1)).toEqual(testComment);
    });

  });