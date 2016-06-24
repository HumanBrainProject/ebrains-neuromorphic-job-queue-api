angular.module('clb-ui-storage')
.directive('clbFileBrowserFolder', clbFileBrowserFolder);

/**
 * @namespace clbFileBrowserFolder
 * @desc
 * clbFileBrowserFolder directive is a child directive of
 * clbFileBrowser that render a folder item within the file browser view.
 *
 * Available attributes:
 *
 * - clb-ui-storage-folder: the folder entity
 * - [clb-ui-storage-folder-icon]: a class name to display an icon
 * - [clb-ui-storage-folder-label]: a label name (default to folder._name)
 *
 * @example
 * <!-- minimal -->
 * <div clb-ui-storage-folder="folderEntity"></div>
 * <!-- all wings out -->
 * <div clb-ui-storage-folder="folderEntity"
 *      clb-ui-storage-folder-icon="fa fa-level-up"
 *      clb-ui-storage-label="up"></div>
 *
 * @memberof module:clb-ui-storage.clbFileBrowser
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
