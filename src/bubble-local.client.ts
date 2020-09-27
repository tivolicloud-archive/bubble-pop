() => {
	class Bubble implements ClientEntityScript {
		parentId: Uuid;

		preload(entityId) {
			this.parentId = Entities.getEntityProperties<
				Entities.EntityPropertiesSphere
			>(entityId).parentID;
		}

		clickDownOnEntity(entityId: Uuid, event: PointerEvent) {
			if (!event.isPrimaryButton) return;
			Messages.sendMessage(this.parentId, entityId, true);
		}

		startFarTrigger(entityId: Uuid) {
			Messages.sendMessage(this.parentId, entityId, true);
		}
	}

	return new Bubble();
};
