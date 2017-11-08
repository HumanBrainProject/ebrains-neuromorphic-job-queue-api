// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('DataItem factory', function() {  
    var DataItem;
    
    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));
  
    // Before each test set our injected User factory (_User_) to our local User variable
    beforeEach(inject(function(_DataItem_) {
        DataItem = _DataItem_;
    }));
  
    // A simple test to verify the nmpi module exists
    it('should exist DataItem Factory', function() {
      expect(DataItem).toBeDefined();
    });
  
    // A simple test to verify the nmpi module exists
    it('should exist DataItem.get', function() {
        expect(DataItem.get).toBeDefined();
    });
    // A simple test to verify the nmpi module exists
    it('should exist DataItem.save', function() {
        expect(DataItem.save).toBeDefined();
    });

  });