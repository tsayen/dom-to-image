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
            //this.timeout(20000);
            loadTestDocument('regression.html').then(function () {
                checkRendering('control-image-small', done);
            });
        });

        it('should render nested svg', function (done) {
            this.timeout(60000);
            loadTestDocument('nested-svg.html').then(function () {
                checkRendering('control-image', done);
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

        function checkRendering(controlImageId, done) {
            var domNode = $('#dom-node')[0];
            var canvas = $('#rendered-image')[0];
            canvas.height = domNode.offsetHeight.toString();
            canvas.width = domNode.offsetWidth.toString();
            domtoimage.toImage(domNode, function (result) {
                canvas.getContext('2d').drawImage(result, 0, 0);
                //console.log(canvas.toDataURL());
                var image = new Image(canvas.width, canvas.height);
                image.onload = function () {
                    var controlImage = $('#' + controlImageId)[0];
                    //setTimeout(function(){
                        assert.ok(imagediff.equal(image, controlImage), 'rendered and control images should be equal');
                        done();
                    //}, 10000);
                };
                image.src = canvas.toDataURL();
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
