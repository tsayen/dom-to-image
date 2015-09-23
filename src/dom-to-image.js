(function (global) {
    "use strict";

    var util = (function () {

        const MIME = {
            'woff': 'application/x-font-woff',
            'woff2': 'application/x-font-woff2',
            'truetype': 'application/x-font-ttf',
            'ttf': 'application/x-font-ttf',
            'opentype': 'application/x-font-otf',
            'embedded-opentype': 'application/x-font-otf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif'
        };

        function parseExtension(url) {
            var match = /\.([^\./]*?)$/g.exec(url);
            if (match) return match[1];
            else return '';
        }

        function mime(url){
            var extension = parseExtension(url).toLowerCase();
            return MIME[extension] || '';
        }

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

        function makeImage(uri) {
            return new Promise(function (resolve, reject) {
                var image = new Image();
                image.onload = function () {
                    resolve(image);
                };
                image.onerror = reject;
                image.src = uri;
            });
        }

        function getAndEncode(url) {
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
                        resolve(content);
                    };
                    encoder.readAsDataURL(request.response);
                };
                request.send();
            });
        }

        function getFont(url, type) {
            return getAndEncode(url)
                .then(function (data) {
                    return dataAsFontUrl(data, type);
                });
        }

        function extension(url) {
            var ext = /\.(.+)$/g.exec(url);
            if (ext) return ext[1] || '';
            return '';
        }

        function getImage(url, get) {
            get = get || getAndEncode;
            var ext = extension(url).toLowerCase();
            return get(url)
                .then(function (data) {
                    return dataAsUrl(data, mimeType[ext] || 'image');
                });
        }

        var mimeType = {
            'woff': 'application/x-font-woff',
            'woff2': 'application/x-font-woff2',
            'truetype': 'application/x-font-ttf',
            'ttf': 'application/x-font-ttf',
            'opentype': 'application/x-font-otf',
            'embedded-opentype': 'application/x-font-otf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif'
        };

        function dataAsUrl(content, type) {
            return 'data:' + type + ';base64,' + content;
        }

        function dataAsFontUrl(content, type) {
            return 'url("' + dataAsUrl(content, mimeType[type]) + '")';
        }

        var fontUrlRegex = /url\(['"]?([^\?'"]+?)(?:\?.*?)?['"]?\)\s+format\(['"]?(.*?)['"]?\)/;

        function hasFontUrl(str) {
            return str.search(fontUrlRegex) !== -1;
        }

        function parseFontUrls(src) {
            var regexp = new RegExp(fontUrlRegex.source, 'g');
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

        var urlRegex = /url\(['"]?([^'"]+?)?['"]?\)/;

        function hasUrl(src) {
            return src.search(urlRegex) !== -1;
        }

        function parseUrls(src) {
            var regexp = new RegExp(urlRegex.source, 'g');
            var result = [];
            var url;
            while ((url = regexp.exec(src)) !== null) {
                result.push(url[1]);
            }
            return result;
        }

        function urlAsRegex(url) {
            return new RegExp(escape(url), 'g');
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

        function escapeXhtml(string) {
            return string.replace(/#/g, '%23');
        }

        return {
            parseExtension: parseExtension,
            mimeType: mime,
            canvasToBlob: canvasToBlob,
            resolveUrl: resolveUrl,
            getAndEncode: getAndEncode,
            getFont: getFont,
            getImage: getImage,
            uid: uid.next,
            hasUrl: hasUrl,
            parseUrls: parseUrls,
            urlAsRegex: urlAsRegex,
            hasFontUrl: hasFontUrl,
            parseFontUrls: parseFontUrls,
            fontUrlAsRegex: fontUrlAsRegex,
            dataAsFontUrl: dataAsFontUrl,
            isDataUrl: isDataUrl,
            delay: delay,
            asArray: asArray,
            escapeXhtml: escapeXhtml,
            makeImage: makeImage
        };
    })();

    var inliner = (function () {

        const URL_REGEX = /(url\(['"]?)([^'"]+?)(['"]?\))/g;

        function readUrls(string) {
            var result = [];
            var match;
            while ((match = URL_REGEX.exec(string)) !== null) {
                result.push(match[2]);
            }
            return result.filter(function (url) {
                return url.search(/^(data:)/) === -1;
            });
        }

        function inline(url, string, get) {
            return Promise.resolve(url)
                .then(get)
                .then(function (content) {
                    return 'data:' + getMimeType(url) + ':base64,' + content;
                })
                .then(function (dataUrl) {
                    return string.replace(URL_REGEX, '$1' + dataUrl + '$3');
                });
        }

        // function inline(string, config) {
        //     var urls = config.regex
        // }

        return {
            readUrls: readUrls,
            inline: inline,
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

            function resolve(getFont) {
                getFont = getFont || util.getFont;

                var cssText = webFontRule.cssText;

                var resolved = readUrls()
                    .map(function (fontUrl) {
                        return getFont(resourceUrl(fontUrl), fontUrl.format)
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

    var images = (function () {

        function newImage(element) {

            function inline(getImage) {
                getImage = getImage || util.getImage;

                var url = element.src;
                if (util.isDataUrl(url)) return Promise.resolve();

                return getImage(url)
                    .then(function (dataUrl) {
                        return new Promise(function (resolve, reject) {
                            element.onload = resolve;
                            element.onerror = reject;
                            element.src = dataUrl;
                        });
                    });
            }

            return {
                inline: inline
            };
        }

        function inlineBackground(node) {
            var background = node.style.getPropertyValue('background');
            if (!background || !util.hasUrl(background)) return Promise.resolve(node);

            return Promise.all(
                    util.parseUrls(background).map(function (url) {
                        return util.getImage(url)
                            .then(function (dataUrl) {
                                background = background.replace(util.urlAsRegex(url), dataUrl);
                            });
                    })
                ).then(function () {
                    node.style.setProperty(
                        'background',
                        background,
                        node.style.getPropertyPriority('background')
                    );
                })
                .then(function () {
                    return node;
                });
        }

        function inlineAll(node) {
            if (!(node instanceof Element)) return Promise.resolve(node);
            return inlineBackground(node)
                .then(function () {
                    if (node instanceof HTMLImageElement)
                        return newImage(node).inline();
                    else
                        return Promise.all(
                            util.asArray(node.childNodes).map(function (child) {
                                return inlineAll(child);
                            })
                        );
                });
        }

        return {
            inlineAll: inlineAll,
            newImage: newImage
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
        if (source.cssText) target.cssText = source.cssText;
        else copyProperties(source, target);
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
        [
            ':before',
            ':after'
        ]
        .forEach(function (element) {
            clonePseudoElement(pair, element);
        });
        return pair;
    }

    function fixNamespace(node) {
        if (node instanceof SVGElement) node.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
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

    function cloneChildrenInOrder(parent, children, filter) {
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

        return cloneChildrenInOrder(clone, util.asArray(children), filter)
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

    function makeDataUri(node, width, height) {
        return Promise.resolve(node)
            .then(function (node) {
                node.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
                return new XMLSerializer().serializeToString(node);
            })
            .then(util.escapeXhtml)
            .then(function (xhtml) {
                return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + "</foreignObject>";
            })
            .then(function (foreignObject) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' + foreignObject + '</svg>';
            })
            .then(function (svg) {
                return "data:image/svg+xml;charset=utf-8," + svg;
            });
    }

    function inlineImages(node) {
        return images.inlineAll(node)
            .then(function () {
                return node;
            });
    }

    function embedFonts(node) {
        return fontFaces.resolveAll()
            .then(function (cssText) {
                var styleNode = document.createElement('style');
                node.appendChild(styleNode);
                styleNode.appendChild(document.createTextNode(cssText));
                return node;
            });
    }

    function draw(domNode, options) {
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

    function toImage(node, options) {
        options = options || {};

        return Promise.resolve(node)
            .then(function (node) {
                return cloneNode(node, options.filter);
            })
            .then(embedFonts)
            .then(inlineImages)
            .then(function (clone) {
                return makeDataUri(clone, node.scrollWidth, node.scrollHeight);
            })
            .then(util.makeImage);
    }

    function toDataUrl(node, options) {
        return draw(node, options)
            .then(function (canvas) {
                return canvas.toDataURL();
            });
    }

    function toBlob(node, options) {
        return draw(node, options)
            .then(util.canvasToBlob);
    }

    global.domtoimage = {
        toImage: toImage,
        toDataUrl: toDataUrl,
        toBlob: toBlob,
        impl: {
            fontFaces: fontFaces,
            images: images,
            util: util,
            inliner: inliner
        }
    };
})(this);
