describe('domvas', function () {
    'use strict';

    var assert = chai.assert;

    it('should load', function () {
        assert.ok(domvas);
    });

    it('should render simple css correctly', function (done) {
        loadHtml('regression-simple.html').then(function () {
            var dom_node = $('#dom-node')[0];
            console.log('hey! ' + dom_node);
            done();
        });
    });

    function loadHtml(fileName) {
        return new Promise(function (resolve, reject) {
            var url = '/base/spec/resources/' + fileName;
            var request = new XMLHttpRequest();
            console.log('request ' + request);
            request.open('GET', url, true);
            request.responseType = 'text/html';

            request.onload = function () {
                if (this.status == 200) {
                    var content = document.createElement('div');
                    content.innerHTML = request.response.toString();
                    $('body')[0].appendChild(content);
                    resolve();
                };
            };
            
            request.send();
        });
    }
});
