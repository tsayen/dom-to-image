"use strict";

(function() {

	var supportsCSSText = getComputedStyle(document.body).cssText !== "";

	function copyCSS(elem, origElem, log) {

		var computedStyle = getComputedStyle(origElem);

		if(supportsCSSText) {
			elem.style.cssText = computedStyle.cssText;

		} else {

			// Really, Firefox?
			for(var prop in computedStyle) {
				if(isNaN(parseInt(prop, 10)) && typeof computedStyle[prop] !== 'function' && !(/^(cssText|length|parentRule)$/).test(prop)) {
					elem.style[prop] = computedStyle[prop];
				}
			}

		}

	}

	function inlineStyles(elem, origElem) {

		var children = elem.querySelectorAll('*');
		var origChildren = origElem.querySelectorAll('*');

		// copy the current style to the clone
		copyCSS(elem, origElem, 1);

		// collect all nodes within the element, copy the current style to the clone
		Array.prototype.forEach.call(children, function(child, i) {
			copyCSS(child, origChildren[i]);
		});

		// strip margins from the outer element
		elem.style.margin = elem.style.marginLeft = elem.style.marginTop = elem.style.marginBottom = elem.style.marginRight = '';

	}

	window.domvas = {

		toImage: function(origElem, callback, width, height, left, top) {

			left = (left || 0);
			top = (top || 0);

			var elem = origElem.cloneNode(true);

			// inline all CSS (ugh..)
			inlineStyles(elem, origElem);

			// unfortunately, SVG can only eat well formed XHTML
			elem.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

			// serialize the DOM node to a String
			var serialized = new XMLSerializer().serializeToString(elem);

			// Create well formed data URL with our DOM string wrapped in SVG
			var dataUri = "data:image/svg+xml," +
				"<svg xmlns='http://www.w3.org/2000/svg' width='" + ((width || origElem.offsetWidth) + left) + "' height='" + ((height || origElem.offsetHeight) + top) + "'>" +
					"<foreignObject width='100%' height='100%' x='" + left + "' y='" + top + "'>" +
					serialized +
					"</foreignObject>" +
				"</svg>";

			// create new, actual image
			var img = new Image();
			img.src = dataUri;

			// when loaded, fire onload callback with actual image node
			img.onload = function() {
				if(callback) {
					callback.call(this, this);
				}
			};

		}

	};

})();

