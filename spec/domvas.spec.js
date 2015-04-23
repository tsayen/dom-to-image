describe('domvas', function () {
    'use strict';

    var assert = chai.assert;

    it('should load', function () {
        assert.ok(domvas);
    });

    it('should render simple css correctly', function (done) {
        loadHtml('regression-simple.html').then(function () {
            var dom_node = $('#dom-node')[0];
            domvas.toImage(dom_node, function (image) {
                var canvas = $('#rendered-image')[0];
                canvas.getContext('2d').drawImage(image, 0, 0);
                var renderedImage = new Image(canvas.height, canvas.width);
                renderedImage.src = canvas.toDataURL();

                var controlImage = $('#control-image')[0];

                assert.ok(imagediff.equal(renderedImage, controlImage));
                done();
            });
        }).catch(function (e) {
            console.error(e);
        });
    });

    function loadHtml(fileName) {
        return new Promise(function (resolve, reject) {
            var url = '/base/spec/resources/' + fileName;
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'text/html';

            request.onload = function () {
                if (this.status == 200) {
                    var content = document.createElement('div');
                    content.innerHTML = request.response.toString();
                    $('body')[0].appendChild(content);
                    resolve();
                }
            };

            request.send();
        });
    }
});
