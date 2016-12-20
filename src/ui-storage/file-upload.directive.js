/**
 * @namespace clbFileUpload
 * @desc
 * clbFileUpload directive.
 *
 * Provide an upload widget where user can stack files that should be
 * uploaded at some point. The directive doesn't proceed to upload by itself
 * but rather triggers the onDrop callback.
 *
 * The directive accepts the following attributes:
 *
 * - on-drop: a function to call when one or more files are dropped or selected
 *   the callback will receive an array of File instance.
 * - on-error: a function to call when an error occurs. It receives an HbpError
 *   instance in parameter.
 *
 * @example
 * <clb-file-upload on-drop="handleFileUpload(files)"
 *                       on-error="handleError(error)">
 * </clb-file-upload>
 * @memberof module:clb-ui-storage
 */
angular.module('clb-ui-storage')
.directive('clbFileUpload', function() {
  'use strict';
  return {
    templateUrl: 'file-upload.directive.html',
    restrict: 'E',
    scope: {
      onDrop: '&',
      onError: '&',
      foldersAllowed: '='
    },
    link: function(scope, element) {
      var processDragOver = function(event) {
        event.preventDefault();
        event.stopPropagation();
      };

      var processDragEnter = function(event) {
        event.preventDefault();
        event.stopPropagation();

        scope.dragEntered = true;
        scope.$apply();
      };

      var processDragLeave = function(event) {
        event.preventDefault();
        event.stopPropagation();

        scope.dragEntered = false;
        scope.$apply();
      };

      scope.processDrop = function(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!event.dataTransfer && event.originalEvent) {
          event.dataTransfer = event.originalEvent.dataTransfer;
        }

        scope.dragEntered = false;

        if (!scope.foldersAllowed) {
          var folders = getFolders(event.dataTransfer);
          if (folders.length > 0) {
            var err = new Error('Folders not allowed');
            err.name = 'foldersNotAllowed';
            err.files = folders;
            scope.onError({error: err});
            return false;
          }
        }

        scope.onDrop({files: event.dataTransfer.files});
      };

      /**
       * return the list of folders in the input dataTransfer object
       * @private
       * @param {DataTransfer} dataTransfer contains folder and files
       * @return {array/File}               contain only folders
       */
      function getFolders(dataTransfer) {
        var retList = [];

        // supported by chrome only
        var items = dataTransfer.items;
        if (items) {
          for (var i = 0; i < items.length; i++) {
            if (items[i].webkitGetAsEntry().isDirectory) {
              retList.push(items[i].webkitGetAsEntry().name);
            }
          }
        } else {
          // check if unix folders
          var files = dataTransfer.files;
          for (var j = 0; j < files.length; j++) {
            // assuming that the chances a (dropped) file is exactly multiple of 4k are low
            if (files[j].size % 4096 === 0) {
              retList.push(files[j].name);
            }
          }
        }

        // Safari is detecting the error when trying to upload it

        // not covered case: FF on OSX

        return retList;
      }

      scope.onFileChanged = function(files) {
        scope.onDrop({files: files});
      };

      // enter
      element.on('dragover', processDragOver);
      element.on('dragenter', processDragEnter);
      // exit
      element.on('dragleave', processDragLeave);

      element.on('drop', scope.processDrop);
    }
  };
});
