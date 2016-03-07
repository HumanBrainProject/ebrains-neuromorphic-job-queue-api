describe('hbpCollaboratoryAutomator', function() {
  var automator;
  var scope;
  var $q;

  beforeEach(module('hbpCollaboratoryAutomator'));
  beforeEach(inject(function($rootScope, _$q_, hbpCollaboratoryAutomator) {
    automator = hbpCollaboratoryAutomator;
    scope = $rootScope;
    $q = _$q_;
  }));

  describe('run automated task from descriptor', function() {
    var data;

    beforeEach(function() {
      data = {
        collab: {
          name: 'My Collab',
          description: 'MyCollabDescription'
        }
      };
    });

    it('should end with success', function() {
      var task = automator.task({});
      task.run();
      scope.$digest();
      expect(task.state).toBe('success');
    });

    it('should call createCollab when collab is in the descriptor', function() {
      var spy = jasmine.createSpy('createCollab');
      spy.and.returnValue($q.when({}));
      automator.registerHandler('collab', spy);
      automator.task({
        collab: data.collab
      }).run();
      scope.$digest();
      expect(spy).toHaveBeenCalledWith(data.collab);
    });
  });

  describe('extractAttributes(options, attrs)', function() {
    var extractAttributes;
    beforeEach(inject(function(hbpCollaboratoryAutomator) {
      extractAttributes = hbpCollaboratoryAutomator.extractAttributes;
    }));

    it('should return an object with attriutes in attrs', function() {
      var r = extractAttributes({a: 1, b: 2, c: 3}, ['a']);
      expect(r).toEqual({a: 1});
    });
  });
});
