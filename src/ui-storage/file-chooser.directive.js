angular.module('clb-ui-storage')
.directive('clbFileChooser', clbFileChooser);

/**
 * The ``clbFileChooser`` directive let you browse the storage to pick a file.
 *
 * ====================  ===========================================================
 * Name                  Description
 * ====================  ===========================================================
 * [clb-root]            Cannot go beyond this ancestor in the browser
 * [ng-model]            The ngModel to bind to the chosen value
 * [clb-validate]        a string, array of string, regex or function (can be async)
 * ====================  ===========================================================
 *
 * The directive emit the following events:
 *
 * =============================  ====================================================
 * Name                           Description
 * =============================  ====================================================
 * clbFileChooser:fileSelected    The second parameter is the EntityDescriptor
 * clbFileChooser:cancel          The second parameter is the initial EntityDescriptor
 * =============================  ====================================================
 *
 * @namespace clbFileChooser
 * @memberof module:clb-ui-storage
 * @param {object} $q   Angular DI
 * @param {object} $log Angular DI
 * @return {object} Entity Descriptor
 */
function clbFileChooser($q, $log) {
  return {
    restrict: 'E',
    require: '^ngModel',
    scope: {
      root: '=clbRoot',
      ngModel: '=',
      validate: '=?clbValidate'
    },
    templateUrl: 'file-chooser.directive.html',
    link: clbFileChooserLink
  };

  /**
   * Linking function for the directive.
   * @private
   * @param  {object} scope The scope
   */
  function clbFileChooserLink(scope) {
    /**
     * A promise that fulfill to a boolean.
     * @private
     * @param  {EntityDescriptor}  value The entity to evaluate
     * @return {Boolean}       true if the value can be chosen
     */
    function isValid(value) {
      $log.debug('check validity of', value);
      if (!value) {
        return;
      }
      if (angular.isString(scope.validate)) {
        $log.debug('string comparison', scope.validate === value._contentType);
        return scope.validate === value._contentType;
      }
      if (angular.isArray(scope.validate)) {
        return scope.validate.indexOf(value._contentType) !== -1;
      }
      if (scope.validate instanceof RegExp) {
        return value && value._contentType.match(scope.validate);
      }
      if (angular.isFunction(scope.validate)) {
        return scope.validate(value);
      }
      return true;
    }

    scope.$on('clbFileBrowser:focusChanged', function(event, value) {
      return $q.when(isValid(value)).then(function(result) {
        $log.debug('validi entity', result);
        if (result) {
          scope.currentSelection = value;
        }
        scope.canChooseCurrentEntity = result;
      });
    });

    scope.doChooseEntity = function() {
      if (scope.currentSelection) {
        scope.ngModel = scope.currentSelection;
        $log.debug('file selection changed', scope.currentSelection);
        scope.$emit('clbFileChooser:fileSelected', scope.currentSelection);
      }
    };

    scope.doCancel = function() {
      scope.ngModel = scope.initialValue;
      scope.$emit('clbFileChooser:cancelSelection', scope.initialValue);
    };

    scope.initialValue = scope.ngModel;
    scope.currentSelection = scope.ngModel;
    scope.canChooseCurrentEntity = isValid(scope.currentSelection);
  }
}
