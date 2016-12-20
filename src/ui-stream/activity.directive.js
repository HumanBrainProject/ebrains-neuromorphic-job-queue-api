angular.module('clb-ui-stream')
.directive('clbActivity', clbActivity);

/**
 * @name clbActivity
 * @desc
 * ``clb-activity`` directive is displays an activity retrieved by
 * the HBP Stream service in a common way.
 *
 * It try to look up for a detailled description of the event and fallback
 * to the summary if he cannot.
 *
 * @memberof module:clb-ui-stream
 * @return {object} the directive
 */
function clbActivity() {
  return {
    restrict: 'A',
    scope: {
      activity: '=clbActivity'
    },
    controller: ActivityController,
    controllerAs: 'vm',
    bindToController: true,
    templateUrl: 'activity.directive.html',
    link: {
      post: function(scope, elt, attr, ctrl) {
        elt.addClass('clb-activity').addClass(ctrl.verbClass);
        scope.$watch('vm.activity.verb', function(newVal) {
          if (newVal) {
            elt.addClass('clb-activity-' + newVal.toLowerCase());
          }
        });
      }
    }
  };
}

/**
 * ViewModel of an activity used to render the clb-activity directive
 * @param {object} $scope    DI
 * @param {object} $sce      DI
 * @param {object} $log      DI
 * @param {object} $window   DI
 * @param {object} $q        DI
 * @param {object} $compile  DI
 * @param {object} clbResourceLocator DI
 * @param {object} clbErrorDialog DI
 */
function ActivityController(
  $scope,
  $sce,
  $log,
  $window,
  $q,
  $compile,
  clbResourceLocator,
  clbErrorDialog
) {
  var vm = this;
  vm.navigate = function(event, data) {
    event.preventDefault();
    event.stopPropagation();
    if (!angular.isDefined(data)) {
      $scope.$emit('clbActivity.interaction', {
        action: 'usePrimaryNavigation',
        tag: 'object'
      });
      $window.location = vm.primaryLink;
    } else if (data.ref && data.ref.type && data.ref.id) {
      $scope.$emit('clbActivity.interaction', {
        action: 'useSecondaryNavigation',
        tag: data.tag
      });
      clbResourceLocator.urlFor(data.ref, vm.activity)
      .then(function(url) {
        $window.location = url;
      })
      .catch(function(err) {
        $scope.$emit('clbActivity.interaction', {
          action: 'secondaryNavigationFailed',
          tag: data.tag
        });
        clbErrorDialog.open({
          type: 'Not Found',
          message: 'The system cannot generate a valid URL ' +
                   'to display this object.',
          code: 400,
          data: {
            error: err
          }
        });
      });
    } else {
      $scope.$emit('clbActivity.interaction', {
        action: 'openUserDetails',
        tag: 'actor'
      });
    }
  };

  vm.resolveUrl = function(data) {
    clbResourceLocator.urlFor(data.ref, vm.activity)
    .then(function(url) {
      data.url = url;
    });
  };

  activate();

  /* ------------- */

  /**
   * Replace references in the summary with proper names and links.
   *
   * This is a naive implementation. using an array of string that is
   * concatenated at the end. The advantage is that I don't have to
   * sort the references before processing them so the code is a bit
   * easier to read.
   * @private
   * @return {object} the list of parts as object with keys `tag`, `text` and `ref`.
   */
  function resolveReferences() {
    // Using a linked list to segment the text.
    var root = {
      // root only has a next property
      next: {
        // The node data
        data: {
          tag: null,
          ref: null
        },
        indices: [0, vm.activity.summary.length],
        next: null
      }
    };

    // flatten the list of references
    if (vm.activity.references) {
      for (var tag in vm.activity.references) {
        if (Object.prototype.hasOwnProperty.call(
            vm.activity.references, tag)) {
          var refs = vm.activity.references[tag];
          if (!angular.isArray(refs)) {
            refs = [refs];
          }
          for (var i = 0; i < refs.length; i++) {
            var ref = refs[i];
            processRef(root, tag, ref.indices);
          }
        }
      }
    }

    var head = root.next;
    var parts = [];
    while (head) {
      head.data.text = String.prototype.substring.apply(
        vm.activity.summary, head.indices);
      // disable object link for 'delete' verb
      if (vm.activity.verb === 'DELETE' &&
          head.data.tag === 'object') {
        head.data.tag = null;
      }
      parts.push(head.data);
      head = head.next;
    }
    return parts;
  }

  /**
   * Used by resolveReferences.
   * @private
   * @param  {object} root         The linked list root
   * @param  {string} tag          position in the sentence (actor|object|context)
   * @param  {array}  indices      [startIndex, endIndex]
   */
  function processRef(root, tag, indices) {
    // previous -> head -> next

    var previous = root;
    var head = root.next;
    // Find the last node which has an end index greater
    // than the node to insert. We do not handle the case
    // where the new node is crossing multiple existing nodes as this would
    // be invalid data.
    while (head.next && (
      indices[0] >= head.indices[1] // cannot be inverted
                                    // the head indices[1] is +1 after the
                                    // last char
    )) {
      previous = head;
      head = head.next;
    }

    // previous -> node|head -> next
    var node = {
      next: null,
      indices: indices,
      data: {
        tag: tag,
        ref: vm.activity[tag]
      }
    };

    if (head.indices[0] < indices[0]) {
      // previous -> head:before -> node
      // head -> next
      var before = angular.copy(head);
      before.indices[1] = indices[0]; // stop where the new part begin
      before.next = node;
      previous.next = before;
      previous = before;
    } else if (previous) {
      // previous -> node
      // head -> next
      previous.next = node;
    }

    // previous -> node
    // head -> next
    if (head.indices[1] > indices[1]) {
      // previous -> node -> head -> next
      head.indices[0] = indices[1];
      node.next = head;
    } else {
      // previous -> node -> next
      node.next = head.next;
    }
  }

  /**
   * init controller
   */
  function activate() {
    clbResourceLocator.urlFor(vm.activity.object, vm.activity)
    .then(function(url) {
      vm.primaryLink = url;
    })
    .catch(function(err) {
      $log.warn('unclickable activity', err);
    });

    vm.parts = resolveReferences();
  }
}
