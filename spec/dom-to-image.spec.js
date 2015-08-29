(function(global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domtoimage;
    var Promise = global.Promise;

    var BASE_URL = '/base/spec/resources/';

    describe('domtoimage', function() {

        afterEach(purgePage);

        it('should load', function() {
            assert.ok(domtoimage);
        });

        function makeImage(src) {
            debugger;
            return new Promise(function(resolve) {
                var image = new Image();
                image.onload = function() {
                    resolve(image);
                };
                image.src = src;
            });
        }

        function getControlImage() {
            return $('#control-image')[0];
        }

        function drawImage(image) {
            debugger;
            var domNode = $('#dom-node')[0];
            var canvas = $('#canvas')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            canvas.getContext('2d').drawImage(image, 0, 0);
            return image;
        }

        it.only('should render simple node', function(done) {
            loadTestPage('simple/dom-node.html', 'simple/style.css', 'simple/control-image')
                .then(function() {
                    return domtoimage.toDataUrl($('#dom-node')[0], function() {});
                })
                .then(makeImage).then(drawImage)
                .then(function(image) {
                    debugger;
                    assert.ok(imagediff.equal(image, getControlImage()), 'rendered and control images should be equal');
                }).then(done).catch(error);
        });

        it('should render big node', function(done) {
            this.timeout(30000);
            loadTestPage(
                    'big/dom-node.html',
                    'big/style.css',
                    'big/control-image'
                )
                .then(function() {
                    var domNode = $('#root')[0];
                    var child = $('.dom-child-node')[0];
                    for (var i = 0; i < 1000; i++) {
                        domNode.appendChild(child.cloneNode(true));
                    }
                    checkRendering(domtoimage.toDataUrl, done);
                })
                .catch(error);
        });

        it('should handle "#" in colors and attributes', function(done) {
            loadTestPage(
                    'hash/dom-node.html',
                    'hash/style.css',
                    'simple/control-image'
                )
                .then(function() {
                    checkRendering(domtoimage.toDataUrl, done);
                })
                .catch(error);
        });

        it('should render nested svg with broken namespace', function(done) {
            loadTestPage(
                    'svg/dom-node.html',
                    'svg/style.css',
                    'svg/control-image'
                )
                .then(function() {
                    checkRendering(domtoimage.toDataUrl, done);
                })
                .catch(error);
        });

        function drawControlImage(image) {
            $('#canvas')[0].getContext('2d').drawImage(image, 0, 0);
        }

        it('should render correctly when the node is bigger than container', function(done) {
            loadTestPage(
                    'scroll/dom-node.html',
                    'scroll/style.css',
                    'scroll/control-image'
                )
                .then(function() {
                    var domNode = $('#root')[0];
                    var controlImg = $('#control-image')[0];
                    domtoimage.toDataUrl(domNode, function(dataUrl) {
                        compare(dataUrl, controlImg, domNode, done);
                    });
                });
        });

        it('should render nested text nodes', function(done) {
            loadTestPage(
                    'text/dom-node.html'
                )
                .then(function() {
                    var domNode = $('#dom-node')[0];
                    domtoimage.toImage(domNode, function(image) {
                        drawControlImage(image);
                        assert.include(image.src, 'someText', 'text should be preserved');
                        assert.include(image.src, 'someMoreText', 'text should be preserved');
                        done();
                    });
                })
                .catch(error);
        });

        it('should render to blob', function(done) {
            loadTestPage(
                    'simple/dom-node.html',
                    'simple/style.css',
                    'simple/control-image'
                )
                .then(function() {
                    checkRendering(function(domNode, callback) {
                        domtoimage.toBlob(domNode, function(blob) {
                            callback(global.URL.createObjectURL(blob));
                        });
                    }, done);
                })
                .catch(error);
        });

        describe('resource loader', function() {

            it('should get and encode resource', function(done) {
                getResource('fonts/fontawesome.base64').then(function(testContent) {
                    domtoimage.impl.resourceLoader.load(BASE_URL + 'fonts/fontawesome.woff2')
                        .then(function(content) {
                            assert.equal(content, testContent);
                        }).then(done).catch(error);
                });
            });

            it('should reject when resource not available', function(done) {
                domtoimage.impl.resourceLoader.load('nonexistent file').catch(function(error) {
                    assert.ok(error.message);
                }).then(done);
            });
        });

        describe('web fonts', function() {

            var webFontRule = domtoimage.impl.webFontRule;

            it('should find all web font rules in document', function(done) {
                loadTestPage(
                        'fonts/empty.html',
                        'fonts/rules.css'
                    )
                    .then(function() {
                        return webFontRule.readAll(global.document);
                    })
                    .then(function(fontRules) {
                        var rules = fontRules.rules();
                        assert.deepEqual(Object.keys(rules), ['Font1', 'Font2']);

                        assert.deepEqual({
                                'http://fonts.com/font1.woff': 'woff',
                                'http://fonts.com/font1.woff2': 'woff2'
                            },
                            rules['Font1'].data().urls());

                        assert.deepEqual({
                            'http://fonts.com/font2.ttf': 'truetype'
                        }, rules['Font2'].data().urls());

                        assert.include(rules['Font1'].data().cssText(), 'Font1');
                        assert.include(rules['Font2'].data().cssText(), 'Font2');
                    }).then(done).catch(error);
            });

            it('should resolve relative font urls', function(done) {
                loadTestPage('fonts/rules-relative.html').then(function() {
                    return webFontRule.readAll(global.document);
                }).then(function(fontRules) {
                    var rules = fontRules.rules();
                    assert.include(Object.keys(rules['Font1'].data().urls())[0], '/base/spec/resources/font1.woff');
                    assert.include(Object.keys(rules['Font2'].data().urls())[0], '/base/spec/resources/fonts/font2.woff2');
                }).then(done).catch(error);
            });


            it('should embed web font', function(done) {
                // given
                var cssText, controlString;
                Promise.all(
                        [
                            getResource('fonts/cssText').then(function(text) {
                                cssText = text;
                            }),
                            getResource('fonts/font-face.css').then(function(text) {
                                controlString = text;
                            })
                        ])
                    .then(function() {
                        // when
                        var fontFaceRule = webFontRule.impl.createRule({
                            cssText: function() {
                                return cssText;
                            },
                            urls: function() {
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
                    .then(function(cssRuleString) {
                        // then
                        assert.equal(cssRuleString, controlString);
                    })
                    .then(done)
                    .catch(error);
            });

            it('should create style with web font rules', function(done) {
                // given
                loadTestPage(
                        'fonts/empty.html',
                        'fonts/style.css'
                    )
                    .then(function() {
                        return webFontRule.readAll(global.document)
                            .then(function(webFontRules) {
                                return webFontRules.embedAll(Object.keys(webFontRules.rules()), mockResourceLoader({
                                    'http://fonts.com/font1.woff2': 'AAA',
                                    'http://fonts.com/font2.ttf': 'CCC'
                                }));
                            });
                    })
                    .then(function(cssText) {
                        assert.include(cssText, 'url("data:font/woff2;base64,AAA")');
                        assert.include(cssText, 'url("data:font/truetype;base64,CCC")');
                    })
                    .then(done)
                    .catch(error);
            });

            it.skip('should render web fonts', function(done) {
                this.timeout(10000);
                loadTestPage(
                        'fonts/regression.html',
                        'fonts/regression.css'
                    )
                    .then(function() {
                        var domNode = $('#dom-node')[0];
                        domtoimage.toImage(domNode, function(image) {
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
        });

        function error(e) {
            console.error(e.toString() + '\n' + e.stack);
        }

        it('should use node filter', function(done) {
            loadTestPage(
                    'filter/dom-node.html',
                    'filter/style.css',
                    'filter/control-image'
                )
                .then(function() {
                    var domNode = $('#dom-node')[0];
                    var controlImg = $('#control-image')[0];
                    domtoimage.toDataUrl(domNode, function(dataUrl) {
                        compare(dataUrl, controlImg, domNode, done);
                    }, {
                        filter: function(node) {
                            if (node.classList)
                                return !node.classList.contains('omit');
                            return true;
                        }
                    });
                });
        });

        function compare(imgUrl, ctrlImg, node, done) {
            var img = new Image();
            img.onload = function() {
                drawRenderedImage(img, node);
                assert.ok(imagediff.equal(img, ctrlImg), 'rendered and control images should be equal');
                done();
            };
            img.src = imgUrl;

            function drawRenderedImage(image, node) {
                var canvas = $('#canvas')[0];
                canvas.height = node.scrollHeight.toString();
                canvas.width = node.scrollWidth.toString();
                canvas.getContext('2d').drawImage(image, 0, 0);
            }
        }

        function checkRendering(makeDataUrl, done) {
            var domNode = $('#dom-node')[0];
            var canvas = $('#canvas')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            makeDataUrl(domNode, function(dataUrl) {
                checkDataUrl(dataUrl, done);
            });
        }

        function checkDataUrl(imageDataUrl, done) {
            var control = $('#control-image')[0];
            var rendered = new Image();
            rendered.onload = function() {
                drawControlImage(rendered);
                assert.ok(imagediff.equal(rendered, control), 'rendered and control images should be equal');
                done();
            };
            rendered.src = imageDataUrl;
        }

        function drawRenderedImage(image, node) {
            var canvas = $('#canvas')[0];
            canvas.height = node.scrollHeight.toString();
            canvas.width = node.scrollWidth.toString();
            canvas.getContext('2d').drawImage(image, 0, 0);
        }

        function loadTestPage(html, css, controlImage) {
            return loadPage().then(function() {
                return getResource(html).then(function(html) {
                    document.getElementById('root').innerHTML = html;
                });
            }).then(function() {
                if (css) return getResource(css).then(function(css) {
                    document.getElementById('style').appendChild(document.createTextNode(css));
                });
            }).then(function() {
                if (controlImage) return getResource(controlImage).then(function(css) {
                    document.getElementById('control-image').src = css;
                });
            })
        }

        function loadPage() {
            return getResource('page.html').then(function(html) {
                var root = document.createElement('div');
                root.id = 'test-root';
                root.innerHTML = html;
                document.body.appendChild(root);
            });
        }

        function purgePage() {
            var root = document.getElementById('test-root');
            if (root) root.remove();
        }

        function getResource(fileName) {
            var url = BASE_URL + fileName;
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'text';

            return new Promise(function(resolve, reject) {
                request.onload = function() {
                    if (this.status == 200)
                        resolve(request.response.toString().trim());
                    else
                        reject(new Error('cannot load ' + url));
                };
                request.send();
            });
        }

        function mockResourceLoader(content) {
            return {
                load: function(url) {
                    return new Promise(function(resolve, reject) {
                        resolve(content[url]);
                    });
                }
            };
        }
    });
})(this);
