angular.module('clb-ui-storage')
.run(function($templateCache) {
  // During the build, templateUrl will be replaced by the inline template.
  // We need to inject it in template cache as it is used for displaying
  // the tooltip. Does it smell like a hack? sure, it is a hack!
  var injector = {
    templateUrl: 'file-browser-tooltip.tpl.html'
  };
  // If defined, it means that the template has been inlined during build.
  if (injector.template) {
    $templateCache.put('file-browser-tooltip.tpl.html', injector.template);
  }
});
