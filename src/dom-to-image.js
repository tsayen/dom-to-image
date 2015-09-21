(function (global) {
    "use strict";

    var util = (function () {

        function toBlob(canvas) {
            return new Promise(function (resolve) {
                var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
                var length = binaryString.length;
                var binaryArray = new Uint8Array(length);

                for (var i = 0; i < length; i++)
                    binaryArray[i] = binaryString.charCodeAt(i);

                resolve(new Blob([binaryArray], {
                    type: 'image/png'
                }));
            });
        }

        function canvasToBlob(canvas) {
            if (canvas.toBlob)
                return new Promise(function (resolve) {
                    canvas.toBlob(resolve);
                });

            return toBlob(canvas);
        }

        function resolveUrl(url, baseUrl) {
            var doc = global.document.implementation.createHTMLDocument();
            var base = doc.createElement('base');
            doc.head.appendChild(base);
            var a = doc.createElement('a');
            doc.body.appendChild(a);
            base.href = baseUrl;
            a.href = url;
            return a.href;
        }

        var uid = (function () {
            var index = 0;

            function uid() {
                /* see http://stackoverflow.com/a/6248722/2519373 */
                return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
            }

            function next() {
                return 'u' + uid() + index++;
            }

            return {
                next: next
            };
        })();

        function getAndEncode(url, type) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'blob';

            return new Promise(function (resolve, reject) {
                request.onload = function () {
                    if (this.status !== 200) {
                        reject(new Error('Cannot fetch resource "' + url + '": ' + this.status));
                        return;
                    }
                    var encoder = new FileReader();
                    encoder.onloadend = function () {
                        var content = encoder.result.split(/,/)[1];
                        resolve(decorateDataUrl(content, type));
                    };
                    encoder.readAsDataURL(request.response);
                };
                request.send();
            });
        }

        var mimeType = {
            'woff': 'application/x-font-woff',
            'woff2': 'application/x-font-woff2',
            'truetype': 'application/x-font-ttf',
            'ttf': 'application/x-font-ttf',
            'opentype': 'application/x-font-otf',
            'embedded-opentype': 'application/x-font-otf'
        };

        function decorateDataUrl(content, type) {
            return 'url("data:' + mimeType[type] + ';base64,' + content + '")';
        }

        var fontUrl = /url\(['"]?([^\?'"]+?)(?:\?.*?)?['"]?\)\s+format\(['"]?(.*?)['"]?\)/;

        function hasFontUrl(str) {
            return str.search(fontUrl) !== -1;
        }

        function parseFontUrls(src) {
            var regexp = new RegExp(fontUrl.source, 'g');
            var result = [];
            var url;
            while ((url = regexp.exec(src)) !== null) {
                result.push({
                    url: url[1],
                    format: url[2]
                });
            }
            return result;
        }

        function escape(string) {
            return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
        }

        function fontUrlAsRegex(url) {
            return new RegExp('url\\([\'"]?' + escape(url) + '(?:\\?.*?)?[\'"]?\\)', 'g');
        }

        function isDataUrl(url) {
            return url.search(/^(data:)/) !== -1;
        }

        function delay(ms) {
            return function (arg) {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve(arg);
                    }, ms);
                });
            };
        }

        function asArray(arrayLike) {
            var array = [];
            var length = arrayLike.length;
            for (var i = 0; i < length; i++) array.push(arrayLike[i]);
            return array;
        }

        return {
            canvasToBlob: canvasToBlob,
            resolveUrl: resolveUrl,
            getAndEncode: getAndEncode,
            uid: uid.next,
            hasFontUrl: hasFontUrl,
            parseFontUrls: parseFontUrls,
            fontUrlAsRegex: fontUrlAsRegex,
            decorateDataUrl: decorateDataUrl,
            isDataUrl: isDataUrl,
            delay: delay,
            asArray: asArray
        };
    })();

    var fontFaces = (function () {

        function selectWebFontRules(cssRules) {
            return cssRules
                .filter(function (rule) {
                    return rule.type === CSSRule.FONT_FACE_RULE;
                })
                .filter(function (rule) {
                    return util.hasFontUrl(rule.style.getPropertyValue('src'));
                });
        }

        function getCssRules(styleSheets) {
            var cssRules = [];
            styleSheets.forEach(function (sheet) {
                util.asArray(sheet.cssRules).forEach(cssRules.push.bind(cssRules));
            });
            return cssRules;
        }

        function readAll() {
            return Promise.resolve(util.asArray(document.styleSheets))
                .then(getCssRules)
                .then(selectWebFontRules)
                .then(function (rules) {
                    return rules.map(newWebFont);
                });
        }

        function newWebFont(webFontRule) {

            function readUrls() {
                return util.parseFontUrls(webFontRule.style.getPropertyValue('src'))
                    .filter(function (fontUrl) {
                        return !util.isDataUrl(fontUrl.url);
                    });
            }

            function resourceUrl(fontUrl) {
                var baseUrl = webFontRule.parentStyleSheet.href;
                return baseUrl ? util.resolveUrl(fontUrl.url, baseUrl) : fontUrl.url;
            }

            function resolve(loadResource) {
                loadResource = loadResource || util.getAndEncode;

                var cssText = webFontRule.cssText;

                var resolved = readUrls()
                    .map(function (fontUrl) {
                        return loadResource(resourceUrl(fontUrl), fontUrl.format)
                            .then(function (encodedFont) {
                                cssText = cssText.replace(util.fontUrlAsRegex(fontUrl.url), encodedFont);
                            });
                    });

                return Promise.all(resolved).then(function () {
                    return cssText;
                });
            }

            return {
                resolve: resolve,
                src: function () {
                    return webFontRule.style.getPropertyValue('src');
                }
            };
        }

        function resolveAll() {
            return readAll(document)
                .then(function (webFonts) {
                    return Promise.all(
                        webFonts.map(function (webFont) {
                            return webFont.resolve();
                        })
                    );
                })
                .then(function (cssStrings) {
                    return cssStrings.join('\n');
                });
        }

        return {
            readAll: readAll,
            resolveAll: resolveAll
        };
    })();

    function copyProperties(source, target) {
        util.asArray(source).forEach(function (name) {
            target.setProperty(
                name,
                source.getPropertyValue(name),
                source.getPropertyPriority(name)
            );
        });
    }

    function copyStyle(source, target) {
        if (source.cssText)
            target.cssText = source.cssText;
        else
            copyProperties(source, target);
    }

    function cloneStyle(pair) {
        var style = global.window.getComputedStyle(pair.source);
        copyStyle(style, pair.target.style);
        return pair;
    }

    function formatCssText(style) {
        var content = style.getPropertyValue('content');
        return style.cssText + ' content: ' + content + ';';
    }

    function formatCssProperties(style) {
        var result = util.asArray(style)
            .map(function (name) {
                return name + ': ' +
                    style.getPropertyValue(name) +
                    (style.getPropertyPriority(name) ? ' !important' : '');
            })
            .join('; ') + ';';
        return result;
    }

    function formatPseudoElementStyle(className, element, style) {
        var selector = '.' + className + ':' + element;
        var cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
        return global.document.createTextNode(selector + '{' + cssText + '}');
    }

    function clonePseudoElement(pair, element) {
        var style = global.window.getComputedStyle(pair.source, element);
        var content = style.getPropertyValue('content');

        if (content === '' || content === 'none') return pair;

        var className = util.uid();

        pair.target.className = pair.target.className + ' ' + className;

        var styleElement = global.document.createElement('style');
        styleElement.appendChild(formatPseudoElementStyle(className, element, style));
        pair.target.appendChild(styleElement);

        return pair;
    }

    function clonePseudoElements(pair) {
        [':before', ':after'].forEach(function (element) {
            clonePseudoElement(pair, element);
        });
        return pair;
    }

    function fixNamespace(node) {
        if (node instanceof SVGElement)
            node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return node;
    }

    function processClone(original, clone) {
        if (!(clone instanceof Element)) return clone;

        return Promise.resolve({
                source: original,
                target: clone
            })
            .then(cloneStyle)
            .then(clonePseudoElements)
            .then(function (pair) {
                return pair.target;
            })
            .then(fixNamespace);
    }

    function cloneOneByOne(parent, children, filter) {
        var done = Promise.resolve();
        children.forEach(function (child) {
            done = done
                .then(function () {
                    return cloneNode(child, filter);
                })
                .then(function (childClone) {
                    if (childClone) parent.appendChild(childClone);
                });
        });
        return done;
    }

    function cloneChildren(original, clone, filter) {
        var children = original.childNodes;
        if (children.length === 0) return Promise.resolve(clone);

        return cloneOneByOne(clone, util.asArray(children), filter)
            .then(function () {
                return clone;
            });
    }

    function cloneNode(node, filter) {
        if (filter && !filter(node)) return Promise.resolve();

        return Promise.resolve()
            .then(function () {
                return node.cloneNode(false);
            })
            .then(function (clone) {
                return cloneChildren(node, clone, filter);
            })
            .then(function (clone) {
                return processClone(node, clone);
            });
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

    function makeImage(node, width, height) {
        return new Promise(function (resolve) {
            var image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.src = makeDataUri(stripMargin(node), width, height);
        });
    }

    function embedFonts(node) {
        return fontFaces.resolveAll()
            .then(function (cssText) {
                var root = document.createElement('div');
                var styleNode = document.createElement('style');
                node.appendChild(styleNode);
                styleNode.appendChild(document.createTextNode(cssText));
                return node;
            });
    }

    function drawOffScreen(domNode, options) {
        return toImage(domNode, options)
            .then(util.delay(100))
            .then(function (image) {
                var canvas = document.createElement('canvas');
                canvas.width = domNode.scrollWidth;
                canvas.height = domNode.scrollHeight;
                canvas.getContext('2d').drawImage(image, 0, 0);
                return canvas;
            });
    }

    function toImage(domNode, options) {
        options = options || {};

        return Promise.resolve()
            .then(function () {
                return cloneNode(domNode, options.filter);
            })
            .then(embedFonts)
            .then(function (node) {
                return makeImage(node, domNode.scrollWidth, domNode.scrollHeight);
            });
    }

    function toDataUrl(domNode, options) {
        return drawOffScreen(domNode, options)
            .then(function (canvas) {
                return canvas.toDataURL();
            });
    }

    function toBlob(domNode, options) {
        return drawOffScreen(domNode, options)
            .then(util.canvasToBlob);
    }

    global.domtoimage = {
        toImage: toImage,
        toDataUrl: toDataUrl,
        toBlob: toBlob,
        impl: {
            fontFaces: fontFaces,
            util: util
        }
    };
})(this);
