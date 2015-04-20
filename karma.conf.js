module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['mocha', 'chai'],
        
        files: [
            'src/domvas.js',
            'test/**/*spec.js'
        ],
        
        exclude: [],
        preprocessors: {},
        reporters: ['mocha'],
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['chrome-small'],
        customLaunchers: {
            'chrome-small': {
                base: 'Chrome',
                flags: [
                    '--window-size=300,200'
                ]
            }
        },
        singleRun: true
    });
};
