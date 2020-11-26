let fileList = [
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
];

fileList.concat([
  //{% block cache %}
  //{% endblock %}
]);

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open('orun-pwa-v1').then(function (cache) {
      return cache.addAll(fileList);
    })
      .then(() => {
        fetch('{% block fetch_url %}/pwa/push/{% endblock %}')
          .then(res => res.json())
          .then(async res => {
            if (res.data) {
              let db = await getDb();
              db.staticData.clear();
              let $id = 0;
              for (let obj of res.data) {
                let service = obj.service;
                for (let data of obj.data)
                  db.staticData.add({$id: ++$id, service, id: data.id, text: data.text});
              }
            }
          })
      })
  )
});


self.importScripts('/static/pwa/assets/dexie.min.js');


function getDb() {
  let db = new Dexie('orun.pwa');
  db.version(5)
    .stores({
      records: '++$id, service, uuid, status, id',
      variables: 'name, value',
      staticData: '$id, service, id, text, data'
    });
  return db;
}


self.addEventListener('fetch', function (event) {
  event.respondWith(
    fetch(event.request).catch(function () {
      return caches.match(event.request);
    })
  );
});


function syncToServer() {
  return new Promise(async (resolve, reject) => {
    let db = getDb();
    let objs = await db.records.where({status: 'pending'}).toArray();
    fetch('{% block sync_url %}/pwa/sync/{% endblock %}', {
      method: 'post',
      body: JSON.stringify({data: objs}),
    }).then(res => {
      console.log('ok', res);
      resolve(res);
    }).catch(err => reject(err));
  });
}


self.addEventListener('sync', function (event) {
  if (event.tag === 'orun-sync')
    event.waitUntil(syncToServer());
});
