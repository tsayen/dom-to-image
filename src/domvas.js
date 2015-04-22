(function (global) {
    "use strict";

    function copyCss(source, target) {
        var sourceStyle = global.window.getComputedStyle(source);

        if (sourceStyle.cssText) {
            target.style.cssText = sourceStyle.cssText;
            return;
        }
        
        for (var i = 0; i < sourceStyle.length; i++) {
            var propertyName = sourceStyle[i];
            target.style.setProperty(
                propertyName,
                sourceStyle.getPropertyValue(propertyName),
                sourceStyle.getPropertyPriority(propertyName)
            );
        }
    }

    function inlineStyles(elem, origElem) {

        var children = elem.querySelectorAll('*');
        var origChildren = origElem.querySelectorAll('*');

        // copy the current style to the clone
        copyCss(origElem, elem);

        // collect all nodes within the element, copy the current style to the clone
        Array.prototype.forEach.call(children, function (child, i) {
            copyCss(origChildren[i], child);
        });

        // strip margins from the outer element
        elem.style.margin = elem.style.marginLeft = elem.style.marginTop = elem.style.marginBottom = elem.style.marginRight = '';

    }

    function init() {
        return {
            toImage: function (origElem, callback, width, height, left, top) {

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
                img.onload = function () {
                    if (callback) {
                        callback.call(img, img);
                    }
                };
            }
        };
    }

    global.domvas = init();
})(this);

