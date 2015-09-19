(function (global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domtoimage;
    var Promise = global.Promise;
    var ocr = global.OCRAD;

    var BASE_URL = '/base/spec/resources/';

    describe('domtoimage', function () {

        afterEach(purgePage);

        it('should load', function () {
            assert.ok(domtoimage);
        });

        it('should render simple node', function (done) {
            loadTestPage('simple/dom-node.html', 'simple/style.css', 'simple/control-image')
                .then(renderAndCheck)
                .then(done).catch(error);
        });

        it('should render bigger node', function (done) {
            loadTestPage('bigger/dom-node.html', 'bigger/style.css', 'bigger/control-image')
                .then(function () {
                    var parent = $('#root');
                    var child = $('.dom-child-node');
                    for (var i = 0; i < 10; i++) {
                        parent.append(child.clone());
                    }
                })
                .then(renderAndCheck)
                .then(done).catch(error);
        });

        it('should handle "#" in colors and attributes', function (done) {
            loadTestPage('hash/dom-node.html', 'hash/style.css', 'simple/control-image')
                .then(renderAndCheck)
                .then(done).catch(error);
        });

        it('should render nested svg with broken namespace', function (done) {
            loadTestPage('svg/dom-node.html', 'svg/style.css', 'svg/control-image')
                .then(renderAndCheck)
                .then(done).catch(error);
        });

        it('should render correctly when the node is bigger than container', function (done) {
            var domNode;
            loadTestPage('scroll/dom-node.html', 'scroll/style.css', 'scroll/control-image')
                .then(function () {
                    domNode = $('#root')[0];
                })
                .then(function () {
                    return domNodeToDataUrl(domNode);
                })
                .then(makeImage)
                .then(function (image) {
                    return drawImage(image, domNode);
                })
                .then(compareToControlImage)
                .then(done).catch(error);
        });

        it('should render text nodes', function (done) {
            loadTestPage('text/dom-node.html', 'text/style.css')
                .then(function () {
                    return domtoimage.toImage(domNode());
                })
                .then(drawImage)
                .then(function () {
                    assertTextRendered(['SOME TEXT', 'SOME MORE TEXT']);
                })
                .then(done).catch(error);
        });

        it('should preserve content of ::before and ::after pseudo elements', function (done) {
            loadTestPage('before-after/dom-node.html', 'before-after/style.css')
                .then(function () {
                    return domtoimage.toImage(domNode());
                })
                .then(drawImage)
                .then(function () {
                    assertTextRendered(["ONLY-BEFORE", "BOTH-BEFORE", ]);
                    assertTextRendered(["ONLY-AFTER", "BOTH-AFTER"]);
                })
                .then(done).catch(error);
        });

        it('should render to blob', function (done) {
            loadTestPage('simple/dom-node.html', 'simple/style.css', 'simple/control-image')
                .then(function () {
                    return domtoimage.toBlob(domNode());
                })
                .then(function (blob) {
                    return global.URL.createObjectURL(blob);
                })
                .then(makeImage)
                .then(drawImage)
                .then(compareToControlImage)
                .then(done).catch(error);
        });

        it('should use node filter', function (done) {
            function filter(node) {
                if (node.classList) return !node.classList.contains('omit');
                return true;
            }

            loadTestPage('filter/dom-node.html', 'filter/style.css', 'filter/control-image')
                .then(function () {
                    return domtoimage.toDataUrl(domNode(), {
                        filter: filter
                    });
                })
                .then(makeImage)
                .then(drawImage)
                .then(compareToControlImage)

            .then(done).catch(error);
        });

        it('should render web fonts', function (done) {
            loadTestPage('fonts/regression.html', 'fonts/regression.css')
                .then(function () {
                    return domtoimage.toImage(domNode());
                })
                .then(drawImage)
                .then(compareToControlImage)
                .then(done).catch(error);
        });

        describe('util', function () {

            it('should get and encode resource', function (done) {
                var getAndEncode = domtoimage.impl.util.getAndEncode;
                getResource('fonts/fontawesome.base64')
                    .then(function (testResource) {
                        return getAndEncode(BASE_URL + 'fonts/fontawesome.woff2', 'woff2')
                            .then(function (resource) {
                                assert.equal(resource, testResource);
                            });
                    })
                    .then(done).catch(error);
            });

            it('should generate uids', function () {
                var uid = domtoimage.impl.util.uid;
                assert(uid().length >= 4);
                assert.notEqual(uid(), uid());
            });
        });

        describe('web fonts', function () {
            var fontFaces = domtoimage.impl.fontFaces;

            it('should read non-local font faces', function (done) {
                loadTestPage('fonts/empty.html', 'fonts/font-face/rules.css')
                    .then(function () {
                        return fontFaces.readAll(global.document);
                    })
                    .then(function (webFonts) {
                        assert.equal(webFonts.length, 3);
                    })
                    .then(done).catch(error);
            });

            it('should resolve font face urls', function (done) {
                loadTestPage('fonts/empty.html', 'fonts/font-face/remote.css')
                    .then(function () {
                        return fontFaces.readAll(global.document);
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(mockResourceLoader({
                            'http://fonts.com/font1.woff2': 'AAA',
                            'http://fonts.com/font1.woff': 'BBB'
                        }));
                    })
                    .then(function (css) {
                        assert.include(css, 'url("data:application/x-font-woff2;base64,AAA")');
                        assert.include(css, 'url("data:application/x-font-woff;base64,BBB")');
                        assert.include(css, 'local(');
                    })
                    .then(done).catch(error);
            });

            it('should not resolve data urls', function (done) {
                loadTestPage('fonts/empty.html', 'fonts/font-face/embedded.css')
                    .then(function () {
                        return fontFaces.readAll(global.document);
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(
                            mockResourceLoader({
                                'data:application/x-font-woff2;base64,AAA': '!!!'
                            })
                        );
                    })
                    .then(function (css) {
                        assert.include(css, 'data:application/x-font-woff2;base64,AAA');
                    })
                    .then(done).catch(error);
            });

            it('should ignore query in font urls', function (done) {
                loadTestPage('fonts/empty.html', 'fonts/font-face/with-query.css')
                    .then(function () {
                        return fontFaces.readAll(global.document);
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(
                            mockResourceLoader({
                                'http://fonts.com/font1.woff2': 'AAA'
                            })
                        );
                    })
                    .then(function (css) {
                        assert.include(css, 'data:application/x-font-woff2;base64,AAA');
                    })
                    .then(done).catch(error);
            });

            it('should resolve relative font urls', function (done) {
                loadTestPage('fonts/rules-relative.html')
                    .then(function () {
                        return fontFaces.readAll(global.document);
                    })
                    .then(function (webFonts) {
                        var requestedUrls = [];
                        return Promise.all(
                            webFonts.map(function (webFont) {
                                return webFont.resolve(
                                    function resourceLoader(url) {
                                        requestedUrls.push(url);
                                        return Promise.resolve();
                                    }
                                );
                            })
                        ).then(function () {
                            return requestedUrls;
                        });
                    })
                    .then(function (urls) {
                        assert.include(urls[0], '/base/spec/resources/font1.woff');
                        assert.include(urls[1], '/base/spec/resources/fonts/font2.woff2');
                    })
                    .then(done).catch(error);
            });

            function mockResourceLoader(content) {
                return function (url, type) {
                    if (content[url])
                        return Promise.resolve(domtoimage.impl.util.decorateDataUrl(content[url], type));
                    else
                        return Promise.reject(new Error('no matching content for ' + url));
                };
            }
        });

        function error(e) {
            console.error(e.toString() + '\n' + e.stack);
        }

        function loadTestPage(html, css, controlImage) {
            return loadPage().then(function () {
                return getResource(html).then(function (html) {
                    $('#root').html(html);
                });
            }).then(function () {
                if (css) return getResource(css).then(function (css) {
                    $('#style').append(document.createTextNode(css));
                });
            }).then(function () {
                if (controlImage) return getResource(controlImage).then(function (css) {
                    $('#control-image').attr('src', css);
                });
            });
        }

        function loadPage() {
            return getResource('page.html')
                .then(function (html) {
                    var root = document.createElement('div');
                    root.id = 'test-root';
                    root.innerHTML = html;
                    document.body.appendChild(root);
                });
        }

        function purgePage() {
            var root = $('#test-root');
            if (root) root.remove();
        }

        function getResource(fileName) {
            var url = BASE_URL + fileName;
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'text';

            return new Promise(function (resolve, reject) {
                request.onload = function () {
                    if (this.status === 200)
                        resolve(request.response.toString().trim());
                    else
                        reject(new Error('cannot load ' + url));
                };
                request.send();
            });
        }

        function makeImage(src) {
            return new Promise(function (resolve) {
                var image = new Image();
                image.onload = function () {
                    resolve(image);
                };
                image.src = src;
            });
        }

        function drawImage(image, node) {
            node = node || domNode();
            canvas().height = node.offsetHeight.toString();
            canvas().width = node.offsetWidth.toString();
            canvas().getContext('2d').drawImage(image, 0, 0);
            return image;
        }

        function domNodeToDataUrl(node) {
            return domtoimage.toDataUrl(node || domNode());
        }

        function domNode() {
            return $('#dom-node')[0];
        }

        function controlImage() {
            return $('#control-image')[0];
        }

        function canvas() {
            return $('#canvas')[0];
        }

        function compareToControlImage(image) {
            assert.isTrue(imagediff.equal(image, controlImage()), 'rendered and control images should be equal');
        }

        function renderAndCheck() {
            return Promise.resolve()
                .then(domNodeToDataUrl)
                .then(makeImage)
                .then(compareToControlImage);
        }

        function assertTextRendered(lines) {
            var renderedText = ocr(canvas());
            lines.forEach(function (line) {
                assert.include(renderedText, line);
            });
        }
    });
})(this);
