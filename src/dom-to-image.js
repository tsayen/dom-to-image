(function (global) {
    "use strict";

    function copyProperties(style, node) {
        for (var i = 0; i < style.length; i++) {
            var propertyName = style[i];
            node.style.setProperty(
                propertyName,
                style.getPropertyValue(propertyName),
                style.getPropertyPriority(propertyName)
            );
        }
    }

    function copyStyle(source, target) {
        var sourceStyle = global.window.getComputedStyle(source);
        if (sourceStyle.cssText) {
            target.style.cssText = sourceStyle.cssText;
            return;
        }
        copyProperties(sourceStyle, target);
    }

    function fixNamespace(node) {
        if (node instanceof SVGElement)
            node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    function processClone(clone, original) {
        fixNamespace(clone);
        if (clone instanceof Element)
            copyStyle(original, clone);
    }

    function cloneNode(node, done, filter) {
        if (filter && !filter(node)) {
            done(null);
            return;
        }

        var clone = node.cloneNode(false);

        processClone(clone, node);

        var children = node.childNodes;
        if (children.length === 0) {
            done(clone);
            return;
        }

        var cloned = 0;
        for (var i = 0; i < children.length; i++) {
            cloneChild(children[i]);
        }

        function cloneChild(child) {
            cloneNode(child, function (childClone) {
                if (childClone)
                    clone.appendChild(childClone);
                cloned++;
                if (cloned === children.length) done(clone);
            }, filter);
        }
    }

    function stripMargin(node) {
        var style = node.style;
        style.margin = style.marginLeft = style.marginTop = style.marginBottom = style.marginRight = '';
        return node;
    }

    function escape(xmlString) {
        return xmlString.replace(/#/g, '%23');
    }

    function serialize(node) {
        node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        return escape(new XMLSerializer().serializeToString(node));
    }

    function asForeignObject(node) {
        return "<foreignObject x='0' y='0' width='100%' height='100%'>" + serialize(node) + "</foreignObject>";
    }

    function toSvg(node, width, height) {
        return "<svg xmlns='http://www.w3.org/2000/svg' width='" + width + "' height='" + height + "'>" +
            asForeignObject(node) + "</svg>";
    }

    function makeDataUri(node, width, height) {
        return "data:image/svg+xml;charset=utf-8," + toSvg(node, width, height);
    }

    function makeImage(node, width, height, done) {
        var image = new Image();
        image.onload = function () {
            done(image);
        };
        image.src = makeDataUri(stripMargin(node), width, height);
    }

    function toImage(domNode, done, options) {
        options = options || {};
        cloneNode(domNode, function (clone) {
            makeImage(clone, domNode.scrollWidth, domNode.scrollHeight, done);
        }, options.filter);
    }

    function drawOffScreen(domNode, done, options) {
        toImage(domNode, function (image) {
            var canvas = document.createElement('canvas');
            canvas.width = domNode.scrollWidth;
            canvas.height = domNode.scrollHeight;
            canvas.getContext('2d').drawImage(image, 0, 0);
            done(canvas);
        }, options);
    }

    function toBlob(domNode, done, options) {
        drawOffScreen(domNode, function (canvas) {
            if (canvas.toBlob) {
                canvas.toBlob(done);
                return;
            }
            /* canvas.toBlob() method is not available in Chrome 40 */
            var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
            var binaryArray = new Uint8Array(binaryString.length);
            for (var i = 0; i < binaryString.length; i++) {
                binaryArray[i] = binaryString.charCodeAt(i);
            }
            done(new Blob([binaryArray], {type: 'image/png'}));
        }, options);
    }

    function toDataUrl(domNode, done, options) {
        drawOffScreen(domNode, function (canvas) {
            done(canvas.toDataURL());
        }, options);
    }

    global.domtoimage = {
        toImage: toImage,
        toDataUrl: toDataUrl,
        toBlob: toBlob
    };
})(this);
