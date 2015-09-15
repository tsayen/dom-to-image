(function (global) {
    "use strict";

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

    function makeImage(node, width, height, done) {
        var image = new Image();
        image.onload = function () {
            done(image);
        };
        image.src = makeDataUri(stripMargin(node), width, height);
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

        return new Promise(function (resolve, reject) {
            cloneNode(domNode, function (clone) {
                embedFonts(clone)
                    .then(function (node) {
                        makeImage(node, domNode.scrollWidth, domNode.scrollHeight, resolve);
                    });
            }, options.filter);
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
            resourceLoader: resourceLoader,
            webFontRule: webFontRule
        }
    };
})(this);
