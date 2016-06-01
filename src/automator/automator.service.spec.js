/* eslint max-nested-callbacks: 0 */
describe('clbAutomator', function() {
  var automator;
  var scope;
  var $q;

  beforeEach(module('clb-automator'));
  beforeEach(inject(function($rootScope, _$q_, clbAutomator) {
    automator = clbAutomator;
    scope = $rootScope;
    $q = _$q_;
  }));

  it('should instantiate tasks from descriptor', function() {
    automator.registerHandler('mytask', jasmine.createSpy('mytask'));
    automator.task('mytask', {});
  });

  describe('run(descriptor, context)', function() {
    it('should unwrap the name of the top level task and run it', function() {
      var descriptor = {key: 'value'};
      var def = {test: descriptor};
      var context = {};
      var handler = jasmine.createSpy('test').and.returnValue(true);
      automator.registerHandler('test', handler);
      automator.run(def, context).then(function(res) {
        expect(res).toBe(true);
      });
      scope.$digest();
      expect(handler).toHaveBeenCalledWith(descriptor, context);
    });
  });

  describe('task(name, descriptor, context)', function() {
    var name;
    var descriptor;
    var context;

    beforeEach(function() {
      name = 'test';
      descriptor = {key: 'value'};
      context = {collab: {}};
      automator.registerHandler(name, jasmine.createSpy(name));
    });

    it('should instantiate a task', function() {
      var task = automator.task(name, descriptor, context);
      expect(task).toBeDefined();
    });

    it('should support a minimal constructor', function() {
      var task = automator.task(name);
      expect(task).toBeDefined();
    });
  });

  describe('Task instance', function() {
    var name;
    var descriptor;
    var context;
    var task;
    var handler;
    var result;

    beforeEach(function() {
      name = 'test';
      descriptor = {key: 'value'};
      context = {collab: {
        title: 'My Collab',
        content: 'MyCollabDescription'
      }};
      result = {finished: true};
      handler = jasmine.createSpy(name).and.returnValue($q.when(result));
      automator.registerHandler(name, handler);
      task = automator.task(name, descriptor, context);
    });

    it('should have a name', function() {
      expect(task.name).toBe(name);
    });

    it('should have a descriptor', function() {
      expect(task.descriptor).toBe(descriptor);
    });

    it('should have a defaultContext', function() {
      expect(task.defaultContext).toBe(context);
    });

    describe('.run(context)', function() {
      it('should end with success', function() {
        task.run();
        scope.$digest();
        expect(task.state).toBe('success');
      });

      it('should call the task handler with the default context', function() {
        var runContext = {
          collab: {id: 3}
        };
        task.run(runContext);
        scope.$digest();
        expect(handler).toHaveBeenCalledWith(descriptor, runContext);
      });

      it('should handle error', inject(function($q, clbError) {
        var expected = clbError.error({});
        var actual;
        var spy = jasmine.createSpy('createCollab')
          .and.returnValue($q.reject(expected));
        automator.registerHandler('collab', spy);
        var task = automator.task('collab', {
          title: 'test error',
          content: 'test error description'
        });
        task.run().catch(function(err) {
          actual = err;
        });
        scope.$digest();
        expect(actual).toBe(expected);
      }));
    });
  });

  describe('extractAttributes(options, attrs)', function() {
    var extractAttributes;
    beforeEach(inject(function(clbAutomator) {
      extractAttributes = clbAutomator.extractAttributes;
    }));

    it('should return an object with attriutes in attrs', function() {
      var r = extractAttributes({a: 1, b: 2, c: 3}, ['a']);
      expect(r).toEqual({a: 1});
    });
  });

  describe('task and subtasks', function() {
    var task;
    var fixtures;

    beforeEach(function() {
      fixtures = {
        collab: {
          id: 1,
          title: 'My Custom Collab'
        }
      };
      var descriptor = {
        title: 'My Collab',
        description: 'My custom collab',
        after: [{
          storage: {
            entities: {
              'test.png': 'AAA-BBB-CCC',
              'unicorn.png': 'BBB-CCC-DDD'
            },
            after: [{
              nav: {
                name: 'Reproduce Experiment',
                app: 'Jupyter Notebook',
                entity: 'test.png'
              }
            }]
          }
        }, {
          nav: {
            items: [{
              name: 'Experiment',
              app: 'Test App'
            }, {
              name: 'My Nav',
              app: 'Test App'
            }]
          }
        }]
      };
      task = automator.task('collab', descriptor);
    });

    it('should list subtasks', function() {
      expect(task.subtasks).toBeDefined();
    });

    it('should create one child task per item', function() {
      expect(task.subtasks.length).toBe(2);
    });

    it('should keep the child tasks ordered', function() {
      expect(task.subtasks[0].name).toBe('storage');
      expect(task.subtasks[1].name).toBe('nav');
    });

    it('should recursively create the subtasks', function() {
      expect(task.subtasks[0].subtasks.length).toBe(1);
      expect(task.subtasks[0].subtasks[0].name).toBe('nav');
    });

    it('should use an empty list when there is no children', function() {
      expect(task.subtasks[1].subtasks.length).toBe(0);
    });

    describe('when run', function() {
      var deferInstances;

      beforeEach(function() {
        deferInstances = {
          collab: $q.defer(),
          nav: $q.defer(),
          storage: $q.defer(),
          jupyterNotebook: $q.defer()
        };
        spyOn(automator.handlers, 'collab')
          .and.returnValue(deferInstances.collab.promise);
        var navPromiseCycle = 0;
        spyOn(automator.handlers, 'nav').and.callFake(function() {
          return [
            deferInstances.nav.promise,
            deferInstances.jupyterNotebook.promise
          ][navPromiseCycle++ % 2];
        });
        spyOn(automator.handlers, 'storage')
          .and.returnValue(deferInstances.storage.promise);
      });

      it('should run the tasks in parallel', function() {
        var callback = jasmine.createSpy('callback');
        var jupyterExpectedDescriptor = task.subtasks[0].subtasks[0].descriptor;
        task.run().then(callback);
        scope.$digest();
        expect(automator.handlers.collab).toHaveBeenCalled();
        expect(automator.handlers.storage).not.toHaveBeenCalled();
        expect(automator.handlers.nav).not.toHaveBeenCalled();

        deferInstances.collab.resolve(fixtures.collab);
        scope.$digest();
        expect(automator.handlers.storage).toHaveBeenCalled();
        expect(automator.handlers.nav).toHaveBeenCalled();
        expect(callback).not.toHaveBeenCalled();
        expect(automator.handlers.nav).not.toHaveBeenCalledWith(
          jupyterExpectedDescriptor, jasmine.any(Object));

        deferInstances.storage.resolve(fixtures.storage);
        scope.$digest();
        expect(automator.handlers.nav).toHaveBeenCalledWith(
          jupyterExpectedDescriptor, jasmine.any(Object));

        deferInstances.nav.resolve(fixtures.nav);
        scope.$digest();

        expect(callback).not.toHaveBeenCalled();
        deferInstances.jupyterNotebook.resolve(fixtures.juptyerNotebook);
        scope.$digest();
        expect(callback).toHaveBeenCalled();
      });
    });
  });
});
