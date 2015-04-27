module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'chai'],

        files: [{
            pattern: 'spec/resources/*.html',
            included: false,
            served: true
        },

            'bower_components/jquery/dist/jquery.js',
            'bower_components/bluebird/js/browser/bluebird.js',
            'bower_components/js-imagediff/imagediff.js',

            'src/domvas.js',
            'spec/**/*spec.js'
        ],

        exclude: [],
        preprocessors: {},
        reporters: ['mocha'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        //browsers: ['Chrome', 'Firefox'],
        //browsers: ['Firefox'],
        browsers: ['Chrome'],
        browserNoActivityTimeout: 60000,
        singleRun: false
    });
};
