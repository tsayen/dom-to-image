(function (global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domtoimage;
    var Promise = global.Promise;
    var ocr = global.OCRAD;

    var delay = domtoimage.impl.util.delay;

    var BASE_URL = '/base/spec/resources/';

    describe('domtoimage', function () {

        afterEach(purgePage);

        it('should load', function () {
            assert.ok(domtoimage);
        });

        describe('regression', function () {

            it('should render small node', function (done) {
                loadTestPage('small/dom-node.html', 'small/style.css', 'small/control-image')
                    .then(renderAndCheck)
                    .then(done).catch(error);
            });

            it('should render bigger node', function (done) {
                loadTestPage('bigger/dom-node.html', 'bigger/style.css', 'bigger/control-image')
                    .then(function () {
                        var parent = $('#dom-node');
                        var child = $('.dom-child-node');
                        for (var i = 0; i < 10; i++) {
                            parent.append(child.clone());
                        }
                    })
                    .then(renderAndCheck)
                    .then(done).catch(error);
            });

            it('should handle "#" in colors and attributes', function (done) {
                loadTestPage('hash/dom-node.html', 'hash/style.css', 'small/control-image')
                    .then(renderAndCheck)
                    .then(done).catch(error);
            });

            it('should render nested svg with broken namespace', function (done) {
                loadTestPage('svg-ns/dom-node.html', 'svg-ns/style.css', 'svg-ns/control-image')
                    .then(renderAndCheck)
                    .then(done).catch(error);
            });

            it('should render whole node when its scrolled', function (done) {
                var domNode;
                loadTestPage('scroll/dom-node.html', 'scroll/style.css', 'scroll/control-image')
                    .then(function () {
                        domNode = $('#scrolled')[0];
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
                    .then(assertTextRendered(['SOME TEXT', 'SOME MORE TEXT']))
                    .then(done).catch(error);
            });

            it('should preserve content of ::before and ::after pseudo elements', function (done) {
                loadTestPage('pseudo/dom-node.html', 'pseudo/style.css')
                    .then(domNodeToDataUrl)
                    .then(makeImage)
                    .then(drawImage)
                    .then(assertTextRendered(["ONLY-BEFORE", "BOTH-BEFORE"]))
                    .then(assertTextRendered(["ONLY-AFTER", "BOTH-AFTER"]))
                    .then(done).catch(error);
            });

            it('should render to blob', function (done) {
                loadTestPage('small/dom-node.html', 'small/style.css', 'small/control-image')
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

            it('should render with external stylesheet', function (done) {
                loadTestPage('sheet/dom-node.html', 'sheet/style.css', 'sheet/control-image')
                    .then(delay(1000))
                    .then(renderAndCheck)
                    .then(done).catch(error);
            });

            it('should render web fonts', function (done) {
                this.timeout(10000);
                loadTestPage('fonts/dom-node.html', 'fonts/style.css')
                    .then(delay(1000))
                    .then(domNodeToDataUrl)
                    .then(makeImage)
                    .then(drawImage)
                    .then(assertTextRendered(['o']))
                    .then(done).catch(error);
            });

            it('should render images', function (done) {
                loadTestPage('images/dom-node.html', 'images/style.css')
                    .then(delay(500))
                    .then(domNodeToDataUrl)
                    .then(makeImage)
                    .then(drawImage)
                    .then(assertTextRendered(["PNG", "JPG"]))
                    .then(done).catch(error);
            });

            it('should render background images', function (done) {
                loadTestPage('css-bg/dom-node.html', 'css-bg/style.css')
                    .then(domNodeToDataUrl)
                    .then(makeImage)
                    .then(drawImage)
                    .then(assertTextRendered(["JPG"]))
                    .then(done).catch(error);
            });

            function compareToControlImage(image, tolerance) {
                assert.isTrue(imagediff.equal(image, controlImage(), tolerance), 'rendered and control images should be same');
            }

            function renderAndCheck() {
                return Promise.resolve()
                    .then(domNodeToDataUrl)
                    .then(makeImage)
                    .then(drawImage)
                    .then(compareToControlImage);
            }

            function assertTextRendered(lines) {
                return function () {
                    var renderedText = ocr(canvas());
                    lines.forEach(function (line) {
                        assert.include(renderedText, line);
                    });
                };
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
                canvas().getContext('2d').imageSmoothingEnabled = false;
                canvas().getContext('2d').drawImage(image, 0, 0);
                return image;
            }

            function domNodeToDataUrl(node) {
                return domtoimage.toDataUrl(node || domNode());
            }
        });

        describe('inliner', function () {

            it('should parse urls', function () {
                var parse = domtoimage.impl.inliner.readUrls;

                assert.deepEqual(parse('url("http://acme.com/file")'), ['http://acme.com/file']);
                assert.deepEqual(parse('url(foo.com), url(\'bar.org\')'), ['foo.com', 'bar.org']);
            });

            it('should ignore data urls', function () {
                var parse = domtoimage.impl.inliner.readUrls;

                assert.deepEqual(parse('url(foo.com), url(data:AAA)'), ['foo.com']);
            });



            // it('should replace urls', function(){
            //     var inline = domtoimage.impl.inliner.inline;
            //
            //     assert.equal('foo url("data:") bar', inline('url("http://acme.com")'));
            // });
        });

        describe('util', function () {

            it('should get and encode resource', function (done) {
                var getAndEncode = domtoimage.impl.util.getAndEncode;
                getResource('util/fontawesome.base64')
                    .then(function (testResource) {
                        return getAndEncode(BASE_URL + 'util/fontawesome.woff2', 'woff2')
                            .then(function (resource) {
                                assert.equal(resource, testResource);
                            });
                    })
                    .then(done).catch(error);
            });

            it('should parse extension', function () {
                var parse = domtoimage.impl.util.parseExtension;

                assert.equal(parse('http://acme.com/font.woff'), 'woff');
                assert.equal(parse('../FONT.TTF'), 'TTF');
                assert.equal(parse('../font'), '');
                assert.equal(parse('font'), '');
            });

            it('should guess mime type from url', function () {
                var mime = domtoimage.impl.util.mimeType;

                assert.equal(mime('http://acme.com/font.woff'), 'application/x-font-woff');
                assert.equal(mime('IMAGE.PNG'), 'image/png');
                assert.equal(mime('http://acme.com/image'), '');
            });

            it('should resolve url', function () {
                var resolve = domtoimage.impl.util.resolveUrl;

                assert.equal(resolve('font.woff', 'http://acme.com'), 'http://acme.com/font.woff');
                assert.equal(resolve('/font.woff', 'http://acme.com/fonts/woff'), 'http://acme.com/font.woff');

                assert.equal(resolve('../font.woff', 'http://acme.com/fonts/woff/'), 'http://acme.com/fonts/font.woff');
                assert.equal(resolve('../font.woff', 'http://acme.com/fonts/woff'), 'http://acme.com/font.woff');
            });

            it('should parse font urls', function () {
                var src =
                    "url('http://fonts.com/font1.woff2') format(\"woff2\")" +
                    "url(http://fonts.com/font3.woff2) format(woff2)" +
                    ",url(\"fonts.com/font1.woff\") format('woff'), local(Arial)" +
                    ", url('data:font/woff2;base64,AAA') format('woff2')";

                var urls = domtoimage.impl.util.parseFontUrls(src);
                assert.deepEqual(urls, [
                    {
                        url: 'http://fonts.com/font1.woff2',
                        format: 'woff2'
                    },
                    {
                        url: 'http://fonts.com/font3.woff2',
                        format: 'woff2'
                    },
                    {
                        url: 'fonts.com/font1.woff',
                        format: 'woff'
                    },
                    {
                        url: 'data:font/woff2;base64,AAA',
                        format: 'woff2'
                    }
                ]);
            });

            it('should generate uids', function () {
                var uid = domtoimage.impl.util.uid;
                assert(uid().length >= 4);
                assert.notEqual(uid(), uid());
            });

            it('should get image', function (done) {
                domtoimage.impl.util.getImage('resources/images/image.jpeg', function () {
                        return Promise.resolve('AAA');
                    })
                    .then(function (content) {
                        assert.equal(content, 'data:image/jpeg;base64,AAA');
                    })
                    .then(done).catch(error);
            });
        });

        describe('web fonts', function () {
            var fontFaces = domtoimage.impl.fontFaces;

            it('should read non-local font faces', function (done) {
                loadTestPage('fonts/web-fonts/empty.html', 'fonts/web-fonts/rules.css')
                    .then(function () {
                        return fontFaces.readAll();
                    })
                    .then(function (webFonts) {
                        assert.equal(webFonts.length, 3);

                        var sources = webFonts.map(function (webFont) {
                            return webFont.src();
                        });
                        assertSomeIncludesAll(sources, ['http://fonts.com/font1.woff', 'http://fonts.com/font1.woff2']);
                        assertSomeIncludesAll(sources, ['http://fonts.com/font2.ttf?v1.1.3']);
                        assertSomeIncludesAll(sources, ['data:font/woff2;base64,AAA']);
                    })
                    .then(done).catch(error);
            });

            it('should resolve font face urls', function (done) {
                loadTestPage('fonts/web-fonts/empty.html', 'fonts/web-fonts/remote.css')
                    .then(function () {
                        return fontFaces.readAll();
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(mockFontLoader({
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
                loadTestPage('fonts/web-fonts/empty.html', 'fonts/web-fonts/embedded.css')
                    .then(function () {
                        return fontFaces.readAll();
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(
                            mockFontLoader({
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
                loadTestPage('fonts/web-fonts/empty.html', 'fonts/web-fonts/with-query.css')
                    .then(function () {
                        return fontFaces.readAll();
                    })
                    .then(function (webFonts) {
                        return webFonts[0].resolve(
                            mockFontLoader({
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
                loadTestPage('fonts/web-fonts/rules-relative.html')
                    .then(delay(1000))
                    .then(function () {
                        return fontFaces.readAll();
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
                        assert.include(urls[0], '/base/spec/resources/fonts/font1.woff');
                        assert.include(urls[1], '/base/spec/resources/fonts/web-fonts/font2.woff2');
                    })
                    .then(done).catch(error);
            });

            function mockFontLoader(content) {
                return function (url, type) {
                    if (content[url])
                        return Promise.resolve(domtoimage.impl.util.dataAsFontUrl(content[url], type));
                    else
                        return Promise.reject(new Error('no matching content for ' + url));
                };
            }

            function assertSomeIncludesAll(haystacks, needles) {
                assert(
                    haystacks.some(function (haystack) {
                        return needles.every(function (needle) {
                            return (haystack.indexOf(needle) !== -1);
                        });
                    }),
                    '\nnone of\n[ ' + haystacks.join('\n') + ' ]\nincludes all of \n[ ' + needles.join(', ') + ' ]'
                );
            }
        });

        describe('images', function () {

            it('should not inline images with data url', function (done) {
                var img = new Image();
                var originalSrc = 'data:image/jpeg;base64,AAA';
                img.src = originalSrc;
                domtoimage.impl.images.newImage(img).inline(mockImageLoader('XXX'))
                    .then(function () {
                        assert.equal(img.src, originalSrc);
                    })
                    .then(done).catch(error);
            });

            function mockImageLoader(content) {
                return function (url) {
                    return domtoimage.impl.util.getImage(url, function () {
                        return Promise.resolve(content);
                    });
                };
            }
        });

        function loadTestPage(html, css, controlImage) {
            return loadPage()
                .then(function () {
                    return getResource(html).then(function (html) {
                        $('#dom-node').html(html);
                    });
                })
                .then(function () {
                    if (css)
                        return getResource(css).then(function (css) {
                            $('#style').append(document.createTextNode(css));
                        });
                })
                .then(function () {
                    if (controlImage)
                        return getResource(controlImage).then(function (image) {
                            $('#control-image').attr('src', image);
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

        function domNode() {
            return $('#dom-node')[0];
        }

        function controlImage() {
            return $('#control-image')[0];
        }

        function canvas() {
            return $('#canvas')[0];
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

        function error(e) {
            console.error(e.toString() + '\n' + e.stack);
        }
    });
})(this);
