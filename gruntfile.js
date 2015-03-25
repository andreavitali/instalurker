//-----------------------------------------
// Grunt configuration
//-----------------------------------------

module.exports = function(grunt) {

    // Init config
    grunt.initConfig({

        // environment constant
        ngconstant: {
            options: {
                space: '  ',
                name: 'envConstant',
                dest: 'public/js/envConstant.js'
            },
            dev: {
                constants: {
                    ENV: {
                        appURI: 'http://localhost:3000'
                    }
                }
            },
            prod:{
                constants: {
                    ENV: {
                        appURI: 'http://instalurker-andreavitali.rhcloud.com'
                    }
                }
            }
        },

        // concat
        concat: {
            options: {
                separator: ';' // useful for next uglify
            },
            app: {
                src: 'public/js/**/*.js',
                dest: 'public/instalurker.js'
            },
            vendor: {
                src: ['public/vendor/jquery.min.js','public/vendor/angular.min.js','public/vendor/*.min.js'], // order is important!
                dest: 'public/vendor.min.js'
            }
        },

        // uglify (only app JS because vendor's are already minified)
        uglify: {
            options: {
                mangle: false
            },
            app: {
                src: 'public/instalurker.js',
                dest: 'public/instalurker.min.js',
                ext: '.min.js'
            }
        },

        // SASS
        sass: {
            prod: {
                files: {
                    'public/stylesheets/app.css': 'public/stylesheets/app.scss'
                }
            }
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-ng-constant');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');

    // Dev task
    grunt.registerTask('dev', ['ngconstant:dev']); // no SASS compile because I used IDE file watchers

    // Default (prod) task
    grunt.registerTask('default', ['ngconstant:prod','concat:vendor','concat:app','uglify:app','sass']);
}