angular.module('clb-ui-identity')
.run(function($templateCache) {
  // During the build, templateUrl will be replaced by the inline template.
  // We need to inject it in template cache as it is used for displaying
  // the tooltip. Does it smell like a hack? sure, it is a hack!
  var injector = {
    templateUrl: 'usercard-popover.tpl.html'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('usercard-popover.tpl.html', injector.template);
  }
});
