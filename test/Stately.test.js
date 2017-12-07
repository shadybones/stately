self.test || (self.test=[]);
assert.testing("Stately", test[window._testStately]);

var internal = Stately.__test__();

assert.testing("Stately.addToCache");
assert(internal.addToCache({},"1",false)).equals(0,"not a stately");
assert(internal._history.peek()).equals("failed to add to cache 1", "history entry 0");
assertThrows(function(){internal.addToCache(null,null,null)}, "nulls");
assertThrows(function(){internal.addToCache()}, "undefined");
assertThrows(function(){internal.addToCache(null,"1",null)}, "no stately");
assertThrows(function(){internal.addToCache({},{},null)}, "bad id");

var state = Object.create(Stately.prototype),
    hasWeak =  typeof WeakMap != "undefined";
assert(internal.addToCache(state,"1",null)).equals(1,"not weak");
assert(internal.addToCache(state,"2",true)).equals(hasWeak?2:1,"weak : "+hasWeak);
assert(internal._cache["1"] === state,"is in cache");
if(hasWeak){
    assert(internal._wcache["2"]).equals({},"is in wcache");
    assert(internal._weakmap.get(internal._wcache["2"]) === state,"is in weakmap");
} else assert(internal._cache["2"] === state,"is 2 in cache");


assert.testing("Stately.applyMethods");
assert(internal.applyMethods()).equals(undefined, "undefined");
assert(internal.applyMethods(null)).equals(null, "null");
assert(internal.applyMethods(1)).equals(1, "non object");
var temp = {};
var me = internal.applyMethods(temp);
assert(me===temp, "returns arg");
assert(me.hasOwnProperty("turnOn"),"on");
assert(me.hasOwnProperty("turnOff"),"off");
assert(me.hasOwnProperty("data"),"data");
assert(me.hasOwnProperty("once"),"once");
assert(me.hasOwnProperty("reset"),"reset");

assert.testing("Stately.wrap");
var myClass = function myClass(){};
myClass.prototype.myMethod = function(){};
var myInstance = new myClass();
myInstance.something = {};
assertThrows(function(){Stately.wrap()}, "undefined");
assertThrows(function(){Stately.wrap(null)}, "null");
assertThrows(function(){Stately.wrap(1)}, "non object");
var result = Stately.wrap(myInstance);
assert(myInstance === result, "returns same object");
assert(myInstance.hasOwnProperty("something"), "kept own property");
assert(myInstance instanceof myClass, "kept old class");
assert(myInstance.on,"has stately methods");

assert.testing("Stately.constructor");
/** @type {Stately}*/
var s1 = new Stately();
assert(s1.id,"id");
assert(Stately()).equals(null,"undefined");
assert(Stately("a")).equals(null,"no instance");
assert(Stately(s1.id) === s1, "get from cache");
s1 = new Stately("4");
assert(Stately("4") === s1, "get from cache, declared id");
assert(internal._cache["4"] === s1,"is in cache");
s1 = new Stately("3",true);
assert(Stately("3") === s1, "get from wcache, declared id");
assert(internal._wcache["3"]).equals({},"is in wcache");

assert.testing("Stately.reset");
(s1=Stately("3")).data().pie = "good";
(result=new Stately("2a")).data().pie = "bad";
(me=new Stately("1a")).data().pie = "ok";
var weak1 = internal._wcache["3"];
Stately.reset();
assert(s1.data().pie === undefined, "cleared data s1 from weakmap");
assert(result.data().pie === undefined, "cleared data result from cache");
assert(me.data().pie === undefined, "cleared data me from cache");
assert(!internal._weakmap.has(weak1), "cleared weakmap");
assert(internal._history[0]==undefined,"cleared old history");

internal = Stately.__test__();
assert(internal._cache).equals({}, "cleared cache");
assert(internal._wcache).equals({}, "cleared wcache");
assert(!internal._weakmap.has(weak1), "cleared weakmap");
assert(internal._history[0]).equals("reset stately", "has new history");


assert.testing("Stately.when");
s1 = new Stately();
assertThrows(function(){s1.when()}, "undefined");
assertThrows(function(){s1.when(1)}, "1");
assertThrows(function(){s1.when({})}, "not promise");
var p = {then:function(){}};
var rs1 = s1.when(p);
assert(rs1._promise === p, "test accepted promise 'then'");
p = {done:function(){}};
rs1 = s1.when(p);
assert(rs1._promise === p, "test accepted promise 'done'");

