describe('clbFeed directive', function() {
  var compile;
  var scope;
  var service;
  var $q;
  var feedResultSet;

  beforeEach(module('clb-ui-stream'));
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
    jasmine.cacheTemplate($templateCache,
      'activity.directive.html',
      'src/ui-stream/');
    jasmine.cacheTemplate($templateCache,
      'feed.directive.html',
      'src/ui-stream/');
    scope.feedType = 'HBPType';
    scope.feedId = 1;
    feedResultSet = {
      results: [
        {
          actor: {id: '1', type: 'HBPType', state: null},
          object: {id: 'softwarecat', type: 'HBPSoftware', state: null},
          summary: 'Some Summary',
          target: {id: 'general', type: 'HBPSoftwareCatalog', state: null},
          verb: 'REGISTER',
          time: new Date(Date.parse('2016-05-24T15:30:18.122882Z'))
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

  it('should hydrate results with HBPUser actor', inject(function(clbUser) {
    spyOn(service, 'getStream').and.returnValue($q.when(feedResultSet));
    compile(
      '<clb-feed clb-feed-type="feedType" clb-feed-id="feedId"></clb-feed>'
    )(scope);
    scope.$digest();
    expect(service.getStream.calls.count()).toBe(1);
    expect(service.getStream.calls.argsFor(0))
      .toEqual(['HBPType', 1, jasmine.any(Object)]);
    var fn = service.getStream.calls.argsFor(0)[2].resultsFactory;
    var user = {displayName: 'john Doe'};
    spyOn(clbUser, 'get').and.returnValue($q.when({1: user}));
    feedResultSet.results[0].actor.type = 'HBPUser';
    fn(feedResultSet.results);
    expect(clbUser.get).toHaveBeenCalledWith(['1']);
    scope.$digest();
    expect(feedResultSet.results[0].actor.data).toBe(user);
  }));

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

  it('should display empty activity message', function() {
    spyOn(service, 'getStream').and.returnValue($q.when({results: []}));
    var element = compile(
      '<clb-feed clb-feed-type="feedType" clb-feed-id="feedId"></clb-feed>'
    )(scope);
    scope.$digest();
    expect(element.find('ul').hasClass('feed-empty')).toBe(true);
    expect(element.find('ul').find('div').text()).toMatch(
      'No activities to show');
  });
});
