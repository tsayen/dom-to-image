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

            it('should render to svg', function (done) {
                loadTestPage('small/dom-node.html', 'small/style.css', 'small/control-image')
                    .then(function () {
                        return domtoimage.toSvg(domNode());
                    })
                    .then(check)
                    .then(done).catch(error);
            });

            it('should render to png', function (done) {
                loadTestPage('small/dom-node.html', 'small/style.css', 'small/control-image')
                    .then(function () {
                        return domtoimage.toPng(domNode());
                    })
                    .then(check)
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
                    .then(check)
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
                        return renderToPng(domNode);
                    })
                    .then(makeImgElement)
                    .then(function (image) {
                        return drawImgElement(image, domNode);
                    })
                    .then(compareToControlImage)
                    .then(done).catch(error);
            });

            it('should render text nodes', function (done) {
                loadTestPage('text/dom-node.html', 'text/style.css')
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(['SOME TEXT', 'SOME MORE TEXT']))
                    .then(done).catch(error);
            });

            it('should preserve content of ::before and ::after pseudo elements', function (done) {
                loadTestPage('pseudo/dom-node.html', 'pseudo/style.css')
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(["ONLY-BEFORE", "BOTH-BEFORE"]))
                    .then(assertTextRendered(["ONLY-AFTER", "BOTH-AFTER"]))
                    .then(done).catch(error);
            });

            it('should use node filter', function (done) {
                function filter(node) {
                    if (node.classList) return !node.classList.contains('omit');
                    return true;
                }

                loadTestPage('filter/dom-node.html', 'filter/style.css', 'filter/control-image')
                    .then(function () {
                        return domtoimage.toPng(domNode(), {
                            filter: filter
                        });
                    })
                    .then(check)
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
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(['o']))
                    .then(done).catch(error);
            });

            it('should render images', function (done) {
                loadTestPage('images/dom-node.html', 'images/style.css')
                    .then(delay(500))
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(["PNG", "JPG"]))
                    .then(done).catch(error);
            });

            it('should render background images', function (done) {
                loadTestPage('css-bg/dom-node.html', 'css-bg/style.css')
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(["JPG"]))
                    .then(done).catch(error);
            });

            it('should render line breaks in text area', function (done) {
                loadTestPage('textarea/line-breaks.html', 'textarea/style.css')
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(["TEXT\nWITH\nLINE\nBREAKS"]))
                    .then(done).catch(error);
            });

            it('should render user input from textarea', function (done) {
                loadTestPage('textarea/user-input.html', 'textarea/style.css')
                    .then(function () {
                        document.getElementById('input').value = "USER\nINPUT";
                    })
                    .then(renderToPng)
                    .then(drawDataUrl)
                    .then(assertTextRendered(["USER\nINPUT"]))
                    .then(done).catch(error);
            });

            function compareToControlImage(image, tolerance) {
                assert.isTrue(imagediff.equal(image, controlImage(), tolerance), 'rendered and control images should be same');
            }

            function renderAndCheck() {
                return Promise.resolve()
                    .then(renderToPng)
                    .then(check);
            }

            function check(dataUrl) {
                return Promise.resolve(dataUrl)
                    .then(drawDataUrl)
                    .then(compareToControlImage);
            }

            function drawDataUrl(dataUrl) {
                return Promise.resolve(dataUrl)
                    .then(makeImgElement)
                    .then(drawImgElement);
            }

            function assertTextRendered(lines) {
                return function () {
                    var renderedText = ocr(canvas());
                    lines.forEach(function (line) {
                        assert.include(renderedText, line);
                    });
                };
            }

            function makeImgElement(src) {
                return new Promise(function (resolve) {
                    var image = new Image();
                    image.onload = function () {
                        resolve(image);
                    };
                    image.src = src;
                });
            }

            function drawImgElement(image, node) {
                node = node || domNode();
                canvas().height = node.offsetHeight.toString();
                canvas().width = node.offsetWidth.toString();
                canvas().getContext('2d').imageSmoothingEnabled = false;
                canvas().getContext('2d').drawImage(image, 0, 0);
                return image;
            }

            function renderToPng(node) {
                return domtoimage.toPng(node || domNode());
            }
        });

        describe('inliner', function () {

            const NO_BASE_URL = null;

            it('should parse urls', function () {
                var parse = domtoimage.impl.inliner.impl.readUrls;

                assert.deepEqual(parse('url("http://acme.com/file")'), ['http://acme.com/file']);
                assert.deepEqual(parse('url(foo.com), url(\'bar.org\')'), ['foo.com', 'bar.org']);
            });

            it('should ignore data urls', function () {
                var parse = domtoimage.impl.inliner.impl.readUrls;

                assert.deepEqual(parse('url(foo.com), url(data:AAA)'), ['foo.com']);
            });

            it('should inline url', function (done) {
                var inline = domtoimage.impl.inliner.impl.inline;

                inline('url(http://acme.com/image.png), url(foo.com)', 'http://acme.com/image.png',
                        NO_BASE_URL,
                        function () {
                            return Promise.resolve('AAA');
                        })
                    .then(function (result) {
                        assert.equal(result, 'url(data:image/png;base64,AAA), url(foo.com)');
                    })
                    .then(done).catch(error);
            });

            it('should resolve urls if base url given', function (done) {
                var inline = domtoimage.impl.inliner.impl.inline;

                inline('url(images/image.png)', 'images/image.png', 'http://acme.com/',
                        function (url) {
                            return Promise.resolve({
                                'http://acme.com/images/image.png': 'AAA'
                            }[url]);
                        }
                    )
                    .then(function (result) {
                        assert.equal(result, 'url(data:image/png;base64,AAA)');
                    })
                    .then(done).catch(error);
            });

            it('should inline all urls', function (done) {
                var inlineAll = domtoimage.impl.inliner.inlineAll;

                inlineAll('url(http://acme.com/image.png), url("foo.com/font.ttf")',
                        NO_BASE_URL,
                        function (url) {
                            return Promise.resolve({
                                'http://acme.com/image.png': 'AAA',
                                'foo.com/font.ttf': 'BBB'
                            }[url]);
                        }
                    )
                    .then(function (result) {
                        assert.equal(result, 'url(data:image/png;base64,AAA), url("data:application/font-truetype;base64,BBB")');
                    })
                    .then(done).catch(error);
            });
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

                assert.equal(mime('http://acme.com/font.woff'), 'application/font-woff');
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

            it('should generate uids', function () {
                var uid = domtoimage.impl.util.uid;
                assert(uid().length >= 4);
                assert.notEqual(uid(), uid());
            });
        });

        describe('web fonts', function () {
            var fontFaces = domtoimage.impl.fontFaces;

            it('should read non-local font faces', function (done) {
                loadTestPage('fonts/web-fonts/empty.html', 'fonts/web-fonts/rules.css')
                    .then(function () {
                        return fontFaces.impl.readAll();
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
                var originalSrc = 'data:image/jpeg;base64,AAA';

                var img = new Image();
                img.src = originalSrc;

                domtoimage.impl.images.impl.newImage(img).inline(function () {
                        return Promise.resolve('XXX');
                    })
                    .then(function () {
                        assert.equal(img.src, originalSrc);
                    })
                    .then(done).catch(error);
            });
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
