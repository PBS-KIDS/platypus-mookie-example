/**
# COMPONENT **camera-follow-me**
This component can request that the camera focus on this entity.

## Dependencies:
- [[Camera]] (on entity's parent) - This component sends a request to have the camera follow this component's entity.

### Listens for:
- **follow-me** - On receiving this message, the component will trigger a message requesting that the parent camera begin following this entity.

### Parent Broadcasts:
- **follow** - This component fires this message so the camera will begin following this entity.
  > @param message.mode (string) - Sends camera following mode according to this component's settings.
  > @param message.entity ([[Entity]]) - sends this.owner: the entity that the camera should commence following.
  > @param message.top (number) - The top of a bounding box according to this component's settings.
  > @param message.left (number) - The left of a bounding box according to this component's settings.
  > @param message.width (number) - The width of a bounding box according to this component's settings.
  > @param message.height (number) - The height of a bounding box according to this component's settings.
  > @param message.offsetX (number) - How far to offset the camera from the entity horizontally according to this component's settings.
  > @param message.offsetY (number) - How far to offset the camera from the entity vertically according to this component's settings.
  > @param message.time: (number) - How many milliseconds to follow the entity according to this component's settings.
- **pause-logic** - This component fires this message to pause logic if required.
- **pause-render** - This component fires this message to pause rendering if required.

## JSON Definition:
    {
      "type": "camera-follow-me",
      
      "message": "exciting-event",
      // Optional. Alternative event that will also trigger "follow-me"
      
      "pause": true,
      // Optional. Whether to pause the game while the camera is focused. Defaults to false. 
      
      "time": 500,
      // Optional. Time in milliseconds that the camera should focus before returning to the original focus.
      
      "mode": "forward",
      // Optional. Camera mode that the camera should use.
      
      "top": 100,
      // Optional number specifying top of viewport in world coordinates
      
      "left": 100,
      // Optional number specifying left of viewport in world coordinates
      
      "width": 100,
      // Optional number specifying width of viewport in world coordinates
      
      "height": 100,
      // Optional number specifying height of viewport in world coordinates
      
      "offsetX": 20,
      // Optional number setting how far to offset the camera from the entity horizontally.
      
      "offsetY": 40
      // Optional number setting how far to offset the camera from the entity vertically.
    }

*/
platformer.components['camera-follow-me'] = (function(){
	var component = function(owner, definition){
		this.owner = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['follow-me']);
		
		if(definition.message){
			this.addListener(definition.message);
			this[definition.message] = this['follow-me'];
		}
		
		this.pauseGame = definition.pause?{
			time: definition.time
		}:null;
		
		this.followMeMessage = {
			mode: this.owner.cameraMode || definition.mode || 'bounding',
			entity: this.owner,
			top: definition.top || undefined,
			left: definition.left || undefined,
			offsetX: definition.offsetX || undefined,
			offsetY: definition.offsetY || undefined,
			width: definition.width || undefined,
			height: definition.height || undefined,
			time: definition.time || 0
		};
	};
	var proto = component.prototype;
	
	proto['follow-me'] = function(){
		if(this.pauseGame){
			this.owner.parent.trigger('pause-logic',  this.pauseGame);
			this.owner.parent.trigger('pause-render', this.pauseGame);
		}
		this.owner.parent.trigger('follow', this.followMeMessage);
	};
	
	// This function should never be called by the component itself. Call this.owner.removeComponent(this) instead.
	proto.destroy = function(){
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
