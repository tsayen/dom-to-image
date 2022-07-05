module.exports = function(config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'chai'],
        concurrency: 1,

        files: [{
                pattern: 'spec/resources/**/*',
                included: false,
                served: true
            }, {
                pattern: 'test-lib/fontawesome/fonts/*.*',
                included: false,
                served: true
            }, {
                pattern: 'test-lib/fontawesome/css/*.*',
                included: false,
                served: true
            },

            'test-lib/jquery/dist/jquery.js',
            'test-lib/js-imagediff/imagediff.js',
            'test-lib/tesseract-1.0.10.js',

            'src/dom-to-image-more.js',
            'spec/dom-to-image-more.spec.js'
        ],

        exclude: [],
        preprocessors: {},
        reporters: ['mocha'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        client: {
            captureConsole: true
        },
        autoWatch: true,
        browsers: ['chrome'],
        customLaunchers: {
            chrome: {
                base: 'Chrome',
                flags: ['--no-sandbox']
            }
        },

        singleRun: false,
        browserNoActivityTimeout: 60000
    });
};