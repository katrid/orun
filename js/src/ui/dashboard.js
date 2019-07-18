(function () {

  class Dashboard extends Katrid.UI.Views.ClientView {
    async render() {
      // get the linked view for the client action
      let model = new Katrid.Services.Model('ir.action.client');
      let res = await model.rpc('get_view', [this.action.info.id]);
      if (res.content) {
        return Katrid.Core.$compile(res.content)(this.action.scope);
      }
    }
  }

  class DashboardComponent extends Katrid.UI.Widgets.Component {
    constructor($compile) {
      super();
      this.$compile = $compile;
      this.restrict = 'E';
      this.scope = false;
    }

    async link(scope, el, attrs, controller) {
      let dashboardId = attrs.dashboardId;
    }
  }


  let dataGroup = function (data, groups, total) {
    let res = [];
    let row = data[0];
    let x = [];
    let grps = {};
    let c = 0;

    for (let group of groups) {
      let g = [];

      if (c === 0)
        g.push(groups[0]);

      for (let row of data) {
        let v = row[group];
        if ((c > 0) && !(v in grps)) {
          g = [v];
          grps[v] = g;
          for (let z of x)
            g.push(0);
        } else if (c > 0)
          g = grps[v];
        if (c > 0)
          g[x.indexOf(row[groups[0]])] = row[total || 'total'] || 0;
        else if (!g.includes(v))
          g.push(v);
      }
      if (c === 0) {
        x = g;
        grps[groups[0]] = g;
      } else {

      }
      c++;
    }
    res = Object.values(grps);
    console.log(res);
    return res;
  };


  class ChartComponent extends Katrid.UI.Widgets.Component {
    constructor() {
      super();
    }

    async link(scope, el, attrs) {
      let res, chart, sql;

      // find by a query child element
      let q = el.find('query');
      if (q.length) {
        q.remove();
        sql = q.text();
      }

      console.log('init chart');

      let groups;
      if (attrs.groups)
        groups = attrs.groups.split(',');

      let observe = async (url) => {

        if (sql)
          res = await Katrid.Services.Query.executeSql(sql);
        else {
          res = await fetch(url).then(res => res.json());
        }
        console.log(url);

        let data = res.data;
        let cfg = {
          bindto: el[0],
          data: {},
          color: {
            pattern: Katrid.UI.Dashboard.colorPatterns,
          },
        };

        let hasData = false;

        let type = el.attr('type');

        if (type)
          cfg.data.type = type;

        if (groups) {
          data = dataGroup(data, groups);
          let vals = [];
          for (let i = 1; i < data.length; i++)
            vals.push(data[i][0]);
          hasData = true;
        }
        else if (_.isArray(data) && data.length) {
          let cols = Object.keys(data[0]);
          cfg.data.columns = data.map(obj => [obj[cols[0]], obj[cols[1]]]);
          hasData = true;
        }

        if (hasData)
          chart = c3.generate(cfg);
      };

      if (attrs.urlParams) {
        let urlParams = attrs.urlParams;
        // TODO add list support
        scope.$watch(attrs.urlParams, observe);
      } else
        observe();
      attrs.$observe('url', observe);
    }
  }


  class Query extends Katrid.UI.Widgets.Component {
    constructor() {
      super();
      this.priority = 200;
      this.scope = false;
    }

    link(scope, el, attrs) {
      let ds = new DataSource(el, scope);
      el.remove();
      return;
      if (!attrs.name)
        throw Error('Query name attribute is required!');
      let instance = scope[attrs.name] = {loading: false, data: null};
      // find query by url
      let url = el.data('url');
      if (url) {
        console.log('find query by url', url);
        $.get(url)
        .then(res => {
          instance.loading = false;
          let data = res.data.map((row) => (_.object(res.fields, row)));
          scope.$apply(() => instance.data = data);
        });
        return;
      }

      let r;
      let sqlQuery = el.html();
      let inMemory = 'inMemory' in attrs;
      if (inMemory) {
        let dataBind = el.data('bind');
        let dataBindField = el.data('bind-field');
        if (dataBind) {
          scope.$parent.$watch(dataBind, function (newValue, oldValue) {
            if (_.isArray(newValue) && newValue.length && _.isObject(newValue[0]))
              console.log(alasql(sqlQuery, [newValue]));
          });
        } else if (dataBindField) {
          // add watcher for the bind fields
          let fnBind = function (newValue, oldValue) {
            let fieldLog = scope.dataSource.$fieldLog[dataBindField];
            if (fieldLog) {
              let data = fieldLog.value;

              if (_.isArray(data) && data.length && _.isObject(data[0])) {
                instance = alasql(sqlQuery, [data]);
              }
            }
          };
          if (_.isString(dataBindField))
            dataBindField = [dataBindField];
          for (let field of dataBindField)
            scope.$parent.$watch('$fieldLog.' + field + '.count', fnBind);
        }
      } else {
        instance.loading = true;
        if (_.isUndefined(attrs.url))
          r = Katrid.Services.Query.read(attrs.queryId);
        else
          r = $.get(attrs.url);
        r.then(res => {
          instance.loading = false;
          let data = res.data.map((row) => (_.object(res.fields, row)));
          scope.$apply(() => instance.data = data);
        });
      }
      el.remove();
    }
  }


  Katrid.Actions.ClientAction.register('dashboard', Dashboard);

  Katrid.UI.uiKatrid.directive('dashboard', ['$compile', DashboardComponent]);
  Katrid.UI.uiKatrid.directive('chart', ChartComponent);
  Katrid.UI.uiKatrid.directive('query', Query);


  class Field {
    constructor(el) {
      this.el = el;
    }

    th() {
      let caption = this.el.attr('caption') || this.el.attr('name');
      let cls = this.el.attr('class');
      let title = this.el.attr('header-title');
      let attrs = '';
      if (!title)
        title = '';
      let headerClick = this.el.attr('on-header-click');
      if (cls)
        attrs += 'class ="' + cls + '"';
      if (headerClick)
        attrs += ' ng-click="' + headerClick + '"';
      return `<th title="${title}" ${attrs}>${caption}</th>`;
    }

    td() {
      let format = this.el.attr('format');
      if (format) {
        format = '|' + format;
        console.log('format', format);
      } else
        format = '';
      let title = this.el.attr('title');
      if (!title)
        title = '';
      let ngClass = this.el.attr('ng-class');
      let cls = this.el[0].className;
      let content = this.el.html();
      if (!content)
        content = `\${ record.${this.name}${format} }`;
      return `<td title='${title}' class="${cls}">${content}</td>`;
    }

    tfoot() {
      let total = this.total;
      if (total)
        total = '${grid.total("' + this.name + '")}';
      else if (this.footer)
        total = this.footer;
      else
        total = '';
      let cls = this.el[0].className;
      return `<td class="${cls}">${total}</td>`;
    }

    get name() {
      return this.el.attr('name');
    }

    get footer() {
      return this.el.attr('footer');
    }

    get total() {
      return this.el.attr('total');
    }
  }


  Katrid.UI.uiKatrid.directive('tableView', () => ({
    restrict: 'E',
    scope: false,
    template(el, attrs) {
      let fields = [];
      for (let fld of el.find('field'))
        fields.push(new Field($(fld)));
      return Katrid.app.getTemplate('dashboard.table.jinja2', {fields, el, attrs});
    }
  }));


  class DataSource {
    constructor(el, scope) {
      this.$el = el;
      this.controls = [];
      this.$counter = 0;
      this.$scope = scope;
      this.name = el.attr('name');
      if (this.name)
        scope[this.name] = this;
      this.sql = this.$el.html();
      this.url = el.data('url');
      setTimeout(() => this.execute(), 100);
    }

    async execute() {
      this.$loading = true;
      try {
        let res;
        if (this.url) {
          res = await fetch(this.url)
          .then(res => res.json());
        } else if (this.sql)
          res = await Katrid.Services.Query.executeSql(this.sql);
        this.$counter++;
        this.data = res.data;
        this.$scope.$apply();
        this.onChange();
      } finally {
        this.$loading = false;
      }
    }

    onChange() {
      for (let control of this.controls)
        control.$render(this.data);
    }

  }


  class DashboardWidget {
    constructor(opts) {
      if (_.isString(opts.el))
        this.$el = $(opts.el);
      else
        this.$el = opts.el;
      this.$scope = opts.scope;
      this.$sourceScope = opts.sourceScope || opts.scope;
      this.$loading = false;
      this.create(opts);

      if (_.isString(this.dataSource)) {
        let ds = this.$sourceScope[this.dataSource];
        if (ds) {
          ds.controls.push(this);
          if (ds.$counter)
            this.$render(ds.data);
        }
      }

    }

    create(opts) {
      this.dataSource = opts.dataSource || this.$el.data('source');
      this.caption = opts.caption || this.$el.attr('caption');
    }

    $render(data) {

    }
  }


  class Chart extends DashboardWidget {
    constructor(opts) {
      super(opts);
      this.backButton = $(`<button style="position: absolute; left: 0; top: 0;" class="btn btn-outline-secondary btn-sm back-button">${_.gettext('Back')}</button>`);
      this.backButton.hide();
      this.$el.prepend(this.backButton);
    }

    groupBy(data, group, totals) {
      if (data.length === 0)
        return [];
      let res = [];
      let firstRow = data[0];
      let sql = 'select ';
      let groups = group;
      if (_.isArray(groups))
        groups = groups.join(',');
      else if (_.isNumber(group))
        groups = Object.keys(firstRow)[group];
      sql += groups;
      if (_.isArray(totals))
        for (let total of totals)
          sql += ',' + 'sum(' + total + ') as ' + total;
      else if (_.isString((totals)))
        sql += `,sum(${totals}) as ${totals}`;
      else if (_.isNumber(totals)) {
        totals = Object.keys(firstRow)[totals];
        sql += ',sum(' + totals + ') as ' + totals;
      }
      sql += ' from ? group by ';
      sql += groups;
      console.log(sql);
      res = alasql(sql, [data]);
      return res;
    }

    create(opts) {
      super.create(opts);
      this.x = opts.x;
      this.y = opts.y;
      this.keys = opts.keys;
      this.type = opts.type;
      this.axis = opts.axis;
      this.legend = opts.legend;
      this.onclick = opts.onclick;
      this.columns = opts.columns;
      this.grid = opts.grid;
      this.labels = opts.labels;
      this.pie = opts.pie;

      if (!this.columns && !this.keys && _.isUndefined(this.x) && _.isUndefined(this.y)) {
        this.x = 0;
        this.y = 1;
      }
    }

    $render(data) {
      this.$data = data;
      if (this.columns)
        this.$columns = this.columns;
      else
        this.$columns = this.groupBy(data, this.x, this.y).map(obj => Object.values(obj));

      let size = {
        width: this.$el.parent().width(),
      };

      this.$chart = c3.generate({
        bindto: this.$el[0],
        data: {
          columns: this.$columns,
          type: this.type,
          onclick: this.onclick,
          labels: this.labels,
        },
        color: {
          pattern: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5']
        },
        pie: this.pie,
        size,
        grid: this.grid,
        legend: this.legend,
        axis: this.axis,
      });

      this.$chart.$chart = this;
    }

    query(sql, params) {
      return alasql(sql, params);
    }
  }


  class GridView extends DashboardWidget {
    constructor(opts) {
      super(opts);
      this._groupBy = [];
      let groupBy = this.$el.attr('group-by');
      if (groupBy)
        this._groupBy = groupBy.split(',');
      this.totals = [];


      this.fields = [];
      for (let fld of this.$el.find('field')) {
        let field = new Field($(fld));
        this.fields.push(field);
        if (field.total)
          this.totals.push(field.name);
      }

      this.$scope.grid = this;

      let templ = Katrid.app.getTemplate('dashboard.grid.jinja2', {
        self: this,
        fields: this.fields
      });
      templ = Katrid.Core.$compile(templ)(this.$scope);
      this.$el.html(templ);
    }

    get groupBy() {
      return this._groupBy;
    }

    set groupBy(groupBy) {
      this._groupBy = groupBy;
      if (this._lastData)
        this.$render(this._lastData);
    }

    total(attr) {
      console.log('calc attr', attr);
      let r = 0;
      if (this._lastData)
        for (let row of this._lastData)
          r += row[attr];
      return r;
    }

    $render(data) {
      // render loaded data
      this._lastData = data;
      if (!data)
        data = [];
      if (this.groupBy.length) {
        data = groupBy(data, this.groupBy, this.totals, this.fields[0].name);
      }
      this.$scope.records = this._renderGroup(data);
    }

    _renderGroup(data) {
      let r = [];
      for (let row of data) {
        r.push(row);
        if (row.$group)
          r = r.concat(this._renderGroup(row.$children));
      }
      return r;
    }
  }

  function groupBy(data, member, totals, to) {
    let r = {};
    for (let row of data) {
      let v = row[member];
      let group = r[v];
      if (!group) {
        group = r[v] = {$children: []};
        for (let total of totals)
          group[total] = 0;
      }
      group.$children.push(row);
      group.$group = true;
      group[to] = v;
      for (let total of totals)
        group[total] += row[total];
    }
    return Object.values(r);
  }

  class GridRow {
    constructor(grid, row, el) {
      this.row = row;
    }

  }

  class GroupRow extends GridRow {

  }


  Katrid.UI.uiKatrid.directive('gridView', () => ({
    restrict: 'E',
    scope: {},
    // template(el, attrs) {
    //   let fields = [];
    //   for (let fld of el.find('field'))
    //     fields.push(new Field($(fld)));
    //   let query = el.find('query');
    //   if (query.length)
    //     query = query[0].outerHTML;
    //   else
    //     query = '';
    //   return Katrid.app.getTemplate('dashboard.grid.jinja2', {fields, el, attrs, query});
    // },

    async link(scope, el, attrs) {
      let grid = new GridView({el, scope, sourceScope: scope.$parent});
      return;
      scope.loading = false;
      let res, sql;
      let query = el.find('query');
      if (attrs.source) {
        console.log('data source is', attrs.source);
      } else if (query.length) {
        sql = query.text();
        query.remove();

        if (sql) {
          scope.loading = true;
          scope.$apply();
          res = await Katrid.Services.Query.executeSql(sql);
          scope.loading = false;
        }

        if (res) {
          scope.records = res.data;
          scope.$apply();
        }
      }
    }
  }));


  Katrid.UI.uiKatrid.filter('duration', () => {
    return (input, unit, format) => {
      if (!format)
        format = 'HH:mm:ss';
      if (input) {
        if ((unit === 'seconds') && (_.isString(input)))
          input = parseInt(input);
        let fmt = moment.duration(input, unit).format(format);
        console.log('duration', input, units, fmt, format);
        if (fmt.length === 5)
          fmt = '00:' + fmt;
        return fmt;
      }
      return input;
    }
  });


  Katrid.UI.Dashboard = {
    Chart,
    colorPatterns: [
      '#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5',
      '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'
    ],
  };


})();
