/*!
 * Sir Trevor JS v0.3.2
 *
 * Released under the MIT license
 * www.opensource.org/licenses/MIT
 *
 * 2014-12-01
 */


!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.SirTrevor=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./src/');

},{"./src/":92}],2:[function(require,module,exports){
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as a module.
    define('eventable', function() {
      return (root.Eventable = factory());
    });
  } else if (typeof exports !== 'undefined') {
    // Node. Does not work with strict CommonJS, but only CommonJS-like
    // enviroments that support module.exports, like Node.
    module.exports = factory();
  } else {
    // Browser globals
    root.Eventable = factory();
  }
}(this, function() {

  // Copy and pasted straight out of Backbone 1.0.0
  // We'll try and keep this updated to the latest

  var array = [];
  var slice = array.slice;

  function once(func) {
    var memo, times = 2;

    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      } else {
        func = null;
      }
      return memo;
    };
  }

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Eventable = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var func = once(function() {
        self.off(name, func);
        callback.apply(this, arguments);
      });
      func._callback = callback;
      return this.on(name, func, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : Object.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  function addListenMethod(method, implementation) {
    Eventable[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = (new Date()).getTime());
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  }

  addListenMethod('listenTo', 'on');
  addListenMethod('listenToOnce', 'once');

  // Aliases for backwards compatibility.
  Eventable.bind   = Eventable.on;
  Eventable.unbind = Eventable.off;

  return Eventable;

}));

},{}],3:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var forOwn = require('lodash.forown'),
    isFunction = require('lodash.isfunction');

/** `Object#toString` result shortcuts */
var argsClass = '[object Arguments]',
    arrayClass = '[object Array]',
    objectClass = '[object Object]',
    stringClass = '[object String]';

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/**
 * Checks if `value` is empty. Arrays, strings, or `arguments` objects with a
 * length of `0` and objects with no own enumerable properties are considered
 * "empty".
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {Array|Object|string} value The value to inspect.
 * @returns {boolean} Returns `true` if the `value` is empty, else `false`.
 * @example
 *
 * _.isEmpty([1, 2, 3]);
 * // => false
 *
 * _.isEmpty({});
 * // => true
 *
 * _.isEmpty('');
 * // => true
 */
function isEmpty(value) {
  var result = true;
  if (!value) {
    return result;
  }
  var className = toString.call(value),
      length = value.length;

  if ((className == arrayClass || className == stringClass || className == argsClass ) ||
      (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
    return !length;
  }
  forOwn(value, function() {
    return (result = false);
  });
  return result;
}

module.exports = isEmpty;

},{"lodash.forown":4,"lodash.isfunction":27}],4:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var baseCreateCallback = require('lodash._basecreatecallback'),
    keys = require('lodash.keys'),
    objectTypes = require('lodash._objecttypes');

/**
 * Iterates over own enumerable properties of an object, executing the callback
 * for each property. The callback is bound to `thisArg` and invoked with three
 * arguments; (value, key, object). Callbacks may exit iteration early by
 * explicitly returning `false`.
 *
 * @static
 * @memberOf _
 * @type Function
 * @category Objects
 * @param {Object} object The object to iterate over.
 * @param {Function} [callback=identity] The function called per iteration.
 * @param {*} [thisArg] The `this` binding of `callback`.
 * @returns {Object} Returns `object`.
 * @example
 *
 * _.forOwn({ '0': 'zero', '1': 'one', 'length': 2 }, function(num, key) {
 *   console.log(key);
 * });
 * // => logs '0', '1', and 'length' (property order is not guaranteed across environments)
 */
var forOwn = function(collection, callback, thisArg) {
  var index, iterable = collection, result = iterable;
  if (!iterable) return result;
  if (!objectTypes[typeof iterable]) return result;
  callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
    var ownIndex = -1,
        ownProps = objectTypes[typeof iterable] && keys(iterable),
        length = ownProps ? ownProps.length : 0;

    while (++ownIndex < length) {
      index = ownProps[ownIndex];
      if (callback(iterable[index], index, collection) === false) return result;
    }
  return result
};

module.exports = forOwn;

},{"lodash._basecreatecallback":5,"lodash._objecttypes":23,"lodash.keys":24}],5:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var bind = require('lodash.bind'),
    identity = require('lodash.identity'),
    setBindData = require('lodash._setbinddata'),
    support = require('lodash.support');

/** Used to detected named functions */
var reFuncName = /^\s*function[ \n\r\t]+\w/;

/** Used to detect functions containing a `this` reference */
var reThis = /\bthis\b/;

/** Native method shortcuts */
var fnToString = Function.prototype.toString;

/**
 * The base implementation of `_.createCallback` without support for creating
 * "_.pluck" or "_.where" style callbacks.
 *
 * @private
 * @param {*} [func=identity] The value to convert to a callback.
 * @param {*} [thisArg] The `this` binding of the created callback.
 * @param {number} [argCount] The number of arguments the callback accepts.
 * @returns {Function} Returns a callback function.
 */
function baseCreateCallback(func, thisArg, argCount) {
  if (typeof func != 'function') {
    return identity;
  }
  // exit early for no `thisArg` or already bound by `Function#bind`
  if (typeof thisArg == 'undefined' || !('prototype' in func)) {
    return func;
  }
  var bindData = func.__bindData__;
  if (typeof bindData == 'undefined') {
    if (support.funcNames) {
      bindData = !func.name;
    }
    bindData = bindData || !support.funcDecomp;
    if (!bindData) {
      var source = fnToString.call(func);
      if (!support.funcNames) {
        bindData = !reFuncName.test(source);
      }
      if (!bindData) {
        // checks if `func` references the `this` keyword and stores the result
        bindData = reThis.test(source);
        setBindData(func, bindData);
      }
    }
  }
  // exit early if there are no `this` references or `func` is bound
  if (bindData === false || (bindData !== true && bindData[1] & 1)) {
    return func;
  }
  switch (argCount) {
    case 1: return function(value) {
      return func.call(thisArg, value);
    };
    case 2: return function(a, b) {
      return func.call(thisArg, a, b);
    };
    case 3: return function(value, index, collection) {
      return func.call(thisArg, value, index, collection);
    };
    case 4: return function(accumulator, value, index, collection) {
      return func.call(thisArg, accumulator, value, index, collection);
    };
  }
  return bind(func, thisArg);
}

module.exports = baseCreateCallback;

},{"lodash._setbinddata":6,"lodash.bind":9,"lodash.identity":20,"lodash.support":21}],6:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative'),
    noop = require('lodash.noop');

/** Used as the property descriptor for `__bindData__` */
var descriptor = {
  'configurable': false,
  'enumerable': false,
  'value': null,
  'writable': false
};

/** Used to set meta data on functions */
var defineProperty = (function() {
  // IE 8 only accepts DOM elements
  try {
    var o = {},
        func = isNative(func = Object.defineProperty) && func,
        result = func(o, o, o) && func;
  } catch(e) { }
  return result;
}());

/**
 * Sets `this` binding data on a given function.
 *
 * @private
 * @param {Function} func The function to set data on.
 * @param {Array} value The data array to set.
 */
var setBindData = !defineProperty ? noop : function(func, value) {
  descriptor.value = value;
  defineProperty(func, '__bindData__', descriptor);
};

module.exports = setBindData;

},{"lodash._isnative":7,"lodash.noop":8}],7:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/** Used to detect if a method is native */
var reNative = RegExp('^' +
  String(toString)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/toString| for [^\]]+/g, '.*?') + '$'
);

/**
 * Checks if `value` is a native function.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a native function, else `false`.
 */
function isNative(value) {
  return typeof value == 'function' && reNative.test(value);
}

module.exports = isNative;

},{}],8:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * A no-operation function.
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @example
 *
 * var object = { 'name': 'fred' };
 * _.noop(object) === undefined;
 * // => true
 */
function noop() {
  // no operation performed
}

module.exports = noop;

},{}],9:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var createWrapper = require('lodash._createwrapper'),
    slice = require('lodash._slice');

/**
 * Creates a function that, when called, invokes `func` with the `this`
 * binding of `thisArg` and prepends any additional `bind` arguments to those
 * provided to the bound function.
 *
 * @static
 * @memberOf _
 * @category Functions
 * @param {Function} func The function to bind.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {...*} [arg] Arguments to be partially applied.
 * @returns {Function} Returns the new bound function.
 * @example
 *
 * var func = function(greeting) {
 *   return greeting + ' ' + this.name;
 * };
 *
 * func = _.bind(func, { 'name': 'fred' }, 'hi');
 * func();
 * // => 'hi fred'
 */
function bind(func, thisArg) {
  return arguments.length > 2
    ? createWrapper(func, 17, slice(arguments, 2), null, thisArg)
    : createWrapper(func, 1, null, null, thisArg);
}

module.exports = bind;

},{"lodash._createwrapper":10,"lodash._slice":19}],10:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var baseBind = require('lodash._basebind'),
    baseCreateWrapper = require('lodash._basecreatewrapper'),
    isFunction = require('lodash.isfunction'),
    slice = require('lodash._slice');

/**
 * Used for `Array` method references.
 *
 * Normally `Array.prototype` would suffice, however, using an array literal
 * avoids issues in Narwhal.
 */
var arrayRef = [];

/** Native method shortcuts */
var push = arrayRef.push,
    unshift = arrayRef.unshift;

/**
 * Creates a function that, when called, either curries or invokes `func`
 * with an optional `this` binding and partially applied arguments.
 *
 * @private
 * @param {Function|string} func The function or method name to reference.
 * @param {number} bitmask The bitmask of method flags to compose.
 *  The bitmask may be composed of the following flags:
 *  1 - `_.bind`
 *  2 - `_.bindKey`
 *  4 - `_.curry`
 *  8 - `_.curry` (bound)
 *  16 - `_.partial`
 *  32 - `_.partialRight`
 * @param {Array} [partialArgs] An array of arguments to prepend to those
 *  provided to the new function.
 * @param {Array} [partialRightArgs] An array of arguments to append to those
 *  provided to the new function.
 * @param {*} [thisArg] The `this` binding of `func`.
 * @param {number} [arity] The arity of `func`.
 * @returns {Function} Returns the new function.
 */
function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
  var isBind = bitmask & 1,
      isBindKey = bitmask & 2,
      isCurry = bitmask & 4,
      isCurryBound = bitmask & 8,
      isPartial = bitmask & 16,
      isPartialRight = bitmask & 32;

  if (!isBindKey && !isFunction(func)) {
    throw new TypeError;
  }
  if (isPartial && !partialArgs.length) {
    bitmask &= ~16;
    isPartial = partialArgs = false;
  }
  if (isPartialRight && !partialRightArgs.length) {
    bitmask &= ~32;
    isPartialRight = partialRightArgs = false;
  }
  var bindData = func && func.__bindData__;
  if (bindData && bindData !== true) {
    // clone `bindData`
    bindData = slice(bindData);
    if (bindData[2]) {
      bindData[2] = slice(bindData[2]);
    }
    if (bindData[3]) {
      bindData[3] = slice(bindData[3]);
    }
    // set `thisBinding` is not previously bound
    if (isBind && !(bindData[1] & 1)) {
      bindData[4] = thisArg;
    }
    // set if previously bound but not currently (subsequent curried functions)
    if (!isBind && bindData[1] & 1) {
      bitmask |= 8;
    }
    // set curried arity if not yet set
    if (isCurry && !(bindData[1] & 4)) {
      bindData[5] = arity;
    }
    // append partial left arguments
    if (isPartial) {
      push.apply(bindData[2] || (bindData[2] = []), partialArgs);
    }
    // append partial right arguments
    if (isPartialRight) {
      unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
    }
    // merge flags
    bindData[1] |= bitmask;
    return createWrapper.apply(null, bindData);
  }
  // fast path for `_.bind`
  var creater = (bitmask == 1 || bitmask === 17) ? baseBind : baseCreateWrapper;
  return creater([func, bitmask, partialArgs, partialRightArgs, thisArg, arity]);
}

module.exports = createWrapper;

},{"lodash._basebind":11,"lodash._basecreatewrapper":15,"lodash._slice":19,"lodash.isfunction":27}],11:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var baseCreate = require('lodash._basecreate'),
    isObject = require('lodash.isobject'),
    setBindData = require('lodash._setbinddata'),
    slice = require('lodash._slice');

/**
 * Used for `Array` method references.
 *
 * Normally `Array.prototype` would suffice, however, using an array literal
 * avoids issues in Narwhal.
 */
var arrayRef = [];

/** Native method shortcuts */
var push = arrayRef.push;

/**
 * The base implementation of `_.bind` that creates the bound function and
 * sets its meta data.
 *
 * @private
 * @param {Array} bindData The bind data array.
 * @returns {Function} Returns the new bound function.
 */
function baseBind(bindData) {
  var func = bindData[0],
      partialArgs = bindData[2],
      thisArg = bindData[4];

  function bound() {
    // `Function#bind` spec
    // http://es5.github.io/#x15.3.4.5
    if (partialArgs) {
      // avoid `arguments` object deoptimizations by using `slice` instead
      // of `Array.prototype.slice.call` and not assigning `arguments` to a
      // variable as a ternary expression
      var args = slice(partialArgs);
      push.apply(args, arguments);
    }
    // mimic the constructor's `return` behavior
    // http://es5.github.io/#x13.2.2
    if (this instanceof bound) {
      // ensure `new bound` is an instance of `func`
      var thisBinding = baseCreate(func.prototype),
          result = func.apply(thisBinding, args || arguments);
      return isObject(result) ? result : thisBinding;
    }
    return func.apply(thisArg, args || arguments);
  }
  setBindData(bound, bindData);
  return bound;
}

module.exports = baseBind;

},{"lodash._basecreate":12,"lodash._setbinddata":6,"lodash._slice":19,"lodash.isobject":28}],12:[function(require,module,exports){
(function (global){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative'),
    isObject = require('lodash.isobject'),
    noop = require('lodash.noop');

/* Native method shortcuts for methods with the same name as other `lodash` methods */
var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate;

/**
 * The base implementation of `_.create` without support for assigning
 * properties to the created object.
 *
 * @private
 * @param {Object} prototype The object to inherit from.
 * @returns {Object} Returns the new object.
 */
function baseCreate(prototype, properties) {
  return isObject(prototype) ? nativeCreate(prototype) : {};
}
// fallback for browsers without `Object.create`
if (!nativeCreate) {
  baseCreate = (function() {
    function Object() {}
    return function(prototype) {
      if (isObject(prototype)) {
        Object.prototype = prototype;
        var result = new Object;
        Object.prototype = null;
      }
      return result || global.Object();
    };
  }());
}

module.exports = baseCreate;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash._isnative":13,"lodash.isobject":28,"lodash.noop":14}],13:[function(require,module,exports){
module.exports=require(7)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash._isnative/index.js":7}],14:[function(require,module,exports){
module.exports=require(8)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash.noop/index.js":8}],15:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var baseCreate = require('lodash._basecreate'),
    isObject = require('lodash.isobject'),
    setBindData = require('lodash._setbinddata'),
    slice = require('lodash._slice');

/**
 * Used for `Array` method references.
 *
 * Normally `Array.prototype` would suffice, however, using an array literal
 * avoids issues in Narwhal.
 */
var arrayRef = [];

/** Native method shortcuts */
var push = arrayRef.push;

/**
 * The base implementation of `createWrapper` that creates the wrapper and
 * sets its meta data.
 *
 * @private
 * @param {Array} bindData The bind data array.
 * @returns {Function} Returns the new function.
 */
function baseCreateWrapper(bindData) {
  var func = bindData[0],
      bitmask = bindData[1],
      partialArgs = bindData[2],
      partialRightArgs = bindData[3],
      thisArg = bindData[4],
      arity = bindData[5];

  var isBind = bitmask & 1,
      isBindKey = bitmask & 2,
      isCurry = bitmask & 4,
      isCurryBound = bitmask & 8,
      key = func;

  function bound() {
    var thisBinding = isBind ? thisArg : this;
    if (partialArgs) {
      var args = slice(partialArgs);
      push.apply(args, arguments);
    }
    if (partialRightArgs || isCurry) {
      args || (args = slice(arguments));
      if (partialRightArgs) {
        push.apply(args, partialRightArgs);
      }
      if (isCurry && args.length < arity) {
        bitmask |= 16 & ~32;
        return baseCreateWrapper([func, (isCurryBound ? bitmask : bitmask & ~3), args, null, thisArg, arity]);
      }
    }
    args || (args = arguments);
    if (isBindKey) {
      func = thisBinding[key];
    }
    if (this instanceof bound) {
      thisBinding = baseCreate(func.prototype);
      var result = func.apply(thisBinding, args);
      return isObject(result) ? result : thisBinding;
    }
    return func.apply(thisBinding, args);
  }
  setBindData(bound, bindData);
  return bound;
}

module.exports = baseCreateWrapper;

},{"lodash._basecreate":16,"lodash._setbinddata":6,"lodash._slice":19,"lodash.isobject":28}],16:[function(require,module,exports){
module.exports=require(12)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash.bind/node_modules/lodash._createwrapper/node_modules/lodash._basebind/node_modules/lodash._basecreate/index.js":12,"lodash._isnative":17,"lodash.isobject":28,"lodash.noop":18}],17:[function(require,module,exports){
module.exports=require(7)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash._isnative/index.js":7}],18:[function(require,module,exports){
module.exports=require(8)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash.noop/index.js":8}],19:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Slices the `collection` from the `start` index up to, but not including,
 * the `end` index.
 *
 * Note: This function is used instead of `Array#slice` to support node lists
 * in IE < 9 and to ensure dense arrays are returned.
 *
 * @private
 * @param {Array|Object|string} collection The collection to slice.
 * @param {number} start The start index.
 * @param {number} end The end index.
 * @returns {Array} Returns the new array.
 */
function slice(array, start, end) {
  start || (start = 0);
  if (typeof end == 'undefined') {
    end = array ? array.length : 0;
  }
  var index = -1,
      length = end - start || 0,
      result = Array(length < 0 ? 0 : length);

  while (++index < length) {
    result[index] = array[start + index];
  }
  return result;
}

module.exports = slice;

},{}],20:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * This method returns the first argument provided to it.
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @param {*} value Any value.
 * @returns {*} Returns `value`.
 * @example
 *
 * var object = { 'name': 'fred' };
 * _.identity(object) === object;
 * // => true
 */
function identity(value) {
  return value;
}

module.exports = identity;

},{}],21:[function(require,module,exports){
(function (global){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative');

/** Used to detect functions containing a `this` reference */
var reThis = /\bthis\b/;

/**
 * An object used to flag environments features.
 *
 * @static
 * @memberOf _
 * @type Object
 */
var support = {};

/**
 * Detect if functions can be decompiled by `Function#toString`
 * (all but PS3 and older Opera mobile browsers & avoided in Windows 8 apps).
 *
 * @memberOf _.support
 * @type boolean
 */
support.funcDecomp = !isNative(global.WinRTError) && reThis.test(function() { return this; });

/**
 * Detect if `Function#name` is supported (all but IE).
 *
 * @memberOf _.support
 * @type boolean
 */
support.funcNames = typeof Function.name == 'string';

module.exports = support;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"lodash._isnative":22}],22:[function(require,module,exports){
module.exports=require(7)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash._isnative/index.js":7}],23:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to determine if values are of the language type Object */
var objectTypes = {
  'boolean': false,
  'function': true,
  'object': true,
  'number': false,
  'string': false,
  'undefined': false
};

module.exports = objectTypes;

},{}],24:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isNative = require('lodash._isnative'),
    isObject = require('lodash.isobject'),
    shimKeys = require('lodash._shimkeys');

/* Native method shortcuts for methods with the same name as other `lodash` methods */
var nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys;

/**
 * Creates an array composed of the own enumerable property names of an object.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns an array of property names.
 * @example
 *
 * _.keys({ 'one': 1, 'two': 2, 'three': 3 });
 * // => ['one', 'two', 'three'] (property order is not guaranteed across environments)
 */
var keys = !nativeKeys ? shimKeys : function(object) {
  if (!isObject(object)) {
    return [];
  }
  return nativeKeys(object);
};

module.exports = keys;

},{"lodash._isnative":25,"lodash._shimkeys":26,"lodash.isobject":28}],25:[function(require,module,exports){
module.exports=require(7)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash._isnative/index.js":7}],26:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var objectTypes = require('lodash._objecttypes');

/** Used for native method references */
var objectProto = Object.prototype;

/** Native method shortcuts */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * A fallback implementation of `Object.keys` which produces an array of the
 * given object's own enumerable property names.
 *
 * @private
 * @type Function
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns an array of property names.
 */
var shimKeys = function(object) {
  var index, iterable = object, result = [];
  if (!iterable) return result;
  if (!(objectTypes[typeof object])) return result;
    for (index in iterable) {
      if (hasOwnProperty.call(iterable, index)) {
        result.push(index);
      }
    }
  return result
};

module.exports = shimKeys;

},{"lodash._objecttypes":23}],27:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Checks if `value` is a function.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 */
function isFunction(value) {
  return typeof value == 'function';
}

module.exports = isFunction;

},{}],28:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var objectTypes = require('lodash._objecttypes');

/**
 * Checks if `value` is the language type of Object.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // check if the value is the ECMAScript language type of Object
  // http://es5.github.io/#x8
  // and avoid a V8 bug
  // http://code.google.com/p/v8/issues/detail?id=2291
  return !!(value && objectTypes[typeof value]);
}

module.exports = isObject;

},{"lodash._objecttypes":29}],29:[function(require,module,exports){
module.exports=require(23)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._objecttypes/index.js":23}],30:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** `Object#toString` result shortcuts */
var stringClass = '[object String]';

/** Used for native method references */
var objectProto = Object.prototype;

/** Used to resolve the internal [[Class]] of values */
var toString = objectProto.toString;

/**
 * Checks if `value` is a string.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is a string, else `false`.
 * @example
 *
 * _.isString('fred');
 * // => true
 */
function isString(value) {
  return typeof value == 'string' ||
    value && typeof value == 'object' && toString.call(value) == stringClass || false;
}

module.exports = isString;

},{}],31:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Checks if `value` is `undefined`.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if the `value` is `undefined`, else `false`.
 * @example
 *
 * _.isUndefined(void 0);
 * // => true
 */
function isUndefined(value) {
  return typeof value == 'undefined';
}

module.exports = isUndefined;

},{}],32:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var isFunction = require('lodash.isfunction');

/**
 * Resolves the value of property `key` on `object`. If `key` is a function
 * it will be invoked with the `this` binding of `object` and its result returned,
 * else the property value is returned. If `object` is falsey then `undefined`
 * is returned.
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @param {Object} object The object to inspect.
 * @param {string} key The name of the property to resolve.
 * @returns {*} Returns the resolved value.
 * @example
 *
 * var object = {
 *   'cheese': 'crumpets',
 *   'stuff': function() {
 *     return 'nonsense';
 *   }
 * };
 *
 * _.result(object, 'cheese');
 * // => 'crumpets'
 *
 * _.result(object, 'stuff');
 * // => 'nonsense'
 */
function result(object, key) {
  if (object) {
    var value = object[key];
    return isFunction(value) ? object[key]() : value;
  }
}

module.exports = result;

},{"lodash.isfunction":27}],33:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var defaults = require('lodash.defaults'),
    escape = require('lodash.escape'),
    escapeStringChar = require('lodash._escapestringchar'),
    keys = require('lodash.keys'),
    reInterpolate = require('lodash._reinterpolate'),
    templateSettings = require('lodash.templatesettings'),
    values = require('lodash.values');

/** Used to match empty string literals in compiled template source */
var reEmptyStringLeading = /\b__p \+= '';/g,
    reEmptyStringMiddle = /\b(__p \+=) '' \+/g,
    reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;

/**
 * Used to match ES6 template delimiters
 * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-literals-string-literals
 */
var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;

/** Used to ensure capturing order of template delimiters */
var reNoMatch = /($^)/;

/** Used to match unescaped characters in compiled string literals */
var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;

/**
 * A micro-templating method that handles arbitrary delimiters, preserves
 * whitespace, and correctly escapes quotes within interpolated code.
 *
 * Note: In the development build, `_.template` utilizes sourceURLs for easier
 * debugging. See http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl
 *
 * For more information on precompiling templates see:
 * http://lodash.com/custom-builds
 *
 * For more information on Chrome extension sandboxes see:
 * http://developer.chrome.com/stable/extensions/sandboxingEval.html
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @param {string} text The template text.
 * @param {Object} data The data object used to populate the text.
 * @param {Object} [options] The options object.
 * @param {RegExp} [options.escape] The "escape" delimiter.
 * @param {RegExp} [options.evaluate] The "evaluate" delimiter.
 * @param {Object} [options.imports] An object to import into the template as local variables.
 * @param {RegExp} [options.interpolate] The "interpolate" delimiter.
 * @param {string} [sourceURL] The sourceURL of the template's compiled source.
 * @param {string} [variable] The data object variable name.
 * @returns {Function|string} Returns a compiled function when no `data` object
 *  is given, else it returns the interpolated text.
 * @example
 *
 * // using the "interpolate" delimiter to create a compiled template
 * var compiled = _.template('hello <%= name %>');
 * compiled({ 'name': 'fred' });
 * // => 'hello fred'
 *
 * // using the "escape" delimiter to escape HTML in data property values
 * _.template('<b><%- value %></b>', { 'value': '<script>' });
 * // => '<b>&lt;script&gt;</b>'
 *
 * // using the "evaluate" delimiter to generate HTML
 * var list = '<% _.forEach(people, function(name) { %><li><%- name %></li><% }); %>';
 * _.template(list, { 'people': ['fred', 'barney'] });
 * // => '<li>fred</li><li>barney</li>'
 *
 * // using the ES6 delimiter as an alternative to the default "interpolate" delimiter
 * _.template('hello ${ name }', { 'name': 'pebbles' });
 * // => 'hello pebbles'
 *
 * // using the internal `print` function in "evaluate" delimiters
 * _.template('<% print("hello " + name); %>!', { 'name': 'barney' });
 * // => 'hello barney!'
 *
 * // using a custom template delimiters
 * _.templateSettings = {
 *   'interpolate': /{{([\s\S]+?)}}/g
 * };
 *
 * _.template('hello {{ name }}!', { 'name': 'mustache' });
 * // => 'hello mustache!'
 *
 * // using the `imports` option to import jQuery
 * var list = '<% jq.each(people, function(name) { %><li><%- name %></li><% }); %>';
 * _.template(list, { 'people': ['fred', 'barney'] }, { 'imports': { 'jq': jQuery } });
 * // => '<li>fred</li><li>barney</li>'
 *
 * // using the `sourceURL` option to specify a custom sourceURL for the template
 * var compiled = _.template('hello <%= name %>', null, { 'sourceURL': '/basic/greeting.jst' });
 * compiled(data);
 * // => find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector
 *
 * // using the `variable` option to ensure a with-statement isn't used in the compiled template
 * var compiled = _.template('hi <%= data.name %>!', null, { 'variable': 'data' });
 * compiled.source;
 * // => function(data) {
 *   var __t, __p = '', __e = _.escape;
 *   __p += 'hi ' + ((__t = ( data.name )) == null ? '' : __t) + '!';
 *   return __p;
 * }
 *
 * // using the `source` property to inline compiled templates for meaningful
 * // line numbers in error messages and a stack trace
 * fs.writeFileSync(path.join(cwd, 'jst.js'), '\
 *   var JST = {\
 *     "main": ' + _.template(mainText).source + '\
 *   };\
 * ');
 */
function template(text, data, options) {
  // based on John Resig's `tmpl` implementation
  // http://ejohn.org/blog/javascript-micro-templating/
  // and Laura Doktorova's doT.js
  // https://github.com/olado/doT
  var settings = templateSettings.imports._.templateSettings || templateSettings;
  text = String(text || '');

  // avoid missing dependencies when `iteratorTemplate` is not defined
  options = defaults({}, options, settings);

  var imports = defaults({}, options.imports, settings.imports),
      importsKeys = keys(imports),
      importsValues = values(imports);

  var isEvaluating,
      index = 0,
      interpolate = options.interpolate || reNoMatch,
      source = "__p += '";

  // compile the regexp to match each delimiter
  var reDelimiters = RegExp(
    (options.escape || reNoMatch).source + '|' +
    interpolate.source + '|' +
    (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' +
    (options.evaluate || reNoMatch).source + '|$'
  , 'g');

  text.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
    interpolateValue || (interpolateValue = esTemplateValue);

    // escape characters that cannot be included in string literals
    source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);

    // replace delimiters with snippets
    if (escapeValue) {
      source += "' +\n__e(" + escapeValue + ") +\n'";
    }
    if (evaluateValue) {
      isEvaluating = true;
      source += "';\n" + evaluateValue + ";\n__p += '";
    }
    if (interpolateValue) {
      source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
    }
    index = offset + match.length;

    // the JS engine embedded in Adobe products requires returning the `match`
    // string in order to produce the correct `offset` value
    return match;
  });

  source += "';\n";

  // if `variable` is not specified, wrap a with-statement around the generated
  // code to add the data object to the top of the scope chain
  var variable = options.variable,
      hasVariable = variable;

  if (!hasVariable) {
    variable = 'obj';
    source = 'with (' + variable + ') {\n' + source + '\n}\n';
  }
  // cleanup code by stripping empty strings
  source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
    .replace(reEmptyStringMiddle, '$1')
    .replace(reEmptyStringTrailing, '$1;');

  // frame code as the function body
  source = 'function(' + variable + ') {\n' +
    (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') +
    "var __t, __p = '', __e = _.escape" +
    (isEvaluating
      ? ', __j = Array.prototype.join;\n' +
        "function print() { __p += __j.call(arguments, '') }\n"
      : ';\n'
    ) +
    source +
    'return __p\n}';

  try {
    var result = Function(importsKeys, 'return ' + source ).apply(undefined, importsValues);
  } catch(e) {
    e.source = source;
    throw e;
  }
  if (data) {
    return result(data);
  }
  // provide the compiled function's source by its `toString` method, in
  // supported environments, or the `source` property as a convenience for
  // inlining compiled templates during the build process
  result.source = source;
  return result;
}

module.exports = template;

},{"lodash._escapestringchar":34,"lodash._reinterpolate":35,"lodash.defaults":36,"lodash.escape":38,"lodash.keys":43,"lodash.templatesettings":47,"lodash.values":48}],34:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to escape characters for inclusion in compiled string literals */
var stringEscapes = {
  '\\': '\\',
  "'": "'",
  '\n': 'n',
  '\r': 'r',
  '\t': 't',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

/**
 * Used by `template` to escape characters for inclusion in compiled
 * string literals.
 *
 * @private
 * @param {string} match The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
function escapeStringChar(match) {
  return '\\' + stringEscapes[match];
}

module.exports = escapeStringChar;

},{}],35:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to match "interpolate" template delimiters */
var reInterpolate = /<%=([\s\S]+?)%>/g;

module.exports = reInterpolate;

},{}],36:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var keys = require('lodash.keys'),
    objectTypes = require('lodash._objecttypes');

/**
 * Assigns own enumerable properties of source object(s) to the destination
 * object for all destination properties that resolve to `undefined`. Once a
 * property is set, additional defaults of the same property will be ignored.
 *
 * @static
 * @memberOf _
 * @type Function
 * @category Objects
 * @param {Object} object The destination object.
 * @param {...Object} [source] The source objects.
 * @param- {Object} [guard] Allows working with `_.reduce` without using its
 *  `key` and `object` arguments as sources.
 * @returns {Object} Returns the destination object.
 * @example
 *
 * var object = { 'name': 'barney' };
 * _.defaults(object, { 'name': 'fred', 'employer': 'slate' });
 * // => { 'name': 'barney', 'employer': 'slate' }
 */
var defaults = function(object, source, guard) {
  var index, iterable = object, result = iterable;
  if (!iterable) return result;
  var args = arguments,
      argsIndex = 0,
      argsLength = typeof guard == 'number' ? 2 : args.length;
  while (++argsIndex < argsLength) {
    iterable = args[argsIndex];
    if (iterable && objectTypes[typeof iterable]) {
    var ownIndex = -1,
        ownProps = objectTypes[typeof iterable] && keys(iterable),
        length = ownProps ? ownProps.length : 0;

    while (++ownIndex < length) {
      index = ownProps[ownIndex];
      if (typeof result[index] == 'undefined') result[index] = iterable[index];
    }
    }
  }
  return result
};

module.exports = defaults;

},{"lodash._objecttypes":37,"lodash.keys":43}],37:[function(require,module,exports){
module.exports=require(23)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._objecttypes/index.js":23}],38:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var escapeHtmlChar = require('lodash._escapehtmlchar'),
    keys = require('lodash.keys'),
    reUnescapedHtml = require('lodash._reunescapedhtml');

/**
 * Converts the characters `&`, `<`, `>`, `"`, and `'` in `string` to their
 * corresponding HTML entities.
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @param {string} string The string to escape.
 * @returns {string} Returns the escaped string.
 * @example
 *
 * _.escape('Fred, Wilma, & Pebbles');
 * // => 'Fred, Wilma, &amp; Pebbles'
 */
function escape(string) {
  return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
}

module.exports = escape;

},{"lodash._escapehtmlchar":39,"lodash._reunescapedhtml":41,"lodash.keys":43}],39:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var htmlEscapes = require('lodash._htmlescapes');

/**
 * Used by `escape` to convert characters to HTML entities.
 *
 * @private
 * @param {string} match The matched character to escape.
 * @returns {string} Returns the escaped character.
 */
function escapeHtmlChar(match) {
  return htmlEscapes[match];
}

module.exports = escapeHtmlChar;

},{"lodash._htmlescapes":40}],40:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/**
 * Used to convert characters to HTML entities:
 *
 * Though the `>` character is escaped for symmetry, characters like `>` and `/`
 * don't require escaping in HTML and have no special meaning unless they're part
 * of a tag or an unquoted attribute value.
 * http://mathiasbynens.be/notes/ambiguous-ampersands (under "semi-related fun fact")
 */
var htmlEscapes = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

module.exports = htmlEscapes;

},{}],41:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var htmlEscapes = require('lodash._htmlescapes'),
    keys = require('lodash.keys');

/** Used to match HTML entities and HTML characters */
var reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');

module.exports = reUnescapedHtml;

},{"lodash._htmlescapes":42,"lodash.keys":43}],42:[function(require,module,exports){
module.exports=require(40)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.template/node_modules/lodash.escape/node_modules/lodash._escapehtmlchar/node_modules/lodash._htmlescapes/index.js":40}],43:[function(require,module,exports){
module.exports=require(24)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash.keys/index.js":24,"lodash._isnative":44,"lodash._shimkeys":45,"lodash.isobject":28}],44:[function(require,module,exports){
module.exports=require(7)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._basecreatecallback/node_modules/lodash._setbinddata/node_modules/lodash._isnative/index.js":7}],45:[function(require,module,exports){
module.exports=require(26)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash.keys/node_modules/lodash._shimkeys/index.js":26,"lodash._objecttypes":46}],46:[function(require,module,exports){
module.exports=require(23)
},{"/Users/ScorchsoftMini1/Sites/test/sir-trevor-js/node_modules/lodash.isempty/node_modules/lodash.forown/node_modules/lodash._objecttypes/index.js":23}],47:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var escape = require('lodash.escape'),
    reInterpolate = require('lodash._reinterpolate');

/**
 * By default, the template delimiters used by Lo-Dash are similar to those in
 * embedded Ruby (ERB). Change the following template settings to use alternative
 * delimiters.
 *
 * @static
 * @memberOf _
 * @type Object
 */
var templateSettings = {

  /**
   * Used to detect `data` property values to be HTML-escaped.
   *
   * @memberOf _.templateSettings
   * @type RegExp
   */
  'escape': /<%-([\s\S]+?)%>/g,

  /**
   * Used to detect code to be evaluated.
   *
   * @memberOf _.templateSettings
   * @type RegExp
   */
  'evaluate': /<%([\s\S]+?)%>/g,

  /**
   * Used to detect `data` property values to inject.
   *
   * @memberOf _.templateSettings
   * @type RegExp
   */
  'interpolate': reInterpolate,

  /**
   * Used to reference the data object in the template text.
   *
   * @memberOf _.templateSettings
   * @type string
   */
  'variable': '',

  /**
   * Used to import variables into the compiled template.
   *
   * @memberOf _.templateSettings
   * @type Object
   */
  'imports': {

    /**
     * A reference to the `lodash` function.
     *
     * @memberOf _.templateSettings.imports
     * @type Function
     */
    '_': { 'escape': escape }
  }
};

module.exports = templateSettings;

},{"lodash._reinterpolate":35,"lodash.escape":38}],48:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */
var keys = require('lodash.keys');

/**
 * Creates an array composed of the own enumerable property values of `object`.
 *
 * @static
 * @memberOf _
 * @category Objects
 * @param {Object} object The object to inspect.
 * @returns {Array} Returns an array of property values.
 * @example
 *
 * _.values({ 'one': 1, 'two': 2, 'three': 3 });
 * // => [1, 2, 3] (property order is not guaranteed across environments)
 */
function values(object) {
  var index = -1,
      props = keys(object),
      length = props.length,
      result = Array(length);

  while (++index < length) {
    result[index] = object[props[index]];
  }
  return result;
}

module.exports = values;

},{"lodash.keys":43}],49:[function(require,module,exports){
/**
 * Lo-Dash 2.4.1 (Custom Build) <http://lodash.com/>
 * Build: `lodash modularize modern exports="npm" -o ./npm/`
 * Copyright 2012-2013 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.5.2 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <http://lodash.com/license>
 */

/** Used to generate unique IDs */
var idCounter = 0;

/**
 * Generates a unique ID. If `prefix` is provided the ID will be appended to it.
 *
 * @static
 * @memberOf _
 * @category Utilities
 * @param {string} [prefix] The value to prefix the ID with.
 * @returns {string} Returns the unique ID.
 * @example
 *
 * _.uniqueId('contact_');
 * // => 'contact_104'
 *
 * _.uniqueId();
 * // => '105'
 */
function uniqueId(prefix) {
  var id = ++idCounter;
  return String(prefix == null ? '' : prefix) + id;
}

module.exports = uniqueId;

},{}],50:[function(require,module,exports){
/**
 * Copyright (c) 2011-2014 Felix Gnass
 * Licensed under the MIT license
 */
(function(root, factory) {

  /* CommonJS */
  if (typeof exports == 'object')  module.exports = factory()

  /* AMD module */
  else if (typeof define == 'function' && define.amd) define(factory)

  /* Browser global */
  else root.Spinner = factory()
}
(this, function() {
  "use strict";

  var prefixes = ['webkit', 'Moz', 'ms', 'O'] /* Vendor prefixes */
    , animations = {} /* Animation rules keyed by their name */
    , useCssAnimations /* Whether to use CSS animations or setTimeout */

  /**
   * Utility function to create elements. If no tag name is given,
   * a DIV is created. Optionally properties can be passed.
   */
  function createEl(tag, prop) {
    var el = document.createElement(tag || 'div')
      , n

    for(n in prop) el[n] = prop[n]
    return el
  }

  /**
   * Appends children and returns the parent.
   */
  function ins(parent /* child1, child2, ...*/) {
    for (var i=1, n=arguments.length; i<n; i++)
      parent.appendChild(arguments[i])

    return parent
  }

  /**
   * Insert a new stylesheet to hold the @keyframe or VML rules.
   */
  var sheet = (function() {
    var el = createEl('style', {type : 'text/css'})
    ins(document.getElementsByTagName('head')[0], el)
    return el.sheet || el.styleSheet
  }())

  /**
   * Creates an opacity keyframe animation rule and returns its name.
   * Since most mobile Webkits have timing issues with animation-delay,
   * we create separate rules for each line/segment.
   */
  function addAnimation(alpha, trail, i, lines) {
    var name = ['opacity', trail, ~~(alpha*100), i, lines].join('-')
      , start = 0.01 + i/lines * 100
      , z = Math.max(1 - (1-alpha) / trail * (100-start), alpha)
      , prefix = useCssAnimations.substring(0, useCssAnimations.indexOf('Animation')).toLowerCase()
      , pre = prefix && '-' + prefix + '-' || ''

    if (!animations[name]) {
      sheet.insertRule(
        '@' + pre + 'keyframes ' + name + '{' +
        '0%{opacity:' + z + '}' +
        start + '%{opacity:' + alpha + '}' +
        (start+0.01) + '%{opacity:1}' +
        (start+trail) % 100 + '%{opacity:' + alpha + '}' +
        '100%{opacity:' + z + '}' +
        '}', sheet.cssRules.length)

      animations[name] = 1
    }

    return name
  }

  /**
   * Tries various vendor prefixes and returns the first supported property.
   */
  function vendor(el, prop) {
    var s = el.style
      , pp
      , i

    prop = prop.charAt(0).toUpperCase() + prop.slice(1)
    for(i=0; i<prefixes.length; i++) {
      pp = prefixes[i]+prop
      if(s[pp] !== undefined) return pp
    }
    if(s[prop] !== undefined) return prop
  }

  /**
   * Sets multiple style properties at once.
   */
  function css(el, prop) {
    for (var n in prop)
      el.style[vendor(el, n)||n] = prop[n]

    return el
  }

  /**
   * Fills in default values.
   */
  function merge(obj) {
    for (var i=1; i < arguments.length; i++) {
      var def = arguments[i]
      for (var n in def)
        if (obj[n] === undefined) obj[n] = def[n]
    }
    return obj
  }

  /**
   * Returns the absolute page-offset of the given element.
   */
  function pos(el) {
    var o = { x:el.offsetLeft, y:el.offsetTop }
    while((el = el.offsetParent))
      o.x+=el.offsetLeft, o.y+=el.offsetTop

    return o
  }

  /**
   * Returns the line color from the given string or array.
   */
  function getColor(color, idx) {
    return typeof color == 'string' ? color : color[idx % color.length]
  }

  // Built-in defaults

  var defaults = {
    lines: 12,            // The number of lines to draw
    length: 7,            // The length of each line
    width: 5,             // The line thickness
    radius: 10,           // The radius of the inner circle
    rotate: 0,            // Rotation offset
    corners: 1,           // Roundness (0..1)
    color: '#000',        // #rgb or #rrggbb
    direction: 1,         // 1: clockwise, -1: counterclockwise
    speed: 1,             // Rounds per second
    trail: 100,           // Afterglow percentage
    opacity: 1/4,         // Opacity of the lines
    fps: 20,              // Frames per second when using setTimeout()
    zIndex: 2e9,          // Use a high z-index by default
    className: 'spinner', // CSS class to assign to the element
    top: '50%',           // center vertically
    left: '50%',          // center horizontally
    position: 'absolute'  // element position
  }

  /** The constructor */
  function Spinner(o) {
    this.opts = merge(o || {}, Spinner.defaults, defaults)
  }

  // Global defaults that override the built-ins:
  Spinner.defaults = {}

  merge(Spinner.prototype, {

    /**
     * Adds the spinner to the given target element. If this instance is already
     * spinning, it is automatically removed from its previous target b calling
     * stop() internally.
     */
    spin: function(target) {
      this.stop()

      var self = this
        , o = self.opts
        , el = self.el = css(createEl(0, {className: o.className}), {position: o.position, width: 0, zIndex: o.zIndex})
        , mid = o.radius+o.length+o.width

      css(el, {
        left: o.left,
        top: o.top
      })
        
      if (target) {
        target.insertBefore(el, target.firstChild||null)
      }

      el.setAttribute('role', 'progressbar')
      self.lines(el, self.opts)

      if (!useCssAnimations) {
        // No CSS animation support, use setTimeout() instead
        var i = 0
          , start = (o.lines - 1) * (1 - o.direction) / 2
          , alpha
          , fps = o.fps
          , f = fps/o.speed
          , ostep = (1-o.opacity) / (f*o.trail / 100)
          , astep = f/o.lines

        ;(function anim() {
          i++;
          for (var j = 0; j < o.lines; j++) {
            alpha = Math.max(1 - (i + (o.lines - j) * astep) % f * ostep, o.opacity)

            self.opacity(el, j * o.direction + start, alpha, o)
          }
          self.timeout = self.el && setTimeout(anim, ~~(1000/fps))
        })()
      }
      return self
    },

    /**
     * Stops and removes the Spinner.
     */
    stop: function() {
      var el = this.el
      if (el) {
        clearTimeout(this.timeout)
        if (el.parentNode) el.parentNode.removeChild(el)
        this.el = undefined
      }
      return this
    },

    /**
     * Internal method that draws the individual lines. Will be overwritten
     * in VML fallback mode below.
     */
    lines: function(el, o) {
      var i = 0
        , start = (o.lines - 1) * (1 - o.direction) / 2
        , seg

      function fill(color, shadow) {
        return css(createEl(), {
          position: 'absolute',
          width: (o.length+o.width) + 'px',
          height: o.width + 'px',
          background: color,
          boxShadow: shadow,
          transformOrigin: 'left',
          transform: 'rotate(' + ~~(360/o.lines*i+o.rotate) + 'deg) translate(' + o.radius+'px' +',0)',
          borderRadius: (o.corners * o.width>>1) + 'px'
        })
      }

      for (; i < o.lines; i++) {
        seg = css(createEl(), {
          position: 'absolute',
          top: 1+~(o.width/2) + 'px',
          transform: o.hwaccel ? 'translate3d(0,0,0)' : '',
          opacity: o.opacity,
          animation: useCssAnimations && addAnimation(o.opacity, o.trail, start + i * o.direction, o.lines) + ' ' + 1/o.speed + 's linear infinite'
        })

        if (o.shadow) ins(seg, css(fill('#000', '0 0 4px ' + '#000'), {top: 2+'px'}))
        ins(el, ins(seg, fill(getColor(o.color, i), '0 0 1px rgba(0,0,0,.1)')))
      }
      return el
    },

    /**
     * Internal method that adjusts the opacity of a single line.
     * Will be overwritten in VML fallback mode below.
     */
    opacity: function(el, i, val) {
      if (i < el.childNodes.length) el.childNodes[i].style.opacity = val
    }

  })


  function initVML() {

    /* Utility function to create a VML tag */
    function vml(tag, attr) {
      return createEl('<' + tag + ' xmlns="urn:schemas-microsoft.com:vml" class="spin-vml">', attr)
    }

    // No CSS transforms but VML support, add a CSS rule for VML elements:
    sheet.addRule('.spin-vml', 'behavior:url(#default#VML)')

    Spinner.prototype.lines = function(el, o) {
      var r = o.length+o.width
        , s = 2*r

      function grp() {
        return css(
          vml('group', {
            coordsize: s + ' ' + s,
            coordorigin: -r + ' ' + -r
          }),
          { width: s, height: s }
        )
      }

      var margin = -(o.width+o.length)*2 + 'px'
        , g = css(grp(), {position: 'absolute', top: margin, left: margin})
        , i

      function seg(i, dx, filter) {
        ins(g,
          ins(css(grp(), {rotation: 360 / o.lines * i + 'deg', left: ~~dx}),
            ins(css(vml('roundrect', {arcsize: o.corners}), {
                width: r,
                height: o.width,
                left: o.radius,
                top: -o.width>>1,
                filter: filter
              }),
              vml('fill', {color: getColor(o.color, i), opacity: o.opacity}),
              vml('stroke', {opacity: 0}) // transparent stroke to fix color bleeding upon opacity change
            )
          )
        )
      }

      if (o.shadow)
        for (i = 1; i <= o.lines; i++)
          seg(i, -2, 'progid:DXImageTransform.Microsoft.Blur(pixelradius=2,makeshadow=1,shadowopacity=.3)')

      for (i = 1; i <= o.lines; i++) seg(i)
      return ins(el, g)
    }

    Spinner.prototype.opacity = function(el, i, val, o) {
      var c = el.firstChild
      o = o.shadow && o.lines || 0
      if (c && i+o < c.childNodes.length) {
        c = c.childNodes[i+o]; c = c && c.firstChild; c = c && c.firstChild
        if (c) c.opacity = val
      }
    }
  }

  var probe = css(createEl('group'), {behavior: 'url(#default#VML)'})

  if (!vendor(probe, 'transform') && probe.adj) initVML()
  else useCssAnimations = vendor(probe, 'animation')

  return Spinner

}));

},{}],51:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var Blocks = require('./blocks');

var BlockControl = function(type, instance_scope) {
  this.type = type;
  this.instance_scope = instance_scope;
  this.block_type = Blocks[this.type].prototype;
  this.can_be_rendered = this.block_type.toolbarEnabled;

  this._ensureElement();
};

Object.assign(BlockControl.prototype, require('./function-bind'), require('./renderable'), require('./events'), {

  tagName: 'a',
  className: "st-block-control",

  attributes: function() {
    return {
      'data-type': this.block_type.type
    };
  },

  render: function() {
    this.$el.html('<span class="st-icon">'+ _.result(this.block_type, 'icon_name') +'</span>' + _.result(this.block_type, 'title'));
    return this;
  }
});

module.exports = BlockControl;

},{"./blocks":69,"./events":80,"./function-bind":89,"./lodash":94,"./renderable":95}],52:[function(require,module,exports){
"use strict";

/*
 * SirTrevor Block Controls
 * --
 * Gives an interface for adding new Sir Trevor blocks.
 */


var Blocks = require('./blocks');
var BlockControl = require('./block-control');
var EventBus = require('./event-bus');

var BlockControls = function(available_types, instance_scope) {
  this.instance_scope = instance_scope;
  this.available_types = available_types || [];
  this._ensureElement();
  this._bindFunctions();
  this.initialize();
};

Object.assign(BlockControls.prototype, require('./function-bind'), require('./renderable'), require('./events'), {

  bound: ['handleControlButtonClick'],
  block_controls: null,

  className: "st-block-controls",

  html: "<a class='st-icon st-icon--close'>" + i18n.t("general:close") + "</a>",

  initialize: function() {
    for(var block_type in this.available_types) {
      if (Blocks.hasOwnProperty(block_type)) {
        var block_control = new BlockControl(block_type, this.instance_scope);
        if (block_control.can_be_rendered) {
          this.$el.append(block_control.render().$el);
        }
      }
    }

    this.$el.delegate('.st-block-control', 'click', this.handleControlButtonClick);
  },

  show: function() {
    this.$el.addClass('st-block-controls--active');

    EventBus.trigger('block:controls:shown');
  },

  hide: function() {
    this.$el.removeClass('st-block-controls--active');

    EventBus.trigger('block:controls:hidden');
  },

  handleControlButtonClick: function(e) {
    e.stopPropagation();

    this.trigger('createBlock', $(e.currentTarget).attr('data-type'));
  }

});

module.exports = BlockControls;

},{"./block-control":51,"./blocks":69,"./event-bus":79,"./events":80,"./function-bind":89,"./renderable":95}],53:[function(require,module,exports){
"use strict";

var BlockDeletion = function() {
  this._ensureElement();
  this._bindFunctions();
};

Object.assign(BlockDeletion.prototype, require('./function-bind'), require('./renderable'), {

  tagName: 'a',
  className: 'st-block-ui-btn st-block-ui-btn--delete st-icon',

  attributes: {
    html: 'delete',
    'data-icon': 'bin'
  }

});

module.exports = BlockDeletion;

},{"./function-bind":89,"./renderable":95}],54:[function(require,module,exports){
"use strict";

var _ = require('./lodash');

var config = require('./config');
var utils = require('./utils');
var stToHTML = require('./to-html');
var stToMarkdown = require('./to-markdown');
var BlockMixins = require('./block_mixins');

var SimpleBlock = require('./simple-block');
var BlockReorder = require('./block.reorder');
var BlockDeletion = require('./block.deletion');
var BlockPositioner = require('./block.positioner');
var Formatters = require('./formatters');
var EventBus = require('./event-bus');

var Spinner = require('spin.js');

var Block = function(data, instance_id) {
  SimpleBlock.apply(this, arguments);
};

Block.prototype = Object.create(SimpleBlock.prototype);
Block.prototype.constructor = Block;

var delete_template = [
  "<div class='st-block__ui-delete-controls'>",
  "<label class='st-block__delete-label'>",
  "<%= i18n.t('general:delete') %>",
  "</label>",
  "<a class='st-block-ui-btn st-block-ui-btn--confirm-delete st-icon' data-icon='tick'></a>",
  "<a class='st-block-ui-btn st-block-ui-btn--deny-delete st-icon' data-icon='close'></a>",
  "</div>"
].join("\n");

var drop_options = {
  html: ['<div class="st-block__dropzone">',
    '<span class="st-icon"><%= _.result(block, "icon_name") %></span>',
    '<p><%= i18n.t("general:drop", { block: "<span>" + _.result(block, "title") + "</span>" }) %>',
    '</p></div>'].join('\n'),
    re_render_on_reorder: false
};

var paste_options = {
  html: ['<input type="text" placeholder="<%= i18n.t("general:paste") %>"',
    ' class="st-block__paste-input st-paste-block">'].join('')
};

var upload_options = {
  html: [
    '<div class="st-block__upload-container">',
    '<input type="file" type="st-file-upload">',
    '<button class="st-upload-btn"><%= i18n.t("general:upload") %></button>',
    '</div>'
  ].join('\n')
};

config.defaults.Block = {
  drop_options: drop_options,
  paste_options: paste_options,
  upload_options: upload_options
};

Object.assign(Block.prototype, SimpleBlock.fn, require('./block.validations'), {

  bound: ["_handleContentPaste", "_onFocus", "_onBlur", "onDrop", "onDeleteClick",
    "clearInsertedStyles", "getSelectionForFormatter", "onBlockRender"],

    className: 'st-block st-icon--add',

    attributes: function() {
      return Object.assign(SimpleBlock.fn.attributes.call(this), {
        'data-icon-after' : "add"
      });
    },

    icon_name: 'default',

    validationFailMsg: function() {
      return i18n.t('errors:validation_fail', { type: this.title() });
    },

    editorHTML: '<div class="st-block__editor"></div>',

    toolbarEnabled: true,

    droppable: false,
    pastable: false,
    uploadable: false,
    fetchable: false,
    ajaxable: false,

    drop_options: {},
    paste_options: {},
    upload_options: {},

    formattable: true,

    _previousSelection: '',

    initialize: function() {},

    toMarkdown: function(markdown){ return markdown; },
    toHTML: function(html){ return html; },

    withMixin: function(mixin) {
      if (!_.isObject(mixin)) { return; }

      var initializeMethod = "initialize" + mixin.mixinName;

      if (_.isUndefined(this[initializeMethod])) {
        Object.assign(this, mixin);
        this[initializeMethod]();
      }
    },

    render: function() {
      this.beforeBlockRender();
      this._setBlockInner();

      this.$editor = this.$inner.children().first();

      if(this.droppable || this.pastable || this.uploadable) {
        var input_html = $("<div>", { 'class': 'st-block__inputs' });
        this.$inner.append(input_html);
        this.$inputs = input_html;
      }

      if (this.hasTextBlock) { this._initTextBlocks(); }
      if (this.droppable) { this.withMixin(BlockMixins.Droppable); }
      if (this.pastable) { this.withMixin(BlockMixins.Pastable); }
      if (this.uploadable) { this.withMixin(BlockMixins.Uploadable); }
      if (this.fetchable) { this.withMixin(BlockMixins.Fetchable); }
      if (this.controllable) { this.withMixin(BlockMixins.Controllable); }

      if (this.formattable) { this._initFormatting(); }

      this._blockPrepare();

      return this;
    },

    remove: function() {
      if (this.ajaxable) {
        this.resolveAllInQueue();
      }

      this.$el.remove();
    },

    loading: function() {
      if(!_.isUndefined(this.spinner)) { this.ready(); }

      this.spinner = new Spinner(config.defaults.spinner);
      this.spinner.spin(this.$el[0]);

      this.$el.addClass('st--is-loading');
    },

    ready: function() {
      this.$el.removeClass('st--is-loading');
      if (!_.isUndefined(this.spinner)) {
        this.spinner.stop();
        delete this.spinner;
      }
    },

    /* Generic toData implementation.
     * Can be overwritten, although hopefully this will cover most situations
     */
    toData: function() {
      utils.log("toData for " + this.blockID);

      var dataObj = {};

      /* Simple to start. Add conditions later */
      if (this.hasTextBlock()) {
        var content = this.getTextBlock().html();
        if (content.length > 0) {
          dataObj.text = stToMarkdown(content, this.type);
        }
      }

      // Add any inputs to the data attr
      if(this.$(':input').not('.st-paste-block').length > 0) {
        this.$(':input').each(function(index,input){
          if (input.getAttribute('name')) {
            dataObj[input.getAttribute('name')] = input.value;
          }
        });
      }

      // Set
      if(!_.isEmpty(dataObj)) {
        this.setData(dataObj);
      }
    },

    /* Generic implementation to tell us when the block is active */
    focus: function() {
      this.getTextBlock().focus();
    },

    blur: function() {
      this.getTextBlock().blur();
    },

    onFocus: function() {
      this.getTextBlock().bind('focus', this._onFocus);
    },

    onBlur: function() {
      this.getTextBlock().bind('blur', this._onBlur);
    },

    /*
     * Event handlers
     */

    _onFocus: function() {
      this.trigger('blockFocus', this.$el);
    },

    _onBlur: function() {},

    onDrop: function(dataTransferObj) {},

    onDeleteClick: function(ev) {
      ev.preventDefault();

      var onDeleteConfirm = function(e) {
        e.preventDefault();
        this.trigger('removeBlock', this.blockID);
      };

      var onDeleteDeny = function(e) {
        e.preventDefault();
        this.$el.removeClass('st-block--delete-active');
        $delete_el.remove();
      };

      if (this.isEmpty()) {
        onDeleteConfirm.call(this, new Event('click'));
        return;
      }

      this.$inner.append(_.template(delete_template));
      this.$el.addClass('st-block--delete-active');

      var $delete_el = this.$inner.find('.st-block__ui-delete-controls');

      this.$inner.on('click', '.st-block-ui-btn--confirm-delete',
                     onDeleteConfirm.bind(this))
                     .on('click', '.st-block-ui-btn--deny-delete',
                         onDeleteDeny.bind(this));
    },

    pastedMarkdownToHTML: function(content) {
      return stToHTML(stToMarkdown(content, this.type), this.type);
    },

    onContentPasted: function(event, target){
      target.html(this.pastedMarkdownToHTML(target[0].innerHTML));
      this.getTextBlock().caretToEnd();
    },

    beforeLoadingData: function() {
      this.loading();

      if(this.droppable || this.uploadable || this.pastable) {
        this.$editor.show();
        this.$inputs.hide();
      }

      SimpleBlock.fn.beforeLoadingData.call(this);

      this.ready();
    },

    _handleContentPaste: function(ev) {
      setTimeout(this.onContentPasted.bind(this, ev, $(ev.currentTarget)), 0);
    },

    _getBlockClass: function() {
      return 'st-block--' + this.className;
    },

    /*
     * Init functions for adding functionality
     */

    _initUIComponents: function() {

      var positioner = new BlockPositioner(this.$el, this.instanceID);

      this._withUIComponent(
        positioner, '.st-block-ui-btn--reorder', positioner.toggle
      );

      this._withUIComponent(
        new BlockReorder(this.$el)
      );

      this._withUIComponent(
        new BlockDeletion(), '.st-block-ui-btn--delete', this.onDeleteClick
      );

      this.onFocus();
      this.onBlur();
    },

    _initFormatting: function() {
      // Enable formatting keyboard input
      var formatter;
      for (var name in Formatters) {
        if (Formatters.hasOwnProperty(name)) {
          formatter = Formatters[name];
          if (!_.isUndefined(formatter.keyCode)) {
            formatter._bindToBlock(this.$el);
          }
        }
      }
    },

    _initTextBlocks: function() {
      this.getTextBlock()
      .bind('paste', this._handleContentPaste)
      .bind('keyup', this.getSelectionForFormatter)
      .bind('mouseup', this.getSelectionForFormatter)
      .bind('DOMNodeInserted', this.clearInsertedStyles);
    },

    getSelectionForFormatter: function() {
      var block = this;
      setTimeout(function() {
        var selection = window.getSelection(),
        selectionStr = selection.toString().trim(),
        eventType = (selectionStr === '') ? 'hide' : 'position';

        EventBus.trigger('formatter:' + eventType, block);
      }, 1);
    },

    clearInsertedStyles: function(e) {
      var target = e.target;
      target.removeAttribute('style'); // Hacky fix for Chrome.
    },

    hasTextBlock: function() {
      return this.getTextBlock().length > 0;
    },

    getTextBlock: function() {
      if (_.isUndefined(this.text_block)) {
        this.text_block = this.$('.st-text-block');
      }

      return this.text_block;
    },

    isEmpty: function() {
      return _.isEmpty(this.saveAndGetData());
    }

});

Block.extend = require('./helpers/extend'); // Allow our Block to be extended.

module.exports = Block;

},{"./block.deletion":53,"./block.positioner":55,"./block.reorder":56,"./block.validations":58,"./block_mixins":63,"./config":77,"./event-bus":79,"./formatters":88,"./helpers/extend":91,"./lodash":94,"./simple-block":96,"./to-html":97,"./to-markdown":98,"./utils":99,"spin.js":50}],55:[function(require,module,exports){
"use strict";


var EventBus = require('./event-bus');

var template = [
  "<div class='st-block-positioner__inner'>",
  "<span class='st-block-positioner__selected-value'></span>",
  "<select class='st-block-positioner__select'></select>",
  "</div>"
].join("\n");

var BlockPositioner = function(block_element, instance_id) {
  this.$block = block_element;
  this.instanceID = instance_id;
  this.total_blocks = 0;

  this._ensureElement();
  this._bindFunctions();

  this.initialize();
};

Object.assign(BlockPositioner.prototype, require('./function-bind'), require('./renderable'), {

  bound: ['onBlockCountChange', 'onSelectChange', 'toggle', 'show', 'hide'],

  className: 'st-block-positioner',
  visibleClass: 'st-block-positioner--is-visible',

  initialize: function(){
    this.$el.append(template);
    this.$select = this.$('.st-block-positioner__select');

    this.$select.on('change', this.onSelectChange);

    EventBus.on(this.instanceID + ":blocks:count_update", this.onBlockCountChange);
  },

  onBlockCountChange: function(new_count) {
    if (new_count !== this.total_blocks) {
      this.total_blocks = new_count;
      this.renderPositionList();
    }
  },

  onSelectChange: function() {
    var val = this.$select.val();
    if (val !== 0) {
      EventBus.trigger(this.instanceID + ":blocks:change_position",
                       this.$block, val, (val === 1 ? 'before' : 'after'));
                       this.toggle();
    }
  },

  renderPositionList: function() {
    var inner = "<option value='0'>" + i18n.t("general:position") + "</option>";
    for(var i = 1; i <= this.total_blocks; i++) {
      inner += "<option value="+i+">"+i+"</option>";
    }
    this.$select.html(inner);
  },

  toggle: function() {
    this.$select.val(0);
    this.$el.toggleClass(this.visibleClass);
  },

  show: function(){
    this.$el.addClass(this.visibleClass);
  },

  hide: function(){
    this.$el.removeClass(this.visibleClass);
  }

});

module.exports = BlockPositioner;

},{"./event-bus":79,"./function-bind":89,"./renderable":95}],56:[function(require,module,exports){
"use strict";

var _ = require('./lodash');

var EventBus = require('./event-bus');

var BlockReorder = function(block_element) {
  this.$block = block_element;
  this.blockID = this.$block.attr('id');

  this._ensureElement();
  this._bindFunctions();

  this.initialize();
};

Object.assign(BlockReorder.prototype, require('./function-bind'), require('./renderable'), {

  bound: ['onMouseDown', 'onClick', 'onDragStart', 'onDragEnd', 'onDrag', 'onDrop'],

  className: 'st-block-ui-btn st-block-ui-btn--reorder st-icon',
  tagName: 'a',

  attributes: function() {
    return {
      'html': 'reorder',
      'draggable': 'true',
      'data-icon': 'move'
    };
  },

  initialize: function() {
    this.$el.bind('mousedown touchstart', this.onMouseDown)
    .bind('click', this.onClick)
    .bind('dragstart', this.onDragStart)
    .bind('dragend touchend', this.onDragEnd)
    .bind('drag touchmove', this.onDrag);

    this.$block.dropArea()
    .bind('drop', this.onDrop);
  },

  onMouseDown: function() {
    EventBus.trigger("block:reorder:down", this.blockID);
  },

  onDrop: function(ev) {
    ev.preventDefault();

    var dropped_on = this.$block,
    item_id = ev.originalEvent.dataTransfer.getData("text/plain"),
    block = $('#' + item_id);

    if (!_.isUndefined(item_id) &&
        !_.isEmpty(block) &&
          dropped_on.attr('id') !== item_id &&
            dropped_on.attr('data-instance') === block.attr('data-instance')
       ) {
         dropped_on.after(block);
       }
       EventBus.trigger("block:reorder:dropped", item_id);
  },

  onDragStart: function(ev) {
    var btn = $(ev.currentTarget).parent();

    ev.originalEvent.dataTransfer.setDragImage(this.$block[0], btn.position().left, btn.position().top);
    ev.originalEvent.dataTransfer.setData('Text', this.blockID);

    EventBus.trigger("block:reorder:dragstart", this.blockID);
    this.$block.addClass('st-block--dragging');
  },

  onDragEnd: function(ev) {
    EventBus.trigger("block:reorder:dragend", this.blockID);
    this.$block.removeClass('st-block--dragging');
  },

  onDrag: function(ev){},

  onClick: function() {
  },

  render: function() {
    return this;
  }

});

module.exports = BlockReorder;

},{"./event-bus":79,"./function-bind":89,"./lodash":94,"./renderable":95}],57:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var utils = require('./utils');

var EventBus = require('./event-bus');

module.exports = {

  blockStorage: {},

  createStore: function(blockData) {
    this.blockStorage = {
      type: utils.underscored(this.type),
      data: blockData || {}
    };
  },

  save: function() { this.toData(); },

  saveAndReturnData: function() {
    this.save();
    return this.blockStorage;
  },

  saveAndGetData: function() {
    var store = this.saveAndReturnData();
    return store.data || store;
  },

  getData: function() {
    return this.blockStorage.data;
  },

  setData: function(blockData) {
    utils.log("Setting data for block " + this.blockID);
    Object.assign(this.blockStorage.data, blockData || {});
  },

  setAndRetrieveData: function(blockData) {
    this.setData(blockData);
    return this.getData();
  },

  setAndLoadData: function(blockData) {
    this.setData(blockData);
    this.beforeLoadingData();
  },

  toData: function() {},
  loadData: function() {},

  beforeLoadingData: function() {
    utils.log("loadData for " + this.blockID);
    EventBus.trigger("block:loadData", this.blockID);
    this.loadData(this.getData());
  },

  _loadData: function() {
    utils.log("_loadData is deprecated and will be removed in the future. Please use beforeLoadingData instead.");
    this.beforeLoadingData();
  },

  checkAndLoadData: function() {
    if (!_.isEmpty(this.getData())) {
      this.beforeLoadingData();
    }
  }

};

},{"./event-bus":79,"./lodash":94,"./utils":99}],58:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var utils = require('./utils');

var bestNameFromField = function(field) {
  var msg = field.attr("data-st-name") || field.attr("name");

  if (!msg) {
    msg = 'Field';
  }

  return utils.capitalize(msg);
};

module.exports = {

  errors: [],

  valid: function(){
    this.performValidations();
    return this.errors.length === 0;
  },

  // This method actually does the leg work
  // of running our validators and custom validators
  performValidations: function() {
    this.resetErrors();

    var required_fields = this.$('.st-required');
    required_fields.each(function (i, f) {
      this.validateField(f);
    }.bind(this));
    this.validations.forEach(this.runValidator, this);

    this.$el.toggleClass('st-block--with-errors', this.errors.length > 0);
  },

  // Everything in here should be a function that returns true or false
  validations: [],

  validateField: function(field) {
    field = $(field);

    var content = field.attr('contenteditable') ? field.text() : field.val();

    if (content.length === 0) {
      this.setError(field, i18n.t("errors:block_empty",
                                 { name: bestNameFromField(field) }));
    }
  },

  runValidator: function(validator) {
    if (!_.isUndefined(this[validator])) {
      this[validator].call(this);
    }
  },

  setError: function(field, reason) {
    var $msg = this.addMessage(reason, "st-msg--error");
    field.addClass('st-error');

    this.errors.push({ field: field, reason: reason, msg: $msg });
  },

  resetErrors: function() {
    this.errors.forEach(function(error){
      error.field.removeClass('st-error');
      error.msg.remove();
    });

    this.$messages.removeClass("st-block__messages--is-visible");
    this.errors = [];
  }

};

},{"./lodash":94,"./utils":99}],59:[function(require,module,exports){
"use strict";

var utils = require('../utils');

var EventBus = require('../event-bus');

module.exports = {

  mixinName: "Ajaxable",

  ajaxable: true,

  initializeAjaxable: function(){
    this._queued = [];
  },

  addQueuedItem: function(name, deferred) {
    utils.log("Adding queued item for " + this.blockID + " called " + name);
    EventBus.trigger("onUploadStart", this.blockID);

    this._queued.push({ name: name, deferred: deferred });
  },

  removeQueuedItem: function(name) {
    utils.log("Removing queued item for " + this.blockID + " called " + name);
    EventBus.trigger("onUploadStop", this.blockID);

    this._queued = this._queued.filter(function(queued) {
      return queued.name !== name;
    });
  },

  hasItemsInQueue: function() {
    return this._queued.length > 0;
  },

  resolveAllInQueue: function() {
    this._queued.forEach(function(item){
      utils.log("Aborting queued request: " + item.name);
      item.deferred.abort();
    }, this);
  }

};

},{"../event-bus":79,"../utils":99}],60:[function(require,module,exports){
"use strict";

var utils = require('../utils');

module.exports = {

  mixinName: "Controllable",

  initializeControllable: function() {
    utils.log("Adding controllable to block " + this.blockID);
    this.$control_ui = $('<div>', {'class': 'st-block__control-ui'});
    Object.keys(this.controls).forEach(
      function(cmd) {
        // Bind configured handler to current block context
        this.addUiControl(cmd, this.controls[cmd].bind(this));
      },
      this
    );
    this.$inner.append(this.$control_ui);
  },

  getControlTemplate: function(cmd) {
    return $("<a>",
      { 'data-icon': cmd,
        'class': 'st-icon st-block-control-ui-btn st-block-control-ui-btn--' + cmd
      });
  },

  addUiControl: function(cmd, handler) {
    this.$control_ui.append(this.getControlTemplate(cmd));
    this.$control_ui.on('click', '.st-block-control-ui-btn--' + cmd, handler);
  }
};

},{"../utils":99}],61:[function(require,module,exports){
"use strict";

/* Adds drop functionaltiy to this block */

var _ = require('../lodash');
var config = require('../config');
var utils = require('../utils');

var EventBus = require('../event-bus');

module.exports = {

  mixinName: "Droppable",
  valid_drop_file_types: ['File', 'Files', 'text/plain', 'text/uri-list'],

  initializeDroppable: function() {
    utils.log("Adding droppable to block " + this.blockID);

    this.drop_options = Object.assign({}, config.defaults.Block.drop_options, this.drop_options);

    var drop_html = $(_.template(this.drop_options.html)({ block: this, _: _ }));

    //this.$editor.hide();
    this.$inputs.append(drop_html);
      if (this.$('.upload-area').length !== 0) {
          this.$('.upload-area').append(drop_html);
      } else {
          this.$inputs.append(drop_html);
      }
    this.$dropzone = drop_html;

    // Bind our drop event
    this.$dropzone.dropArea()
                  .bind('drop', this._handleDrop.bind(this));

    this.$inner.addClass('st-block__inner--droppable');
  },

  _handleDrop: function(e) {
    e.preventDefault();

    e = e.originalEvent;

    var el = $(e.target),
        types = e.dataTransfer.types;

    el.removeClass('st-dropzone--dragover');

    /*
      Check the type we just received,
      delegate it away to our blockTypes to process
    */

    if (types &&
        types.some(function(type) {
                     return this.valid_drop_file_types.includes(type);
                   }, this)) {
      this.onDrop(e.dataTransfer);
    }

    EventBus.trigger('block:content:dropped', this.blockID);
  }

};

},{"../config":77,"../event-bus":79,"../lodash":94,"../utils":99}],62:[function(require,module,exports){
"use strict";

var _ = require('../lodash');

module.exports = {

  mixinName: "Fetchable",

  initializeFetchable: function(){
    this.withMixin(require('./ajaxable'));
  },

  fetch: function(options, success, failure){
    var uid = _.uniqueId(this.blockID + "_fetch"),
        xhr = $.ajax(options);

    this.resetMessages();
    this.addQueuedItem(uid, xhr);

    if(!_.isUndefined(success)) {
      xhr.done(success.bind(this));
    }

    if(!_.isUndefined(failure)) {
      xhr.fail(failure.bind(this));
    }

    xhr.always(this.removeQueuedItem.bind(this, uid));

    return xhr;
  }

};

},{"../lodash":94,"./ajaxable":59}],63:[function(require,module,exports){
"use strict";

module.exports = {
  Ajaxable: require('./ajaxable.js'),
  Controllable: require('./controllable.js'),
  Droppable: require('./droppable.js'),
  Fetchable: require('./fetchable.js'),
  Pastable: require('./pastable.js'),
  Uploadable: require('./uploadable.js'),
};

},{"./ajaxable.js":59,"./controllable.js":60,"./droppable.js":61,"./fetchable.js":62,"./pastable.js":64,"./uploadable.js":65}],64:[function(require,module,exports){
"use strict";

var _ = require('../lodash');
var config = require('../config');
var utils = require('../utils');

module.exports = {

  mixinName: "Pastable",

  initializePastable: function() {
    utils.log("Adding pastable to block " + this.blockID);

    this.paste_options = Object.assign({}, config.defaults.Block.paste_options, this.paste_options);
    this.$inputs.append(_.template(this.paste_options.html, this));

    this.$('.st-paste-block')
      .bind('click', function(){ $(this).select(); })
      .bind('paste', this._handleContentPaste)
      .bind('submit', this._handleContentPaste);
  }

};

},{"../config":77,"../lodash":94,"../utils":99}],65:[function(require,module,exports){
"use strict";

var _ = require('../lodash');
var config = require('../config');
var utils = require('../utils');

var fileUploader = require('../extensions/sir-trevor.uploader');

module.exports = {

  mixinName: "Uploadable",

  uploadsCount: 0,

  initializeUploadable: function() {
    utils.log("Adding uploadable to block " + this.blockID);
    this.withMixin(require('./ajaxable'));

    this.upload_options = Object.assign({}, config.defaults.Block.upload_options, this.upload_options);
    if (this.$('.upload-area').length !== 0) {
        this.$('.upload-area').append(_.template(this.upload_options.html, this));
    } else {
        this.$inputs.append(_.template(this.upload_options.html, this));
    }
  },

  uploader: function(file, success, failure){
    return fileUploader(this, file, success, failure);
  }

};

},{"../config":77,"../extensions/sir-trevor.uploader":83,"../lodash":94,"../utils":99,"./ajaxable":59}],66:[function(require,module,exports){
"use strict";

/*
  Block Quote
*/

var _ = require('../lodash');

var Block = require('../block');
var stToHTML = require('../to-html');

var template = _.template([
  '<blockquote class="st-required st-text-block" contenteditable="true"></blockquote>',
  '<label class="st-input-label"> <%= i18n.t("blocks:quote:credit_field") %></label>',
  '<input maxlength="140" name="cite" placeholder="<%= i18n.t("blocks:quote:credit_field") %>"',
  ' class="st-input-string st-required js-cite-input" type="text" />'
].join("\n"));

module.exports = Block.extend({

  type: "quote",

  title: function(){ return i18n.t('blocks:quote:title'); },

  icon_name: 'quote',

  editorHTML: function() {
    return template(this);
  },

  loadData: function(data){
    this.getTextBlock().html(stToHTML(data.text, this.type));
    this.$('.js-cite-input').val(data.cite);
  },

  toMarkdown: function(markdown) {
    return markdown.replace(/^(.+)$/mg,"> $1");
  }

});

},{"../block":54,"../lodash":94,"../to-html":97}],67:[function(require,module,exports){
"use strict";

/*
  Heading Block
*/

var Block = require('../block');
var stToHTML = require('../to-html');

module.exports = Block.extend({

  type: 'heading',

  title: function(){ return i18n.t('blocks:heading:title'); },

  editorHTML: '<div class="st-required st-text-block st-text-block--heading" contenteditable="true"></div>',

  icon_name: 'heading',

  loadData: function(data){
    this.getTextBlock().html(stToHTML(data.text, this.type));
  }
});

},{"../block":54,"../to-html":97}],68:[function(require,module,exports){
"use strict";

/*
  Simple Image Block
*/


var Block = require('../block');

module.exports = Block.extend({

  type: "image",
  title: function() { return i18n.t('blocks:image:title'); },

  droppable: true,
  uploadable: true,

  icon_name: 'image',

  loadData: function(data){
    // Create our image tag
    this.$editor.html($('<img>', { src: data.file.url }));
  },

  onBlockRender: function(){
    /* Setup the upload button */
    this.$inputs.find('button').bind('click', function(ev){ ev.preventDefault(); });
    this.$inputs.find('input').on('change', (function(ev) {
      this.onDrop(ev.currentTarget);
    }).bind(this));
  },

  onUploadSuccess : function(data) {
    this.setData(data);
    this.ready();
  },

  onUploadError : function(jqXHR, status, errorThrown){
    this.addMessage(i18n.t('blocks:image:upload_error'));
    this.ready();
  },

  onDrop: function(transferData){
    var file = transferData.files[0],
        urlAPI = (typeof URL !== "undefined") ? URL : (typeof webkitURL !== "undefined") ? webkitURL : null;

    // Handle one upload at a time
    if (/image/.test(file.type)) {
      this.loading();
      // Show this image on here
      this.$inputs.hide();
      this.$editor.html($('<img>', { src: urlAPI.createObjectURL(file) })).show();

      this.uploader(file, this.onUploadSuccess, this.onUploadError);
    }
  }
});

},{"../block":54}],69:[function(require,module,exports){
"use strict";

module.exports = {
    Text: require('./text'),
    Quote: require('./block-quote'),
    Image: require('./image'),
    Heading: require('./heading'),
    List: require('./unordered-list'),
    Tweet: require('./tweet'),
    Video: require('./video'),
    Wysihtml: require('./wysihtml'),
    Redactor: require('./redactor'),
    Textimage: require('./text-image') 
};

},{"./block-quote":66,"./heading":67,"./image":68,"./redactor":70,"./text":72,"./text-image":71,"./tweet":73,"./unordered-list":74,"./video":75,"./wysihtml":76}],70:[function(require,module,exports){
"use strict";

/*
 Redactor Editor Block
 Make sure you initialize(loaded) following dependencies in your system to make this block work:
 redactor, fontawesome
 */

var Block = require('../block');
var stToHTML = require('../to-html');
var timeStamp = null;

module.exports = Block.extend({

    type: "redactor",

    title: function() { return 'Redactor'; },

    editorHTML: function() {
        timeStamp = Date.now();
        return '<div id="redactor-editor-' + timeStamp + '" class="st-required st-text-block" contenteditable="true"></div>';
    },

    icon_name: '<i class="fa fa-pencil-square-o"></i>',

    onBlockRender : function () {
        $('#redactor-editor-' + timeStamp).redactor();
    },

    loadData: function(data){
        this.getTextBlock().html(stToHTML(data.text, this.type));
    }
});

},{"../block":54,"../to-html":97}],71:[function(require,module,exports){
"use strict";

/*
 Block Text and Image
 Make sure you initialize(loaded) following dependencies in your system to make this block work:
 fontawesome
 */

var _ = require('../lodash');

var Block = require('../block');
var stToHTML = require('../to-html');
var BlockMixins = require('../block_mixins');

var template = _.template([
    '<div class="st-text-image">',
        '<div class="row">',
            '<div class="col-12">',
                '<label class="st-input-label"><%= i18n.t("blocks:textimage:heading_field") %></label>',
                '<input maxlength="140" name="title" placeholder="<%= i18n.t("blocks:textimage:heading_field") %>"',
                ' class="st-input-string st-required js-title-input" type="text" />',
            '</div>',
            '<div class="col-12">',
            '<label class="st-input-label">Text</label>',
                '<div id="wysihtml-editor" class="st-required st-text-block" contenteditable="true"></div>',
            '</div>',
        '</div>',
        '<div class="row">',
            '<div class="col-6 upload-area"></div>',
            '<div class="col-6 img-preview"></div>',
            '<div class="col-12">',
                '<label class="st-input-label">Image Alt</label>',
                '<input maxlength="140" name="imagealt" placeholder="Image Alt"',
                ' class="st-input-string js-image-alt-input" type="text" />',
            '</div>',
            '<div class="col-12">',
                '<label class="st-input-label"><%= i18n.t("blocks:textimage:image_align") %></label>',
                '<select name="imagealign" class="st-select-string st-required js-image-align"><option value="left">Left</option><option value="right">Right</option></select>',
            '</div>',
        '</div>',
        '<div class="row">',
            '<div class="col-12">',
                '<label class="st-input-label">Link Text</label>',
                '<input maxlength="140" name="linktext" placeholder="Link Text"',
                ' class="st-input-string js-link-text-input" type="text" />',
            '</div>',
            '<div class="col-12">',
                '<label class="st-input-label">Link URL</label>',
                '<input maxlength="140" name="linkurl" placeholder="Link URL"',
                ' class="st-input-string js-link-url-input" type="text" />',
            '</div>',
        '</div>',
    '</div>'
].join("\n"));

module.exports = Block.extend({

    type: "textimage",

    title: function(){ return i18n.t('blocks:textimage:title'); },

    droppable: true,
    uploadable: true,

    icon_name: '<i class="fa fa-newspaper-o"></i>',

    editorHTML: function() {
        return template(this);
    },

    loadData: function(data){
        this.getTextBlock().html(stToHTML(data.text, this.type));
        this.$('.js-title-input').val(data.title);
        this.$('.js-image-alt-input').val(data.imagealt);
        this.$('.js-image-align').val(data.imagealign);
        this.$('.js-link-text-input').val(data.linktext);
        this.$('.js-link-url-input').val(data.linkurl);
        // Create our image tag
        this.$('.img-preview').html($('<img>', { src: data.file.url }));
    },

    //beforeBlockRender: function () {
    //    //var input_html = $("<div>", { 'class': 'st-block__inputs' });
    //    //this.$inner.append(input_html);
    //    //this.$inputs = input_html;
    //
    //    this.withMixin(BlockMixins.Uploadable);
    //},

    onBlockRender: function(){
        /* Setup the upload button */
        this.$inputs.find('button').bind('click', function(ev){ ev.preventDefault(); });
        this.$inputs.find('input').on('change', (function(ev) {
            this.onDrop(ev.currentTarget);
        }).bind(this));
    },

    onUploadSuccess : function(data) {
        this.setData(data);
        this.ready();
    },

    onUploadError : function(jqXHR, status, errorThrown){
        this.addMessage(i18n.t('blocks:image:upload_error'));
        this.ready();
    },

    onDrop: function(transferData){
        var file = transferData.files[0],
            urlAPI = (typeof URL !== "undefined") ? URL : (typeof webkitURL !== "undefined") ? webkitURL : null;

        // Handle one upload at a time
        if (/image/.test(file.type)) {
            this.loading();
            // Show this image on here
            //this.$inputs.hide();
            this.$('.img-preview').html($('<img>', { src: urlAPI.createObjectURL(file) })).show();

            this.uploader(file, this.onUploadSuccess, this.onUploadError);
        }
    }

});

},{"../block":54,"../block_mixins":63,"../lodash":94,"../to-html":97}],72:[function(require,module,exports){
"use strict";

/*
  Text Block
*/

var Block = require('../block');
var stToHTML = require('../to-html');

module.exports = Block.extend({

  type: "text",

  title: function() { return i18n.t('blocks:text:title'); },

  editorHTML: '<div class="st-required st-text-block" contenteditable="true"></div>',

  icon_name: 'text',

  loadData: function(data){
    this.getTextBlock().html(stToHTML(data.text, this.type));
  }
});

},{"../block":54,"../to-html":97}],73:[function(require,module,exports){
"use strict";

var _ = require('../lodash');
var utils = require('../utils');

var Block = require('../block');

var tweet_template = _.template([
  "<blockquote class='twitter-tweet' align='center'>",
  "<p><%= text %></p>",
  "&mdash; <%= user.name %> (@<%= user.screen_name %>)",
  "<a href='<%= status_url %>' data-datetime='<%= created_at %>'><%= created_at %></a>",
  "</blockquote>",
  '<script src="//platform.twitter.com/widgets.js" charset="utf-8"></script>'
].join("\n"));

module.exports = Block.extend({

  type: "tweet",
  droppable: true,
  pastable: true,
  fetchable: true,

  drop_options: {
    re_render_on_reorder: true
  },

  title: function(){ return i18n.t('blocks:tweet:title'); },

  fetchUrl: function(tweetID) {
    return "/tweets/?tweet_id=" + tweetID;
  },

  icon_name: 'twitter',

  loadData: function(data) {
    if (_.isUndefined(data.status_url)) { data.status_url = ''; }
    this.$inner.find('iframe').remove();
    this.$inner.prepend(tweet_template(data));
  },

  onContentPasted: function(event){
    // Content pasted. Delegate to the drop parse method
    var input = $(event.target),
    val = input.val();

    // Pass this to the same handler as onDrop
    this.handleTwitterDropPaste(val);
  },

  handleTwitterDropPaste: function(url){
    if (!this.validTweetUrl(url)) {
      utils.log("Invalid Tweet URL");
      return;
    }

    // Twitter status
    var tweetID = url.match(/[^\/]+$/);
    if (!_.isEmpty(tweetID)) {
      this.loading();
      tweetID = tweetID[0];

      var ajaxOptions = {
        url: this.fetchUrl(tweetID),
        dataType: "json"
      };

      this.fetch(ajaxOptions, this.onTweetSuccess, this.onTweetFail);
    }
  },

  validTweetUrl: function(url) {
    return (utils.isURI(url) &&
            url.indexOf("twitter") !== -1 &&
            url.indexOf("status") !== -1);
  },

  onTweetSuccess: function(data) {
    // Parse the twitter object into something a bit slimmer..
    var obj = {
      user: {
        profile_image_url: data.user.profile_image_url,
        profile_image_url_https: data.user.profile_image_url_https,
        screen_name: data.user.screen_name,
        name: data.user.name
      },
      id: data.id_str,
      text: data.text,
      created_at: data.created_at,
      entities: data.entities,
      status_url: "https://twitter.com/" + data.user.screen_name + "/status/" + data.id_str
    };

    this.setAndLoadData(obj);
    this.ready();
  },

  onTweetFail: function() {
    this.addMessage(i18n.t("blocks:tweet:fetch_error"));
    this.ready();
  },

  onDrop: function(transferData){
    var url = transferData.getData('text/plain');
    this.handleTwitterDropPaste(url);
  }
});

},{"../block":54,"../lodash":94,"../utils":99}],74:[function(require,module,exports){
"use strict";

/*
   Unordered List
   */

var _ = require('../lodash');

var Block = require('../block');
var stToHTML = require('../to-html');

var template = '<div class="st-text-block st-required" contenteditable="true"><ul><li></li></ul></div>';

module.exports = Block.extend({

  type: 'list',

  title: function() { return i18n.t('blocks:list:title'); },

  icon_name: 'list',

  editorHTML: function() {
    return _.template(template, this);
  },

  loadData: function(data){
    this.getTextBlock().html("<ul>" + stToHTML(data.text, this.type) + "</ul>");
  },

  onBlockRender: function() {
    this.checkForList = this.checkForList.bind(this);
    this.getTextBlock().on('click keyup', this.checkForList);
  },

  checkForList: function() {
    if (this.$('ul').length === 0) {
      document.execCommand("insertUnorderedList", false, false);
    }
  },

  toMarkdown: function(markdown) {
    return markdown.replace(/<\/li>/mg,"\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/^(.+)$/mg," - $1");
  },

  toHTML: function(html) {
    html = html.replace(/^ - (.+)$/mg,"<li>$1</li>")
    .replace(/\n/mg, "");

    return html;
  },

  onContentPasted: function(event, target) {
    this.$('ul').html(
      this.pastedMarkdownToHTML(target[0].innerHTML));
    this.getTextBlock().caretToEnd();
  },

  isEmpty: function() {
    return _.isEmpty(this.saveAndGetData().text);
  }

});

},{"../block":54,"../lodash":94,"../to-html":97}],75:[function(require,module,exports){
"use strict";

var _ = require('../lodash');
var utils = require('../utils');

var Block = require('../block');

module.exports = Block.extend({

  // more providers at https://gist.github.com/jeffling/a9629ae28e076785a14f
  providers: {
    vimeo: {
      regex: /(?:http[s]?:\/\/)?(?:www.)?vimeo.com\/(.+)/,
      html: "<iframe src=\"{{protocol}}//player.vimeo.com/video/{{remote_id}}?title=0&byline=0\" width=\"580\" height=\"320\" frameborder=\"0\"></iframe>"
    },
    youtube: {
      regex: /(?:http[s]?:\/\/)?(?:www.)?(?:(?:youtube.com\/watch\?(?:.*)(?:v=))|(?:youtu.be\/))([^&].+)/,
      html: "<iframe src=\"{{protocol}}//www.youtube.com/embed/{{remote_id}}\" width=\"580\" height=\"320\" frameborder=\"0\" allowfullscreen></iframe>"
    }
  },

  type: 'video',
  title: function() { return i18n.t('blocks:video:title'); },

  droppable: true,
  pastable: true,

  icon_name: 'video',

  loadData: function(data){
    if (!this.providers.hasOwnProperty(data.source)) { return; }

    if (this.providers[data.source].square) {
      this.$editor.addClass('st-block__editor--with-square-media');
    } else {
      this.$editor.addClass('st-block__editor--with-sixteen-by-nine-media');
    }

    var embed_string = this.providers[data.source].html
    .replace('{{protocol}}', window.location.protocol)
    .replace('{{remote_id}}', data.remote_id)
    .replace('{{width}}', this.$editor.width()); // for videos that can't resize automatically like vine

    this.$editor.html(embed_string);
  },

  onContentPasted: function(event){
    this.handleDropPaste($(event.target).val());
  },

  handleDropPaste: function(url){
    if(!utils.isURI(url)) {
      return;
    }

    var match, data;

    this.providers.forEach(function(provider, index) {
      match = provider.regex.exec(url);

      if(match !== null && !_.isUndefined(match[1])) {
        data = {
          source: index,
          remote_id: match[1]
        };

        this.setAndLoadData(data);
      }
    }, this);
  },

  onDrop: function(transferData){
    var url = transferData.getData('text/plain');
    this.handleDropPaste(url);
  }
});


},{"../block":54,"../lodash":94,"../utils":99}],76:[function(require,module,exports){
"use strict";

/*
 Wysihtml Editor Block
 Make sure you initialize(loaded) following dependencies in your system to make this block work:
 bootstrap, bootstrap3-wysihtml5-bower, fontawesome
 */

/*
 Text Block
 */

var Block = require('../block');
var stToHTML = require('../to-html');
var timeStamp = null;

module.exports = Block.extend({

    type: "wysihtml",

    title: function() { return 'wysihtml'; },

    editorHTML: function() {
        timeStamp = Date.now();
        return '<div id="wysihtml-editor-' + timeStamp + '" class="st-required st-text-block" contenteditable="true"></div>';
    },

    icon_name: 'text',

    onBlockRender : function () {
        $('#wysihtml-editor-' + timeStamp).wysihtml5();
    },

    loadData: function(data){
        this.getTextBlock().html(stToHTML(data.text, this.type));
    }
});

},{"../block":54,"../to-html":97}],77:[function(require,module,exports){
"use strict";

module.exports = {
  debug: false,
  skipValidation: false,
  version: "0.3.0",
  language: "en",

  instances: [],

  defaults: {
    defaultType: false,
    spinner: {
      className: 'st-spinner',
      lines: 9,
      length: 8,
      width: 3,
      radius: 6,
      color: '#000',
      speed: 1.4,
      trail: 57,
      shadow: false,
      left: '50%',
      top: '50%'
    },
    blockLimit: 0,
    blockTypeLimits: {},
    required: [],
    uploadUrl: '/attachments',
    baseImageUrl: '/sir-trevor-uploads/',
    errorsContainer: undefined,
    toMarkdown: {
      aggresiveHTMLStrip: false
    }
  }
};

},{}],78:[function(require,module,exports){
"use strict";

/*
 * Sir Trevor Editor
 * --
 * Represents one Sir Trevor editor instance (with multiple blocks)
 * Each block references this instance.
 * BlockTypes are global however.
 */

var _ = require('./lodash');
var config = require('./config');
var utils = require('./utils');

var EventBus = require('./event-bus');
var FormEvents = require('./form-events');
var Blocks = require('./blocks');
var BlockControls = require('./block-controls');
var FloatingBlockControls = require('./floating-block-controls');
var FormatBar = require('./format-bar');
var editorStore = require('./extensions/sir-trevor.editor-store');

var Editor = function(options) {
  this.initialize(options);
};

Object.assign(Editor.prototype, require('./function-bind'), require('./events'), {

  bound: ['onFormSubmit', 'showBlockControls', 'hideAllTheThings',
    'hideBlockControls', 'onNewBlockCreated', 'changeBlockPosition',
    'onBlockDragStart', 'onBlockDragEnd', 'removeBlockDragOver',
    'onBlockDropped', 'createBlock'], 

  events: {
    'block:reorder:down':       'hideBlockControls',
    'block:reorder:dragstart':  'onBlockDragStart',
    'block:reorder:dragend':    'onBlockDragEnd',
    'block:content:dropped':    'removeBlockDragOver',
    'block:reorder:dropped':    'onBlockDropped',
    'block:create:new':         'onNewBlockCreated'
  },

  initialize: function(options) {
    utils.log("Init SirTrevor.Editor");

    this.blockTypes = {};
    this.blockCounts = {}; // Cached block type counts
    this.blocks = []; // Block references
    this.errors = [];
    this.options = Object.assign({}, config.defaults, options || {});
    this.ID = _.uniqueId('st-editor-');

    if (!this._ensureAndSetElements()) { return false; }

    if(!_.isUndefined(this.options.onEditorRender) && _.isFunction(this.options.onEditorRender)) {
      this.onEditorRender = this.options.onEditorRender;
    }

    this._setRequired();
    this._setBlocksTypes();
    this._bindFunctions();

    this.store("create");

    config.instances.push(this);

    this.build();

    FormEvents.bindFormSubmit(this.$form);
  },

  /* Build the Editor instance.
   * Check to see if we've been passed JSON already, and if not try and create
   * a default block. If we have JSON then we need to build all of our blocks
   * from this.
   */
  build: function() {
    this.$el.hide();

    this.block_controls = new BlockControls(this.blockTypes, this.ID);
    this.fl_block_controls = new FloatingBlockControls(this.$wrapper, this.ID);
    this.formatBar = new FormatBar(this.options.formatBar);

    this.listenTo(this.block_controls, 'createBlock', this.createBlock);
    this.listenTo(this.fl_block_controls, 'showBlockControls', this.showBlockControls);

    this._setEvents();

    EventBus.on(this.ID + ":blocks:change_position", this.changeBlockPosition);
    EventBus.on("formatter:position", this.formatBar.renderBySelection);
    EventBus.on("formatter:hide", this.formatBar.hide);

    this.$wrapper.prepend(this.fl_block_controls.render().$el);
    $(document.body).append(this.formatBar.render().$el);
    this.$outer.append(this.block_controls.render().$el);

    $(window).bind('click.sirtrevor', this.hideAllTheThings);

    var store = this.store("read");

    if (store.data.length > 0) {
      store.data.forEach(function(block){
        utils.log('Creating: ' + block.type);
        this.createBlock(block.type, block.data);
      }, this);
    } else if (this.options.defaultType !== false) {
      this.createBlock(this.options.defaultType, {});
    }

    this.$wrapper.addClass('st-ready');

    if(!_.isUndefined(this.onEditorRender)) {
      this.onEditorRender();
    }
  },

  destroy: function() {
    // Destroy the rendered sub views
    this.formatBar.destroy();
    this.fl_block_controls.destroy();
    this.block_controls.destroy();

    // Destroy all blocks
    this.blocks.forEach(function(block) {
      this.removeBlock(block.blockID);
    }, this);

    // Stop listening to events
    this.stopListening();

    // Cleanup element
    var el = this.$el.detach();

    // Remove instance
    config.instances = config.instances.filter(function(instance) {
      return instance.ID !== this.ID;
    }, this);

    // Clear the store
    this.store("reset");

    this.$outer.replaceWith(el);
  },

  reinitialize: function(options) {
    this.destroy();
    this.initialize(options || this.options);
  },

  _setEvents: function() {
    Object.keys(this.events).forEach(function(type) {
      EventBus.on(type, this[this.events[type]], this);
    }, this);
  },

  hideAllTheThings: function(e) {
    this.block_controls.hide();
    this.formatBar.hide();

    if (!_.isUndefined(this.block_controls.current_container)) {
      this.block_controls.current_container.removeClass("with-st-controls");
    }
  },

  showBlockControls: function(container) {
    if (!_.isUndefined(this.block_controls.current_container)) {
      this.block_controls.current_container.removeClass("with-st-controls");
    }

    this.block_controls.show();

    container.append(this.block_controls.$el.detach());
    container.addClass('with-st-controls');

    this.block_controls.current_container = container;
  },

  store: function(method, options){
    return editorStore(this, method, options || {});
  },

  /* Create an instance of a block from an available type.  We have to check
   * the number of blocks we're allowed to create before adding one and handle
   * fails accordingly.  A block will have a reference to an Editor instance &
   * the parent BlockType.  We also have to remember to store static counts for
   * how many blocks we have, and keep a nice array of all the blocks
   * available.
   */
  createBlock: function(type, data, render_at) {
    type = utils.classify(type);

    if(this._blockLimitReached()) {
      utils.log("Cannot add any more blocks. Limit reached.");
      return false;
    }

    if (!this._isBlockTypeAvailable(type)) {
      utils.log("Block type not available " + type);
      return false;
    }

    // Can we have another one of these blocks?
    if (!this._canAddBlockType(type)) {
      utils.log("Block Limit reached for type " + type);
      return false;
    }

    var block = new Blocks[type](data, this.ID);

    this._renderInPosition(block.render().$el);

    this.listenTo(block, 'removeBlock', this.removeBlock);

    this.blocks.push(block);
    this._incrementBlockTypeCount(type);

    if(!data) {
      block.focus();
    }

    EventBus.trigger(data ? "block:create:existing" : "block:create:new", block);
    utils.log("Block created of type " + type);
    block.trigger("onRender");

    this.$wrapper.toggleClass('st--block-limit-reached', this._blockLimitReached());
    this.triggerBlockCountUpdate();
  },

  onNewBlockCreated: function(block) {
    if (block.instanceID === this.ID) {
      this.hideBlockControls();
      this.scrollTo(block.$el);
    }
  },

  scrollTo: function(element) {
    $('html, body').animate({ scrollTop: element.position().top }, 300, "linear");
  },

  blockFocus: function(block) {
    this.block_controls.current_container = null;
  },

  hideBlockControls: function() {
    if (!_.isUndefined(this.block_controls.current_container)) {
      this.block_controls.current_container.removeClass("with-st-controls");
    }

    this.block_controls.hide();
  },

  removeBlockDragOver: function() {
    this.$outer.find('.st-drag-over').removeClass('st-drag-over');
  },

  triggerBlockCountUpdate: function() {
    EventBus.trigger(this.ID + ":blocks:count_update", this.blocks.length);
  },

  changeBlockPosition: function($block, selectedPosition) {
    selectedPosition = selectedPosition - 1;

    var blockPosition = this.getBlockPosition($block);
    var $blockBy = this.$wrapper.find('.st-block').eq(selectedPosition);

    var where = (blockPosition > selectedPosition) ? "Before" : "After";

    if($blockBy && $blockBy.attr('id') !== $block.attr('id')) {
      this.hideAllTheThings();
      $block["insert" + where]($blockBy);
      this.scrollTo($block);
    }
  },

  onBlockDropped: function(block_id) {
    this.hideAllTheThings();
    var block = this.findBlockById(block_id);
    if (!_.isUndefined(block) &&
        !_.isEmpty(block.getData()) &&
          block.drop_options.re_render_on_reorder) {
      block.beforeLoadingData();
    }
  },

  onBlockDragStart: function() {
    this.hideBlockControls();
    this.$wrapper.addClass("st-outer--is-reordering");
  },

  onBlockDragEnd: function() {
    this.removeBlockDragOver();
    this.$wrapper.removeClass("st-outer--is-reordering");
  },

  _renderInPosition: function(block) {
    if (this.block_controls.current_container) {
      this.block_controls.current_container.after(block);
    } else {
      this.$wrapper.append(block);
    }
  },

  _incrementBlockTypeCount: function(type) {
    this.blockCounts[type] = (_.isUndefined(this.blockCounts[type])) ? 1: this.blockCounts[type] + 1;
  },

  _getBlockTypeCount: function(type) {
    return (_.isUndefined(this.blockCounts[type])) ? 0 : this.blockCounts[type];
  },

  _canAddBlockType: function(type) {
    var block_type_limit = this._getBlockTypeLimit(type);

    return !(block_type_limit !== 0 && this._getBlockTypeCount(type) >= block_type_limit);
  },

  _blockLimitReached: function() {
    return (this.options.blockLimit !== 0 && this.blocks.length >= this.options.blockLimit);
  },

  removeBlock: function(block_id) {
    var block = this.findBlockById(block_id),
    type = utils.classify(block.type),
    controls = block.$el.find('.st-block-controls');

    if (controls.length) {
      this.block_controls.hide();
      this.$wrapper.prepend(controls);
    }

    this.blockCounts[type] = this.blockCounts[type] - 1;
    this.blocks = this.blocks.filter(function(item) {
      return item.blockID !== block.blockID;
    });
    this.stopListening(block);

    block.remove();

    EventBus.trigger("block:remove", block);
    this.triggerBlockCountUpdate();

    this.$wrapper.toggleClass('st--block-limit-reached', this._blockLimitReached());
  },

  performValidations : function(block, should_validate) {
    var errors = 0;

    if (!config.skipValidation && should_validate) {
      if(!block.valid()){
        this.errors.push({ text: _.result(block, 'validationFailMsg') });
        utils.log("Block " + block.blockID + " failed validation");
        ++errors;
      }
    }

    return errors;
  },

  saveBlockStateToStore: function(block) {
    var store = block.saveAndReturnData();
    if(store && !_.isEmpty(store.data)) {
      utils.log("Adding data for block " + block.blockID + " to block store");
      this.store("add", { data: store });
    }
  },

  /* Handle a form submission of this Editor instance. Validate all of our
   * blocks, and serialise all data onto the JSON objects
   */
  onFormSubmit: function(should_validate) {
    // if undefined or null or anything other than false - treat as true
    should_validate = (should_validate === false) ? false : true;

    utils.log("Handling form submission for Editor " + this.ID);

    this.removeErrors();
    this.store("reset");

    this.validateBlocks(should_validate);
    this.validateBlockTypesExist(should_validate);

    this.renderErrors();
    this.store("save");

    return this.errors.length;
  },

  validateBlocks: function(should_validate) {
    if (!this.required && (config.skipValidation && !should_validate)) {
      return false;
    }

    this.$wrapper.find('.st-block').each(function(index, block) {
      var _block = this.blocks.find(function(b) {
        return (b.blockID === $(block).attr('id'));
      });

      if (_.isUndefined(_block)) { return false; }

      // Find our block
      this.performValidations(_block, should_validate);
      this.saveBlockStateToStore(_block);
    }.bind(this));
  },

  validateBlockTypesExist: function(should_validate) {
    if (!this.required && (config.skipValidation && !should_validate)) {
      return false;
    }

    var blockTypeIterator = function(type, index) {
      if (!this._isBlockTypeAvailable(type)) { return; }

      if (this._getBlockTypeCount(type) === 0) {
        utils.log("Failed validation on required block type " + type);
        this.errors.push({ text: i18n.t("errors:type_missing", { type: type }) });
      } else {
        var blocks = this.getBlocksByType(type).filter(function(b) {
          return !b.isEmpty();
        });

        if (blocks.length > 0) { return false; }

        this.errors.push({ text: i18n.t("errors:required_type_empty", { type: type }) });
        utils.log("A required block type " + type + " is empty");
      }
    };

    if (Array.isArray(this.required)) {
      this.required.forEach(blockTypeIterator, this);
    }
  },

  renderErrors: function() {
    if (this.errors.length === 0) { return false; }

    if (_.isUndefined(this.$errors)) {
      this.$errors = this._errorsContainer();
    }

    var str = "<ul>";

    this.errors.forEach(function(error) {
      str += '<li class="st-errors__msg">'+ error.text +'</li>';
    });

    str += "</ul>";

    this.$errors.append(str);
    this.$errors.show();
  },

  _errorsContainer: function() {
    if (_.isUndefined(this.options.errorsContainer)) {
      var $container = $("<div>", {
        'class': 'st-errors',
        html: "<p>" + i18n.t("errors:title") + " </p>"
      });

      this.$outer.prepend($container);
      return $container;
    }

    return $(this.options.errorsContainer);
  },

  removeErrors: function() {
    if (this.errors.length === 0) { return false; }

    this.$errors.hide().find('ul').html('');

    this.errors = [];
  },

  findBlockById: function(block_id) {
    return this.blocks.find(function(b) { return b.blockID === block_id; });
  },

  getBlocksByType: function(block_type) {
    return this.blocks.filter(function(b) {
      return utils.classify(b.type) === block_type;
    });
  },

  getBlocksByIDs: function(block_ids) {
    return this.blocks.filter(function(b) {
      return block_ids.includes(b.blockID);
    });
  },

  getBlockPosition: function($block) {
    return this.$wrapper.find('.st-block').index($block);
  },

  /* Get Block Type Limit
   * --
   * returns the limit for this block, which can be set on a per Editor
   * instance, or on a global blockType scope. */
  _getBlockTypeLimit: function(t) {
    if (!this._isBlockTypeAvailable(t)) { return 0; }

    return parseInt((_.isUndefined(this.options.blockTypeLimits[t])) ? 0 : this.options.blockTypeLimits[t], 10);
  },

  /* Availability helper methods
   * --
   * Checks if the object exists within the instance of the Editor. */

  _isBlockTypeAvailable: function(t) {
    return !_.isUndefined(this.blockTypes[t]);
  },

  _ensureAndSetElements: function() {
    if(_.isUndefined(this.options.el) || _.isEmpty(this.options.el)) {
      utils.log("You must provide an el");
      return false;
    }

    this.$el = this.options.el;
    this.el = this.options.el[0];
    this.$form = this.$el.parents('form');

    var $outer = $("<div>").attr({ 'id': this.ID, 'class': 'st-outer', 'dropzone': 'copy link move' });
    var $wrapper = $("<div>").attr({ 'class': 'st-blocks' });

    // Wrap our element in lots of containers *eww*
    this.$el.wrap($outer).wrap($wrapper);

    this.$outer = this.$form.find('#' + this.ID);
    this.$wrapper = this.$outer.find('.st-blocks');

    return true;
  },

  /* Set our blockTypes
   * These will either be set on a per Editor instance, or set on a global scope.
   */
  _setBlocksTypes: function() {
    this.blockTypes = {};
    var keys = this.options.blockTypes || Object.keys(Blocks);
    keys.forEach(function (k) {
      this.blockTypes[k] = true;
    }, this);
  },

  /* Get our required blocks (if any) */
  _setRequired: function() {
    if (Array.isArray(this.options.required) &&
        !_.isEmpty(this.options.required)) {
      this.required = this.options.required;
    } else {
      this.required = false;
    }
  }
});

module.exports = Editor;

},{"./block-controls":52,"./blocks":69,"./config":77,"./event-bus":79,"./events":80,"./extensions/sir-trevor.editor-store":81,"./floating-block-controls":84,"./form-events":85,"./format-bar":86,"./function-bind":89,"./lodash":94,"./utils":99}],79:[function(require,module,exports){
"use strict";

module.exports = Object.assign({}, require('./events'));

},{"./events":80}],80:[function(require,module,exports){
"use strict";

module.exports = require('eventablejs');

},{"eventablejs":2}],81:[function(require,module,exports){
"use strict";

/*
 * Sir Trevor Editor Store
 * By default we store the complete data on the instances $el
 * We can easily extend this and store it on some server or something
 */

var _ = require('../lodash');
var utils = require('../utils');

module.exports = function(editor, method, options) {
  var resp;

  options = options || {};

  switch(method) {

    case "create":
      // Grab our JSON from the textarea and clean any whitespace in case
      // there is a line wrap between the opening and closing textarea tags
      var content = editor.$el.val().trim();
      editor.dataStore = { data: [] };

      if (content.length > 0) {
        try {
          // Ensure the JSON string has a data element that's an array
          var str = JSON.parse(content);
          if (!_.isUndefined(str.data)) {
            // Set it
            editor.dataStore = str;
          }
        } catch(e) {
          editor.errors.push({ text: i18n.t("errors:load_fail") });
          editor.renderErrors();

          utils.log('Sorry there has been a problem with parsing the JSON');
          utils.log(e);
        }
      }
      break;

    case "reset":
      editor.dataStore = { data: [] };
      break;

    case "add":
      if (options.data) {
        editor.dataStore.data.push(options.data);
        resp = editor.dataStore;
      }
      break;

    case "save":
      // Store to our element
      editor.$el.val((editor.dataStore.data.length > 0) ? JSON.stringify(editor.dataStore) : '');
      break;

    case "read":
      resp = editor.dataStore;
      break;

  }

  if(resp) {
    return resp;
  }

};

},{"../lodash":94,"../utils":99}],82:[function(require,module,exports){
"use strict";

/*
 * SirTrevor.Submittable
 * --
 * We need a global way of setting if the editor can and can't be submitted,
 * and a way to disable the submit button and add messages (when appropriate)
 * We also need this to be highly extensible so it can be overridden.
 * This will be triggered *by anything* so it needs to subscribe to events.
 */


var utils = require('../utils');

var EventBus = require('../event-bus');

var submittable = function($form) {
  this.$form = $form;
  this.intialize();
};

Object.assign(submittable.prototype, {

  intialize: function(){
    this.$submitBtn = this.$form.find("input[type='submit']");

    var btnTitles = [];

    this.$submitBtn.each(function(i, btn){
      btnTitles.push($(btn).attr('value'));
    });

    this.submitBtnTitles = btnTitles;
    this.canSubmit = true;
    this.globalUploadCount = 0;
    this._bindEvents();
  },

  setSubmitButton: function(e, message) {
    this.$submitBtn.attr('value', message);
  },

  resetSubmitButton: function(){
    var titles = this.submitBtnTitles;
    this.$submitBtn.each(function(index, item) {
      $(item).attr('value', titles[index]);
    });
  },

  onUploadStart: function(e){
    this.globalUploadCount++;
    utils.log('onUploadStart called ' + this.globalUploadCount);

    if(this.globalUploadCount === 1) {
      this._disableSubmitButton();
    }
  },

  onUploadStop: function(e) {
    this.globalUploadCount = (this.globalUploadCount <= 0) ? 0 : this.globalUploadCount - 1;

    utils.log('onUploadStop called ' + this.globalUploadCount);

    if(this.globalUploadCount === 0) {
      this._enableSubmitButton();
    }
  },

  onError: function(e){
    utils.log('onError called');
    this.canSubmit = false;
  },

  _disableSubmitButton: function(message){
    this.setSubmitButton(null, message || i18n.t("general:wait"));
    this.$submitBtn
    .attr('disabled', 'disabled')
    .addClass('disabled');
  },

  _enableSubmitButton: function(){
    this.resetSubmitButton();
    this.$submitBtn
    .removeAttr('disabled')
    .removeClass('disabled');
  },

  _events : {
    "disableSubmitButton" : "_disableSubmitButton",
    "enableSubmitButton"  : "_enableSubmitButton",
    "setSubmitButton"     : "setSubmitButton",
    "resetSubmitButton"   : "resetSubmitButton",
    "onError"             : "onError",
    "onUploadStart"       : "onUploadStart",
    "onUploadStop"        : "onUploadStop"
  },

  _bindEvents: function(){
    Object.keys(this._events).forEach(function(type) {
      EventBus.on(type, this[this._events[type]], this);
    }, this);
  }

});

module.exports = submittable;


},{"../event-bus":79,"../utils":99}],83:[function(require,module,exports){
"use strict";

/*
*   Sir Trevor Uploader
*   Generic Upload implementation that can be extended for blocks
*/

var _ = require('../lodash');
var config = require('../config');
var utils = require('../utils');

module.exports = function(block, file, success, error) {

  var uid  = [block.blockID, (new Date()).getTime(), 'raw'].join('-');
  var data = new FormData();

  data.append('attachment[name]', file.name);
  data.append('attachment[file]', file);
  data.append('attachment[uid]', uid);

  block.resetMessages();

  var callbackSuccess = function(){
    utils.log('Upload callback called');

    if (!_.isUndefined(success) && _.isFunction(success)) {
      success.apply(block, arguments);
    }
  };

  var callbackError = function(){
    utils.log('Upload callback error called');

    if (!_.isUndefined(error) && _.isFunction(error)) {
      error.apply(block, arguments);
    }
  };

  var xhr = $.ajax({
    url: config.defaults.uploadUrl,
    data: data,
    cache: false,
    contentType: false,
    processData: false,
    dataType: 'json',
    type: 'POST'
  });

  block.addQueuedItem(uid, xhr);

  xhr.done(callbackSuccess)
     .fail(callbackError)
     .always(block.removeQueuedItem.bind(block, uid));

  return xhr;
};

},{"../config":77,"../lodash":94,"../utils":99}],84:[function(require,module,exports){
"use strict";

/*
   SirTrevor Floating Block Controls
   --
   Draws the 'plus' between blocks
   */

var _ = require('./lodash');

var EventBus = require('./event-bus');

var FloatingBlockControls = function(wrapper, instance_id) {
  this.$wrapper = wrapper;
  this.instance_id = instance_id;

  this._ensureElement();
  this._bindFunctions();

  this.initialize();
};

Object.assign(FloatingBlockControls.prototype, require('./function-bind'), require('./renderable'), require('./events'), {

  className: "st-block-controls__top",

  attributes: function() {
    return {
      'data-icon': 'add'
    };
  },

  bound: ['handleBlockMouseOut', 'handleBlockMouseOver', 'handleBlockClick', 'onDrop'],

  initialize: function() {
    this.$el.on('click', this.handleBlockClick)
    .dropArea()
    .bind('drop', this.onDrop);

    this.$wrapper.on('mouseover', '.st-block', this.handleBlockMouseOver)
    .on('mouseout', '.st-block', this.handleBlockMouseOut)
    .on('click', '.st-block--with-plus', this.handleBlockClick);
  },

  onDrop: function(ev) {
    ev.preventDefault();

    var dropped_on = this.$el,
    item_id = ev.originalEvent.dataTransfer.getData("text/plain"),
    block = $('#' + item_id);

    if (!_.isUndefined(item_id) &&
        !_.isEmpty(block) &&
          dropped_on.attr('id') !== item_id &&
            this.instance_id === block.attr('data-instance')
       ) {
         dropped_on.after(block);
       }

       EventBus.trigger("block:reorder:dropped", item_id);
  },

  handleBlockMouseOver: function(e) {
    var block = $(e.currentTarget);

    if (!block.hasClass('st-block--with-plus')) {
      block.addClass('st-block--with-plus');
    }
  },

  handleBlockMouseOut: function(e) {
    var block = $(e.currentTarget);

    if (block.hasClass('st-block--with-plus')) {
      block.removeClass('st-block--with-plus');
    }
  },

  handleBlockClick: function(e) {
    e.stopPropagation();

    var block = $(e.currentTarget);
    this.trigger('showBlockControls', block);
  }

});

module.exports = FloatingBlockControls;

},{"./event-bus":79,"./events":80,"./function-bind":89,"./lodash":94,"./renderable":95}],85:[function(require,module,exports){
"use strict";

var config = require('./config');
var utils = require('./utils');

var EventBus = require('./event-bus');
var Submittable = require('./extensions/sir-trevor.submittable');

var formBound = false; // Flag to tell us once we've bound our submit event

var FormEvents = {
  bindFormSubmit: function(form) {
    if (!formBound) {
      this.submittable = new Submittable(form);
      form.on('submit.sirtrevor', this.onFormSubmit);
      formBound = true;
    }
  },

  onBeforeSubmit: function(should_validate) {
    // Loop through all of our instances and do our form submits on them
    var errors = 0;
    config.instances.forEach(function(inst, i) {
      errors += inst.onFormSubmit(should_validate);
    });
    utils.log("Total errors: " + errors);

    return errors;
  },

  onFormSubmit: function(ev) {
    var errors = FormEvents.onBeforeSubmit();

    if(errors > 0) {
      EventBus.trigger("onError");
      ev.preventDefault();
    }
  },
};

module.exports = FormEvents;

},{"./config":77,"./event-bus":79,"./extensions/sir-trevor.submittable":82,"./utils":99}],86:[function(require,module,exports){
"use strict";

/*
   Format Bar
   --
   Displayed on focus on a text area.
   Renders with all available options for the editor instance
   */

var _ = require('./lodash');

var config = require('./config');
var Formatters = require('./formatters');

var FormatBar = function(options) {
  this.options = Object.assign({}, config.defaults.formatBar, options || {});
  this._ensureElement();
  this._bindFunctions();

  this.initialize.apply(this, arguments);
};

Object.assign(FormatBar.prototype, require('./function-bind'), require('./events'), require('./renderable'), {

  className: 'st-format-bar',

  bound: ["onFormatButtonClick", "renderBySelection", "hide"],

  initialize: function() {
    var formatName, format, btn;
    this.$btns = [];

    for (formatName in Formatters) {
      if (Formatters.hasOwnProperty(formatName)) {
        format = Formatters[formatName];
        btn = $("<button>", {
          'class': 'st-format-btn st-format-btn--' + formatName + ' ' + (format.iconName ? 'st-icon' : ''),
          'text': format.text,
          'data-type': formatName,
          'data-cmd': format.cmd
        });

        this.$btns.push(btn);
        btn.appendTo(this.$el);
      }
    }

    this.$b = $(document);
    this.$el.bind('click', '.st-format-btn', this.onFormatButtonClick);
  },

  hide: function() {
    this.$el.removeClass('st-format-bar--is-ready');
  },

  show: function() {
    this.$el.addClass('st-format-bar--is-ready');
  },

  remove: function(){ this.$el.remove(); },

  renderBySelection: function(rectangles) {

    var selection = window.getSelection(),
    range = selection.getRangeAt(0),
    boundary = range.getBoundingClientRect(),
    coords = {};

    coords.top = boundary.top + 20 + window.pageYOffset - this.$el.height() + 'px';
    coords.left = ((boundary.left + boundary.right) / 2) - (this.$el.width() / 2) + 'px';

    this.highlightSelectedButtons();
    this.show();

    this.$el.css(coords);
  },

  highlightSelectedButtons: function() {
    var formatter;
    this.$btns.forEach(function($btn) {
      formatter = Formatters[$btn.attr('data-type')];
      $btn.toggleClass("st-format-btn--is-active",
                       formatter.isActive());
    }, this);
  },

  onFormatButtonClick: function(ev){
    ev.stopPropagation();

    var btn = $(ev.target),
    format = Formatters[btn.attr('data-type')];

    if (_.isUndefined(format)) {
      return false;
    }

    // Do we have a click function defined on this formatter?
    if(!_.isUndefined(format.onClick) && _.isFunction(format.onClick)) {
      format.onClick(); // Delegate
    } else {
      // Call default
      document.execCommand(btn.attr('data-cmd'), false, format.param);
    }

    this.highlightSelectedButtons();
    return false;
  }

});

module.exports = FormatBar;

},{"./config":77,"./events":80,"./formatters":88,"./function-bind":89,"./lodash":94,"./renderable":95}],87:[function(require,module,exports){
"use strict";

var _ = require('./lodash');

var Formatter = function(options){
  this.formatId = _.uniqueId('format-');
  this._configure(options || {});
  this.initialize.apply(this, arguments);
};

var formatOptions = ["title", "className", "cmd", "keyCode", "param", "onClick", "toMarkdown", "toHTML"];

Object.assign(Formatter.prototype, {

  title: '',
  className: '',
  cmd: null,
  keyCode: null,
  param: null,

  toMarkdown: function(markdown){ return markdown; },
  toHTML: function(html){ return html; },

  initialize: function(){},

  _configure: function(options) {
    if (this.options) {
      options = Object.assign({}, this.options, options);
    }
    for (var i = 0, l = formatOptions.length; i < l; i++) {
      var attr = formatOptions[i];
      if (options[attr]) {
        this[attr] = options[attr];
      }
    }
    this.options = options;
  },

  isActive: function() {
    return document.queryCommandState(this.cmd);
  },

  _bindToBlock: function(block) {
    var formatter = this,
    ctrlDown = false;

    block
    .on('keyup','.st-text-block', function(ev) {
      if(ev.which === 17 || ev.which === 224 || ev.which === 91) {
        ctrlDown = false;
      }
    })
    .on('keydown','.st-text-block', { formatter: formatter }, function(ev) {
      if(ev.which === 17 || ev.which === 224 || ev.which === 91) {
        ctrlDown = true;
      }

      if(ev.which === ev.data.formatter.keyCode && ctrlDown === true) {
        document.execCommand(ev.data.formatter.cmd, false, true);
        ev.preventDefault();
        ctrlDown = false;
      }
    });
  }
});

// Allow our Formatters to be extended.
Formatter.extend = require('./helpers/extend');

module.exports = Formatter;

},{"./helpers/extend":91,"./lodash":94}],88:[function(require,module,exports){
"use strict";

/* Our base formatters */

var Formatter = require('./formatter');

var Bold = Formatter.extend({
  title: "bold",
  cmd: "bold",
  keyCode: 66,
  text : "B"
});

var Italic = Formatter.extend({
  title: "italic",
  cmd: "italic",
  keyCode: 73,
  text : "i"
});

var Link = Formatter.extend({

  title: "link",
  iconName: "link",
  cmd: "CreateLink",
  text : "link",

  onClick: function() {

    var link = window.prompt(i18n.t("general:link")),
    link_regex = /((ftp|http|https):\/\/.)|mailto(?=\:[-\.\w]+@)/;

    if(link && link.length > 0) {

      if (!link_regex.test(link)) {
        link = "http://" + link;
      }

      document.execCommand(this.cmd, false, link);
    }
  },

  isActive: function() {
    var selection = window.getSelection(),
    node;

    if (selection.rangeCount > 0) {
      node = selection.getRangeAt(0)
      .startContainer
      .parentNode;
    }

    return (node && node.nodeName === "A");
  }
});

var UnLink = Formatter.extend({
  title: "unlink",
  iconName: "link",
  cmd: "unlink",
  text : "link"
});


exports.Bold = new Bold();
exports.Italic = new Italic();
exports.Link = new Link();
exports.Unlink = new UnLink();

},{"./formatter":87}],89:[function(require,module,exports){
"use strict";

/* Generic function binding utility, used by lots of our classes */

module.exports = {
  bound: [],
  _bindFunctions: function(){
    this.bound.forEach(function(f) {
      this[f] = this[f].bind(this);
    }, this);
  }
};


},{}],90:[function(require,module,exports){
"use strict";

/*
 * Drop Area Plugin from @maccman
 * http://blog.alexmaccaw.com/svbtle-image-uploading
 * --
 * Tweaked so we use the parent class of dropzone
 */


function dragEnter(e) {
  e.preventDefault();
}

function dragOver(e) {
  e.originalEvent.dataTransfer.dropEffect = "copy";
  $(e.currentTarget).addClass('st-drag-over');
  e.preventDefault();
}

function dragLeave(e) {
  $(e.currentTarget).removeClass('st-drag-over');
  e.preventDefault();
}

$.fn.dropArea = function(){
  this.bind("dragenter", dragEnter).
    bind("dragover",  dragOver).
    bind("dragleave", dragLeave);
  return this;
};

$.fn.noDropArea = function(){
  this.unbind("dragenter").
    unbind("dragover").
    unbind("dragleave");
  return this;
};

$.fn.caretToEnd = function(){
  var range,selection;

  range = document.createRange();
  range.selectNodeContents(this[0]);
  range.collapse(false);

  selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  return this;
};


},{}],91:[function(require,module,exports){
"use strict";

/*
  Backbone Inheritence 
  --
  From: https://github.com/documentcloud/backbone/blob/master/backbone.js
  Backbone.js 0.9.2
  (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
*/

module.exports = function(protoProps, staticProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (protoProps && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  Object.assign(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate; // jshint ignore:line

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) {
    Object.assign(child.prototype, protoProps);
  }

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype;

  return child;
};

},{}],92:[function(require,module,exports){
"use strict";

var _ = require('./lodash');

require('./helpers/event'); // extends jQuery itself
require('./vendor/array-includes'); // shims ES7 Array.prototype.includes

var SirTrevor = {

  config: require('./config'),

  log: require('./utils').log,
  Locales: require('./locales'),

  EventBus: require('./event-bus'),

  EditorStore: require('./extensions/sir-trevor.editor-store'),
  Submittable: require('./extensions/sir-trevor.submittable'),
  FileUploader: require('./extensions/sir-trevor.uploader'),

  BlockMixins: require('./block_mixins'),
  BlockPositioner: require('./block.positioner'),
  BlockReorder: require('./block.reorder'),
  BlockDeletion: require('./block.deletion'),
  BlockValidations: require('./block.validations'),
  BlockStore: require('./block.store'),

  SimpleBlock: require('./simple-block'),
  Block: require('./block'),
  Formatter: require('./formatter'),
  Formatters: require('./formatters'),

  Blocks: require('./blocks'),

  BlockControl: require('./block-control'),
  BlockControls: require('./block-controls'),
  FloatingBlockControls: require('./floating-block-controls'),

  FormatBar: require('./format-bar'),
  Editor: require('./editor'),

  toMarkdown: require('./to-markdown'),
  toHTML: require('./to-html'),

  setDefaults: function(options) {
    Object.assign(SirTrevor.config.defaults, options || {});
  },

  getInstance: function(identifier) {
    if (_.isUndefined(identifier)) {
      return this.config.instances[0];
    }

    if (_.isString(identifier)) {
      return this.config.instances.find(function(editor) {
        return editor.ID === identifier;
      });
    }

    return this.config.instances[identifier];
  },

  setBlockOptions: function(type, options) {
    var block = SirTrevor.Blocks[type];

    if (_.isUndefined(block)) {
      return;
    }

    Object.assign(block.prototype, options || {});
  },

  runOnAllInstances: function(method) {
    if (SirTrevor.Editor.prototype.hasOwnProperty(method)) {
      var methodArgs = Array.prototype.slice.call(arguments, 1);
      Array.prototype.forEach.call(SirTrevor.config.instances, function(i) {
        i[method].apply(null, methodArgs);
      });
    } else {
      SirTrevor.log("method doesn't exist");
    }
  },

};

Object.assign(SirTrevor, require('./form-events'));


module.exports = SirTrevor;

},{"./block":54,"./block-control":51,"./block-controls":52,"./block.deletion":53,"./block.positioner":55,"./block.reorder":56,"./block.store":57,"./block.validations":58,"./block_mixins":63,"./blocks":69,"./config":77,"./editor":78,"./event-bus":79,"./extensions/sir-trevor.editor-store":81,"./extensions/sir-trevor.submittable":82,"./extensions/sir-trevor.uploader":83,"./floating-block-controls":84,"./form-events":85,"./format-bar":86,"./formatter":87,"./formatters":88,"./helpers/event":90,"./locales":93,"./lodash":94,"./simple-block":96,"./to-html":97,"./to-markdown":98,"./utils":99,"./vendor/array-includes":100}],93:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var config = require('./config');
var utils = require('./utils');

var Locales = {
    en: {
        general: {
            'delete': 'Delete?',
            'drop': 'Drag __block__ here',
            'paste': 'Or paste URL here',
            'upload': '...or choose a file',
            'close': 'close',
            'position': 'Position',
            'wait': 'Please wait...',
            'link': 'Enter a link'
        },
        errors: {
            'title': "You have the following errors:",
            'validation_fail': "__type__ block is invalid",
            'block_empty': "__name__ must not be empty",
            'type_missing': "You must have a block of type __type__",
            'required_type_empty': "A required block type __type__ is empty",
            'load_fail': "There was a problem loading the contents of the document"
        },
        blocks: {
            text: {
                'title': "Text"
            },
            list: {
                'title': "List"
            },
            quote: {
                'title': "Quote",
                'credit_field': "Credit"
            },
            image: {
                'title': "Image",
                'upload_error': "There was a problem with your upload"
            },
            video: {
                'title': "Video"
            },
            tweet: {
                'title': "Tweet",
                'fetch_error': "There was a problem fetching your tweet"
            },
            embedly: {
                'title': "Embedly",
                'fetch_error': "There was a problem fetching your embed",
                'key_missing': "An Embedly API key must be present"
            },
            heading: {
                'title': "Heading"
            },
            textimage: {
                'title': "Text and Image",
                'heading_field': "Title",
                'image_align': "Image Align"
            }
        }
    }
};

if (window.i18n === undefined || window.i18n.init === undefined) {
    // Minimal i18n stub that only reads the English strings
    utils.log("Using i18n stub");
    window.i18n = {
        t: function (key, options) {
            var parts = key.split(':'), str, obj, part, i;

            obj = Locales[config.language];

            for (i = 0; i < parts.length; i++) {
                part = parts[i];

                if (!_.isUndefined(obj[part])) {
                    obj = obj[part];
                }
            }

            str = obj;

            if (!_.isString(str)) {
                return "";
            }

            if (str.indexOf('__') >= 0) {
                Object.keys(options).forEach(function (opt) {
                    str = str.replace('__' + opt + '__', options[opt]);
                });
            }

            return str;
        }
    };
} else {
    utils.log("Using i18next");
    // Only use i18next when the library has been loaded by the user, keeps
    // dependencies slim
    i18n.init({
        resStore: Locales, fallbackLng: config.language,
        ns: {namespaces: ['general', 'blocks'], defaultNs: 'general'}
    });
}

module.exports = Locales;

},{"./config":77,"./lodash":94,"./utils":99}],94:[function(require,module,exports){
"use strict";

exports.isEmpty = require('lodash.isempty');
exports.isFunction = require('lodash.isfunction');
exports.isObject = require('lodash.isobject');
exports.isString = require('lodash.isstring');
exports.isUndefined = require('lodash.isundefined');
exports.result = require('lodash.result');
exports.template = require('lodash.template');
exports.uniqueId = require('lodash.uniqueid');

},{"lodash.isempty":3,"lodash.isfunction":27,"lodash.isobject":28,"lodash.isstring":30,"lodash.isundefined":31,"lodash.result":32,"lodash.template":33,"lodash.uniqueid":49}],95:[function(require,module,exports){
"use strict";

var _ = require('./lodash');

module.exports = {
  tagName: 'div',
  className: 'sir-trevor__view',
  attributes: {},

  $: function(selector) {
    return this.$el.find(selector);
  },

  render: function() {
    return this;
  },

  destroy: function() {
    if (!_.isUndefined(this.stopListening)) { this.stopListening(); }
    this.$el.remove();
  },

  _ensureElement: function() {
    if (!this.el) {
      var attrs = Object.assign({}, _.result(this, 'attributes')),
      html;
      if (this.id) { attrs.id = this.id; }
      if (this.className) { attrs['class'] = this.className; }

      if (attrs.html) {
        html = attrs.html;
        delete attrs.html;
      }
      var $el = $('<' + this.tagName + '>').attr(attrs);
      if (html) { $el.html(html); }
      this._setElement($el);
    } else {
      this._setElement(this.el);
    }
  },

  _setElement: function(element) {
    this.$el = $(element);
    this.el = this.$el[0];
    return this;
  }
};


},{"./lodash":94}],96:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var utils = require('./utils');

var BlockReorder = require('./block.reorder');

var SimpleBlock = function(data, instance_id) {
  this.createStore(data);
  this.blockID = _.uniqueId('st-block-');
  this.instanceID = instance_id;

  this._ensureElement();
  this._bindFunctions();

  this.initialize.apply(this, arguments);
};

Object.assign(SimpleBlock.prototype, require('./function-bind'), require('./events'), require('./renderable'), require('./block.store'), {

  focus : function() {},

  valid : function() { return true; },

  className: 'st-block',

  block_template: _.template(
    "<div class='st-block__inner'><%= editor_html %></div>"
  ),

  attributes: function() {
    return {
      'id': this.blockID,
      'data-type': this.type,
      'data-instance': this.instanceID
    };
  },

  title: function() {
    return utils.titleize(this.type.replace(/[\W_]/g, ' '));
  },

  blockCSSClass: function() {
    this.blockCSSClass = utils.toSlug(this.type);
    return this.blockCSSClass;
  },

  type: '',

  'class': function() {
    return utils.classify(this.type);
  },

  editorHTML: '',

  initialize: function() {},

  onBlockRender: function(){},
  beforeBlockRender: function(){},

  _setBlockInner : function() {
    var editor_html = _.result(this, 'editorHTML');

    this.$el.append(
      this.block_template({ editor_html: editor_html })
    );

    this.$inner = this.$el.find('.st-block__inner');
    this.$inner.bind('click mouseover', function(e){ e.stopPropagation(); });
  },

  render: function() {
    this.beforeBlockRender();

    this._setBlockInner();
    this._blockPrepare();

    return this;
  },

  _blockPrepare : function() {
    this._initUI();
    this._initMessages();

    this.checkAndLoadData();

    this.$el.addClass('st-item-ready');
    this.on("onRender", this.onBlockRender);
    this.save();
  },

  _withUIComponent: function(component, className, callback) {
    this.$ui.append(component.render().$el);
    if (className && callback) {
      this.$ui.on('click', className, callback);
    }
  },

  _initUI : function() {
    var ui_element = $("<div>", { 'class': 'st-block__ui' });
    this.$inner.append(ui_element);
    this.$ui = ui_element;
    this._initUIComponents();
  },

  _initMessages: function() {
    var msgs_element = $("<div>", { 'class': 'st-block__messages' });
    this.$inner.prepend(msgs_element);
    this.$messages = msgs_element;
  },

  addMessage: function(msg, additionalClass) {
    var $msg = $("<span>", { html: msg, 'class': "st-msg " + additionalClass });
    this.$messages.append($msg)
    .addClass('st-block__messages--is-visible');
    return $msg;
  },

  resetMessages: function() {
    this.$messages.html('')
    .removeClass('st-block__messages--is-visible');
  },

  _initUIComponents: function() {
    this._withUIComponent(new BlockReorder(this.$el));
  }

});

SimpleBlock.fn = SimpleBlock.prototype;

// Allow our Block to be extended.
SimpleBlock.extend = require('./helpers/extend');

module.exports = SimpleBlock;

},{"./block.reorder":56,"./block.store":57,"./events":80,"./function-bind":89,"./helpers/extend":91,"./lodash":94,"./renderable":95,"./utils":99}],97:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var utils = require('./utils');

module.exports = function(markdown, type) {

  // Deferring requiring these to sidestep a circular dependency:
  // Block -> this -> Blocks -> Block
  var Blocks = require('./blocks');
  var Formatters = require('./formatters');

  // MD -> HTML
  type = utils.classify(type);

  var html = markdown,
      shouldWrap = type === "Text";

  if(_.isUndefined(shouldWrap)) { shouldWrap = false; }

  if (shouldWrap) {
    html = "<div>" + html;
  }

  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/gm,function(match, p1, p2){
    return "<a href='"+p2+"'>"+p1.replace(/\r?\n/g, '')+"</a>";
  });

  // This may seem crazy, but because JS doesn't have a look behind,
  // we reverse the string to regex out the italic items (and bold)
  // and look for something that doesn't start (or end in the reversed strings case)
  // with a slash.
  html = utils.reverse(
           utils.reverse(html)
           .replace(/_(?!\\)((_\\|[^_])*)_(?=$|[^\\])/gm, function(match, p1) {
              return ">i/<"+ p1.replace(/\r?\n/g, '').replace(/[\s]+$/,'') +">i<";
           })
           .replace(/\*\*(?!\\)((\*\*\\|[^\*\*])*)\*\*(?=$|[^\\])/gm, function(match, p1){
              return ">b/<"+ p1.replace(/\r?\n/g, '').replace(/[\s]+$/,'') +">b<";
           })
          );

  html =  html.replace(/^\> (.+)$/mg,"$1");

  // Use custom formatters toHTML functions (if any exist)
  var formatName, format;
  for(formatName in Formatters) {
    if (Formatters.hasOwnProperty(formatName)) {
      format = Formatters[formatName];
      // Do we have a toHTML function?
      if (!_.isUndefined(format.toHTML) && _.isFunction(format.toHTML)) {
        html = format.toHTML(html);
      }
    }
  }

  // Use custom block toHTML functions (if any exist)
  var block;
  if (Blocks.hasOwnProperty(type)) {
    block = Blocks[type];
    // Do we have a toHTML function?
    if (!_.isUndefined(block.prototype.toHTML) && _.isFunction(block.prototype.toHTML)) {
      html = block.prototype.toHTML(html);
    }
  }

  if (shouldWrap) {
    html = html.replace(/\r?\n\r?\n/gm, "</div><div><br></div><div>");
    html = html.replace(/\r?\n/gm, "</div><div>");
  }

  html = html.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
             .replace(/\r?\n/g, "<br>")
             .replace(/\*\*/, "")
             .replace(/__/, "");  // Cleanup any markdown characters left

  // Replace escaped
  html = html.replace(/\\\*/g, "*")
             .replace(/\\\[/g, "[")
             .replace(/\\\]/g, "]")
             .replace(/\\\_/g, "_")
             .replace(/\\\(/g, "(")
             .replace(/\\\)/g, ")")
             .replace(/\\\-/g, "-");

  if (shouldWrap) {
    html += "</div>";
  }

  return html;
};

},{"./blocks":69,"./formatters":88,"./lodash":94,"./utils":99}],98:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var config = require('./config');
var utils = require('./utils');

module.exports = function(content, type) {

  // Deferring requiring these to sidestep a circular dependency:
  // Block -> this -> Blocks -> Block
  var Blocks = require('./blocks');
  var Formatters = require('./formatters');

  type = utils.classify(type);

  var markdown = content;

  //Normalise whitespace
  markdown = markdown.replace(/&nbsp;/g," ");

  // First of all, strip any additional formatting
  // MSWord, I'm looking at you, punk.
  markdown = markdown.replace(/( class=(")?Mso[a-zA-Z]+(")?)/g, '')
                     .replace(/<!--(.*?)-->/g, '')
                     .replace(/\/\*(.*?)\*\//g, '')
                     .replace(/<(\/)*(meta|link|span|\\?xml:|st1:|o:|font)(.*?)>/gi, '');

  var badTags = ['style', 'script', 'applet', 'embed', 'noframes', 'noscript'],
      tagStripper, i;

  for (i = 0; i< badTags.length; i++) {
    tagStripper = new RegExp('<'+badTags[i]+'.*?'+badTags[i]+'(.*?)>', 'gi');
    markdown = markdown.replace(tagStripper, '');
  }

  // Escape anything in here that *could* be considered as MD
  // Markdown chars we care about: * [] _ () -
  markdown = markdown.replace(/\*/g, "\\*")
                    .replace(/\[/g, "\\[")
                    .replace(/\]/g, "\\]")
                    .replace(/\_/g, "\\_")
                    .replace(/\(/g, "\\(")
                    .replace(/\)/g, "\\)")
                    .replace(/\-/g, "\\-");

  var inlineTags = ["em", "i", "strong", "b"];

  for (i = 0; i< inlineTags.length; i++) {
    tagStripper = new RegExp('<'+inlineTags[i]+'><br></'+inlineTags[i]+'>', 'gi');
    markdown = markdown.replace(tagStripper, '<br>');
  }

  function replaceBolds(match, p1, p2){
    if(_.isUndefined(p2)) { p2 = ''; }
    return "**" + p1.replace(/<(.)?br(.)?>/g, '') + "**" + p2;
  }

  function replaceItalics(match, p1, p2){
    if(_.isUndefined(p2)) { p2 = ''; }
    return "_" + p1.replace(/<(.)?br(.)?>/g, '') + "_" + p2;
  }

  markdown = markdown.replace(/<(\w+)(?:\s+\w+="[^"]+(?:"\$[^"]+"[^"]+)?")*>\s*<\/\1>/gim, '') //Empty elements
                      .replace(/\n/mg,"")
                      .replace(/<a.*?href=[""'](.*?)[""'].*?>(.*?)<\/a>/gim, function(match, p1, p2){
                        return "[" + p2.trim().replace(/<(.)?br(.)?>/g, '') + "]("+ p1 +")";
                      }) // Hyperlinks
                      .replace(/<strong>(?:\s*)(.*?)(\s)*?<\/strong>/gim, replaceBolds)
                      .replace(/<b>(?:\s*)(.*?)(\s*)?<\/b>/gim, replaceBolds)
                      .replace(/<em>(?:\s*)(.*?)(\s*)?<\/em>/gim, replaceItalics)
                      .replace(/<i>(?:\s*)(.*?)(\s*)?<\/i>/gim, replaceItalics);


  // Use custom formatters toMarkdown functions (if any exist)
  var formatName, format;
  for(formatName in Formatters) {
    if (Formatters.hasOwnProperty(formatName)) {
      format = Formatters[formatName];
      // Do we have a toMarkdown function?
      if (!_.isUndefined(format.toMarkdown) && _.isFunction(format.toMarkdown)) {
        markdown = format.toMarkdown(markdown);
      }
    }
  }

  // Do our generic stripping out
  markdown = markdown.replace(/([^<>]+)(<div>)/g,"$1\n$2")                                 // Divitis style line breaks (handle the first line)
                 .replace(/<div><div>/g,'\n<div>')                                         // ^ (double opening divs with one close from Chrome)
                 .replace(/(?:<div>)([^<>]+)(?:<div>)/g,"$1\n")                            // ^ (handle nested divs that start with content)
                 .replace(/(?:<div>)(?:<br>)?([^<>]+)(?:<br>)?(?:<\/div>)/g,"$1\n")        // ^ (handle content inside divs)
                 .replace(/<\/p>/g,"\n\n")                                               // P tags as line breaks
                 .replace(/<(.)?br(.)?>/g,"\n")                                            // Convert normal line breaks
                 .replace(/&lt;/g,"<").replace(/&gt;/g,">");                                 // Encoding

  // Use custom block toMarkdown functions (if any exist)
  var block;
  if (Blocks.hasOwnProperty(type)) {
    block = Blocks[type];
    // Do we have a toMarkdown function?
    if (!_.isUndefined(block.prototype.toMarkdown) && _.isFunction(block.prototype.toMarkdown)) {
      markdown = block.prototype.toMarkdown(markdown);
    }
  }

  // Strip remaining HTML
  if (config.defaults.toMarkdown.aggresiveHTMLStrip) {
    markdown = markdown.replace(/<\/?[^>]+(>|$)/g, "");
  } else {
    markdown = markdown.replace(/<(?=\S)\/?[^>]+(>|$)/ig, "");
  }

  return markdown;
};

},{"./blocks":69,"./config":77,"./formatters":88,"./lodash":94,"./utils":99}],99:[function(require,module,exports){
"use strict";

var _ = require('./lodash');
var config = require('./config');

var urlRegex = /^(?:([A-Za-z]+):)?(\/{0,3})([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^?#]*))?(?:\?([^#]*))?(?:#(.*))?$/;

var utils = {
  log: function() {
    if (!_.isUndefined(console) && config.debug) {
      console.log.apply(console, arguments);
    }
  },

  isURI : function(string) {
    return (urlRegex.test(string));
  },

  titleize: function(str){
    if (str === null) {
      return '';
    }
    str  = String(str).toLowerCase();
    return str.replace(/(?:^|\s|-)\S/g, function(c){ return c.toUpperCase(); });
  },

  classify: function(str){
    return utils.titleize(String(str).replace(/[\W_]/g, ' ')).replace(/\s/g, '');
  },

  capitalize : function(string) {
    return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
  },

  underscored: function(str){
    return str.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2')
    .replace(/[-\s]+/g, '_').toLowerCase();
  },

  reverse: function(str) {
    return str.split("").reverse().join("");
  },

  toSlug: function(str) {
    return str
    .toLowerCase()
    .replace(/[^\w ]+/g,'')
    .replace(/ +/g,'-');
  }

};

module.exports = utils;

},{"./config":77,"./lodash":94}],100:[function(require,module,exports){
"use strict";

// jshint freeze: false

if (![].includes) {
  Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
    if (this === undefined || this === null) {
      throw new TypeError('Cannot convert this value to object');
    }
    var O = Object(this);
    var len = parseInt(O.length) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1]) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {
        k = 0;
      }
    }
    while (k < len) {
      var currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) {
        return true;
      }
      k++;
    }
    return false;
  };
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9ldmVudGFibGVqcy9ldmVudGFibGUuanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc2VtcHR5L25vZGVfbW9kdWxlcy9sb2Rhc2guZm9yb3duL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VjcmVhdGVjYWxsYmFjay9ub2RlX21vZHVsZXMvbG9kYXNoLl9zZXRiaW5kZGF0YS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNlbXB0eS9ub2RlX21vZHVsZXMvbG9kYXNoLmZvcm93bi9ub2RlX21vZHVsZXMvbG9kYXNoLl9iYXNlY3JlYXRlY2FsbGJhY2svbm9kZV9tb2R1bGVzL2xvZGFzaC5fc2V0YmluZGRhdGEvbm9kZV9tb2R1bGVzL2xvZGFzaC5faXNuYXRpdmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL25vZGVfbW9kdWxlcy9sb2Rhc2guX3NldGJpbmRkYXRhL25vZGVfbW9kdWxlcy9sb2Rhc2gubm9vcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNlbXB0eS9ub2RlX21vZHVsZXMvbG9kYXNoLmZvcm93bi9ub2RlX21vZHVsZXMvbG9kYXNoLl9iYXNlY3JlYXRlY2FsbGJhY2svbm9kZV9tb2R1bGVzL2xvZGFzaC5iaW5kL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc2VtcHR5L25vZGVfbW9kdWxlcy9sb2Rhc2guZm9yb3duL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VjcmVhdGVjYWxsYmFjay9ub2RlX21vZHVsZXMvbG9kYXNoLmJpbmQvbm9kZV9tb2R1bGVzL2xvZGFzaC5fY3JlYXRld3JhcHBlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNlbXB0eS9ub2RlX21vZHVsZXMvbG9kYXNoLmZvcm93bi9ub2RlX21vZHVsZXMvbG9kYXNoLl9iYXNlY3JlYXRlY2FsbGJhY2svbm9kZV9tb2R1bGVzL2xvZGFzaC5iaW5kL25vZGVfbW9kdWxlcy9sb2Rhc2guX2NyZWF0ZXdyYXBwZXIvbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWJpbmQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL25vZGVfbW9kdWxlcy9sb2Rhc2guYmluZC9ub2RlX21vZHVsZXMvbG9kYXNoLl9jcmVhdGV3cmFwcGVyL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2ViaW5kL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VjcmVhdGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL25vZGVfbW9kdWxlcy9sb2Rhc2guYmluZC9ub2RlX21vZHVsZXMvbG9kYXNoLl9jcmVhdGV3cmFwcGVyL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VjcmVhdGV3cmFwcGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc2VtcHR5L25vZGVfbW9kdWxlcy9sb2Rhc2guZm9yb3duL25vZGVfbW9kdWxlcy9sb2Rhc2guX2Jhc2VjcmVhdGVjYWxsYmFjay9ub2RlX21vZHVsZXMvbG9kYXNoLmJpbmQvbm9kZV9tb2R1bGVzL2xvZGFzaC5fc2xpY2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL25vZGVfbW9kdWxlcy9sb2Rhc2guaWRlbnRpdHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5fYmFzZWNyZWF0ZWNhbGxiYWNrL25vZGVfbW9kdWxlcy9sb2Rhc2guc3VwcG9ydC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNlbXB0eS9ub2RlX21vZHVsZXMvbG9kYXNoLmZvcm93bi9ub2RlX21vZHVsZXMvbG9kYXNoLl9vYmplY3R0eXBlcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNlbXB0eS9ub2RlX21vZHVsZXMvbG9kYXNoLmZvcm93bi9ub2RlX21vZHVsZXMvbG9kYXNoLmtleXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzZW1wdHkvbm9kZV9tb2R1bGVzL2xvZGFzaC5mb3Jvd24vbm9kZV9tb2R1bGVzL2xvZGFzaC5rZXlzL25vZGVfbW9kdWxlcy9sb2Rhc2guX3NoaW1rZXlzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc2Z1bmN0aW9uL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5pc29iamVjdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2guaXNzdHJpbmcvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLmlzdW5kZWZpbmVkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC5yZXN1bHQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLnRlbXBsYXRlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50ZW1wbGF0ZS9ub2RlX21vZHVsZXMvbG9kYXNoLl9lc2NhcGVzdHJpbmdjaGFyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50ZW1wbGF0ZS9ub2RlX21vZHVsZXMvbG9kYXNoLl9yZWludGVycG9sYXRlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50ZW1wbGF0ZS9ub2RlX21vZHVsZXMvbG9kYXNoLmRlZmF1bHRzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50ZW1wbGF0ZS9ub2RlX21vZHVsZXMvbG9kYXNoLmVzY2FwZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gudGVtcGxhdGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5lc2NhcGUvbm9kZV9tb2R1bGVzL2xvZGFzaC5fZXNjYXBlaHRtbGNoYXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLnRlbXBsYXRlL25vZGVfbW9kdWxlcy9sb2Rhc2guZXNjYXBlL25vZGVfbW9kdWxlcy9sb2Rhc2guX2VzY2FwZWh0bWxjaGFyL25vZGVfbW9kdWxlcy9sb2Rhc2guX2h0bWxlc2NhcGVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC50ZW1wbGF0ZS9ub2RlX21vZHVsZXMvbG9kYXNoLmVzY2FwZS9ub2RlX21vZHVsZXMvbG9kYXNoLl9yZXVuZXNjYXBlZGh0bWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLnRlbXBsYXRlL25vZGVfbW9kdWxlcy9sb2Rhc2gudGVtcGxhdGVzZXR0aW5ncy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gudGVtcGxhdGUvbm9kZV9tb2R1bGVzL2xvZGFzaC52YWx1ZXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbG9kYXNoLnVuaXF1ZWlkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3NwaW4uanMvc3Bpbi5qcyIsInNyYy9ibG9jay1jb250cm9sLmpzIiwic3JjL2Jsb2NrLWNvbnRyb2xzLmpzIiwic3JjL2Jsb2NrLmRlbGV0aW9uLmpzIiwic3JjL2Jsb2NrLmpzIiwic3JjL2Jsb2NrLnBvc2l0aW9uZXIuanMiLCJzcmMvYmxvY2sucmVvcmRlci5qcyIsInNyYy9ibG9jay5zdG9yZS5qcyIsInNyYy9ibG9jay52YWxpZGF0aW9ucy5qcyIsInNyYy9ibG9ja19taXhpbnMvYWpheGFibGUuanMiLCJzcmMvYmxvY2tfbWl4aW5zL2NvbnRyb2xsYWJsZS5qcyIsInNyYy9ibG9ja19taXhpbnMvZHJvcHBhYmxlLmpzIiwic3JjL2Jsb2NrX21peGlucy9mZXRjaGFibGUuanMiLCJzcmMvYmxvY2tfbWl4aW5zL2luZGV4LmpzIiwic3JjL2Jsb2NrX21peGlucy9wYXN0YWJsZS5qcyIsInNyYy9ibG9ja19taXhpbnMvdXBsb2FkYWJsZS5qcyIsInNyYy9ibG9ja3MvYmxvY2stcXVvdGUuanMiLCJzcmMvYmxvY2tzL2hlYWRpbmcuanMiLCJzcmMvYmxvY2tzL2ltYWdlLmpzIiwic3JjL2Jsb2Nrcy9pbmRleC5qcyIsInNyYy9ibG9ja3MvcmVkYWN0b3IuanMiLCJzcmMvYmxvY2tzL3RleHQtaW1hZ2UuanMiLCJzcmMvYmxvY2tzL3RleHQuanMiLCJzcmMvYmxvY2tzL3R3ZWV0LmpzIiwic3JjL2Jsb2Nrcy91bm9yZGVyZWQtbGlzdC5qcyIsInNyYy9ibG9ja3MvdmlkZW8uanMiLCJzcmMvYmxvY2tzL3d5c2lodG1sLmpzIiwic3JjL2NvbmZpZy5qcyIsInNyYy9lZGl0b3IuanMiLCJzcmMvZXZlbnQtYnVzLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9leHRlbnNpb25zL3Npci10cmV2b3IuZWRpdG9yLXN0b3JlLmpzIiwic3JjL2V4dGVuc2lvbnMvc2lyLXRyZXZvci5zdWJtaXR0YWJsZS5qcyIsInNyYy9leHRlbnNpb25zL3Npci10cmV2b3IudXBsb2FkZXIuanMiLCJzcmMvZmxvYXRpbmctYmxvY2stY29udHJvbHMuanMiLCJzcmMvZm9ybS1ldmVudHMuanMiLCJzcmMvZm9ybWF0LWJhci5qcyIsInNyYy9mb3JtYXR0ZXIuanMiLCJzcmMvZm9ybWF0dGVycy5qcyIsInNyYy9mdW5jdGlvbi1iaW5kLmpzIiwic3JjL2hlbHBlcnMvZXZlbnQuanMiLCJzcmMvaGVscGVycy9leHRlbmQuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbG9jYWxlcy5qcyIsInNyYy9sb2Rhc2guanMiLCJzcmMvcmVuZGVyYWJsZS5qcyIsInNyYy9zaW1wbGUtYmxvY2suanMiLCJzcmMvdG8taHRtbC5qcyIsInNyYy90by1tYXJrZG93bi5qcyIsInNyYy91dGlscy5qcyIsInNyYy92ZW5kb3IvYXJyYXktaW5jbHVkZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9NQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7OztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3aUJBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjLycpO1xuIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGEgbW9kdWxlLlxuICAgIGRlZmluZSgnZXZlbnRhYmxlJywgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gKHJvb3QuRXZlbnRhYmxlID0gZmFjdG9yeSgpKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBOb2RlLiBEb2VzIG5vdCB3b3JrIHdpdGggc3RyaWN0IENvbW1vbkpTLCBidXQgb25seSBDb21tb25KUy1saWtlXG4gICAgLy8gZW52aXJvbWVudHMgdGhhdCBzdXBwb3J0IG1vZHVsZS5leHBvcnRzLCBsaWtlIE5vZGUuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5FdmVudGFibGUgPSBmYWN0b3J5KCk7XG4gIH1cbn0odGhpcywgZnVuY3Rpb24oKSB7XG5cbiAgLy8gQ29weSBhbmQgcGFzdGVkIHN0cmFpZ2h0IG91dCBvZiBCYWNrYm9uZSAxLjAuMFxuICAvLyBXZSdsbCB0cnkgYW5kIGtlZXAgdGhpcyB1cGRhdGVkIHRvIHRoZSBsYXRlc3RcblxuICB2YXIgYXJyYXkgPSBbXTtcbiAgdmFyIHNsaWNlID0gYXJyYXkuc2xpY2U7XG5cbiAgZnVuY3Rpb24gb25jZShmdW5jKSB7XG4gICAgdmFyIG1lbW8sIHRpbWVzID0gMjtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzID4gMCkge1xuICAgICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZnVuYyA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9XG5cbiAgLy8gQmFja2JvbmUuRXZlbnRzXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEEgbW9kdWxlIHRoYXQgY2FuIGJlIG1peGVkIGluIHRvICphbnkgb2JqZWN0KiBpbiBvcmRlciB0byBwcm92aWRlIGl0IHdpdGhcbiAgLy8gY3VzdG9tIGV2ZW50cy4gWW91IG1heSBiaW5kIHdpdGggYG9uYCBvciByZW1vdmUgd2l0aCBgb2ZmYCBjYWxsYmFja1xuICAvLyBmdW5jdGlvbnMgdG8gYW4gZXZlbnQ7IGB0cmlnZ2VyYC1pbmcgYW4gZXZlbnQgZmlyZXMgYWxsIGNhbGxiYWNrcyBpblxuICAvLyBzdWNjZXNzaW9uLlxuICAvL1xuICAvLyAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAvLyAgICAgZXh0ZW5kKG9iamVjdCwgQmFja2JvbmUuRXZlbnRzKTtcbiAgLy8gICAgIG9iamVjdC5vbignZXhwYW5kJywgZnVuY3Rpb24oKXsgYWxlcnQoJ2V4cGFuZGVkJyk7IH0pO1xuICAvLyAgICAgb2JqZWN0LnRyaWdnZXIoJ2V4cGFuZCcpO1xuICAvL1xuICB2YXIgRXZlbnRhYmxlID0ge1xuXG4gICAgLy8gQmluZCBhbiBldmVudCB0byBhIGBjYWxsYmFja2AgZnVuY3Rpb24uIFBhc3NpbmcgYFwiYWxsXCJgIHdpbGwgYmluZFxuICAgIC8vIHRoZSBjYWxsYmFjayB0byBhbGwgZXZlbnRzIGZpcmVkLlxuICAgIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uJywgbmFtZSwgW2NhbGxiYWNrLCBjb250ZXh0XSkgfHwgIWNhbGxiYWNrKSByZXR1cm4gdGhpcztcbiAgICAgIHRoaXMuX2V2ZW50cyB8fCAodGhpcy5fZXZlbnRzID0ge30pO1xuICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCAodGhpcy5fZXZlbnRzW25hbWVdID0gW10pO1xuICAgICAgZXZlbnRzLnB1c2goe2NhbGxiYWNrOiBjYWxsYmFjaywgY29udGV4dDogY29udGV4dCwgY3R4OiBjb250ZXh0IHx8IHRoaXN9KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBCaW5kIGFuIGV2ZW50IHRvIG9ubHkgYmUgdHJpZ2dlcmVkIGEgc2luZ2xlIHRpbWUuIEFmdGVyIHRoZSBmaXJzdCB0aW1lXG4gICAgLy8gdGhlIGNhbGxiYWNrIGlzIGludm9rZWQsIGl0IHdpbGwgYmUgcmVtb3ZlZC5cbiAgICBvbmNlOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaywgY29udGV4dCkge1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ29uY2UnLCBuYW1lLCBbY2FsbGJhY2ssIGNvbnRleHRdKSB8fCAhY2FsbGJhY2spIHJldHVybiB0aGlzO1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGZ1bmMgPSBvbmNlKGZ1bmN0aW9uKCkge1xuICAgICAgICBzZWxmLm9mZihuYW1lLCBmdW5jKTtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH0pO1xuICAgICAgZnVuYy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgIHJldHVybiB0aGlzLm9uKG5hbWUsIGZ1bmMsIGNvbnRleHQpO1xuICAgIH0sXG5cbiAgICAvLyBSZW1vdmUgb25lIG9yIG1hbnkgY2FsbGJhY2tzLiBJZiBgY29udGV4dGAgaXMgbnVsbCwgcmVtb3ZlcyBhbGxcbiAgICAvLyBjYWxsYmFja3Mgd2l0aCB0aGF0IGZ1bmN0aW9uLiBJZiBgY2FsbGJhY2tgIGlzIG51bGwsIHJlbW92ZXMgYWxsXG4gICAgLy8gY2FsbGJhY2tzIGZvciB0aGUgZXZlbnQuIElmIGBuYW1lYCBpcyBudWxsLCByZW1vdmVzIGFsbCBib3VuZFxuICAgIC8vIGNhbGxiYWNrcyBmb3IgYWxsIGV2ZW50cy5cbiAgICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmV0YWluLCBldiwgZXZlbnRzLCBuYW1lcywgaSwgbCwgaiwgaztcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzIHx8ICFldmVudHNBcGkodGhpcywgJ29mZicsIG5hbWUsIFtjYWxsYmFjaywgY29udGV4dF0pKSByZXR1cm4gdGhpcztcbiAgICAgIGlmICghbmFtZSAmJiAhY2FsbGJhY2sgJiYgIWNvbnRleHQpIHtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBuYW1lcyA9IG5hbWUgPyBbbmFtZV0gOiBPYmplY3Qua2V5cyh0aGlzLl9ldmVudHMpO1xuICAgICAgZm9yIChpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgIGlmIChldmVudHMgPSB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgICAgICB0aGlzLl9ldmVudHNbbmFtZV0gPSByZXRhaW4gPSBbXTtcbiAgICAgICAgICBpZiAoY2FsbGJhY2sgfHwgY29udGV4dCkge1xuICAgICAgICAgICAgZm9yIChqID0gMCwgayA9IGV2ZW50cy5sZW5ndGg7IGogPCBrOyBqKyspIHtcbiAgICAgICAgICAgICAgZXYgPSBldmVudHNbal07XG4gICAgICAgICAgICAgIGlmICgoY2FsbGJhY2sgJiYgY2FsbGJhY2sgIT09IGV2LmNhbGxiYWNrICYmIGNhbGxiYWNrICE9PSBldi5jYWxsYmFjay5fY2FsbGJhY2spIHx8XG4gICAgICAgICAgICAgICAgICAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBldi5jb250ZXh0KSkge1xuICAgICAgICAgICAgICAgIHJldGFpbi5wdXNoKGV2KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIXJldGFpbi5sZW5ndGgpIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIFRyaWdnZXIgb25lIG9yIG1hbnkgZXZlbnRzLCBmaXJpbmcgYWxsIGJvdW5kIGNhbGxiYWNrcy4gQ2FsbGJhY2tzIGFyZVxuICAgIC8vIHBhc3NlZCB0aGUgc2FtZSBhcmd1bWVudHMgYXMgYHRyaWdnZXJgIGlzLCBhcGFydCBmcm9tIHRoZSBldmVudCBuYW1lXG4gICAgLy8gKHVubGVzcyB5b3UncmUgbGlzdGVuaW5nIG9uIGBcImFsbFwiYCwgd2hpY2ggd2lsbCBjYXVzZSB5b3VyIGNhbGxiYWNrIHRvXG4gICAgLy8gcmVjZWl2ZSB0aGUgdHJ1ZSBuYW1lIG9mIHRoZSBldmVudCBhcyB0aGUgZmlyc3QgYXJndW1lbnQpLlxuICAgIHRyaWdnZXI6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcbiAgICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgaWYgKCFldmVudHNBcGkodGhpcywgJ3RyaWdnZXInLCBuYW1lLCBhcmdzKSkgcmV0dXJuIHRoaXM7XG4gICAgICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICAgICAgdmFyIGFsbEV2ZW50cyA9IHRoaXMuX2V2ZW50cy5hbGw7XG4gICAgICBpZiAoZXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGV2ZW50cywgYXJncyk7XG4gICAgICBpZiAoYWxsRXZlbnRzKSB0cmlnZ2VyRXZlbnRzKGFsbEV2ZW50cywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBUZWxsIHRoaXMgb2JqZWN0IHRvIHN0b3AgbGlzdGVuaW5nIHRvIGVpdGhlciBzcGVjaWZpYyBldmVudHMgLi4uIG9yXG4gICAgLy8gdG8gZXZlcnkgb2JqZWN0IGl0J3MgY3VycmVudGx5IGxpc3RlbmluZyB0by5cbiAgICBzdG9wTGlzdGVuaW5nOiBmdW5jdGlvbihvYmosIG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzO1xuICAgICAgaWYgKCFsaXN0ZW5lcnMpIHJldHVybiB0aGlzO1xuICAgICAgdmFyIGRlbGV0ZUxpc3RlbmVyID0gIW5hbWUgJiYgIWNhbGxiYWNrO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgICAgaWYgKG9iaikgKGxpc3RlbmVycyA9IHt9KVtvYmouX2xpc3RlbmVySWRdID0gb2JqO1xuICAgICAgZm9yICh2YXIgaWQgaW4gbGlzdGVuZXJzKSB7XG4gICAgICAgIGxpc3RlbmVyc1tpZF0ub2ZmKG5hbWUsIGNhbGxiYWNrLCB0aGlzKTtcbiAgICAgICAgaWYgKGRlbGV0ZUxpc3RlbmVyKSBkZWxldGUgdGhpcy5fbGlzdGVuZXJzW2lkXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICB9O1xuXG4gIC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHNwbGl0IGV2ZW50IHN0cmluZ3MuXG4gIHZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG4gIC8vIEltcGxlbWVudCBmYW5jeSBmZWF0dXJlcyBvZiB0aGUgRXZlbnRzIEFQSSBzdWNoIGFzIG11bHRpcGxlIGV2ZW50XG4gIC8vIG5hbWVzIGBcImNoYW5nZSBibHVyXCJgIGFuZCBqUXVlcnktc3R5bGUgZXZlbnQgbWFwcyBge2NoYW5nZTogYWN0aW9ufWBcbiAgLy8gaW4gdGVybXMgb2YgdGhlIGV4aXN0aW5nIEFQSS5cbiAgdmFyIGV2ZW50c0FwaSA9IGZ1bmN0aW9uKG9iaiwgYWN0aW9uLCBuYW1lLCByZXN0KSB7XG4gICAgaWYgKCFuYW1lKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIEhhbmRsZSBldmVudCBtYXBzLlxuICAgIGlmICh0eXBlb2YgbmFtZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBuYW1lKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW2tleSwgbmFtZVtrZXldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBzcGFjZSBzZXBhcmF0ZWQgZXZlbnQgbmFtZXMuXG4gICAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lKSkge1xuICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgIG9ialthY3Rpb25dLmFwcGx5KG9iaiwgW25hbWVzW2ldXS5jb25jYXQocmVzdCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIEEgZGlmZmljdWx0LXRvLWJlbGlldmUsIGJ1dCBvcHRpbWl6ZWQgaW50ZXJuYWwgZGlzcGF0Y2ggZnVuY3Rpb24gZm9yXG4gIC8vIHRyaWdnZXJpbmcgZXZlbnRzLiBUcmllcyB0byBrZWVwIHRoZSB1c3VhbCBjYXNlcyBzcGVlZHkgKG1vc3QgaW50ZXJuYWxcbiAgLy8gQmFja2JvbmUgZXZlbnRzIGhhdmUgMyBhcmd1bWVudHMpLlxuICB2YXIgdHJpZ2dlckV2ZW50cyA9IGZ1bmN0aW9uKGV2ZW50cywgYXJncykge1xuICAgIHZhciBldiwgaSA9IC0xLCBsID0gZXZlbnRzLmxlbmd0aCwgYTEgPSBhcmdzWzBdLCBhMiA9IGFyZ3NbMV0sIGEzID0gYXJnc1syXTtcbiAgICBzd2l0Y2ggKGFyZ3MubGVuZ3RoKSB7XG4gICAgICBjYXNlIDA6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4KTsgcmV0dXJuO1xuICAgICAgY2FzZSAxOiB3aGlsZSAoKytpIDwgbCkgKGV2ID0gZXZlbnRzW2ldKS5jYWxsYmFjay5jYWxsKGV2LmN0eCwgYTEpOyByZXR1cm47XG4gICAgICBjYXNlIDI6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIpOyByZXR1cm47XG4gICAgICBjYXNlIDM6IHdoaWxlICgrK2kgPCBsKSAoZXYgPSBldmVudHNbaV0pLmNhbGxiYWNrLmNhbGwoZXYuY3R4LCBhMSwgYTIsIGEzKTsgcmV0dXJuO1xuICAgICAgZGVmYXVsdDogd2hpbGUgKCsraSA8IGwpIChldiA9IGV2ZW50c1tpXSkuY2FsbGJhY2suYXBwbHkoZXYuY3R4LCBhcmdzKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGxpc3Rlbk1ldGhvZHMgPSB7bGlzdGVuVG86ICdvbicsIGxpc3RlblRvT25jZTogJ29uY2UnfTtcblxuICAvLyBJbnZlcnNpb24tb2YtY29udHJvbCB2ZXJzaW9ucyBvZiBgb25gIGFuZCBgb25jZWAuIFRlbGwgKnRoaXMqIG9iamVjdCB0b1xuICAvLyBsaXN0ZW4gdG8gYW4gZXZlbnQgaW4gYW5vdGhlciBvYmplY3QgLi4uIGtlZXBpbmcgdHJhY2sgb2Ygd2hhdCBpdCdzXG4gIC8vIGxpc3RlbmluZyB0by5cbiAgZnVuY3Rpb24gYWRkTGlzdGVuTWV0aG9kKG1ldGhvZCwgaW1wbGVtZW50YXRpb24pIHtcbiAgICBFdmVudGFibGVbbWV0aG9kXSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnMgfHwgKHRoaXMuX2xpc3RlbmVycyA9IHt9KTtcbiAgICAgIHZhciBpZCA9IG9iai5fbGlzdGVuZXJJZCB8fCAob2JqLl9saXN0ZW5lcklkID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKSk7XG4gICAgICBsaXN0ZW5lcnNbaWRdID0gb2JqO1xuICAgICAgaWYgKHR5cGVvZiBuYW1lID09PSAnb2JqZWN0JykgY2FsbGJhY2sgPSB0aGlzO1xuICAgICAgb2JqW2ltcGxlbWVudGF0aW9uXShuYW1lLCBjYWxsYmFjaywgdGhpcyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICB9XG5cbiAgYWRkTGlzdGVuTWV0aG9kKCdsaXN0ZW5UbycsICdvbicpO1xuICBhZGRMaXN0ZW5NZXRob2QoJ2xpc3RlblRvT25jZScsICdvbmNlJyk7XG5cbiAgLy8gQWxpYXNlcyBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG4gIEV2ZW50YWJsZS5iaW5kICAgPSBFdmVudGFibGUub247XG4gIEV2ZW50YWJsZS51bmJpbmQgPSBFdmVudGFibGUub2ZmO1xuXG4gIHJldHVybiBFdmVudGFibGU7XG5cbn0pKTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgZm9yT3duID0gcmVxdWlyZSgnbG9kYXNoLmZvcm93bicpLFxuICAgIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpO1xuXG4vKiogYE9iamVjdCN0b1N0cmluZ2AgcmVzdWx0IHNob3J0Y3V0cyAqL1xudmFyIGFyZ3NDbGFzcyA9ICdbb2JqZWN0IEFyZ3VtZW50c10nLFxuICAgIGFycmF5Q2xhc3MgPSAnW29iamVjdCBBcnJheV0nLFxuICAgIG9iamVjdENsYXNzID0gJ1tvYmplY3QgT2JqZWN0XScsXG4gICAgc3RyaW5nQ2xhc3MgPSAnW29iamVjdCBTdHJpbmddJztcblxuLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcyAqL1xudmFyIG9iamVjdFByb3RvID0gT2JqZWN0LnByb3RvdHlwZTtcblxuLyoqIFVzZWQgdG8gcmVzb2x2ZSB0aGUgaW50ZXJuYWwgW1tDbGFzc11dIG9mIHZhbHVlcyAqL1xudmFyIHRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgZW1wdHkuIEFycmF5cywgc3RyaW5ncywgb3IgYGFyZ3VtZW50c2Agb2JqZWN0cyB3aXRoIGFcbiAqIGxlbmd0aCBvZiBgMGAgYW5kIG9iamVjdHMgd2l0aCBubyBvd24gZW51bWVyYWJsZSBwcm9wZXJ0aWVzIGFyZSBjb25zaWRlcmVkXG4gKiBcImVtcHR5XCIuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RzXG4gKiBAcGFyYW0ge0FycmF5fE9iamVjdHxzdHJpbmd9IHZhbHVlIFRoZSB2YWx1ZSB0byBpbnNwZWN0LlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGVtcHR5LCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNFbXB0eShbMSwgMiwgM10pO1xuICogLy8gPT4gZmFsc2VcbiAqXG4gKiBfLmlzRW1wdHkoe30pO1xuICogLy8gPT4gdHJ1ZVxuICpcbiAqIF8uaXNFbXB0eSgnJyk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpIHtcbiAgdmFyIHJlc3VsdCA9IHRydWU7XG4gIGlmICghdmFsdWUpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKHZhbHVlKSxcbiAgICAgIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcblxuICBpZiAoKGNsYXNzTmFtZSA9PSBhcnJheUNsYXNzIHx8IGNsYXNzTmFtZSA9PSBzdHJpbmdDbGFzcyB8fCBjbGFzc05hbWUgPT0gYXJnc0NsYXNzICkgfHxcbiAgICAgIChjbGFzc05hbWUgPT0gb2JqZWN0Q2xhc3MgJiYgdHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyAmJiBpc0Z1bmN0aW9uKHZhbHVlLnNwbGljZSkpKSB7XG4gICAgcmV0dXJuICFsZW5ndGg7XG4gIH1cbiAgZm9yT3duKHZhbHVlLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gKHJlc3VsdCA9IGZhbHNlKTtcbiAgfSk7XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNFbXB0eTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUNyZWF0ZUNhbGxiYWNrID0gcmVxdWlyZSgnbG9kYXNoLl9iYXNlY3JlYXRlY2FsbGJhY2snKSxcbiAgICBrZXlzID0gcmVxdWlyZSgnbG9kYXNoLmtleXMnKSxcbiAgICBvYmplY3RUeXBlcyA9IHJlcXVpcmUoJ2xvZGFzaC5fb2JqZWN0dHlwZXMnKTtcblxuLyoqXG4gKiBJdGVyYXRlcyBvdmVyIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0LCBleGVjdXRpbmcgdGhlIGNhbGxiYWNrXG4gKiBmb3IgZWFjaCBwcm9wZXJ0eS4gVGhlIGNhbGxiYWNrIGlzIGJvdW5kIHRvIGB0aGlzQXJnYCBhbmQgaW52b2tlZCB3aXRoIHRocmVlXG4gKiBhcmd1bWVudHM7ICh2YWx1ZSwga2V5LCBvYmplY3QpLiBDYWxsYmFja3MgbWF5IGV4aXQgaXRlcmF0aW9uIGVhcmx5IGJ5XG4gKiBleHBsaWNpdGx5IHJldHVybmluZyBgZmFsc2VgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAdHlwZSBGdW5jdGlvblxuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2s9aWRlbnRpdHldIFRoZSBmdW5jdGlvbiBjYWxsZWQgcGVyIGl0ZXJhdGlvbi5cbiAqIEBwYXJhbSB7Kn0gW3RoaXNBcmddIFRoZSBgdGhpc2AgYmluZGluZyBvZiBgY2FsbGJhY2tgLlxuICogQHJldHVybnMge09iamVjdH0gUmV0dXJucyBgb2JqZWN0YC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5mb3JPd24oeyAnMCc6ICd6ZXJvJywgJzEnOiAnb25lJywgJ2xlbmd0aCc6IDIgfSwgZnVuY3Rpb24obnVtLCBrZXkpIHtcbiAqICAgY29uc29sZS5sb2coa2V5KTtcbiAqIH0pO1xuICogLy8gPT4gbG9ncyAnMCcsICcxJywgYW5kICdsZW5ndGgnIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICovXG52YXIgZm9yT3duID0gZnVuY3Rpb24oY29sbGVjdGlvbiwgY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgdmFyIGluZGV4LCBpdGVyYWJsZSA9IGNvbGxlY3Rpb24sIHJlc3VsdCA9IGl0ZXJhYmxlO1xuICBpZiAoIWl0ZXJhYmxlKSByZXR1cm4gcmVzdWx0O1xuICBpZiAoIW9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0pIHJldHVybiByZXN1bHQ7XG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgJiYgdHlwZW9mIHRoaXNBcmcgPT0gJ3VuZGVmaW5lZCcgPyBjYWxsYmFjayA6IGJhc2VDcmVhdGVDYWxsYmFjayhjYWxsYmFjaywgdGhpc0FyZywgMyk7XG4gICAgdmFyIG93bkluZGV4ID0gLTEsXG4gICAgICAgIG93blByb3BzID0gb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSAmJiBrZXlzKGl0ZXJhYmxlKSxcbiAgICAgICAgbGVuZ3RoID0gb3duUHJvcHMgPyBvd25Qcm9wcy5sZW5ndGggOiAwO1xuXG4gICAgd2hpbGUgKCsrb3duSW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIGluZGV4ID0gb3duUHJvcHNbb3duSW5kZXhdO1xuICAgICAgaWYgKGNhbGxiYWNrKGl0ZXJhYmxlW2luZGV4XSwgaW5kZXgsIGNvbGxlY3Rpb24pID09PSBmYWxzZSkgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIHJldHVybiByZXN1bHRcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZm9yT3duO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBiaW5kID0gcmVxdWlyZSgnbG9kYXNoLmJpbmQnKSxcbiAgICBpZGVudGl0eSA9IHJlcXVpcmUoJ2xvZGFzaC5pZGVudGl0eScpLFxuICAgIHNldEJpbmREYXRhID0gcmVxdWlyZSgnbG9kYXNoLl9zZXRiaW5kZGF0YScpLFxuICAgIHN1cHBvcnQgPSByZXF1aXJlKCdsb2Rhc2guc3VwcG9ydCcpO1xuXG4vKiogVXNlZCB0byBkZXRlY3RlZCBuYW1lZCBmdW5jdGlvbnMgKi9cbnZhciByZUZ1bmNOYW1lID0gL15cXHMqZnVuY3Rpb25bIFxcblxcclxcdF0rXFx3LztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGZ1bmN0aW9ucyBjb250YWluaW5nIGEgYHRoaXNgIHJlZmVyZW5jZSAqL1xudmFyIHJlVGhpcyA9IC9cXGJ0aGlzXFxiLztcblxuLyoqIE5hdGl2ZSBtZXRob2Qgc2hvcnRjdXRzICovXG52YXIgZm5Ub1N0cmluZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5jcmVhdGVDYWxsYmFja2Agd2l0aG91dCBzdXBwb3J0IGZvciBjcmVhdGluZ1xuICogXCJfLnBsdWNrXCIgb3IgXCJfLndoZXJlXCIgc3R5bGUgY2FsbGJhY2tzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IFtmdW5jPWlkZW50aXR5XSBUaGUgdmFsdWUgdG8gY29udmVydCB0byBhIGNhbGxiYWNrLlxuICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIHRoZSBjcmVhdGVkIGNhbGxiYWNrLlxuICogQHBhcmFtIHtudW1iZXJ9IFthcmdDb3VudF0gVGhlIG51bWJlciBvZiBhcmd1bWVudHMgdGhlIGNhbGxiYWNrIGFjY2VwdHMuXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IFJldHVybnMgYSBjYWxsYmFjayBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gYmFzZUNyZWF0ZUNhbGxiYWNrKGZ1bmMsIHRoaXNBcmcsIGFyZ0NvdW50KSB7XG4gIGlmICh0eXBlb2YgZnVuYyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGlkZW50aXR5O1xuICB9XG4gIC8vIGV4aXQgZWFybHkgZm9yIG5vIGB0aGlzQXJnYCBvciBhbHJlYWR5IGJvdW5kIGJ5IGBGdW5jdGlvbiNiaW5kYFxuICBpZiAodHlwZW9mIHRoaXNBcmcgPT0gJ3VuZGVmaW5lZCcgfHwgISgncHJvdG90eXBlJyBpbiBmdW5jKSkge1xuICAgIHJldHVybiBmdW5jO1xuICB9XG4gIHZhciBiaW5kRGF0YSA9IGZ1bmMuX19iaW5kRGF0YV9fO1xuICBpZiAodHlwZW9mIGJpbmREYXRhID09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHN1cHBvcnQuZnVuY05hbWVzKSB7XG4gICAgICBiaW5kRGF0YSA9ICFmdW5jLm5hbWU7XG4gICAgfVxuICAgIGJpbmREYXRhID0gYmluZERhdGEgfHwgIXN1cHBvcnQuZnVuY0RlY29tcDtcbiAgICBpZiAoIWJpbmREYXRhKSB7XG4gICAgICB2YXIgc291cmNlID0gZm5Ub1N0cmluZy5jYWxsKGZ1bmMpO1xuICAgICAgaWYgKCFzdXBwb3J0LmZ1bmNOYW1lcykge1xuICAgICAgICBiaW5kRGF0YSA9ICFyZUZ1bmNOYW1lLnRlc3Qoc291cmNlKTtcbiAgICAgIH1cbiAgICAgIGlmICghYmluZERhdGEpIHtcbiAgICAgICAgLy8gY2hlY2tzIGlmIGBmdW5jYCByZWZlcmVuY2VzIHRoZSBgdGhpc2Aga2V5d29yZCBhbmQgc3RvcmVzIHRoZSByZXN1bHRcbiAgICAgICAgYmluZERhdGEgPSByZVRoaXMudGVzdChzb3VyY2UpO1xuICAgICAgICBzZXRCaW5kRGF0YShmdW5jLCBiaW5kRGF0YSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGV4aXQgZWFybHkgaWYgdGhlcmUgYXJlIG5vIGB0aGlzYCByZWZlcmVuY2VzIG9yIGBmdW5jYCBpcyBib3VuZFxuICBpZiAoYmluZERhdGEgPT09IGZhbHNlIHx8IChiaW5kRGF0YSAhPT0gdHJ1ZSAmJiBiaW5kRGF0YVsxXSAmIDEpKSB7XG4gICAgcmV0dXJuIGZ1bmM7XG4gIH1cbiAgc3dpdGNoIChhcmdDb3VudCkge1xuICAgIGNhc2UgMTogcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNBcmcsIHZhbHVlKTtcbiAgICB9O1xuICAgIGNhc2UgMjogcmV0dXJuIGZ1bmN0aW9uKGEsIGIpIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgYSwgYik7XG4gICAgfTtcbiAgICBjYXNlIDM6IHJldHVybiBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgdmFsdWUsIGluZGV4LCBjb2xsZWN0aW9uKTtcbiAgICB9O1xuICAgIGNhc2UgNDogcmV0dXJuIGZ1bmN0aW9uKGFjY3VtdWxhdG9yLCB2YWx1ZSwgaW5kZXgsIGNvbGxlY3Rpb24pIHtcbiAgICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0FyZywgYWNjdW11bGF0b3IsIHZhbHVlLCBpbmRleCwgY29sbGVjdGlvbik7XG4gICAgfTtcbiAgfVxuICByZXR1cm4gYmluZChmdW5jLCB0aGlzQXJnKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlQ3JlYXRlQ2FsbGJhY2s7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzTmF0aXZlID0gcmVxdWlyZSgnbG9kYXNoLl9pc25hdGl2ZScpLFxuICAgIG5vb3AgPSByZXF1aXJlKCdsb2Rhc2gubm9vcCcpO1xuXG4vKiogVXNlZCBhcyB0aGUgcHJvcGVydHkgZGVzY3JpcHRvciBmb3IgYF9fYmluZERhdGFfX2AgKi9cbnZhciBkZXNjcmlwdG9yID0ge1xuICAnY29uZmlndXJhYmxlJzogZmFsc2UsXG4gICdlbnVtZXJhYmxlJzogZmFsc2UsXG4gICd2YWx1ZSc6IG51bGwsXG4gICd3cml0YWJsZSc6IGZhbHNlXG59O1xuXG4vKiogVXNlZCB0byBzZXQgbWV0YSBkYXRhIG9uIGZ1bmN0aW9ucyAqL1xudmFyIGRlZmluZVByb3BlcnR5ID0gKGZ1bmN0aW9uKCkge1xuICAvLyBJRSA4IG9ubHkgYWNjZXB0cyBET00gZWxlbWVudHNcbiAgdHJ5IHtcbiAgICB2YXIgbyA9IHt9LFxuICAgICAgICBmdW5jID0gaXNOYXRpdmUoZnVuYyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSkgJiYgZnVuYyxcbiAgICAgICAgcmVzdWx0ID0gZnVuYyhvLCBvLCBvKSAmJiBmdW5jO1xuICB9IGNhdGNoKGUpIHsgfVxuICByZXR1cm4gcmVzdWx0O1xufSgpKTtcblxuLyoqXG4gKiBTZXRzIGB0aGlzYCBiaW5kaW5nIGRhdGEgb24gYSBnaXZlbiBmdW5jdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gc2V0IGRhdGEgb24uXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSBUaGUgZGF0YSBhcnJheSB0byBzZXQuXG4gKi9cbnZhciBzZXRCaW5kRGF0YSA9ICFkZWZpbmVQcm9wZXJ0eSA/IG5vb3AgOiBmdW5jdGlvbihmdW5jLCB2YWx1ZSkge1xuICBkZXNjcmlwdG9yLnZhbHVlID0gdmFsdWU7XG4gIGRlZmluZVByb3BlcnR5KGZ1bmMsICdfX2JpbmREYXRhX18nLCBkZXNjcmlwdG9yKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0QmluZERhdGE7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBpbnRlcm5hbCBbW0NsYXNzXV0gb2YgdmFsdWVzICovXG52YXIgdG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGlmIGEgbWV0aG9kIGlzIG5hdGl2ZSAqL1xudmFyIHJlTmF0aXZlID0gUmVnRXhwKCdeJyArXG4gIFN0cmluZyh0b1N0cmluZylcbiAgICAucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKVxuICAgIC5yZXBsYWNlKC90b1N0cmluZ3wgZm9yIFteXFxdXSsvZywgJy4qPycpICsgJyQnXG4pO1xuXG4vKipcbiAqIENoZWNrcyBpZiBgdmFsdWVgIGlzIGEgbmF0aXZlIGZ1bmN0aW9uLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBhIG5hdGl2ZSBmdW5jdGlvbiwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBpc05hdGl2ZSh2YWx1ZSkge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09ICdmdW5jdGlvbicgJiYgcmVOYXRpdmUudGVzdCh2YWx1ZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNOYXRpdmU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIEEgbm8tb3BlcmF0aW9uIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICduYW1lJzogJ2ZyZWQnIH07XG4gKiBfLm5vb3Aob2JqZWN0KSA9PT0gdW5kZWZpbmVkO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBub29wKCkge1xuICAvLyBubyBvcGVyYXRpb24gcGVyZm9ybWVkXG59XG5cbm1vZHVsZS5leHBvcnRzID0gbm9vcDtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgY3JlYXRlV3JhcHBlciA9IHJlcXVpcmUoJ2xvZGFzaC5fY3JlYXRld3JhcHBlcicpLFxuICAgIHNsaWNlID0gcmVxdWlyZSgnbG9kYXNoLl9zbGljZScpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgaW52b2tlcyBgZnVuY2Agd2l0aCB0aGUgYHRoaXNgXG4gKiBiaW5kaW5nIG9mIGB0aGlzQXJnYCBhbmQgcHJlcGVuZHMgYW55IGFkZGl0aW9uYWwgYGJpbmRgIGFyZ3VtZW50cyB0byB0aG9zZVxuICogcHJvdmlkZWQgdG8gdGhlIGJvdW5kIGZ1bmN0aW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25zXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBmdW5jdGlvbiB0byBiaW5kLlxuICogQHBhcmFtIHsqfSBbdGhpc0FyZ10gVGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBmdW5jYC5cbiAqIEBwYXJhbSB7Li4uKn0gW2FyZ10gQXJndW1lbnRzIHRvIGJlIHBhcnRpYWxseSBhcHBsaWVkLlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYm91bmQgZnVuY3Rpb24uXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBmdW5jID0gZnVuY3Rpb24oZ3JlZXRpbmcpIHtcbiAqICAgcmV0dXJuIGdyZWV0aW5nICsgJyAnICsgdGhpcy5uYW1lO1xuICogfTtcbiAqXG4gKiBmdW5jID0gXy5iaW5kKGZ1bmMsIHsgJ25hbWUnOiAnZnJlZCcgfSwgJ2hpJyk7XG4gKiBmdW5jKCk7XG4gKiAvLyA9PiAnaGkgZnJlZCdcbiAqL1xuZnVuY3Rpb24gYmluZChmdW5jLCB0aGlzQXJnKSB7XG4gIHJldHVybiBhcmd1bWVudHMubGVuZ3RoID4gMlxuICAgID8gY3JlYXRlV3JhcHBlcihmdW5jLCAxNywgc2xpY2UoYXJndW1lbnRzLCAyKSwgbnVsbCwgdGhpc0FyZylcbiAgICA6IGNyZWF0ZVdyYXBwZXIoZnVuYywgMSwgbnVsbCwgbnVsbCwgdGhpc0FyZyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYmluZDtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUJpbmQgPSByZXF1aXJlKCdsb2Rhc2guX2Jhc2ViaW5kJyksXG4gICAgYmFzZUNyZWF0ZVdyYXBwZXIgPSByZXF1aXJlKCdsb2Rhc2guX2Jhc2VjcmVhdGV3cmFwcGVyJyksXG4gICAgaXNGdW5jdGlvbiA9IHJlcXVpcmUoJ2xvZGFzaC5pc2Z1bmN0aW9uJyksXG4gICAgc2xpY2UgPSByZXF1aXJlKCdsb2Rhc2guX3NsaWNlJyk7XG5cbi8qKlxuICogVXNlZCBmb3IgYEFycmF5YCBtZXRob2QgcmVmZXJlbmNlcy5cbiAqXG4gKiBOb3JtYWxseSBgQXJyYXkucHJvdG90eXBlYCB3b3VsZCBzdWZmaWNlLCBob3dldmVyLCB1c2luZyBhbiBhcnJheSBsaXRlcmFsXG4gKiBhdm9pZHMgaXNzdWVzIGluIE5hcndoYWwuXG4gKi9cbnZhciBhcnJheVJlZiA9IFtdO1xuXG4vKiogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgKi9cbnZhciBwdXNoID0gYXJyYXlSZWYucHVzaCxcbiAgICB1bnNoaWZ0ID0gYXJyYXlSZWYudW5zaGlmdDtcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIGVpdGhlciBjdXJyaWVzIG9yIGludm9rZXMgYGZ1bmNgXG4gKiB3aXRoIGFuIG9wdGlvbmFsIGB0aGlzYCBiaW5kaW5nIGFuZCBwYXJ0aWFsbHkgYXBwbGllZCBhcmd1bWVudHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RnVuY3Rpb258c3RyaW5nfSBmdW5jIFRoZSBmdW5jdGlvbiBvciBtZXRob2QgbmFtZSB0byByZWZlcmVuY2UuXG4gKiBAcGFyYW0ge251bWJlcn0gYml0bWFzayBUaGUgYml0bWFzayBvZiBtZXRob2QgZmxhZ3MgdG8gY29tcG9zZS5cbiAqICBUaGUgYml0bWFzayBtYXkgYmUgY29tcG9zZWQgb2YgdGhlIGZvbGxvd2luZyBmbGFnczpcbiAqICAxIC0gYF8uYmluZGBcbiAqICAyIC0gYF8uYmluZEtleWBcbiAqICA0IC0gYF8uY3VycnlgXG4gKiAgOCAtIGBfLmN1cnJ5YCAoYm91bmQpXG4gKiAgMTYgLSBgXy5wYXJ0aWFsYFxuICogIDMyIC0gYF8ucGFydGlhbFJpZ2h0YFxuICogQHBhcmFtIHtBcnJheX0gW3BhcnRpYWxBcmdzXSBBbiBhcnJheSBvZiBhcmd1bWVudHMgdG8gcHJlcGVuZCB0byB0aG9zZVxuICogIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gKiBAcGFyYW0ge0FycmF5fSBbcGFydGlhbFJpZ2h0QXJnc10gQW4gYXJyYXkgb2YgYXJndW1lbnRzIHRvIGFwcGVuZCB0byB0aG9zZVxuICogIHByb3ZpZGVkIHRvIHRoZSBuZXcgZnVuY3Rpb24uXG4gKiBAcGFyYW0geyp9IFt0aGlzQXJnXSBUaGUgYHRoaXNgIGJpbmRpbmcgb2YgYGZ1bmNgLlxuICogQHBhcmFtIHtudW1iZXJ9IFthcml0eV0gVGhlIGFyaXR5IG9mIGBmdW5jYC5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IGZ1bmN0aW9uLlxuICovXG5mdW5jdGlvbiBjcmVhdGVXcmFwcGVyKGZ1bmMsIGJpdG1hc2ssIHBhcnRpYWxBcmdzLCBwYXJ0aWFsUmlnaHRBcmdzLCB0aGlzQXJnLCBhcml0eSkge1xuICB2YXIgaXNCaW5kID0gYml0bWFzayAmIDEsXG4gICAgICBpc0JpbmRLZXkgPSBiaXRtYXNrICYgMixcbiAgICAgIGlzQ3VycnkgPSBiaXRtYXNrICYgNCxcbiAgICAgIGlzQ3VycnlCb3VuZCA9IGJpdG1hc2sgJiA4LFxuICAgICAgaXNQYXJ0aWFsID0gYml0bWFzayAmIDE2LFxuICAgICAgaXNQYXJ0aWFsUmlnaHQgPSBiaXRtYXNrICYgMzI7XG5cbiAgaWYgKCFpc0JpbmRLZXkgJiYgIWlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICB9XG4gIGlmIChpc1BhcnRpYWwgJiYgIXBhcnRpYWxBcmdzLmxlbmd0aCkge1xuICAgIGJpdG1hc2sgJj0gfjE2O1xuICAgIGlzUGFydGlhbCA9IHBhcnRpYWxBcmdzID0gZmFsc2U7XG4gIH1cbiAgaWYgKGlzUGFydGlhbFJpZ2h0ICYmICFwYXJ0aWFsUmlnaHRBcmdzLmxlbmd0aCkge1xuICAgIGJpdG1hc2sgJj0gfjMyO1xuICAgIGlzUGFydGlhbFJpZ2h0ID0gcGFydGlhbFJpZ2h0QXJncyA9IGZhbHNlO1xuICB9XG4gIHZhciBiaW5kRGF0YSA9IGZ1bmMgJiYgZnVuYy5fX2JpbmREYXRhX187XG4gIGlmIChiaW5kRGF0YSAmJiBiaW5kRGF0YSAhPT0gdHJ1ZSkge1xuICAgIC8vIGNsb25lIGBiaW5kRGF0YWBcbiAgICBiaW5kRGF0YSA9IHNsaWNlKGJpbmREYXRhKTtcbiAgICBpZiAoYmluZERhdGFbMl0pIHtcbiAgICAgIGJpbmREYXRhWzJdID0gc2xpY2UoYmluZERhdGFbMl0pO1xuICAgIH1cbiAgICBpZiAoYmluZERhdGFbM10pIHtcbiAgICAgIGJpbmREYXRhWzNdID0gc2xpY2UoYmluZERhdGFbM10pO1xuICAgIH1cbiAgICAvLyBzZXQgYHRoaXNCaW5kaW5nYCBpcyBub3QgcHJldmlvdXNseSBib3VuZFxuICAgIGlmIChpc0JpbmQgJiYgIShiaW5kRGF0YVsxXSAmIDEpKSB7XG4gICAgICBiaW5kRGF0YVs0XSA9IHRoaXNBcmc7XG4gICAgfVxuICAgIC8vIHNldCBpZiBwcmV2aW91c2x5IGJvdW5kIGJ1dCBub3QgY3VycmVudGx5IChzdWJzZXF1ZW50IGN1cnJpZWQgZnVuY3Rpb25zKVxuICAgIGlmICghaXNCaW5kICYmIGJpbmREYXRhWzFdICYgMSkge1xuICAgICAgYml0bWFzayB8PSA4O1xuICAgIH1cbiAgICAvLyBzZXQgY3VycmllZCBhcml0eSBpZiBub3QgeWV0IHNldFxuICAgIGlmIChpc0N1cnJ5ICYmICEoYmluZERhdGFbMV0gJiA0KSkge1xuICAgICAgYmluZERhdGFbNV0gPSBhcml0eTtcbiAgICB9XG4gICAgLy8gYXBwZW5kIHBhcnRpYWwgbGVmdCBhcmd1bWVudHNcbiAgICBpZiAoaXNQYXJ0aWFsKSB7XG4gICAgICBwdXNoLmFwcGx5KGJpbmREYXRhWzJdIHx8IChiaW5kRGF0YVsyXSA9IFtdKSwgcGFydGlhbEFyZ3MpO1xuICAgIH1cbiAgICAvLyBhcHBlbmQgcGFydGlhbCByaWdodCBhcmd1bWVudHNcbiAgICBpZiAoaXNQYXJ0aWFsUmlnaHQpIHtcbiAgICAgIHVuc2hpZnQuYXBwbHkoYmluZERhdGFbM10gfHwgKGJpbmREYXRhWzNdID0gW10pLCBwYXJ0aWFsUmlnaHRBcmdzKTtcbiAgICB9XG4gICAgLy8gbWVyZ2UgZmxhZ3NcbiAgICBiaW5kRGF0YVsxXSB8PSBiaXRtYXNrO1xuICAgIHJldHVybiBjcmVhdGVXcmFwcGVyLmFwcGx5KG51bGwsIGJpbmREYXRhKTtcbiAgfVxuICAvLyBmYXN0IHBhdGggZm9yIGBfLmJpbmRgXG4gIHZhciBjcmVhdGVyID0gKGJpdG1hc2sgPT0gMSB8fCBiaXRtYXNrID09PSAxNykgPyBiYXNlQmluZCA6IGJhc2VDcmVhdGVXcmFwcGVyO1xuICByZXR1cm4gY3JlYXRlcihbZnVuYywgYml0bWFzaywgcGFydGlhbEFyZ3MsIHBhcnRpYWxSaWdodEFyZ3MsIHRoaXNBcmcsIGFyaXR5XSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlV3JhcHBlcjtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUNyZWF0ZSA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZWNyZWF0ZScpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0JyksXG4gICAgc2V0QmluZERhdGEgPSByZXF1aXJlKCdsb2Rhc2guX3NldGJpbmRkYXRhJyksXG4gICAgc2xpY2UgPSByZXF1aXJlKCdsb2Rhc2guX3NsaWNlJyk7XG5cbi8qKlxuICogVXNlZCBmb3IgYEFycmF5YCBtZXRob2QgcmVmZXJlbmNlcy5cbiAqXG4gKiBOb3JtYWxseSBgQXJyYXkucHJvdG90eXBlYCB3b3VsZCBzdWZmaWNlLCBob3dldmVyLCB1c2luZyBhbiBhcnJheSBsaXRlcmFsXG4gKiBhdm9pZHMgaXNzdWVzIGluIE5hcndoYWwuXG4gKi9cbnZhciBhcnJheVJlZiA9IFtdO1xuXG4vKiogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgKi9cbnZhciBwdXNoID0gYXJyYXlSZWYucHVzaDtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgXy5iaW5kYCB0aGF0IGNyZWF0ZXMgdGhlIGJvdW5kIGZ1bmN0aW9uIGFuZFxuICogc2V0cyBpdHMgbWV0YSBkYXRhLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBiaW5kRGF0YSBUaGUgYmluZCBkYXRhIGFycmF5LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgYm91bmQgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VCaW5kKGJpbmREYXRhKSB7XG4gIHZhciBmdW5jID0gYmluZERhdGFbMF0sXG4gICAgICBwYXJ0aWFsQXJncyA9IGJpbmREYXRhWzJdLFxuICAgICAgdGhpc0FyZyA9IGJpbmREYXRhWzRdO1xuXG4gIGZ1bmN0aW9uIGJvdW5kKCkge1xuICAgIC8vIGBGdW5jdGlvbiNiaW5kYCBzcGVjXG4gICAgLy8gaHR0cDovL2VzNS5naXRodWIuaW8vI3gxNS4zLjQuNVxuICAgIGlmIChwYXJ0aWFsQXJncykge1xuICAgICAgLy8gYXZvaWQgYGFyZ3VtZW50c2Agb2JqZWN0IGRlb3B0aW1pemF0aW9ucyBieSB1c2luZyBgc2xpY2VgIGluc3RlYWRcbiAgICAgIC8vIG9mIGBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbGAgYW5kIG5vdCBhc3NpZ25pbmcgYGFyZ3VtZW50c2AgdG8gYVxuICAgICAgLy8gdmFyaWFibGUgYXMgYSB0ZXJuYXJ5IGV4cHJlc3Npb25cbiAgICAgIHZhciBhcmdzID0gc2xpY2UocGFydGlhbEFyZ3MpO1xuICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICAvLyBtaW1pYyB0aGUgY29uc3RydWN0b3IncyBgcmV0dXJuYCBiZWhhdmlvclxuICAgIC8vIGh0dHA6Ly9lczUuZ2l0aHViLmlvLyN4MTMuMi4yXG4gICAgaWYgKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkge1xuICAgICAgLy8gZW5zdXJlIGBuZXcgYm91bmRgIGlzIGFuIGluc3RhbmNlIG9mIGBmdW5jYFxuICAgICAgdmFyIHRoaXNCaW5kaW5nID0gYmFzZUNyZWF0ZShmdW5jLnByb3RvdHlwZSksXG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyB8fCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIGlzT2JqZWN0KHJlc3VsdCkgPyByZXN1bHQgOiB0aGlzQmluZGluZztcbiAgICB9XG4gICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpc0FyZywgYXJncyB8fCBhcmd1bWVudHMpO1xuICB9XG4gIHNldEJpbmREYXRhKGJvdW5kLCBiaW5kRGF0YSk7XG4gIHJldHVybiBib3VuZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBiYXNlQmluZDtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgaXNOYXRpdmUgPSByZXF1aXJlKCdsb2Rhc2guX2lzbmF0aXZlJyksXG4gICAgaXNPYmplY3QgPSByZXF1aXJlKCdsb2Rhc2guaXNvYmplY3QnKSxcbiAgICBub29wID0gcmVxdWlyZSgnbG9kYXNoLm5vb3AnKTtcblxuLyogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgZm9yIG1ldGhvZHMgd2l0aCB0aGUgc2FtZSBuYW1lIGFzIG90aGVyIGBsb2Rhc2hgIG1ldGhvZHMgKi9cbnZhciBuYXRpdmVDcmVhdGUgPSBpc05hdGl2ZShuYXRpdmVDcmVhdGUgPSBPYmplY3QuY3JlYXRlKSAmJiBuYXRpdmVDcmVhdGU7XG5cbi8qKlxuICogVGhlIGJhc2UgaW1wbGVtZW50YXRpb24gb2YgYF8uY3JlYXRlYCB3aXRob3V0IHN1cHBvcnQgZm9yIGFzc2lnbmluZ1xuICogcHJvcGVydGllcyB0byB0aGUgY3JlYXRlZCBvYmplY3QuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm90b3R5cGUgVGhlIG9iamVjdCB0byBpbmhlcml0IGZyb20uXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBuZXcgb2JqZWN0LlxuICovXG5mdW5jdGlvbiBiYXNlQ3JlYXRlKHByb3RvdHlwZSwgcHJvcGVydGllcykge1xuICByZXR1cm4gaXNPYmplY3QocHJvdG90eXBlKSA/IG5hdGl2ZUNyZWF0ZShwcm90b3R5cGUpIDoge307XG59XG4vLyBmYWxsYmFjayBmb3IgYnJvd3NlcnMgd2l0aG91dCBgT2JqZWN0LmNyZWF0ZWBcbmlmICghbmF0aXZlQ3JlYXRlKSB7XG4gIGJhc2VDcmVhdGUgPSAoZnVuY3Rpb24oKSB7XG4gICAgZnVuY3Rpb24gT2JqZWN0KCkge31cbiAgICByZXR1cm4gZnVuY3Rpb24ocHJvdG90eXBlKSB7XG4gICAgICBpZiAoaXNPYmplY3QocHJvdG90eXBlKSkge1xuICAgICAgICBPYmplY3QucHJvdG90eXBlID0gcHJvdG90eXBlO1xuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IE9iamVjdDtcbiAgICAgICAgT2JqZWN0LnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0IHx8IGdsb2JhbC5PYmplY3QoKTtcbiAgICB9O1xuICB9KCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VDcmVhdGU7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgYmFzZUNyZWF0ZSA9IHJlcXVpcmUoJ2xvZGFzaC5fYmFzZWNyZWF0ZScpLFxuICAgIGlzT2JqZWN0ID0gcmVxdWlyZSgnbG9kYXNoLmlzb2JqZWN0JyksXG4gICAgc2V0QmluZERhdGEgPSByZXF1aXJlKCdsb2Rhc2guX3NldGJpbmRkYXRhJyksXG4gICAgc2xpY2UgPSByZXF1aXJlKCdsb2Rhc2guX3NsaWNlJyk7XG5cbi8qKlxuICogVXNlZCBmb3IgYEFycmF5YCBtZXRob2QgcmVmZXJlbmNlcy5cbiAqXG4gKiBOb3JtYWxseSBgQXJyYXkucHJvdG90eXBlYCB3b3VsZCBzdWZmaWNlLCBob3dldmVyLCB1c2luZyBhbiBhcnJheSBsaXRlcmFsXG4gKiBhdm9pZHMgaXNzdWVzIGluIE5hcndoYWwuXG4gKi9cbnZhciBhcnJheVJlZiA9IFtdO1xuXG4vKiogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgKi9cbnZhciBwdXNoID0gYXJyYXlSZWYucHVzaDtcblxuLyoqXG4gKiBUaGUgYmFzZSBpbXBsZW1lbnRhdGlvbiBvZiBgY3JlYXRlV3JhcHBlcmAgdGhhdCBjcmVhdGVzIHRoZSB3cmFwcGVyIGFuZFxuICogc2V0cyBpdHMgbWV0YSBkYXRhLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSBiaW5kRGF0YSBUaGUgYmluZCBkYXRhIGFycmF5LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIGJhc2VDcmVhdGVXcmFwcGVyKGJpbmREYXRhKSB7XG4gIHZhciBmdW5jID0gYmluZERhdGFbMF0sXG4gICAgICBiaXRtYXNrID0gYmluZERhdGFbMV0sXG4gICAgICBwYXJ0aWFsQXJncyA9IGJpbmREYXRhWzJdLFxuICAgICAgcGFydGlhbFJpZ2h0QXJncyA9IGJpbmREYXRhWzNdLFxuICAgICAgdGhpc0FyZyA9IGJpbmREYXRhWzRdLFxuICAgICAgYXJpdHkgPSBiaW5kRGF0YVs1XTtcblxuICB2YXIgaXNCaW5kID0gYml0bWFzayAmIDEsXG4gICAgICBpc0JpbmRLZXkgPSBiaXRtYXNrICYgMixcbiAgICAgIGlzQ3VycnkgPSBiaXRtYXNrICYgNCxcbiAgICAgIGlzQ3VycnlCb3VuZCA9IGJpdG1hc2sgJiA4LFxuICAgICAga2V5ID0gZnVuYztcblxuICBmdW5jdGlvbiBib3VuZCgpIHtcbiAgICB2YXIgdGhpc0JpbmRpbmcgPSBpc0JpbmQgPyB0aGlzQXJnIDogdGhpcztcbiAgICBpZiAocGFydGlhbEFyZ3MpIHtcbiAgICAgIHZhciBhcmdzID0gc2xpY2UocGFydGlhbEFyZ3MpO1xuICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBpZiAocGFydGlhbFJpZ2h0QXJncyB8fCBpc0N1cnJ5KSB7XG4gICAgICBhcmdzIHx8IChhcmdzID0gc2xpY2UoYXJndW1lbnRzKSk7XG4gICAgICBpZiAocGFydGlhbFJpZ2h0QXJncykge1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIHBhcnRpYWxSaWdodEFyZ3MpO1xuICAgICAgfVxuICAgICAgaWYgKGlzQ3VycnkgJiYgYXJncy5sZW5ndGggPCBhcml0eSkge1xuICAgICAgICBiaXRtYXNrIHw9IDE2ICYgfjMyO1xuICAgICAgICByZXR1cm4gYmFzZUNyZWF0ZVdyYXBwZXIoW2Z1bmMsIChpc0N1cnJ5Qm91bmQgPyBiaXRtYXNrIDogYml0bWFzayAmIH4zKSwgYXJncywgbnVsbCwgdGhpc0FyZywgYXJpdHldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXJncyB8fCAoYXJncyA9IGFyZ3VtZW50cyk7XG4gICAgaWYgKGlzQmluZEtleSkge1xuICAgICAgZnVuYyA9IHRoaXNCaW5kaW5nW2tleV07XG4gICAgfVxuICAgIGlmICh0aGlzIGluc3RhbmNlb2YgYm91bmQpIHtcbiAgICAgIHRoaXNCaW5kaW5nID0gYmFzZUNyZWF0ZShmdW5jLnByb3RvdHlwZSk7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyk7XG4gICAgICByZXR1cm4gaXNPYmplY3QocmVzdWx0KSA/IHJlc3VsdCA6IHRoaXNCaW5kaW5nO1xuICAgIH1cbiAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzQmluZGluZywgYXJncyk7XG4gIH1cbiAgc2V0QmluZERhdGEoYm91bmQsIGJpbmREYXRhKTtcbiAgcmV0dXJuIGJvdW5kO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJhc2VDcmVhdGVXcmFwcGVyO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqXG4gKiBTbGljZXMgdGhlIGBjb2xsZWN0aW9uYCBmcm9tIHRoZSBgc3RhcnRgIGluZGV4IHVwIHRvLCBidXQgbm90IGluY2x1ZGluZyxcbiAqIHRoZSBgZW5kYCBpbmRleC5cbiAqXG4gKiBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIHVzZWQgaW5zdGVhZCBvZiBgQXJyYXkjc2xpY2VgIHRvIHN1cHBvcnQgbm9kZSBsaXN0c1xuICogaW4gSUUgPCA5IGFuZCB0byBlbnN1cmUgZGVuc2UgYXJyYXlzIGFyZSByZXR1cm5lZC5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheXxPYmplY3R8c3RyaW5nfSBjb2xsZWN0aW9uIFRoZSBjb2xsZWN0aW9uIHRvIHNsaWNlLlxuICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0IFRoZSBzdGFydCBpbmRleC5cbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgVGhlIGVuZCBpbmRleC5cbiAqIEByZXR1cm5zIHtBcnJheX0gUmV0dXJucyB0aGUgbmV3IGFycmF5LlxuICovXG5mdW5jdGlvbiBzbGljZShhcnJheSwgc3RhcnQsIGVuZCkge1xuICBzdGFydCB8fCAoc3RhcnQgPSAwKTtcbiAgaWYgKHR5cGVvZiBlbmQgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBlbmQgPSBhcnJheSA/IGFycmF5Lmxlbmd0aCA6IDA7XG4gIH1cbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBsZW5ndGggPSBlbmQgLSBzdGFydCB8fCAwLFxuICAgICAgcmVzdWx0ID0gQXJyYXkobGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGgpO1xuXG4gIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgcmVzdWx0W2luZGV4XSA9IGFycmF5W3N0YXJ0ICsgaW5kZXhdO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2xpY2U7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKipcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIGZpcnN0IGFyZ3VtZW50IHByb3ZpZGVkIHRvIGl0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBAcGFyYW0geyp9IHZhbHVlIEFueSB2YWx1ZS5cbiAqIEByZXR1cm5zIHsqfSBSZXR1cm5zIGB2YWx1ZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIHZhciBvYmplY3QgPSB7ICduYW1lJzogJ2ZyZWQnIH07XG4gKiBfLmlkZW50aXR5KG9iamVjdCkgPT09IG9iamVjdDtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlkZW50aXR5O1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc05hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5faXNuYXRpdmUnKTtcblxuLyoqIFVzZWQgdG8gZGV0ZWN0IGZ1bmN0aW9ucyBjb250YWluaW5nIGEgYHRoaXNgIHJlZmVyZW5jZSAqL1xudmFyIHJlVGhpcyA9IC9cXGJ0aGlzXFxiLztcblxuLyoqXG4gKiBBbiBvYmplY3QgdXNlZCB0byBmbGFnIGVudmlyb25tZW50cyBmZWF0dXJlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHR5cGUgT2JqZWN0XG4gKi9cbnZhciBzdXBwb3J0ID0ge307XG5cbi8qKlxuICogRGV0ZWN0IGlmIGZ1bmN0aW9ucyBjYW4gYmUgZGVjb21waWxlZCBieSBgRnVuY3Rpb24jdG9TdHJpbmdgXG4gKiAoYWxsIGJ1dCBQUzMgYW5kIG9sZGVyIE9wZXJhIG1vYmlsZSBicm93c2VycyAmIGF2b2lkZWQgaW4gV2luZG93cyA4IGFwcHMpLlxuICpcbiAqIEBtZW1iZXJPZiBfLnN1cHBvcnRcbiAqIEB0eXBlIGJvb2xlYW5cbiAqL1xuc3VwcG9ydC5mdW5jRGVjb21wID0gIWlzTmF0aXZlKGdsb2JhbC5XaW5SVEVycm9yKSAmJiByZVRoaXMudGVzdChmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pO1xuXG4vKipcbiAqIERldGVjdCBpZiBgRnVuY3Rpb24jbmFtZWAgaXMgc3VwcG9ydGVkIChhbGwgYnV0IElFKS5cbiAqXG4gKiBAbWVtYmVyT2YgXy5zdXBwb3J0XG4gKiBAdHlwZSBib29sZWFuXG4gKi9cbnN1cHBvcnQuZnVuY05hbWVzID0gdHlwZW9mIEZ1bmN0aW9uLm5hbWUgPT0gJ3N0cmluZyc7XG5cbm1vZHVsZS5leHBvcnRzID0gc3VwcG9ydDtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIFVzZWQgdG8gZGV0ZXJtaW5lIGlmIHZhbHVlcyBhcmUgb2YgdGhlIGxhbmd1YWdlIHR5cGUgT2JqZWN0ICovXG52YXIgb2JqZWN0VHlwZXMgPSB7XG4gICdib29sZWFuJzogZmFsc2UsXG4gICdmdW5jdGlvbic6IHRydWUsXG4gICdvYmplY3QnOiB0cnVlLFxuICAnbnVtYmVyJzogZmFsc2UsXG4gICdzdHJpbmcnOiBmYWxzZSxcbiAgJ3VuZGVmaW5lZCc6IGZhbHNlXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG9iamVjdFR5cGVzO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBpc05hdGl2ZSA9IHJlcXVpcmUoJ2xvZGFzaC5faXNuYXRpdmUnKSxcbiAgICBpc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpLFxuICAgIHNoaW1LZXlzID0gcmVxdWlyZSgnbG9kYXNoLl9zaGlta2V5cycpO1xuXG4vKiBOYXRpdmUgbWV0aG9kIHNob3J0Y3V0cyBmb3IgbWV0aG9kcyB3aXRoIHRoZSBzYW1lIG5hbWUgYXMgb3RoZXIgYGxvZGFzaGAgbWV0aG9kcyAqL1xudmFyIG5hdGl2ZUtleXMgPSBpc05hdGl2ZShuYXRpdmVLZXlzID0gT2JqZWN0LmtleXMpICYmIG5hdGl2ZUtleXM7XG5cbi8qKlxuICogQ3JlYXRlcyBhbiBhcnJheSBjb21wb3NlZCBvZiB0aGUgb3duIGVudW1lcmFibGUgcHJvcGVydHkgbmFtZXMgb2YgYW4gb2JqZWN0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgT2JqZWN0c1xuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8ua2V5cyh7ICdvbmUnOiAxLCAndHdvJzogMiwgJ3RocmVlJzogMyB9KTtcbiAqIC8vID0+IFsnb25lJywgJ3R3bycsICd0aHJlZSddIChwcm9wZXJ0eSBvcmRlciBpcyBub3QgZ3VhcmFudGVlZCBhY3Jvc3MgZW52aXJvbm1lbnRzKVxuICovXG52YXIga2V5cyA9ICFuYXRpdmVLZXlzID8gc2hpbUtleXMgOiBmdW5jdGlvbihvYmplY3QpIHtcbiAgaWYgKCFpc09iamVjdChvYmplY3QpKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIHJldHVybiBuYXRpdmVLZXlzKG9iamVjdCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGtleXM7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIG9iamVjdFR5cGVzID0gcmVxdWlyZSgnbG9kYXNoLl9vYmplY3R0eXBlcycpO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogTmF0aXZlIG1ldGhvZCBzaG9ydGN1dHMgKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIEEgZmFsbGJhY2sgaW1wbGVtZW50YXRpb24gb2YgYE9iamVjdC5rZXlzYCB3aGljaCBwcm9kdWNlcyBhbiBhcnJheSBvZiB0aGVcbiAqIGdpdmVuIG9iamVjdCdzIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IG5hbWVzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAdHlwZSBGdW5jdGlvblxuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gKiBAcmV0dXJucyB7QXJyYXl9IFJldHVybnMgYW4gYXJyYXkgb2YgcHJvcGVydHkgbmFtZXMuXG4gKi9cbnZhciBzaGltS2V5cyA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICB2YXIgaW5kZXgsIGl0ZXJhYmxlID0gb2JqZWN0LCByZXN1bHQgPSBbXTtcbiAgaWYgKCFpdGVyYWJsZSkgcmV0dXJuIHJlc3VsdDtcbiAgaWYgKCEob2JqZWN0VHlwZXNbdHlwZW9mIG9iamVjdF0pKSByZXR1cm4gcmVzdWx0O1xuICAgIGZvciAoaW5kZXggaW4gaXRlcmFibGUpIHtcbiAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKGl0ZXJhYmxlLCBpbmRleCkpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goaW5kZXgpO1xuICAgICAgfVxuICAgIH1cbiAgcmV0dXJuIHJlc3VsdFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzaGltS2V5cztcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYSBmdW5jdGlvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgZnVuY3Rpb24sIGVsc2UgYGZhbHNlYC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy5pc0Z1bmN0aW9uKF8pO1xuICogLy8gPT4gdHJ1ZVxuICovXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ2Z1bmN0aW9uJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc0Z1bmN0aW9uO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBvYmplY3RUeXBlcyA9IHJlcXVpcmUoJ2xvZGFzaC5fb2JqZWN0dHlwZXMnKTtcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyB0aGUgbGFuZ3VhZ2UgdHlwZSBvZiBPYmplY3QuXG4gKiAoZS5nLiBhcnJheXMsIGZ1bmN0aW9ucywgb2JqZWN0cywgcmVnZXhlcywgYG5ldyBOdW1iZXIoMClgLCBhbmQgYG5ldyBTdHJpbmcoJycpYClcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGFuIG9iamVjdCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzT2JqZWN0KHt9KTtcbiAqIC8vID0+IHRydWVcbiAqXG4gKiBfLmlzT2JqZWN0KFsxLCAyLCAzXSk7XG4gKiAvLyA9PiB0cnVlXG4gKlxuICogXy5pc09iamVjdCgxKTtcbiAqIC8vID0+IGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbHVlKSB7XG4gIC8vIGNoZWNrIGlmIHRoZSB2YWx1ZSBpcyB0aGUgRUNNQVNjcmlwdCBsYW5ndWFnZSB0eXBlIG9mIE9iamVjdFxuICAvLyBodHRwOi8vZXM1LmdpdGh1Yi5pby8jeDhcbiAgLy8gYW5kIGF2b2lkIGEgVjggYnVnXG4gIC8vIGh0dHA6Ly9jb2RlLmdvb2dsZS5jb20vcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTIyOTFcbiAgcmV0dXJuICEhKHZhbHVlICYmIG9iamVjdFR5cGVzW3R5cGVvZiB2YWx1ZV0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzT2JqZWN0O1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cblxuLyoqIGBPYmplY3QjdG9TdHJpbmdgIHJlc3VsdCBzaG9ydGN1dHMgKi9cbnZhciBzdHJpbmdDbGFzcyA9ICdbb2JqZWN0IFN0cmluZ10nO1xuXG4vKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byByZXNvbHZlIHRoZSBpbnRlcm5hbCBbW0NsYXNzXV0gb2YgdmFsdWVzICovXG52YXIgdG9TdHJpbmcgPSBvYmplY3RQcm90by50b1N0cmluZztcblxuLyoqXG4gKiBDaGVja3MgaWYgYHZhbHVlYCBpcyBhIHN0cmluZy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlIHRvIGNoZWNrLlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgYHRydWVgIGlmIHRoZSBgdmFsdWVgIGlzIGEgc3RyaW5nLCBlbHNlIGBmYWxzZWAuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uaXNTdHJpbmcoJ2ZyZWQnKTtcbiAqIC8vID0+IHRydWVcbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsdWUpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PSAnc3RyaW5nJyB8fFxuICAgIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyAmJiB0b1N0cmluZy5jYWxsKHZhbHVlKSA9PSBzdHJpbmdDbGFzcyB8fCBmYWxzZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpc1N0cmluZztcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogQ2hlY2tzIGlmIGB2YWx1ZWAgaXMgYHVuZGVmaW5lZGAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBPYmplY3RzXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgYHZhbHVlYCBpcyBgdW5kZWZpbmVkYCwgZWxzZSBgZmFsc2VgLlxuICogQGV4YW1wbGVcbiAqXG4gKiBfLmlzVW5kZWZpbmVkKHZvaWQgMCk7XG4gKiAvLyA9PiB0cnVlXG4gKi9cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKHZhbHVlKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT0gJ3VuZGVmaW5lZCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaXNVbmRlZmluZWQ7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpO1xuXG4vKipcbiAqIFJlc29sdmVzIHRoZSB2YWx1ZSBvZiBwcm9wZXJ0eSBga2V5YCBvbiBgb2JqZWN0YC4gSWYgYGtleWAgaXMgYSBmdW5jdGlvblxuICogaXQgd2lsbCBiZSBpbnZva2VkIHdpdGggdGhlIGB0aGlzYCBiaW5kaW5nIG9mIGBvYmplY3RgIGFuZCBpdHMgcmVzdWx0IHJldHVybmVkLFxuICogZWxzZSB0aGUgcHJvcGVydHkgdmFsdWUgaXMgcmV0dXJuZWQuIElmIGBvYmplY3RgIGlzIGZhbHNleSB0aGVuIGB1bmRlZmluZWRgXG4gKiBpcyByZXR1cm5lZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCBUaGUgb2JqZWN0IHRvIGluc3BlY3QuXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSB0byByZXNvbHZlLlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIHJlc29sdmVkIHZhbHVlLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgb2JqZWN0ID0ge1xuICogICAnY2hlZXNlJzogJ2NydW1wZXRzJyxcbiAqICAgJ3N0dWZmJzogZnVuY3Rpb24oKSB7XG4gKiAgICAgcmV0dXJuICdub25zZW5zZSc7XG4gKiAgIH1cbiAqIH07XG4gKlxuICogXy5yZXN1bHQob2JqZWN0LCAnY2hlZXNlJyk7XG4gKiAvLyA9PiAnY3J1bXBldHMnXG4gKlxuICogXy5yZXN1bHQob2JqZWN0LCAnc3R1ZmYnKTtcbiAqIC8vID0+ICdub25zZW5zZSdcbiAqL1xuZnVuY3Rpb24gcmVzdWx0KG9iamVjdCwga2V5KSB7XG4gIGlmIChvYmplY3QpIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICByZXR1cm4gaXNGdW5jdGlvbih2YWx1ZSkgPyBvYmplY3Rba2V5XSgpIDogdmFsdWU7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSByZXN1bHQ7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnbG9kYXNoLmRlZmF1bHRzJyksXG4gICAgZXNjYXBlID0gcmVxdWlyZSgnbG9kYXNoLmVzY2FwZScpLFxuICAgIGVzY2FwZVN0cmluZ0NoYXIgPSByZXF1aXJlKCdsb2Rhc2guX2VzY2FwZXN0cmluZ2NoYXInKSxcbiAgICBrZXlzID0gcmVxdWlyZSgnbG9kYXNoLmtleXMnKSxcbiAgICByZUludGVycG9sYXRlID0gcmVxdWlyZSgnbG9kYXNoLl9yZWludGVycG9sYXRlJyksXG4gICAgdGVtcGxhdGVTZXR0aW5ncyA9IHJlcXVpcmUoJ2xvZGFzaC50ZW1wbGF0ZXNldHRpbmdzJyksXG4gICAgdmFsdWVzID0gcmVxdWlyZSgnbG9kYXNoLnZhbHVlcycpO1xuXG4vKiogVXNlZCB0byBtYXRjaCBlbXB0eSBzdHJpbmcgbGl0ZXJhbHMgaW4gY29tcGlsZWQgdGVtcGxhdGUgc291cmNlICovXG52YXIgcmVFbXB0eVN0cmluZ0xlYWRpbmcgPSAvXFxiX19wIFxcKz0gJyc7L2csXG4gICAgcmVFbXB0eVN0cmluZ01pZGRsZSA9IC9cXGIoX19wIFxcKz0pICcnIFxcKy9nLFxuICAgIHJlRW1wdHlTdHJpbmdUcmFpbGluZyA9IC8oX19lXFwoLio/XFwpfFxcYl9fdFxcKSkgXFwrXFxuJyc7L2c7XG5cbi8qKlxuICogVXNlZCB0byBtYXRjaCBFUzYgdGVtcGxhdGUgZGVsaW1pdGVyc1xuICogaHR0cDovL3Blb3BsZS5tb3ppbGxhLm9yZy9+am9yZW5kb3JmZi9lczYtZHJhZnQuaHRtbCNzZWMtbGl0ZXJhbHMtc3RyaW5nLWxpdGVyYWxzXG4gKi9cbnZhciByZUVzVGVtcGxhdGUgPSAvXFwkXFx7KFteXFxcXH1dKig/OlxcXFwuW15cXFxcfV0qKSopXFx9L2c7XG5cbi8qKiBVc2VkIHRvIGVuc3VyZSBjYXB0dXJpbmcgb3JkZXIgb2YgdGVtcGxhdGUgZGVsaW1pdGVycyAqL1xudmFyIHJlTm9NYXRjaCA9IC8oJF4pLztcblxuLyoqIFVzZWQgdG8gbWF0Y2ggdW5lc2NhcGVkIGNoYXJhY3RlcnMgaW4gY29tcGlsZWQgc3RyaW5nIGxpdGVyYWxzICovXG52YXIgcmVVbmVzY2FwZWRTdHJpbmcgPSAvWydcXG5cXHJcXHRcXHUyMDI4XFx1MjAyOVxcXFxdL2c7XG5cbi8qKlxuICogQSBtaWNyby10ZW1wbGF0aW5nIG1ldGhvZCB0aGF0IGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlc1xuICogd2hpdGVzcGFjZSwgYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gKlxuICogTm90ZTogSW4gdGhlIGRldmVsb3BtZW50IGJ1aWxkLCBgXy50ZW1wbGF0ZWAgdXRpbGl6ZXMgc291cmNlVVJMcyBmb3IgZWFzaWVyXG4gKiBkZWJ1Z2dpbmcuIFNlZSBodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy9kZXZlbG9wZXJ0b29scy9zb3VyY2VtYXBzLyN0b2Mtc291cmNldXJsXG4gKlxuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gb24gcHJlY29tcGlsaW5nIHRlbXBsYXRlcyBzZWU6XG4gKiBodHRwOi8vbG9kYXNoLmNvbS9jdXN0b20tYnVpbGRzXG4gKlxuICogRm9yIG1vcmUgaW5mb3JtYXRpb24gb24gQ2hyb21lIGV4dGVuc2lvbiBzYW5kYm94ZXMgc2VlOlxuICogaHR0cDovL2RldmVsb3Blci5jaHJvbWUuY29tL3N0YWJsZS9leHRlbnNpb25zL3NhbmRib3hpbmdFdmFsLmh0bWxcbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IFV0aWxpdGllc1xuICogQHBhcmFtIHtzdHJpbmd9IHRleHQgVGhlIHRlbXBsYXRlIHRleHQuXG4gKiBAcGFyYW0ge09iamVjdH0gZGF0YSBUaGUgZGF0YSBvYmplY3QgdXNlZCB0byBwb3B1bGF0ZSB0aGUgdGV4dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc10gVGhlIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHtSZWdFeHB9IFtvcHRpb25zLmVzY2FwZV0gVGhlIFwiZXNjYXBlXCIgZGVsaW1pdGVyLlxuICogQHBhcmFtIHtSZWdFeHB9IFtvcHRpb25zLmV2YWx1YXRlXSBUaGUgXCJldmFsdWF0ZVwiIGRlbGltaXRlci5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucy5pbXBvcnRzXSBBbiBvYmplY3QgdG8gaW1wb3J0IGludG8gdGhlIHRlbXBsYXRlIGFzIGxvY2FsIHZhcmlhYmxlcy5cbiAqIEBwYXJhbSB7UmVnRXhwfSBbb3B0aW9ucy5pbnRlcnBvbGF0ZV0gVGhlIFwiaW50ZXJwb2xhdGVcIiBkZWxpbWl0ZXIuXG4gKiBAcGFyYW0ge3N0cmluZ30gW3NvdXJjZVVSTF0gVGhlIHNvdXJjZVVSTCBvZiB0aGUgdGVtcGxhdGUncyBjb21waWxlZCBzb3VyY2UuXG4gKiBAcGFyYW0ge3N0cmluZ30gW3ZhcmlhYmxlXSBUaGUgZGF0YSBvYmplY3QgdmFyaWFibGUgbmFtZS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbnxzdHJpbmd9IFJldHVybnMgYSBjb21waWxlZCBmdW5jdGlvbiB3aGVuIG5vIGBkYXRhYCBvYmplY3RcbiAqICBpcyBnaXZlbiwgZWxzZSBpdCByZXR1cm5zIHRoZSBpbnRlcnBvbGF0ZWQgdGV4dC5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gdXNpbmcgdGhlIFwiaW50ZXJwb2xhdGVcIiBkZWxpbWl0ZXIgdG8gY3JlYXRlIGEgY29tcGlsZWQgdGVtcGxhdGVcbiAqIHZhciBjb21waWxlZCA9IF8udGVtcGxhdGUoJ2hlbGxvIDwlPSBuYW1lICU+Jyk7XG4gKiBjb21waWxlZCh7ICduYW1lJzogJ2ZyZWQnIH0pO1xuICogLy8gPT4gJ2hlbGxvIGZyZWQnXG4gKlxuICogLy8gdXNpbmcgdGhlIFwiZXNjYXBlXCIgZGVsaW1pdGVyIHRvIGVzY2FwZSBIVE1MIGluIGRhdGEgcHJvcGVydHkgdmFsdWVzXG4gKiBfLnRlbXBsYXRlKCc8Yj48JS0gdmFsdWUgJT48L2I+JywgeyAndmFsdWUnOiAnPHNjcmlwdD4nIH0pO1xuICogLy8gPT4gJzxiPiZsdDtzY3JpcHQmZ3Q7PC9iPidcbiAqXG4gKiAvLyB1c2luZyB0aGUgXCJldmFsdWF0ZVwiIGRlbGltaXRlciB0byBnZW5lcmF0ZSBIVE1MXG4gKiB2YXIgbGlzdCA9ICc8JSBfLmZvckVhY2gocGVvcGxlLCBmdW5jdGlvbihuYW1lKSB7ICU+PGxpPjwlLSBuYW1lICU+PC9saT48JSB9KTsgJT4nO1xuICogXy50ZW1wbGF0ZShsaXN0LCB7ICdwZW9wbGUnOiBbJ2ZyZWQnLCAnYmFybmV5J10gfSk7XG4gKiAvLyA9PiAnPGxpPmZyZWQ8L2xpPjxsaT5iYXJuZXk8L2xpPidcbiAqXG4gKiAvLyB1c2luZyB0aGUgRVM2IGRlbGltaXRlciBhcyBhbiBhbHRlcm5hdGl2ZSB0byB0aGUgZGVmYXVsdCBcImludGVycG9sYXRlXCIgZGVsaW1pdGVyXG4gKiBfLnRlbXBsYXRlKCdoZWxsbyAkeyBuYW1lIH0nLCB7ICduYW1lJzogJ3BlYmJsZXMnIH0pO1xuICogLy8gPT4gJ2hlbGxvIHBlYmJsZXMnXG4gKlxuICogLy8gdXNpbmcgdGhlIGludGVybmFsIGBwcmludGAgZnVuY3Rpb24gaW4gXCJldmFsdWF0ZVwiIGRlbGltaXRlcnNcbiAqIF8udGVtcGxhdGUoJzwlIHByaW50KFwiaGVsbG8gXCIgKyBuYW1lKTsgJT4hJywgeyAnbmFtZSc6ICdiYXJuZXknIH0pO1xuICogLy8gPT4gJ2hlbGxvIGJhcm5leSEnXG4gKlxuICogLy8gdXNpbmcgYSBjdXN0b20gdGVtcGxhdGUgZGVsaW1pdGVyc1xuICogXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICogICAnaW50ZXJwb2xhdGUnOiAve3soW1xcc1xcU10rPyl9fS9nXG4gKiB9O1xuICpcbiAqIF8udGVtcGxhdGUoJ2hlbGxvIHt7IG5hbWUgfX0hJywgeyAnbmFtZSc6ICdtdXN0YWNoZScgfSk7XG4gKiAvLyA9PiAnaGVsbG8gbXVzdGFjaGUhJ1xuICpcbiAqIC8vIHVzaW5nIHRoZSBgaW1wb3J0c2Agb3B0aW9uIHRvIGltcG9ydCBqUXVlcnlcbiAqIHZhciBsaXN0ID0gJzwlIGpxLmVhY2gocGVvcGxlLCBmdW5jdGlvbihuYW1lKSB7ICU+PGxpPjwlLSBuYW1lICU+PC9saT48JSB9KTsgJT4nO1xuICogXy50ZW1wbGF0ZShsaXN0LCB7ICdwZW9wbGUnOiBbJ2ZyZWQnLCAnYmFybmV5J10gfSwgeyAnaW1wb3J0cyc6IHsgJ2pxJzogalF1ZXJ5IH0gfSk7XG4gKiAvLyA9PiAnPGxpPmZyZWQ8L2xpPjxsaT5iYXJuZXk8L2xpPidcbiAqXG4gKiAvLyB1c2luZyB0aGUgYHNvdXJjZVVSTGAgb3B0aW9uIHRvIHNwZWNpZnkgYSBjdXN0b20gc291cmNlVVJMIGZvciB0aGUgdGVtcGxhdGVcbiAqIHZhciBjb21waWxlZCA9IF8udGVtcGxhdGUoJ2hlbGxvIDwlPSBuYW1lICU+JywgbnVsbCwgeyAnc291cmNlVVJMJzogJy9iYXNpYy9ncmVldGluZy5qc3QnIH0pO1xuICogY29tcGlsZWQoZGF0YSk7XG4gKiAvLyA9PiBmaW5kIHRoZSBzb3VyY2Ugb2YgXCJncmVldGluZy5qc3RcIiB1bmRlciB0aGUgU291cmNlcyB0YWIgb3IgUmVzb3VyY2VzIHBhbmVsIG9mIHRoZSB3ZWIgaW5zcGVjdG9yXG4gKlxuICogLy8gdXNpbmcgdGhlIGB2YXJpYWJsZWAgb3B0aW9uIHRvIGVuc3VyZSBhIHdpdGgtc3RhdGVtZW50IGlzbid0IHVzZWQgaW4gdGhlIGNvbXBpbGVkIHRlbXBsYXRlXG4gKiB2YXIgY29tcGlsZWQgPSBfLnRlbXBsYXRlKCdoaSA8JT0gZGF0YS5uYW1lICU+IScsIG51bGwsIHsgJ3ZhcmlhYmxlJzogJ2RhdGEnIH0pO1xuICogY29tcGlsZWQuc291cmNlO1xuICogLy8gPT4gZnVuY3Rpb24oZGF0YSkge1xuICogICB2YXIgX190LCBfX3AgPSAnJywgX19lID0gXy5lc2NhcGU7XG4gKiAgIF9fcCArPSAnaGkgJyArICgoX190ID0gKCBkYXRhLm5hbWUgKSkgPT0gbnVsbCA/ICcnIDogX190KSArICchJztcbiAqICAgcmV0dXJuIF9fcDtcbiAqIH1cbiAqXG4gKiAvLyB1c2luZyB0aGUgYHNvdXJjZWAgcHJvcGVydHkgdG8gaW5saW5lIGNvbXBpbGVkIHRlbXBsYXRlcyBmb3IgbWVhbmluZ2Z1bFxuICogLy8gbGluZSBudW1iZXJzIGluIGVycm9yIG1lc3NhZ2VzIGFuZCBhIHN0YWNrIHRyYWNlXG4gKiBmcy53cml0ZUZpbGVTeW5jKHBhdGguam9pbihjd2QsICdqc3QuanMnKSwgJ1xcXG4gKiAgIHZhciBKU1QgPSB7XFxcbiAqICAgICBcIm1haW5cIjogJyArIF8udGVtcGxhdGUobWFpblRleHQpLnNvdXJjZSArICdcXFxuICogICB9O1xcXG4gKiAnKTtcbiAqL1xuZnVuY3Rpb24gdGVtcGxhdGUodGV4dCwgZGF0YSwgb3B0aW9ucykge1xuICAvLyBiYXNlZCBvbiBKb2huIFJlc2lnJ3MgYHRtcGxgIGltcGxlbWVudGF0aW9uXG4gIC8vIGh0dHA6Ly9lam9obi5vcmcvYmxvZy9qYXZhc2NyaXB0LW1pY3JvLXRlbXBsYXRpbmcvXG4gIC8vIGFuZCBMYXVyYSBEb2t0b3JvdmEncyBkb1QuanNcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL29sYWRvL2RvVFxuICB2YXIgc2V0dGluZ3MgPSB0ZW1wbGF0ZVNldHRpbmdzLmltcG9ydHMuXy50ZW1wbGF0ZVNldHRpbmdzIHx8IHRlbXBsYXRlU2V0dGluZ3M7XG4gIHRleHQgPSBTdHJpbmcodGV4dCB8fCAnJyk7XG5cbiAgLy8gYXZvaWQgbWlzc2luZyBkZXBlbmRlbmNpZXMgd2hlbiBgaXRlcmF0b3JUZW1wbGF0ZWAgaXMgbm90IGRlZmluZWRcbiAgb3B0aW9ucyA9IGRlZmF1bHRzKHt9LCBvcHRpb25zLCBzZXR0aW5ncyk7XG5cbiAgdmFyIGltcG9ydHMgPSBkZWZhdWx0cyh7fSwgb3B0aW9ucy5pbXBvcnRzLCBzZXR0aW5ncy5pbXBvcnRzKSxcbiAgICAgIGltcG9ydHNLZXlzID0ga2V5cyhpbXBvcnRzKSxcbiAgICAgIGltcG9ydHNWYWx1ZXMgPSB2YWx1ZXMoaW1wb3J0cyk7XG5cbiAgdmFyIGlzRXZhbHVhdGluZyxcbiAgICAgIGluZGV4ID0gMCxcbiAgICAgIGludGVycG9sYXRlID0gb3B0aW9ucy5pbnRlcnBvbGF0ZSB8fCByZU5vTWF0Y2gsXG4gICAgICBzb3VyY2UgPSBcIl9fcCArPSAnXCI7XG5cbiAgLy8gY29tcGlsZSB0aGUgcmVnZXhwIHRvIG1hdGNoIGVhY2ggZGVsaW1pdGVyXG4gIHZhciByZURlbGltaXRlcnMgPSBSZWdFeHAoXG4gICAgKG9wdGlvbnMuZXNjYXBlIHx8IHJlTm9NYXRjaCkuc291cmNlICsgJ3wnICtcbiAgICBpbnRlcnBvbGF0ZS5zb3VyY2UgKyAnfCcgK1xuICAgIChpbnRlcnBvbGF0ZSA9PT0gcmVJbnRlcnBvbGF0ZSA/IHJlRXNUZW1wbGF0ZSA6IHJlTm9NYXRjaCkuc291cmNlICsgJ3wnICtcbiAgICAob3B0aW9ucy5ldmFsdWF0ZSB8fCByZU5vTWF0Y2gpLnNvdXJjZSArICd8JCdcbiAgLCAnZycpO1xuXG4gIHRleHQucmVwbGFjZShyZURlbGltaXRlcnMsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGVWYWx1ZSwgaW50ZXJwb2xhdGVWYWx1ZSwgZXNUZW1wbGF0ZVZhbHVlLCBldmFsdWF0ZVZhbHVlLCBvZmZzZXQpIHtcbiAgICBpbnRlcnBvbGF0ZVZhbHVlIHx8IChpbnRlcnBvbGF0ZVZhbHVlID0gZXNUZW1wbGF0ZVZhbHVlKTtcblxuICAgIC8vIGVzY2FwZSBjaGFyYWN0ZXJzIHRoYXQgY2Fubm90IGJlIGluY2x1ZGVkIGluIHN0cmluZyBsaXRlcmFsc1xuICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpLnJlcGxhY2UocmVVbmVzY2FwZWRTdHJpbmcsIGVzY2FwZVN0cmluZ0NoYXIpO1xuXG4gICAgLy8gcmVwbGFjZSBkZWxpbWl0ZXJzIHdpdGggc25pcHBldHNcbiAgICBpZiAoZXNjYXBlVmFsdWUpIHtcbiAgICAgIHNvdXJjZSArPSBcIicgK1xcbl9fZShcIiArIGVzY2FwZVZhbHVlICsgXCIpICtcXG4nXCI7XG4gICAgfVxuICAgIGlmIChldmFsdWF0ZVZhbHVlKSB7XG4gICAgICBpc0V2YWx1YXRpbmcgPSB0cnVlO1xuICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlVmFsdWUgKyBcIjtcXG5fX3AgKz0gJ1wiO1xuICAgIH1cbiAgICBpZiAoaW50ZXJwb2xhdGVWYWx1ZSkge1xuICAgICAgc291cmNlICs9IFwiJyArXFxuKChfX3QgPSAoXCIgKyBpbnRlcnBvbGF0ZVZhbHVlICsgXCIpKSA9PSBudWxsID8gJycgOiBfX3QpICtcXG4nXCI7XG4gICAgfVxuICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuXG4gICAgLy8gdGhlIEpTIGVuZ2luZSBlbWJlZGRlZCBpbiBBZG9iZSBwcm9kdWN0cyByZXF1aXJlcyByZXR1cm5pbmcgdGhlIGBtYXRjaGBcbiAgICAvLyBzdHJpbmcgaW4gb3JkZXIgdG8gcHJvZHVjZSB0aGUgY29ycmVjdCBgb2Zmc2V0YCB2YWx1ZVxuICAgIHJldHVybiBtYXRjaDtcbiAgfSk7XG5cbiAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAvLyBpZiBgdmFyaWFibGVgIGlzIG5vdCBzcGVjaWZpZWQsIHdyYXAgYSB3aXRoLXN0YXRlbWVudCBhcm91bmQgdGhlIGdlbmVyYXRlZFxuICAvLyBjb2RlIHRvIGFkZCB0aGUgZGF0YSBvYmplY3QgdG8gdGhlIHRvcCBvZiB0aGUgc2NvcGUgY2hhaW5cbiAgdmFyIHZhcmlhYmxlID0gb3B0aW9ucy52YXJpYWJsZSxcbiAgICAgIGhhc1ZhcmlhYmxlID0gdmFyaWFibGU7XG5cbiAgaWYgKCFoYXNWYXJpYWJsZSkge1xuICAgIHZhcmlhYmxlID0gJ29iaic7XG4gICAgc291cmNlID0gJ3dpdGggKCcgKyB2YXJpYWJsZSArICcpIHtcXG4nICsgc291cmNlICsgJ1xcbn1cXG4nO1xuICB9XG4gIC8vIGNsZWFudXAgY29kZSBieSBzdHJpcHBpbmcgZW1wdHkgc3RyaW5nc1xuICBzb3VyY2UgPSAoaXNFdmFsdWF0aW5nID8gc291cmNlLnJlcGxhY2UocmVFbXB0eVN0cmluZ0xlYWRpbmcsICcnKSA6IHNvdXJjZSlcbiAgICAucmVwbGFjZShyZUVtcHR5U3RyaW5nTWlkZGxlLCAnJDEnKVxuICAgIC5yZXBsYWNlKHJlRW1wdHlTdHJpbmdUcmFpbGluZywgJyQxOycpO1xuXG4gIC8vIGZyYW1lIGNvZGUgYXMgdGhlIGZ1bmN0aW9uIGJvZHlcbiAgc291cmNlID0gJ2Z1bmN0aW9uKCcgKyB2YXJpYWJsZSArICcpIHtcXG4nICtcbiAgICAoaGFzVmFyaWFibGUgPyAnJyA6IHZhcmlhYmxlICsgJyB8fCAoJyArIHZhcmlhYmxlICsgJyA9IHt9KTtcXG4nKSArXG4gICAgXCJ2YXIgX190LCBfX3AgPSAnJywgX19lID0gXy5lc2NhcGVcIiArXG4gICAgKGlzRXZhbHVhdGluZ1xuICAgICAgPyAnLCBfX2ogPSBBcnJheS5wcm90b3R5cGUuam9pbjtcXG4nICtcbiAgICAgICAgXCJmdW5jdGlvbiBwcmludCgpIHsgX19wICs9IF9fai5jYWxsKGFyZ3VtZW50cywgJycpIH1cXG5cIlxuICAgICAgOiAnO1xcbidcbiAgICApICtcbiAgICBzb3VyY2UgK1xuICAgICdyZXR1cm4gX19wXFxufSc7XG5cbiAgdHJ5IHtcbiAgICB2YXIgcmVzdWx0ID0gRnVuY3Rpb24oaW1wb3J0c0tleXMsICdyZXR1cm4gJyArIHNvdXJjZSApLmFwcGx5KHVuZGVmaW5lZCwgaW1wb3J0c1ZhbHVlcyk7XG4gIH0gY2F0Y2goZSkge1xuICAgIGUuc291cmNlID0gc291cmNlO1xuICAgIHRocm93IGU7XG4gIH1cbiAgaWYgKGRhdGEpIHtcbiAgICByZXR1cm4gcmVzdWx0KGRhdGEpO1xuICB9XG4gIC8vIHByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uJ3Mgc291cmNlIGJ5IGl0cyBgdG9TdHJpbmdgIG1ldGhvZCwgaW5cbiAgLy8gc3VwcG9ydGVkIGVudmlyb25tZW50cywgb3IgdGhlIGBzb3VyY2VgIHByb3BlcnR5IGFzIGEgY29udmVuaWVuY2UgZm9yXG4gIC8vIGlubGluaW5nIGNvbXBpbGVkIHRlbXBsYXRlcyBkdXJpbmcgdGhlIGJ1aWxkIHByb2Nlc3NcbiAgcmVzdWx0LnNvdXJjZSA9IHNvdXJjZTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB0ZW1wbGF0ZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIHRvIGVzY2FwZSBjaGFyYWN0ZXJzIGZvciBpbmNsdXNpb24gaW4gY29tcGlsZWQgc3RyaW5nIGxpdGVyYWxzICovXG52YXIgc3RyaW5nRXNjYXBlcyA9IHtcbiAgJ1xcXFwnOiAnXFxcXCcsXG4gIFwiJ1wiOiBcIidcIixcbiAgJ1xcbic6ICduJyxcbiAgJ1xccic6ICdyJyxcbiAgJ1xcdCc6ICd0JyxcbiAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAnXFx1MjAyOSc6ICd1MjAyOSdcbn07XG5cbi8qKlxuICogVXNlZCBieSBgdGVtcGxhdGVgIHRvIGVzY2FwZSBjaGFyYWN0ZXJzIGZvciBpbmNsdXNpb24gaW4gY29tcGlsZWRcbiAqIHN0cmluZyBsaXRlcmFscy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byBlc2NhcGUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlU3RyaW5nQ2hhcihtYXRjaCkge1xuICByZXR1cm4gJ1xcXFwnICsgc3RyaW5nRXNjYXBlc1ttYXRjaF07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZXNjYXBlU3RyaW5nQ2hhcjtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKiBVc2VkIHRvIG1hdGNoIFwiaW50ZXJwb2xhdGVcIiB0ZW1wbGF0ZSBkZWxpbWl0ZXJzICovXG52YXIgcmVJbnRlcnBvbGF0ZSA9IC88JT0oW1xcc1xcU10rPyklPi9nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlSW50ZXJwb2xhdGU7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGtleXMgPSByZXF1aXJlKCdsb2Rhc2gua2V5cycpLFxuICAgIG9iamVjdFR5cGVzID0gcmVxdWlyZSgnbG9kYXNoLl9vYmplY3R0eXBlcycpO1xuXG4vKipcbiAqIEFzc2lnbnMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBvZiBzb3VyY2Ugb2JqZWN0KHMpIHRvIHRoZSBkZXN0aW5hdGlvblxuICogb2JqZWN0IGZvciBhbGwgZGVzdGluYXRpb24gcHJvcGVydGllcyB0aGF0IHJlc29sdmUgdG8gYHVuZGVmaW5lZGAuIE9uY2UgYVxuICogcHJvcGVydHkgaXMgc2V0LCBhZGRpdGlvbmFsIGRlZmF1bHRzIG9mIHRoZSBzYW1lIHByb3BlcnR5IHdpbGwgYmUgaWdub3JlZC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHR5cGUgRnVuY3Rpb25cbiAqIEBjYXRlZ29yeSBPYmplY3RzXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXG4gKiBAcGFyYW0gey4uLk9iamVjdH0gW3NvdXJjZV0gVGhlIHNvdXJjZSBvYmplY3RzLlxuICogQHBhcmFtLSB7T2JqZWN0fSBbZ3VhcmRdIEFsbG93cyB3b3JraW5nIHdpdGggYF8ucmVkdWNlYCB3aXRob3V0IHVzaW5nIGl0c1xuICogIGBrZXlgIGFuZCBgb2JqZWN0YCBhcmd1bWVudHMgYXMgc291cmNlcy5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGRlc3RpbmF0aW9uIG9iamVjdC5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIG9iamVjdCA9IHsgJ25hbWUnOiAnYmFybmV5JyB9O1xuICogXy5kZWZhdWx0cyhvYmplY3QsIHsgJ25hbWUnOiAnZnJlZCcsICdlbXBsb3llcic6ICdzbGF0ZScgfSk7XG4gKiAvLyA9PiB7ICduYW1lJzogJ2Jhcm5leScsICdlbXBsb3llcic6ICdzbGF0ZScgfVxuICovXG52YXIgZGVmYXVsdHMgPSBmdW5jdGlvbihvYmplY3QsIHNvdXJjZSwgZ3VhcmQpIHtcbiAgdmFyIGluZGV4LCBpdGVyYWJsZSA9IG9iamVjdCwgcmVzdWx0ID0gaXRlcmFibGU7XG4gIGlmICghaXRlcmFibGUpIHJldHVybiByZXN1bHQ7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgYXJnc0luZGV4ID0gMCxcbiAgICAgIGFyZ3NMZW5ndGggPSB0eXBlb2YgZ3VhcmQgPT0gJ251bWJlcicgPyAyIDogYXJncy5sZW5ndGg7XG4gIHdoaWxlICgrK2FyZ3NJbmRleCA8IGFyZ3NMZW5ndGgpIHtcbiAgICBpdGVyYWJsZSA9IGFyZ3NbYXJnc0luZGV4XTtcbiAgICBpZiAoaXRlcmFibGUgJiYgb2JqZWN0VHlwZXNbdHlwZW9mIGl0ZXJhYmxlXSkge1xuICAgIHZhciBvd25JbmRleCA9IC0xLFxuICAgICAgICBvd25Qcm9wcyA9IG9iamVjdFR5cGVzW3R5cGVvZiBpdGVyYWJsZV0gJiYga2V5cyhpdGVyYWJsZSksXG4gICAgICAgIGxlbmd0aCA9IG93blByb3BzID8gb3duUHJvcHMubGVuZ3RoIDogMDtcblxuICAgIHdoaWxlICgrK293bkluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBpbmRleCA9IG93blByb3BzW293bkluZGV4XTtcbiAgICAgIGlmICh0eXBlb2YgcmVzdWx0W2luZGV4XSA9PSAndW5kZWZpbmVkJykgcmVzdWx0W2luZGV4XSA9IGl0ZXJhYmxlW2luZGV4XTtcbiAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdHM7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGVzY2FwZUh0bWxDaGFyID0gcmVxdWlyZSgnbG9kYXNoLl9lc2NhcGVodG1sY2hhcicpLFxuICAgIGtleXMgPSByZXF1aXJlKCdsb2Rhc2gua2V5cycpLFxuICAgIHJlVW5lc2NhcGVkSHRtbCA9IHJlcXVpcmUoJ2xvZGFzaC5fcmV1bmVzY2FwZWRodG1sJyk7XG5cbi8qKlxuICogQ29udmVydHMgdGhlIGNoYXJhY3RlcnMgYCZgLCBgPGAsIGA+YCwgYFwiYCwgYW5kIGAnYCBpbiBgc3RyaW5nYCB0byB0aGVpclxuICogY29ycmVzcG9uZGluZyBIVE1MIGVudGl0aWVzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZXNjYXBlLlxuICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyB0aGUgZXNjYXBlZCBzdHJpbmcuXG4gKiBAZXhhbXBsZVxuICpcbiAqIF8uZXNjYXBlKCdGcmVkLCBXaWxtYSwgJiBQZWJibGVzJyk7XG4gKiAvLyA9PiAnRnJlZCwgV2lsbWEsICZhbXA7IFBlYmJsZXMnXG4gKi9cbmZ1bmN0aW9uIGVzY2FwZShzdHJpbmcpIHtcbiAgcmV0dXJuIHN0cmluZyA9PSBudWxsID8gJycgOiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKHJlVW5lc2NhcGVkSHRtbCwgZXNjYXBlSHRtbENoYXIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGVzY2FwZTtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgaHRtbEVzY2FwZXMgPSByZXF1aXJlKCdsb2Rhc2guX2h0bWxlc2NhcGVzJyk7XG5cbi8qKlxuICogVXNlZCBieSBgZXNjYXBlYCB0byBjb252ZXJ0IGNoYXJhY3RlcnMgdG8gSFRNTCBlbnRpdGllcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IG1hdGNoIFRoZSBtYXRjaGVkIGNoYXJhY3RlciB0byBlc2NhcGUuXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBSZXR1cm5zIHRoZSBlc2NhcGVkIGNoYXJhY3Rlci5cbiAqL1xuZnVuY3Rpb24gZXNjYXBlSHRtbENoYXIobWF0Y2gpIHtcbiAgcmV0dXJuIGh0bWxFc2NhcGVzW21hdGNoXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBlc2NhcGVIdG1sQ2hhcjtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG5cbi8qKlxuICogVXNlZCB0byBjb252ZXJ0IGNoYXJhY3RlcnMgdG8gSFRNTCBlbnRpdGllczpcbiAqXG4gKiBUaG91Z2ggdGhlIGA+YCBjaGFyYWN0ZXIgaXMgZXNjYXBlZCBmb3Igc3ltbWV0cnksIGNoYXJhY3RlcnMgbGlrZSBgPmAgYW5kIGAvYFxuICogZG9uJ3QgcmVxdWlyZSBlc2NhcGluZyBpbiBIVE1MIGFuZCBoYXZlIG5vIHNwZWNpYWwgbWVhbmluZyB1bmxlc3MgdGhleSdyZSBwYXJ0XG4gKiBvZiBhIHRhZyBvciBhbiB1bnF1b3RlZCBhdHRyaWJ1dGUgdmFsdWUuXG4gKiBodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9hbWJpZ3VvdXMtYW1wZXJzYW5kcyAodW5kZXIgXCJzZW1pLXJlbGF0ZWQgZnVuIGZhY3RcIilcbiAqL1xudmFyIGh0bWxFc2NhcGVzID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7JyxcbiAgJ1wiJzogJyZxdW90OycsXG4gIFwiJ1wiOiAnJiMzOTsnXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGh0bWxFc2NhcGVzO1xuIiwiLyoqXG4gKiBMby1EYXNoIDIuNC4xIChDdXN0b20gQnVpbGQpIDxodHRwOi8vbG9kYXNoLmNvbS8+XG4gKiBCdWlsZDogYGxvZGFzaCBtb2R1bGFyaXplIG1vZGVybiBleHBvcnRzPVwibnBtXCIgLW8gLi9ucG0vYFxuICogQ29weXJpZ2h0IDIwMTItMjAxMyBUaGUgRG9qbyBGb3VuZGF0aW9uIDxodHRwOi8vZG9qb2ZvdW5kYXRpb24ub3JnLz5cbiAqIEJhc2VkIG9uIFVuZGVyc2NvcmUuanMgMS41LjIgPGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL0xJQ0VOU0U+XG4gKiBDb3B5cmlnaHQgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9sb2Rhc2guY29tL2xpY2Vuc2U+XG4gKi9cbnZhciBodG1sRXNjYXBlcyA9IHJlcXVpcmUoJ2xvZGFzaC5faHRtbGVzY2FwZXMnKSxcbiAgICBrZXlzID0gcmVxdWlyZSgnbG9kYXNoLmtleXMnKTtcblxuLyoqIFVzZWQgdG8gbWF0Y2ggSFRNTCBlbnRpdGllcyBhbmQgSFRNTCBjaGFyYWN0ZXJzICovXG52YXIgcmVVbmVzY2FwZWRIdG1sID0gUmVnRXhwKCdbJyArIGtleXMoaHRtbEVzY2FwZXMpLmpvaW4oJycpICsgJ10nLCAnZycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlVW5lc2NhcGVkSHRtbDtcbiIsIi8qKlxuICogTG8tRGFzaCAyLjQuMSAoQ3VzdG9tIEJ1aWxkKSA8aHR0cDovL2xvZGFzaC5jb20vPlxuICogQnVpbGQ6IGBsb2Rhc2ggbW9kdWxhcml6ZSBtb2Rlcm4gZXhwb3J0cz1cIm5wbVwiIC1vIC4vbnBtL2BcbiAqIENvcHlyaWdodCAyMDEyLTIwMTMgVGhlIERvam8gRm91bmRhdGlvbiA8aHR0cDovL2Rvam9mb3VuZGF0aW9uLm9yZy8+XG4gKiBCYXNlZCBvbiBVbmRlcnNjb3JlLmpzIDEuNS4yIDxodHRwOi8vdW5kZXJzY29yZWpzLm9yZy9MSUNFTlNFPlxuICogQ29weXJpZ2h0IDIwMDktMjAxMyBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuICogQXZhaWxhYmxlIHVuZGVyIE1JVCBsaWNlbnNlIDxodHRwOi8vbG9kYXNoLmNvbS9saWNlbnNlPlxuICovXG52YXIgZXNjYXBlID0gcmVxdWlyZSgnbG9kYXNoLmVzY2FwZScpLFxuICAgIHJlSW50ZXJwb2xhdGUgPSByZXF1aXJlKCdsb2Rhc2guX3JlaW50ZXJwb2xhdGUnKTtcblxuLyoqXG4gKiBCeSBkZWZhdWx0LCB0aGUgdGVtcGxhdGUgZGVsaW1pdGVycyB1c2VkIGJ5IExvLURhc2ggYXJlIHNpbWlsYXIgdG8gdGhvc2UgaW5cbiAqIGVtYmVkZGVkIFJ1YnkgKEVSQikuIENoYW5nZSB0aGUgZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZVxuICogZGVsaW1pdGVycy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQHR5cGUgT2JqZWN0XG4gKi9cbnZhciB0ZW1wbGF0ZVNldHRpbmdzID0ge1xuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGRldGVjdCBgZGF0YWAgcHJvcGVydHkgdmFsdWVzIHRvIGJlIEhUTUwtZXNjYXBlZC5cbiAgICpcbiAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgKiBAdHlwZSBSZWdFeHBcbiAgICovXG4gICdlc2NhcGUnOiAvPCUtKFtcXHNcXFNdKz8pJT4vZyxcblxuICAvKipcbiAgICogVXNlZCB0byBkZXRlY3QgY29kZSB0byBiZSBldmFsdWF0ZWQuXG4gICAqXG4gICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICogQHR5cGUgUmVnRXhwXG4gICAqL1xuICAnZXZhbHVhdGUnOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGRldGVjdCBgZGF0YWAgcHJvcGVydHkgdmFsdWVzIHRvIGluamVjdC5cbiAgICpcbiAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgKiBAdHlwZSBSZWdFeHBcbiAgICovXG4gICdpbnRlcnBvbGF0ZSc6IHJlSW50ZXJwb2xhdGUsXG5cbiAgLyoqXG4gICAqIFVzZWQgdG8gcmVmZXJlbmNlIHRoZSBkYXRhIG9iamVjdCBpbiB0aGUgdGVtcGxhdGUgdGV4dC5cbiAgICpcbiAgICogQG1lbWJlck9mIF8udGVtcGxhdGVTZXR0aW5nc1xuICAgKiBAdHlwZSBzdHJpbmdcbiAgICovXG4gICd2YXJpYWJsZSc6ICcnLFxuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGltcG9ydCB2YXJpYWJsZXMgaW50byB0aGUgY29tcGlsZWQgdGVtcGxhdGUuXG4gICAqXG4gICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3NcbiAgICogQHR5cGUgT2JqZWN0XG4gICAqL1xuICAnaW1wb3J0cyc6IHtcblxuICAgIC8qKlxuICAgICAqIEEgcmVmZXJlbmNlIHRvIHRoZSBgbG9kYXNoYCBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBfLnRlbXBsYXRlU2V0dGluZ3MuaW1wb3J0c1xuICAgICAqIEB0eXBlIEZ1bmN0aW9uXG4gICAgICovXG4gICAgJ18nOiB7ICdlc2NhcGUnOiBlc2NhcGUgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHRlbXBsYXRlU2V0dGluZ3M7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xudmFyIGtleXMgPSByZXF1aXJlKCdsb2Rhc2gua2V5cycpO1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gYXJyYXkgY29tcG9zZWQgb2YgdGhlIG93biBlbnVtZXJhYmxlIHByb3BlcnR5IHZhbHVlcyBvZiBgb2JqZWN0YC5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWVtYmVyT2YgX1xuICogQGNhdGVnb3J5IE9iamVjdHNcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgVGhlIG9iamVjdCB0byBpbnNwZWN0LlxuICogQHJldHVybnMge0FycmF5fSBSZXR1cm5zIGFuIGFycmF5IG9mIHByb3BlcnR5IHZhbHVlcy5cbiAqIEBleGFtcGxlXG4gKlxuICogXy52YWx1ZXMoeyAnb25lJzogMSwgJ3R3byc6IDIsICd0aHJlZSc6IDMgfSk7XG4gKiAvLyA9PiBbMSwgMiwgM10gKHByb3BlcnR5IG9yZGVyIGlzIG5vdCBndWFyYW50ZWVkIGFjcm9zcyBlbnZpcm9ubWVudHMpXG4gKi9cbmZ1bmN0aW9uIHZhbHVlcyhvYmplY3QpIHtcbiAgdmFyIGluZGV4ID0gLTEsXG4gICAgICBwcm9wcyA9IGtleXMob2JqZWN0KSxcbiAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aCxcbiAgICAgIHJlc3VsdCA9IEFycmF5KGxlbmd0aCk7XG5cbiAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICByZXN1bHRbaW5kZXhdID0gb2JqZWN0W3Byb3BzW2luZGV4XV07XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB2YWx1ZXM7XG4iLCIvKipcbiAqIExvLURhc2ggMi40LjEgKEN1c3RvbSBCdWlsZCkgPGh0dHA6Ly9sb2Rhc2guY29tLz5cbiAqIEJ1aWxkOiBgbG9kYXNoIG1vZHVsYXJpemUgbW9kZXJuIGV4cG9ydHM9XCJucG1cIiAtbyAuL25wbS9gXG4gKiBDb3B5cmlnaHQgMjAxMi0yMDEzIFRoZSBEb2pvIEZvdW5kYXRpb24gPGh0dHA6Ly9kb2pvZm91bmRhdGlvbi5vcmcvPlxuICogQmFzZWQgb24gVW5kZXJzY29yZS5qcyAxLjUuMiA8aHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvTElDRU5TRT5cbiAqIENvcHlyaWdodCAyMDA5LTIwMTMgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbiAqIEF2YWlsYWJsZSB1bmRlciBNSVQgbGljZW5zZSA8aHR0cDovL2xvZGFzaC5jb20vbGljZW5zZT5cbiAqL1xuXG4vKiogVXNlZCB0byBnZW5lcmF0ZSB1bmlxdWUgSURzICovXG52YXIgaWRDb3VudGVyID0gMDtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYSB1bmlxdWUgSUQuIElmIGBwcmVmaXhgIGlzIHByb3ZpZGVkIHRoZSBJRCB3aWxsIGJlIGFwcGVuZGVkIHRvIGl0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgVXRpbGl0aWVzXG4gKiBAcGFyYW0ge3N0cmluZ30gW3ByZWZpeF0gVGhlIHZhbHVlIHRvIHByZWZpeCB0aGUgSUQgd2l0aC5cbiAqIEByZXR1cm5zIHtzdHJpbmd9IFJldHVybnMgdGhlIHVuaXF1ZSBJRC5cbiAqIEBleGFtcGxlXG4gKlxuICogXy51bmlxdWVJZCgnY29udGFjdF8nKTtcbiAqIC8vID0+ICdjb250YWN0XzEwNCdcbiAqXG4gKiBfLnVuaXF1ZUlkKCk7XG4gKiAvLyA9PiAnMTA1J1xuICovXG5mdW5jdGlvbiB1bmlxdWVJZChwcmVmaXgpIHtcbiAgdmFyIGlkID0gKytpZENvdW50ZXI7XG4gIHJldHVybiBTdHJpbmcocHJlZml4ID09IG51bGwgPyAnJyA6IHByZWZpeCkgKyBpZDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB1bmlxdWVJZDtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDExLTIwMTQgRmVsaXggR25hc3NcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZVxuICovXG4oZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuXG4gIC8qIENvbW1vbkpTICovXG4gIGlmICh0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JykgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpXG5cbiAgLyogQU1EIG1vZHVsZSAqL1xuICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkgZGVmaW5lKGZhY3RvcnkpXG5cbiAgLyogQnJvd3NlciBnbG9iYWwgKi9cbiAgZWxzZSByb290LlNwaW5uZXIgPSBmYWN0b3J5KClcbn1cbih0aGlzLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgdmFyIHByZWZpeGVzID0gWyd3ZWJraXQnLCAnTW96JywgJ21zJywgJ08nXSAvKiBWZW5kb3IgcHJlZml4ZXMgKi9cbiAgICAsIGFuaW1hdGlvbnMgPSB7fSAvKiBBbmltYXRpb24gcnVsZXMga2V5ZWQgYnkgdGhlaXIgbmFtZSAqL1xuICAgICwgdXNlQ3NzQW5pbWF0aW9ucyAvKiBXaGV0aGVyIHRvIHVzZSBDU1MgYW5pbWF0aW9ucyBvciBzZXRUaW1lb3V0ICovXG5cbiAgLyoqXG4gICAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gY3JlYXRlIGVsZW1lbnRzLiBJZiBubyB0YWcgbmFtZSBpcyBnaXZlbixcbiAgICogYSBESVYgaXMgY3JlYXRlZC4gT3B0aW9uYWxseSBwcm9wZXJ0aWVzIGNhbiBiZSBwYXNzZWQuXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVFbCh0YWcsIHByb3ApIHtcbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyB8fCAnZGl2JylcbiAgICAgICwgblxuXG4gICAgZm9yKG4gaW4gcHJvcCkgZWxbbl0gPSBwcm9wW25dXG4gICAgcmV0dXJuIGVsXG4gIH1cblxuICAvKipcbiAgICogQXBwZW5kcyBjaGlsZHJlbiBhbmQgcmV0dXJucyB0aGUgcGFyZW50LlxuICAgKi9cbiAgZnVuY3Rpb24gaW5zKHBhcmVudCAvKiBjaGlsZDEsIGNoaWxkMiwgLi4uKi8pIHtcbiAgICBmb3IgKHZhciBpPTEsIG49YXJndW1lbnRzLmxlbmd0aDsgaTxuOyBpKyspXG4gICAgICBwYXJlbnQuYXBwZW5kQ2hpbGQoYXJndW1lbnRzW2ldKVxuXG4gICAgcmV0dXJuIHBhcmVudFxuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydCBhIG5ldyBzdHlsZXNoZWV0IHRvIGhvbGQgdGhlIEBrZXlmcmFtZSBvciBWTUwgcnVsZXMuXG4gICAqL1xuICB2YXIgc2hlZXQgPSAoZnVuY3Rpb24oKSB7XG4gICAgdmFyIGVsID0gY3JlYXRlRWwoJ3N0eWxlJywge3R5cGUgOiAndGV4dC9jc3MnfSlcbiAgICBpbnMoZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXSwgZWwpXG4gICAgcmV0dXJuIGVsLnNoZWV0IHx8IGVsLnN0eWxlU2hlZXRcbiAgfSgpKVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIG9wYWNpdHkga2V5ZnJhbWUgYW5pbWF0aW9uIHJ1bGUgYW5kIHJldHVybnMgaXRzIG5hbWUuXG4gICAqIFNpbmNlIG1vc3QgbW9iaWxlIFdlYmtpdHMgaGF2ZSB0aW1pbmcgaXNzdWVzIHdpdGggYW5pbWF0aW9uLWRlbGF5LFxuICAgKiB3ZSBjcmVhdGUgc2VwYXJhdGUgcnVsZXMgZm9yIGVhY2ggbGluZS9zZWdtZW50LlxuICAgKi9cbiAgZnVuY3Rpb24gYWRkQW5pbWF0aW9uKGFscGhhLCB0cmFpbCwgaSwgbGluZXMpIHtcbiAgICB2YXIgbmFtZSA9IFsnb3BhY2l0eScsIHRyYWlsLCB+fihhbHBoYSoxMDApLCBpLCBsaW5lc10uam9pbignLScpXG4gICAgICAsIHN0YXJ0ID0gMC4wMSArIGkvbGluZXMgKiAxMDBcbiAgICAgICwgeiA9IE1hdGgubWF4KDEgLSAoMS1hbHBoYSkgLyB0cmFpbCAqICgxMDAtc3RhcnQpLCBhbHBoYSlcbiAgICAgICwgcHJlZml4ID0gdXNlQ3NzQW5pbWF0aW9ucy5zdWJzdHJpbmcoMCwgdXNlQ3NzQW5pbWF0aW9ucy5pbmRleE9mKCdBbmltYXRpb24nKSkudG9Mb3dlckNhc2UoKVxuICAgICAgLCBwcmUgPSBwcmVmaXggJiYgJy0nICsgcHJlZml4ICsgJy0nIHx8ICcnXG5cbiAgICBpZiAoIWFuaW1hdGlvbnNbbmFtZV0pIHtcbiAgICAgIHNoZWV0Lmluc2VydFJ1bGUoXG4gICAgICAgICdAJyArIHByZSArICdrZXlmcmFtZXMgJyArIG5hbWUgKyAneycgK1xuICAgICAgICAnMCV7b3BhY2l0eTonICsgeiArICd9JyArXG4gICAgICAgIHN0YXJ0ICsgJyV7b3BhY2l0eTonICsgYWxwaGEgKyAnfScgK1xuICAgICAgICAoc3RhcnQrMC4wMSkgKyAnJXtvcGFjaXR5OjF9JyArXG4gICAgICAgIChzdGFydCt0cmFpbCkgJSAxMDAgKyAnJXtvcGFjaXR5OicgKyBhbHBoYSArICd9JyArXG4gICAgICAgICcxMDAle29wYWNpdHk6JyArIHogKyAnfScgK1xuICAgICAgICAnfScsIHNoZWV0LmNzc1J1bGVzLmxlbmd0aClcblxuICAgICAgYW5pbWF0aW9uc1tuYW1lXSA9IDFcbiAgICB9XG5cbiAgICByZXR1cm4gbmFtZVxuICB9XG5cbiAgLyoqXG4gICAqIFRyaWVzIHZhcmlvdXMgdmVuZG9yIHByZWZpeGVzIGFuZCByZXR1cm5zIHRoZSBmaXJzdCBzdXBwb3J0ZWQgcHJvcGVydHkuXG4gICAqL1xuICBmdW5jdGlvbiB2ZW5kb3IoZWwsIHByb3ApIHtcbiAgICB2YXIgcyA9IGVsLnN0eWxlXG4gICAgICAsIHBwXG4gICAgICAsIGlcblxuICAgIHByb3AgPSBwcm9wLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgcHJvcC5zbGljZSgxKVxuICAgIGZvcihpPTA7IGk8cHJlZml4ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHBwID0gcHJlZml4ZXNbaV0rcHJvcFxuICAgICAgaWYoc1twcF0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIHBwXG4gICAgfVxuICAgIGlmKHNbcHJvcF0gIT09IHVuZGVmaW5lZCkgcmV0dXJuIHByb3BcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIG11bHRpcGxlIHN0eWxlIHByb3BlcnRpZXMgYXQgb25jZS5cbiAgICovXG4gIGZ1bmN0aW9uIGNzcyhlbCwgcHJvcCkge1xuICAgIGZvciAodmFyIG4gaW4gcHJvcClcbiAgICAgIGVsLnN0eWxlW3ZlbmRvcihlbCwgbil8fG5dID0gcHJvcFtuXVxuXG4gICAgcmV0dXJuIGVsXG4gIH1cblxuICAvKipcbiAgICogRmlsbHMgaW4gZGVmYXVsdCB2YWx1ZXMuXG4gICAqL1xuICBmdW5jdGlvbiBtZXJnZShvYmopIHtcbiAgICBmb3IgKHZhciBpPTE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBkZWYgPSBhcmd1bWVudHNbaV1cbiAgICAgIGZvciAodmFyIG4gaW4gZGVmKVxuICAgICAgICBpZiAob2JqW25dID09PSB1bmRlZmluZWQpIG9ialtuXSA9IGRlZltuXVxuICAgIH1cbiAgICByZXR1cm4gb2JqXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgYWJzb2x1dGUgcGFnZS1vZmZzZXQgb2YgdGhlIGdpdmVuIGVsZW1lbnQuXG4gICAqL1xuICBmdW5jdGlvbiBwb3MoZWwpIHtcbiAgICB2YXIgbyA9IHsgeDplbC5vZmZzZXRMZWZ0LCB5OmVsLm9mZnNldFRvcCB9XG4gICAgd2hpbGUoKGVsID0gZWwub2Zmc2V0UGFyZW50KSlcbiAgICAgIG8ueCs9ZWwub2Zmc2V0TGVmdCwgby55Kz1lbC5vZmZzZXRUb3BcblxuICAgIHJldHVybiBvXG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgbGluZSBjb2xvciBmcm9tIHRoZSBnaXZlbiBzdHJpbmcgb3IgYXJyYXkuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRDb2xvcihjb2xvciwgaWR4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiBjb2xvciA9PSAnc3RyaW5nJyA/IGNvbG9yIDogY29sb3JbaWR4ICUgY29sb3IubGVuZ3RoXVxuICB9XG5cbiAgLy8gQnVpbHQtaW4gZGVmYXVsdHNcblxuICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgbGluZXM6IDEyLCAgICAgICAgICAgIC8vIFRoZSBudW1iZXIgb2YgbGluZXMgdG8gZHJhd1xuICAgIGxlbmd0aDogNywgICAgICAgICAgICAvLyBUaGUgbGVuZ3RoIG9mIGVhY2ggbGluZVxuICAgIHdpZHRoOiA1LCAgICAgICAgICAgICAvLyBUaGUgbGluZSB0aGlja25lc3NcbiAgICByYWRpdXM6IDEwLCAgICAgICAgICAgLy8gVGhlIHJhZGl1cyBvZiB0aGUgaW5uZXIgY2lyY2xlXG4gICAgcm90YXRlOiAwLCAgICAgICAgICAgIC8vIFJvdGF0aW9uIG9mZnNldFxuICAgIGNvcm5lcnM6IDEsICAgICAgICAgICAvLyBSb3VuZG5lc3MgKDAuLjEpXG4gICAgY29sb3I6ICcjMDAwJywgICAgICAgIC8vICNyZ2Igb3IgI3JyZ2diYlxuICAgIGRpcmVjdGlvbjogMSwgICAgICAgICAvLyAxOiBjbG9ja3dpc2UsIC0xOiBjb3VudGVyY2xvY2t3aXNlXG4gICAgc3BlZWQ6IDEsICAgICAgICAgICAgIC8vIFJvdW5kcyBwZXIgc2Vjb25kXG4gICAgdHJhaWw6IDEwMCwgICAgICAgICAgIC8vIEFmdGVyZ2xvdyBwZXJjZW50YWdlXG4gICAgb3BhY2l0eTogMS80LCAgICAgICAgIC8vIE9wYWNpdHkgb2YgdGhlIGxpbmVzXG4gICAgZnBzOiAyMCwgICAgICAgICAgICAgIC8vIEZyYW1lcyBwZXIgc2Vjb25kIHdoZW4gdXNpbmcgc2V0VGltZW91dCgpXG4gICAgekluZGV4OiAyZTksICAgICAgICAgIC8vIFVzZSBhIGhpZ2ggei1pbmRleCBieSBkZWZhdWx0XG4gICAgY2xhc3NOYW1lOiAnc3Bpbm5lcicsIC8vIENTUyBjbGFzcyB0byBhc3NpZ24gdG8gdGhlIGVsZW1lbnRcbiAgICB0b3A6ICc1MCUnLCAgICAgICAgICAgLy8gY2VudGVyIHZlcnRpY2FsbHlcbiAgICBsZWZ0OiAnNTAlJywgICAgICAgICAgLy8gY2VudGVyIGhvcml6b250YWxseVxuICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnICAvLyBlbGVtZW50IHBvc2l0aW9uXG4gIH1cblxuICAvKiogVGhlIGNvbnN0cnVjdG9yICovXG4gIGZ1bmN0aW9uIFNwaW5uZXIobykge1xuICAgIHRoaXMub3B0cyA9IG1lcmdlKG8gfHwge30sIFNwaW5uZXIuZGVmYXVsdHMsIGRlZmF1bHRzKVxuICB9XG5cbiAgLy8gR2xvYmFsIGRlZmF1bHRzIHRoYXQgb3ZlcnJpZGUgdGhlIGJ1aWx0LWluczpcbiAgU3Bpbm5lci5kZWZhdWx0cyA9IHt9XG5cbiAgbWVyZ2UoU3Bpbm5lci5wcm90b3R5cGUsIHtcblxuICAgIC8qKlxuICAgICAqIEFkZHMgdGhlIHNwaW5uZXIgdG8gdGhlIGdpdmVuIHRhcmdldCBlbGVtZW50LiBJZiB0aGlzIGluc3RhbmNlIGlzIGFscmVhZHlcbiAgICAgKiBzcGlubmluZywgaXQgaXMgYXV0b21hdGljYWxseSByZW1vdmVkIGZyb20gaXRzIHByZXZpb3VzIHRhcmdldCBiIGNhbGxpbmdcbiAgICAgKiBzdG9wKCkgaW50ZXJuYWxseS5cbiAgICAgKi9cbiAgICBzcGluOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICAgIHRoaXMuc3RvcCgpXG5cbiAgICAgIHZhciBzZWxmID0gdGhpc1xuICAgICAgICAsIG8gPSBzZWxmLm9wdHNcbiAgICAgICAgLCBlbCA9IHNlbGYuZWwgPSBjc3MoY3JlYXRlRWwoMCwge2NsYXNzTmFtZTogby5jbGFzc05hbWV9KSwge3Bvc2l0aW9uOiBvLnBvc2l0aW9uLCB3aWR0aDogMCwgekluZGV4OiBvLnpJbmRleH0pXG4gICAgICAgICwgbWlkID0gby5yYWRpdXMrby5sZW5ndGgrby53aWR0aFxuXG4gICAgICBjc3MoZWwsIHtcbiAgICAgICAgbGVmdDogby5sZWZ0LFxuICAgICAgICB0b3A6IG8udG9wXG4gICAgICB9KVxuICAgICAgICBcbiAgICAgIGlmICh0YXJnZXQpIHtcbiAgICAgICAgdGFyZ2V0Lmluc2VydEJlZm9yZShlbCwgdGFyZ2V0LmZpcnN0Q2hpbGR8fG51bGwpXG4gICAgICB9XG5cbiAgICAgIGVsLnNldEF0dHJpYnV0ZSgncm9sZScsICdwcm9ncmVzc2JhcicpXG4gICAgICBzZWxmLmxpbmVzKGVsLCBzZWxmLm9wdHMpXG5cbiAgICAgIGlmICghdXNlQ3NzQW5pbWF0aW9ucykge1xuICAgICAgICAvLyBObyBDU1MgYW5pbWF0aW9uIHN1cHBvcnQsIHVzZSBzZXRUaW1lb3V0KCkgaW5zdGVhZFxuICAgICAgICB2YXIgaSA9IDBcbiAgICAgICAgICAsIHN0YXJ0ID0gKG8ubGluZXMgLSAxKSAqICgxIC0gby5kaXJlY3Rpb24pIC8gMlxuICAgICAgICAgICwgYWxwaGFcbiAgICAgICAgICAsIGZwcyA9IG8uZnBzXG4gICAgICAgICAgLCBmID0gZnBzL28uc3BlZWRcbiAgICAgICAgICAsIG9zdGVwID0gKDEtby5vcGFjaXR5KSAvIChmKm8udHJhaWwgLyAxMDApXG4gICAgICAgICAgLCBhc3RlcCA9IGYvby5saW5lc1xuXG4gICAgICAgIDsoZnVuY3Rpb24gYW5pbSgpIHtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBvLmxpbmVzOyBqKyspIHtcbiAgICAgICAgICAgIGFscGhhID0gTWF0aC5tYXgoMSAtIChpICsgKG8ubGluZXMgLSBqKSAqIGFzdGVwKSAlIGYgKiBvc3RlcCwgby5vcGFjaXR5KVxuXG4gICAgICAgICAgICBzZWxmLm9wYWNpdHkoZWwsIGogKiBvLmRpcmVjdGlvbiArIHN0YXJ0LCBhbHBoYSwgbylcbiAgICAgICAgICB9XG4gICAgICAgICAgc2VsZi50aW1lb3V0ID0gc2VsZi5lbCAmJiBzZXRUaW1lb3V0KGFuaW0sIH5+KDEwMDAvZnBzKSlcbiAgICAgICAgfSkoKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlbGZcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RvcHMgYW5kIHJlbW92ZXMgdGhlIFNwaW5uZXIuXG4gICAgICovXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZWwgPSB0aGlzLmVsXG4gICAgICBpZiAoZWwpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZW91dClcbiAgICAgICAgaWYgKGVsLnBhcmVudE5vZGUpIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpXG4gICAgICAgIHRoaXMuZWwgPSB1bmRlZmluZWRcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEludGVybmFsIG1ldGhvZCB0aGF0IGRyYXdzIHRoZSBpbmRpdmlkdWFsIGxpbmVzLiBXaWxsIGJlIG92ZXJ3cml0dGVuXG4gICAgICogaW4gVk1MIGZhbGxiYWNrIG1vZGUgYmVsb3cuXG4gICAgICovXG4gICAgbGluZXM6IGZ1bmN0aW9uKGVsLCBvKSB7XG4gICAgICB2YXIgaSA9IDBcbiAgICAgICAgLCBzdGFydCA9IChvLmxpbmVzIC0gMSkgKiAoMSAtIG8uZGlyZWN0aW9uKSAvIDJcbiAgICAgICAgLCBzZWdcblxuICAgICAgZnVuY3Rpb24gZmlsbChjb2xvciwgc2hhZG93KSB7XG4gICAgICAgIHJldHVybiBjc3MoY3JlYXRlRWwoKSwge1xuICAgICAgICAgIHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuICAgICAgICAgIHdpZHRoOiAoby5sZW5ndGgrby53aWR0aCkgKyAncHgnLFxuICAgICAgICAgIGhlaWdodDogby53aWR0aCArICdweCcsXG4gICAgICAgICAgYmFja2dyb3VuZDogY29sb3IsXG4gICAgICAgICAgYm94U2hhZG93OiBzaGFkb3csXG4gICAgICAgICAgdHJhbnNmb3JtT3JpZ2luOiAnbGVmdCcsXG4gICAgICAgICAgdHJhbnNmb3JtOiAncm90YXRlKCcgKyB+figzNjAvby5saW5lcyppK28ucm90YXRlKSArICdkZWcpIHRyYW5zbGF0ZSgnICsgby5yYWRpdXMrJ3B4JyArJywwKScsXG4gICAgICAgICAgYm9yZGVyUmFkaXVzOiAoby5jb3JuZXJzICogby53aWR0aD4+MSkgKyAncHgnXG4gICAgICAgIH0pXG4gICAgICB9XG5cbiAgICAgIGZvciAoOyBpIDwgby5saW5lczsgaSsrKSB7XG4gICAgICAgIHNlZyA9IGNzcyhjcmVhdGVFbCgpLCB7XG4gICAgICAgICAgcG9zaXRpb246ICdhYnNvbHV0ZScsXG4gICAgICAgICAgdG9wOiAxK34oby53aWR0aC8yKSArICdweCcsXG4gICAgICAgICAgdHJhbnNmb3JtOiBvLmh3YWNjZWwgPyAndHJhbnNsYXRlM2QoMCwwLDApJyA6ICcnLFxuICAgICAgICAgIG9wYWNpdHk6IG8ub3BhY2l0eSxcbiAgICAgICAgICBhbmltYXRpb246IHVzZUNzc0FuaW1hdGlvbnMgJiYgYWRkQW5pbWF0aW9uKG8ub3BhY2l0eSwgby50cmFpbCwgc3RhcnQgKyBpICogby5kaXJlY3Rpb24sIG8ubGluZXMpICsgJyAnICsgMS9vLnNwZWVkICsgJ3MgbGluZWFyIGluZmluaXRlJ1xuICAgICAgICB9KVxuXG4gICAgICAgIGlmIChvLnNoYWRvdykgaW5zKHNlZywgY3NzKGZpbGwoJyMwMDAnLCAnMCAwIDRweCAnICsgJyMwMDAnKSwge3RvcDogMisncHgnfSkpXG4gICAgICAgIGlucyhlbCwgaW5zKHNlZywgZmlsbChnZXRDb2xvcihvLmNvbG9yLCBpKSwgJzAgMCAxcHggcmdiYSgwLDAsMCwuMSknKSkpXG4gICAgICB9XG4gICAgICByZXR1cm4gZWxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW50ZXJuYWwgbWV0aG9kIHRoYXQgYWRqdXN0cyB0aGUgb3BhY2l0eSBvZiBhIHNpbmdsZSBsaW5lLlxuICAgICAqIFdpbGwgYmUgb3ZlcndyaXR0ZW4gaW4gVk1MIGZhbGxiYWNrIG1vZGUgYmVsb3cuXG4gICAgICovXG4gICAgb3BhY2l0eTogZnVuY3Rpb24oZWwsIGksIHZhbCkge1xuICAgICAgaWYgKGkgPCBlbC5jaGlsZE5vZGVzLmxlbmd0aCkgZWwuY2hpbGROb2Rlc1tpXS5zdHlsZS5vcGFjaXR5ID0gdmFsXG4gICAgfVxuXG4gIH0pXG5cblxuICBmdW5jdGlvbiBpbml0Vk1MKCkge1xuXG4gICAgLyogVXRpbGl0eSBmdW5jdGlvbiB0byBjcmVhdGUgYSBWTUwgdGFnICovXG4gICAgZnVuY3Rpb24gdm1sKHRhZywgYXR0cikge1xuICAgICAgcmV0dXJuIGNyZWF0ZUVsKCc8JyArIHRhZyArICcgeG1sbnM9XCJ1cm46c2NoZW1hcy1taWNyb3NvZnQuY29tOnZtbFwiIGNsYXNzPVwic3Bpbi12bWxcIj4nLCBhdHRyKVxuICAgIH1cblxuICAgIC8vIE5vIENTUyB0cmFuc2Zvcm1zIGJ1dCBWTUwgc3VwcG9ydCwgYWRkIGEgQ1NTIHJ1bGUgZm9yIFZNTCBlbGVtZW50czpcbiAgICBzaGVldC5hZGRSdWxlKCcuc3Bpbi12bWwnLCAnYmVoYXZpb3I6dXJsKCNkZWZhdWx0I1ZNTCknKVxuXG4gICAgU3Bpbm5lci5wcm90b3R5cGUubGluZXMgPSBmdW5jdGlvbihlbCwgbykge1xuICAgICAgdmFyIHIgPSBvLmxlbmd0aCtvLndpZHRoXG4gICAgICAgICwgcyA9IDIqclxuXG4gICAgICBmdW5jdGlvbiBncnAoKSB7XG4gICAgICAgIHJldHVybiBjc3MoXG4gICAgICAgICAgdm1sKCdncm91cCcsIHtcbiAgICAgICAgICAgIGNvb3Jkc2l6ZTogcyArICcgJyArIHMsXG4gICAgICAgICAgICBjb29yZG9yaWdpbjogLXIgKyAnICcgKyAtclxuICAgICAgICAgIH0pLFxuICAgICAgICAgIHsgd2lkdGg6IHMsIGhlaWdodDogcyB9XG4gICAgICAgIClcbiAgICAgIH1cblxuICAgICAgdmFyIG1hcmdpbiA9IC0oby53aWR0aCtvLmxlbmd0aCkqMiArICdweCdcbiAgICAgICAgLCBnID0gY3NzKGdycCgpLCB7cG9zaXRpb246ICdhYnNvbHV0ZScsIHRvcDogbWFyZ2luLCBsZWZ0OiBtYXJnaW59KVxuICAgICAgICAsIGlcblxuICAgICAgZnVuY3Rpb24gc2VnKGksIGR4LCBmaWx0ZXIpIHtcbiAgICAgICAgaW5zKGcsXG4gICAgICAgICAgaW5zKGNzcyhncnAoKSwge3JvdGF0aW9uOiAzNjAgLyBvLmxpbmVzICogaSArICdkZWcnLCBsZWZ0OiB+fmR4fSksXG4gICAgICAgICAgICBpbnMoY3NzKHZtbCgncm91bmRyZWN0Jywge2FyY3NpemU6IG8uY29ybmVyc30pLCB7XG4gICAgICAgICAgICAgICAgd2lkdGg6IHIsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBvLndpZHRoLFxuICAgICAgICAgICAgICAgIGxlZnQ6IG8ucmFkaXVzLFxuICAgICAgICAgICAgICAgIHRvcDogLW8ud2lkdGg+PjEsXG4gICAgICAgICAgICAgICAgZmlsdGVyOiBmaWx0ZXJcbiAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgIHZtbCgnZmlsbCcsIHtjb2xvcjogZ2V0Q29sb3Ioby5jb2xvciwgaSksIG9wYWNpdHk6IG8ub3BhY2l0eX0pLFxuICAgICAgICAgICAgICB2bWwoJ3N0cm9rZScsIHtvcGFjaXR5OiAwfSkgLy8gdHJhbnNwYXJlbnQgc3Ryb2tlIHRvIGZpeCBjb2xvciBibGVlZGluZyB1cG9uIG9wYWNpdHkgY2hhbmdlXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICApXG4gICAgICB9XG5cbiAgICAgIGlmIChvLnNoYWRvdylcbiAgICAgICAgZm9yIChpID0gMTsgaSA8PSBvLmxpbmVzOyBpKyspXG4gICAgICAgICAgc2VnKGksIC0yLCAncHJvZ2lkOkRYSW1hZ2VUcmFuc2Zvcm0uTWljcm9zb2Z0LkJsdXIocGl4ZWxyYWRpdXM9MixtYWtlc2hhZG93PTEsc2hhZG93b3BhY2l0eT0uMyknKVxuXG4gICAgICBmb3IgKGkgPSAxOyBpIDw9IG8ubGluZXM7IGkrKykgc2VnKGkpXG4gICAgICByZXR1cm4gaW5zKGVsLCBnKVxuICAgIH1cblxuICAgIFNwaW5uZXIucHJvdG90eXBlLm9wYWNpdHkgPSBmdW5jdGlvbihlbCwgaSwgdmFsLCBvKSB7XG4gICAgICB2YXIgYyA9IGVsLmZpcnN0Q2hpbGRcbiAgICAgIG8gPSBvLnNoYWRvdyAmJiBvLmxpbmVzIHx8IDBcbiAgICAgIGlmIChjICYmIGkrbyA8IGMuY2hpbGROb2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgYyA9IGMuY2hpbGROb2Rlc1tpK29dOyBjID0gYyAmJiBjLmZpcnN0Q2hpbGQ7IGMgPSBjICYmIGMuZmlyc3RDaGlsZFxuICAgICAgICBpZiAoYykgYy5vcGFjaXR5ID0gdmFsXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIHByb2JlID0gY3NzKGNyZWF0ZUVsKCdncm91cCcpLCB7YmVoYXZpb3I6ICd1cmwoI2RlZmF1bHQjVk1MKSd9KVxuXG4gIGlmICghdmVuZG9yKHByb2JlLCAndHJhbnNmb3JtJykgJiYgcHJvYmUuYWRqKSBpbml0Vk1MKClcbiAgZWxzZSB1c2VDc3NBbmltYXRpb25zID0gdmVuZG9yKHByb2JlLCAnYW5pbWF0aW9uJylcblxuICByZXR1cm4gU3Bpbm5lclxuXG59KSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xudmFyIEJsb2NrcyA9IHJlcXVpcmUoJy4vYmxvY2tzJyk7XG5cbnZhciBCbG9ja0NvbnRyb2wgPSBmdW5jdGlvbih0eXBlLCBpbnN0YW5jZV9zY29wZSkge1xuICB0aGlzLnR5cGUgPSB0eXBlO1xuICB0aGlzLmluc3RhbmNlX3Njb3BlID0gaW5zdGFuY2Vfc2NvcGU7XG4gIHRoaXMuYmxvY2tfdHlwZSA9IEJsb2Nrc1t0aGlzLnR5cGVdLnByb3RvdHlwZTtcbiAgdGhpcy5jYW5fYmVfcmVuZGVyZWQgPSB0aGlzLmJsb2NrX3R5cGUudG9vbGJhckVuYWJsZWQ7XG5cbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xufTtcblxuT2JqZWN0LmFzc2lnbihCbG9ja0NvbnRyb2wucHJvdG90eXBlLCByZXF1aXJlKCcuL2Z1bmN0aW9uLWJpbmQnKSwgcmVxdWlyZSgnLi9yZW5kZXJhYmxlJyksIHJlcXVpcmUoJy4vZXZlbnRzJyksIHtcblxuICB0YWdOYW1lOiAnYScsXG4gIGNsYXNzTmFtZTogXCJzdC1ibG9jay1jb250cm9sXCIsXG5cbiAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdkYXRhLXR5cGUnOiB0aGlzLmJsb2NrX3R5cGUudHlwZVxuICAgIH07XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLiRlbC5odG1sKCc8c3BhbiBjbGFzcz1cInN0LWljb25cIj4nKyBfLnJlc3VsdCh0aGlzLmJsb2NrX3R5cGUsICdpY29uX25hbWUnKSArJzwvc3Bhbj4nICsgXy5yZXN1bHQodGhpcy5ibG9ja190eXBlLCAndGl0bGUnKSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrQ29udHJvbDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICogU2lyVHJldm9yIEJsb2NrIENvbnRyb2xzXG4gKiAtLVxuICogR2l2ZXMgYW4gaW50ZXJmYWNlIGZvciBhZGRpbmcgbmV3IFNpciBUcmV2b3IgYmxvY2tzLlxuICovXG5cblxudmFyIEJsb2NrcyA9IHJlcXVpcmUoJy4vYmxvY2tzJyk7XG52YXIgQmxvY2tDb250cm9sID0gcmVxdWlyZSgnLi9ibG9jay1jb250cm9sJyk7XG52YXIgRXZlbnRCdXMgPSByZXF1aXJlKCcuL2V2ZW50LWJ1cycpO1xuXG52YXIgQmxvY2tDb250cm9scyA9IGZ1bmN0aW9uKGF2YWlsYWJsZV90eXBlcywgaW5zdGFuY2Vfc2NvcGUpIHtcbiAgdGhpcy5pbnN0YW5jZV9zY29wZSA9IGluc3RhbmNlX3Njb3BlO1xuICB0aGlzLmF2YWlsYWJsZV90eXBlcyA9IGF2YWlsYWJsZV90eXBlcyB8fCBbXTtcbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG4gIHRoaXMuaW5pdGlhbGl6ZSgpO1xufTtcblxuT2JqZWN0LmFzc2lnbihCbG9ja0NvbnRyb2xzLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9mdW5jdGlvbi1iaW5kJyksIHJlcXVpcmUoJy4vcmVuZGVyYWJsZScpLCByZXF1aXJlKCcuL2V2ZW50cycpLCB7XG5cbiAgYm91bmQ6IFsnaGFuZGxlQ29udHJvbEJ1dHRvbkNsaWNrJ10sXG4gIGJsb2NrX2NvbnRyb2xzOiBudWxsLFxuXG4gIGNsYXNzTmFtZTogXCJzdC1ibG9jay1jb250cm9sc1wiLFxuXG4gIGh0bWw6IFwiPGEgY2xhc3M9J3N0LWljb24gc3QtaWNvbi0tY2xvc2UnPlwiICsgaTE4bi50KFwiZ2VuZXJhbDpjbG9zZVwiKSArIFwiPC9hPlwiLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIGZvcih2YXIgYmxvY2tfdHlwZSBpbiB0aGlzLmF2YWlsYWJsZV90eXBlcykge1xuICAgICAgaWYgKEJsb2Nrcy5oYXNPd25Qcm9wZXJ0eShibG9ja190eXBlKSkge1xuICAgICAgICB2YXIgYmxvY2tfY29udHJvbCA9IG5ldyBCbG9ja0NvbnRyb2woYmxvY2tfdHlwZSwgdGhpcy5pbnN0YW5jZV9zY29wZSk7XG4gICAgICAgIGlmIChibG9ja19jb250cm9sLmNhbl9iZV9yZW5kZXJlZCkge1xuICAgICAgICAgIHRoaXMuJGVsLmFwcGVuZChibG9ja19jb250cm9sLnJlbmRlcigpLiRlbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLiRlbC5kZWxlZ2F0ZSgnLnN0LWJsb2NrLWNvbnRyb2wnLCAnY2xpY2snLCB0aGlzLmhhbmRsZUNvbnRyb2xCdXR0b25DbGljayk7XG4gIH0sXG5cbiAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ3N0LWJsb2NrLWNvbnRyb2xzLS1hY3RpdmUnKTtcblxuICAgIEV2ZW50QnVzLnRyaWdnZXIoJ2Jsb2NrOmNvbnRyb2xzOnNob3duJyk7XG4gIH0sXG5cbiAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ3N0LWJsb2NrLWNvbnRyb2xzLS1hY3RpdmUnKTtcblxuICAgIEV2ZW50QnVzLnRyaWdnZXIoJ2Jsb2NrOmNvbnRyb2xzOmhpZGRlbicpO1xuICB9LFxuXG4gIGhhbmRsZUNvbnRyb2xCdXR0b25DbGljazogZnVuY3Rpb24oZSkge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICB0aGlzLnRyaWdnZXIoJ2NyZWF0ZUJsb2NrJywgJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdHlwZScpKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCbG9ja0NvbnRyb2xzO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBCbG9ja0RlbGV0aW9uID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2Vuc3VyZUVsZW1lbnQoKTtcbiAgdGhpcy5fYmluZEZ1bmN0aW9ucygpO1xufTtcblxuT2JqZWN0LmFzc2lnbihCbG9ja0RlbGV0aW9uLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9mdW5jdGlvbi1iaW5kJyksIHJlcXVpcmUoJy4vcmVuZGVyYWJsZScpLCB7XG5cbiAgdGFnTmFtZTogJ2EnLFxuICBjbGFzc05hbWU6ICdzdC1ibG9jay11aS1idG4gc3QtYmxvY2stdWktYnRuLS1kZWxldGUgc3QtaWNvbicsXG5cbiAgYXR0cmlidXRlczoge1xuICAgIGh0bWw6ICdkZWxldGUnLFxuICAgICdkYXRhLWljb24nOiAnYmluJ1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrRGVsZXRpb247XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBzdFRvSFRNTCA9IHJlcXVpcmUoJy4vdG8taHRtbCcpO1xudmFyIHN0VG9NYXJrZG93biA9IHJlcXVpcmUoJy4vdG8tbWFya2Rvd24nKTtcbnZhciBCbG9ja01peGlucyA9IHJlcXVpcmUoJy4vYmxvY2tfbWl4aW5zJyk7XG5cbnZhciBTaW1wbGVCbG9jayA9IHJlcXVpcmUoJy4vc2ltcGxlLWJsb2NrJyk7XG52YXIgQmxvY2tSZW9yZGVyID0gcmVxdWlyZSgnLi9ibG9jay5yZW9yZGVyJyk7XG52YXIgQmxvY2tEZWxldGlvbiA9IHJlcXVpcmUoJy4vYmxvY2suZGVsZXRpb24nKTtcbnZhciBCbG9ja1Bvc2l0aW9uZXIgPSByZXF1aXJlKCcuL2Jsb2NrLnBvc2l0aW9uZXInKTtcbnZhciBGb3JtYXR0ZXJzID0gcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyk7XG52YXIgRXZlbnRCdXMgPSByZXF1aXJlKCcuL2V2ZW50LWJ1cycpO1xuXG52YXIgU3Bpbm5lciA9IHJlcXVpcmUoJ3NwaW4uanMnKTtcblxudmFyIEJsb2NrID0gZnVuY3Rpb24oZGF0YSwgaW5zdGFuY2VfaWQpIHtcbiAgU2ltcGxlQmxvY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbkJsb2NrLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoU2ltcGxlQmxvY2sucHJvdG90eXBlKTtcbkJsb2NrLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEJsb2NrO1xuXG52YXIgZGVsZXRlX3RlbXBsYXRlID0gW1xuICBcIjxkaXYgY2xhc3M9J3N0LWJsb2NrX191aS1kZWxldGUtY29udHJvbHMnPlwiLFxuICBcIjxsYWJlbCBjbGFzcz0nc3QtYmxvY2tfX2RlbGV0ZS1sYWJlbCc+XCIsXG4gIFwiPCU9IGkxOG4udCgnZ2VuZXJhbDpkZWxldGUnKSAlPlwiLFxuICBcIjwvbGFiZWw+XCIsXG4gIFwiPGEgY2xhc3M9J3N0LWJsb2NrLXVpLWJ0biBzdC1ibG9jay11aS1idG4tLWNvbmZpcm0tZGVsZXRlIHN0LWljb24nIGRhdGEtaWNvbj0ndGljayc+PC9hPlwiLFxuICBcIjxhIGNsYXNzPSdzdC1ibG9jay11aS1idG4gc3QtYmxvY2stdWktYnRuLS1kZW55LWRlbGV0ZSBzdC1pY29uJyBkYXRhLWljb249J2Nsb3NlJz48L2E+XCIsXG4gIFwiPC9kaXY+XCJcbl0uam9pbihcIlxcblwiKTtcblxudmFyIGRyb3Bfb3B0aW9ucyA9IHtcbiAgaHRtbDogWyc8ZGl2IGNsYXNzPVwic3QtYmxvY2tfX2Ryb3B6b25lXCI+JyxcbiAgICAnPHNwYW4gY2xhc3M9XCJzdC1pY29uXCI+PCU9IF8ucmVzdWx0KGJsb2NrLCBcImljb25fbmFtZVwiKSAlPjwvc3Bhbj4nLFxuICAgICc8cD48JT0gaTE4bi50KFwiZ2VuZXJhbDpkcm9wXCIsIHsgYmxvY2s6IFwiPHNwYW4+XCIgKyBfLnJlc3VsdChibG9jaywgXCJ0aXRsZVwiKSArIFwiPC9zcGFuPlwiIH0pICU+JyxcbiAgICAnPC9wPjwvZGl2PiddLmpvaW4oJ1xcbicpLFxuICAgIHJlX3JlbmRlcl9vbl9yZW9yZGVyOiBmYWxzZVxufTtcblxudmFyIHBhc3RlX29wdGlvbnMgPSB7XG4gIGh0bWw6IFsnPGlucHV0IHR5cGU9XCJ0ZXh0XCIgcGxhY2Vob2xkZXI9XCI8JT0gaTE4bi50KFwiZ2VuZXJhbDpwYXN0ZVwiKSAlPlwiJyxcbiAgICAnIGNsYXNzPVwic3QtYmxvY2tfX3Bhc3RlLWlucHV0IHN0LXBhc3RlLWJsb2NrXCI+J10uam9pbignJylcbn07XG5cbnZhciB1cGxvYWRfb3B0aW9ucyA9IHtcbiAgaHRtbDogW1xuICAgICc8ZGl2IGNsYXNzPVwic3QtYmxvY2tfX3VwbG9hZC1jb250YWluZXJcIj4nLFxuICAgICc8aW5wdXQgdHlwZT1cImZpbGVcIiB0eXBlPVwic3QtZmlsZS11cGxvYWRcIj4nLFxuICAgICc8YnV0dG9uIGNsYXNzPVwic3QtdXBsb2FkLWJ0blwiPjwlPSBpMThuLnQoXCJnZW5lcmFsOnVwbG9hZFwiKSAlPjwvYnV0dG9uPicsXG4gICAgJzwvZGl2PidcbiAgXS5qb2luKCdcXG4nKVxufTtcblxuY29uZmlnLmRlZmF1bHRzLkJsb2NrID0ge1xuICBkcm9wX29wdGlvbnM6IGRyb3Bfb3B0aW9ucyxcbiAgcGFzdGVfb3B0aW9uczogcGFzdGVfb3B0aW9ucyxcbiAgdXBsb2FkX29wdGlvbnM6IHVwbG9hZF9vcHRpb25zXG59O1xuXG5PYmplY3QuYXNzaWduKEJsb2NrLnByb3RvdHlwZSwgU2ltcGxlQmxvY2suZm4sIHJlcXVpcmUoJy4vYmxvY2sudmFsaWRhdGlvbnMnKSwge1xuXG4gIGJvdW5kOiBbXCJfaGFuZGxlQ29udGVudFBhc3RlXCIsIFwiX29uRm9jdXNcIiwgXCJfb25CbHVyXCIsIFwib25Ecm9wXCIsIFwib25EZWxldGVDbGlja1wiLFxuICAgIFwiY2xlYXJJbnNlcnRlZFN0eWxlc1wiLCBcImdldFNlbGVjdGlvbkZvckZvcm1hdHRlclwiLCBcIm9uQmxvY2tSZW5kZXJcIl0sXG5cbiAgICBjbGFzc05hbWU6ICdzdC1ibG9jayBzdC1pY29uLS1hZGQnLFxuXG4gICAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbihTaW1wbGVCbG9jay5mbi5hdHRyaWJ1dGVzLmNhbGwodGhpcyksIHtcbiAgICAgICAgJ2RhdGEtaWNvbi1hZnRlcicgOiBcImFkZFwiXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgaWNvbl9uYW1lOiAnZGVmYXVsdCcsXG5cbiAgICB2YWxpZGF0aW9uRmFpbE1zZzogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gaTE4bi50KCdlcnJvcnM6dmFsaWRhdGlvbl9mYWlsJywgeyB0eXBlOiB0aGlzLnRpdGxlKCkgfSk7XG4gICAgfSxcblxuICAgIGVkaXRvckhUTUw6ICc8ZGl2IGNsYXNzPVwic3QtYmxvY2tfX2VkaXRvclwiPjwvZGl2PicsXG5cbiAgICB0b29sYmFyRW5hYmxlZDogdHJ1ZSxcblxuICAgIGRyb3BwYWJsZTogZmFsc2UsXG4gICAgcGFzdGFibGU6IGZhbHNlLFxuICAgIHVwbG9hZGFibGU6IGZhbHNlLFxuICAgIGZldGNoYWJsZTogZmFsc2UsXG4gICAgYWpheGFibGU6IGZhbHNlLFxuXG4gICAgZHJvcF9vcHRpb25zOiB7fSxcbiAgICBwYXN0ZV9vcHRpb25zOiB7fSxcbiAgICB1cGxvYWRfb3B0aW9uczoge30sXG5cbiAgICBmb3JtYXR0YWJsZTogdHJ1ZSxcblxuICAgIF9wcmV2aW91c1NlbGVjdGlvbjogJycsXG5cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHt9LFxuXG4gICAgdG9NYXJrZG93bjogZnVuY3Rpb24obWFya2Rvd24peyByZXR1cm4gbWFya2Rvd247IH0sXG4gICAgdG9IVE1MOiBmdW5jdGlvbihodG1sKXsgcmV0dXJuIGh0bWw7IH0sXG5cbiAgICB3aXRoTWl4aW46IGZ1bmN0aW9uKG1peGluKSB7XG4gICAgICBpZiAoIV8uaXNPYmplY3QobWl4aW4pKSB7IHJldHVybjsgfVxuXG4gICAgICB2YXIgaW5pdGlhbGl6ZU1ldGhvZCA9IFwiaW5pdGlhbGl6ZVwiICsgbWl4aW4ubWl4aW5OYW1lO1xuXG4gICAgICBpZiAoXy5pc1VuZGVmaW5lZCh0aGlzW2luaXRpYWxpemVNZXRob2RdKSkge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMsIG1peGluKTtcbiAgICAgICAgdGhpc1tpbml0aWFsaXplTWV0aG9kXSgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5iZWZvcmVCbG9ja1JlbmRlcigpO1xuICAgICAgdGhpcy5fc2V0QmxvY2tJbm5lcigpO1xuXG4gICAgICB0aGlzLiRlZGl0b3IgPSB0aGlzLiRpbm5lci5jaGlsZHJlbigpLmZpcnN0KCk7XG5cbiAgICAgIGlmKHRoaXMuZHJvcHBhYmxlIHx8IHRoaXMucGFzdGFibGUgfHwgdGhpcy51cGxvYWRhYmxlKSB7XG4gICAgICAgIHZhciBpbnB1dF9odG1sID0gJChcIjxkaXY+XCIsIHsgJ2NsYXNzJzogJ3N0LWJsb2NrX19pbnB1dHMnIH0pO1xuICAgICAgICB0aGlzLiRpbm5lci5hcHBlbmQoaW5wdXRfaHRtbCk7XG4gICAgICAgIHRoaXMuJGlucHV0cyA9IGlucHV0X2h0bWw7XG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzLmhhc1RleHRCbG9jaykgeyB0aGlzLl9pbml0VGV4dEJsb2NrcygpOyB9XG4gICAgICBpZiAodGhpcy5kcm9wcGFibGUpIHsgdGhpcy53aXRoTWl4aW4oQmxvY2tNaXhpbnMuRHJvcHBhYmxlKTsgfVxuICAgICAgaWYgKHRoaXMucGFzdGFibGUpIHsgdGhpcy53aXRoTWl4aW4oQmxvY2tNaXhpbnMuUGFzdGFibGUpOyB9XG4gICAgICBpZiAodGhpcy51cGxvYWRhYmxlKSB7IHRoaXMud2l0aE1peGluKEJsb2NrTWl4aW5zLlVwbG9hZGFibGUpOyB9XG4gICAgICBpZiAodGhpcy5mZXRjaGFibGUpIHsgdGhpcy53aXRoTWl4aW4oQmxvY2tNaXhpbnMuRmV0Y2hhYmxlKTsgfVxuICAgICAgaWYgKHRoaXMuY29udHJvbGxhYmxlKSB7IHRoaXMud2l0aE1peGluKEJsb2NrTWl4aW5zLkNvbnRyb2xsYWJsZSk7IH1cblxuICAgICAgaWYgKHRoaXMuZm9ybWF0dGFibGUpIHsgdGhpcy5faW5pdEZvcm1hdHRpbmcoKTsgfVxuXG4gICAgICB0aGlzLl9ibG9ja1ByZXBhcmUoKTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5hamF4YWJsZSkge1xuICAgICAgICB0aGlzLnJlc29sdmVBbGxJblF1ZXVlKCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuJGVsLnJlbW92ZSgpO1xuICAgIH0sXG5cbiAgICBsb2FkaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmKCFfLmlzVW5kZWZpbmVkKHRoaXMuc3Bpbm5lcikpIHsgdGhpcy5yZWFkeSgpOyB9XG5cbiAgICAgIHRoaXMuc3Bpbm5lciA9IG5ldyBTcGlubmVyKGNvbmZpZy5kZWZhdWx0cy5zcGlubmVyKTtcbiAgICAgIHRoaXMuc3Bpbm5lci5zcGluKHRoaXMuJGVsWzBdKTtcblxuICAgICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ3N0LS1pcy1sb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIHJlYWR5OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdzdC0taXMtbG9hZGluZycpO1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHRoaXMuc3Bpbm5lcikpIHtcbiAgICAgICAgdGhpcy5zcGlubmVyLnN0b3AoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3Bpbm5lcjtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLyogR2VuZXJpYyB0b0RhdGEgaW1wbGVtZW50YXRpb24uXG4gICAgICogQ2FuIGJlIG92ZXJ3cml0dGVuLCBhbHRob3VnaCBob3BlZnVsbHkgdGhpcyB3aWxsIGNvdmVyIG1vc3Qgc2l0dWF0aW9uc1xuICAgICAqL1xuICAgIHRvRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICB1dGlscy5sb2coXCJ0b0RhdGEgZm9yIFwiICsgdGhpcy5ibG9ja0lEKTtcblxuICAgICAgdmFyIGRhdGFPYmogPSB7fTtcblxuICAgICAgLyogU2ltcGxlIHRvIHN0YXJ0LiBBZGQgY29uZGl0aW9ucyBsYXRlciAqL1xuICAgICAgaWYgKHRoaXMuaGFzVGV4dEJsb2NrKCkpIHtcbiAgICAgICAgdmFyIGNvbnRlbnQgPSB0aGlzLmdldFRleHRCbG9jaygpLmh0bWwoKTtcbiAgICAgICAgaWYgKGNvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGRhdGFPYmoudGV4dCA9IHN0VG9NYXJrZG93bihjb250ZW50LCB0aGlzLnR5cGUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCBhbnkgaW5wdXRzIHRvIHRoZSBkYXRhIGF0dHJcbiAgICAgIGlmKHRoaXMuJCgnOmlucHV0Jykubm90KCcuc3QtcGFzdGUtYmxvY2snKS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuJCgnOmlucHV0JykuZWFjaChmdW5jdGlvbihpbmRleCxpbnB1dCl7XG4gICAgICAgICAgaWYgKGlucHV0LmdldEF0dHJpYnV0ZSgnbmFtZScpKSB7XG4gICAgICAgICAgICBkYXRhT2JqW2lucHV0LmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IGlucHV0LnZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFNldFxuICAgICAgaWYoIV8uaXNFbXB0eShkYXRhT2JqKSkge1xuICAgICAgICB0aGlzLnNldERhdGEoZGF0YU9iaik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8qIEdlbmVyaWMgaW1wbGVtZW50YXRpb24gdG8gdGVsbCB1cyB3aGVuIHRoZSBibG9jayBpcyBhY3RpdmUgKi9cbiAgICBmb2N1czogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmdldFRleHRCbG9jaygpLmZvY3VzKCk7XG4gICAgfSxcblxuICAgIGJsdXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5nZXRUZXh0QmxvY2soKS5ibHVyKCk7XG4gICAgfSxcblxuICAgIG9uRm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5nZXRUZXh0QmxvY2soKS5iaW5kKCdmb2N1cycsIHRoaXMuX29uRm9jdXMpO1xuICAgIH0sXG5cbiAgICBvbkJsdXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5nZXRUZXh0QmxvY2soKS5iaW5kKCdibHVyJywgdGhpcy5fb25CbHVyKTtcbiAgICB9LFxuXG4gICAgLypcbiAgICAgKiBFdmVudCBoYW5kbGVyc1xuICAgICAqL1xuXG4gICAgX29uRm9jdXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50cmlnZ2VyKCdibG9ja0ZvY3VzJywgdGhpcy4kZWwpO1xuICAgIH0sXG5cbiAgICBfb25CbHVyOiBmdW5jdGlvbigpIHt9LFxuXG4gICAgb25Ecm9wOiBmdW5jdGlvbihkYXRhVHJhbnNmZXJPYmopIHt9LFxuXG4gICAgb25EZWxldGVDbGljazogZnVuY3Rpb24oZXYpIHtcbiAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgIHZhciBvbkRlbGV0ZUNvbmZpcm0gPSBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdyZW1vdmVCbG9jaycsIHRoaXMuYmxvY2tJRCk7XG4gICAgICB9O1xuXG4gICAgICB2YXIgb25EZWxldGVEZW55ID0gZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdzdC1ibG9jay0tZGVsZXRlLWFjdGl2ZScpO1xuICAgICAgICAkZGVsZXRlX2VsLnJlbW92ZSgpO1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXMuaXNFbXB0eSgpKSB7XG4gICAgICAgIG9uRGVsZXRlQ29uZmlybS5jYWxsKHRoaXMsIG5ldyBFdmVudCgnY2xpY2snKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy4kaW5uZXIuYXBwZW5kKF8udGVtcGxhdGUoZGVsZXRlX3RlbXBsYXRlKSk7XG4gICAgICB0aGlzLiRlbC5hZGRDbGFzcygnc3QtYmxvY2stLWRlbGV0ZS1hY3RpdmUnKTtcblxuICAgICAgdmFyICRkZWxldGVfZWwgPSB0aGlzLiRpbm5lci5maW5kKCcuc3QtYmxvY2tfX3VpLWRlbGV0ZS1jb250cm9scycpO1xuXG4gICAgICB0aGlzLiRpbm5lci5vbignY2xpY2snLCAnLnN0LWJsb2NrLXVpLWJ0bi0tY29uZmlybS1kZWxldGUnLFxuICAgICAgICAgICAgICAgICAgICAgb25EZWxldGVDb25maXJtLmJpbmQodGhpcykpXG4gICAgICAgICAgICAgICAgICAgICAub24oJ2NsaWNrJywgJy5zdC1ibG9jay11aS1idG4tLWRlbnktZGVsZXRlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICBvbkRlbGV0ZURlbnkuYmluZCh0aGlzKSk7XG4gICAgfSxcblxuICAgIHBhc3RlZE1hcmtkb3duVG9IVE1MOiBmdW5jdGlvbihjb250ZW50KSB7XG4gICAgICByZXR1cm4gc3RUb0hUTUwoc3RUb01hcmtkb3duKGNvbnRlbnQsIHRoaXMudHlwZSksIHRoaXMudHlwZSk7XG4gICAgfSxcblxuICAgIG9uQ29udGVudFBhc3RlZDogZnVuY3Rpb24oZXZlbnQsIHRhcmdldCl7XG4gICAgICB0YXJnZXQuaHRtbCh0aGlzLnBhc3RlZE1hcmtkb3duVG9IVE1MKHRhcmdldFswXS5pbm5lckhUTUwpKTtcbiAgICAgIHRoaXMuZ2V0VGV4dEJsb2NrKCkuY2FyZXRUb0VuZCgpO1xuICAgIH0sXG5cbiAgICBiZWZvcmVMb2FkaW5nRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmxvYWRpbmcoKTtcblxuICAgICAgaWYodGhpcy5kcm9wcGFibGUgfHwgdGhpcy51cGxvYWRhYmxlIHx8IHRoaXMucGFzdGFibGUpIHtcbiAgICAgICAgdGhpcy4kZWRpdG9yLnNob3coKTtcbiAgICAgICAgdGhpcy4kaW5wdXRzLmhpZGUoKTtcbiAgICAgIH1cblxuICAgICAgU2ltcGxlQmxvY2suZm4uYmVmb3JlTG9hZGluZ0RhdGEuY2FsbCh0aGlzKTtcblxuICAgICAgdGhpcy5yZWFkeSgpO1xuICAgIH0sXG5cbiAgICBfaGFuZGxlQ29udGVudFBhc3RlOiBmdW5jdGlvbihldikge1xuICAgICAgc2V0VGltZW91dCh0aGlzLm9uQ29udGVudFBhc3RlZC5iaW5kKHRoaXMsIGV2LCAkKGV2LmN1cnJlbnRUYXJnZXQpKSwgMCk7XG4gICAgfSxcblxuICAgIF9nZXRCbG9ja0NsYXNzOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAnc3QtYmxvY2stLScgKyB0aGlzLmNsYXNzTmFtZTtcbiAgICB9LFxuXG4gICAgLypcbiAgICAgKiBJbml0IGZ1bmN0aW9ucyBmb3IgYWRkaW5nIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cblxuICAgIF9pbml0VUlDb21wb25lbnRzOiBmdW5jdGlvbigpIHtcblxuICAgICAgdmFyIHBvc2l0aW9uZXIgPSBuZXcgQmxvY2tQb3NpdGlvbmVyKHRoaXMuJGVsLCB0aGlzLmluc3RhbmNlSUQpO1xuXG4gICAgICB0aGlzLl93aXRoVUlDb21wb25lbnQoXG4gICAgICAgIHBvc2l0aW9uZXIsICcuc3QtYmxvY2stdWktYnRuLS1yZW9yZGVyJywgcG9zaXRpb25lci50b2dnbGVcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX3dpdGhVSUNvbXBvbmVudChcbiAgICAgICAgbmV3IEJsb2NrUmVvcmRlcih0aGlzLiRlbClcbiAgICAgICk7XG5cbiAgICAgIHRoaXMuX3dpdGhVSUNvbXBvbmVudChcbiAgICAgICAgbmV3IEJsb2NrRGVsZXRpb24oKSwgJy5zdC1ibG9jay11aS1idG4tLWRlbGV0ZScsIHRoaXMub25EZWxldGVDbGlja1xuICAgICAgKTtcblxuICAgICAgdGhpcy5vbkZvY3VzKCk7XG4gICAgICB0aGlzLm9uQmx1cigpO1xuICAgIH0sXG5cbiAgICBfaW5pdEZvcm1hdHRpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgLy8gRW5hYmxlIGZvcm1hdHRpbmcga2V5Ym9hcmQgaW5wdXRcbiAgICAgIHZhciBmb3JtYXR0ZXI7XG4gICAgICBmb3IgKHZhciBuYW1lIGluIEZvcm1hdHRlcnMpIHtcbiAgICAgICAgaWYgKEZvcm1hdHRlcnMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICBmb3JtYXR0ZXIgPSBGb3JtYXR0ZXJzW25hbWVdO1xuICAgICAgICAgIGlmICghXy5pc1VuZGVmaW5lZChmb3JtYXR0ZXIua2V5Q29kZSkpIHtcbiAgICAgICAgICAgIGZvcm1hdHRlci5fYmluZFRvQmxvY2sodGhpcy4kZWwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBfaW5pdFRleHRCbG9ja3M6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5nZXRUZXh0QmxvY2soKVxuICAgICAgLmJpbmQoJ3Bhc3RlJywgdGhpcy5faGFuZGxlQ29udGVudFBhc3RlKVxuICAgICAgLmJpbmQoJ2tleXVwJywgdGhpcy5nZXRTZWxlY3Rpb25Gb3JGb3JtYXR0ZXIpXG4gICAgICAuYmluZCgnbW91c2V1cCcsIHRoaXMuZ2V0U2VsZWN0aW9uRm9yRm9ybWF0dGVyKVxuICAgICAgLmJpbmQoJ0RPTU5vZGVJbnNlcnRlZCcsIHRoaXMuY2xlYXJJbnNlcnRlZFN0eWxlcyk7XG4gICAgfSxcblxuICAgIGdldFNlbGVjdGlvbkZvckZvcm1hdHRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYmxvY2sgPSB0aGlzO1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHNlbGVjdGlvbiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKSxcbiAgICAgICAgc2VsZWN0aW9uU3RyID0gc2VsZWN0aW9uLnRvU3RyaW5nKCkudHJpbSgpLFxuICAgICAgICBldmVudFR5cGUgPSAoc2VsZWN0aW9uU3RyID09PSAnJykgPyAnaGlkZScgOiAncG9zaXRpb24nO1xuXG4gICAgICAgIEV2ZW50QnVzLnRyaWdnZXIoJ2Zvcm1hdHRlcjonICsgZXZlbnRUeXBlLCBibG9jayk7XG4gICAgICB9LCAxKTtcbiAgICB9LFxuXG4gICAgY2xlYXJJbnNlcnRlZFN0eWxlczogZnVuY3Rpb24oZSkge1xuICAgICAgdmFyIHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZSgnc3R5bGUnKTsgLy8gSGFja3kgZml4IGZvciBDaHJvbWUuXG4gICAgfSxcblxuICAgIGhhc1RleHRCbG9jazogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUZXh0QmxvY2soKS5sZW5ndGggPiAwO1xuICAgIH0sXG5cbiAgICBnZXRUZXh0QmxvY2s6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKF8uaXNVbmRlZmluZWQodGhpcy50ZXh0X2Jsb2NrKSkge1xuICAgICAgICB0aGlzLnRleHRfYmxvY2sgPSB0aGlzLiQoJy5zdC10ZXh0LWJsb2NrJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLnRleHRfYmxvY2s7XG4gICAgfSxcblxuICAgIGlzRW1wdHk6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8uaXNFbXB0eSh0aGlzLnNhdmVBbmRHZXREYXRhKCkpO1xuICAgIH1cblxufSk7XG5cbkJsb2NrLmV4dGVuZCA9IHJlcXVpcmUoJy4vaGVscGVycy9leHRlbmQnKTsgLy8gQWxsb3cgb3VyIEJsb2NrIHRvIGJlIGV4dGVuZGVkLlxuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi9ldmVudC1idXMnKTtcblxudmFyIHRlbXBsYXRlID0gW1xuICBcIjxkaXYgY2xhc3M9J3N0LWJsb2NrLXBvc2l0aW9uZXJfX2lubmVyJz5cIixcbiAgXCI8c3BhbiBjbGFzcz0nc3QtYmxvY2stcG9zaXRpb25lcl9fc2VsZWN0ZWQtdmFsdWUnPjwvc3Bhbj5cIixcbiAgXCI8c2VsZWN0IGNsYXNzPSdzdC1ibG9jay1wb3NpdGlvbmVyX19zZWxlY3QnPjwvc2VsZWN0PlwiLFxuICBcIjwvZGl2PlwiXG5dLmpvaW4oXCJcXG5cIik7XG5cbnZhciBCbG9ja1Bvc2l0aW9uZXIgPSBmdW5jdGlvbihibG9ja19lbGVtZW50LCBpbnN0YW5jZV9pZCkge1xuICB0aGlzLiRibG9jayA9IGJsb2NrX2VsZW1lbnQ7XG4gIHRoaXMuaW5zdGFuY2VJRCA9IGluc3RhbmNlX2lkO1xuICB0aGlzLnRvdGFsX2Jsb2NrcyA9IDA7XG5cbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG5cbiAgdGhpcy5pbml0aWFsaXplKCk7XG59O1xuXG5PYmplY3QuYXNzaWduKEJsb2NrUG9zaXRpb25lci5wcm90b3R5cGUsIHJlcXVpcmUoJy4vZnVuY3Rpb24tYmluZCcpLCByZXF1aXJlKCcuL3JlbmRlcmFibGUnKSwge1xuXG4gIGJvdW5kOiBbJ29uQmxvY2tDb3VudENoYW5nZScsICdvblNlbGVjdENoYW5nZScsICd0b2dnbGUnLCAnc2hvdycsICdoaWRlJ10sXG5cbiAgY2xhc3NOYW1lOiAnc3QtYmxvY2stcG9zaXRpb25lcicsXG4gIHZpc2libGVDbGFzczogJ3N0LWJsb2NrLXBvc2l0aW9uZXItLWlzLXZpc2libGUnLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy4kZWwuYXBwZW5kKHRlbXBsYXRlKTtcbiAgICB0aGlzLiRzZWxlY3QgPSB0aGlzLiQoJy5zdC1ibG9jay1wb3NpdGlvbmVyX19zZWxlY3QnKTtcblxuICAgIHRoaXMuJHNlbGVjdC5vbignY2hhbmdlJywgdGhpcy5vblNlbGVjdENoYW5nZSk7XG5cbiAgICBFdmVudEJ1cy5vbih0aGlzLmluc3RhbmNlSUQgKyBcIjpibG9ja3M6Y291bnRfdXBkYXRlXCIsIHRoaXMub25CbG9ja0NvdW50Q2hhbmdlKTtcbiAgfSxcblxuICBvbkJsb2NrQ291bnRDaGFuZ2U6IGZ1bmN0aW9uKG5ld19jb3VudCkge1xuICAgIGlmIChuZXdfY291bnQgIT09IHRoaXMudG90YWxfYmxvY2tzKSB7XG4gICAgICB0aGlzLnRvdGFsX2Jsb2NrcyA9IG5ld19jb3VudDtcbiAgICAgIHRoaXMucmVuZGVyUG9zaXRpb25MaXN0KCk7XG4gICAgfVxuICB9LFxuXG4gIG9uU2VsZWN0Q2hhbmdlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdmFsID0gdGhpcy4kc2VsZWN0LnZhbCgpO1xuICAgIGlmICh2YWwgIT09IDApIHtcbiAgICAgIEV2ZW50QnVzLnRyaWdnZXIodGhpcy5pbnN0YW5jZUlEICsgXCI6YmxvY2tzOmNoYW5nZV9wb3NpdGlvblwiLFxuICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRibG9jaywgdmFsLCAodmFsID09PSAxID8gJ2JlZm9yZScgOiAnYWZ0ZXInKSk7XG4gICAgICAgICAgICAgICAgICAgICAgIHRoaXMudG9nZ2xlKCk7XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlclBvc2l0aW9uTGlzdDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGlubmVyID0gXCI8b3B0aW9uIHZhbHVlPScwJz5cIiArIGkxOG4udChcImdlbmVyYWw6cG9zaXRpb25cIikgKyBcIjwvb3B0aW9uPlwiO1xuICAgIGZvcih2YXIgaSA9IDE7IGkgPD0gdGhpcy50b3RhbF9ibG9ja3M7IGkrKykge1xuICAgICAgaW5uZXIgKz0gXCI8b3B0aW9uIHZhbHVlPVwiK2krXCI+XCIraStcIjwvb3B0aW9uPlwiO1xuICAgIH1cbiAgICB0aGlzLiRzZWxlY3QuaHRtbChpbm5lcik7XG4gIH0sXG5cbiAgdG9nZ2xlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLiRzZWxlY3QudmFsKDApO1xuICAgIHRoaXMuJGVsLnRvZ2dsZUNsYXNzKHRoaXMudmlzaWJsZUNsYXNzKTtcbiAgfSxcblxuICBzaG93OiBmdW5jdGlvbigpe1xuICAgIHRoaXMuJGVsLmFkZENsYXNzKHRoaXMudmlzaWJsZUNsYXNzKTtcbiAgfSxcblxuICBoaWRlOiBmdW5jdGlvbigpe1xuICAgIHRoaXMuJGVsLnJlbW92ZUNsYXNzKHRoaXMudmlzaWJsZUNsYXNzKTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBCbG9ja1Bvc2l0aW9uZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xuXG52YXIgRXZlbnRCdXMgPSByZXF1aXJlKCcuL2V2ZW50LWJ1cycpO1xuXG52YXIgQmxvY2tSZW9yZGVyID0gZnVuY3Rpb24oYmxvY2tfZWxlbWVudCkge1xuICB0aGlzLiRibG9jayA9IGJsb2NrX2VsZW1lbnQ7XG4gIHRoaXMuYmxvY2tJRCA9IHRoaXMuJGJsb2NrLmF0dHIoJ2lkJyk7XG5cbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG5cbiAgdGhpcy5pbml0aWFsaXplKCk7XG59O1xuXG5PYmplY3QuYXNzaWduKEJsb2NrUmVvcmRlci5wcm90b3R5cGUsIHJlcXVpcmUoJy4vZnVuY3Rpb24tYmluZCcpLCByZXF1aXJlKCcuL3JlbmRlcmFibGUnKSwge1xuXG4gIGJvdW5kOiBbJ29uTW91c2VEb3duJywgJ29uQ2xpY2snLCAnb25EcmFnU3RhcnQnLCAnb25EcmFnRW5kJywgJ29uRHJhZycsICdvbkRyb3AnXSxcblxuICBjbGFzc05hbWU6ICdzdC1ibG9jay11aS1idG4gc3QtYmxvY2stdWktYnRuLS1yZW9yZGVyIHN0LWljb24nLFxuICB0YWdOYW1lOiAnYScsXG5cbiAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdodG1sJzogJ3Jlb3JkZXInLFxuICAgICAgJ2RyYWdnYWJsZSc6ICd0cnVlJyxcbiAgICAgICdkYXRhLWljb24nOiAnbW92ZSdcbiAgICB9O1xuICB9LFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJGVsLmJpbmQoJ21vdXNlZG93biB0b3VjaHN0YXJ0JywgdGhpcy5vbk1vdXNlRG93bilcbiAgICAuYmluZCgnY2xpY2snLCB0aGlzLm9uQ2xpY2spXG4gICAgLmJpbmQoJ2RyYWdzdGFydCcsIHRoaXMub25EcmFnU3RhcnQpXG4gICAgLmJpbmQoJ2RyYWdlbmQgdG91Y2hlbmQnLCB0aGlzLm9uRHJhZ0VuZClcbiAgICAuYmluZCgnZHJhZyB0b3VjaG1vdmUnLCB0aGlzLm9uRHJhZyk7XG5cbiAgICB0aGlzLiRibG9jay5kcm9wQXJlYSgpXG4gICAgLmJpbmQoJ2Ryb3AnLCB0aGlzLm9uRHJvcCk7XG4gIH0sXG5cbiAgb25Nb3VzZURvd246IGZ1bmN0aW9uKCkge1xuICAgIEV2ZW50QnVzLnRyaWdnZXIoXCJibG9jazpyZW9yZGVyOmRvd25cIiwgdGhpcy5ibG9ja0lEKTtcbiAgfSxcblxuICBvbkRyb3A6IGZ1bmN0aW9uKGV2KSB7XG4gICAgZXYucHJldmVudERlZmF1bHQoKTtcblxuICAgIHZhciBkcm9wcGVkX29uID0gdGhpcy4kYmxvY2ssXG4gICAgaXRlbV9pZCA9IGV2Lm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmdldERhdGEoXCJ0ZXh0L3BsYWluXCIpLFxuICAgIGJsb2NrID0gJCgnIycgKyBpdGVtX2lkKTtcblxuICAgIGlmICghXy5pc1VuZGVmaW5lZChpdGVtX2lkKSAmJlxuICAgICAgICAhXy5pc0VtcHR5KGJsb2NrKSAmJlxuICAgICAgICAgIGRyb3BwZWRfb24uYXR0cignaWQnKSAhPT0gaXRlbV9pZCAmJlxuICAgICAgICAgICAgZHJvcHBlZF9vbi5hdHRyKCdkYXRhLWluc3RhbmNlJykgPT09IGJsb2NrLmF0dHIoJ2RhdGEtaW5zdGFuY2UnKVxuICAgICAgICkge1xuICAgICAgICAgZHJvcHBlZF9vbi5hZnRlcihibG9jayk7XG4gICAgICAgfVxuICAgICAgIEV2ZW50QnVzLnRyaWdnZXIoXCJibG9jazpyZW9yZGVyOmRyb3BwZWRcIiwgaXRlbV9pZCk7XG4gIH0sXG5cbiAgb25EcmFnU3RhcnQ6IGZ1bmN0aW9uKGV2KSB7XG4gICAgdmFyIGJ0biA9ICQoZXYuY3VycmVudFRhcmdldCkucGFyZW50KCk7XG5cbiAgICBldi5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5zZXREcmFnSW1hZ2UodGhpcy4kYmxvY2tbMF0sIGJ0bi5wb3NpdGlvbigpLmxlZnQsIGJ0bi5wb3NpdGlvbigpLnRvcCk7XG4gICAgZXYub3JpZ2luYWxFdmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YSgnVGV4dCcsIHRoaXMuYmxvY2tJRCk7XG5cbiAgICBFdmVudEJ1cy50cmlnZ2VyKFwiYmxvY2s6cmVvcmRlcjpkcmFnc3RhcnRcIiwgdGhpcy5ibG9ja0lEKTtcbiAgICB0aGlzLiRibG9jay5hZGRDbGFzcygnc3QtYmxvY2stLWRyYWdnaW5nJyk7XG4gIH0sXG5cbiAgb25EcmFnRW5kOiBmdW5jdGlvbihldikge1xuICAgIEV2ZW50QnVzLnRyaWdnZXIoXCJibG9jazpyZW9yZGVyOmRyYWdlbmRcIiwgdGhpcy5ibG9ja0lEKTtcbiAgICB0aGlzLiRibG9jay5yZW1vdmVDbGFzcygnc3QtYmxvY2stLWRyYWdnaW5nJyk7XG4gIH0sXG5cbiAgb25EcmFnOiBmdW5jdGlvbihldil7fSxcblxuICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrUmVvcmRlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vbG9kYXNoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBFdmVudEJ1cyA9IHJlcXVpcmUoJy4vZXZlbnQtYnVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGJsb2NrU3RvcmFnZToge30sXG5cbiAgY3JlYXRlU3RvcmU6IGZ1bmN0aW9uKGJsb2NrRGF0YSkge1xuICAgIHRoaXMuYmxvY2tTdG9yYWdlID0ge1xuICAgICAgdHlwZTogdXRpbHMudW5kZXJzY29yZWQodGhpcy50eXBlKSxcbiAgICAgIGRhdGE6IGJsb2NrRGF0YSB8fCB7fVxuICAgIH07XG4gIH0sXG5cbiAgc2F2ZTogZnVuY3Rpb24oKSB7IHRoaXMudG9EYXRhKCk7IH0sXG5cbiAgc2F2ZUFuZFJldHVybkRhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIHJldHVybiB0aGlzLmJsb2NrU3RvcmFnZTtcbiAgfSxcblxuICBzYXZlQW5kR2V0RGF0YTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN0b3JlID0gdGhpcy5zYXZlQW5kUmV0dXJuRGF0YSgpO1xuICAgIHJldHVybiBzdG9yZS5kYXRhIHx8IHN0b3JlO1xuICB9LFxuXG4gIGdldERhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmJsb2NrU3RvcmFnZS5kYXRhO1xuICB9LFxuXG4gIHNldERhdGE6IGZ1bmN0aW9uKGJsb2NrRGF0YSkge1xuICAgIHV0aWxzLmxvZyhcIlNldHRpbmcgZGF0YSBmb3IgYmxvY2sgXCIgKyB0aGlzLmJsb2NrSUQpO1xuICAgIE9iamVjdC5hc3NpZ24odGhpcy5ibG9ja1N0b3JhZ2UuZGF0YSwgYmxvY2tEYXRhIHx8IHt9KTtcbiAgfSxcblxuICBzZXRBbmRSZXRyaWV2ZURhdGE6IGZ1bmN0aW9uKGJsb2NrRGF0YSkge1xuICAgIHRoaXMuc2V0RGF0YShibG9ja0RhdGEpO1xuICAgIHJldHVybiB0aGlzLmdldERhdGEoKTtcbiAgfSxcblxuICBzZXRBbmRMb2FkRGF0YTogZnVuY3Rpb24oYmxvY2tEYXRhKSB7XG4gICAgdGhpcy5zZXREYXRhKGJsb2NrRGF0YSk7XG4gICAgdGhpcy5iZWZvcmVMb2FkaW5nRGF0YSgpO1xuICB9LFxuXG4gIHRvRGF0YTogZnVuY3Rpb24oKSB7fSxcbiAgbG9hZERhdGE6IGZ1bmN0aW9uKCkge30sXG5cbiAgYmVmb3JlTG9hZGluZ0RhdGE6IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLmxvZyhcImxvYWREYXRhIGZvciBcIiArIHRoaXMuYmxvY2tJRCk7XG4gICAgRXZlbnRCdXMudHJpZ2dlcihcImJsb2NrOmxvYWREYXRhXCIsIHRoaXMuYmxvY2tJRCk7XG4gICAgdGhpcy5sb2FkRGF0YSh0aGlzLmdldERhdGEoKSk7XG4gIH0sXG5cbiAgX2xvYWREYXRhOiBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5sb2coXCJfbG9hZERhdGEgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIHRoZSBmdXR1cmUuIFBsZWFzZSB1c2UgYmVmb3JlTG9hZGluZ0RhdGEgaW5zdGVhZC5cIik7XG4gICAgdGhpcy5iZWZvcmVMb2FkaW5nRGF0YSgpO1xuICB9LFxuXG4gIGNoZWNrQW5kTG9hZERhdGE6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghXy5pc0VtcHR5KHRoaXMuZ2V0RGF0YSgpKSkge1xuICAgICAgdGhpcy5iZWZvcmVMb2FkaW5nRGF0YSgpO1xuICAgIH1cbiAgfVxuXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfID0gcmVxdWlyZSgnLi9sb2Rhc2gnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIGJlc3ROYW1lRnJvbUZpZWxkID0gZnVuY3Rpb24oZmllbGQpIHtcbiAgdmFyIG1zZyA9IGZpZWxkLmF0dHIoXCJkYXRhLXN0LW5hbWVcIikgfHwgZmllbGQuYXR0cihcIm5hbWVcIik7XG5cbiAgaWYgKCFtc2cpIHtcbiAgICBtc2cgPSAnRmllbGQnO1xuICB9XG5cbiAgcmV0dXJuIHV0aWxzLmNhcGl0YWxpemUobXNnKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIGVycm9yczogW10sXG5cbiAgdmFsaWQ6IGZ1bmN0aW9uKCl7XG4gICAgdGhpcy5wZXJmb3JtVmFsaWRhdGlvbnMoKTtcbiAgICByZXR1cm4gdGhpcy5lcnJvcnMubGVuZ3RoID09PSAwO1xuICB9LFxuXG4gIC8vIFRoaXMgbWV0aG9kIGFjdHVhbGx5IGRvZXMgdGhlIGxlZyB3b3JrXG4gIC8vIG9mIHJ1bm5pbmcgb3VyIHZhbGlkYXRvcnMgYW5kIGN1c3RvbSB2YWxpZGF0b3JzXG4gIHBlcmZvcm1WYWxpZGF0aW9uczogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZXNldEVycm9ycygpO1xuXG4gICAgdmFyIHJlcXVpcmVkX2ZpZWxkcyA9IHRoaXMuJCgnLnN0LXJlcXVpcmVkJyk7XG4gICAgcmVxdWlyZWRfZmllbGRzLmVhY2goZnVuY3Rpb24gKGksIGYpIHtcbiAgICAgIHRoaXMudmFsaWRhdGVGaWVsZChmKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHRoaXMudmFsaWRhdGlvbnMuZm9yRWFjaCh0aGlzLnJ1blZhbGlkYXRvciwgdGhpcyk7XG5cbiAgICB0aGlzLiRlbC50b2dnbGVDbGFzcygnc3QtYmxvY2stLXdpdGgtZXJyb3JzJywgdGhpcy5lcnJvcnMubGVuZ3RoID4gMCk7XG4gIH0sXG5cbiAgLy8gRXZlcnl0aGluZyBpbiBoZXJlIHNob3VsZCBiZSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0cnVlIG9yIGZhbHNlXG4gIHZhbGlkYXRpb25zOiBbXSxcblxuICB2YWxpZGF0ZUZpZWxkOiBmdW5jdGlvbihmaWVsZCkge1xuICAgIGZpZWxkID0gJChmaWVsZCk7XG5cbiAgICB2YXIgY29udGVudCA9IGZpZWxkLmF0dHIoJ2NvbnRlbnRlZGl0YWJsZScpID8gZmllbGQudGV4dCgpIDogZmllbGQudmFsKCk7XG5cbiAgICBpZiAoY29udGVudC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0RXJyb3IoZmllbGQsIGkxOG4udChcImVycm9yczpibG9ja19lbXB0eVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBuYW1lOiBiZXN0TmFtZUZyb21GaWVsZChmaWVsZCkgfSkpO1xuICAgIH1cbiAgfSxcblxuICBydW5WYWxpZGF0b3I6IGZ1bmN0aW9uKHZhbGlkYXRvcikge1xuICAgIGlmICghXy5pc1VuZGVmaW5lZCh0aGlzW3ZhbGlkYXRvcl0pKSB7XG4gICAgICB0aGlzW3ZhbGlkYXRvcl0uY2FsbCh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgc2V0RXJyb3I6IGZ1bmN0aW9uKGZpZWxkLCByZWFzb24pIHtcbiAgICB2YXIgJG1zZyA9IHRoaXMuYWRkTWVzc2FnZShyZWFzb24sIFwic3QtbXNnLS1lcnJvclwiKTtcbiAgICBmaWVsZC5hZGRDbGFzcygnc3QtZXJyb3InKTtcblxuICAgIHRoaXMuZXJyb3JzLnB1c2goeyBmaWVsZDogZmllbGQsIHJlYXNvbjogcmVhc29uLCBtc2c6ICRtc2cgfSk7XG4gIH0sXG5cbiAgcmVzZXRFcnJvcnM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuZXJyb3JzLmZvckVhY2goZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgZXJyb3IuZmllbGQucmVtb3ZlQ2xhc3MoJ3N0LWVycm9yJyk7XG4gICAgICBlcnJvci5tc2cucmVtb3ZlKCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLiRtZXNzYWdlcy5yZW1vdmVDbGFzcyhcInN0LWJsb2NrX19tZXNzYWdlcy0taXMtdmlzaWJsZVwiKTtcbiAgICB0aGlzLmVycm9ycyA9IFtdO1xuICB9XG5cbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi4vZXZlbnQtYnVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG1peGluTmFtZTogXCJBamF4YWJsZVwiLFxuXG4gIGFqYXhhYmxlOiB0cnVlLFxuXG4gIGluaXRpYWxpemVBamF4YWJsZTogZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9xdWV1ZWQgPSBbXTtcbiAgfSxcblxuICBhZGRRdWV1ZWRJdGVtOiBmdW5jdGlvbihuYW1lLCBkZWZlcnJlZCkge1xuICAgIHV0aWxzLmxvZyhcIkFkZGluZyBxdWV1ZWQgaXRlbSBmb3IgXCIgKyB0aGlzLmJsb2NrSUQgKyBcIiBjYWxsZWQgXCIgKyBuYW1lKTtcbiAgICBFdmVudEJ1cy50cmlnZ2VyKFwib25VcGxvYWRTdGFydFwiLCB0aGlzLmJsb2NrSUQpO1xuXG4gICAgdGhpcy5fcXVldWVkLnB1c2goeyBuYW1lOiBuYW1lLCBkZWZlcnJlZDogZGVmZXJyZWQgfSk7XG4gIH0sXG5cbiAgcmVtb3ZlUXVldWVkSXRlbTogZnVuY3Rpb24obmFtZSkge1xuICAgIHV0aWxzLmxvZyhcIlJlbW92aW5nIHF1ZXVlZCBpdGVtIGZvciBcIiArIHRoaXMuYmxvY2tJRCArIFwiIGNhbGxlZCBcIiArIG5hbWUpO1xuICAgIEV2ZW50QnVzLnRyaWdnZXIoXCJvblVwbG9hZFN0b3BcIiwgdGhpcy5ibG9ja0lEKTtcblxuICAgIHRoaXMuX3F1ZXVlZCA9IHRoaXMuX3F1ZXVlZC5maWx0ZXIoZnVuY3Rpb24ocXVldWVkKSB7XG4gICAgICByZXR1cm4gcXVldWVkLm5hbWUgIT09IG5hbWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgaGFzSXRlbXNJblF1ZXVlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fcXVldWVkLmxlbmd0aCA+IDA7XG4gIH0sXG5cbiAgcmVzb2x2ZUFsbEluUXVldWU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3F1ZXVlZC5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuICAgICAgdXRpbHMubG9nKFwiQWJvcnRpbmcgcXVldWVkIHJlcXVlc3Q6IFwiICsgaXRlbS5uYW1lKTtcbiAgICAgIGl0ZW0uZGVmZXJyZWQuYWJvcnQoKTtcbiAgICB9LCB0aGlzKTtcbiAgfVxuXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG1peGluTmFtZTogXCJDb250cm9sbGFibGVcIixcblxuICBpbml0aWFsaXplQ29udHJvbGxhYmxlOiBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5sb2coXCJBZGRpbmcgY29udHJvbGxhYmxlIHRvIGJsb2NrIFwiICsgdGhpcy5ibG9ja0lEKTtcbiAgICB0aGlzLiRjb250cm9sX3VpID0gJCgnPGRpdj4nLCB7J2NsYXNzJzogJ3N0LWJsb2NrX19jb250cm9sLXVpJ30pO1xuICAgIE9iamVjdC5rZXlzKHRoaXMuY29udHJvbHMpLmZvckVhY2goXG4gICAgICBmdW5jdGlvbihjbWQpIHtcbiAgICAgICAgLy8gQmluZCBjb25maWd1cmVkIGhhbmRsZXIgdG8gY3VycmVudCBibG9jayBjb250ZXh0XG4gICAgICAgIHRoaXMuYWRkVWlDb250cm9sKGNtZCwgdGhpcy5jb250cm9sc1tjbWRdLmJpbmQodGhpcykpO1xuICAgICAgfSxcbiAgICAgIHRoaXNcbiAgICApO1xuICAgIHRoaXMuJGlubmVyLmFwcGVuZCh0aGlzLiRjb250cm9sX3VpKTtcbiAgfSxcblxuICBnZXRDb250cm9sVGVtcGxhdGU6IGZ1bmN0aW9uKGNtZCkge1xuICAgIHJldHVybiAkKFwiPGE+XCIsXG4gICAgICB7ICdkYXRhLWljb24nOiBjbWQsXG4gICAgICAgICdjbGFzcyc6ICdzdC1pY29uIHN0LWJsb2NrLWNvbnRyb2wtdWktYnRuIHN0LWJsb2NrLWNvbnRyb2wtdWktYnRuLS0nICsgY21kXG4gICAgICB9KTtcbiAgfSxcblxuICBhZGRVaUNvbnRyb2w6IGZ1bmN0aW9uKGNtZCwgaGFuZGxlcikge1xuICAgIHRoaXMuJGNvbnRyb2xfdWkuYXBwZW5kKHRoaXMuZ2V0Q29udHJvbFRlbXBsYXRlKGNtZCkpO1xuICAgIHRoaXMuJGNvbnRyb2xfdWkub24oJ2NsaWNrJywgJy5zdC1ibG9jay1jb250cm9sLXVpLWJ0bi0tJyArIGNtZCwgaGFuZGxlcik7XG4gIH1cbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLyogQWRkcyBkcm9wIGZ1bmN0aW9uYWx0aXkgdG8gdGhpcyBibG9jayAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL2xvZGFzaCcpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi4vZXZlbnQtYnVzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG1peGluTmFtZTogXCJEcm9wcGFibGVcIixcbiAgdmFsaWRfZHJvcF9maWxlX3R5cGVzOiBbJ0ZpbGUnLCAnRmlsZXMnLCAndGV4dC9wbGFpbicsICd0ZXh0L3VyaS1saXN0J10sXG5cbiAgaW5pdGlhbGl6ZURyb3BwYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdXRpbHMubG9nKFwiQWRkaW5nIGRyb3BwYWJsZSB0byBibG9jayBcIiArIHRoaXMuYmxvY2tJRCk7XG5cbiAgICB0aGlzLmRyb3Bfb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGNvbmZpZy5kZWZhdWx0cy5CbG9jay5kcm9wX29wdGlvbnMsIHRoaXMuZHJvcF9vcHRpb25zKTtcblxuICAgIHZhciBkcm9wX2h0bWwgPSAkKF8udGVtcGxhdGUodGhpcy5kcm9wX29wdGlvbnMuaHRtbCkoeyBibG9jazogdGhpcywgXzogXyB9KSk7XG5cbiAgICAvL3RoaXMuJGVkaXRvci5oaWRlKCk7XG4gICAgdGhpcy4kaW5wdXRzLmFwcGVuZChkcm9wX2h0bWwpO1xuICAgICAgaWYgKHRoaXMuJCgnLnVwbG9hZC1hcmVhJykubGVuZ3RoICE9PSAwKSB7XG4gICAgICAgICAgdGhpcy4kKCcudXBsb2FkLWFyZWEnKS5hcHBlbmQoZHJvcF9odG1sKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy4kaW5wdXRzLmFwcGVuZChkcm9wX2h0bWwpO1xuICAgICAgfVxuICAgIHRoaXMuJGRyb3B6b25lID0gZHJvcF9odG1sO1xuXG4gICAgLy8gQmluZCBvdXIgZHJvcCBldmVudFxuICAgIHRoaXMuJGRyb3B6b25lLmRyb3BBcmVhKClcbiAgICAgICAgICAgICAgICAgIC5iaW5kKCdkcm9wJywgdGhpcy5faGFuZGxlRHJvcC5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuJGlubmVyLmFkZENsYXNzKCdzdC1ibG9ja19faW5uZXItLWRyb3BwYWJsZScpO1xuICB9LFxuXG4gIF9oYW5kbGVEcm9wOiBmdW5jdGlvbihlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgZSA9IGUub3JpZ2luYWxFdmVudDtcblxuICAgIHZhciBlbCA9ICQoZS50YXJnZXQpLFxuICAgICAgICB0eXBlcyA9IGUuZGF0YVRyYW5zZmVyLnR5cGVzO1xuXG4gICAgZWwucmVtb3ZlQ2xhc3MoJ3N0LWRyb3B6b25lLS1kcmFnb3ZlcicpO1xuXG4gICAgLypcbiAgICAgIENoZWNrIHRoZSB0eXBlIHdlIGp1c3QgcmVjZWl2ZWQsXG4gICAgICBkZWxlZ2F0ZSBpdCBhd2F5IHRvIG91ciBibG9ja1R5cGVzIHRvIHByb2Nlc3NcbiAgICAqL1xuXG4gICAgaWYgKHR5cGVzICYmXG4gICAgICAgIHR5cGVzLnNvbWUoZnVuY3Rpb24odHlwZSkge1xuICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsaWRfZHJvcF9maWxlX3R5cGVzLmluY2x1ZGVzKHR5cGUpO1xuICAgICAgICAgICAgICAgICAgIH0sIHRoaXMpKSB7XG4gICAgICB0aGlzLm9uRHJvcChlLmRhdGFUcmFuc2Zlcik7XG4gICAgfVxuXG4gICAgRXZlbnRCdXMudHJpZ2dlcignYmxvY2s6Y29udGVudDpkcm9wcGVkJywgdGhpcy5ibG9ja0lEKTtcbiAgfVxuXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfID0gcmVxdWlyZSgnLi4vbG9kYXNoJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG1peGluTmFtZTogXCJGZXRjaGFibGVcIixcblxuICBpbml0aWFsaXplRmV0Y2hhYmxlOiBmdW5jdGlvbigpe1xuICAgIHRoaXMud2l0aE1peGluKHJlcXVpcmUoJy4vYWpheGFibGUnKSk7XG4gIH0sXG5cbiAgZmV0Y2g6IGZ1bmN0aW9uKG9wdGlvbnMsIHN1Y2Nlc3MsIGZhaWx1cmUpe1xuICAgIHZhciB1aWQgPSBfLnVuaXF1ZUlkKHRoaXMuYmxvY2tJRCArIFwiX2ZldGNoXCIpLFxuICAgICAgICB4aHIgPSAkLmFqYXgob3B0aW9ucyk7XG5cbiAgICB0aGlzLnJlc2V0TWVzc2FnZXMoKTtcbiAgICB0aGlzLmFkZFF1ZXVlZEl0ZW0odWlkLCB4aHIpO1xuXG4gICAgaWYoIV8uaXNVbmRlZmluZWQoc3VjY2VzcykpIHtcbiAgICAgIHhoci5kb25lKHN1Y2Nlc3MuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgaWYoIV8uaXNVbmRlZmluZWQoZmFpbHVyZSkpIHtcbiAgICAgIHhoci5mYWlsKGZhaWx1cmUuYmluZCh0aGlzKSk7XG4gICAgfVxuXG4gICAgeGhyLmFsd2F5cyh0aGlzLnJlbW92ZVF1ZXVlZEl0ZW0uYmluZCh0aGlzLCB1aWQpKTtcblxuICAgIHJldHVybiB4aHI7XG4gIH1cblxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgQWpheGFibGU6IHJlcXVpcmUoJy4vYWpheGFibGUuanMnKSxcbiAgQ29udHJvbGxhYmxlOiByZXF1aXJlKCcuL2NvbnRyb2xsYWJsZS5qcycpLFxuICBEcm9wcGFibGU6IHJlcXVpcmUoJy4vZHJvcHBhYmxlLmpzJyksXG4gIEZldGNoYWJsZTogcmVxdWlyZSgnLi9mZXRjaGFibGUuanMnKSxcbiAgUGFzdGFibGU6IHJlcXVpcmUoJy4vcGFzdGFibGUuanMnKSxcbiAgVXBsb2FkYWJsZTogcmVxdWlyZSgnLi91cGxvYWRhYmxlLmpzJyksXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfID0gcmVxdWlyZSgnLi4vbG9kYXNoJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICBtaXhpbk5hbWU6IFwiUGFzdGFibGVcIixcblxuICBpbml0aWFsaXplUGFzdGFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHV0aWxzLmxvZyhcIkFkZGluZyBwYXN0YWJsZSB0byBibG9jayBcIiArIHRoaXMuYmxvY2tJRCk7XG5cbiAgICB0aGlzLnBhc3RlX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBjb25maWcuZGVmYXVsdHMuQmxvY2sucGFzdGVfb3B0aW9ucywgdGhpcy5wYXN0ZV9vcHRpb25zKTtcbiAgICB0aGlzLiRpbnB1dHMuYXBwZW5kKF8udGVtcGxhdGUodGhpcy5wYXN0ZV9vcHRpb25zLmh0bWwsIHRoaXMpKTtcblxuICAgIHRoaXMuJCgnLnN0LXBhc3RlLWJsb2NrJylcbiAgICAgIC5iaW5kKCdjbGljaycsIGZ1bmN0aW9uKCl7ICQodGhpcykuc2VsZWN0KCk7IH0pXG4gICAgICAuYmluZCgncGFzdGUnLCB0aGlzLl9oYW5kbGVDb250ZW50UGFzdGUpXG4gICAgICAuYmluZCgnc3VibWl0JywgdGhpcy5faGFuZGxlQ29udGVudFBhc3RlKTtcbiAgfVxuXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfID0gcmVxdWlyZSgnLi4vbG9kYXNoJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG52YXIgZmlsZVVwbG9hZGVyID0gcmVxdWlyZSgnLi4vZXh0ZW5zaW9ucy9zaXItdHJldm9yLnVwbG9hZGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gIG1peGluTmFtZTogXCJVcGxvYWRhYmxlXCIsXG5cbiAgdXBsb2Fkc0NvdW50OiAwLFxuXG4gIGluaXRpYWxpemVVcGxvYWRhYmxlOiBmdW5jdGlvbigpIHtcbiAgICB1dGlscy5sb2coXCJBZGRpbmcgdXBsb2FkYWJsZSB0byBibG9jayBcIiArIHRoaXMuYmxvY2tJRCk7XG4gICAgdGhpcy53aXRoTWl4aW4ocmVxdWlyZSgnLi9hamF4YWJsZScpKTtcblxuICAgIHRoaXMudXBsb2FkX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBjb25maWcuZGVmYXVsdHMuQmxvY2sudXBsb2FkX29wdGlvbnMsIHRoaXMudXBsb2FkX29wdGlvbnMpO1xuICAgIGlmICh0aGlzLiQoJy51cGxvYWQtYXJlYScpLmxlbmd0aCAhPT0gMCkge1xuICAgICAgICB0aGlzLiQoJy51cGxvYWQtYXJlYScpLmFwcGVuZChfLnRlbXBsYXRlKHRoaXMudXBsb2FkX29wdGlvbnMuaHRtbCwgdGhpcykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuJGlucHV0cy5hcHBlbmQoXy50ZW1wbGF0ZSh0aGlzLnVwbG9hZF9vcHRpb25zLmh0bWwsIHRoaXMpKTtcbiAgICB9XG4gIH0sXG5cbiAgdXBsb2FkZXI6IGZ1bmN0aW9uKGZpbGUsIHN1Y2Nlc3MsIGZhaWx1cmUpe1xuICAgIHJldHVybiBmaWxlVXBsb2FkZXIodGhpcywgZmlsZSwgc3VjY2VzcywgZmFpbHVyZSk7XG4gIH1cblxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBCbG9jayBRdW90ZVxuKi9cblxudmFyIF8gPSByZXF1aXJlKCcuLi9sb2Rhc2gnKTtcblxudmFyIEJsb2NrID0gcmVxdWlyZSgnLi4vYmxvY2snKTtcbnZhciBzdFRvSFRNTCA9IHJlcXVpcmUoJy4uL3RvLWh0bWwnKTtcblxudmFyIHRlbXBsYXRlID0gXy50ZW1wbGF0ZShbXG4gICc8YmxvY2txdW90ZSBjbGFzcz1cInN0LXJlcXVpcmVkIHN0LXRleHQtYmxvY2tcIiBjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCI+PC9ibG9ja3F1b3RlPicsXG4gICc8bGFiZWwgY2xhc3M9XCJzdC1pbnB1dC1sYWJlbFwiPiA8JT0gaTE4bi50KFwiYmxvY2tzOnF1b3RlOmNyZWRpdF9maWVsZFwiKSAlPjwvbGFiZWw+JyxcbiAgJzxpbnB1dCBtYXhsZW5ndGg9XCIxNDBcIiBuYW1lPVwiY2l0ZVwiIHBsYWNlaG9sZGVyPVwiPCU9IGkxOG4udChcImJsb2NrczpxdW90ZTpjcmVkaXRfZmllbGRcIikgJT5cIicsXG4gICcgY2xhc3M9XCJzdC1pbnB1dC1zdHJpbmcgc3QtcmVxdWlyZWQganMtY2l0ZS1pbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgLz4nXG5dLmpvaW4oXCJcXG5cIikpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrLmV4dGVuZCh7XG5cbiAgdHlwZTogXCJxdW90ZVwiLFxuXG4gIHRpdGxlOiBmdW5jdGlvbigpeyByZXR1cm4gaTE4bi50KCdibG9ja3M6cXVvdGU6dGl0bGUnKTsgfSxcblxuICBpY29uX25hbWU6ICdxdW90ZScsXG5cbiAgZWRpdG9ySFRNTDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRlbXBsYXRlKHRoaXMpO1xuICB9LFxuXG4gIGxvYWREYXRhOiBmdW5jdGlvbihkYXRhKXtcbiAgICB0aGlzLmdldFRleHRCbG9jaygpLmh0bWwoc3RUb0hUTUwoZGF0YS50ZXh0LCB0aGlzLnR5cGUpKTtcbiAgICB0aGlzLiQoJy5qcy1jaXRlLWlucHV0JykudmFsKGRhdGEuY2l0ZSk7XG4gIH0sXG5cbiAgdG9NYXJrZG93bjogZnVuY3Rpb24obWFya2Rvd24pIHtcbiAgICByZXR1cm4gbWFya2Rvd24ucmVwbGFjZSgvXiguKykkL21nLFwiPiAkMVwiKTtcbiAgfVxuXG59KTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBIZWFkaW5nIEJsb2NrXG4qL1xuXG52YXIgQmxvY2sgPSByZXF1aXJlKCcuLi9ibG9jaycpO1xudmFyIHN0VG9IVE1MID0gcmVxdWlyZSgnLi4vdG8taHRtbCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrLmV4dGVuZCh7XG5cbiAgdHlwZTogJ2hlYWRpbmcnLFxuXG4gIHRpdGxlOiBmdW5jdGlvbigpeyByZXR1cm4gaTE4bi50KCdibG9ja3M6aGVhZGluZzp0aXRsZScpOyB9LFxuXG4gIGVkaXRvckhUTUw6ICc8ZGl2IGNsYXNzPVwic3QtcmVxdWlyZWQgc3QtdGV4dC1ibG9jayBzdC10ZXh0LWJsb2NrLS1oZWFkaW5nXCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiPjwvZGl2PicsXG5cbiAgaWNvbl9uYW1lOiAnaGVhZGluZycsXG5cbiAgbG9hZERhdGE6IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHRoaXMuZ2V0VGV4dEJsb2NrKCkuaHRtbChzdFRvSFRNTChkYXRhLnRleHQsIHRoaXMudHlwZSkpO1xuICB9XG59KTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBTaW1wbGUgSW1hZ2UgQmxvY2tcbiovXG5cblxudmFyIEJsb2NrID0gcmVxdWlyZSgnLi4vYmxvY2snKTtcblxubW9kdWxlLmV4cG9ydHMgPSBCbG9jay5leHRlbmQoe1xuXG4gIHR5cGU6IFwiaW1hZ2VcIixcbiAgdGl0bGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gaTE4bi50KCdibG9ja3M6aW1hZ2U6dGl0bGUnKTsgfSxcblxuICBkcm9wcGFibGU6IHRydWUsXG4gIHVwbG9hZGFibGU6IHRydWUsXG5cbiAgaWNvbl9uYW1lOiAnaW1hZ2UnLFxuXG4gIGxvYWREYXRhOiBmdW5jdGlvbihkYXRhKXtcbiAgICAvLyBDcmVhdGUgb3VyIGltYWdlIHRhZ1xuICAgIHRoaXMuJGVkaXRvci5odG1sKCQoJzxpbWc+JywgeyBzcmM6IGRhdGEuZmlsZS51cmwgfSkpO1xuICB9LFxuXG4gIG9uQmxvY2tSZW5kZXI6IGZ1bmN0aW9uKCl7XG4gICAgLyogU2V0dXAgdGhlIHVwbG9hZCBidXR0b24gKi9cbiAgICB0aGlzLiRpbnB1dHMuZmluZCgnYnV0dG9uJykuYmluZCgnY2xpY2snLCBmdW5jdGlvbihldil7IGV2LnByZXZlbnREZWZhdWx0KCk7IH0pO1xuICAgIHRoaXMuJGlucHV0cy5maW5kKCdpbnB1dCcpLm9uKCdjaGFuZ2UnLCAoZnVuY3Rpb24oZXYpIHtcbiAgICAgIHRoaXMub25Ecm9wKGV2LmN1cnJlbnRUYXJnZXQpO1xuICAgIH0pLmJpbmQodGhpcykpO1xuICB9LFxuXG4gIG9uVXBsb2FkU3VjY2VzcyA6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB0aGlzLnNldERhdGEoZGF0YSk7XG4gICAgdGhpcy5yZWFkeSgpO1xuICB9LFxuXG4gIG9uVXBsb2FkRXJyb3IgOiBmdW5jdGlvbihqcVhIUiwgc3RhdHVzLCBlcnJvclRocm93bil7XG4gICAgdGhpcy5hZGRNZXNzYWdlKGkxOG4udCgnYmxvY2tzOmltYWdlOnVwbG9hZF9lcnJvcicpKTtcbiAgICB0aGlzLnJlYWR5KCk7XG4gIH0sXG5cbiAgb25Ecm9wOiBmdW5jdGlvbih0cmFuc2ZlckRhdGEpe1xuICAgIHZhciBmaWxlID0gdHJhbnNmZXJEYXRhLmZpbGVzWzBdLFxuICAgICAgICB1cmxBUEkgPSAodHlwZW9mIFVSTCAhPT0gXCJ1bmRlZmluZWRcIikgPyBVUkwgOiAodHlwZW9mIHdlYmtpdFVSTCAhPT0gXCJ1bmRlZmluZWRcIikgPyB3ZWJraXRVUkwgOiBudWxsO1xuXG4gICAgLy8gSGFuZGxlIG9uZSB1cGxvYWQgYXQgYSB0aW1lXG4gICAgaWYgKC9pbWFnZS8udGVzdChmaWxlLnR5cGUpKSB7XG4gICAgICB0aGlzLmxvYWRpbmcoKTtcbiAgICAgIC8vIFNob3cgdGhpcyBpbWFnZSBvbiBoZXJlXG4gICAgICB0aGlzLiRpbnB1dHMuaGlkZSgpO1xuICAgICAgdGhpcy4kZWRpdG9yLmh0bWwoJCgnPGltZz4nLCB7IHNyYzogdXJsQVBJLmNyZWF0ZU9iamVjdFVSTChmaWxlKSB9KSkuc2hvdygpO1xuXG4gICAgICB0aGlzLnVwbG9hZGVyKGZpbGUsIHRoaXMub25VcGxvYWRTdWNjZXNzLCB0aGlzLm9uVXBsb2FkRXJyb3IpO1xuICAgIH1cbiAgfVxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgVGV4dDogcmVxdWlyZSgnLi90ZXh0JyksXG4gICAgUXVvdGU6IHJlcXVpcmUoJy4vYmxvY2stcXVvdGUnKSxcbiAgICBJbWFnZTogcmVxdWlyZSgnLi9pbWFnZScpLFxuICAgIEhlYWRpbmc6IHJlcXVpcmUoJy4vaGVhZGluZycpLFxuICAgIExpc3Q6IHJlcXVpcmUoJy4vdW5vcmRlcmVkLWxpc3QnKSxcbiAgICBUd2VldDogcmVxdWlyZSgnLi90d2VldCcpLFxuICAgIFZpZGVvOiByZXF1aXJlKCcuL3ZpZGVvJyksXG4gICAgV3lzaWh0bWw6IHJlcXVpcmUoJy4vd3lzaWh0bWwnKSxcbiAgICBSZWRhY3RvcjogcmVxdWlyZSgnLi9yZWRhY3RvcicpLFxuICAgIFRleHRpbWFnZTogcmVxdWlyZSgnLi90ZXh0LWltYWdlJykgXG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gUmVkYWN0b3IgRWRpdG9yIEJsb2NrXG4gTWFrZSBzdXJlIHlvdSBpbml0aWFsaXplKGxvYWRlZCkgZm9sbG93aW5nIGRlcGVuZGVuY2llcyBpbiB5b3VyIHN5c3RlbSB0byBtYWtlIHRoaXMgYmxvY2sgd29yazpcbiByZWRhY3RvciwgZm9udGF3ZXNvbWVcbiAqL1xuXG52YXIgQmxvY2sgPSByZXF1aXJlKCcuLi9ibG9jaycpO1xudmFyIHN0VG9IVE1MID0gcmVxdWlyZSgnLi4vdG8taHRtbCcpO1xudmFyIHRpbWVTdGFtcCA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2suZXh0ZW5kKHtcblxuICAgIHR5cGU6IFwicmVkYWN0b3JcIixcblxuICAgIHRpdGxlOiBmdW5jdGlvbigpIHsgcmV0dXJuICdSZWRhY3Rvcic7IH0sXG5cbiAgICBlZGl0b3JIVE1MOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGltZVN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGlkPVwicmVkYWN0b3ItZWRpdG9yLScgKyB0aW1lU3RhbXAgKyAnXCIgY2xhc3M9XCJzdC1yZXF1aXJlZCBzdC10ZXh0LWJsb2NrXCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIGljb25fbmFtZTogJzxpIGNsYXNzPVwiZmEgZmEtcGVuY2lsLXNxdWFyZS1vXCI+PC9pPicsXG5cbiAgICBvbkJsb2NrUmVuZGVyIDogZnVuY3Rpb24gKCkge1xuICAgICAgICAkKCcjcmVkYWN0b3ItZWRpdG9yLScgKyB0aW1lU3RhbXApLnJlZGFjdG9yKCk7XG4gICAgfSxcblxuICAgIGxvYWREYXRhOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdGhpcy5nZXRUZXh0QmxvY2soKS5odG1sKHN0VG9IVE1MKGRhdGEudGV4dCwgdGhpcy50eXBlKSk7XG4gICAgfVxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiBCbG9jayBUZXh0IGFuZCBJbWFnZVxuIE1ha2Ugc3VyZSB5b3UgaW5pdGlhbGl6ZShsb2FkZWQpIGZvbGxvd2luZyBkZXBlbmRlbmNpZXMgaW4geW91ciBzeXN0ZW0gdG8gbWFrZSB0aGlzIGJsb2NrIHdvcms6XG4gZm9udGF3ZXNvbWVcbiAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL2xvZGFzaCcpO1xuXG52YXIgQmxvY2sgPSByZXF1aXJlKCcuLi9ibG9jaycpO1xudmFyIHN0VG9IVE1MID0gcmVxdWlyZSgnLi4vdG8taHRtbCcpO1xudmFyIEJsb2NrTWl4aW5zID0gcmVxdWlyZSgnLi4vYmxvY2tfbWl4aW5zJyk7XG5cbnZhciB0ZW1wbGF0ZSA9IF8udGVtcGxhdGUoW1xuICAgICc8ZGl2IGNsYXNzPVwic3QtdGV4dC1pbWFnZVwiPicsXG4gICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyxcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLTEyXCI+JyxcbiAgICAgICAgICAgICAgICAnPGxhYmVsIGNsYXNzPVwic3QtaW5wdXQtbGFiZWxcIj48JT0gaTE4bi50KFwiYmxvY2tzOnRleHRpbWFnZTpoZWFkaW5nX2ZpZWxkXCIpICU+PC9sYWJlbD4nLFxuICAgICAgICAgICAgICAgICc8aW5wdXQgbWF4bGVuZ3RoPVwiMTQwXCIgbmFtZT1cInRpdGxlXCIgcGxhY2Vob2xkZXI9XCI8JT0gaTE4bi50KFwiYmxvY2tzOnRleHRpbWFnZTpoZWFkaW5nX2ZpZWxkXCIpICU+XCInLFxuICAgICAgICAgICAgICAgICcgY2xhc3M9XCJzdC1pbnB1dC1zdHJpbmcgc3QtcmVxdWlyZWQganMtdGl0bGUtaW5wdXRcIiB0eXBlPVwidGV4dFwiIC8+JyxcbiAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtMTJcIj4nLFxuICAgICAgICAgICAgJzxsYWJlbCBjbGFzcz1cInN0LWlucHV0LWxhYmVsXCI+VGV4dDwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAnPGRpdiBpZD1cInd5c2lodG1sLWVkaXRvclwiIGNsYXNzPVwic3QtcmVxdWlyZWQgc3QtdGV4dC1ibG9ja1wiIGNvbnRlbnRlZGl0YWJsZT1cInRydWVcIj48L2Rpdj4nLFxuICAgICAgICAgICAgJzwvZGl2PicsXG4gICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPGRpdiBjbGFzcz1cInJvd1wiPicsXG4gICAgICAgICAgICAnPGRpdiBjbGFzcz1cImNvbC02IHVwbG9hZC1hcmVhXCI+PC9kaXY+JyxcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLTYgaW1nLXByZXZpZXdcIj48L2Rpdj4nLFxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtMTJcIj4nLFxuICAgICAgICAgICAgICAgICc8bGFiZWwgY2xhc3M9XCJzdC1pbnB1dC1sYWJlbFwiPkltYWdlIEFsdDwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAnPGlucHV0IG1heGxlbmd0aD1cIjE0MFwiIG5hbWU9XCJpbWFnZWFsdFwiIHBsYWNlaG9sZGVyPVwiSW1hZ2UgQWx0XCInLFxuICAgICAgICAgICAgICAgICcgY2xhc3M9XCJzdC1pbnB1dC1zdHJpbmcganMtaW1hZ2UtYWx0LWlucHV0XCIgdHlwZT1cInRleHRcIiAvPicsXG4gICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLTEyXCI+JyxcbiAgICAgICAgICAgICAgICAnPGxhYmVsIGNsYXNzPVwic3QtaW5wdXQtbGFiZWxcIj48JT0gaTE4bi50KFwiYmxvY2tzOnRleHRpbWFnZTppbWFnZV9hbGlnblwiKSAlPjwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAnPHNlbGVjdCBuYW1lPVwiaW1hZ2VhbGlnblwiIGNsYXNzPVwic3Qtc2VsZWN0LXN0cmluZyBzdC1yZXF1aXJlZCBqcy1pbWFnZS1hbGlnblwiPjxvcHRpb24gdmFsdWU9XCJsZWZ0XCI+TGVmdDwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XCJyaWdodFwiPlJpZ2h0PC9vcHRpb24+PC9zZWxlY3Q+JyxcbiAgICAgICAgICAgICc8L2Rpdj4nLFxuICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJyb3dcIj4nLFxuICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtMTJcIj4nLFxuICAgICAgICAgICAgICAgICc8bGFiZWwgY2xhc3M9XCJzdC1pbnB1dC1sYWJlbFwiPkxpbmsgVGV4dDwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAnPGlucHV0IG1heGxlbmd0aD1cIjE0MFwiIG5hbWU9XCJsaW5rdGV4dFwiIHBsYWNlaG9sZGVyPVwiTGluayBUZXh0XCInLFxuICAgICAgICAgICAgICAgICcgY2xhc3M9XCJzdC1pbnB1dC1zdHJpbmcganMtbGluay10ZXh0LWlucHV0XCIgdHlwZT1cInRleHRcIiAvPicsXG4gICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLTEyXCI+JyxcbiAgICAgICAgICAgICAgICAnPGxhYmVsIGNsYXNzPVwic3QtaW5wdXQtbGFiZWxcIj5MaW5rIFVSTDwvbGFiZWw+JyxcbiAgICAgICAgICAgICAgICAnPGlucHV0IG1heGxlbmd0aD1cIjE0MFwiIG5hbWU9XCJsaW5rdXJsXCIgcGxhY2Vob2xkZXI9XCJMaW5rIFVSTFwiJyxcbiAgICAgICAgICAgICAgICAnIGNsYXNzPVwic3QtaW5wdXQtc3RyaW5nIGpzLWxpbmstdXJsLWlucHV0XCIgdHlwZT1cInRleHRcIiAvPicsXG4gICAgICAgICAgICAnPC9kaXY+JyxcbiAgICAgICAgJzwvZGl2PicsXG4gICAgJzwvZGl2Pidcbl0uam9pbihcIlxcblwiKSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2suZXh0ZW5kKHtcblxuICAgIHR5cGU6IFwidGV4dGltYWdlXCIsXG5cbiAgICB0aXRsZTogZnVuY3Rpb24oKXsgcmV0dXJuIGkxOG4udCgnYmxvY2tzOnRleHRpbWFnZTp0aXRsZScpOyB9LFxuXG4gICAgZHJvcHBhYmxlOiB0cnVlLFxuICAgIHVwbG9hZGFibGU6IHRydWUsXG5cbiAgICBpY29uX25hbWU6ICc8aSBjbGFzcz1cImZhIGZhLW5ld3NwYXBlci1vXCI+PC9pPicsXG5cbiAgICBlZGl0b3JIVE1MOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlKHRoaXMpO1xuICAgIH0sXG5cbiAgICBsb2FkRGF0YTogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHRoaXMuZ2V0VGV4dEJsb2NrKCkuaHRtbChzdFRvSFRNTChkYXRhLnRleHQsIHRoaXMudHlwZSkpO1xuICAgICAgICB0aGlzLiQoJy5qcy10aXRsZS1pbnB1dCcpLnZhbChkYXRhLnRpdGxlKTtcbiAgICAgICAgdGhpcy4kKCcuanMtaW1hZ2UtYWx0LWlucHV0JykudmFsKGRhdGEuaW1hZ2VhbHQpO1xuICAgICAgICB0aGlzLiQoJy5qcy1pbWFnZS1hbGlnbicpLnZhbChkYXRhLmltYWdlYWxpZ24pO1xuICAgICAgICB0aGlzLiQoJy5qcy1saW5rLXRleHQtaW5wdXQnKS52YWwoZGF0YS5saW5rdGV4dCk7XG4gICAgICAgIHRoaXMuJCgnLmpzLWxpbmstdXJsLWlucHV0JykudmFsKGRhdGEubGlua3VybCk7XG4gICAgICAgIC8vIENyZWF0ZSBvdXIgaW1hZ2UgdGFnXG4gICAgICAgIHRoaXMuJCgnLmltZy1wcmV2aWV3JykuaHRtbCgkKCc8aW1nPicsIHsgc3JjOiBkYXRhLmZpbGUudXJsIH0pKTtcbiAgICB9LFxuXG4gICAgLy9iZWZvcmVCbG9ja1JlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIC8vICAgIC8vdmFyIGlucHV0X2h0bWwgPSAkKFwiPGRpdj5cIiwgeyAnY2xhc3MnOiAnc3QtYmxvY2tfX2lucHV0cycgfSk7XG4gICAgLy8gICAgLy90aGlzLiRpbm5lci5hcHBlbmQoaW5wdXRfaHRtbCk7XG4gICAgLy8gICAgLy90aGlzLiRpbnB1dHMgPSBpbnB1dF9odG1sO1xuICAgIC8vXG4gICAgLy8gICAgdGhpcy53aXRoTWl4aW4oQmxvY2tNaXhpbnMuVXBsb2FkYWJsZSk7XG4gICAgLy99LFxuXG4gICAgb25CbG9ja1JlbmRlcjogZnVuY3Rpb24oKXtcbiAgICAgICAgLyogU2V0dXAgdGhlIHVwbG9hZCBidXR0b24gKi9cbiAgICAgICAgdGhpcy4kaW5wdXRzLmZpbmQoJ2J1dHRvbicpLmJpbmQoJ2NsaWNrJywgZnVuY3Rpb24oZXYpeyBldi5wcmV2ZW50RGVmYXVsdCgpOyB9KTtcbiAgICAgICAgdGhpcy4kaW5wdXRzLmZpbmQoJ2lucHV0Jykub24oJ2NoYW5nZScsIChmdW5jdGlvbihldikge1xuICAgICAgICAgICAgdGhpcy5vbkRyb3AoZXYuY3VycmVudFRhcmdldCk7XG4gICAgICAgIH0pLmJpbmQodGhpcykpO1xuICAgIH0sXG5cbiAgICBvblVwbG9hZFN1Y2Nlc3MgOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YShkYXRhKTtcbiAgICAgICAgdGhpcy5yZWFkeSgpO1xuICAgIH0sXG5cbiAgICBvblVwbG9hZEVycm9yIDogZnVuY3Rpb24oanFYSFIsIHN0YXR1cywgZXJyb3JUaHJvd24pe1xuICAgICAgICB0aGlzLmFkZE1lc3NhZ2UoaTE4bi50KCdibG9ja3M6aW1hZ2U6dXBsb2FkX2Vycm9yJykpO1xuICAgICAgICB0aGlzLnJlYWR5KCk7XG4gICAgfSxcblxuICAgIG9uRHJvcDogZnVuY3Rpb24odHJhbnNmZXJEYXRhKXtcbiAgICAgICAgdmFyIGZpbGUgPSB0cmFuc2ZlckRhdGEuZmlsZXNbMF0sXG4gICAgICAgICAgICB1cmxBUEkgPSAodHlwZW9mIFVSTCAhPT0gXCJ1bmRlZmluZWRcIikgPyBVUkwgOiAodHlwZW9mIHdlYmtpdFVSTCAhPT0gXCJ1bmRlZmluZWRcIikgPyB3ZWJraXRVUkwgOiBudWxsO1xuXG4gICAgICAgIC8vIEhhbmRsZSBvbmUgdXBsb2FkIGF0IGEgdGltZVxuICAgICAgICBpZiAoL2ltYWdlLy50ZXN0KGZpbGUudHlwZSkpIHtcbiAgICAgICAgICAgIHRoaXMubG9hZGluZygpO1xuICAgICAgICAgICAgLy8gU2hvdyB0aGlzIGltYWdlIG9uIGhlcmVcbiAgICAgICAgICAgIC8vdGhpcy4kaW5wdXRzLmhpZGUoKTtcbiAgICAgICAgICAgIHRoaXMuJCgnLmltZy1wcmV2aWV3JykuaHRtbCgkKCc8aW1nPicsIHsgc3JjOiB1cmxBUEkuY3JlYXRlT2JqZWN0VVJMKGZpbGUpIH0pKS5zaG93KCk7XG5cbiAgICAgICAgICAgIHRoaXMudXBsb2FkZXIoZmlsZSwgdGhpcy5vblVwbG9hZFN1Y2Nlc3MsIHRoaXMub25VcGxvYWRFcnJvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbn0pO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIFRleHQgQmxvY2tcbiovXG5cbnZhciBCbG9jayA9IHJlcXVpcmUoJy4uL2Jsb2NrJyk7XG52YXIgc3RUb0hUTUwgPSByZXF1aXJlKCcuLi90by1odG1sJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2suZXh0ZW5kKHtcblxuICB0eXBlOiBcInRleHRcIixcblxuICB0aXRsZTogZnVuY3Rpb24oKSB7IHJldHVybiBpMThuLnQoJ2Jsb2Nrczp0ZXh0OnRpdGxlJyk7IH0sXG5cbiAgZWRpdG9ySFRNTDogJzxkaXYgY2xhc3M9XCJzdC1yZXF1aXJlZCBzdC10ZXh0LWJsb2NrXCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiPjwvZGl2PicsXG5cbiAgaWNvbl9uYW1lOiAndGV4dCcsXG5cbiAgbG9hZERhdGE6IGZ1bmN0aW9uKGRhdGEpe1xuICAgIHRoaXMuZ2V0VGV4dEJsb2NrKCkuaHRtbChzdFRvSFRNTChkYXRhLnRleHQsIHRoaXMudHlwZSkpO1xuICB9XG59KTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL2xvZGFzaCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIEJsb2NrID0gcmVxdWlyZSgnLi4vYmxvY2snKTtcblxudmFyIHR3ZWV0X3RlbXBsYXRlID0gXy50ZW1wbGF0ZShbXG4gIFwiPGJsb2NrcXVvdGUgY2xhc3M9J3R3aXR0ZXItdHdlZXQnIGFsaWduPSdjZW50ZXInPlwiLFxuICBcIjxwPjwlPSB0ZXh0ICU+PC9wPlwiLFxuICBcIiZtZGFzaDsgPCU9IHVzZXIubmFtZSAlPiAoQDwlPSB1c2VyLnNjcmVlbl9uYW1lICU+KVwiLFxuICBcIjxhIGhyZWY9JzwlPSBzdGF0dXNfdXJsICU+JyBkYXRhLWRhdGV0aW1lPSc8JT0gY3JlYXRlZF9hdCAlPic+PCU9IGNyZWF0ZWRfYXQgJT48L2E+XCIsXG4gIFwiPC9ibG9ja3F1b3RlPlwiLFxuICAnPHNjcmlwdCBzcmM9XCIvL3BsYXRmb3JtLnR3aXR0ZXIuY29tL3dpZGdldHMuanNcIiBjaGFyc2V0PVwidXRmLThcIj48L3NjcmlwdD4nXG5dLmpvaW4oXCJcXG5cIikpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJsb2NrLmV4dGVuZCh7XG5cbiAgdHlwZTogXCJ0d2VldFwiLFxuICBkcm9wcGFibGU6IHRydWUsXG4gIHBhc3RhYmxlOiB0cnVlLFxuICBmZXRjaGFibGU6IHRydWUsXG5cbiAgZHJvcF9vcHRpb25zOiB7XG4gICAgcmVfcmVuZGVyX29uX3Jlb3JkZXI6IHRydWVcbiAgfSxcblxuICB0aXRsZTogZnVuY3Rpb24oKXsgcmV0dXJuIGkxOG4udCgnYmxvY2tzOnR3ZWV0OnRpdGxlJyk7IH0sXG5cbiAgZmV0Y2hVcmw6IGZ1bmN0aW9uKHR3ZWV0SUQpIHtcbiAgICByZXR1cm4gXCIvdHdlZXRzLz90d2VldF9pZD1cIiArIHR3ZWV0SUQ7XG4gIH0sXG5cbiAgaWNvbl9uYW1lOiAndHdpdHRlcicsXG5cbiAgbG9hZERhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChkYXRhLnN0YXR1c191cmwpKSB7IGRhdGEuc3RhdHVzX3VybCA9ICcnOyB9XG4gICAgdGhpcy4kaW5uZXIuZmluZCgnaWZyYW1lJykucmVtb3ZlKCk7XG4gICAgdGhpcy4kaW5uZXIucHJlcGVuZCh0d2VldF90ZW1wbGF0ZShkYXRhKSk7XG4gIH0sXG5cbiAgb25Db250ZW50UGFzdGVkOiBmdW5jdGlvbihldmVudCl7XG4gICAgLy8gQ29udGVudCBwYXN0ZWQuIERlbGVnYXRlIHRvIHRoZSBkcm9wIHBhcnNlIG1ldGhvZFxuICAgIHZhciBpbnB1dCA9ICQoZXZlbnQudGFyZ2V0KSxcbiAgICB2YWwgPSBpbnB1dC52YWwoKTtcblxuICAgIC8vIFBhc3MgdGhpcyB0byB0aGUgc2FtZSBoYW5kbGVyIGFzIG9uRHJvcFxuICAgIHRoaXMuaGFuZGxlVHdpdHRlckRyb3BQYXN0ZSh2YWwpO1xuICB9LFxuXG4gIGhhbmRsZVR3aXR0ZXJEcm9wUGFzdGU6IGZ1bmN0aW9uKHVybCl7XG4gICAgaWYgKCF0aGlzLnZhbGlkVHdlZXRVcmwodXJsKSkge1xuICAgICAgdXRpbHMubG9nKFwiSW52YWxpZCBUd2VldCBVUkxcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVHdpdHRlciBzdGF0dXNcbiAgICB2YXIgdHdlZXRJRCA9IHVybC5tYXRjaCgvW15cXC9dKyQvKTtcbiAgICBpZiAoIV8uaXNFbXB0eSh0d2VldElEKSkge1xuICAgICAgdGhpcy5sb2FkaW5nKCk7XG4gICAgICB0d2VldElEID0gdHdlZXRJRFswXTtcblxuICAgICAgdmFyIGFqYXhPcHRpb25zID0ge1xuICAgICAgICB1cmw6IHRoaXMuZmV0Y2hVcmwodHdlZXRJRCksXG4gICAgICAgIGRhdGFUeXBlOiBcImpzb25cIlxuICAgICAgfTtcblxuICAgICAgdGhpcy5mZXRjaChhamF4T3B0aW9ucywgdGhpcy5vblR3ZWV0U3VjY2VzcywgdGhpcy5vblR3ZWV0RmFpbCk7XG4gICAgfVxuICB9LFxuXG4gIHZhbGlkVHdlZXRVcmw6IGZ1bmN0aW9uKHVybCkge1xuICAgIHJldHVybiAodXRpbHMuaXNVUkkodXJsKSAmJlxuICAgICAgICAgICAgdXJsLmluZGV4T2YoXCJ0d2l0dGVyXCIpICE9PSAtMSAmJlxuICAgICAgICAgICAgdXJsLmluZGV4T2YoXCJzdGF0dXNcIikgIT09IC0xKTtcbiAgfSxcblxuICBvblR3ZWV0U3VjY2VzczogZnVuY3Rpb24oZGF0YSkge1xuICAgIC8vIFBhcnNlIHRoZSB0d2l0dGVyIG9iamVjdCBpbnRvIHNvbWV0aGluZyBhIGJpdCBzbGltbWVyLi5cbiAgICB2YXIgb2JqID0ge1xuICAgICAgdXNlcjoge1xuICAgICAgICBwcm9maWxlX2ltYWdlX3VybDogZGF0YS51c2VyLnByb2ZpbGVfaW1hZ2VfdXJsLFxuICAgICAgICBwcm9maWxlX2ltYWdlX3VybF9odHRwczogZGF0YS51c2VyLnByb2ZpbGVfaW1hZ2VfdXJsX2h0dHBzLFxuICAgICAgICBzY3JlZW5fbmFtZTogZGF0YS51c2VyLnNjcmVlbl9uYW1lLFxuICAgICAgICBuYW1lOiBkYXRhLnVzZXIubmFtZVxuICAgICAgfSxcbiAgICAgIGlkOiBkYXRhLmlkX3N0cixcbiAgICAgIHRleHQ6IGRhdGEudGV4dCxcbiAgICAgIGNyZWF0ZWRfYXQ6IGRhdGEuY3JlYXRlZF9hdCxcbiAgICAgIGVudGl0aWVzOiBkYXRhLmVudGl0aWVzLFxuICAgICAgc3RhdHVzX3VybDogXCJodHRwczovL3R3aXR0ZXIuY29tL1wiICsgZGF0YS51c2VyLnNjcmVlbl9uYW1lICsgXCIvc3RhdHVzL1wiICsgZGF0YS5pZF9zdHJcbiAgICB9O1xuXG4gICAgdGhpcy5zZXRBbmRMb2FkRGF0YShvYmopO1xuICAgIHRoaXMucmVhZHkoKTtcbiAgfSxcblxuICBvblR3ZWV0RmFpbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5hZGRNZXNzYWdlKGkxOG4udChcImJsb2Nrczp0d2VldDpmZXRjaF9lcnJvclwiKSk7XG4gICAgdGhpcy5yZWFkeSgpO1xuICB9LFxuXG4gIG9uRHJvcDogZnVuY3Rpb24odHJhbnNmZXJEYXRhKXtcbiAgICB2YXIgdXJsID0gdHJhbnNmZXJEYXRhLmdldERhdGEoJ3RleHQvcGxhaW4nKTtcbiAgICB0aGlzLmhhbmRsZVR3aXR0ZXJEcm9wUGFzdGUodXJsKTtcbiAgfVxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgIFVub3JkZXJlZCBMaXN0XG4gICAqL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL2xvZGFzaCcpO1xuXG52YXIgQmxvY2sgPSByZXF1aXJlKCcuLi9ibG9jaycpO1xudmFyIHN0VG9IVE1MID0gcmVxdWlyZSgnLi4vdG8taHRtbCcpO1xuXG52YXIgdGVtcGxhdGUgPSAnPGRpdiBjbGFzcz1cInN0LXRleHQtYmxvY2sgc3QtcmVxdWlyZWRcIiBjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCI+PHVsPjxsaT48L2xpPjwvdWw+PC9kaXY+JztcblxubW9kdWxlLmV4cG9ydHMgPSBCbG9jay5leHRlbmQoe1xuXG4gIHR5cGU6ICdsaXN0JyxcblxuICB0aXRsZTogZnVuY3Rpb24oKSB7IHJldHVybiBpMThuLnQoJ2Jsb2NrczpsaXN0OnRpdGxlJyk7IH0sXG5cbiAgaWNvbl9uYW1lOiAnbGlzdCcsXG5cbiAgZWRpdG9ySFRNTDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udGVtcGxhdGUodGVtcGxhdGUsIHRoaXMpO1xuICB9LFxuXG4gIGxvYWREYXRhOiBmdW5jdGlvbihkYXRhKXtcbiAgICB0aGlzLmdldFRleHRCbG9jaygpLmh0bWwoXCI8dWw+XCIgKyBzdFRvSFRNTChkYXRhLnRleHQsIHRoaXMudHlwZSkgKyBcIjwvdWw+XCIpO1xuICB9LFxuXG4gIG9uQmxvY2tSZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuY2hlY2tGb3JMaXN0ID0gdGhpcy5jaGVja0Zvckxpc3QuYmluZCh0aGlzKTtcbiAgICB0aGlzLmdldFRleHRCbG9jaygpLm9uKCdjbGljayBrZXl1cCcsIHRoaXMuY2hlY2tGb3JMaXN0KTtcbiAgfSxcblxuICBjaGVja0Zvckxpc3Q6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLiQoJ3VsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICBkb2N1bWVudC5leGVjQ29tbWFuZChcImluc2VydFVub3JkZXJlZExpc3RcIiwgZmFsc2UsIGZhbHNlKTtcbiAgICB9XG4gIH0sXG5cbiAgdG9NYXJrZG93bjogZnVuY3Rpb24obWFya2Rvd24pIHtcbiAgICByZXR1cm4gbWFya2Rvd24ucmVwbGFjZSgvPFxcL2xpPi9tZyxcIlxcblwiKVxuICAgIC5yZXBsYWNlKC88XFwvP1tePl0rKD58JCkvZywgXCJcIilcbiAgICAucmVwbGFjZSgvXiguKykkL21nLFwiIC0gJDFcIik7XG4gIH0sXG5cbiAgdG9IVE1MOiBmdW5jdGlvbihodG1sKSB7XG4gICAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXiAtICguKykkL21nLFwiPGxpPiQxPC9saT5cIilcbiAgICAucmVwbGFjZSgvXFxuL21nLCBcIlwiKTtcblxuICAgIHJldHVybiBodG1sO1xuICB9LFxuXG4gIG9uQ29udGVudFBhc3RlZDogZnVuY3Rpb24oZXZlbnQsIHRhcmdldCkge1xuICAgIHRoaXMuJCgndWwnKS5odG1sKFxuICAgICAgdGhpcy5wYXN0ZWRNYXJrZG93blRvSFRNTCh0YXJnZXRbMF0uaW5uZXJIVE1MKSk7XG4gICAgdGhpcy5nZXRUZXh0QmxvY2soKS5jYXJldFRvRW5kKCk7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8uaXNFbXB0eSh0aGlzLnNhdmVBbmRHZXREYXRhKCkudGV4dCk7XG4gIH1cblxufSk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuLi9sb2Rhc2gnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4uL3V0aWxzJyk7XG5cbnZhciBCbG9jayA9IHJlcXVpcmUoJy4uL2Jsb2NrJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2suZXh0ZW5kKHtcblxuICAvLyBtb3JlIHByb3ZpZGVycyBhdCBodHRwczovL2dpc3QuZ2l0aHViLmNvbS9qZWZmbGluZy9hOTYyOWFlMjhlMDc2Nzg1YTE0ZlxuICBwcm92aWRlcnM6IHtcbiAgICB2aW1lbzoge1xuICAgICAgcmVnZXg6IC8oPzpodHRwW3NdPzpcXC9cXC8pPyg/Ond3dy4pP3ZpbWVvLmNvbVxcLyguKykvLFxuICAgICAgaHRtbDogXCI8aWZyYW1lIHNyYz1cXFwie3twcm90b2NvbH19Ly9wbGF5ZXIudmltZW8uY29tL3ZpZGVvL3t7cmVtb3RlX2lkfX0/dGl0bGU9MCZieWxpbmU9MFxcXCIgd2lkdGg9XFxcIjU4MFxcXCIgaGVpZ2h0PVxcXCIzMjBcXFwiIGZyYW1lYm9yZGVyPVxcXCIwXFxcIj48L2lmcmFtZT5cIlxuICAgIH0sXG4gICAgeW91dHViZToge1xuICAgICAgcmVnZXg6IC8oPzpodHRwW3NdPzpcXC9cXC8pPyg/Ond3dy4pPyg/Oig/OnlvdXR1YmUuY29tXFwvd2F0Y2hcXD8oPzouKikoPzp2PSkpfCg/OnlvdXR1LmJlXFwvKSkoW14mXS4rKS8sXG4gICAgICBodG1sOiBcIjxpZnJhbWUgc3JjPVxcXCJ7e3Byb3RvY29sfX0vL3d3dy55b3V0dWJlLmNvbS9lbWJlZC97e3JlbW90ZV9pZH19XFxcIiB3aWR0aD1cXFwiNTgwXFxcIiBoZWlnaHQ9XFxcIjMyMFxcXCIgZnJhbWVib3JkZXI9XFxcIjBcXFwiIGFsbG93ZnVsbHNjcmVlbj48L2lmcmFtZT5cIlxuICAgIH1cbiAgfSxcblxuICB0eXBlOiAndmlkZW8nLFxuICB0aXRsZTogZnVuY3Rpb24oKSB7IHJldHVybiBpMThuLnQoJ2Jsb2Nrczp2aWRlbzp0aXRsZScpOyB9LFxuXG4gIGRyb3BwYWJsZTogdHJ1ZSxcbiAgcGFzdGFibGU6IHRydWUsXG5cbiAgaWNvbl9uYW1lOiAndmlkZW8nLFxuXG4gIGxvYWREYXRhOiBmdW5jdGlvbihkYXRhKXtcbiAgICBpZiAoIXRoaXMucHJvdmlkZXJzLmhhc093blByb3BlcnR5KGRhdGEuc291cmNlKSkgeyByZXR1cm47IH1cblxuICAgIGlmICh0aGlzLnByb3ZpZGVyc1tkYXRhLnNvdXJjZV0uc3F1YXJlKSB7XG4gICAgICB0aGlzLiRlZGl0b3IuYWRkQ2xhc3MoJ3N0LWJsb2NrX19lZGl0b3ItLXdpdGgtc3F1YXJlLW1lZGlhJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuJGVkaXRvci5hZGRDbGFzcygnc3QtYmxvY2tfX2VkaXRvci0td2l0aC1zaXh0ZWVuLWJ5LW5pbmUtbWVkaWEnKTtcbiAgICB9XG5cbiAgICB2YXIgZW1iZWRfc3RyaW5nID0gdGhpcy5wcm92aWRlcnNbZGF0YS5zb3VyY2VdLmh0bWxcbiAgICAucmVwbGFjZSgne3twcm90b2NvbH19Jywgd2luZG93LmxvY2F0aW9uLnByb3RvY29sKVxuICAgIC5yZXBsYWNlKCd7e3JlbW90ZV9pZH19JywgZGF0YS5yZW1vdGVfaWQpXG4gICAgLnJlcGxhY2UoJ3t7d2lkdGh9fScsIHRoaXMuJGVkaXRvci53aWR0aCgpKTsgLy8gZm9yIHZpZGVvcyB0aGF0IGNhbid0IHJlc2l6ZSBhdXRvbWF0aWNhbGx5IGxpa2UgdmluZVxuXG4gICAgdGhpcy4kZWRpdG9yLmh0bWwoZW1iZWRfc3RyaW5nKTtcbiAgfSxcblxuICBvbkNvbnRlbnRQYXN0ZWQ6IGZ1bmN0aW9uKGV2ZW50KXtcbiAgICB0aGlzLmhhbmRsZURyb3BQYXN0ZSgkKGV2ZW50LnRhcmdldCkudmFsKCkpO1xuICB9LFxuXG4gIGhhbmRsZURyb3BQYXN0ZTogZnVuY3Rpb24odXJsKXtcbiAgICBpZighdXRpbHMuaXNVUkkodXJsKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBtYXRjaCwgZGF0YTtcblxuICAgIHRoaXMucHJvdmlkZXJzLmZvckVhY2goZnVuY3Rpb24ocHJvdmlkZXIsIGluZGV4KSB7XG4gICAgICBtYXRjaCA9IHByb3ZpZGVyLnJlZ2V4LmV4ZWModXJsKTtcblxuICAgICAgaWYobWF0Y2ggIT09IG51bGwgJiYgIV8uaXNVbmRlZmluZWQobWF0Y2hbMV0pKSB7XG4gICAgICAgIGRhdGEgPSB7XG4gICAgICAgICAgc291cmNlOiBpbmRleCxcbiAgICAgICAgICByZW1vdGVfaWQ6IG1hdGNoWzFdXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5zZXRBbmRMb2FkRGF0YShkYXRhKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzKTtcbiAgfSxcblxuICBvbkRyb3A6IGZ1bmN0aW9uKHRyYW5zZmVyRGF0YSl7XG4gICAgdmFyIHVybCA9IHRyYW5zZmVyRGF0YS5nZXREYXRhKCd0ZXh0L3BsYWluJyk7XG4gICAgdGhpcy5oYW5kbGVEcm9wUGFzdGUodXJsKTtcbiAgfVxufSk7XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuIFd5c2lodG1sIEVkaXRvciBCbG9ja1xuIE1ha2Ugc3VyZSB5b3UgaW5pdGlhbGl6ZShsb2FkZWQpIGZvbGxvd2luZyBkZXBlbmRlbmNpZXMgaW4geW91ciBzeXN0ZW0gdG8gbWFrZSB0aGlzIGJsb2NrIHdvcms6XG4gYm9vdHN0cmFwLCBib290c3RyYXAzLXd5c2lodG1sNS1ib3dlciwgZm9udGF3ZXNvbWVcbiAqL1xuXG4vKlxuIFRleHQgQmxvY2tcbiAqL1xuXG52YXIgQmxvY2sgPSByZXF1aXJlKCcuLi9ibG9jaycpO1xudmFyIHN0VG9IVE1MID0gcmVxdWlyZSgnLi4vdG8taHRtbCcpO1xudmFyIHRpbWVTdGFtcCA9IG51bGw7XG5cbm1vZHVsZS5leHBvcnRzID0gQmxvY2suZXh0ZW5kKHtcblxuICAgIHR5cGU6IFwid3lzaWh0bWxcIixcblxuICAgIHRpdGxlOiBmdW5jdGlvbigpIHsgcmV0dXJuICd3eXNpaHRtbCc7IH0sXG5cbiAgICBlZGl0b3JIVE1MOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGltZVN0YW1wID0gRGF0ZS5ub3coKTtcbiAgICAgICAgcmV0dXJuICc8ZGl2IGlkPVwid3lzaWh0bWwtZWRpdG9yLScgKyB0aW1lU3RhbXAgKyAnXCIgY2xhc3M9XCJzdC1yZXF1aXJlZCBzdC10ZXh0LWJsb2NrXCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiPjwvZGl2Pic7XG4gICAgfSxcblxuICAgIGljb25fbmFtZTogJ3RleHQnLFxuXG4gICAgb25CbG9ja1JlbmRlciA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgJCgnI3d5c2lodG1sLWVkaXRvci0nICsgdGltZVN0YW1wKS53eXNpaHRtbDUoKTtcbiAgICB9LFxuXG4gICAgbG9hZERhdGE6IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICB0aGlzLmdldFRleHRCbG9jaygpLmh0bWwoc3RUb0hUTUwoZGF0YS50ZXh0LCB0aGlzLnR5cGUpKTtcbiAgICB9XG59KTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZGVidWc6IGZhbHNlLFxuICBza2lwVmFsaWRhdGlvbjogZmFsc2UsXG4gIHZlcnNpb246IFwiMC4zLjBcIixcbiAgbGFuZ3VhZ2U6IFwiZW5cIixcblxuICBpbnN0YW5jZXM6IFtdLFxuXG4gIGRlZmF1bHRzOiB7XG4gICAgZGVmYXVsdFR5cGU6IGZhbHNlLFxuICAgIHNwaW5uZXI6IHtcbiAgICAgIGNsYXNzTmFtZTogJ3N0LXNwaW5uZXInLFxuICAgICAgbGluZXM6IDksXG4gICAgICBsZW5ndGg6IDgsXG4gICAgICB3aWR0aDogMyxcbiAgICAgIHJhZGl1czogNixcbiAgICAgIGNvbG9yOiAnIzAwMCcsXG4gICAgICBzcGVlZDogMS40LFxuICAgICAgdHJhaWw6IDU3LFxuICAgICAgc2hhZG93OiBmYWxzZSxcbiAgICAgIGxlZnQ6ICc1MCUnLFxuICAgICAgdG9wOiAnNTAlJ1xuICAgIH0sXG4gICAgYmxvY2tMaW1pdDogMCxcbiAgICBibG9ja1R5cGVMaW1pdHM6IHt9LFxuICAgIHJlcXVpcmVkOiBbXSxcbiAgICB1cGxvYWRVcmw6ICcvYXR0YWNobWVudHMnLFxuICAgIGJhc2VJbWFnZVVybDogJy9zaXItdHJldm9yLXVwbG9hZHMvJyxcbiAgICBlcnJvcnNDb250YWluZXI6IHVuZGVmaW5lZCxcbiAgICB0b01hcmtkb3duOiB7XG4gICAgICBhZ2dyZXNpdmVIVE1MU3RyaXA6IGZhbHNlXG4gICAgfVxuICB9XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gKiBTaXIgVHJldm9yIEVkaXRvclxuICogLS1cbiAqIFJlcHJlc2VudHMgb25lIFNpciBUcmV2b3IgZWRpdG9yIGluc3RhbmNlICh3aXRoIG11bHRpcGxlIGJsb2NrcylcbiAqIEVhY2ggYmxvY2sgcmVmZXJlbmNlcyB0aGlzIGluc3RhbmNlLlxuICogQmxvY2tUeXBlcyBhcmUgZ2xvYmFsIGhvd2V2ZXIuXG4gKi9cblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBFdmVudEJ1cyA9IHJlcXVpcmUoJy4vZXZlbnQtYnVzJyk7XG52YXIgRm9ybUV2ZW50cyA9IHJlcXVpcmUoJy4vZm9ybS1ldmVudHMnKTtcbnZhciBCbG9ja3MgPSByZXF1aXJlKCcuL2Jsb2NrcycpO1xudmFyIEJsb2NrQ29udHJvbHMgPSByZXF1aXJlKCcuL2Jsb2NrLWNvbnRyb2xzJyk7XG52YXIgRmxvYXRpbmdCbG9ja0NvbnRyb2xzID0gcmVxdWlyZSgnLi9mbG9hdGluZy1ibG9jay1jb250cm9scycpO1xudmFyIEZvcm1hdEJhciA9IHJlcXVpcmUoJy4vZm9ybWF0LWJhcicpO1xudmFyIGVkaXRvclN0b3JlID0gcmVxdWlyZSgnLi9leHRlbnNpb25zL3Npci10cmV2b3IuZWRpdG9yLXN0b3JlJyk7XG5cbnZhciBFZGl0b3IgPSBmdW5jdGlvbihvcHRpb25zKSB7XG4gIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zKTtcbn07XG5cbk9iamVjdC5hc3NpZ24oRWRpdG9yLnByb3RvdHlwZSwgcmVxdWlyZSgnLi9mdW5jdGlvbi1iaW5kJyksIHJlcXVpcmUoJy4vZXZlbnRzJyksIHtcblxuICBib3VuZDogWydvbkZvcm1TdWJtaXQnLCAnc2hvd0Jsb2NrQ29udHJvbHMnLCAnaGlkZUFsbFRoZVRoaW5ncycsXG4gICAgJ2hpZGVCbG9ja0NvbnRyb2xzJywgJ29uTmV3QmxvY2tDcmVhdGVkJywgJ2NoYW5nZUJsb2NrUG9zaXRpb24nLFxuICAgICdvbkJsb2NrRHJhZ1N0YXJ0JywgJ29uQmxvY2tEcmFnRW5kJywgJ3JlbW92ZUJsb2NrRHJhZ092ZXInLFxuICAgICdvbkJsb2NrRHJvcHBlZCcsICdjcmVhdGVCbG9jayddLCBcblxuICBldmVudHM6IHtcbiAgICAnYmxvY2s6cmVvcmRlcjpkb3duJzogICAgICAgJ2hpZGVCbG9ja0NvbnRyb2xzJyxcbiAgICAnYmxvY2s6cmVvcmRlcjpkcmFnc3RhcnQnOiAgJ29uQmxvY2tEcmFnU3RhcnQnLFxuICAgICdibG9jazpyZW9yZGVyOmRyYWdlbmQnOiAgICAnb25CbG9ja0RyYWdFbmQnLFxuICAgICdibG9jazpjb250ZW50OmRyb3BwZWQnOiAgICAncmVtb3ZlQmxvY2tEcmFnT3ZlcicsXG4gICAgJ2Jsb2NrOnJlb3JkZXI6ZHJvcHBlZCc6ICAgICdvbkJsb2NrRHJvcHBlZCcsXG4gICAgJ2Jsb2NrOmNyZWF0ZTpuZXcnOiAgICAgICAgICdvbk5ld0Jsb2NrQ3JlYXRlZCdcbiAgfSxcblxuICBpbml0aWFsaXplOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdXRpbHMubG9nKFwiSW5pdCBTaXJUcmV2b3IuRWRpdG9yXCIpO1xuXG4gICAgdGhpcy5ibG9ja1R5cGVzID0ge307XG4gICAgdGhpcy5ibG9ja0NvdW50cyA9IHt9OyAvLyBDYWNoZWQgYmxvY2sgdHlwZSBjb3VudHNcbiAgICB0aGlzLmJsb2NrcyA9IFtdOyAvLyBCbG9jayByZWZlcmVuY2VzXG4gICAgdGhpcy5lcnJvcnMgPSBbXTtcbiAgICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBjb25maWcuZGVmYXVsdHMsIG9wdGlvbnMgfHwge30pO1xuICAgIHRoaXMuSUQgPSBfLnVuaXF1ZUlkKCdzdC1lZGl0b3ItJyk7XG5cbiAgICBpZiAoIXRoaXMuX2Vuc3VyZUFuZFNldEVsZW1lbnRzKCkpIHsgcmV0dXJuIGZhbHNlOyB9XG5cbiAgICBpZighXy5pc1VuZGVmaW5lZCh0aGlzLm9wdGlvbnMub25FZGl0b3JSZW5kZXIpICYmIF8uaXNGdW5jdGlvbih0aGlzLm9wdGlvbnMub25FZGl0b3JSZW5kZXIpKSB7XG4gICAgICB0aGlzLm9uRWRpdG9yUmVuZGVyID0gdGhpcy5vcHRpb25zLm9uRWRpdG9yUmVuZGVyO1xuICAgIH1cblxuICAgIHRoaXMuX3NldFJlcXVpcmVkKCk7XG4gICAgdGhpcy5fc2V0QmxvY2tzVHlwZXMoKTtcbiAgICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG5cbiAgICB0aGlzLnN0b3JlKFwiY3JlYXRlXCIpO1xuXG4gICAgY29uZmlnLmluc3RhbmNlcy5wdXNoKHRoaXMpO1xuXG4gICAgdGhpcy5idWlsZCgpO1xuXG4gICAgRm9ybUV2ZW50cy5iaW5kRm9ybVN1Ym1pdCh0aGlzLiRmb3JtKTtcbiAgfSxcblxuICAvKiBCdWlsZCB0aGUgRWRpdG9yIGluc3RhbmNlLlxuICAgKiBDaGVjayB0byBzZWUgaWYgd2UndmUgYmVlbiBwYXNzZWQgSlNPTiBhbHJlYWR5LCBhbmQgaWYgbm90IHRyeSBhbmQgY3JlYXRlXG4gICAqIGEgZGVmYXVsdCBibG9jay4gSWYgd2UgaGF2ZSBKU09OIHRoZW4gd2UgbmVlZCB0byBidWlsZCBhbGwgb2Ygb3VyIGJsb2Nrc1xuICAgKiBmcm9tIHRoaXMuXG4gICAqL1xuICBidWlsZDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwuaGlkZSgpO1xuXG4gICAgdGhpcy5ibG9ja19jb250cm9scyA9IG5ldyBCbG9ja0NvbnRyb2xzKHRoaXMuYmxvY2tUeXBlcywgdGhpcy5JRCk7XG4gICAgdGhpcy5mbF9ibG9ja19jb250cm9scyA9IG5ldyBGbG9hdGluZ0Jsb2NrQ29udHJvbHModGhpcy4kd3JhcHBlciwgdGhpcy5JRCk7XG4gICAgdGhpcy5mb3JtYXRCYXIgPSBuZXcgRm9ybWF0QmFyKHRoaXMub3B0aW9ucy5mb3JtYXRCYXIpO1xuXG4gICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmJsb2NrX2NvbnRyb2xzLCAnY3JlYXRlQmxvY2snLCB0aGlzLmNyZWF0ZUJsb2NrKTtcbiAgICB0aGlzLmxpc3RlblRvKHRoaXMuZmxfYmxvY2tfY29udHJvbHMsICdzaG93QmxvY2tDb250cm9scycsIHRoaXMuc2hvd0Jsb2NrQ29udHJvbHMpO1xuXG4gICAgdGhpcy5fc2V0RXZlbnRzKCk7XG5cbiAgICBFdmVudEJ1cy5vbih0aGlzLklEICsgXCI6YmxvY2tzOmNoYW5nZV9wb3NpdGlvblwiLCB0aGlzLmNoYW5nZUJsb2NrUG9zaXRpb24pO1xuICAgIEV2ZW50QnVzLm9uKFwiZm9ybWF0dGVyOnBvc2l0aW9uXCIsIHRoaXMuZm9ybWF0QmFyLnJlbmRlckJ5U2VsZWN0aW9uKTtcbiAgICBFdmVudEJ1cy5vbihcImZvcm1hdHRlcjpoaWRlXCIsIHRoaXMuZm9ybWF0QmFyLmhpZGUpO1xuXG4gICAgdGhpcy4kd3JhcHBlci5wcmVwZW5kKHRoaXMuZmxfYmxvY2tfY29udHJvbHMucmVuZGVyKCkuJGVsKTtcbiAgICAkKGRvY3VtZW50LmJvZHkpLmFwcGVuZCh0aGlzLmZvcm1hdEJhci5yZW5kZXIoKS4kZWwpO1xuICAgIHRoaXMuJG91dGVyLmFwcGVuZCh0aGlzLmJsb2NrX2NvbnRyb2xzLnJlbmRlcigpLiRlbCk7XG5cbiAgICAkKHdpbmRvdykuYmluZCgnY2xpY2suc2lydHJldm9yJywgdGhpcy5oaWRlQWxsVGhlVGhpbmdzKTtcblxuICAgIHZhciBzdG9yZSA9IHRoaXMuc3RvcmUoXCJyZWFkXCIpO1xuXG4gICAgaWYgKHN0b3JlLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgc3RvcmUuZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGJsb2NrKXtcbiAgICAgICAgdXRpbHMubG9nKCdDcmVhdGluZzogJyArIGJsb2NrLnR5cGUpO1xuICAgICAgICB0aGlzLmNyZWF0ZUJsb2NrKGJsb2NrLnR5cGUsIGJsb2NrLmRhdGEpO1xuICAgICAgfSwgdGhpcyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLm9wdGlvbnMuZGVmYXVsdFR5cGUgIT09IGZhbHNlKSB7XG4gICAgICB0aGlzLmNyZWF0ZUJsb2NrKHRoaXMub3B0aW9ucy5kZWZhdWx0VHlwZSwge30pO1xuICAgIH1cblxuICAgIHRoaXMuJHdyYXBwZXIuYWRkQ2xhc3MoJ3N0LXJlYWR5Jyk7XG5cbiAgICBpZighXy5pc1VuZGVmaW5lZCh0aGlzLm9uRWRpdG9yUmVuZGVyKSkge1xuICAgICAgdGhpcy5vbkVkaXRvclJlbmRlcigpO1xuICAgIH1cbiAgfSxcblxuICBkZXN0cm95OiBmdW5jdGlvbigpIHtcbiAgICAvLyBEZXN0cm95IHRoZSByZW5kZXJlZCBzdWIgdmlld3NcbiAgICB0aGlzLmZvcm1hdEJhci5kZXN0cm95KCk7XG4gICAgdGhpcy5mbF9ibG9ja19jb250cm9scy5kZXN0cm95KCk7XG4gICAgdGhpcy5ibG9ja19jb250cm9scy5kZXN0cm95KCk7XG5cbiAgICAvLyBEZXN0cm95IGFsbCBibG9ja3NcbiAgICB0aGlzLmJsb2Nrcy5mb3JFYWNoKGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgICB0aGlzLnJlbW92ZUJsb2NrKGJsb2NrLmJsb2NrSUQpO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gU3RvcCBsaXN0ZW5pbmcgdG8gZXZlbnRzXG4gICAgdGhpcy5zdG9wTGlzdGVuaW5nKCk7XG5cbiAgICAvLyBDbGVhbnVwIGVsZW1lbnRcbiAgICB2YXIgZWwgPSB0aGlzLiRlbC5kZXRhY2goKTtcblxuICAgIC8vIFJlbW92ZSBpbnN0YW5jZVxuICAgIGNvbmZpZy5pbnN0YW5jZXMgPSBjb25maWcuaW5zdGFuY2VzLmZpbHRlcihmdW5jdGlvbihpbnN0YW5jZSkge1xuICAgICAgcmV0dXJuIGluc3RhbmNlLklEICE9PSB0aGlzLklEO1xuICAgIH0sIHRoaXMpO1xuXG4gICAgLy8gQ2xlYXIgdGhlIHN0b3JlXG4gICAgdGhpcy5zdG9yZShcInJlc2V0XCIpO1xuXG4gICAgdGhpcy4kb3V0ZXIucmVwbGFjZVdpdGgoZWwpO1xuICB9LFxuXG4gIHJlaW5pdGlhbGl6ZTogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuZGVzdHJveSgpO1xuICAgIHRoaXMuaW5pdGlhbGl6ZShvcHRpb25zIHx8IHRoaXMub3B0aW9ucyk7XG4gIH0sXG5cbiAgX3NldEV2ZW50czogZnVuY3Rpb24oKSB7XG4gICAgT2JqZWN0LmtleXModGhpcy5ldmVudHMpLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuICAgICAgRXZlbnRCdXMub24odHlwZSwgdGhpc1t0aGlzLmV2ZW50c1t0eXBlXV0sIHRoaXMpO1xuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIGhpZGVBbGxUaGVUaGluZ3M6IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLmJsb2NrX2NvbnRyb2xzLmhpZGUoKTtcbiAgICB0aGlzLmZvcm1hdEJhci5oaWRlKCk7XG5cbiAgICBpZiAoIV8uaXNVbmRlZmluZWQodGhpcy5ibG9ja19jb250cm9scy5jdXJyZW50X2NvbnRhaW5lcikpIHtcbiAgICAgIHRoaXMuYmxvY2tfY29udHJvbHMuY3VycmVudF9jb250YWluZXIucmVtb3ZlQ2xhc3MoXCJ3aXRoLXN0LWNvbnRyb2xzXCIpO1xuICAgIH1cbiAgfSxcblxuICBzaG93QmxvY2tDb250cm9sczogZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKHRoaXMuYmxvY2tfY29udHJvbHMuY3VycmVudF9jb250YWluZXIpKSB7XG4gICAgICB0aGlzLmJsb2NrX2NvbnRyb2xzLmN1cnJlbnRfY29udGFpbmVyLnJlbW92ZUNsYXNzKFwid2l0aC1zdC1jb250cm9sc1wiKTtcbiAgICB9XG5cbiAgICB0aGlzLmJsb2NrX2NvbnRyb2xzLnNob3coKTtcblxuICAgIGNvbnRhaW5lci5hcHBlbmQodGhpcy5ibG9ja19jb250cm9scy4kZWwuZGV0YWNoKCkpO1xuICAgIGNvbnRhaW5lci5hZGRDbGFzcygnd2l0aC1zdC1jb250cm9scycpO1xuXG4gICAgdGhpcy5ibG9ja19jb250cm9scy5jdXJyZW50X2NvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgfSxcblxuICBzdG9yZTogZnVuY3Rpb24obWV0aG9kLCBvcHRpb25zKXtcbiAgICByZXR1cm4gZWRpdG9yU3RvcmUodGhpcywgbWV0aG9kLCBvcHRpb25zIHx8IHt9KTtcbiAgfSxcblxuICAvKiBDcmVhdGUgYW4gaW5zdGFuY2Ugb2YgYSBibG9jayBmcm9tIGFuIGF2YWlsYWJsZSB0eXBlLiAgV2UgaGF2ZSB0byBjaGVja1xuICAgKiB0aGUgbnVtYmVyIG9mIGJsb2NrcyB3ZSdyZSBhbGxvd2VkIHRvIGNyZWF0ZSBiZWZvcmUgYWRkaW5nIG9uZSBhbmQgaGFuZGxlXG4gICAqIGZhaWxzIGFjY29yZGluZ2x5LiAgQSBibG9jayB3aWxsIGhhdmUgYSByZWZlcmVuY2UgdG8gYW4gRWRpdG9yIGluc3RhbmNlICZcbiAgICogdGhlIHBhcmVudCBCbG9ja1R5cGUuICBXZSBhbHNvIGhhdmUgdG8gcmVtZW1iZXIgdG8gc3RvcmUgc3RhdGljIGNvdW50cyBmb3JcbiAgICogaG93IG1hbnkgYmxvY2tzIHdlIGhhdmUsIGFuZCBrZWVwIGEgbmljZSBhcnJheSBvZiBhbGwgdGhlIGJsb2Nrc1xuICAgKiBhdmFpbGFibGUuXG4gICAqL1xuICBjcmVhdGVCbG9jazogZnVuY3Rpb24odHlwZSwgZGF0YSwgcmVuZGVyX2F0KSB7XG4gICAgdHlwZSA9IHV0aWxzLmNsYXNzaWZ5KHR5cGUpO1xuXG4gICAgaWYodGhpcy5fYmxvY2tMaW1pdFJlYWNoZWQoKSkge1xuICAgICAgdXRpbHMubG9nKFwiQ2Fubm90IGFkZCBhbnkgbW9yZSBibG9ja3MuIExpbWl0IHJlYWNoZWQuXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghdGhpcy5faXNCbG9ja1R5cGVBdmFpbGFibGUodHlwZSkpIHtcbiAgICAgIHV0aWxzLmxvZyhcIkJsb2NrIHR5cGUgbm90IGF2YWlsYWJsZSBcIiArIHR5cGUpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIENhbiB3ZSBoYXZlIGFub3RoZXIgb25lIG9mIHRoZXNlIGJsb2Nrcz9cbiAgICBpZiAoIXRoaXMuX2NhbkFkZEJsb2NrVHlwZSh0eXBlKSkge1xuICAgICAgdXRpbHMubG9nKFwiQmxvY2sgTGltaXQgcmVhY2hlZCBmb3IgdHlwZSBcIiArIHR5cGUpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBibG9jayA9IG5ldyBCbG9ja3NbdHlwZV0oZGF0YSwgdGhpcy5JRCk7XG5cbiAgICB0aGlzLl9yZW5kZXJJblBvc2l0aW9uKGJsb2NrLnJlbmRlcigpLiRlbCk7XG5cbiAgICB0aGlzLmxpc3RlblRvKGJsb2NrLCAncmVtb3ZlQmxvY2snLCB0aGlzLnJlbW92ZUJsb2NrKTtcblxuICAgIHRoaXMuYmxvY2tzLnB1c2goYmxvY2spO1xuICAgIHRoaXMuX2luY3JlbWVudEJsb2NrVHlwZUNvdW50KHR5cGUpO1xuXG4gICAgaWYoIWRhdGEpIHtcbiAgICAgIGJsb2NrLmZvY3VzKCk7XG4gICAgfVxuXG4gICAgRXZlbnRCdXMudHJpZ2dlcihkYXRhID8gXCJibG9jazpjcmVhdGU6ZXhpc3RpbmdcIiA6IFwiYmxvY2s6Y3JlYXRlOm5ld1wiLCBibG9jayk7XG4gICAgdXRpbHMubG9nKFwiQmxvY2sgY3JlYXRlZCBvZiB0eXBlIFwiICsgdHlwZSk7XG4gICAgYmxvY2sudHJpZ2dlcihcIm9uUmVuZGVyXCIpO1xuXG4gICAgdGhpcy4kd3JhcHBlci50b2dnbGVDbGFzcygnc3QtLWJsb2NrLWxpbWl0LXJlYWNoZWQnLCB0aGlzLl9ibG9ja0xpbWl0UmVhY2hlZCgpKTtcbiAgICB0aGlzLnRyaWdnZXJCbG9ja0NvdW50VXBkYXRlKCk7XG4gIH0sXG5cbiAgb25OZXdCbG9ja0NyZWF0ZWQ6IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgaWYgKGJsb2NrLmluc3RhbmNlSUQgPT09IHRoaXMuSUQpIHtcbiAgICAgIHRoaXMuaGlkZUJsb2NrQ29udHJvbHMoKTtcbiAgICAgIHRoaXMuc2Nyb2xsVG8oYmxvY2suJGVsKTtcbiAgICB9XG4gIH0sXG5cbiAgc2Nyb2xsVG86IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7IHNjcm9sbFRvcDogZWxlbWVudC5wb3NpdGlvbigpLnRvcCB9LCAzMDAsIFwibGluZWFyXCIpO1xuICB9LFxuXG4gIGJsb2NrRm9jdXM6IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdGhpcy5ibG9ja19jb250cm9scy5jdXJyZW50X2NvbnRhaW5lciA9IG51bGw7XG4gIH0sXG5cbiAgaGlkZUJsb2NrQ29udHJvbHM6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghXy5pc1VuZGVmaW5lZCh0aGlzLmJsb2NrX2NvbnRyb2xzLmN1cnJlbnRfY29udGFpbmVyKSkge1xuICAgICAgdGhpcy5ibG9ja19jb250cm9scy5jdXJyZW50X2NvbnRhaW5lci5yZW1vdmVDbGFzcyhcIndpdGgtc3QtY29udHJvbHNcIik7XG4gICAgfVxuXG4gICAgdGhpcy5ibG9ja19jb250cm9scy5oaWRlKCk7XG4gIH0sXG5cbiAgcmVtb3ZlQmxvY2tEcmFnT3ZlcjogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kb3V0ZXIuZmluZCgnLnN0LWRyYWctb3ZlcicpLnJlbW92ZUNsYXNzKCdzdC1kcmFnLW92ZXInKTtcbiAgfSxcblxuICB0cmlnZ2VyQmxvY2tDb3VudFVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgRXZlbnRCdXMudHJpZ2dlcih0aGlzLklEICsgXCI6YmxvY2tzOmNvdW50X3VwZGF0ZVwiLCB0aGlzLmJsb2Nrcy5sZW5ndGgpO1xuICB9LFxuXG4gIGNoYW5nZUJsb2NrUG9zaXRpb246IGZ1bmN0aW9uKCRibG9jaywgc2VsZWN0ZWRQb3NpdGlvbikge1xuICAgIHNlbGVjdGVkUG9zaXRpb24gPSBzZWxlY3RlZFBvc2l0aW9uIC0gMTtcblxuICAgIHZhciBibG9ja1Bvc2l0aW9uID0gdGhpcy5nZXRCbG9ja1Bvc2l0aW9uKCRibG9jayk7XG4gICAgdmFyICRibG9ja0J5ID0gdGhpcy4kd3JhcHBlci5maW5kKCcuc3QtYmxvY2snKS5lcShzZWxlY3RlZFBvc2l0aW9uKTtcblxuICAgIHZhciB3aGVyZSA9IChibG9ja1Bvc2l0aW9uID4gc2VsZWN0ZWRQb3NpdGlvbikgPyBcIkJlZm9yZVwiIDogXCJBZnRlclwiO1xuXG4gICAgaWYoJGJsb2NrQnkgJiYgJGJsb2NrQnkuYXR0cignaWQnKSAhPT0gJGJsb2NrLmF0dHIoJ2lkJykpIHtcbiAgICAgIHRoaXMuaGlkZUFsbFRoZVRoaW5ncygpO1xuICAgICAgJGJsb2NrW1wiaW5zZXJ0XCIgKyB3aGVyZV0oJGJsb2NrQnkpO1xuICAgICAgdGhpcy5zY3JvbGxUbygkYmxvY2spO1xuICAgIH1cbiAgfSxcblxuICBvbkJsb2NrRHJvcHBlZDogZnVuY3Rpb24oYmxvY2tfaWQpIHtcbiAgICB0aGlzLmhpZGVBbGxUaGVUaGluZ3MoKTtcbiAgICB2YXIgYmxvY2sgPSB0aGlzLmZpbmRCbG9ja0J5SWQoYmxvY2tfaWQpO1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChibG9jaykgJiZcbiAgICAgICAgIV8uaXNFbXB0eShibG9jay5nZXREYXRhKCkpICYmXG4gICAgICAgICAgYmxvY2suZHJvcF9vcHRpb25zLnJlX3JlbmRlcl9vbl9yZW9yZGVyKSB7XG4gICAgICBibG9jay5iZWZvcmVMb2FkaW5nRGF0YSgpO1xuICAgIH1cbiAgfSxcblxuICBvbkJsb2NrRHJhZ1N0YXJ0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmhpZGVCbG9ja0NvbnRyb2xzKCk7XG4gICAgdGhpcy4kd3JhcHBlci5hZGRDbGFzcyhcInN0LW91dGVyLS1pcy1yZW9yZGVyaW5nXCIpO1xuICB9LFxuXG4gIG9uQmxvY2tEcmFnRW5kOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnJlbW92ZUJsb2NrRHJhZ092ZXIoKTtcbiAgICB0aGlzLiR3cmFwcGVyLnJlbW92ZUNsYXNzKFwic3Qtb3V0ZXItLWlzLXJlb3JkZXJpbmdcIik7XG4gIH0sXG5cbiAgX3JlbmRlckluUG9zaXRpb246IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgaWYgKHRoaXMuYmxvY2tfY29udHJvbHMuY3VycmVudF9jb250YWluZXIpIHtcbiAgICAgIHRoaXMuYmxvY2tfY29udHJvbHMuY3VycmVudF9jb250YWluZXIuYWZ0ZXIoYmxvY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiR3cmFwcGVyLmFwcGVuZChibG9jayk7XG4gICAgfVxuICB9LFxuXG4gIF9pbmNyZW1lbnRCbG9ja1R5cGVDb3VudDogZnVuY3Rpb24odHlwZSkge1xuICAgIHRoaXMuYmxvY2tDb3VudHNbdHlwZV0gPSAoXy5pc1VuZGVmaW5lZCh0aGlzLmJsb2NrQ291bnRzW3R5cGVdKSkgPyAxOiB0aGlzLmJsb2NrQ291bnRzW3R5cGVdICsgMTtcbiAgfSxcblxuICBfZ2V0QmxvY2tUeXBlQ291bnQ6IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICByZXR1cm4gKF8uaXNVbmRlZmluZWQodGhpcy5ibG9ja0NvdW50c1t0eXBlXSkpID8gMCA6IHRoaXMuYmxvY2tDb3VudHNbdHlwZV07XG4gIH0sXG5cbiAgX2NhbkFkZEJsb2NrVHlwZTogZnVuY3Rpb24odHlwZSkge1xuICAgIHZhciBibG9ja190eXBlX2xpbWl0ID0gdGhpcy5fZ2V0QmxvY2tUeXBlTGltaXQodHlwZSk7XG5cbiAgICByZXR1cm4gIShibG9ja190eXBlX2xpbWl0ICE9PSAwICYmIHRoaXMuX2dldEJsb2NrVHlwZUNvdW50KHR5cGUpID49IGJsb2NrX3R5cGVfbGltaXQpO1xuICB9LFxuXG4gIF9ibG9ja0xpbWl0UmVhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuICh0aGlzLm9wdGlvbnMuYmxvY2tMaW1pdCAhPT0gMCAmJiB0aGlzLmJsb2Nrcy5sZW5ndGggPj0gdGhpcy5vcHRpb25zLmJsb2NrTGltaXQpO1xuICB9LFxuXG4gIHJlbW92ZUJsb2NrOiBmdW5jdGlvbihibG9ja19pZCkge1xuICAgIHZhciBibG9jayA9IHRoaXMuZmluZEJsb2NrQnlJZChibG9ja19pZCksXG4gICAgdHlwZSA9IHV0aWxzLmNsYXNzaWZ5KGJsb2NrLnR5cGUpLFxuICAgIGNvbnRyb2xzID0gYmxvY2suJGVsLmZpbmQoJy5zdC1ibG9jay1jb250cm9scycpO1xuXG4gICAgaWYgKGNvbnRyb2xzLmxlbmd0aCkge1xuICAgICAgdGhpcy5ibG9ja19jb250cm9scy5oaWRlKCk7XG4gICAgICB0aGlzLiR3cmFwcGVyLnByZXBlbmQoY29udHJvbHMpO1xuICAgIH1cblxuICAgIHRoaXMuYmxvY2tDb3VudHNbdHlwZV0gPSB0aGlzLmJsb2NrQ291bnRzW3R5cGVdIC0gMTtcbiAgICB0aGlzLmJsb2NrcyA9IHRoaXMuYmxvY2tzLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS5ibG9ja0lEICE9PSBibG9jay5ibG9ja0lEO1xuICAgIH0pO1xuICAgIHRoaXMuc3RvcExpc3RlbmluZyhibG9jayk7XG5cbiAgICBibG9jay5yZW1vdmUoKTtcblxuICAgIEV2ZW50QnVzLnRyaWdnZXIoXCJibG9jazpyZW1vdmVcIiwgYmxvY2spO1xuICAgIHRoaXMudHJpZ2dlckJsb2NrQ291bnRVcGRhdGUoKTtcblxuICAgIHRoaXMuJHdyYXBwZXIudG9nZ2xlQ2xhc3MoJ3N0LS1ibG9jay1saW1pdC1yZWFjaGVkJywgdGhpcy5fYmxvY2tMaW1pdFJlYWNoZWQoKSk7XG4gIH0sXG5cbiAgcGVyZm9ybVZhbGlkYXRpb25zIDogZnVuY3Rpb24oYmxvY2ssIHNob3VsZF92YWxpZGF0ZSkge1xuICAgIHZhciBlcnJvcnMgPSAwO1xuXG4gICAgaWYgKCFjb25maWcuc2tpcFZhbGlkYXRpb24gJiYgc2hvdWxkX3ZhbGlkYXRlKSB7XG4gICAgICBpZighYmxvY2sudmFsaWQoKSl7XG4gICAgICAgIHRoaXMuZXJyb3JzLnB1c2goeyB0ZXh0OiBfLnJlc3VsdChibG9jaywgJ3ZhbGlkYXRpb25GYWlsTXNnJykgfSk7XG4gICAgICAgIHV0aWxzLmxvZyhcIkJsb2NrIFwiICsgYmxvY2suYmxvY2tJRCArIFwiIGZhaWxlZCB2YWxpZGF0aW9uXCIpO1xuICAgICAgICArK2Vycm9ycztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZXJyb3JzO1xuICB9LFxuXG4gIHNhdmVCbG9ja1N0YXRlVG9TdG9yZTogZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgc3RvcmUgPSBibG9jay5zYXZlQW5kUmV0dXJuRGF0YSgpO1xuICAgIGlmKHN0b3JlICYmICFfLmlzRW1wdHkoc3RvcmUuZGF0YSkpIHtcbiAgICAgIHV0aWxzLmxvZyhcIkFkZGluZyBkYXRhIGZvciBibG9jayBcIiArIGJsb2NrLmJsb2NrSUQgKyBcIiB0byBibG9jayBzdG9yZVwiKTtcbiAgICAgIHRoaXMuc3RvcmUoXCJhZGRcIiwgeyBkYXRhOiBzdG9yZSB9KTtcbiAgICB9XG4gIH0sXG5cbiAgLyogSGFuZGxlIGEgZm9ybSBzdWJtaXNzaW9uIG9mIHRoaXMgRWRpdG9yIGluc3RhbmNlLiBWYWxpZGF0ZSBhbGwgb2Ygb3VyXG4gICAqIGJsb2NrcywgYW5kIHNlcmlhbGlzZSBhbGwgZGF0YSBvbnRvIHRoZSBKU09OIG9iamVjdHNcbiAgICovXG4gIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oc2hvdWxkX3ZhbGlkYXRlKSB7XG4gICAgLy8gaWYgdW5kZWZpbmVkIG9yIG51bGwgb3IgYW55dGhpbmcgb3RoZXIgdGhhbiBmYWxzZSAtIHRyZWF0IGFzIHRydWVcbiAgICBzaG91bGRfdmFsaWRhdGUgPSAoc2hvdWxkX3ZhbGlkYXRlID09PSBmYWxzZSkgPyBmYWxzZSA6IHRydWU7XG5cbiAgICB1dGlscy5sb2coXCJIYW5kbGluZyBmb3JtIHN1Ym1pc3Npb24gZm9yIEVkaXRvciBcIiArIHRoaXMuSUQpO1xuXG4gICAgdGhpcy5yZW1vdmVFcnJvcnMoKTtcbiAgICB0aGlzLnN0b3JlKFwicmVzZXRcIik7XG5cbiAgICB0aGlzLnZhbGlkYXRlQmxvY2tzKHNob3VsZF92YWxpZGF0ZSk7XG4gICAgdGhpcy52YWxpZGF0ZUJsb2NrVHlwZXNFeGlzdChzaG91bGRfdmFsaWRhdGUpO1xuXG4gICAgdGhpcy5yZW5kZXJFcnJvcnMoKTtcbiAgICB0aGlzLnN0b3JlKFwic2F2ZVwiKTtcblxuICAgIHJldHVybiB0aGlzLmVycm9ycy5sZW5ndGg7XG4gIH0sXG5cbiAgdmFsaWRhdGVCbG9ja3M6IGZ1bmN0aW9uKHNob3VsZF92YWxpZGF0ZSkge1xuICAgIGlmICghdGhpcy5yZXF1aXJlZCAmJiAoY29uZmlnLnNraXBWYWxpZGF0aW9uICYmICFzaG91bGRfdmFsaWRhdGUpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy4kd3JhcHBlci5maW5kKCcuc3QtYmxvY2snKS5lYWNoKGZ1bmN0aW9uKGluZGV4LCBibG9jaykge1xuICAgICAgdmFyIF9ibG9jayA9IHRoaXMuYmxvY2tzLmZpbmQoZnVuY3Rpb24oYikge1xuICAgICAgICByZXR1cm4gKGIuYmxvY2tJRCA9PT0gJChibG9jaykuYXR0cignaWQnKSk7XG4gICAgICB9KTtcblxuICAgICAgaWYgKF8uaXNVbmRlZmluZWQoX2Jsb2NrKSkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgICAgLy8gRmluZCBvdXIgYmxvY2tcbiAgICAgIHRoaXMucGVyZm9ybVZhbGlkYXRpb25zKF9ibG9jaywgc2hvdWxkX3ZhbGlkYXRlKTtcbiAgICAgIHRoaXMuc2F2ZUJsb2NrU3RhdGVUb1N0b3JlKF9ibG9jayk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfSxcblxuICB2YWxpZGF0ZUJsb2NrVHlwZXNFeGlzdDogZnVuY3Rpb24oc2hvdWxkX3ZhbGlkYXRlKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVpcmVkICYmIChjb25maWcuc2tpcFZhbGlkYXRpb24gJiYgIXNob3VsZF92YWxpZGF0ZSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB2YXIgYmxvY2tUeXBlSXRlcmF0b3IgPSBmdW5jdGlvbih0eXBlLCBpbmRleCkge1xuICAgICAgaWYgKCF0aGlzLl9pc0Jsb2NrVHlwZUF2YWlsYWJsZSh0eXBlKSkgeyByZXR1cm47IH1cblxuICAgICAgaWYgKHRoaXMuX2dldEJsb2NrVHlwZUNvdW50KHR5cGUpID09PSAwKSB7XG4gICAgICAgIHV0aWxzLmxvZyhcIkZhaWxlZCB2YWxpZGF0aW9uIG9uIHJlcXVpcmVkIGJsb2NrIHR5cGUgXCIgKyB0eXBlKTtcbiAgICAgICAgdGhpcy5lcnJvcnMucHVzaCh7IHRleHQ6IGkxOG4udChcImVycm9yczp0eXBlX21pc3NpbmdcIiwgeyB0eXBlOiB0eXBlIH0pIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJsb2NrcyA9IHRoaXMuZ2V0QmxvY2tzQnlUeXBlKHR5cGUpLmZpbHRlcihmdW5jdGlvbihiKSB7XG4gICAgICAgICAgcmV0dXJuICFiLmlzRW1wdHkoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGJsb2Nrcy5sZW5ndGggPiAwKSB7IHJldHVybiBmYWxzZTsgfVxuXG4gICAgICAgIHRoaXMuZXJyb3JzLnB1c2goeyB0ZXh0OiBpMThuLnQoXCJlcnJvcnM6cmVxdWlyZWRfdHlwZV9lbXB0eVwiLCB7IHR5cGU6IHR5cGUgfSkgfSk7XG4gICAgICAgIHV0aWxzLmxvZyhcIkEgcmVxdWlyZWQgYmxvY2sgdHlwZSBcIiArIHR5cGUgKyBcIiBpcyBlbXB0eVwiKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5yZXF1aXJlZCkpIHtcbiAgICAgIHRoaXMucmVxdWlyZWQuZm9yRWFjaChibG9ja1R5cGVJdGVyYXRvciwgdGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIHJlbmRlckVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZXJyb3JzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIGlmIChfLmlzVW5kZWZpbmVkKHRoaXMuJGVycm9ycykpIHtcbiAgICAgIHRoaXMuJGVycm9ycyA9IHRoaXMuX2Vycm9yc0NvbnRhaW5lcigpO1xuICAgIH1cblxuICAgIHZhciBzdHIgPSBcIjx1bD5cIjtcblxuICAgIHRoaXMuZXJyb3JzLmZvckVhY2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgIHN0ciArPSAnPGxpIGNsYXNzPVwic3QtZXJyb3JzX19tc2dcIj4nKyBlcnJvci50ZXh0ICsnPC9saT4nO1xuICAgIH0pO1xuXG4gICAgc3RyICs9IFwiPC91bD5cIjtcblxuICAgIHRoaXMuJGVycm9ycy5hcHBlbmQoc3RyKTtcbiAgICB0aGlzLiRlcnJvcnMuc2hvdygpO1xuICB9LFxuXG4gIF9lcnJvcnNDb250YWluZXI6IGZ1bmN0aW9uKCkge1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKHRoaXMub3B0aW9ucy5lcnJvcnNDb250YWluZXIpKSB7XG4gICAgICB2YXIgJGNvbnRhaW5lciA9ICQoXCI8ZGl2PlwiLCB7XG4gICAgICAgICdjbGFzcyc6ICdzdC1lcnJvcnMnLFxuICAgICAgICBodG1sOiBcIjxwPlwiICsgaTE4bi50KFwiZXJyb3JzOnRpdGxlXCIpICsgXCIgPC9wPlwiXG4gICAgICB9KTtcblxuICAgICAgdGhpcy4kb3V0ZXIucHJlcGVuZCgkY29udGFpbmVyKTtcbiAgICAgIHJldHVybiAkY29udGFpbmVyO1xuICAgIH1cblxuICAgIHJldHVybiAkKHRoaXMub3B0aW9ucy5lcnJvcnNDb250YWluZXIpO1xuICB9LFxuXG4gIHJlbW92ZUVycm9yczogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZXJyb3JzLmxlbmd0aCA9PT0gMCkgeyByZXR1cm4gZmFsc2U7IH1cblxuICAgIHRoaXMuJGVycm9ycy5oaWRlKCkuZmluZCgndWwnKS5odG1sKCcnKTtcblxuICAgIHRoaXMuZXJyb3JzID0gW107XG4gIH0sXG5cbiAgZmluZEJsb2NrQnlJZDogZnVuY3Rpb24oYmxvY2tfaWQpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9ja3MuZmluZChmdW5jdGlvbihiKSB7IHJldHVybiBiLmJsb2NrSUQgPT09IGJsb2NrX2lkOyB9KTtcbiAgfSxcblxuICBnZXRCbG9ja3NCeVR5cGU6IGZ1bmN0aW9uKGJsb2NrX3R5cGUpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9ja3MuZmlsdGVyKGZ1bmN0aW9uKGIpIHtcbiAgICAgIHJldHVybiB1dGlscy5jbGFzc2lmeShiLnR5cGUpID09PSBibG9ja190eXBlO1xuICAgIH0pO1xuICB9LFxuXG4gIGdldEJsb2Nrc0J5SURzOiBmdW5jdGlvbihibG9ja19pZHMpIHtcbiAgICByZXR1cm4gdGhpcy5ibG9ja3MuZmlsdGVyKGZ1bmN0aW9uKGIpIHtcbiAgICAgIHJldHVybiBibG9ja19pZHMuaW5jbHVkZXMoYi5ibG9ja0lEKTtcbiAgICB9KTtcbiAgfSxcblxuICBnZXRCbG9ja1Bvc2l0aW9uOiBmdW5jdGlvbigkYmxvY2spIHtcbiAgICByZXR1cm4gdGhpcy4kd3JhcHBlci5maW5kKCcuc3QtYmxvY2snKS5pbmRleCgkYmxvY2spO1xuICB9LFxuXG4gIC8qIEdldCBCbG9jayBUeXBlIExpbWl0XG4gICAqIC0tXG4gICAqIHJldHVybnMgdGhlIGxpbWl0IGZvciB0aGlzIGJsb2NrLCB3aGljaCBjYW4gYmUgc2V0IG9uIGEgcGVyIEVkaXRvclxuICAgKiBpbnN0YW5jZSwgb3Igb24gYSBnbG9iYWwgYmxvY2tUeXBlIHNjb3BlLiAqL1xuICBfZ2V0QmxvY2tUeXBlTGltaXQ6IGZ1bmN0aW9uKHQpIHtcbiAgICBpZiAoIXRoaXMuX2lzQmxvY2tUeXBlQXZhaWxhYmxlKHQpKSB7IHJldHVybiAwOyB9XG5cbiAgICByZXR1cm4gcGFyc2VJbnQoKF8uaXNVbmRlZmluZWQodGhpcy5vcHRpb25zLmJsb2NrVHlwZUxpbWl0c1t0XSkpID8gMCA6IHRoaXMub3B0aW9ucy5ibG9ja1R5cGVMaW1pdHNbdF0sIDEwKTtcbiAgfSxcblxuICAvKiBBdmFpbGFiaWxpdHkgaGVscGVyIG1ldGhvZHNcbiAgICogLS1cbiAgICogQ2hlY2tzIGlmIHRoZSBvYmplY3QgZXhpc3RzIHdpdGhpbiB0aGUgaW5zdGFuY2Ugb2YgdGhlIEVkaXRvci4gKi9cblxuICBfaXNCbG9ja1R5cGVBdmFpbGFibGU6IGZ1bmN0aW9uKHQpIHtcbiAgICByZXR1cm4gIV8uaXNVbmRlZmluZWQodGhpcy5ibG9ja1R5cGVzW3RdKTtcbiAgfSxcblxuICBfZW5zdXJlQW5kU2V0RWxlbWVudHM6IGZ1bmN0aW9uKCkge1xuICAgIGlmKF8uaXNVbmRlZmluZWQodGhpcy5vcHRpb25zLmVsKSB8fCBfLmlzRW1wdHkodGhpcy5vcHRpb25zLmVsKSkge1xuICAgICAgdXRpbHMubG9nKFwiWW91IG11c3QgcHJvdmlkZSBhbiBlbFwiKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICB0aGlzLiRlbCA9IHRoaXMub3B0aW9ucy5lbDtcbiAgICB0aGlzLmVsID0gdGhpcy5vcHRpb25zLmVsWzBdO1xuICAgIHRoaXMuJGZvcm0gPSB0aGlzLiRlbC5wYXJlbnRzKCdmb3JtJyk7XG5cbiAgICB2YXIgJG91dGVyID0gJChcIjxkaXY+XCIpLmF0dHIoeyAnaWQnOiB0aGlzLklELCAnY2xhc3MnOiAnc3Qtb3V0ZXInLCAnZHJvcHpvbmUnOiAnY29weSBsaW5rIG1vdmUnIH0pO1xuICAgIHZhciAkd3JhcHBlciA9ICQoXCI8ZGl2PlwiKS5hdHRyKHsgJ2NsYXNzJzogJ3N0LWJsb2NrcycgfSk7XG5cbiAgICAvLyBXcmFwIG91ciBlbGVtZW50IGluIGxvdHMgb2YgY29udGFpbmVycyAqZXd3KlxuICAgIHRoaXMuJGVsLndyYXAoJG91dGVyKS53cmFwKCR3cmFwcGVyKTtcblxuICAgIHRoaXMuJG91dGVyID0gdGhpcy4kZm9ybS5maW5kKCcjJyArIHRoaXMuSUQpO1xuICAgIHRoaXMuJHdyYXBwZXIgPSB0aGlzLiRvdXRlci5maW5kKCcuc3QtYmxvY2tzJyk7XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICAvKiBTZXQgb3VyIGJsb2NrVHlwZXNcbiAgICogVGhlc2Ugd2lsbCBlaXRoZXIgYmUgc2V0IG9uIGEgcGVyIEVkaXRvciBpbnN0YW5jZSwgb3Igc2V0IG9uIGEgZ2xvYmFsIHNjb3BlLlxuICAgKi9cbiAgX3NldEJsb2Nrc1R5cGVzOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJsb2NrVHlwZXMgPSB7fTtcbiAgICB2YXIga2V5cyA9IHRoaXMub3B0aW9ucy5ibG9ja1R5cGVzIHx8IE9iamVjdC5rZXlzKEJsb2Nrcyk7XG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICB0aGlzLmJsb2NrVHlwZXNba10gPSB0cnVlO1xuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIC8qIEdldCBvdXIgcmVxdWlyZWQgYmxvY2tzIChpZiBhbnkpICovXG4gIF9zZXRSZXF1aXJlZDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5vcHRpb25zLnJlcXVpcmVkKSAmJlxuICAgICAgICAhXy5pc0VtcHR5KHRoaXMub3B0aW9ucy5yZXF1aXJlZCkpIHtcbiAgICAgIHRoaXMucmVxdWlyZWQgPSB0aGlzLm9wdGlvbnMucmVxdWlyZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVxdWlyZWQgPSBmYWxzZTtcbiAgICB9XG4gIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5hc3NpZ24oe30sIHJlcXVpcmUoJy4vZXZlbnRzJykpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnZXZlbnRhYmxlanMnKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICogU2lyIFRyZXZvciBFZGl0b3IgU3RvcmVcbiAqIEJ5IGRlZmF1bHQgd2Ugc3RvcmUgdGhlIGNvbXBsZXRlIGRhdGEgb24gdGhlIGluc3RhbmNlcyAkZWxcbiAqIFdlIGNhbiBlYXNpbHkgZXh0ZW5kIHRoaXMgYW5kIHN0b3JlIGl0IG9uIHNvbWUgc2VydmVyIG9yIHNvbWV0aGluZ1xuICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi4vbG9kYXNoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVkaXRvciwgbWV0aG9kLCBvcHRpb25zKSB7XG4gIHZhciByZXNwO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHN3aXRjaChtZXRob2QpIHtcblxuICAgIGNhc2UgXCJjcmVhdGVcIjpcbiAgICAgIC8vIEdyYWIgb3VyIEpTT04gZnJvbSB0aGUgdGV4dGFyZWEgYW5kIGNsZWFuIGFueSB3aGl0ZXNwYWNlIGluIGNhc2VcbiAgICAgIC8vIHRoZXJlIGlzIGEgbGluZSB3cmFwIGJldHdlZW4gdGhlIG9wZW5pbmcgYW5kIGNsb3NpbmcgdGV4dGFyZWEgdGFnc1xuICAgICAgdmFyIGNvbnRlbnQgPSBlZGl0b3IuJGVsLnZhbCgpLnRyaW0oKTtcbiAgICAgIGVkaXRvci5kYXRhU3RvcmUgPSB7IGRhdGE6IFtdIH07XG5cbiAgICAgIGlmIChjb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBFbnN1cmUgdGhlIEpTT04gc3RyaW5nIGhhcyBhIGRhdGEgZWxlbWVudCB0aGF0J3MgYW4gYXJyYXlcbiAgICAgICAgICB2YXIgc3RyID0gSlNPTi5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQoc3RyLmRhdGEpKSB7XG4gICAgICAgICAgICAvLyBTZXQgaXRcbiAgICAgICAgICAgIGVkaXRvci5kYXRhU3RvcmUgPSBzdHI7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICBlZGl0b3IuZXJyb3JzLnB1c2goeyB0ZXh0OiBpMThuLnQoXCJlcnJvcnM6bG9hZF9mYWlsXCIpIH0pO1xuICAgICAgICAgIGVkaXRvci5yZW5kZXJFcnJvcnMoKTtcblxuICAgICAgICAgIHV0aWxzLmxvZygnU29ycnkgdGhlcmUgaGFzIGJlZW4gYSBwcm9ibGVtIHdpdGggcGFyc2luZyB0aGUgSlNPTicpO1xuICAgICAgICAgIHV0aWxzLmxvZyhlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFwicmVzZXRcIjpcbiAgICAgIGVkaXRvci5kYXRhU3RvcmUgPSB7IGRhdGE6IFtdIH07XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJhZGRcIjpcbiAgICAgIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICAgICAgZWRpdG9yLmRhdGFTdG9yZS5kYXRhLnB1c2gob3B0aW9ucy5kYXRhKTtcbiAgICAgICAgcmVzcCA9IGVkaXRvci5kYXRhU3RvcmU7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJzYXZlXCI6XG4gICAgICAvLyBTdG9yZSB0byBvdXIgZWxlbWVudFxuICAgICAgZWRpdG9yLiRlbC52YWwoKGVkaXRvci5kYXRhU3RvcmUuZGF0YS5sZW5ndGggPiAwKSA/IEpTT04uc3RyaW5naWZ5KGVkaXRvci5kYXRhU3RvcmUpIDogJycpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFwicmVhZFwiOlxuICAgICAgcmVzcCA9IGVkaXRvci5kYXRhU3RvcmU7XG4gICAgICBicmVhaztcblxuICB9XG5cbiAgaWYocmVzcCkge1xuICAgIHJldHVybiByZXNwO1xuICB9XG5cbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAqIFNpclRyZXZvci5TdWJtaXR0YWJsZVxuICogLS1cbiAqIFdlIG5lZWQgYSBnbG9iYWwgd2F5IG9mIHNldHRpbmcgaWYgdGhlIGVkaXRvciBjYW4gYW5kIGNhbid0IGJlIHN1Ym1pdHRlZCxcbiAqIGFuZCBhIHdheSB0byBkaXNhYmxlIHRoZSBzdWJtaXQgYnV0dG9uIGFuZCBhZGQgbWVzc2FnZXMgKHdoZW4gYXBwcm9wcmlhdGUpXG4gKiBXZSBhbHNvIG5lZWQgdGhpcyB0byBiZSBoaWdobHkgZXh0ZW5zaWJsZSBzbyBpdCBjYW4gYmUgb3ZlcnJpZGRlbi5cbiAqIFRoaXMgd2lsbCBiZSB0cmlnZ2VyZWQgKmJ5IGFueXRoaW5nKiBzbyBpdCBuZWVkcyB0byBzdWJzY3JpYmUgdG8gZXZlbnRzLlxuICovXG5cblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi4vZXZlbnQtYnVzJyk7XG5cbnZhciBzdWJtaXR0YWJsZSA9IGZ1bmN0aW9uKCRmb3JtKSB7XG4gIHRoaXMuJGZvcm0gPSAkZm9ybTtcbiAgdGhpcy5pbnRpYWxpemUoKTtcbn07XG5cbk9iamVjdC5hc3NpZ24oc3VibWl0dGFibGUucHJvdG90eXBlLCB7XG5cbiAgaW50aWFsaXplOiBmdW5jdGlvbigpe1xuICAgIHRoaXMuJHN1Ym1pdEJ0biA9IHRoaXMuJGZvcm0uZmluZChcImlucHV0W3R5cGU9J3N1Ym1pdCddXCIpO1xuXG4gICAgdmFyIGJ0blRpdGxlcyA9IFtdO1xuXG4gICAgdGhpcy4kc3VibWl0QnRuLmVhY2goZnVuY3Rpb24oaSwgYnRuKXtcbiAgICAgIGJ0blRpdGxlcy5wdXNoKCQoYnRuKS5hdHRyKCd2YWx1ZScpKTtcbiAgICB9KTtcblxuICAgIHRoaXMuc3VibWl0QnRuVGl0bGVzID0gYnRuVGl0bGVzO1xuICAgIHRoaXMuY2FuU3VibWl0ID0gdHJ1ZTtcbiAgICB0aGlzLmdsb2JhbFVwbG9hZENvdW50ID0gMDtcbiAgICB0aGlzLl9iaW5kRXZlbnRzKCk7XG4gIH0sXG5cbiAgc2V0U3VibWl0QnV0dG9uOiBmdW5jdGlvbihlLCBtZXNzYWdlKSB7XG4gICAgdGhpcy4kc3VibWl0QnRuLmF0dHIoJ3ZhbHVlJywgbWVzc2FnZSk7XG4gIH0sXG5cbiAgcmVzZXRTdWJtaXRCdXR0b246IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHRpdGxlcyA9IHRoaXMuc3VibWl0QnRuVGl0bGVzO1xuICAgIHRoaXMuJHN1Ym1pdEJ0bi5lYWNoKGZ1bmN0aW9uKGluZGV4LCBpdGVtKSB7XG4gICAgICAkKGl0ZW0pLmF0dHIoJ3ZhbHVlJywgdGl0bGVzW2luZGV4XSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgb25VcGxvYWRTdGFydDogZnVuY3Rpb24oZSl7XG4gICAgdGhpcy5nbG9iYWxVcGxvYWRDb3VudCsrO1xuICAgIHV0aWxzLmxvZygnb25VcGxvYWRTdGFydCBjYWxsZWQgJyArIHRoaXMuZ2xvYmFsVXBsb2FkQ291bnQpO1xuXG4gICAgaWYodGhpcy5nbG9iYWxVcGxvYWRDb3VudCA9PT0gMSkge1xuICAgICAgdGhpcy5fZGlzYWJsZVN1Ym1pdEJ1dHRvbigpO1xuICAgIH1cbiAgfSxcblxuICBvblVwbG9hZFN0b3A6IGZ1bmN0aW9uKGUpIHtcbiAgICB0aGlzLmdsb2JhbFVwbG9hZENvdW50ID0gKHRoaXMuZ2xvYmFsVXBsb2FkQ291bnQgPD0gMCkgPyAwIDogdGhpcy5nbG9iYWxVcGxvYWRDb3VudCAtIDE7XG5cbiAgICB1dGlscy5sb2coJ29uVXBsb2FkU3RvcCBjYWxsZWQgJyArIHRoaXMuZ2xvYmFsVXBsb2FkQ291bnQpO1xuXG4gICAgaWYodGhpcy5nbG9iYWxVcGxvYWRDb3VudCA9PT0gMCkge1xuICAgICAgdGhpcy5fZW5hYmxlU3VibWl0QnV0dG9uKCk7XG4gICAgfVxuICB9LFxuXG4gIG9uRXJyb3I6IGZ1bmN0aW9uKGUpe1xuICAgIHV0aWxzLmxvZygnb25FcnJvciBjYWxsZWQnKTtcbiAgICB0aGlzLmNhblN1Ym1pdCA9IGZhbHNlO1xuICB9LFxuXG4gIF9kaXNhYmxlU3VibWl0QnV0dG9uOiBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICB0aGlzLnNldFN1Ym1pdEJ1dHRvbihudWxsLCBtZXNzYWdlIHx8IGkxOG4udChcImdlbmVyYWw6d2FpdFwiKSk7XG4gICAgdGhpcy4kc3VibWl0QnRuXG4gICAgLmF0dHIoJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJylcbiAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gIH0sXG5cbiAgX2VuYWJsZVN1Ym1pdEJ1dHRvbjogZnVuY3Rpb24oKXtcbiAgICB0aGlzLnJlc2V0U3VibWl0QnV0dG9uKCk7XG4gICAgdGhpcy4kc3VibWl0QnRuXG4gICAgLnJlbW92ZUF0dHIoJ2Rpc2FibGVkJylcbiAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gIH0sXG5cbiAgX2V2ZW50cyA6IHtcbiAgICBcImRpc2FibGVTdWJtaXRCdXR0b25cIiA6IFwiX2Rpc2FibGVTdWJtaXRCdXR0b25cIixcbiAgICBcImVuYWJsZVN1Ym1pdEJ1dHRvblwiICA6IFwiX2VuYWJsZVN1Ym1pdEJ1dHRvblwiLFxuICAgIFwic2V0U3VibWl0QnV0dG9uXCIgICAgIDogXCJzZXRTdWJtaXRCdXR0b25cIixcbiAgICBcInJlc2V0U3VibWl0QnV0dG9uXCIgICA6IFwicmVzZXRTdWJtaXRCdXR0b25cIixcbiAgICBcIm9uRXJyb3JcIiAgICAgICAgICAgICA6IFwib25FcnJvclwiLFxuICAgIFwib25VcGxvYWRTdGFydFwiICAgICAgIDogXCJvblVwbG9hZFN0YXJ0XCIsXG4gICAgXCJvblVwbG9hZFN0b3BcIiAgICAgICAgOiBcIm9uVXBsb2FkU3RvcFwiXG4gIH0sXG5cbiAgX2JpbmRFdmVudHM6IGZ1bmN0aW9uKCl7XG4gICAgT2JqZWN0LmtleXModGhpcy5fZXZlbnRzKS5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICAgIEV2ZW50QnVzLm9uKHR5cGUsIHRoaXNbdGhpcy5fZXZlbnRzW3R5cGVdXSwgdGhpcyk7XG4gICAgfSwgdGhpcyk7XG4gIH1cblxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gc3VibWl0dGFibGU7XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuKiAgIFNpciBUcmV2b3IgVXBsb2FkZXJcbiogICBHZW5lcmljIFVwbG9hZCBpbXBsZW1lbnRhdGlvbiB0aGF0IGNhbiBiZSBleHRlbmRlZCBmb3IgYmxvY2tzXG4qL1xuXG52YXIgXyA9IHJlcXVpcmUoJy4uL2xvZGFzaCcpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4uL2NvbmZpZycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihibG9jaywgZmlsZSwgc3VjY2VzcywgZXJyb3IpIHtcblxuICB2YXIgdWlkICA9IFtibG9jay5ibG9ja0lELCAobmV3IERhdGUoKSkuZ2V0VGltZSgpLCAncmF3J10uam9pbignLScpO1xuICB2YXIgZGF0YSA9IG5ldyBGb3JtRGF0YSgpO1xuXG4gIGRhdGEuYXBwZW5kKCdhdHRhY2htZW50W25hbWVdJywgZmlsZS5uYW1lKTtcbiAgZGF0YS5hcHBlbmQoJ2F0dGFjaG1lbnRbZmlsZV0nLCBmaWxlKTtcbiAgZGF0YS5hcHBlbmQoJ2F0dGFjaG1lbnRbdWlkXScsIHVpZCk7XG5cbiAgYmxvY2sucmVzZXRNZXNzYWdlcygpO1xuXG4gIHZhciBjYWxsYmFja1N1Y2Nlc3MgPSBmdW5jdGlvbigpe1xuICAgIHV0aWxzLmxvZygnVXBsb2FkIGNhbGxiYWNrIGNhbGxlZCcpO1xuXG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKHN1Y2Nlc3MpICYmIF8uaXNGdW5jdGlvbihzdWNjZXNzKSkge1xuICAgICAgc3VjY2Vzcy5hcHBseShibG9jaywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGNhbGxiYWNrRXJyb3IgPSBmdW5jdGlvbigpe1xuICAgIHV0aWxzLmxvZygnVXBsb2FkIGNhbGxiYWNrIGVycm9yIGNhbGxlZCcpO1xuXG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKGVycm9yKSAmJiBfLmlzRnVuY3Rpb24oZXJyb3IpKSB7XG4gICAgICBlcnJvci5hcHBseShibG9jaywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIHhociA9ICQuYWpheCh7XG4gICAgdXJsOiBjb25maWcuZGVmYXVsdHMudXBsb2FkVXJsLFxuICAgIGRhdGE6IGRhdGEsXG4gICAgY2FjaGU6IGZhbHNlLFxuICAgIGNvbnRlbnRUeXBlOiBmYWxzZSxcbiAgICBwcm9jZXNzRGF0YTogZmFsc2UsXG4gICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICB0eXBlOiAnUE9TVCdcbiAgfSk7XG5cbiAgYmxvY2suYWRkUXVldWVkSXRlbSh1aWQsIHhocik7XG5cbiAgeGhyLmRvbmUoY2FsbGJhY2tTdWNjZXNzKVxuICAgICAuZmFpbChjYWxsYmFja0Vycm9yKVxuICAgICAuYWx3YXlzKGJsb2NrLnJlbW92ZVF1ZXVlZEl0ZW0uYmluZChibG9jaywgdWlkKSk7XG5cbiAgcmV0dXJuIHhocjtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAgIFNpclRyZXZvciBGbG9hdGluZyBCbG9jayBDb250cm9sc1xuICAgLS1cbiAgIERyYXdzIHRoZSAncGx1cycgYmV0d2VlbiBibG9ja3NcbiAgICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi9sb2Rhc2gnKTtcblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi9ldmVudC1idXMnKTtcblxudmFyIEZsb2F0aW5nQmxvY2tDb250cm9scyA9IGZ1bmN0aW9uKHdyYXBwZXIsIGluc3RhbmNlX2lkKSB7XG4gIHRoaXMuJHdyYXBwZXIgPSB3cmFwcGVyO1xuICB0aGlzLmluc3RhbmNlX2lkID0gaW5zdGFuY2VfaWQ7XG5cbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG5cbiAgdGhpcy5pbml0aWFsaXplKCk7XG59O1xuXG5PYmplY3QuYXNzaWduKEZsb2F0aW5nQmxvY2tDb250cm9scy5wcm90b3R5cGUsIHJlcXVpcmUoJy4vZnVuY3Rpb24tYmluZCcpLCByZXF1aXJlKCcuL3JlbmRlcmFibGUnKSwgcmVxdWlyZSgnLi9ldmVudHMnKSwge1xuXG4gIGNsYXNzTmFtZTogXCJzdC1ibG9jay1jb250cm9sc19fdG9wXCIsXG5cbiAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdkYXRhLWljb24nOiAnYWRkJ1xuICAgIH07XG4gIH0sXG5cbiAgYm91bmQ6IFsnaGFuZGxlQmxvY2tNb3VzZU91dCcsICdoYW5kbGVCbG9ja01vdXNlT3ZlcicsICdoYW5kbGVCbG9ja0NsaWNrJywgJ29uRHJvcCddLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJGVsLm9uKCdjbGljaycsIHRoaXMuaGFuZGxlQmxvY2tDbGljaylcbiAgICAuZHJvcEFyZWEoKVxuICAgIC5iaW5kKCdkcm9wJywgdGhpcy5vbkRyb3ApO1xuXG4gICAgdGhpcy4kd3JhcHBlci5vbignbW91c2VvdmVyJywgJy5zdC1ibG9jaycsIHRoaXMuaGFuZGxlQmxvY2tNb3VzZU92ZXIpXG4gICAgLm9uKCdtb3VzZW91dCcsICcuc3QtYmxvY2snLCB0aGlzLmhhbmRsZUJsb2NrTW91c2VPdXQpXG4gICAgLm9uKCdjbGljaycsICcuc3QtYmxvY2stLXdpdGgtcGx1cycsIHRoaXMuaGFuZGxlQmxvY2tDbGljayk7XG4gIH0sXG5cbiAgb25Ecm9wOiBmdW5jdGlvbihldikge1xuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICB2YXIgZHJvcHBlZF9vbiA9IHRoaXMuJGVsLFxuICAgIGl0ZW1faWQgPSBldi5vcmlnaW5hbEV2ZW50LmRhdGFUcmFuc2Zlci5nZXREYXRhKFwidGV4dC9wbGFpblwiKSxcbiAgICBibG9jayA9ICQoJyMnICsgaXRlbV9pZCk7XG5cbiAgICBpZiAoIV8uaXNVbmRlZmluZWQoaXRlbV9pZCkgJiZcbiAgICAgICAgIV8uaXNFbXB0eShibG9jaykgJiZcbiAgICAgICAgICBkcm9wcGVkX29uLmF0dHIoJ2lkJykgIT09IGl0ZW1faWQgJiZcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VfaWQgPT09IGJsb2NrLmF0dHIoJ2RhdGEtaW5zdGFuY2UnKVxuICAgICAgICkge1xuICAgICAgICAgZHJvcHBlZF9vbi5hZnRlcihibG9jayk7XG4gICAgICAgfVxuXG4gICAgICAgRXZlbnRCdXMudHJpZ2dlcihcImJsb2NrOnJlb3JkZXI6ZHJvcHBlZFwiLCBpdGVtX2lkKTtcbiAgfSxcblxuICBoYW5kbGVCbG9ja01vdXNlT3ZlcjogZnVuY3Rpb24oZSkge1xuICAgIHZhciBibG9jayA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcblxuICAgIGlmICghYmxvY2suaGFzQ2xhc3MoJ3N0LWJsb2NrLS13aXRoLXBsdXMnKSkge1xuICAgICAgYmxvY2suYWRkQ2xhc3MoJ3N0LWJsb2NrLS13aXRoLXBsdXMnKTtcbiAgICB9XG4gIH0sXG5cbiAgaGFuZGxlQmxvY2tNb3VzZU91dDogZnVuY3Rpb24oZSkge1xuICAgIHZhciBibG9jayA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcblxuICAgIGlmIChibG9jay5oYXNDbGFzcygnc3QtYmxvY2stLXdpdGgtcGx1cycpKSB7XG4gICAgICBibG9jay5yZW1vdmVDbGFzcygnc3QtYmxvY2stLXdpdGgtcGx1cycpO1xuICAgIH1cbiAgfSxcblxuICBoYW5kbGVCbG9ja0NsaWNrOiBmdW5jdGlvbihlKSB7XG4gICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIHZhciBibG9jayA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICB0aGlzLnRyaWdnZXIoJ3Nob3dCbG9ja0NvbnRyb2xzJywgYmxvY2spO1xuICB9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZsb2F0aW5nQmxvY2tDb250cm9scztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxudmFyIEV2ZW50QnVzID0gcmVxdWlyZSgnLi9ldmVudC1idXMnKTtcbnZhciBTdWJtaXR0YWJsZSA9IHJlcXVpcmUoJy4vZXh0ZW5zaW9ucy9zaXItdHJldm9yLnN1Ym1pdHRhYmxlJyk7XG5cbnZhciBmb3JtQm91bmQgPSBmYWxzZTsgLy8gRmxhZyB0byB0ZWxsIHVzIG9uY2Ugd2UndmUgYm91bmQgb3VyIHN1Ym1pdCBldmVudFxuXG52YXIgRm9ybUV2ZW50cyA9IHtcbiAgYmluZEZvcm1TdWJtaXQ6IGZ1bmN0aW9uKGZvcm0pIHtcbiAgICBpZiAoIWZvcm1Cb3VuZCkge1xuICAgICAgdGhpcy5zdWJtaXR0YWJsZSA9IG5ldyBTdWJtaXR0YWJsZShmb3JtKTtcbiAgICAgIGZvcm0ub24oJ3N1Ym1pdC5zaXJ0cmV2b3InLCB0aGlzLm9uRm9ybVN1Ym1pdCk7XG4gICAgICBmb3JtQm91bmQgPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuICBvbkJlZm9yZVN1Ym1pdDogZnVuY3Rpb24oc2hvdWxkX3ZhbGlkYXRlKSB7XG4gICAgLy8gTG9vcCB0aHJvdWdoIGFsbCBvZiBvdXIgaW5zdGFuY2VzIGFuZCBkbyBvdXIgZm9ybSBzdWJtaXRzIG9uIHRoZW1cbiAgICB2YXIgZXJyb3JzID0gMDtcbiAgICBjb25maWcuaW5zdGFuY2VzLmZvckVhY2goZnVuY3Rpb24oaW5zdCwgaSkge1xuICAgICAgZXJyb3JzICs9IGluc3Qub25Gb3JtU3VibWl0KHNob3VsZF92YWxpZGF0ZSk7XG4gICAgfSk7XG4gICAgdXRpbHMubG9nKFwiVG90YWwgZXJyb3JzOiBcIiArIGVycm9ycyk7XG5cbiAgICByZXR1cm4gZXJyb3JzO1xuICB9LFxuXG4gIG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oZXYpIHtcbiAgICB2YXIgZXJyb3JzID0gRm9ybUV2ZW50cy5vbkJlZm9yZVN1Ym1pdCgpO1xuXG4gICAgaWYoZXJyb3JzID4gMCkge1xuICAgICAgRXZlbnRCdXMudHJpZ2dlcihcIm9uRXJyb3JcIik7XG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgfSxcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRm9ybUV2ZW50cztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICAgRm9ybWF0IEJhclxuICAgLS1cbiAgIERpc3BsYXllZCBvbiBmb2N1cyBvbiBhIHRleHQgYXJlYS5cbiAgIFJlbmRlcnMgd2l0aCBhbGwgYXZhaWxhYmxlIG9wdGlvbnMgZm9yIHRoZSBlZGl0b3IgaW5zdGFuY2VcbiAgICovXG5cbnZhciBfID0gcmVxdWlyZSgnLi9sb2Rhc2gnKTtcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgRm9ybWF0dGVycyA9IHJlcXVpcmUoJy4vZm9ybWF0dGVycycpO1xuXG52YXIgRm9ybWF0QmFyID0gZnVuY3Rpb24ob3B0aW9ucykge1xuICB0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBjb25maWcuZGVmYXVsdHMuZm9ybWF0QmFyLCBvcHRpb25zIHx8IHt9KTtcbiAgdGhpcy5fZW5zdXJlRWxlbWVudCgpO1xuICB0aGlzLl9iaW5kRnVuY3Rpb25zKCk7XG5cbiAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG5PYmplY3QuYXNzaWduKEZvcm1hdEJhci5wcm90b3R5cGUsIHJlcXVpcmUoJy4vZnVuY3Rpb24tYmluZCcpLCByZXF1aXJlKCcuL2V2ZW50cycpLCByZXF1aXJlKCcuL3JlbmRlcmFibGUnKSwge1xuXG4gIGNsYXNzTmFtZTogJ3N0LWZvcm1hdC1iYXInLFxuXG4gIGJvdW5kOiBbXCJvbkZvcm1hdEJ1dHRvbkNsaWNrXCIsIFwicmVuZGVyQnlTZWxlY3Rpb25cIiwgXCJoaWRlXCJdLFxuXG4gIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmb3JtYXROYW1lLCBmb3JtYXQsIGJ0bjtcbiAgICB0aGlzLiRidG5zID0gW107XG5cbiAgICBmb3IgKGZvcm1hdE5hbWUgaW4gRm9ybWF0dGVycykge1xuICAgICAgaWYgKEZvcm1hdHRlcnMuaGFzT3duUHJvcGVydHkoZm9ybWF0TmFtZSkpIHtcbiAgICAgICAgZm9ybWF0ID0gRm9ybWF0dGVyc1tmb3JtYXROYW1lXTtcbiAgICAgICAgYnRuID0gJChcIjxidXR0b24+XCIsIHtcbiAgICAgICAgICAnY2xhc3MnOiAnc3QtZm9ybWF0LWJ0biBzdC1mb3JtYXQtYnRuLS0nICsgZm9ybWF0TmFtZSArICcgJyArIChmb3JtYXQuaWNvbk5hbWUgPyAnc3QtaWNvbicgOiAnJyksXG4gICAgICAgICAgJ3RleHQnOiBmb3JtYXQudGV4dCxcbiAgICAgICAgICAnZGF0YS10eXBlJzogZm9ybWF0TmFtZSxcbiAgICAgICAgICAnZGF0YS1jbWQnOiBmb3JtYXQuY21kXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuJGJ0bnMucHVzaChidG4pO1xuICAgICAgICBidG4uYXBwZW5kVG8odGhpcy4kZWwpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuJGIgPSAkKGRvY3VtZW50KTtcbiAgICB0aGlzLiRlbC5iaW5kKCdjbGljaycsICcuc3QtZm9ybWF0LWJ0bicsIHRoaXMub25Gb3JtYXRCdXR0b25DbGljayk7XG4gIH0sXG5cbiAgaGlkZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ3N0LWZvcm1hdC1iYXItLWlzLXJlYWR5Jyk7XG4gIH0sXG5cbiAgc2hvdzogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy4kZWwuYWRkQ2xhc3MoJ3N0LWZvcm1hdC1iYXItLWlzLXJlYWR5Jyk7XG4gIH0sXG5cbiAgcmVtb3ZlOiBmdW5jdGlvbigpeyB0aGlzLiRlbC5yZW1vdmUoKTsgfSxcblxuICByZW5kZXJCeVNlbGVjdGlvbjogZnVuY3Rpb24ocmVjdGFuZ2xlcykge1xuXG4gICAgdmFyIHNlbGVjdGlvbiA9IHdpbmRvdy5nZXRTZWxlY3Rpb24oKSxcbiAgICByYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApLFxuICAgIGJvdW5kYXJ5ID0gcmFuZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgY29vcmRzID0ge307XG5cbiAgICBjb29yZHMudG9wID0gYm91bmRhcnkudG9wICsgMjAgKyB3aW5kb3cucGFnZVlPZmZzZXQgLSB0aGlzLiRlbC5oZWlnaHQoKSArICdweCc7XG4gICAgY29vcmRzLmxlZnQgPSAoKGJvdW5kYXJ5LmxlZnQgKyBib3VuZGFyeS5yaWdodCkgLyAyKSAtICh0aGlzLiRlbC53aWR0aCgpIC8gMikgKyAncHgnO1xuXG4gICAgdGhpcy5oaWdobGlnaHRTZWxlY3RlZEJ1dHRvbnMoKTtcbiAgICB0aGlzLnNob3coKTtcblxuICAgIHRoaXMuJGVsLmNzcyhjb29yZHMpO1xuICB9LFxuXG4gIGhpZ2hsaWdodFNlbGVjdGVkQnV0dG9uczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZvcm1hdHRlcjtcbiAgICB0aGlzLiRidG5zLmZvckVhY2goZnVuY3Rpb24oJGJ0bikge1xuICAgICAgZm9ybWF0dGVyID0gRm9ybWF0dGVyc1skYnRuLmF0dHIoJ2RhdGEtdHlwZScpXTtcbiAgICAgICRidG4udG9nZ2xlQ2xhc3MoXCJzdC1mb3JtYXQtYnRuLS1pcy1hY3RpdmVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVyLmlzQWN0aXZlKCkpO1xuICAgIH0sIHRoaXMpO1xuICB9LFxuXG4gIG9uRm9ybWF0QnV0dG9uQ2xpY2s6IGZ1bmN0aW9uKGV2KXtcbiAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgIHZhciBidG4gPSAkKGV2LnRhcmdldCksXG4gICAgZm9ybWF0ID0gRm9ybWF0dGVyc1tidG4uYXR0cignZGF0YS10eXBlJyldO1xuXG4gICAgaWYgKF8uaXNVbmRlZmluZWQoZm9ybWF0KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIERvIHdlIGhhdmUgYSBjbGljayBmdW5jdGlvbiBkZWZpbmVkIG9uIHRoaXMgZm9ybWF0dGVyP1xuICAgIGlmKCFfLmlzVW5kZWZpbmVkKGZvcm1hdC5vbkNsaWNrKSAmJiBfLmlzRnVuY3Rpb24oZm9ybWF0Lm9uQ2xpY2spKSB7XG4gICAgICBmb3JtYXQub25DbGljaygpOyAvLyBEZWxlZ2F0ZVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDYWxsIGRlZmF1bHRcbiAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKGJ0bi5hdHRyKCdkYXRhLWNtZCcpLCBmYWxzZSwgZm9ybWF0LnBhcmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLmhpZ2hsaWdodFNlbGVjdGVkQnV0dG9ucygpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBGb3JtYXRCYXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xuXG52YXIgRm9ybWF0dGVyID0gZnVuY3Rpb24ob3B0aW9ucyl7XG4gIHRoaXMuZm9ybWF0SWQgPSBfLnVuaXF1ZUlkKCdmb3JtYXQtJyk7XG4gIHRoaXMuX2NvbmZpZ3VyZShvcHRpb25zIHx8IHt9KTtcbiAgdGhpcy5pbml0aWFsaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG52YXIgZm9ybWF0T3B0aW9ucyA9IFtcInRpdGxlXCIsIFwiY2xhc3NOYW1lXCIsIFwiY21kXCIsIFwia2V5Q29kZVwiLCBcInBhcmFtXCIsIFwib25DbGlja1wiLCBcInRvTWFya2Rvd25cIiwgXCJ0b0hUTUxcIl07XG5cbk9iamVjdC5hc3NpZ24oRm9ybWF0dGVyLnByb3RvdHlwZSwge1xuXG4gIHRpdGxlOiAnJyxcbiAgY2xhc3NOYW1lOiAnJyxcbiAgY21kOiBudWxsLFxuICBrZXlDb2RlOiBudWxsLFxuICBwYXJhbTogbnVsbCxcblxuICB0b01hcmtkb3duOiBmdW5jdGlvbihtYXJrZG93bil7IHJldHVybiBtYXJrZG93bjsgfSxcbiAgdG9IVE1MOiBmdW5jdGlvbihodG1sKXsgcmV0dXJuIGh0bWw7IH0sXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKXt9LFxuXG4gIF9jb25maWd1cmU6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICBpZiAodGhpcy5vcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBmb3JtYXRPcHRpb25zLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdmFyIGF0dHIgPSBmb3JtYXRPcHRpb25zW2ldO1xuICAgICAgaWYgKG9wdGlvbnNbYXR0cl0pIHtcbiAgICAgICAgdGhpc1thdHRyXSA9IG9wdGlvbnNbYXR0cl07XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG4gIH0sXG5cbiAgaXNBY3RpdmU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeUNvbW1hbmRTdGF0ZSh0aGlzLmNtZCk7XG4gIH0sXG5cbiAgX2JpbmRUb0Jsb2NrOiBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBmb3JtYXR0ZXIgPSB0aGlzLFxuICAgIGN0cmxEb3duID0gZmFsc2U7XG5cbiAgICBibG9ja1xuICAgIC5vbigna2V5dXAnLCcuc3QtdGV4dC1ibG9jaycsIGZ1bmN0aW9uKGV2KSB7XG4gICAgICBpZihldi53aGljaCA9PT0gMTcgfHwgZXYud2hpY2ggPT09IDIyNCB8fCBldi53aGljaCA9PT0gOTEpIHtcbiAgICAgICAgY3RybERvd24gPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5vbigna2V5ZG93bicsJy5zdC10ZXh0LWJsb2NrJywgeyBmb3JtYXR0ZXI6IGZvcm1hdHRlciB9LCBmdW5jdGlvbihldikge1xuICAgICAgaWYoZXYud2hpY2ggPT09IDE3IHx8IGV2LndoaWNoID09PSAyMjQgfHwgZXYud2hpY2ggPT09IDkxKSB7XG4gICAgICAgIGN0cmxEb3duID0gdHJ1ZTtcbiAgICAgIH1cblxuICAgICAgaWYoZXYud2hpY2ggPT09IGV2LmRhdGEuZm9ybWF0dGVyLmtleUNvZGUgJiYgY3RybERvd24gPT09IHRydWUpIHtcbiAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoZXYuZGF0YS5mb3JtYXR0ZXIuY21kLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGN0cmxEb3duID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0pO1xuXG4vLyBBbGxvdyBvdXIgRm9ybWF0dGVycyB0byBiZSBleHRlbmRlZC5cbkZvcm1hdHRlci5leHRlbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvZXh0ZW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRm9ybWF0dGVyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIE91ciBiYXNlIGZvcm1hdHRlcnMgKi9cblxudmFyIEZvcm1hdHRlciA9IHJlcXVpcmUoJy4vZm9ybWF0dGVyJyk7XG5cbnZhciBCb2xkID0gRm9ybWF0dGVyLmV4dGVuZCh7XG4gIHRpdGxlOiBcImJvbGRcIixcbiAgY21kOiBcImJvbGRcIixcbiAga2V5Q29kZTogNjYsXG4gIHRleHQgOiBcIkJcIlxufSk7XG5cbnZhciBJdGFsaWMgPSBGb3JtYXR0ZXIuZXh0ZW5kKHtcbiAgdGl0bGU6IFwiaXRhbGljXCIsXG4gIGNtZDogXCJpdGFsaWNcIixcbiAga2V5Q29kZTogNzMsXG4gIHRleHQgOiBcImlcIlxufSk7XG5cbnZhciBMaW5rID0gRm9ybWF0dGVyLmV4dGVuZCh7XG5cbiAgdGl0bGU6IFwibGlua1wiLFxuICBpY29uTmFtZTogXCJsaW5rXCIsXG4gIGNtZDogXCJDcmVhdGVMaW5rXCIsXG4gIHRleHQgOiBcImxpbmtcIixcblxuICBvbkNsaWNrOiBmdW5jdGlvbigpIHtcblxuICAgIHZhciBsaW5rID0gd2luZG93LnByb21wdChpMThuLnQoXCJnZW5lcmFsOmxpbmtcIikpLFxuICAgIGxpbmtfcmVnZXggPSAvKChmdHB8aHR0cHxodHRwcyk6XFwvXFwvLil8bWFpbHRvKD89XFw6Wy1cXC5cXHddK0ApLztcblxuICAgIGlmKGxpbmsgJiYgbGluay5sZW5ndGggPiAwKSB7XG5cbiAgICAgIGlmICghbGlua19yZWdleC50ZXN0KGxpbmspKSB7XG4gICAgICAgIGxpbmsgPSBcImh0dHA6Ly9cIiArIGxpbms7XG4gICAgICB9XG5cbiAgICAgIGRvY3VtZW50LmV4ZWNDb21tYW5kKHRoaXMuY21kLCBmYWxzZSwgbGluayk7XG4gICAgfVxuICB9LFxuXG4gIGlzQWN0aXZlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgc2VsZWN0aW9uID0gd2luZG93LmdldFNlbGVjdGlvbigpLFxuICAgIG5vZGU7XG5cbiAgICBpZiAoc2VsZWN0aW9uLnJhbmdlQ291bnQgPiAwKSB7XG4gICAgICBub2RlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMClcbiAgICAgIC5zdGFydENvbnRhaW5lclxuICAgICAgLnBhcmVudE5vZGU7XG4gICAgfVxuXG4gICAgcmV0dXJuIChub2RlICYmIG5vZGUubm9kZU5hbWUgPT09IFwiQVwiKTtcbiAgfVxufSk7XG5cbnZhciBVbkxpbmsgPSBGb3JtYXR0ZXIuZXh0ZW5kKHtcbiAgdGl0bGU6IFwidW5saW5rXCIsXG4gIGljb25OYW1lOiBcImxpbmtcIixcbiAgY21kOiBcInVubGlua1wiLFxuICB0ZXh0IDogXCJsaW5rXCJcbn0pO1xuXG5cbmV4cG9ydHMuQm9sZCA9IG5ldyBCb2xkKCk7XG5leHBvcnRzLkl0YWxpYyA9IG5ldyBJdGFsaWMoKTtcbmV4cG9ydHMuTGluayA9IG5ldyBMaW5rKCk7XG5leHBvcnRzLlVubGluayA9IG5ldyBVbkxpbmsoKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBHZW5lcmljIGZ1bmN0aW9uIGJpbmRpbmcgdXRpbGl0eSwgdXNlZCBieSBsb3RzIG9mIG91ciBjbGFzc2VzICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBib3VuZDogW10sXG4gIF9iaW5kRnVuY3Rpb25zOiBmdW5jdGlvbigpe1xuICAgIHRoaXMuYm91bmQuZm9yRWFjaChmdW5jdGlvbihmKSB7XG4gICAgICB0aGlzW2ZdID0gdGhpc1tmXS5iaW5kKHRoaXMpO1xuICAgIH0sIHRoaXMpO1xuICB9XG59O1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLypcbiAqIERyb3AgQXJlYSBQbHVnaW4gZnJvbSBAbWFjY21hblxuICogaHR0cDovL2Jsb2cuYWxleG1hY2Nhdy5jb20vc3ZidGxlLWltYWdlLXVwbG9hZGluZ1xuICogLS1cbiAqIFR3ZWFrZWQgc28gd2UgdXNlIHRoZSBwYXJlbnQgY2xhc3Mgb2YgZHJvcHpvbmVcbiAqL1xuXG5cbmZ1bmN0aW9uIGRyYWdFbnRlcihlKSB7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbn1cblxuZnVuY3Rpb24gZHJhZ092ZXIoZSkge1xuICBlLm9yaWdpbmFsRXZlbnQuZGF0YVRyYW5zZmVyLmRyb3BFZmZlY3QgPSBcImNvcHlcIjtcbiAgJChlLmN1cnJlbnRUYXJnZXQpLmFkZENsYXNzKCdzdC1kcmFnLW92ZXInKTtcbiAgZS5wcmV2ZW50RGVmYXVsdCgpO1xufVxuXG5mdW5jdGlvbiBkcmFnTGVhdmUoZSkge1xuICAkKGUuY3VycmVudFRhcmdldCkucmVtb3ZlQ2xhc3MoJ3N0LWRyYWctb3ZlcicpO1xuICBlLnByZXZlbnREZWZhdWx0KCk7XG59XG5cbiQuZm4uZHJvcEFyZWEgPSBmdW5jdGlvbigpe1xuICB0aGlzLmJpbmQoXCJkcmFnZW50ZXJcIiwgZHJhZ0VudGVyKS5cbiAgICBiaW5kKFwiZHJhZ292ZXJcIiwgIGRyYWdPdmVyKS5cbiAgICBiaW5kKFwiZHJhZ2xlYXZlXCIsIGRyYWdMZWF2ZSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuJC5mbi5ub0Ryb3BBcmVhID0gZnVuY3Rpb24oKXtcbiAgdGhpcy51bmJpbmQoXCJkcmFnZW50ZXJcIikuXG4gICAgdW5iaW5kKFwiZHJhZ292ZXJcIikuXG4gICAgdW5iaW5kKFwiZHJhZ2xlYXZlXCIpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbiQuZm4uY2FyZXRUb0VuZCA9IGZ1bmN0aW9uKCl7XG4gIHZhciByYW5nZSxzZWxlY3Rpb247XG5cbiAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICByYW5nZS5zZWxlY3ROb2RlQ29udGVudHModGhpc1swXSk7XG4gIHJhbmdlLmNvbGxhcHNlKGZhbHNlKTtcblxuICBzZWxlY3Rpb24gPSB3aW5kb3cuZ2V0U2VsZWN0aW9uKCk7XG4gIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcbiAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBCYWNrYm9uZSBJbmhlcml0ZW5jZSBcbiAgLS1cbiAgRnJvbTogaHR0cHM6Ly9naXRodWIuY29tL2RvY3VtZW50Y2xvdWQvYmFja2JvbmUvYmxvYi9tYXN0ZXIvYmFja2JvbmUuanNcbiAgQmFja2JvbmUuanMgMC45LjJcbiAgKGMpIDIwMTAtMjAxMiBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgSW5jLlxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykge1xuICB2YXIgcGFyZW50ID0gdGhpcztcbiAgdmFyIGNoaWxkO1xuXG4gIC8vIFRoZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgdGhlIG5ldyBzdWJjbGFzcyBpcyBlaXRoZXIgZGVmaW5lZCBieSB5b3VcbiAgLy8gKHRoZSBcImNvbnN0cnVjdG9yXCIgcHJvcGVydHkgaW4geW91ciBgZXh0ZW5kYCBkZWZpbml0aW9uKSwgb3IgZGVmYXVsdGVkXG4gIC8vIGJ5IHVzIHRvIHNpbXBseSBjYWxsIHRoZSBwYXJlbnQncyBjb25zdHJ1Y3Rvci5cbiAgaWYgKHByb3RvUHJvcHMgJiYgcHJvdG9Qcm9wcy5oYXNPd25Qcm9wZXJ0eSgnY29uc3RydWN0b3InKSkge1xuICAgIGNoaWxkID0gcHJvdG9Qcm9wcy5jb25zdHJ1Y3RvcjtcbiAgfSBlbHNlIHtcbiAgICBjaGlsZCA9IGZ1bmN0aW9uKCl7IHJldHVybiBwYXJlbnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTsgfTtcbiAgfVxuXG4gIC8vIEFkZCBzdGF0aWMgcHJvcGVydGllcyB0byB0aGUgY29uc3RydWN0b3IgZnVuY3Rpb24sIGlmIHN1cHBsaWVkLlxuICBPYmplY3QuYXNzaWduKGNoaWxkLCBwYXJlbnQsIHN0YXRpY1Byb3BzKTtcblxuICAvLyBTZXQgdGhlIHByb3RvdHlwZSBjaGFpbiB0byBpbmhlcml0IGZyb20gYHBhcmVudGAsIHdpdGhvdXQgY2FsbGluZ1xuICAvLyBgcGFyZW50YCdzIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICB2YXIgU3Vycm9nYXRlID0gZnVuY3Rpb24oKXsgdGhpcy5jb25zdHJ1Y3RvciA9IGNoaWxkOyB9O1xuICBTdXJyb2dhdGUucHJvdG90eXBlID0gcGFyZW50LnByb3RvdHlwZTtcbiAgY2hpbGQucHJvdG90eXBlID0gbmV3IFN1cnJvZ2F0ZTsgLy8ganNoaW50IGlnbm9yZTpsaW5lXG5cbiAgLy8gQWRkIHByb3RvdHlwZSBwcm9wZXJ0aWVzIChpbnN0YW5jZSBwcm9wZXJ0aWVzKSB0byB0aGUgc3ViY2xhc3MsXG4gIC8vIGlmIHN1cHBsaWVkLlxuICBpZiAocHJvdG9Qcm9wcykge1xuICAgIE9iamVjdC5hc3NpZ24oY2hpbGQucHJvdG90eXBlLCBwcm90b1Byb3BzKTtcbiAgfVxuXG4gIC8vIFNldCBhIGNvbnZlbmllbmNlIHByb3BlcnR5IGluIGNhc2UgdGhlIHBhcmVudCdzIHByb3RvdHlwZSBpcyBuZWVkZWRcbiAgLy8gbGF0ZXIuXG4gIGNoaWxkLl9fc3VwZXJfXyA9IHBhcmVudC5wcm90b3R5cGU7XG5cbiAgcmV0dXJuIGNoaWxkO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vbG9kYXNoJyk7XG5cbnJlcXVpcmUoJy4vaGVscGVycy9ldmVudCcpOyAvLyBleHRlbmRzIGpRdWVyeSBpdHNlbGZcbnJlcXVpcmUoJy4vdmVuZG9yL2FycmF5LWluY2x1ZGVzJyk7IC8vIHNoaW1zIEVTNyBBcnJheS5wcm90b3R5cGUuaW5jbHVkZXNcblxudmFyIFNpclRyZXZvciA9IHtcblxuICBjb25maWc6IHJlcXVpcmUoJy4vY29uZmlnJyksXG5cbiAgbG9nOiByZXF1aXJlKCcuL3V0aWxzJykubG9nLFxuICBMb2NhbGVzOiByZXF1aXJlKCcuL2xvY2FsZXMnKSxcblxuICBFdmVudEJ1czogcmVxdWlyZSgnLi9ldmVudC1idXMnKSxcblxuICBFZGl0b3JTdG9yZTogcmVxdWlyZSgnLi9leHRlbnNpb25zL3Npci10cmV2b3IuZWRpdG9yLXN0b3JlJyksXG4gIFN1Ym1pdHRhYmxlOiByZXF1aXJlKCcuL2V4dGVuc2lvbnMvc2lyLXRyZXZvci5zdWJtaXR0YWJsZScpLFxuICBGaWxlVXBsb2FkZXI6IHJlcXVpcmUoJy4vZXh0ZW5zaW9ucy9zaXItdHJldm9yLnVwbG9hZGVyJyksXG5cbiAgQmxvY2tNaXhpbnM6IHJlcXVpcmUoJy4vYmxvY2tfbWl4aW5zJyksXG4gIEJsb2NrUG9zaXRpb25lcjogcmVxdWlyZSgnLi9ibG9jay5wb3NpdGlvbmVyJyksXG4gIEJsb2NrUmVvcmRlcjogcmVxdWlyZSgnLi9ibG9jay5yZW9yZGVyJyksXG4gIEJsb2NrRGVsZXRpb246IHJlcXVpcmUoJy4vYmxvY2suZGVsZXRpb24nKSxcbiAgQmxvY2tWYWxpZGF0aW9uczogcmVxdWlyZSgnLi9ibG9jay52YWxpZGF0aW9ucycpLFxuICBCbG9ja1N0b3JlOiByZXF1aXJlKCcuL2Jsb2NrLnN0b3JlJyksXG5cbiAgU2ltcGxlQmxvY2s6IHJlcXVpcmUoJy4vc2ltcGxlLWJsb2NrJyksXG4gIEJsb2NrOiByZXF1aXJlKCcuL2Jsb2NrJyksXG4gIEZvcm1hdHRlcjogcmVxdWlyZSgnLi9mb3JtYXR0ZXInKSxcbiAgRm9ybWF0dGVyczogcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyksXG5cbiAgQmxvY2tzOiByZXF1aXJlKCcuL2Jsb2NrcycpLFxuXG4gIEJsb2NrQ29udHJvbDogcmVxdWlyZSgnLi9ibG9jay1jb250cm9sJyksXG4gIEJsb2NrQ29udHJvbHM6IHJlcXVpcmUoJy4vYmxvY2stY29udHJvbHMnKSxcbiAgRmxvYXRpbmdCbG9ja0NvbnRyb2xzOiByZXF1aXJlKCcuL2Zsb2F0aW5nLWJsb2NrLWNvbnRyb2xzJyksXG5cbiAgRm9ybWF0QmFyOiByZXF1aXJlKCcuL2Zvcm1hdC1iYXInKSxcbiAgRWRpdG9yOiByZXF1aXJlKCcuL2VkaXRvcicpLFxuXG4gIHRvTWFya2Rvd246IHJlcXVpcmUoJy4vdG8tbWFya2Rvd24nKSxcbiAgdG9IVE1MOiByZXF1aXJlKCcuL3RvLWh0bWwnKSxcblxuICBzZXREZWZhdWx0czogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIE9iamVjdC5hc3NpZ24oU2lyVHJldm9yLmNvbmZpZy5kZWZhdWx0cywgb3B0aW9ucyB8fCB7fSk7XG4gIH0sXG5cbiAgZ2V0SW5zdGFuY2U6IGZ1bmN0aW9uKGlkZW50aWZpZXIpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChpZGVudGlmaWVyKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmluc3RhbmNlc1swXTtcbiAgICB9XG5cbiAgICBpZiAoXy5pc1N0cmluZyhpZGVudGlmaWVyKSkge1xuICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmluc3RhbmNlcy5maW5kKGZ1bmN0aW9uKGVkaXRvcikge1xuICAgICAgICByZXR1cm4gZWRpdG9yLklEID09PSBpZGVudGlmaWVyO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY29uZmlnLmluc3RhbmNlc1tpZGVudGlmaWVyXTtcbiAgfSxcblxuICBzZXRCbG9ja09wdGlvbnM6IGZ1bmN0aW9uKHR5cGUsIG9wdGlvbnMpIHtcbiAgICB2YXIgYmxvY2sgPSBTaXJUcmV2b3IuQmxvY2tzW3R5cGVdO1xuXG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYmxvY2spKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgT2JqZWN0LmFzc2lnbihibG9jay5wcm90b3R5cGUsIG9wdGlvbnMgfHwge30pO1xuICB9LFxuXG4gIHJ1bk9uQWxsSW5zdGFuY2VzOiBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBpZiAoU2lyVHJldm9yLkVkaXRvci5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkobWV0aG9kKSkge1xuICAgICAgdmFyIG1ldGhvZEFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgQXJyYXkucHJvdG90eXBlLmZvckVhY2guY2FsbChTaXJUcmV2b3IuY29uZmlnLmluc3RhbmNlcywgZnVuY3Rpb24oaSkge1xuICAgICAgICBpW21ldGhvZF0uYXBwbHkobnVsbCwgbWV0aG9kQXJncyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgU2lyVHJldm9yLmxvZyhcIm1ldGhvZCBkb2Vzbid0IGV4aXN0XCIpO1xuICAgIH1cbiAgfSxcblxufTtcblxuT2JqZWN0LmFzc2lnbihTaXJUcmV2b3IsIHJlcXVpcmUoJy4vZm9ybS1ldmVudHMnKSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBTaXJUcmV2b3I7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBMb2NhbGVzID0ge1xuICAgIGVuOiB7XG4gICAgICAgIGdlbmVyYWw6IHtcbiAgICAgICAgICAgICdkZWxldGUnOiAnRGVsZXRlPycsXG4gICAgICAgICAgICAnZHJvcCc6ICdEcmFnIF9fYmxvY2tfXyBoZXJlJyxcbiAgICAgICAgICAgICdwYXN0ZSc6ICdPciBwYXN0ZSBVUkwgaGVyZScsXG4gICAgICAgICAgICAndXBsb2FkJzogJy4uLm9yIGNob29zZSBhIGZpbGUnLFxuICAgICAgICAgICAgJ2Nsb3NlJzogJ2Nsb3NlJyxcbiAgICAgICAgICAgICdwb3NpdGlvbic6ICdQb3NpdGlvbicsXG4gICAgICAgICAgICAnd2FpdCc6ICdQbGVhc2Ugd2FpdC4uLicsXG4gICAgICAgICAgICAnbGluayc6ICdFbnRlciBhIGxpbmsnXG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgICAgJ3RpdGxlJzogXCJZb3UgaGF2ZSB0aGUgZm9sbG93aW5nIGVycm9yczpcIixcbiAgICAgICAgICAgICd2YWxpZGF0aW9uX2ZhaWwnOiBcIl9fdHlwZV9fIGJsb2NrIGlzIGludmFsaWRcIixcbiAgICAgICAgICAgICdibG9ja19lbXB0eSc6IFwiX19uYW1lX18gbXVzdCBub3QgYmUgZW1wdHlcIixcbiAgICAgICAgICAgICd0eXBlX21pc3NpbmcnOiBcIllvdSBtdXN0IGhhdmUgYSBibG9jayBvZiB0eXBlIF9fdHlwZV9fXCIsXG4gICAgICAgICAgICAncmVxdWlyZWRfdHlwZV9lbXB0eSc6IFwiQSByZXF1aXJlZCBibG9jayB0eXBlIF9fdHlwZV9fIGlzIGVtcHR5XCIsXG4gICAgICAgICAgICAnbG9hZF9mYWlsJzogXCJUaGVyZSB3YXMgYSBwcm9ibGVtIGxvYWRpbmcgdGhlIGNvbnRlbnRzIG9mIHRoZSBkb2N1bWVudFwiXG4gICAgICAgIH0sXG4gICAgICAgIGJsb2Nrczoge1xuICAgICAgICAgICAgdGV4dDoge1xuICAgICAgICAgICAgICAgICd0aXRsZSc6IFwiVGV4dFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbGlzdDoge1xuICAgICAgICAgICAgICAgICd0aXRsZSc6IFwiTGlzdFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVvdGU6IHtcbiAgICAgICAgICAgICAgICAndGl0bGUnOiBcIlF1b3RlXCIsXG4gICAgICAgICAgICAgICAgJ2NyZWRpdF9maWVsZCc6IFwiQ3JlZGl0XCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbWFnZToge1xuICAgICAgICAgICAgICAgICd0aXRsZSc6IFwiSW1hZ2VcIixcbiAgICAgICAgICAgICAgICAndXBsb2FkX2Vycm9yJzogXCJUaGVyZSB3YXMgYSBwcm9ibGVtIHdpdGggeW91ciB1cGxvYWRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZpZGVvOiB7XG4gICAgICAgICAgICAgICAgJ3RpdGxlJzogXCJWaWRlb1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdHdlZXQ6IHtcbiAgICAgICAgICAgICAgICAndGl0bGUnOiBcIlR3ZWV0XCIsXG4gICAgICAgICAgICAgICAgJ2ZldGNoX2Vycm9yJzogXCJUaGVyZSB3YXMgYSBwcm9ibGVtIGZldGNoaW5nIHlvdXIgdHdlZXRcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVtYmVkbHk6IHtcbiAgICAgICAgICAgICAgICAndGl0bGUnOiBcIkVtYmVkbHlcIixcbiAgICAgICAgICAgICAgICAnZmV0Y2hfZXJyb3InOiBcIlRoZXJlIHdhcyBhIHByb2JsZW0gZmV0Y2hpbmcgeW91ciBlbWJlZFwiLFxuICAgICAgICAgICAgICAgICdrZXlfbWlzc2luZyc6IFwiQW4gRW1iZWRseSBBUEkga2V5IG11c3QgYmUgcHJlc2VudFwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGVhZGluZzoge1xuICAgICAgICAgICAgICAgICd0aXRsZSc6IFwiSGVhZGluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdGV4dGltYWdlOiB7XG4gICAgICAgICAgICAgICAgJ3RpdGxlJzogXCJUZXh0IGFuZCBJbWFnZVwiLFxuICAgICAgICAgICAgICAgICdoZWFkaW5nX2ZpZWxkJzogXCJUaXRsZVwiLFxuICAgICAgICAgICAgICAgICdpbWFnZV9hbGlnbic6IFwiSW1hZ2UgQWxpZ25cIlxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuaWYgKHdpbmRvdy5pMThuID09PSB1bmRlZmluZWQgfHwgd2luZG93LmkxOG4uaW5pdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgLy8gTWluaW1hbCBpMThuIHN0dWIgdGhhdCBvbmx5IHJlYWRzIHRoZSBFbmdsaXNoIHN0cmluZ3NcbiAgICB1dGlscy5sb2coXCJVc2luZyBpMThuIHN0dWJcIik7XG4gICAgd2luZG93LmkxOG4gPSB7XG4gICAgICAgIHQ6IGZ1bmN0aW9uIChrZXksIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IGtleS5zcGxpdCgnOicpLCBzdHIsIG9iaiwgcGFydCwgaTtcblxuICAgICAgICAgICAgb2JqID0gTG9jYWxlc1tjb25maWcubGFuZ3VhZ2VdO1xuXG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwYXJ0ID0gcGFydHNbaV07XG5cbiAgICAgICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQob2JqW3BhcnRdKSkge1xuICAgICAgICAgICAgICAgICAgICBvYmogPSBvYmpbcGFydF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzdHIgPSBvYmo7XG5cbiAgICAgICAgICAgIGlmICghXy5pc1N0cmluZyhzdHIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdHIuaW5kZXhPZignX18nKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMob3B0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAob3B0KSB7XG4gICAgICAgICAgICAgICAgICAgIHN0ciA9IHN0ci5yZXBsYWNlKCdfXycgKyBvcHQgKyAnX18nLCBvcHRpb25zW29wdF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gc3RyO1xuICAgICAgICB9XG4gICAgfTtcbn0gZWxzZSB7XG4gICAgdXRpbHMubG9nKFwiVXNpbmcgaTE4bmV4dFwiKTtcbiAgICAvLyBPbmx5IHVzZSBpMThuZXh0IHdoZW4gdGhlIGxpYnJhcnkgaGFzIGJlZW4gbG9hZGVkIGJ5IHRoZSB1c2VyLCBrZWVwc1xuICAgIC8vIGRlcGVuZGVuY2llcyBzbGltXG4gICAgaTE4bi5pbml0KHtcbiAgICAgICAgcmVzU3RvcmU6IExvY2FsZXMsIGZhbGxiYWNrTG5nOiBjb25maWcubGFuZ3VhZ2UsXG4gICAgICAgIG5zOiB7bmFtZXNwYWNlczogWydnZW5lcmFsJywgJ2Jsb2NrcyddLCBkZWZhdWx0TnM6ICdnZW5lcmFsJ31cbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGVzO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuaXNFbXB0eSA9IHJlcXVpcmUoJ2xvZGFzaC5pc2VtcHR5Jyk7XG5leHBvcnRzLmlzRnVuY3Rpb24gPSByZXF1aXJlKCdsb2Rhc2guaXNmdW5jdGlvbicpO1xuZXhwb3J0cy5pc09iamVjdCA9IHJlcXVpcmUoJ2xvZGFzaC5pc29iamVjdCcpO1xuZXhwb3J0cy5pc1N0cmluZyA9IHJlcXVpcmUoJ2xvZGFzaC5pc3N0cmluZycpO1xuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IHJlcXVpcmUoJ2xvZGFzaC5pc3VuZGVmaW5lZCcpO1xuZXhwb3J0cy5yZXN1bHQgPSByZXF1aXJlKCdsb2Rhc2gucmVzdWx0Jyk7XG5leHBvcnRzLnRlbXBsYXRlID0gcmVxdWlyZSgnbG9kYXNoLnRlbXBsYXRlJyk7XG5leHBvcnRzLnVuaXF1ZUlkID0gcmVxdWlyZSgnbG9kYXNoLnVuaXF1ZWlkJyk7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdGFnTmFtZTogJ2RpdicsXG4gIGNsYXNzTmFtZTogJ3Npci10cmV2b3JfX3ZpZXcnLFxuICBhdHRyaWJ1dGVzOiB7fSxcblxuICAkOiBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgIHJldHVybiB0aGlzLiRlbC5maW5kKHNlbGVjdG9yKTtcbiAgfSxcblxuICByZW5kZXI6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGRlc3Ryb3k6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghXy5pc1VuZGVmaW5lZCh0aGlzLnN0b3BMaXN0ZW5pbmcpKSB7IHRoaXMuc3RvcExpc3RlbmluZygpOyB9XG4gICAgdGhpcy4kZWwucmVtb3ZlKCk7XG4gIH0sXG5cbiAgX2Vuc3VyZUVsZW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5lbCkge1xuICAgICAgdmFyIGF0dHJzID0gT2JqZWN0LmFzc2lnbih7fSwgXy5yZXN1bHQodGhpcywgJ2F0dHJpYnV0ZXMnKSksXG4gICAgICBodG1sO1xuICAgICAgaWYgKHRoaXMuaWQpIHsgYXR0cnMuaWQgPSB0aGlzLmlkOyB9XG4gICAgICBpZiAodGhpcy5jbGFzc05hbWUpIHsgYXR0cnNbJ2NsYXNzJ10gPSB0aGlzLmNsYXNzTmFtZTsgfVxuXG4gICAgICBpZiAoYXR0cnMuaHRtbCkge1xuICAgICAgICBodG1sID0gYXR0cnMuaHRtbDtcbiAgICAgICAgZGVsZXRlIGF0dHJzLmh0bWw7XG4gICAgICB9XG4gICAgICB2YXIgJGVsID0gJCgnPCcgKyB0aGlzLnRhZ05hbWUgKyAnPicpLmF0dHIoYXR0cnMpO1xuICAgICAgaWYgKGh0bWwpIHsgJGVsLmh0bWwoaHRtbCk7IH1cbiAgICAgIHRoaXMuX3NldEVsZW1lbnQoJGVsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fc2V0RWxlbWVudCh0aGlzLmVsKTtcbiAgICB9XG4gIH0sXG5cbiAgX3NldEVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICB0aGlzLiRlbCA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy5lbCA9IHRoaXMuJGVsWzBdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG59O1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIF8gPSByZXF1aXJlKCcuL2xvZGFzaCcpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgQmxvY2tSZW9yZGVyID0gcmVxdWlyZSgnLi9ibG9jay5yZW9yZGVyJyk7XG5cbnZhciBTaW1wbGVCbG9jayA9IGZ1bmN0aW9uKGRhdGEsIGluc3RhbmNlX2lkKSB7XG4gIHRoaXMuY3JlYXRlU3RvcmUoZGF0YSk7XG4gIHRoaXMuYmxvY2tJRCA9IF8udW5pcXVlSWQoJ3N0LWJsb2NrLScpO1xuICB0aGlzLmluc3RhbmNlSUQgPSBpbnN0YW5jZV9pZDtcblxuICB0aGlzLl9lbnN1cmVFbGVtZW50KCk7XG4gIHRoaXMuX2JpbmRGdW5jdGlvbnMoKTtcblxuICB0aGlzLmluaXRpYWxpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbk9iamVjdC5hc3NpZ24oU2ltcGxlQmxvY2sucHJvdG90eXBlLCByZXF1aXJlKCcuL2Z1bmN0aW9uLWJpbmQnKSwgcmVxdWlyZSgnLi9ldmVudHMnKSwgcmVxdWlyZSgnLi9yZW5kZXJhYmxlJyksIHJlcXVpcmUoJy4vYmxvY2suc3RvcmUnKSwge1xuXG4gIGZvY3VzIDogZnVuY3Rpb24oKSB7fSxcblxuICB2YWxpZCA6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdHJ1ZTsgfSxcblxuICBjbGFzc05hbWU6ICdzdC1ibG9jaycsXG5cbiAgYmxvY2tfdGVtcGxhdGU6IF8udGVtcGxhdGUoXG4gICAgXCI8ZGl2IGNsYXNzPSdzdC1ibG9ja19faW5uZXInPjwlPSBlZGl0b3JfaHRtbCAlPjwvZGl2PlwiXG4gICksXG5cbiAgYXR0cmlidXRlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICdpZCc6IHRoaXMuYmxvY2tJRCxcbiAgICAgICdkYXRhLXR5cGUnOiB0aGlzLnR5cGUsXG4gICAgICAnZGF0YS1pbnN0YW5jZSc6IHRoaXMuaW5zdGFuY2VJRFxuICAgIH07XG4gIH0sXG5cbiAgdGl0bGU6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB1dGlscy50aXRsZWl6ZSh0aGlzLnR5cGUucmVwbGFjZSgvW1xcV19dL2csICcgJykpO1xuICB9LFxuXG4gIGJsb2NrQ1NTQ2xhc3M6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYmxvY2tDU1NDbGFzcyA9IHV0aWxzLnRvU2x1Zyh0aGlzLnR5cGUpO1xuICAgIHJldHVybiB0aGlzLmJsb2NrQ1NTQ2xhc3M7XG4gIH0sXG5cbiAgdHlwZTogJycsXG5cbiAgJ2NsYXNzJzogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHV0aWxzLmNsYXNzaWZ5KHRoaXMudHlwZSk7XG4gIH0sXG5cbiAgZWRpdG9ySFRNTDogJycsXG5cbiAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7fSxcblxuICBvbkJsb2NrUmVuZGVyOiBmdW5jdGlvbigpe30sXG4gIGJlZm9yZUJsb2NrUmVuZGVyOiBmdW5jdGlvbigpe30sXG5cbiAgX3NldEJsb2NrSW5uZXIgOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZWRpdG9yX2h0bWwgPSBfLnJlc3VsdCh0aGlzLCAnZWRpdG9ySFRNTCcpO1xuXG4gICAgdGhpcy4kZWwuYXBwZW5kKFxuICAgICAgdGhpcy5ibG9ja190ZW1wbGF0ZSh7IGVkaXRvcl9odG1sOiBlZGl0b3JfaHRtbCB9KVxuICAgICk7XG5cbiAgICB0aGlzLiRpbm5lciA9IHRoaXMuJGVsLmZpbmQoJy5zdC1ibG9ja19faW5uZXInKTtcbiAgICB0aGlzLiRpbm5lci5iaW5kKCdjbGljayBtb3VzZW92ZXInLCBmdW5jdGlvbihlKXsgZS5zdG9wUHJvcGFnYXRpb24oKTsgfSk7XG4gIH0sXG5cbiAgcmVuZGVyOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJlZm9yZUJsb2NrUmVuZGVyKCk7XG5cbiAgICB0aGlzLl9zZXRCbG9ja0lubmVyKCk7XG4gICAgdGhpcy5fYmxvY2tQcmVwYXJlKCk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBfYmxvY2tQcmVwYXJlIDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5faW5pdFVJKCk7XG4gICAgdGhpcy5faW5pdE1lc3NhZ2VzKCk7XG5cbiAgICB0aGlzLmNoZWNrQW5kTG9hZERhdGEoKTtcblxuICAgIHRoaXMuJGVsLmFkZENsYXNzKCdzdC1pdGVtLXJlYWR5Jyk7XG4gICAgdGhpcy5vbihcIm9uUmVuZGVyXCIsIHRoaXMub25CbG9ja1JlbmRlcik7XG4gICAgdGhpcy5zYXZlKCk7XG4gIH0sXG5cbiAgX3dpdGhVSUNvbXBvbmVudDogZnVuY3Rpb24oY29tcG9uZW50LCBjbGFzc05hbWUsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy4kdWkuYXBwZW5kKGNvbXBvbmVudC5yZW5kZXIoKS4kZWwpO1xuICAgIGlmIChjbGFzc05hbWUgJiYgY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuJHVpLm9uKCdjbGljaycsIGNsYXNzTmFtZSwgY2FsbGJhY2spO1xuICAgIH1cbiAgfSxcblxuICBfaW5pdFVJIDogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHVpX2VsZW1lbnQgPSAkKFwiPGRpdj5cIiwgeyAnY2xhc3MnOiAnc3QtYmxvY2tfX3VpJyB9KTtcbiAgICB0aGlzLiRpbm5lci5hcHBlbmQodWlfZWxlbWVudCk7XG4gICAgdGhpcy4kdWkgPSB1aV9lbGVtZW50O1xuICAgIHRoaXMuX2luaXRVSUNvbXBvbmVudHMoKTtcbiAgfSxcblxuICBfaW5pdE1lc3NhZ2VzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgbXNnc19lbGVtZW50ID0gJChcIjxkaXY+XCIsIHsgJ2NsYXNzJzogJ3N0LWJsb2NrX19tZXNzYWdlcycgfSk7XG4gICAgdGhpcy4kaW5uZXIucHJlcGVuZChtc2dzX2VsZW1lbnQpO1xuICAgIHRoaXMuJG1lc3NhZ2VzID0gbXNnc19lbGVtZW50O1xuICB9LFxuXG4gIGFkZE1lc3NhZ2U6IGZ1bmN0aW9uKG1zZywgYWRkaXRpb25hbENsYXNzKSB7XG4gICAgdmFyICRtc2cgPSAkKFwiPHNwYW4+XCIsIHsgaHRtbDogbXNnLCAnY2xhc3MnOiBcInN0LW1zZyBcIiArIGFkZGl0aW9uYWxDbGFzcyB9KTtcbiAgICB0aGlzLiRtZXNzYWdlcy5hcHBlbmQoJG1zZylcbiAgICAuYWRkQ2xhc3MoJ3N0LWJsb2NrX19tZXNzYWdlcy0taXMtdmlzaWJsZScpO1xuICAgIHJldHVybiAkbXNnO1xuICB9LFxuXG4gIHJlc2V0TWVzc2FnZXM6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuJG1lc3NhZ2VzLmh0bWwoJycpXG4gICAgLnJlbW92ZUNsYXNzKCdzdC1ibG9ja19fbWVzc2FnZXMtLWlzLXZpc2libGUnKTtcbiAgfSxcblxuICBfaW5pdFVJQ29tcG9uZW50czogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fd2l0aFVJQ29tcG9uZW50KG5ldyBCbG9ja1Jlb3JkZXIodGhpcy4kZWwpKTtcbiAgfVxuXG59KTtcblxuU2ltcGxlQmxvY2suZm4gPSBTaW1wbGVCbG9jay5wcm90b3R5cGU7XG5cbi8vIEFsbG93IG91ciBCbG9jayB0byBiZSBleHRlbmRlZC5cblNpbXBsZUJsb2NrLmV4dGVuZCA9IHJlcXVpcmUoJy4vaGVscGVycy9leHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBTaW1wbGVCbG9jaztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vbG9kYXNoJyk7XG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obWFya2Rvd24sIHR5cGUpIHtcblxuICAvLyBEZWZlcnJpbmcgcmVxdWlyaW5nIHRoZXNlIHRvIHNpZGVzdGVwIGEgY2lyY3VsYXIgZGVwZW5kZW5jeTpcbiAgLy8gQmxvY2sgLT4gdGhpcyAtPiBCbG9ja3MgLT4gQmxvY2tcbiAgdmFyIEJsb2NrcyA9IHJlcXVpcmUoJy4vYmxvY2tzJyk7XG4gIHZhciBGb3JtYXR0ZXJzID0gcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyk7XG5cbiAgLy8gTUQgLT4gSFRNTFxuICB0eXBlID0gdXRpbHMuY2xhc3NpZnkodHlwZSk7XG5cbiAgdmFyIGh0bWwgPSBtYXJrZG93bixcbiAgICAgIHNob3VsZFdyYXAgPSB0eXBlID09PSBcIlRleHRcIjtcblxuICBpZihfLmlzVW5kZWZpbmVkKHNob3VsZFdyYXApKSB7IHNob3VsZFdyYXAgPSBmYWxzZTsgfVxuXG4gIGlmIChzaG91bGRXcmFwKSB7XG4gICAgaHRtbCA9IFwiPGRpdj5cIiArIGh0bWw7XG4gIH1cblxuICBodG1sID0gaHRtbC5yZXBsYWNlKC9cXFsoW15cXF1dKylcXF1cXCgoW15cXCldKylcXCkvZ20sZnVuY3Rpb24obWF0Y2gsIHAxLCBwMil7XG4gICAgcmV0dXJuIFwiPGEgaHJlZj0nXCIrcDIrXCInPlwiK3AxLnJlcGxhY2UoL1xccj9cXG4vZywgJycpK1wiPC9hPlwiO1xuICB9KTtcblxuICAvLyBUaGlzIG1heSBzZWVtIGNyYXp5LCBidXQgYmVjYXVzZSBKUyBkb2Vzbid0IGhhdmUgYSBsb29rIGJlaGluZCxcbiAgLy8gd2UgcmV2ZXJzZSB0aGUgc3RyaW5nIHRvIHJlZ2V4IG91dCB0aGUgaXRhbGljIGl0ZW1zIChhbmQgYm9sZClcbiAgLy8gYW5kIGxvb2sgZm9yIHNvbWV0aGluZyB0aGF0IGRvZXNuJ3Qgc3RhcnQgKG9yIGVuZCBpbiB0aGUgcmV2ZXJzZWQgc3RyaW5ncyBjYXNlKVxuICAvLyB3aXRoIGEgc2xhc2guXG4gIGh0bWwgPSB1dGlscy5yZXZlcnNlKFxuICAgICAgICAgICB1dGlscy5yZXZlcnNlKGh0bWwpXG4gICAgICAgICAgIC5yZXBsYWNlKC9fKD8hXFxcXCkoKF9cXFxcfFteX10pKilfKD89JHxbXlxcXFxdKS9nbSwgZnVuY3Rpb24obWF0Y2gsIHAxKSB7XG4gICAgICAgICAgICAgIHJldHVybiBcIj5pLzxcIisgcDEucmVwbGFjZSgvXFxyP1xcbi9nLCAnJykucmVwbGFjZSgvW1xcc10rJC8sJycpICtcIj5pPFwiO1xuICAgICAgICAgICB9KVxuICAgICAgICAgICAucmVwbGFjZSgvXFwqXFwqKD8hXFxcXCkoKFxcKlxcKlxcXFx8W15cXCpcXCpdKSopXFwqXFwqKD89JHxbXlxcXFxdKS9nbSwgZnVuY3Rpb24obWF0Y2gsIHAxKXtcbiAgICAgICAgICAgICAgcmV0dXJuIFwiPmIvPFwiKyBwMS5yZXBsYWNlKC9cXHI/XFxuL2csICcnKS5yZXBsYWNlKC9bXFxzXSskLywnJykgK1wiPmI8XCI7XG4gICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcblxuICBodG1sID0gIGh0bWwucmVwbGFjZSgvXlxcPiAoLispJC9tZyxcIiQxXCIpO1xuXG4gIC8vIFVzZSBjdXN0b20gZm9ybWF0dGVycyB0b0hUTUwgZnVuY3Rpb25zIChpZiBhbnkgZXhpc3QpXG4gIHZhciBmb3JtYXROYW1lLCBmb3JtYXQ7XG4gIGZvcihmb3JtYXROYW1lIGluIEZvcm1hdHRlcnMpIHtcbiAgICBpZiAoRm9ybWF0dGVycy5oYXNPd25Qcm9wZXJ0eShmb3JtYXROYW1lKSkge1xuICAgICAgZm9ybWF0ID0gRm9ybWF0dGVyc1tmb3JtYXROYW1lXTtcbiAgICAgIC8vIERvIHdlIGhhdmUgYSB0b0hUTUwgZnVuY3Rpb24/XG4gICAgICBpZiAoIV8uaXNVbmRlZmluZWQoZm9ybWF0LnRvSFRNTCkgJiYgXy5pc0Z1bmN0aW9uKGZvcm1hdC50b0hUTUwpKSB7XG4gICAgICAgIGh0bWwgPSBmb3JtYXQudG9IVE1MKGh0bWwpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFVzZSBjdXN0b20gYmxvY2sgdG9IVE1MIGZ1bmN0aW9ucyAoaWYgYW55IGV4aXN0KVxuICB2YXIgYmxvY2s7XG4gIGlmIChCbG9ja3MuaGFzT3duUHJvcGVydHkodHlwZSkpIHtcbiAgICBibG9jayA9IEJsb2Nrc1t0eXBlXTtcbiAgICAvLyBEbyB3ZSBoYXZlIGEgdG9IVE1MIGZ1bmN0aW9uP1xuICAgIGlmICghXy5pc1VuZGVmaW5lZChibG9jay5wcm90b3R5cGUudG9IVE1MKSAmJiBfLmlzRnVuY3Rpb24oYmxvY2sucHJvdG90eXBlLnRvSFRNTCkpIHtcbiAgICAgIGh0bWwgPSBibG9jay5wcm90b3R5cGUudG9IVE1MKGh0bWwpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChzaG91bGRXcmFwKSB7XG4gICAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXFxyP1xcblxccj9cXG4vZ20sIFwiPC9kaXY+PGRpdj48YnI+PC9kaXY+PGRpdj5cIik7XG4gICAgaHRtbCA9IGh0bWwucmVwbGFjZSgvXFxyP1xcbi9nbSwgXCI8L2Rpdj48ZGl2PlwiKTtcbiAgfVxuXG4gIGh0bWwgPSBodG1sLnJlcGxhY2UoL1xcdC9nLCBcIiZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwO1wiKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHI/XFxuL2csIFwiPGJyPlwiKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9cXCpcXCovLCBcIlwiKVxuICAgICAgICAgICAgIC5yZXBsYWNlKC9fXy8sIFwiXCIpOyAgLy8gQ2xlYW51cCBhbnkgbWFya2Rvd24gY2hhcmFjdGVycyBsZWZ0XG5cbiAgLy8gUmVwbGFjZSBlc2NhcGVkXG4gIGh0bWwgPSBodG1sLnJlcGxhY2UoL1xcXFxcXCovZywgXCIqXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXFsvZywgXCJbXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXF0vZywgXCJdXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXF8vZywgXCJfXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXCgvZywgXCIoXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXCkvZywgXCIpXCIpXG4gICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcXC0vZywgXCItXCIpO1xuXG4gIGlmIChzaG91bGRXcmFwKSB7XG4gICAgaHRtbCArPSBcIjwvZGl2PlwiO1xuICB9XG5cbiAgcmV0dXJuIGh0bWw7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBfID0gcmVxdWlyZSgnLi9sb2Rhc2gnKTtcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNvbnRlbnQsIHR5cGUpIHtcblxuICAvLyBEZWZlcnJpbmcgcmVxdWlyaW5nIHRoZXNlIHRvIHNpZGVzdGVwIGEgY2lyY3VsYXIgZGVwZW5kZW5jeTpcbiAgLy8gQmxvY2sgLT4gdGhpcyAtPiBCbG9ja3MgLT4gQmxvY2tcbiAgdmFyIEJsb2NrcyA9IHJlcXVpcmUoJy4vYmxvY2tzJyk7XG4gIHZhciBGb3JtYXR0ZXJzID0gcmVxdWlyZSgnLi9mb3JtYXR0ZXJzJyk7XG5cbiAgdHlwZSA9IHV0aWxzLmNsYXNzaWZ5KHR5cGUpO1xuXG4gIHZhciBtYXJrZG93biA9IGNvbnRlbnQ7XG5cbiAgLy9Ob3JtYWxpc2Ugd2hpdGVzcGFjZVxuICBtYXJrZG93biA9IG1hcmtkb3duLnJlcGxhY2UoLyZuYnNwOy9nLFwiIFwiKTtcblxuICAvLyBGaXJzdCBvZiBhbGwsIHN0cmlwIGFueSBhZGRpdGlvbmFsIGZvcm1hdHRpbmdcbiAgLy8gTVNXb3JkLCBJJ20gbG9va2luZyBhdCB5b3UsIHB1bmsuXG4gIG1hcmtkb3duID0gbWFya2Rvd24ucmVwbGFjZSgvKCBjbGFzcz0oXCIpP01zb1thLXpBLVpdKyhcIik/KS9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88IS0tKC4qPyktLT4vZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwvXFwqKC4qPylcXCpcXC8vZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPChcXC8pKihtZXRhfGxpbmt8c3BhbnxcXFxcP3htbDp8c3QxOnxvOnxmb250KSguKj8pPi9naSwgJycpO1xuXG4gIHZhciBiYWRUYWdzID0gWydzdHlsZScsICdzY3JpcHQnLCAnYXBwbGV0JywgJ2VtYmVkJywgJ25vZnJhbWVzJywgJ25vc2NyaXB0J10sXG4gICAgICB0YWdTdHJpcHBlciwgaTtcblxuICBmb3IgKGkgPSAwOyBpPCBiYWRUYWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdGFnU3RyaXBwZXIgPSBuZXcgUmVnRXhwKCc8JytiYWRUYWdzW2ldKycuKj8nK2JhZFRhZ3NbaV0rJyguKj8pPicsICdnaScpO1xuICAgIG1hcmtkb3duID0gbWFya2Rvd24ucmVwbGFjZSh0YWdTdHJpcHBlciwgJycpO1xuICB9XG5cbiAgLy8gRXNjYXBlIGFueXRoaW5nIGluIGhlcmUgdGhhdCAqY291bGQqIGJlIGNvbnNpZGVyZWQgYXMgTURcbiAgLy8gTWFya2Rvd24gY2hhcnMgd2UgY2FyZSBhYm91dDogKiBbXSBfICgpIC1cbiAgbWFya2Rvd24gPSBtYXJrZG93bi5yZXBsYWNlKC9cXCovZywgXCJcXFxcKlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxbL2csIFwiXFxcXFtcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXS9nLCBcIlxcXFxdXCIpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXF8vZywgXCJcXFxcX1wiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwoL2csIFwiXFxcXChcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcKS9nLCBcIlxcXFwpXCIpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC0vZywgXCJcXFxcLVwiKTtcblxuICB2YXIgaW5saW5lVGFncyA9IFtcImVtXCIsIFwiaVwiLCBcInN0cm9uZ1wiLCBcImJcIl07XG5cbiAgZm9yIChpID0gMDsgaTwgaW5saW5lVGFncy5sZW5ndGg7IGkrKykge1xuICAgIHRhZ1N0cmlwcGVyID0gbmV3IFJlZ0V4cCgnPCcraW5saW5lVGFnc1tpXSsnPjxicj48LycraW5saW5lVGFnc1tpXSsnPicsICdnaScpO1xuICAgIG1hcmtkb3duID0gbWFya2Rvd24ucmVwbGFjZSh0YWdTdHJpcHBlciwgJzxicj4nKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VCb2xkcyhtYXRjaCwgcDEsIHAyKXtcbiAgICBpZihfLmlzVW5kZWZpbmVkKHAyKSkgeyBwMiA9ICcnOyB9XG4gICAgcmV0dXJuIFwiKipcIiArIHAxLnJlcGxhY2UoLzwoLik/YnIoLik/Pi9nLCAnJykgKyBcIioqXCIgKyBwMjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlcGxhY2VJdGFsaWNzKG1hdGNoLCBwMSwgcDIpe1xuICAgIGlmKF8uaXNVbmRlZmluZWQocDIpKSB7IHAyID0gJyc7IH1cbiAgICByZXR1cm4gXCJfXCIgKyBwMS5yZXBsYWNlKC88KC4pP2JyKC4pPz4vZywgJycpICsgXCJfXCIgKyBwMjtcbiAgfVxuXG4gIG1hcmtkb3duID0gbWFya2Rvd24ucmVwbGFjZSgvPChcXHcrKSg/OlxccytcXHcrPVwiW15cIl0rKD86XCJcXCRbXlwiXStcIlteXCJdKyk/XCIpKj5cXHMqPFxcL1xcMT4vZ2ltLCAnJykgLy9FbXB0eSBlbGVtZW50c1xuICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXG4vbWcsXCJcIilcbiAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvPGEuKj9ocmVmPVtcIlwiJ10oLio/KVtcIlwiJ10uKj8+KC4qPyk8XFwvYT4vZ2ltLCBmdW5jdGlvbihtYXRjaCwgcDEsIHAyKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIltcIiArIHAyLnRyaW0oKS5yZXBsYWNlKC88KC4pP2JyKC4pPz4vZywgJycpICsgXCJdKFwiKyBwMSArXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgICAgfSkgLy8gSHlwZXJsaW5rc1xuICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88c3Ryb25nPig/OlxccyopKC4qPykoXFxzKSo/PFxcL3N0cm9uZz4vZ2ltLCByZXBsYWNlQm9sZHMpXG4gICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLzxiPig/OlxccyopKC4qPykoXFxzKik/PFxcL2I+L2dpbSwgcmVwbGFjZUJvbGRzKVxuICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88ZW0+KD86XFxzKikoLio/KShcXHMqKT88XFwvZW0+L2dpbSwgcmVwbGFjZUl0YWxpY3MpXG4gICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLzxpPig/OlxccyopKC4qPykoXFxzKik/PFxcL2k+L2dpbSwgcmVwbGFjZUl0YWxpY3MpO1xuXG5cbiAgLy8gVXNlIGN1c3RvbSBmb3JtYXR0ZXJzIHRvTWFya2Rvd24gZnVuY3Rpb25zIChpZiBhbnkgZXhpc3QpXG4gIHZhciBmb3JtYXROYW1lLCBmb3JtYXQ7XG4gIGZvcihmb3JtYXROYW1lIGluIEZvcm1hdHRlcnMpIHtcbiAgICBpZiAoRm9ybWF0dGVycy5oYXNPd25Qcm9wZXJ0eShmb3JtYXROYW1lKSkge1xuICAgICAgZm9ybWF0ID0gRm9ybWF0dGVyc1tmb3JtYXROYW1lXTtcbiAgICAgIC8vIERvIHdlIGhhdmUgYSB0b01hcmtkb3duIGZ1bmN0aW9uP1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKGZvcm1hdC50b01hcmtkb3duKSAmJiBfLmlzRnVuY3Rpb24oZm9ybWF0LnRvTWFya2Rvd24pKSB7XG4gICAgICAgIG1hcmtkb3duID0gZm9ybWF0LnRvTWFya2Rvd24obWFya2Rvd24pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIERvIG91ciBnZW5lcmljIHN0cmlwcGluZyBvdXRcbiAgbWFya2Rvd24gPSBtYXJrZG93bi5yZXBsYWNlKC8oW148Pl0rKSg8ZGl2PikvZyxcIiQxXFxuJDJcIikgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBEaXZpdGlzIHN0eWxlIGxpbmUgYnJlYWtzIChoYW5kbGUgdGhlIGZpcnN0IGxpbmUpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC88ZGl2PjxkaXY+L2csJ1xcbjxkaXY+JykgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIF4gKGRvdWJsZSBvcGVuaW5nIGRpdnMgd2l0aCBvbmUgY2xvc2UgZnJvbSBDaHJvbWUpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oPzo8ZGl2PikoW148Pl0rKSg/OjxkaXY+KS9nLFwiJDFcXG5cIikgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXiAoaGFuZGxlIG5lc3RlZCBkaXZzIHRoYXQgc3RhcnQgd2l0aCBjb250ZW50KVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKD86PGRpdj4pKD86PGJyPik/KFtePD5dKykoPzo8YnI+KT8oPzo8XFwvZGl2PikvZyxcIiQxXFxuXCIpICAgICAgICAvLyBeIChoYW5kbGUgY29udGVudCBpbnNpZGUgZGl2cylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLzxcXC9wPi9nLFwiXFxuXFxuXCIpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQIHRhZ3MgYXMgbGluZSBicmVha3NcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLzwoLik/YnIoLik/Pi9nLFwiXFxuXCIpICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IG5vcm1hbCBsaW5lIGJyZWFrc1xuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJmx0Oy9nLFwiPFwiKS5yZXBsYWNlKC8mZ3Q7L2csXCI+XCIpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuY29kaW5nXG5cbiAgLy8gVXNlIGN1c3RvbSBibG9jayB0b01hcmtkb3duIGZ1bmN0aW9ucyAoaWYgYW55IGV4aXN0KVxuICB2YXIgYmxvY2s7XG4gIGlmIChCbG9ja3MuaGFzT3duUHJvcGVydHkodHlwZSkpIHtcbiAgICBibG9jayA9IEJsb2Nrc1t0eXBlXTtcbiAgICAvLyBEbyB3ZSBoYXZlIGEgdG9NYXJrZG93biBmdW5jdGlvbj9cbiAgICBpZiAoIV8uaXNVbmRlZmluZWQoYmxvY2sucHJvdG90eXBlLnRvTWFya2Rvd24pICYmIF8uaXNGdW5jdGlvbihibG9jay5wcm90b3R5cGUudG9NYXJrZG93bikpIHtcbiAgICAgIG1hcmtkb3duID0gYmxvY2sucHJvdG90eXBlLnRvTWFya2Rvd24obWFya2Rvd24pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFN0cmlwIHJlbWFpbmluZyBIVE1MXG4gIGlmIChjb25maWcuZGVmYXVsdHMudG9NYXJrZG93bi5hZ2dyZXNpdmVIVE1MU3RyaXApIHtcbiAgICBtYXJrZG93biA9IG1hcmtkb3duLnJlcGxhY2UoLzxcXC8/W14+XSsoPnwkKS9nLCBcIlwiKTtcbiAgfSBlbHNlIHtcbiAgICBtYXJrZG93biA9IG1hcmtkb3duLnJlcGxhY2UoLzwoPz1cXFMpXFwvP1tePl0rKD58JCkvaWcsIFwiXCIpO1xuICB9XG5cbiAgcmV0dXJuIG1hcmtkb3duO1xufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgXyA9IHJlcXVpcmUoJy4vbG9kYXNoJyk7XG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcblxudmFyIHVybFJlZ2V4ID0gL14oPzooW0EtWmEtel0rKTopPyhcXC97MCwzfSkoWzAtOS5cXC1BLVphLXpdKykoPzo6KFxcZCspKT8oPzpcXC8oW14/I10qKSk/KD86XFw/KFteI10qKSk/KD86IyguKikpPyQvO1xuXG52YXIgdXRpbHMgPSB7XG4gIGxvZzogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKGNvbnNvbGUpICYmIGNvbmZpZy5kZWJ1Zykge1xuICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcbiAgICB9XG4gIH0sXG5cbiAgaXNVUkkgOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICByZXR1cm4gKHVybFJlZ2V4LnRlc3Qoc3RyaW5nKSk7XG4gIH0sXG5cbiAgdGl0bGVpemU6IGZ1bmN0aW9uKHN0cil7XG4gICAgaWYgKHN0ciA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICBzdHIgID0gU3RyaW5nKHN0cikudG9Mb3dlckNhc2UoKTtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoLyg/Ol58XFxzfC0pXFxTL2csIGZ1bmN0aW9uKGMpeyByZXR1cm4gYy50b1VwcGVyQ2FzZSgpOyB9KTtcbiAgfSxcblxuICBjbGFzc2lmeTogZnVuY3Rpb24oc3RyKXtcbiAgICByZXR1cm4gdXRpbHMudGl0bGVpemUoU3RyaW5nKHN0cikucmVwbGFjZSgvW1xcV19dL2csICcgJykpLnJlcGxhY2UoL1xccy9nLCAnJyk7XG4gIH0sXG5cbiAgY2FwaXRhbGl6ZSA6IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBzdHJpbmcuc3Vic3RyaW5nKDEpLnRvTG93ZXJDYXNlKCk7XG4gIH0sXG5cbiAgdW5kZXJzY29yZWQ6IGZ1bmN0aW9uKHN0cil7XG4gICAgcmV0dXJuIHN0ci50cmltKCkucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSspL2csICckMV8kMicpXG4gICAgLnJlcGxhY2UoL1stXFxzXSsvZywgJ18nKS50b0xvd2VyQ2FzZSgpO1xuICB9LFxuXG4gIHJldmVyc2U6IGZ1bmN0aW9uKHN0cikge1xuICAgIHJldHVybiBzdHIuc3BsaXQoXCJcIikucmV2ZXJzZSgpLmpvaW4oXCJcIik7XG4gIH0sXG5cbiAgdG9TbHVnOiBmdW5jdGlvbihzdHIpIHtcbiAgICByZXR1cm4gc3RyXG4gICAgLnRvTG93ZXJDYXNlKClcbiAgICAucmVwbGFjZSgvW15cXHcgXSsvZywnJylcbiAgICAucmVwbGFjZSgvICsvZywnLScpO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8ganNoaW50IGZyZWV6ZTogZmFsc2VcblxuaWYgKCFbXS5pbmNsdWRlcykge1xuICBBcnJheS5wcm90b3R5cGUuaW5jbHVkZXMgPSBmdW5jdGlvbihzZWFyY2hFbGVtZW50IC8qLCBmcm9tSW5kZXgqLyApIHtcbiAgICBpZiAodGhpcyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHRoaXMgdmFsdWUgdG8gb2JqZWN0Jyk7XG4gICAgfVxuICAgIHZhciBPID0gT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW4gPSBwYXJzZUludChPLmxlbmd0aCkgfHwgMDtcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBuID0gcGFyc2VJbnQoYXJndW1lbnRzWzFdKSB8fCAwO1xuICAgIHZhciBrO1xuICAgIGlmIChuID49IDApIHtcbiAgICAgIGsgPSBuO1xuICAgIH0gZWxzZSB7XG4gICAgICBrID0gbGVuICsgbjtcbiAgICAgIGlmIChrIDwgMCkge1xuICAgICAgICBrID0gMDtcbiAgICAgIH1cbiAgICB9XG4gICAgd2hpbGUgKGsgPCBsZW4pIHtcbiAgICAgIHZhciBjdXJyZW50RWxlbWVudCA9IE9ba107XG4gICAgICBpZiAoc2VhcmNoRWxlbWVudCA9PT0gY3VycmVudEVsZW1lbnQgfHxcbiAgICAgICAgIChzZWFyY2hFbGVtZW50ICE9PSBzZWFyY2hFbGVtZW50ICYmIGN1cnJlbnRFbGVtZW50ICE9PSBjdXJyZW50RWxlbWVudCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICBrKys7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfTtcbn1cbiJdfQ==