assert.testing("Stately.statelyTurnOff");
s1 = new Stately();
assert(s1===s1.turnOff(),"do nothing on empty");
s1.turnOff("a");
assert(internal._history.peek()).equals("processed state a off "+ s1.id,"single state");
s1.turnOff("b");
assert(internal._history.peek()).equals("processed state b off "+ s1.id,"2nd single state");
s1.turnOff("c d");
assert(internal._history.peek(1)).equals("processed state d off "+ s1.id,"2states 1 single state");
assert(internal._history.peek()).equals("processed state c off "+ s1.id,"2states 2 single state");
s1.turnOff(["e"]);
assert(internal._history.peek()).equals("processed state e off "+ s1.id,"single state array");
s1.turnOff("f g");
assert(internal._history.peek(1)).equals("processed state g off "+ s1.id,"2states array 1 single state");
assert(internal._history.peek()).equals("processed state f off "+ s1.id,"2states array 2 single state");

p.then = function(fun){
    if(fun) fun();
};
s1.when(p).turnOff("a");
assert(internal._history.peek(1)).equals("processed state a off "+ s1.id,"Whened stately promise was called");
assert(internal._history.peek()).equals("added turn off state "+"a"+" to promise for " + s1.id,"Using when-ed stately added promise");
s1.when(p).turnOff("c").turnOff("b");
assert(internal._history.peek(3)).equals("processed state c off "+ s1.id,"Whened stately promise was called + chain first");
assert(internal._history.peek(2)).equals("added turn off state "+"c"+" to promise for " + s1.id,"Using when-ed stately added promise + chain first");
assert(internal._history.peek(1)).equals("processed state b off "+ s1.id,"Whened stately promise was called + chain 2nd");
assert(internal._history.peek()).equals("added turn off state "+"b"+" to promise for " + s1.id,"Using when-ed stately added promise + chain second");


assert.testing("Stately.statelyTurnOn");
s1 = new Stately();
assert(s1===s1.turnOn(),"do nothing on empty");
s1.turnOn("a");
assert(internal._history.peek()).equals("processed state a on "+ s1.id,"single state");
s1.turnOn("b");
assert(internal._history.peek()).equals("processed state b on "+ s1.id,"2nd single state");
s1.turnOn("c d");
assert(internal._history.peek(1)).equals("processed state d on "+ s1.id,"2states 1 single state");
assert(internal._history.peek()).equals("processed state c on "+ s1.id,"2states 2 single state");
s1.turnOn(["e"]);
assert(internal._history.peek()).equals("processed state e on "+ s1.id,"single state array");
s1.turnOn("f g");
assert(internal._history.peek(1)).equals("processed state g on "+ s1.id,"2states array 1 single state");
assert(internal._history.peek()).equals("processed state f on "+ s1.id,"2states array 2 single state");

s1.when(p).turnOn("a");
assert(internal._history.peek(1)).equals("processed state a on "+ s1.id,"Whened stately promise was called");
assert(internal._history.peek()).equals("added turn on state "+"a"+" to promise for " + s1.id,"Using when-ed stately added promise");
s1.when(p).turnOn("c").turnOn("b");
assert(internal._history.peek(3)).equals("processed state c on "+ s1.id,"Whened stately promise was called + chain first");
assert(internal._history.peek(2)).equals("added turn on state "+"c"+" to promise for " + s1.id,"Using when-ed stately added promise + chain first");
assert(internal._history.peek(1)).equals("processed state b on "+ s1.id,"Whened stately promise was called + chain 2nd");
assert(internal._history.peek()).equals("added turn on state "+"b"+" to promise for " + s1.id,"Using when-ed stately added promise + chain second");



assert.testing("Stately.statelyOn");
Stately.reset();
s1 = new Stately();
var gotData = null,
    cb = function(data){ gotData = data; };
s1.on("a",cb);
assertThrows(function(){s1.on()}, "undefined");
assertThrows(function(){s1.on(null,null)}, "null");
assertThrows(function(){s1.on([],cb)}, "no entry");
assertThrows(function(){s1.on("",cb)}, "empty string");
assertThrows(function(){s1.on(2,cb)}, "not string or array");
assertThrows(function(){s1.on("a",null)}, "no cb");
assertThrows(function(){s1.on("a",/sdfsdf/)}, "cb not function");

