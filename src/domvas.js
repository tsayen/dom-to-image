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

    function fixNamespace(element) {
        if (element instanceof SVGElement)
            element.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        else
            element.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    }

    function processClone(clone, original) {
        fixNamespace(clone);
        copyStyle(original, clone);
    }

    function deepClone(node, done) {
        var clone = node.cloneNode(false);
        processClone(clone, node);

        var children = node.children;
        if (children.length === 0) done(clone);

        var cloned = 0;
        for (var i = 0; i < children.length; i++) {
            cloneChild(children[i]);
        }

        function cloneChild(child) {
            setTimeout(function () {
                deepClone(child, function (childClone) {
                    clone.appendChild(childClone);
                    cloned++;
                    if (cloned === children.length) done(clone);
                });
            }, 0);
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

    function serialize(element) {
        return escape(new XMLSerializer().serializeToString(element));
    }

    function asForeignObject(node) {
        return "<foreignObject x='0' y='0' width='100%' height='100%'>" + serialize(node) + "</foreignObject>";
    }

    function toSvg(node, width, height) {
        return "<svg xmlns='http://www.w3.org/2000/svg' width='" + width + "' height='" + height + "'>"
            + asForeignObject(node) +
            "</svg>";
    }

    function makeDataUri(node, width, height) {
        return "data:image/svg+xml;charset=utf-8," + toSvg(node, width, height);
    }

    function makeImage(node, width, height, done) {
        var img = new Image();
        img.onload = function () {
            done(img);
        };
        img.src = makeDataUri(stripMargin(node), width, height);
    }

    function toImage(domNode, done) {
        deepClone(domNode, function (clone) {
            makeImage(clone, domNode.offsetWidth, domNode.offsetHeight, done);
        });
    }

    global.domvas = {
        toImage: toImage
    };
})(this);
