(function () {

  Katrid.UI.uiKatrid.directive("foreignkey", ['$compile', '$controller', ($compile, $controller) => ({
    restrict: "A",
    require: "ngModel",
    link(scope, el, attrs, controller) {
      let serviceName;
      let sel = el;
      let _shown = false;
      const field = scope.view.fields[attrs.name];
      el.addClass("form-field");
      if (attrs.serviceName) serviceName = attrs;
      else if (scope.action && scope.action.model) serviceName = scope.action.model.name;
      else serviceName = attrs.foreignkey;
      const newItem = function () {
      };
      const newEditItem = function () {
      };
      let _timeout = null;

      let config = {
        allowClear: true,
        query(query) {
          // evaluate domain attribute
          let domain = field.domain;
          if (domain && _.isString(domain))
            domain = scope.$eval(domain);

          // make params
          let data = {
            args: [query.term],
            kwargs: {
              count: 1,
              page: query.page,
              domain: domain,
              name_fields: attrs.nameFields && attrs.nameFields.split(",") || null
            }
          };
          const f = () => {
            let svc;
            if (scope.model) svc = scope.model.getFieldChoices(field.name, query.term, data.kwargs);
            else svc = new Katrid.Services.Model(field.model).searchName(data);
            svc.then(res => {
              let data = res.items;
              const r = data.map(item => ({
                id: item[0],
                text: item[1]
              }));
              const more = query.page * Katrid.settings.services.choicesPageLimit < res.count;
              if (!multiple && !more) {
                let msg;
                const v = sel.data("select2").search.val();
                if ((attrs.allowCreate && attrs.allowCreate !== "false" || attrs.allowCreate == null) && v) {
                  msg = Katrid.i18n.gettext('Create <i>"%s"</i>...');
                  r.push({
                    id: newItem,
                    text: msg
                  })
                }
              }
              return query.callback({
                results: r,
                more: more
              })
            })
          };
          if (_timeout) clearTimeout(_timeout);
          _timeout = setTimeout(f, 400)
        },
        ajax: {
          url: `/api/rpc/${serviceName}/get_field_choices/`,
          contentType: "application/json",
          dataType: "json",
          type: "POST"
        },
        formatSelection(val) {
          if (val.id === newItem || val.id === newEditItem) return Katrid.i18n.gettext("Creating...");
          return val.text
        },
        formatResult(state) {
          const s = sel.data("select2").search.val();
          if (state.id === newItem) {
            state.str = s;
            return `<strong>${sprintf(state.text, s)}</strong>`
          } else if (state.id === newEditItem) {
            state.str = s;
            return `<strong>${sprintf(state.text, s)}</strong>`
          }
          return state.text
        },
        initSelection(el, cb) {
          let v = controller.$modelValue;
          if (multiple) {
            v = v.map(obj => ({
              id: obj[0],
              text: obj[1]
            }));
            return cb(v)
          } else if (_.isArray(v)) {
            return cb({
              id: v[0],
              text: v[1]
            })
          }
        }
      };

      let allowCreateEdit = attrs.noCreateEdit;
      allowCreateEdit = _.isUndefined(allowCreateEdit) || !Boolean(allowCreateEdit);

      let {
        multiple: multiple
      } = attrs;
      if (multiple) {
        config["multiple"] = true
      }
      sel = sel.select2(config);

      let createNew = () => {
        sel.select2('close');
        let service = new Katrid.Services.Model(field.model);
        return service.getViewInfo({
          view_type: "form"
        }).then(function (res) {
          let title = _.sprintf(Katrid.i18n.gettext('Create: %(title)s'), {title: field.caption});
          let options = {
            scope: scope.$new(true),
            $controller: $controller,
            sel: sel, field: field,
            title: title,
            view: res,
            model: service,
            action: scope.action,
          };
          let wnd = new Katrid.UI.Dialogs.Window(options);
          wnd.createNew();
        })
      };

      if (allowCreateEdit)
        sel.parent().find('div.select2-container>div.select2-drop')
        .append(`<div style="padding: 4px;"><button type="button" class="btn btn-link btn-sm">${Katrid.i18n.gettext('Create New...')}</button></div>`)
        .find('button').click(createNew);


      sel.on("change", async e => {
        console.log('on change', e.val);
        let v = e.added;
        if (v && v.id === newItem) {
          let service = new Katrid.Services.Model(field.model);
          try {
            let res = await service.createName(v.str);
            let vals = {};
            vals[field.name] = res;
            scope.dataSource.setValues(vals);
            sel.select2('data', {id: res[0], text: res[1]});
          } catch (err) {
            let res = await service.getViewInfo({
              view_type: "form"
            });
            let title = _.sprintf(Katrid.i18n.gettext('Create: %(title)s'), {title: field.caption});
            let options = {
              scope: scope.$new(true),
              $controller: $controller,
              sel: sel, field: field,
              title: title,
              view: res,
              model: service,
              action: scope.action,
            };
            let wnd = new Katrid.UI.Dialogs.Window(options);
            wnd.createNew({creationName: v.str});
            sel.select2('data', null);
          }
        } else if (v && v.id === newEditItem) {
        } else if (multiple && e.val.length) {
          return controller.$setViewValue(e.val)
        } else {
          controller.$setDirty();
          if (v) {
            return controller.$setViewValue([v.id, v.text])
          } else {
            return controller.$setViewValue(null)
          }
        }
      }).on("select2-open", () => {
        if (!_shown) {
          _shown = true;
          let parentModal = el.closest("div.modal");
          if (parentModal.length) parentModal.on("hide.bs.modal", () => sel.select2("destroy"))
        }
      });
      controller.$parsers.push(value => {
        if (value) {
          if (_.isArray(value)) return value;
          else if (_.isObject(value)) return [value.id, value.text];
          else return value
        }
        return null
      });
      if (!multiple) scope.$watch(attrs.ngModel, (newValue, oldValue) => sel.select2("val", newValue));
      return controller.$render = function () {
        if (multiple) {
          if (controller.$modelValue) {
            const v = Array.from(controller.$modelValue).map(obj => obj[0]);
            sel.select2("val", controller.$modelValue);
          }
        } else if (controller.$viewValue) {
          return sel.select2("val", controller.$viewValue[0])
        } else {
          return sel.select2("val", null)
        }
      }
    }
  })]);


  Katrid.UI.uiKatrid.filter('m2m', () =>
    function (input) {
      if (_.isArray(input))
        return input.map((obj) => obj ? obj[1] : null).join(', ');
    }
  );


})();
