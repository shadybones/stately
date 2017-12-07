/*
Stately is for state handling. It's a central repository of the current state of various parts of an application,
meant to be shared across modules/controls. It is not meant as a data storage container, though data can be passed
on the currently dispatching event, just like the normal Event model. Though it can handle single state changes,
which would be equivalent to normal Even Listeners / Broadcasters, it's really meant to handle the more complicated
scenario of synchronizing many states across an application.

Example uses would be:
 - a "loader" div which displays above your application whenever an AJAX call is made from the page.
 - ModuleA is loading AssetA. ModuleB is loading AssetB. And ModuleC needs to know when both assets are loaded.

There are of course ways to do this without using Stately, simply have all the parts talk to each other. But in that
case, all the parts are dependent on each other. Using Stately, each module can stay independent. Also, using the data
passing ability, you can very easily integrate unit/feature testing, as all you'd need to test the application is one
Stately specifically configured for the purpose.

Using the _history internal Array, it's also very easy to tell where things went wrong with your application.
The History keeps track of all Stately method calls, and by enabling debug mode, you can easy follow the output in the
browser console.


Similar to normal Event model:
    - Listen for single 'events'/state:
        S.on("event", function(data){ console.log("hello", data); });
    - Dispatch single 'event'/state (with data):
        S.turnOn("event", data);

Dissimilar to normal Event model:
    - Repeated 'events' do not re-trigger callbacks:
        S.turnOn("event"); S.turnOn("event"); // only calls callback once
    - 'Events'/States can be turned on AND off
        S.turnOff("event", data);
    - You can listen for an OFF state/"event":
        S.on("!event1", callback);
    - Can listen for multiple 'events'/states (wait for all states to be triggered)
        S.on("event1 event2 event3", callback);
        S.turnOn("event1") //does not trigger callback
        S.turnOn("event1 event2").turnOn("event3") //triggers callback

I use the term "event" to keep things similar to what you already know, but "events" are really States.
A state can be unset, on, and off.
Unset states, or ones which haven't been passed into the Stately turnOn or turnOff methods,
are ignored and will not trigger any callbacks which require them, since they are neither on nor off.

Most Stately methods are chain-able.


S.when(Promise).turnOff("state").turnOn("sdf").turnOff("sdfs");
S.turnOff("state").turnOn("stte", {data});
S.on("!state", listner, doNowIfMatches);
S.off("!state", listner);
S.once("!state", listner, doNowIfMatches).turnOff("state")
S.isOn("")
???S.turnOff(S.getOn()) == turn off all;

*/

