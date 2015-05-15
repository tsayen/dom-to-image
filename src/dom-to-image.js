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

    function cloneNode(node, done) {
        var clone = node.cloneNode(false);

        processClone(clone, node);

        var children = node.childNodes;
        if (children.length === 0) done(clone);

        var cloned = 0;
        for (var i = 0; i < children.length; i++) {
            cloneChild(children[i]);
        }

        function cloneChild(child) {
            cloneNode(child, function (childClone) {
                clone.appendChild(childClone);
                cloned++;
                if (cloned === children.length) done(clone);
            });
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

    function extractSources(rule) {
        var sources = {};
        var propertyValue = rule.style.getPropertyValue('src');
        propertyValue.split(/,\s*/).forEach(function (src) {
            var url = /url\("?(.*?)"?\)\s+format\("?(.*?)"?\)/.exec(src);
            if (url) sources[url[1]] = url[2];
        });
        return sources;
    }

    function getWebFontRules(document) {
        var styleSheets = document.styleSheets;
        var result = {};
        for (var i = 0; i < styleSheets.length; i++) {
            var rules = styleSheets[i].cssRules;
            for (var r = 0; r < rules.length; r++) {
                var rule = rules[r];
                if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
                var sources = extractSources(rule);
                if (Object.keys(sources).length > 0) {
                    var family = rule.style.getPropertyValue('font-family').replace(/"/g, '');
                    result[family] = {
                        cssText: rule.style.cssText,
                        sources: sources
                    };
                }
            }
        }
        return result;
    }

    function getWebFont(url, done) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'blob';
        request.onload = function () {
            if (this.status != 200) return;
            var encoder = new FileReader();
            encoder.onloadend = function () {
                done(encoder.result.split(/,/)[1]);
            };
            encoder.readAsDataURL(request.response);
        };
        request.send();
    }

    function createFontFaceRule(webFontRule, fontByUrl) {
        var result = webFontRule.cssText;
        Object.keys(fontByUrl).forEach(function (url) {
            var urlRegex = new RegExp('url\\("?' + escape(url) + '"?\\)', 'g');
            var encodedFont = fontByUrl[url];
            var fontType = webFontRule.sources[url];
            var dataUrl = 'url("data:font/' + fontType + ';base64,' + encodedFont + '")';
            result = result.replace(urlRegex, dataUrl);
        });
        return '@font-face {' + result + '}';

        function escape(string) {
            return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
        }
    }

    function fetchFonts(family, done) {
        var fontByUrl = {};
        var urls = family.sources;
        var fetched = 0;
        urls.forEach(function (url) {
            getWebFont(url, function (font) {
                fontByUrl[url] = font;
                fetched++;
                if (fetched === urls.length) done(fontByUrl);
            })
        });
    }

    function embedFonts(node, done) {
        var style = '';
        var webFontRules = getWebFontRules(document);
        console.log(JSON.stringify(webFontRules));
        var families = Object.keys(webFontRules);
        if (families.length === 0) done();
        var fetched = 0;
        console.log(families);
        families.forEach(function (family) {
            fetchFonts(webFontRules[family], function (fontByUrl) {
                fetched++;
                style += createFontFaceRule(webFontRules[family], fontByUrl);
                if (fetched === families.length) {
                    var styleNode = document.createElement('style');
                    styleNode.type = 'text/css';
                    styleNode.appendChild(document.createTextNode(style));
                    node.appendChild(styleNode);
                    done();
                }
            });
        });
    }

    function toImage(domNode, done) {
        cloneNode(domNode, function (clone) {
            // embedFonts(clone, function () {
            makeImage(clone, domNode.offsetWidth, domNode.offsetHeight, done);
            // });
        });
    }

    function drawOffScreen(domNode, done) {
        toImage(domNode, function (image) {
            var canvas = document.createElement('canvas');
            canvas.width = domNode.offsetWidth;
            canvas.height = domNode.offsetHeight;
            canvas.getContext('2d').drawImage(image, 0, 0);
            done(canvas);
        });
    }

    function toBlob(domNode, done) {
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
            done(new Blob([binaryArray], {
                type: 'image/png'
            }));
        });
    }

    function toDataUrl(domNode, done) {
        drawOffScreen(domNode, function (canvas) {
            done(canvas.toDataURL());
        });
    }

    var resourceLoader = {
        load: function (url) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'blob';

            return new Promise(function (resolve, reject) {
                request.onload = function () {
                    if (this.status != 200) {
                        reject(new Error('Cannot fetch resource "' + url + '": ' + this.status));
                        return;
                    }
                    var encoder = new FileReader();
                    encoder.onloadend = function () {
                        resolve(encoder.result.split(/,/)[1]);
                    };
                    encoder.readAsDataURL(request.response);
                };
                request.send();
            });
        }
    }


    global.domtoimage = {
        toImage: toImage,
        toDataUrl: toDataUrl,
        toBlob: toBlob,
        impl: {
            getWebFontRules: getWebFontRules,
            getWebFont: getWebFont,
            createFontFaceRule: createFontFaceRule,
            resourceLoader: resourceLoader
        }
    };
})(this);
