var should;

(function(window) {
  window.should = window.chai.should();
  window.expect = window.chai.expect;
  window.assert = window.chai.assert;
})(window);