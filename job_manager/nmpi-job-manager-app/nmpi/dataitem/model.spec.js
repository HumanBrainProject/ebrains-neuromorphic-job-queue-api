// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('DataItem factory', function() {  
    var DataItem;
    var testDataItem = {"list_endpoint": "/api/v2/dataitem", "schema": "/api/v2/dataitem/schema"};
    // Before each test load our api.users module
    beforeEach(angular.mock.module('nmpi'));
  
    // Before each test set our injected User factory (_User_) to our local User variable
    beforeEach(inject(function(_DataItem_, _$httpBackend_) {
        DataItem = _DataItem_;
        $httpBackend = _$httpBackend_;
    }));
  
    beforeEach(function() {
        // Initialize our local result object to an empty object before each test
        result = {};
        
        // Spy and force the return value when UsersFactory.all() is called
        spyOn(DataItem, 'get').and.callThrough();
      });

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
    //
    it('test result DataItem.get', function() {
        // Declare the endpoint we expect our service to hit and provide it with our mocked return values
        $httpBackend.expectGET(window.base_url + window.ver_api + "dataitem/1/?format=json").respond(testDataItem);
        expect(DataItem.get).not.toHaveBeenCalled();
        expect(result).toEqual({});
        var rs1;
        rs1 = DataItem.get({id:'1'}, function(res){
            result = res;
            //console.log('result 1 : ' + result.content);
        });
        // Flush pending HTTP requests
        $httpBackend.flush();
        expect(DataItem.get).toHaveBeenCalledWith({id:'1'}, jasmine.any(Function));
        expect(result).toBeDefined();
        //console.log("result.content : " + result.content);
        expect(result.content).toEqual(testDataItem.content);        
    });
  });