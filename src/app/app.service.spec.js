describe('clbApp', function() {
  var tk;
  var w;

  beforeEach(module('clb-app'));
  beforeEach(inject(function(clbApp, $window) {
    tk = clbApp;
    w = $window;
  }));

  describe('.emit()', function() {
    it('call postMessage', function() {
      spyOn(w.parent, 'postMessage');
      tk.emit('someEvent');
      expect(w.parent.postMessage).toHaveBeenCalled();
    });

    it('use a well formed message', function() {
      spyOn(w.parent, 'postMessage');
      tk.emit('someEvent', {some: 'data'});
      expect(w.parent.postMessage).toHaveBeenCalledWith({
        apiVersion: 1,
        eventName: 'someEvent',
        data: {
          some: 'data'
        },
        ticket: jasmine.any(Number)
      }, '*');
    });

    it('return a promise', function() {
      spyOn(w.parent, 'postMessage');
      var p = tk.emit('someEvent');
      expect(p.then).toBeDefined();
    });

    it('resolve to the result', inject(function($rootScope) {
      var result;
      spyOn(w.parent, 'postMessage').and.callFake(function(event) {
        $rootScope.$broadcast('message', {
          origin: event.ticket,
          data: 65,
          eventName: 'resolved'
        });
      });
      tk.emit('someEvent').then(function(r) {
        result = r;
      });
      $rootScope.$digest();
      expect(result).toBe(65);
    }));

    it('reject a HBP Errror', inject(function($rootScope) {
      var result;
      spyOn(w.parent, 'postMessage').and.callFake(function(event) {
        $rootScope.$broadcast('message', {
          origin: event.ticket,
          data: {type: 'SuperbError'},
          eventName: 'error'
        });
      });
      tk.emit('someEvent').catch(function(err) {
        result = err;
      });
      $rootScope.$digest();
      expect(result.type).toBe('SuperbError');
      expect(result).toBeHbpError();
    }));
  });

  describe('.open', function() {
    it('call postMessage', function() {
      var ref = {type: 'HBPCollab', id: 1};
      spyOn(w.parent, 'postMessage');
      tk.open(ref);
      expect(w.parent.postMessage).toHaveBeenCalledWith({
        apiVersion: 1,
        ticket: jasmine.any(Number),
        eventName: 'resourceLocator.open',
        data: {
          ref: ref
        }
      }, '*');
    });
  });

  describe('.context', function() {
    var result;
    var scope;

    beforeEach(inject(function($q, $rootScope) {
      scope = $rootScope;
    }));

    it('retrieve the context', function() {
      spyOn(w.parent, 'postMessage').and.callFake(function(event) {
        scope.$broadcast('message', {
          origin: event.ticket,
          data: {
            ctx: '123a-456aaaa-bbbbbbbbbbbb',
            state: 'lorem ipsum',
            mode: 'run'
          },
          eventName: 'resolved'
        });
      });
      tk.context().then(function(c) {
        result = c;
      });
      expect(w.parent.postMessage).toHaveBeenCalledWith({
        apiVersion: 1,
        eventName: 'workspace.context',
        data: undefined,
        ticket: 1
      }, '*');
      scope.$digest();
      expect(result.ctx).toBe('123a-456aaaa-bbbbbbbbbbbb');
      expect(result.state).toBe('lorem ipsum');
      expect(result.mode).toBe('run');
    });

    it('fail after a while', inject(function($timeout) {
      tk.context().catch(function(err) {
        result = err;
      });
      $timeout.flush();
      expect(result).toBeHbpError();
      expect(result.type).toBe('TimeoutException');
    }));

    it('may fail for unknown reasons', function() {
      spyOn(w.parent, 'postMessage').and.callFake(function(event) {
        scope.$broadcast('message', {
          origin: event.ticket,
          data: {
            type: 'SuperbError'
          },
          eventName: 'error'
        });
      });
      tk.context().catch(function(err) {
        result = err;
      });
      scope.$digest();
      expect(result).toBeHbpError();
      expect(result.type).toBe('SuperbError');
    });

    it('can set the state', function() {
      spyOn(w.parent, 'postMessage');
      tk.context({
        state: 'Lorem ipsum dolor sit amet'
      });
      expect(w.parent.postMessage).toHaveBeenCalledWith({
        apiVersion: 1,
        eventName: 'workspace.context',
        data: {
          state: 'Lorem ipsum dolor sit amet'
        },
        ticket: 1
      }, '*');
    });
  });
});