var data = s1.data();
assert(data.listenerMap, "map exists");
assert(data.listenerMap["a"], "map entry exists");
assert(Object.keys(data.listenerMap)).equals(["a"], "map has one entry");
assert(data.listenerMap["a"].length == 1, "map has contents");
assert(data.listenerMap["a"][0].onStates, "on states exists");
assert(data.listenerMap["a"][0].onStates[0] == "a", "on states contains a");
assert(data.listenerMap["a"][0].offStates.length == 0, "no off states");
assert(data.listenerMap["a"][0].statenameList == "a", "state name list exists");
assert(data.listenerMap["a"][0].callback == cb, "callback exists");
s1.reset();
data = s1.data();
s1.on("a b", cb);
assert(data.listenerMap["a"], "map a entry exists");
assert(data.listenerMap["b"], "map b entry exists");
assert(Object.keys(data.listenerMap).length == 2 , "map has two entry");
assert(data.listenerMap["a"].length == 1, "map has a contents");
assert(data.listenerMap["b"].length == 1, "map has b contents");
assert(data.listenerMap["a"][0] == data.listenerMap["b"][0], "same listener object in both");
assert(data.listenerMap["a"][0].offStates.length == 0, "no off states");
assert(data.listenerMap["a"][0].statenameList == "a b", "state name list exists");
s1.reset();
data = s1.data();
s1.on("b a", cb);
assert(data.listenerMap["a"][0].statenameList == "a b", "check sorts");
s1.on("c j !l !g q", cb);
assert(data.listenerMap["a"][0].statenameList == "a b", "check doesnt delete");
assert(data.listenerMap["c"][0].statenameList).equals("!g !l c j q", "check sorts !");
assert(data.listenerMap["j"][0],"check exists");
assert(data.listenerMap["c"][0].offStates.length == 2, "2 off states");
assert(data.listenerMap["c"][0].offStates[1]).equals("g", "first off states");
assert(data.listenerMap["c"][0].offStates[0]).equals("l", "2nd off states");
assert(data.listenerMap["g"][0],"check removes !");
s1.on("a c", cb);
assert(data.listenerMap["a"][1].statenameList == "a c", "check doesnt delete old");
assert(data.listenerMap["c"][1].statenameList == "a c", "check doesnt delete old 2");


assert.testing("Stately.statelyOff");
internal = Stately.__test__();
assertThrows(function(){s1.off()}, "undefined");
assertThrows(function(){s1.off(null,null)}, "null");
assertThrows(function(){s1.off([],cb)}, "no entry");
assertThrows(function(){s1.off("",cb)}, "empty string");
assertThrows(function(){s1.off(2,cb)}, "not string or array");
assertThrows(function(){s1.off("a",null)}, "no cb");
assertThrows(function(){s1.off("a",/sdfsdf/)}, "cb not function");
var cur = JSON.stringify(data);
s1.off("b a", function(){});
assert(internal._history.peek()).equals("failed to remove callback for state " + "a,b" + " on "+s1.id, "doesn't remove because doesn't exist");
assert(cur).equals(JSON.stringify(data),"doesn't remove because doesn't exist 2");
s1.off("b a c", cb);
assert(internal._history.peek()).equals("failed to remove callback for state " + "a,b,c" + " on "+s1.id, "doesn't remove because doesn't exist, extra state");
assert(cur).equals(JSON.stringify(data),"doesn't remove because doesn't exist 2, extra state");
s1.off("a", function(){});
assert(internal._history.peek()).equals("failed to remove callback for state " + "a" + " on "+s1.id, "doesn't remove because doesn't exist, too few states");
assert(cur).equals(JSON.stringify(data),"doesn't remove because doesn't exist 2, too few state");
s1.off("b a", cb);
assert(data.listenerMap["b"].length == 0,"removed listener");
assert(data.listenerMap["a"][0].statenameList).equals("a c","removed listener 2");
assert(internal._history.peek()).equals("removed callback for state " + "a,b" + " on "+s1.id, "removed listener log");



assert.testing("Stately.statelyDispatch");
internal = Stately.__test__();
s1 = new Stately();
assertThrows(function(){internal.dispatch()}, "undefined");
assertThrows(function(){internal.dispatch(null,null,null)}, "null");
assertThrows(function(){internal.dispatch({},{},{})}, "wrong types");
assertThrows(function(){internal.dispatch(2,/$/,"SDf")}, "wrong types2");
assertThrows(function(){internal.dispatch({callback:function(){},offStates:[]},s1)}, "missing 3");
assertThrows(function(){internal.dispatch(null,s1,{switch:"on"})}, "missing 1");
assertThrows(function(){internal.dispatch({callback:function(){},offStates:[]},{},{switch:"on"})}, "missing 2");
var event = {switch:"test",states:["yes"]};
cb = function(d){
    data = d;
};
var data = null,
    listener = {callback:cb ,offStates:[],onStates:[], statenameList: "a"};

