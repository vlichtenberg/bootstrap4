/* jshint node:true */
module.exports = function (grunt) {
    'use strict';

    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    var scripts = [
        '_js/**/*.js'
    ];
    var sass = [
        '_sass/styles.scss'
    ];

    var src = {
        scripts: scripts,
        sass: sass
    };

    grunt.initConfig(
        {
            // ----- Environment
            pkg: grunt.file.readJSON('package.json'),

            browserSync: {
                dev: {
                    bsFiles: {
                        src : [
                            './js/*.js',
                            './css/*.css',
                            './img/*.*',
                            './_stubs/*.html'
                        ]
                    },
                    options: {
                        server: '../../',
                        watchTask: true, // watch runs after browserSync
                        port: 8282, // default port is 3000, browserSync admin is on http://localhost:3001/
                        directory: true, // show directory listing
                        open: false // don't open the browser automatically
                    }
                }
            },

            jscs: {
                options: {
                    config: '.jscs'
                },
                dev: {
                    files: {
                        src: src.scripts
                    }
                }
            },

            jshint: {
                options: {
                    jshintrc: '.jshintrc'
                },
                all: src.scripts
            },

            sass: {
                dev: {
                    options: {
                        outputStyle: 'expanded',
                        sourceMap: true
                    },
                    files: {
                        'css/styles.css': src.sass
                    }
                }
            },

            uglify: {
                dev: {
                    options: {
                        beautify: true, // for debugging
                        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd HH:MM") %> */',
                        mangle: false, // for debugging
                        sourceMap: true,
                        sourceMapIncludeSources: true
                    },
                    files: {
                        'js/<%= pkg.name.toLowerCase() %>.js': src.scripts
                    }
                }
            },

            watch: {
                sass: {
                    files: ['_sass/**/*.scss'],
                    tasks: ['sass:dev']
                },
                script: {
                    files: ['_js/**/*.js'],
                    tasks: ['jscs', 'jshint', 'uglify:dev'] // the :run flag for karma is required
                }
            }

        }
    );

    grunt.registerTask('default', ['jscs', 'jshint', 'uglify:dev', 'sass:dev', 'browserSync', 'watch']);
    grunt.loadNpmTasks('grunt-notify');

};
