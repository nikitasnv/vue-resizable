var webpackConfig = require('./../../webpack.config.dev.js');

module.exports = function (config) {
    config.set({
        frameworks: ['mocha', 'chai'],
        colors: true,
        singleRun: true,
        files: [
            './specs/*VueResizable.spec.js'
        ],

        preprocessors: {
            './specs/VueResizable.spec.js': ['webpack', 'sourcemap']
        },

        webpack: webpackConfig,

        reporters: ['spec', 'coverage'],

        coverageReporter: {
            dir: './coverage',
            reporters: [
                {type: 'lcov', subdir: '.'},
                {type: 'text-summary'}
            ]
        },
        browsers: ['Chrome'],
    })
}