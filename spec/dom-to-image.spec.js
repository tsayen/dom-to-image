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
                    checkRendering(done);
                });
        });

        it('should render big node', function (done) {
            this.timeout(30000);
            loadTestPage(
                'big/dom-node.html',
                'big/style.css',
                'big/control-image'
            ).then(function () {
                    var domNode = $('#root')[0];
                    var child = $('.dom-child-node')[0];
                    for (var i = 0; i < 1000; i++) {
                        domNode.appendChild(child.cloneNode(true));
                    }
                    checkRendering(done);
                });
        });

        it('should handle "#" in colors and attributes', function (done) {
            loadTestPage(
                'hash/dom-node.html',
                'hash/style.css',
                'simple/control-image'
            ).then(function () {
                    checkRendering(done);
                });
        });

        it('should render nested svg with broken namespace', function (done) {
            loadTestPage(
                'svg/dom-node.html',
                'svg/style.css',
                'svg/control-image'
            ).then(function () {
                    checkRendering(done);
                });
        });

        it('should render correctly when the node is bigger than container', function (done) {
            loadTestPage(
                'scroll/dom-node.html',
                'scroll/style.css',
                'scroll/control-image'
            ).then(function () {
                    var domNode = $('#root')[0];
                    var controlImg = $('#control-image')[0];
                    domtoimage.toDataUrl(domNode, function (dataUrl) {
                        compare(dataUrl, controlImg, domNode, done);
                    });
                });
        });

        it('should render nested text nodes', function (done) {
            loadTestPage(
                'text/dom-node.html'
            ).then(function () {
                    var domNode = $('#dom-node')[0];
                    domtoimage.toImage(domNode, function (image) {
                        drawRenderedImage(image, domNode);
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
                    var domNode = $('#dom-node')[0];
                    var controlImg = $('#control-image')[0];
                    domtoimage.toBlob(domNode, function (blob) {
                        var img = new Image();
                        img.onload = function () {
                            drawRenderedImage(img, domNode);
                            assert.ok(imagediff.equal(img, controlImg), 'rendered and control images should be equal');
                            done();
                        };
                        img.src = URL.createObjectURL(blob);
                    });
                });
        });

        it('should use node filter', function (done) {
            loadTestPage(
                'filter/dom-node.html',
                'filter/style.css',
                'filter/control-image'
            ).then(function () {
                    var domNode = $('#dom-node')[0];
                    var controlImg = $('#control-image')[0];
                    domtoimage.toDataUrl(domNode, function (dataUrl) {
                        compare(dataUrl, controlImg, domNode, done);
                    }, {
                        filter: function (node) {
                            if (node.classList)
                                return !node.classList.contains('omit');
                            return true;
                        }
                    });
                });
        });

        function checkRendering(done) {
            var domNode = $('#dom-node')[0];
            var controlImg = $('#control-image')[0];
            domtoimage.toDataUrl(domNode, function (dataUrl) {
                compare(dataUrl, controlImg, domNode, done);
            });
        }

        function compare(imgUrl, ctrlImg, node, done) {
            var img = new Image();
            img.onload = function () {
                drawRenderedImage(img, node);
                assert.ok(imagediff.equal(img, ctrlImg), 'rendered and control images should be equal');
                done();
            };
            img.src = imgUrl;
        }

        function drawRenderedImage(image, node) {
            var canvas = $('#canvas')[0];
            canvas.height = node.scrollHeight.toString();
            canvas.width = node.scrollWidth.toString();
            canvas.getContext('2d').drawImage(image, 0, 0);
        }

        function loadTestPage(domFile, cssFile, controlImageFile) {
            return loadPage()
                .then(function () {
                    return loadText(domFile).then(function (domHtml) {
                        document.getElementById('root').innerHTML = domHtml;
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
                        resolve(request.response.toString());
                    else
                        reject(new Error('cannot load ' + url));
                };
                request.send();
            });
        }
    });
})(this);
