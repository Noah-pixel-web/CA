import {Point} from '../geometry/Point';
import * as Util from '../core/Util';
import Browser from '../core/Browser';
import {addPointerListener, removePointerListener} from './DomEvent.Pointer';
import {addDoubleTapListener, removeDoubleTapListener} from './DomEvent.DoubleTap';
import {getScale} from './DomUtil';

/*
 * @namespace DomEvent
 * Utility functions to work with the DOM events, used by Leaflet internally.
 */

export function on(obj, types, fn, context) {

	if (types && typeof types === 'object') {
		for (var type in types) {
			addOne(obj, type, types[type], fn);
		}
	} else {
		types = Util.splitWords(types);

		for (var i = 0, len = types.length; i < len; i++) {
			addOne(obj, types[i], fn, context);
		}
	}

	return this;
}

var eventsKey = '_leaflet_events';

export function off(obj, types, fn, context) {

	if (arguments.length === 1) {
		batchRemove(obj);
		delete obj[eventsKey];

	} else if (types && typeof types === 'object') {
		for (var type in types) {
			removeOne(obj, type, types[type], fn);
		}

	} else {
		types = Util.splitWords(types);

		if (arguments.length === 2) {
			batchRemove(obj, function (type) {
				return Util.indexOf(types, type) !== -1;
			});
		} else {
			for (var i = 0, len = types.length; i < len; i++) {
				removeOne(obj, types[i], fn, context);
			}
		}
	}

	return this;
}

function batchRemove(obj, filterFn) {
	for (var id in obj[eventsKey]) {
		var type = id.split(/\d/)[0];
		if (!filterFn || filterFn(type)) {
			removeOne(obj, type, null, null, id);
		}
	}
}

var mouseSubst = {
	mouseenter: 'mouseover',
	mouseleave: 'mouseout',
	wheel: !('onwheel' in window) && 'mousewheel'
};

function addOne(obj, type, fn, context) {
	var id = type + Util.stamp(fn) + (context ? '_' + Util.stamp(context) : '');

	if (obj[eventsKey] && obj[eventsKey][id]) { return this; }

	var handler = function (e) {
		return fn.call(context || obj, e || window.event);
	};

	var originalHandler = handler;

	if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
		handler = addPointerListener(obj, type, handler);

	} else if (Browser.touch && (type === 'dblclick')) {
		handler = addDoubleTapListener(obj, handler);

	} else if ('addEventListener' in obj) {

		if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' ||  type === 'mousewheel') {
			obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? {passive: false} : false);

		} else if (type === 'mouseenter' || type === 'mouseleave') {
			handler = function (e) {
				e = e || window.event;
				if (isExternalTarget(obj, e)) {
					originalHandler(e);
				}
			};
			obj.addEventListener(mouseSubst[type], handler, false);

		} else {
			obj.addEventListener(type, originalHandler, false);
		}

	} else {
		obj.attachEvent('on' + type, handler);
	}

	obj[eventsKey] = obj[eventsKey] || {};
	obj[eventsKey][id] = handler;
}

function removeOne(obj, type, fn, context, id) {
	id = id || type + Util.stamp(fn) + (context ? '_' + Util.stamp(context) : '');
	var handler = obj[eventsKey] && obj[eventsKey][id];

	if (!handler) { return this; }

	if (!Browser.touchNative && Browser.pointer && type.indexOf('touch') === 0) {
		removePointerListener(obj, type, handler);

	} else if (Browser.touch && (type === 'dblclick')) {
		removeDoubleTapListener(obj, handler);

	} else if ('removeEventListener' in obj) {

		obj.removeEventListener(mouseSubst[type] || type, handler, false);

	} else {
		obj.detachEvent('on' + type, handler);
	}

	obj[eventsKey][id] = null;
}

export function stopPropagation(e) {

	if (e.stopPropagation) {
		e.stopPropagation();
	} else if (e.originalEvent) {
		e.originalEvent._stopped = true;
	} else {
		e.cancelBubble = true;
	}

	return this;
}

export function preventDefault(e) {
	if (e.preventDefault) {
		e.preventDefault();
	} else {
		e.returnValue = false;
	}
	return this;
}

export function stop(e) {
	preventDefault(e);
	stopPropagation(e);
	return this;
}

export function getMousePosition(e, container) {
	if (!container) {
		return new Point(e.clientX, e.clientY);
	}

	var scale = getScale(container),
	    offset = scale.boundingClientRect;

	return new Point(
		(e.clientX - offset.left) / scale.x - container.clientLeft,
		(e.clientY - offset.top) / scale.y - container.clientTop
	);
}

export function getWheelDelta(e) {
	return (Browser.edge) ? e.wheelDeltaY / 2 :
	       (e.deltaY && e.deltaMode === 0) ? -e.deltaY / window.devicePixelRatio :
	       e.wheelDelta ? (e.wheelDeltaY || e.wheelDelta) / 2 :
	       0;
}

export function isExternalTarget(el, e) {

	var related = e.relatedTarget;

	if (!related) { return true; }

	try {
		while (related && (related !== el)) {
			related = related.parentNode;
		}
	} catch (err) {
		return false;
	}
	return (related !== el);
}

export {on as addListener};
export {off as removeListener};
