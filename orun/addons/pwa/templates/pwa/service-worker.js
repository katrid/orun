let CACHE_NAME = 'orun-v2';
const DB_NAME = 'orun-db-cache';

self.importScripts(['/static/web/assets/js/alasql.min.js']);


self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll([
        "/pwa/",
        "/static/web/assets/js/toastr/toastr.min.css",
        "/static/web/assets/css/bootstrap.min.css",
        "/static/web/assets/css/fontawesome.css",
        "/static/web/api/theme/style.css",
        "/static/web/assets/js/datepicker/bootstrap-datetimepicker.min.css",
        "/static/web/assets/js/select2/select2.css",
        "/static/web/assets/js/c3/c3.min.css",
        "/static/web/assets/css/animate.css",
        "/static/web/assets/js/jquery.min.js",

        "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js",
        "/static/web/assets/js/moment/moment.js",
        "/static/web/assets/js/moment/moment-duration-format.js",
        "/static/web/assets/js/moment/pt-br.js",
        "/static/web/assets/js/nunjucks.js",
        "/static/web/assets/js/select2/select2.js",
        "/static/web/assets/js/popper.js",
        "/static/web/assets/js/bootstrap.min.js",
        "/static/web/assets/js/angular/angular.min.js",
        "/static/web/assets/js/angular/angular-sanitize.min.js",
        "/static/web/assets/js/hotkeys/hotkeys.min.js",
        "/static/web/assets/js/jquery.inputmask.bundle.js",
        "/static/web/assets/js/datepicker/bootstrap-datetimepicker.js",
        "/static/web/assets/js/alasql.min.js",
        "/static/web/assets/js/toastr/toastr.min.js",
        "/static/web/assets/js/underscore-min.js",
        "/static/web/assets/js/c3/d3.v3.min.js",
        "/static/web/assets/js/c3/c3.min.js",

        "/static/web/api/1.7/katrid.full.min.js",
      ]);
    })
  )
});


self.addEventListener("fetch", function(event) {

  let request = event.request.clone();

  if (event.request.method === 'POST')
  event.respondWith(
    // try to get fresh data
    fetch(event.request)
      // put a fresh copy on the cache
      // .then(function(res) {
      //   caches.open(CACHE_NAME)
      //     .then(function(cache) {
      //       cachePut(cache, request, res);
      //     });
      //   return res;
      // })
      // falling back to the cache
      .catch(function() {
        console.log(event.request);
        return caches.match(event.request);
      })
  );

});



// put JSON RPC on the cache
function cachePut(cache, request, response) {
  if (request.method === 'POST') {
    // get hashable key
    request.text().then(function(data) {
      let hash = request.url + data;

    });
  } else if (!response.bodyUsed)
    cache.put(request, response);
}

function cacheMatch(cache, key) {
  return cache.match(key);
}
