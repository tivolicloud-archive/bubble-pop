(function () {
  var Bubble = function () {
    function Bubble() {}

    Bubble.prototype.preload = function (entityId) {
      this.parentId = Entities.getEntityProperties(entityId).parentID;
    };

    Bubble.prototype.clickDownOnEntity = function (entityId, event) {
      if (!event.isPrimaryButton) return;
      Messages.sendMessage(this.parentId, entityId, true);
    };

    Bubble.prototype.startFarTrigger = function (entityId) {
      Messages.sendMessage(this.parentId, entityId, true);
    };

    Bubble.prototype.startNearTrigger = function (entityId) {
      Messages.sendMessage(this.parentId, entityId, true);
    };

    return Bubble;
  }();

  return new Bubble();
});