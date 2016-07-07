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
        scope.$watch('vm.primaryLink', function(val) {
          if (val) {
            elt.addClass('clb-activity-activable');
          } else {
            elt.removeClass('clb-activity-activable');
          }
        });
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
 * @param {object} $location DI
 * @param {object} $q        DI
 * @param {object} $compile  DI
 * @param {object} clbResourceLocator DI
 * @param {object} clbErrorDialog DI
 */
function ActivityController(
  $scope,
  $sce,
  $log,
  $location,
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
      $location.url(vm.primaryLink);
    } else if (data.ref && data.ref.type && data.ref.id) {
      $scope.$emit('clbActivity.interaction', {
        action: 'useSecondaryNavigation',
        tag: data.tag
      });
      clbResourceLocator.urlFor(data.ref)
      .then(function(url) {
        $location.url(url);
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
    var previous = root;
    var head = root.next;
    while (indices[0] < head.indices[0]) {
      previous = head;
      head = root.next;
    }

    var node = {
      next: null,
      indices: indices,
      data: {
        tag: tag,
        ref: vm.activity[tag]
      }
    };

    if (head.indices[0] < indices[0]) {
      var before = angular.copy(head);
      before.indices[1] = indices[0]; // stop where the new part begin
      before.next = node;
      if (previous) {
        previous.next = before;
      }
    } else if (previous) {
      previous.next = node;
    }

    if (head.indices[1] > indices[1]) {
      head.indices[0] = indices[1];
      node.next = head;
    } else {
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
