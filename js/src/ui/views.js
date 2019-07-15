(() => {

  let compileButtons = (container) => {
    let sendFileCounter = 0;
    console.log(container);
    return container.find('button').each((idx, btn) => {
      btn = $(btn);
      let type = btn.attr('type');

      if (!btn.attr('type') || (btn.attr('type') === 'object'))
        btn.attr('type', 'button');
      if (type === 'object') {
        let sendFile = btn.attr('send-file');
        btn.attr('button-object', btn.attr('name'));
        if (_.isUndefined(sendFile)) {
          btn.attr('ng-click', `action.formButtonClick(action.selection, '${ btn.attr('name') }', $event.target);$event.stopPropagation();`);
        } else {
          let idSendFile = `__send_file_${++sendFileCounter}`;
          container.append(`<input id="${idSendFile}" type="file" style="display: none" onchange="Katrid.Services.Upload.sendFile('${btn.attr('name')}', this)"/>`);
          btn.attr('send-file', btn.attr('name'));
          btn.attr('onclick', `$('#${idSendFile}').trigger('click')`);
        }
      } else if (type === 'tag') {
        btn.attr('button-tag', btn.attr('name'));
        btn.attr('onclick', `Katrid.Actions.ClientAction.tagButtonClick($(this))`);
      }
      if (!btn.attr('class'))
        btn.addClass('btn btn-outline-secondary');
    });
  };

  class ToolbarComponent extends Katrid.UI.Widgets.Component {
    constructor() {
      super();
      this.scope = false;
      this.restrict = 'E';
      this.replace = true;
      this.transclude = true;
      this.templateUrl = 'view.header.jinja2';
    }
  }
  Katrid.UI.uiKatrid.directive('toolbar', ToolbarComponent);


  class ClientView {
    constructor(action) {
      this.action = action;
    }

    get template() {
      return Katrid.app.getTemplate(this.templateUrl);
    }

    render() {
      return $(this.template);
    }
  }


  class BaseView {
    constructor(scope) {
      this.scope = scope;
    }

    render() {
      return Katrid.app.getTemplate(this.templateUrl);
    }
  }

  class ActionView extends BaseView{
    constructor(action, scope, view, content) {
      super(scope);
      this.action = action;
      this.view = view;
      this.templateUrl = 'view.basic';
      this.toolbar = true;
      this.content = content;
    }

    getTemplateContext() {
      return { content: this.content };
    }

    render() {
      return sprintf(Katrid.app.getTemplate(this.templateUrl), this.getTemplateContext());
    }

    renderTo(el) {
      Katrid.core.setContent(this.render(), this.scope);
    }
  }

  class View extends ActionView {
    getBreadcrumb() {
      let html = `<ol class="breadcrumb">`;
      let i = 0;
      for (let h of Katrid.app.actionManager) {
        if (i === 0 && h.viewModes.length > 1)
          html += `<li class="breadcrumb-item"><a href="#" ng-click="action.backTo(0, 0)">${ h.info.display_name }</a></li>`;
        i++;
        if (Katrid.Actions.actionManager.length > i && h.viewType === 'form')
          html += `<li class="breadcrumb-item"><a href="#" ng-click="action.backTo(${i-1}, 'form')">${ h.scope.record.display_name }</a></li>`;
      }
      if (this.constructor.type === 'form')
        html += `<li class="breadcrumb-item">{{ self.display_name }}</li>`;
      return html + '</ol>';
    }

    render() {
      return sprintf(Katrid.app.$templateCache.get(this.templateUrl), { content: this.content });
    }

    getViewButtons() {
      let btns = Object.entries(View.buttons).map((btn) => this.view.viewModes.includes(btn[0]) ? btn[1] : '').join('');
      if (btns) btns = `<div class="btn-group">${btns}</div>`;
      return btns;
    }

  }


  class View2 {
    constructor(action, viewInfo) {
      this.viewType = null;
      this.action = action;
      this.viewInfo = viewInfo;
      this.templateUrl = null;
    }

    renderTo(container) {
      container.html(this.render(container));
    }

    get fields() {
      return this.viewInfo.fields;
    }

    renderField(fieldEl) {
      let name = fieldEl.attr('name');
      if (name) {
        let fld = this.fields[name];
        if (fld) {
          let html = fld.render(this.viewType, fieldEl, { view: this }).toString();
          if (fld.visible)
            return html;
          return '';
        } else
          console.error(`Field "${name}" not found`);
      }
    }

  }

  class FormView extends View2 {
    constructor(action, viewInfo, opts) {
      super(action, viewInfo);
      this.dialog = false;
      this.viewType = 'form';
      this.templateUrl = 'view.form.jinja2';
      this.context = {};
      if (opts) {
        this.dialog = opts.dialog;
        if (opts.templateUrl)
          this.templateUrl = opts.templateUrl;
        if (opts.context)
          Object.assign(this.context, opts.context);
      }
    }

    render(container) {
      let form = $(this.viewInfo.content);
      form.addClass('row');

      compileButtons(form);
      let headerEl = form.find('header:first');
      let header = '';
      if (headerEl.length) {
        headerEl.find('field[name=status]:first').attr('status-field', 'status-field');
        header = headerEl.html();
        headerEl.remove();
      }

      for (let child of form.find('field')) {
        child = $(child);
        if (child.attr('invisible') !== undefined)
          continue;
        if (!child.parents('field').length) {
          child.attr('form-field', 'form-field');
          child.replaceWith(this.renderField(child));
        }
      }

      let context = {};
      Object.assign(context, this.context);
      Object.assign(context, {
        header, content: form[0].outerHTML,
      });
      if (!this.dialog)
        context['breadcrumb'] = this.breadcrumb;
      let templ = Katrid.app.getTemplate(this.templateUrl, context);
      templ = $(templ);

      templ = Katrid.Core.$compile(templ)(this.action.scope);
      templ.addClass('ng-form');
      if (this.action) {
        // get the form element
        this.action.$form = templ.find('form').first();
        // get the form controller
        this.action.form = angular.element(this.action.$form).controller('form');
      }
      return templ;
    }
  }


  class List extends View2 {
    constructor(...args) {
      super(...args);
      this.viewType = 'list';
      this.templateUrl = 'view.list.jinja2';
      this.action.view = this;
    }

    render(container) {
      let list = $(this.viewInfo.content);
      let context = {};
      Object.assign(context, this.context);
      compileButtons(list);
      let headerEl = list.find('header:first');
      let header = '';
      if (headerEl.length) {
        header = headerEl.html();
        headerEl.remove();
      }

      let templ = Katrid.app.getTemplate(this.templateUrl, { header, content: list[0].outerHTML });
      // compile the template with the action scope
      templ = $(templ);
      templ.find('list')
      .attr('ng-row-click', 'action.listRowClick($index, record, $event)')
      .attr('list-options', '{"rowSelector": true}').attr('ng-row-click', 'action.listRowClick($index, record, $event)');

      templ = Katrid.Core.$compile(templ)(this.action.scope);
      setTimeout(() => this.action.dataSource.open());
      return templ;
    }
  }


  class Card extends View2 {
    constructor(...args) {
      super(...args);
      this.viewType = 'card';
      this.templateUrl = 'view.card.jinja2';
      this.action.view = this;
    }

    render(container) {
      let content = $(this.viewInfo.content);
      content.children('field').remove();
      content.find('field').each((idx, el) => $(el).replaceWith(`\$\{ ::record.${ $(el).attr('name') } }`));

      let templ = Katrid.app.getTemplate(this.templateUrl, { content: content[0].outerHTML });
      // compile the template with the action scope
      templ = $(templ);
      templ = Katrid.Core.$compile(templ)(this.action.scope);
      setTimeout(() => this.action.dataSource.open());
      return templ;
    }
  }




  Katrid.UI.uiKatrid

  .directive('listView2', () => ({
    scope: false,
    link($scope, $el) {
      if (!$el.find('header').find('button').length)
        $el.find('header').remove();
    },
    template($el) {
      console.log('compile template');
      compileButtons($el);
      let headerEl = $el.find('header').first();
      let header = '';
      if (headerEl.find('button').length)
        if (headerEl.length) {
          header = headerEl.html();
          headerEl.remove();
        }
      $el.find('list').attr('list-options', '{"rowSelector": true}').attr('ng-row-click', 'action.listRowClick($index, record, $event)');
      return sprintf(
        Katrid.app.getTemplate('view.list')
        .replace('<!-- replace-header -->', header),
        { content: $el.html() }
      );
    },
  }))

  .directive('card2', () => ({
    replace: true,
    template($el) {
      $el.children('field').remove();
      $el.find('field').each((idx, el) => $(el).replaceWith(`{{ ::record.${ $(el).attr('name') } }}`));
      return sprintf(Katrid.app.getTemplate('view.card'), { content: $el.html() });
    }
  }));


  Katrid.UI.Views = {
    View,
    BaseView,
    ActionView,
    FormView,
    ClientView,
    List,
    searchModes: ['list', 'card']
  };

  Katrid.UI.Views['list'] = List;
  Katrid.UI.Views['form'] = FormView;
  Katrid.UI.Views['card'] = Card;

})();

