(function (global) {
    'use strict';

    var util = newUtil();
    var inliner = newInliner();
    var fontFaces = newFontFaces();
    var images = newImages();

    var domtoimage = {
        scan: scan,
        toSvg: toSvg,
        toPng: toPng,
        toJpeg: toJpeg,
        toBlob: toBlob,
        toPixelData: toPixelData,
        impl: {
            fontFaces: fontFaces,
            images: images,
            util: util,
            inliner: inliner
        }
    };

    if (typeof module !== 'undefined')
        module.exports = domtoimage;
    else
        global.domtoimage = domtoimage;


    /**
     * Scans the DOM to capture the information needed to perform rendering and returns this
     * information. This object can then be passed to other to* functions to perform final
     * rendering. The source DOM is no longer required to be present after this function completes.
     * This is useful if you're running in a batch situation where you want to load the
     * next DOM as soon as possible, and allow final rendering to take advantage of non-blocking
     * effects to provide higher overall throughput and a better user experience.
     *
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options
     * @param {Function} options.filter - Should return true if passed node should be included in the output
     *          (excluding node means excluding its children as well). Not called on the root node.
     * @return {Promise} - A promise that is fulfilled with an object to be passed to a to* function for final rendering
     * */
    function scan(node, options) {
       options = options || {};
       return Promise.resolve({node: node})
           .then(function (ctx) {
               return cloneNode(ctx, options.filter, true);
           })
           .then(embedFonts)
           .then(function(ctx) {
              ctx.nodeHeight = util.height(node);
              ctx.nodeWidth = util.width(node);
              return ctx;
           });
    }

    /**
     * @param {Node} node - The DOM Node object to render, or the result of @see {@link scan}
     * @param {Object} options - Rendering options
     * @param {Function} options.filter - Should return true if passed node should be included in the output
     *          (excluding node means excluding its children as well). Not called on the root node.
     * @param {String} options.bgcolor - color for the background, any valid CSS color value.
     * @param {Number} options.width - width to be applied to node before rendering.
     * @param {Number} options.height - height to be applied to node before rendering.
     * @param {Object} options.style - an object whose properties to be copied to node's style before rendering.
     * @param {Number} options.quality - a Number between 0 and 1 indicating image quality (applicable to JPEG only),
                defaults to 1.0.
     * @return {Promise} - A promise that is fulfilled with a SVG image data URL
     * */
    function toSvg(node, options) {
        options = options || {};
        // If Element then scan it, otherwise it's a context object (output from scan) so continue on
        var promise = (node instanceof Element) ? scan(node, options) : Promise.resolve(node);
        return promise
            .then(inlineImages)
            .then(applyOptions)
            .then(function (ctx) {
                return makeSvgDataUri(ctx,
                    options.width || util.width(node),
                    options.height || util.height(node)
                );
            });

        function applyOptions(ctx) {
            if (options.bgcolor) pushStyle(ctx.cssOverrides, 'background-color', options.bgcolor);

            if (options.width) pushStyle(ctx.cssOverrides, 'width', options.width + 'px');
            if (options.height) pushStyle(ctx.cssOverrides, 'height', options.height + 'px');

            if (options.style)
                Object.keys(options.style).forEach(function (property) {
                    pushStyle(ctx.cssOverrides, kebabCase(property), options.style[property]);
                });

            return ctx;

            function pushStyle(buffer, k, v) {
                buffer.push(k, ': ', v, '; ');
            }

            function kebabCase(s) {
                return s.replace(/[A-Z]/g, function(m) {
                    return '-' + m.toLowerCase();
                });
            }
        }
    }

    /**
     * @param {Node} node - The DOM Node object to render, or the result of @see {@link scan}
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
     * */
    function toPixelData(node, options) {
        return draw(node, options || {})
            .then(function (canvas) {
                return canvas.getContext('2d').getImageData(
                    0,
                    0,
                    util.width(node),
                    util.height(node)
                ).data;
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render, or the result of @see {@link scan}
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image data URL
     * */
    function toPng(node, options) {
        return draw(node, options || {})
            .then(function (canvas) {
                return canvas.toDataURL();
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render, or the result of @see {@link scan}
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
     * */
    function toJpeg(node, options) {
        options = options || {};
        return draw(node, options)
            .then(function (canvas) {
                return canvas.toDataURL('image/jpeg', options.quality || 1.0);
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render, or the result of @see {@link scan}
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image blob
     * */
    function toBlob(node, options) {
        return draw(node, options || {})
            .then(util.canvasToBlob);
    }

    function draw(domNode, options) {
        return toSvg(domNode, options)
            .then(util.makeImage)
            .then(util.delay(100))
            .then(function (image) {
                var canvas = newCanvas(domNode);
                canvas.getContext('2d').drawImage(image, 0, 0);
                return canvas;
            });

        function newCanvas(domNode) {
            var canvas = document.createElement('canvas');
            canvas.width = options.width || util.width(domNode);
            canvas.height = options.height || util.height(domNode);

            if (options.bgcolor) {
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = options.bgcolor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            return canvas;
        }
    }

    function cloneNode(ctx, filter, root) {
        var node = ctx.node;
        if ((!root && filter && !filter(node)) ||
            (node instanceof HTMLScriptElement) ||
            (node instanceof Comment)) return Promise.resolve();

        return Promise.resolve(ctx)
            .then(makeNodeCopy)
            .then(function (ctx) {
                return cloneChildren(node, ctx, filter);
            })
            .then(function (ctx) {
                return processClone(node, ctx);
            });

        function makeNodeCopy(ctx) {
            ctx.attr = {};
            if (node.attributes) {
                util.asArray(node.attributes).forEach(function(item) {
                    ctx.attr[item.name] = item.value;
                });
            }
            if (node instanceof HTMLCanvasElement) {
                ctx.nodeName = 'img';
                ctx.attr.src = node.toDataURL();
            } else {
                ctx.nodeName = node.nodeName.toLowerCase();
                if (node instanceof Text) {
                    ctx.content = node.textContent;
                }
            }
            return ctx;
        }


        function cloneChildren(original, ctx, filter) {
            ctx.children = [];
            var children = original.childNodes;
            if (children.length === 0) return Promise.resolve(ctx);

            return cloneChildrenInOrder(ctx, util.asArray(children), filter)
                .then(function () {
                    return ctx;
                });

            function cloneChildrenInOrder(ctx, children, filter) {
                var done = Promise.resolve();
                children.forEach(function (child) {
                    done = done
                        .then(function () {
                            return cloneNode({node: child}, filter);
                        })
                        .then(function (childCtx) {
                            if (childCtx) ctx.children.push(childCtx);
                        });
                });
                return done;
            }
        }

        function processClone(original, ctx) {
            if (!(original instanceof Element)) return ctx;

            return Promise.resolve()
                .then(cloneStyle)
                .then(clonePseudoElements)
                .then(copyUserInput)
                .then(fixSvg)
                .then(function () {
                    return ctx;
                });

            function cloneStyle() {
                var style = window.getComputedStyle(original);
                ctx.cssText = style.cssText || '';
                ctx.cssOverrides = [];
                if (!ctx.cssText) pushStyles(ctx.cssOverrides, style);
                ctx.backgroundImage = {
                    value: style.getPropertyValue('background-image'),
                    priority: style.getPropertyPriority('background-image')
                };

                function pushStyles(buffer, style) {
                    util.asArray(style).forEach(function (name) {
                        buffer.push(name, ': ', style.getPropertyValue(name));
                        if (style.getPropertyPriority(name)) buffer.push(' !important');
                        buffer.push('; ');
                    });
                }
            }

            function clonePseudoElements() {
                [':before', ':after'].forEach(function (element) {
                    clonePseudoElement(element);
                });

                function clonePseudoElement(element) {
                    var style = window.getComputedStyle(original, element);
                    var content = style.getPropertyValue('content');

                    if (content === '' || content === 'none') return;

                    var className = util.uid();
                    ctx.attr.class = (ctx.attr.class || '') + ' ' + className;
                    ctx.children.push({
                        nodeName: 'style',
                        children: [{
                            nodeName: '#text',
                            content: formatPseudoElementStyle(className, element, style)
                        }]
                    });



                    function formatPseudoElementStyle(className, element, style) {
                        var selector = '.' + className + ':' + element;
                        var cssText = style.cssText;
                        cssText = cssText ? cssText + getContent(style) : formatCssProperties(style);
                        return selector + '{' + cssText + '}';

                        function getContent(style) {
                            var content = style.getPropertyValue('content');
                            return ' content: ' + content + ';';
                        }

                        function formatCssProperties(style) {

                            return util.asArray(style)
                                .map(formatProperty)
                                .join('; ') + ';';

                            function formatProperty(name) {
                                return name + ': ' +
                                    style.getPropertyValue(name) +
                                    (style.getPropertyPriority(name) ? ' !important' : '');
                            }
                        }
                    }
                }
            }

            function copyUserInput() {
                if (original instanceof HTMLTextAreaElement) ctx.children.push({nodeName: '#text', content: original.value});
                if (original instanceof HTMLInputElement) ctx.attr.value = original.value;
            }

            function fixSvg() {
                if (!(original instanceof SVGElement)) return;
                ctx.attr.xmlns = 'http://www.w3.org/2000/svg';

                if (!(original instanceof SVGRectElement)) return;
                ['width', 'height'].forEach(function (attribute) {
                    var value = original.getAttribute(attribute);
                    if (!value) return;

                    ctx.cssOverrides.push(attribute, ':', value, '; ');
                });
            }
        }
    }

    function embedFonts(ctx) {
        return fontFaces.resolveAll()
            .then(function (cssText) {
                ctx.children.push({
                    nodeName: 'style',
                    children: [{
                        nodeName: '#text',
                        content: cssText
                    }]
                });
                return ctx;
            });
    }

    function inlineImages(ctx) {
        return images.inlineAll(ctx)
            .then(function () {
                return ctx;
            });
    }

    function makeSvgDataUri(ctx, width, height) {
        return Promise.resolve(ctx)
            .then(function (ctx) {
                ctx.attr.xmlns = 'http://www.w3.org/1999/xhtml';
                return serializeToString(ctx);
            })
            .then(util.escapeXhtml)
            .then(function (xhtml) {
                return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject>';
            })
            .then(function (foreignObject) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    foreignObject + '</svg>';
            })
            .then(function (svg) {
                return 'data:image/svg+xml;charset=utf-8,' + svg;
            });

        function serializeToString(ctx) {
            var str = [];
            serializeCtx(ctx, str);
            return str.join('');

            function serializeCtx(ctx, str) {
                if (ctx.nodeName === '#text') {
                    str.push(util.xmlEncode(ctx.content));
                } else {
                    str.push('<', ctx.nodeName);
                    serializeAttrs(ctx, str);
                    str.push('>');
                    ctx.children.forEach(function(child) {
                        serializeCtx(child, str);
                    });
                    str.push('</', ctx.nodeName, '>');
                }

                function serializeAttrs(ctx, str) {
                    createStyleAttr(ctx);

                    for (var i in ctx.attr) {
                        var val = util.xmlEncode(ctx.attr[i]);
                        str.push(' ', i, '="', val, '"');
                    }

                    function createStyleAttr(ctx) {
                        if (ctx.cssText || (ctx.cssOverrides && ctx.cssOverrides.length)) {
                            var buffer = ctx.cssOverrides || [];
                            buffer.unshift(ctx.cssText || '');
                            ctx.attr.style = buffer.join('');
                        }
                    }
                }
            }
        }

    }

    function newUtil() {
        return {
            escape: escape,
            parseExtension: parseExtension,
            mimeType: mimeType,
            dataAsUrl: dataAsUrl,
            isDataUrl: isDataUrl,
            canvasToBlob: canvasToBlob,
            resolveUrl: resolveUrl,
            getAndEncode: getAndEncode,
            uid: uid(),
            delay: delay,
            asArray: asArray,
            escapeXhtml: escapeXhtml,
            xmlEncode: xmlEncode,
            makeImage: makeImage,
            width: width,
            height: height
        };

        function mimes() {
            /*
             * Only WOFF and EOT mime types for fonts are 'real'
             * see http://www.iana.org/assignments/media-types/media-types.xhtml
             */
            var WOFF = 'application/font-woff';
            var JPEG = 'image/jpeg';

            return {
                'woff': WOFF,
                'woff2': WOFF,
                'ttf': 'application/font-truetype',
                'eot': 'application/vnd.ms-fontobject',
                'png': 'image/png',
                'jpg': JPEG,
                'jpeg': JPEG,
                'gif': 'image/gif',
                'tiff': 'image/tiff',
                'svg': 'image/svg+xml'
            };
        }

        function parseExtension(url) {
            var match = /\.([^\.\/]*?)$/g.exec(url);
            if (match) return match[1];
            else return '';
        }

        function mimeType(url) {
            var extension = parseExtension(url).toLowerCase();
            return mimes()[extension] || '';
        }

        function isDataUrl(url) {
            return url.search(/^(data:)/) !== -1;
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
            var doc = document.implementation.createHTMLDocument();
            var base = doc.createElement('base');
            doc.head.appendChild(base);
            var a = doc.createElement('a');
            doc.body.appendChild(a);
            base.href = baseUrl;
            a.href = url;
            return a.href;
        }

        function uid() {
            var index = 0;

            return function () {
                return 'u' + fourRandomChars() + index++;

                function fourRandomChars() {
                    /* see http://stackoverflow.com/a/6248722/2519373 */
                    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
                }
            };
        }

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
            var TIMEOUT = 30000;

            return new Promise(function (resolve) {
                var request = new XMLHttpRequest();

                request.onreadystatechange = done;
                request.ontimeout = timeout;
                request.responseType = 'blob';
                request.timeout = TIMEOUT;
                request.open('GET', url, true);
                request.send();

                function done() {
                    if (request.readyState !== 4) return;

                    if (request.status !== 200) {
                        fail('cannot fetch resource: ' + url + ', status: ' + request.status);
                        return;
                    }

                    var encoder = new FileReader();
                    encoder.onloadend = function () {
                        var content = encoder.result.split(/,/)[1];
                        resolve(content);
                    };
                    encoder.readAsDataURL(request.response);
                }

                function timeout() {
                    fail('timeout of ' + TIMEOUT + 'ms occured while fetching resource: ' + url);
                }

                function fail(message) {
                    console.error(message);
                    resolve('');
                }
            });
        }

        function dataAsUrl(content, type) {
            return 'data:' + type + ';base64,' + content;
        }

        function escape(string) {
            return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
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
            return string.replace(/#/g, '%23').replace(/\n/g, '%0A');
        }

        function xmlEncode(unsafe) {
            return unsafe.replace(/[<>&'"]/g, function(c) {
                switch (c) {
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '&':
                        return '&amp;';
                    case '\'':
                        return '&apos;';
                    case '"':
                        return '&quot;';
                }
            });
        }

        function width(node) {
            // if it's a context object it will have nodeWidth
            if (node.nodeWidth) return node.nodeWidth;

            var leftBorder = px(node, 'border-left-width');
            var rightBorder = px(node, 'border-right-width');
            return node.scrollWidth + leftBorder + rightBorder;
        }

        function height(node) {
            // if it's a context object it will have nodeHeight
            if (node.nodeHeight) return node.nodeHeight;

            var topBorder = px(node, 'border-top-width');
            var bottomBorder = px(node, 'border-bottom-width');
            return node.scrollHeight + topBorder + bottomBorder;
        }

        function px(node, styleProperty) {
            var value = window.getComputedStyle(node).getPropertyValue(styleProperty);
            return parseFloat(value.replace('px', ''));
        }
    }

    function newInliner() {
        var URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

        return {
            inlineAll: inlineAll,
            shouldProcess: shouldProcess,
            impl: {
                readUrls: readUrls,
                inline: inline
            }
        };

        function shouldProcess(string) {
            return string.search(URL_REGEX) !== -1;
        }

        function readUrls(string) {
            var result = [];
            var match;
            while ((match = URL_REGEX.exec(string)) !== null) {
                result.push(match[1]);
            }
            return result.filter(function (url) {
                return !util.isDataUrl(url);
            });
        }

        function inline(string, url, baseUrl, get) {
            return Promise.resolve(url)
                .then(function (url) {
                    return baseUrl ? util.resolveUrl(url, baseUrl) : url;
                })
                .then(get || util.getAndEncode)
                .then(function (data) {
                    return util.dataAsUrl(data, util.mimeType(url));
                })
                .then(function (dataUrl) {
                    return string.replace(urlAsRegex(url), '$1' + dataUrl + '$3');
                });

            function urlAsRegex(url) {
                return new RegExp('(url\\([\'"]?)(' + util.escape(url) + ')([\'"]?\\))', 'g');
            }
        }

        function inlineAll(string, baseUrl, get) {
            if (nothingToInline()) return Promise.resolve(string);

            return Promise.resolve(string)
                .then(readUrls)
                .then(function (urls) {
                    var done = Promise.resolve(string);
                    urls.forEach(function (url) {
                        done = done.then(function (string) {
                            return inline(string, url, baseUrl, get);
                        });
                    });
                    return done;
                });

            function nothingToInline() {
                return !shouldProcess(string);
            }
        }
    }

    function newFontFaces() {
        return {
            resolveAll: resolveAll,
            impl: {
                readAll: readAll
            }
        };

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

        function readAll() {
            return Promise.resolve(util.asArray(document.styleSheets))
                .then(getCssRules)
                .then(selectWebFontRules)
                .then(function (rules) {
                    return rules.map(newWebFont);
                });

            function selectWebFontRules(cssRules) {
                return cssRules
                    .filter(function (rule) {
                        return rule.type === CSSRule.FONT_FACE_RULE;
                    })
                    .filter(function (rule) {
                        return inliner.shouldProcess(rule.style.getPropertyValue('src'));
                    });
            }

            function getCssRules(styleSheets) {
                var cssRules = [];
                styleSheets.forEach(function (sheet) {
                    try {
                        util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
                    } catch (e) {
                        console.log('Error while reading CSS rules from ' + sheet.href, e.toString());
                    }
                });
                return cssRules;
            }

            function newWebFont(webFontRule) {
                return {
                    resolve: function resolve() {
                        var baseUrl = (webFontRule.parentStyleSheet || {}).href;
                        return inliner.inlineAll(webFontRule.cssText, baseUrl);
                    },
                    src: function () {
                        return webFontRule.style.getPropertyValue('src');
                    }
                };
            }
        }
    }

    function newImages() {
        return {
            inlineAll: inlineAll,
            impl: {
                newImage: newImage
            }
        };

        function newImage(ctx) {
            return {
                inline: inline
            };

            function inline(get) {
                if (util.isDataUrl(ctx.attr.src)) return Promise.resolve();

                return Promise.resolve(ctx.attr.src)
                    .then(get || util.getAndEncode)
                    .then(function (data) {
                        return util.dataAsUrl(data, util.mimeType(ctx.attr.src));
                    })
                    .then(function (dataUrl) {
                        ctx.attr.src = dataUrl;
                    });
            }
        }

        function inlineAll(ctx) {

            return inlineBackground(ctx)
                .then(function () {
                    if (ctx.nodeName === 'img')
                        return newImage(ctx).inline();
                    else if (ctx.children) {
                        return Promise.all(
                            ctx.children.map(function (child) {
                                return inlineAll(child);
                            })
                        );
                    } else {
                        return Promise.resolve();
                    }
                });

            function inlineBackground(ctx) {
                var backgroundObj = ctx.backgroundImage;
                var background = backgroundObj && backgroundObj.value;

                if (!background || background === 'none') return Promise.resolve(ctx);

                return inliner.inlineAll(background)
                    .then(function (inlined) {
                        var priority = (backgroundObj && backgroundObj.priority) ? ' !important' : '';
                        ctx.cssOverrides.push('background-image: ', inlined, priority, '; ');
                    })
                    .then(function () {
                        return ctx;
                    });
            }
        }
    }
})(this);
