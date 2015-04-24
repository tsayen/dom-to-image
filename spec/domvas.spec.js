(function (global) {
    'use strict';

    var assert = global.chai.assert;
    var imagediff = global.imagediff;
    var domtoimage = global.domvas;

    describe('domtoimage', function () {
        afterEach(cleanup);

        it('should load', function () {
            assert.ok(domtoimage);
        });

        it('should render simple css', function (done) {
            loadTestDocument('regression.html').then(function () {
                checkRendering('control-image-small', done);
            });
        });

        it('should handle big node', function (done) {
            this.timeout(60000);
            loadTestDocument('regression.html').then(function () {
                var child = $('.dom-child-node')[0];
                for (var i = 0; i < 1000; i++) {
                    $('#dom-node')[0].appendChild(child.cloneNode(true));
                }
                checkRendering('control-image-big', done);
            });
        });

        function checkRendering(controlImgId, done) {
            var domNode = $('#dom-node')[0];
            var canvas = $('#rendered-image')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            domtoimage.toImage(domNode, function (image) {
                canvas.getContext('2d').drawImage(image, 0, 0);

                var img = new Image(canvas.width, canvas.height);
                img.onload = function () {
                    var controlImg = $('#' + controlImgId)[0];
                    assert.ok(imagediff.equal(img, controlImg), 'rendered and control images should be equal');
                    done();
                };
                img.src = canvas.toDataURL();
            });
        }

        function loadTestDocument(fileName) {
            var BASE_URL = '/base/spec/resources/';
            return new Promise(function (resolve, reject) {
                var request = new XMLHttpRequest();
                request.open('GET', BASE_URL + fileName, true);
                request.responseType = 'text/html';

                request.onload = function () {
                    if (this.status == 200) {
                        load(request.response.toString());
                        resolve();
                    }
                };
                request.send();
            });
        }

        function load(response) {
            var content = document.createElement('div');
            content.id = 'test-data-root';
            content.innerHTML = response;
            document.body.appendChild(content);
        }

        function cleanup() {
            var testData = $('#test-data-root')[0];
            if (testData) testData.remove();
        }
    });
})(this);