s1.data().currentState = "123";
internal.dispatch(listener, s1, event);
assert(event.data).equals({}, "added data object");
assert(data.data).equals({}, "event data exists");
assert(event.currentState).equals("123", "currentstate added to event");
assert(data).equals(event,"event was passed to callback");

listener.doOnce = true;
internal.dispatch(listener, s1, event);
assert(listener.callback == null, "callback nulled");
assert(listener.offStates == null, "offStates nulled");
assert(listener.onStates == null, "onStates nulled");
assert(internal._history.peek()).equals("failed to remove callback for state " + "a" + " on "+s1.id, "removed listener log");

listener = {callback:cb ,offStates:[],onStates:["a","b"], statenameList: "a"};
s1.turnOn("a",{data:"a"});
s1.turnOn("a",{data:"a"});
s1.turnOn("a",{data:"a"});
internal.dispatch(listener, s1, event);
assert(data.data["a"] != null, "event.state.a data exists");
assert(data.data["a"].data).equals("a", "data was correctly passed");

s1.turnOn("b",{data:"b"});
s1.turnOn("b",{data:"c"});
listener.statenameList = "a b";
internal.dispatch(listener, s1, event);
assert(data.data["a"] != null, "event.state.a data exists");
assert(data.data["a"].data).equals("a", "data was correctly passed");
assert(data.data["b"].data).equals("b", "data for both states present, 2nd state updated");


assert.testing("Stately.statelyIsOn");
s1.turnOn("b",{data:"c"});
s1.turnOn("a",{data:"a"});
assertThrows(function(){s1.isOn()}, "undefined");
assertThrows(function(){s1.isOn(null)}, "null");
assertThrows(function(){s1.isOn(1)}, "not correct type 1");
assertThrows(function(){s1.isOn({})}, "not correct type Object");
assertThrows(function(){s1.isOn("")}, "invalid string");
assertThrows(function(){s1.isOn([])}, "invalid array");
assert(s1.isOn("a"), "a");
assert(s1.isOn("b"), "b");
assert(s1.isOn("a b"), "a b");
assert(s1.isOn("b a"), "b a");
assert(!s1.isOn("c"), "c not on");
assert(!s1.isOn("b a c"), "c not on in list");
assert(s1.isOn(["a"]), "a []");
assert(s1.isOn(["b"]), "b []");
assert(s1.isOn(["a","b"]), "a b []");
assert(s1.isOn(["b","a"]), "b a []");
assert(!s1.isOn(["c"]), "c not on []");


assert.testing("Stately.processStateChange");
assertThrows(function(){internal.processStateChange()}, "undefined");
assertThrows(function(){internal.processStateChange(true, null, null, null)}, "null");
assertThrows(function(){internal.processStateChange(true, {_data:1}, " ", null)}, "not array for states");
assertThrows(function(){internal.processStateChange(true, {_data:1}, [], null)}, "empty array for states");
assertThrows(function(){internal.processStateChange(true, {_data:0}, [1], null)}, "not a stately");
internal.processStateChange(true, s1, ["a"], {data:"b"});
assert(s1.data().currentState).equals("a b", "has current state");
var result = internal.processStateChange(true, s1, ["c"], {a:"b"});
assert(s1.data().currentState).equals("a b c", "updated current state");
assert(result.affected).equals([], "no listeners");

internal.processStateChange(false, s1, ["a","b","c"]);
assert(s1._data.state["a"].isOn === false, "a turned off");
assert(s1._data.state["b"].isOn === false, "b turned off");
assert(s1._data.state["c"].isOn === false, "c turned off");
assert(s1.data().currentState).equals("!a !b !c", "all states off");

//add listeners manually
listener = {callback:cb ,offStates:[],onStates:["a","c"], statenameList: "a c", _debug:true, id:"a1"};
var listener2 = {callback:cb ,offStates:[],onStates:["a"], statenameList: "a", _debug:true, id:"a2"};
var listener3 = {callback:cb ,offStates:[],onStates:["b"], statenameList: "b", _debug:true, id: "a3"};
var listener4 = {callback:cb ,offStates:[],onStates:["a","b"], statenameList: "a b", _debug:true, id:"a4"};
s1.data().listenerMap["c"] = [listener];
s1.data().listenerMap["b"] = [listener3,listener4];
s1.data().listenerMap["a"] = [listener,listener2,listener4];

result = internal.processStateChange(true, s1, ["c"], {a:"b"});
assert(result.affected).equals([listener], "one listener");
assert(result.dispatched).equals([listener], "one listener");
assert(s1.data().state["c"].data).equals({a:"b"}, "data was passed");

assert(data.data["c"]).equals({a:"b"}, "data was correctly passed");

