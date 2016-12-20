'use strict';

describe('Directive: clbUsercard', function() {
  var $compile;
  var $rootScope;
  var $q;
  var hbpIdentityUserDirectory;

  var element;

  beforeEach(module('clb-ui-identity'));

  // Initialize the controller and a mock scope
  beforeEach(inject(function(
    _$rootScope_,
    _$compile_,
    _$q_,
    clbUser,
    $templateCache
  ) {
    $rootScope = _$rootScope_;
    $compile = _$compile_;
    $q = _$q_;
    hbpIdentityUserDirectory = clbUser;

    $rootScope.me = {
      sciper: '123123',
      displayName: 'John Doe',
      emails: [
        {value: 'john@doe.com'},
        {value: 'john.doe@epfl.ch', primary: true}
      ],
      phones: [
        {value: '1-2223-444'},
        {value: '1-2223-666', primary: true},
        {value: '1-2223-555'}
      ],
      ims: [{value: 'skype://johndoe', primary: true}],
      username: 'jdoe'
    };
    $rootScope.someoneElse = {
      sciper: '456456',
      displayName: 'Marie Curie',
      username: 'marie'
    };

    spyOn(hbpIdentityUserDirectory, 'getCurrentUser')
      .and.returnValue($q.when($rootScope.me));

    jasmine.cacheTemplate($templateCache,
      'usercard.directive.html',
      'src/ui-identity/');
    jasmine.cacheTemplate($templateCache,
      'user-avatar.directive.html',
      'src/ui-identity/');
  }));

  var itDisplayUserCardFor = function(who) {
    var user;

    beforeEach(function() {
      user = $rootScope[who];
    });

    it('should contains .clb-usercard', function() {
      expect(element[0].querySelector('.clb-usercard')).toBeTruthy();
    });

    it('should contains .clb-usercard-name', function() {
      var tag = element[0].querySelector('.clb-usercard .clb-usercard-name');
      expect(tag).toBeTruthy();
      expect(tag.innerHTML).toMatch(user.displayName);
    });

    it('should contains .clb-usercard-username', function() {
      var tag = element[0].querySelector(
        '.clb-usercard .clb-usercard-username');
      expect(tag).toBeTruthy();
      expect(tag.innerHTML).toBe('@' + user.username);
    });
  };

  describe('displaying someone else', function() {
    beforeEach(function() {
      element = angular.element(
        '<clb-usercard clb-user="someoneElse"></clb-usercard>');
      $compile(element)($rootScope);
      $rootScope.$digest();
    });

    itDisplayUserCardFor('someoneElse');

    it('should not contains .clb-usercard-email', function() {
      var tag = element[0].querySelector('.clb-usercard .clb-usercard-email');
      expect(tag).toBeNull();
    });
  });

  describe('displaying me', function() {
    beforeEach(function() {
      element = angular.element('<clb-usercard clb-user="me"></clb-usercard>');
      $compile(element)($rootScope);
      $rootScope.$digest();
    });

    itDisplayUserCardFor('me');

    it('should contains .clb-usercard-email', function() {
      var tag = element[0].querySelector('.clb-usercard .clb-usercard-email');
      expect(tag).toBeTruthy();
      expect(tag.innerHTML).toMatch(/john\.doe@epfl\.ch/);
    });
  });
});
