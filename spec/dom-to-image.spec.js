(function (global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domtoimage;
    var Promise = global.Promise;

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

        it('should render nested text nodes', function (done) {
            loadTestPage('text/dom-node.html')
                .then(function () {
                    return domtoimage.toImage(domNode(), function () {});
                })
                .then(drawImage)
                .then(function (image) {
                    assert.include(image.src, 'someText', 'text should be preserved');
                    assert.include(image.src, 'someMoreText', 'text should be preserved');
                })
                .then(done).catch(error);
        });

        it('should render to blob', function (done) {
            loadTestPage('simple/dom-node.html', 'simple/style.css', 'simple/control-image')
                .then(function () {
                    return domtoimage.toBlob(domNode(), function () {});
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
                    return domtoimage.toDataUrl(domNode(), function () {}, {
                        filter: filter
                    })
                })
                .then(makeImage)
                .then(drawImage)
                .then(compareToControlImage)
                .then(done).catch(error);
        });

        describe('resource loader', function () {

            it('should get and encode resource', function (done) {
                getResource('fonts/fontawesome.base64')
                    .then(function (testResource) {
                        return domtoimage.impl.resourceLoader.load(BASE_URL + 'fonts/fontawesome.woff2')
                            .then(function (resource) {
                                assert.equal(resource, testResource);
                            });
                    })
                    .then(done).catch(error);
            });
        });

        describe('web fonts', function () {

            var webFontRule = domtoimage.impl.webFontRule;

            it('should find all web font rules in document', function (done) {
                loadTestPage(
                        'fonts/empty.html',
                        'fonts/rules.css'
                    )
                    .then(function () {
                        return webFontRule.readAll(global.document);
                    })
                    .then(function (fontRules) {
                        var rules = fontRules.rules();

                        assert.deepEqual({
                                'http://fonts.com/font1.woff': 'woff',
                                'http://fonts.com/font1.woff2': 'woff2'
                            },
                            rules.Font1.data().urls());

                        assert.deepEqual({
                                'http://fonts.com/font2.ttf': 'truetype'
                            },
                            rules.Font2.data().urls());

                        assert.include(rules.Font1.data().cssText(), 'Font1');
                        assert.include(rules.Font2.data().cssText(), 'Font2');
                    })
                    .then(done).catch(error);
            });

            it('should resolve relative font urls', function (done) {
                loadTestPage('fonts/rules-relative.html')
                    .then(function () {
                        return webFontRule.readAll(global.document);
                    })
                    .then(function (fontRules) {
                        var rules = fontRules.rules();

                        assert.include(Object.keys(rules['Font1'].data().urls())[0], '/base/spec/resources/font1.woff');
                        assert.include(Object.keys(rules['Font2'].data().urls())[0], '/base/spec/resources/fonts/font2.woff2');
                    })
                    .then(done).catch(error);
            });


            it('should embed web font', function (done) {
                // given
                var cssText, controlString;
                Promise.all([
                            getResource('fonts/cssText').then(function (text) {
                            cssText = text;
                        }),
                            getResource('fonts/font-face.css').then(function (text) {
                            controlString = text;
                        })])
                    .then(function () {
                        // when
                        var fontFaceRule = webFontRule.impl.createRule({
                            cssText: function () {
                                return cssText;
                            },
                            urls: function () {
                                return {
                                    'http://fonts.com/font1.woff2': 'woff2',
                                    'font1.woff': 'woff'
                                };
                            }
                        });
                        return fontFaceRule.embed(mockResourceLoader({
                            'http://fonts.com/font1.woff2': 'AAA',
                            'font1.woff': 'BBB'
                        }));
                    })
                    .then(function (cssRuleString) {
                        // then
                        assert.equal(cssRuleString, controlString);
                    }).then(done).catch(error);
            });

            it('should create style with web font rules', function (done) {
                // given
                loadTestPage(
                        'fonts/empty.html',
                        'fonts/style.css'
                    )
                    .then(function () {
                        return webFontRule.readAll(global.document)
                            .then(function (webFontRules) {
                                return webFontRules.embedAll(Object.keys(webFontRules.rules()), mockResourceLoader({
                                    'http://fonts.com/font1.woff2': 'AAA',
                                    'http://fonts.com/font2.ttf': 'CCC'
                                }));
                            });
                    })
                    .then(function (cssText) {
                        assert.include(cssText, 'url("data:font/woff2;base64,AAA")');
                        assert.include(cssText, 'url("data:font/truetype;base64,CCC")');
                    })
                    .then(done).catch(error);
            });

            it.skip('should render web fonts', function (done) {
                this.timeout(10000);
                loadTestPage(
                        'fonts/regression.html',
                        'fonts/regression.css'
                    )
                    .then(function () {
                        domtoimage.toImage(domNode(), function (image) {
                            drawControlImage(image);
                            document.body.appendChild(image);
                            console.log(image.src);
                            //done();
                        });
                    })
                    .catch(error);
                /*.catch(function(e){
                 console.error(e);
                 })*/
                ;
            });

            function mockResourceLoader(content) {
                return {
                    load: function (url) {
                        return Promise.resolve(content[url]);
                    }
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
            })
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
                    if (this.status == 200)
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
            }).then(drawImage);
        }

        function drawImage(image, node) {
            var node = node || domNode();
            var canvas = $('#canvas')[0];
            canvas.height = node.offsetHeight.toString();
            canvas.width = node.offsetWidth.toString();
            canvas.getContext('2d').drawImage(image, 0, 0);
            return image;
        }

        function domNodeToDataUrl(node) {
            return domtoimage.toDataUrl(node || domNode(), function () {});
        }

        function domNode() {
            return $('#dom-node')[0];
        }

        function controlImage() {
            return $('#control-image')[0];
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
    });
})(this);
