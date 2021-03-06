platformer.components['logic-gem'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		var self = this;
		
		// Messages that this component listens for
		this.listeners = [];

		this.addListeners(['load', 'collect-gem', 'peer-entity-added']);
		
		this.manager = undefined;
	};
	var proto = component.prototype;
	
	
	proto['load'] = function(resp){
		this.owner.trigger('logical-state', {state: 'default'});
	};
	
	proto['peer-entity-added'] = function(entity){
		if(entity.type == 'collectible-manager')
		{
			this.manager = entity;
		}
	};
	
	proto['collect-gem'] = function(collisionInfo){
		if(this.manager)
		{
			this.manager.trigger('gem-collected');
		}
		this.owner.trigger('sound-collect-gem');
		this.owner.parent.removeEntity(this.owner);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
		this.manager = undefined;
		this.removeListeners(this.listeners);
	};
	
	/*********************************************************************************************************
	 * The stuff below here will stay the same for all components. It's BORING!
	 *********************************************************************************************************/

	proto.addListeners = function(messageIds){
		for(var message in messageIds) this.addListener(messageIds[message]);
	};

	proto.removeListeners = function(listeners){
		for(var messageId in listeners) this.removeListener(messageId, listeners[messageId]);
	};
	
	proto.addListener = function(messageId, callback){
		var self = this,
		func = callback || function(value, debug){
			self[messageId](value, debug);
		};
		this.owner.bind(messageId, func);
		this.listeners[messageId] = func;
	};

	proto.removeListener = function(boundMessageId, callback){
		this.owner.unbind(boundMessageId, callback);
	};
	
	return component;
})();