Array.prototype.peek || (Array.prototype.peek = function(n){
    return this[this.length - (n|0) - 1];
});
Stately = (function createStately() {
    var _cache = null,
        _wcache = null,
        /** @type {WeakMap|{get:Function,set:Function,has:Function,delete:Function}} */
        _weakmap = null,
        _history = null;

    /** @typedef {Object} */ var Map;
    /** @typedef {String} */ var StatelyId;
    /** @typedef {String} */ var Statename;
    /**
     * Single Statename or a space-separated list of Statenames
     * @typedef {String|Statename} */ var StatenameList;

    /**@typedef {{switch:String, states:Array<Statename>, currentState:StatenameList, data:Object<Statename,Object>}} */ var StateCallbackObject;
    /**@typedef {{data:Object,isOn:boolean}} */ var StateInfoObject;

    /** @typedef {{callback:Function, id:String, doOnce:boolean, currentStateMatches:Boolean, statenameList:StatenameList, onStates:Array<Statename>, offStates:Array<Statename>, doOnce:Boolean}} */ var ListenerObject;
    /**
     * state data : data passed into the state via the last call to turnOn or turnOff
     * listener data: listenerMap< statname, maps to all listeners which contained that statename> - use this when state change
     *
     * @typedef {{id:String,state:Object<Statename,StateInfoObject>,listenerMap:Object<Statename,Array<ListenerObject>>,currentState:StatenameList}}*/ var StatelyInternalData;

    /**
     * @tested
     * If used as a function, is a getter with the ID as the key
     * If used as a contructor, then creates a new Stately with the optional given ID
     * @param id {StatelyId=}
     * @param useWeakIfAvailable {boolean=}
     * @returns {Stately}
     * @constructor
     */
    function Stately(id, useWeakIfAvailable) {
        if (id && (_cache[id] || _wcache[id])){
            _history.push("got stately id "+id);
            return _cache[id] || _weakmap.get(_wcache[id]);
        }

        if(!(this instanceof Stately)) return null;

        this.id = id || (id = "sl" + Math.random().toString().substr(2, 10));
        this.useWeakMap = _weakmap && useWeakIfAvailable;

        /** @type {StatelyInternalData} */
        this._data = {id:id,state:{},listenerMap:{}};

        addToCache(this, id, useWeakIfAvailable);
    }

    /**
     * @tested
     */
    Stately.reset = function (){
        //clear the old objects
        if(_cache)
            for(var keys = Object.keys(_cache), i = keys.length; i-->0;){
                var x = keys[i];
                _cache[x] && _cache[x].reset && _cache[x].reset();
                _cache[x] = undefined;
            }
        if(_weakmap){
            for(keys = Object.keys(_wcache), i = keys.length; i-->0;){
                x = keys[i];
                var key = _wcache[x];
                _weakmap.has(key) && _weakmap.get(key).reset && _weakmap.get(key).reset();
                _weakmap.delete(key);
                _wcache[x] = undefined;
            }
        }
        _history && (_history.length = 0);

        //create new objects for good measure
        _cache = {};
        _wcache = {};
        _weakmap = typeof WeakMap == "undefined" ? null : new WeakMap();
        _history = [];
        _history.push = function(){
            if(Stately.debug){
                window.console.log("Stately Info:",arguments);
            }
            Array.prototype.push.apply(this,arguments);
        };
        _history.push("reset stately");
    };
    Stately.reset();
    /**
     * @tested
     * @param me {Object}
     * @returns {Stately}
     */
    Stately.wrap = function (me) {
        if(!(me instanceof Object)) throw "Invalid Arg. Argument must be an object";

        var oldProto = Object.getPrototypeOf(me);
        me.__proto__ = applyMethods(Object.create(oldProto));
        me.__proto__._data = {};
        me.__proto__.constructor = Stately;
        _history.push("wrapped object " + me.toString());
        return me;
    };
    Stately.__test__ = function(){return {
        addToCache : addToCache,
        applyMethods : applyMethods,
        processStateChange : processStateChange,
        doesCurrentStateMatch : doesCurrentStateMatch,
        dispatch : dispatch,
        _history : _history,
        _cache : _cache,
        _wcache : _wcache,
        _weakmap : _weakmap
    }};
    Stately.prototype.on = statelyOn;
    Stately.prototype.off = statelyOff;
    Stately.prototype.once = statelyOnce;
    Stately.prototype.turnOn = statelyTurnOn;
    Stately.prototype.turnOff = statelyTurnOff;
    Stately.prototype.when = statelyWhen;
    Stately.prototype.data = statelyData;
    Stately.prototype.reset = statelyReset;
    Stately.prototype.isOn = statelyIsOn;
    Stately.debug = false;
    return Stately;

    /**
     * //@tested
     * TODO test doNow and doOnce
     * @param stateStringList {(StatenameList | Array<Statename>)}
     * @param callback {function(data:Object?)}
     * @param doNowIfMatches {Boolean} call this listener immediately if the state matches at this time
     * @param doOnce {boolean} only call this once, then de-register it.
     * @returns {Stately}
     */
    function statelyOn(stateStringList, callback, doNowIfMatches, doOnce){
        if(!stateStringList || !callback || !(callback instanceof Function) || !stateStringList.length || !(stateStringList.charAt||stateStringList.push))
            throw Error ("Illegal argument. Stately 'on' must contain two valid arguments");
        if(stateStringList.charAt){
            stateStringList = stateStringList.trim().split(" ");
        }
        stateStringList.sort();

        /** @type {StatelyInternalData} */
        var data = this._data;
        /** @type {ListenerObject} */
        var listenerObject = {
            id : "id"+(Math.random() * 9007199254740990),
            callback: callback,
            offStates : [],
            onStates : [],
            doOnce : doOnce,
            statenameList : stateStringList.join(" ")
        };

        for(var t,i = stateStringList.length; i-->0;){
            t = stateStringList[i];
            if(!t) continue;
            if(t.charAt(0) == "!"){
                t = t.substring(1);
                listenerObject.offStates.push(t);
            }else{
                listenerObject.onStates.push(t);
            }
            if(!data.listenerMap[t]){
                data.listenerMap[t] = [];
            }
            data.listenerMap[t].push(listenerObject);
        }

        _history.push("add "+(doOnce?"once":"on")+" callback for state " + stateStringList + " on "+this.id);

        if( doNowIfMatches && doesCurrentStateMatch(data.state, listenerObject)){
            dispatch(listenerObject, data , {switch:"init", states:[]});
        }
        return this;
    }
    /**
     * @tested
     * @param stateStringList {(StatenameList | Array<Statename>)}
     * @param callback {function(data:Object?)}
     * @returns {Stately}
     * @this {Stately}
     */
    function statelyOff(stateStringList, callback){
        if(!stateStringList || !callback || !(callback instanceof Function) || !stateStringList.length || !(stateStringList.charAt||stateStringList.push))
            throw Error ("Illegal argument. Stately 'off' must contain two valid arguments");
        if(stateStringList.charAt) {
            stateStringList = stateStringList.split(" ");
        }
        stateStringList = stateStringList.sort();
        var stateNameList = stateStringList.join(" ");
        /** @type {StatelyInternalData} */
        var data = this._data,
            count = 0;
        for(var list,t,i = stateStringList.length; i-->0;){
            t = stateStringList[i];
            if(!t) continue;
            if(t.charAt(0) == "!"){
                t = t.substring(1);
            }
            /** @type {Array<ListenerObject>} */
            list = data.listenerMap[t];
            if(list){
                for(var j = list.length; j-->0;){
                    if(list[j].callback == callback && list[j].statenameList == stateNameList){
                        list.splice(j,1);
                        count++;
                    }
                }
            }
        }
        if(count==0){
            _history.push("failed to remove callback for state " + stateStringList + " on "+this.id);
        }else if (count == stateStringList.length){
            _history.push("removed callback for state " + stateStringList + " on "+this.id);
        }else{
            _history.push("removed callbacks for "+count+" of "+stateStringList.length+" states in " + stateStringList + " on "+this.id);
        }

        return this;
    }
    /**
     * Shortcut
     * @param stateStringList {(StatenameList | Array<Statename>)}
     * @param callback {function(data:Object?)}
     * @param doNowIfMatches {Boolean} call this listener immediately if the state matches at this time
     * @returns {Stately}
     */
    function statelyOnce(stateStringList, callback, doNowIfMatches){
        return this.on(stateStringList,callback,doNowIfMatches,true);
    }

    /**
     * @tested
     * @param stateList {(StatenameList|Array<Statename>)}
     * @param stateData {Object=}
     */
    function statelyTurnOn(stateList, stateData){
        if(!stateList || !stateList.length) return this;
        if(!(this instanceof Stately)) throw new Error("Invalid Argument - this must be a Stately object");

        //If this is a wrapped Stately (it's been when-ed)
        if(this._promise){
            //Get the wrapped Stately object
            var me = Object.getPrototypeOf(this);
            this._promise.then(function(){
                //Just in case something's gone wrong (a Stately object should not have _promise on it), to prevent a loop
                if(me._promise) me._promise = null;
                statelyTurnOn.call(me, stateList, stateData);
            });
            _history.push("added turn on state "+stateList+" to promise for " + this.id);
        }else {
            var states = Array.isArray(stateList)?stateList:stateList.trim().split(" ");
            processStateChange(true, this, states, stateData);
        }
        return this;
    }
    /**
     * @tested
     * @param stateList {(StatenameList|Array<Statename>)}
     * @param stateData {Object=}
     */
    function statelyTurnOff(stateList, stateData){
        if(!stateList || !stateList.length) return this;

        //If this is a wrapped Stately (it's been when-ed)
        if(this._promise){
            //Get the wrapped Stately object
            var me = Object.getPrototypeOf(this);
            this._promise.then(function(){
                //Just in case something's gone wrong (a Stately object should not have _promise on it), to prevent a loop
                if(me._promise) me._promise = null;
                statelyTurnOff.call(me,stateList,stateData);
            });
            _history.push("added turn off state "+stateList+" to promise for " + this.id);
        }else{
            var states = Array.isArray(stateList)?stateList:stateList.trim().split(" ");
            processStateChange(false, this, states, stateData);
        }
        return this;
    }

    /**
     * @tested
     *
     * Gets all listeners on any of the affected states (making sure no duplicates),
     * find those who were previously not matched with the Stately state, and dispatch them.
     * Updates the state data of all the affected states
     * Updates the Stately current state
     *
     * @param turnOn {boolean} true of you're turning these states on, else off
     * @param S {Stately}
     * @param stateNames {Array<Statename>}
     * @param stateData {Object=}
     * @private
     */
    function processStateChange(turnOn, S, stateNames, stateData){
        if(!S || !stateNames || !stateNames.length || !Array.isArray(stateNames) || !S._data)
            throw new Error("Invalid Arguments. The Stately or the statenames do no exist or are not of the correct type.");

        var affectedListenersKeys = {};
        /** @type {Array<ListenerObject>} **/
        var affectedListeners = [];
        /** @type {Array<ListenerObject>} **/
        var dispatchedListeners = [];
        /** @type {Array<ListenerObject>} **/
        var c;
        /** @type {ListenerObject} **/
        var listener;
        /** @type {Number} */
        var i;
        var data = S._data;

        for(i = stateNames.length; i-->0;){
            _history.push("processed state " + stateNames[i] + (turnOn?" on ":" off ") + data.id);

            //if already on/off for this state, continue
            if( !stateNames[i]
                || data.state[stateNames[i]] && turnOn == data.state[stateNames[i]].isOn
            ) continue;

            c = data.listenerMap[stateNames[i]];
            if(c && c.length){
                for(var j = c.length; j-->0;){
                    if(c[j] && !affectedListenersKeys[c[j].id]){
                        affectedListenersKeys[c[j].id] = 1;
                        affectedListeners.push(c[j]);
                    }
                }
            }

            //change the state info
            if(!data.state[stateNames[i]]){
                data.state[stateNames[i]] = {};
            }
            data.state[stateNames[i]].isOn = turnOn;
            //TODO use weakMap if S.useweakMap
            stateData !== undefined && (data.state[stateNames[i]].data = stateData);
        }

        data.currentState = Object.keys(data.state).map(function(statename){
            return data.state[statename].isOn ? statename : ("!"+statename);
        }).sort().join(" ");
        //At this point, all affectedListeners really are affected. But since we don't trigger listeners after their
        //first match, we only call listeners which don't match the current state but do match the upcoming
        for(i = affectedListeners.length; i-->0;){
            listener = affectedListeners[i];
            var doesMatch = doesCurrentStateMatch(data.state, listener);
            //If it's not previously a match, but now it is
            //this is what we're looking for. trigger.
            if(!listener.currentStateMatches && doesMatch){
                dispatch(listener, S, {switch:turnOn?"on":"off", states:stateNames.concat([])});
                dispatchedListeners.push(listener);
            }
            listener.currentStateMatches = doesMatch;
        }

        return {
            affected: affectedListeners,
            dispatched : dispatchedListeners
        }
    }

    /**
     * @tested
     * if all off states are off, and all on states are on, then the listener matches.
     * @param state {Object<Statename,StateInfoObject>}
     * @param listener {ListenerObject}
     * @returns {boolean} Returns true if the listener's state list is a match with the current Stately.state (if the callback should be called)
     */
    function doesCurrentStateMatch(state, listener){
        if(!state || !listener || !listener.offStates || !listener.onStates)
            throw new Error("Invalid Arguments. Required arguments are either missing or of the incorrect type.");

        if(listener._debug !== undefined) return listener._debug;

        for(var i = listener.offStates.length; i-->0;){
            if(!state[listener.offStates[i]] || state[listener.offStates[i]].isOn) return false;
        }
        for(i = listener.onStates.length; i-->0;){
            if(!state[listener.onStates[i]] || !state[listener.onStates[i]].isOn) return false;
        }

        return true;
    }

    /**
     * Accumulates the data of states listened for in this listener
     * calls the callback with that data
     * removes listener if 'doOnce' is true
     * @tested
     * @param listener {ListenerObject}
     * @param S {Stately}
     * @param event {StateCallbackObject}
     */
    function dispatch(listener, S, event){
        if(!listener || !S || !event || !event.switch || !S.data || !listener.callback || !listener.offStates)
            throw new Error("Illegal arguments. Required arguments are missing or of the incorrect type.");

        var data = S._data;
        _history.push("dispatching event "+event.switch+" on listener "+listener.id+" for states "+listener.statenameList);
        event.currentState = data.currentState;
        event.data = {};

        // TODO use weak map for data if S.useWeakMap. Acutally, the event would get a normal reference, but we'd have to convert from weakmap to a normal reference
        var states = listener.offStates.concat(listener.onStates);
        for(var i = states.length; i-->0;){
            data.state[states[i]] && (event.data[states[i]] = data.state[states[i]].data);
        }

        listener.callback(event);
        if(listener.doOnce){
            S.off(listener.statenameList,listener.callback);
            listener.statenameList = listener.callback = listener.offStates = listener.onStates = null;
        }
    }

    /**
     * For chaining changes behind a promise
     * This returns a wrapped (this) Stately object
     * with a special property "_promise"
     *
     * @param promise {({then:Function}|{done:Function})}
     * @returns {Stately|{_promise:({then:Function}|{done:Function})}}
     * @tested
     */
    function statelyWhen(promise){
        if(!promise || (!promise.then && !promise.done)) throw "Invalid arg, must be promise-y";

        _history.push("whened "+this.id);
        var result = Object.create(this);
        result._promise = promise;
        return result;
    }

    /**
     * Just returns the data. nothing fancy. you break it you buy it.
     * @returns {StatelyInternalData}
     */
    function statelyData(){
        _history.push("got data for "+ this.id);
        return this._data;
    }
    function statelyReset(){
        _history.push("reset data for "+this.id);
        this._data = {id:this.id, state:{}, listenerMap:{}};
    }

    /**
     * @tested
     * @param stateList {(StatenameList|Array<Statename>)}
     */
    function statelyIsOn(stateList){
        if(!stateList) stateList = 1;
        if(stateList.charAt && stateList.length){
            return this.isOn(stateList.split(" "));
        }else if(Array.isArray(stateList) && stateList.length){
            for(var i = stateList.length;i-->0;){
                if(!this._data.state[stateList[i]] || !this._data.state[stateList[i]].isOn) return false;
            }
            return true;
        }
        throw new Error("Illegal Argument. State list must be a string or an Array")
    }

    /**
     * @tested
     * @param me {Object}
     * @returns {Stately}
     */
    function applyMethods(me){
        if(me instanceof Object){
            me.on = statelyOn;
            me.off = statelyOff;
            me.turnOn = statelyTurnOn;
            me.turnOff = statelyTurnOff;
            me.when = statelyWhen;
            me.once = statelyOnce;
            me.reset = statelyReset;
            me.data = statelyData;

            _history.push("applied methods to "+me.toString());
        }
        return me;
    }

    /**
     * @tested
     * @param me {Stately}
     * @param id {StatelyId}
     * @param weak {boolean}
     * @returns {number}
     */
    function addToCache(me, id, weak){
        if(!me||!id) throw "Illegal args. This and ID cannot be null";
        if(typeof id != "string") throw "Illegal args. ID must be a string";

        if (Object.getPrototypeOf(me) === Stately.prototype) {
            if (weak && _weakmap) {
                _weakmap.set(_wcache[id] = {}, me);
                _history.push("added to weak cache "+id);
                return 2;
            } else {
                _cache[id] = me;
                _history.push("added to cache "+id);
                return 1;
            }
        }
        _history.push("failed to add to cache "+id);
        return 0;
    }
})();
