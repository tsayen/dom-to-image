describe('domvas', function () {
    'use strict';

    var assert = chai.assert;

    it('should load', function () {
        assert.ok(domvas);
    });

    it('should render simple css correctly', function (done) {
        loadHtml('regression-simple.html').then(function (html) {
            document.write(html);
            var dom_node = $('#dom-node')[0];
            console.log('hey! ' + dom_node);
            done();
        });
    });

    function loadHtml(path) {
        return new Promise(function (resolve) {
            var request = new XMLHttpRequest();
            console.log('request ' + request);
            request.open('GET', '/base/spec/resources/' + path, true);
            request.responseType = 'text/html';
            request.onload = function () {
                if (this.status == 200) resolve(request.response.toString());
            };
            request.send();
        });
    }
});
