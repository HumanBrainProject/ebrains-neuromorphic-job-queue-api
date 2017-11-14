// Be descriptive with titles here. The describe and it titles combined read like a sentence.
describe('User factory', function() {
  // it('has a dummy spec to test 2 + 2', function() {
  //   // An intentionally failing test. No code within expect() will never equal 4.
  //   expect(2 + 2).toEqual(4);
  // });

  var User;

  //The single user we expect to receive when calling findById('2')
  // var singleUser = {
  //   id: '2',
  //   username: 'jo',
  //   is_superuser: '1',
  // };  
  // Before each test load our api.users module
  beforeEach(angular.mock.module('nmpi'));

  // Before each test set our injected User factory (_User_) to our local User variable
  beforeEach(inject(function(_User_) {
    User = _User_;
  }));

  // A simple test to verify the nmpi module exists
  it('should exist User Factory', function() {
    expect(User).toBeDefined();
  });

  it('should exist User.get', function() {
    expect(User.get).toBeDefined();
  });

  // it('test result User.get', function() {
  //   expect(User.get(2)).toEqual(singleUser);
  // });


});