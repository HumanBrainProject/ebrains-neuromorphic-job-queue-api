describe('clbFeed directive', function() {
  var compile;
  var scope;
  var service;
  var $q;
  var feedResultSet;

  beforeEach(module('clb-stream'));
  beforeEach(inject(function(
    $compile,
    $rootScope,
    $window,
    $templateCache,
    _$q_,
    clbStream
  ) {
    compile = $compile;
    scope = $rootScope;
    service = clbStream;
    $q = _$q_;
    spyOn($templateCache, 'get').and.callFake(function(k) {
      return $window.__html__['src/stream/' + k];
    });
    scope.feedType = 'HBPType';
    scope.feedId = 1;
    feedResultSet = {
      results: [
        {
          actor: {id: '1', type: 'HBPType', state: null},
          object: {id: 'softwarecat', type: 'HBPSoftware', state: null},
          summary: 'Some Summary',
          target: {id: "general", type: "HBPSoftwareCatalog", state: null},
          verb: 'REGISTER',
          time: new Date(Date.parse("2016-05-24T15:30:18.122882Z"))
        }
      ]
    };
  }));

  it('should define clb-feed class', function() {
    spyOn(service, 'getStream').and.returnValue($q.when(feedResultSet));
    var element = compile(
      '<clb-feed clb-feed-type="feedType" clb-feed-id="feedId"></clb-feed>'
    )(scope);
    scope.$digest();
    expect(element.hasClass('clb-feed')).toBe(true);
  });

  it('should display the feed as a list', function() {
    spyOn(service, 'getStream').and.returnValue($q.when(feedResultSet));
    var element = compile(
      '<clb-feed clb-feed-type="feedType" clb-feed-id="feedId"></clb-feed>'
    )(scope);
    scope.$digest();
    expect(element.find('ul').hasClass('feed')).toBe(true);
    expect(element.find('ul').find('li').attr('clb-activity')).toBe('a');
  });

  it('should display error message', inject(function(clbError) {
    var err = clbError.error();
    spyOn(service, 'getStream').and.returnValue(
      $q.reject(err));
    var element = compile(
      '<clb-feed clb-feed-type="feedType" clb-feed-id="feedId"></clb-feed>'
    )(scope);
    scope.$digest();
    expect(element.find('ul').hasClass('feed')).toBe(true);
    expect(element.find('ul').find('div').text()).toMatch(
      'Load Error: ' + err.message);
  }));
});
