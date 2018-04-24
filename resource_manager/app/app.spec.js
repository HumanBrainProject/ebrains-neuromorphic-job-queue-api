describe('Collab and Context factory', function() {
    // Before each test load our api.users module
    beforeEach(angular.mock.module('request-app'));

    // Before each test set our injected User factory (_User_) to our local User variable
    beforeEach(inject(function(_Projects_) {
        Projects = _Projects_;
    }));

    // A simple test to verify the module exists
    it('should exist Projects Factory', function() {
        expect(Projects).toBeDefined();
    });
});
