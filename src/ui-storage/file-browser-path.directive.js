angular.module('clb-ui-storage')
.directive('clbFileBrowserPath', clbFileBrowserPath);

/**
 * @namespace clbFileBrowserPath
 * @desc
 * clbFileBrowserPath directive is a child of clbFileBrowser directive
 * that renders the breadcrumb according to the file browser setup.
 *
 * @example
 * <clb-file-browser-path></clb-file-browser-path>
 *
 * @memberof module:clb-ui-storage.clbFileBrowser
 * @param  {object} clbStorage Angular DI
 * @return {object} Angular Directive
 */
function clbFileBrowserPath(clbStorage) {
  return {
    restrict: 'E',
    require: '^clbFileBrowser',
    templateUrl: 'file-browser-path.directive.html',
    link: function(scope, element, attrs, ctrl) {
      var handleAncestors = function(ancestors) {
        scope.ancestors = ancestors;
      };

      var update = function() {
        if (ctrl.currentEntity) {
          clbStorage.getAncestors(ctrl.currentEntity, ctrl.rootEntity)
          .then(handleAncestors, ctrl.setError);
        } else {
          handleAncestors(null);
        }
      };

      scope.browserView = ctrl;

      scope.$watch('browserView.currentEntity', function(value) {
        update(value);
      });
    }
  };
}
