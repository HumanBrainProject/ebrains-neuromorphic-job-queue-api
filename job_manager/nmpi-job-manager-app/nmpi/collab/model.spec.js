// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('Collab and Context factory', function() {
    // it('has a dummy spec to test 2 + 2', function() {
    //   // An intentionally failing test. No code within expect() will never equal 4.
    //   expect(2 + 2).toEqual(4);
    // });
  
    var Context;
    var Collab;
    
    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));
  
    // Before each test set our injected User factory (_User_) to our local User variable
    beforeEach(inject(function(_Context_) {
        Context = _Context_;
    }));

    beforeEach(inject(function(_Collab_) {
        Collab = _Collab_;
    }));
  
    // A simple test to verify the nmpi module exists
    it('should exist Context Factory', function() {
      expect(Context).toBeDefined();
    });
  
    // A simple test to verify the nmpi module exists
    it('should exist Context.get', function() {
        expect(Context.get).toBeDefined();
    });

    it('should exist Collab Factory', function() {
      expect(Collab).toBeDefined();
    });
    it('should exist Collab.get', function() {
        expect(Collab.get).toBeDefined();
    });

  });