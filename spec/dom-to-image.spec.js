(function (global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domtoimage;

    var BASE_URL = '/base/spec/resources/';

    describe('domtoimage', function () {

        afterEach(purgePage);

        it('should load', function () {
            assert.ok(domtoimage);
        });

        it('should render simple node', function (done) {
            loadTestPage(
                'simple/dom-node.html',
                'simple/style.css',
                'simple/control-image'
            ).then(function () {
                    checkRendering(domtoimage.toDataUrl, done);
                });
        });

        it.skip('should render big node', function (done) {
            this.timeout(30000);
            loadTestPage(
                'big/dom-node.html',
                'big/style.css',
                'big/control-image'
            ).then(function () {
                    var domNode = $('#dom-node')[0];
                    var child = $('.dom-child-node')[0];
                    for (var i = 0; i < 1000; i++) {
                        domNode.appendChild(child.cloneNode(true));
                    }
                    checkRendering(domtoimage.toDataUrl, done);
                });
        });

        it('should handle "#" in colors and attributes', function (done) {
            loadTestPage(
                'hash/dom-node.html',
                'hash/style.css',
                'simple/control-image'
            ).then(function () {
                    checkRendering(domtoimage.toDataUrl, done);
                });
        });

        it('should render nested svg with broken namespace', function (done) {
            loadTestPage(
                'svg/dom-node.html',
                'svg/style.css',
                'svg/control-image'
            ).then(function () {
                    checkRendering(domtoimage.toDataUrl, done);
                });
        });

        function drawControlImage(image) {
            $('#canvas')[0].getContext('2d').drawImage(image, 0, 0);
        }

        it('should render nested text nodes', function (done) {
            loadTestPage(
                'text/dom-node.html'
            ).then(function () {
                    var domNode = $('#dom-node')[0];
                    domtoimage.toImage(domNode, function (image) {
                        drawControlImage(image);
                        assert.include(image.src, 'someText', 'text should be preserved');
                        assert.include(image.src, 'someMoreText', 'text should be preserved');
                        done();
                    });
                });
        });

        it('should render to blob', function (done) {
            loadTestPage(
                'simple/dom-node.html',
                'simple/style.css',
                'simple/control-image'
            ).then(function () {
                    checkRendering(function (domNode, callback) {
                        domtoimage.toBlob(domNode, function (blob) {
                            callback(global.URL.createObjectURL(blob));
                        });
                    }, done);
                });
        });

        it('should find web font declarations', function (done) {
            loadTestPage(
                'fonts/urls.html',
                'fonts/urls.css'
            ).then(function () {
                    var urls = domtoimage.impl.getWebFontRules(document);
                    assert.deepEqual(urls['Font1'].sources, [{'http://fonts.com/font1.woff': 'woff'}]);
                    assert.include(urls['Font1'].cssText, "Font1");
                    assert.deepEqual(urls['Font2'].sources, [{'http://fonts.com/font2.ttf': 'truetype'}]);
                    assert.include(urls['Font2'].cssText, "Font2");
                    assert.isUndefined(urls['Font3']);
                    done();
                });
        });

        it('should get encoded web font file', function (done) {
            domtoimage.impl.getWebFont(BASE_URL + 'fonts/fontawesome.woff2', function (content) {
                loadText('fonts/fontawesome.base64')
                    .then(function (testContent) {
                        assert.equal(content, testContent);
                        done();
                    });
            });
        });

        it('should create font face rule', function (done) {
            loadText('fonts/cssText').then(function (cssText) {
                var ruleString = domtoimage.impl.createFontFaceRule(
                    {
                        cssText: cssText,
                        sources: {
                            "http://fonts.com/font1.woff2": "woff2",
                            "font1.woff": "woff"
                        }
                    },
                    {
                        "http://fonts.com/font1.woff2": "AAA",
                        "font1.woff": "BBB"
                    }
                );
                loadText('fonts/font-face.css').then(function (controlString) {
                    assert.equal(ruleString, controlString);
                    done();
                })
            });
        });

        //it.skip('should render external fonts', function (done) {
        //    //this.timeout(60000);
        //    loadTestPage(
        //        'fonts/dom-node.html',
        //        'fonts/style.css'
        //    ).then(function () {
        //            var domNode = $('#dom-node')[0];
        //            domtoimage.toImage(domNode, function (image) {
        //                drawControlImage(image);
        //                // console.log(image.src);
        //                //done();
        //            });
        //        });
        //});

        function checkRendering(makeDataUrl, done) {
            var domNode = $('#dom-node')[0];
            var canvas = $('#canvas')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            makeDataUrl(domNode, function (dataUrl) {
                checkDataUrl(dataUrl, done);
            });
        }

        function checkDataUrl(imageDataUrl, done) {
            var control = $('#control-image')[0];
            var rendered = new Image();
            rendered.onload = function () {
                drawControlImage(rendered);
                assert.ok(imagediff.equal(rendered, control), 'rendered and control images should be equal');
                done();
            };
            rendered.src = imageDataUrl;
        }

        function loadTestPage(domFile, cssFile, controlImageFile) {
            return loadPage()
                .then(function () {
                    return loadText(domFile).then(function (domHtml) {
                        document.getElementById('dom-node').innerHTML = domHtml;
                    });
                })
                .then(function () {
                    if (cssFile)
                        return loadText(cssFile).then(function (cssText) {
                            document.getElementById('style').appendChild(document.createTextNode(cssText));
                        });
                })
                .then(function () {
                    if (controlImageFile)
                        return loadText(controlImageFile).then(function (imageHtml) {
                            document.getElementById('control-image').src = imageHtml;
                        });
                });
        }

        function loadPage() {
            return loadText('page.html').then(function (text) {
                var root = document.createElement('div');
                root.id = 'test-root';
                root.innerHTML = text;
                document.body.appendChild(root);
            });
        }

        function purgePage() {
            var root = document.getElementById('test-root');
            if (root) root.remove();
        }

        function loadText(fileName) {
            var url = BASE_URL + fileName;
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'text/plain';

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
    });
})(this);
