describe('clbTimeAgo filter', function() {
  var filter;

  beforeEach(module('clb-datetime'));
  beforeEach(inject(function(clbTimeAgoFilter) {
    filter = clbTimeAgoFilter;
  }));

  it('should transform a date to a sentence', function() {
    expect(filter(Date(2008, 10, 8)))
      .toBeSameTypeAs('some time ago');
  });

  it('should transform a date to a proper sentence', function() {
    var now = new Date();
    var past = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    expect(filter(past))
      .toBe('a year ago');
  });
});
