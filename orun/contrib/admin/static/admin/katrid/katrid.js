"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Katrid;
(function (Katrid) {
    Katrid.$hashId = 0;
    // Web Components
    Katrid.customElementsRegistry = {};
    function define(name, constructor, options) {
        Katrid.customElementsRegistry[name] = { constructor, options };
    }
    Katrid.define = define;
    function createVm(config) {
        config.components = Katrid.componentsRegistry;
        config.directives = Katrid.directivesRegistry;
        let app = Vue.createApp(config);
        app.config.globalProperties.$filters = Katrid.filtersRegistry;
        return app;
    }
    Katrid.createVm = createVm;
    Katrid.componentsRegistry = {};
    Katrid.directivesRegistry = {};
    Katrid.filtersRegistry = {};
    function component(name, config) {
        Katrid.componentsRegistry[name] = config;
    }
    Katrid.component = component;
    function directive(name, config) {
        Katrid.directivesRegistry[name] = config;
    }
    Katrid.directive = directive;
    function filter(name, config) {
        Katrid.filtersRegistry[name] = config;
    }
    Katrid.filter = filter;
    function html(templ) {
        return $(templ)[0];
    }
    Katrid.html = html;
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        Actions.registry = {};
        class Action {
            constructor(config) {
                this.state = null;
                this.config = config;
                if (config.info)
                    this.info = config.info;
                this.isDialog = config.isDialog;
                this.app = config.app || Katrid.webApp;
                if (config.actionManager)
                    this.actionManager = config.actionManager;
                else if (this.app?.actionManager)
                    this.actionManager = this.app.actionManager;
                if (config.container)
                    this.container = config.container;
                else
                    this.container = this.actionManager;
                if (this.actionManager)
                    this.actionManager.addAction(this);
            }
            async debug() {
            }
            async render() {
                if (!this.element) {
                    this.element = document.createElement('action-view');
                    this.element.className = 'action-view';
                }
            }
            async renderTo(container) {
                await this.render();
                if (!container)
                    container = this.actionManager;
                container.append(this.element);
            }
            destroy() {
                this.app.actionManager.removeAction(this);
                if (this.element)
                    // check if there's an element
                    this.element.remove();
                else
                    // or clear the container
                    this.container.innerHTML = '';
            }
            get id() {
                if (this.config.id)
                    return this.config.id;
                return this.info?.id;
            }
            /** Action context contains the contextual data to be sent to a RPC server */
            get context() {
                if (!this._context) {
                    if (Katrid.isString(this.config.context))
                        this._context = JSON.parse(this.config.context);
                    else if (this.config.context)
                        this._context = this.config.context;
                    else
                        this._context = {};
                    // get query string context
                    // load default values on query string
                    let searchParams = window.location.href.split('#', 2)[1];
                    if (searchParams) {
                        const urlParams = new URLSearchParams(searchParams);
                        for (let [k, v] of urlParams)
                            if (k.startsWith('default_'))
                                this._context[k] = v;
                            else if (k === 'filter')
                                this._context[k] = v;
                    }
                }
                return this._context;
            }
            doAction(act) {
                let type = act.type || act.action_type;
                return Actions.registry[type].dispatchAction(this, act);
            }
            onActionLink(actionId, actionType, context) {
                let ctx = {};
                if (context)
                    Object.assign(ctx, context);
                Object.assign(ctx, this.context);
                return Katrid.Services.Actions.onExecuteAction(actionId, actionType, ctx);
            }
            openObject(service, objectId, evt) {
                evt.preventDefault();
                evt.stopPropagation();
                let href = evt.target.href;
                if (!href)
                    href = `#/app/?menu_id=${this.params.menu_id}&model=${service}&view_type=form&id=${objectId}`;
                if (evt.ctrlKey)
                    window.open(evt.target.href);
                else
                    location.hash = href;
                return false;
            }
            restore() {
            }
            apply() {
            }
            execute() {
                $(this.app).trigger('action.execute', this);
            }
            search() {
            }
            onHashChange(params) {
                $(this.app).trigger('action', [this]);
            }
            getDisplayText() {
                return this.config.caption;
            }
            createBreadcrumbItem(ol, index) {
                let li = document.createElement('li');
                li.classList.add('breadcrumb-item');
                if (index === (this.actionManager.actions.length - 1))
                    li.innerText = this.getDisplayText();
                else {
                    li.append(this.createBackItemLink(this.getDisplayText(), index, `back(${index})`));
                }
                ol.append(li);
            }
            createBackItemLink(text, backArrow, click) {
                let a = document.createElement('a');
                if (backArrow)
                    a.innerHTML = '<i class="fa fa-chevron-left"></i> ';
                let txt = document.createElement('span');
                txt.innerText = text;
                a.append(txt);
                a.setAttribute('href', '#');
                if (typeof click === 'string')
                    a.setAttribute('v-on:click.stop.prevent', click);
                else
                    a.addEventListener('click', click);
                console.log('click', click);
                return a;
            }
        }
        Action._context = {};
        Actions.Action = Action;
        class UrlAction extends Action {
            constructor(info) {
                super(info);
                window.location.href = info.url;
            }
        }
        UrlAction.actionType = 'ir.action.url';
        function goto(actionId, config) {
            let params = { action: actionId };
            if (config)
                Object.assign(params, config);
            return Katrid.webApp.actionManager.onHashChange(params, false);
        }
        Actions.goto = goto;
        Actions.registry[UrlAction.actionType] = UrlAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class Homepage extends Actions.Action {
            get content() {
                return this.config.content;
            }
            onHashChange(params) {
                super.onHashChange(params);
                let home = document.createElement('homepage-view');
                console.log('action info', this.config.id);
                home.actionId = this.config.id;
                this.container.append(home);
                let content = this.content;
                if (content) {
                    if (typeof content === 'string')
                        content = JSON.parse(content);
                    home.load(content);
                }
                home.render();
            }
        }
        Homepage.actionType = 'ui.action.homepage';
        Actions.Homepage = Homepage;
        class HomepageElement extends HTMLElement {
            constructor() {
                super(...arguments);
                this.panels = [];
            }
            connectedCallback() {
                this.classList.add('homepage-view', 'col-12');
                this.create();
                this.render();
            }
            create() {
                let div = document.createElement('div');
                div.classList.add('homepage-toolbar');
                let btn = document.createElement('a');
                btn.classList.add('btn', 'btn-edit', 'btn-outline-secondary');
                btn.innerHTML = '<i class="fas fa-pen"></i>';
                div.append(btn);
                btn.addEventListener('click', () => this.edit());
                this.append(div);
            }
            load(data) {
                this.panels = data.panels;
                this.info = data;
            }
            edit() {
                let editor = document.createElement('homepage-editor');
                editor.actionId = this.actionId;
                if (this.info)
                    editor.load(this.info);
                this.parentElement.append(editor);
                this.remove();
            }
            render() {
                for (let panel of this.panels) {
                    let el = this.createPanel();
                    el.load(panel);
                    this.append(el);
                }
            }
            createPanel() {
                return document.createElement('portlet-panel');
            }
        }
        Actions.HomepageElement = HomepageElement;
        Katrid.define('homepage-view', HomepageElement);
        Katrid.Actions.registry[Homepage.actionType] = Homepage;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        /**
         * ActionManager is useful be used to navigate between a stack of actions
         * @constructor
         */
        class ActionManager extends HTMLElement {
            constructor() {
                super();
                /** Stack of nested actions */
                this.actions = [];
                this.currentAction = null;
                this.mainAction = null;
                this.$cachedActions = {};
                this._navbarVisible = true;
            }
            /** Current/visible action */
            get action() {
                return this._action;
            }
            set action(value) {
                this._action = value;
                if (value) {
                    this.empty();
                    value.actionManager = this;
                }
            }
            get navbarVisible() {
                return this._navbarVisible;
            }
            set navbarVisible(value) {
                this._navbarVisible = value;
            }
            back(action) {
                if ((action === undefined) && (this.actions.length > 1)) {
                    this.action = this.actions[this.actions.length - 2];
                    return;
                }
                let index;
                if (action instanceof Actions.Action) {
                    index = this.actions.indexOf(action);
                }
                this.actions.splice(index + 1, this.actions.length - index);
                this.action = this.actions[index];
            }
            removeAction(action) {
                this.actions.splice(this.actions.indexOf(action), this.length);
                if (this.length === 0)
                    this.mainAction = null;
            }
            get length() {
                return this.actions.length;
            }
            get context() {
                if (this.currentAction)
                    return this.currentAction.context;
                return {
                    user_id: Katrid.app.userInfo.id,
                };
            }
            empty() {
                this.innerHTML = '';
            }
            reset() {
                this.empty();
                this.actions = [];
            }
            get path() {
                return this.action.path;
            }
            doAction(action) {
            }
            async onHashChange(params, reset) {
                let actionId = params.action;
                // check if action has changed
                let oldAction, action;
                action = oldAction = this.currentAction;
                let oldActionId;
                if (oldAction)
                    oldActionId = oldAction.info.id;
                // clear action manager history
                if (reset) {
                    this.reset();
                    if (this.action)
                        this.action.destroy();
                    this.action = null;
                }
                // check if there's a cached action
                if (actionId in this.$cachedActions) {
                    let actionInfo = this.$cachedActions[actionId];
                    action = new Katrid.Actions.registry[actionInfo.type](actionInfo, params);
                    // this.addAction(action);
                }
                else if (!actionId && params.model && (!action || (action.params && (action.params.model !== params.model)))) {
                    // action auto detection
                    // get a virtual window action
                    let svc = new Katrid.Services.ModelService(params.model);
                    let actionInfo = await svc.rpc('admin_get_formview_action', [params.id]);
                    action = new Katrid.Actions.registry[actionInfo.type](actionInfo);
                }
                else if (!(this.action && (this.action.config.id == actionId))) {
                    let actionInfo = await Katrid.Services.Actions.load(actionId);
                    if (actionInfo.type === 'ui.action.window')
                        action = new Katrid.Actions.registry[actionInfo.type](actionInfo, params);
                    else
                        action = new Katrid.Actions.registry[actionInfo.type]({ info: actionInfo }, params);
                }
                await action.renderTo(this);
                // await action.execute();
                await action.onHashChange(params);
                return action;
            }
            /** Add an action to the stack */
            addAction(action) {
                // clear the dom container
                this.empty();
                this.actions.push(action);
                this.action = action;
            }
            async execAction(info) {
                if (info.type === 'ui.action.view') {
                    let action = new Katrid.Actions.ViewAction({ actionManager: this, info });
                    return action.renderTo(this);
                }
            }
            async debug(info) {
                let cls = Katrid.Actions.registry[info.action_type];
                let action = new cls({ info });
                await action.debug();
            }
            registerActions(actions) {
                for (let [k, action] of Object.entries(actions)) {
                    this.$cachedActions[k] = action;
                    action.actionManager = this;
                }
            }
        }
        Actions.ActionManager = ActionManager;
        Katrid.define('action-manager', ActionManager);
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        let ALLOWED_PARAMS = {
            form: [/id/, /action/, /view_type/, /menu_id/, /model/, /default_.+/],
            default: [/action/, /view_type/, /menu_id/, /model/, /default_.+/, /filter/],
        };
        Actions.DEFAULT_VIEWS = ['list', 'form'];
        /** WindowAction should be used to display and manipulate data records of a model */
        class WindowAction extends Katrid.Actions.Action {
            constructor(config, location) {
                super(config);
                this._loadDataCallbacks = [];
                this.pendingOperation = false;
                this.viewModes = config.viewModes || Actions.DEFAULT_VIEWS;
                if (this.config?.viewMode)
                    this.viewMode = this.config.viewMode;
                else if (this.config?.info?.viewMode)
                    this.viewMode = this.config.info.viewMode;
                else
                    this.viewMode = 'list';
                if (config.model instanceof Katrid.Data.Model) {
                    this.model = config.model;
                    this.modelName = config.model.name;
                }
                else if (config.fields) {
                    this.modelName = config.model;
                    this.model = new Katrid.Data.Model({ name: this.modelName, fields: config.fields });
                }
                else if (typeof config.model === 'string')
                    this.modelName = config.model;
                this._cachedViews = {};
                if (this.model && config.templates) {
                    this._cachedViews = Katrid.Forms.Views.fromTemplates(this, this.model, config.templates);
                    if (config.records)
                        for (let v of Object.values(this._cachedViews))
                            v.records = config.records;
                }
                else if (config.views) {
                    // initialize views
                    for (let [k, view] of Object.entries(config.views))
                        if (view instanceof Katrid.Forms.ModelView)
                            this._cachedViews[k] = view;
                }
                else if (config.viewsInfo) {
                    this.views = {};
                    for (let [k, viewInfo] of Object.entries(config.viewsInfo))
                        this.views[k] = viewInfo;
                }
                if (!config.viewModes) {
                    if (this._cachedViews)
                        this.viewModes = Object.keys(this._cachedViews);
                    else
                        this.viewModes = Object.keys(this.views);
                }
                // else
                // this._cachedViews = {};
                // this.model = config.model;
                // if (!this.model && config.info.model)
                //   this.model = new Katrid.Services.ModelService(config.info.model);
                // if (config.views)
                //   this.views = config.views;
            }
            createSearchView() {
                if (this._cachedViews.search) {
                    this.searchView = this._cachedViews.search;
                    this.searchView.render();
                }
                else if (this.modelName) {
                    let info;
                    if (this.views)
                        info = this.views['search'];
                    else
                        info = {};
                    if (this.model)
                        info.model = this.model;
                    else
                        info.name = this.modelName;
                    this.searchView = new Katrid.Forms.SearchView(info, this);
                    this.searchView.render();
                }
            }
            async onHashChange(params) {
                // normalize hash
                // return;
                let invalidate = false;
                let loadRecord = (this.params && (this.params.id !== params.id));
                this.params = {};
                if (!params.view_type) {
                    this.params.view_type = this.viewModes[0];
                    invalidate = true;
                }
                if (!params.model) {
                    this.params.model = this.config.model;
                    invalidate = true;
                }
                let allowedParams = ALLOWED_PARAMS[params.view_type || this.params.view_type];
                if (allowedParams === undefined)
                    allowedParams = ALLOWED_PARAMS['default'];
                Object.assign(this.params, params);
                let validParams = [];
                // view type form accepts id param
                for (let k of Object.keys(this.params)) {
                    let f = false;
                    for (let p of allowedParams)
                        if (p.test(k)) {
                            f = true;
                        }
                    if (!f)
                        invalidate = true;
                    else
                        validParams.push(k);
                }
                // invalidate hash location
                if (invalidate) {
                    let oldParams = this.params;
                    this.params = {};
                    for (let k of validParams) {
                        let param = oldParams[k];
                        if (param !== undefined)
                            this.params[k] = param;
                    }
                    // the action param is not required if empty
                    if (!this.params.action)
                        delete this.params.action;
                    let url = this.makeUrl(this.params.view_type);
                    // redirect to new params
                    history.replaceState(null, null, url);
                }
                // apply params
                let viewType = this.params.view_type;
                if (viewType === this.viewType)
                    this.view.onHashChange(params);
                else {
                    // this.viewType = viewType;
                    await this.showView(viewType);
                }
            }
            getCaption() {
                return this.view.vm.record?.$str;
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
            prepareContext() {
                let ctx = super.context();
                let sel = this.view.getSelection();
                if (sel && sel.length) {
                    ctx.active_id = sel[0];
                    ctx.active_ids = sel;
                }
                return ctx;
            }
            getDisplayText() {
                if (this.viewMode === 'form') {
                    return this.view.getDisplayText();
                }
                return super.getDisplayText();
            }
            onLoadData(recs) {
                if (this.selection && this.selection.clear)
                    this.selection.clear();
                for (let cb of this._loadDataCallbacks)
                    cb(recs);
            }
            addLoadDataCallback(callback) {
                if (this._loadDataCallbacks.indexOf(callback) === -1)
                    this._loadDataCallbacks.push(callback);
            }
            removeLoadDataCallback(callback) {
                if (this._loadDataCallbacks.indexOf(callback) > -1)
                    this._loadDataCallbacks.splice(this._loadDataCallbacks.indexOf(callback), 1);
            }
            switchView(viewType, params) {
                if (viewType !== this.viewType) {
                    let search = {};
                    Object.assign(search, Katrid.app.$location.$$search);
                    if (params)
                        Object.assign(search, params);
                    search.view_type = viewType;
                    Katrid.app.$location.search(search);
                }
            }
            async showView(mode) {
                // store the last searchable view
                // console.log(this.params.viewType, this.viewType);
                let oldView = this.view;
                this.viewMode = mode;
                if (mode in this._cachedViews) {
                    this.view = this._cachedViews[mode];
                    // this.el = this.view.actionView;
                    // this.container.append(this.view.actionView);
                    // this.view.renderTo(this.el);
                }
                else {
                    // load from view from viewsInfo
                    this.viewInfo = this.views[mode];
                    this.view = new Katrid.Forms.Views.registry[mode](Object.assign({
                        action: this,
                    }, this.viewInfo));
                    this.view.createElement();
                    if (mode === 'form')
                        await this.view.loadPendingViews();
                    // this.view.container = this.actionManager;
                    this.view.renderTo(this.container);
                    this._cachedViews[Object.getPrototypeOf(this.view).constructor.viewType] = this.view;
                    // this.el = this.view.actionView;
                }
                this.view.ready();
                if (this.view instanceof Katrid.Forms.RecordCollectionView) {
                    this.searchResultView = this.view;
                    this.lastUrl = location.hash;
                }
                if (this.element) {
                    // remove the old view from action-view element
                    if (this.element.children.length)
                        this.element.removeChild(this.element.children[0]);
                    // render the new view
                    this.view.renderTo(this.element);
                    // create the search view
                    if (!this.searchView && !(this.viewModes.length === 1 && this.viewModes[0] == 'form'))
                        this.createSearchView();
                    // set search view to current view
                    if (this.view instanceof Katrid.Forms.RecordCollectionView)
                        this.view.searchView = this.searchView;
                    if (oldView && (this.view !== oldView))
                        oldView.active = false;
                    this.view.active = true;
                }
                if (mode === 'form')
                    this.view.setState(Katrid.Data.DataSourceState.browsing);
                return this.view;
            }
            async render() {
                await super.render();
                if (this.viewMode)
                    await this.showView(this.viewMode);
            }
            createNew() {
                this.switchView('form', { id: null });
            }
            createViewsButtons(container) {
                for (let mode of this.viewModes) {
                    let cls = Katrid.Forms.Views.registry[mode];
                    if (cls)
                        cls.createViewModeButton(container);
                }
            }
            async deleteSelection(backToSearch) {
                let sel = this.getSelection();
                if (!sel)
                    return false;
                if (((sel.length === 1) && confirm(Katrid.i18n.gettext('Confirm delete record?'))) ||
                    ((sel.length > 1) && confirm(Katrid.i18n.gettext('Confirm delete records?')))) {
                    // destroy on database
                    await this.dataSource.delete(sel);
                    // return back to search view
                    if (backToSearch) {
                        // this.app.actionManager.backTo(-1);
                        this.dataSource.refresh();
                    }
                    else
                        // OR goto next record
                        this.dataSource.next();
                    // remove from records list
                    for (let rec of sel) {
                        let i = this.dataSource.findById(rec);
                        console.log(this.dataSource.records.indexOf(i));
                        this.dataSource.records.splice(this.dataSource.records.indexOf(i), 1);
                    }
                    this.scope.$apply();
                }
            }
            get selectionLength() {
                if (this.selection)
                    return this.selection.length;
            }
            async copyTo(configId) {
                // TODO test this method
                if (this.scope.recordId) {
                    let svc = new Katrid.Services.ModelService('ui.copy.to');
                    let res = await svc.rpc('copy_to', [configId, this.scope.recordId]);
                    let model = new Katrid.Services.ModelService(res.model);
                    let views = await model.getViewInfo({ view_type: 'form' });
                    let scope = this.scope.$new(true);
                    let wnd = new Katrid.Forms.Dialogs.Window({ scope, view: views, model, defaultValues: res.value });
                    // wnd.createNew();
                }
            }
            makeUrl(viewType) {
                return;
                // get the default view mode
                if (!viewType)
                    viewType = this.viewModes[0];
                let search = {};
                Object.assign(search, this.params);
                Object.assign(search, {
                    model: this.model.name,
                    view_type: viewType,
                    menu_id: Katrid.webApp.currentMenu.id,
                });
                if (this.config?.id)
                    search.action = this.config.id;
                if ((viewType === 'form') && this.record)
                    search.id = this.record.id;
                let url = new URLSearchParams(search);
                return '#/app/?' + url.toString();
            }
            async execute() {
                super.execute();
                this.container.innerHTML = '';
                if (this._cachedViews) {
                    this.render();
                }
                else if (!this.views) {
                    let res = await this.model.loadViews({
                        views: this.config.views,
                        action: this.config.id,
                        toolbar: true
                    });
                    this.fields = res.fields;
                    this.fieldList = res.fieldList;
                    this.views = res.views;
                    if (res.views.form) {
                    }
                }
            }
            changeUrl() {
            }
            get viewType() {
                return this._viewType;
            }
            set viewType(value) {
                if (value !== this._viewType) {
                    // invalidate the current record id
                    // if (value !== 'form')
                    //   this.dataSource.recordId = null;
                    // destroy children fields
                    // this.dataSource.destroyChildren();
                    this._viewType = value;
                    // this.app.$location.search('view_type', value);
                }
                return;
            }
            searchText(q) {
                // return this.location.search('q', q);
            }
            _prepareParams(params) {
                let r = {};
                for (let p of Array.from(params)) {
                    if (p.field && (p.field.type === 'ForeignKey')) {
                        r[p.field.name] = p.id;
                    }
                    else {
                        r[p.id.name + '__icontains'] = p.text;
                    }
                }
                return r;
            }
            async setSearchParams(params) {
                this.view.setSearchParams(params);
            }
            async applyGroups(groups, params) {
                let res = await this.dataSource.groupBy(groups, params);
                this.searchResultView.groupBy(res);
            }
            groupHeaderClick(record, index) {
                console.log('group header click', record);
                record.$expanded = !record.$expanded;
                if (record.$expanded) {
                    this.dataSource.expandGroup(index, record);
                }
                else {
                    this.dataSource.collapseGroup(index, record);
                }
            }
            async loadGroupRecords(group) {
                if (group.$count > 0) {
                    let res = await this.dataSource.model.search({ params: group.$params });
                    group.records = res.data;
                    console.log(group);
                    this.scope.$apply();
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
                        .then(function (res) {
                        let msg, result;
                        if (res.status === 'open') {
                        }
                    });
                }
            }
            async formButtonClick(id, meth) {
                try {
                    this.pendingOperation = true;
                    let res = await this.model.service.rpc(meth, [id], null, this);
                    await this._evalResponseAction(res);
                }
                finally {
                    this.pendingOperation = false;
                }
            }
            onActionLink(actionId, actionType, context) {
                let ctx = { active_id: this.view?.record?.id };
                if (context)
                    Object.assign(ctx, context);
                Object.assign(ctx, this.context);
                return Katrid.Services.Actions.onExecuteAction(actionId, actionType, ctx);
            }
            async _evalResponseAction(res) {
                if (res.tag === 'refresh')
                    this.view.refresh();
                else if (res.tag == 'new') {
                    // check if we need to invoke a nested action
                    if (res.action) {
                        let action = await Katrid.Actions.goto(res.action, { view_type: 'form' });
                        console.log('def values');
                        await action.view.insert(res.values);
                    }
                    else
                        this.view.datasource.insert(true, res.values);
                }
                else if (res.type) {
                    const act = new (Katrid.Actions.registry[res.type])(res, this.scope, this.scope.location);
                    return act.execute();
                }
            }
            doBindingAction(evt) {
                Katrid.Services.Actions.load($(evt.currentTarget).data('id'))
                    .then((action) => {
                    if (action.action_type === 'ui.action.report')
                        Katrid.Actions.ReportAction.dispatchBindingAction(this, action);
                });
            }
            listRowClick(index, row, evt) {
                if (row.$hasChildren) {
                    this.groupHeaderClick(row, index);
                }
                else {
                    let search = {
                        id: row.id,
                        action: this.config.id,
                        model: this.config.model,
                        view_type: 'form',
                        menu_id: Katrid.webApp.currentMenu.id,
                    };
                    console.log(this.app.$location.$$search);
                    if (evt && evt.ctrlKey) {
                        const url = '#/app/?' + $.param(search);
                        window.open(url);
                        return;
                    }
                    else
                        Katrid.app.loadPage('#/app/?' + $.param(search), false);
                    this.dataSource.recordIndex = index;
                }
            }
            get recordIndex() {
                return this._recordIndex;
            }
            set recordIndex(value) {
                this._recordIndex = value;
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
                    .then(function (res) {
                    if (res.ok && res.result.open) {
                        return window.open(res.result.open);
                    }
                });
            }
            get selection() {
                return this.view.selection;
            }
            getSelection() {
                if (this.viewType === 'form') {
                    if (this.view.vm.recordId)
                        return [this.view.vm.recordId];
                    else
                        return;
                }
                if (this.view.vm.selection && this.view.vm.selection.length)
                    return this.view.vm.selection.map((obj) => obj.id);
            }
            set attachments(value) {
                this.scope.$apply(() => this.scope.attachments = value);
            }
            deleteAttachment(attachments, index) {
                let att = attachments[index];
                if (confirm(Katrid.i18n.gettext('Confirm delete attachment?'))) {
                    attachments.splice(index, 1);
                    Katrid.Services.Attachments.delete(att.id);
                }
            }
            markStar(record) {
                // TODO mark as favorite
            }
            filterByField(field, value) {
                this.searchView.clear();
                this.addFilter(field, value);
            }
            addFilter(field, value) {
                let f = this.view.fields[field];
                this.searchView.controller.addCustomFilter(f, value);
            }
            static async fromModel(model) {
                let svc = new Katrid.Services.ModelService(model);
                let res = await svc.loadViews({ form: null });
                return new WindowAction({ model: svc, info: { view_mode: 'form', view_type: 'form' } });
            }
            canBackToSearch() {
                return this.viewModes.length > 1;
            }
            createBreadcrumbItem(ol, index) {
                if ((this.viewMode === 'form') && this.canBackToSearch && (index === 0)) {
                    let li = document.createElement('li');
                    li.classList.add('breadcrumb-item');
                    console.log('create back link', super.getDisplayText());
                    li.append(this.createBackItemLink(super.getDisplayText(), true, `back(${index}, 'list')`));
                    ol.append(li);
                }
                if ((this.viewMode === 'form') && (index < (this.actionManager.actions.length - 1))) {
                    let li = document.createElement('li');
                    li.classList.add('breadcrumb-item');
                    li.append(this.createBackItemLink(this.view.vm.record?.$str, false, `back(${index}, '${this.viewMode}')`));
                    ol.append(li);
                }
                if (index === (this.actionManager.actions.length - 1))
                    super.createBreadcrumbItem(ol, index);
            }
            back(index, mode) {
                if (index === this.index) {
                    if (this.viewMode !== mode)
                        this.showView(mode);
                }
                else {
                    let action = this.actionManager.actions[index];
                    this.actionManager.back(action);
                    this.actionManager.append(action.element);
                    if (mode && (action instanceof WindowAction) && (mode !== action.viewMode))
                        action.showView(mode);
                }
            }
            get index() {
                return this.actionManager.actions.indexOf(this);
            }
        }
        WindowAction.actionType = 'ui.action.window';
        Actions.WindowAction = WindowAction;
        Katrid.Actions.registry[WindowAction.actionType] = WindowAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    let ComponentState;
    (function (ComponentState) {
        ComponentState[ComponentState["Loading"] = 0] = "Loading";
        ComponentState[ComponentState["Loaded"] = 1] = "Loaded";
    })(ComponentState = Katrid.ComponentState || (Katrid.ComponentState = {}));
    class WebComponent extends HTMLElement {
        constructor() {
            super(...arguments);
            this._created = false;
        }
        connectedCallback() {
            if (!this._created) {
                this._created = true;
                this.create();
            }
        }
        create() {
        }
    }
    Katrid.WebComponent = WebComponent;
})(Katrid || (Katrid = {}));
/// <reference path="../core/components.ts"/>
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        /** Represents the navigation element */
        class ActionNavbar extends Katrid.WebComponent {
            create() {
                super.create();
                this.className = 'breadcrumb-nav';
            }
            get actionManager() {
                return this._actionManager;
            }
            set actionManager(value) {
                this._actionManager = value;
                this.render();
            }
            render() {
                this.innerHTML = '';
                let nav = document.createElement('nav');
                nav.setAttribute('aria-label', 'breadcrumb');
                let ol = document.createElement('ol');
                ol.className = 'breadcrumb';
                this._actionManager.actions.forEach((action, index) => action.createBreadcrumbItem(ol, index));
                nav.append(ol);
                this.append(nav);
            }
        }
        Actions.ActionNavbar = ActionNavbar;
        Katrid.define('action-navbar', ActionNavbar);
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
/// <reference path="actions.ts"/>
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class ReportAction extends Katrid.Actions.Action {
            constructor(info, scope, location) {
                super(info);
                this.fields = [];
                this.templateUrl = 'view.report.jinja2';
                this.userReport = {};
            }
            static async dispatchBindingAction(parent, action) {
                let format = localStorage.katridReportViewer || 'pdf';
                let sel = parent.selection;
                if (sel)
                    sel = sel.join(',');
                let params = { data: [{ name: 'id', value: sel }] };
                let svc = new Katrid.Services.ModelService('ui.action.report');
                let res = await svc.post('export_report', { args: [action.id], kwargs: { format, params } });
                if (res.open)
                    return window.open(res.open);
            }
            get name() {
                return this.config.info.name;
            }
            userReportChanged(report) {
                return this.location.search({
                    user_report: report
                });
            }
            async onHashChange(params) {
                console.log('report hash change', params);
                this.userReport.id = params.user_report;
                if (this.userReport.id) {
                    let svc = new Katrid.Services.ModelService('ui.action.report');
                    let res = await svc.post('load_user_report', { kwargs: { user_report: this.userReport.id } });
                    this.userReport.params = res.result;
                }
                else {
                    // Katrid.core.setContent(, this.scope);
                }
                location.hash = '#/app/?' + $.param(params);
                this.renderParams();
            }
            async debug() {
                this.renderParams();
            }
            renderParams() {
                let templ = Katrid.html(Katrid.Reports.renderDialog(this));
                this.vm = this.createVm(templ);
                $(Katrid.webApp.element).empty().append(templ);
            }
            createVm(el) {
                let self = this;
                this.report = new Katrid.Reports.Report(self);
                this.report.loadFromXml(self.config.info.content);
                this.report.render(el);
                this.report.loadParams();
                let vm = Katrid.createVm({
                    data() {
                        return {
                            userReport: this.userReport || {},
                            userReports: [],
                            report: self.report,
                            customizableReport: this.customizableReport,
                            advancedOptions: this.advancedOptions,
                        };
                    },
                    mounted() {
                        this.$report = self.report;
                    },
                    methods: {
                        exportReport(fmt) {
                        }
                    },
                    components: Katrid.componentsRegistry,
                    directives: Katrid.directivesRegistry,
                });
                vm.mount(el);
                console.log('render report dialog');
                return vm;
            }
        }
        ReportAction.actionType = 'ui.action.report';
        Actions.ReportAction = ReportAction;
        Katrid.Actions.registry[ReportAction.actionType] = ReportAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class ViewAction extends Actions.Action {
            // template: string;
            constructor(config) {
                super(config);
                if (config.info?.template) {
                    // this.template = config.info.template;
                    this.view = new Katrid.Forms.BaseView({ template: config.info.template });
                }
            }
            async onHashChange(params) {
                return;
                location.hash = '#/app/?' + $.param(params);
                let content, viewType;
                if (this.config.content) {
                    content = this.config.content;
                }
                else {
                    let svc = new Katrid.Services.ModelService('ui.action.view');
                    let res = await svc.post('get_view', { args: [this.config.view.id] });
                    content = res.content;
                    viewType = res.type;
                }
                // check if content is json
                if (content.startsWith('{')) {
                    if (viewType === 'dashboard') {
                        let dashboard = document.createElement('dashboard-view');
                        Katrid.app.element.innerHTML = '';
                        Katrid.app.element.append(dashboard);
                        dashboard.load(JSON.parse(content));
                    }
                }
                else {
                }
            }
            async render() {
                await super.render();
                if (this.element)
                    this.view.renderTo(this.element);
            }
        }
        ViewAction.actionType = 'ui.action.view';
        Actions.ViewAction = ViewAction;
        Actions.registry[ViewAction.actionType] = ViewAction;
        Actions.registry['ViewAction'] = ViewAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        var Portlets;
        (function (Portlets) {
            class HomepageEditor extends Katrid.Actions.HomepageElement {
                createPanel() {
                    let el = super.createPanel();
                    el.editing = true;
                    return el;
                }
                create() {
                    let btnSave = document.createElement('button');
                    btnSave.classList.add('btn', 'btn-primary');
                    btnSave.innerText = Katrid.i18n.gettext('Save');
                    let btnDiscard = document.createElement('button');
                    btnDiscard.classList.add('btn', 'btn-secondary');
                    btnDiscard.innerText = Katrid.i18n.gettext('Discard');
                    btnSave.addEventListener('click', () => this.save());
                    btnDiscard.addEventListener('click', () => this.back());
                    this.append(btnSave);
                    this.append(btnDiscard);
                }
                edit() {
                    throw Error('Editor already loaded');
                }
                dump() {
                    let res = [];
                    this.querySelectorAll('portlet-panel').forEach(el => res.push(el.dump()));
                    return { panels: res };
                }
                async save() {
                    // save user custom layout to the server
                    let svc = new Katrid.Services.ModelService('ui.action.homepage');
                    let data = this.dump();
                    await svc.rpc('save_layout', [[this.actionId], JSON.stringify(data)]);
                    let home = this._back();
                    home.actionId = this.actionId;
                    home.load(data);
                    this.parentElement.append(home);
                    this.remove();
                }
                _back() {
                    return document.createElement('homepage-view');
                }
                back() {
                    let home = this._back();
                    if (this.info)
                        home.load(this.info);
                    this.parentElement.append(home);
                    this.remove();
                }
                render() {
                    if (!this.panels || !this.panels.length)
                        this.panels = [{ caption: '', portlets: [] }];
                    super.render();
                }
            }
            Portlets.HomepageEditor = HomepageEditor;
            Katrid.define('homepage-editor', HomepageEditor);
        })(Portlets = Actions.Portlets || (Actions.Portlets = {}));
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        var Portlets;
        (function (Portlets) {
            let registry = {};
            class PortletPanel extends HTMLElement {
                constructor() {
                    super(...arguments);
                    this.caption = '';
                    this.editing = false;
                    this.portlets = [];
                }
                connectedCallback() {
                    this.classList.add('portlet-panel', 'col-12');
                    if (this.editing)
                        this.classList.add('editing');
                    this.render();
                }
                render() {
                    let container = document.createElement('div');
                    container.classList.add('col-12');
                    let legend = document.createElement('h5');
                    legend.innerText = this.caption;
                    container.append(legend);
                    this.append(container);
                    if (this.editing) {
                        this.renderEditor(container);
                    }
                    if (this.info)
                        for (let child of this.info.portlets)
                            this.addPortlet(child).render();
                }
                async renderEditor(container) {
                    let svc = new Katrid.Services.ModelService('ui.portlet');
                    this.availableItems = [];
                    let res = await svc.rpc('search_portlets');
                    let portlets = res.portlets;
                    let toolbar = document.createElement('div');
                    toolbar.classList.add('toolbar');
                    let sel = document.createElement('select');
                    sel.classList.add('form-control');
                    portlets.forEach((port, index) => {
                        this.availableItems[port.id] = port;
                        let option = document.createElement('option');
                        option.value = port.id;
                        option.innerText = port.name;
                        sel.append(option);
                    });
                    let btn = document.createElement('button');
                    btn.innerText = Katrid.i18n.gettext('Add');
                    btn.classList.add('btn', 'btn-outline-secondary');
                    toolbar.append(sel);
                    toolbar.append(btn);
                    toolbar.querySelector('button').addEventListener('click', evt => this.addPortletClick(evt.target));
                    container.append(toolbar);
                    return toolbar;
                }
                dump() {
                    return {
                        caption: this.caption,
                        portlets: this.portlets.map(port => port.dump()),
                    };
                }
                load(info) {
                    if (info.caption)
                        this.caption = info.caption;
                    this.info = info;
                }
                addPortlet(info) {
                    let el;
                    if (this.editing) {
                        el = document.createElement('portlet-editor');
                        el.load(info);
                        this.portlets.push(el.el);
                        this.append(el);
                        el.panel = this;
                        el.render();
                    }
                    else {
                        el = document.createElement(info.tag);
                        el.load(info);
                        this.portlets.push(el);
                        let div = document.createElement('div');
                        div.classList.add('portlet-wrapper', 'col-1');
                        div.append(el);
                        this.append(div);
                    }
                    return el;
                }
                addPortletClick(sender) {
                    let sel = sender.parentElement.querySelector('select');
                    let info = this.availableItems[parseInt(sel.value)];
                    let tagName = info.tag;
                    let portlet = { tag: tagName, name: info.name };
                    if (info.info) {
                        if (typeof info.info === "string")
                            info.info = JSON.parse(info.info);
                        Object.assign(portlet, info.info);
                    }
                    this.addPortlet(portlet);
                }
            }
            Portlets.PortletPanel = PortletPanel;
            class PortletEditor extends HTMLElement {
                connectedCallback() {
                    this.create();
                    this.render();
                }
                create() {
                    this.classList.add('portlet-editor', 'col-1');
                }
                load(info) {
                    this.info = info;
                    this.el = document.createElement(info.tag);
                    this.el.editing = true;
                    this.el.load(info);
                    this.el.render();
                }
                render() {
                    this.append(this.el);
                    let div = document.createElement('div');
                    div.classList.add('mirror');
                    this.append(div);
                    console.log('render');
                    if (this.el.editing)
                        this.addEventListener('click', () => this.removePortlet());
                    // this.el.render();
                }
                removePortlet() {
                    let i = this.panel.portlets.indexOf(this.el);
                    console.log(i, this.panel);
                    if (i > -1)
                        this.panel.portlets.splice(i, 1);
                    this.remove();
                }
            }
            Portlets.PortletEditor = PortletEditor;
            class Portlet extends HTMLElement {
                constructor() {
                    super(...arguments);
                    this.editing = false;
                    this.info = {};
                    this.loaded = false;
                }
                connectedCallback() {
                    this.create();
                }
                create() {
                    this.classList.add('portlet');
                }
                dump() {
                    return {};
                }
                load(info) {
                    this.info = info;
                }
                render(container) {
                    if (!container)
                        container = this;
                    let title = document.createElement('h6');
                    title.innerText = Katrid.i18n.gettext(this.info.name);
                    container.append(title);
                }
            }
            Portlets.Portlet = Portlet;
            class CreateNew extends Portlet {
                create() {
                    super.create();
                    this.classList.add('portlet-create-new');
                }
                dump() {
                    return {
                        tag: this.tagName.toLowerCase(),
                        model: this.model,
                        action: this.action,
                    };
                }
                load(info) {
                    super.load(info);
                    this.model = info.model;
                    this.action = info.action;
                }
            }
            Portlets.CreateNew = CreateNew;
            class PortletModelWindowAction extends Portlet {
                render() {
                    super.render();
                    let href = Katrid.webApp.formatActionHref(this.info.action);
                    let btnNew = document.createElement('a');
                    btnNew.innerText = Katrid.i18n.gettext('Create');
                    btnNew.classList.add('btn', 'btn-link');
                    console.log('acton', this.info);
                    btnNew.href = href + '&view_type=form';
                    let btnSearch = document.createElement('a');
                    btnSearch.innerText = Katrid.i18n.gettext('Search');
                    btnSearch.classList.add('btn', 'btn-link');
                    btnSearch.href = href;
                    this.append(btnNew);
                    this.append(btnSearch);
                }
                dump() {
                    return {
                        tag: this.tagName.toLowerCase(),
                        name: this.info.name,
                        model: this.model,
                        action: this.action,
                        info: this.info.info,
                    };
                }
                load(info) {
                    super.load(info);
                    this.action = info.action;
                    this.model = info.model;
                }
            }
            Portlets.PortletModelWindowAction = PortletModelWindowAction;
            class GotoList extends Portlet {
                create() {
                    super.create();
                    this.classList.add('portlet-goto-list');
                }
                dump() {
                    return {
                        tag: this.tagName.toLowerCase(),
                        action: this.action,
                        viewType: this.viewType,
                    };
                }
                render() {
                    let title = document.createElement('h6');
                    title.innerText = 'Goto List';
                }
            }
            Portlets.GotoList = GotoList;
            class GotoReport extends Portlet {
                create() {
                    super.create();
                    this.classList.add('portlet-goto-report');
                }
                load(info) {
                    super.load(info);
                    this.action = info.action;
                    this.model = info.model;
                }
                dump() {
                    return {
                        tag: this.tagName.toLowerCase(),
                        name: this.info.name,
                        model: this.model,
                        action: this.action,
                        info: this.info.info,
                    };
                }
                render() {
                    let a = document.createElement('a');
                    a.classList.add('full-size');
                    super.render(a);
                    a.href = Katrid.webApp.formatActionHref(this.action);
                    this.append(a);
                }
            }
            Portlets.GotoReport = GotoReport;
            Katrid.define('portlet-create-new', CreateNew);
            Katrid.define('portlet-panel', PortletPanel);
            Katrid.define('portlet-editor', PortletEditor);
            Katrid.define('portlet-model-window-action', PortletModelWindowAction);
            Katrid.define('portlet-goto-list', GotoList);
            Katrid.define('portlet-goto-report', GotoReport);
        })(Portlets = Actions.Portlets || (Actions.Portlets = {}));
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        function newPlot(el, data, layout, config) {
            // create new plotly plot
            if (!layout)
                layout = {};
            if (!('hovermode' in layout))
                layout['hovermode'] = 'closest';
            // define the default layout separator
            if (!layout.separators)
                layout.separators = Katrid.i18n.formats.DECIMAL_SEPARATOR + Katrid.i18n.formats.THOUSAND_SEPARATOR;
            // if (!layout.colorway)
            //   layout.colorway = [
            //     '#86AED1', '#FF99A9', '#A1DE93',
            //     '#CAC3F7', '#FEE0CC', '#F47C7C', '#88CEFB', '#FBB4C9', '#AFF1F1', '#8DD1F1', '#B3C8C8', '#FCE2C2',
            //     '#6CB2D1', '#b3c8c8', '#f3cec9', '#64E987', '#cd7eaf', '#a262a9', '#6f4d96', '#4F9EC4', '#3d3b72', '#182844'
            //   ];
            if (!config)
                config = {};
            if (!('responsive' in config))
                config['responsive'] = true;
            return Plotly.newPlot(el, data, layout, config);
        }
        BI.newPlot = newPlot;
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Core;
    (function (Core) {
        class Application {
            constructor(config) {
                this.config = config;
                this.plugins = [];
                Katrid.app = this;
                // setup the adapter
                if (config.adapter)
                    Katrid.Services.Service.adapter = config.adapter;
                else
                    Katrid.Services.Service.adapter = new Katrid.Services.FetchAdapter();
                if (config.el)
                    this.rootElement = config.el;
                else
                    this.element = document.querySelector('#action-manager');
                this.title = config.title || 'Open Runtime';
                Katrid.init();
                this.userInfo = config.userInfo;
                for (let plug of Katrid.Core.plugins)
                    this.plugins.push(new plug(this));
            }
            get context() {
                return;
            }
            /** User information */
            get userInfo() {
                return this._userInfo;
            }
            set userInfo(value) {
                this._userInfo = value;
                this.setUserInfo(value);
            }
            setUserInfo(userInfo) {
            }
            searchParams() {
                return new URLSearchParams(window.location.hash);
            }
            appReady() {
                document.body.append($(`<div id="loading-msg" class="animated fadeIn">\n  <span>${Katrid.i18n.gettext('Loading...')}</span>\n</div>\n`)[0]);
                document.body.append($(`<div id="overlay" class="animated fadeIn text-center">\n  <i class="fa-4x fas fa-circle-notch fa-spin"></i>\n  <h3 class="margin-top-16">\n    ${Katrid.i18n.gettext('Loading...')}\n  </h3>\n</div>`)[0]);
                let loadingTimeout, overlayTimeout;
                let loadingMsg = $('#loading-msg').hide();
                let overlay = $('#overlay').hide();
                document.addEventListener('ajax.start', (evt) => {
                    clearTimeout(loadingTimeout);
                    clearTimeout(overlayTimeout);
                    loadingTimeout = setTimeout(() => loadingMsg.show(), 400);
                    overlayTimeout = setTimeout(() => {
                        loadingMsg.hide();
                        overlay.show();
                    }, 4000);
                });
                document.addEventListener('ajax.stop', () => {
                    clearTimeout(loadingTimeout);
                    clearTimeout(overlayTimeout);
                    loadingMsg.hide();
                    overlay.hide();
                });
                // TODO replace jquery ajax by fetch api
                $(document).ajaxStart(function () {
                    loadingTimeout = setTimeout(() => loadingMsg.show(), 400);
                    overlayTimeout = setTimeout(() => {
                        loadingMsg.hide();
                        overlay.show();
                    }, 2500);
                })
                    .ajaxStop(function () {
                    clearTimeout(loadingTimeout);
                    clearTimeout(overlayTimeout);
                    loadingMsg.hide();
                    overlay.hide();
                });
            }
            async loadPage(hash, reset = true) {
            }
        }
        Core.Application = Application;
        class WebApplication extends Application {
            constructor(config) {
                super(config);
                Katrid.webApp = this;
                this.render();
                this.appReady();
                let _hash;
                window.addEventListener('popstate', event => {
                    this.loadPage(location.hash, (event.state === null) || (event.state?.clear));
                });
            }
            get actionManager() {
                return this._actionManager;
            }
            render() {
                let appHeader = document.createElement('app-header');
                appHeader.id = 'app-header';
                appHeader.classList.add('navbar', 'navbar-expand-lg', 'navbar-dark', 'bg-primary', 'bg-gradient', 'flex-row');
                appHeader.innerHTML = `<div class="dropdown dropdown-apps">
        <a id="apps-button" class="header-link" data-bs-toggle="dropdown">
          <i class="fa fa-th"></i>
        </a>
        <div class="dropdown-menu apps-menu">
        </div>
      </div>
      <nav class="navbar no-padding">
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-target="#navbar"
                aria-controls="navbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
      </nav>
      <div id="navbar-menu" class="mr-auto"></div>
      <div id="navbar" class="collapse navbar-collapse navbar-tools">
        <div class="navbar-search">
          <i class="fa fw fa-search"></i>
          <input id="navbar-search" type="search" class="form-control form-control-dark typeahead" spellcheck="false" autocomplete="off"
                 placeholder="${Katrid.i18n.gettext('Find resources here...')}">
        </div>
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="dropdown-toggle nav-link" href="javascript:void(0);" data-action="messages"
               title="View notifications"
               data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i class="fa fa-bell"></i>
              <!--
              <span class="label label-warning label-menu-corner">32</span>
              -->
            </a>
            <ul class="dropdown-menu dropdown-notifications-menu">
            </ul>

          </li>
          <li class="nav-item d-none d-sm-block">
            <a class="nav-link" href="#/query-viewer/" title="${Katrid.i18n.gettext('Query Viewer')}">
              <i class="fa fa-fw fa-database"></i>
            </a>
          </li>
          <li class="nav-item d-none d-sm-block">
            <a class="nav-link" href="javascript:void(0);" data-action="fullScreen" title="Full Screen"
               onclick="Katrid.UI.toggleFullScreen()">
              <i class="fa fa-arrows-alt"></i>
            </a>
          </li>
          <li class="nav-item user-menu dropdown">
            <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">
              <img class="user-avatar" src="/static/admin/assets/img/avatar.png"> <span/>
            </a>
            <div class="dropdown-menu dropdown-menu-end">
              <a class="dropdown-item"><i class="fa fa-fw"></i> ${Katrid.i18n.gettext('Preferences')}</a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item" href="/web/logout/"><i class="fa fa-lg fa-fw fa-sign-out-alt"></i> ${Katrid.i18n.gettext('Logout')}</a>
            </div>
          </li>
        </ul>
      </div>`;
                this.rootElement.append(appHeader);
                let mainContent = document.createElement('div');
                mainContent.className = 'main-content';
                mainContent.setAttribute('role', 'main');
                let actionManager = document.createElement('action-manager');
                actionManager.id = 'action-manager';
                actionManager.className = 'action-manager';
                this.element = actionManager;
                mainContent.append(actionManager);
                this.rootElement.append(mainContent);
                this._actionManager = actionManager;
            }
            appReady() {
                $(() => {
                    super.appReady();
                    if (location.hash === '') {
                        let a = document.querySelector('a.module-selector:first-child');
                        if (a)
                            a.click();
                    }
                    else
                        this.loadPage(location.hash);
                });
            }
            formatActionHref(actionId) {
                return `#/app/?menu_id=${this.currentMenu.id}&action=${actionId}`;
            }
            get currentMenu() {
                return this._currentMenu;
            }
            set currentMenu(value) {
                this._currentMenu = value;
                if (value) {
                    // $('#current-module h3').text(value.name);
                    $(`app-header > .dropdown[data-menu-id]`).hide();
                    $(`app-header > .dropdown[data-menu-id="${value.id}"]`).show();
                    $(`app-header .navbar-menu-group[data-parent-id]`).hide();
                    $(`app-header .navbar-menu-group[data-parent-id="${value.id}"]`).show();
                }
            }
            setUserInfo(value) {
                if (value) {
                    let userMenu = document.querySelector('.user-menu');
                    if (userMenu) {
                        userMenu.querySelector('a.nav-link span').innerText = value.name;
                        if (value.avatar)
                            userMenu.querySelector('.user-avatar').src = value.avatar;
                    }
                }
            }
            async loadPage(hash, reset = true) {
                this.$search = this.searchParams();
                let url = hash;
                if (hash.indexOf('?') > -1) {
                    url = hash.substring(0, hash.indexOf('?'));
                    hash = hash.substring(hash.indexOf('?') + 1, hash.length);
                }
                let _hash = new URLSearchParams(hash);
                let params = {};
                for (let [k, v] of _hash.entries())
                    params[k] = v;
                if (!this.currentMenu || (params.menu_id && (this.currentMenu.id != params.menu_id))) {
                    this.currentMenu = {
                        id: params.menu_id,
                        name: $(`.module-selector[data-menu-id="${params.menu_id}"]`).text()
                    };
                }
                if (url.startsWith('#/action/')) {
                    // direct action execution
                    let res = await Katrid.Services.Service.$fetch('/web' + url.substring(1, url.length), null, null).then(res => res.json());
                    await this.actionManager.execAction(res);
                }
                else if (('action' in params) || ('model' in params))
                    await this.actionManager.onHashChange(params, reset);
                else if ((!('action' in params)) && ('menu_id' in params)) {
                    // find first visible action
                    console.log('goto to 1st action', params.menu_id);
                    let actionItem = document.querySelector('app-header .navbar-menu-group[data-parent-id="' + params.menu_id + '"] .menu-item-action[href]');
                    if (actionItem) {
                        let child = actionItem.parentElement.querySelector('a.dropdown-item[href]');
                        if (child) {
                            let href = child.getAttribute('href');
                            history.replaceState(null, null, href);
                            this.loadPage(href);
                        }
                    }
                }
                if (url.startsWith('#/app/debug/run/')) {
                    this.debug(params);
                }
                for (let plugin of this.plugins) {
                    if (plugin.hashChange(hash))
                        break;
                }
            }
            async debug(info) {
                let res = await Katrid.Services.Service.$post('/webide/file/debug/', info);
                this.actionManager.debug(res);
            }
            search(params) {
                this.$location.search(params);
                window.location.href = '#' + this.$location.$$url;
            }
            changeUrl(paramName, paramValue) {
                this.$location.$$search[paramName] = paramValue;
                history.replaceState(null, null, '#/app/?' + $.param(this.$location.$$search));
            }
            get context() {
                return this.actionManager.context;
            }
        }
        Core.WebApplication = WebApplication;
    })(Core = Katrid.Core || (Katrid.Core = {}));
})(Katrid || (Katrid = {}));
(function (Katrid) {
    window.addEventListener('onunhandledrejection', function (e) {
        console.log('intercept error', e);
    }, true);
})(Katrid || (Katrid = {}));
/// <reference path="app.ts"/>
var Katrid;
(function (Katrid) {
    var Core;
    (function (Core) {
        class Plugin {
            constructor(app) {
                this.app = app;
            }
            hashChange(url) {
                return false;
            }
        }
        Core.Plugin = Plugin;
        class Plugins extends Array {
            start(app) {
                for (let plugin of this)
                    app.plugins.push(new plugin(app));
            }
        }
        Core.plugins = new Plugins();
        function registerPlugin(cls) {
            Core.plugins.push(cls);
        }
        Core.registerPlugin = registerPlugin;
    })(Core = Katrid.Core || (Katrid.Core = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../core/plugin.ts"/>
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        let QueryEditorPlugin = class QueryEditorPlugin extends Katrid.Core.Plugin {
            hashChange(url) {
                if (url.startsWith('#/query-viewer/')) {
                    this.execute();
                    return true;
                }
            }
            async execute() {
                let queryViewer = document.createElement('query-viewer');
                queryViewer.className = 'content-container';
                this.app.element.innerHTML = '';
                this.app.element.append(queryViewer);
            }
        };
        QueryEditorPlugin = __decorate([
            Katrid.Core.registerPlugin
        ], QueryEditorPlugin);
        class QueryManager {
            constructor(app) {
                this.app = app;
                this.app = app;
                // this.$scope = app.$scope.$new();
                this.$scope.queryChange = (query) => this.queryChange(query);
                this.$scope.search = {};
                let me = this;
                this.action = this.$scope.action = {
                    context: {},
                    views: {},
                    async saveSearch(search) {
                        let svc = new Katrid.Services.ModelService('ui.filter');
                        let data = {};
                        Object.assign(data, search);
                        data.query = me.$scope.query.id;
                        if (search.name === null) {
                            search.name = prompt('Query name', 'current query namne');
                            search.is_default = false;
                            search.is_shared = true;
                        }
                        if (search.name)
                            await svc.write([data]);
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
                return { content: s, fields };
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
                // let el = this.app.getTemplate('query.manager.search.jinja2');
                // el = Katrid.Core.$compile(el)(this.$scope);
                // this.$element.find('#query-search-view').html(el);
            }
            async render() {
                let templ = document.createElement('query-editor');
                templ = Katrid.Core.$compile(templ)(this.$scope);
                this.$element = templ;
                let queries = await Katrid.Services.Query.all();
                this.$scope.queries = queries.data;
                console.log('render result');
                // this.app.$element.html(templ);
                this.$scope.$apply();
            }
            renderTable(data) {
                // let templ = this.app.getTemplate('query.manager.table.jinja2', {
                //   self: this, query: this.$scope.query, records: this.records, fields: Object.values(this.fields),
                // });
                // templ = Katrid.Core.$compile(templ)(this.$scope);
                // initColumn(templ);
                // this.$element.find('#query-manager-result').html(templ);
            }
        }
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
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class BaseView {
            constructor(config) {
                this.config = config;
                this.dialog = false;
                this.create(config);
                if (this.container)
                    this.render();
            }
            create(info) {
                if (info?.template instanceof HTMLTemplateElement)
                    this.template = info.template;
                else if (typeof info?.template === 'string')
                    this.html = info.template;
                else if (typeof info?.info?.template === 'string')
                    this.html = info.info.template;
                if (info?.container)
                    this.container = info.container;
            }
            _applyDataDefinition(data) {
                if (this._readyEventListeners)
                    for (let def of this._readyEventListeners)
                        if (def.data)
                            Object.assign(data, def.data);
                return data;
            }
            getComponentData() {
                let data = {
                    data: null,
                };
                this._applyDataDefinition(data);
                return data;
            }
            createComponent() {
                let me = this;
                let computed = {};
                if (this.parentVm)
                    computed = {
                        parent() {
                            console.log('get parrent', me.parentVm);
                            return me.parentVm;
                        }
                    };
                return {
                    data() {
                        return me.getComponentData();
                    },
                    methods: {},
                    computed,
                    created() {
                        // load `created` event listeners
                        for (let def of me._readyEventListeners)
                            if (def.created)
                                def.created.call(this);
                    },
                };
            }
            cloneTemplate() {
                let templ, el;
                if (this.template) {
                    templ = this.template;
                }
                else {
                    el = templ = Katrid.html(this.html);
                }
                if (templ instanceof HTMLTemplateElement) {
                    templ = templ.content;
                    el = templ.firstElementChild.cloneNode(true);
                }
                this.scripts = [];
                for (let script of templ.querySelectorAll('script')) {
                    this.scripts.push(script.text);
                    script.parentNode.removeChild(script);
                }
                return el;
            }
            domTemplate() {
                let templ = this.cloneTemplate();
                return templ;
            }
            createDialogButtons(buttons) {
                const defButtons = {
                    close: {
                        dismiss: 'modal',
                        text: Katrid.i18n.gettext('Close'),
                    },
                    ok: {
                        dismiss: 'modal',
                        text: Katrid.i18n.gettext('OK'),
                        modalResult: true,
                    },
                    cancel: {
                        dismiss: 'modal',
                        text: Katrid.i18n.gettext('Cancel'),
                        modalResult: false,
                    },
                };
                let res = [];
                for (let b of buttons) {
                    if (Katrid.isString(b))
                        b = defButtons[b];
                    let btn = document.createElement('button');
                    btn.type = 'button';
                    btn.innerText = b.text;
                    if (b.modalResult)
                        btn.setAttribute('v-on:click', '$result = ' + b.modalResult.toString());
                    else if (b.click)
                        btn.setAttribute('v-on:click', b.click);
                    if (b.dismiss)
                        btn.setAttribute('data-bs-dismiss', b.dismiss);
                    if (b.class)
                        btn.className = b.class;
                    else
                        btn.className = 'btn btn-outline-secondary';
                    res.push(btn);
                }
                return res;
            }
            createDialog(content, buttons = ['close']) {
                let templ = Katrid.html(`
    <div class="modal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-dialog-scrollable modal-xl" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ title }}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body data-form data-panel">
               
            <div class="clearfix"></div>
          </div>
          <div class="modal-footer">
<!--buttons-->
          </div>
        </div>
      </div>
    </div>
      `);
                templ.querySelector('.modal-body').append(content);
                let footer = templ.querySelector('.modal-footer');
                for (let b of this.createDialogButtons(buttons))
                    footer.append(b);
                return templ;
            }
            createVm(el) {
                let component = this.createComponent();
                if (this.scripts) {
                    this._readyEventListeners = [];
                    for (let script of this.scripts) {
                        let setup = eval(`(${script})`);
                        if (setup && setup.call) {
                            let def = setup.call(this);
                            if (def.methods)
                                Object.assign(component.methods, def.methods);
                            if (def.ready || def.created || def.data)
                                this._readyEventListeners.push(def);
                        }
                    }
                }
                let vm = Katrid.createVm(component).mount(el);
                this.vm = vm;
                // let vForm = el.querySelector('.v-form') as any;
                return vm;
            }
            beforeRender(templ) {
                return templ;
            }
            createElement() {
                if (!this.element) {
                    this.element = this.beforeRender(this.domTemplate());
                    this.applyCustomTags(this.element);
                }
            }
            applyCustomTags(template) {
                Katrid.Forms.CustomTag.render(this, template);
            }
            render() {
                this.createElement();
                if (!this.vm)
                    this.createVm(this.element);
                if (this.container) {
                    this.container.append(this.element);
                    // dispatch ready event listeners
                    if (this._readyEventListeners) {
                        for (let event of this._readyEventListeners)
                            if (event.ready)
                                event.ready.call(this.vm, this);
                    }
                }
                return this.element;
            }
            closeDialog() {
                this._modal.hide();
            }
            /** Render the view content into a container */
            renderTo(container) {
                this.container = container;
                this.render();
            }
            async onHashChange(params) {
            }
        }
        Forms.BaseView = BaseView;
        function compileButtons(container) {
            let sendFileCounter = 0;
            return container.querySelectorAll('button').forEach((btn, index) => {
                let $btn = $(btn);
                let type = $btn.attr('type');
                if (!$btn.attr('type') || ($btn.attr('type') === 'object'))
                    $btn.attr('type', 'button');
                if (type === 'object') {
                    let sendFile = $btn.attr('send-file');
                    $btn.attr('button-object', $btn.attr('name'));
                    if (sendFile === undefined) {
                        $btn.attr('v-on:click', `actionClick(selection, '${$btn.attr('name')}', $event)`);
                    }
                    else {
                        let idSendFile = `__send_file_${++sendFileCounter}`;
                        $btn.parent().append(`<input id="${idSendFile}" type="file" style="display: none" v-on:change="sendFile('${$btn.attr('name')}', $event.target)"/>`);
                        $btn.attr('send-file', $btn.attr('name'));
                        $btn.attr('onclick', `$('#${idSendFile}').trigger('click')`);
                    }
                }
                else if (type === 'tag') {
                    $btn.attr('button-tag', $btn.attr('name'));
                    $btn.attr('onclick', `Katrid.Actions.ClientAction.tagButtonClick($(this))`);
                }
                if (!$btn.attr('class'))
                    $btn.addClass('btn btn-outline-secondary');
            });
        }
        Forms.compileButtons = compileButtons;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        Forms.searchModes = ['table', 'card'];
        Forms.registry = {};
        class ModelView extends Forms.BaseView {
            // protected _modifiedRecords: any[];
            constructor(info) {
                super(info);
                this.pendingOperation = 0;
                this._active = false;
            }
            /** Create views instances based on template strings */
            static fromTemplate(action, model, template) {
                return new Katrid.Forms.Views.registry[this.viewType]({ action, model, template });
            }
            static createViewModeButton(container) {
            }
            async deleteSelection(sel) {
                // auto apply destroyed records
                if ((((sel.length === 1) && confirm(Katrid.i18n.gettext('Confirm delete record?'))) ||
                    ((sel.length > 1) && confirm(Katrid.i18n.gettext('Confirm delete records?')))) && sel) {
                    let res = await this.datasource.delete(sel.map(rec => rec.id));
                    Katrid.Forms.Dialogs.Alerts.success(Katrid.i18n.gettext('Record(s) deleted successfully'));
                    this.refresh();
                    return true;
                }
            }
            create(info) {
                this.action = info.action;
                this._readonly = true;
                let viewInfo = info.viewInfo;
                if (info.model)
                    this.model = info.model;
                else if (info.name || info.action?.modelName)
                    this.model = new Katrid.Data.Model({ name: info.name || info.action.modelName, fields: info.fields || viewInfo?.fields });
                else if (info.fields) {
                    // Create the model based on specified fields
                    this.model = new Katrid.Data.Model({ fields: info.fields, name: this.action?.modelName });
                }
                else if (viewInfo?.fields || viewInfo?.info?.fields) {
                    console.log(viewInfo);
                    this.model = new Katrid.Data.Model({ name: viewInfo.info.name, fields: viewInfo.fields || viewInfo.info.fields });
                    console.log('create model', this.model);
                }
                this.fields = this.model.fields;
                // init the datasource
                this.datasource = new Katrid.Data.DataSource({
                    model: this.model, context: this.action?.context, domain: this.action?.config?.domain,
                });
                this.datasource.dataCallback = (data) => this.dataSourceCallback(data);
                if (info.records)
                    this.records = this.model.fromArray(info.records);
                else
                    this.records = null;
                if ((this.toolbarVisible == null) && this.action)
                    this.toolbarVisible = true;
                else
                    this.toolbarVisible = info.toolbarVisible;
                super.create(info);
            }
            dataSourceCallback(data) {
                if (data.record)
                    this.record = data.record;
                else if (data.records)
                    this.records = data.records;
            }
            createDialog(content, buttons = ['close']) {
                let el = super.createDialog(content, buttons);
                el.setAttribute('data-model', this.model.name);
                return el;
            }
            get records() {
                return this._records;
            }
            set records(value) {
                this._records = value;
                if (value)
                    this.recordCount = value.length;
                else
                    this.recordCount = null;
                if (this.vm)
                    this.vm.records = value;
            }
            get recordCount() {
                return this._recordCount;
            }
            set recordCount(value) {
                this._recordCount = value;
                if (this.vm)
                    this.vm.recordCount = value;
                if (this.action?.searchView?.vm)
                    this.action.searchView.vm.recordCount = value;
            }
            get active() {
                return this._active;
            }
            set active(value) {
                this._active = value;
                this.setActive(value);
            }
            setActive(value) {
            }
            getComponentData() {
                let data = super.getComponentData();
                data.records = this.records;
                data.pendingRequest = false;
                return data;
            }
            get readonly() {
                return this._readonly;
            }
            set readonly(value) {
                this._readonly = value;
                if (value) {
                    this.element.classList.add('readonly');
                    this.element.classList.remove('editable');
                }
                else {
                    this.element.classList.add('editable');
                    this.element.classList.remove('readonly');
                }
            }
            async ready() {
                // if (this.action.dataSource && (this.action.recordIndex >= 0)) {
                //   this.dataSource._records = this.action.dataSource.records;
                //   this.dataSource.recordIndex = this.action.recordIndex;
                // } else if (this.action.params?.id && !this.dataSource.inserting)
                //   this.dataSource.get(this.action.params.id);
                // else if (!this.dataSource.inserting)
                //   this.dataSource.insert();
            }
            refresh() {
                // this.dataSource.get(this.dataSource.recordId);
                this.datasource.refresh();
            }
            _search(options) {
                if (options.id)
                    return this.datasource.get({ id: options.id, timeout: options.timeout });
                return this.datasource.search({ where: options.where, page: options.page, limit: options.limit });
            }
            _mergeHeader(parent, header) {
                for (let child of Array.from(header.children)) {
                    if (child.tagName === 'HEADER')
                        this._mergeHeader(parent, child);
                    else {
                        header.removeChild(child);
                        parent.append(child);
                    }
                }
            }
            mergeHeader(parent, container) {
                let headerEl = container.querySelector('header');
                Forms.compileButtons(container);
                if (headerEl) {
                    // let statusField = headerEl.querySelector('field[name=status]');
                    // if (statusField)
                    //   statusField.setAttribute('status-field', 'status-field');
                    headerEl.remove();
                    this._mergeHeader(parent, headerEl);
                }
                return parent;
            }
            _vmCreated(vm) {
                vm.$view = this;
                vm.$fields = this.fields;
                this.datasource.vm = vm;
            }
            async doViewAction(action, target) {
                return this._evalResponseAction(await this.model.service.doViewAction({ action_name: action, target }));
            }
            async _evalResponseAction(res) {
                if (res?.open) {
                    window.open(res.open);
                }
                return res;
            }
            createComponent() {
                let comp = super.createComponent();
                let me = this;
                Object.assign(comp.methods, {
                    refresh() {
                        me.refresh();
                    },
                    nextPage() {
                        me.datasource.nextPage();
                    },
                    rpc(methodName, params) {
                        return me.model.service.rpc(methodName, params.args, params.kwargs);
                    },
                    actionClick(selection, methodName, event) {
                        console.log('action click', selection, methodName);
                        me.action.formButtonClick(selection.map(obj => obj.id), methodName);
                    },
                    doViewAction(action, target) {
                        return me.doViewAction(action, target);
                    },
                    async deleteSelection() {
                        if (await me.deleteSelection(this.selection))
                            this.selection = [];
                    },
                    sum(iterable, member) {
                        let res = 0;
                        for (let obj of iterable)
                            res += obj[member] || 0;
                        return res;
                    }
                });
                comp.methods.setViewMode = async function (mode) {
                    return await me.action.showView(mode);
                };
                comp.methods.formButtonClick = function () {
                    console.log('form button click', arguments);
                };
                comp.methods.insert = async function () {
                    let view = await this.setViewMode('form');
                    view.vm.insert();
                };
                comp.computed.$fields = function () {
                    return me.fields;
                };
                comp.created = function () {
                    me._vmCreated(this);
                };
                return comp;
            }
            getViewType() {
                return Object.getPrototypeOf(this).constructor.viewType;
            }
            autoCreateView() {
                let el = document.createElement(this.getViewType() + '-view');
                for (let f of Object.values(this.model.fields)) {
                    let field = document.createElement('field');
                    field.setAttribute('name', f.name);
                    el.append(field);
                }
                return el;
            }
            domTemplate() {
                // auto create view
                if (!this.template && !this.html)
                    return this.autoCreateView();
                return super.domTemplate();
            }
            beforeRender(template) {
                // save and remove the original header to add it to content-scroll later
                let header = template.querySelector(':scope > header');
                Forms.compileButtons(template);
                if (header)
                    template.removeChild(header);
                let templ = this.renderTemplate(template);
                if (this.dialog)
                    return this.createDialog(templ, this.dialogButtons);
                let actionView = document.createElement('div');
                actionView.className = 'view-content';
                let viewContent = document.createElement('div');
                viewContent.classList.add('action-view-content', 'content-scroll');
                if (this.toolbarVisible)
                    actionView.append(this.createToolbar());
                // merge header
                let newHeader = document.createElement('div');
                newHeader.className = 'content-container-heading';
                if (header)
                    this._mergeHeader(newHeader, header);
                // viewContent.append(newHeader);
                let content = document.createElement('div');
                content.className = 'content no-padding';
                content.append(newHeader);
                content.append(templ);
                viewContent.append(content);
                actionView.append(viewContent);
                // viewContent.append(content);
                // viewContent.append(templ);
                return actionView;
            }
            renderTemplate(template) {
                return template;
            }
            // protected createElement() {
            //   return this.domTemplate();
            // }
            createToolbar() {
                let el = document.createElement('div');
                el.className = 'toolbar';
                return el;
            }
        }
        Forms.ModelView = ModelView;
        class RecordCollectionView extends ModelView {
            constructor(info) {
                super(info);
                this.autoLoad = true;
            }
            create(info) {
                super.create(info);
                this.recordGroups = info.recordGroups || null;
            }
            async _recordClick(record, index) {
                if (this.dialog) {
                    this.vm.$result = record;
                    this.closeDialog();
                }
                else {
                    this.record = record;
                    if (this.action) {
                        let formView = await this.action.showView('form');
                        formView.records = this.vm.records;
                        // formView.record = record;
                        formView.recordIndex = index;
                    }
                }
            }
            nextPage() {
                this.datasource.nextPage();
            }
            prevPage() {
                this.datasource.prevPage();
            }
            createComponent() {
                let comp = super.createComponent();
                let me = this;
                comp.methods.recordClick = this.config.recordClick || async function (record, index, event) {
                    await me._recordClick(record, index);
                };
                comp.methods.toggleGroup = function (group) {
                    if (group.$expanded)
                        me.collapseGroup(group);
                    else
                        me.expandGroup(group);
                };
                return comp;
            }
            setActive(value) {
                if (this._searchView) {
                    let btn = this._searchView.element.querySelector('.btn-view-' + Object.getPrototypeOf(this).constructor.viewType);
                    if (btn) {
                        if (value)
                            btn.classList.add('active');
                        else
                            btn.classList.remove('active');
                    }
                }
            }
            get searchView() {
                return this._searchView;
            }
            set searchView(value) {
                this._searchView = value;
                if (value && this.toolbarVisible) {
                    this.setSearchView(value);
                    value.resultView = this;
                }
            }
            dataSourceCallback(data) {
                super.dataSourceCallback(data);
                if (this._searchView) {
                    this._searchView.vm.dataOffset = this.datasource.offset;
                    this._searchView.vm.dataOffsetLimit = this.datasource.offsetLimit;
                    this._searchView.vm.recordCount = this.datasource.recordCount;
                }
            }
            setSearchView(searchView) {
                // render the search view
                if (this.element) {
                    let div = this.element.querySelector('.search-view-area');
                    if (div) {
                        div.innerHTML = '';
                        div.append(searchView.element);
                    }
                }
            }
            getComponentData() {
                let data = super.getComponentData();
                data.selection = [];
                data.groups = this.prepareGroup(this.recordGroups);
                data.recordCount = this.recordCount;
                return data;
            }
            prepareGroup(groups) {
                return groups;
            }
            async groupBy(data) {
                // this.vm.records = this.vm.groups;
                console.log(data);
            }
            async applyGroups(groups, params) {
                let res = await this.datasource.groupBy(groups, params);
                await this.groupBy(res);
            }
            _addRecordsToGroup(index, list) {
            }
            /**
             * Expands a group
             */
            async expandGroup(group) {
                group.$expanded = true;
                let idx = this.vm.groups.indexOf(group);
                // check if data is cached
                let children = group.$children;
                if (!children) {
                    // load from adapter api
                }
                let groups = this.vm.groups;
                this.vm.groups = [...groups.slice(0, idx + 1), ...children, ...groups.slice(idx + 1)];
            }
            /**
             * Expands all groups
             */
            expandAll() {
                for (let g of this.vm.groups) {
                    if (g.$hasChildren && !g.$expanded) {
                        this.expandGroup(g);
                    }
                }
            }
            /**
             * Collapses all groups
             */
            collapseAll() {
                for (let g of this.vm.groups)
                    if (g.$hasChildren && g.$expanded)
                        this.collapseGroup(g);
            }
            /**
             * Collapses a group
             */
            collapseGroup(group) {
                let idx = this.vm.groups.indexOf(group);
                let groups = this.vm.groups;
                for (let sub of group.$children) {
                    if (!sub.$hasChildren)
                        break;
                    else if (sub.$expanded)
                        this.collapseGroup(sub);
                }
                groups.splice(idx + 1, group.$children.length);
                group.$expanded = false;
            }
            // async groupBy(data: any[]);
            async setSearchParams(params) {
                console.log('set empty params', params);
                let p = {};
                if (this.action.info?.domain)
                    p = JSON.parse(this.action.info.domain);
                for (let [k, v] of Object.entries(p)) {
                    let arg = {};
                    arg[k] = v;
                    params.push(arg);
                }
                console.log('params', params);
                await this.datasource.search({ where: params });
            }
            createToolbar() {
                let templ = `<div class="data-heading panel panel-default">
      <div class="panel-body">
        <div class="row">
        <div class="col-md-6">
        
          <action-navbar></action-navbar>
          <p class="help-block"></p>
          <div class="toolbar">
            <div class="toolbar-action-buttons"></div>
        </div>
      </div>
          <div class="search-view-area col-md-6"></div>
        </div>
      </div>
    </div>`;
                let toolbar = Katrid.html(templ);
                toolbar.querySelector('action-navbar').actionManager = this.action.actionManager;
                this.createToolbarButtons(toolbar);
                return toolbar;
            }
            createToolbarButtons(container) {
                let parent = container.querySelector('.toolbar-action-buttons');
                let btnCreate = document.createElement('button');
                btnCreate.className = 'btn btn-primary btn-action-create';
                btnCreate.innerText = Katrid.i18n.gettext('Create');
                btnCreate.setAttribute('v-on:click', 'insert()');
                parent.append(btnCreate);
                if (this.config?.toolbar?.print) {
                    // print
                    let btnPrint = document.createElement('div');
                    btnPrint.classList.add('btn-group');
                    btnPrint.innerHTML = `<button type="button" class="btn btn-outline-secondary dropdown-toggle btn-actions" name="print" data-bs-toggle="dropdown" aria-haspopup="true">
        ${Katrid.i18n.gettext('Print')} <span class="caret"></span>
      </button>
      <div class="dropdown-menu">
        <a class="dropdown-item" v-on:click="autoReport()">${Katrid.i18n.gettext('Auto Report')}</a>
      </div>`;
                    let dropdown = btnPrint.querySelector('.dropdown-menu');
                    for (let bindingAction of this.config?.toolbar?.print) {
                        let a = document.createElement('a');
                        a.classList.add('dropdown-item');
                        a.setAttribute('data-id', bindingAction.id);
                        a.innerText = bindingAction.name;
                        dropdown.append(a);
                    }
                    parent.append(btnPrint);
                }
                // refresh
                let btnRefresh = document.createElement('button');
                btnRefresh.type = 'button';
                btnRefresh.classList.add('btn', 'toolbtn');
                btnRefresh.innerHTML = '<i class="fas fa-redo-alt"></i>';
                btnRefresh.title = Katrid.i18n.gettext('Refresh');
                btnRefresh.setAttribute('v-on:click', 'refresh()');
                parent.append(btnRefresh);
                // actions
                let btnActions = document.createElement('div');
                btnActions.classList.add('btn-group');
                btnActions.innerHTML = `<div class="dropdown">
        <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" v-show="selectionLength"
                aria-haspopup="true">
          ${Katrid.i18n.gettext('Action')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu dropdown-menu-actions">
          <a class="dropdown-item" v-on:click="deleteSelection()">
            <i class="fa fa-fw fa-trash-o"></i> ${Katrid.i18n.gettext('Delete')}
          </a>
          <!-- replace-actions -->
        </div>
      </div>`;
                parent.append(btnActions);
                return parent;
            }
            get $modalResult() {
                return this.vm.$result;
            }
            set $modalResult(value) {
                this.vm.$result = value;
            }
            showDialog(options) {
                if (!options)
                    options = {};
                if (options.backdrop === undefined)
                    options.backdrop = 'static';
                this.dialog = true;
                return new Promise(async (resolve, reject) => {
                    let el = this.element;
                    if (!el)
                        el = this.render();
                    $(el).modal(options)
                        .on('hidden.bs.modal', () => {
                        resolve(this.vm.$modalResult);
                        $(el).data('bs.modal', null);
                        el.remove();
                    });
                    // if (options?.edit)
                    //   this.vm.dataSource.edit();
                });
            }
            async ready() {
                if (!this.records) {
                    return this.datasource.open();
                }
                else {
                    this.refresh();
                }
            }
        }
        Forms.RecordCollectionView = RecordCollectionView;
        class ActionViewElement extends Katrid.WebComponent {
            create() {
                this.classList.add('action-view');
            }
        }
        Forms.ActionViewElement = ActionViewElement;
        Katrid.define('action-view', ActionViewElement);
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            Views.registry = {};
            function fromTemplates(action, model, templates) {
                let res = {};
                for (let [k, t] of Object.entries(templates)) {
                    res[k] = Views.registry[k].fromTemplate(action, model, t);
                }
                return res;
            }
            Views.fromTemplates = fromTemplates;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../core/app.ts"/>
/// <reference path="../forms/index.ts"/>
/// <reference path="../forms/model.ts"/>
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class _QueryView extends HTMLElement {
            get queryId() {
                return this._queryId;
            }
            set queryId(value) {
                this._queryId = value;
                if (value) {
                    this.queryChange(value);
                }
            }
            async queryChange(query) {
                $(this).empty();
                // this.searchView = <SearchViewElement>document.createElement('search-view');
                // this.searchView.addEventListener('searchUpdate', () => {
                //   this.refresh(query, this.searchView.getParams());
                // })
                // this.append(this.searchView);
                this.container = document.createElement('div');
                this.container.classList.add('table-responsive');
                this.append(this.container);
                let res = await this.refresh(query);
                // render the result on table
                // transform result to list of objects
                // this.action.search = this.getSearchView(query);
                // this.$scope.action.views.search = this.$scope.action.search;
                // this.renderSearch();
                // this.renderTable(res);
                // this.$scope.$apply();
            }
            async refresh(query, params) {
                $(this.container).empty();
                let res = await Katrid.Services.Query.read({ id: query, details: true, params });
                let fields = this.fields = res.fields;
                // this.searchView.fields = this.fields = Katrid.Data.Fields.fromArray(res.fields);
                this.fieldList = Object.values(this.fields);
                // for (let f of res.fields)
                // f.filter = this.getFilter(f);
                let _toObject = (fields, values) => {
                    let r = {}, i = 0;
                    for (let f of fields) {
                        r[f.name] = values[i];
                        i++;
                    }
                    return r;
                };
                // this.$scope.records = res.data.map(row => _toObject(res.fields, row));
                // this.$scope.$apply();
                let table = this.table = document.createElement('table');
                table.classList.add('table');
                let thead = table.createTHead();
                let thr = thead.insertRow(0);
                let tbody = table.createTBody();
                for (let f of this.fieldList) {
                    let th = document.createElement('th');
                    th.innerText = f.caption;
                    thr.append(th);
                }
                for (let row of res.data) {
                    let tr = document.createElement('tr');
                    let i = 0;
                    for (let col of row) {
                        let field = fields[i];
                        let td = document.createElement('td');
                        if (_.isNumber(col))
                            col = Katrid.intl.number({ minimumFractionDigits: 0 }).format(col);
                        else if (field.type === 'DateField')
                            col = moment(col).format('DD/MM/YYYY');
                        else if (field.type === 'DateTimeField')
                            col = moment(col).format('DD/MM/YYYY HH:mm');
                        td.innerText = col;
                        tr.append(td);
                        i++;
                    }
                    tbody.append(tr);
                }
                this.container.append(table);
                table.addEventListener('contextmenu', evt => this.contextMenu(evt));
                // this.searchView.render();
                return res;
            }
            contextMenu(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                // create context menu
                let menu = new ContextMenu();
                menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => this.copyToClipboard());
                // menu.add('<i class="fa fa-fw fa-filter"></i> Filtrar pelo conteúdo deste campo', () => this.filterByFieldContent(td, rec));
                // menu.add('<i class="fa fa-fw fa-trash"></i> Excluir', () => this.deleteRow());
                // menu.add('Arquivar', this.copyClick);
                menu.show(evt.pageX, evt.pageY);
            }
            copyToClipboard() {
                navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(this.table));
            }
        }
        BI._QueryView = _QueryView;
        // Katrid.define('query-view', QueryView);
        class QueryView extends Katrid.Forms.RecordCollectionView {
            get queryId() {
                return this._queryId;
            }
            set queryId(value) {
                this._queryId = value;
                if (value) {
                    this.queryChange(value);
                }
            }
            async queryChange(query) {
                $(this).empty();
                // this.searchView = <SearchViewElement>document.createElement('search-view');
                // this.searchView.addEventListener('searchUpdate', () => {
                //   this.refresh(query, this.searchView.getParams());
                // })
                // this.append(this.searchView);
                let container = document.createElement('div');
                container.classList.add('table-responsive');
                // let res = await this.refreshQuery(query);
                // render the result on table
                // transform result to list of objects
                // this.action.search = this.getSearchView(query);
                // this.$scope.action.views.search = this.$scope.action.search;
                // this.renderSearch();
                // this.renderTable(res);
                // this.$scope.$apply();
            }
            async refreshQuery(query, params) {
                $(this.container).empty();
                let res = await Katrid.Services.Query.read({ id: query, details: true, params });
                let fields = this.fields = res.fields;
                // this.searchView.fields = this.fields = Katrid.Data.Fields.fromArray(res.fields);
                this.fieldList = Object.values(this.fields);
                // for (let f of res.fields)
                // f.filter = this.getFilter(f);
                let _toObject = (fields, values) => {
                    let r = {}, i = 0;
                    for (let f of fields) {
                        r[f.name] = values[i];
                        i++;
                    }
                    return r;
                };
                // this.$scope.records = res.data.map(row => _toObject(res.fields, row));
                // this.$scope.$apply();
                return res;
            }
            async loadData(data) {
                let table = this.table = document.createElement('table');
                table.classList.add('table', 'table-hover');
                let thead = table.createTHead();
                let thr = thead.insertRow(0);
                let tbody = table.createTBody();
                for (let f of this.fieldList) {
                    let th = document.createElement('th');
                    if (f.type)
                        th.className = f.type;
                    th.innerText = f.caption;
                    thr.append(th);
                }
                for (let row of data) {
                    let tr = document.createElement('tr');
                    let i = 0;
                    for (let col of row) {
                        let field = this.fieldList[i];
                        let td = document.createElement('td');
                        if (_.isNumber(col))
                            col = Katrid.intl.number({ minimumFractionDigits: 0 }).format(col);
                        else if (field.type === 'DateField')
                            col = moment(col).format('DD/MM/YYYY');
                        else if (field.type === 'DateTimeField')
                            col = moment(col).format('DD/MM/YYYY HH:mm');
                        if (field.type)
                            td.className = field.type;
                        td.innerText = col;
                        tr.append(td);
                        i++;
                    }
                    tbody.append(tr);
                }
                this.element.append(table);
                table.addEventListener('contextmenu', evt => this.contextMenu(evt));
                // this.searchView.render();
            }
            async ready() {
                this.fieldList = Object.values(this.fields);
                this.element = document.createElement('div');
                this.element.classList.add('table-responsive');
                this.loadData(this.data);
                let searchView = new Katrid.Forms.SearchView({ fields: this.fields });
                searchView.renderTo(this.container);
                this.container.append(this.element);
            }
            contextMenu(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                // create context menu
                let menu = new Katrid.Forms.ContextMenu();
                menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => this.copyToClipboard());
                // menu.add('<i class="fa fa-fw fa-filter"></i> Filtrar pelo conteúdo deste campo', () => this.filterByFieldContent(td, rec));
                // menu.add('<i class="fa fa-fw fa-trash"></i> Excluir', () => this.deleteRow());
                // menu.add('Arquivar', this.copyClick);
                menu.show(evt.pageX, evt.pageY);
            }
            copyToClipboard() {
                navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(this.table));
            }
        }
        QueryView.viewType = 'query';
        BI.QueryView = QueryView;
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../core/app.ts"/>
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class QueryViewer extends Katrid.WebComponent {
            create() {
                this.innerHTML = `<div class="col-12"><h5>Visualizador de Consultas</h5><div class="toolbar"><select id="select-query" class="form-select"></select></div></div><div class="query-view col-12"></div>`;
                this.load();
            }
            async load() {
                let sel = this.querySelector('#select-query');
                this.container = this.querySelector('.query-view');
                let res = await Katrid.Services.Query.all();
                if (res.data) {
                    // group items
                    let cats = {};
                    res.data.forEach(obj => (cats[obj.category] = cats[obj.category] || []).push(obj));
                    for (let [k, v] of Object.entries(cats)) {
                        let g = document.createElement('optgroup');
                        g.label = k;
                        for (let q of v) {
                            let opt = document.createElement('option');
                            opt.innerText = q.name;
                            opt.value = q.id;
                            g.append(opt);
                        }
                        sel.append(g);
                    }
                }
                sel.addEventListener('change', async () => {
                    $(this.container).empty();
                    let res = await Katrid.Services.Query.read({ id: sel.value, details: true, params: {} });
                    let fields = res.fields;
                    // this.searchView.fields = this.fields = Katrid.Data.Fields.fromArray(res.fields);
                    let fieldList = Object.values(fields);
                    // for (let f of res.fields)
                    // f.filter = this.getFilter(f);
                    let _toObject = (fields, values) => {
                        let r = {}, i = 0;
                        for (let f of fields) {
                            r[f.name] = values[i];
                            i++;
                        }
                        return r;
                    };
                    let queryView = new BI.QueryView({ fields });
                    queryView.data = res.data;
                    // queryView.queryId = sel.value;
                    queryView.container = this.container;
                    queryView.ready();
                });
            }
        }
        BI.QueryViewer = QueryViewer;
        Katrid.define('query-viewer', QueryViewer);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        // bypass the fetch function
        let $fetch = window.fetch;
        window.fetch = function () {
            let ajaxStart = new CustomEvent('ajax.start', { detail: document, bubbles: true, cancelable: false });
            let ajaxStop = new CustomEvent('ajax.stop', { detail: document, bubbles: true, cancelable: false });
            // Pass the supplied arguments to the real fetch function
            let promise = $fetch.apply(this, arguments);
            // Trigger the fetchStart event
            document.dispatchEvent(ajaxStart);
            promise.finally(() => {
                document.dispatchEvent(ajaxStop);
            });
            return promise;
        };
        class Service {
            constructor(name) {
                this.name = name;
            }
            static $fetch(url, config, params) {
                return this.adapter.$fetch(url, config, params);
            }
            static $post(url, data, params) {
                return this.adapter.$fetch(url, {
                    method: 'POST',
                    credentials: "same-origin",
                    body: JSON.stringify(data),
                    headers: {
                        'content-type': 'application/json',
                    }
                }, params)
                    .then(res => res.json());
            }
            get(name, params) {
                // Using http protocol
                const methName = this.name ? this.name + '/' : '';
                const rpcName = Katrid.settings.server + this.constructor.url + methName + name + '/';
                return $.get(rpcName, params);
            }
            post(name, data, params, config, context) {
                // if (!context && Katrid.app)
                //   context = Katrid.app.context;
                if (!data)
                    data = {};
                if (context)
                    data.context = context;
                data = {
                    method: name,
                    params: data,
                };
                if (!config)
                    config = {};
                Object.assign(config, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                });
                const methName = this.name ? this.name + '/' : '';
                let rpcName = Katrid.settings.server + this.constructor.url + methName + name + '/';
                if (params) {
                    rpcName += `?${$.param(params)}`;
                }
                return new Promise((resolve, reject) => {
                    Service.adapter.$fetch(rpcName, config)
                        .then(async (response) => {
                        let contentType = response.headers.get('Content-Type');
                        if (response.status === 500) {
                            let res = await response.json();
                            // show server error
                            Katrid.Forms.Dialogs.ExceptionDialog.show(`Server Error 500`, res.error);
                            return reject(res);
                        }
                        let res;
                        if (contentType === 'application/json')
                            res = await response.json();
                        else
                            return downloadBytes(response);
                        if (res.error) {
                            if ('message' in res.error)
                                Katrid.Forms.Dialogs.Alerts.error(res.error.message);
                            else if ('messages' in res.error)
                                Katrid.Forms.Dialogs.Alerts.error(res.error.messages.join('<br>'));
                            else
                                Katrid.Forms.Dialogs.Alerts.error(res.error);
                            reject(res.error);
                        }
                        else {
                            if (res.result) {
                                let result = res.result;
                                if (Array.isArray(result) && (result.length === 1))
                                    result = result[0];
                                let messages;
                                if (result.messages)
                                    messages = result.messages;
                                else
                                    messages = [];
                                if (result.message) {
                                    if (result.message.info)
                                        messages.push({ type: 'info', message: result.message.info });
                                    else
                                        messages.push(result.message);
                                }
                                else if (result.warn)
                                    messages.push({ type: 'warn', message: result.warn });
                                else if (result.error) {
                                    if (typeof result.error === 'string')
                                        messages.push({ type: 'error', message: result.error });
                                    else
                                        messages.push({ type: 'error', message: result.error.message });
                                }
                                messages.forEach(function (msg) {
                                    if (Katrid.isString(msg))
                                        Katrid.Forms.Dialogs.Alerts.success(msg);
                                    else if (msg.type === 'warn')
                                        Katrid.Forms.Dialogs.Alerts.warn(msg.message);
                                    else if (msg.type === 'info')
                                        Katrid.Forms.Dialogs.Alerts.info(msg.message);
                                    else if ((msg.type === 'error') || (msg.type === 'danger'))
                                        Katrid.Forms.Dialogs.Alerts.error(msg.message);
                                    else if (msg.type === 'toast')
                                        Katrid.Forms.Dialogs.toast(msg.message);
                                    else if (msg.type === 'alert')
                                        Katrid.Forms.Dialogs.alert(msg.message, msg.title, msg.alert);
                                });
                                if (result) {
                                    // open a document
                                    if (result.open)
                                        window.open(result.open);
                                    // download a file
                                    if (result.download) {
                                        console.log(result.result);
                                        let a = document.createElement('a');
                                        a.href = result.download;
                                        a.target = '_blank';
                                        a.click();
                                        return;
                                    }
                                }
                                resolve(result);
                            }
                            else
                                resolve(res);
                        }
                    })
                        .catch(res => {
                        console.log('error', res);
                        reject(res);
                    });
                });
            }
        }
        Service.url = '/api/rpc/';
        Services.Service = Service;
        class Data extends Service {
            static get url() {
                return '/web/data/';
            }
            ;
            /**
             * Reorder/reindex a collection of records
             * @param model
             * @param ids
             * @param field
             * @param offset
             */
            reorder(model, ids, field = 'sequence', offset = 0) {
                return this.post('reorder', { args: [model, ids, field, offset] });
            }
        }
        Services.Data = Data;
        /**
         * Represents the attachments services api
         */
        class Attachments {
            static delete(id) {
                let svc = new Katrid.Services.ModelService('content.attachment');
                svc.delete(id);
            }
            static upload(file, config) {
                return new Promise((resolve, reject) => {
                    let data = new FormData();
                    data.append('model', config.model.name);
                    data.append('id', config.recordId);
                    for (let f of file.files)
                        data.append('attachment', f, f.name);
                    return $.ajax({
                        url: '/web/content/upload/',
                        type: 'POST',
                        data: data,
                        processData: false,
                        contentType: false
                    })
                        .done((res) => {
                        resolve(res);
                    });
                });
            }
        }
        Services.Attachments = Attachments;
        class Auth extends Service {
            static login(username, password) {
                return this.$post('/web/login/', { username: username, password: password });
            }
        }
        class Upload {
            static sendFile(config) {
                let { model, method, file, vm } = config;
                let form = new FormData();
                form.append('files', file.files[0]);
                let url = `/web/file/upload/${model.name}/${method}/`;
                if (vm.record && vm.record.id)
                    form.append('id', vm.record.id);
                // try to detect the current datasource to be refreshed if needed
                let dataSource = vm.dataSource;
                $.ajax({
                    url: url,
                    data: form,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    success: (data) => {
                        if (dataSource)
                            dataSource.refresh();
                        Katrid.Forms.Dialogs.Alerts.success('Operação realizada com sucesso.');
                    }
                });
            }
            static uploadTo(url, file) {
                let form = new FormData();
                form.append('files', file.files[0]);
                return $.ajax({
                    url: url,
                    data: form,
                    processData: false,
                    contentType: false,
                    type: 'POST',
                    success: (data) => {
                        Katrid.Forms.Dialogs.Alerts.success('Arquivo enviado com sucesso!');
                    }
                });
            }
        }
        Services.Upload = Upload;
        Services.data = new Data('');
        function post(url, data) {
            // post json data to server
            return fetch(url, {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            }).then(res => res.json());
        }
        Services.post = post;
        async function downloadBytes(res) {
            let bytes = await res.blob();
            let contentType = res.headers.get('Content-Type');
            let name = res.headers.get('Content-Disposition');
            let url = URL.createObjectURL(bytes);
            let a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = name;
            document.body.append(a);
            if (contentType.indexOf('pdf') > 1)
                window.open(url);
            else
                a.click();
            URL.revokeObjectURL(url);
            a.remove();
        }
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../services/services.ts"/>
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class TableWidget {
            constructor(el, config) {
                this.el = el;
                this.config = config;
                this._waiting = false;
                if (!this.config)
                    this.config = {};
            }
            get queryCommand() {
                return this._queryCommand;
            }
            set queryCommand(value) {
                this._queryCommand = value;
                this.waiting = true;
                Katrid.Services.post('/bi/studio/query/', { query: value, withDescription: true, asDict: true })
                    .then(res => this._refresh(res))
                    .finally(() => this.waiting = false);
            }
            get waiting() {
                return this._waiting;
            }
            set waiting(value) {
                this._waiting = value;
                if (value)
                    this.el.innerHTML = `<div><i class="fas fa-spinner fa-spin"></i> <span>${Katrid.i18n.gettext('Loading...')}</span></div>`;
                else {
                    let spinner = this.el.querySelector('.fas.fa-spinner');
                    if (spinner)
                        spinner.remove();
                }
            }
            _refresh(data) {
                let fieldList = data.fields;
                let fields = [];
                if (this.config.fieldElements?.length) {
                    let fieldByName = {};
                    for (let f of fieldList)
                        fieldByName[f.name] = f;
                    fields = Array.from(this.config.fieldElements.map(el => {
                        let name = el.getAttribute('name');
                        let f;
                        if (name)
                            f = fieldByName[name];
                        return new TableColumn(el, f);
                    }));
                }
                else
                    fields = Array.from(fieldList.map(f => new TableColumn(null, f)));
                this.el.innerHTML = '';
                if (this.config.caption)
                    this.el.innerHTML = `<h4 class="widget-header">${this.config.caption}</h4>`;
                let table = document.createElement('table');
                table.classList.add('table');
                let tr = document.createElement('tr');
                table.createTHead().append(tr);
                for (let f of fields) {
                    let th = document.createElement('th');
                    th.innerText = f.caption;
                    th.className = f.type;
                    tr.append(th);
                }
                let tbody = table.createTBody();
                // render rows
                for (let row of data.data) {
                    let tr = document.createElement('tr');
                    for (let f of fields) {
                        let td = document.createElement('td');
                        td.className = f.type;
                        let col;
                        if (f.name) {
                            col = row[f.name];
                            if (_.isNumber(col))
                                col = Katrid.intl.number({ minimumFractionDigits: 0 }).format(col);
                            else if (f.type === 'DateField')
                                col = moment(col).format('DD/MM/YYYY');
                            else if (f.type === 'DateTimeField')
                                col = moment(col).format('DD/MM/YYYY HH:mm');
                        }
                        else
                            col = '';
                        if (f.type)
                            td.className = f.type;
                        td.innerText = col;
                        tr.append(td);
                    }
                    tbody.append(tr);
                }
                this.el.append(table);
            }
        }
        BI.TableWidget = TableWidget;
        class TableWidgetElement extends Katrid.WebComponent {
            create() {
                super.create();
                this.className = 'table-responsive';
                let fieldElements = Array.from(this.querySelectorAll('field'));
                for (let f of fieldElements)
                    f.remove();
                let tbl = new TableWidget(this, { caption: this.getAttribute('caption'), fieldElements });
                tbl.queryCommand = this.getAttribute('query-command');
            }
        }
        BI.TableWidgetElement = TableWidgetElement;
        class TableColumn {
            constructor(el, field) {
                this.el = el;
                this.field = field;
                if (el) {
                    this.name = el.getAttribute('name') || field?.name;
                    this.caption = el.getAttribute('caption') || this.name;
                    this.type = el.getAttribute('data-type') || field?.type;
                }
                else if (field) {
                    this.caption = this.name = field.name;
                    this.type = field.type;
                }
                if (!this.type)
                    this.type = 'StringField';
            }
        }
        Katrid.define('table-widget', TableWidgetElement);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Components;
    (function (Components) {
        class Component {
        }
        Components.Component = Component;
        class Widget extends Component {
        }
        Components.Widget = Widget;
    })(Components = Katrid.Components || (Katrid.Components = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Exceptions;
    (function (Exceptions) {
        class Exception extends Error {
            constructor(message) {
                super(message);
                Katrid.Forms.Dialogs.alert({ text: message, icon: 'error' });
            }
        }
        Exceptions.Exception = Exception;
        class ValidationError extends Exception {
        }
        Exceptions.ValidationError = ValidationError;
    })(Exceptions = Katrid.Exceptions || (Katrid.Exceptions = {}));
})(Katrid || (Katrid = {}));
// initialize the katrid namespace
var Katrid;
(function (Katrid) {
    Katrid.isMobile = (() => {
        var check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
                check = true;
        })(navigator.userAgent || navigator.vendor);
        return check;
    })();
    Katrid.settings = {
        additionalModules: [],
        server: '',
        // Katrid Framework UI Settings
        ui: {
            isMobile: Katrid.isMobile,
            dateInputMask: true,
            defaultView: 'list',
            goToDefaultViewAfterCancelInsert: true,
            goToDefaultViewAfterCancelEdit: false,
            horizontalForms: true
        },
        services: {
            choicesPageLimit: 10
        },
        speech: {
            enabled: false
        }
    };
    if (Katrid.isMobile)
        document.body.classList.add('mobile');
    else
        document.body.classList.add('desktop');
    let initialized = false;
    function init() {
        if (!initialized) {
            initialized = true;
            // register custom elements
            for (let entry of Object.entries(Katrid.customElementsRegistry))
                customElements.define(entry[0], entry[1].constructor, entry[1].options);
        }
    }
    Katrid.init = init;
    function assignElement(target, source) {
        for (let attr of source.attributes) {
            target.setAttribute(attr.name, attr.value);
        }
    }
    Katrid.assignElement = assignElement;
    class LocalSettings {
        static init() {
            Katrid.localSettings = new LocalSettings();
        }
        constructor() {
        }
        get searchMenuVisible() {
            return parseInt(localStorage.searchMenuVisible) === 1;
        }
        set searchMenuVisible(value) {
            localStorage.searchMenuVisible = value ? 1 : 0;
        }
    }
    Katrid.LocalSettings = LocalSettings;
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        let DataSourceState;
        (function (DataSourceState) {
            DataSourceState[DataSourceState["inserting"] = 0] = "inserting";
            DataSourceState[DataSourceState["browsing"] = 1] = "browsing";
            DataSourceState[DataSourceState["editing"] = 2] = "editing";
            DataSourceState[DataSourceState["loading"] = 3] = "loading";
            DataSourceState[DataSourceState["inactive"] = 4] = "inactive";
        })(DataSourceState = Data.DataSourceState || (Data.DataSourceState = {}));
        const DEFAULT_REQUEST_INTERVAL = 300;
        class DataSource {
            constructor(config) {
                this.config = config;
                this.$modifiedRecords = [];
                this._fieldChanging = false;
                this._pendingPromises = [];
                this.readonly = false;
                this.$modifiedRecords = [];
                // this.onFieldChange = this.onFieldChange.bind(this);
                this.model = config.model;
                this.field = config.field;
                this._recordIndex = 0;
                this.recordCount = null;
                this.loading = false;
                this.loadingRecord = false;
                this._masterSource = null;
                this.masterSource = config.master;
                this._pageIndex = 0;
                this.pageLimit = config.pageLimit || 100;
                this.offset = 0;
                this.offsetLimit = 0;
                this.requestInterval = DEFAULT_REQUEST_INTERVAL;
                this.pendingTimeout = null;
                this.pendingRequest = false;
                this.children = [];
                this.modifiedData = null;
                this.uploading = 0;
                this.fields = config.fields || config.model.fields;
                this._state = null;
                this.fieldWatchers = [];
                this._pendingChanges = false;
                if (!this.action?.recordId)
                    this.recordId = null;
                // this.scope.$fieldLog = {};
                this._records = [];
                this.vm = config.vm;
                this.domain = config.domain;
                this.context = config.context;
            }
            get pageIndex() {
                return this._pageIndex;
            }
            set pageIndex(page) {
                this._pageIndex = page;
                console.log('set page index', page);
                this.search({ where: this._params, page, fields: this._fields, timeout: DEFAULT_REQUEST_INTERVAL });
            }
            get loadingRecord() {
                return this._loadingRecord;
            }
            set loadingRecord(value) {
                this._loadingRecord = value;
                this.state = this.state;
            }
            get pendingRequest() {
                return this._pendingRequest;
            }
            set pendingRequest(value) {
                this._pendingRequest = value;
                if (this.requestCallback)
                    this.requestCallback(value);
            }
            get loadingAction() {
                return this._loadingAction;
            }
            set loadingAction(v) {
                if (v)
                    this.requestInterval = 0;
                else
                    this.requestInterval = DEFAULT_REQUEST_INTERVAL;
                this._loadingAction = v;
            }
            get $form() {
                return this._$form;
            }
            set $form(value) {
                this._$form = value;
                if (this._record?.$record)
                    this._record.$record.$form = this;
            }
            async cancel() {
                if (!this.changing)
                    return;
                let editing = this.state === DataSourceState.editing;
                this.state = DataSourceState.browsing;
                this._recordIndex = null;
                this._pendingChanges = false;
                if (editing)
                    return this.refreshRecord();
                return;
                // else if (this.action)
                //   (<Katrid.Actions.WindowAction>this.action).switchView('list');
                // this.scope.$emit('afterCancel', this);
            }
            _createRecord(obj) {
                return this.model.fromObject(obj, this);
            }
            async copy(id) {
                let res = await this.model.service.copy(id);
                this.setRecord({});
                await this.insert();
                setTimeout(() => {
                    clearTimeout(this.pendingTimeout);
                    this.setValues(res);
                }, this.requestInterval);
                return res;
            }
            findById(id) {
                for (let rec of this._records)
                    if (rec.id === id)
                        return rec;
                return null;
            }
            $removeById(id) {
                let i = 0;
                for (let rec of this._records) {
                    if (rec.id === id) {
                        this._records.splice(i, 1);
                        return rec;
                    }
                    i++;
                }
                return null;
            }
            hasKey(id) {
                return this.findById(id) !== null;
            }
            refresh(data) {
                let r;
                if (data === undefined)
                    data = true;
                // refresh all records
                if (data === true)
                    r = this.search({ where: this._params, page: this._page });
                else if (data) {
                    // Refresh current record
                    r = this.get(data[0]);
                }
                else if (this.record && this.record.id) {
                    r = this.get(this.record.id);
                }
                return r;
            }
            refreshRecord(id) {
                if (id === undefined)
                    id = this._recordId;
                return this.get({ id });
            }
            _validateForm(elForm, form, errorMsgs) {
                let elfield;
                for (let errorType in form.$error)
                    if (errorType === 'required')
                        for (let child of Array.from(form.$error[errorType])) {
                            if (child.$name.startsWith('grid-row-form'))
                                elfield = this._validateForm(elForm.find('#' + child.$name), child, errorMsgs);
                            else {
                                elfield = elForm.find(`.form-field[name="${child.$name}"]`);
                                elfield.addClass('ng-touched');
                                // let scope = angular.element(elForm).scope();
                                // const field = scope.view.fields[child.$name];
                                errorMsgs.push(`<span>${field.caption}</span><ul><li>${Katrid.i18n.gettext('This field cannot be empty.')}</li></ul>`);
                            }
                        }
                    else
                        console.log(form.$error[errorType]);
                return elfield;
            }
            async validate(raiseError = true) {
                return true;
                let ret;
                if (this.vm?.validate)
                    ret = await this.vm.validate();
                if (!ret)
                    throw Error('Validation error');
                return ret;
            }
            indexOf(obj) {
                if (this._records)
                    return this._records.indexOf(this.findById(obj.id));
            }
            getFieldChoices(where, timeout = 0) {
                return new Promise((resolve, reject) => {
                    let controller = new AbortController();
                    let req = () => {
                        let args = {
                            field: this.field.name,
                            config: { signal: controller.signal },
                            context: this.context,
                            filter: where,
                        };
                        this.parent.model.service.getFieldChoices(args)
                            .catch((res) => {
                            return reject(res);
                        })
                            .then((res) => {
                            if (this.pageIndex > 1) {
                                this.offset = ((this.pageIndex - 1) * this.pageLimit) + 1;
                            }
                            else {
                                this.offset = 1;
                            }
                            // this.scope.$apply(() => {
                            if (res.count != null)
                                this.recordCount = res.count;
                            let data = res.data;
                            this.rawData = data;
                            if (this.readonly)
                                this.records = data;
                            else
                                this.records = data.map((obj) => this._createRecord(obj));
                            // list view uses only groups
                            //this.scope.groups = this._records;
                            // this.scope.records = this._records;
                            if (this.pageIndex === 1) {
                                this.offsetLimit = this._records.length;
                            }
                            else {
                                this.offsetLimit = (this.offset + this._records.length) - 1;
                            }
                            // });
                            return resolve(res);
                        })
                            .finally(() => {
                            this.pendingRequest = false;
                        });
                    };
                    // add pending abort controller
                    this._pendingPromises.push(controller);
                    timeout = 0;
                    if (((this.requestInterval > 0) || timeout) && (timeout !== false))
                        this.pendingTimeout = setTimeout(req, timeout || this.requestInterval);
                    else
                        req();
                });
            }
            search(options) {
                this._clearTimeout();
                let params = options.where;
                let page = options.page;
                let fields = options.fields;
                let timeout = options.timeout;
                let master = this.masterSource;
                this._params = params;
                this._page = page;
                this._fields = fields;
                this.pendingRequest = true;
                this.loading = true;
                this.state = DataSourceState.loading;
                page = page || 1;
                this._pageIndex = page;
                let domain = this.domain;
                if (typeof domain === 'string')
                    domain = JSON.parse(domain);
                else if (!domain)
                    domain = {};
                if (this.where)
                    Object.assign(domain, this.where);
                if (_.isObject(fields))
                    fields = Object.keys(fields);
                params = {
                    count: true,
                    page,
                    where: params,
                    fields,
                    domain,
                    limit: this.pageLimit,
                };
                return new Promise((resolve, reject) => {
                    let controller = new AbortController();
                    let req = () => {
                        let ctx = this.context;
                        this.model.service.search(params, null, { signal: controller.signal }, ctx)
                            .catch((res) => {
                            return reject(res);
                        })
                            .then((res) => {
                            if (this.pageIndex > 1) {
                                this.offset = ((this.pageIndex - 1) * this.pageLimit) + 1;
                            }
                            else {
                                this.offset = 1;
                            }
                            if (res.count != null)
                                this.recordCount = res.count;
                            let data = res.data;
                            this.rawData = data;
                            if (this.pageIndex === 1) {
                                this.offsetLimit = data.length;
                            }
                            else {
                                this.offsetLimit = (this.offset + data.length) - 1;
                            }
                            this.records = data.map((obj, idx) => {
                                let rec = this._createRecord(obj);
                                rec.$index = idx;
                                return rec;
                            });
                            return resolve(res);
                        })
                            .finally(() => {
                            this.pendingRequest = false;
                            this.state = DataSourceState.browsing;
                        });
                    };
                    // add pending abort controller
                    this._pendingPromises.push(controller);
                    timeout = 0;
                    if (((this.requestInterval > 0) || timeout) && (timeout !== false))
                        this.pendingTimeout = setTimeout(req, timeout || this.requestInterval);
                    else
                        req();
                });
            }
            async groupBy(group, params) {
                this._params = [];
                if (!group?.length) {
                    this.groups = [];
                    this.vm.groups = null;
                    this.search(params);
                    return;
                }
                this.groups = this.vm.groups = group;
                this.vm.groups = await this._loadGroup(group, 0, params);
                return this.vm.groups;
            }
            async _loadGroup(group, index, where, parent) {
                let rows = [];
                if (!where)
                    where = [];
                if (parent && parent.$params)
                    where = where.concat(parent.$params);
                let res = await this.model.service.groupBy([group[index]], where);
                const groupName = group[index];
                for (let r of res) {
                    let s = r[groupName];
                    let paramValue;
                    if (Array.isArray(s)) {
                        paramValue = s[0];
                        s = s[1];
                    }
                    else {
                        paramValue = s;
                    }
                    r.__str__ = s;
                    r.$expanded = false;
                    r.$group = groupName;
                    let params = {};
                    params[groupName] = paramValue;
                    r.$level = index;
                    r.$hasChildren = true;
                    // add group object to list
                    rows.push(r);
                }
                return rows;
            }
            goto(index) {
                return this.recordIndex = index;
            }
            moveBy(index) {
                const newIndex = (this._recordIndex + index);
                if ((newIndex > -1) && (newIndex < this._records.length))
                    this.recordIndex = newIndex;
                if (this.scrollCallback)
                    this.scrollCallback(this.recordIndex, this.record);
            }
            _clearTimeout() {
                this.loading = false;
                this.loadingRecord = false;
                this._canceled = true;
                this.pendingRequest = false;
                clearTimeout(this.pendingTimeout);
                for (let controller of this._pendingPromises)
                    try {
                        controller.abort();
                    }
                    catch {
                        console.debug('Abort signal');
                    }
                this._pendingPromises = [];
            }
            set masterSource(master) {
                this._masterSource = master;
                if (master)
                    master.children.push(this);
            }
            get masterSource() {
                return this._masterSource;
            }
            applyModifiedData(form, element, record) {
                const data = this.getModifiedData(form, element, record);
                const _id = _.hash(record);
                if (data) {
                    let ds = this.modifiedData;
                    if ((ds == null)) {
                        ds = {};
                    }
                    let obj = ds[_id];
                    if (!obj) {
                        obj = {};
                        ds[_id] = obj;
                    }
                    for (let attr in data) {
                        let v = data[attr];
                        obj[attr] = v;
                        //record[attr] = v;
                    }
                    this.modifiedData = ds;
                    this.masterSource.scope.form.$setDirty();
                }
                return data;
            }
            async save(autoRefresh = true) {
                let valid = await this.validate();
                console.log('validated');
                this.record.$flush();
                // Save pending children
                for (let child of this.children)
                    if (child.changing) {
                        child.flush();
                        console.log('apply changes');
                    }
                if (await this.validate()) {
                    const data = this.record.$serialize();
                    if (data) {
                        this.uploading++;
                        return this.model.service.write([data])
                            .then((res) => {
                            // if (this.action && this.action.viewType && (this.action.viewType === 'form'))
                            //   this.action.changeUrl('id', res[0]);
                            this._pendingChanges = false;
                            this.state = DataSourceState.browsing;
                            if (autoRefresh)
                                return this.refreshRecord(res);
                            else
                                return res;
                        })
                            .catch((error) => {
                            let s = `<span>${Katrid.i18n.gettext('The following fields are invalid:')}<hr></span>`;
                            if (error.message)
                                s = error.message;
                            else if (error.messages) {
                                let elfield;
                                for (let fld of Object.keys(error.messages)) {
                                    const msgs = error.messages[fld];
                                    let field;
                                    // check qualified field name
                                    if (fld.indexOf('.') > -1) {
                                        let sfld = fld.split('.');
                                        let subField = sfld[1];
                                        for (let child of this.children)
                                            if (child.scope.fieldName === sfld[0]) {
                                                field = child.scope.view.fields[subField];
                                            }
                                    }
                                    else
                                        field = this.scope.view.fields[fld];
                                    if (!field || !field.name)
                                        continue;
                                    // elfield = el.find(`.form-field[name="${field.name}"]`);
                                    // elfield.addClass('ng-invalid ng-touched');
                                    s += `<strong>${field.caption}</strong><ul>`;
                                    for (let msg of msgs) {
                                        s += `<li>${msg}</li>`;
                                    }
                                    s += '</ul>';
                                }
                                if (elfield)
                                    elfield.focus();
                            }
                            Katrid.Forms.Dialogs.Alerts.error(s);
                            throw new Error(s);
                        })
                            .finally(() => this.uploading--);
                    }
                    else
                        Katrid.Forms.Dialogs.Alerts.warn(Katrid.i18n.gettext('No pending changes'));
                }
            }
            async delete(sel) {
                await this.model.service.delete(sel);
            }
            _getNested(recs) {
                let res = [];
                if (recs.$deleted && recs.$deleted.recs.length)
                    for (let rec of recs.$deleted.recs)
                        res.push({ id: rec.id, action: 'DESTROY' });
                let vals;
                if (recs.recs.length)
                    for (let rec of recs.recs)
                        if (rec) {
                            vals = {};
                            if (rec.$created)
                                vals = {
                                    action: 'CREATE',
                                    values: this._getModified(rec.$modifiedData)
                                };
                            else if (rec.$modified) {
                                vals = {
                                    action: 'UPDATE',
                                    values: this._getModified(rec.$modifiedData)
                                };
                                vals.values.id = rec.id;
                            }
                            else
                                continue;
                            res.push(vals);
                        }
                return res;
            }
            _getModified(data) {
                let res = {};
                if (data)
                    for (let [k, v] of Object.entries(data))
                        if (v instanceof Katrid.Data.SubRecords) {
                            res[k] = this._getNested(v);
                        }
                        else
                            res[k] = v;
                return res;
            }
            getModifiedData(form, element, record) {
                let data = {};
                if (record.$modified)
                    jQuery.extend(data, this._getModified(record.$modifiedData));
                if (this.record.id)
                    data['id'] = record.id;
                return data;
            }
            get(options) {
                let id = options.id;
                let timeout = options.timeout;
                let index = options.index;
                this._clearTimeout();
                this.state = DataSourceState.loading;
                this.loadingRecord = true;
                return new Promise((resolve, reject) => {
                    let _get = () => {
                        let controller = new AbortController();
                        this._pendingPromises.push(controller);
                        let fields;
                        if (this.fields)
                            fields = Object.keys(this.fields);
                        return this.model.service.getById(id, { fields, signal: controller.signal })
                            .catch((err) => {
                            if (err.name === 'AbortError')
                                return reject();
                            return reject(err);
                        })
                            .then((res) => {
                            if (!res)
                                return;
                            if (this.state === DataSourceState.loading)
                                this.state = DataSourceState.browsing;
                            else if (this.state === DataSourceState.inserting)
                                return;
                            if (Array.isArray(res.data))
                                this.record = res.data[0];
                            else if (res.data)
                                this.record = res.data;
                            else
                                return;
                            this._record.$loaded = true;
                            if (index !== false)
                                this._records[index] = this.record;
                            return resolve(this.record);
                        })
                            .finally(() => {
                            this.loadingRecord = false;
                        });
                    };
                    if (!timeout && !this.requestInterval)
                        return _get();
                    else
                        this.pendingTimeout = setTimeout(_get, timeout || this.requestInterval);
                });
            }
            async insert(loadDefaults = true, defaultValues, kwargs) {
                await Promise.all(this._pendingPromises);
                this._clearTimeout();
                for (let child of this.children)
                    child._clearTimeout();
                let rec = this.model.newRecord(null, this);
                let oldRecs = this._records;
                this.record = rec;
                this._records = oldRecs;
                let res;
                // clear nested data
                for (let child of this.children)
                    child.vm.records = [];
                // check if load defaults is needed
                if (loadDefaults) {
                    if (!kwargs)
                        kwargs = {};
                    kwargs.context = this.context;
                    // load default fields values with optional kwargs
                    let controller = new AbortController();
                    this._pendingPromises.push(controller);
                    res = await this.model.service.getDefaults(kwargs, { signal: controller.signal });
                }
                this.state = DataSourceState.inserting;
                this.record['$str'] = Katrid.i18n.gettext('(New)');
                let defaults = {};
                if (this.masterSource && this.field && this.field.defaultValue)
                    Object.assign(defaults, this.field.defaultValue);
                for (let v of Object.values(this.fields))
                    if (v.defaultValue)
                        defaults[v.name] = v.defaultValue;
                if (this.defaultValues)
                    Object.assign(defaults, this.defaultValues);
                if (res)
                    Object.assign(defaults, res);
                if (defaultValues)
                    Object.assign(defaults, defaultValues);
                // eval functions values
                for (let [k, v] of Object.entries(defaults))
                    if (typeof v === "function") {
                        v = v(defaults, this);
                        if (v !== undefined)
                            defaults[k] = v;
                    }
                this.setValues(defaults);
                return this.record;
            }
            setValues(values, record) {
                if (!record)
                    record = this.record;
                Object.entries(values).forEach(([k, v]) => {
                    let fld = this.fields[k];
                    if (fld) {
                        fld.setValue(record, v, this);
                    }
                    else
                        record[k] = v;
                });
            }
            edit() {
                this.state = DataSourceState.editing;
            }
            toClientValue(attr, value) {
                const field = this.scope.view.fields[attr];
                if (field) {
                    if (field.type === 'DateTimeField') {
                        value = new Date(value);
                    }
                }
                return value;
            }
            fieldByName(fieldName) {
                return this.fields[fieldName];
            }
            set state(state) {
                // Clear modified fields information
                let changing = this.changing;
                this._modifiedFields = [];
                this._state = state;
                this.inserting = state === DataSourceState.inserting;
                this.editing = state === DataSourceState.editing;
                this.loading = state === DataSourceState.loading;
                this.changing = [DataSourceState.editing, DataSourceState.inserting].includes(this.state);
                if (this.stateChangeCallback)
                    this.stateChangeCallback(state);
                if (changing && this.$form?.dirty)
                    this.$form.reset();
                // if (this.scope)
                // this.scope.$emit('dataStateChange', this);
            }
            get browsing() {
                return this._state === DataSourceState.browsing;
            }
            childByName(fieldName) {
                for (let child of this.children) {
                    if (child.field.name === fieldName)
                        return child;
                }
            }
            get state() {
                return this._state;
            }
            get record() {
                return this._record;
            }
            set recordId(value) {
                this._recordId = value;
                // this.action.recordId = value;
            }
            get recordId() {
                return this._recordId;
            }
            set record(rec) {
                if (!(rec instanceof Data.DataRecord) && (typeof rec === 'object')) {
                    rec = this.model.fromObject(rec, this);
                }
                // Track field changes
                if (rec) {
                    // if (rec.$record.dataSource !== this)
                    //   rec.$record.dataSource = this;
                    if (this.vm) {
                        this.vm.record = rec;
                        // get proxy record
                        rec = this.vm.record;
                    }
                    if (this.dataCallback)
                        this.dataCallback({ record: rec });
                    this._record = rec;
                    this.recordId = rec.id;
                    this._pendingChanges = false;
                    // if (this.action && this.action.view?.actionView)
                    //   this.action.view.actionView.dispatchEvent(new CustomEvent('recordLoaded', {'detail': {record: rec}}));
                }
                this.childrenNotification(rec);
            }
            setRecord(obj) {
                obj = this._createRecord(obj);
                return obj;
            }
            set records(recs) {
                this._records = recs;
                // if (this.vm)
                //   this.vm.records = recs;
                if (this.dataCallback)
                    this.dataCallback({ records: recs });
            }
            get records() {
                return this._records;
            }
            next() {
                return this.moveBy(1);
            }
            prior() {
                return this.moveBy(-1);
            }
            nextPage() {
                let p = this.recordCount / this.pageLimit;
                if (Math.floor(p)) {
                    p++;
                }
                console.log('rec count', this.recordCount, this.pageLimit, p);
                if (p > (this.pageIndex + 1)) {
                    this.pageIndex++;
                }
            }
            prevPage() {
                if (this.pageIndex > 1) {
                    this.pageIndex--;
                }
            }
            set recordIndex(index) {
                // get the record from the record index
                this._recordIndex = index;
                let rec = this._records[index];
                this.record = rec;
                if (rec?.id) {
                    if (this.action)
                        this.action.changeUrl('id', this.recordId);
                    // load record
                    this.get(rec.id);
                    // set new id on browser address
                }
            }
            get recordIndex() {
                return this._recordIndex;
            }
            addRecord(rec) {
                let scope = this.vm;
                let record = this.model.newRecord();
                if (!(scope.modelValue))
                    scope.$parent.record[this.field.name] = [];
                scope.modelValue.push(record);
                this._record = record;
                this.setValues(rec);
                this._record = null;
                // for (let [k, v] of Object.entries(rec))
                //   record[k] = v;
                // this.parent.record.$record.addChild(record.$record);
                // if (!this.parent.record[this.field.name])
                //   this.parent.record[this.field.name] = [];
                // this.parent.record[this.field.name].push(record);
            }
            async expandGroup(index, row) {
                let params = {};
                if (this._params)
                    Object.assign(params, this._params);
                if (row.$params)
                    Object.assign(params, row.$params);
                if (row.$level === (this.groups.length - 1)) {
                    let res = await this.model.service.search({ params });
                    if (res.data) {
                        row.$children = res.data;
                        this.vm.groups.splice.apply(this.vm.groups, [index + 1, 0].concat(res.data));
                    }
                    this._records = this._chain();
                }
                else {
                    // expand next group level
                    let rows = await this._loadGroup(this.groups, row.$level + 1, this._params, row);
                    row.$children = rows;
                    this.vm.groups.splice.apply(this.vm.groups, [index + 1, 0].concat(rows));
                }
            }
            collapseGroup(index, row) {
                let collapse = (index, row) => {
                    if (row.$children && row.$children.length && row.$level !== (this.groups.length - 1))
                        row.$children.map((obj) => collapse(this.vm.groups.indexOf(obj), obj));
                    if (row.$children && row.$children.length)
                        this.vm.groups.splice(index + 1, row.$children.length);
                    row.$children = [];
                };
                collapse(index, row);
                this._records = this._chain();
            }
            _chain() {
                let records = [];
                for (let obj of this.vm.groups)
                    if (obj.$hasChildren && obj.$expanded && obj.$children.length)
                        records = records.concat(obj.$children);
                let n = 0;
                for (let rec of records)
                    rec['$index'] = n++;
                return records;
            }
            _applyResponse(res) {
                if (res?.value)
                    this.setValues(res.value);
            }
            async dispatchEvent(name, ...args) {
                let res = await this.model.service.rpc(name, ...args);
                this._applyResponse(res);
            }
            open() {
                return this.search({}, 1);
            }
            get parent() {
                return this.masterSource;
            }
            set parent(value) {
                this._masterSource = value;
                if (value)
                    value.children.push(this);
            }
            $setDirty(field) {
                return;
                let form = this.scope.form;
                if (form) {
                    let control = form[field];
                    if (control)
                        control.$setDirty();
                }
                else if (this.action)
                    this.action.setDirty(field);
            }
            destroyChildren() {
                for (let child of this.children)
                    child.scope.$destroy();
                this.children = [];
            }
            childrenNotification(record) {
                for (let child of this.children)
                    child.parentNotification(record);
            }
            async parentNotification(parentRecord) {
                this._clearTimeout();
                // exit the function if the parent record is new
                if (!parentRecord || (parentRecord.$state === Data.RecordState.created))
                    return;
                this.state = DataSourceState.loading;
                this.pendingTimeout = setTimeout(async () => {
                    if (parentRecord.id != null) {
                        let data = {};
                        data[this.field.info.field] = parentRecord.id;
                        await this.getFieldChoices(data);
                        let records = this.records;
                        // if (this.vm)
                        //   this.vm.records = res.data;
                        parentRecord[this.field.name] = records;
                    }
                    else {
                        parentRecord[this.field.name] = [];
                    }
                    this.state = Katrid.Data.DataSourceState.browsing;
                }, this.requestInterval);
            }
            destroy() {
                if (this._masterSource)
                    this._masterSource.children.splice(this._masterSource.children.indexOf(this), 1);
            }
            /**
             * Save record changes to memory
             * @param validate
             * @param browsing
             */
            flush(validate = true, browsing = true) {
                if (validate)
                    this.validate();
                // apply changes to the active record instance
                // save record into memory
                this.record.$flush();
                // change the datasource state
                if (browsing)
                    this.state = DataSourceState.browsing;
                // flush children
                // for (let child of this.children)
                //   child.flush();
                return this.record;
            }
            discardChanges() {
                // load the latest flushed record
                this.record.$discard();
            }
            encodeObject(obj) {
                if (_.isArray(obj))
                    return obj.map((v) => this.encodeObject(v));
                else if (_.isObject(obj)) {
                    let r = {};
                    for (let [k, v] of Object.entries(obj))
                        if (!k.startsWith('$'))
                            r[k] = this.encodeObject(v);
                    return r;
                }
                else
                    return obj;
            }
            /**
             * Prepare a record to be sent by encode each available field
             * @param dataSource
             * @param rec
             * @protected
             */
            static encodeRecord(dataSource, rec) {
                let prepared = {};
                for (let fieldName of Object.keys(rec)) {
                    let f = dataSource.fields[fieldName];
                    prepared[fieldName] = f ? f.toJSON(rec[fieldName]) : prepared[fieldName];
                }
                return prepared;
            }
            /**
             * Send field change notification to server
             * @param field
             * @param newValue
             * @param record
             */
            $onFieldChange(field, newValue, record) {
                if (field.name === this._lastFieldName)
                    clearTimeout(this.pendingTimeout);
                this._lastFieldName = field.name;
                this.pendingTimeout = setTimeout(() => {
                    if (!this._fieldChanging)
                        this._fieldChanging = true;
                    try {
                        let rec = this.encode(record);
                        // rec[field.name] = field.toJSON(newValue);
                        // encode parent record
                        if (this.parent)
                            rec[this.field.info.field] = this.parent.encode(this.parent.record);
                        // rec[this.field.info.field] = this.encodeObject(this.parent.record.$record);
                        this.dispatchEvent('admin_on_field_change', [field.name, rec]);
                    }
                    finally {
                        this._fieldChanging = false;
                    }
                }, 10);
            }
            /**
             * Encode data to be sent on field changed
             * @param record
             */
            encode(record) {
                let res = {};
                for (let [k, v] of Object.entries(record.$data)) {
                    let f = this.model.fields[k];
                    if (!f)
                        continue;
                    // avoid circular reference error
                    if (!k.startsWith('$') && !(f instanceof Data.OneToManyField))
                        res[k] = f.toJSON(v);
                }
                return res;
            }
        }
        Data.DataSource = DataSource;
        class SearchRequest {
            constructor(fn) {
                this.canceled = false;
                this.fn = fn;
            }
        }
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        Data.emptyText = '--';
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class Model {
            constructor(info) {
                /** Model records is readonly */
                this.readonly = false;
                this.name = info.name;
                if (info.fields)
                    this.fields = Katrid.Data.Fields.fromArray(info.fields);
                else
                    this.fields = {};
                this.readonly = info.readonly === true;
                for (let [k, field] of Object.entries(this.fields))
                    field.name = k;
            }
            get recordClass() {
                if (!this._recordClass) {
                    // we need to detect record changes
                    let me = this;
                    class RecordProxy extends Data.DataRecord {
                    }
                    RecordProxy.$model = me;
                    if (!this.readonly)
                        for (let [k, field] of Object.entries(this.fields)) {
                            Object.defineProperty(RecordProxy.prototype, k, {
                                get() {
                                    return this.$data[k];
                                },
                                set(value) {
                                    this.$dirty = true;
                                    if (!this.$pristine)
                                        this.$pristine = {};
                                    if (!this.$transient)
                                        this.$transient = {};
                                    // store the old value
                                    if (!(k in this.$pristine))
                                        this.$pristine[k] = this.$data[k];
                                    if (!(k in this.$transient))
                                        this.$transient[k] = this.$data[k];
                                    // save the new value
                                    this.$data[k] = value;
                                    if (field.onChange && me.onFieldChange)
                                        me.onFieldChange(field, value);
                                }
                            });
                        }
                    this._recordClass = RecordProxy;
                }
                return this._recordClass;
            }
            get service() {
                if (!this._service)
                    this._service = new Katrid.Services.ModelService(this.name);
                return this._service;
            }
            newRecord(data, datasource) {
                let rec = new this.recordClass();
                rec.$state = Data.RecordState.created;
                if (data) {
                    Object.entries(data).forEach(([k, v]) => {
                        let fld = this.fields[k];
                        if (fld) {
                            fld.setValue(rec, v);
                        }
                        else
                            rec[k] = v;
                    });
                }
                if (datasource.parent?.record) {
                    rec.$parent = datasource.parent.record;
                    rec.$parentField = datasource.field?.name;
                }
                return rec;
            }
            fromObject(obj, datasource) {
                let rec = new this.recordClass(obj);
                rec.$state = Data.RecordState.unmodified;
                if (datasource?.parent) {
                    // link to parent record
                    rec.$parent = datasource.parent.record;
                    rec.$parentField = datasource.field?.name;
                }
                return rec;
            }
            fromArray(list) {
                return list.map(obj => this.fromObject(obj));
            }
            flush(rec) {
                rec.$flush();
            }
            discard(rec) {
                rec.$discard();
            }
            /** Validates a given record */
            validate(record) {
                for (let field of Object.values(this.fields))
                    field.validate(record[field.name]);
            }
        }
        Data.Model = Model;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        let RecordState;
        (function (RecordState) {
            RecordState[RecordState["unmodified"] = 0] = "unmodified";
            RecordState[RecordState["destroyed"] = 1] = "destroyed";
            RecordState[RecordState["created"] = 2] = "created";
            RecordState[RecordState["modified"] = 3] = "modified";
        })(RecordState = Data.RecordState || (Data.RecordState = {}));
        class DataRecord {
            constructor(obj = {}) {
                // initialize DataRecord on o2m fields
                // let model = Object.getPrototypeOf(this).constructor.$model;
                // if (model?.fields)
                //   for (let f of model.fields)
                //     if ((f instanceof Katrid.Data.OneToManyField) && obj[f.name])
                //       obj[f.name]
                this.$data = obj;
                // special attrs
                if (!this.hasOwnProperty('id'))
                    this.id = obj.id;
                if (obj.record_name !== undefined)
                    this.$str = obj.record_name;
                else if (obj.$str !== undefined)
                    this.$str = obj.$str;
            }
            $flush() {
                if (!this.$pending)
                    this.$pending = {};
                if (!this.$modified)
                    this.$modified = [];
                if (this.$pristine)
                    for (let k of Object.keys(this.$pristine)) {
                        this.$pending[k] = this.$data[k];
                        if (!this.$modified.includes(k))
                            this.$modified.push(k);
                    }
                if (this.$state === RecordState.unmodified)
                    this.$state = RecordState.modified;
                this.$pristine = {};
                this.$dirty = false;
                // nested data
                if (this.$parent) {
                    if (!this.$parent.$childrenData)
                        this.$parent.$childrenData = [];
                    if (!this.$parent.$childrenData.includes(this))
                        this.$parent.$childrenData.push(this);
                }
            }
            $destroy() {
                // remove created records from pending list
                if (this.$state === RecordState.created) {
                    if (this.$parent?.$childrenData?.includes(this))
                        this.$parent.$childrenData.splice(this.$parent.$childrenData.indexOf(this), 1);
                }
                else {
                    this.$state = RecordState.destroyed;
                    this.$flush();
                }
            }
            $discard() {
                Object.assign(this.$data, this.$pristine);
                this.$pristine = {};
                this.$dirty = false;
            }
            // restore nested data to the original state
            $$discard() {
                this.$discard();
                Object.assign(this.$data, this.$transient);
                this.$pending = {};
                this.$transient = {};
            }
            $serialize() {
                let data = {};
                let model = Object.getPrototypeOf(this).constructor.$model;
                data.id = this.id;
                for (let [k, v] of Object.entries(this.$pending)) {
                    if (k.startsWith('$'))
                        continue;
                    let field = model.fields[k];
                    if (field && !(field instanceof Data.OneToManyField)) {
                        data[k] = field.toJSON(v);
                    }
                }
                if (this.$childrenData)
                    for (let child of this.$childrenData) {
                        if (!(child.$parentField in data))
                            data[child.$parentField] = [];
                        if (child.$state === RecordState.created)
                            data[child.$parentField].push({ action: 'CREATE', values: child.$serialize() });
                        else if (child.$state === RecordState.modified)
                            data[child.$parentField].push({ action: 'UPDATE', values: child.$serialize() });
                        else if (child.$state === RecordState.destroyed)
                            data[child.$parentField].push({ action: 'DESTROY', id: child.id });
                    }
                return data;
            }
            $reset() {
                this.$pending = {};
                this.$pristine = {};
                this.$dirty = false;
                this.$transient = {};
            }
        }
        Data.DataRecord = DataRecord;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class Field {
            constructor(info) {
                // view: Katrid.Forms.ModelView;
                // viewInfo: Katrid.Forms.ViewInfo;
                this._loaded = false;
                this.attrs = {};
                this.tag = 'input';
                this.visible = true;
                if ('visible' in info)
                    this.visible = info.visible;
                this.name = info.name;
                this.info = info;
                this.cssClass = info.type;
                this.caption = info.caption || info.name;
                this.helpText = this.info.help_text;
                this.required = this.info.required === true;
                this.onChange = this.info.onchange;
                this.nolabel = false;
                if (info.choices)
                    this.setChoices(info.choices);
                this.choices = info.choices;
                this.defaultValue = info.defaultValue;
                this.create();
                this.loadInfo(info);
            }
            create() {
                this.visible = true;
                this.emptyText = '--';
                this.cols = 6;
                this.readonly = false;
                this.defaultSearchLookup = '__icontains';
            }
            setChoices(choices) {
                if (Array.isArray(choices))
                    this.displayChoices = Katrid.dict(choices);
                else
                    this.displayChoices = choices;
            }
            loadInfo(info) {
                if (info.cols)
                    this.cols = info.cols;
                if ('readonly' in info)
                    this.readonly = info.readonly;
                if ('visible' in info)
                    this.visible = info.visible;
                if (info[':readonly'])
                    this.vReadonly = info[':readonly'];
                if (info.required === "")
                    this.required = true;
                else if ('required' in info)
                    this.required = info.required;
                if (info.domain)
                    this.filter = info.domain;
                if (info.filter)
                    this.filter = info.filter;
                if (info.ngMaxLength)
                    this.ngMaxLength = info.ngMaxLength;
                if (info.ngMinLength)
                    this.ngMinLength = info.ngMinLength;
                if ('widget' in info)
                    this.widget = info.widget;
                if ('nolabel' in info)
                    this.nolabel = info.nolabel ? info.nolabel : true;
            }
            get internalType() {
                return Object.getPrototypeOf(this).constructor.name;
            }
            get fieldEl() {
                return this._fieldEl;
            }
            set fieldEl(value) {
                this._fieldEl = value;
                this.setElement(value);
            }
            setElement(value) {
            }
            formLabel(formEl) {
                if (!this.attrs.nolabel) {
                    let label = document.createElement('label');
                    label.innerText = this.attrs.caption;
                    label.classList.add('form-label');
                    return label;
                }
            }
            getControlId() {
                return `k-input-${++Katrid.$hashId}`;
            }
            formControl(fieldEl) {
                let input = document.createElement(this.tag);
                input.id = this.getControlId();
                if (this.tag === 'input')
                    input.type = 'text';
                input.name = this.name;
                input.setAttribute('v-model', 'record.' + this.name);
                input.classList.add('form-field', 'form-control');
                for (let k of Object.keys(this.attrs)) {
                    if (k.includes(':'))
                        input.setAttribute(k, this.attrs[k]);
                }
                input.autocomplete = 'nope';
                input.spellcheck = false;
                if (this.attrs.required)
                    input.setAttribute('required', 'required');
                if (this.maxLength)
                    input.maxLength = this.maxLength;
                if (this.ngMaxLength)
                    input.setAttribute(':maxlength', this.ngMaxLength);
                if (this.ngMinLength)
                    input.setAttribute(':minlength', this.ngMinLength);
                if (this.attrs.nolabel === 'placeholder')
                    input.placeholder = this.caption;
                if (this.attrs.ngFieldChange || this.ngChange)
                    input.setAttribute('v-on:change', this.attrs.ngFieldChange || this.ngChange);
                return input;
            }
            getValue(value) {
                return value;
            }
            getFieldAttributes(fieldEl) {
                let res = {};
                res['readonly'] = this.readonly;
                res['required'] = this.required;
                res['caption'] = this.caption;
                res['helpText'] = this.helpText;
                for (let attr of fieldEl.attributes)
                    switch (attr.name) {
                        case 'readonly':
                            res['readonly'] = attr.value !== 'false';
                            break;
                        case 'required':
                            res['required'] = attr.value !== 'false';
                            break;
                        case 'label':
                            res['caption'] = attr.value;
                            break;
                        case 'help-text':
                            res['helpText'] = attr.value;
                            break;
                        default:
                            res[attr.name] = attr.value;
                    }
                return res;
            }
            formCreate(fieldEl) {
                let attrs = this.attrs = this.getFieldAttributes(fieldEl);
                let widget;
                if (attrs.widget || this.widget) {
                    widget = this.createWidget(attrs.widget || this.widget);
                    if (widget.renderToForm)
                        return widget.renderToForm(fieldEl);
                }
                let label = this.formLabel(fieldEl);
                let control;
                control = this.formControl(fieldEl);
                let section = document.createElement('section');
                section.classList.add('form-field-section');
                section.setAttribute('v-form-field', null);
                section.setAttribute('name', this.name);
                if (attrs['v-if'])
                    section.setAttribute('v-if', attrs['v-if']);
                if (attrs['v-show'])
                    section.setAttribute('v-show', attrs['v-show']);
                if (attrs[':class'])
                    section.setAttribute(':class', attrs[':class']);
                if (attrs[':readonly'])
                    section.setAttribute(':readonly', attrs[':readonly']);
                else if (attrs.readonly)
                    section.setAttribute('readonly', 'readonly');
                if (attrs[':required'])
                    section.setAttribute(':required', attrs[':required']);
                section.classList.add('form-group');
                if (attrs.cols)
                    section.classList.add('col-md-' + attrs.cols);
                else if (this.cols && !isNaN(this.cols))
                    section.classList.add('col-md-' + this.cols);
                else if (typeof this.cols === 'string')
                    section.classList.add(this.cols);
                if (this.cssClass)
                    section.classList.add(this.cssClass);
                if (label) {
                    let input = control;
                    if (control.tagName !== 'INPUT')
                        input = control.querySelector('input');
                    if (input?.id)
                        label.setAttribute('for', input.id);
                    else if (control?.id)
                        label.setAttribute('for', control.id);
                    section.append(label);
                }
                section.append(control);
                let spanTempl = this.formSpanTemplate();
                if (spanTempl) {
                    let span = document.createElement('div');
                    span.classList.add('form-field-readonly');
                    span.innerHTML = spanTempl;
                    section.append(span);
                }
                this.createTooltip(section);
                if (widget)
                    section = widget.afterRender(section);
                return section;
            }
            createTooltip(section) {
                if (!Katrid.settings.ui.isMobile) {
                    section.setAttribute('v-ui-tooltip', '');
                    let title = '';
                    if (this.helpText)
                        title += '<br>' + this.helpText;
                    title += '<br>Field: ' + this.name;
                    // title += `<br>Content: ' + record.${this.name} + '`;
                    if (this.model)
                        title += '<br>Model: ' + this.model;
                    section.setAttribute('data-title', title);
                    // disable ui-tooltip on mobile devices
                    // section.setAttribute('v-tooltip', function() { console.log('test')});
                    // section.addEventListener('mouseenter', () => console.log('mouse enter'));
                }
            }
            listCreate(view, fieldEl) {
                let td = document.createElement('td');
                td.innerHTML = this.listSpanTemplate();
                td.setAttribute('field-name', this.name);
                view.tRow.append(td);
                let th = document.createElement('th');
                th.innerHTML = this.listCaptionTemplate();
                if (this.cssClass) {
                    td.classList.add(this.cssClass);
                    th.classList.add(this.cssClass);
                }
                view.tHeadRow.append(th);
                // if (this.name && view.inlineEditor) {
                //   let formView = view.action.views.form;
                //   let field: Katrid.Data.Field = formView.fields[this.name];
                //   let fieldEl = (<any>view.action).formView.querySelector(`field[name=${this.name}]`);
                //   // field.assign(fieldEl);
                //   let el = field.formCreate(td);
                //   el.className = field.cssClass;
                //   td.append(el);
                // }
            }
            formSpanTemplate() {
                if (this.hasChoices)
                    return `{{ $fields['${this.name}'].displayChoices[record.${this.name}] || '${this.emptyText}' }}`;
                return `<span>{{ record.${this.name} }}</span>`;
            }
            listSpanTemplate() {
                return this.formSpanTemplate();
            }
            listCaptionTemplate() {
                return `<span class="grid-field-readonly">${this.caption}</span>`;
            }
            cardCreate() {
                // let el = this._fieldEl;
                // let view = this.view;
                // let widget = el.getAttribute('widget') || this.widget;
                // if (widget) {
                //   let r: any = document.createElement(widget + '-field');
                //   r.bind(this);
                //   this.el = r;
                //   return;
                // }
                let span = document.createElement('span');
                span.innerText = `{{ record.${this.name} }}`;
                return span;
            }
            setValue(record, value, datasource) {
                record[this.name] = value;
            }
            get hasChoices() {
                return this.info.choices && this.info.choices.length > 0;
            }
            get model() {
                return this.info.model;
            }
            get maxLength() {
                return this.info.max_length;
            }
            get type() {
                return this.info.type;
            }
            getParamTemplate() {
                return 'view.param.String';
            }
            format(value) {
                return value.toString();
            }
            getParamValue(value) {
                return value.toString();
            }
            $set(val) {
                return val;
            }
            toJSON(val) {
                return val;
            }
            createWidget(widget, fieldEl) {
                let cls = Katrid.Forms.Widgets.registry[widget];
                return new cls(this, fieldEl);
            }
            validate(value) {
                if (value === '')
                    value = null;
                let msgs = [];
                if (this.required && (value == null))
                    msgs.push(Katrid.i18n.gettext('The field cannot be empty.'));
                return msgs;
            }
            get defaultCondition() {
                return '=';
            }
            isControlVisible(condition) {
                switch (condition) {
                    case 'is null':
                        return false;
                    case 'is not null':
                        return false;
                }
                return true;
            }
            getFilterConditions() {
                return [
                    { name: '=', label: Katrid.i18n.gettext('Is equal') },
                    { name: '!=', label: Katrid.i18n.gettext('Is different'), },
                    { name: 'is not null', label: Katrid.i18n.gettext('Is defined'), input: false },
                    { name: 'is null', label: Katrid.i18n.gettext('Is not defined'), input: false },
                ];
            }
        }
        Data.Field = Field;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            Fields.registry = {
                Field: Data.Field,
            };
            /** Create a field instance from a field definition */
            function fromInfo(config, name) {
                let cls;
                if (config instanceof Katrid.Data.Field)
                    return config;
                let fieldType = config.type || 'StringField';
                if (name && !config.name)
                    config.name = name;
                if (config.choices && !(fieldType === 'ForeignKey'))
                    cls = Data.ChoiceField;
                else
                    cls = Fields.registry[fieldType] || Katrid.Data.StringField;
                return new cls(config);
            }
            Fields.fromInfo = fromInfo;
            /** Create a collection of fields from a list of fields definitions */
            function fromArray(fields) {
                let r = {};
                if (Array.isArray(fields)) {
                    let f = {};
                    fields.forEach(fld => f[fld.name] = fld);
                    fields = f;
                }
                Object.keys(fields).map((k) => r[k] = fromInfo(fields[k], k));
                return r;
            }
            Fields.fromArray = fromArray;
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
/// <reference path="index.ts"/>
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class DateField extends Data.Field {
            constructor() {
                super(...arguments);
                this.tag = 'input-date';
            }
            loadInfo(info) {
                if (!info.cols)
                    info.cols = 3;
                super.loadInfo(info);
            }
            formSpanTemplate() {
                return `{{ $filters.date(record.${this.name}, 'shortDate') || '${this.emptyText}' }}`;
            }
            create() {
                super.create();
                // this.widget = 'date';
            }
            toJSON(val) {
                return val;
            }
            getParamTemplate() {
                return 'view.param.Date';
            }
            format(value) {
                if (Katrid.isString(value))
                    return moment(value).format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
                return '';
            }
            formControl(fieldEl) {
                let div = document.createElement(this.tag);
                div.setAttribute('v-model', 'record.' + this.name);
                div.classList.add('input-group', 'date');
                div.setAttribute('date-picker', "L");
                div.innerHTML = `
      <input type="text" name="${this.name}" class="form-control form-field" inputmode="numeric">
      <label class="input-group-text btn-calendar" type="button"><i class="fa fa-calendar fa-sm"></i></label>`;
                let input = div.querySelector('input');
                if (this.attrs.required)
                    input.required = true;
                input.id = this.getControlId();
                return div;
            }
        }
        Data.DateField = DateField;
        class DateTimeField extends DateField {
            formSpanTemplate() {
                return `{{ $filters.date(record.${this.name}, 'short') || '${this.emptyText}' }}`;
            }
            create() {
                super.create();
                // this.widget = 'datetime';
            }
            formControl(fieldEl) {
                let control = super.formControl(fieldEl);
                control.setAttribute('date-picker', "L LT");
                return control;
            }
        }
        Data.DateTimeField = DateTimeField;
        class TimeField extends Data.Field {
            constructor() {
                super(...arguments);
                this.tag = 'input-time';
            }
            loadInfo(info) {
                if (!info.cols)
                    info.cols = 3;
                super.loadInfo(info);
            }
            create() {
                super.create();
                // this.widget = 'time';
            }
            formSpanTemplate() {
                return `{{ record.${this.name} || '${this.emptyText}' }}`;
            }
        }
        Data.TimeField = TimeField;
        Object.assign(Katrid.Data.Fields.registry, {
            DateField,
            DateTimeField,
            TimeField,
        });
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class StringField extends Data.Field {
            constructor(info) {
                if (!info.cols)
                    info.cols = 3;
                super(info);
            }
            getFilterConditions() {
                let ret = [
                    { name: '%', label: _.gettext('Contains'), },
                    { name: '!%', label: _.gettext('Not contains') },
                ];
                return ret.concat(super.getFilterConditions());
            }
        }
        Data.StringField = StringField;
        class ChoiceField extends Data.Field {
            formSpanTemplate() {
                return `{{ $fields.${this.name}.displayChoices[record.${this.name}] || '${this.emptyText}' }}`;
            }
            formControl(fieldEl) {
                let control = document.createElement('select');
                if (this.attrs.required)
                    control.required = true;
                control.classList.add('form-field', 'form-select');
                control.name = this.name;
                control.setAttribute('v-model', 'record.' + this.name);
                let option = document.createElement('option');
                option.setAttribute('v-for', `(name, key) in $fields.${this.name}.displayChoices`);
                option.setAttribute(':value', "key");
                option.innerText = '{{ name }}';
                control.append(option);
                control.id = this.getControlId();
                return control;
            }
        }
        Data.ChoiceField = ChoiceField;
        class PasswordField extends StringField {
            formControl() {
                let control = super.formControl();
                control.setAttribute('type', 'password');
                return control;
            }
            formSpanTemplate() {
                return '**********************';
            }
        }
        Data.PasswordField = PasswordField;
        class BooleanField extends Data.Field {
            constructor(info) {
                if (!info.cols)
                    info.cols = 3;
                super(info);
                this.nolabel = true;
            }
            formSpanTemplate() {
                return `{{ record.${this.name} == null ? '${this.emptyText}' : (record.${this.name} ? '${Katrid.i18n.gettext('yes')}' : '${Katrid.i18n.gettext('no')}') }}`;
            }
            create() {
                super.create();
                // this.widget = 'boolean';
            }
            getParamTemplate() {
                return 'view.param.Boolean';
            }
            getFilterConditions() {
                return [
                    { name: '=', label: Katrid.i18n.gettext('Is equal'), options: { 'yes': Katrid.i18n.gettext('yes'), 'no': Katrid.i18n.gettext('yes') } },
                    { name: '!=', label: Katrid.i18n.gettext('Is different') },
                    { name: 'is not null', label: Katrid.i18n.gettext('Is defined'), input: false },
                    { name: 'is null', label: Katrid.i18n.gettext('Is not defined'), input: false },
                ];
            }
            formLabel(fieldEl) {
                let label = document.createElement('label');
                label.classList.add('form-label', 'form-label-checkbox');
                let caption = this.attrs.caption;
                if (this.attrs.helpText)
                    label.innerHTML = `<span>${caption}</span>`;
                else
                    label.innerHTML = `
        <span class="checkbox-span">${caption}</span>
        <span>&nbsp;</span>`;
                return label;
            }
            formControl(fieldEl) {
                let label = document.createElement('label');
                label.classList.add('checkbox');
                let caption = this.attrs.caption || this.caption;
                if (this.helpText)
                    caption = this.helpText;
                // label.setAttribute('v-show', 'changing');
                label.innerHTML =
                    `<input type="checkbox" name="${this.name}" class="form-field form-control" v-model="record.${this.name}">${caption}<i class="fas"></i>`;
                return label;
            }
        }
        Data.BooleanField = BooleanField;
        class NumericField extends Data.Field {
            constructor(info) {
                if (!info.cols)
                    info.cols = 3;
                super(info);
            }
            create() {
                super.create();
                this.decimalPlaces = 2;
                this.tag = 'input-decimal';
            }
            setValue(record, value) {
                record[this.name] = parseFloat(value);
            }
            toJSON(val) {
                if (val && Katrid.isString(val))
                    return parseFloat(val);
                return val;
            }
            $set(val) {
                return this.toJSON(val);
            }
            formSpanTemplate() {
                return `{{ ((record.${this.name} != null) && $filters.toFixed(record.${this.name}, ${this.decimalPlaces})) || '${this.emptyText}' }}`;
            }
        }
        Data.NumericField = NumericField;
        class IntegerField extends NumericField {
            loadInfo(info) {
                if (!info.cols)
                    info.cols = 3;
                super.loadInfo(info);
            }
            create() {
                super.create();
                this.tag = 'input';
                this.decimalPlaces = 0;
            }
            formControl(fieldEl) {
                let el = super.formControl(fieldEl);
                el.setAttribute('type', 'number');
                return el;
            }
            toJSON(val) {
                if (val && Katrid.isString(val))
                    return parseInt(val);
                return val;
            }
        }
        Data.IntegerField = IntegerField;
        class FloatField extends NumericField {
        }
        Data.FloatField = FloatField;
        class DecimalField extends NumericField {
            constructor(info) {
                super(info);
                this.decimalPlaces = 2;
                if (this.info.attrs) {
                    this.decimalPlaces = this.info.attrs.decimal_places || 2;
                }
            }
            formControl(fieldEl) {
                let control = super.formControl(fieldEl);
                control.setAttribute('input-decimal', this.decimalPlaces.toString());
                control.setAttribute('inputmode', 'decimal');
                return control;
            }
            listSpanTemplate() {
                return `<span class="grid-field-readonly">{{ $filters.toFixed(record.${this.name}, 2) }}</span>`;
            }
        }
        Data.DecimalField = DecimalField;
        class TextField extends StringField {
            constructor() {
                super(...arguments);
                this.tag = 'textarea';
            }
            formControl(fieldEl) {
                let control = super.formControl(fieldEl);
                control.classList.add('form-field', 'form-control');
                control.spellcheck = true;
                return control;
            }
        }
        Data.TextField = TextField;
        class XmlField extends TextField {
        }
        Data.XmlField = XmlField;
        class JsonField extends TextField {
        }
        Data.JsonField = JsonField;
        class RadioField extends ChoiceField {
            formControl(fieldEl) {
                let label = document.createElement('div');
                // label.setAttribute('v-for', `(name, choice) in $fields.${this.name}.displayChoices`)
                label.classList.add('radio-button', 'radio-inline', 'form-field');
                let css = fieldEl.getAttribute('class');
                if (css)
                    label.classList.add(...css.split(' '));
                label.id = this.getControlId();
                let i = 0;
                for (let [k, text] of Object.entries(this.displayChoices)) {
                    i++;
                    let input = document.createElement('input');
                    let id = `${label.id}-${i}`;
                    input.setAttribute('id', id);
                    input.setAttribute('type', 'radio');
                    input.setAttribute('v-model', `record.${this.name}`);
                    input.setAttribute('value', k);
                    let txt = document.createElement('label');
                    txt.innerText = text;
                    txt.setAttribute('for', id);
                    label.appendChild(input);
                    label.appendChild(txt);
                }
                return label;
            }
        }
        Data.RadioField = RadioField;
        Object.assign(Katrid.Data.Fields.registry, {
            StringField,
            BooleanField,
            DecimalField,
            NumericField,
            IntegerField,
            ChoiceField,
            TextField,
            XmlField,
            JsonField,
            RadioField,
            radio: RadioField,
        });
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class ForeignKey extends Data.Field {
            constructor() {
                super(...arguments);
                this.tag = 'field-autocomplete';
            }
            formControl(fieldEl) {
                let control = document.createElement(this.tag);
                control.setAttribute('v-model', 'record.' + this.name);
                if ('allow-open' in this.attrs)
                    control.setAttribute('allow-open', null);
                if (this.attrs['v-on:change'])
                    control.setAttribute('v-on:change', this.attrs['v-on:change']);
                control.setAttribute('name', this.name);
                if (this.attrs.required)
                    control.setAttribute('required', this.attrs.required);
                if (this.attrs.nolabel === 'placeholder')
                    control.setAttribute('placeholder', this.caption);
                control.classList.add('input-dropdown', 'form-field');
                if (this.filter)
                    control.setAttribute(':filter', this.filter);
                let input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-field';
                input.spellcheck = false;
                input.autocomplete = 'off';
                input.id = this.getControlId();
                control.append(input);
                return control;
            }
            listSpanTemplate() {
                return `<a v-show="record.${this.name}" class="grid-field-readonly">{{ $filters.foreignKey(record.${this.name}) }}</a><span v-show="!record.${this.name}">${this.emptyText}</span>`;
            }
            formSpanTemplate() {
                if (Katrid.webApp?.currentMenu)
                    return `<a v-show="record.${this.name}" :href="'#/app/?menu_id=${Katrid.webApp.currentMenu.id}&model=${this.model}&view_type=form&id=' + $filters.pk(record.${this.name})" v-on:click.prevent="openRelatedObject(record.${this.name}, $fields.${this.name}, $event)">{{ $filters.foreignKey(record.${this.name}) }} </a><span v-show="!record.${this.name}">${this.emptyText}</span>`;
                return `<a v-show="record.${this.name}" href="#">{{ $filters.foreignKey(record.${this.name}) }} </a><span v-show="!record.${this.name}">${this.emptyText}</span>`;
            }
            create() {
                super.create();
                // this.widget = 'foreignkey';
            }
            setChoices(choices) {
                this.choices = choices;
            }
            getParamTemplate() {
                return 'view.param.ForeignKey';
            }
            getParamValue(value) {
                if (_.isArray(value))
                    return value[0];
                else if (_.isObject(value))
                    return value.id;
                return value;
            }
            format(value) {
                if (Array.isArray(value))
                    return value[1];
                else if (Katrid.isObject(value))
                    return value.text;
                return value;
            }
            /**
             * Returns the id attribute from the Object value
             * @param {Object} val - The value to be prepared
             */
            toJSON(val) {
                if (Array.isArray(val))
                    return val[0];
                if (val?.id)
                    return val.id;
                return val;
            }
            setValue(record, value) {
                if (Array.isArray(value))
                    record[this.name] = { id: value[0], text: value[1] };
                else
                    record[this.name] = value;
                return value;
            }
            getLabelById(svc, id) {
                return svc.getFieldChoices({
                    field: this.name, term: '', kwargs: { ids: [id] }
                });
            }
            createTooltip(section) {
                if (!Katrid.settings.ui.isMobile) {
                    super.createTooltip(section);
                    section.setAttribute('v-ui-tooltip', '$fields.' + this.name);
                    section.setAttribute(':data-tooltip', `record && record.${this.name} && (record.${this.name}.text + '<br> (ID: ' + record.${this.name}.id + ')')`);
                }
            }
        }
        Data.ForeignKey = ForeignKey;
        Katrid.filter('foreignKey', value => value?.text);
        Katrid.filter('pk', value => value?.id);
        Katrid.Data.Fields.registry.ForeignKey = ForeignKey;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class ImageField extends Data.Field {
            constructor(info) {
                super(info);
                this.noImageUrl = '/static/admin/assets/img/no-image.png';
            }
            get vSrc() {
                let ngSrc = this.attrs.ngEmptyImage || (this.attrs.emptyImage && (`'${this.attrs.emptyImage}`)) || `'${this.noImageUrl}'`;
                ngSrc = `record.${this.name} || ${ngSrc}`;
                return ngSrc;
            }
            formSpanTemplate() {
                return '';
            }
            formControl() {
                let div = document.createElement('image-field');
                div.setAttribute('v-model', 'record.' + this.name);
                div.innerHTML = `<img :src="${this.vSrc}">        
<div class="text-right image-box-buttons">
          <button class="btn btn-default" type="button" title="${Katrid.i18n.gettext('Change')}"
                  onclick="$(this).closest('.image-box').find('input').trigger('click')">
            <i class="fa fa-pen"></i>
          </button>
          <button class="btn btn-default" type="button" title="${Katrid.i18n.gettext('Clear')}" ng-click="record.${this.name} = null">
            <i class="fa fa-trash"></i>
          </button>
        </div>
`;
                return div;
            }
        }
        Data.ImageField = ImageField;
        Katrid.Data.Fields.registry.ImageField = ImageField;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class ManyToManyField extends Data.ForeignKey {
            constructor() {
                super(...arguments);
                this.tag = 'field-tags';
            }
            toJSON(val) {
                if (_.isArray(val))
                    return val.map(obj => obj.id);
                else if (_.isString(val))
                    val = val.split(',');
                return val;
            }
            formCreate(view) {
                let section = super.formCreate(view);
                section.classList.add('ManyToManyField');
                return section;
            }
            formSpanTemplate() {
                return `<div class="input-tags"><label class="badge badge-dark" v-for="tag in record.${this.name}">{{tag.text}}</label></div>`;
            }
        }
        Data.ManyToManyField = ManyToManyField;
        Katrid.Data.Fields.registry.ManyToManyField = ManyToManyField;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class OneToManyField extends Data.Field {
            constructor() {
                super(...arguments);
                this.viewMode = 'list';
            }
            create() {
                super.create();
                this.cols = 12;
            }
            get field() {
                return this.info.field;
            }
            loadInfo(info) {
                super.loadInfo(info);
                // views information are already specified
                if (info.views)
                    this._loaded = true;
                if (info['view-mode'])
                    this.viewMode = info['view-mode'];
            }
            async loadViews(fieldEl) {
                if (this._loaded)
                    return;
                this._loaded = true;
                console.log('load pending views');
                // render component
                let preLoadedViews = {};
                // detect pre loaded views
                let template = this.fieldEl.querySelector('template');
                if (template)
                    for (let child of template.content.children)
                        preLoadedViews[child.tagName.toLowerCase()] = child.cloneNode(true);
                let model = new Katrid.Services.ModelService(this.info.model);
                let viewModes = { form: null };
                viewModes[this.viewMode] = null;
                // load views on server side
                let res = await model.loadViews({ views: viewModes });
                this.views = res.views;
                this.fields = res.fields;
                // find rel field
                Object.values(res.views).forEach((viewInfo) => {
                    let relField = viewInfo.info.fields[this.info.field];
                    // hide the rel field
                    if (relField) {
                        relField.required = false;
                        relField.visible = false;
                    }
                });
                // replace by preloaded views
                for (let k of Object.keys(preLoadedViews)) {
                    if (!(k in res.views))
                        res.views[k] = { fields: res.fields };
                    res.views[k].content = preLoadedViews[k];
                    res.views[k].fields = res.fields;
                }
            }
            setElement(el) {
                if (el && el.hasAttribute('allow-paste'))
                    this.pasteAllowed = true;
            }
            setValue(record, value, datasource) {
                let child = datasource.childByName(this.name);
                if (value && value instanceof Array) {
                    value.map(obj => {
                        if (obj.action === 'CLEAR') {
                            for (let rec of child.vm.records)
                                rec.$delete();
                            child.vm.modelValue = [];
                            // record.$record.dataSource.record[this.name] = [];
                        }
                        else if (obj.action === 'CREATE') {
                            if (!record[this.name])
                                record[this.name] = [];
                            let rec = child.model.newRecord(obj.values, child);
                            rec.$flush();
                            record[this.name].push(rec);
                        }
                    });
                }
            }
            formSpanTemplate() {
                return '';
            }
            formControl() {
                let grid = document.createElement('onetomany-field');
                grid.setAttribute('name', this.name);
                grid.setAttribute('v-model', 'record.' + this.name);
                if (this.attrs['v-on:change'])
                    grid.setAttribute('v-on:change', this.attrs['v-on:change']);
                return grid;
            }
            createTooltip(section) {
                console.log('create toolip');
            }
            getView(mode = 'list') {
                if (this.views) {
                    let info = this.views[mode];
                    let view = new Katrid.Forms.Views.registry[mode]({ name: this.model, viewInfo: info, template: info.info.template });
                    console.log('get cached view', mode, info);
                    return view;
                }
                else {
                    if (mode === 'list') {
                        console.log('list', this.info.views.list);
                        let table = new Katrid.Forms.TableView({
                            model: new Katrid.Data.Model({ name: this.model, fields: this.info.views.list.fields }),
                        });
                        table.allowGrouping = false;
                        return table;
                    }
                    else if (mode === 'form') {
                        let info = this.info.views.form || this.info.views.list;
                        console.log('fields', info);
                        return new Katrid.Forms.FormView({ model: new Katrid.Data.Model({ name: this.model, fields: info.fields }) });
                    }
                }
            }
        }
        Data.OneToManyField = OneToManyField;
        Katrid.Data.Fields.registry.OneToManyField = OneToManyField;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class MenuItem {
            constructor(menu, text = null) {
                this.menu = menu;
                this.text = text;
                if (text === '-') {
                    this.el = document.createElement('div');
                    this.el.classList.add('dropdown-divider');
                }
                else {
                    this.el = document.createElement('a');
                    this.el.classList.add('dropdown-item');
                }
                this.el.innerHTML = text;
            }
            addEventListener(type, listener, options) {
                return this.el.addEventListener(type, listener, options);
            }
            get index() {
                return this.menu.items.indexOf(this);
            }
        }
        Forms.MenuItem = MenuItem;
        class MenuItemSeparator extends MenuItem {
            constructor(menu) {
                super(menu, '-');
            }
        }
        Forms.MenuItemSeparator = MenuItemSeparator;
        class ContextMenu {
            constructor(container = null) {
                this.container = container;
                this.items = [];
                if (!container)
                    this.container = document.body;
            }
            add(item, clickCallback) {
                let menuItem = this.insert(-1, item);
                if (menuItem.text !== '-')
                    menuItem.addEventListener('mouseup', event => {
                        this.close();
                        if (clickCallback)
                            clickCallback(event, menuItem);
                    });
                menuItem.addEventListener('mousedown', event => event.stopPropagation());
                return menuItem;
            }
            insert(index, item) {
                let menuItem;
                if (Katrid.isString(item))
                    menuItem = new MenuItem(this, item);
                else if (item instanceof MenuItem)
                    menuItem = item;
                if (index === -1)
                    this.items.push(menuItem);
                else
                    this.items.splice(index, 0, menuItem);
                return menuItem;
            }
            addSeparator() {
                this.items.push(new MenuItemSeparator(this));
            }
            destroyElement() {
                if (this.el)
                    this.el.remove();
            }
            createElement() {
                this.el = document.createElement('div');
                this.el.classList.add('dropdown-menu', 'context-menu');
                for (let item of this.items)
                    this.el.append(item.el);
            }
            show(x, y, target = null) {
                // create menu element
                this.destroyElement();
                this.createElement();
                // set menu position
                this.el.style.left = x + 'px';
                this.el.style.top = y + 'px';
                this.target = target;
                this._visible = true;
                this._eventHook = event => {
                    if (event.target.parentElement !== this.el)
                        this.close();
                };
                this._eventKeyDownHook = event => {
                    if (event.keyCode === 27)
                        this.close();
                };
                document.addEventListener('mousedown', this._eventHook);
                document.addEventListener('wheel', this._eventHook);
                document.addEventListener('keydown', this._eventKeyDownHook);
                document.body.append(this.el);
                $(this.el).show();
            }
            close() {
                // unhook event
                document.removeEventListener('mousedown', this._eventHook);
                document.removeEventListener('wheel', this._eventHook);
                document.removeEventListener('keydown', this._eventKeyDownHook);
                // remove element
                this.el.remove();
                this._eventHook = null;
            }
            get visible() {
                return this._visible;
            }
        }
        Forms.ContextMenu = ContextMenu;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        let customTagRegistry = {};
        // CustomTag is a tag shortcut to simplify the view definition
        class CustomTag {
            constructor(view, template) {
                this.view = view;
                let elements = template.querySelectorAll(this.selector());
                if (elements.length)
                    this.prepare(elements);
            }
            static render(view, template) {
                for (let [selector, customTag] of Object.entries(customTagRegistry)) {
                    if (customTag.prototype instanceof CustomTag) {
                        let cls = customTag;
                        new cls(view, template);
                    }
                    else if (customTag instanceof Function)
                        template.querySelectorAll(selector).forEach((el) => customTag.call(view, el));
                }
            }
            selector() {
                return;
            }
            prepare(elements) {
            }
            assign(source, dest) {
                dest.innerHTML = source.innerHTML;
                for (let attr of source.attributes)
                    dest.setAttribute(attr.name, attr.value);
            }
        }
        Forms.CustomTag = CustomTag;
        class ActionsTag extends CustomTag {
            prepare(elements) {
                let atts = this.view.element.querySelector('.btn-toolbar');
                for (let actions of elements.values()) {
                    if (!this.view.toolbarVisible) {
                        actions.remove();
                        continue;
                    }
                    let actionsButton;
                    let name = actions.getAttribute('name');
                    let btn;
                    if (name)
                        btn = atts.querySelector(`.btn-actions[name=${name}]`);
                    let dropdownMenu;
                    if (btn) {
                        // dropdown already is default
                        actionsButton = btn.parentElement;
                    }
                    else {
                        actionsButton = document.createElement('div');
                        actionsButton.classList.add('btn-group');
                        actionsButton.innerHTML = '<div class="dropdown"><button type="button" class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown"></button><div class="dropdown-menu custom-actions"></div></div>';
                        // add the left html content
                        btn = actionsButton.querySelector('button');
                        let caption = actions.getAttribute('caption');
                        if (caption)
                            btn.innerHTML = caption + ' ';
                        // add the new dropdown
                        atts.append(actionsButton);
                    }
                    dropdownMenu = actionsButton.querySelector('.dropdown-menu');
                    // conditional display for each type of view
                    let vShow = actions.getAttribute('v-show');
                    if (vShow)
                        actionsButton.setAttribute('v-show', vShow);
                    let vIf = actions.getAttribute('v-if');
                    if (vIf)
                        actionsButton.setAttribute('v-if', vIf);
                    for (let action of actions.querySelectorAll('action')) {
                        // add the item as a dropdown item and remove fragment from dom
                        dropdownMenu.append(this.prepareAction(action));
                        action.remove();
                    }
                }
            }
            selector() {
                return 'actions';
            }
            prepareAction(action) {
                let el = document.createElement('a');
                // add anchor as action-link Web Component
                el.classList.add('dropdown-item');
                this.assign(action, el);
                if (el.hasAttribute('data-action'))
                    el.setAttribute('v-on:click', `action.onActionLink('${action.getAttribute('data-action')}', '${action.getAttribute('data-action-type')}')`);
                else if ((el.getAttribute('type') === 'object') && (el.hasAttribute('name')))
                    el.setAttribute('v-on:click', `formButtonClick({params: {id: record.id}, method: '${el.getAttribute('name')}'})`);
                if (action.hasAttribute('name'))
                    el.setAttribute('name', action.getAttribute('name'));
                if (action.hasAttribute('id'))
                    el.setAttribute('id', action.id);
                if (action.hasAttribute('caption'))
                    el.innerHTML = action.getAttribute('caption');
                return el;
            }
        }
        Forms.ActionsTag = ActionsTag;
        function registerCustomTag(selector, customTag) {
            customTagRegistry[selector] = customTag;
        }
        Forms.registerCustomTag = registerCustomTag;
        // initializes known custom tags
        registerCustomTag(':scope > actions', ActionsTag);
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Dialogs;
        (function (Dialogs) {
            if (window['toastr'])
                toastr['options'] = {
                    'closeButton': true,
                    'progressBar': true,
                    'timeOut': 60000,
                };
            class Alerts {
                static success(msg) {
                    return toastr['success'](msg);
                }
                static warn(msg) {
                    return toastr['warning'](msg);
                }
                static info(msg) {
                    return toastr['info'](msg);
                }
                static error(msg) {
                    return toastr['error'](msg);
                }
            }
            Dialogs.Alerts = Alerts;
            class WaitDialog {
                static show() {
                    $('#loading-msg').show();
                }
                static hide() {
                    $('#loading-msg').hide();
                }
            }
            Dialogs.WaitDialog = WaitDialog;
            class ExceptionDialog {
                static show(title, msg, traceback) {
                    let modal = document.createElement('div');
                    modal.classList.add('modal');
                    modal.tabIndex = -1;
                    modal.setAttribute('role', 'dialog');
                    modal.innerHTML = `<div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title text-danger"><i class="fa fa-fw fa-bug text-danger"></i> ${title}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
      ${msg || ''}
      </div>
      <div class="modal-footer">
        <button type="button" name="btn-cancel" class="btn btn-outline-secondary" data-bs-dismiss="modal">${Katrid.i18n.gettext('Close')}</button>
      </div>
    </div>
  </div>`;
                    $(modal).modal();
                }
            }
            Dialogs.ExceptionDialog = ExceptionDialog;
            function toast(message) {
                let el = $(`<div role="alert" aria-live="assertive" aria-atomic="true" class="toast" data-autohide="false">
  <div class="toast-header">
    <img class="rounded mr-2">
    <strong class="mr-auto">Bootstrap</strong>
    <small>11 mins ago</small>
    <button type="button" class="ml-2 mb-1 close" data-bs-dismiss="toast" aria-label="Close">
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
  <div class="toast-body">
    Hello, world! This is a toast message.
  </div>
</div>`);
                console.log(el[0]);
                document.body.append(el[0]);
                el.toast({ autohide: false });
            }
            Dialogs.toast = toast;
            function alert(message, title, icon) {
                if (Katrid.isString(message))
                    Swal.fire({
                        title,
                        text: message,
                        icon,
                    });
                else
                    Swal.fire(message);
            }
            Dialogs.alert = alert;
            function createModal(title, content, buttons) {
                let modal = document.createElement('div');
                modal.classList.add('modal');
                modal.tabIndex = -1;
                // modal.setAttribute('role', 'dialog');
                let buttonsTempl = `
        <button type="button" name="btn-ok" class="btn btn-primary">OK</button>
        <button type="button" name="btn-cancel" class="btn btn-secondary" data-bs-dismiss="modal">${Katrid.i18n.gettext('Cancel')}</button>
    `;
                if (buttons) {
                    buttonsTempl = '';
                    for (let button of buttons) {
                        if (typeof button === 'string')
                            buttonsTempl += getButtonFromName(button);
                    }
                }
                modal.innerHTML = `<div class="modal-dialog modal-xl modal-fullscreen-md-down" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
      ${content || ''}
      </div>
      <div class="modal-footer">
      ${buttonsTempl}
      </div>
    </div>
  </div>`;
                return modal;
            }
            Dialogs.createModal = createModal;
            function getButtonFromName(buttonName) {
                let button = `<button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">`;
                switch (buttonName) {
                    case 'close':
                        button += Katrid.i18n.gettext('Close');
                        break;
                    case 'cancel':
                        button += Katrid.i18n.gettext('Cancel');
                        break;
                }
                button += '</button>';
                return button;
            }
        })(Dialogs = Forms.Dialogs || (Forms.Dialogs = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        /** Field bound to a form */
        class BoundField {
            constructor(name, fieldElement) {
                this.name = name;
                this.fieldElement = fieldElement;
                this._dirty = false;
                this._touched = false;
                this._valid = true;
            }
            focus() {
                this.control.focus();
            }
            get dirty() {
                return this._dirty;
            }
            set dirty(value) {
                this._dirty = value;
                if (value) {
                    this.control.classList.remove('v-pristine');
                    this.control.classList.add('v-dirty');
                }
                else {
                    this.control.classList.remove('v-dirty');
                    this.control.classList.add('v-pristine');
                }
            }
            reset() {
                if (this.dirty)
                    this.dirty = false;
                if (this.touched)
                    this.touched = false;
            }
            get touched() {
                return this._touched;
            }
            set touched(value) {
                this._touched = value;
                if (!this.control)
                    return;
                if (value) {
                    // this.form.touched = true;
                    this.control.classList.remove('v-untouched');
                    this.control.classList.add('v-touched');
                }
                else {
                    this.control.classList.remove('v-untouched');
                    this.control.classList.add('v-touched');
                }
            }
            get valid() {
                return this._valid;
            }
            set valid(value) {
                this._valid = value;
                if (value) {
                    this.control.classList.remove('v-invalid');
                    this.control.classList.add('v-valid');
                }
                else {
                    this.control.classList.remove('v-valid');
                    this.control.classList.add('v-invalid');
                }
            }
            get pristine() {
                return !this.dirty;
            }
            set pristine(value) {
                this.dirty = !value;
            }
            get invalid() {
                return !this._valid;
            }
            set invalid(value) {
                this.valid = !value;
            }
            get untouched() {
                return !this._touched;
            }
            set untouched(value) {
                this.touched = !value;
            }
        }
        Forms.BoundField = BoundField;
        class DataForm {
            constructor(el) {
                this.el = el;
                this.fields = {};
                this.touched = false;
                this.valid = true;
                this.dirty = false;
                this._loading = false;
            }
            setFieldValue(field, value) {
                let fields = this.fields[field.name];
                if (fields) {
                    for (let f of fields) {
                        f.dirty = true;
                    }
                }
                this.dirty = true;
            }
            setValid(value) {
                this.valid = value;
                if (!value)
                    for (let fields of Object.values(this.fields))
                        fields.forEach(field => field.valid = true);
            }
            reset() {
                if (this.dirty) {
                    this.dirty = false;
                    this.touched = false;
                    for (let fields of Object.values(this.fields))
                        fields.forEach(field => field.reset());
                }
            }
            setLoading(value) {
                this._loading = value;
            }
        }
        Forms.DataForm = DataForm;
        Katrid.directive('data-form', {
            mounted(el) {
                el.classList.add('v-form');
                // let form = el.$form = new DataForm(el);
                // el.querySelectorAll('.form-field-section').forEach(child => {
                //   let formField = <IFormField>child;
                //   let field = formField.$field;
                //   field.form = form;
                //   form.fields[field.name] = field;
                // });
            }
        });
        Katrid.directive('form-field', {
            mounted(el, binding, vnode) {
                // let field = el.$field = new BoundField(el.getAttribute('name'));
                // field.container = el;
                // field.control = el.querySelector('.form-control');
                // if (field.control) {
                let input;
                if (el.tagName === 'INPUT')
                    input = el;
                else
                    input = el.querySelector('input');
                // el.addEventListener('focusin', () => field.touched = true);
                if (input?.tagName === 'INPUT')
                    input.addEventListener('mouseup', () => input.select());
            }
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class ModelViewInfo {
            constructor(info) {
                this.info = info;
                this._pending = true;
                // this.info = info;
                // for (let f of info.fields)
                //
                this.fields = info.fields;
                // Object.values(this.fields).forEach(field => field.viewInfo = this);
                // this.content = info.content;
                // this.toolbar = info.toolbar;
                // this.auto_load = info.auto_load;
            }
            async loadPendingViews() {
                if (!this._pending)
                    return;
                this._pending = false;
                let templ = this.template;
                let elFields = {};
                for (let child of Array.from(templ.querySelectorAll('field'))) {
                    let name = child.getAttribute('name');
                    if (name) {
                        let field = this.fields[name];
                        if (field)
                            field.fieldEl = child;
                    }
                }
                // load pending nested views info
                await Promise.all(Object.values(this.fields)
                    .filter(field => field['loadViews'])
                    .map((field) => field.loadViews()));
            }
            get template() {
                return Katrid.html(this.info.template);
            }
        }
        Forms.ModelViewInfo = ModelViewInfo;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        function selectionSelectToggle(record) {
            record.$selected = !record.$selected;
            if (record.$selected && !this.selection.includes(record))
                this.selection.push(record);
            else if (!record.$selected && this.selection.includes(record))
                this.selection.splice(this.selection.indexOf(record), 1);
            this.selectionLength = this.selection.length;
        }
        Forms.selectionSelectToggle = selectionSelectToggle;
        function selectionToggleAll(sel) {
            let records = this.records || this.groups;
            if (sel === undefined)
                this.allSelected = !this.allSelected;
            else
                this.allSelected = sel;
            for (let rec of records)
                if (!rec.$hasChildren)
                    rec.$selected = this.allSelected;
            if (this.allSelected) {
                this.selectionLength = records.length;
                this.selection = [...records];
            }
            else {
                this.selection = [];
                this.selectionLength = 0;
            }
        }
        Forms.selectionToggleAll = selectionToggleAll;
        function tableContextMenu(event) {
            event.preventDefault();
            event.stopPropagation();
            let menu = new Forms.ContextMenu();
            menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => copyClick(event.target.closest('table')));
            if (this.field?.pasteAllowed && this.$parent.dataSource.changing)
                menu.add('<i class="fa fa-fw fa-paste"></i> Colar', (...args) => pasteClick(this));
            menu.show(event.pageX, event.pageY);
        }
        Forms.tableContextMenu = tableContextMenu;
        function listRecordContextMenu(record, index, event) {
            event.preventDefault();
            event.stopPropagation();
            let td = event.target;
            if (td.tagName !== 'TD')
                td = $(td).closest('td')[0];
            if (record) {
                if (!record.$selected) {
                    this.unselectAll();
                    record.$selected = true;
                }
            }
            // create context menu
            let menu = new Forms.ContextMenu();
            if (td && (td.tagName === 'TD'))
                menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => copyClick(event.target.closest('table')));
            if (this.field?.pasteAllowed && this.$parent.dataSource.changing)
                menu.add('<i class="fa fa-fw fa-paste"></i> Colar', (...args) => pasteClick(this));
            if (td && (td.tagName === 'TD')) {
                menu.addSeparator();
                menu.add('<i class="fa fa-fw fa-filter"></i> Filtrar pelo conteúdo deste campo', () => filterByFieldContent.call(this, td, record));
            }
            if (record) {
                menu.addSeparator();
                menu.add('<i class="fa fa-fw fa-trash"></i> Excluir', () => this.deleteSelection());
            }
            // menu.add('Arquivar', this.copyClick);
            menu.show(event.pageX, event.pageY);
        }
        Forms.listRecordContextMenu = listRecordContextMenu;
        function copyClick(table) {
            navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(table));
        }
        async function pasteClick(vm) {
            let text = await navigator.clipboard.readText();
            let sep = '\t';
            if (!text.includes(sep))
                text = ';';
            text.split('\n').forEach((line, n) => {
                // ignore the header
                if (n > 0) {
                    line = line.trim();
                    if (line) {
                        let record = {};
                        line.split(sep).forEach((s, n) => {
                            let field = vm.$grid.$columns[n];
                            if (field)
                                record[field.name] = s;
                        });
                        // save data to datasource
                        vm.dataSource.addRecord(record);
                    }
                }
            });
        }
        function unselectAll() {
            for (let rec of this.selection)
                rec.$selected = false;
            this.selection = [];
            this.selectionLength = 0;
        }
        Forms.unselectAll = unselectAll;
        function filterByFieldContent(td, record) {
            let name = td.getAttribute('field-name');
            if (name) {
                let val = record[name];
                this.$view.action.addFilter(name, val);
            }
        }
        function selectionDelete() {
            this.allSelected = false;
            for (let rec of this.selection) {
                rec.$destroy();
                let i = this.records.indexOf(rec);
                if (i > -1)
                    this.records.splice(i, 1);
            }
            // this.records = this.records.filter(rec => rec.$state !== Katrid.Data.RecordState.destroyed);
            this.selection = [];
            this.selectionLength = 0;
        }
        Forms.selectionDelete = selectionDelete;
        class SelectionHelper extends Array {
            constructor() {
                super(...arguments);
                this._allSelected = false;
            }
            get element() {
                return this._element;
            }
            set element(value) {
                this._element = value;
            }
            get allSelected() {
                return this._allSelected;
            }
            set allSelected(value) {
                this._allSelected = value;
            }
            selectToggle(record) {
                record.$selected = !record.$selected;
            }
            selectRecord(record) {
                console.log('select record', record);
                record.$selected = true;
                this.push(record);
            }
            toggleAll() {
                this.allSelected = !this.allSelected;
                for (let rec of this.records) {
                    rec.$selected = this.allSelected;
                }
                if (!this.allSelected)
                    this.length = 0;
            }
            unselectRecord(record) {
                $(this.element).find(`tr.selected[data-id=${record.id}]`).removeClass('selected');
                this.splice(this.indexOf(record), 1);
                this.allSelected = false;
            }
            unselectAll() {
                for (let sel of this) {
                    $(this.element).find(`tr.selected[data-id=${sel.id}]`).removeClass('selected');
                    sel.$selected = false;
                }
                this.length = 0;
            }
            clear() {
                this._allSelected = false;
                this.length = 0;
            }
        }
        Forms.SelectionHelper = SelectionHelper;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class View extends Forms.BaseView {
            constructor(info) {
                super(info);
                if (this.container)
                    this.render();
            }
        }
        Forms.View = View;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class CalendarView extends Forms.RecordCollectionView {
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-secondary btn-view-list';
                btn.innerHTML = '<i class="fas fa-calendar"></i>';
                btn.setAttribute('v-on:click', `setViewMode('calendar')`);
                container.append(btn);
            }
            beforeRender(template) {
                let templ = super.beforeRender(template);
                // collect fields names
                this.fieldStart = template.getAttribute('date-start');
                this.fieldEnd = template.getAttribute('date-end');
                return templ;
            }
            dataSourceCallback(data) {
                super.dataSourceCallback(data);
                this._refresh(data.records);
            }
            _refresh(records) {
                this._calendar.removeAllEvents();
                for (let rec of records) {
                    let event = { title: rec.$str, start: rec[this.fieldStart] };
                    if (this.fieldEnd)
                        event['end'] = rec[this.fieldEnd];
                    this._calendar.addEvent(event);
                }
            }
            renderTemplate(content) {
                // template render
                let calendarEl = document.createElement('div');
                calendarEl.className = 'calendar-view';
                return calendarEl;
            }
            render() {
                let el = super.render();
                // delay the calendar render
                setTimeout(() => {
                    let calendarEl = this.element.querySelector('.calendar-view');
                    this._calendar = new FullCalendar.Calendar(calendarEl, {
                        initialView: 'dayGridMonth',
                        height: calendarEl.parentElement.getBoundingClientRect().height,
                    });
                    this._calendar.render();
                }, 100);
                return el;
            }
        }
        CalendarView.viewType = 'calendar';
        Forms.CalendarView = CalendarView;
        Katrid.Forms.Views.registry['calendar'] = CalendarView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class CardRenderer {
            constructor(fields) {
                this.fields = fields;
            }
            renderField(fieldEl) {
                let name = fieldEl.getAttribute('name');
                if (name) {
                    let fld = this.fields[name];
                    if (fld) {
                        // fld.view = this;
                        // fld.assign(fieldEl);
                        if (fld.visible) {
                            return fld.cardCreate();
                        }
                    }
                    else
                        console.error(`Field "${name}" not found`);
                }
            }
            render(template) {
                let templ = Katrid.html(`
    <div class="content no-padding">
      <div class="data-panel col-12">
      
        <div class="card-view kanban" v-if="groups && groups.length" card-draggable=".card-group" card-group>

          <div v-for="group in groups" class="card-group sortable-item">
            <div class="card-header">
              <div class="card-h">{{group.$str}}</div>
              <button class="btn" v-on:click="showQuickAddDlg(group, $event)"><i class="fa fa-plus"></i></button>

            </div>
            
              <form id="card-add-group-item-dlg" v-on:submit.prevent="submitItem(group)" v-if="group.$cardShowAddGroupItemDlg">
                <div class="form-group">
                  <input type="text" v-model="newName" class="form-control" placeholder="${Katrid.i18n.gettext('Add')}" v-on:blur="cardHideAddGroupItemDlg(group)" v-on:keydown.esc="cardHideAddGroupItemDlg(group)">
                </div>
                <button type="submit" class="btn btn-primary" v-on:mousedown.prevent.stop>${Katrid.i18n.gettext('Add')}</button>
                <button type="submit" class="btn btn-primary" v-on:mousedown.prevent.stop>${Katrid.i18n.gettext('Edit')}</button>
                <button type="button" class="btn btn-outline-secondary" v-on:click="cardHideAddGroupItemDlg(group)" title="${Katrid.i18n.gettext('Discard record changes')}">${Katrid.i18n.gettext('Discard')}</button>
              </form>

            <div class="card-items" card-draggable=".card-items" card-item>
              <div v-for="(record, index) in group.$children" class="card panel-default card-item card-link"
                v-on:click="recordClick(record, index, $event)">
            <div class="template-placeholder"></div>
              </div>
            </div>
          </div>

          <div class="card-add-group" title="${Katrid.i18n.gettext('Click here to add new column')}" v-on:click="cardShowAddGroupDlg($event);" :data-group-name="groups[0]._paramName">
            <div v-show="!cardAddGroupDlg">
              <i class="fa fa-fw fa-chevron-right fa-2x"></i>
              <div class="clearfix"></div>
              <span class="title">${Katrid.i18n.gettext('Add New Column')}</span>
            </div>
            <form v-show="cardAddGroupDlg" v-on:submit="cardAddGroup(newName, $event)">
            <div class="form-group">
              <input class="form-control" v-on:blur="cardAddGroupDlg=false" placeholder="${Katrid.i18n.gettext('Add')}" v-model="cardNewName">
            </div>
              <button type="submit" class="btn btn-primary">${Katrid.i18n.gettext('Add')}</button>
              <button type="button" class="btn btn-default">${Katrid.i18n.gettext('Cancel')}</button>
            </form>
          </div>
        </div>
        <div class="card-view card-deck" v-else>
          <div v-for="(record, index) in records" class="card panel-default card-item card-link"
               v-on:click="recordClick(record, index, $event)">
            <div class="template-placeholder"></div>
          </div>

        <div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div><div class="card-item card-ghost"></div>
          
        </div>
      </div>
    </div>
      `);
                template.querySelectorAll(':scope > field').forEach(field => {
                    field.remove();
                });
                for (let child of template.querySelectorAll('field')) {
                    let el = this.renderField(child);
                    if (el)
                        child.replaceWith(el);
                }
                for (let el of templ.querySelectorAll('.template-placeholder')) {
                    let div = document.createElement('div');
                    div.innerHTML = template.innerHTML;
                    el.parentElement.insertBefore(div, el);
                }
                return templ;
            }
        }
        Forms.CardRenderer = CardRenderer;
        class CardView extends Forms.RecordCollectionView {
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-secondary btn-view-card';
                btn.innerHTML = '<i class="fas fa-table"></i>';
                btn.setAttribute('v-on:click', `setViewMode('card')`);
                container.append(btn);
            }
            renderTemplate(template) {
                let cardRenderer = new CardRenderer(this.fields);
                return cardRenderer.render(template);
            }
            createComponent() {
                let comp = super.createComponent();
                comp.methods.submitItem = function (group) {
                    console.log('add item');
                    this.cardHideAddGroupItemDlg(group);
                };
                comp.methods.showQuickAddDlg = function (group, event) {
                    this.newName = '';
                    group.$cardShowAddGroupItemDlg = true;
                    setTimeout(() => event.target.closest('.card-group').querySelector('input').focus());
                };
                comp.methods.cardHideAddGroupItemDlg = function (group) {
                    group.$cardShowAddGroupItemDlg = false;
                };
                return comp;
            }
        }
        CardView.viewType = 'card';
        Forms.CardView = CardView;
        Katrid.Forms.Views.registry['card'] = CardView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class ChartView extends Forms.RecordCollectionView {
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-secondary btn-view-list';
                btn.innerHTML = '<i class="fas fa-chart-pie"></i>';
                btn.setAttribute('v-on:click', `setViewMode('calendar')`);
                container.append(btn);
            }
        }
        Forms.ChartView = ChartView;
        Katrid.Forms.Views.registry['chart'] = ChartView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var DataSourceState = Katrid.Data.DataSourceState;
        Forms.changingStates = [DataSourceState.inserting, DataSourceState.editing];
        class FormView extends Forms.ModelView {
            constructor(info) {
                super(info);
                this.dataCallbacks = [];
                this._pendingViews = true;
                // create field change hook events
                if (this.fields)
                    for (let field of Object.values(this.fields))
                        if (field.onChange) {
                            this.model.onFieldChange = (field, value) => this.$onFieldChange(field, value);
                            break;
                        }
            }
            create(info) {
                super.create(info);
                this.nestedViews = [];
                if (info.record && this.model)
                    this.datasource.record = info.record;
                else
                    this._record = null;
                this._readonly = false;
            }
            get record() {
                return this._record;
            }
            set record(value) {
                this._record = value;
                this.vm.record = value;
                // for (let child of this.nestedViews)
                //   child.setParentRecord(value);
                for (let cb of this.dataCallbacks)
                    cb(this.vm.record);
                if (this.element)
                    this.element.dispatchEvent(new CustomEvent('recordChanged', { detail: { record: this.vm.record } }));
            }
            addDataCallback(cb) {
                this.dataCallbacks.push(cb);
            }
            get state() {
                return this._state;
            }
            set state(value) {
                this._state = value;
                this.element.classList.remove('inserting', 'editing', 'changing', 'browsing', 'loading', 'inactive', 'readonly');
                if (Forms.changingStates.includes(value))
                    this.element.classList.add('changing');
                switch (value) {
                    case DataSourceState.inserting:
                        this.element.classList.add('inserting');
                        break;
                    case DataSourceState.editing:
                        this.element.classList.add('editing');
                        break;
                    case DataSourceState.browsing:
                        this.element.classList.add('browsing');
                        this.element.classList.add('readonly');
                        break;
                    case DataSourceState.loading:
                        this.element.classList.add('loading');
                        break;
                    case DataSourceState.inactive:
                        this.element.classList.add('inactive');
                        break;
                }
            }
            setState(state) {
                this.state = state;
                this.vm.state = state;
                this.vm.changing = this.changing;
                this.vm.inserting = this.inserting;
                this.vm.editing = this.editing;
            }
            get inserting() {
                return this._state === DataSourceState.inserting;
            }
            get editing() {
                return this._state === DataSourceState.editing;
            }
            get changing() {
                return Forms.changingStates.includes(this._state);
            }
            bindField(field, fieldEl) {
                let f = new Forms.BoundField(field.name, fieldEl);
                f.form = this;
                f.field = field;
                // if (!(this.boundFields[field.name]))
                //   this.boundFields[field.name] = [];
                // this.boundFields[field.name].push(f);
                return f;
            }
            renderField(fld, fieldEl) {
                let name = fld.name;
                if (name) {
                    let fld = this.fields[name];
                    if (fld) {
                        // add hook to v-sum attribute
                        if (fieldEl.hasAttribute('v-sum'))
                            this.addSumHook(fld, fieldEl);
                        if (!fieldEl.hasAttribute('invisible'))
                            return fld.formCreate(fieldEl);
                        // boundField.control = boundField.container.querySelector('.form-field');
                    }
                    else
                        console.error(`Field "${name}" not found`);
                }
            }
            addSumHook(field, el) {
                if (!this.sumHooks)
                    this.sumHooks = {};
                let sum = el.getAttribute('v-sum');
                el.removeAttribute('v-sum');
                if (sum.includes('.')) {
                    let fields = sum.split('.');
                    let field1 = fields[0];
                    let field2 = fields[1];
                    if (!this.sumHooks[field1])
                        this.sumHooks[field1] = [];
                    this.sumHooks[field1].push({ field: field, fieldToSum: field2 });
                }
            }
            beforeRender(template) {
                // return a template view
                let form = template;
                form.setAttribute('autocomplete', 'off');
                form.classList.add('row');
                // compile fields (elements transformation)
                for (let child of form.querySelectorAll('field')) {
                    if ((child.parentElement.tagName === 'FORM') && (child.parentElement !== form))
                        continue;
                    let name = child.getAttribute('name');
                    if (name) {
                        let fld = this.fields[name];
                        if (fld) {
                            fld.fieldEl = child;
                            if (child.hasAttribute('invisible') || (child.getAttribute('visible') === 'false')) {
                                child.remove();
                                continue;
                            }
                            let newField = this.renderField(fld, child);
                            if (newField) {
                                child.parentElement.insertBefore(newField, child);
                                child.remove();
                            }
                        }
                    }
                }
                if (this.dialog)
                    return this.createDialog(form, this.dialogButtons);
                if (this.toolbarVisible) {
                    let templ = Katrid.html(`<div class="v-form form-view data-form">
      <div class="content">
        <header class="content-container-heading"></header>
        <div class="page-sheet">
          <div class="content container">
            <div class="form-sheet panel-default data-panel">
              <div class="template-placeholder">
                <a class="maximize-button" role="button" title="${Katrid.i18n.gettext('Maximize')}"
                   onclick="$(this).closest('div.card.data-panel').toggleClass('box-fullscreen');$(this).find('i').toggleClass('fa-compress fa-expand')">
                  <i class=" fa fa-expand"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`);
                    templ.insertBefore(this.createToolbar(), templ.children[0]);
                    templ.querySelector('action-navbar').actionManager = this.action.actionManager;
                    let header = templ.querySelector('header');
                    this.mergeHeader(header, form);
                    templ.querySelector('.template-placeholder').append(form);
                    return templ;
                }
                else {
                    let templ = document.createElement('div');
                    templ.classList.add('form-view');
                    templ.append(form);
                    templ.setAttribute('v-form', null);
                    return templ;
                }
            }
            createToolbar() {
                let templ = `<div class="data-heading panel panel-default">
      <div class="panel-body">
        <div class="row">
        <action-navbar></action-navbar>
          <div class="col-sm-6 breadcrumb-nav"></div>
          <p class="help-block">${this.action.config.usage || ''}&nbsp;</p>
        </div>
        <div class="toolbar row">
          <div class="col-sm-6 toolbar-action-buttons"></div>
          <div class="col-sm-6">
            <div class="float-end">
              <div class="btn-group pagination-area">
              <span v-if="recordCount">
                {{ recordIndex + 1 }} / {{ recordCount }}
              </span>
              </div>
              <div class="btn-group" role="group">
                <button id="btn-form-prior" class="btn btn-outline-secondary" type="button" @click="prior()">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <button id="btn-form-next" class="btn btn-outline-secondary" type="button" @click="next()">
                  <i class="fa fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
                let toolbar = Katrid.html(templ);
                this.createToolbarButtons(toolbar);
                return toolbar;
            }
            createToolbarButtons(container) {
                let parent = container.querySelector('.toolbar-action-buttons');
                let div = document.createElement('div');
                div.classList.add('btn-toolbar');
                div.innerHTML = `
    <button class="btn btn-primary btn-action-save" type="button" v-bind:disabled="loadingRecord"
      v-on:click="save()" v-show="changing">
        ${Katrid.i18n.gettext('Save')}
      </button>
      <button class="btn btn-primary btn-action-edit" type="button" v-bind:disabled="loadingRecord"
      v-on:click="edit()" v-show="!changing">
        ${Katrid.i18n.gettext('Edit')}
      </button>
      <button class="btn btn-outline-secondary btn-action-create" type="button" v-bind:disabled="loadingRecord"
      v-on:click="insert()" v-show="!changing">
        ${Katrid.i18n.gettext('Create')}
      </button>
      <button class="btn btn-outline-secondary btn-action-cancel" type="button" v-on:click="discard()"
      v-show="changing">
        ${Katrid.i18n.gettext('Discard')}
      </button>
    <div class="btn-group">
      <div class="dropdown">
        <button type="button" class="btn toolbtn" v-if="!changing" v-on:click="refresh()" title="${Katrid.i18n.gettext('Refresh')}">
          <i class="fa fa-fw fa-redo-alt"></i>
        </button>
        <button type="button" class="btn btn-outline-secondary dropdown-toggle btn-actions" name="actions" data-bs-toggle="dropdown"
                aria-haspopup="true">
          ${Katrid.i18n.gettext('Action')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu dropdown-menu-actions">
          <a class="dropdown-item" v-on:click="deleteSelection()">
<!--            <i class="fa fa-fw fa-trash-o"></i> -->
${Katrid.i18n.gettext('Delete')}
          </a>
          <a class="dropdown-item" v-on:click="copy()">
<!--            <i class="fa fa-fw fa-files-o"></i>-->
            ${Katrid.i18n.gettext('Duplicate')}
          </a>
        </div>
      </div>
    </div>
    <div class="btn-group">
      <attachments-button v-show="!inserting"></attachments-button>
</div>
`;
                parent.append(div);
                return parent;
            }
            getComponentData() {
                let data = {
                    action: this.action,
                    attachments: null,
                    record: this._record || {},
                    records: [],
                    name: '',
                    // view: this.viewInfo,
                    actionView: this,
                    loadingRecord: false,
                    // recordIndex: this.action.recordIndex,
                    // recordCount: this.action.dataSource?.recordCount,
                    changing: this.changing,
                    inserting: this.inserting,
                    editing: this.editing,
                    state: this._state,
                    $fields: this.fields,
                    recordIndex: this._recordIndex,
                    recordCount: this.recordCount,
                };
                this._applyDataDefinition(data);
                return data;
            }
            async ready() {
                if (this.action?.params)
                    this.onHashChange(this.action.params);
            }
            async onHashChange(params) {
                let id = params.id;
                if (id)
                    this.setRecordId(id);
            }
            render() {
                super.render();
                // force readonly/editable
                this.readonly = this._readonly;
                if (this._state == null)
                    this.state = DataSourceState.editing;
                return this.element;
            }
            get recordIndex() {
                return this._recordIndex;
            }
            set recordIndex(value) {
                this._recordIndex = value;
                this.vm.recordIndex = value;
                this.record = this.records[value];
                this.setRecordId(this.record.id);
            }
            async setRecordId(value) {
                let res = await this._search({ id: value });
            }
            edit() {
                this.setState(DataSourceState.editing);
            }
            insert(defaultValues) {
                this.record = null;
                this.setState(DataSourceState.inserting);
                return this.datasource.insert(true, defaultValues).then(() => setTimeout(() => {
                    console.log('default values', defaultValues);
                    // put focus into the 1st field
                    this.focus();
                }));
                // this.datasource.record = this.model.newRecord();
            }
            async save() {
                this.setState(DataSourceState.browsing);
                return this.datasource.save();
            }
            discard() {
                this.setState(DataSourceState.browsing);
                if (this._record)
                    this.vm.record = this._record;
                this.$discard();
            }
            next() {
                this.moveBy(1);
            }
            prior() {
                this.moveBy(-1);
            }
            moveBy(index) {
                let newIndex = this._recordIndex + index;
                if ((this.records.length > newIndex) && (newIndex >= 0))
                    this.recordIndex = newIndex;
            }
            back(index, mode) {
                this.action.back(index, mode);
            }
            refresh() {
                this.datasource.get({ id: this.record.id });
            }
            async copy() {
                let res = await this.model.service.copy(this.record.id);
                this.setState(DataSourceState.inserting);
                this.datasource.record = this.model.newRecord(null, this.datasource);
                this.datasource.setValues(res);
                // await this.datasource.copy(this.record.id);
            }
            createComponent() {
                let comp = super.createComponent();
                let me = this;
                Object.assign(comp, {
                    data() {
                        return me.getComponentData();
                    },
                });
                // override methods
                Object.assign(comp.methods, {
                    edit() {
                        me.edit();
                    },
                    insert() {
                        me.insert();
                    },
                    save() {
                        me.save();
                    },
                    discard() {
                        me.discard();
                    },
                    next() {
                        me.next();
                    },
                    prior() {
                        me.prior();
                    },
                    back(index, mode) {
                        me.back(index, mode);
                    },
                    copy() {
                        me.copy();
                    },
                    deleteAndClose() {
                        me.deleteAndClose();
                    },
                    saveAndClose(commit) {
                        me.saveAndClose(commit);
                    },
                    discardAndClose() {
                        me.discardAndClose();
                    },
                    deleteSelection() {
                        me.deleteSelection(this.selection);
                        this.next();
                    },
                    async formButtonClick(args) {
                        let res = await me.model.service.doViewAction({ action_name: args.method, target: args.params.id });
                        if (res.location)
                            window.location.href = res.location;
                    },
                    refresh() {
                        me.refresh();
                    },
                    openRelatedObject(record, field, event) {
                        let target = event.target;
                        if (target instanceof HTMLAnchorElement) {
                            if (me.dialog) {
                                Katrid.Forms.FormView.createNew({ model: field.model, dialog: true, id: record.id, buttons: ['close'] });
                            }
                            else
                                Katrid.webApp.loadPage(target.href, false);
                        }
                    },
                    async doFormAction(meth, params) {
                        try {
                            me.pendingOperation++;
                            let res = await me.model.service.rpc(meth, [this.recordId], params);
                            await me.action._evalResponseAction(res);
                        }
                        finally {
                            me.pendingOperation--;
                        }
                    },
                    sendFile(name, file) {
                        return Katrid.Services.Upload.sendFile({ model: this.action.model, method: name, file, vm: this });
                    },
                    // console.log('inc', vm.$changing);
                });
                // override computed props
                Object.assign(comp.computed, {
                    selection() {
                        return [this.record];
                    },
                    recordId() {
                        return this.record.id;
                    },
                    $fields() {
                        return me.fields;
                    },
                });
                return comp;
            }
            createDialog(content, buttons = ['close']) {
                let el = super.createDialog(content, buttons);
                el.classList.add('form-view');
                return el;
            }
            /**
             * Shows the form as a modal dialog
             * @param options
             */
            showDialog(options) {
                this.dialog = true;
                if (!options)
                    options = {};
                if (options.buttons)
                    this.dialogButtons = options.buttons;
                this.dialogPromise = new Promise(async (resolve, reject) => {
                    let el = this.element;
                    // auto load record by id
                    if (options?.id)
                        await this.setRecordId(options.id);
                    if (!el)
                        el = this.render();
                    if (options?.state != null) {
                        this.state = options.state;
                        options.backdrop = 'static';
                    }
                    else
                        this.state = DataSourceState.browsing;
                    this._modal = new bootstrap.Modal(el, options);
                    el.addEventListener('hidden.bs.modal', () => {
                        resolve(this.$result);
                        this._modal.dispose();
                        el.remove();
                        this._modal = null;
                    });
                    this._modal.show();
                    // if (options?.edit)
                    //   this.vm.dataSource.edit();
                });
                return this.dialogPromise;
            }
            $onFieldChange(field, value) {
                // update auto sum fields
                if (this.sumHooks && (field.name in this.sumHooks)) {
                    let fields = this.sumHooks[field.name];
                    for (let info of fields) {
                        let sfield = info.fieldToSum;
                        if (Array.isArray(value)) {
                            let total = 0;
                            value.forEach(obj => total += obj[sfield] || 0);
                            console.log(info.field.name, total);
                            this.vm.record[info.field.name] = total;
                        }
                    }
                }
                if (field.onChange && this.datasource)
                    this.datasource.$onFieldChange(field, value, this.datasource.record);
            }
            static async createNew(config) {
                // let formInfo = config.viewInfo;
                let svc = new Katrid.Services.ModelService(config.model);
                // get form view info from server
                let res = await svc.getViewInfo({ view_type: 'form' });
                let model = new Katrid.Data.Model({ name: config.model, fields: res.fields });
                // if (!formInfo)
                let formInfo = new Forms.ModelViewInfo(res);
                await formInfo.loadPendingViews();
                let dlg = new Katrid.Forms.FormView({
                    model,
                    info: formInfo.info,
                });
                if (config.dialog) {
                    dlg.dialog = true;
                    dlg.dialogButtons = config.buttons || [
                        { text: 'OK', click: 'saveAndClose(true)' },
                        { text: 'Cancelar', dismiss: 'modal' },
                    ];
                }
                dlg.render();
                if (config.dialog) {
                    let res = dlg.showDialog({ backdrop: 'static' });
                    if (config.id)
                        dlg.setRecordId(config.id);
                    else if (config.record)
                        dlg.record = config.record;
                    else
                        dlg.insert();
                }
                return dlg;
            }
            getDisplayText() {
                return '{{record.$str}}';
            }
            saveAndClose(commit) {
                // this.$result = this.flush(true, false);
                if (commit) {
                    this.$result = this.datasource.save();
                }
                else {
                    // this._record.$flush();
                    this.datasource.flush();
                    // notify the datasource
                    // this.datasource._flush(this._record);
                    this.$result = this._record;
                }
                this.closeDialog();
            }
            discardAndClose() {
                this.$discard();
                this.$result = false;
                this.closeDialog();
            }
            recordClick(event, index, record) {
            }
            /** Put focus to field if specified or to the first one */
            focus(fieldName) {
                if (!fieldName)
                    // set focus to first .form-field element
                    this.element.querySelector('.form-field').focus();
            }
            /** Close the current dialog and deletes the current record */
            deleteAndClose() {
                let recIndex = this.records.indexOf(this.record);
                if (recIndex) {
                    this.$result = this.vm.record;
                    this.records.splice(recIndex, 1);
                }
                this.closeDialog();
            }
            async loadPendingViews() {
                if (!this._pendingViews)
                    return;
                this._pendingViews = false;
                // load pending nested views info
                await Promise.all(Object.values(this.fields)
                    .filter(field => field['loadViews'])
                    .map((field) => field.loadViews()));
            }
            $discard() {
                if (this.record.$state === Katrid.Data.RecordState.created) {
                    if (this.records && this._recordIndex) {
                        this.datasource.record = this.records[this._recordIndex];
                        // this.refresh();
                    }
                }
                else {
                    // discard in-memory changes
                    if (this.datasource.parent)
                        this.record.$discard();
                    // reload the record
                    else
                        this.refresh();
                }
            }
        }
        FormView.viewType = 'form';
        Forms.FormView = FormView;
        Katrid.Forms.Views.registry['form'] = FormView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        /** SearchView is a special view mode, and search instances will be generally rendered inside toolbar
         * region of a RecordCollectionView descendant instance. */
        class SearchView extends Forms.ModelView {
            constructor(info, action) {
                super(info);
                this._dataOffset = 1;
                this._dataOffsetLimit = 1;
                this.pageSize = 100;
                this.action = action || info.action;
                if (info.resultView)
                    this.resultView = info.resultView;
            }
            get resultView() {
                return this._resultView;
            }
            set resultView(value) {
                this._resultView = value;
                if (this.vm)
                    this.vm.recordCount = value.recordCount;
            }
            getComponentData() {
                return {
                    filterGroups: null,
                    groups: null,
                    customSearchExpanded: false,
                    groupByExpanded: false,
                    fieldList: Object.values(this.fields),
                    field: null,
                    searchValue: null,
                    searchValue2: null,
                    customFilter: [],
                    facets: [],
                    tempConditions: [],
                    recordCount: this.resultView?.recordCount,
                    pendingRequest: false,
                    dataOffset: 1,
                    dataOffsetLimit: 1,
                    availableItems: null,
                    currentIndex: 0,
                };
            }
            get dataOffset() {
                return this._dataOffset;
            }
            set dataOffset(value) {
                this._dataOffset = value;
                this.vm.dataOffset = value;
            }
            get dataOffsetLimit() {
                return this._dataOffsetLimit;
            }
            set dataOffsetLimit(value) {
                this._dataOffsetLimit = value;
                this.vm.dataOffsetLimit = value;
            }
            get pageIndex() {
                return this._pageIndex;
            }
            set pageIndex(value) {
                this._pageIndex = value;
            }
            nextPage() {
                this.pageIndex++;
            }
            prevPage() {
                this.pageIndex--;
            }
            _vmCreated(vm) {
                super._vmCreated(vm);
                vm.newCondition();
            }
            createComponent() {
                let comp = super.createComponent();
                let me = this;
                Object.assign(comp.methods, {
                    addFieldCondition() {
                        if (!this.tempFilter)
                            this.tempFilter = new Katrid.Forms.Views.Search.SearchFilters(this.$view);
                        for (let cond of this.tempConditions)
                            this.tempFilter.push(new Katrid.Forms.Views.Search.CustomFilterItem(this.$view, cond.$field, cond.condition, cond.value, this.tempFilter));
                        this.tempConditions = [];
                        this.newCondition();
                        this.field = null;
                        this.fieldName = null;
                        this.condition = null;
                        this.controlVisible = false;
                        this.searchValue = undefined;
                    },
                    newCondition() {
                        this.tempConditions.push({ fieldName: null, $field: null, condition: null, value: null, value2: null, values: null });
                    },
                    applyFilter() {
                        // add the current filter value
                        // if (this.searchValue !== undefined)
                        this.addFieldCondition();
                        this.customFilter.push(this.tempFilter);
                        // force the selection
                        this.tempFilter.selected = true;
                        // this.filters.push(this.tempFilter);
                        this.tempCondition = null;
                        this.tempFilter = new Katrid.Forms.Views.Search.SearchFilters(this.$view);
                        this.customSearchExpanded = false;
                    },
                    setSearchText(text) {
                        if (text.length)
                            return me.controller.show();
                        else
                            return me.controller.close();
                    },
                    removeFacet(facet) {
                        let i = this.facets.indexOf(facet);
                        this.facets[i].clear();
                        this.facets.splice(i, 1);
                        me.controller.input.focus();
                        me.update(this);
                    },
                    update() {
                        me.update(this);
                    },
                    move(distance) {
                        this.currentIndex += distance;
                        if (this.currentIndex >= this.availableItems.length)
                            this.currentIndex = 0;
                        else if (this.currentIndex < 0)
                            this.currentIndex = this.availableItems.length - 2;
                    },
                    fieldChange(cond) {
                        let field = cond.fieldName;
                        if (field) {
                            cond.$field = me.fields[field];
                            cond.conditions = me.getFieldConditions(cond.$field);
                            cond.condition = Object.keys(cond.conditions)[0];
                            cond.value = null;
                            cond.value2 = null;
                            cond.valeus = null;
                        }
                        else
                            cond.$field = null;
                    },
                    addCustomGroup(field) {
                        if (field) {
                            let group = Katrid.Forms.Views.Search.SearchGroups.fromField({ view: this.search, field });
                            this.search.groups.push(group);
                            group.items[0].toggle();
                        }
                    },
                    nextPage() {
                        me._resultView.nextPage();
                    },
                    prevPage() {
                        me._resultView.prevPage();
                    }
                });
                return comp;
            }
            update(vm) {
                console.log('update');
                if (this._resultView)
                    this._resultView.setSearchParams(this.controller.getParams());
                else
                    $(this).trigger('Katrid:updateSearch', this.controller.getParams());
            }
            beforeRender() {
                let el = Katrid.html(`<div class="search-view-container"><div class="search-area">
      <div class="search-view">
        <div class="search-view-facets">
          <div class="facet-view" v-for="facet in facets">
            <span class="facet-label" v-html="facet.caption"></span>
            <span class="facet-value" v-html="facet.templateValue"></span>
            <span class="fas fa-times facet-remove" v-on:click="removeFacet(facet)"></span>
          </div>
        </div>
        <input class="search-view-input" role="search" v-on:input="setSearchText(searchText)" placeholder="${Katrid.i18n.gettext('Search...')}" v-model="searchText">
      </div>
      <div class="col-sm-12">
        <ul class="search-dropdown-menu search-view-menu" role="menu">
          <li v-for="(item, index) in availableItems" :class="{active: currentIndex === index}">
            <a v-if="item.expandable" class="expandable" v-on:click.prevent
               v-on:mousedown.prevent.stop="item.expanded=!item.expanded">
              <i class="fa" :class="{'fa-angle-down': item.expanded, 'fa-angle-right': !item.expanded}"></i>
            </a>
            <a href="#" class="search-menu-item" v-on:mousedown.prevent.stop
               v-on:click.prevent="item.select();searchText = '';" :class="{'indent': item.indent}">
              <span v-if="!item.indent" v-html="item.template"></span>
              <span v-if="item.indent">{{ item.text }}</span>
            </a>
            <a v-if="item.loading" class="search-menu-item"><i>${Katrid.i18n.gettext('Loading...')}</i></a>
          </li>
        </ul>
      </div>
    </div>
    <div class="btn-group search-view-more-area">
      <div class="btn-group search-filter-button"></div>
      <div class="btn-group search-groupby-button"></div>
      <div class="btn-group search-filter-favorites"></div>
    </div>
    
    <div class="btn-group search-view-more-area">
      <div custom-filter class="btn-group">
        <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button" aria-expanded="false">
          <span class="fa fa-filter"></span> ${Katrid.i18n.gettext('Filters')} <span class="caret"></span>
        </button>
        
    
<div class="dropdown-menu search-view-filter-menu">
      <div>
        <div v-for="group in filterGroups">
          <a class="dropdown-item" :class="{'selected': item.selected}" v-for="item in group.items" v-on:click.stop="item.toggle()">
            {{ item.toString() }}
          </a>
          <div class="dropdown-divider"></div>
        </div>
      </div>
      <div>
        <div v-for="filter in customFilter">
          <a class="dropdown-item" :class="{'selected': filter.selected}" v-on:click.stop="filter.toggle()" v-html="filter.toString()"></a>
          <div class="dropdown-divider"></div>
        </div>
        <a class="dropdown-item dropdown-search-item add-custom-filter" v-on:click.stop.prevent="customSearchExpanded=!customSearchExpanded">
          <i :class="{ 'fa-caret-right': !customSearchExpanded, 'fa-caret-down': customSearchExpanded }" class="fa expandable"></i>
          <span>${Katrid.i18n.gettext('Add Custom Filter')}</span>
        </a>
        <div v-if="customSearchExpanded" v-on:click.stop.prevent>
          <div v-show="tempFilter && tempFilter.length" class="margin-bottom-8">
            <a href="#" v-on:click.prevent class="dropdown-item" v-for="filter in tempFilter" v-html="filter.toString()" title="${Katrid.i18n.gettext('Remove item')}"></a>
          </div>
          <div class="col-12 filter-condition" v-for="(cond, condIndex) in tempConditions">
            <div v-if="condIndex > 0">
            <small>${Katrid.i18n.gettext('or')}</small>
            </div>
            <div v-else class="margin-top-8"></div>
            <div class="form-group">
              <select class="form-select" v-model="cond.fieldName" v-on:change="fieldChange(cond)">
                <option></option>
                <option v-once v-for="field in fieldList" :value="field.name">{{ field.caption }}</option>
              </select>
            </div>
            <div class="form-group" v-if="cond.fieldName">
            <select class="form-select" v-model="cond.condition">
              <option></option>
              <option v-for="(name, value, index) in cond.conditions" :value="value">{{name}}</option>
            </select>
            </div>
            <div class="form-group" v-if="cond.fieldName && cond.condition">
              <select class="form-select" v-model="searchValue" v-if="field && field.choices">
                <option v-for="choice in cond.$field.choices" :value="choice[0]">{{choice[1]}}</option>
              </select>
              <input class="form-control" v-model="cond.value" type="text" v-else-if="cond.fieldName && (cond.$field.internalType === 'IntegerField')">
              <div v-else-if="cond.fieldName && (cond.$field.internalType === 'DateField')">
<input-date class="input-group date" v-model="cond.value" date-picker="L">
<input type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
<input-date class="input-group date" v-model="cond.value2" date-picker="L" v-if="cond.condition === '..'">
<input type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
              </div>
              <input class="form-control" v-model="cond.value" type="text" v-else-if="(cond.$field.internalType !== 'BooleanField')">
              <input class="form-control" v-model="cond.value" type="text" v-else-if="(cond.$field.internalType !== 'BooleanField')">
              <input-autocomplete v-model="cond.value" :data-model="cond.$field.model.name" v-else-if="(cond.condition === '=') && (cond.$field.internalType === 'ForeignKey')"/>
            </div>
          </div>
          <div class="col-12">
            <div class="form-group">
              <button class="btn btn-primary" type="button" v-on:click="applyFilter()">
                ${Katrid.i18n.gettext('Apply')}
              </button>
              <button class="btn btn-outline-secondary" type="button" v-on:click="newCondition()">
                ${Katrid.i18n.gettext('Add a condition')}
              </button>
            </div>
</div>
        </div>
      </div>
</div>    
    
      </div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
          <span class="fa fa-bars"></span> ${Katrid.i18n.gettext('Group By')} <span class="caret"></span>
        </button>
        <ul class="dropdown-menu search-view-groups-menu">
        
          <div v-for="group in groups">
            <a class="dropdown-item" :class="{'selected': item.selected}" v-on:click.stop="item.toggle()" v-for="item in group.items">
              {{ item.toString() }}
            </a>
            <div class="dropdown-divider"></div>
          </div>

          <a class="dropdown-item dropdown-search-item add-custom-group" v-on:click.stop.prevent
             v-on:click="groupByExpanded=!groupByExpanded">
            <i :class="{ 'fa-caret-right': !groupByExpanded, 'fa-caret-down': groupByExpanded }"
               class="fa expandable"></i>
            <span>${Katrid.i18n.gettext('Add Custom Group')}</span>
          </a>
          

          <div v-if="groupByExpanded" v-on:click.stop.prevent>
            <div class="col-12">
              <div class="form-group">
                <select class="form-select" v-model="fieldName" v-on:change="fieldChange(fields[fieldName])">
                  <option value=""></option>
                  <option v-for="(field, name, index) in fields" :value="name">{{ field.caption }}</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="addCustomGroup(fields[fieldName]);fieldName='';">
                  ${Katrid.i18n.gettext('Apply')}
                </button>
              </div>
            </div>
          </div>
</ul>
      </div>
      <button class="btn btn-outline-secondary">
        <span class="fa fa-star"></span> ${Katrid.i18n.gettext('Favorites')} <span class="caret"></span>
      </button>
    </div>
            <div class="float-end">
              <div class="btn-group pagination-area">
                <span v-if="pendingRequest"><i class="fas fa-spinner fa-spin"></i>  ${Katrid.i18n.gettext('Loading...')}</span>
                <div v-if="!pendingRequest">
                <span class="paginator">{{dataOffset}} - {{dataOffsetLimit}}</span>
                  /
                  <span class="total-pages">{{recordCount}}</span>
                </div>
              </div>
              <div class="btn-group">
                <button class="btn btn-outline-secondary" type="button" v-on:click="prevPage()">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <button class="btn btn-outline-secondary" type="button" v-on:click="nextPage()">
                  <i class="fa fa-chevron-right"></i>
                </button>
              </div>
              <div class="btn-view-modes btn-group" role="group"></div>
            </div>
    
    </div>`);
                if (this.action)
                    this.action.createViewsButtons(el.querySelector('.btn-view-modes'));
                return el;
            }
            render() {
                if (!this.element) {
                    this.element = this.beforeRender();
                    this.createVm(this.element);
                    this.controller = new Katrid.Forms.Views.Search.SearchViewController(this);
                    this.controller.setContent(this.domTemplate());
                    // load the default search specified on action context
                    if (this.action?.context.search_default)
                        setTimeout(() => this.load(this.action.context.search_default));
                }
                if (this.container)
                    this.container.append(this.element);
                return this.element;
            }
            load(query) {
            }
            renderTo(container) {
                super.renderTo(container);
            }
            getFieldConditions(field) {
                if (field) {
                    if (field.choices) {
                        return {
                            '=': Katrid.i18n.gettext('Is equal'),
                            '!=': Katrid.i18n.gettext('Is different'),
                            'is not null': Katrid.i18n.gettext('Is filled'),
                            'is null': Katrid.i18n.gettext('Is not filled'),
                        };
                    }
                    else if ((field.internalType === 'StringField') || (field.internalType === 'EmailField')) {
                        return {
                            '%': Katrid.i18n.gettext('Contains'),
                            '!%': Katrid.i18n.gettext('Not contains'),
                            '=': Katrid.i18n.gettext('Is equal'),
                            '!=': Katrid.i18n.gettext('Is different'),
                            'is not null': Katrid.i18n.gettext('Is filled'),
                            'is null': Katrid.i18n.gettext('Is not filled'),
                        };
                    }
                    else if (field.internalType === 'ForeignKey') {
                        return {
                            '=': Katrid.i18n.gettext('Is equal'),
                            '!=': Katrid.i18n.gettext('Is different'),
                            'is not null': Katrid.i18n.gettext('Is filled'),
                            'is null': Katrid.i18n.gettext('Is not filled'),
                        };
                    }
                    else if (field.internalType === 'IntegerField') {
                        return {
                            '=': Katrid.i18n.gettext('Is equal'),
                            '..': Katrid.i18n.gettext('Between'),
                            '!=': Katrid.i18n.gettext('Is different'),
                            '>': Katrid.i18n.gettext('Greater-than'),
                            '<': Katrid.i18n.gettext('Less-than'),
                            'is not null': Katrid.i18n.gettext('Is defined'),
                            'is null': Katrid.i18n.gettext('is not defined'),
                        };
                    }
                    else if ((field.internalType === 'DateField') || (field.internalType === 'DateTimeField')) {
                        return {
                            '..': Katrid.i18n.gettext('Between'),
                            '=': Katrid.i18n.gettext('Is equal'),
                            '!=': Katrid.i18n.gettext('Is different'),
                            '>': Katrid.i18n.gettext('Greater-than'),
                            '<': Katrid.i18n.gettext('Less-than'),
                            '>=': Katrid.i18n.gettext('Greater-than equal'),
                            '<=': Katrid.i18n.gettext('Less-than equal'),
                            'is not null': Katrid.i18n.gettext('Is defined'),
                            'is null': Katrid.i18n.gettext('Is not defined'),
                        };
                    }
                    else if (field.internalType === 'BooleanField') {
                        return {
                            'true': Katrid.i18n.gettext('Yes'),
                            'false': Katrid.i18n.gettext('No'),
                        };
                    }
                }
            }
        }
        SearchView.viewType = 'search';
        Forms.SearchView = SearchView;
        Katrid.Forms.Views.registry['search'] = SearchView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class ListRenderer {
            constructor(viewInfo, options) {
                this.viewInfo = viewInfo;
                this.options = options;
                this.inlineEditor = false;
                this.rowSelector = false;
                this.columns = [];
            }
            render(list, records) {
                list.classList.add('list-view');
                let options = this.options || { rowSelector: true, showStar: false, allowGrouping: true };
                let _options = list.getAttribute('data-options');
                if (_options) {
                    _options = JSON.parse(_options);
                    Object.assign(options, _options);
                }
                let table = document.createElement('table');
                table.classList.add('table', 'table-sm', 'table-striped');
                this.tHead = document.createElement('thead');
                this.tHeadRow = document.createElement('tr');
                this.tBody = document.createElement('tbody');
                this.tRow = document.createElement('tr');
                if (options.rowSelector) {
                    this.tHeadRow.innerHTML = `<th class="list-record-selector">
        <input type="checkbox" v-model="allSelected" v-on:click.stop="toggleAll()">
          </th>`;
                    this.tRow.innerHTML = `<th class="list-record-selector" v-on:click.stop="selectToggle(record)">
        <input type="checkbox" v-model="record.$selected">
          </th>`;
                }
                if (options.showStar) {
                    let th = document.createElement('th');
                    th.classList.add('list-record-star');
                    this.tHeadRow.append(th);
                    let td = document.createElement('th');
                    td.classList.add('list-record-star');
                    td.title = 'Mark with star';
                    td.setAttribute('v-on:click.stop', 'action.markStar(record)');
                    td.innerHTML = `<i class="far fa-fw fa-star"></i>`;
                    this.tRow.append(td);
                }
                // render each field
                for (let f of list.querySelectorAll(':scope > field')) {
                    this.addField(f);
                    f.remove();
                }
                this.tRow.setAttribute(':data-id', 'record.id');
                this.tRow.setAttribute('v-if', '!groups');
                this.tRow.setAttribute('v-for', `(record, index) in ${records || 'records'}`);
                this.tRow.setAttribute(':selected', 'record.$selected');
                this.tRow.setAttribute('v-on:contextmenu', 'recordContextMenu(record, index, $event)');
                table.setAttribute('v-on:contextmenu', 'tableContextMenu($event)');
                table.setAttribute('v-on:keydown', 'rowKeyDown($event)');
                if (this.options?.recordClick)
                    this.tRow.setAttribute('v-on:click', this.options.recordClick);
                else
                    this.tRow.setAttribute('v-on:click', 'recordClick(record, index, $event)');
                // if (this.inlineEditor)
                //   this.tRow.setAttribute(
                //     ':class',
                //     `{
                //     'form-data-changing': (changing && recordIndex === index),
                //     'form-data-readonly': !(dataSource.changing && dataSource.recordIndex === index)
                //     }`
                //   );
                let ngTrClass = list.getAttribute('v-tr-class');
                if (ngTrClass) {
                    if (!ngTrClass.startsWith('{'))
                        ngTrClass = '{' + ngTrClass + '}';
                    this.tRow.setAttribute(':class', ngTrClass);
                }
                this.tRow.setAttribute(':class', '{modified: record.$state}');
                if (options.allowGrouping) {
                    let tr = document.createElement('tr');
                    tr.setAttribute('v-else-if', 'groups.length > 0');
                    tr.setAttribute('v-for', '(record, index) in groups');
                    tr.setAttribute('v-on:click', 'if (record.$hasChildren) toggleGroup(record); else recordClick(record, record.$index, $event);');
                    tr.setAttribute(':class', `{'group-header': record.$hasChildren}`);
                    // copy the cols definitions from regular records
                    tr.innerHTML = this.tRow.innerHTML;
                    for (let child of tr.children)
                        child.setAttribute('v-if', '!record.$hasChildren');
                    Array.from(this.tRow.children).forEach((el, index) => {
                        if (index > 1) {
                            let tdEmpty = document.createElement('td');
                            tdEmpty.setAttribute('v-if', 'record.$hasChildren');
                            tr.append(tdEmpty);
                        }
                    });
                    let td = document.createElement('th');
                    td.setAttribute('v-if', 'record.$hasChildren');
                    td.innerHTML = `<i class="fas fa-fw" :class="{'fa-chevron-right': !record.$expanded, 'fa-chevron-down': record.$expanded}"></i> <span v-text="record.$str"></span>`;
                    let cols = this.columns.length;
                    if (options.rowSelector)
                        cols++;
                    td.setAttribute('colspan', '2');
                    tr.insertBefore(td, tr.firstElementChild);
                    this.tBody.append(tr);
                }
                this.tHead.append(this.tHeadRow);
                let loadingRow = document.createElement('tr');
                loadingRow.setAttribute('v-if', 'loading');
                loadingRow.innerHTML = `<td class="table-loading text-center" colspan="${this.tRow.children.length}">
  <div class="spinner-border ms-auto" role="status" aria-hidden="true"></div>
</td>`;
                this.tBody.append(loadingRow);
                this.tBody.append(this.tRow);
                table.append(this.tHead);
                table.append(this.tBody);
                this.table = table;
                // this.createContextMenu();
                return table;
            }
            addField(fld) {
                if (fld.hasAttribute('invisible') || (fld.getAttribute('visible') === 'False'))
                    return;
                let fieldName = fld.getAttribute('name');
                let field = this.viewInfo.model.fields[fieldName];
                if (field && !field.visible)
                    return;
                let html = fld.innerHTML;
                // add anonymous column
                if (field?.visible || !field)
                    this.columns.push(field);
                if (!fieldName || html) {
                    let td = document.createElement('td');
                    let th = document.createElement('th');
                    th.classList.add('grid-field-readonly');
                    if (field) {
                        let caption = field.caption;
                        if (fld.hasAttribute('caption'))
                            caption = fld.getAttribute('caption');
                        th.innerHTML = `<span class="grid-field-readonly">${caption}</span>`;
                    }
                    else
                        th.innerText = fld.getAttribute('header');
                    td.innerHTML = html;
                    this.tHeadRow.append(th);
                    this.tRow.append(td);
                }
                else {
                    field.listCreate(this, fld);
                }
            }
        }
        Forms.ListRenderer = ListRenderer;
        class TableView extends Forms.RecordCollectionView {
            constructor() {
                super(...arguments);
                this._formCounter = 0;
                this.forms = {};
                this._readonly = true;
                this.rowSelector = true;
                this.allowGrouping = true;
                // async groupBy(data: any[]): Promise<any> {
                //   this.vm.records = this.vm.groups;
                // }
            }
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-outline-secondary btn-view-list';
                btn.innerHTML = '<i class="fas fa-list"></i>';
                btn.setAttribute('v-on:click', `setViewMode('list')`);
                container.append(btn);
            }
            static async createSearchDialog(config) {
                // load view info
                // let viewInfo = config.viewInfo;
                // if (!viewInfo)
                // load list and search view info from server
                let model = config.model;
                let viewsInfo = await model.service.loadViews({
                    views: { list: null, search: null },
                });
                let view = new this({ name: model.name, viewInfo: viewsInfo.views.list.info });
                let search = new Katrid.Forms.SearchView({ name: model.name, viewInfo: viewsInfo.views.search.info });
                view.dialog = true;
                view.render();
                search.render();
                let body = view.element.querySelector('.modal-body');
                body.insertBefore(search.element, body.firstElementChild);
                return view;
            }
            create(info) {
                if (info.multiple || (info.multiple == null))
                    this.rowSelector = info.multiple;
                super.create(info);
            }
            /**
             * Show a selection/search dialog
             * @param options
             */
            showDialog(options) {
                if (!options)
                    options = {};
                if (!options.multiple) {
                    this.rowSelector = false;
                    delete options.multiple;
                }
                this.dialog = true;
                if (!options.buttons) {
                    if (this.rowSelector)
                        this.dialogButtons = [
                            { text: 'OK', click: '$modalResult = selection', dismiss: 'modal' },
                            { text: Katrid.i18n.gettext('Cancel'), click: '$modalResult = false', dismiss: 'modal' },
                        ];
                    else
                        this.dialogButtons = ['close'];
                }
                else if (options.buttons) {
                    this.dialogButtons = options.buttons;
                    delete options.buttons;
                }
                this.dialogPromise = new Promise(async (resolve, reject) => {
                    let el = this.element;
                    if (!el)
                        el = this.render();
                    console.log('el', el);
                    this._modal = new bootstrap.Modal(el, options);
                    el.addEventListener('hidden.bs.modal', () => {
                        resolve(this.vm.$result);
                        this._modal.dispose();
                        el.remove();
                        this._modal = null;
                    });
                    this._modal.show();
                    // if (options?.edit)
                    //   this.vm.dataSource.edit();
                });
                return this.dialogPromise;
            }
            createInlineEditor() {
                let tr = document.createElement('tr');
                tr.classList.add('form-view', 'inline-editor');
                tr.setAttribute('data-form-id', (++this._formCounter).toString());
                if (this.rowSelector)
                    tr.append(document.createElement('th'));
                for (let f of Object.values(this.fields)) {
                    let td = document.createElement('td');
                    let control = f.formControl();
                    control.setAttribute('v-form-field', null);
                    td.append(control);
                    tr.append(td);
                }
                return tr;
            }
            async _recordClick(record, index) {
                await super._recordClick(record, index);
                this.vm.unselectAll();
                record.$selected = true;
                this.vm.selection = [record];
            }
            createFormComponent(record) {
                let me = this;
                return {
                    data() {
                        return {
                            selection: [],
                            record: new me.model.recordClass(record),
                        };
                    }
                };
            }
            createComponent() {
                let comp = super.createComponent();
                Object.assign(comp.methods, {
                    tableContextMenu(event) {
                        Forms.tableContextMenu.call(this, ...arguments);
                    },
                    recordContextMenu(record, index, event) {
                        Forms.listRecordContextMenu.call(this, ...arguments);
                    },
                    unselectAll() {
                        Forms.unselectAll.call(this, ...arguments);
                    },
                    selectToggle(record) {
                        Forms.selectionSelectToggle.call(this, record);
                    },
                    toggleAll(sel) {
                        Forms.selectionToggleAll.call(this, ...arguments);
                    },
                });
                return comp;
            }
            edit(index) {
                // let rec = this.vm.records[index];
                let table = this.element.querySelector('table');
                let tbody = table.tBodies[0];
                let tr = this.createInlineEditor();
                tr.setAttribute('data-index', index.toString());
                let vm = Katrid.createVm(this.createFormComponent(this.vm.records[index])).mount(tr);
                setTimeout(() => {
                    console.log(vm.record);
                    let oldRow = tbody.rows[index];
                    this.forms[this._formCounter] = { formRow: tr, relRow: oldRow, index, record: vm.record || {} };
                    tbody.insertBefore(tr, oldRow);
                    tbody.removeChild(oldRow);
                });
                return tr;
            }
            _removeForm(formId) {
                let form = this.forms[formId];
                if (form.relRow)
                    form.formRow.parentElement.insertBefore(form.relRow, form.formRow);
                form.formRow.remove();
                delete this.forms[formId];
                return form;
            }
            save(formId) {
                let form = this._removeForm(formId);
                if (form.index > -1) {
                    // this.vm.records[form.index] = form.record;
                    form.record.$flush();
                }
                else
                    this.vm.records.push(form.record);
            }
            cancel(formId) {
                let form = this._removeForm(formId);
                form.record.$discard();
            }
            renderTemplate(template) {
                template.setAttribute('data-options', JSON.stringify({ rowSelector: this.rowSelector }));
                let renderer = new ListRenderer({ model: this.model }, { allowGrouping: this.allowGrouping });
                let div = document.createElement('div');
                let table = renderer.render(template);
                div.className = 'table-responsive';
                div.append(table);
                return div;
            }
        }
        TableView.viewType = 'list';
        Forms.TableView = TableView;
        function dataTableContextMenu(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            // create context menu
            let menu = new Forms.ContextMenu();
            menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => copyToClipboard(evt.target.closest('table')));
            // menu.add('<i class="fa fa-fw fa-filter"></i> Filtrar pelo conteúdo deste campo', () => this.filterByFieldContent(td, rec));
            // menu.add('<i class="fa fa-fw fa-trash"></i> Excluir', () => this.deleteRow());
            // menu.add('Arquivar', this.copyClick);
            menu.show(evt.pageX, evt.pageY);
        }
        Forms.dataTableContextMenu = dataTableContextMenu;
        function copyToClipboard(table) {
            navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(table));
        }
        Katrid.directive('table-view', {
            mounted(el) {
                el.addEventListener('contextmenu', dataTableContextMenu);
            }
        });
        Katrid.Forms.Views.registry['list'] = TableView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    let _intlCache = {};
    function getNumberFormat(config) {
        let key = config.toString();
        let intl = _intlCache[key];
        if (!intl) {
            if (typeof config === 'number')
                intl = new Intl.NumberFormat(Katrid.i18n.languageCode, { minimumFractionDigits: config, maximumFractionDigits: config, });
            else
                intl = new Intl.NumberFormat(Katrid.i18n.languageCode, config);
            _intlCache[key] = intl;
        }
        return intl;
    }
    Katrid.intl = {
        number(config) {
            let cfg = {};
            if (typeof config === 'number')
                cfg.minimumFractionDigits = config;
            if (!config)
                cfg.maximumFractionDigits = 2;
            return getNumberFormat(cfg);
        },
        toFixed: (length) => getNumberFormat(length),
    };
    const fmtCharMap = { 'd': 'DD', 'm': 'MM', 'M': 'm', 'i': 'mm', 'H': 'HH' };
    function convertFormat(fmt) {
        let escape = false;
        let res = '';
        for (let n = 0; n < fmt.length; n++) {
            let c = fmt[n];
            if (c === '\\')
                escape = !escape;
            else if (!escape)
                c = fmtCharMap[c] || c;
            res += c;
        }
        return res;
    }
    function expandFormats(fmts) {
        // convert server formats do client
        fmts.shortDateFormat = convertFormat(fmts.SHORT_DATE_FORMAT);
        fmts.shortDateTimeFormat = convertFormat(fmts.SHORT_DATETIME_FORMAT);
        return fmts;
    }
    // Internationalization
    Katrid.i18n = {
        languageCode: navigator.language,
        formats: {},
        catalog: {},
        initialize(plural, catalog, formats) {
            Katrid.i18n.plural = plural;
            Katrid.i18n.catalog = catalog;
            Katrid.i18n.formats = expandFormats(formats);
            if (plural) {
                Katrid.i18n.pluralidx = function (n) {
                    if (plural instanceof Boolean) {
                        if (plural) {
                            return 1;
                        }
                        else {
                            return 0;
                        }
                    }
                    else {
                        return plural;
                    }
                };
            }
            else {
                Katrid.i18n.pluralidx = function (n) {
                    if (n === 1) {
                        return 0;
                    }
                    else {
                        return 1;
                    }
                };
            }
        },
        merge(catalog) {
            return Array.from(catalog).map((key) => (Katrid.i18n.catalog[key] = catalog[key]));
        },
        gettext(s) {
            const value = Katrid.i18n.catalog[s];
            if (value != null) {
                return value;
            }
            else {
                return s;
            }
        },
        gettext_noop(s) {
            return s;
        },
        ngettext(singular, plural, count) {
            const value = Katrid.i18n.catalog[singular];
            if (value != null) {
                return value[Katrid.i18n.pluralidx(count)];
            }
            else if (count === 1) {
                return singular;
            }
            else {
                return plural;
            }
        },
        pgettext(s) {
            let value = Katrid.i18n.gettext(s);
            if (value.indexOf('\x04') !== -1) {
                value = s;
            }
            return value;
        },
        npgettext(ctx, singular, plural, count) {
            let value = Katrid.i18n.ngettext(ctx + '\x04' + singular, ctx + '\x04' + plural, count);
            if (value.indexOf('\x04') !== -1) {
                value = Katrid.i18n.ngettext(singular, plural, count);
            }
            return value;
        },
        interpolate(fmt, obj) {
            fmt = this.gettext(fmt);
            if (Array.isArray(obj))
                return fmt.replace(/%s/g, match => String(obj.shift()));
            return fmt.replace(/%\(\w+\)s/g, match => String(obj[match.slice(2, -2)]));
        }
    };
    if (window['KATRID_I18N'])
        Katrid.i18n.initialize(KATRID_I18N.plural, KATRID_I18N.catalog, KATRID_I18N.formats);
    else
        Katrid.i18n.gettext = s => s;
})(Katrid || (Katrid = {}));
/// <reference path="../../../utils/i18n.ts"/>
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class SearchViewController {
                    constructor(searchView) {
                        this.searchView = searchView;
                        let container = searchView.element;
                        this.query = new Search.SearchQuery(this);
                        this.searchItems = [];
                        this.searchFields = [];
                        this.filterGroups = [];
                        this.groups = [];
                        this._groupLength = this.groupLength = 0;
                        // groups must have a unique facet
                        this.facetGrouping = new Search.FacetGroup();
                        this.query = new Search.SearchQuery(this);
                        this.menu = container.querySelector('.search-dropdown-menu.search-view-menu');
                        // new CustomFilterHelper(this, this.querySelector('.search-filter-button'));
                        // new SaveFilterHelper(this, this.querySelector('.search-filter-favorites'));
                        // new GroupFilterHelper(this, this.querySelector('.search-groupby-button'));
                        // let menu = this.createMenu(scope, element.find('.search-dropdown-menu.search-view-menu'), element);
                        this.input = container.querySelector('.search-view-input');
                        let vm = searchView.vm;
                        vm.filterGroups = this.filterGroups;
                        vm.groups = this.groups;
                        this.vm = vm;
                        this.facets = this.vm.facets;
                        this.input.addEventListener('blur', (evt) => {
                            vm.searchText = '';
                            this.close();
                        });
                        this.input.addEventListener('keydown', (evt) => {
                            switch (evt.which) {
                                case Katrid.UI.keyCode.DOWN:
                                    vm.move(1);
                                    evt.preventDefault();
                                    break;
                                case Katrid.UI.keyCode.UP:
                                    vm.move(-1);
                                    evt.preventDefault();
                                    break;
                                case Katrid.UI.keyCode.ENTER:
                                    let item = vm.availableItems[vm.currentIndex];
                                    if (item)
                                        item.select();
                                    vm.searchText = '';
                                    break;
                                case Katrid.UI.keyCode.BACKSPACE:
                                    if (vm.searchText === '') {
                                        vm.facets[this.facets.length - 1].clear();
                                        vm.facets.splice(this.facets.length - 1, 1).map(facet => facet.clear());
                                        vm.update();
                                    }
                                    break;
                            }
                        });
                    }
                    get text() {
                        return this.vm.searchText;
                    }
                    get schema() {
                        return this._schema;
                    }
                    set schema(value) {
                        this._schema = value;
                        if (value)
                            this.setContent(value);
                    }
                    setContent(schema) {
                        if (schema instanceof HTMLElement) {
                            for (let child of schema.children) {
                                let tag = child.tagName;
                                let obj;
                                if (tag === 'FILTER') {
                                    obj = Search.SearchFilters.fromItem(this.searchView, child);
                                    this.filterGroups.push(obj);
                                }
                                else if (tag === 'FILTER-GROUP') {
                                    obj = Search.SearchFilters.fromGroup(this.searchView, child);
                                    this.filterGroups.push(obj);
                                    continue;
                                }
                                else if (tag === 'GROUP') {
                                    obj = Search.SearchGroups.fromGroup({
                                        view: this,
                                        el: child,
                                    });
                                    this.groups.push(obj);
                                    continue;
                                }
                                else if (tag === 'FIELD') {
                                    obj = Search.SearchField.fromField(this.searchView, child);
                                    this.searchFields.push(obj);
                                    continue;
                                }
                                if (obj)
                                    this.addItem(obj);
                            }
                        }
                        else {
                            for (let item of schema.items) {
                            }
                        }
                    }
                    addItem(item) {
                        this.searchItems.push(item);
                    }
                    get availableItems() {
                        return this._availableItems;
                    }
                    show() {
                        this.vm.availableItems = [];
                        if (!this._availableItems) {
                            this._availableItems = [].concat(this.searchFields);
                        }
                        // close expanded items
                        for (let obj of this._availableItems)
                            if (obj.expanded) {
                                obj.expanded = false;
                            }
                        this.vm.availableItems = this._availableItems;
                        // console.log(this.menu, this.vm.availableItems);
                        // document.body.append(this.menu);
                        this.menu.classList.add('show');
                        this.first();
                    }
                    close() {
                        this.vm.availableItems = null;
                        this.menu.classList.remove('show');
                        this.reset();
                        this.input.value = '';
                    }
                    reset() {
                        for (let i of this.searchFields)
                            if (i && i.children && i.children.length)
                                i.expanded = false;
                    }
                    clear() {
                    }
                    addCustomFilter(field, value) {
                        let filters = new Search.SearchFilters(this.searchView);
                        filters.push(new Search.CustomFilterItem(this, field, '=', value, filters));
                        filters.selectAll();
                    }
                    first() {
                        this.vm.currentIndex = 0;
                    }
                    removeItem(index) {
                        let facet = this.facets[index];
                        facet.destroy();
                        this.facets.splice(index, 1);
                        this.update();
                    }
                    getParams() {
                        let r = [];
                        for (let i of this.vm.facets)
                            if (!i.grouping)
                                r = r.concat(i.getParamValues());
                        return r;
                    }
                    addFacet(facet) {
                        if (!this.vm.facets.includes(facet))
                            this.vm.facets.push(facet);
                    }
                    load(filter) {
                        filter.map(item => {
                            let i;
                            if (typeof item === 'string')
                                i = this.getByName(item);
                            else
                                i = this.getByName(item[0]);
                            if (!i?.selected)
                                i.toggle();
                        });
                    }
                    getByName(name) {
                        // try to find inside a group of filters
                        for (let item of this.filterGroups)
                            for (let subitem of item)
                                if (subitem.name === name)
                                    return subitem;
                        // for (let item of this.items)
                        //   if (item.name === name)
                        //     return item;
                        //
                        for (let group of this.groups)
                            for (let item of group.items)
                                if (item.name === name)
                                    return item;
                    }
                    dump() {
                        let res = [];
                        for (let i of this.facets)
                            res.push(i);
                        return res;
                    }
                    async update() {
                        if (this.groupLength !== this._groupLength) {
                            this._groupLength = this.groupLength;
                            await this.view.resultView.applyGroups(this.groupBy(), this.getParams());
                        }
                        else { }
                        // apply changes to window action
                        // this.action.setSearchParams(this.getParams());
                        this.vm.update();
                    }
                    groupBy() {
                        return this.facetGrouping.values.map(obj => obj._ref.groupBy);
                    }
                }
                Search.SearchViewController = SearchViewController;
                Katrid.component('search-view', {
                    template: ``,
                    mounted() {
                        this.$viewInfo = this.$parent.views?.search;
                        let search = this.search = this.$search = new SearchViewController(this);
                        console.log('search mounted', search);
                        this.$parent.searchView = search;
                        this.facets = search.facets;
                        this.$parent.search = this.$search;
                        this.$search.model = this.$parent.model;
                        this.$search.action = this.$parent.action;
                        if (this.$viewInfo?.fields)
                            this.$search.fields = this.$viewInfo.fields;
                        search.view = this.$parent.actionView;
                        if (this.$viewInfo?.template)
                            this.$search.setContent(this.$viewInfo.template);
                    },
                    data() {
                        return {
                            fields: this.$parent.fields,
                            search: {},
                            fieldConditions: {},
                            action: this.$parent.action,
                            fieldName: null,
                            currentIndex: -1,
                            searchText: '',
                            groupByExpanded: false,
                            facets: [],
                            availableItems: [],
                            customFilter: [],
                            customSearchExpanded: false,
                            tempCondition: null,
                            tempFilter: null,
                            searchValue: null,
                        };
                    },
                    components: Katrid.componentsRegistry,
                });
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                Search.conditionsLabels = {
                    '=': Katrid.i18n.gettext('Is equal'),
                    '!=': Katrid.i18n.gettext('Is different'),
                    '>': Katrid.i18n.gettext('Greater-than'),
                    '<': Katrid.i18n.gettext('Less-than'),
                    '%': Katrid.i18n.gettext('Contains'),
                    '!%': Katrid.i18n.gettext('Not contains'),
                    'range': Katrid.i18n.gettext('Between'),
                    'like': Katrid.i18n.gettext('Like'),
                };
                Search.conditionSuffix = {
                    '=': '',
                    '!=': '__isnot',
                    '%': '__icontains',
                    '!%': '__not_icontains',
                    '>': '__gt',
                    '>=': '__gte',
                    '<': '__lt',
                    '<=': '__lte',
                    'in': '__in',
                    'not in': '__not_in',
                    'range': '__range',
                    'is null': '__isnull',
                    'is not null': '__isnnull',
                };
                class SearchItem {
                    constructor(view, name, el) {
                        this.view = view;
                        this.name = name;
                        this.el = el;
                        this.controller = view.controller;
                    }
                    getDisplayValue() {
                        if (this.value) {
                            return this.value[1];
                        }
                        return this.searchString;
                    }
                    getParamValue(name, value) {
                        let r = {};
                        if (Array.isArray(value)) {
                            r[name] = value[0];
                        }
                        else {
                            r[name + '__icontains'] = value;
                        }
                        return r;
                    }
                    _doChange() {
                        this.view.update();
                    }
                }
                Search.SearchItem = SearchItem;
                class SearchFilter extends SearchItem {
                    constructor(view, name, caption, domain, group, el) {
                        super(view, name, el);
                        this.group = group;
                        this.caption = caption;
                        if (Katrid.isString(domain))
                            domain = JSON.parse(domain.replace(/'/g, '"'));
                        this.domain = domain;
                        this._selected = false;
                    }
                    static fromItem(view, el, group) {
                        return new SearchFilter(view, el.attr('name'), el.attr('caption') || el.attr('label'), el.attr('domain'), group, el);
                    }
                    toString() {
                        return this.caption;
                    }
                    toggle() {
                        this.selected = !this.selected;
                    }
                    get selected() {
                        return this._selected;
                    }
                    set selected(value) {
                        this._selected = value;
                        if (value)
                            this.group.addValue(this);
                        else
                            this.group.removeValue(this);
                        this._doChange();
                    }
                    getDisplayValue() {
                        return this.caption;
                    }
                    get facet() {
                        return this.group.facet;
                    }
                    getParamValue() {
                        return this.domain;
                    }
                    get value() {
                        return this.domain;
                    }
                }
                Search.SearchFilter = SearchFilter;
                class SearchFilters {
                    constructor(view, facet) {
                        this.view = view;
                        this.items = [];
                        this._selected = false;
                        this.view = view;
                        this.controller = view.controller;
                        this._selection = [];
                        if (!facet)
                            facet = new Search.FacetView(this);
                        this.facet = facet;
                    }
                    static fromItem(view, el) {
                        let group = new SearchFilters(view);
                        group.push(SearchFilter.fromItem(view, el, group));
                        return group;
                    }
                    static fromGroup(view, el) {
                        let group = new SearchFilters(view);
                        for (let child of $(el).children())
                            group.push(SearchFilter.fromItem(view, $(child), group));
                        return group;
                    }
                    get selected() {
                        return this._selected;
                    }
                    set selected(value) {
                        this._selected = value;
                        if (value)
                            for (let item of this.items)
                                this.addValue(item);
                        else {
                            for (let item of this.items)
                                this.removeValue(item);
                            // this.facet.values = [];
                        }
                        this.view.update();
                    }
                    toggle() {
                        this.selected = !this.selected;
                    }
                    addValue(item) {
                        if (this._selection.indexOf(item) > -1)
                            return;
                        this._selection.push(item);
                        this.facet.values = this._selection.map(item => (new SearchObject(item.toString(), item.value)));
                        this._refresh();
                    }
                    removeValue(item) {
                        this._selection.splice(this._selection.indexOf(item), 1);
                        this.facet.values = this._selection.map(item => ({ searchString: item.getDisplayValue(), value: item.value }));
                        this._refresh();
                    }
                    selectAll() {
                        for (let item of this.items)
                            this.addValue(item);
                        this.view.update();
                    }
                    get caption() {
                        return '<span class="fa fa-filter"></span>';
                    }
                    toString() {
                        return this.items.join(' OR ');
                    }
                    _refresh() {
                        if (this._selection.length) {
                            if (this.controller.vm.facets.indexOf(this.facet) === -1)
                                this.controller.vm.facets.push(this.facet);
                        }
                        else if (this.controller.vm.facets.indexOf(this.facet) > -1)
                            this.controller.vm.facets.splice(this.controller.vm.facets.indexOf(this.facet), 1);
                    }
                    getParamValue(v) {
                        return v.value;
                    }
                    clear() {
                        this._selection = [];
                    }
                    push(item) {
                        this.items.push(item);
                    }
                }
                Search.SearchFilters = SearchFilters;
                class SearchObject {
                    constructor(display, value) {
                        this.display = display;
                        this.value = value;
                    }
                }
                Search.SearchObject = SearchObject;
                class SearchResult {
                    constructor(field, value) {
                        this.field = field;
                        this.value = [value.id, value.text];
                        this.text = value.text;
                        this.indent = true;
                    }
                    select() {
                        this.field.selectItem(this.value);
                    }
                }
                Search.SearchResult = SearchResult;
                class SearchField extends SearchItem {
                    constructor(view, name, el, field) {
                        super(view, name, el);
                        this.field = field;
                        this._expanded = false;
                        if (field.type === 'ForeignKey') {
                            this.expandable = true;
                            this.children = [];
                        }
                        else {
                            this.expandable = false;
                        }
                    }
                    get expanded() {
                        return this._expanded;
                    }
                    set expanded(value) {
                        this._expanded = value;
                        if (value)
                            this._loadChildren();
                        else {
                            this.children = [];
                            if (this.view.$items)
                                for (let i = this.view.$items.length - 1; i > 0; i--) {
                                    let obj = this.view.$items[i];
                                    if (obj.field === this) {
                                        this.view.$items.splice(i, 1);
                                    }
                                }
                        }
                    }
                    _loadChildren() {
                        this.loading = true;
                        this.view.model.service.getFieldChoices({ field: this.name, term: this.view.vm.searchText })
                            .then((res) => {
                            this.children = res.items;
                            // append returned items onto searchView.$items menu
                            let index = this.view.controller.availableItems.indexOf(this);
                            if (index > -1) {
                                for (let obj of this.children) {
                                    index++;
                                    this.view.controller.availableItems.splice(index, 0, new SearchResult(this, obj));
                                }
                            }
                        })
                            .finally(() => this.loading = false);
                    }
                    get facet() {
                        if (!this._facet)
                            this._facet = new Search.FacetView(this);
                        return this._facet;
                    }
                    getDisplayValue() {
                        return this.value;
                    }
                    getParamValue(value) {
                        let r = {};
                        let name = this.name;
                        if (_.isArray(value)) {
                            r[name] = value[0];
                        }
                        else if (value instanceof SearchObject) {
                            return value.value;
                        }
                        else {
                            r[name + this.field.defaultSearchLookup] = value;
                            console.log('get param value', this.field);
                        }
                        return r;
                    }
                    get caption() {
                        return this.field.caption;
                    }
                    get value() {
                        if (this._value)
                            return this._value[1];
                        return this.view.vm.searchText;
                    }
                    select() {
                        this.facet.addValue(this.value);
                        this.view.controller.addFacet(this.facet);
                        this.view.controller.close();
                        this.view.update();
                    }
                    selectItem(item) {
                        let domain = {};
                        domain[this.field.name] = item[0];
                        this.facet.addValue(new SearchObject(item[1], domain));
                        this.view.controller.addFacet(this.facet);
                        this.view.controller.close();
                        this.view.update();
                    }
                    static fromField(view, el) {
                        let field = view.fields[el.getAttribute('name')];
                        return new SearchField(view, field.name, el, field);
                    }
                    get template() {
                        return Katrid.i18n.interpolate(Katrid.i18n.gettext(`Search <i>%(caption)s</i> by: <strong>%(text)s</strong>`), {
                            caption: this.field.caption,
                            text: this.view.vm.searchText,
                        });
                    }
                }
                Search.SearchField = SearchField;
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
/// <reference path="index.ts"/>
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class CustomFilterItem extends Search.SearchFilter {
                    constructor(view, field, condition, value, group) {
                        super(view, field.name, field.caption, null, group);
                        this.field = field;
                        this.condition = condition;
                        this._value = value;
                        this._selected = true;
                    }
                    toString() {
                        let s = this.field.format(this._value);
                        return this.field.caption + ' ' + Search.conditionsLabels[this.condition].toLowerCase() + ' "' + s + '"';
                    }
                    get value() {
                        let r = {};
                        r[this.field.name + Search.conditionSuffix[this.condition]] = this.field.getParamValue(this._value);
                        return r;
                    }
                }
                Search.CustomFilterItem = CustomFilterItem;
                class CustomFilterHelper {
                    constructor(searchView, container) {
                        this.searchView = searchView;
                        container.innerHTML = `<button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" type="button"
                aria-expanded="false">
          <span class="fa fa-filter fa-fw"></span> ${_.gettext('Filters')} <span class="caret"></span>
        </button>

    <div class="dropdown-menu search-view-filter-menu">
      <div>
        <div v-for="group in filterGroups">
          <a class="dropdown-item" ng-class="{'selected': filter.selected}" v-for="filter in group" v-on:click.prevent="filter.toggle()">
            {{filter.toString()}}
          </a>
          <div class="dropdown-divider"></div>
        </div>
      </div>
      <div>
        <div v-for="filter in filters">
          <a class="dropdown-item" :class="{'selected': filterItem.selected}"
             v-on:click.stop.prevent="filterItem.toggle()"
             v-for="filterItem in filter.items">{{filterItem.toString()}}</a>
          <div class="dropdown-divider"></div>
        </div>
        <a class="dropdown-item dropdown-search-item" v-on:click.stop="expanded=!expanded">
          <i :class="{ 'fa-caret-right': !expanded, 'fa-caret-down': expanded }" class="fa expandable"></i>
          ${_.gettext('Add Custom Filter')}
        </a>

        <div v-if="expanded" v-on:click.stop.prevent="">
          <div v-show="tempFilter.length" class="margin-bottom-8">
            <a href="#" v-on:click.prevent="" class="dropdown-item" v-for="filter in tempFilter" title="${_.gettext('Remove item')}">
            {{ filter.toString() }}
            </a>
          </div>
          <div class="col-12">
            <div class="form-group">
              <select class="form-control" v-model="fieldName" v-on:change="fieldChange(fieldName)">
                <option value=""></option>
                <option v-for="field in fieldList" :value="field.name">{{field.caption}}</option>
              </select>
            </div>
            <div class="form-group">
              <select class="form-control" v-model="conditionName" v-if="field" v-on:change="condition=conditions[conditionName]">
                <option :value="cond.name" v-for="cond in conditionList">{{ cond.label }}</option>
              </select>
            </div>
            <div class="form-group">
              <input class="form-control" v-model="value" v-if="condition.input === 'input'">
              <select class="form-control" v-model="value" v-if="condition.input === 'select'">
                <option :value="value" v-for="(value, name) in condition.options">{{ name }}</option>
              </select>
            </div>
            <div class="form-group">
              <button class="btn btn-primary" type="button" v-on:click="applyFilter(field, condition, searchValue)" v-show="conditionName">
                ${_.gettext('Apply')}
              </button>
              <button class="btn btn-outline-secondary" type="button"
                      v-on:click="addCondition(field, condition, searchValue);fieldName='';" v-show="conditionName">
                ${_.gettext('Add a condition')}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>`;
                        new Vue({
                            el: container,
                            methods: {
                                applyFilter: function () {
                                    if (this.value)
                                        this.addCondition(this.field, this.conditionName, this.value);
                                    this.customFilter.push(this.tempFilter);
                                    this.tempFilter.selectAll();
                                    this.filters.push(this.tempFilter);
                                    console.log('apply filters field change');
                                    this.tempFilter = new Search.SearchFilters(searchView);
                                    this.expanded = false;
                                },
                                addCondition: function () {
                                    this.tempFilter.push(new CustomFilterItem(searchView, this.field, this.conditionName, this.value, this.tempFilter));
                                    this.field = null;
                                    this.condition = { input: false };
                                    this.value = null;
                                },
                                fieldChange: function (name) {
                                    this.condition = { input: false };
                                    this.conditionName = '';
                                    this.conditions = {};
                                    this.field = searchView.fields[name];
                                    this.conditionList = this.field.getFilterConditions();
                                    for (let cond of this.conditionList) {
                                        if (cond.input === undefined)
                                            cond.input = 'input';
                                        this.conditions[cond.name] = cond;
                                    }
                                },
                            },
                            data() {
                                return {
                                    value: null,
                                    conditions: {},
                                    conditionList: [],
                                    condition: {
                                        input: false,
                                    },
                                    conditionName: '',
                                    searchValue: null,
                                    customFilter: [],
                                    tempFilter: new Search.SearchFilters(searchView),
                                    field: null,
                                    fieldName: '',
                                    filters: [],
                                    fieldList: Object.values(searchView.fields),
                                    fields: searchView.fields,
                                    filterGroups: searchView.filterGroups,
                                    expanded: false,
                                };
                            }
                        });
                    }
                }
                Search.CustomFilterHelper = CustomFilterHelper;
                class GroupFilterHelper {
                    constructor(searchView, container) {
                        container.innerHTML = `<button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" type="button">
          <span class="fa fa-bars fa-fw"></span> ${_.gettext('Group By')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu search-view-groups-menu">
          <div>
            <div v-for="group in groups">
              <a class="dropdown-item" ng-class="{'selected': filter.selected}" v-for="filter in group"
                 v-on:click.prevent="filter.toggle()">
                {{filter.toString()}}
              </a>
              <div class="dropdown-divider" v-if="groups.length"></div>
            </div>
          </div>

          <a class="dropdown-item dropdown-search-item" v-on:click.stop="expanded=!expanded">
            <i :class="{ 'fa-caret-right': !expanded, 'fa-caret-down': expanded }"
               class="fa expandable"></i>
            ${_.gettext('Add Custom Group')}
          </a>

          <div v-if="expanded" v-on:click.stop.prevent="">
            <div class="col-12">
              <div class="form-group">
                <select class="form-control" v-model="fieldName" v-change="fieldChange(fields[fieldName])">
                  <option value=""></option>
                  <option v-for="field in fieldList" :value="field.name">{{field.caption}}</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="addCustomGroup(fields[fieldName]);fieldName='';">
                  ${_.gettext('Apply')}
                </button>
              </div>
            </div>
          </div>

        </div>`;
                    }
                }
                Search.GroupFilterHelper = GroupFilterHelper;
                class SaveFilterHelper {
                    constructor(searchView, container) {
                        container.innerHTML = `<button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" type="button"
                aria-expanded="false">
          <span class="fa fa-star fa-fw"></span> ${Katrid.i18n.gettext('Favorites')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu search-favorite-menu" style="min-width: 300px">
          <a class="dropdown-item dropdown-search-item" v-on:click.stop="expanded=!expanded">
            <i :class="{ 'fa-caret-right': !expanded, 'fa-caret-down': expanded }"
               class="fa expandable"></i>
            ${Katrid.i18n.gettext('Save current search')}
          </a>
          <div v-if="expanded" v-on:click.stop>
            <div class="col-12">
              <div class="form-group">
                <input type="text" class="form-control" v-model="saveSearch.name" placeholder="${Katrid.i18n.gettext('Search name')}">
              </div>
              <div class="form-group" ng-init="saveSearch.is_default=false;saveSearch.is_shared=true;">
                <label>
                  <input type="checkbox" v-model="saveSearch.is_default" v-on:click.stop>
                  ${Katrid.i18n.gettext("Use by default")}
                </label>
                <label>
                  <input type="checkbox" v-model="saveSearch.is_shared">
                  ${Katrid.i18n.gettext("Share with all users")}
                </label>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="saveSearch(saveSearch)">
                  ${Katrid.i18n.gettext('Save')}
                </button>
              </div>
            </div>
          </div>
        </div>`;
                    }
                }
                Search.SaveFilterHelper = SaveFilterHelper;
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class FacetView {
                    constructor(item) {
                        this.item = item;
                        this.values = [];
                    }
                    get separator() {
                        return ` <span class="facet-values-separator">${Katrid.i18n.gettext('or')}</span> `;
                    }
                    init(item, values) {
                        this.item = item;
                        if (values)
                            this.values = values;
                        else
                            this.values = [{
                                    searchString: this.item.getDisplayValue(), value: this.item.value
                                }];
                    }
                    addValue(value) {
                        return this.values.push(value);
                    }
                    get caption() {
                        return this.item.caption;
                    }
                    clear() {
                        this.values = [];
                    }
                    get templateValue() {
                        return (Array.from(this.values).map((s) => s instanceof Search.SearchObject ? s.display : s)).join(this.separator);
                    }
                    template() {
                        return;
                    }
                    link(searchView) {
                        const html = $(this.template());
                        this.item.facet = this;
                        this.element = html;
                        const rm = html.find('.facet-remove');
                        rm.click((evt) => searchView.onRemoveItem(evt, this.item));
                        return html;
                    }
                    render(el) {
                    }
                    refresh() {
                        return this.element.find('.facet-value').html(this.templateValue);
                    }
                    load(searchView) {
                        searchView.query.loadItem(this.item);
                        this.render(searchView);
                    }
                    destroy() {
                        this.clear();
                    }
                    getParamValues() {
                        const r = [];
                        for (let v of this.values) {
                            r.push(this.item.getParamValue(v));
                        }
                        if (r.length > 1)
                            return [{ 'OR': r }];
                        return r;
                    }
                }
                Search.FacetView = FacetView;
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class FacetGroup extends Search.FacetView {
                    constructor(...args) {
                        super(args);
                        this.grouping = true;
                    }
                    clear() {
                        let oldValues = this.values;
                        super.clear();
                        for (let v of oldValues)
                            if (v._ref)
                                v._ref._selected = false;
                    }
                    get separator() {
                        return ` <span> &gt; </span> `;
                    }
                    get caption() {
                        return '<span class="fa fa-bars"></span>';
                    }
                }
                Search.FacetGroup = FacetGroup;
                class SearchGroups extends Search.SearchFilters {
                    constructor(view, facet) {
                        if (!facet)
                            facet = new FacetGroup();
                        super(view, facet);
                    }
                    static fromGroup(opts) {
                        let view = opts.view;
                        let el = opts.el;
                        // get default facet
                        let facet = opts.facet || view.facetGrouping;
                        let group = new SearchGroups(view, facet);
                        group.push(SearchGroup.fromItem(view, el, group));
                        return group;
                    }
                    static fromField({ view, field }) {
                        let facet = view.facetGrouping;
                        let group = new SearchGroups(view, facet);
                        group.push(SearchGroup.fromField(view, field, group));
                        return group;
                    }
                    addValue(item) {
                        this.view.groupLength++;
                        let newItem = new Search.SearchObject(item.toString(), item.value);
                        newItem._ref = item;
                        this.facet.values.push(newItem);
                        this._refresh();
                    }
                    removeValue(item) {
                        this.view.groupLength--;
                        for (let i of this.facet.values)
                            if (i._ref === item) {
                                this.facet.values.splice(this.facet.values.indexOf(i), 1);
                                break;
                            }
                        this._refresh();
                    }
                    _refresh() {
                        if (this.facet.values.length) {
                            if (this.view.facets.indexOf(this.facet) === -1)
                                this.view.facets.push(this.facet);
                        }
                        else if (this.view.facets.indexOf(this.facet) > -1)
                            this.view.facets.splice(this.view.facets.indexOf(this.facet), 1);
                    }
                }
                Search.SearchGroups = SearchGroups;
                class SearchGroup extends Search.SearchFilter {
                    constructor(view, name, caption, group, el) {
                        super(view, name, caption, null, group, el);
                        this.group = group;
                        if (el && el.getAttribute('context'))
                            this.context = eval(`(${el.getAttribute('context')})`);
                        this.groupBy = this.context?.group_by || name;
                        this._selected = false;
                    }
                    static fromItem(view, el, group) {
                        return new SearchGroup(view, el.getAttribute('name'), el.getAttribute('caption'), group, el);
                    }
                    static fromField(view, field, group) {
                        return new SearchGroup(view, field.name, field.caption, group);
                    }
                    toString() {
                        return this.caption;
                    }
                }
                Search.SearchGroup = SearchGroup;
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class SearchQuery {
                    constructor(searchView) {
                        this.searchView = searchView;
                        this.items = [];
                        this.groups = [];
                    }
                    add(item) {
                        if (this.items.includes(item)) {
                            item.facet.addValue(item);
                            item.facet.refresh();
                        }
                        else {
                            this.items.push(item);
                            this.searchView.renderFacets();
                        }
                        if (item instanceof Search.SearchGroup)
                            this.groups.push(item);
                        this.searchView.change();
                    }
                    loadItem(item) {
                        this.items.push(item);
                        if (item instanceof Search.SearchGroup)
                            this.groups.push(item);
                    }
                    remove(item) {
                        this.items.splice(this.items.indexOf(item), 1);
                        if (item instanceof Search.SearchGroup) {
                            this.groups.splice(this.groups.indexOf(item), 1);
                        }
                        this.searchView.change();
                    }
                    getParams() {
                        let r = [];
                        for (let i of this.items)
                            r = r.concat(i.getParamValues());
                        return r;
                    }
                }
                Search.SearchQuery = SearchQuery;
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            Katrid.component('input-ajax-choices', {
                props: ['modelValue'],
                template: '<input>',
                mounted() {
                    let element = $(this.$el);
                    const multiple = this.$el.hasAttribute('multiple');
                    const serviceName = this.$attrs['ajax-choices'];
                    let field = this.$attrs.field;
                    let _timeout = null;
                    let domain;
                    let nameFields = this.$attrs['name-fields'];
                    let modelChoices = this.$attrs['model-choices'];
                    const cfg = {
                        allowClear: true,
                        query(query) {
                            // make params
                            let data = {
                                args: [query.term],
                                kwargs: {
                                    count: 1,
                                    page: query.page,
                                    name_fields: nameFields?.split(",") || null
                                }
                            };
                            if (domain)
                                data.domain = domain;
                            const f = () => {
                                let svc = new Katrid.Services.ModelService(serviceName);
                                let res;
                                if (field)
                                    res = svc.getFieldChoices({ field, term: query.term, kwargs: data.kwargs });
                                else
                                    res = new Katrid.Services.ModelService(modelChoices).searchByName(data);
                                res.then(res => {
                                    let data = res.items;
                                    const r = data.map(item => ({
                                        id: item.id,
                                        text: item.text
                                    }));
                                    const more = query.page * Katrid.settings.services.choicesPageLimit < res.count;
                                    return query.callback({
                                        results: r,
                                        more: more
                                    });
                                });
                            };
                            if (_timeout)
                                clearTimeout(_timeout);
                            _timeout = setTimeout(f, 400);
                        },
                        escapeMarkup(m) {
                            return m;
                        },
                        initSelection(element, callback) {
                        }
                    };
                    if (multiple)
                        cfg['multiple'] = true;
                    const el = element.select2(cfg);
                    el.addClass('col-12');
                    element.on('$destroy', function () {
                        $('.select2-hidden-accessible').remove();
                        $('.select2-drop').remove();
                        return $('.select2-drop-mask').remove();
                    });
                    el.on('change', event => {
                        let v = el.select2('data');
                        if (Array.isArray(v))
                            v = v.map(obj => obj.id);
                        else if (v && ('id' in v))
                            v = v.id;
                        this.$emit('update:modelValue', v);
                    });
                },
            });
            Katrid.component('multiple-tags', {
                template: `<select><slot></slot></select>`,
                mounted() {
                    let el = $(this.$el).select2();
                    el.on('change', event => {
                        let v = el.select2('data');
                        if (Array.isArray(v))
                            v = v.map(obj => obj.id);
                        else if (v && ('id' in v))
                            v = v.id;
                        this.$emit('update:modelValue', v);
                    });
                }
            });
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            Katrid.component('attachments-button', {
                render() {
                    let templ = `<div class="dropdown">
        <button id="attachments-button"
                type="button" class="btn btn-outline-secondary dropdown-toggle"
                data-bs-toggle="dropdown" aria-haspopup="true">
          <span v-if="!attachments.length">${Katrid.i18n.gettext('Attachments')} </span>
          <span
              v-if="attachments.length">{{ $filters.sprintf('${Katrid.i18n.gettext('%s Attachment(s)')}', attachments.length) }}
          </span>
          <span class="caret"></span>
        </button>
        <div class="dropdown-menu attachments-menu">
          <a class="dropdown-item position-relative" v-for="(attachment, index) in attachments"
             :href="attachment.download_url">
            {{ attachment.name }} <span
              class="fa fa-times remove-attachment-button" title="${Katrid.i18n.gettext('Delete attachment')}"
              v-on:click.prevent.stop="deleteAttachment(index)"></span>
          </a>
          <div role="separator" class="dropdown-divider" v-show="attachments.length"></div>
          <a class="dropdown-item" onclick="$(this).next().click();">
            ${Katrid.i18n.gettext('Add...')}
          </a>
          <input type="file" class="input-file-hidden" multiple="multiple"
                 v-on:change="upload($event)"/>
        </div>
      </div>`;
                    return Vue.compile(templ)(this);
                },
                mounted() {
                    // listen by master record changes
                    let timeout;
                    this.$parentRecordChanged = async (rec) => {
                        this.attachments = [];
                        clearTimeout(timeout);
                        if (rec && rec.id)
                            timeout = setTimeout(async () => {
                                let model = new Katrid.Services.ModelService('content.attachment');
                                let res = await model.search({ where: { model: this.$parent.$view.model.name, object_id: rec.id }, count: false });
                                if (res && res.data)
                                    this.attachments = res.data;
                            }, 1000);
                    };
                    this.$parent.$view.addDataCallback(this.$parentRecordChanged);
                },
                unmounted() {
                    this.$parent.$view.dataCallbacks.splice(this.$parent.$view.dataCallbacks.indexOf(this.parentRecordChanged));
                },
                methods: {
                    async upload(event) {
                        let res = await Katrid.Services.Attachments.upload(event.target, {
                            model: this.$parent.$view.model,
                            recordId: this.$parent.record.id,
                        });
                        if (!this.attachments)
                            this.attachments = [];
                        if (res && res.result)
                            for (let obj of res.result)
                                this.attachments.push(obj);
                    },
                    deleteAttachment(index) {
                        this.$parent.action.deleteAttachment(this.attachments, index);
                    },
                },
                data() {
                    return {
                        attachments: [],
                    };
                }
            });
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        Katrid.component('input-date', {
            props: ['modelValue'],
            template: '<div><slot></slot></div>',
            mounted() {
                let vm = this;
                // initializes the input mask
                // TODO localize the date format
                let mask = Katrid.i18n.gettext('9999-99-99');
                let format = vm.$attrs['date-picker'] || 'L';
                let $format;
                if (format === 'L LT') {
                    mask = Katrid.i18n.gettext('9999-99-99 99:99');
                    $format = Katrid.i18n.formats.shortDateTimeFormat;
                }
                else
                    $format = Katrid.i18n.formats.shortDateFormat;
                let input = vm.$el.querySelector('input');
                vm.$input = input;
                this.$lastValue = '';
                input.addEventListener('focusin', () => this.$changing = true);
                input.addEventListener('focusout', () => this.$changing = false);
                $(input).inputmask({
                    mask,
                    insertMode: false,
                    onincomplete: function () {
                        if (vm.$changing)
                            vm.$emit('update:modelValue', applyValue(input.value));
                    },
                    oncomplete: function () {
                        if (vm.$changing)
                            vm.$emit('update:modelValue', applyValue(input.value));
                    }
                });
                this.$format = $format;
                let applyValue = (value) => {
                    // cache the last date and return it in utc format
                    value = input.value;
                    if (format === 'L')
                        this.$lastValue = moment(value, $format).format('YYYY-MM-DD');
                    else
                        this.$lastValue = moment(value, $format).toISOString();
                    if (this.$lastValue === 'Invalid date')
                        this.$lastValue = null;
                    vm.$emit('change', this.$lastValue);
                    return this.$lastValue;
                };
                this.$el.querySelector('.btn-calendar').addEventListener('click', () => {
                    let val = this.modelValue;
                    if (val)
                        val = moment(val).toDate();
                    // initializes the popup calendar component
                    let calendar = new Katrid.Controls.Calendar(this.$el, {
                        change: newDate => {
                            // change callback
                            let v = moment(newDate).format($format);
                            input.value = v;
                            vm.$emit('update:modelValue', applyValue(v));
                        },
                        date: val,
                    });
                    calendar.show();
                });
            },
            watch: {
                modelValue(value) {
                    if (this.$changing)
                        return;
                    if (value) {
                        if ((this.$format === 'L') && ((this.$input.value === '') || (value !== this.$lastValue)))
                            this.$input.value = moment(value).format(this.$format);
                        if ((this.$input.value === '') || (value !== this.$lastValue))
                            this.$input.value = moment(value).format(this.$format);
                    }
                    else {
                        this.$input.value = '';
                    }
                }
            }
        });
        Katrid.component('input-time', {
            props: ['modelValue'],
            template: '<input type="text">',
            mounted() {
                let el = this.$el;
                let mask = '99:99';
                el.addEventListener('blur', () => {
                    this.$emit('update:modelValue', el.value);
                });
                $(el).inputmask({
                    mask,
                    insertMode: false,
                });
            },
            watch: {
                modelValue(value) {
                    if (value && (value !== this.$el.value)) {
                        this.$el.value = value;
                    }
                    else if (!value)
                        this.$el.value = '';
                }
            }
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        UI.keyCode = {
            BACKSPACE: 8,
            COMMA: 188,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            LEFT: 37,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SPACE: 32,
            TAB: 9,
            UP: 38
        };
        function toggleFullScreen() {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen)
                    document.documentElement.requestFullscreen();
            }
            else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
        UI.toggleFullScreen = toggleFullScreen;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../../ui/index.ts"/>
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        Katrid.component('input-decimal', {
            props: ['modelValue'],
            template: `<input @input="$emit('update:modelValue', $event.target.value)">`,
            mounted() {
                let vm = this;
                let decimal = vm.$attrs['input-decimal'];
                let time;
                let opts = {
                    alias: 'numeric',
                    groupSeparator: Katrid.i18n.formats.THOUSAND_SEPARATOR || ',',
                    unmaskAsNumber: true,
                    radixPoint: Katrid.i18n.formats.DECIMAL_SEPARATOR || '.',
                    autoGroup: true,
                    digitsOptional: false,
                    digits: 0,
                    placeholder: '0',
                    onKeyDown: function () {
                        clearTimeout(time);
                        let oldValue = this.value;
                        vm.$changing = true;
                        time = setTimeout(() => {
                            if (oldValue !== this.value) {
                                let v = parseFloat($(this).inputmask('unmaskedvalue'));
                                vm.$emit('update:modelValue', v);
                                vm.$emit('change', this.value);
                            }
                        }, 10);
                    },
                };
                if (decimal)
                    opts.digits = parseInt(decimal);
                $(vm.$el).inputmask(opts);
                if (vm.modelValue)
                    $(vm.$el).inputmask('setvalue', vm.modelValue);
                vm.$el.addEventListener('blur', () => {
                    clearTimeout(time);
                    vm.$changing = false;
                    let v = parseFloat($(vm.$el).inputmask('unmaskedvalue'));
                    vm.$emit('update:modelValue', v);
                    // vm.$emit('change', this.value);
                });
            },
            emits: ['update:modelValue'],
            watch: {
                modelValue: function (value) {
                    if (value && !this.$changing) {
                        if (value !== $(this.$el).inputmask('unmaskedvalue')) {
                            // this.$el.value = value;
                            $(this.$el).inputmask('setvalue', value);
                        }
                    }
                    else if (!value)
                        $(this.$el).val('');
                    // console.log('val', value);
                    // $(this.$el).val(value);
                }
            }
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            /** Represents a data field renderer */
            class Widget {
                constructor(field, fieldEl) {
                    this.field = field;
                    this.fieldEl = fieldEl;
                }
                afterRender(el) {
                    return el;
                }
            }
            Widgets.Widget = Widget;
            Widgets.registry = {};
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
/// <reference path="index.ts"/>
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            class StatusField extends Widgets.Widget {
                renderToForm() {
                    console.log('status widget');
                    return Katrid.html(`
     <status-field class="status-field status-field-sm pull-right">
      <input type="hidden" ng-model="self.%(fieldName)s"/>
      <div class="steps">
        <a :class="{active: record.${this.field.name} === item[0]}" v-for="item in $fields.${this.field.name}.choices">
          <span>{{item[1]}}</span>
        </a>
      </div>
    </status-field> 
      `);
                }
            }
            Widgets.StatusField = StatusField;
            let RADIO_ID = 0;
            class RadioField extends Widgets.Widget {
                renderToForm() {
                    let label = document.createElement('div');
                    label.setAttribute('v-for', `(choice, index) in $fields.${this.field.name}.choices`);
                    label.classList.add('radio-button', 'radio-inline');
                    let css = this.field.fieldEl.getAttribute('class');
                    if (css)
                        label.classList.add(...css.split(' '));
                    let input = document.createElement('input');
                    let id = `'RADIO_ID-${this.field.name}-${++RADIO_ID}-' + index`;
                    input.setAttribute(':id', id);
                    input.setAttribute('type', 'radio');
                    input.setAttribute('v-model', `record.${this.field.name}`);
                    input.setAttribute(':value', `choice[0]`);
                    let txt = document.createElement('label');
                    txt.innerText = '{{ choice[1] }}';
                    txt.setAttribute(':for', id);
                    label.appendChild(input);
                    label.appendChild(txt);
                    return label;
                }
            }
            Widgets.RadioField = RadioField;
            class StatValue extends Widgets.Widget {
                renderToForm() {
                    let label = document.createElement('div');
                    label.classList.add('stat-value');
                    label.innerText = `{{record.${this.field.name}}}`;
                    return label;
                }
            }
            Widgets.StatValue = StatValue;
            class PasswordField extends Widgets.Widget {
                afterRender(el) {
                    el.querySelector('input').setAttribute('type', 'password');
                    return el;
                }
            }
            Widgets.PasswordField = PasswordField;
            Katrid.component('stat-button', {
                template: '<button class="btn stat-button"><slot/></button>',
            });
            Object.assign(Widgets.registry, {
                StatusField,
                RadioField,
                PasswordField,
                radio: RadioField,
                'stat-value': StatValue,
            });
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        class DropdownMenu {
            constructor(input, options) {
                this.options = options;
                this.template = '<a class="dropdown-item" href="#">${item}</a>';
                this.waitTemplate = () => `<div class="dropdown-wait text-muted"><i class="fas fa-spinner fa-spin"></i> ${Katrid.i18n.gettext('Loading...')}</div>`;
                this._loading = false;
                this.delay = 500;
                this._elements = [];
                this.mouseDown = false;
                this.el = document.createElement('div');
                this.el.classList.add('dropdown-menu');
                this.input = input;
                this.target = this.options?.target || input;
                if (options) {
                    if (options.template)
                        this.template = options.template;
                    if (options.source)
                        this.source = options.source;
                }
            }
            show() {
                document.body.append(this.el);
                this._popper = Popper.createPopper(this.target, this.el, { placement: 'bottom-start' });
                this.el.classList.add('show');
            }
            hide() {
                this.el.classList.remove('show');
                this._popper.destroy();
                this.el.remove();
            }
            get visible() {
                return this.el.classList.contains('show');
            }
            loadItems(items) {
                for (let item of items)
                    this.addItem(item);
            }
            clearItems() {
                this.items = [];
                for (let el of this._elements)
                    el.remove();
                this._elements = [];
            }
            init() {
                // initial search
                this.cancelSearch();
                this.search();
            }
            search() {
                this.clearItems();
                if (typeof this._source === 'function') {
                    this.loading = true;
                    return new Promise((resolve, reject) => {
                        this._pendingTimeout = setTimeout(() => {
                            resolve(this._source({ term: this.input.term })
                                .then((items) => {
                                this.clearItems();
                                this.loadItems(items);
                            })
                                .finally(() => this.loading = false));
                        }, this.delay);
                    });
                }
                else if (Array.isArray(this._source)) {
                    this.loadItems(this._source);
                }
            }
            cancelSearch() {
                if (this._pendingTimeout)
                    clearTimeout(this._pendingTimeout);
                this._pendingTimeout = null;
            }
            showWait() {
                let templ = this.waitTemplate;
                if (typeof templ === 'function')
                    templ = templ();
                this._wait = $(templ)[0];
                this.el.append(this._wait);
            }
            hideWait() {
                this._wait.remove();
                this._wait = null;
            }
            get loading() {
                return this._loading;
            }
            set loading(value) {
                if (value === this._loading)
                    return;
                this._loading = value;
                if (value)
                    this.showWait();
                else
                    this.hideWait();
            }
            addItem(item) {
                this.items.push(item);
                let template = item.template;
                if (typeof template === 'function')
                    template = template();
                else if (!template)
                    template = `<a class="dropdown-item" data-item-id="${item.id}">${item.text}</a>`;
                $(this.el).append(template);
                let el = this.el.querySelector('.dropdown-item:last-child');
                $(el).data('item', item);
                this._elements.push(el);
                el.addEventListener('mousedown', event => this.mouseDown = true);
                el.addEventListener('mouseup', event => this.mouseDown = false);
                if (item.click)
                    el.addEventListener('click', item.click);
                else
                    el.addEventListener('click', evt => {
                        this.input.input.focus();
                        evt.preventDefault();
                        evt.stopPropagation();
                        let target = evt.target;
                        if (target.tagName != 'A')
                            target = target.closest('a.dropdown-item');
                        this.onSelectItem(target);
                    });
                return el;
            }
            onSelectItem(item) {
                if (!item)
                    item = this.activeItem;
                return this.input._selectItem(item);
            }
            onActivateItem(item) {
                if (this.activeItem)
                    this.onDeactivateItem(this.activeItem);
                if (item)
                    item.classList.add('active');
                this.activeItem = item;
            }
            onDeactivateItem(item) {
                item.classList.remove('active');
            }
            move(distance) {
                const fw = distance > 0;
                distance = Math.abs(distance);
                while (distance !== 0) {
                    distance--;
                    let el = this.el.querySelector('.dropdown-item.active');
                    if (el) {
                        this.onDeactivateItem(el);
                        if (fw)
                            el = el.nextElementSibling;
                        else
                            el = el.previousElementSibling;
                        this.onActivateItem(el);
                    }
                    else {
                        if (fw)
                            el = this.el.querySelector('.dropdown-item');
                        else
                            el = this.el.querySelector('.dropdown-item:last-child');
                        this.onActivateItem(el);
                    }
                }
            }
            get source() {
                return this._source;
            }
            set source(value) {
                this._source = value;
            }
        }
        UI.DropdownMenu = DropdownMenu;
        class BaseAutoComplete extends Katrid.WebComponent {
            constructor() {
                super(...arguments);
                this.menu = null;
                this.closeOnChange = true;
                this.term = '';
                this.multiple = false;
                this.allowOpen = false;
                this._tags = [];
                this._facets = [];
            }
            create() {
                this.classList.add('input-autocomplete', 'input-dropdown');
                let append = '';
                let prepend = '';
                let name = this.getAttribute('name');
                let model = this.getAttribute('data-model');
                if (this.hasAttribute('allow-open')) {
                    // show only when filled
                    append = `<span class="fa fa-fw fa-folder-open autocomplete-open" title="${Katrid.i18n.gettext('Open this object')}" v-on:click="openObject('${model}', record.${name}.id)"></span>`;
                    // allow open object
                    this.allowOpen = true;
                }
                this.classList.add('form-control');
                if (this.multiple) {
                    prepend = `<div class="input-dropdown">`;
                    append = '</div>' + append;
                    this.classList.add('multiple');
                }
                let input = this.querySelector('input');
                if (input) {
                    if (prepend)
                        this.insertBefore(Katrid.html(prepend), input);
                    this.append(Katrid.html('<span class="caret"></span>'));
                    if (append)
                        this.append(Katrid.html(append));
                }
                else {
                    this.innerHTML = `${prepend}<input class="form-field" autocomplete="nope" spellcheck="false"> <span class="caret"></span>${append}`;
                    input = this.querySelector('input');
                }
                this.input = input;
                this.addEventListener('click', evt => {
                    this.input.focus();
                    this.showMenu();
                });
                let caret = this.querySelector('.caret');
                caret.addEventListener('click', evt => this.click());
                this.input.type = 'text';
                this.input.addEventListener('input', () => this.onInput());
                this.input.addEventListener('click', event => {
                    this.input.select();
                    this.onClick();
                });
                this.input.addEventListener('blur', () => this.onFocusout());
                this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
                if (this.hasAttribute('placeholder'))
                    this.input.placeholder = this.getAttribute('placeholder');
            }
            _addTag(tag) {
                if (this.querySelector(`[data-id="${tag.id}"]`))
                    return false;
                let facet = $(`<div class="facet-view badge badge-dark">
        <span class="facet-value">${tag.text}</span>
        <span class="fas fa-times facet-remove"></span>
        </div>`)[0];
                facet.querySelector('.facet-remove').addEventListener('click', () => this.removeTag(tag));
                facet.setAttribute('data-id', tag.id);
                this._tags.push(tag);
                this._facets.push(facet);
                this.insertBefore(facet, this.input.parentElement);
                return true;
            }
            addTag(tag) {
                for (let t of this._tags)
                    console.log('add tag', t);
                this._addTag(tag);
                this._setValues(this._tags);
                this.hideMenu();
            }
            removeTag(tag) {
                this._tags.splice(this._tags.indexOf(tag), 1);
                let facet = this.querySelector(`[data-id="${tag.id}"]`);
                if (facet) {
                    this._facets.splice(this._facets.indexOf(facet), 1);
                    facet.remove();
                }
                this._setValues(this._tags);
            }
            set tags(value) {
                for (let facet of this._facets)
                    facet.remove();
                if (!value)
                    value = [];
                this._tags = [];
                for (let tag of value)
                    this._addTag(tag);
            }
            _setValues(tags) {
                let event = new CustomEvent('change', {
                    detail: {
                        tags,
                    }
                });
                this.dispatchEvent(event);
                return event;
            }
            onInput() {
                this.term = this.input.value;
                // clear selection
                if (this.$selectedItem) {
                    this.$selectedItem = null;
                    this._setValue(null);
                }
                this.showMenu();
            }
            onClick() {
                this.showMenu();
            }
            onFocusout() {
                if (!this.menu?.mouseDown) {
                    this.hideMenu();
                    this.invalidateValue();
                }
                this.term = '';
            }
            createMenu() {
                // let source = () => {
                //   return new Promise((resolve, reject) => {
                //     let res: DropdownItem[] = [];
                //     for (let i = 1; i <= 10; i++)
                //       res.push({id: i, text: 'Item ' + i.toString()});
                //     res.push({id: 11, text: 'Create New...', template: '<a class="dropdown-item">Create New...</a>'})
                //     resolve(res);
                //   });
                // }
                this.menu = new DropdownMenu(this, { source: this._source });
            }
            invalidateValue() {
                this.selectedItem = this.$selectedItem;
            }
            onKeyDown(evt) {
                if (this.menu)
                    switch (evt.which) {
                        case Katrid.UI.keyCode.DOWN:
                            this.menu.move(1);
                            evt.preventDefault();
                            break;
                        case Katrid.UI.keyCode.UP:
                            this.menu.move(-1);
                            evt.preventDefault();
                            break;
                        case Katrid.UI.keyCode.ENTER:
                            if (this.menu.activeItem) {
                                this.menu.onSelectItem();
                                evt.preventDefault();
                            }
                            break;
                        case Katrid.UI.keyCode.ESCAPE:
                            if (this.menu)
                                this.hideMenu();
                            break;
                    }
            }
            showMenu() {
                if (!this.menu) {
                    this.createMenu();
                    this.menu.show();
                }
                this.menu.init();
            }
            hideMenu() {
                if (this.menu)
                    this.menu.hide();
                this.menu = null;
            }
            menuVisible() {
                return this.menu.visible;
            }
            setOptions(options) {
                if (options.source)
                    this.setSource(options.source);
            }
            setSource(value) {
                this._source = value;
            }
            _selectItem(el) {
                let item = null;
                if (el)
                    item = $(el).data('item');
                this.term = '';
                if (this.multiple) {
                    this.addTag(item);
                    return this._setValue(item);
                }
                else
                    return this.setValue(item);
            }
            _setValue(item, el) {
                let event = new CustomEvent('selectItem', {
                    detail: {
                        item,
                        dropdownItem: el,
                    }
                });
                this.dispatchEvent(event);
                return event;
            }
            setValue(item, el) {
                let event = this._setValue(item, el);
                if (!event.defaultPrevented) {
                    // apply the selected text
                    this.selectedItem = item;
                    // hide the dropdown menu
                    if (this.menu)
                        this.hideMenu();
                }
                return event;
            }
            get selectedItem() {
                return this.$selectedItem;
            }
            set selectedItem(value) {
                this.$selectedItem = value;
                if (!this.input)
                    return;
                if (value) {
                    this.input.value = value.text;
                    if (this.allowOpen)
                        this.classList.add('allow-open');
                }
                else {
                    this.input.value = '';
                    if (this.allowOpen)
                        this.classList.remove('allow-open');
                }
            }
            get selectedValue() {
                if (this.$selectedItem)
                    return this.$selectedItem.id;
            }
        }
        UI.BaseAutoComplete = BaseAutoComplete;
        class InputAutoComplete extends BaseAutoComplete {
            create() {
                super.create();
                let model = this.getAttribute('data-model');
                let svc = new Katrid.Services.ModelService(model);
                if (model)
                    this.setSource(async (query) => {
                        let res = await svc.searchByName({
                            args: [query.term]
                        });
                        return res.items;
                    });
            }
        }
        Katrid.define('input-autocomplete', InputAutoComplete);
        Katrid.component('input-autocomplete', {
            props: ['modelValue'],
            template: '<input-autocomplete/>',
            mounted() {
                this.$el.create();
                this.$el.addEventListener('selectItem', (evt) => {
                    this.$emit('update:modelValue', evt.detail.item);
                });
            },
            watch: {
                modelValue: function (value) {
                    if (value !== this.$el.selectedItem)
                        this.$el.selectedItem = value;
                }
            }
        });
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
/// <reference path="../../ui/autocomplete.ts"/>
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            class InputForeignKeyElement extends Katrid.UI.BaseAutoComplete {
                constructor() {
                    super(...arguments);
                    this.allowAdvancedSearch = true;
                    this.allowCreateNew = true;
                    this.filter = null;
                }
                bind(options) {
                    let field = options.field;
                    let model = options.model;
                    // super.create();
                    this.allowCreateNew = this.getAttribute('allow-create') !== 'false';
                    this.allowAdvancedSearch = this.getAttribute('allow-search') !== 'false';
                    let name = this.getAttribute('name');
                    this.field = field;
                    this.actionView = this.closest('action-view');
                    if (field?.choices)
                        this.setSource(field.choices);
                    else {
                        this.setSource(async (query) => {
                            // evaluate domain attribute
                            let domain = this.filter || this.field.filter;
                            // todo replace angularjs by vuejs
                            if (domain && (typeof domain === 'string'))
                                console.log('field', domain);
                            let format = 'html';
                            let data = {
                                args: [query.term],
                                kwargs: {
                                    count: 1,
                                    page: query.page,
                                    filter: domain,
                                    format,
                                    name_fields: this.getAttribute('name-fields')?.split(",") || null
                                }
                            };
                            if (model) {
                                let res = await model.service.getFieldChoices({
                                    field: this.field.name, term: query.term, kwargs: data.kwargs
                                });
                                let items = res.items;
                                if (this.allowAdvancedSearch)
                                    items.push({
                                        template: `<a class="dropdown-item action-search-more"><i>${Katrid.i18n.gettext('Search more...')}</i></a>`,
                                        click: async (event) => {
                                            event.stopPropagation();
                                            this.hideMenu();
                                            let fkModel = new Katrid.Data.Model({ name: field.model });
                                            let view = await Katrid.Forms.TableView.createSearchDialog({ model: fkModel, caption: field.caption });
                                            let res = view.showDialog();
                                            view.ready();
                                            res = await res;
                                            if (res) {
                                                data.kwargs.ids = res.id;
                                                let value = await model.service.getFieldChoices({
                                                    field: this.field.name, term: '', kwargs: data.kwargs
                                                });
                                                if (value.items.length)
                                                    this.setValue(value.items[0]);
                                            }
                                        },
                                    });
                                if (this.allowCreateNew)
                                    items.push({
                                        template: `<a class="dropdown-item action-create-new"><i>${Katrid.i18n.gettext('Create new...')}</i></a>`,
                                        click: async (event) => {
                                            event.stopPropagation();
                                            this.hideMenu();
                                            let dlg = await Katrid.Forms.FormView.createNew({ model: field.model, dialog: true });
                                            let res = await dlg.dialogPromise;
                                            if (res?.id) {
                                                let v = await this.field.getLabelById(model.service, res.id);
                                                console.log('v', v);
                                                if (v?.items)
                                                    this.setValue(v.items[0]);
                                            }
                                        }
                                    });
                                return items;
                            }
                            else {
                                // todo get field choices
                            }
                        });
                    }
                    if (name && this.actionView?.view) {
                        this.field = this.actionView.view.fields[name];
                    }
                }
            }
            Controls.InputForeignKeyElement = InputForeignKeyElement;
            Katrid.define('input-foreignkey', InputForeignKeyElement);
            Katrid.component('field-autocomplete', {
                props: ['modelValue'],
                template: '<input-foreignkey class="input-autocomplete"><slot/></input-foreignkey>',
                mounted() {
                    this.$field = this.$parent.$fields[this.$attrs.name];
                    this.$el.bind({ field: this.$field, view: this.$parent.$view, model: this.$parent.$view.model });
                    this.$el.addEventListener('selectItem', (evt) => {
                        this.$emit('update:modelValue', evt.detail.item);
                    });
                },
                watch: {
                    modelValue: function (value) {
                        if (value !== this.$el.selectedItem)
                            this.$el.selectedItem = value;
                    }
                }
            });
            Katrid.component('input-tags', {
                props: ['modelValue'],
                template: '<input-foreignkey class="input-autocomplete"><slot/></input-foreignkey>',
                mounted(el) {
                    this.$field = this.$parent.view.fields[this.$attrs.name];
                    console.log(el);
                    this.$el.multiple = true;
                    this.$el.create(this.$field);
                    this.$el.addEventListener('change', (evt) => {
                        console.log('on change', evt.detail.tags);
                        this.$emit('update:modelValue', evt.detail.tags);
                        console.log('on change 2', evt.detail.tags);
                    });
                },
                watch: {
                    modelValue: function (value) {
                        if (Array.isArray(value))
                            value = value.map(val => val);
                        this.$el.tags = value;
                    }
                }
            });
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        Katrid.component('image-field', {
            props: ['modelValue'],
            template: `<div class="image-box image-field form-control">
<slot></slot>
        <input type="file" v-on:change="onImageChange($event)" accept="image/*">
      </div>`,
            methods: {
                onImageChange(event) {
                    const reader = new FileReader();
                    reader.onload = event => {
                        const res = event.target.result;
                        this.$emit('update:modelValue', res);
                    };
                    reader.readAsDataURL(event.target.files[0]);
                    event.target.value = '';
                }
            },
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        function beforeRender(field, template) {
            let header = document.createElement('div');
            header.className = 'content-container-heading';
            let toolbar = document.createElement('div');
            toolbar.classList.add('grid-toolbar');
            toolbar.innerHTML = `
<button class="btn btn-sm btn-outline-secondary btn-action-add" type="button" v-on:click="createNew()" v-show="$parent.changing && !readonly">${Katrid.i18n.gettext('Add')}</button>
<button class="btn btn-sm btn-outline-secondary" type="button" v-on:click="deleteSelection()" v-show="$parent.changing && !readonly && selectionLength">${Katrid.i18n.gettext('Delete')}</button>
`;
            header.append(toolbar);
            let table = document.createElement('div');
            table.className = 'table-responsive';
            table.append(template);
            let fieldSection = document.createElement('div');
            fieldSection.className = 'onetomany-grid';
            fieldSection.append(header);
            fieldSection.append(table);
            return fieldSection;
            /*
            grid.append(toolbar);
            let viewInfo = field.views[field.viewMode];
            // TODO add card view
            if (field.viewMode === 'list') {
              let renderer = new ListRenderer(viewInfo, {rowSelector: true, allowGrouping: false});
              grid.setAttribute('field-name', field.name);
              let table: HTMLElement;
              if (field['$$listTemplateCache'] === undefined) {
                table = renderer.render(viewInfo.template, 'records');
                field['$$listTemplate'] = table;
              } else
                table = field['$$listTemplateCache'];
              let div = document.createElement('div');
              div.classList.add('table-responsive');
              div.append(table);
              grid.append(div);
              grid.$columns = renderer.columns;
            } else if (field.viewMode == 'card') {
              let renderer = new Katrid.Forms.Views.CardRenderer(viewInfo.fields);
              grid.setAttribute('field-name', field.name);
              let table = renderer.render(viewInfo.template);
              grid.append(table);
            }
            return grid;
             */
        }
        class SubWindowAction {
            constructor(config) {
                this.model = config.model;
            }
        }
        async function createDialog(config) {
            let form = config.field.getView('form');
            form.parentVm = config.parentVm;
            console.log('parent vm', form.parentVm);
            form.datasource.parent = config.master;
            form.datasource.field = config.field;
            await form.loadPendingViews();
            let relField = form.fields[config.field.info.field];
            // hide related field
            if (relField)
                relField.visible = false;
            form.showDialog(config.options);
            return form;
        }
        Katrid.component('onetomany-field', {
            props: ['modelValue'],
            render() {
                if (!this.$field) {
                    let field = this.$parent.$fields[this.$attrs.name];
                    this.$field = field;
                    // keep the html structure cached
                    this.$view = field.getView('list');
                    this.$fields = this.$view.fields;
                    this.$view.datasource.vm = this;
                    this.$view.datasource.field = this.$field;
                    this.$view.datasource.parent = this.$parent.$view.datasource;
                    this.$compiledTemplate = Vue.compile(beforeRender(field, this.$view.renderTemplate(this.$view.domTemplate())));
                }
                return this.$compiledTemplate(this);
            },
            created() {
                // register as nested data
                if (this.$parent.$view instanceof Katrid.Forms.FormView)
                    this.$parent.$view.nestedViews.push(this);
            },
            data() {
                return {
                    allSelected: false,
                    selection: [],
                    action: {},
                    record: {},
                    records: null,
                    groups: null,
                    view: null,
                    pendingRequest: false,
                    recordCount: 0,
                    dataOffset: 0,
                    dataOffsetLimit: 0,
                    selectionLength: 0,
                    $editing: false,
                    loading: false,
                    readonly: false,
                };
            },
            methods: {
                async recordClick(record, index, event) {
                    if (this.$editing)
                        return;
                    let parentChanging = this.$parent.$view.changing;
                    try {
                        if (this.$field.inlineEditor) {
                            // the table allows direct input data
                            let tr = this.$view.edit(index);
                            let el = event.target;
                            let name = el.getAttribute('field-name');
                            if (name)
                                setTimeout(() => {
                                    let input = tr.querySelector(`input[name=${name}]`);
                                    if (input) {
                                        input.select();
                                        input.focus();
                                    }
                                });
                        }
                        else {
                            // the table must show a dialog
                            let buttons = (parentChanging && [
                                { text: Katrid.i18n.gettext('Save'), click: 'saveAndClose()' },
                                { text: Katrid.i18n.gettext('Discard'), click: 'discardAndClose()' },
                                { text: Katrid.i18n.gettext('Delete'), click: 'deleteAndClose()' },
                            ]) || ['close'];
                            let form = await createDialog({
                                index,
                                field: this.$field,
                                parentVm: this.$parent,
                                master: this.$parent.$view.datasource,
                                options: {
                                    backdrop: 'static',
                                    buttons,
                                },
                                // master: this.$data.dataSource.masterSource,
                            });
                            // form.datasource.records = this.records;
                            // load from server if not loaded
                            if ((!record.$loaded) && (record.$state === Katrid.Data.RecordState.unmodified)) {
                                let newRec = await form.datasource.get({ id: record.id });
                            }
                            else {
                                form.datasource.record = this.records[index];
                            }
                            // form.datasource.record = record;
                            if (parentChanging) {
                                form.edit();
                                form.focus();
                            }
                            let res = await form.dialogPromise;
                            if (res) {
                                if (res.$state === Katrid.Data.RecordState.destroyed)
                                    this.records.splice(index, 1);
                                else
                                    this.records[index] = res;
                                this.$onChange();
                            }
                        }
                        // // clone record to a temp object
                        // let rec: any = record;
                        // // rec = Object.assign(rec, record);
                        // // console.log('record click', rec, record);
                        // form.dataSource.record = rec;
                        // form.vm.parent = this.$parent;
                        // record = await record.$record.load(record);
                        // let res = await form.showDialog({edit: this.$parent.changing, backdrop: 'static'});
                        // if (res) {
                        //   if (res.$record.state === Katrid.Data.RecordState.destroyed)
                        //     this.records.splice(index, 1);
                        //   else {
                        //     this.records[index] = res;
                        //     this.record = res;
                        //   }
                        //   this.$emit('change', this.record);
                        // }
                    }
                    finally {
                        this.$editing = false;
                    }
                },
                rowKeyDown(event) {
                    let control = event.target;
                    if ((event.key === 'Escape') && !event.shiftKey && !event.altKey) {
                        // cancel edition
                        let tr = control.closest('tr');
                        let formId = tr.getAttribute('data-form-id');
                        this.$view.cancel(formId);
                    }
                    else if ((event.key === 'Enter') && !event.shiftKey && !event.altKey) {
                        let formId = control.closest('tr').getAttribute('data-form-id');
                        this.$view.save(formId);
                    }
                },
                $discard() {
                    for (let rec of this.records) {
                        if (rec.$state === Katrid.Data.RecordState.created)
                            this.records.splice(this.records.indexOf(rec), 1);
                        if (rec.$$discard)
                            rec.$$discard();
                    }
                },
                $onChange() {
                    this.$parent.$view.$onFieldChange(this.$field, this.records);
                    this.$emit('change', this.value);
                    this.$emit('update:modelValue', this.modelValue);
                },
                recordContextMenu(record, index, event) {
                    // Katrid.Forms.Views.listRecordContextMenu.call(this, ...arguments);
                },
                tabeContextMenu(event) {
                    Forms.tableContextMenu.call(this, ...arguments);
                },
                async createNew() {
                    if (this.$editing)
                        return;
                    try {
                        if (this.$field.inlineEditor) {
                        }
                        else {
                            this.$editing = true;
                            let form = await createDialog({
                                field: this.$field,
                                parentVm: this.$parent,
                                master: this.$parent.$view.datasource,
                                options: {
                                    backdrop: 'static',
                                    buttons: [
                                        { text: Katrid.i18n.gettext('Save'), click: 'saveAndClose()' },
                                        { text: Katrid.i18n.gettext('Discard'), dismiss: 'modal' },
                                    ],
                                },
                            });
                            form.insert();
                            let res = await form.dialogPromise;
                            if (res) {
                                let rec = form.record;
                                // add created record to list
                                if (!this.records)
                                    this.records = [];
                                this.records.push(rec);
                                this.$onChange();
                            }
                            return res;
                            // form.vm.parent = this.$parent;
                            // form.dataSource.insert();
                            // let res = await form.showDialog({backdrop: 'static'});
                            // if (res) {
                            //   this.records.push(res);
                            //   this.record = res;
                            //   this.$emit('change', this.record);
                            // }
                        }
                    }
                    finally {
                        this.$editing = false;
                    }
                },
                toggleAll() {
                    Katrid.Forms.selectionToggleAll.call(this, ...arguments);
                },
                selectToggle(record) {
                    Katrid.Forms.selectionSelectToggle.call(this, ...arguments);
                },
                unselectAll() {
                    Katrid.Forms.unselectAll.call(this, ...arguments);
                },
                deleteSelection() {
                    Katrid.Forms.selectionDelete.call(this, ...arguments);
                },
            },
            mounted() {
                this.$view.element = this.$el;
                this.$view.vm = this;
                let modelValue = this.modelValue;
                if (modelValue) {
                    // modelValue = this.$view.model.fromArray(modelValue);
                    this.records = modelValue;
                }
            },
            emits: ['update:modelValue'],
            watch: {
                modelValue(value) {
                    if (value) {
                        // value = this.$view.model.fromArray(value);
                        // console.log('set o2m value', value)
                        // this.$oldValue = [].concat(value);
                    }
                    else
                        value = [];
                    this.records = value;
                },
            },
            directives: Katrid.directivesRegistry,
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            Katrid.component('status-field', {
                template: `<div><slot></slot></div>`,
                mounted() {
                    console.log('status field');
                }
            });
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            // export class TableField extends FieldWidget {
            //   connectedCallback() {
            //     super.connectedCallback();
            //     this.querySelector('table').classList.add('table');
            //   }
            //
            //   create() {
            //     super.create();
            //     this.actionView.action.$element[0].addEventListener('recordLoaded', event => this.recordLoaded(event));
            //   }
            //
            //   async recordLoaded(event: any) {
            //     let rec = event.detail.record;
            //     let data: any = {};
            //     data[this.field.info.field || 'id'] = rec.id;
            //     let res: any = await this.actionView.action.model.getFieldChoices({field: this.fieldName, filter: data})
            //     this.actionView.action.scope.record[this.fieldName] = res.data;
            //   }
            //
            //   get scope() {
            //     return this.actionView.action.scope;
            //   }
            // }
            //
            // Katrid.define('table-field', TableField);
            Katrid.component('table-field', {
                template: '<div class="table-responsive"><slot></slot></div>',
                mounted() {
                    let el = this.$parent.$view.element;
                    this.$name = this.$el.getAttribute('name');
                    this.$elView = el;
                    this.$recordLoaded = (...args) => this.recordLoaded(...args);
                    el.addEventListener('recordChanged', this.$recordLoaded);
                },
                unmounted() {
                    this.$elView.removeEventListener('recordChanged', this.$recordLoaded);
                },
                methods: {
                    async recordLoaded(event) {
                        if (this.$timeout)
                            clearTimeout(this.$timeout);
                        let rec = event.detail.record;
                        this.$timeout = setTimeout(async () => {
                            let rec = event.detail.record;
                            let data = {};
                            let field = this.$parent.$fields[this.$name];
                            data[field.info.field || 'id'] = rec.id;
                            let res = await this.$parent.$view.model.service.getFieldChoices({ field: this.$name, filter: data });
                            rec[this.$name] = res.data;
                        }, 1000);
                    }
                }
            });
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            var registerCustomTag = Katrid.Forms.registerCustomTag;
            function Tabset(el) {
                let container = document.createElement('div');
                container.classList.add('col-12', 'tabset');
                let tabset = document.createElement('div');
                let nav = document.createElement('nav');
                container.append(nav);
                tabset.classList.add('nav', 'nav-tabs');
                tabset.setAttribute('role', 'tablist');
                nav.append(tabset);
                // let's create the tab-content
                let content = document.createElement('div');
                content.classList.add('tab-content');
                Array.from(el.children).forEach((child, index) => {
                    // let's create the nav-item
                    let a = document.createElement('a');
                    a.setAttribute('class', child.getAttribute('class'));
                    a.classList.add('nav-item', 'nav-link');
                    a.setAttribute('role', 'tab');
                    let heading = child.querySelector('tab-heading');
                    if (heading) {
                        a.innerHTML = heading.innerHTML;
                        heading.remove();
                    }
                    else if (child.hasAttribute('caption'))
                        a.innerHTML = child.getAttribute('caption');
                    if (child.hasAttribute('v-if'))
                        a.setAttribute('v-if', child.getAttribute('v-if'));
                    if (child.hasAttribute('v-show'))
                        a.setAttribute('v-show', child.getAttribute('v-show'));
                    if (child.hasAttribute('v-hide'))
                        a.setAttribute('v-hide', child.getAttribute('v-hide'));
                    a.setAttribute('onclick', `$(this).tab('show');let tabset=$(this).closest('.tabset');tabset.find('[data-tab]').removeClass('active');tabset.find('[data-tab=${index}]').addClass('active');`);
                    tabset.append(a);
                    // let's create the tab-pane
                    let pane = document.createElement('div');
                    pane.classList.add('tab-pane', 'row');
                    pane.setAttribute('data-tab', index.toString());
                    pane.setAttribute('role', 'tabpanel');
                    pane.innerHTML = child.innerHTML;
                    content.append(pane);
                    if (index === 0) {
                        a.classList.add('active');
                        pane.classList.add('active');
                    }
                });
                container.append(content);
                el.replaceWith(container);
                return container;
            }
            registerCustomTag('tabset', Tabset);
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            const DELAY = 1500;
            let timeout;
            Katrid.directive('ui-tooltip', {
                mounted(el, binding, vnode) {
                    let tooltip = bootstrap.Tooltip.getOrCreateInstance(el, {
                        title: '--', trigger: 'manual', html: true,
                        template: '<div class="tooltip"><div class="tooltip-inner"></div></div>',
                        popperConfig: {
                            placement: 'top-start',
                        }
                    });
                    let field = binding.value;
                    let title = el.getAttribute('data-title');
                    if (title)
                        el.removeAttribute('data-title');
                    let helpText = '';
                    if (field)
                        helpText = field.helpText;
                    let mouseout;
                    el.addEventListener('show.bs.tooltip', evt => {
                    });
                    el.addEventListener('mouseenter', evt => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            let s = el.getAttribute('data-tooltip') || '';
                            s += '<br>' + title;
                            el.setAttribute('data-bs-original-title', s);
                            if (s)
                                tooltip.show();
                        }, DELAY);
                        mouseout = setTimeout(() => tooltip.hide(), 150000);
                    }, false);
                    el.addEventListener('mouseleave', evt => {
                        clearTimeout(timeout);
                        clearTimeout(mouseout);
                        mouseout = setTimeout(() => {
                        });
                        tooltip.hide();
                    }, false);
                }
            });
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Reports;
    (function (Reports) {
        let _counter = 0;
        class Params {
        }
        Params.Operations = {
            exact: 'exact',
            in: 'in',
            contains: 'contains',
            startswith: 'startswith',
            endswith: 'endswith',
            gt: 'gt',
            lt: 'lt',
            between: 'between',
            isnull: 'isnull'
        };
        Params.Labels = null;
        Params.DefaultOperations = {
            CharField: Params.Operations.exact,
            IntegerField: Params.Operations.exact,
            DateTimeField: Params.Operations.between,
            DateField: Params.Operations.between,
            FloatField: Params.Operations.between,
            DecimalField: Params.Operations.between,
            ForeignKey: Params.Operations.exact,
            ModelChoices: Params.Operations.exact,
            SelectionField: Params.Operations.exact,
        };
        Params.TypeOperations = {
            CharField: [Params.Operations.exact, Params.Operations.in, Params.Operations.contains, Params.Operations.startswith, Params.Operations.endswith, Params.Operations.isnull],
            IntegerField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
            FloatField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
            DecimalField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
            DateTimeField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
            DateField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
            ForeignKey: [Params.Operations.exact, Params.Operations.in, Params.Operations.isnull],
            ModelChoices: [Params.Operations.exact, Params.Operations.in, Params.Operations.isnull],
            SelectionField: [Params.Operations.exact, Params.Operations.isnull],
        };
        Params.Widgets = {
            CharField(param) {
                return `<div><input id="rep-param-id-${param.id}" v-model="param.value1" type="text" class="form-control"></div>`;
            },
            IntegerField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-sm-6"><input id="rep-param-id-${param.id}-2" v-model="param.value2" type="number" class="form-control"></div>`;
                }
                return `<div class="row"><div class="col-sm-6"><input id="rep-param-id-${param.id}" type="number" v-model="param.value1" class="form-control"></div>${secondField}</div>`;
            },
            DecimalField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-6"><input id="rep-param-id-${param.id}-2" v-model="param.value2" input-decimal class="form-control"></div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-6"><input id="rep-param-id-${param.id}" input-decimal v-model="param.value1" class="form-control"></div>${secondField}</div>`;
            },
            DateTimeField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-6"><input id="rep-param-id-${param.id}-2" type="text" date-picker="L" v-model="param.value2" class="form-control"></div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-6"><input id="rep-param-id-${param.id}" type="text" date-picker="L" v-model="param.value1" class="form-control"></div>${secondField}</div>`;
            },
            DateField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-6">
<input-date class="input-group date" v-model="param.value2" date-picker="L">
<input id="rep-param-id-${param.id}-2" type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
</div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-6">
<input-date class="input-group date" v-model="param.value1" date-picker="L">
<input id="rep-param-id-${param.id}" type="text" class="form-control" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
</div>${secondField}</div>`;
            },
            ForeignKey(param) {
                const serviceName = param.info.field.attr('model') || param.params.model;
                let multiple = '';
                if (param.operation === 'in') {
                    multiple = 'multiple';
                }
                return `<div><input-ajax-choices id="rep-param-id-${param.id}" ajax-choices="${serviceName}" field-name="${param.name}" v-model="param.value1" ${multiple}></div>`;
            },
            ModelChoices(param) {
                let multiple = '';
                if (param.operation === 'in') {
                    multiple = 'multiple';
                }
                return `<div><input-ajax-choices id="rep-param-id-${param.id}" ajax-choices="ir.action.report" model-choices="${param.info.modelChoices}" v-model="param.value1" ${multiple}></div>`;
            },
            SelectionField(param) {
                // param.info.choices = param.info.field.data('choices');
                console.log(param);
                let multiple = '';
                let tag = 'select';
                if (param.operation === 'in') {
                    tag = 'multiple-tags';
                    multiple = 'multiple="multiple"';
                }
                else
                    multiple = 'class="form-select"';
                return `<div><${tag} ${multiple} v-model="param.value1"><option :value="value" v-for="(name, value, index) in param.choices">{{name}}</option></${tag}></div>`;
            }
        };
        Reports.Params = Params;
        class Param {
            constructor(info, params) {
                this.info = info;
                this.params = params;
                this.choices = info.choices;
                this.name = this.info.name;
                this.field = this.params.info.fields && this.params.info.fields[this.name];
                this.label = this.info.label || this.params.info.caption;
                this.static = this.info.param === 'static';
                this.type = this.info.type || (this.field && this.field.type) || 'CharField';
                this.defaultOperation = this.info.operation || Params.DefaultOperations[this.type];
                this.operation = this.defaultOperation;
                // @operations = @info.operations or Params.TypeOperations[@type]
                this.operations = this.getOperations();
                this.exclude = this.info.exclude;
                this.id = ++_counter;
            }
            defaultValue() {
                return null;
            }
            setOperation(op, focus) {
                if (focus == null) {
                    focus = true;
                }
                this.createControls();
                const el = this.el.find(`#rep-param-id-${this.id}`);
                if (focus) {
                    el.focus();
                }
            }
            createControls() {
                const el = this.el.find(".param-widget");
                el.empty();
                let widget = Params.Widgets[this.type](this);
                console.log('create controls', widget);
                widget = $(widget);
                return el.append(widget);
            }
            getOperations() {
                return (Array.from(Params.TypeOperations[this.type]).map((op) => ({ id: op, text: Params.Labels[op] })));
            }
            operationTemplate() {
                const opts = this.getOperations();
                return `<div class="col-sm-4"><select id="param-op-${this.id}" v-model="param.operation" class="form-select" onchange="$('#param-${this.id}').data('param').change();$('#rep-param-id-${this.id}')[0].focus()">
  ${opts}
  </select></div>`;
            }
            template() {
                let operation = '';
                if (!this.operation)
                    operation = this.operationTemplate();
                return `<div id="param-${this.id}" class="row form-group" data-param="${this.name}"><label class="control-label">${this.label}</label>${operation}<div id="param-widget-${this.id}"></div></div>`;
            }
            render(container) {
                this.el = $(this.template());
                this.el.data('param', this);
                this.createControls();
                console.log('render param', this.el[0]);
                return container.append(this.el[0]);
            }
        }
        Reports.Param = Param;
        Katrid.component('report-param-widget', {
            props: ['param'],
            render() {
                let widget = Params.Widgets[this.param.type](this.param);
                return Vue.compile(widget)(this);
            },
            components: Katrid.componentsRegistry,
            directives: Katrid.directivesRegistry,
        });
        class ReportEngine {
            static load(el) {
                $('row').each((idx, el) => {
                    el.addClass('row');
                });
                $('column').each((idx, el) => {
                    el.addClass('col');
                });
            }
        }
        Reports.ReportEngine = ReportEngine;
    })(Reports = Katrid.Reports || (Katrid.Reports = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Reports;
    (function (Reports) {
        let _counter = 0;
        Reports.currentReport = {};
        Reports.currentUserReport = {};
        class Report {
            constructor(action) {
                this.action = action;
                this.info = this.action.info;
                Reports.currentReport = this;
                if ((Reports.Params.Labels == null)) {
                    Reports.Params.Labels = {
                        exact: Katrid.i18n.gettext('Is equal'),
                        in: Katrid.i18n.gettext('Selection'),
                        contains: Katrid.i18n.gettext('Contains'),
                        startswith: Katrid.i18n.gettext('Starting with'),
                        endswith: Katrid.i18n.gettext('Ending with'),
                        gt: Katrid.i18n.gettext('Greater-than'),
                        lt: Katrid.i18n.gettext('Less-than'),
                        between: Katrid.i18n.gettext('Between'),
                        isnull: Katrid.i18n.gettext('Is Null')
                    };
                }
                this.name = this.info.name;
                this.id = ++_counter;
                this.values = {};
                this.params = [];
                this.filters = [];
                this.groupables = [];
                this.sortables = [];
                this.totals = [];
            }
            telegram() {
                // Katrid.Reports.Telegram.export(this);
            }
            getUserParams() {
                let report = this;
                let container = $(report.container);
                let params = {
                    data: [],
                    file: container.find('#id-report-file').val()
                };
                for (let p of Array.from(this.params)) {
                    let val1, val2;
                    val1 = p.value1;
                    val2 = p.value2;
                    if (val1 === '')
                        val1 = null;
                    if (val2 === '')
                        val2 = null;
                    if (val1 === null)
                        continue;
                    params.data.push({
                        name: p.name,
                        op: p.operation,
                        value1: val1,
                        value2: val2,
                        type: p.type
                    });
                }
                let fields = container.find('#report-id-fields').val();
                params['fields'] = fields;
                let totals = container.find('#report-id-totals').val();
                params['totals'] = totals;
                let sorting = container.find('#report-id-sorting').val();
                params['sorting'] = sorting;
                let grouping = container.find('#report-id-grouping').val();
                params['grouping'] = grouping;
                return params;
            }
            loadFromXml(xml) {
                let dataTypeDict = {
                    date: 'DateField',
                    datetime: 'DateTimeField',
                };
                let paras;
                if (typeof xml === 'string') {
                    xml = $.parseXML(xml).children[0];
                }
                this.action.customizableReport = xml.getAttribute('customizableReport');
                this.action.advancedOptions = xml.getAttribute('advancedOptions');
                this.model = xml.getAttribute('model');
                const fields = [];
                for (let f of xml.children) {
                    let tag = f.tagName;
                    if ((tag !== 'field') && (tag !== 'param'))
                        continue;
                    const name = f.getAttribute('name');
                    let fld;
                    if (this.info.fields)
                        fld = this.info.fields[name];
                    const label = f.getAttribute('label') || f.getAttribute('caption') || (fld && fld.caption) || name;
                    const groupable = f.getAttribute('groupable');
                    const sortable = f.getAttribute('sortable');
                    const total = f.getAttribute('total');
                    let param = f.getAttribute('param');
                    if ((tag === 'field') && (!param))
                        param = 'static';
                    const required = f.getAttribute('required');
                    const autoCreate = f.getAttribute('autoCreate') || required || (param === 'static');
                    const operation = f.getAttribute('operation');
                    let type = f.getAttribute('type') || $(f).data('type') || (fld && fld.type);
                    if (type in dataTypeDict)
                        type = dataTypeDict[type];
                    let choices = {};
                    console.log(f);
                    for (let option of f.querySelectorAll('option')) {
                        choices[option.getAttribute('value')] = option.childNodes[0].textContent;
                    }
                    const modelChoices = f.getAttribute('model-choices');
                    if (!type && modelChoices)
                        type = 'ModelChoices';
                    fields.push({
                        name,
                        label,
                        choices,
                        groupable,
                        sortable,
                        total,
                        param,
                        required,
                        operation,
                        modelChoices,
                        type,
                        autoCreate,
                        field: f,
                    });
                }
                let params = Array.from(xml.querySelectorAll('param')).map((p) => p.getAttribute('name'));
                return this.load(fields, params);
            }
            saveDialog() {
                const params = this.getUserParams();
                const name = window.prompt(Katrid.i18n.gettext('Report name'), Katrid.Reports.currentUserReport.name);
                if (name) {
                    Katrid.Reports.currentUserReport.name = name;
                    $.ajax({
                        type: 'POST',
                        url: this.container.find('#report-form').attr('action') + '?save=' + name,
                        contentType: "application/json; charset=utf-8",
                        dataType: 'json',
                        data: JSON.stringify(params)
                    });
                }
                return false;
            }
            load(fields, params) {
                if (!fields)
                    fields = this.info.fields;
                if (!params)
                    params = [];
                this.fields = fields;
                // Create params
                for (let p of fields) {
                    this.action.fields[p.name] = p;
                    if (p.groupable)
                        this.groupables.push(p);
                    if (p.sortable)
                        this.sortables.push(p);
                    if (p.total)
                        this.totals.push(p);
                    if (!p.autoCreate)
                        p.autoCreate = params.includes(p.name);
                }
            }
            loadParams() {
                for (let p of this.fields) {
                    if (p.autoCreate)
                        this.addParam(p.name);
                }
            }
            addParam(paramName, value) {
                console.log('add param', paramName, value);
                let elParams = this.container.querySelector('#params-params');
                for (let p of this.fields)
                    if (p.name === paramName) {
                        let param = new Reports.Param(p, this);
                        this.params.push(param);
                        // param.render(elParams);
                        break;
                    }
            }
            getValues() { }
            export(format) {
                if (format == null)
                    format = localStorage.katridReportViewer || 'pdf';
                const params = this.getUserParams();
                const svc = new Katrid.Services.ModelService('ui.action.report');
                svc.post('export_report', { args: [this.info.id], kwargs: { format, params } });
                return false;
            }
            preview() {
                return this.export(localStorage.katridReportViewer);
            }
            renderFields() {
                let p;
                let el = $('<div></div>');
                const flds = this.fields.map((p) => `<option value="${p.name}">${p.label}</option>`).join('');
                const aggs = ((() => {
                    const result1 = [];
                    for (p of Array.from(this.fields)) {
                        if (p.total) {
                            result1.push(`<option value="${p.name}">${p.label}</option>`);
                        }
                    }
                    return result1;
                })()).join('');
                el = $(this.container).find('#report-params');
                let sel = el.find('#report-id-fields');
                sel.append($(flds))
                    .select2({ tags: ((() => {
                        const result2 = [];
                        for (let p of Array.from(this.fields))
                            result2.push({ id: p.name, text: p.label });
                        return result2;
                    })()) });
                if (Katrid.Reports.currentUserReport.params && Katrid.Reports.currentUserReport.params.fields) {
                    console.log(Katrid.Reports.currentUserReport.params.fields);
                    sel.select2('val', Katrid.Reports.currentUserReport.params.fields);
                }
                //sel.data().select2.updateSelection([{ id: 'vehicle', text: 'Vehicle'}])
                sel = el.find('#report-id-totals');
                sel.append(aggs)
                    .select2({ tags: ((() => {
                        const result3 = [];
                        for (let p of Array.from(this.fields)) {
                            if (p.total) {
                                result3.push({ id: p.name, text: p.label });
                            }
                        }
                        return result3;
                    })()) });
                return el;
            }
            renderParams(container) {
                let p;
                let el = $('<div></div>');
                this.elParams = el;
                let loaded = {};
                const userParams = Katrid.Reports.currentUserReport.params;
                if (userParams && userParams.data) {
                    for (let p of Array.from(userParams.data)) {
                        loaded[p.name] = true;
                        this.addParam(p.name, p.value);
                    }
                }
                console.log('render params', this.action.info);
                for (p of Array.from(this.params)) {
                    if (p.static && !loaded[p.name]) {
                        $(p.render(el));
                    }
                }
                console.log('el', this.params);
                return container.querySelector('#params-params').append(el[0]);
            }
            renderGrouping(container) {
                const opts = (Array.from(this.groupables).map((p) => `<option value="${p.name}">${p.label}</option>`)).join('');
                const el = container.find("#params-grouping");
                const sel = el.find('select').select2();
                return sel.append(opts)
                    .select2("container").find("ul.select2-choices").sortable({
                    containment: 'parent',
                    start() { return sel.select2("onSortStart"); },
                    update() { return sel.select2("onSortEnd"); }
                });
            }
            renderSorting(container) {
                const opts = (Array.from(this.sortables).filter((p) => p.sortable).map((p) => `<option value="${p.name}">${p.label}</option>`)).join('');
                const el = container.find("#params-sorting");
                const sel = el.find('select').select2();
                return sel.append(opts)
                    .select2("container").find("ul.select2-choices").sortable({
                    containment: 'parent',
                    start() { return sel.select2("onSortStart"); },
                    update() { return sel.select2("onSortEnd"); }
                });
            }
            render(container) {
                this.container = container;
                let el = this.renderFields();
                if (this.sortables.length) {
                    el = this.renderSorting(container);
                }
                else {
                    $(container).find("#params-sorting").hide();
                }
                if (this.groupables.length) {
                    el = this.renderGrouping(container);
                }
                else {
                    $(container).find("#params-grouping").hide();
                }
                return el = this.renderParams(container);
            }
        }
        Reports.Report = Report;
        function renderDialog(action) {
            return `
    <div class="report-dialog">
      <form id="report-form" method="get" action="/web/reports/report/">
        <div class="data-heading panel panel-default">
          <div class="panel-body">
          <h2>${action.name}</h2>
          <div class="toolbar">
            <button class="btn btn-primary" type="button" v-on:click="report.preview()"><span class="fa fa-print fa-fw"></span> ${Katrid.i18n.gettext('Preview')}</button>

            <div class="btn-group">
              <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                      aria-expanded="false">${Katrid.i18n.gettext('Export')} <span class="caret"></span></button>
              <div class="dropdown-menu">
                <a class="dropdown-item" v-on:click="Katrid.Reports.Reports.preview()">PDF</a>
                <a class="dropdown-item" v-on:click="$event.preventDefault();report.telegram();">Telegram</a>
                <a class="dropdown-item" v-on:click="report.export('docx')">Word</a>
                <a class="dropdown-item" v-on:click="report.export('xlsx')">Excel</a>
                <a class="dropdown-item" v-on:click="report.export('pptx')">PowerPoint</a>
                <a class="dropdown-item" v-on:click="report.export('csv')">CSV</a>
                <a class="dropdown-item" v-on:click="report.export('txt')">${Katrid.i18n.gettext('Text File')}</a>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                      aria-expanded="false">${Katrid.i18n.gettext('My reports')} <span class="caret"></span></button>
              <ul class="dropdown-menu">
              </ul>
            </div>

          <div class="pull-right btn-group">
            <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                    aria-expanded="false"><i class="fa fa-sliders-h"></i></button>
            <div class="dropdown-menu">
              <a class="dropdown-item" v-on:click="report.saveDialog()">${Katrid.i18n.gettext('Save')}</a>
              <a class="dropdown-item">${Katrid.i18n.gettext('Load')}</a>
              <div class="dropdown-divider"></div>
              <h6 class="dropdown-header">Report Viewer</h6>
              <a class="dropdown-item" onclick="localStorage.setItem('katridReportViewer', 'pdf')">Visualizar em PDF</a>
              <a class="dropdown-item" onclick="localStorage.setItem('katridReportViewer', 'native')">Visualizador Nativo</a>
            </div>
          </div>

          </div>
        </div>
        </div>
        <div class="col-sm-12">
          <table class="col-sm-12" style="margin-top: 20px; display:none;">
            <tr>
              <td colspan="2" style="padding-top: 8px;">
                <label>${Katrid.i18n.gettext('My reports')}</label>

                <select class="form-control" v-on:change="userReportChanged(userReport.id)" v-model="userReport.id">
                    <option value=""></option>
                    <option v-for="rep in userReports" :value="rep.id">{{ rep.name }}</option>
                </select>
              </td>
            </tr>
          </table>
        </div>
      <div id="report-params">
      <div id="params-fields" class="col-sm-12 form-group" v-if="customizableReport">
        <div class="checkbox"><label><input type="checkbox" v-model="paramsAdvancedOptions"> ${Katrid.i18n.gettext('Advanced options')}</label></div>
        <div v-show="paramsAdvancedOptions">
          <div class="form-group">
            <label>${Katrid.i18n.gettext('Printable Fields')}</label>
            <input type="hidden" id="report-id-fields"/>
          </div>
          <div class="form-group">
            <label>${Katrid.i18n.gettext('Totalizing Fields')}</label>
            <input type="hidden" id="report-id-totals"/>
          </div>
        </div>
      </div>

      <div class="clearfix"></div>

      </div>
        <div v-if="advancedOptions">
        <div id="params-sorting" class="col-sm-12 form-group">
          <label class="control-label">${Katrid.i18n.gettext('Sorting')}</label>
          <select multiple id="report-id-sorting"></select>
        </div>

        <div id="params-grouping" class="col-sm-12 form-group">
          <label class="control-label">${Katrid.i18n.gettext('Grouping')}</label>
          <select multiple id="report-id-grouping"></select>
        </div>
        <hr>
        <table class="col-sm-12">
          <tr>
            <td class="col-sm-4">
              <select class="form-control" v-model="newParam">
                <option value="">--- ${Katrid.i18n.gettext('FILTERS')} ---</option>
                <option v-for="field in report.fields" :value="field.name">{{ field.label }}</option>
              </select>
            </td>
            <td class="col-sm-8">
              <button
                  class="btn btn-outline-secondary" type="button"
                  v-on:click="report.addParam(newParam)">
                <i class="fa fa-plus fa-fw"></i> ${Katrid.i18n.gettext('Add Parameter')}
              </button>
            </td>
          </tr>
        </table>
        <div class="clearfix"></div>
        <hr>
      </div>
      <div id="params-params" class="params-params margin-top-8 row">
        <div v-for="param in report.params" class="col-lg-6 form-group">
          <div class="col-12">
            <label class="control-label">{{ param.label }}</label>
          </div>
          <div class="col-4" v-if="param.operationsVisible">
            <select v-model="param.operation" class="form-control" ng-change="param.setOperation(param.operation)">
              <option v-for="op in param.operations" :value="op.id">{{ op.text }}</option>
            </select>
          </div>
          <div class="col param-widget">
          <report-param-widget :param="param"/>
</div>
        </div>
      </div>
      </form>
    </div>
    `;
        }
        Reports.renderDialog = renderDialog;
    })(Reports = Katrid.Reports || (Katrid.Reports = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        class BaseAdapter {
        }
        Services.BaseAdapter = BaseAdapter;
        class LocalMemoryConnection {
        }
        Services.LocalMemoryConnection = LocalMemoryConnection;
        /**
         * Browser fetch adapter
         */
        class FetchAdapter extends BaseAdapter {
            $fetch(url, config, params) {
                if (params) {
                    url = new URL(url);
                    Object.entries(params).map((k, v) => url.searchParams.append(k, v));
                }
                // send events
                $(Katrid).trigger('fetch.before');
                return fetch(url, config)
                    .then(response => {
                    $(Katrid).trigger('fetch.done');
                    return response;
                });
            }
            fetch(rpcName, config) {
                return window.fetch(rpcName, config);
            }
        }
        Services.FetchAdapter = FetchAdapter;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        /**
         * JsonRPC is the default adapter and is based on FetchAdapter
         */
        class JsonRpcAdapter extends Services.FetchAdapter {
        }
        Services.JsonRpcAdapter = JsonRpcAdapter;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
/// <reference path="services.ts"/>
/// <reference path="../forms/dialogs.ts" />
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        class ModelService extends Services.Service {
            searchByName(kwargs) {
                return this.post('api_search_by_name', kwargs);
            }
            createName(name) {
                let kwargs = { name };
                return this.post('api_create_name', { kwargs: kwargs });
            }
            search(params, data, config, context) {
                return this.post('api_search', { kwargs: params }, data, config, context);
            }
            delete(id) {
                if (!_.isArray(id))
                    id = [id];
                return this.post('api_delete', { kwargs: { ids: id } });
            }
            getById(id, config) {
                let fields = config?.fields;
                return this.post('api_get', { args: [id, fields] }, null, config);
            }
            getDefaults(kwargs, config) {
                return this.post('api_get_defaults', { kwargs }, null, config);
            }
            copy(id) {
                return this.post('api_copy', { args: [id] });
            }
            static _prepareFields(res) {
                if (res) {
                    if (res.fields) {
                        res.fields = Katrid.Data.Fields.fromArray(res.fields);
                        res.fieldList = Object.values(res.fields);
                    }
                    if (res.views) {
                        Object.values(res.views).map((v) => v.fields = Katrid.Data.Fields.fromArray(v.fields));
                        Object.keys(res.views).map(k => res.views[k] = new Katrid.Forms.ModelViewInfo(res.views[k]));
                    }
                }
                return res;
            }
            getViewInfo(data) {
                return this.post('admin_get_view_info', { kwargs: data })
                    .then(this.constructor._prepareFields);
            }
            async loadViews(data) {
                return this.post('admin_load_views', { kwargs: data })
                    .then(ModelService._prepareFields);
            }
            getFieldsInfo(data) {
                return this.post('admin_get_fields_info', { kwargs: data })
                    .then(ModelService._prepareFields);
            }
            getFieldChoices(config) {
                let kwargs = config.kwargs || {};
                if (config.filter)
                    kwargs.filter = config.filter;
                if (config.context)
                    kwargs.context = config.context;
                return this.post('api_get_field_choices', { args: [config.field, config.term], kwargs }, null, config.config);
            }
            doViewAction(data) {
                return this.post('admin_do_view_action', { kwargs: data });
            }
            write(data, params) {
                return new Promise((resolve, reject) => {
                    this.post('api_write', { kwargs: { data } }, params)
                        .then((res) => {
                        Katrid.Forms.Dialogs.Alerts.success(Katrid.i18n.gettext('Record saved successfully.'));
                        resolve(res);
                    })
                        .catch(res => {
                        if ((res.status === 500) && res.responseText)
                            alert(res.responseText);
                        else {
                            Katrid.Forms.Dialogs.Alerts.error(Katrid.i18n.gettext('Error saving record changes'));
                            console.log('error', res);
                            if (res.error)
                                Katrid.Forms.Dialogs.Alerts.error(res.error);
                        }
                        reject(res);
                    });
                });
            }
            groupBy(grouping, params) {
                return this.post('api_group_by', { kwargs: { grouping, params } });
            }
            autoReport() {
                return this.post('admin_auto_report', { kwargs: {} });
            }
            rpc(meth, args, kwargs) {
                // execute rpc
                return new Promise((resolve, reject) => {
                    this.post(meth, { args: args, kwargs: kwargs })
                        .then((res) => {
                        resolve(res);
                    })
                        .catch(res => {
                        // display alert
                        if (res?.error && (typeof res.error === 'string'))
                            Katrid.Forms.Dialogs.Alerts.error(res.error);
                        else if (res.messages && _.isObject(res.messages)) {
                            for (let msg of Object.values(res.messages))
                                if (typeof msg === 'string')
                                    Katrid.Forms.Dialogs.Alerts.error(msg);
                                else if (msg instanceof Array)
                                    Katrid.Forms.Dialogs.Alerts.error(msg.join('\n'));
                        }
                        else
                            Katrid.Forms.Dialogs.Alerts.error(res.message);
                        reject(res);
                    });
                });
            }
        }
        Services.ModelService = ModelService;
        // Represents a server query
        class Query extends ModelService {
            constructor() {
                super('ir.query');
            }
            static read(config) {
                // read data from server
                let details, id, params, filter;
                if (_.isObject(config)) {
                    details = config.details;
                    params = config.params;
                    filter = config.filter;
                    id = config.id;
                }
                else
                    id = config;
                return (new Query()).post('read', {
                    args: [id],
                    kwargs: {
                        with_description: details, params, as_dict: config.as_dict, filter
                    }
                });
            }
            static all() {
                return (new Query()).rpc('list_all');
            }
            static executeSql(sql) {
                return (new Query()).post('execute_sql', { args: [sql] });
            }
        }
        Services.Query = Query;
        class Actions extends ModelService {
            static load(action) {
                let svc = new ModelService('ui.action');
                return svc.post('load', { args: [action], kwargs: {
                    // context: Katrid.app.context
                    } });
            }
            static onExecuteAction(action, actionType, context) {
                let svc = new ModelService(actionType);
                return svc.post('on_execute_action', { args: [action], kwargs: { context } });
            }
        }
        Services.Actions = Actions;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        class WebSQLAdapter extends Services.BaseAdapter {
            constructor(...args) {
                super();
                openDatabase(...args);
            }
            $fetch(url, data, params) {
                console.log(url, data, params);
            }
        }
        Services.WebSQLAdapter = WebSQLAdapter;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class WebApplication extends HTMLElement {
            connectedCallback() {
            }
        }
        Forms.WebApplication = WebApplication;
        Katrid.define('web-application', WebApplication);
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        let MENU_DELAY = 2000;
        class AppHeader extends Katrid.WebComponent {
            constructor() {
                super(...arguments);
                this._menuClicked = false;
            }
            create() {
                this.app = Katrid.webApp;
                super.create();
                if (this.app?.config?.menu) {
                    this.loadModules(this.app.config.menu);
                    this.createUserMenu();
                    document.addEventListener('click', evt => {
                        this._menuClicked = false;
                        this.hideMenu();
                    });
                }
                this.inputSearch = this.querySelector('#navbar-search');
                this.autocomplete = new AppGlobalSearch(this.inputSearch, this.app.config.menu);
            }
            loadModules(items) {
                this.nav = document.querySelector('#navbar');
                this.navMenu = document.querySelector('#navbar-menu');
                let menu = document.querySelector('.apps-menu');
                for (let item of items) {
                    this._rootItem = item;
                    let menuItem = this.createDropdownItem(item);
                    menuItem.classList.add('text-center');
                    let imgPath = item.icon;
                    if (imgPath?.includes('.')) {
                        let img = document.createElement('img');
                        img.src = imgPath;
                        menuItem.append(img);
                    }
                    else {
                        let img = document.createElement('i');
                        img.className = imgPath || 'fa-4x fas fa-cube';
                        menuItem.append(img);
                    }
                    let span = document.createElement('span');
                    span.innerText = item.name;
                    menuItem.append(span);
                    menu.append(menuItem);
                    let href = '#/app/?menu_id=' + item.id;
                    item.url = href;
                    menuItem.setAttribute('href', href);
                    menuItem.classList.add('module-selector');
                    this.createMenu(item);
                }
            }
            createMenu(menu) {
                let module = document.createElement('a');
                let dropdown = document.createElement('div');
                let h3 = document.createElement('h3');
                dropdown.classList.add('dropdown');
                module.classList.add('module-nav-link', 'navbar-menu-header');
                dropdown.style.display = 'none';
                h3.innerText = menu.name;
                module.append(h3);
                module.setAttribute('data-bs-toggle', 'dropdown');
                dropdown.append(module);
                this.insertBefore(dropdown, this.navMenu);
                dropdown.setAttribute('data-menu-id', menu.id.toString());
                if (Katrid.isMobile) {
                    module.classList.add('dropdown-toggle');
                    dropdown.classList.add('mr-auto');
                    if (menu.children?.length) {
                        let dropdownMenu = this.createDropdownMenu(menu.children);
                        dropdown.append(dropdownMenu);
                    }
                }
                else {
                    let ul = document.createElement('ul');
                    ul.classList.add('navbar-nav', 'navbar-menu-group', 'mr-auto');
                    ul.style.display = 'none';
                    ul.setAttribute('data-parent-id', menu.id.toString());
                    // this.nav.append(ul, this.navMenu);
                    this.navMenu.append(ul);
                    let menuClick = evt => {
                        evt.stopPropagation();
                        evt.preventDefault();
                        this._menuClicked = !this._menuClicked;
                        if (this._menuClicked)
                            this.showMenu(evt.target.parentElement);
                        else
                            this.hideMenu();
                    };
                    let pointerover = evt => {
                        this.hideMenu();
                        if (this._menuClicked) {
                            this.showMenu(evt.target);
                        }
                        else
                            this._timeout = setTimeout(() => this.showMenu(evt.target), MENU_DELAY);
                    };
                    let pointerout = () => {
                        clearTimeout(this._timeout);
                        if (!this._menuClicked)
                            this._timeout = setTimeout(() => this.hideMenu(), MENU_DELAY);
                    };
                    if (menu.children)
                        for (let item of menu.children) {
                            let li = document.createElement('li');
                            li.classList.add('nav-item', 'dropdown');
                            li.addEventListener('click', menuClick);
                            li.addEventListener('pointerenter', pointerover);
                            li.addEventListener('pointerleave', pointerout);
                            let a = document.createElement('a');
                            a.classList.add('nav-link', 'dropdown-link', 'menu-item-action');
                            a.setAttribute('id', 'ui-menu-' + item.id.toString());
                            a.setAttribute('role', 'button');
                            a.innerText = item.name;
                            li.append(a);
                            ul.append(li);
                            if (item.children?.length)
                                li.append(this.createDropdownMenu(item.children));
                            else {
                                item.url = '#/app/?menu_id=' + this._rootItem.id.toString() + '&action=' + item.action;
                                a.setAttribute('href', item.url);
                                a.addEventListener('click', evt => {
                                    evt.stopPropagation();
                                    return false;
                                });
                            }
                        }
                }
                return module;
            }
            showMenu(li) {
                $('.apps-menu.show').removeClass('show');
                clearTimeout(this._timeout);
                li.classList.add('show');
                this._currentMenu = li;
            }
            hideMenu() {
                clearTimeout(this._timeout);
                if (this._currentMenu) {
                    this._currentMenu.classList.remove('show');
                    this._currentMenu = null;
                }
            }
            createDropdownMenu(items) {
                let dropdownMenu = document.createElement('div');
                dropdownMenu.classList.add('dropdown-menu');
                for (let item of items)
                    this.createMenuItem(item, dropdownMenu);
                return dropdownMenu;
            }
            createDropdownItem(item) {
                let el = document.createElement('a');
                el.classList.add('dropdown-item', 'menu-item-action');
                el.setAttribute('id', 'ui-menu-' + item.id.toString());
                el.setAttribute('data-menu-id', item.id.toString());
                if (item.url) {
                    let url = item.url;
                    if (url.startsWith('#/action/'))
                        url += '?menu_id=' + this._rootItem.id;
                    item.url = url;
                    el.setAttribute('href', url);
                    // el.setAttribute('href', '#/app/?menu_id=' + item.id.toString());
                }
                return el;
            }
            createMenuItem(item, dropdownMenu) {
                if (item.children && item.children.length) {
                    let menuItem = this.createDropdownItem(item);
                    menuItem.innerText = item.name;
                    let li = document.createElement('li');
                    let ul = document.createElement('ul');
                    // ul.classList.add('dropdown-menu');
                    menuItem.classList.add('dropdown-toggle');
                    li.classList.add('dropdown-submenu');
                    li.append(menuItem);
                    li.append(ul);
                    menuItem.addEventListener('click', evt => {
                        evt.stopPropagation();
                        evt.preventDefault();
                        ul.classList.toggle('show');
                    });
                    dropdownMenu.append(li);
                    for (let subItem of item.children)
                        this.createMenuItem(subItem, ul);
                }
                else {
                    let menuItem = this.createDropdownItem(item);
                    menuItem.innerText = item.name;
                    if (item.action) {
                        item.url = '#/app/?menu_id=' + this._rootItem.id + '&action=' + item.action;
                        menuItem.setAttribute('href', item.url);
                    }
                    if (item.action || item.url)
                        menuItem.addEventListener('click', evt => {
                            evt.stopPropagation();
                            this.hideMenu();
                        });
                    dropdownMenu.append(menuItem);
                    return menuItem;
                }
            }
            createUserMenu() {
                let li = this.querySelector('.nav-item.user-menu.dropdown');
                // li.addEventListener('pointerover', () => li.classList.add('show'));
                // li.addEventListener('pointerout', () => li.classList.remove('show'));
            }
        }
        UI.AppHeader = AppHeader;
        Katrid.define('app-header', AppHeader);
        class AppGlobalSearch {
            constructor(input, menu) {
                this.input = input;
                this.menu = null;
                this.term = '';
                this._localMenuCache = [];
                this.input.addEventListener('input', () => this.onInput());
                this.input.addEventListener('click', event => {
                    this.input.select();
                    this.onClick();
                });
                this.input.addEventListener('blur', () => this.onFocusout());
                this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
                let timeout;
                this.setSource(async (query) => {
                    return new Promise(resolve => {
                        clearTimeout(timeout);
                        setTimeout(async () => {
                            let res = [];
                            let term = query.term.normalize('NFD').replace(/\p{Diacritic}/gu, "");
                            let re = new RegExp(term, 'i');
                            let aRes = Katrid.Services.Service.$post('/web/menu/search/', { term }).then(res => res.items);
                            // find by a menu item using javascript (TODO allow custom finder)
                            console.log('menu', menu);
                            if (!this._localMenuCache.length)
                                menu.forEach(item => this._registerMenuItem(item));
                            for (let item of this._localMenuCache)
                                if (re.test(item.normalized)) {
                                    res.push({ id: item.id, text: item.fullPath, href: item.href });
                                    if (res.length > 5)
                                        break;
                                }
                            try {
                                aRes = await aRes;
                            }
                            catch (error) {
                                aRes = [];
                            }
                            resolve(res.concat(aRes));
                        }, 300);
                    });
                });
            }
            _registerMenuItem(menuItem, path) {
                let text = menuItem.name.trim();
                let normText = text.normalize('NFD').replace(/\p{Diacritic}/gu, "");
                let fullPath = text;
                if (path)
                    fullPath = path + ' / ' + fullPath;
                let normFullPath = fullPath.normalize('NFD').replace(/\p{Diacritic}/gu, "");
                this._localMenuCache.push({
                    id: menuItem.id, text, fullPath, normalized: normText, normalizedFullPath: normFullPath, href: menuItem.url
                });
                for (let child of menuItem.children)
                    this._registerMenuItem(child, fullPath);
            }
            onInput() {
                this.term = this.input.value;
                // clear selection
                if (this.$selectedItem) {
                    this.$selectedItem = null;
                }
                this.showMenu();
            }
            onClick() {
                this.showMenu();
            }
            onFocusout() {
                if (!this.menu.mouseDown) {
                    this.hideMenu();
                    this.invalidateValue();
                }
                this.term = '';
            }
            createMenu() {
                // let source = () => {
                //   return new Promise((resolve, reject) => {
                //     let res: DropdownItem[] = [];
                //     for (let i = 1; i <= 10; i++)
                //       res.push({id: i, text: 'Item ' + i.toString()});
                //     res.push({id: 11, text: 'Create New...', template: '<a class="dropdown-item">Create New...</a>'})
                //     resolve(res);
                //   });
                // }
                this.menu = new UI.DropdownMenu(this, { source: this._source, target: this.input.parentElement });
            }
            invalidateValue() {
                this.selectedItem = this.$selectedItem;
            }
            onKeyDown(evt) {
                if (this.menu)
                    switch (evt.which) {
                        case Katrid.UI.keyCode.DOWN:
                            this.menu.move(1);
                            evt.preventDefault();
                            break;
                        case Katrid.UI.keyCode.UP:
                            this.menu.move(-1);
                            evt.preventDefault();
                            break;
                        case Katrid.UI.keyCode.ENTER:
                            if (this.menu.activeItem) {
                                this.menu.onSelectItem();
                                evt.preventDefault();
                            }
                            break;
                        case Katrid.UI.keyCode.ESCAPE:
                            if (this.menu)
                                this.hideMenu();
                            break;
                    }
            }
            showMenu() {
                if (!this.menu) {
                    this.createMenu();
                    this.menu.show();
                }
                this.menu.init();
            }
            hideMenu() {
                this.input.value = '';
                if (this.menu)
                    this.menu.hide();
                this.menu = null;
            }
            menuVisible() {
                return this.menu.visible;
            }
            setOptions(options) {
                if (options.source)
                    this.setSource(options.source);
            }
            setSource(value) {
                this._source = value;
            }
            _selectItem(el) {
                this.term = '';
                let item = null;
                if (el) {
                    item = $(el).data('item');
                    if (item?.href)
                        window.location.href = item.href;
                    // if (item?.type === 'menuitem') {
                    //   console.log('select item');
                    //   (document.querySelector(`[data-menu-id="${item.id}"]`) as HTMLAnchorElement).click();
                    // }
                }
                this.hideMenu();
                // return this.setValue(item);
            }
            setValue(item, el) {
                let event = new CustomEvent('selectItem', {
                    detail: {
                        item,
                        dropdownItem: el,
                    }
                });
                // this.dispatchEvent(event);
                if (!event.defaultPrevented) {
                    // apply the selected text
                    this.selectedItem = item;
                    // hide the dropdown menu
                    if (this.menu)
                        this.hideMenu();
                }
                return event;
            }
            get selectedItem() {
                return this.$selectedItem;
            }
            set selectedItem(value) {
                this.$selectedItem = value;
                if (!this.input)
                    return;
                if (value)
                    this.input.value = value.text;
                else
                    this.input.value = '';
            }
            get selectedValue() {
                if (this.$selectedItem)
                    return this.$selectedItem.id;
            }
        }
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Controls;
    (function (Controls) {
        class Calendar {
            constructor(el, config) {
                this.config = config;
                this.target = el;
                if (!this.config)
                    this.config = {};
                this._date = this.config.date || new Date();
            }
            get date() {
                return this._date;
            }
            set date(value) {
                this._date = value;
            }
            _renderMonthCalendar(year, month) {
                const calendar = document.createElement('div');
                calendar.classList.add('month-calendar');
                let date = new Date(year, month, 1);
                let dow = date.getDay();
                // render header
                let header = document.createElement('div');
                header.classList.add('month-header');
                let nav = document.createElement('button');
                nav.type = 'button';
                nav.classList.add('btn');
                nav.innerHTML = '<i class="fas fa-chevron-left"></i>';
                nav.addEventListener('pointerdown', event => event.stopPropagation());
                nav.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.element.innerHTML = '';
                    let date = moment(new Date(year, month, 1)).add(-1, 'months');
                    this._renderMonthCalendar(date.year(), date.month());
                });
                header.append(nav);
                let label = document.createElement('label');
                label.classList.add('month-name');
                label.innerText = moment(date).format('MMMM');
                header.append(label);
                nav = document.createElement('button');
                nav.type = 'button';
                nav.classList.add('btn');
                nav.innerHTML = '<i class="fas fa-chevron-right"></i>';
                nav.addEventListener('pointerdown', event => event.stopPropagation());
                nav.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.element.innerHTML = '';
                    let date = moment(new Date(year, month, 1)).add(1, 'months');
                    this._renderMonthCalendar(date.year(), date.month());
                });
                header.append(nav);
                this.element.append(header);
                // render days of week
                for (let i = 0; i < 7; i++) {
                    let el = document.createElement('div');
                    el.classList.add('dow');
                    let od = new Date();
                    od.setDate(date.getDate() - (6 - i));
                    el.innerText = moment(od).format('ddd');
                    calendar.append(el);
                }
                // render days
                let dayClick = event => this.dayClick(event);
                date.setDate(date.getDate() - dow);
                for (let i = 0; i < 42; i++) {
                    let el = this._renderDay(date);
                    let m = date.getMonth();
                    if (m > month)
                        el.classList.add('new');
                    else if (m < month)
                        el.classList.add('old');
                    calendar.append(el);
                    date.setDate(date.getDate() + 1);
                    el.addEventListener('click', dayClick);
                    el.addEventListener('pointerdown', this.dayMouseDown);
                }
                this.element.append(calendar);
            }
            dayMouseDown(event) {
                event.stopPropagation();
            }
            dayClick(event) {
                if (this.config.change)
                    this.config.change(event.target.getAttribute('data-value'));
                this.hide();
            }
            _renderDay(date) {
                let el = document.createElement('div');
                el.classList.add('day');
                el.innerText = date.getDate().toString();
                el.setAttribute('data-value', moment(date).format('YYYY-MM-DD'));
                return el;
            }
            render() {
                this.element = document.createElement('div');
                this.element.classList.add('date-calendar');
                // initial date
                this._renderMonthCalendar(this._date.getFullYear(), this._date.getMonth());
                return this.element;
            }
            show() {
                this._docMouseEvent = () => {
                    document.removeEventListener('pointerdown', this._docMouseEvent);
                    this.hide();
                };
                document.addEventListener('pointerdown', this._docMouseEvent);
                let el = this.render();
                this._popper = Popper.createPopper(this.target, el, { placement: 'bottom-start' });
                el.classList.add('show');
                document.body.append(el);
            }
            hide() {
                this.element.remove();
                this._popper.destroy();
            }
        }
        Controls.Calendar = Calendar;
    })(Controls = Katrid.Controls || (Katrid.Controls = {}));
})(Katrid || (Katrid = {}));
Katrid.filter('date', function (value, fmt = 'MM/DD/YYYY') {
    if (value) {
        if (fmt == 'shortDate')
            fmt = Katrid.i18n.formats.shortDateFormat;
        else if (fmt == 'short')
            fmt = Katrid.i18n.formats.shortDateTimeFormat;
        return moment(value).format(fmt);
    }
});
Katrid.filter('number', function (value, digits) {
    if (value != null)
        return Katrid.intl.number(digits).format(value);
});
Katrid.filter('toFixed', function (value, digits) {
    if (value != null)
        return Katrid.intl.toFixed(digits).format(value);
});
function sprintf(fmt, obj) {
    if (Array.isArray(obj))
        return fmt.replace(/%s/g, match => String(obj.shift()));
    return fmt.replace(/%\(\w+\)s/g, match => String(obj[match.slice(2, -2)]));
}
Katrid.filter('sprintf', function (fmt, ...args) {
    return sprintf(fmt, args);
});
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            class PlotlyChart extends HTMLElement {
                connectedCallback() {
                    let title = this.getAttribute('data-title');
                    let layout = {};
                    if (title)
                        layout.title = title;
                    let serviceName = this.getAttribute('data-service');
                    let url = this.getAttribute('data-url');
                    let queryId = this.getAttribute('data-query-id');
                    if (serviceName) {
                        let method = this.getAttribute('data-method');
                        let service = new Katrid.Services.ModelService(serviceName);
                        service.rpc(method)
                            .then((res) => {
                            if (_.isString(res))
                                res = JSON.parse(res);
                            Plotly.plot(this, JSON.parse(res), layout, { responsive: true });
                        });
                    }
                    else if (queryId) {
                        let x = this.getAttribute('data-x');
                        let y = this.getAttribute('data-y');
                        let marker = this.getAttribute('data-marker');
                        if (marker)
                            marker = JSON.parse(marker);
                        let fields;
                        if (!x)
                            fields = [x, y];
                        if (!x)
                            x = 0;
                        if (!y)
                            y = 1;
                        Katrid.Services.Query.read({ id: queryId, as_dict: false, fields })
                            .then((res) => {
                            let chartType = this.getAttribute('chart-type');
                            if (!chartType)
                                chartType = 'bar';
                            let axis = this.transformData(res.data, x, y);
                            let data = { chartType, x: axis.x, y: axis.y, marker };
                            Plotly.plot(this, data, layout, { responsive: true });
                        });
                    }
                }
                transformData(data, x, y) {
                    let rx = [];
                    let ry = [];
                    for (let obj of data) {
                        rx.push(obj[x]);
                        ry.push(obj[y]);
                    }
                    return { x: rx, y: ry };
                }
            }
            Widgets.PlotlyChart = PlotlyChart;
            Katrid.define('plotly-chart', PlotlyChart);
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        var Utils;
        (function (Utils) {
            function tableToText(table) {
                let output = [];
                let row = [];
                let n = 0;
                for (let td of table.tHead.rows[0].querySelectorAll('th')) {
                    if (n > 0)
                        row.push(td.innerText);
                    n++;
                }
                output.push(row.join('\t'));
                for (let tr of table.querySelectorAll('tr')) {
                    row = [];
                    for (let td of tr.querySelectorAll('td'))
                        row.push(td.innerText);
                    if (row.length)
                        output.push(row.join('\t'));
                }
                return output.join('\n');
            }
            Utils.tableToText = tableToText;
        })(Utils = UI.Utils || (UI.Utils = {}));
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        const DEFAULT_EXPAND_CLASS = 'fa-caret-right';
        const DEFAULT_COLLAPSE_CLASS = 'fa-caret-down';
        class Component {
            get el() {
                return this._el;
            }
            set el(value) {
                this.setElement(value);
            }
            setElement(el) {
                this._el = el;
                el.katrid = { object: this };
            }
        }
        UI.Component = Component;
        class TreeNode extends Component {
            constructor(treeView, item) {
                super();
                this.treeView = treeView;
                this._selected = false;
                this._expanded = false;
                this._level = 0;
                this._children = [];
                let el;
                if (item instanceof HTMLElement)
                    this.el = item;
                else if (item) {
                    this.data = item;
                    el = document.createElement('li');
                    el.classList.add('tree-node');
                    let a = document.createElement('a');
                    a.addEventListener('mousedown', (evt) => {
                        evt.preventDefault();
                        this.treeView.el.focus();
                    });
                    a.addEventListener('click', () => this.select());
                    a.addEventListener('dblclick', (evt) => {
                        evt.preventDefault();
                        this.expanded = !this.expanded;
                    });
                    // children elements
                    this._ul = document.createElement('ul');
                    a.classList.add('tree-item');
                    el.appendChild(a);
                    el.appendChild(this._ul);
                    this.el = el;
                    this._a = a;
                    // expand toggle element
                    this._canExpand = true;
                    this._exp = document.createElement('span');
                    this._exp.addEventListener('dblclick', (evt) => evt.stopPropagation());
                    this._exp.addEventListener('click', (evt) => {
                        evt.preventDefault();
                        this.expanded = !this.expanded;
                    });
                    this._exp.classList.add('fa', 'fa-fw');
                    a.appendChild(this._exp);
                    // icon element
                    if (_.isString(item.icon)) {
                        this._iconElement = document.createElement('span');
                        this._iconElement.classList.add('icon', 'fa', 'fa-fw');
                        this._iconElement.classList.add(item.icon);
                        a.appendChild(this._iconElement);
                    }
                    a.appendChild(document.createTextNode(item.text));
                }
            }
            get children() {
                return this._children;
            }
            select() {
                this.treeView.selection = [this];
            }
            collapse() {
                this.expanded = false;
            }
            expand() {
                this.expanded = true;
            }
            get expanded() {
                return this._expanded;
            }
            set expanded(value) {
                this._expanded = value;
                if (value) {
                    this.el.classList.add('expanded');
                    this._exp.classList.remove(DEFAULT_EXPAND_CLASS);
                    this._exp.classList.add(DEFAULT_COLLAPSE_CLASS);
                }
                else {
                    this.el.classList.remove('expanded');
                    this._exp.classList.remove(DEFAULT_COLLAPSE_CLASS);
                    this._exp.classList.add(DEFAULT_EXPAND_CLASS);
                }
            }
            get index() {
                if (this._parent)
                    return this._parent.children.indexOf(this);
                else
                    return this.treeView.nodes.indexOf(this);
            }
            get previousSibling() {
                let nodes;
                if (this._parent)
                    nodes = this._parent.children;
                else
                    nodes = this.treeView.nodes;
                return nodes[this.index - 1];
            }
            get nextSibling() {
                let nodes;
                if (this._parent)
                    nodes = this._parent.children;
                else
                    nodes = this.treeView.nodes;
                return nodes[this.index + 1];
            }
            get previous() {
                let p = this.previousSibling;
                if (p && p._expanded && p.children && p.children.length)
                    return p.last;
                if (this._parent)
                    return this._parent;
                return p;
            }
            get next() {
                if (this._expanded && this.children.length)
                    return this.first;
                let n = this.nextSibling;
                if (n && n._expanded && n.children && n.children.length)
                    return n.first;
                else if (this._parent)
                    return this._parent.nextSibling;
                return n;
            }
            get first() {
                return this.children[0];
            }
            get last() {
                return this.children[this.children.length - 1];
            }
            get selected() {
                return this._selected;
            }
            set selected(value) {
                this._selected = value;
                if (value)
                    this._a.classList.add('selected');
                else
                    this._a.classList.remove('selected');
                if (!this.treeView.selection.includes(this))
                    this.treeView.selection.push(this);
            }
            get parent() {
                return this._parent;
            }
            set parent(value) {
                // remove node from its parent
                if (this._parent)
                    this._parent.remove(this);
                this._parent = value;
                // add node onto new parent
                if (value)
                    value.add(this);
            }
            add(node) {
                this.children.push(node);
                this._ul.appendChild(node.el);
                this.update();
                node.calcLevel();
            }
            remove(node) {
                this.children.splice(this.children.indexOf(node), 1);
                this.update();
                node.calcLevel();
            }
            calcLevel() {
                this.level = this._parent.level + 1;
            }
            update() {
                if (this._canExpand && this.children.length)
                    this._exp.classList.add(DEFAULT_EXPAND_CLASS);
                else
                    this._exp.classList.remove(DEFAULT_COLLAPSE_CLASS);
            }
            get level() {
                return this._level;
            }
            set level(value) {
                console.log('set level', value, this._level);
                if (value !== this._level) {
                    for (let c of this.el.querySelectorAll('.indent'))
                        c.parentNode.removeChild(c);
                    let delta = value - this._level;
                    this._level = value;
                    for (let n of this.all())
                        n.level -= delta;
                    for (let c = 0; c < this._level; c++) {
                        let indent = document.createElement('span');
                        indent.classList.add('indent');
                        this._a.prepend(indent);
                    }
                }
            }
            *all() {
                for (let x of this.children) {
                    for (let y of x.all())
                        yield y;
                    yield x;
                }
            }
        }
        UI.TreeNode = TreeNode;
        class TreeView {
            constructor(cfg) {
                this._selection = [];
                this.el = cfg.dom;
                this.nodes = [];
                if (cfg.items)
                    this.addNodes(cfg.items);
                this.el.classList.add('tree-view');
                this.el.tabIndex = 0;
                this.el.addEventListener('keydown', (evt) => {
                    console.log('key down;');
                    let n;
                    switch (evt.key) {
                        case 'ArrowDown':
                            console.log('arrow down;;');
                            this.next();
                            break;
                        case 'ArrowUp':
                            this.previous();
                            break;
                        case 'ArrowRight':
                            n = this.currentNode;
                            if (n && n.children.length) {
                                if (n.expanded)
                                    n.next.select();
                                else
                                    n.expand();
                            }
                            else
                                this.next();
                            break;
                        case 'ArrowLeft':
                            n = this.currentNode;
                            if (n && n.children.length) {
                                if (n.expanded)
                                    n.collapse();
                                else
                                    n.previous.select();
                            }
                            else
                                this.previous();
                            break;
                    }
                });
            }
            get selection() {
                return this._selection;
            }
            set selection(value) {
                // unselect old selection
                for (let node of this._selection)
                    node.selected = false;
                this._selection = value;
                // set new nodes selection to selected
                for (let node of value)
                    node.selected = true;
                // dispatch selection change event
                let evt = new CustomEvent('selectionchange', { detail: { selection: value } });
                this.el.dispatchEvent(evt);
            }
            get firstNode() {
                if (this.nodes.length)
                    return this.nodes[0];
            }
            get lastNode() {
                if (this.nodes.length)
                    return this.nodes[this.nodes.length - 1];
            }
            previous() {
                let curNode = this.currentNode;
                if (curNode) {
                    let n = curNode.previous;
                    if (n)
                        n.select();
                }
                else
                    this.lastNode.select();
            }
            next() {
                let curNode = this.currentNode;
                if (curNode) {
                    let n = curNode.next;
                    if (n)
                        n.select();
                }
                else
                    this.firstNode.select();
            }
            addNodes(nodes, parent = null) {
                for (let node of nodes) {
                    let item = this.addNode(node, parent);
                    if (node.children)
                        this.addNodes(node.children, item);
                }
            }
            addNode(item, parent) {
                let r;
                if (item instanceof HTMLElement) { }
                else if (typeof item === 'string')
                    item = { text: item };
                console.log(item);
                r = new TreeNode(this, item);
                if (parent)
                    r.parent = parent;
                else {
                    this.nodes.push(r);
                    console.log(r.el);
                    this.el.appendChild(r.el);
                }
                return r;
            }
            get currentNode() {
                if (this.selection.length)
                    return this.selection[this.selection.length - 1];
            }
        }
        UI.TreeView = TreeView;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    function isString(obj) {
        return typeof obj === 'string';
    }
    Katrid.isString = isString;
    function isNumber(obj) {
        return typeof obj === 'number';
    }
    Katrid.isNumber = isNumber;
    function isObject(obj) {
        return typeof obj === 'object';
    }
    Katrid.isObject = isObject;
    function hash(obj) {
        if (!obj.$hashId) {
            obj.$hashId = ++Katrid.$hashId;
        }
        return obj.$hashId;
    }
    Katrid.hash = hash;
    function sum(iterable, member) {
        let r = 0;
        if (iterable)
            for (let row of iterable) {
                let v = row[member];
                if (!isNumber(v))
                    v = Number(v);
                if (isNaN(v))
                    v = 0;
                r += v;
            }
        return r;
    }
    Katrid.sum = sum;
    function avg(iterable, member) {
        if (iterable && iterable.length) {
            let r = 0;
            return sum(iterable, member) / iterable.length;
        }
    }
    Katrid.avg = avg;
    function guid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    Katrid.guid = guid;
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    function toCamelCase(s) {
        // remove all characters that should not be in a variable name
        // as well underscores an numbers from the beginning of the string
        s = s.replace(/([^a-zA-Z0-9_\- ])|^[_0-9]+/g, "").trim().toLowerCase();
        // uppercase letters preceeded by a hyphen or a space
        s = s.replace(/([ -]+)([a-zA-Z0-9])/g, function (a, b, c) {
            return c.toUpperCase();
        });
        // uppercase letters following numbers
        s = s.replace(/([0-9]+)([a-zA-Z])/g, function (a, b, c) {
            return b + c.toUpperCase();
        });
        return s;
    }
    Katrid.toCamelCase = toCamelCase;
    function dict(obj) {
        if (!obj)
            return;
        let res = {};
        for (let [k, v] of obj)
            res[k] = v;
        return res;
    }
    Katrid.dict = dict;
})(Katrid || (Katrid = {}));
/**
 * jQuery number plug-in 2.1.3
 * Copyright 2012, Digital Fusion
 * Licensed under the MIT license.
 * http://opensource.teamdf.com/license/
 *
 * A jQuery plugin which implements a permutation of phpjs.org's number_format to provide
 * simple number formatting, insertion, and as-you-type masking of a number.
 *
 * @author	Sam Sehnert
 * @docs	http://www.teamdf.com/web/jquery-number-format-redux/196/
 */
(function ($) {
    "use strict";
    /**
     * Method for selecting a range of characters in an input/textarea.
     *
     * @param int rangeStart			: Where we want the selection to start.
     * @param int rangeEnd				: Where we want the selection to end.
     *
     * @return void;
     */
    function setSelectionRange(rangeStart, rangeEnd) {
        // Check which way we need to define the text range.
        if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveStart('character', rangeStart);
            range.moveEnd('character', rangeEnd - rangeStart);
            range.select();
        }
        // Alternate setSelectionRange method for supporting browsers.
        else if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(rangeStart, rangeEnd);
        }
    }
    /**
     * Get the selection position for the given part.
     *
     * @param string part			: Options, 'Start' or 'End'. The selection position to get.
     *
     * @return int : The index position of the selection part.
     */
    function getSelection(part) {
        var pos = this.value.length;
        // Work out the selection part.
        part = (part.toLowerCase() == 'start' ? 'Start' : 'End');
        if (document.selection) {
            // The current selection
            var range = document.selection.createRange(), stored_range, selectionStart, selectionEnd;
            // We'll use this as a 'dummy'
            stored_range = range.duplicate();
            // Select all text
            //stored_range.moveToElementText( this );
            stored_range.expand('textedit');
            // Now move 'dummy' end point to end point of original range
            stored_range.setEndPoint('EndToEnd', range);
            // Now we can calculate start and end points
            selectionStart = stored_range.text.length - range.text.length;
            selectionEnd = selectionStart + range.text.length;
            return part == 'Start' ? selectionStart : selectionEnd;
        }
        else if (typeof (this['selection' + part]) != "undefined") {
            pos = this['selection' + part];
        }
        return pos;
    }
    /**
     * Substitutions for keydown keycodes.
     * Allows conversion from e.which to ascii characters.
     */
    var _keydown = {
        codes: {
            188: 44,
            110: 44,
            108: 44,
            109: 45,
            190: 46,
            191: 47,
            192: 96,
            220: 92,
            222: 39,
            221: 93,
            219: 91,
            173: 45,
            187: 61,
            186: 59,
            189: 45, //IE Key codes
        },
        shifts: {
            96: "~",
            49: "!",
            50: "@",
            51: "#",
            52: "$",
            53: "%",
            54: "^",
            55: "&",
            56: "*",
            57: "(",
            48: ")",
            45: "_",
            61: "+",
            91: "{",
            93: "}",
            92: "|",
            59: ":",
            39: "\"",
            44: "<",
            46: ">",
            47: "?"
        }
    };
    /**
     * jQuery number formatter plugin. This will allow you to format numbers on an element.
     *
     * @params proxied for format_number method.
     *
     * @return : The jQuery collection the method was called with.
     */
    $.fn.number = function (number, decimals, dec_point, thousands_sep) {
        // Enter the default thousands separator, and the decimal placeholder.
        thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
        dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
        decimals = (typeof decimals === 'undefined') ? 0 : decimals;
        // Work out the unicode character for the decimal placeholder.
        var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4)), regex_dec_num = new RegExp('[^-' + u_dec + '0-9]', 'g'), regex_dec = new RegExp(u_dec, 'g');
        // If we've specified to take the number from the target element,
        // we loop over the collection, and get the number.
        if (number === true) {
            // If this element is a number, then we add a keyup
            if (this.is('input:text')) {
                // Return the jquery collection.
                return this.on({
                    /**
                     * Handles keyup events, re-formatting numbers.
                     *
                     * @param object e			: the keyup event object.s
                     *
                     * @return void;
                     */
                    'keydown.format': function (e) {
                        // Define variables used in the code below.
                        var $this = $(this), data = $this.data('numFormat'), code = (e.keyCode ? e.keyCode : e.which), chara = '', //unescape(e.originalEvent.keyIdentifier.replace('U+','%u')),
                        start = getSelection.apply(this, ['start']), end = getSelection.apply(this, ['end']), val = '', setPos = false;
                        if (e.key === '-') {
                            if ($this.val() === 0)
                                data.negative = true;
                            else {
                                data.negative = false;
                                if (this.value.includes('-'))
                                    this.value = this.value.substr(1, this.value.length - 1);
                                else
                                    this.value = '-' + this.value;
                            }
                            $this.val(this.value);
                            e.preventDefault();
                            return;
                        }
                        // Webkit (Chrome & Safari) on windows screws up the keyIdentifier detection
                        // for numpad characters. I've disabled this for now, because while keyCode munging
                        // below is hackish and ugly, it actually works cross browser & platform.
                        //	    				if( typeof e.originalEvent.keyIdentifier !== 'undefined' )
                        //	    				{
                        //	    					chara = unescape(e.originalEvent.keyIdentifier.replace('U+','%u'));
                        //	    				}
                        //	    				else
                        //	    				{
                        if (_keydown.codes.hasOwnProperty(code)) {
                            code = _keydown.codes[code];
                        }
                        if (!e.shiftKey && (code >= 65 && code <= 90)) {
                            code += 32;
                        }
                        else if (!e.shiftKey && (code >= 69 && code <= 105)) {
                            code -= 48;
                        }
                        else if (e.shiftKey && _keydown.shifts.hasOwnProperty(code)) {
                            //get shifted keyCode value
                            chara = _keydown.shifts[code];
                        }
                        if (chara == '')
                            chara = String.fromCharCode(code);
                        //	    				}
                        // Stop executing if the user didn't type a number key, a decimal character, or backspace.
                        if (code !== 8 && chara != dec_point && !chara.match(/[0-9]/)) {
                            // We need the original keycode now...
                            var key = (e.keyCode ? e.keyCode : e.which);
                            if ( // Allow control keys to go through... (delete, etc)
                            key == 46 || key == 8 || key == 9 || key == 27 || key == 13 ||
                                // Allow: Ctrl+A, Ctrl+R
                                ((key == 65 || key == 82) && (e.ctrlKey || e.metaKey) === true) ||
                                // Allow: Ctrl+V, Ctrl+C
                                ((key == 86 || key == 67) && (e.ctrlKey || e.metaKey) === true) ||
                                // Allow: home, end, left, right
                                ((key >= 35 && key <= 39))) {
                                return;
                            }
                            // But prevent all other keys.
                            e.preventDefault();
                            return false;
                        }
                        // The whole lot has been selected, or if the field is empty...
                        if (start == 0 && end == this.value.length || $this.val() == 0) {
                            if (code === 8) {
                                // Blank out the field, but only if the data object has already been instanciated.
                                start = end = 1;
                                this.value = '';
                                // Reset the cursor position.
                                data.init = (decimals > 0 ? -1 : 0);
                                data.c = (decimals > 0 ? -(decimals + 1) : 0);
                                setSelectionRange.apply(this, [0, 0]);
                            }
                            else if (chara === dec_point) {
                                start = end = 1;
                                this.value = '0' + dec_point + (new Array(decimals + 1).join('0'));
                                // Reset the cursor position.
                                data.init = (decimals > 0 ? 1 : 0);
                                data.c = (decimals > 0 ? -(decimals + 1) : 0);
                            }
                            else if (this.value.length === 0) {
                                // Reset the cursor position.
                                data.init = (decimals > 0 ? -1 : 0);
                                data.c = (decimals > 0 ? -(decimals) : 0);
                            }
                        }
                        // Otherwise, we need to reset the caret position
                        // based on the users selection.
                        else {
                            data.c = end - this.value.length;
                        }
                        // If the start position is before the decimal point,
                        // and the user has typed a decimal point, we need to move the caret
                        // past the decimal place.
                        if (decimals > 0 && chara == dec_point && start == this.value.length - decimals - 1) {
                            data.c++;
                            data.init = Math.max(0, data.init);
                            e.preventDefault();
                            // Set the selection position.
                            setPos = this.value.length + data.c;
                        }
                        // If the user is just typing the decimal place,
                        // we simply ignore it.
                        else if (chara == dec_point) {
                            data.init = Math.max(0, data.init);
                            e.preventDefault();
                        }
                        // If hitting the delete key, and the cursor is behind a decimal place,
                        // we simply move the cursor to the other side of the decimal place.
                        else if (decimals > 0 && code == 8 && start == this.value.length - decimals) {
                            e.preventDefault();
                            data.c--;
                            // Set the selection position.
                            setPos = this.value.length + data.c;
                        }
                        // If hitting the delete key, and the cursor is to the right of the decimal
                        // (but not directly to the right) we replace the character preceeding the
                        // caret with a 0.
                        else if (decimals > 0 && code == 8 && start > this.value.length - decimals) {
                            if (this.value === '')
                                return;
                            // If the character preceeding is not already a 0,
                            // replace it with one.
                            if (this.value.slice(start - 1, start) != '0') {
                                val = this.value.slice(0, start - 1) + '0' + this.value.slice(start);
                                $this.val(val.replace(regex_dec_num, '').replace(regex_dec, dec_point));
                            }
                            e.preventDefault();
                            data.c--;
                            // Set the selection position.
                            setPos = this.value.length + data.c;
                        }
                        // If the delete key was pressed, and the character immediately
                        // before the caret is a thousands_separator character, simply
                        // step over it.
                        else if (code == 8 && this.value.slice(start - 1, start) == thousands_sep) {
                            e.preventDefault();
                            data.c--;
                            // Set the selection position.
                            setPos = this.value.length + data.c;
                        }
                        // If the caret is to the right of the decimal place, and the user is entering a
                        // number, remove the following character before putting in the new one.
                        else if (decimals > 0 &&
                            start == end &&
                            this.value.length > decimals + 1 &&
                            start > this.value.length - decimals - 1 && isFinite(+chara) &&
                            !e.metaKey && !e.ctrlKey && !e.altKey && chara.length === 1) {
                            // If the character preceeding is not already a 0,
                            // replace it with one.
                            if (end === this.value.length) {
                                val = this.value.slice(0, start - 1);
                            }
                            else {
                                val = this.value.slice(0, start) + this.value.slice(start + 1);
                            }
                            // Reset the position.
                            this.value = val;
                            setPos = start;
                        }
                        if (setPos === false && code === 44 && chara === dec_point)
                            setPos = this.value.indexOf(dec_point) + 1;
                        // If we need to re-position the characters.
                        if (setPos !== false) {
                            setSelectionRange.apply(this, [setPos, setPos]);
                        }
                        // Store the data on the element.
                        $this.data('numFormat', data);
                    },
                    /**
                     * Handles keyup events, re-formatting numbers.
                     *
                     * @param object e			: the keyup event object.s
                     *
                     * @return void;
                     */
                    'keyup.format': function (e) {
                        // Store these variables for use below.
                        var $this = $(this), data = $this.data('numFormat'), code = (e.keyCode ? e.keyCode : e.which), start = getSelection.apply(this, ['start']), setPos;
                        // Stop executing if the user didn't type a number key, a decimal, or a comma.
                        if (this.value === '' || (code < 48 || code > 57) && (code < 96 || code > 105) && code !== 8)
                            return;
                        // Re-format the textarea.
                        $this.val($this.val());
                        if (decimals > 0) {
                            // If we haven't marked this item as 'initialised'
                            // then do so now. It means we should place the caret just
                            // before the decimal. This will never be un-initialised before
                            // the decimal character itself is entered.
                            if (data.init < 1) {
                                start = this.value.length - decimals - (data.init < 0 ? 1 : 0);
                                data.c = start - this.value.length;
                                data.init = 1;
                                $this.data('numFormat', data);
                            }
                            // Increase the cursor position if the caret is to the right
                            // of the decimal place, and the character pressed isn't the delete key.
                            else if (start > this.value.length - decimals && code != 8) {
                                data.c++;
                                // Store the data, now that it's changed.
                                $this.data('numFormat', data);
                            }
                        }
                        //console.log( 'Setting pos: ', start, decimals, this.value.length + data.c, this.value.length, data.c );
                        // Set the selection position.
                        setPos = this.value.length + data.c;
                        if (((this.value.length - setPos) === data.decimals) && (String.fromCharCode(code) !== data.dec_point)) {
                            setPos -= 1;
                            console.log('set pos', data.dec_point, code, String.fromCharCode(code));
                        }
                        setSelectionRange.apply(this, [setPos, setPos]);
                    },
                    /**
                     * Reformat when pasting into the field.
                     *
                     * @param object e 		: jQuery event object.
                     *
                     * @return false : prevent default action.
                     */
                    'paste.format': function (e) {
                        // Defint $this. It's used twice!.
                        var $this = $(this), original = e.originalEvent, val = null;
                        // Get the text content stream.
                        if (window.clipboardData && window.clipboardData.getData) { // IE
                            val = window.clipboardData.getData('Text');
                        }
                        else if (original.clipboardData && original.clipboardData.getData) {
                            val = original.clipboardData.getData('text/plain');
                        }
                        // Do the reformat operation.
                        $this.val(val);
                        // Stop the actual content from being pasted.
                        e.preventDefault();
                        return false;
                    }
                })
                    // Loop each element (which isn't blank) and do the format.
                    .each(function () {
                    var $this = $(this).data('numFormat', {
                        c: -(decimals + 1),
                        decimals: decimals,
                        thousands_sep: thousands_sep,
                        dec_point: dec_point,
                        regex_dec_num: regex_dec_num,
                        regex_dec: regex_dec,
                        init: false
                    });
                    // Return if the element is empty.
                    if (this.value === '')
                        return;
                    // Otherwise... format!!
                    $this.val($this.val());
                });
            }
            else {
                // return the collection.
                return this.each(function () {
                    var $this = $(this), num = +$this.text().replace(regex_dec_num, '').replace(regex_dec, '.');
                    $this.number(!isFinite(num) ? 0 : +num, decimals, dec_point, thousands_sep);
                });
            }
        }
        // Add this number to the element as text.
        return this.text($.number.apply(window, arguments));
    };
    //
    // Create .val() hooks to get and set formatted numbers in inputs.
    //
    // We check if any hooks already exist, and cache
    // them in case we need to re-use them later on.
    var origHookGet = null, origHookSet = null;
    // Check if a text valHook already exists.
    if ($.isPlainObject($.valHooks.text)) {
        // Preserve the original valhook function
        // we'll call this for values we're not
        // explicitly handling.
        if ($.isFunction($.valHooks.text.get))
            origHookGet = $.valHooks.text.get;
        if ($.isFunction($.valHooks.text.set))
            origHookSet = $.valHooks.text.set;
    }
    else {
        // Define an object for the new valhook.
        $.valHooks.text = {};
    }
    /**
     * Define the valHook to return normalised field data against an input
     * which has been tagged by the number formatter.
     *
     * @param object el			: The raw DOM element that we're getting the value from.
     *
     * @return mixed : Returns the value that was written to the element as a
     *				   javascript number, or undefined to let jQuery handle it normally.
     */
    $.valHooks.text.get = function (el) {
        // Get the element, and its data.
        var $this = $(el), num, data = $this.data('numFormat');
        // Does this element have our data field?
        if (!data) {
            // Check if the valhook function already existed
            if ($.isFunction(origHookGet)) {
                // There was, so go ahead and call it
                return origHookGet(el);
            }
            else {
                // No previous function, return undefined to have jQuery
                // take care of retrieving the value
                return undefined;
            }
        }
        else {
            // Remove formatting, and return as number.
            if (el.value === '')
                return '';
            // Convert to a number.
            num = +(el.value
                .replace(data.regex_dec_num, '')
                .replace(data.regex_dec, '.'));
            // If we've got a finite number, return it.
            // Otherwise, simply return 0.
            // Return as a string... thats what we're
            // used to with .val()
            return '' + (isFinite(num) ? num : 0);
        }
    };
    /**
     * A valhook which formats a number when run against an input
     * which has been tagged by the number formatter.
     *
     * @param object el		: The raw DOM element (input element).
     * @param float			: The number to set into the value field.
     *
     * @return mixed : Returns the value that was written to the element,
     *				   or undefined to let jQuery handle it normally.
     */
    $.valHooks.text.set = function (el, val) {
        // Get the element, and its data.
        var $this = $(el), data = $this.data('numFormat');
        // Does this element have our data field?
        if (!data) {
            // Check if the valhook function already exists
            if ($.isFunction(origHookSet)) {
                // There was, so go ahead and call it
                return origHookSet(el, val);
            }
            else {
                // No previous function, return undefined to have jQuery
                // take care of retrieving the value
                return undefined;
            }
        }
        else {
            // Otherwise, don't worry about other valhooks, just run ours.
            return el.value = $.number(val, data.decimals, data.dec_point, data.thousands_sep);
        }
    };
    /**
     * The (modified) excellent number formatting method from PHPJS.org.
     * http://phpjs.org/functions/number_format/
     *
     * @modified by Sam Sehnert (teamdf.com)
     *	- don't redefine dec_point, thousands_sep... just overwrite with defaults.
     *	- don't redefine decimals, just overwrite as numeric.
     *	- Generate regex for normalizing pre-formatted numbers.
     *
     * @param float number			: The number you wish to format, or TRUE to use the text contents
     *								  of the element as the number. Please note that this won't work for
     *								  elements which have child nodes with text content.
     * @param int decimals			: The number of decimal places that should be displayed. Defaults to 0.
     * @param string dec_point		: The character to use as a decimal point. Defaults to '.'.
     * @param string thousands_sep	: The character to use as a thousands separator. Defaults to ','.
     *
     * @return string : The formatted number as a string.
     */
    $.number = function (number, decimals, dec_point, thousands_sep) {
        // Set the default values here, instead so we can use them in the replace below.
        thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
        dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
        decimals = !isFinite(+decimals) ? 0 : Math.abs(decimals);
        // Work out the unicode representation for the decimal place and thousand sep.
        var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4));
        var u_sep = ('\\u' + ('0000' + (thousands_sep.charCodeAt(0).toString(16))).slice(-4));
        // Fix the number, so that it's an actual number.
        number = (number + '')
            .replace('\.', dec_point) // because the number if passed in as a float (having . as decimal point per definition) we need to replace this with the passed in decimal point character
            .replace(new RegExp(u_sep, 'g'), '')
            .replace(new RegExp(u_dec, 'g'), '.')
            .replace(new RegExp('[^0-9+\-Ee.]', 'g'), '');
        var n = !isFinite(+number) ? 0 : +number, s = '', toFixedFix = function (n, decimals) {
            var k = Math.pow(10, decimals);
            return '' + Math.round(n * k) / k;
        };
        // Fix for IE parseFloat(0.55).toFixed(0) = 0;
        s = (decimals ? toFixedFix(n, decimals) : '' + Math.round(n)).split('.');
        if (s[0].length > 3) {
            s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousands_sep);
        }
        if ((s[1] || '').length < decimals) {
            s[1] = s[1] || '';
            s[1] += new Array(decimals - s[1].length + 1).join('0');
        }
        return s.join(dec_point);
    };
})(jQuery);
(function () {
    class Comments {
        constructor(scope) {
            this.scope = scope;
            this.model = this.scope.$parent.model;
            this.scope.$parent.$watch('recordId', key => {
                this.items = null;
                this.scope.loading = Katrid.i18n.gettext('Loading...');
                clearTimeout(this._pendingOperation);
                this._pendingOperation = setTimeout(() => {
                    this._pendingOperation = null;
                    this.masterChanged(key);
                    return this.scope.$apply(() => {
                        return this.scope.loading = null;
                    });
                }, 1000);
            });
            this.items = [];
        }
        async masterChanged(key) {
            if (key) {
                const svc = new Katrid.Services.Model('mail.message');
                if (this.scope.$parent.record)
                    return svc.post('get_messages', { args: [this.scope.$parent.model.name, this.scope.$parent.recordId] })
                        .then(res => {
                        this.items = res;
                        this.scope.$apply();
                    });
            }
        }
        async _sendMesage(msg, attachments) {
            let svc = new Katrid.Services.Model('mail.message');
            if (attachments)
                attachments = attachments.map(obj => obj.id);
            let msgs = await svc.post('post_message', {
                args: [this.model.name, this.scope.$parent.recordId],
                kwargs: { content: msg, content_subtype: 'html', format: true, attachments: attachments }
            });
            this.scope.message = '';
            this.items.unshift(msgs);
            this.scope.$apply();
            this.scope.files = null;
            this.scope.hideEditor();
        }
        postMessage(msg) {
            if (this.scope.files.length) {
                let files = [];
                for (let f of this.scope.files)
                    files.push(f.file);
                var me = this;
                Katrid.Services.Attachments.upload({ files: files }, this.scope.$parent)
                    .done((res) => {
                    me._sendMesage(msg, res);
                });
            }
            else
                this._sendMesage(msg);
        }
    }
    // Katrid.UI.uiKatrid.directive('comments', () =>
    //   ({
    //     restrict: 'E',
    //     scope: {},
    //     replace: true,
    //     template: '<div class="content"><div class="comments"><mail-comments/></div></div>',
    //     link(scope, element, attrs) {
    //       if (element.closest('.modal-dialog').length)
    //         element.remove();
    //       else
    //         $(element).closest('.form-view[ng-form=form]').children('.content:first').append(element);
    //     }
    //   })
    // );
    // Katrid.UI.uiKatrid.directive('mailComments', () =>
    //   ({
    //     restrict: 'E',
    //     controller: ['$scope', ($scope) => {
    //       $scope.comments = new Comments($scope);
    //       $scope.files = [];
    //
    //       $scope.showEditor = () => {
    //         $($scope.el).find('#mail-editor').show();
    //         $($scope.el).find('#mail-msgEditor').focus();
    //       };
    //
    //       $scope.hideEditor = () => {
    //         $($scope.el).find('#mail-editor').hide();
    //       };
    //
    //       $scope.attachFile = (file) => {
    //         for (let f of file.files)
    //           $scope.files.push({
    //             name: f.name,
    //             type: f.type,
    //             file: f
    //           });
    //         $scope.$apply();
    //       };
    //
    //       $scope.deleteFile = (idx) => {
    //         $scope.files.splice(idx, 1);
    //       }
    //     }],
    //     replace: true,
    //     link(scope, element, attrs) {
    //       scope.el = element;
    //     },
    //
    //     template() {
    //       return `
    // <div class="container">
    //         <h3>${Katrid.i18n.gettext('Comments')}</h3>
    //         <div class="form-group">
    //         <button class="btn btn-outline-secondary" ng-click="showEditor();">${Katrid.i18n.gettext('New message')}</button>
    //         <button class="btn btn-outline-secondary">${Katrid.i18n.gettext('Log an internal note')}</button>
    //         </div>
    //         <div id="mail-editor" style="display: none;">
    //           <div class="form-group">
    //             <textarea id="mail-msgEditor" class="form-control" ng-model="message"></textarea>
    //           </div>
    //           <div class="form-group">
    //             <button class="btn btn-default" type="button" onclick="$(this).next().click()"><i class="fa fa-paperclip"></i></button>
    //             <input class="input-file-hidden" type="file" multiple onchange="angular.element(this).scope().attachFile(this)">
    //           </div>
    //           <div class="form-group" ng-show="files.length">
    //             <ul class="list-inline attachments-area">
    //               <li ng-repeat="file in files" ng-click="deleteFile($index)" title="${Katrid.i18n.gettext('Delete this attachment')}">{{ file.name }}</li>
    //             </ul>
    //           </div>
    //           <div class="from-group">
    //             <button class="btn btn-primary" ng-click="comments.postMessage(message)">${Katrid.i18n.gettext('Send')}</button>
    //           </div>
    //         </div>
    //
    //         <hr>
    //
    //         <div ng-show="loading">{{ loading }}</div>
    //         <div class="comment media col-sm-12" ng-repeat="comment in comments.items">
    //           <div class="media-left">
    //             <img src="/static/admin/assets/img/avatar.png" class="avatar rounded">
    //           </div>
    //           <div class="media-body">
    //             <strong>{{ ::comment.author_name }}</strong> - <span class="timestamp text-muted" title="$\{ ::comment.date_time|moment:'LLLL'}"> {{::comment.date_time|moment}}</span>
    //             <div class="clearfix"></div>
    //             <div class="form-group">
    //               {{::comment.content}}
    //             </div>
    //             <div class="form-group" ng-if="comment.attachments">
    //               <ul class="list-inline">
    //                 <li ng-repeat="file in comment.attachments">
    //                   {{file.mimetype}}
    //                   <div class="comment-preview-image" ng-if="file.mimetype.startsWith('image')" style="width: 16%;height:100px;background-image:url('/web/content/$\{ ::file.id }')"></div>
    //                   <a href="/web/content/$\{ ::file.id }/?download">{{ ::file.name }}</a>
    //                 </li>
    //               </ul>
    //             </div>
    //           </div>
    //         </div>
    //   </div>`;
    //     }
    //   })
    // );
})();
//# sourceMappingURL=katrid.js.map