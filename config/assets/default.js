'use strict';

// Note: be sure to add corresponding minified assets to production.js and cloud-foundry.js.

module.exports = {
  client: {
    lib: {
      css: [
        'public/lib/bootstrap/dist/css/bootstrap.css',
        'public/lib/bootstrap/dist/css/bootstrap-theme.css',
        'public/lib/angular-xeditable/dist/css/xeditable.css',
        'public/lib/angular-toastr/dist/angular-toastr.css',
        'public/lib/chosen/chosen.css',
        'public/lib/angular-timezone-selector/dist/angular-timezone-selector.css',
        'public/lib/angular-block-ui/dist/angular-block-ui.css',
        'public/lib/angular-material/angular-material.css'
      ],
      js: [
        'public/lib/jquery/dist/jquery.js',
        'public/lib/bootstrap/dist/js/bootstrap.js',
        'public/lib/lodash/dist/lodash.js',
        'public/lib/moment/moment.js',
        'public/lib/moment-timezone/builds/moment-timezone-with-data.js',
        'public/lib/chosen/chosen.jquery.js',
        'public/lib/angular/angular.js',
        'public/lib/angular-resource/angular-resource.js',
        'public/lib/angular-animate/angular-animate.js',
        'public/lib/angular-messages/angular-messages.js',
        'public/lib/angular-ui-router/release/angular-ui-router.js',
        'public/lib/angular-ui-utils/ui-utils.js',
        'public/lib/angular-bootstrap/ui-bootstrap-tpls.js',
        'public/lib/angular-file-upload/angular-file-upload.js',
        'public/lib/angular-xeditable/dist/js/xeditable.js',
        'public/lib/angular-toastr/dist/angular-toastr.js',
        'public/lib/angular-toastr/dist/angular-toastr.tpls.js',
        'public/lib/spin.js/spin.js',
        'public/lib/angular-spinner/dist/angular-spinner.js',
        'public/lib/jstzdetect/jstz.js',
        'public/lib/angular-timezone-selector/dist/angular-timezone-selector.js',
        'public/lib/angular-aria/angular-aria.js',
        'public/lib/angular-sanitize/angular-sanitize.js',
        'public/lib/angular-material/angular-material.js',
        'public/lib/chart.js/dist/Chart.js',
        'public/lib/angular-chart.js/dist/angular-chart.js',
        'public/lib/angular-local-storage/dist/angular-local-storage.js',
        'public/lib/angular-block-ui/dist/angular-block-ui.js',
        'public/lib/owasp-password-strength-test/owasp-password-strength-test.js'
      ],
      tests: ['public/lib/angular-mocks/angular-mocks.js']
    },
    css: [
      'modules/*/client/css/*.css',
    ],
    less: [
      'modules/*/client/less/*.less'
    ],
    sass: [
      'modules/*/client/scss/*.scss'
    ],
    js: [
      'modules/core/client/app/config.js',
      'modules/core/client/app/init.js',
      'modules/*/client/*.js',
      'modules/*/client/**/*.js'
    ],
    views: ['modules/*/client/views/**/*.html'],
    templates: ['build/templates.js']
  },
  server: {
    gulpConfig: 'gulpfile.js',
    allJS: ['server.js', 'config/**/*.js', 'modules/*/server/**/*.js'],
    models: 'modules/*/server/models/**/*.js',
    routes: ['modules/!(core)/server/routes/**/*.js', 'modules/core/server/routes/**/*.js'],
    sockets: 'modules/*/server/sockets/**/*.js',
    config: 'modules/*/server/config/*.js',
    policies: 'modules/*/server/policies/*.js',
    views: 'modules/*/server/views/*.html'
  }
};
