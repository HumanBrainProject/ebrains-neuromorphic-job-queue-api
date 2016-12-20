angular.module('clb-ui-dialog')
.factory('clbConfirm', clbConfirm);

/**
 * Service to trigger modal dialog.
 *
 * @namespace clbDialog
 * @memberof module:clb-ui-dialog
 * @param  {object} $rootScope Angular DI
 * @param  {object} $uibModal     Angular DI
 * @return {object}            Service Descriptor
 */
function clbConfirm($rootScope, $uibModal) {
  return {
    open: open
  };

  /**
   * Confirmation dialog
   * @param  {object} options Parameters
   * @return {Promise}        Resolve if the confirmation happens, reject otherwise
   */
  function open(options) {
    options = angular.extend({
      scope: $rootScope,
      title: 'Confirm',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      template: 'Are you sure?',
      closable: true
    }, options);

    var modalScope = options.scope.$new();
    modalScope.title = options.title;
    modalScope.confirmLabel = options.confirmLabel;
    modalScope.cancelLabel = options.cancelLabel;
    modalScope.confirmationContent = options.template;
    modalScope.confirmationContentUrl = options.templateUrl;
    modalScope.closable = options.closable;
    modalScope.securityQuestion = options.securityQuestion;
    modalScope.securityAnswer = options.securityAnswer;

    var instance = $uibModal.open({
      templateUrl: 'confirm.tpl.html',
      show: true,
      backdrop: 'static',
      scope: modalScope,
      keyboard: options.keyboard || options.closable
    });
    return instance.result;
  }
}
