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
                        appURI: 'http://localhost:3000/',
                        instagramClientId: '85973222e459460bb99f8a229e0ce798'
                    }
                }
            },
            prod:{
                constants: {
                    ENV: {
                        appURI: 'http://instalurker-andreavitali.rhcloud.com/',
                        instagramClientId: '6e798574bcab460bb13c7c511e328335'
                    }
                }
            }
        },

        // concat
        concat: {
            options: {
                separator: ';' // useful for following uglify
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

        // CSS minification
        cssmin: {
            prod: {
                files: {
                    'public/stylesheets/app.min.css' : ['public/stylesheets/app.css']
                }
            }
        },

        // Change index.html to use minified files
        targethtml: {
            prod: {
                files: {
                    'public/index.html': 'public/index.html'
                }
            }
        }

        // SASS compilation made by IDE
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-ng-constant');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-targethtml');

    // Dev task
    grunt.registerTask('dev', ['ngconstant:dev']); // no

    // Default (prod) task
    grunt.registerTask('default', ['ngconstant:prod','concat:vendor','concat:app','uglify:app','cssmin','targethtml']);
}