karma-chai
==========

[Chai](http://chaijs.com) for [Karma](http://karma-runner.github.io)

[![NPM version](https://badge.fury.io/js/karma-chai.png)](http://badge.fury.io/js/karma-chai) [![Dependency status](https://david-dm.org/xdissent/karma-chai.png)](https://david-dm.org/xdissent/karma-chai) [![devDependency Status](https://david-dm.org/xdissent/karma-chai/dev-status.png)](https://david-dm.org/xdissent/karma-chai#info=devDependencies)

Installation
------------

Install the plugin from npm:

```sh
$ npm install karma-chai --save-dev
```

Or from Github:

```sh
$ npm install 'git+https://github.com/xdissent/karma-chai.git' --save-dev
```

Add `chai` to the `frameworks` key in your Karma configuration:

```coffee
module.exports = (config) ->
  config.set

    # frameworks to use
    frameworks: ['mocha', 'chai']

    # ...
```


Usage
-----

Each of the different Chai assertion suites is available in the tests:

```coffee
describe 'karma tests with chai', ->

  it 'should expose the Chai assert method', ->
    assert.ok('everything', 'everything is ok');

  it 'should expose the Chai expect method', ->
    expect('foo').to.not.equal 'bar'

  it 'should expose the Chai should property', ->
    1.should.not.equal 2
    should.exist 123
```

License
-------

The MIT License (MIT)
