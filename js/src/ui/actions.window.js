(function() {

  class WindowAction extends Katrid.Actions.Action {
    static initClass() {
      this.actionType = 'ir.action.window';
    }

    constructor(info, scope, params, $container) {
      super(info, scope, params, $container);
      this.viewMode = info.view_mode;
      this.viewModes = this.viewMode.split(',');
      if (info.model)
        scope.model = this.model = new Katrid.Services.Model(info.model);
      this.dataSource = new Katrid.Data.DataSource(scope, this);
      scope.$on('dataStateChange', this.onDataStateChange);
      scope.$on('afterCancel', (evt, dataSource) => {
        if (dataSource === this.dataSource)
          this.afterCancel(evt, dataSource);
      });
    }

    afterCancel(evt, dataSource) {
      if (dataSource.state === Katrid.Data.DataSourceState.inserting) {
        this.dataSource.record = {};
        this.back();
      }
    }

    back() {
      Katrid.app.actionManager.history.back();
    }

    setDirty(field) {
      const control = this.form[field];
      if (control) {
        control.$setDirty();
      }
    }

    async onHashChange(params) {
      // normalize hash
      let invalidate = false;
      let allowedParams = ['action', 'view_type', 'menu_id', 'model'];
      let loadRecord = (this.params && (this.params.id !== params.id));
      this.params = {};
      if (!params.view_type) {
        this.params.view_type = this.viewModes[0];
        invalidate = true;
      }
      if (!params.model) {
        this.params.model = this.info.model;
        invalidate = true;
      }

      Object.assign(this.params, params);
      // view type form accepts id param
      if (this.params.view_type === 'form')
        allowedParams.splice(0, 0, 'id');
      if (Object.keys(this.params).length === allowedParams.length) {
        for (let k of Object.keys(this.params))
          if (!allowedParams.includes(k)) {
            invalidate = true;
          }
      } else
        invalidate = true;

      // invalidate location hash
      if (invalidate) {
        let oldParams = this.params;
        this.params = {};
        for (let k of allowedParams)
          this.params[k] = oldParams[k];

        // the action param is not required if empty
        if (!this.params.action)
          delete this.params.action;

        // redirect to new params
        location.hash = '#/app/?' + $.param(this.params);
      }

      // apply params
      let viewType = this.params.view_type;
      if (viewType !== this.viewType) {
        this.viewType = viewType;
        await this.execute();
      }
      if (this.params.id && (this.dataSource.recordId != this.params.id))
        this.dataSource.get(this.params.id);
    }

    rpc(method, data, event) {
      if (event)
        event.stopPropagation();
      if (!data)
        data = {};
      else if (_.isArray(data))
        data = { args: data };
      else if (!_.isObject(data))
        data = { args: [data] };
      this.model.rpc(method, data.args, data.kwargs);
    }

    getContext() {
      let ctx = super.getContext();
      let sel = this.selection;
      if (sel && sel.length) {
        ctx.active_id = sel[0];
        ctx.active_ids = sel;
      }
      return ctx;
    }

    restore(viewType) {
      // restore the last search mode view type
      let url = this._currentPath || this.location.$$path;
      let params = this._currentParams[viewType] || {};
      params['view_type'] = viewType;
      if (Katrid.app.actionManager.length > 1) {
        params['actionId'] = this.info.id;
        this.$state.go('actionView', params);
        // this.location.path(url);
        // this.location.search(params);
      } else {
        this.viewType = viewType;
      }
      // window.location.href = '/web/#' + url + '?view_type=list';
      // this.setViewType(viewType, this._currentParams[viewType]);
    }

    getCurrentTitle() {
      if (this.viewType === 'form') {
        return this.scope.record.display_name;
      }
      return super.getCurrentTitle();
    }

    switchView(viewType, params) {
      if (viewType !== this.viewType) {
        this.viewType = viewType;
        this.execute();
        let search = Katrid.app.$location.$$search;
        Object.assign(search, params);
        search.view_type = viewType;
        Katrid.app.$location.search(search);
      }
    }

    createNew() {
      this.switchView('form', { id: null });
    }

    async deleteSelection() {
      let sel = this.selection;
      if (!sel)
        return false;
      if (
        ((sel.length === 1) && confirm(Katrid.i18n.gettext('Confirm delete record?'))) ||
        ((sel.length > 1) && confirm(Katrid.i18n.gettext('Confirm delete records?')))
      ) {
        await this.model.destroy(sel);
        const i = this.scope.records.indexOf(this.scope.record);
        this.viewType = 'list';
        this.dataSource.refresh();
      }
    }

    async copy() {
      this.viewType = 'form';
      await this.dataSource.copy(this.scope.record.id);
      return false;
    }

    async copyTo(configId) {
      if (this.scope.recordId) {
        let svc = new Katrid.Services.Model('ir.copy.to');
        let res = await svc.rpc('copy_to', [configId, this.scope.recordId]);
        let model = new Katrid.Services.Model(res.model);
        let views = await model.getViewInfo({ view_type: 'form' });
        let wnd = new Katrid.ui.Dialogs.Window(this.scope, { view: views }, Katrid.Core.compile, null, model);
        wnd.createNew({ defaultValues: res.value });
      }
    }

    makeUrl(viewType) {
      // get the default view mode
      if (!viewType)
        viewType = this.viewModes[0];

      const search = {
        action: this.info.id,
        view_type: viewType,
        menu_id: Katrid.app.$location.$$search.menu_id,
      };
      if ((viewType === 'form') && this.record)
        search.id = this.record.id;
      return search;
    }

    get record() {
      // returns the active record
      return this.scope.record;
    }

    get searchModes() {
      // returns search view modes
      return this.viewModes.filter(v => v !== 'form');
    }

    get breadcrumb() {
      let breadcrumb = [];
      if (this.searchModes.length) {
        breadcrumb.push({ action: this, url: this.makeUrl(this.lastViewType), text: this.info.display_name });
      }
      if (this.viewType === 'form') {
        let h = { action: this, url: this.makeUrl('form') };
        if (this === Katrid.app.actionManager.currentAction)
          h.text = '${ record.display_name }';
        else
          h.text = this.record && this.record.display_name;
        breadcrumb.push(h);
      }
      return breadcrumb;
    }

    refreshBreadcrumb() {
      Katrid.app.actionManager._breadcrumb = null;

      let templ = Katrid.app.getTemplate('view.breadcrumb.jinja2', {
        breadcrumb: Katrid.app.actionManager.breadcrumb,
        action: this
      });
      templ = Katrid.Core.$compile(templ)(this.scope);
      this.$element.find('.breadcrumb-nav').html(templ);
    }

    $detach() {
      this.$element.detach();
    }

    $attach() {
      this.$element.appendTo(this.$parent);
    }

    async execute() {
      if (!this.views) {
        let res = await this.model.loadViews({
          views: this.info.views,
          action: this.info.id,
          toolbar: true
        });
        this.fields = res.fields;
        this.fieldList = res.fieldList;
        this.views = res.views;

        // pre-render the action container
        let templ = Katrid.app.getTemplate('ir.action.window.jinja2', { action: this });
        templ = Katrid.Core.$compile(templ)(this.scope);
        this.$parent.html(templ);
        this.$element = templ;
        this.$container = this.$element.find('.action-view-content:first');
      }
      this.refreshBreadcrumb();
      this.scope.view = this.views[this.viewType];
      let view = new Katrid.UI.Views[this.viewType](this, this.scope.view);

      if (this.viewType !== 'form') {
        this.lastViewType = this.viewType;
        this.lastUrl = location.hash;
      }

      // render view to main container
      view.renderTo(this.$container);
      setTimeout(() => {
        if ((this.viewType === 'form') && !Katrid.app.$location.$$search.id)
          this.dataSource.insert();
      })
    }

    get viewType() {
      return this._viewType;
    }

    set viewType(value) {
      if (value !== this._viewType) {
        // invalidate the current record id
        if (value !== 'form')
          this.dataSource.recordId = null;
        this._viewType = value;
      }

      return;
      if (!value)
        value = this.viewModes[0];

      if (value === this._viewType)
        return;

      if (!this._viewType)
        this.searchViewType = this.viewModes[0];

      this.view = this.views[value];
      this._viewType = value;
      this.switchView(value);

      if (!this.scope.$$phase)
        this.scope.$apply();

      if (this.location.$$search.view_type !== value) {
        this.location.search({ view_type: value });
      }

      $(Katrid).trigger('formReady', [this.scope]);
    }

    searchText(q) {
      return this.location.search('q', q);
    }

    _prepareParams(params) {
      const r = {};
      for (let p of Array.from(params)) {
        if (p.field && (p.field.type === 'ForeignKey')) {
          r[p.field.name] = p.id;
        } else {
          r[p.id.name + '__icontains'] = p.text;
        }
      }
      return r;
    }

    setSearchParams(params) {
      let p = {};
      if (this.info.domain)
        p = $.parseJSON(this.info.domain);
      for (let [k, v] of Object.entries(p)) {
        let arg = {};
        arg[k] = v;
        params.push(arg);
      }
      return this.dataSource.search(params);
    }

    applyGroups(groups, params) {
      return this.dataSource.groupBy(groups, params);
    }

    groupHeaderClick(record, index) {
      console.log('group header click', record);
      record.$expanded = !record.$expanded;
      if (record.$expanded) {
        this.dataSource.expandGroup(index, record);
      } else {
        this.dataSource.collapseGroup(index, record);
      }
    }

    doViewAction(viewAction, target, confirmation, prompt) {
      return this._doViewAction(this.scope, viewAction, target, confirmation, prompt);
    }

    _doViewAction(scope, viewAction, target, confirmation, prompt) {
      let promptValue = null;
      if (prompt) {
        promptValue = window.prompt(prompt);
      }
      if (!confirmation || (confirmation && confirm(confirmation))) {
        return this.model.doViewAction({ action_name: viewAction, target, prompt: promptValue })
        .then(function(res) {
          let msg, result;
          if (res.status === 'open') {
            return window.open(res.open);
          }
        });
      }
    }

    async formButtonClick(id, meth, self) {
      const res = await this.scope.model.rpc(meth, [id]);
      if (res.open)
        return window.open(res.open);
      if (res.download) {
        let a = document.createElement('a');
        a.href = res.download;
        a.click();
        return;
      }
      if (res.tag === 'refresh')
        this.dataSource.refresh();
      if (res.type) {
        const act = new (Katrid.Actions[res.type])(res, this.scope, this.scope.location);
        act.execute();
      }
    };

    doBindingAction(evt) {
      this.selection;
      Katrid.Services.Actions.load($(evt.currentTarget).data('id'))
      .then(action => {

        if (action.action_type === 'ir.action.report')
          Katrid.Actions.ReportAction.dispatchBindingAction(this, action);

      });
    }

    listRowClick(index, row, evt) {
      if (row.$hasChildren) {
        console.log('list row click');
        this.groupHeaderClick(row, index);
      } else {
        const search = {
          id: row.id,
          action: this.info.id,
          view_type: 'form',
          menu_id: Katrid.app.$location.$$search.menu_id,
        };
        if (evt.ctrlKey) {
          const url = `#${hash}`;
          window.open(url);
          return;
        } else
          Katrid.app.$location.search(search);
        this.dataSource.recordIndex = index;
      }
    }

    onDataStateChange(event, dataSource) {
      let self = dataSource.scope.action;
      if (dataSource.changing)
        setTimeout(() => {
          if (self.$element)
            for (let el of Array.from(self.$element.find("input[type!=hidden].form-field:visible"))) {
              el = $(el);
              if (!el.attr('readonly')) {
                $(el).focus();
                return;
              }
            }
        });
    }

    autoReport() {
      return this.model.autoReport()
      .then(function(res) {
        if (res.ok && res.result.open) {
          return window.open(res.result.open);
        }
      });
    }

    showDefaultValueDialog() {
      const html = Katrid.UI.Utils.Templates.getSetDefaultValueDialog();
      const modal = $(Katrid.core.compile(html)(this.scope)).modal();
      modal.on('hidden.bs.modal', function() {
        $(this).data('bs.modal', null);
        return $(this).remove();
      });
    }

    selectToggle(el) {
      this._selection = $(el).closest('table').find('td.list-record-selector :checkbox').filter(':checked');
      this.selectionLength = this._selection.length;
    }

    get selection() {
      if (this.viewType === 'form') {
        if (this.scope.recordId)
          return this.scope.recordId;
        else
          return;
      }
      if (this._selection)
        return Array.from(this._selection).map((el) => ($(el).data('id')));
    }

    deleteAttachment(attachments, index) {
      let att = attachments[index];
      if (confirm(Katrid.i18n.gettext('Confirm delete attachment?'))) {
        attachments.splice(index, 1);
        Katrid.Services.Attachments.destroy(att.id);
      }
    }
  }
  WindowAction.initClass();

  Katrid.Actions.WindowAction = WindowAction;
  Katrid.Actions[WindowAction.actionType] = WindowAction;

})();
