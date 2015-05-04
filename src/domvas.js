(function (global) {
    "use strict";

    function copyCss(source, target) {
        var sourceStyle = global.window.getComputedStyle(source);
        
        if(target.tagName === 'svg' || target.tagName === 'path'){
            target.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

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

                width = ((width || origElem.offsetWidth) + left);
                height = ((height || origElem.offsetHeight) + top);

                var elem = origElem.cloneNode(true);

                //console.log('inlining styles ' + new Date().toString());

                // inline all CSS (ugh..)
                inlineStyles(elem, origElem);

                // unfortunately, SVG can only eat well formed XHTML
                elem.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

                //console.log('serializing ' + new Date().toString());
                // serialize the DOM node to a String
                var serialized = new XMLSerializer().serializeToString(elem);

                //console.log('done');
                //console.log('serialized ' + new Date().toString());

                //console.log(serialized.length);
                //console.log(serialized);

                var dataUri = "data:image/svg+xml;charset=utf-8," +
                    "<svg xmlns='http://www.w3.org/2000/svg' " +
                    "width='" + width + "' height='" + height + "'>" +
                    "<foreignObject width='100%' height='100%' x='" + left + "' y='" + top + "'>"
                    + serialized +
                    "</foreignObject>" +
                    "</svg>";
                
                //dataUri = dataUri.replace(/#/g,'%23');

                //console.log(dataUri);

                var img = new Image();
                //document.body.appendChild(img);

                // when loaded, fire onload callback with actual image node
                img.onload = function () {
                    if (callback) {
                        callback.call(img, img);
                    }
                };
                img.src = dataUri;
            }
        };
    }

    global.domvas = init();
})(this);
