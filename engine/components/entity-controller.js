/**
# COMPONENT **entity-controller**
This component listens for input messages triggered on the entity and updates the state of any controller inputs it is listening for. It then broadcasts messages on the entity corresponding to the input it received.

## Dependencies:
- [[Handler-Controller]] (on entity's parent) - This component listens for a controller "tick" message in order to trigger messages regarding the state of its inputs.

## Messages

### Listens for:
- **handle-controller** - On each `handle-controller` message, this component checks its list of actions and if any of their states are currently true or were true on the last call, that action message is triggered.
- **mousedown** - This message triggers a new message on the entity that includes what button on the mouse was pressed: "mouse:left-button:down", "mouse:middle-button:down", or "mouse:right-button:down".
  > @param message.event (DOM Event object) - This event object is passed along with the new message.
- **mouseup** - This message triggers a new message on the entity that includes what button on the mouse was released: "mouse:left-button:up", "mouse:middle-button:up", or "mouse:right-button:up".
  > @param message.event (DOM Event object) - This event object is passed along with the new message.
- **mousemove** - Updates mouse action states with whether the mouse is currently over the entity.
  > @param message.over (boolean) - Whether the mouse is over the input entity.
- **[Messages specified in definition]** - Listens for additional messages and on receiving them, sets the appropriate state and broadcasts the associated message on the next `handle-controller` message. These messages come in pairs and typically have the form of "keyname:up" and "keyname:down" specifying the current state of the input.
  
### Local Broadcasts:
- **mouse:mouse-left:down, mouse:mouse-left:up, mouse:mouse-middle:down, mouse:mouse-middle:up, mouse:mouse-right:down, mouse:mouse-right:up** - This component triggers the state of mouse inputs on the entity if a render component of the entity accepts mouse input (for example [[Render-Animation]]).
  > @param message (DOM Event object) - The original mouse event object is passed along with the control message.
- **[Messages specified in definition]** - Broadcasts active states using the JSON-defined message on each `handle-controller` message. Active states include `pressed` being true or `released` being true. If both of these states are false, the message is not broadcasted.
  > @param message.pressed (boolean) - Whether the current input is active.
  > @param message.released (boolean) - Whether the current input was active last tick but is no longer active.
  > @param message.triggered (boolean) - Whether the current input is active but was not active last tick.
  > @param message.over (boolean) - Whether the mouse was over the entity when pressed, released, or triggered. This value is always false for non-mouse input messages.

## JSON Definition:
    {
      "type": "entity-controller",
      
      "controlMap":{
      // Required. Use the controlMap property object to map inputs to messages that should be triggered. At least one control mapping should be included. The following are a few examples:
      
        "key:x": "run-left",
        // This causes an "x" keypress to fire "run-left" on the entity. For a full listing of key names, check out the `handler-controller` component.
        
        "button-pressed": "throw-block",
        // custom input messages can be fired on this entity from other entities, allowing for on-screen input buttons to run through the same controller channel as other inputs.
        
        "mouse:left-button"
        // The controller can also handle mouse events on the entity if the entity's render component triggers mouse events on the entity (for example, the `render-animation` component).
      }
    }
*/
platformer.components['entity-controller'] = (function(){
	var state = function(event, trigger){
	    this.event = event;
	    this.trigger = trigger;
	    this.filters = false;
		this.current = false;
		this.last    = false;
		this.state   = false;
		this.stateSummary = {
			pressed:   false,
			released:  false,
			triggered: false,
			over:      false
		};
	},
	mouseMap = ['left-button', 'middle-button', 'right-button'],
	createUpHandler = function(state){
		if(state.length){
			return function(value){
				for (var i = 0; i < state.length; i++){
					state[i].state = false;
				}
			};
		} else {
			return function(value){
				state.state = false;
			};
		}
	},
	createDownHandler = function(state){
		if(state.length){
			return function(value){
				for (var i = 0; i < state.length; i++){
					state[i].current = true;
					state[i].state   = true;
					if(value && (typeof (value.over) !== 'undefined')) state[i].over = value.over;
				}
			};
		} else {
			return function(value){
				state.current = true;
				state.state   = true;
				if(value && (typeof (value.over) !== 'undefined')) state.over = value.over;
			};
		}
	},
	addActionState = function(actionList, action, trigger, requiredState){
		var actionState = actionList[action]; // If there's already a state storage object for this action, reuse it: there are multiple keys mapped to the same action.
		if(!actionState){                                // Otherwise create a new state storage object
			actionState = actionList[action] = new state(action, trigger);
		}
		if(requiredState){
			actionState.setFilter(requiredState);
		}
		return actionState;
	},
	component = function(owner, definition){
		var i       = 0,
		j           = 0,
		k           = 0,
		key         = '',
		actionState = undefined,
		self        = this,
		trigger     = function(event, obj){
			self.owner.trigger(event, obj);
		};
		
		this.type   = 'entity-controller';
		this.owner  = owner;
		
		// Messages that this component listens for
		this.listeners = [];
		this.addListeners(['handle-controller', 'mousedown', 'mouseup', 'mousemove']);
		
		if(definition && definition.controlMap){
			this.owner.controlMap = definition.controlMap; // this is used and expected by the handler-controller to handle messages not covered by key and mouse inputs.
			this.actions  = {};
			for(key in definition.controlMap){
				if(typeof definition.controlMap[key] === 'string'){
					actionState = addActionState(this.actions, definition.controlMap[key], trigger);
				} else {
					actionState = [];
					if(definition.controlMap[key].length){
						for (i = 0; i < definition.controlMap[key].length; i++){
							actionState[i] = addActionState(this.actions, definition.controlMap[key][i], trigger);
						}
					} else {
						k = 0;
						for (j in definition.controlMap[key]){
							if(typeof definition.controlMap[key][j] === 'string'){
								actionState[k] = addActionState(this.actions, definition.controlMap[key][j], trigger, j);
								k += 1;
							} else {
								for (i = 0; i < definition.controlMap[key][j].length; i++){
									actionState[k] = addActionState(this.actions, definition.controlMap[key][j][i], trigger, j);
									k += 1;
								}
							}
						}
					}
				}
				this[key + ':up']   = createUpHandler(actionState);
				this[key + ':down'] = createDownHandler(actionState);
				this.addListener(key + ':up');
				this.addListener(key + ':down');
			}
		}
	},
	stateProto = state.prototype,
	proto      = component.prototype;
	
	stateProto.update = function(){
		var i = 0;
		
		if(this.current || this.last){
			this.stateSummary.pressed   = this.current;
			this.stateSummary.released  = !this.current && this.last;
			this.stateSummary.triggered = this.current && !this.last;
			this.stateSummary.over      = this.over;
			if(this.filters){
				for(; i < this.filters.length; i++){
					if(this.stateSummary[this.filters[i]]){
						this.trigger(this.event, this.stateSummary);
					}
				}
			} else {
				this.trigger(this.event, this.stateSummary);
			}
		}
		
		this.last    = this.current;
		this.current = this.state;
	};
	
	stateProto.setFilter = function(filter){
		if(!this.filters){
			this.filters = [filter];
		} else {
			this.filters.push(filter);
		}
		return this;
	};

	stateProto.isPressed = function(){
		return this.current;
	};
	
	stateProto.isTriggered = function(){
		return this.current && !this.last;
	};

	stateProto.isReleased = function(){
		return !this.current && this.last;
	};
	
	proto['handle-controller'] = function(){
		var action    = '';
		
		if(this.actions){
			for (action in this.actions){
				this.actions[action].update();
			}
		}
	};
	
	// The following translate CreateJS mouse and touch events into messages that this controller can handle in a systematic way
	
	proto['mousedown'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button || 0] + ':down', value.event);
	}; 
		
	proto['mouseup'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button || 0] + ':up', value.event);
	};
	
	proto['mousemove'] = function(value){
		if(this.actions['mouse:left-button'] && (this.actions['mouse:left-button'].over !== value.over))     this.actions['mouse:left-button'].over = value.over;
		if(this.actions['mouse:middle-button'] && (this.actions['mouse:middle-button'].over !== value.over)) this.actions['mouse:middle-button'].over = value.over;
		if(this.actions['mouse:right-button'] && (this.actions['mouse:right-button'].over !== value.over))   this.actions['mouse:right-button'].over = value.over;
	};
/*
	proto['mouseover'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button] + ':over', value.event);
	};

	proto['mouseout'] = function(value){
		this.owner.trigger('mouse:' + mouseMap[value.event.button] + ':out', value.event);
	};
*/
	
	
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
