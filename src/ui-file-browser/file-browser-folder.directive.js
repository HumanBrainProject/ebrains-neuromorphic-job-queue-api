angular.module('clb-ui-file-browser')
.directive('clbFileBrowserFolder', clbFileBrowserFolder);

/**
 * @namespace clbFileBrowserFolder
 * @desc
 * clbFileBrowserFolder directive is a child directive of
 * clbFileBrowser that render a folder item within the file browser view.
 *
 * Available attributes:
 *
 * - clb-ui-file-browser-folder: the folder entity
 * - [clb-ui-file-browser-folder-icon]: a class name to display an icon
 * - [clb-ui-file-browser-folder-label]: a label name (default to folder._name)
 *
 * @example
 * <!-- minimal -->
 * <div clb-ui-file-browser-folder="folderEntity"></div>
 * <!-- all wings out -->
 * <div clb-ui-file-browser-folder="folderEntity"
 *      clb-ui-file-browser-folder-icon="fa fa-level-up"
 *      clb-ui-file-browser-label="up"></div>
 *
 * @memberof module:clb-ui-file-browser.clbFileBrowser
 * @return {object} Angular Directive
 */
function clbFileBrowserFolder() {
  return {
    restrict: 'A',
    require: '^clbFileBrowser',
    templateUrl: 'file-browser-folder.directive.html',
    scope: {
      folder: '=clbFileBrowserFolder',
      folderIcon: '@clbFileBrowserFolderIcon',
      folderLabel: '@clbFileBrowserFolderLabel'
    },
    link: function(scope, element, attrs, ctrl) {
      // make the parent directive controller available in the scope
      scope.browserView = ctrl;
    }
  };
}
