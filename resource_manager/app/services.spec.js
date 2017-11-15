describe('Project factory', function() {
  var Projects;

  var PUBLIC_COLLAB = '2330';
  var ALICE = '300005';

  var sampleProject = {
    'accepted': false,
    'context': "909006c3-12e5-45fd-b287-f095c48122e8",
    'collab': PUBLIC_COLLAB,
    'owner': ALICE,
    'title': "An unsubmitted resource request used for testing",
    'abstract': "Do not submit, delete or change the status",
    'description': "kejxfg nsgxfnaiugnf\n"
  }

  // Before each test load the request-app module
  beforeEach(angular.mock.module('request-app'));

  // Before each test set our injected Projects factory (_Projects_) to our local Projects variable
  beforeEach(inject(function(_Projects_) {
    Projects = _Projects_;
  }));

  // A simple test to verify the Projects factory exists
  it('should exist', function() {
    expect(Projects).toBeDefined();
  });

  // A set of tests for the Projects.get() method
  describe('.get()', function() {
    // A simple test to verify the method exists
    it('should exist', function() {
      expect(Projects.get).toBeDefined();
    });

    // A test to verify that calling get() returns the sample project hard-coded above
    //it('should return a hard-coded project', function() {
    //  expect(Projects.get("909006c3-12e5-45fd-b287-f095c48122e8")).toEqual(sampleProject);
    //});

  });

});