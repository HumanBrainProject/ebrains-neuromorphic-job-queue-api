// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('User factory', function() {
  // it('has a dummy spec to test 2 + 2', function() {
  //   // An intentionally failing test. No code within expect() will never equal 4.
  //   expect(2 + 2).toEqual(4);
  // });

  var User;
  var user_url = "https://services.humanbrainproject.eu/idm/v1/api/user/";
  var $httpBackend;
  var testUser = {
    "id" : "304621",
    "updatedAt" : "2017-07-05T08:28:51",
    "username" : "jduperrier02",
    "givenName" : "DUPERRIER",
    "familyName" : "Jonathan",
    "displayName" : "DUPERRIER Jonathan",
    "title" : null,
    "profile" : null,
    "picture" : null,
    "emails" : [ {
      "value" : "jonathan.duperrier@gmail.com",
      "primary" : true,
      "verified" : true
    } ],
    "phones" : [ ],
    "institutions" : [ {
      "name" : "Centre National de la Recherche Scientifique",
      "department" : null,
      "postalAddress" : null,
      "title" : null,
      "primary" : true
    } ],
    "ims" : [ ]
  };

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
    $httpBackend = _$httpBackend_;
  }));

  beforeEach(function() {
    // Initialize our local result object to an empty object before each test
    result = {};
    
    // Spy and force the return value when UsersFactory.all() is called
    spyOn(User, 'get').and.callThrough();
  });

  // A simple test to verify the nmpi module exists
  it('should exist User Factory', function() {
    expect(User).toBeDefined();
  });

  it('should exist User.get', function() {
    expect(User.get).toBeDefined();
  });

  it('test result User.get', function() {
    console.log("user_url : " + user_url);
    console.log("testuser : " + JSON.stringify(testUser));
    $httpBackend.expectGET("https://services.humanbrainproject.eu/idm/v1/api/user/304621").respond(testUser);

    expect(User.get).not.toHaveBeenCalled();

    rs = User.get({id:'304621'}, function(result){
      console.log("User.get function");
      usr = result;
    });
    $httpBackend.flush();

    expect(User.get).toHaveBeenCalledWith({id:'304621'}, jasmine.any(Function));
    expect(usr).toBeDefined();
  });

});