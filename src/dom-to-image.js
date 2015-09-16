(function (global) {
    "use strict";

    var uid = (function () {
        var lastIndex = 0;

        /* see http://stackoverflow.com/a/6248722/2519373 */
        function uid() {
            return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
        }

        function next() {
            return 'u' + uid() + lastIndex++;
        }

        return {
            next: next
        };
    })();

    var resourceLoader = {
        load: function (url) {
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
                        resolve(encoder.result.split(/,/)[1]);
                    };
                    encoder.readAsDataURL(request.response);
                };
                request.send();
            });
        }
    };

    var webFontRule = (function () {

        function resolve(url, baseUrl) {
            var doc = global.document.implementation.createHTMLDocument();
            var base = doc.createElement('base');
            doc.head.appendChild(base);
            var a = doc.createElement('a');
            doc.body.appendChild(a);
            base.href = baseUrl;
            a.href = url;
            return a.href;
        }

        function extractUrls(cssRule, baseUrl) {
            var sources = {};
            var propertyValue = cssRule.style.getPropertyValue('src');
            propertyValue.split(/,\s*/)
                .forEach(function (src) {
                    var url = /url\(['"]?([^\?"]+)\??.*?['"]?\)\s+format\(['"]?(.*?)['"]?\)/.exec(src);
                    if (url) sources[resolve(url[1], baseUrl)] = url[2];
                });
            return sources;
        }

        function tryRead(cssRule, baseUrl) {
            if (cssRule.type !== CSSRule.FONT_FACE_RULE) return null;
            var urls = extractUrls(cssRule, baseUrl);
            if (Object.keys(urls)
                .length === 0) return null;

            return createRule({
                name: function () {
                    return cssRule.style.getPropertyValue('font-family')
                        .replace(/"/g, '');
                },
                urls: function () {
                    return urls;
                },
                cssText: function () {
                    return cssRule.style.cssText;
                }
            });
        }

        function verifyStylesLoaded() {
            var sheets = document.querySelectorAll('link[rel=stylesheet]');
            var loaded = [];

            function add(sheet) {
                loaded.push(new Promise(function (resolve) {
                    sheet.onload = resolve;
                }));
            }
            for (var s = 0; s < sheets.length; s++) {
                add(sheets[s]);
            }
            return Promise.all(loaded);
        }

        function readAll(document) {
            return verifyStylesLoaded()
                .then(function () {
                    var styleSheets = document.styleSheets;
                    var webFontRules = {};
                    for (var i = 0; i < styleSheets.length; i++) {
                        var cssRules = styleSheets[i].cssRules;
                        for (var r = 0; r < cssRules.length; r++) {
                            var webFontRule = tryRead(cssRules[r], styleSheets[i].href);
                            if (webFontRule)
                                webFontRules[webFontRule.data().name()] = webFontRule;
                        }
                    }

                    return {
                        embedAll: function (names, resourceProvider) {
                            var jobs = names.map(function (name) {
                                return webFontRules[name].embed(resourceProvider || resourceLoader);
                            });
                            return Promise.all(jobs)
                                .then(function (results) {
                                    return results.join('\n');
                                });
                        },
                        rules: function () {
                            return webFontRules;
                        }
                    };
                });
        }

        function createRule(data) {

            function asRegex(url) {
                function escape(string) {
                    return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
                }

                return new RegExp('url\\([\'"]?' + escape(url) + '\??.*?[\'"]?\\)', 'g');
            }

            function asDataUrl(fontType, encodedFont) {
                return 'url("data:font/' + fontType + ';base64,' + encodedFont + '")';
            }

            function embed(resourceLoader) {
                return new Promise(function (resolve, reject) {
                    var result = data.cssText();
                    var jobs = [];
                    var fontUrls = data.urls();
                    Object.keys(fontUrls)
                        .forEach(function (url) {
                            jobs.push(
                                resourceLoader.load(url)
                                .then(function (encodedFont) {
                                    result = result.replace(asRegex(url), asDataUrl(fontUrls[url], encodedFont));
                                })
                                .catch(function (error) {
                                    reject(error);
                                })
                            );
                        });

                    Promise.all(jobs)
                        .then(function () {
                            resolve('@font-face {' + result + '}');
                        });
                });
            }

            return {
                data: function () {
                    return data;
                },
                embed: embed
            };
        }

        return {
            readAll: readAll,
            impl: {
                createRule: createRule,
                extractUrls: extractUrls
            }
        };
    })();

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

    function copyStyle(style, node) {
        if (style.cssText)
            node.style.cssText = style.cssText;
        else
            copyProperties(style, node);
    }

    function cloneElementStyle(nodes) {
        var style = global.window.getComputedStyle(nodes.original);
        copyStyle(style, nodes.clone);
        return nodes;
    }

    function formatCssText(style) {
        return style.cssText + ' content:' + style.getPropertyValue('content') + ';';
    }

    function formatCssProperties(style) {
        var lines = [];
        var count = style.length;
        for (var i = 0; i < count; i++) {
            var name = style[i];
            var line = name + ': ' + style.getPropertyValue(name);
            if (style.getPropertyPriority(name)) line += ' !important';
            lines.push(line);
        }
        return lines.join(';') + ';';
    }

    function getStyleAsTextNode(className, element, style) {
        var selector = '.' + className + ':' + element;
        var cssText = style.cssText ? formatCssText(style) : formatCssProperties(style);
        return global.document.createTextNode(selector + '{' + cssText + '}');
    }

    function processPseudoElement(nodes, element) {
        var style = global.window.getComputedStyle(nodes.original, element);
        var content = style.getPropertyValue('content');
        if (!content || content === 'none') return nodes;

        var className = uid.next();

        nodes.clone.className = nodes.clone.className + ' ' + className;

        var styleElement = global.document.createElement('style');
        styleElement.appendChild(getStyleAsTextNode(className, element, style));
        nodes.clone.appendChild(styleElement);

        return nodes;
    }

    function clonePseudoElementStyle(nodes) {
        [':before', ':after'].forEach(function (element) {
            processPseudoElement(nodes, element);
        });
        return nodes;
    }

    function cloneStyle(nodes) {
        return Promise.resolve(nodes)
            .then(cloneElementStyle)
            .then(clonePseudoElementStyle);
    }

    function fixNamespace(nodes) {
        if (nodes.clone instanceof SVGElement)
            nodes.clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        return nodes;
    }

    function processClone(clone, original) {
        if (!(clone instanceof Element)) return clone;

        return Promise.resolve({
                clone: clone,
                original: original
            })
            .then(fixNamespace)
            .then(cloneStyle)
            .then(function (nodes) {
                return nodes.clone;
            });
    }

    function cloneChildren(clone, original, filter) {
        var children = original.childNodes;
        var childrenCount = children.length;

        if (childrenCount === 0) return Promise.resolve(clone);

        var done = Promise.resolve();

        function cloneChild(child) {
            done = done
                .then(function () {
                    return cloneNode(child, filter);
                })
                .then(function (childClone) {
                    if (childClone) clone.appendChild(childClone);
                });
        }

        for (var i = 0; i < childrenCount; i++)
            cloneChild(children[i]);

        return done.then(function () {
            return clone;
        });
    }

    function cloneNode(original, filter) {
        if (filter && !filter(original)) return Promise.resolve();

        return Promise.resolve()
            .then(function () {
                return original.cloneNode(false);
            })
            .then(function (clone) {
                return cloneChildren(clone, original, filter);
            })
            .then(function (clone) {
                return processClone(clone, original);
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
        return escape(new XMLSerializer()
            .serializeToString(node));
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
        return webFontRule.readAll(document)
            .then(function (cssRules) {
                // console.log('css rules');
                return cssRules.embedAll(Object.keys(cssRules.rules()));
            })
            .then(function (cssText) {
                var root = document.createElement('div');

                var styleNode = document.createElement('style');
                styleNode.type = 'text/css';
                styleNode.appendChild(document.createTextNode(cssText));
                root.appendChild(styleNode);
                root.appendChild(node);
                // console.log(cssText);
                return root;
            });
    }

    function drawOffScreen(domNode, options) {
        return toImage(domNode, options)
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

        return cloneNode(domNode, options.filter)
            // .then(embedFonts)
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
            .then(function (canvas) {
                if (canvas.toBlob)
                    return new Promise(function (resolve) {
                        canvas.toBlob(resolve);
                    });
                /* canvas.toBlob() method is not available in Chrome */
                return (function (canvas) {
                    var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
                    var binaryArray = new Uint8Array(binaryString.length);

                    for (var i = 0; i < binaryString.length; i++) {
                        binaryArray[i] = binaryString.charCodeAt(i);
                    }

                    return new Blob([binaryArray], {
                        type: 'image/png'
                    });
                })(canvas);
            });
    }

    global.domtoimage = {
        toImage: toImage,
        toDataUrl: toDataUrl,
        toBlob: toBlob,
        impl: {
            webFontRule: webFontRule,
            util: {
                uid: uid,
                resourceLoader: resourceLoader
            }
        }
    };
})(this);
