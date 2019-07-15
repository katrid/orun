(function () {

  class QueryManager {
    constructor(app) {
      this.app = app;
      this.$scope = app.$scope.$new();
      this.$scope.queryChange = (query) => this.queryChange(query);
      this.$scope.search = {};
      let me = this;
      this.action = this.$scope.action = {
        context: {},
        views: {},
        async saveSearch(search) {
          let svc = new Katrid.Services.Model('ui.filter');
          let data = {};
          Object.assign(data, search);
          data.query = me.$scope.query.id;
          if (search.name === null) {
            search.name = prompt('Query name', 'current query namne');
            search.is_default = false;
            search.is_shared = true;
          }
          if (search.name)
            await svc.write([data])
        },
        setSearchParams(params) {
          me.$scope.search.params = params;
          me.refresh(me.query);
        },
        switchView(viewType) {
          console.log('set view type', viewType);
        },
        orderBy(field) {
          if (me.$scope.ordering === field)
            me.$scope.reverse = !me.$scope.reverse;
          else {
            me.$scope.ordering = field;
            me.$scope.reverse = false;
          }
        }
      };
    }

    getFilter(field) {
      if (field.type === 'DateField')
        return "|date:'shortDate'";
      else if (field.type === 'DateTimeField')
        return "|date:'short'";
      else if (field.type === 'IntegerField')
        return "|number:0";
      return "";
    }

    getSearchView(query) {
      let s;
      if (query.params)
        s = query.params;
      else {
        s = `<search>`;
        for (let f of query.fields)
          s += `<field name="${f.name}"/>`;
        s += '</search>';
      }
      // prepare fields to view
      let fields = {};
      for (let f of query.fields)
        fields[f.name] = Katrid.Data.Fields.Field.fromInfo(f);
      this.fields = fields;
      return {content: s, fields};
    }

    async queryChange(query) {
      this.$scope.search = {
        viewMoreButtons: true,
      };
      this.query = query;
      let res = await this.refresh(query);
      // render the result on table
      // transform result to list of objects
      query.fields = res.fields;
      this.action.search = this.getSearchView(query);
      this.action.fieldList = Object.values(this.fields);
      this.$scope.action.views.search = this.$scope.action.search;
      this.renderSearch();
      this.renderTable(res);
      this.$scope.$apply();
    }

    async refresh(query) {
      let res = await Katrid.Services.Query.read({ id: query.id, details: true, params: this.$scope.search.params });
      for (let f of res.fields)
        f.filter = this.getFilter(f);
      let _toObject = (fields, values) => {
        let r = {}, i = 0;
        for (let f of fields) {
          r[f.name] = values[i];
          i++;
        }
        return r;
      };
      this.$scope.records = res.data.map(row => _toObject(res.fields, row));
      this.$scope.$apply();
      return res;
    }

    renderSearch() {
      let el = this.app.getTemplate('query.manager.search.jinja2');
      el = Katrid.Core.$compile(el)(this.$scope);
      this.$element.find('#query-search-view').html(el);
    }

    async render() {
      let templ = this.app.getTemplate('query.manager.jinja2');
      templ = Katrid.Core.$compile(templ)(this.$scope);
      this.$element = templ;
      let queries = await Katrid.Services.Query.all();
      this.$scope.queries = queries.data;
      this.app.$element.html(templ);
      this.$scope.$apply();
    }

    renderTable(data) {
      let templ = this.app.getTemplate('query.manager.table.jinja2', {
        self: this, query: this.$scope.query, records: this.records, fields: Object.values(this.fields),
      });
      templ = Katrid.Core.$compile(templ)(this.$scope);
      initColumn(templ);
      this.$element.find('#query-manager-result').html(templ);
    }
  }

  // register the plugin
  Katrid.Core.plugins.register((app) => {
    // register event listener
    $(app).on('hashchange', (event, hash) => {
      if (hash.startsWith('#/app/query.manager/')) {
        event.stopPropagation();
        event.preventDefault();

        app.$scope.$parent.currentMenu = { name: 'Query Manager' };

        let q = new QueryManager(app);
        q.render();
      }
    });
  });


  function initColumn(table) {
    // $('.checkbox-menu').sortable();
  }

  function reorder(index1, index2) {
    $('table tr').each(function () {
      var tr = $(this);
      var td1 = tr.find(`td:eq(${index1})`);
      var td2 = tr.find(`td:eq(${index2})`);
      td1.detach().insertAfter(td2);
    });
  }


})();
