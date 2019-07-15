(function () {

  class FileManager {
    constructor(opts) {
      this.$element = opts.el;
      this.$scope = opts.scope;
      this.service = this.$element.attr('service');

      $.get(this.service)
      .then(res => {
        this.$scope.dirs = res.content.filter(obj => obj.type === 'dir');
        this.$scope.files = res.content.filter(obj => obj.type === 'file');
        this.$scope.items = res.content;
        this.$scope.levels[this.$scope.level] = this.$scope.items;
        this.$scope.$apply();
      });
    }

    getPath(item) {
      let url = item.name;
      let parent = item.parent;
      while (parent) {
        url = parent.name + '/' + url;
        parent = parent.parent;
      }
      return url;
    }

    expand(item) {
      let url = this.getPath(item);
      url = this.service + '?path=' + url;
      $.get(url)
        .then(res => {
          this.$scope.items = res.content;
          this.$scope.dirs = res.content.filter(obj => obj.type === 'dir');
          this.$scope.files = res.content.filter(obj => obj.type === 'file');
          res.content.map(obj => obj.parent = item);
          this.$scope.levels[this.$scope.level] = this.$scope.items;
          this.$scope.$apply();
        });
    }
  }

  Katrid.UI.uiKatrid.directive('fileManager', () => ({
    restrict: 'E',
    scope: {},
    templateUrl: 'file-manager.jinja2',
    link(scope, el) {
      scope.level = 0;
      scope.levels = {};
      let fm = new FileManager({ el, scope });
      scope.expand = item => {
        scope.level++;
        scope.currentItem = item;
        fm.expand(item);
        scope.currentPath = fm.getPath(item);
      };

      scope.backTo = level => {
        scope.level = level;
        console.log('back to', level);
        scope.items = scope.levels[scope.level];
        scope.dirs = scope.items.filter(obj => obj.type === 'dir');
        scope.files = scope.items.filter(obj => obj.type === 'file');
        scope.currentPath = fm.getPath(scope.items[0]);
      };

      scope.uploadFile = file => {
        console.log('current path', scope.currentPath);
        Katrid.Services.Upload.uploadTo('/pwapec/file-manager/upload/?path=' + (scope.currentPath || ''), file)
          .then(() => {
            fm.expand(scope.currentItem);
          });
      };
    }
  }));

})();
