(() => {

  class Loader {
    constructor(templateCache) {
      this.$cache = templateCache;
    }

    getSource(name) {
      return {
        src: this.$cache.get(name),
        path: name,
        noCache: false,
      }
    }
  }

  class Templates {
    constructor(app, templates) {
      this.app = app;
      Templates.env = new nunjucks.Environment(new Loader(app.$templateCache), { autoescape: false });
      let oldGet = app.$templateCache.get;
      app.$templateCache.get = name => {
        return this.prepare(name, oldGet.call(this, name));
      };
      this.loadTemplates(app.$templateCache, templates);
      for (let [k, v] of Object.entries(PRE_LOADED_TEMPLATES))
        app.$templateCache.put(k, v);
    }

    prepare(name, templ) {
      if (_.isUndefined(templ)) throw Error('Template not found: ' + name);
      if (templ.tagName === 'SCRIPT')
        return templ.innerHTML;
      return templ;
    }

    compileTemplate(base, templ) {
      let el = $(base);
      templ = $(templ.innerHTML);
      for (let child of Array.from(templ))
        if (child.tagName === 'JQUERY') {
          child = $(child);
          let sel = child.attr('selector');
          let op = child.attr('operation');
          if (sel) sel = $(el).find(sel);
          else sel = el;
          sel[op](child[0].innerHTML);
        }
      return el[0].innerHTML;
    }

    loadTemplates(templateCache, res) {
      let templateLst = {};
      let readTemplates = el => {
        if (el.tagName === 'TEMPLATES') Array.from(el.children).map(readTemplates);
        else if (el.tagName === 'SCRIPT') {
          templateLst[el.id] = el.innerHTML;
        }
      };
      let preProcess = el => {
        if (el.tagName === 'TEMPLATES') Array.from(el.children).map(preProcess);
        else if (el.tagName === 'SCRIPT') {
          let base = el.getAttribute('extends');
          let id = el.getAttribute('id') || base;
          if (base) {
            el = templateLst[base] + el;
          } else
            id = el.id;
          templateCache.put(id, el);
        }
      };
      let parser = new DOMParser();
      let doc = parser.parseFromString(res, 'text/html');
      let root = doc.firstChild.children[1].firstChild;
      readTemplates(root);
      preProcess(root);
    }

  }

  let PRE_LOADED_TEMPLATES = {};

  Katrid.UI.registerTemplate = function(name, tmpl) {
    PRE_LOADED_TEMPLATES[name] = tmpl;
  };

  Katrid.UI.Templates = Templates;
  Katrid.UI.Templates.PRE_LOADED_TEMPLATES = PRE_LOADED_TEMPLATES;

})();
