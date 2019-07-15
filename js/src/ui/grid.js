(function () {

  class Grid {
    constructor($compile) {
      this.restrict = 'E';
      this.scope = {};
      this.$compile = $compile;
    }

    async loadViews(scope, element, views, attrs) {

      let res = await scope.model.loadViews();
      // detects the relational field
      let fld = res.views.list.fields[scope.field.field];
      scope.dataSource.field = scope.field;
      // hides the relational field
      if (fld)
        fld.visible = false;

      let newViews = res.views;

      for (let [k, v] of Object.entries(views))
        newViews[k].content = v;

      scope.views = newViews;
      scope.view = newViews.list;
      let content = $(scope.view.content);
      if (scope.inline)
        content.attr('ng-row-click', 'editItem($event, $index)').attr('inline-editor', scope.inline);
      else
        content.attr('ng-row-click', 'openItem($event, $index)');
      content.attr('records', 'records');

      content.attr('list-options', '{"deleteRow": true}');

      // render the list component
      let el = (this.$compile(content)(scope));
      element.html(el);
      element.prepend(this.$compile(Katrid.app.getTemplate('view.form.grid.toolbar.jinja2', {attrs}))(scope));
      element.find('table').addClass('table-bordered grid');
    }

    async showDialog(scope, attrs, index) {

      if (scope.views.form)
        await this.renderDialog(scope, attrs);

      if (index != null) {
        // Show item dialog
        scope.recordIndex = index;
        let record = scope.records[index];

        // load the target record from server
        if (record && record.$loaded)
          scope.record = record;
        else if (record) {
          let res = await scope.dataSource.get(scope.records[index].id, 0, false, index);
          res.$loaded = true;

          // load nested data
          // let currentRecord = scope.record;
          // if (res.id)
          //   for (let child of dataSource.children) {
          //     child.scope.masterChanged(res.id)
          //     .then(res => {
          //       _cacheChildren(child.fieldName, currentRecord, res.data);
          //     })
          //
          //   }

        }

      }

    };

    async link(scope, element, attrs) {
      if (attrs.ngDefaultValues)
        scope.ngDefaultValues = attrs.ngDefaultValues;
      let me = this;
      // Load remote field model info

      const field = scope.$parent.view.fields[attrs.name];

      scope.totalDisplayed = 1000;
      scope.fieldName = attrs.name;
      scope.field = field;
      scope.records = [];
      scope.recordIndex = -1;
      scope._cachedViews = {};
      scope._ = scope.$parent._;
      scope._changeCount = 0;
      scope.dataSet = [];
      scope.model = new Katrid.Services.Model(field.model);
      scope.isList = true;

      if (attrs.inlineEditor === 'tabular')
        scope.inline = 'tabular';
      else if (attrs.hasOwnProperty('inlineEditor'))
        scope.inline = 'inline';

      scope.getContext = function () {
        return {}
      };

      scope.$setDirty = function () {
        return {}
      };

      // Set parent/master data source
      let dataSource = scope.dataSource = new Katrid.Data.DataSource(scope);
      dataSource.readonly = !_.isUndefined(attrs.readonly);
      let p = scope.$parent;
      while (p) {
        if (p.action && p.action.dataSource) {
          scope.dataSource.masterSource = p.action.dataSource;
          break;
        } else if (p.dataSource) {
          scope.dataSource.masterSource = p.dataSource;
          break;
        }
        p = p.$parent;
      }

      scope.parent = dataSource.masterSource.scope;
      scope.action = dataSource.masterSource.action;
      dataSource.action = scope.action;

      scope.dataSource.fieldName = scope.fieldName;
      scope.gridDialog = null;
      let gridEl = null;

      // check if the grid has custom views grid:view
      let views = {};
      for (let child of element.children()) {
        if (child.tagName.startsWith('GRID:')) {
          let viewType = child.tagName.split(':')[1].toLowerCase();
          child = $(child);
          views[viewType] = `<${viewType}>${child.html()}</${viewType}>`;
        }
      }

      await me.loadViews(scope, element, views, attrs);

      scope.doViewAction = (viewAction, target, confirmation) => scope.action._doViewAction(scope, viewAction, target, confirmation);

      let _cacheChildren = (fieldName, record, records) => {
        record[fieldName] = records;
      };

      scope._incChanges = () => {
        if (!scope.$parent.$fieldLog[scope.field.name])
          scope.$parent.$fieldLog[scope.field.name] = {};
        scope.$parent.$fieldLog[scope.field.name].count++;
      };

      scope.addItem = async () => {
        await scope.dataSource.insert();
        if (attrs.$attr.inlineEditor) {
          scope.records.splice(0, 0, scope.record);
          scope.dataSource.edit();
          if (!scope.$parent.record[scope.fieldName])
            scope.$parent.record[scope.fieldName] = [];
          scope.$parent.record[scope.fieldName].push(scope.record);
          scope.$apply();
        } else
          return this.showDialog(scope, attrs);
      };

      scope.addRecord = function (rec) {
        let record = Katrid.Data.createRecord({$loaded: true}, scope.dataSource);
        for (let [k, v] of Object.entries(rec))
          record[k] = v;
        scope.records.push(record);
        if (!scope.$parent.record[scope.fieldName])
          scope.$parent.record[scope.fieldName] = [];
        scope.$parent.record[scope.fieldName].push(record);
        console.log('add record', record);
      };

      scope.cancelChanges = () => scope.dataSource.setState(Katrid.Data.DataSourceState.browsing);

      scope.openItem = async (evt, index) => {
        await this.showDialog(scope, attrs, index);
        if (scope.dataSource.masterSource.changing && !scope.dataSource.readonly) {
          scope.dataSource.edit();
        }
        scope.$apply();
      };

      scope.editItem = (evt, index) => {
        if (scope.dataSource.changing)
          scope.save();
        if (scope.$parent.dataSource.changing) {
          scope.dataSource.recordIndex = index;
          scope.dataSource.edit();

          // delay focus field
          setTimeout(() => {
            let el = $(evt.target).closest('td').find('input.form-control').focus();
            setTimeout(() => el.select());
          }, 100);

        }
      };

      scope.removeItem = function (idx) {
        const rec = scope.records[idx];
        scope.records.splice(idx, 1);
        scope._incChanges();
        rec.$record.$delete();
        //scope.$parent.record.$modifiedData[scope.fieldName].$deleted.append(rec);
        // return scope.dataSource.applyModifiedData(null, null, rec);
      };

      scope.$set = (field, value) => {
        const control = scope.form[field];
        control.$setViewValue(value);
        control.$render();
      };

      scope.save = function () {
        // const data = scope.dataSource.applyModifiedData(scope.form, scope.gridDialog, scope.record);
        scope._incChanges();
        if (scope.inline)
          return;
        // return scope.$parent.record[scope.fieldName] = scope.records;
        if (scope.recordIndex > -1) {
          let rec = scope.record;
          scope.record = null;
          scope.records.splice(scope.recordIndex, 1);
          setTimeout(() => {
            scope.records.splice(scope.recordIndex, 0, rec);
            scope.$apply();
          });
        } else if (scope.recordIndex === -1) {
          scope.records.push(scope.record);
          // scope.$parent.record[scope.fieldName] = scope.records;
        }
        if (!scope.inline) {
          scope.gridDialog.modal('toggle');
        }
      };


      let _loadChildFromCache = (child) => {
        if (scope.record.hasOwnProperty(child.fieldName)) {
          child.scope.records = scope.record[child.fieldName];
        }
      };

      function trim(str) {
        str = str.replace(/^\s+/, '');
        for (let i = str.length - 1; i >= 0; i--) {
          if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
          }
        }
        return str;
      }

      scope.pasteData = async function () {
        let cache = {};

        let _queryForeignKeyField = async function (field, val) {
          return new Promise(async (resolve, reject) => {

            if (!cache[field.name])
              cache[field.name] = {};
            if (cache[field.name][val] === undefined) {
              let res = await scope.model.getFieldChoices(field.name, val, {exact: true});
              if (res.items && res.items.length)
                cache[field.name][val] = res.items[0];
              else
                cache[field.name][val] = null;
            }
            resolve(cache[field.name][val]);

          });
        };

        let fields = [];
        for (let f of $(scope.view.content).find('field')) {
          let field = scope.view.fields[$(f).attr('name')];
          if (field && (_.isUndefined(field.visible) || field.visible))
            fields.push(field);
        }
        let txt = await navigator.clipboard.readText();

        // read lines
        let rowNo = 0;
        for (let row of txt.split(/\r?\n/)) {
          rowNo++;
          if (row) {
            let i = 0;
            let newObj = {};
            for (let col of row.split(/\t/)) {
              let field = fields[i];
              if (field instanceof Katrid.Data.Fields.ForeignKey)
                newObj[field.name] = await _queryForeignKeyField(field, trim(col));
              else
                newObj[field.name] = trim(col);
              i++;
            }
            scope.addRecord(newObj);
          }
        }
        scope.$apply();
      };


      let unkook = [
        scope.$on('masterChanged', async function (evt, master, key) {
          // Ajax load nested data
          if (master === scope.dataSource.masterSource) {
            scope.dataSet = [];
            scope._changeCount = 0;
            scope.records = [];
            if (key != null) {
              const data = {};
              data[field.field] = key;
              if (key) {
                // TODO remove in future
                scope.dataSource.pageLimit = 1000;
                return await scope.dataSource.search(data)
                .then((data) => {
                  // setup the log information, it will be useful to watch field value changes
                  scope.$parent.$fieldLog[field.name] = {count: 0, value: data.data};
                  scope.$parent.record[field.name] = data.data;
                  scope.$parent.$apply();
                })
                .finally(() => scope.dataSource.state = Katrid.Data.DataSourceState.browsing);
              }
            } else {
              scope.$parent.record[field.name] = [];
            }
          }
        }),
        scope.$on('afterCancel', function (evt, master) {
          if (master === scope.dataSource.masterSource)
            scope.dataSource.cancel();
        })
      ];


      scope.$on('$destroy', function () {
        unkook.map(fn => fn());
        dataSource.masterSource.children.splice(dataSource.masterSource.indexOf(dataSource), 1);
      });


    }

    async renderDialog(scope, attrs) {
      let el;
      let html = scope.views.form.content;

      scope.view = scope.views.form;
      let fld = scope.views.form.fields[scope.field.field];
      if (fld)
        fld.visible = false;

      if (attrs.inline) {
        el = me.$compile(html)(scope);
        gridEl.find('.inline-input-dialog').append(el);
      } else {
        let view = new Katrid.UI.Views.FormView({scope}, scope.views.form, {
          dialog: true,
          templateUrl: 'view.field.OneToManyField.Dialog.jinja2',
          context: {
            field: scope.field,
          },
        });
        el = view.render();
      }

      // Get the first form controller
      scope.formElement = el.find('form:first');
      scope.form = scope.formElement.controller('form');
      scope.gridDialog = el;

      if (!attrs.inline) {
        el.modal('show');
        el.on('hidden.bs.modal', function () {
          scope.record = null;
          scope.dataSource.state = Katrid.Data.DataSourceState.browsing;
          el.remove();
          scope.gridDialog = null;
          scope.recordIndex = -1;
          _destroyChildren();
        });
      }
      el.find('.modal-dialog').addClass('ng-form');
      return new Promise(function (resolve) {
        el.on('shown.bs.modal', () => resolve(el));
      });
    };

  }

  Katrid.UI.uiKatrid

  .directive('grid', ['$compile', Grid])

  .directive('list', ['$compile', $compile => ({
    restrict: 'E',
    scope: false,
    compile(el, attrs) {
      el.addClass('table-responsive');
      let rowClick = attrs.ngRowClick;
      let records = attrs.records || 'groups';
      let content = el.html();
      let options = {};
      if (attrs.listOptions)
        options = JSON.parse(attrs.listOptions);
      let template = Katrid.app.getTemplate('view.list.table.jinja2', {attrs, rowClick, options, records});

      return function (scope, el, attrs, controller) {
        let templ = $(template);
        let tr = templ.find('tbody>tr:first');
        let thead = templ.find('thead>tr:first');
        let tfoot = templ.find('tfoot>tr:first');

        let formView;
        let ngTrClass = attrs.ngTrClass;
        if (ngTrClass)
          ngTrClass = ',' + ngTrClass;
        else
          ngTrClass = '';
        console.log('row class', ngTrClass);
        if (attrs.inlineEditor) {
          templ.addClass('inline-editor');
          formView = $(scope.views.form.content);
          tr
          .attr('ng-form', "grid-row-form-{{$index}}")
          .attr('id', 'grid-row-form-{{$index}}');
        } else
          tr.attr(
              'ng-class',
              "{" +
              "'group-header': record.$hasChildren, " +
              "'form-data-changing': (dataSource.changing && dataSource.recordIndex === $index), " +
              "'form-data-readonly': !(dataSource.changing && dataSource.recordIndex === $index)" +
              ngTrClass +
              "}"
          );

        // compile fields
        let fields = $('<div>').append(content);
        let totals = [];
        let hasTotal = false;
        let td, th;
        for (let fld of fields.children('field')) {
          fld = $(fld);
          let fieldName = fld.attr('name');
          let field = scope.view.fields[fieldName];
          if (field) {

            field.assign(fld);

            let total = fld.attr('total');
            if (total) {
              hasTotal = true;
              totals.push({
                field: field,
                name: fieldName,
                total: total,
              });
            } else
              totals.push(false);

            if (!field.visible)
              continue;

            let inplaceEditor = false;
            if (formView) {
              inplaceEditor = formView.find(`field[name="${fieldName}"]`);
              inplaceEditor = $(inplaceEditor[0].outerHTML).attr('form-field', 'form-field').attr('inline-editor', attrs.inlineEditor)[0].outerHTML;
            }
            let fieldEl = $(field.render('list', fld, {view: scope.view}));
            th = fieldEl.first();
            td = $(th).next();
          } else {
            // just use the html content
            th = '<th></th>';
            td = `<td>${fld.html()}</td>`;
          }
          tr.append(td);
          thead.append(th);
        }

        if (hasTotal)
          for (total of totals)
            tfoot.append(Katrid.app.getTemplate('view.list.table.total.jinja2', {field: total.field}));
        else
          tfoot.remove();

        if (options.deleteRow) {
          let delRow = $(Katrid.app.getTemplate('view.list.table.delete.jinja2'));
          for (let child of delRow)
            if (child.tagName === 'TD')
              tr.append(child);
            else if (child.tagName === 'TH')
              thead.append(child);
          if (hasTotal)
            tfoot.append('<td class="list-column-delete" ng-show="dataSource.parent.changing && !dataSource.readonly"></td>');
        }
        el.html('');
        el.append($compile(templ)(scope));
      }
    }
  })]);


})();
