(function() {

  class Application {
    constructor() {
      throw Error('erro');
    }
  }

  class Menu {
    constructor(app) {
      this.app = app;

      $('.menu-item-action')
      .on('click', event => {
        event.preventDefault();
        let target = $(event.target);
        this.actionClick(target.attr('href'));
        target.parent('.dropdown-menu').hide();
      });
      $('li.nav-item.dropdown').on('mouseenter', function() {
        $(this).children('.dropdown-menu').removeAttr('style');
      });
    }

    actionClick(hash) {
      this.app.loadPage(hash, true);
    }
  }

  class WebApplication {

    constructor(opts) {
      Katrid.app = this;
      this.menu = new Menu(this);
      this.actionManager = new Katrid.Actions.ActionManager();
      this.title = opts.title;
      this.plugins = [
        'ui.katrid',
        'ngSanitize',
      ];

      let self = this;
      $(Katrid).on('app.ready', () => {

        let loadingTimeout, overlayTimeout;
        let loadingMsg = $('#loading-msg').hide();
        let overlay = $('#overlay').hide();
        $(Katrid).on('fetch.before', () => {
          loadingTimeout = setTimeout(() => loadingMsg.show(), 400);
          overlayTimeout = setTimeout(() => {
            loadingMsg.hide();
            overlay.show();
          }, 2500);
        })
        .on('fetch.always', () => {
          clearTimeout(loadingTimeout);
          clearTimeout(overlayTimeout);
          loadingMsg.hide();
          overlay.hide();
        });

        // TODO replace jquery ajax by fetch api
        $(document).ajaxStart(function() {
          loadingTimeout = setTimeout(() => loadingMsg.show(), 400);
          overlayTimeout = setTimeout(() => {
            loadingMsg.hide();
            overlay.show()
          }, 2500);
        })
        .ajaxStop(function() {
          clearTimeout(loadingTimeout);
          clearTimeout(overlayTimeout);
          loadingMsg.hide();
          overlay.hide();
        });

        $('a.module-selector')
        .on('click', function(event) {
          event.preventDefault();
          let item = $(this);
          let params = {};
          params.menu_id = item.data('menu-id');

          // clear history
          Katrid.app.actionManager.clear();
          self.loadPage(item.attr('href'));
        })
        .each(function(idx, el) {
          el = $(el);
          let params = {};
          params.menu_id = el.data('menu-id');
          params.action = $(`.menu-item-action[data-parent-id="${params.menu_id}"]:first`).data('action-id');
          el.attr('href', '#/app/?' + $.param(params));
        });

        if (location.hash === '')
          $('a.module-selector:first').trigger('click');
        else
          this.loadPage(location.hash);
      });

      window.addEventListener('hashchange', (event) => {
        this.loadPage(location.hash);
      });

      // initialize sync resources
      fetch(opts.templates || '/web/client/templates/')
      .then(res => res.text())
      .then((templates) => {
        if (templates)
          templates = '<templates>' + templates + '</templates>';

        // initialize angular app (katrid module)
        this.ngApp = angular.module('katridApp', this.plugins)
        .run(['$templateCache', ($templateCache) => {
          this.$templateCache = $templateCache;
          Katrid.UI.templates = new Katrid.UI.Templates(this, templates);
        }])
        // config hash
        .config(['$locationProvider', '$interpolateProvider', function ($locationProvider, $interpolateProvider) {
          $locationProvider.hashPrefix('');
          $interpolateProvider.startSymbol('${');
          $interpolateProvider.endSymbol('}');
        }]);

        this.ngApp.controller('AppController', ['$scope', '$compile', '$location', function($scope, $compile, $location) {
          Katrid.Core.$compile = $compile;
          Katrid.app.$scope = $scope;
          Katrid.app.$location = $location;
          $scope._ = _;
          Katrid.app.$element = $('#katrid-action-view');
          $(Katrid).trigger('app.ready', [Katrid.app]);
        }]);

        this.ngApp.controller('ActionController', ['$scope', function($scope) {
        }]);

        Katrid.Core.plugins.init(this);
        $(Katrid).trigger('loaded', [Katrid.app]);

      });
    }

    static bootstrap(opts) {
      let app = new WebApplication(opts);
      $(Katrid).on('loaded', function() {
        angular.element(function () {
          angular.bootstrap(document, ['katridApp']);
        });
      });
      return app;
    }

    async loadPage(hash, reset) {
      let evt = $.Event('hashchange');
      $(this).trigger(evt, [hash, reset]);
      // check if any plugin has stopped the event flow
      if (!evt.isPropagationStopped()) {
        this.$scope.currentMenu = '';
        // load the page content
        if (hash.startsWith('#/app/?'))
          hash = hash.split('#/app/?')[1];
        hash = new URLSearchParams(hash);
        let params = {};
        for (let [k, v] of hash.entries())
          params[k] = v;

        if (params.menu_id)
          $('a.module-selector');

        if (!this.$scope.$parent.currentMenu || (params.menu_id && (this.$scope.$parent.currentMenu.id != params.menu_id))) {
          this.$scope.$parent.currentMenu = { id: params.menu_id, name: $(`.module-selector[data-menu-id="${params.menu_id}"]`).text() };
        }

        if (('action' in params) || ('model' in params))
          await this.actionManager.onHashChange(params, reset);
      }
    }

    getTemplate(tpl, context) {
      let text = this.$templateCache.get(tpl);
      if (tpl.endsWith('jinja2')) {
        let ctx = {
          _: _,
        };
        if (context)
          Object.assign(ctx, context);
        return Katrid.UI.Templates.env.render(tpl, ctx);
      }
      else if (tpl.endsWith('pug')) {
        text = text(context);
      }
      return text;
    }

    static get context() {
      return this.actionManager.context;
    }

  }

  Katrid.Core.Application = Application;
  Katrid.Core.WebApplication = WebApplication;

})();

angular.module('basicApp', [])
.controller('LoginController', ['$scope', function($scope) {
  $scope.login = async (username, password, multidb, db) => {
    let res;
    if (multidb)
      res = await Katrid.Services.post('/web/db/', { db });
    if ((multidb && res.redirect) || !multidb) {
      res = await Katrid.Services.post('/web/login/', { username, password });
      if (res.error) {
        $scope.messages = [{ type: 'danger', message: res.message }];
        $scope.$apply();
      } else {
        $scope.messages = [{ type: 'success', message: res.message }];
        $scope.$apply();
        setTimeout(() => window.location.href = res.redirect);
      }
    }
  }
}]);