result = internal.processStateChange(true, s1, ["c"], {a:"2"});
assert(s1.data().state["c"].data).equals({a:"b"}, "data was not updated on repeat");
assert(s1.data().state["c"].isOn).equals(true, "data not turned on");
assert(result.affected).equals([], "only one listener for 'c'");
assert(result.dispatched).equals([], "no listeners because nothing changed - the one affected listener was already dispatched");
result = internal.processStateChange(true, s1, ["a","d"], {a:"2"});
assert(s1.data().state["c"].data).equals({a:"b"}, "data was not updated on repeat");
assert(s1.data().state["a"].data).equals({a:"2"}, "data set");
assert(s1.data().state["c"].isOn).equals(true, "data c not turned on");
assert(s1.data().state["a"].isOn).equals(true, "data a not turned on");
assert(result.affected.length).equals(3, "3 listeners listen to 'a'");
assert(result.dispatched.length).equals(2, "but one was just dispatched, so only 2 dispatched now");
assert(s1.data().currentState).equals("!b a c d", "b off, a c on");


assert.testing("Stately.doesCurrentStateMatch");
assertThrows(function(){internal.doesCurrentStateMatch()}, "undefined");
assertThrows(function(){internal.doesCurrentStateMatch(null, null)}, "null");
assertThrows(function(){internal.doesCurrentStateMatch({}, null)}, "null 2nd");
assertThrows(function(){internal.doesCurrentStateMatch({}, {})}, "wrong type 2nd, no arrays");
assertThrows(function(){internal.doesCurrentStateMatch({}, "SD")}, "wrong type 2nd, string");
assertThrows(function(){internal.doesCurrentStateMatch(null, {onStates:[],offStates:[]})}, "null 1st");

assert(internal.doesCurrentStateMatch({},{onStates:[],offStates:[]}), "empty is true");
assert(internal.doesCurrentStateMatch({stuff:1, a:2},{onStates:[],offStates:[]}), "empty is true 2");
assert(!internal.doesCurrentStateMatch({},{onStates:["a"],offStates:[]}), "DNE");
assert(!internal.doesCurrentStateMatch({},{onStates:[],offStates:["b"]}), "DNE 2");
assert(internal.doesCurrentStateMatch({"a":{isOn:1}},{onStates:["a"],offStates:[]}), "simple");
assert(internal.doesCurrentStateMatch({"a":{isOn:1},"b":{isOn:1}},{onStates:["b","a"],offStates:[]}), "multiple");
assert(internal.doesCurrentStateMatch({"a":{isOn:1},"b":{isOn:0}},{onStates:["a"],offStates:["b"]}), "one off one on");


assert.testing("Stately, all the way through");
event = undefined;
cb = function(e){
    event = e;
};
var S = new Stately("my-stately");
S.on("some state", cb, false, false);
assert(event==undefined,"undefined");
S.turnOn("some",{b:1});
assert(event==undefined,"undefined");
S.turnOn("some state",{a:1});
assert(event!=undefined,"callback caled");
assert(event.switch=="on","switch on");
assert(event.currentState).equals("some state","correct current state");
assert(event.data["some"]).equals({b:1}, "state 1 has data from when it was turned on");
assert(event.data["state"]).equals({a:1}, "state 2 has data from when it was turned on");
event = undefined;
S.turnOn("some",{b:1});
assert(event==undefined,"undefined after state turned on again");
S.turnOn("some state",{a:1});
assert(event==undefined,"undefined after state turned on again 2");
S.turnOff("some",{b:2});
assert(!S.isOn("some"),"is not on");
assert(event==undefined,"undefined after state turned on again 3");
S.turnOn("some");
S.turnOn("state",{shoudNot:"have this"});
assert(event.switch=="on","switch on");
assert(event.currentState).equals("some state","correct current state");
assert(event.data["some"]).equals({b:2}, "state 1 has data from when it was turned off");
assert(event.data["state"]).equals({a:1}, "state 2 has data from when it was turned on");
assert(event.currentState).equals("some state","state");

S.on("f g", cb, false, false);
S.turnOn("f",{b:1});
S.turnOn("g f",{a:1});
assert(event.data["g"]).equals({a:1}, "state f has data from when it was turned on together");
assert(event.data["f"]).equals({b:1}, "state g has data from when it was turned on alone");
assert(event.currentState).equals("f g some state","state");
S.turnOff("f",{c:1});
S.turnOn("f");
assert(event.data["f"]).equals({c:1}, "state g has data from when it was turned off alone");



Stately.reset();
assert.testing.release();
test[window._testStately] && test[window._testStately].done();