(function () {

  let uiKatrid = Katrid.UI.uiKatrid;

  let formCount = 0;

  uiKatrid.directive('formField2', ['$compile', function ($compile) {
    return {
      restrict: 'A',
      priority: 99,
      replace: true,
      // priority: -1,
      compile(el, attrs) {
        return function(scope, element, attrs, ctrl) {
          let field = scope.view.fields[attrs.name];
          if (_.isUndefined(field))
            throw Error('Invalid field name "' + attrs.name + '"');
          let templ = field.template.form;
          field.assign(element);
          if (!field.visible) {
            el.remove();
            return;
          }
          let fieldAttributes = field.getAttributes(attrs);
          let sectionAttrs = {};

          // conditional readonly
          if (fieldAttributes['ng-readonly'])
            sectionAttrs['ng-readonly'] = fieldAttributes['ng-readonly'].toString();

          // conditional display
          if (attrs.ngShow)
            sectionAttrs['ng-show'] = attrs.ngShow;

          // field help text
          if (field.helpText) {
            sectionAttrs['title'] = field.helpText;
          }

          let content = element.html();
          templ = Katrid.app.getTemplate(templ, {
            name: attrs.name, field, attrs: fieldAttributes, content, fieldAttributes: attrs, sectionAttrs,
          });
          templ = $compile(templ)(scope);
          element.replaceWith(templ);

          // Add input field for tracking on FormController
          let fcontrol = templ.find('.form-field');
          if (fcontrol.length) {
            fcontrol = fcontrol[fcontrol.length - 1];
            const form = templ.controller('form');
            ctrl = angular.element(fcontrol).data().$ngModelController;
            if (ctrl)
              form.$addControl(ctrl);
          }
        }
      },
    };
  }]);

  uiKatrid.directive('inputField', () => ({
    restrict: 'A',
    scope: false,
    link(scope, element, attrs) {
      $(element).on('click', function() {
        // input field select all text on click
        $(this).select();
      });
    }
  }));


  uiKatrid.directive('view', () =>
    ({
      restrict: 'E',
      template(element, attrs) {
        formCount++;
        return '';
      },
      link(scope, element, attrs) {
        if (scope.model) {
          element.attr('class', `view-form-${scope.model.name.replace(new RegExp('\.', 'g'), '-')}`);
          element.attr('id', `katrid-form-${formCount.toString()}`);
          element.attr('model', scope.model);
          return element.attr('name', `dataForm${formCount.toString()}`);
        }
      }
    })
  );

  // uiKatrid.directive('list', ($compile, $http) =>
  //   ({
  //     restrict: 'E',
  //     priority: 700,
  //     link(scope, element, attrs) {
  // console.log('render list');
  //       let html = Katrid.UI.Utils.Templates.renderList(scope, element, attrs);
  //       html = $compile(html)(scope);
  //       return element.replaceWith(html);
  //     }
  //   })
  // );

  uiKatrid.directive('ngSum', () =>
    ({
      restrict: 'A',
      priority: 9999,
      require: 'ngModel',
      link(scope, element, attrs, controller) {
        const nm = attrs.ngSum.split('.');
        const field = nm[0];
        const subField = nm[1];
        return scope.$watch(`record.$${field}`, function (newValue, oldValue) {
          if (newValue && scope.record) {
            let v = 0;
            scope.record[field].map(obj => v += parseFloat(obj[subField]));
            if (v.toString() !== controller.$modelValue) {
              controller.$setViewValue(v);
              controller.$render();
            }
          }
        });
      }
    })
  );


  uiKatrid.directive('ngEnter', () =>
    (scope, element, attrs) =>
      element.bind("keydown keypress", (event) => {
        if (event.which === 13) {
          scope.$apply(() => scope.$eval(attrs.ngEnter, {$event: event}));
          event.preventDefault();
        }
      })
  );

  uiKatrid.directive('ngEsc', () =>
    (scope, element, attrs) =>
      element.bind("keydown keypress", (event) => {
        if (event.which === 27) {
          scope.$apply(() => scope.$eval(attrs.ngEsc, {$event: event}));
          event.preventDefault();
        }
      })
  );



  if ($.fn.modal)
    $.fn.modal.Constructor.prototype._enforceFocus = function() {};

  uiKatrid.directive('ajaxChoices', ['$location', $location =>
    ({
      restrict: 'A',
      require: '?ngModel',
      link(scope, element, attrs, controller) {
        const {multiple} = attrs;
        const serviceName = attrs.ajaxChoices;
        let field = attrs.field;
        let _timeout = null;
        let domain;

        const cfg = {
          allowClear: true,
          query(query) {

            // make params
            let data = {
              args: [query.term],
              kwargs: {
                count: 1,
                page: query.page,
                name_fields: attrs.nameFields && attrs.nameFields.split(",") || null
              }
            };

            if (domain)
              data.domain = domain;

            const f = () => {
              let svc = new Katrid.Services.Model(serviceName);
              if (field) svc = svc.getFieldChoices(field, query.term, data.kwargs);
              else svc = new Katrid.Services.Model(attrs.modelChoices).searchName(data);
              svc.then(res => {
                let data = res.items;
                const r = data.map(item => ({
                  id: item[0],
                  text: item[1]
                }));
                const more = query.page * Katrid.settings.services.choicesPageLimit < res.count;
                return query.callback({
                  results: r,
                  more: more
                })
              });
            };
            if (_timeout) clearTimeout(_timeout);
            _timeout = setTimeout(f, 400)

          },
          escapeMarkup(m) {
            return m;
          },
          initSelection(element, callback) {
            const v = controller.$modelValue;
            if (v) {
              if (multiple) {
                const values = [];
                for (let i of Array.from(v)) {
                  values.push({id: i[0], text: i[1]});
                }
                return callback(values);
              } else {
                return callback({id: v[0], text: v[1]});
              }
            }
          }
        };
        if (multiple)
          cfg['multiple'] = true;

        const el = element.select2(cfg);
        let sel = el;
        element.on('$destroy', function () {
          $('.select2-hidden-accessible').remove();
          $('.select2-drop').remove();
          return $('.select2-drop-mask').remove();
        });
        el.on('change', function (e) {
          const v = el.select2('data');
          controller.$setDirty();
          if (v)
            controller.$viewValue = v;

          return scope.$apply();
        });

        controller.$render = () => {
          if (controller.$viewValue)
            return element.select2('val', controller.$viewValue);
        };
      }
    })]
  );

  uiKatrid.directive('inputMask', () =>
    ({
      restrict: 'A',
      link(scope, el, attrs) {
        el.inputmask();
      }
    })
  );


  class Decimal {
    constructor($filter) {
      this.restrict = 'A';
      this.require = 'ngModel';
      this.$filter = $filter;
    }

    link(scope, element, attrs, controller) {
      let decimal = attrs.inputDecimal;
      let opts = {
        alias: 'numeric',
        groupSeparator: '.',
        unmaskAsNumber: true,
        radixPoint: ',',
        autoGroup: true,
        digitsOptional: false,
        placeholder: '0',
      };
      if (decimal)
        opts.digits = parseInt(decimal);
      element.inputmask(opts);

      controller.$parsers.push(value => {
        let v = element.inputmask('unmaskedvalue');
        return v;
      });

      controller.$formatters.push((v) => {
        if (_.isNumber(v))
          v = v.toFixed(opts.digits).replace('.', ',');
        else if (_.isString(v))
          v = v.replace('.', ',');
        return v;
      });
    }

  }

  uiKatrid.directive('inputDecimal', ['$filter', Decimal]);



  uiKatrid.filter('moment', () =>
    function (input, format) {
      if (format) {
        return moment().format(format);
      }
      return moment(input).fromNow();
    }
  );


  uiKatrid.directive('fileReader', () =>
    ({
      restrict: 'A',
      require: 'ngModel',
      scope: {},
      link(scope, element, attrs, controller) {

        if (attrs.accept === 'image/*') {
          element.tag === 'INPUT';
        }

        return element.bind('change', function () {
          const reader = new FileReader();
          reader.onload = event => controller.$setViewValue(event.target.result);
          return reader.readAsDataURL(event.target.files[0]);
        });
      }
    })
  );


  uiKatrid.directive('dateInput', ['$filter', ($filter) => ({
    restrict: 'A',
    require: '?ngModel',
    link(scope, element, attrs, controller) {

      let setNow = () => {
        let value;
        if (attrs.type === 'date')
           value = (new Date()).toISOString().split('T')[0];
        else
          value = moment(new Date()).format('YYYY-MM-DD HH:mm').replace(' ', 'T');  // remove timezone info
        $(element).val(value);
        controller.$setViewValue(value);
        _focus = false;
      };

      let _focus = true;

      element
      .focus(function() {
        if (($(this).val() === ''))
          _focus = true;
      })
      .keypress(function(evt) {
        if (evt.key.toLowerCase() === 'h') {
          setNow();
          evt.stopPropagation();
          evt.preventDefault();
        }
      })
      .keydown(function(evt) {
        if (/\d/.test(evt.key)) {
          if (($(this).val() === '') && (_focus))
            setNow();
        }
      });

      controller.$formatters.push(function(value) {
        if (value) {
          return new Date(value);
        }
      });

      controller.$parsers.push(function (value) {
        if (_.isDate(value)) {
          let v = moment.utc(value).format('YYYY-MM-DD');
          if (controller.$modelValue)
            v += 'T' + controller.$modelValue.split('T', 1)[1];
          let r = moment.utc(v).format('YYYY-MM-DDTHH:mm:ss');
          console.log('ret', value, v, r);
          return r;
        }
      });

    }
  })]);

  uiKatrid.directive('timeInput', () => ({
    restrict: 'A',
    require: '?ngModel',
    link(scope, el, attrs, controller) {
      el.inputmask({ regex: '([0-1]?[0-9]|2[0-4]):([0-5][0-9])', insertMode: false });
      // select all chars when focus
      el.on('focus', function() {
        setTimeout(() => $(this).select());
      });

      controller.$parsers.push(function (value) {
        let v = controller.$modelValue.split('T', 1)[0] + 'T' + value;
        console.log('time parser', v, value, controller.$viewValue);
        let r = moment.utc(v).format('YYYY-MM-DDTHH:mm:ss');
        if (r === 'Invalid date')
          r = controller.$modelValue;
        return r;
      });

      controller.$render = function() {
        let v = controller.$modelValue;
        console.log('render', v);
        if (v)
          return el.val(moment.utc(v).format('HH:mm'));
      }

    }
  }));


  uiKatrid.directive('cardDraggable', () => {
    return {
      restrict: 'A',
      link(scope, element, attrs, controller) {
        let cfg = {
          connectWith: attrs.cardDraggable,
          items: '> .sortable-item'
        };
        // Draggable write expression
        if (!_.isUndefined(attrs.cardItem))
          cfg['receive'] = (event, ui) => {
            let parent = angular.element(ui.item.parent()).scope();
            let scope = angular.element(ui.item).scope();
            console.log(scope);
            console.log(parent);
            let data = {};
            data['id'] = scope.record.id;
            $.extend(data, parent.group._domain);
            parent.model.write([data])
            .then(res => {
              console.log('write ok', res);
            });
          };
        // Group reorder
        if (!_.isUndefined(attrs.cardGroup))
          cfg['update'] = (event, ui) => {
            let ids = [];
            $.each(ui.item.parent().find('.card-group'), (idx, el) => {
              ids.push($(el).data('id'));
            });
            let groupName = element.find('.card-group').first().data('group-name');
            let modelName = scope.$parent.$parent.view.fields[groupName].model;
            Katrid.Services.data.reorder(modelName, ids)
            .done(res => {
              console.log(res);
            });
          };
        element.sortable(cfg).disableSelection();
      }
    };
  });

  uiKatrid.directive('uiTooltip', () => ({
    restrict: 'A',
    link: (scope, el, attrs) => {
      $(el).tooltip({
        container: 'body',
        delay: {
          show: 200,
          hide: 500
        }
      });
    }
  }));

  uiKatrid.setFocus = (el) => {
    let e = $(el);
    // check if element object has select2 data
    if (e.data('select2')) e.select2('focus');
    else el.focus();
  };

  uiKatrid.directive('attachmentsButton', () => ({
    restrict: 'A',
    scope: false,
    link: (scope, el) => {
      let _pendingOperation;
      scope.$parent.$watch('recordId', (key) => {
        let attachment = new Katrid.Services.Model('ir.attachment', scope);
        console.log(scope);
        // scope.$parent.attachments = [];
        clearTimeout(_pendingOperation);
        _pendingOperation = setTimeout(() => {
          attachment.search({ params: { model: scope.action.model.name, object_id: key }, count: false })
          .then(res => {
            let r = null;
            if (res && res.data)
              r = res.data;
            scope.$apply(() => scope.attachments = r );
          });
        }, 1000);

      });
    }
  }));

  uiKatrid.directive('action', ['$compile', ($compile) => ({
    restrict: 'E',
    priority: 99,
    link: (scope, el, attrs) => {
      console.log('define action', attrs.ngClick);
      let div = el.closest('div.data-form');
      let actions = div.find('.dropdown-menu-actions');
      let name = attrs.name;
      let label = el.html();
      let html = `<li><a href="javascript:void(0)">${label}</a></li>`;
      let newItem = $(html);
      newItem.click(() => {
        if (attrs.object) scope.model.rpc(attrs.object, [scope.$parent.record.id]);
        //scope.$eval(attrs.ngClick);
      });
      actions.append(newItem);
      el.remove();
    }
  })]);

  class CardView {
    constructor() {
      this.restrict = 'E';
      this.scope = false;
    }

    controller($scope, element, attrs) {
      console.log('controller started');
      $scope.dataSource.autoLoadGrouping = true;

      $scope.cardShowAddGroupDlg = (event) => {
        $scope.cardAddGroupDlg = true;
        setTimeout(() => $(event.target).closest('.card-add-group').find('input').focus(), 10);
      };

      $scope.cardAddGroup = (event, name) => {
        let gname = $(event.target).closest('.card-add-group').data('group-name');
        let field = $scope.action.view.fields[gname];
        let svc = new Katrid.Services.Model(field.model);
        console.log('the name is', name);
        svc.createName(name)
        .done((res) => {
          console.log(res);
        });
      };

      $scope.cardAddItem = (event, name) => {
        if (name) {
          let ctx = {};
          let g = $(event.target).closest('.card-group');
          ctx['default_' + g.data('group-name')] = g.data('sequence-id');
          scope.model.createName(name, ctx)
          .done((res) => {
            if (res.ok) {
              let id = res.result[0];
              scope.model.getById(id)
              .done((res) => {
                if (res.ok) {
                  let s = angular.element(event.target).scope();
                  let g = s.group;
                  s.$apply(() => {
                    g.records.push(res.result.data[0]);
                  });
                }
              })
            }
          });
        }
        $scope.kanbanHideAddGroupItemDlg(event);
      };

    }
  }

})();
