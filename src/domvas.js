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

    function fixNamespace(element) {
        if (element instanceof SVGElement)
            element.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    function processClone(clone, original) {
        fixNamespace(clone);
        copyCss(original, clone);
    }

    function deepClone(node, done) {
        var clone = node.cloneNode(false);
        processClone(clone, node);
        var children = node.children;
        if (children.length === 0) done(clone);
        var clonedChildren = 0;
        for (var i = 0; i < children.length; i++) {
            (function (child) {
                deepClone(child, function (childClone) {
                    clone.appendChild(childClone);
                    clonedChildren++;
                    if (clonedChildren === children.length) done(clone);
                });
            })(children[i])
        }
    }

    function stripMargin(elem) {
        elem.style.margin = elem.style.marginLeft = elem.style.marginTop = elem.style.marginBottom = elem.style.marginRight = '';
    }

    function toImage(domNode, callback, width, height, left, top) {
        left = (left || 0);
        top = (top || 0);

        width = ((width || domNode.offsetWidth) + left);
        height = ((height || domNode.offsetHeight) + top);

        deepClone(domNode, function (elem) {
            stripMargin(elem);
            elem.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

            var serialized = new XMLSerializer().serializeToString(elem);

            var dataUri = "data:image/svg+xml;charset=utf-8," +
                "<svg xmlns='http://www.w3.org/2000/svg' " +
                "width='" + width + "' height='" + height + "'>" +
                "<foreignObject width='100%' height='100%' x='" + left + "' y='" + top + "'>"
                + serialized +
                "</foreignObject>" +
                "</svg>";

            dataUri = dataUri.replace(/#/g, '%23');

            var img = new Image();

            img.onload = function () {
                if (callback) {
                    callback.call(img, img);
                }
            };
            img.src = dataUri;
        });
    }

    global.domvas = {
        toImage: toImage
    };
})(this);
