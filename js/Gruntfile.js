
module.exports = function (grunt) {
  let files = [
    'src/core/index.js', 'src/core/katrid.js', 'src/core/app.js',
    'src/utils/index.js', 'src/utils/i18n.js',
    'src/io/services.js',
    'src/data/index.js', 'src/data/record.js', 'src/data/datasource.js', 'src/data/fields.js',
    'src/ui/index.js', 'src/ui/actions.js', 'src/ui/actions.client.js', 'src/ui/actions.window.js',
    'src/ui/templates.js', 'src/ui/actions.report.js', 'src/ui/reports.js',
    'src/ui/widgets.js', 'src/ui/views.js', 'src/ui/views.info.js', 'src/ui/grid.js',
    'src/ui/filters.js', 'src/ui/search.js', 'src/ui/components.js', 'src/ui/fields.js', 'src/ui/tabs.js',
    'src/ui/fields.date.js',
    'src/ui/mail.js', 'src/ui/ui.templ.js', 'src/ui/numpad.js', 'src/ui/code-editor.js', 'src/ui/dialogs.js',
    'src/ui/fields.foreignkey.js', 'src/ui/fields.status.js', 'src/ui/fields.sortable.js', 'src/ui/jquery.number.js',
    'src/ui/grid.totals.js', 'src/ui/dashboard.js', 'src/ui/telegram.js',
    'src/designer/index.js',
    'src/plugins/query.manager.js', 'src/plugins/file-manager.js', 'src/plugins/bi.js',
  ];
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      main: {
        files: [
          {
            expand: true,
            src: files,
            dest: '../orun/addons/web/static/api/1.7',
          },
        ]
      },
    },
    uglify: {
      dist: {
        files: {
          '../orun/addons/web/static/api/1.7/katrid.full.min.js': files,
        },
        options: {
          sourceMap: {
            includeSources: true,
          },
          sourceMapName: '../orun/addons/web/static/api/1.7/katrid.full.min.js.map',
        },
      },
    },
    concat: {
      templates: {
        src: ['src/templates/*.xml', 'src/templates/*.html', 'src/templates/*.jinja2'],
        dest: '../orun/addons/web/static/api/1.7/templates.html',
      },
    },
    watch: {
      js: {
        tasks: ['uglify', 'concat'],
        files: ['src/**',],
        options: {
          atBegin: true,
          livereload: true,
        }
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify-es');

};
