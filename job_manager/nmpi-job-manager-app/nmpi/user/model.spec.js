// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('User factory', function() {
  // it('has a dummy spec to test 2 + 2', function() {
  //   // An intentionally failing test. No code within expect() will never equal 4.
  //   expect(2 + 2).toEqual(4);
  // });

  var User;
  var user_url = "https://services.humanbrainproject.eu/idm/v1/api/user/";
  var $httpBackend;
  var testUser = "";

  //The single user we expect to receive when calling findById('2')
  var singleUser = {
    id: '2',
    username: 'jo',
    is_superuser: '1',
  };  
  // Before each test load our api.users module
  beforeEach(angular.mock.module('nmpi'));

  // Before each test set our injected User factory (_User_) to our local User variable
  beforeEach(inject(function(_User_, _$httpBackend_) {
    User = _User_;
    $httpBackend = $httpBackend;
  }));

  beforeEach(function() {
    // Initialize our local result object to an empty object before each test
    result = {};
    
    // Spy and force the return value when UsersFactory.all() is called
    //spyOn(User, 'get').and.callThrough();
  });

  // A simple test to verify the nmpi module exists
  it('should exist User Factory', function() {
    expect(User).toBeDefined();
  });

  it('should exist User.get', function() {
    expect(User.get).toBeDefined();
  });

  // it('test result User.get', function() {
  //   $httpBackend.expectGET(user_url + "2").respond(testUser);

  //   expect(User.get).not.toHaveBeenCalled();

  //   User.get({id:'2'}, function(user){
  //     console.log("User.get function")
  //     usr = user;
  //   });
  //   $httpBackend.flush();

  //   expect(User.get).toHaveBeenCalledWith({id:'2'}, jasmine.any(Function));
  //   expect(usr).toBeDefined();
  // });



});