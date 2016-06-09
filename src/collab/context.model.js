angular.module('clb-collab')
.factory('ClbContextModel', function(ClbCollabModel) {
  /**
   * Representation of a Collab Context.
   * @memberof module:clb-collab
   */
  function ClbContextModel() {}
  ClbContextModel.fromJson = function(json) {
    var c = new ClbContextModel();
    c.context = json.context;
    c.appId = json.app_id;
    c.name = json.name;
    c.navId = json.id;
    c.collab = ClbCollabModel.fromJson(json.collab);
    c.toJson = function() {
      return {
        context: json.context,
        appId: json.app_id,
        name: c.name
      };
    };
    return c;
  };
  return ClbContextModel;
});
