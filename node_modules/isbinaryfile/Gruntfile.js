module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-release');
  grunt.loadNpmTasks('grunt-exec');
  grunt.initConfig({
    release: {
      options: {
        bump: false,
        add: false,
        push: false,
        tagName: "v<%= version %>"
      }
    },
    exec: {
      test: {
        command: "npm test"
      }
    }
  });
  grunt.registerTask('test', 'exec:test');
  return grunt.registerTask('default', ['test']);
};