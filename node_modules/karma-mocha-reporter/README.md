# karma-mocha-reporter

> Karma reporter plugin with mocha style logging.

> [![NPM version](https://badge.fury.io/js/karma-mocha-reporter.svg)](http://badge.fury.io/js/karma-mocha-reporter)
[![Build Status](https://secure.travis-ci.org/litixsoft/karma-mocha-reporter.svg?branch=master)](https://travis-ci.org/litixsoft/karma-mocha-reporter)
[![david-dm](https://david-dm.org/litixsoft/karma-mocha-reporter.svg?theme=shields.io)](https://david-dm.org/litixsoft/karma-mocha-reporter/)
[![david-dm](https://david-dm.org/litixsoft/karma-mocha-reporter/dev-status.svg?theme=shields.io)](https://david-dm.org/litixsoft/karma-mocha-reporter#info=devDependencies&view=table)

## How does it look like
![screenshot](demo/screen.png)

## Installation
The easiest way is to keep `karma-mocha-reporter` as a devDependency in your `package.json`.
```json
{
  "devDependencies": {
    "karma": "^0.13",
    "karma-mocha-reporter": "^1.1.6"
  }
}
```

You can simple do it by:

    $ npm install karma-mocha-reporter --save-dev

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],

    // reporters configuration
    reporters: ['mocha'],

    plugins: [
      'karma-jasmine',
      'karma-mocha-reporter'
    ]
  });
};
```

## Options
### colors
**Type:** Object

Let's you overwrite the default colors. Possible values are all colors and background colors from [chalk](https://github.com/chalk/chalk#colors).

**Possible Values:**

Value | Description | Default
------ | ----------- | -------
`success` | success messages | green
`info` | info messages | grey
`warning` | warn messages | yellow
`error` | error messages | red

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],

    // reporters configuration
    reporters: ['mocha'],

    // reporter options
    mochaReporter: {
      colors: {
        success: 'blue',
        info: 'bgGreen',
        warning: 'cyan',
        error: 'bgRed'
      }
    },

    plugins: [
      'karma-jasmine',
      'karma-mocha-reporter'
    ]
  });
};
```

### output
**Type:** String

**Possible Values:**

Value | Description
------ | -----------
`full` (default) | all output is printed to the console
`autowatch` | first run will have the full output and the next runs just output the summary and errors in mocha style
`minimal` | only the summary and errors are printed to the console in mocha style
`noFailures` | the failure details are not logged

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],

    // reporters configuration
    reporters: ['mocha'],

    // reporter options
    mochaReporter: {
      output: 'autowatch'
    },

    plugins: [
      'karma-jasmine',
      'karma-mocha-reporter'
    ]
  });
};
```

### showDiff
**Type:** String | Boolean

Shows a diff output. Is disabled by default. All credits to the contributors of [mocha](https://github.com/mochajs/mocha), since the diff logic is used from there and customized for this module.

![screenshot](demo/diff.png)

Currently only works with karma-mocha >= v0.2.2 Not supported for karma-jasmine since the additional properties needed to render the diff are not supported in jasmine yet.

**Possible Values:**

Value | Description
------ | -----------
`true` | prints each diff in its own line, same as `'unified'`
`'unified'` | prints each diff in its own line
`'inline'` | prints diffs inline

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],

    // reporters configuration
    reporters: ['mocha'],

    // reporter options
    mochaReporter: {
      showDiff: true
    },

    plugins: [
      'karma-chai',
      'karma-mocha',
      'karma-mocha-reporter'
    ]
  });
};
```

### divider
**Type:** String

**Default:** 80 equals signs ('=')

The string to output between multiple test runs. Set to empty string to disable

```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine'],

    // reporters configuration
    reporters: ['mocha'],

    // reporter options
    mochaReporter: {
      divider: ''
    },

    plugins: [
      'karma-jasmine',
      'karma-mocha-reporter'
    ]
  });
};
```

### ignoreSkipped
**Type:** Boolean

**Possible Values:**
  * `false` (default)
  * `true`

When setting the ignoreSkipped flag to true, the reporter will ignore the skipped tests in the output and you will see
only the tests that where really executed. The summary will still contain the number of skipped tests.


## Contributing
In lieu of a formal styleguide take care to maintain the existing coding style. Lint and test your code using [grunt](http://gruntjs.com/).

You can preview your changes by running:

    $ npm run demo

## Release History
### v1.3.0
* Wait before printing output of a test after all browser have run the test

### v1.2.3
* Set property success to `true` when a test is skipped. Prevents wrong output in the failure summary

### v1.2.2
* Update error message when diff output is enabled and the required modules are missing

### v1.2.1
* Check if property `assertionErrors` has at least one item before calculating the diff output

### v1.2.0
* Add support for diff output for failed tests

### v1.1.6
* Fix error that reporter output was truncated when running multiple browsers
* Reverts part of the fix from v1.1.4 (identical it blocks within the same describe block are only printed correctly when the test are run in one browser)

### v1.1.5
* Show error message when the karma runner ends with an error

### v1.1.4
* Print specs correctly when names of it blocks are identical within the same describe block

### v1.1.3
* Fix for divider is always "=" even the user set divider in config

### v1.1.2
* Show a divider line between multiple test runs for clarity

### v1.1.1
* Use overwritten colors also for the log symbols

### v1.1.0
* Add option `colors` to config that allows to overwrite the default colors

### v1.0.4
* Added plural or singular noun for 'test' based on count

### v1.0.3
* Changed some formatting to not start at newline

### v1.0.2
* enable colors when karma is piped

### v1.0.1
* print out all errors in the summary when spec fails

### v1.0.0
* add output option `noFailures` -  when set, the failure details are not logged
* time to get final with 1.0.0 :-)

### v0.3.2
* strip color from symbols when colors is set to false

### v0.3.1
* add option "ignoreSkipped" to ignore the skipped test in the output

### v0.3.0
* add option "output" to set the output level of the reporter

### v0.2.8
* add module log-symbols for printing symbols to the console

### v0.2.7
* report totalTime and netTime the same way "dots" and "progress" reporters do

### v0.2.6
* don't crash when the name of the describe or it block is a reserved object property (e.g. constructor, toString)

### v0.2.5
* results summary is now also printed when all tests fail

### v0.2.4
* better browser names formatting
* fix calculating describe items' success
* use karma's error formatter

### v0.2.3
* fix missing test results when singleRun = true

### v0.2.2
* fix that skipped test where reported as failure

### v0.2.1
* make reporter compatible with karma 0.11

### v0.2.0
* replace dependency color.js with chalk.js

### v0.1.0
* first release

## Author
[Litixsoft GmbH](http://www.litixsoft.de)

## License
Copyright (C) 2013-2015 Litixsoft GmbH <info@litixsoft.de>
Licensed under the MIT license.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included i
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.