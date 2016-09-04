/* jshint node:true */
module.exports = function (grunt) {
    'use strict';

    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    var scripts = [
        'js/**/*.js'
    ];


    var src = {
        scripts: scripts
    };

    grunt.initConfig(
        {
            // ----- Environment
            pkg: grunt.file.readJSON('package.json'),


            jshint: {
                options: {
                    jshintrc: '.jshintrc'
                },
                all: scripts
            },

            jscs: {
                options: {
                    config: '.jscs'
                },
                dev: {
                    files: {
                        src: scripts
                    }
                }
            },

            watch: {
                script: {
                    files: scripts,
                    tasks: ['jscs', 'jshint'] 
                }
            },

            'http-server': {
                'dev': {
                    root: '../../',
                    runInBackground: true
                }
            }


        }
    );

    grunt.registerTask('default-bootstrap3', ['jscs', 'jshint', 'http-server', 'watch']);
    grunt.loadNpmTasks('grunt-notify');

};
