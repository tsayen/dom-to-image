module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'chai'],

        files: [
            {pattern: 'spec/resources/**/*', included: false, served: true},

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
        browsers: ['Chrome', 'Firefox'],
        singleRun: true,
        browserNoActivityTimeout: 60000
    });
};
