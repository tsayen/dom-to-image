module.exports = function (grunt) {
  var plugins = ['karma-mocha']
  var browsers = []

  if (process.env.TRAVIS) {
    plugins.push('karma-firefox-launcher')
    browsers.push('Firefox')
  } else {
    plugins.push('karma-chrome-launcher')
    browsers.push('Chrome')
  }

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    pkgFile: 'package.json',

    eslint: {
      target: [
        'gruntfile.js',
        'lib/*.js',
        'tasks/*.js',
        'test/*.js'
      ]
    },

    'npm-publish': {
      options: {
        abortIfDirty: true
      }
    },

    'npm-contributors': {
      options: {
        commitMessage: 'chore: Update contributors'
      }
    },

    conventionalChangelog: {
      release: {
        options: {
          changelogOpts: {
            preset: 'angular'
          }
        },
        src: 'CHANGELOG.md'
      }
    },

    conventionalGithubReleaser: {
      release: {
        options: {
          auth: {
            type: 'oauth',
            token: process.env.GH_TOKEN
          },
          changelogOpts: {
            preset: 'angular'
          }
        }
      }
    },

    bump: {
      options: {
        updateConfigs: ['pkg'],
        commitFiles: ['package.json', 'CHANGELOG.md'],
        commitMessage: 'chore: release v%VERSION%',
        pushTo: 'upstream',
        gitDescribeOptions: '| echo "beta-$(git rev-parse --short HEAD)"'
      }
    },

    karma: {
      options: {
        browsers: browsers,
        frameworks: ['mocha'],
        plugins: plugins
      },
      single: {
        singleRun: true,
        files: [
          {
            src: 'node_modules/expect.js/index.js'
          }, {
            src: 'test/**/*.js'
          }
        ]
      },
      config: {
        configFile: 'karma.conf.js',
        singleRun: true
      },
      merge: {
        options: {
          files: ['node_modules/expect.js/index.js']
        },
        singleRun: true,
        files: [
          {
            src: 'test/**/*.js'
          }
        ]
      },
      dev: {
        reporters: 'dots',
        background: true
      },
      auto: {
        autoWatch: true
      }
    },
    watch: {
      tests: {
        files: 'test/**/*.js',
        tasks: ['karma:dev:run']
      }
    }
  })

  grunt.loadTasks('tasks')
  require('load-grunt-tasks')(grunt)

  grunt.registerTask('test', ['karma:single', 'karma:config', 'karma:merge'])
  grunt.registerTask('default', ['eslint', 'test'])

  grunt.registerTask('release', 'Bump the version and publish to npm.', function (type) {
    grunt.task.run([
      'npm-contributors',
      'bump:' + (type || 'patch') + ':bump-only',
      'conventionalChangelog',
      'bump-commit',
      'conventionalGithubReleaser',
      'npm-publish'
    ])
  })
}
