// Karma configuration
// Generated on Fri Jan 16 2015 15:45:09 GMT+0100 (CET)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],


    // list of files / patterns to load in the browser
    files: [
      'node_modules/chai/chai.js',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/sinon-chai/lib/sinon-chai.js',

      'node_modules/requirejs/require.js',
      'node_modules/karma-requirejs/lib/adapter.js',

      'test/test-main.js',

      { pattern: 'node_modules/underscore/underscore.js', included: false },
      { pattern: 'node_modules/backbone/backbone.js', included: false },
      { pattern: 'node_modules/jquery/dist/jquery.js', included: false },
      { pattern: 'backbone-partialput.js', included: false },
      { pattern: "test/*.spec.js", included: false }

    ],

    preprocessors: {
      '*.js': ['coverage']
    },

    coverageReporter: {
      type : 'cobertura',
      dir : 'coverage/'
    },

    junitReporter: {
      outputFile: "results/test-results.xml",
      suite: "Backbone Relations"
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ["dots", "coverage", "junit"],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true

  });
};
