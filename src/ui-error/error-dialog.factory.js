angular.module('clb-ui-error')
.factory('clbErrorDialog', clbErrorDialog);

/**
 * The factory ``clbUiError`` instantiates modal error dialogs.
 * Notify the user about the given error.
 * @name clbError
 * @memberof module:clb-ui-error
 * @param  {object} $uibModal Angular DI
 * @param  {object} clbError  Angular DI
 * @return {object}           Angular Factory
 */
function clbErrorDialog($uibModal, clbError) {
  return {
    open: open
  };

  /**
   * Open an error modal dialog
   * @param  {HBPError} error The error do displays
   * @param  {object} options Any options will be passed to $uibModal.open
   * @return {Promse}         The result of $uibModal.open
   */
  function open(error, options) {
    options = angular.extend({
      templateUrl: 'error-dialog.tpl.html',
      class: 'error-dialog',
      controller: function() {
        var vm = this;
        vm.error = clbError.error(error);
      },
      controllerAs: 'vm',
      bindToController: true
    }, options);
    return $uibModal.open(options).result.catch(function() {
      // resolve anytime.
      return true;
    });
  }
}
