//{% block version %}
let CACHE_NAME = 'orun-v1';
const DB_NAME = 'orun-db-cache';
//{% endblock %}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([
        //{% block cache %}
        "/static/admin/assets/js/toastr/toastr.min.css",
        "/static/admin/assets/css/bootstrap.min.css",
        "/static/admin/assets/css/fontawesome.css",
        "/static/admin/assets/webfonts/fa-solid-900.woff2",
        "/static/admin/api/theme/style.css",
        "/static/admin/assets/js/datepicker/bootstrap-datetimepicker.min.css",
        "/static/admin/assets/js/select2/select2.css",
        "/static/admin/assets/js/c3/c3.min.css",
        "/static/admin/assets/css/animate.css",
        "/static/admin/assets/js/sweetalert2.css",
        "/static/admin/katrid/style.css",
        "/web/js/templates/",

        "/static/admin/assets/js/jquery.min.js",
        "/static/admin/assets/js/jquery-ui.min.js",
        "/static/admin/assets/js/moment/moment.js",
        "/static/admin/assets/js/moment/moment-duration-format.js",
        "/static/admin/assets/js/moment/pt-br.js",
        "/static/admin/assets/js/nunjucks.js",
        "/static/admin/assets/js/select2/select2.js",
        "/static/admin/assets/js/popper.js",
        "/static/admin/assets/js/bootstrap.min.js",
        "/static/admin/assets/js/angular/angular.min.js",
        "/static/admin/assets/js/angular/angular-sanitize.min.js",
        "/static/admin/assets/js/hotkeys/hotkeys.min.js",
        "/static/admin/assets/js/jquery.inputmask.bundle.js",
        "/static/admin/assets/js/datepicker/bootstrap-datetimepicker.js",
        "/static/admin/assets/js/toastr/toastr.min.js",
        "/static/admin/assets/js/underscore-min.js",
        "/static/admin/assets/js/c3/d3.v3.min.js",
        "/static/admin/assets/js/c3/c3.min.js",
        "/static/pwa/assets/dexie.min.js",

        "/static/admin/katrid/katrid.js",

        //{% if LANGUAGE_CODE != 'en-us' %}
        "/static/admin/assets/js/angular/i18n/angular-locale_{{ LANGUAGE_CODE }}.js",
        "/static/admin/assets/js/select2/select2_locale_{{ LANGUAGE_CODE }}.min.js",
        //{% endif %}
        //{% endblock %}
      ]);
    })
  )
});


self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});
