angular.module('clb-collab')
.factory('ClbCollabModel', function() {
  /**
   * Representation of a Collab.
   * @memberof module:clb-collab
   * @param {object} [attributes] initial values
   */
  function ClbCollabModel(attributes) {
    if (!attributes) {
      attributes = {};
    }
    this.id = attributes.id;
    this.created = attributes.created || null;
    this.edited = attributes.edited || null;
    this.title = attributes.title || '';
    this.content = attributes.content || '';
    this.private = attributes.private || false;
    this.deleted = attributes.deleted || null;
  }
  ClbCollabModel.prototype = {
    toJson: function() {
      return {
        id: this.id,
        title: this.title,
        content: this.content,
        private: this.private
      };
    },
    update: function(attrs) {
      angular.forEach(['id', 'title', 'content', 'private'], function(a) {
        if (attrs[a] !== undefined) {
          this[a] = attrs[a];
        }
      }, this);
    }
  };
  ClbCollabModel.fromJson = function(json) {
    if (json.toJson) {
      return json;
    }
    var c = new ClbCollabModel(json);
    return c;
  };
  return ClbCollabModel;
});
