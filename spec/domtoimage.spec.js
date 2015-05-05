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
                    var domNode = $('#dom-node')[0];
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

        function checkRendering(done) {
            var domNode = $('#dom-node')[0];
            var canvas = $('#canvas')[0];
            var controlImg = $('#control-image')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            domtoimage.toImage(domNode, function (image) {
                canvas.getContext('2d').drawImage(image, 0, 0);
                compare(canvas, controlImg, done);
            });
        }

        function compare(canvas, ctrlImg, done) {
            var img = new Image(canvas.width, canvas.height);
            img.onload = function () {
                assert.ok(imagediff.equal(img, ctrlImg), 'rendered and control images should be equal');
                done();
            };
            img.src = canvas.toDataURL();
        }

        function loadTestPage(domFile, cssFile, controlImageFile) {
            return loadPage()
                .then(function () {
                    return loadText(domFile).then(function (domHtml) {
                        document.getElementById('dom-node').innerHTML = domHtml;
                    });
                })
                .then(function () {
                    return loadText(cssFile).then(function (cssText) {
                        document.getElementById('style').appendChild(document.createTextNode(cssText));
                    });
                })
                .then(function () {
                    return loadText(controlImageFile).then(function (imageHtml) {
                        document.getElementById('control-image').src = imageHtml;
                    });
                })
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
