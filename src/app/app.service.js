angular.module('clb-app')
.factory('clbApp', clbApp);

/**
 * @namespace clbApp
 * @memberof module:clb-app
 * @desc
 * An AngularJS service to interface a web application with the HBP Collaboratory.
 * This library provides a few helper to work within the Collaboratory environment.
 *
 * Usage
 * -----
 *
 * - :ref:`module-clb-app.clbApp.context` is used to set and retrieve
 *   the current context.
 * - :ref:`module-clb-app.clbApp.emit` is used to send a command
 *   to the HBP Collaboratory and wait for its answer.
 *
 * @example <caption>Retrieve the current context object</caption>
 * clbApp.context()
 * .then(function(context) {
 *   console.log(context.ctx, context.state, context.collab);
 * })
 * .catch(function(err) {
 *   // Cannot set the state
 * });
 *
 * @example <caption>Set the current state in order for a user to be able to copy-paste its current URL and reopen the same collab with your app loaded at the same place.</caption>
 * clbApp.context({state: 'lorem ipsum'})
 * .then(function(context) {
 *   console.log(context.ctx, context.state, context.collab);
 * })
 * .catch(function(err) {
 *   // Cannot set the state
 * });
 *
 * @param  {object} $log AngularJS service injection
 * @param  {object} $q AngularJS service injection
 * @param  {object} $rootScope AngularJS service injection
 * @param  {object} $timeout AngularJS service injection
 * @param  {object} $window AngularJS service injection
 * @param  {object} clbError AngularJS service injection
 * @return {object}         the service singleton
 */
function clbApp(
  $log,
  $q,
  $rootScope,
  $timeout,
  $window,
  clbError
) {
  var eventId = 0;
  var sentMessages = {};

  /**
   * Singleton class
   */
  function AppToolkit() { }
  AppToolkit.prototype = {
    emit: emit,
    context: context,
    open: open
  };

  $window.addEventListener('message', function(event) {
    $rootScope.$emit('message', event.data);
  });

  $rootScope.$on('message', function(event, message) {
    if (!message || !message.origin || !sentMessages[message.origin]) {
      return;
    }
    if (message.eventName === 'resolved') {
      sentMessages[message.origin].resolve(message.data);
    } else if (message.eventName === 'error') {
      sentMessages[message.origin].reject(clbError.error(message.data));
    }
    sentMessages[message.origin] = null;
  });

  /**
   * Send a message to the HBP Collaboratory.
   * @memberof module:clb-app.clbApp
   * @param  {string} name name of the event to be propagated
   * @param  {object} data corresponding data to be sent alongside the event
   * @return  {Promise} resolve with the message response
   */
  function emit(name, data) {
    eventId++;
    sentMessages[eventId] = $q.defer();
    var promise = sentMessages[eventId].promise;
    $window.parent.postMessage({
      apiVersion: 1,
      eventName: name,
      data: data,
      ticket: eventId
    }, '*');
    return promise;
  }

  var currentContext;

  /**
   * @typedef HbpCollaboratoryContext
   * @memberof module:clb-app.clbApp
   * @type {object}
   * @property {string} mode - the current mode, either 'run' or 'edit'
   * @property {string} ctx - the UUID of the current context
   * @property {string} state - an application defined state string
   */

   /**
    * @memberof module:clb-app.clbApp
    * @desc
    * Asynchronously retrieve the current HBP Collaboratory Context, including
    * the mode, the ctx UUID and the application state if any.
    * @function context
    * @param {object} data new values to send to HBP Collaboratory frontend
    * @return {Promise} resolve to the context
    * @static
    */
  function context(data) {
    var d = $q.defer();
    var kill = $timeout(function() {
      d.reject(clbError.error({
        type: 'TimeoutException',
        message: 'No context can be retrieved'
      }));
    }, 250);

    if (data) {
      // discard context if new data should be set.
      currentContext = null;
    }

    if (currentContext) {
      // directly return context when cached.
      return d.resolve(currentContext);
    }
    emit('workspace.context', data)
    .then(function(context) {
      $timeout.cancel(kill);
      currentContext = context;
      d.resolve(context);
    })
    .catch(function(err) {
      d.reject(clbError.error(err));
    });
    return d.promise;
  }
  return new AppToolkit();

  /**
   * @desc
   * Open a resource described by the given ObjectReference.
   *
   * The promise will fulfill only if the navigation is possible. Otherwise,
   * an error will be returned.
   * @function open
   * @memberof module:clb-app.clbApp
   * @param {ObjectReference} ref  The object reference to navigate to
   * @return {Promise}  The promise retrieved by the call to emit
   */
  function open(ref) {
    $log.debug('Ask the frontend to navigate to:', ref);
    return emit('resourceLocator.open', {ref: ref});
  }
}
