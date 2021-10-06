"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Katrid;
(function (Katrid) {
    function createView(config) {
        config.components = Katrid.componentsRegistry;
        config.directives = Katrid.directivesRegistry;
        let app = Vue.createApp(config);
        app.config.globalProperties.$filters = Katrid.filtersRegistry;
        return app;
    }
    Katrid.createView = createView;
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
    function element(html) {
        let div = document.createElement('div');
        div.innerHTML = html;
        return div.children[0];
    }
    Katrid.element = element;
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        Actions.registry = {};
        class Breadcrumb {
            constructor(action, url, text, isLeaf = false, isRoot = false) {
                this.action = action;
                this.url = url;
                this.text = text;
                this.isLeaf = isLeaf;
                this.isRoot = isRoot;
            }
            render(index) {
                let li = document.createElement('li');
                li.classList.add('breadcrumb-item');
                if (!this.isLeaf && !this.isRoot) {
                    li.innerHTML = `<a href="${this.url}" v-on:click.prevent="backTo(${index})">${this.text}</a>`;
                }
                else if (this.isLeaf)
                    li.innerText = this.text;
                else
                    li.innerHTML = `<a href="${this.url}" v-on:click.prevent="backTo(${index})"><i class="fa fa-fw fa-chevron-left"></i> ${this.text}</a>`;
                return li;
            }
        }
        Actions.Breadcrumb = Breadcrumb;
        class Action {
            constructor(config) {
                this.state = null;
                this.info = config.info;
                this.location = config.location;
                this.app = Katrid.webApp;
                this.app.actionManager.addAction(this);
                if (config.container)
                    this.container = config.container;
                else
                    this.container = Katrid.app.element;
            }
            getContext() {
                return this._context;
            }
            getBreadcrumbs() {
                return [];
            }
            $destroy() {
                this.app.actionManager.remove(this);
                if (this.element)
                    this.element.remove();
                else
                    this.container.innerHTML = '';
            }
            get id() {
                return this.info.id;
            }
            get context() {
                if (_.isString(this.info.context))
                    this._context = JSON.parse(this.info.context);
                else
                    this._context = {};
                let searchParams = window.location.href.split('#', 2)[1];
                if (searchParams) {
                    const urlParams = new URLSearchParams(searchParams);
                    for (let [k, v] of urlParams)
                        if (k.startsWith('default_'))
                            this._context[k] = v;
                        else if (k === 'filter')
                            this._context[k] = v;
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
                Object.assign(ctx, this.getContext());
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
            backTo(index, viewType) {
                this.app.actionManager.back(index, viewType);
            }
            execute() {
                $(this.app).trigger('action.execute', this);
            }
            getCurrentTitle() {
                return this.info.display_name;
            }
            search() {
                if (!this.isDialog) {
                    return this.location.search.apply(null, arguments);
                }
            }
            onHashChange(params) {
                $(this.app).trigger('action', [this]);
            }
            $attach() {
            }
            refreshBreadcrumb() {
            }
            createBreadcrumbItem(item, index) {
                let li = document.createElement('li');
                li.classList.add('breadcrumb-item');
                if (item.isLeaf)
                    li.innerText = item.text;
                else {
                    let a = document.createElement('a');
                    if (index === 0)
                        a.innerHTML = '<i class="fa fa-chevron-left"></i> ';
                    let txt = document.createElement('span');
                    txt.innerText = item.text;
                    a.append(txt);
                    a.setAttribute('href', '#');
                    a.addEventListener('click', (evt) => {
                        evt.preventDefault();
                        this.backTo(item);
                    });
                    li.append(a);
                }
                return li;
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
        class ActionManager {
            constructor() {
                this.$cachedActions = {};
                this.actions = [];
                this.currentAction = null;
                this.mainAction = null;
            }
            addAction(action) {
                if (!this.mainAction)
                    this.mainAction = action;
                this.actions.push(action);
                this.currentAction = action;
            }
            back(index, params) {
                let action = this.actions[index];
                if (action)
                    this.action = action;
            }
            remove(action) {
                this.actions.splice(this.actions.indexOf(action), this.length);
                if (this.length === 0)
                    this.mainAction = null;
            }
            get length() {
                return this.actions.length;
            }
            get action() {
                return this.currentAction;
            }
            get context() {
                if (this.currentAction)
                    return this.currentAction.context;
                return {
                    user_id: Katrid.app.userInfo.id,
                };
            }
            set action(action) {
                let i = this.actions.indexOf(action);
                if (i > -1) {
                    i++;
                    while (this.actions.length > i)
                        this.actions.pop().$destroy();
                }
                this.currentAction = action;
            }
            clear() {
                Katrid.app.element.innerHTML = '';
                for (let action of this.actions) {
                    action.state = { clear: true };
                    action.$destroy();
                }
                this.actions = [];
                this.actions.length = 0;
                this.mainAction = null;
                this.currentAction = null;
            }
            get path() {
                return this.action.path;
            }
            doAction(action) {
            }
            async onHashChange(params, reset) {
                let actionId = params.action;
                let oldAction, action;
                action = oldAction = this.currentAction;
                let oldActionId;
                if (oldAction)
                    oldActionId = oldAction.info.id;
                if (reset) {
                    this.clear();
                    if (this.currentAction)
                        this.currentAction.$destroy();
                    this.currentAction = null;
                }
                if (actionId in this.$cachedActions) {
                    let actionInfo = this.$cachedActions[actionId];
                    action = new Katrid.Actions.registry[actionInfo.action_type]({ info: actionInfo, location: params });
                }
                else if (!actionId && params.model && (!action || (action.params && (action.params.model !== params.model)))) {
                    let svc = new Katrid.Services.Model(params.model);
                    let actionInfo = await svc.rpc('admin_get_formview_action', [params.id]);
                    action = new Katrid.Actions.registry[actionInfo.action_type]({ info: actionInfo, location: params });
                }
                else if (!(this.currentAction && (this.currentAction.info.id == actionId))) {
                    let actionInfo = await Katrid.Services.Actions.load(actionId);
                    console.log(actionInfo.action_type);
                    action = new Katrid.Actions.registry[actionInfo.action_type]({ info: actionInfo, location: params });
                }
                await action.execute();
                await action.onHashChange(params);
                return action;
            }
        }
        Actions.ActionManager = ActionManager;
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
        class ClientAction extends Katrid.Actions.Action {
            static register(tag, obj) {
                this.registry[tag] = obj;
            }
            static executeTag(parent, act) {
                let action = this.registry[act.tag];
                if (action.prototype instanceof Katrid.Forms.Views.ActionView) {
                    action = new action(parent.scope);
                    action.renderTo(parent);
                }
                else
                    console.log('is a function');
            }
            static tagButtonClick(btn) {
                let action = {
                    type: 'ir.action.client',
                    tag: btn.attr('name'),
                    target: btn.attr('target') || 'new',
                };
                action = new ClientAction({
                    action, app: Katrid.webApp.actionManager.action.scope, location: Katrid.webApp.actionManager.action.location
                });
                action.execute();
            }
            tag_refresh() {
                this.dataSource.refresh();
            }
            get templateUrl() {
                console.log(this.tag);
                return this.tag.templateUrl;
            }
            async execute() {
                let tag = ClientAction.registry[this.info.tag];
                this.tag = tag;
                if (tag.prototype instanceof Katrid.Forms.Views.ClientView) {
                    this.tag = new tag(this);
                    let el = await this.tag.render();
                    if (this.info.target === 'new') {
                        el = el.modal();
                    }
                    else {
                        $('#action-view').empty().append(el);
                    }
                }
                else if (_.isString(tag))
                    this.constructor.registry[tag].apply(this);
            }
            async routeUpdate(location) {
            }
            get template() {
                return this.tag.template;
            }
        }
        ClientAction.actionType = 'ir.action.client';
        ClientAction.registry = {};
        Actions.ClientAction = ClientAction;
        Actions.registry[ClientAction.actionType] = ClientAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Core;
    (function (Core) {
        _.emptyText = '--';
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
        Core.LocalSettings = LocalSettings;
        function setContent(content, scope) {
        }
        Core.setContent = setContent;
    })(Core = Katrid.Core || (Katrid.Core = {}));
})(Katrid || (Katrid = {}));
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
})(Katrid || (Katrid = {}));
(function (Katrid) {
    Katrid.customElementsRegistry = {};
    function define(name, constructor, options) {
        Katrid.customElementsRegistry[name] = { constructor, options };
    }
    Katrid.define = define;
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class Homepage extends Actions.Action {
            get content() {
                return this.info.content;
            }
            onHashChange(params) {
                super.onHashChange(params);
                let home = document.createElement('homepage-view');
                console.log('action info', this.info.id);
                home.actionId = this.info.id;
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
                console.log('load', data);
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
                let svc = new Katrid.Services.Model('ui.action.report');
                let res = await svc.post('export_report', { args: [action.id], kwargs: { format, params } });
                if (res.open)
                    return window.open(res.open);
            }
            get name() {
                return this.info.name;
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
                    let svc = new Katrid.Services.Model('ui.action.report');
                    let res = await svc.post('load_user_report', { kwargs: { user_report: this.userReport.id } });
                    this.userReport.params = res.result;
                }
                else {
                }
                location.hash = '#/app/?' + $.param(params);
                this.renderParams();
            }
            renderParams() {
                let templ = Katrid.element(Katrid.Reports.renderDialog(this));
                this.vm = this.createVm(templ);
                $(Katrid.webApp.element).empty().append(templ);
            }
            createVm(el) {
                let self = this;
                this.report = new Katrid.Reports.Report(self);
                this.report.loadFromXml(self.info.content);
                this.report.render(el);
                this.report.loadParams();
                let vm = Katrid.createView({
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
            async onHashChange(params) {
                location.hash = '#/app/?' + $.param(params);
                let svc = new Katrid.Services.Model('ui.action.view');
                let res = await svc.post('get_view', { args: [this.info.view.id] });
                let content = res.content;
                let viewType = res.type;
                if (content.startsWith('{')) {
                    if (viewType === 'dashboard') {
                        let dashboard = document.createElement('dashboard-view');
                        Katrid.app.element.innerHTML = '';
                        Katrid.app.element.append(dashboard);
                        dashboard.load(JSON.parse(content));
                    }
                }
                else {
                    $(Katrid.app.element).html(content);
                }
            }
        }
        ViewAction.actionType = 'ui.action.view';
        Actions.ViewAction = ViewAction;
        Actions.registry[ViewAction.actionType] = ViewAction;
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
        class WindowAction extends Katrid.Actions.Action {
            constructor(config) {
                super(config);
                this._loadDataCallbacks = [];
                this._cachedViews = {};
                this.pendingOperation = false;
                this.model = config.model;
                this.viewMode = config.info.view_mode;
                this.viewModes = this.viewMode.split(',');
                if (!this.model && config.info.model)
                    this.model = new Katrid.Services.Model(config.info.model);
                if (config.views)
                    this.views = config.views;
            }
            back(index) {
                if (this.viewType === 'form')
                    this.showView(this.lastViewType || this.searchModes[0]);
            }
            async onHashChange(params) {
                let invalidate = false;
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
                let allowedParams = ALLOWED_PARAMS[params.view_type || this.params.view_type];
                if (allowedParams === undefined)
                    allowedParams = ALLOWED_PARAMS['default'];
                Object.assign(this.params, params);
                let validParams = [];
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
                if (invalidate) {
                    let oldParams = this.params;
                    this.params = {};
                    for (let k of validParams) {
                        let param = oldParams[k];
                        if (param !== undefined)
                            this.params[k] = param;
                    }
                    if (!this.params.action)
                        delete this.params.action;
                    let url = this.makeUrl(this.params.view_type);
                    history.replaceState(null, null, url);
                }
                let viewType = this.params.view_type;
                if (viewType !== this.viewType) {
                    await this.showView(viewType);
                }
            }
            getCaption() {
                return this.view.vm.record?.record_name;
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
                let sel = this.view.getSelection();
                if (sel && sel.length) {
                    ctx.active_id = sel[0];
                    ctx.active_ids = sel;
                }
                return ctx;
            }
            getCurrentTitle() {
                if (this.viewType === 'form') {
                    return this.scope.record.display_name;
                }
                return super.getCurrentTitle();
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
            async showView(viewType) {
                this._breadcrumbs = null;
                if (viewType !== this.viewType) {
                    this.state = { viewType };
                    history.replaceState(this.state, '', this.makeUrl(viewType));
                }
                if (viewType !== 'form') {
                    this.lastViewType = viewType;
                }
                if (this.element)
                    this.element.remove();
                this.viewType = viewType;
                this.viewInfo = this.views[this.viewType];
                if (this.viewType in this._cachedViews) {
                    this.view = this._cachedViews[this.viewType];
                    this.element = this.view.actionView;
                    this.container.append(this.view.actionView);
                }
                else {
                    this.view = new Katrid.Forms.Views.registry[this.viewType]({ action: this, viewInfo: this.viewInfo });
                    if (viewType === 'form') {
                        await this.viewInfo.loadPendingViews();
                    }
                    this.view.renderTo(this.container);
                    this._cachedViews[this.view.viewType] = this.view;
                    this.element = this.view.actionView;
                }
                this.view.ready();
                if (this.view instanceof Katrid.Forms.Views.RecordCollectionView) {
                    this.searchResultView = this.view;
                    this.lastUrl = location.hash;
                }
                return this.view;
            }
            createNew() {
                this.switchView('form', { id: null });
            }
            async deleteSelection(backToSearch) {
                let sel = this.getSelection();
                if (!sel)
                    return false;
                if (((sel.length === 1) && confirm(Katrid.i18n.gettext('Confirm delete record?'))) ||
                    ((sel.length > 1) && confirm(Katrid.i18n.gettext('Confirm delete records?')))) {
                    await this.dataSource.delete(sel);
                    if (backToSearch) {
                        this.dataSource.refresh();
                    }
                    else
                        this.dataSource.next();
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
                if (this.scope.recordId) {
                    let svc = new Katrid.Services.Model('ui.copy.to');
                    let res = await svc.rpc('copy_to', [configId, this.scope.recordId]);
                    let model = new Katrid.Services.Model(res.model);
                    let views = await model.getViewInfo({ view_type: 'form' });
                    let scope = this.scope.$new(true);
                    let wnd = new Katrid.Forms.Dialogs.Window({ scope, view: views, model, defaultValues: res.value });
                }
            }
            makeUrl(viewType) {
                if (!viewType)
                    viewType = this.viewModes[0];
                let search = {};
                Object.assign(search, this.params);
                Object.assign(search, {
                    model: this.model.name,
                    view_type: viewType,
                    menu_id: Katrid.webApp.currentMenu.id,
                });
                if (this.info?.id)
                    search.action = this.info.id;
                if ((viewType === 'form') && this.record)
                    search.id = this.record.id;
                let url = new URLSearchParams(search);
                return '#/app/?' + url.toString();
            }
            get searchModes() {
                return this.viewModes.filter(v => v !== 'form');
            }
            get breadcrumbs() {
                if (this._breadcrumbs)
                    return this._breadcrumbs;
                this._breadcrumbs = [];
                for (let action of Katrid.webApp.actionManager.actions)
                    this._breadcrumbs = this._breadcrumbs.concat(action.getBreadcrumbs());
                return this._breadcrumbs;
            }
            get rootViewType() {
                return this.lastViewType || this.searchModes[0];
            }
            getBreadcrumbs() {
                let res = [];
                let idx = this.$index;
                let actions = Katrid.webApp.actionManager.actions;
                let isLeaf = (actions.length - 1) === idx;
                if (this.searchModes.length) {
                    if (this.viewType === 'form')
                        res.push(new Actions.Breadcrumb(this, this.makeUrl(this.rootViewType), this.info.name, false, true));
                    else
                        res.push(new Actions.Breadcrumb(this, this.makeUrl(this.viewType), this.info.name, true));
                }
                if (this.viewType === 'form')
                    res.push(new Actions.Breadcrumb(this, '', '{{record.record_name}}', isLeaf));
                return res;
            }
            get $index() {
                return Katrid.webApp.actionManager.actions.indexOf(this);
            }
            $detach() {
            }
            $attach() {
                this.element.append(this.container);
            }
            async execute() {
                super.execute();
                this.container.innerHTML = '';
                if (!this.views) {
                    let res = await this.model.loadViews({
                        views: this.info.views,
                        action: this.info.id,
                        toolbar: true
                    });
                    this.fields = res.fields;
                    this.fieldList = res.fieldList;
                    this.views = res.views;
                    if (res.views.form) {
                    }
                }
                let firstTime = false;
            }
            changeUrl() {
            }
            get viewType() {
                return this._viewType;
            }
            set viewType(value) {
                if (value !== this._viewType) {
                    this._viewType = value;
                }
                return;
            }
            searchText(q) {
                return this.location.search('q', q);
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
                    let res = await this.model.rpc(meth, [id], null, this);
                    await this._evalResponseAction(res);
                }
                finally {
                    this.pendingOperation = false;
                }
            }
            async _evalResponseAction(res) {
                if (res.tag === 'refresh')
                    this.view.refresh();
                else if (res.tag == 'new') {
                    if (res.action) {
                        let action = await Katrid.Actions.goto(res.action, { view_type: 'form' });
                        await action.view.dataSource.insert(true, res.values);
                    }
                    else
                        this.dataSource.insert(true, res.values);
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
                        action: this.info.id,
                        model: this.info.model,
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
            showDefaultValueDialog() {
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
                console.log('mark star', record);
            }
            filterByField(field, value) {
                this.searchView.clear();
                this.addFilter(field, value);
            }
            addFilter(field, value) {
                let f = this.view.fields[field];
                console.log(this.searchView);
                this.searchView.addCustomFilter(f, value);
            }
            static async fromModel(model) {
                let svc = new Katrid.Services.Model(model);
                let res = await svc.loadViews({ form: null });
                return new WindowAction({ model: svc, info: { view_mode: 'form', view_type: 'form' } });
            }
        }
        WindowAction.actionType = 'ui.action.window';
        Actions.WindowAction = WindowAction;
        Katrid.Actions.registry[WindowAction.actionType] = WindowAction;
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
                    btnSave.classList.add('btn', 'btn-outline-primary');
                    btnSave.innerText = Katrid.i18n.gettext('Save');
                    let btnDiscard = document.createElement('button');
                    btnDiscard.classList.add('btn', 'btn-outline-secondary');
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
                    let svc = new Katrid.Services.Model('ui.action.homepage');
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
                    let svc = new Katrid.Services.Model('ui.portlet');
                    this.availableItems = [];
                    let res = await svc.rpc('search_portlets');
                    let portlets = res.portlets;
                    let toolbar = document.createElement('div');
                    toolbar.classList.add('toolbar');
                    let sel = document.createElement('select');
                    sel.classList.add('form-control');
                    portlets.forEach((port, index) => {
                        console.log(port, index);
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
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class Component {
            constructor(dashboard) {
                this.dashboard = dashboard;
                this.loaded = false;
            }
            load(data) {
                this.name = data.name;
            }
            get type() {
                return this.constructor.type;
            }
            dump() {
                return {
                    name: this.name,
                    type: this.type,
                };
            }
            async ready() {
                this.loaded = true;
            }
        }
        BI.Component = Component;
        class DataSource extends Component {
            constructor(dashboard) {
                super(dashboard);
                this.widgets = [];
            }
            bind(widget) {
                if (this.widgets.indexOf(widget) === -1)
                    this.widgets.push(widget);
            }
            unbind(widget) {
                this.widgets.splice(this.widgets.indexOf(widget), 1);
            }
            load(data) {
                super.load(data);
                this.commandText = data.commandText;
            }
            get commandText() {
                return this._commandText;
            }
            set commandText(value) {
                this._commandText = value;
                if (this.loaded)
                    this.refresh();
            }
            async refresh() {
                this.data = [];
                if (this.commandText) {
                    let res = await Katrid.Services.Service.$post('/bi/studio/query/', { query: this.commandText });
                    this.data = res.data;
                }
                for (let widget of this.widgets)
                    widget.dataNotification(this);
            }
            async ready() {
                super.ready();
                await this.refresh();
            }
            values(column) {
                return this.dataView.map(obj => obj[column]);
            }
            get dataView() {
                return this.data;
            }
        }
        DataSource.type = 'datasource';
        BI.DataSource = DataSource;
        class Widget extends Component {
            load(data) {
                super.load(data);
                this.title = data.title;
                this.datasourceName = data.datasource;
                this.colStart = data.col;
                this.colEnd = data.colEnd;
                this.rowStart = data.row;
                this.rowEnd = data.rowEnd;
                this.height = data.height;
            }
            dump() {
                let data = super.dump();
                data.datasource = this._datasource?.name;
                return data;
            }
            dataNotification(datasource) {
                this.setDataView(datasource.dataView);
            }
            get datasource() {
                return this._datasource;
            }
            set datasource(value) {
                if (this.datasource)
                    this.datasource.unbind(this);
                this._datasource = value;
                if (value)
                    value.bind(this);
            }
            set datasourceName(value) {
                console.log(this.dashboard);
                this._datasource = this.dashboard.findComponent(value);
            }
            createContainer() {
                this.container = document.createElement('div');
                this.dashboard.append(this.container);
                return this.container;
            }
            render(container) {
                this.dashboard.append(container);
                this.fillGrid();
            }
            async ready() {
                this.render(this.createContainer());
            }
            fillGrid() {
                this.container.setAttribute('style', `height:${this.height}px;grid-column-start:${this.colStart};grid-column-end:${this.colEnd};grid-row-start:${this.rowStart};grid-row-end:${this.rowEnd};`);
            }
        }
        BI.Widget = Widget;
        function registerWidget(name) {
            return (cls) => {
                BI.widgetRegistry[name] = cls;
            };
        }
        BI.registerWidget = registerWidget;
        BI.widgetRegistry = {};
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class Chart extends BI.Widget {
            load(data) {
                super.load(data);
                this.code = data.code;
            }
            render(container) {
                if (this.chart) {
                    Plotly.purge(this.chart);
                    $(container).empty();
                    this.chart = null;
                }
                super.render(container);
                let config = this.getConfig();
                console.log(config);
                return Plotly.newPlot(container, config.traces, config.layout || {
                    height: $(this.container).height(), width: $(this.container).width(),
                    title: this.title,
                }, {
                    responsive: true
                });
            }
            getConfig() {
                if (this.code)
                    return getTraces(eval(this.code), this.dashboard);
            }
            setDataView(dataView) {
                if (this.loaded)
                    this.render(this.container);
            }
            adjustSize() {
                let rect = this.container.getBoundingClientRect();
                if (rect.height && rect.width)
                    Plotly.relayout(this.chart, { height: rect.height, width: rect.width });
            }
        }
        BI.Chart = Chart;
        let PieChart = class PieChart extends Chart {
            load(obj) {
                super.load(obj);
                this.values = obj.values;
                this.labels = obj.labels;
            }
            dump() {
                let res = super.dump();
                res.values = this.values;
                res.labels = this.labels;
                return res;
            }
            getConfig() {
                if (this.code)
                    return super.getConfig();
                let values, labels;
                if (this.datasource) {
                    values = this.datasource.values(this.values);
                    labels = this.datasource.values(this.labels);
                }
                return {
                    traces: [{
                            values: values,
                            labels: labels,
                            type: this.type,
                        }]
                };
            }
        };
        PieChart.type = 'pie';
        PieChart = __decorate([
            BI.registerWidget('pie')
        ], PieChart);
        BI.PieChart = PieChart;
        let BarChart = class BarChart extends Chart {
            load(obj) {
                super.load(obj);
                this.x = obj.x;
                this.y = obj.y;
            }
            dump() {
                let res = super.dump();
                res.x = this.x;
                res.y = this.y;
                return res;
            }
            getConfig() {
                if (this.code)
                    return super.getConfig();
                let y, x;
                if (this.datasource) {
                    y = this.datasource.values(this.y);
                    x = this.datasource.values(this.x);
                }
                return {
                    traces: [{
                            y,
                            x,
                            type: this.type,
                        }]
                };
            }
        };
        BarChart.type = 'bar';
        BarChart = __decorate([
            BI.registerWidget('bar')
        ], BarChart);
        BI.BarChart = BarChart;
        let HBarChart = class HBarChart extends BarChart {
            getConfig() {
                let ret = super.getConfig();
                ret.traces[0].orientation = 'h';
                return ret;
            }
        };
        HBarChart.type = 'hbar';
        HBarChart = __decorate([
            BI.registerWidget('hbar')
        ], HBarChart);
        BI.HBarChart = HBarChart;
        function getTraces(config, dashboard) {
            let kwargs = ['datasource', 'x', 'y', 'values', 'labels'];
            if (config.traces instanceof Function) {
                let traces = [];
                for (let t of config.traces()) {
                    let trace = {};
                    if (typeof t.datasource === 'string') {
                        console.log(t.datasource);
                        let ds = dashboard.findComponent(t.datasource);
                        if (ds.data) {
                            if (t.x)
                                trace.x = ds.values(t.x);
                            if (t.y)
                                trace.y = ds.values(t.y);
                            if (t.values)
                                trace.values = ds.values(t.values);
                            if (t.labels)
                                trace.labels = ds.values(t.labels);
                        }
                        for (let k of Object.keys(t)) {
                            if (!kwargs.includes(k))
                                trace[k] = t[k];
                        }
                    }
                    traces.push(trace);
                }
                config.traces = traces;
            }
            return config;
        }
        BI.getTraces = getTraces;
        function newPlot(el, data, layout, config) {
            if (!layout)
                layout = {};
            if (!('hovermode' in layout))
                layout['hovermode'] = 'closest';
            if (!layout.separators)
                layout.separators = Katrid.i18n.formats.DECIMAL_SEPARATOR + Katrid.i18n.formats.THOUSAND_SEPARATOR;
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
                if (config.adapter)
                    Katrid.Services.Service.adapter = config.adapter;
                else
                    Katrid.Services.Service.adapter = new Katrid.Services.FetchAdapter();
                if (config.el)
                    this.element = config.el;
                else
                    this.element = document.querySelector('#action-manager');
                this.title = config.title;
                for (let entry of Object.entries(Katrid.customElementsRegistry))
                    customElements.define(entry[0], entry[1].constructor, entry[1].options);
                this.userInfo = config.userInfo;
                for (let plug of Katrid.Core.plugins)
                    this.plugins.push(new plug(this));
            }
            get context() {
                return;
            }
            get userInfo() {
                return this._userInfo;
            }
            set userInfo(value) {
                this._userInfo = value;
                this.setUserInfo(value);
            }
            setUserInfo(userInfo) {
            }
            appReady() {
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
                this.actionManager = new Katrid.Actions.ActionManager();
                this.appReady();
                let _hash;
                window.addEventListener('popstate', event => {
                    this.loadPage(location.hash, (event.state === null) || (event.state?.clear));
                });
            }
            appReady() {
                super.appReady();
                if (location.hash === '')
                    document.querySelector('a.module-selector:first-child').click();
                else
                    this.loadPage(location.hash);
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
                    $(`app-header > .dropdown[data-menu-id]`).hide();
                    $(`app-header>.dropdown[data-menu-id="${value.id}"]`).show();
                    $(`app-header .navbar-menu-group[data-parent-id]`).hide();
                    $(`app-header .navbar-menu-group[data-parent-id="${value.id}"]`).show();
                }
            }
            setUserInfo(value) {
                if (value) {
                    let userMenu = document.querySelector('.user-menu');
                    userMenu.querySelector('a.nav-link span').innerText = value.name;
                    if (value.avatar)
                        userMenu.querySelector('.user-avatar').src = value.avatar;
                }
            }
            async loadPage(hash, reset = true) {
                if (hash.indexOf('?') > -1)
                    hash = hash.substring(hash.indexOf('?') + 1, hash.length);
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
                console.log('load page', params);
                if (('action' in params) || ('model' in params))
                    await this.actionManager.onHashChange(params, reset);
                else if ((!('action' in params)) && ('menu_id' in params)) {
                    let actionItem = $('app-header .navbar-menu-group[data-parent-id="' + params.menu_id + '"] .menu-item-action:first');
                    let child = $(actionItem.parent()).find('a.dropdown-item[href]:first');
                    if (child.length) {
                        let href = child[0].getAttribute('href');
                        history.replaceState(null, null, href);
                        this.loadPage(href);
                    }
                }
                for (let plugin of this.plugins) {
                    if (plugin.hashChange(hash))
                        break;
                }
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
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class BaseView {
                compile(template) {
                    for (let child of Array.from(template.children)) {
                        if (child.tagName.startsWith('T-'))
                            this.compileElement(child);
                        else if (child.childElementCount > 0)
                            this.compile(child);
                    }
                }
                compileElement(el) {
                    let tag = el.tagName.toLowerCase();
                    if (tag in Views.templateElements) {
                        Views.templateElements[tag].call(this, el);
                    }
                }
                render(template) {
                    this.compile(template);
                    return template;
                }
            }
            Views.BaseView = BaseView;
            Views.templateElements = {};
            function registerTemplateElement(name, fn) {
                Views.templateElements[name] = fn;
            }
            Views.registerTemplateElement = registerTemplateElement;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        let DashboardPlugin = class DashboardPlugin extends Katrid.Core.Plugin {
            hashChange(url) {
                if (url.startsWith('#/dashboard/')) {
                    this.execute(url);
                    return true;
                }
            }
            async execute(url) {
                url = '/api' + url.substring(1);
                let res = await Katrid.Services.Service.$post(url, {});
                let el = Katrid.element(res.content);
                let view = new DashboardView();
                el = view.render(el);
                let div = document.createElement('div');
                div.append(el);
                el = view.createVm(div, url, res.data, res.params);
                this.app.element.innerHTML = '';
                this.app.element.append(el);
            }
        };
        DashboardPlugin = __decorate([
            Katrid.Core.registerPlugin
        ], DashboardPlugin);
        class DashboardView extends Katrid.Forms.Views.BaseView {
            createVm(el, url, data, params) {
                let watch = {};
                for (let k of params)
                    watch[k] = async function (value) {
                        let res = await this.rpc('param_change', { kwargs: { prop: k, value, values: this.$data } });
                        if (res)
                            for (let [k, v] of Object.entries(res))
                                this[k] = v;
                    };
                let vm = Katrid.createView({
                    methods: {
                        async rpc(method, params) {
                            let res = await Katrid.Services.Service.$post(url + `api_${method}/`, params);
                            res = res.result;
                            if ('showData' in res) {
                                createDataTableDialog(res.showData);
                            }
                            return res;
                        },
                        plotClick(method, params) {
                            return this.rpc('callback', { kwargs: { method, params, values: this.$data } });
                        },
                    },
                    data() {
                        return data;
                    },
                    watch,
                    components: Katrid.componentsRegistry,
                }).mount(el);
                return vm.$el;
            }
            render(template) {
                if (template.tagName === 'DASHBOARD') {
                    let div = document.createElement('div');
                    div.classList.add('dashboard');
                    for (let child of template.childNodes)
                        div.append(child);
                    template = div;
                }
                let el = super.render(template);
                el.classList.add('dashboard');
                return el;
            }
        }
        class DashboardViewElement extends HTMLElement {
            constructor() {
                super(...arguments);
                this.dataSources = [];
            }
            connectedCallback() {
                this.dataSources = [];
                this.widgets = [];
                this.components = [];
            }
            async load(data) {
                try {
                    this.waiting = true;
                    for (let obj of data.dataSources) {
                        let ds = new BI.DataSource(this);
                        ds.load(obj);
                        this.addDataSource(ds);
                    }
                    for (let obj of data.widgets) {
                        let widget = new BI.widgetRegistry[obj.type](this);
                        widget.load(obj);
                        this.addWidget(widget);
                    }
                    for (let comp of this.components)
                        await comp.ready();
                }
                finally {
                    this.waiting = false;
                }
            }
            set waiting(value) {
                this._waiting = value;
                if (this._waiting) {
                    this._waitingElement = document.createElement('h4');
                    $(this).empty();
                    this.append(this._waitingElement);
                }
                else {
                    this._waitingElement.remove();
                }
            }
            addDataSource(datasource) {
                this.dataSources.push(datasource);
                this.components.push(datasource);
            }
            addWidget(widget) {
                this.widgets.push(widget);
                this.components.push(widget);
            }
            findComponent(name) {
                for (let comp of this.components)
                    if (comp.name === name)
                        return comp;
            }
        }
        BI.DashboardViewElement = DashboardViewElement;
        function createDataTable(options) {
            let table = document.createElement('table');
            let thead = document.createElement('thead');
            let tbody = document.createElement('tbody');
            table.classList.add('table', 'table-bordered');
            table.append(thead);
            table.append(tbody);
            let thr = document.createElement('tr');
            thead.append(thr);
            let fields = options.info.fields.map(field => field.name);
            for (let field of options.info.fields) {
                let th = document.createElement('th');
                th.innerHTML = field.caption || field.name;
                thr.append(th);
                if (field.type === 'decimal')
                    th.classList.add('DecimalField');
                else if (field.type === 'date')
                    th.classList.add('DateField');
            }
            for (let row of options.data) {
                let tr = document.createElement('tr');
                options.info.fields.forEach((field, idx) => {
                    let td = document.createElement('td');
                    let col = row[idx];
                    if (field.type === 'decimal') {
                        td.classList.add('DecimalField');
                        col = Katrid.filtersRegistry.number(col, 2);
                    }
                    else if (field.type === 'date') {
                        td.classList.add('DateField');
                        col = Katrid.filtersRegistry.date(col, 'shortDate');
                    }
                    td.innerText = col;
                    tr.append(td);
                });
                if (options.binding) {
                    tr.addEventListener('click', function (event) {
                        let id = fields.indexOf(options.binding.field);
                        console.log('row click', row[id]);
                        Katrid.Forms.Views.openObject(options.binding.model, row[id], { target: 'dialog' });
                    });
                }
                tbody.append(tr);
            }
            table.addEventListener('contextmenu', Katrid.Forms.dataTableContextMenu);
            return table;
        }
        function createDataTableDialog(options) {
            let templ = `<div class="modal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Visualização de Dados</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body"> <div class="table-responsive"></div> </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">${_.gettext('Close')}</button>
      </div>
    </div>
  </div>
</div>`;
            let modal = $(templ);
            modal.find('.table-responsive').append(createDataTable(options));
            console.log(modal);
            $(modal).modal();
            return modal;
        }
        customElements.define('dashboard-view', DashboardViewElement);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        let Grid = class Grid extends BI.Widget {
            setDataView(dataView) {
            }
            load(obj) {
                super.load(obj);
                this._code = obj.code;
            }
            dump() {
                let res = super.dump();
                res.code = this._code;
                return res;
            }
            get code() {
                return this._code;
            }
            set code(value) {
                this._code = value;
                if (value && this.loaded)
                    this.render(this.container);
            }
            render(container) {
                container.classList.add('table-responsive');
                super.render(container);
                let table = new TableWidget(this.container);
                table.fromCode(this.code);
                table.dataBind(this.datasource.dataView);
                if (this.title) {
                    let title = document.createElement('h5');
                    title.innerHTML = this.title;
                    container.insertBefore(title, container.firstElementChild);
                }
            }
        };
        Grid = __decorate([
            BI.registerWidget('grid')
        ], Grid);
        BI.Grid = Grid;
        class TableWidget {
            constructor(container) {
                this.container = container;
            }
            fromCode(code) {
                let obj = eval(code);
                this.config = obj;
                if (obj?.template) {
                    if (obj.template instanceof Function)
                        this.container.innerHTML = obj.template(this);
                    this.table = this.container.querySelector('table');
                }
                else
                    this.table = this.createTable();
                $(this.container).empty();
                this.container.append(this.table);
            }
            dataBind(dataView) {
                this.vm = new Vue({
                    el: this.table,
                    data: {
                        rows: dataView,
                    }
                });
            }
            createTable() {
                let table = document.createElement('table');
                let tr = document.createElement('tr');
                tr.setAttribute('v-for', 'row in rows');
                table.createTHead().append(document.createElement('tr'));
                table.createTBody().append(tr);
                table.classList.add('table');
                if (this.config?.columns) {
                    for (let col of this.config.columns)
                        this.createColumn(table, col);
                }
                return table;
            }
            createColumn(table, colInfo) {
                let column = new TableColumn(colInfo);
                column.render(table);
                return column;
            }
        }
        BI.TableWidget = TableWidget;
        class TableColumn {
            constructor(info) {
                if (typeof info === 'string') {
                    this.caption = this.name = info;
                }
                else {
                    this.name = info.name;
                    this.caption = info.caption || info.name;
                    this.total = info.total;
                }
            }
            render(table) {
                let td = this.createCell();
                let th = this.createHeader();
                table.tHead.rows[0].append(th);
                table.tBodies[0].rows[0].append(td);
            }
            createCell() {
                let td = document.createElement('td');
                td.innerText = `{{ row.${this.name} }}`;
                return td;
            }
            createHeader() {
                let th = document.createElement('th');
                th.innerText = this.caption;
                return th;
            }
        }
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        BI.paramWidgets = {
            CharField(param) {
                return `<div><input id="rep-param-id-${param.id}" v-model="${param.name}" type="text" class="form-control"></div>`;
            },
            IntegerField(param) {
                let secondField = '';
                let model1 = param.name, model2;
                if (param.operation === 'between') {
                    model1 = param.name + 1;
                    model2 = param.name + 2;
                    secondField = `<div class="col-sm-6"><input id="rep-param-id-${param.id}-2" v-model="${model2}" type="number" class="form-control"></div>`;
                }
                let firstField = `<div class="col-sm-6"><input id="rep-param-id-${param.id}-1" v-model="${model1}" type="number" class="form-control"></div>`;
                return `<div class="row">${firstField}${secondField}</div>`;
            },
            DecimalField(param) {
                let secondField = '';
                let model1 = param.name, model2;
                if (param.operation === 'between') {
                    model1 = param.name + 1;
                    model2 = param.name + 2;
                    secondField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}-2" v-model="${model2}" input-decimal class="form-control"></div>`;
                }
                let firstField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}" input-decimal v-model="${model1}" class="form-control"></div>`;
                return `<div class="col-sm-12 row">${firstField}${secondField}</div>`;
            },
            DateTimeField(param) {
                let secondField = '';
                let model1 = param.name, model2;
                if (param.operation === 'between') {
                    model1 = param.name + 1;
                    model2 = param.name + 2;
                    secondField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}-2" type="text" date-picker="L" v-model="${model2}" class="form-control"></div>`;
                }
                let firstField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}-1" type="text" date-picker="L" v-model="${model1}" class="form-control"></div>`;
                return `<div class="col-sm-12 row">${firstField}${secondField}</div>`;
            },
            DateField(param) {
                let secondField = '';
                let model1 = param.name, model2;
                if (param.operation === 'between') {
                    model1 = param.name + 1;
                    model2 = param.name + 2;
                    secondField = `<div class="col-xs-6">
<input-date class="input-group date" v-model="${model2}" date-picker="L">
<input id="rep-param-id-${param.id}-2" type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
</div>`;
                }
                let firstField = `<div class="col-xs-6">
<input-date class="input-group date" v-model="${model1}" date-picker="L">
<input id="rep-param-id-${param.id}-1" type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
</div>`;
                return `<div class="col-sm-12 row">${firstField}${secondField}</div>`;
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
                console.log(param);
                let multiple = '';
                if (param.operation === 'in') {
                    multiple = 'multiple-tags multiple="multiple"';
                }
                else
                    multiple = 'class="form-control"';
                if (param.choices) {
                    let choices = Array.from(param.choices).map(el => el.outerHTML).join('');
                    console.log(param.choices, choices);
                    return `<div><select ${multiple} v-model="${param.name}">${choices}</select></div>`;
                }
                return `<div><select ${multiple} v-model="param.value1"><option :value="value" v-for="(name, value, index) in param.choices">{{name}}</option></select></div>`;
            }
        };
        BI.paramTypes = {
            CharField: 'CharField',
            IntegerField: 'IntegerField',
            DateField: 'DateField',
            DateTimeField: 'DateTimeField',
            ChoiceField: 'SelectionField',
            str: 'CharField',
            int: 'IntegerField',
            date: 'DateField',
            datetime: 'DateTimeField',
        };
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        function renderList(info, options) {
            let renderer = new Katrid.Forms.ListRenderer(info, { rowSelector: false, recordClick: options?.recordClick });
            let templ = Katrid.element(info.content);
            return renderer.render(templ);
        }
        Katrid.component('bi-grid', {
            props: {
                model: String,
                queryId: String,
                records: Array,
                viewInfo: Object,
                where: Object,
                id: String,
                recordClick: String,
            },
            render(vm, _, props) {
                console.log(arguments);
                if (this.viewInfo) {
                    let templ = renderList(this.viewInfo, { recordClick: this.recordClick });
                    let div = document.createElement('div');
                    let table = document.createElement('widget');
                    table.innerHTML = `<div v-if="loading"><i class="fas fa-spinner fa-fw fa-spin"></i> ${Katrid.i18n.gettext('Loading...')}</div>`;
                    table.classList.add('table-responsive');
                    table.append(templ);
                    div.append(table);
                    return Vue.compile(div)(this);
                }
                if (this.model)
                    return Vue.compile(`<div>loading...${this.model}</div>`)(this);
                return Vue.compile('<div>clien side teste</div>')(this);
            },
            methods: {
                async load() {
                    this.loaded = true;
                    if (this.model && !this.viewInfo) {
                        let res = await this.$parent.rpc('load', {
                            id: this.id, model: this.model, where: this.where, view_type: 'list',
                        });
                        this.viewInfo = new Katrid.Forms.Views.ViewInfo(res.result);
                        this.viewInfo.fields = Katrid.Data.Fields.fromArray(this.viewInfo.fields);
                    }
                    await this.refreshData(0);
                },
                async refreshData(timeout) {
                    return refreshData.call(this, ...arguments);
                }
            },
            async mounted() {
                if (!this.loaded)
                    this.load();
            },
            data() {
                return {
                    loading: false,
                    loaded: false,
                    viewInfo: null,
                    records: null,
                };
            },
            watch: {
                where: {
                    deep: true,
                    handler(newValue, oldValue) {
                        if (!deepCompare(newValue, oldValue)) {
                            console.log('reload');
                            this.records = [];
                            this.refreshData(300);
                        }
                    }
                }
            }
        });
        Katrid.component('bi-plot', {
            props: {
                data: Object,
            },
            emits: ['plotClick'],
            template: '<div class="dashboard-container-widget"><div class="dashboard-widget"><div class="graph"></div></div></div>',
            mounted() {
                this.refresh();
            },
            methods: {
                refresh() {
                    setTimeout(() => {
                        let el = this.$el.querySelector('.graph');
                        createPlot.call(this, el, this.data);
                        el.on('plotly_click', (data) => {
                            let args = data.points.map(obj => ({
                                x: obj.x,
                                y: obj.y,
                                name: obj.data.name,
                                type: obj.data.type,
                                value: obj.value,
                                pointIndex: obj.pointIndex,
                                pointNumber: obj.pointNumber,
                            }));
                            this.$emit('plotClick', args);
                        });
                    });
                }
            },
            watch: {
                data() {
                    this.refresh();
                }
            }
        });
        function createPlot(el, data) {
            return Katrid.BI.newPlot(el, data.data, data.layout, { responsive: true });
        }
        async function refreshData(timeout) {
            this.loading = true;
            try {
                if (this.$timeout)
                    clearTimeout(this.$timeout);
                this.$timeout = setTimeout(async () => {
                }, timeout);
                let res = await this.$parent.rpc('search', { id: this.id, model: this.model, where: this.where });
                this.records = res.result.data;
            }
            finally {
                this.loading = false;
            }
        }
        function deepCompare(newValue, oldValue) {
            if (newValue !== oldValue)
                return false;
            else if (newValue && oldValue)
                for (let [k, v] of Object.entries(newValue))
                    if (oldValue[k] != v)
                        return false;
            return true;
        }
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
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
            }
            async render() {
                let templ = document.createElement('query-editor');
                templ = Katrid.Core.$compile(templ)(this.$scope);
                this.$element = templ;
                let queries = await Katrid.Services.Query.all();
                this.$scope.queries = queries.data;
                console.log('render result');
                this.$scope.$apply();
            }
            renderTable(data) {
            }
        }
        function initColumn(table) {
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
                if (_.isString(item))
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
                this.destroyElement();
                this.createElement();
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
                document.removeEventListener('mousedown', this._eventHook);
                document.removeEventListener('wheel', this._eventHook);
                document.removeEventListener('keydown', this._eventKeyDownHook);
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
    var BI;
    (function (BI) {
        var ContextMenu = Katrid.Forms.ContextMenu;
        class QueryView extends HTMLElement {
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
                this.searchView = document.createElement('search-view');
                this.searchView.addEventListener('searchUpdate', () => {
                    this.refresh(query, this.searchView.getParams());
                });
                this.append(this.searchView);
                this.container = document.createElement('div');
                this.container.classList.add('table-responsive');
                this.append(this.container);
                let res = await this.refresh(query);
            }
            async refresh(query, params) {
                $(this.container).empty();
                let res = await Katrid.Services.Query.read({ id: query, details: true, params });
                let fields = this.fields = res.fields;
                this.searchView.fields = this.fields = Katrid.Data.Fields.fromArray(res.fields);
                this.fieldList = Object.values(this.fields);
                let _toObject = (fields, values) => {
                    let r = {}, i = 0;
                    for (let f of fields) {
                        r[f.name] = values[i];
                        i++;
                    }
                    return r;
                };
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
                this.searchView.render();
                return res;
            }
            contextMenu(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                let menu = new ContextMenu();
                menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => this.copyToClipboard());
                menu.show(evt.pageX, evt.pageY);
            }
            copyToClipboard() {
                navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(this.table));
            }
        }
        BI.QueryView = QueryView;
        Katrid.define('query-view', QueryView);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class QueryViewer extends HTMLElement {
            connectedCallback() {
                this.innerHTML = `<div class="col-12"><h5>Visualizador de Consultas</h5><div class="toolbar"><select id="select-query" class="form-control"></select></div></div><query-view class="col-12"></query-view>`;
                this.load();
            }
            async load() {
                let sel = this.querySelector('#select-query');
                this.queryView = this.querySelector('query-view');
                let res = await Katrid.Services.Query.all();
                if (res.data) {
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
                sel.addEventListener('change', () => this.queryId = sel.value);
            }
            set queryId(value) {
                this.queryView.queryId = value;
            }
            get queryId() {
                return this.queryView.queryId;
            }
        }
        BI.QueryViewer = QueryViewer;
        Katrid.define('query-viewer', QueryViewer);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        let Text = class Text extends BI.Widget {
            load(data) {
                super.load(data);
                this.code = data.code;
            }
            setDataView(dataView) {
            }
            render(container) {
                super.render(container);
                console.log('code', this.code);
                container.innerHTML = this.code;
                new Vue({
                    el: this.container,
                    data: {
                        dataView: this.datasource?.dataView,
                    }
                });
            }
        };
        Text.type = 'text';
        Text = __decorate([
            BI.registerWidget('text')
        ], Text);
        BI.Text = Text;
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    function assignElement(target, source) {
        for (let attr of source.attributes) {
            target.setAttribute(attr.name, attr.value);
        }
    }
    Katrid.assignElement = assignElement;
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
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class Connection {
            constructor(name) {
                Katrid.Data.connections[name] = this;
                if (!Katrid.Data.connection)
                    Katrid.Data.connection = this;
            }
        }
        class Adapter {
        }
        class MemoryAdaper extends Adapter {
        }
        Data.connections = {};
        Data.connection = null;
        Data.defaultConnection = 'default';
    })(Data = Katrid.Data || (Katrid.Data = {}));
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
        let DEFAULT_REQUEST_INTERVAL = 300;
        class DataSource {
            constructor(config) {
                this.config = config;
                this.$modifiedRecords = [];
                this.refreshInterval = 1000;
                this.readonly = false;
                this.$modifiedRecords = [];
                this.scope = config.scope;
                this.action = config.action;
                this._model = config.model;
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
                this.pendingOperation = null;
                this.pendingRequest = false;
                this.children = [];
                this.modifiedData = null;
                this.uploading = 0;
                this.fields = config.fields;
                this._state = null;
                this.fieldWatchers = [];
                this._pendingChanges = false;
                if (!this.action?.recordId)
                    this.recordId = null;
                this._records = [];
                this.pendingPromises = [];
                this.vm = config.vm;
            }
            get pageIndex() {
                return this._pageIndex;
            }
            set pageIndex(page) {
                this._pageIndex = page;
                this.search(this._params, page, this._fields, DEFAULT_REQUEST_INTERVAL);
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
            }
            _createRecord(obj) {
                let rec = Data.createRecord(obj, this);
                rec.$record.onFieldChange = this._onFieldChange;
                return rec;
            }
            async copy(id) {
                let res = await this.model.copy(id);
                this.setRecord({});
                await this.insert();
                setTimeout(() => {
                    clearTimeout(this.pendingOperation);
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
                if (data === true)
                    r = this.search(this._params, this._page);
                else if (data) {
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
                return this.get(id);
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
                                let scope = angular.element(elForm).scope();
                                const field = scope.view.fields[child.$name];
                                errorMsgs.push(`<span>${field.caption}</span><ul><li>${Katrid.i18n.gettext('This field cannot be empty.')}</li></ul>`);
                            }
                        }
                    else
                        console.log(form.$error[errorType]);
                return elfield;
            }
            async validate(raiseError = true) {
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
                            context: this.action.context,
                            filter: where,
                        };
                        this.parent.model.getFieldChoices(args)
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
                            if (this.readonly)
                                this.records = data;
                            else
                                this.records = data.map((obj) => this._createRecord(obj));
                            if (this.pageIndex === 1) {
                                this.offsetLimit = this._records.length;
                            }
                            else {
                                this.offsetLimit = (this.offset + this._records.length) - 1;
                            }
                            return resolve(res);
                        })
                            .finally(() => {
                            this.pendingRequest = false;
                        });
                    };
                    this.pendingPromises.push(controller);
                    timeout = 0;
                    if (((this.requestInterval > 0) || timeout) && (timeout !== false))
                        this.pendingOperation = setTimeout(req, timeout || this.requestInterval);
                    else
                        req();
                });
            }
            _search(req, timeout) {
                return new Promise((resolve, reject) => {
                    let controller = new AbortController();
                    this.pendingPromises.push(controller);
                    timeout = 0;
                    if (((this.requestInterval > 0) || timeout) && (timeout !== false))
                        this.pendingOperation = setTimeout(req, timeout || this.requestInterval);
                    else
                        req();
                });
            }
            search(params, page, fields, timeout) {
                let master = this.masterSource;
                this.pendingPromises = [];
                this._params = params;
                this._page = page;
                this._fields = fields;
                this._clearTimeout();
                this.pendingRequest = true;
                this.loading = true;
                this.state = DataSourceState.loading;
                page = page || 1;
                this._pageIndex = page;
                let domain;
                if (this.action?.info)
                    domain = this.action.info.domain;
                if (this.where)
                    domain = this.where;
                else if (domain) {
                    domain = JSON.parse(domain);
                }
                if (!fields)
                    fields = this.action.view.fields;
                if (_.isObject(fields))
                    fields = Object.keys(fields);
                else if (!fields) {
                    fields = this.action.view.fields;
                    console.log('search fields', fields);
                }
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
                        this.model.search(params, null, { signal: controller.signal }, this.action.context)
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
                    this.pendingPromises.push(controller);
                    timeout = 0;
                    if (((this.requestInterval > 0) || timeout) && (timeout !== false))
                        this.pendingOperation = setTimeout(req, timeout || this.requestInterval);
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
                let res = await this.model.groupBy([group[index]], where);
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
                clearTimeout(this.pendingOperation);
                for (let controller of this.pendingPromises)
                    try {
                        controller.abort();
                    }
                    catch { }
                this.pendingPromises = [];
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
                    }
                    this.modifiedData = ds;
                    this.masterSource.scope.form.$setDirty();
                }
                return data;
            }
            async save(autoRefresh = true) {
                for (let child of this.children)
                    if (child.changing)
                        child.flush();
                if (await this.validate()) {
                    const data = this.record.$record.serialize();
                    if (data) {
                        this.uploading++;
                        console.log(data);
                        return this.model.write([data])
                            .then((res) => {
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
                await this.model.delete(sel);
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
            get(id, timeout, apply = true, index = false) {
                this._clearTimeout();
                this.state = DataSourceState.loading;
                this.loadingRecord = true;
                return new Promise((resolve, reject) => {
                    let _get = () => {
                        let controller = new AbortController();
                        this.pendingPromises.push(controller);
                        let fields;
                        if (this.fields)
                            fields = Object.keys(this.fields);
                        return this.model.getById(id, { fields, signal: controller.signal })
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
                            console.log(res);
                            if (Array.isArray(res.data))
                                this.record = res.data[0];
                            else if (res.data)
                                this.record = res.data;
                            else
                                return;
                            this._record.$record.$loaded = true;
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
                        this.pendingOperation = setTimeout(_get, timeout || this.requestInterval);
                });
            }
            get defaultValues() {
                return;
            }
            set defaultValues(values) {
                for (let [k, v] of Object.entries(values)) {
                    if (_.isObject(v) && (k in this.fields)) {
                        this.fields[k].defaultValue = v;
                    }
                }
            }
            async insert(loadDefaults = true, defaultValues, kwargs) {
                this._clearTimeout();
                for (let child of this.children)
                    child._clearTimeout();
                let rec = this._createRecord(null);
                let oldRecs = this._records;
                this.record = rec;
                this._records = oldRecs;
                let res;
                for (let child of this.children)
                    child.vm.records = [];
                if (loadDefaults) {
                    if (!kwargs)
                        kwargs = {};
                    kwargs.context = this.action.context;
                    let controller = new AbortController();
                    this.pendingPromises.push(controller);
                    res = await this.model.getDefaults(kwargs, { signal: controller.signal });
                }
                this.state = DataSourceState.inserting;
                this.record['record_name'] = _.gettext('(New)');
                console.log('pass default values', defaultValues);
                let defaults = {};
                if (this.masterSource && this.field && this.field.defaultValue)
                    Object.assign(defaults, this.field.defaultValue);
                for (let v of Object.values(this.fields))
                    if (v.defaultValue)
                        defaults[v.name] = v.defaultValue;
                if (this.action.context && this.action.context.default_values)
                    Object.assign(defaults, this.action.context.default_values);
                if (res)
                    Object.assign(defaults, res);
                if (defaultValues)
                    Object.assign(defaults, defaultValues);
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
                    if (fld)
                        fld.setValue(record, v);
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
                this.action.recordId = value;
            }
            get recordId() {
                return this._recordId;
            }
            set record(rec) {
                if (rec) {
                    if (!rec.$record)
                        rec = this._createRecord(rec);
                    if (rec.$record.dataSource !== this)
                        rec.$record.dataSource = this;
                    if (this.vm) {
                        this.vm.record = rec;
                        rec = this.vm.record;
                    }
                    if (this.dataCallback)
                        this.dataCallback(rec);
                    this._record = rec;
                    this.recordId = rec.id;
                    this._pendingChanges = false;
                    if (this.action && this.action.view?.actionView)
                        this.action.view.actionView.dispatchEvent(new CustomEvent('recordLoaded', { 'detail': { record: rec } }));
                }
                this.childrenNotification(rec);
            }
            setRecord(obj) {
                obj = this._createRecord(obj);
                return obj;
            }
            set records(recs) {
                this._records = recs;
                if (('onLoadData' in this.action) && (this.action['onLoadData']))
                    this.action['onLoadData'](recs);
                if (this.vm)
                    this.vm.records = recs;
                if (this.dataCallback)
                    this.dataCallback(recs);
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
                this._recordIndex = index;
                let rec = this._records[index];
                this.record = rec;
                if (rec?.id) {
                    if (this.action)
                        this.action.changeUrl('id', this.recordId);
                    this.get(rec.id);
                }
            }
            get recordIndex() {
                return this._recordIndex;
            }
            addRecord(rec) {
                let scope = this.vm;
                let record = Katrid.Data.createRecord(null, this);
                scope.records.push(record);
                this._record = record;
                this.setValues(rec);
                this._record = null;
                this.parent.record.$record.addChild(record.$record);
            }
            async expandGroup(index, row) {
                let params = {};
                if (this._params)
                    Object.assign(params, this._params);
                if (row.$params)
                    Object.assign(params, row.$params);
                if (row.$level === (this.groups.length - 1)) {
                    let res = await this.model.search({ params });
                    if (res.data) {
                        row.$children = res.data;
                        this.vm.groups.splice.apply(this.vm.groups, [index + 1, 0].concat(res.data));
                    }
                    this._records = this._chain();
                }
                else {
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
                let res = await this.model.rpc(name, ...args);
                this._applyResponse(res);
            }
            get model() {
                return this._model;
            }
            open() {
                return this.search({}, 1);
            }
            get parent() {
                return this.masterSource;
            }
            set parent(value) {
                this._masterSource = value;
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
                if (!parentRecord || parentRecord.$created)
                    return;
                this.state = DataSourceState.loading;
                this.pendingOperation = setTimeout(async () => {
                    if (parentRecord.id != null) {
                        let data = {};
                        data[this.field.info.field] = parentRecord.id;
                        let res = await this.getFieldChoices(data);
                        if (this.vm)
                            this.vm.records = res.data;
                        parentRecord[this.field.name] = res.data;
                    }
                    else {
                        parentRecord[this.field.name] = [];
                    }
                    this.state = Katrid.Data.DataSourceState.browsing;
                }, this.refreshInterval);
            }
            destroy() {
                if (this._masterSource)
                    this._masterSource.children.splice(this._masterSource.children.indexOf(this), 1);
            }
            flush(validate = true, browsing = true) {
                if (validate)
                    this.validate();
                this.record.$record.flush();
                if (browsing)
                    this.state = DataSourceState.browsing;
                return this.record;
            }
            discardChanges() {
                this.record.$record.discard();
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
            _onFieldChange(field, newValue, record) {
                if (field.name === this._lastFieldName)
                    clearTimeout(this.pendingOperation);
                this._lastFieldName = field.name;
                let fn = () => {
                    let rec = this.encodeObject(record.pristine);
                    rec[field.name] = newValue;
                    if (this.parent)
                        rec[this.field.info.field] = this.encodeObject(this.parent.record.$record.serialize());
                    this.dispatchEvent('admin_on_field_change', [field.name, rec]);
                };
                this.pendingOperation = setTimeout(fn, 50);
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
        let RecordState;
        (function (RecordState) {
            RecordState[RecordState["unmodified"] = 0] = "unmodified";
            RecordState[RecordState["destroyed"] = 1] = "destroyed";
            RecordState[RecordState["created"] = 2] = "created";
            RecordState[RecordState["modified"] = 3] = "modified";
        })(RecordState = Data.RecordState || (Data.RecordState = {}));
        class DataRecord {
            constructor(data, dataSource, state) {
                this.$loaded = false;
                if (!data)
                    data = this.newRecord();
                this.pristine = data;
                this.data = {};
                this.dataSource = dataSource;
                this.pending = null;
                this.modified = false;
                this.children = [];
                if (this.state !== RecordState.created)
                    this.state = state || RecordState.unmodified;
                this.submitted = false;
                data.$record = this;
            }
            get scope() {
                return this.dataSource.scope;
            }
            get pk() {
                return this.pristine.id;
            }
            async load(record) {
                if (this.state === RecordState.unmodified) {
                    let rec = await this.dataSource.get(this.pristine.id);
                    if (rec) {
                        this.$record = rec;
                        return rec;
                    }
                    return record;
                }
                else if (this.state === RecordState.created)
                    return record;
            }
            addChild(child) {
                if (this.state === RecordState.unmodified)
                    this.state = RecordState.modified;
                if (this.children.indexOf(child) === -1)
                    this.children.push(child);
            }
            newRecord() {
                let rec = {};
                rec.$created = true;
                this.state = RecordState.created;
                return rec;
            }
            delete() {
                if (this.state === RecordState.unmodified) {
                    this.setModified();
                    if (this.parent.children.indexOf(this) === -1)
                        this.parent.children.push(this);
                    this.state = RecordState.destroyed;
                }
                else if (this.parent.children.indexOf(this) > -1) {
                    this.parent.children.splice(this.parent.children.indexOf(this), 1);
                }
            }
            _prepareRecord(rec, parent) {
                return;
                let getValue = (v) => {
                    if (_.isObject(v))
                        return this._prepareRecord(v, rec);
                    else if (_.isArray(v))
                        return v.map((obj) => getValue(obj));
                    return v;
                };
                let res = {};
                for (let [k, v] of Object.entries(rec)) {
                    if (parent && _.isObject(v))
                        continue;
                    res[k] = getValue(v);
                    if (v)
                        console.log(v.constructor.name);
                }
                if (this.dataSource.parent && !parent) {
                    let field = this.dataSource.parent.scope.view.fields[this.dataSource.field.name]._info.field;
                }
                return res;
            }
            setModified(field, value) {
                this.modified = true;
                if (field && this.$form)
                    this.$form.setFieldValue(field, value);
                this.dataSource._pendingChanges = true;
            }
            get parent() {
                return this.dataSource.parent && this.dataSource.parent.record.$record;
            }
            compare(oldValue, newValue) {
                if (_.isArray(oldValue) && _.isArray(newValue))
                    return oldValue.join(',') !== newValue.join(',');
                return oldValue != newValue;
            }
            discard() {
                console.log(this.pristine, this.pending);
                if (this.pending) {
                    Object.assign(this.pristine, this.pending);
                }
                this.data = {};
            }
            flush() {
                if (!this.pending)
                    this.pending = {};
                Object.assign(this.pending, this.data);
                if (this.state == RecordState.unmodified)
                    this.state = RecordState.modified;
                let rec = this;
                while (rec.parent) {
                    rec.parent.addChild(rec);
                    rec = rec.parent;
                }
            }
            set(propKey, value) {
                let field = this.dataSource.fieldByName(propKey);
                if (field) {
                    if (this.state === RecordState.unmodified)
                        this.state = RecordState.modified;
                    let oldValue = this.pristine[propKey];
                    value = field.$set(value);
                    if (this.compare(oldValue, value)) {
                        this.setModified(field, value);
                        this.data[propKey] = value;
                        if (field.onChange) {
                            if (this.onFieldChange)
                                this.onFieldChange.apply(this.dataSource, [field, value, this]);
                            else if (this.dataSource)
                                this.dataSource._onFieldChange(field, value, this);
                        }
                    }
                }
                return true;
            }
            $new() {
                return new DataRecord(this.pristine);
            }
            serialize() {
                let data = {};
                Object.assign(data, this.data);
                for (let child of this.children) {
                    if (!(child.dataSource.field.name in data))
                        data[child.dataSource.field.name] = [];
                    if (child.state === RecordState.created)
                        data[child.dataSource.field.name].push({ action: 'CREATE', values: child.serialize() });
                    else if (child.state === RecordState.modified)
                        data[child.dataSource.field.name].push({ action: 'UPDATE', values: child.serialize() });
                    else if (child.state === RecordState.destroyed)
                        data[child.dataSource.field.name].push({ action: 'DESTROY', id: child.pk });
                }
                if (this.pk)
                    data.id = this.pk;
                for (let k of Object.keys(data)) {
                    let field = this.dataSource.fieldByName(k);
                    if (field)
                        data[k] = field.toJSON(data[k]);
                }
                return data;
            }
        }
        Data.DataRecord = DataRecord;
        class SubRecords {
            constructor(recs) {
                this.recs = recs;
            }
            append(rec) {
                if (this.recs.indexOf(rec) === -1)
                    this.recs.push(rec);
            }
        }
        Data.SubRecords = SubRecords;
        function createRecord(rec, dataSource) {
            let record = new DataRecord(rec, dataSource);
            if (!rec)
                rec = record.pristine;
            if (dataSource?.$form)
                record.$form = dataSource.$form;
            if (dataSource?.fields) {
                for (let field of Object.values(dataSource.fields)) {
                    let val = rec[field.name];
                    if (val != null)
                        rec[field.name] = field.getValue(val);
                }
            }
            return new Proxy(rec, {
                set(target, propKey, value, receiver) {
                    if (!propKey.startsWith('$$')) {
                        let scope = dataSource.vm;
                        let field = dataSource.fieldByName(propKey);
                        if (!propKey.startsWith('$') && scope && field && !(field instanceof Katrid.Data.Fields.OneToManyField)) {
                            rec.$record.set(propKey, value);
                        }
                    }
                    return Reflect.set(target, propKey, value, receiver);
                }
            });
        }
        Data.createRecord = createRecord;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            function toCamelCase(s) {
                s = s.replace(/([^a-zA-Z0-9_\- ])|^[_0-9]+/g, "").trim().toLowerCase();
                s = s.replace(/([ -]+)([a-zA-Z0-9])/g, function (a, b, c) {
                    return c.toUpperCase();
                });
                s = s.replace(/([0-9]+)([a-zA-Z])/g, function (a, b, c) {
                    return b + c.toUpperCase();
                });
                return s;
            }
            class Field {
                constructor(info) {
                    this._loaded = false;
                    this.attrs = {};
                    this.tag = 'input';
                    this.visible = true;
                    this.info = info;
                    this.cssClass = info.type;
                    this.caption = info.caption || info.name;
                    this.helpText = this.info.help_text;
                    this.required = this.info.required;
                    this.onChange = this.info.onchange;
                    this.nolabel = false;
                    this.displayChoices = _.object(info.choices);
                    this.choices = info.choices;
                    this.create();
                    this.loadInfo(info);
                }
                create() {
                    this.visible = true;
                    this.emptyText = '--';
                    this.cols = 6;
                    this.readonly = false;
                    this.defaultSearchLookup = '__icontains';
                    if (this.info.choices)
                        this.template = {
                            list: 'view.list.selection-field.jinja2',
                            card: 'view.list.selection-field.jinja2',
                            form: 'view.form.selection-field.jinja2',
                        };
                    else
                        this.template = {
                            list: 'view.list.field.jinja2',
                            card: 'view.list.field.jinja2',
                            form: 'view.form.field.jinja2',
                        };
                }
                loadInfo(info) {
                    if (info.template)
                        this.template = Object.assign(this.template, info.template);
                    if (info.cols)
                        this.cols = info.cols;
                    if ('readonly' in info)
                        this.readonly = info.readonly;
                    if ('visible' in info)
                        this.visible = info.visible;
                    if (info[':readonly'])
                        this.vReadonly = info[':readonly'];
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
                assign(el) {
                    for (let attr of el.attributes) {
                        this.attrs[attr.name] = attr.value;
                        let camelCase = toCamelCase(attr.name);
                        if (camelCase !== attr.name)
                            this.attrs[camelCase] = attr.value;
                    }
                    this.loadInfo(this.attrs);
                    this.fieldEl = el;
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
                formLabel() {
                    if (!this.nolabel) {
                        let label = document.createElement('label');
                        label.innerText = this.caption;
                        label.classList.add('form-label');
                        return label;
                    }
                }
                formControl() {
                    let input = document.createElement(this.tag);
                    input.type = 'text';
                    input.setAttribute('v-model', 'record.' + this.name);
                    input.classList.add('form-field', 'form-control');
                    for (let k of Object.keys(this.attrs)) {
                        if (k.includes(':'))
                            input.setAttribute(k, this.attrs[k]);
                    }
                    input.autocomplete = 'nope';
                    input.spellcheck = false;
                    if (this.required)
                        input.required = true;
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
                formCreate(view) {
                    if (this.widget) {
                        return this.createWidget(this.widget).formRender(view);
                    }
                    let label = this.formLabel();
                    let control;
                    control = this.formControl();
                    let section = document.createElement('section');
                    section.classList.add('form-field-section');
                    section.setAttribute('v-form-field', null);
                    section.setAttribute('name', this.name);
                    if (this.vIf)
                        section.setAttribute('v-if', this['v-if']);
                    if (this['v-show'])
                        section.setAttribute('v-show', this['v-show']);
                    if (this.vClass)
                        section.setAttribute(':class', this.vClass);
                    if (this.vReadonly)
                        section.setAttribute(':readonly', this.vReadonly);
                    else if (this.readonly)
                        section.setAttribute('readonly', null);
                    section.classList.add('form-group');
                    if (this.cols && !isNaN(this.cols))
                        section.classList.add('col-md-' + this.cols);
                    else if (typeof this.cols === 'string')
                        section.classList.add(this.cols);
                    if (this.cssClass)
                        section.classList.add(this.cssClass);
                    if (label)
                        section.append(label);
                    section.append(control);
                    let spanTempl = this.formSpanTemplate();
                    if (spanTempl) {
                        let span = document.createElement('div');
                        span.classList.add('form-field-readonly');
                        span.innerHTML = spanTempl;
                        section.append(span);
                    }
                    this.createTooltip(section);
                    return section;
                }
                createTooltip(section) {
                    if (!Katrid.settings.ui.isMobile) {
                        let fn = function () {
                            let title = this.caption;
                            if (this.helpText)
                                title += '<br>' + this.helpText;
                            title += '<br>Field: ' + this.name;
                            title += `<br>Content: ' + record.${this.name} + '`;
                            if (this.model)
                                title += '<br>Model: ' + this.model;
                            return title;
                        };
                    }
                }
                listCreate(view) {
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
                    if (this.name && view.inlineEditor) {
                        let formView = view.action.views.form;
                        let field = formView.fields[this.name];
                        let fieldEl = view.action.formView.querySelector(`field[name=${this.name}]`);
                        field.assign(fieldEl);
                        let el = field.formCreate(td);
                        el.className = field.cssClass;
                        td.append(el);
                    }
                }
                formSpanTemplate() {
                    if (this.hasChoices)
                        return `{{ view.fields['${this.name}'].displayChoices[record.${this.name}] || '${this.emptyText}' }}`;
                    return `<span>{{ record.${this.name} }}</span>`;
                }
                listSpanTemplate() {
                    return this.formSpanTemplate();
                }
                listCaptionTemplate() {
                    return `<span class="grid-field-readonly">${this.caption}</span>`;
                }
                cardCreate() {
                    let span = document.createElement('span');
                    span.innerText = `{{ record.${this.name} }}`;
                    return span;
                }
                setValue(record, value) {
                    record[this.name] = value;
                }
                get hasChoices() {
                    return this.info.choices && this.info.choices.length > 0;
                }
                get name() {
                    return this.info.name;
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
                createWidget(widget) {
                    let cls = Katrid.Forms.Widgets.registry[widget];
                    return new cls(this);
                }
                validate(record) {
                    let val = record[this.name];
                    let msgs = [];
                    if (this.required && (val == null)) {
                        msgs.push(Katrid.i18n.gettext('This field cannot be empty.'));
                    }
                    if (msgs.length) {
                        let res = {};
                        res[this.name] = msgs;
                        return res;
                    }
                    return true;
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
                        { name: '=', label: _.gettext('Is equal') },
                        { name: '!=', label: _.gettext('Is different'), },
                        { name: 'is not null', label: _.gettext('Is defined'), input: false },
                        { name: 'is null', label: _.gettext('Is not defined'), input: false },
                    ];
                }
            }
            Fields.Field = Field;
            Fields.registry = {
                Field,
            };
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class DateField extends Fields.Field {
                constructor(info) {
                    super(info);
                    this.tag = 'input-date';
                    if (!info.cols)
                        info.cols = 3;
                }
                formSpanTemplate() {
                    return `{{ $filters.date(record.${this.name}, 'shortDate') || '${this.emptyText}' }}`;
                }
                create() {
                    super.create();
                }
                toJSON(val) {
                    return val;
                }
                getParamTemplate() {
                    return 'view.param.Date';
                }
                format(value) {
                    if (_.isString(value))
                        return moment(value).format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
                    return '';
                }
                formControl() {
                    let div = document.createElement(this.tag);
                    div.setAttribute('v-model', 'record.' + this.name);
                    div.classList.add('input-group', 'date');
                    div.setAttribute('date-picker', "L");
                    div.innerHTML = `
      <input input-field type="text" name="${this.name}" class="form-control form-field" inputmode="numeric">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>`;
                    return div;
                }
            }
            Fields.DateField = DateField;
            class DateTimeField extends DateField {
                constructor(info) {
                    if (!info.cols)
                        info.cols = 3;
                    super(info);
                }
                formSpanTemplate() {
                    return `{{ $filters.date(record.${this.name}, 'short') || '${this.emptyText}' }}`;
                }
                create() {
                    super.create();
                }
                getParamTemplate() {
                    return 'view.param.DateTime';
                }
                formControl() {
                    let control = super.formControl();
                    control.setAttribute('date-picker', "L LT");
                    return control;
                }
            }
            Fields.DateTimeField = DateTimeField;
            class TimeField extends Fields.Field {
                constructor(info) {
                    super(info);
                    this.tag = 'input-time';
                    if (!info.cols)
                        info.cols = 3;
                }
                create() {
                    super.create();
                }
                formSpanTemplate() {
                    return `{{ record.${this.name} || '${this.emptyText}' }}`;
                }
            }
            Fields.TimeField = TimeField;
            Object.assign(Fields.registry, {
                DateField,
                DateTimeField,
                TimeField,
            });
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class StringField extends Fields.Field {
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
            class ChoiceField extends Fields.Field {
                formSpanTemplate() {
                    return `{{ view.fields.${this.name}.displayChoices[record.${this.name}] || '${this.emptyText}' }}`;
                }
                formControl() {
                    let control = document.createElement('select');
                    if (this.required)
                        control.required = true;
                    control.classList.add('form-field', 'form-control');
                    control.name = this.name;
                    control.setAttribute('v-model', 'record.' + this.name);
                    let option = document.createElement('option');
                    option.setAttribute('v-for', `choice in view.fields.${this.name}.choices`);
                    option.setAttribute(':value', "choice[0]");
                    option.innerText = '{{ choice[1] }}';
                    control.append(option);
                    return control;
                }
            }
            Fields.ChoiceField = ChoiceField;
            class PasswordField extends StringField {
                constructor(info) {
                    if (!info.template)
                        info.template = {};
                    if (!info.template.form)
                        info.template.form = 'view.form.password.jinja2';
                    if (!info.template.list)
                        info.template.list = 'view.list.password.jinja2';
                    super(info);
                }
                create() {
                    super.create();
                }
                formControl() {
                    let control = super.formControl();
                    control.setAttribute('type', 'password');
                    return control;
                }
                formSpanTemplate() {
                    return '**********************';
                }
            }
            Fields.PasswordField = PasswordField;
            class BooleanField extends Fields.Field {
                constructor(info) {
                    if (!info.cols)
                        info.cols = 3;
                    super(info);
                    this.template.form = 'view.form.boolean-field.jinja2';
                    this.template.list = 'view.list.boolean-field.jinja2';
                    this.template.card = 'view.list.boolean-field.jinja2';
                    this.nolabel = true;
                }
                formSpanTemplate() {
                    return `{{ record.${this.name} ? '${_.gettext('yes')}' : '${_.gettext('no')}' }}`;
                }
                create() {
                    super.create();
                }
                getParamTemplate() {
                    return 'view.param.Boolean';
                }
                getFilterConditions() {
                    return [
                        { name: '=', label: _.gettext('Is equal'), options: { 'yes': _.gettext('yes'), 'no': _.gettext('yes') } },
                        { name: '!=', label: _.gettext('Is different') },
                        { name: 'is not null', label: _.gettext('Is defined'), input: false },
                        { name: 'is null', label: _.gettext('Is not defined'), input: false },
                    ];
                }
                formLabel() {
                    let label = document.createElement('label');
                    label.classList.add('form-label', 'form-label-checkbox');
                    label.innerHTML = `
      <span class="checkbox-span">${this.caption}</span>
      <span>&nbsp;</span>`;
                    return label;
                }
                formControl() {
                    let label = document.createElement('label');
                    label.classList.add('checkbox');
                    let caption = this.caption;
                    if (this.helpText)
                        caption = this.helpText;
                    label.setAttribute('v-show', 'changing');
                    label.innerHTML =
                        `<input type="checkbox" name="${this.name}" class="form-field form-control" v-model="record.${this.name}">${caption}<i class="fas"></i>`;
                    return label;
                }
            }
            Fields.BooleanField = BooleanField;
            class NumericField extends Fields.Field {
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
                    if (val && _.isString(val))
                        return parseFloat(val);
                    return val;
                }
                $set(val) {
                    return this.toJSON(val);
                }
                formSpanTemplate() {
                    return `{{ $filters.toFixed(record.${this.name}, ${this.decimalPlaces}) || '${this.emptyText}' }}`;
                }
            }
            Fields.NumericField = NumericField;
            class IntegerField extends NumericField {
                constructor(info) {
                    if (!info.cols)
                        info.cols = 3;
                    super(info);
                }
                create() {
                    super.create();
                    this.tag = 'input';
                    this.decimalPlaces = 0;
                }
                toJSON(val) {
                    if (val && _.isString(val))
                        return parseInt(val);
                    return val;
                }
            }
            Fields.IntegerField = IntegerField;
            class FloatField extends NumericField {
            }
            Fields.FloatField = FloatField;
            class DecimalField extends NumericField {
                constructor(info) {
                    super(info);
                    this.decimalPlaces = 2;
                    if (this.info.attrs) {
                        this.decimalPlaces = this.info.attrs.decimal_places || 2;
                    }
                }
                formControl() {
                    let control = super.formControl();
                    control.setAttribute('input-decimal', this.decimalPlaces.toString());
                    control.setAttribute('inputmode', 'decimal');
                    return control;
                }
                listSpanTemplate() {
                    return `<span class="grid-field-readonly">{{ $filters.toFixed(record.${this.name}, 2) }}</span>`;
                }
            }
            Fields.DecimalField = DecimalField;
            class TextField extends StringField {
                constructor(info) {
                    super(info);
                    if (!info.template || (info.template && !info.template.form))
                        this.template.form = 'view.form.text-field.jinja2';
                }
                formControl() {
                    let control = document.createElement('textarea');
                    control.classList.add('form-field', 'form-control');
                    control.spellcheck = true;
                    control.name = this.name;
                    control.setAttribute('v-model', 'record.' + this.name);
                    return control;
                }
            }
            Fields.TextField = TextField;
            class XmlField extends TextField {
                constructor(info) {
                    super(info);
                    if (!info.template || (info.template && !info.template.form))
                        this.template.form = 'view.form.code-editor.jinja2';
                }
            }
            Fields.XmlField = XmlField;
            class JsonField extends TextField {
                constructor(info) {
                    super(info);
                    if (!info.template || (info.template && !info.template.form))
                        this.template.form = 'view.form.json-field.jinja2';
                }
            }
            Fields.JsonField = JsonField;
            class PythonCodeField extends TextField {
                constructor(info) {
                    super(info);
                    if (!info.template || (info.template && !info.template.form))
                        this.template.form = 'view.form.python-code.jinja2';
                }
            }
            Fields.PythonCodeField = PythonCodeField;
            class RadioField extends ChoiceField {
                formControl() {
                    let label = document.createElement('div');
                    label.setAttribute('v-for', `choice in view.fields.${this.name}.choices`);
                    label.classList.add('radio-button', 'radio-inline');
                    let css = this.fieldEl.getAttribute('class');
                    if (css)
                        label.classList.add(...css.split(' '));
                    let input = document.createElement('input');
                    let id = `id-${this.name}-\${$index}`;
                    input.setAttribute('id', id);
                    input.setAttribute('type', 'radio');
                    input.setAttribute('v-model', `record.${this.name}`);
                    input.setAttribute(':value', `choice[0]`);
                    let txt = document.createElement('label');
                    txt.innerText = '{{ choice[1] }}';
                    txt.setAttribute('for', id);
                    label.appendChild(input);
                    label.appendChild(txt);
                    return label;
                }
            }
            function fromInfo(config) {
                let cls;
                if (config.choices)
                    cls = ChoiceField;
                else
                    cls = Katrid.Data.Fields.registry[config.type] || StringField;
                return new cls(config);
            }
            Fields.fromInfo = fromInfo;
            function fromArray(fields) {
                let r = {};
                if (fields instanceof Array) {
                    let f = {};
                    fields.forEach(fld => f[fld.name] = fld);
                    fields = f;
                }
                Object.keys(fields).map((k) => r[k] = fromInfo(fields[k]));
                return r;
            }
            Fields.fromArray = fromArray;
            Object.assign(Fields.registry, {
                StringField,
                BooleanField,
                DecimalField,
                NumericField,
                IntegerField,
                ChoiceField,
                TextField,
                XmlField,
                JsonField,
                radio: RadioField,
            });
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class ForeignKey extends Fields.Field {
                constructor() {
                    super(...arguments);
                    this.tag = 'field-autocomplete';
                }
                formControl() {
                    let control = document.createElement(this.tag);
                    control.setAttribute('v-model', 'record.' + this.name);
                    if ('allow-open' in this.attrs)
                        control.setAttribute('allow-open', null);
                    if (this.attrs['v-on:change'])
                        control.setAttribute('v-on:change', this.attrs['v-on:change']);
                    control.setAttribute('name', this.name);
                    if (this.required)
                        control.setAttribute('required', null);
                    if (this.attrs.nolabel === 'placeholder')
                        control.setAttribute('placeholder', this.caption);
                    control.classList.add('input-dropdown', 'form-field');
                    if (this.filter)
                        control.setAttribute(':filter', this.filter);
                    return control;
                }
                listSpanTemplate() {
                    return `<a class="grid-field-readonly">{{ $filters.foreignKey(record.${this.name})||'${this.emptyText}' }}</a>`;
                }
                formSpanTemplate() {
                    return `<a :href="'#/app/?menu_id=${Katrid.webApp.currentMenu.id}&model=${this.model}&view_type=form&id=' + $filters.pk(record.${this.name})">{{ $filters.foreignKey(record.${this.name})||'${this.emptyText}' }} </a>`;
                }
                create() {
                    super.create();
                    this.defaultSearchLookup = '__icontains';
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
                    if (_.isArray(value))
                        return value[1];
                    else if (_.isObject(value))
                        return value.text;
                    return value;
                }
                toJSON(val) {
                    if (_.isArray(val))
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
            }
            Fields.ForeignKey = ForeignKey;
            Katrid.filter('foreignKey', value => value?.text);
            Katrid.filter('pk', value => value?.id);
            Fields.registry.ForeignKey = ForeignKey;
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class ImageField extends Fields.Field {
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
            Fields.ImageField = ImageField;
            Fields.registry.ImageField = ImageField;
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class ManyToManyField extends Fields.ForeignKey {
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
            Fields.ManyToManyField = ManyToManyField;
            Fields.registry.ManyToManyField = ManyToManyField;
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        var Fields;
        (function (Fields) {
            class OneToManyField extends Fields.Field {
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
                    if (info['view-mode'])
                        this.viewMode = info['view-mode'];
                }
                async loadViews() {
                    if (this._loaded)
                        return;
                    this._loaded = true;
                    let preLoadedViews = {};
                    let template = this.fieldEl.querySelector('template');
                    if (template)
                        for (let child of template.content.children)
                            preLoadedViews[child.tagName.toLowerCase()] = child.cloneNode(true);
                    let model = new Katrid.Services.Model(this.info.model);
                    let viewModes = { form: null };
                    viewModes[this.viewMode] = null;
                    let res = await model.loadViews({ views: viewModes });
                    this.views = res.views;
                    this.fields = res.fields;
                    Object.values(res.views).forEach((viewInfo) => {
                        let relField = viewInfo.fields[this.info.field];
                        if (relField) {
                            relField.required = false;
                            relField.visible = false;
                        }
                    });
                    for (let k of Object.keys(preLoadedViews)) {
                        if (!(k in res.views))
                            res.views[k] = { fields: res.fields };
                        res.views[k].content = preLoadedViews[k];
                        res.views[k].fields = res.fields;
                    }
                }
                setElement(el) {
                    if (el && el.hasAttribute('paste-allowed'))
                        this.pasteAllowed = true;
                }
                setValue(record, value) {
                    console.log('parse o2m', this, value);
                    if (value && value instanceof Array) {
                        let child = record.$record.dataSource.childByName(this.name);
                        value.map(obj => {
                            if (obj.action === 'CLEAR') {
                                for (let rec of child.vm.records)
                                    rec.$record.delete();
                                child.vm.records = [];
                                record.$record.dataSource.record[this.name] = [];
                            }
                            else if (obj.action === 'CREATE')
                                child.addRecord(obj.values);
                        });
                    }
                }
                formSpanTemplate() {
                    return;
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
                }
            }
            Fields.OneToManyField = OneToManyField;
            Fields.registry.OneToManyField = OneToManyField;
        })(Fields = Data.Fields || (Data.Fields = {}));
    })(Data = Katrid.Data || (Katrid.Data = {}));
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
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
      ${msg || ''}
      </div>
      <div class="modal-footer">
        <button type="button" name="btn-cancel" class="btn btn-outline-secondary" data-dismiss="modal">${Katrid.i18n.gettext('Close')}</button>
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
    <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
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
            function createModal(title, content) {
                let modal = document.createElement('div');
                modal.classList.add('modal');
                modal.tabIndex = -1;
                modal.setAttribute('role', 'dialog');
                modal.innerHTML = `<div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
      ${content || ''}
      </div>
      <div class="modal-footer">
        <button type="button" name="btn-ok" class="btn btn-primary">OK</button>
        <button type="button" name="btn-cancel" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
      </div>
    </div>
  </div>`;
                return modal;
            }
            Dialogs.createModal = createModal;
        })(Dialogs = Forms.Dialogs || (Forms.Dialogs = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class BaseField extends HTMLElement {
        }
        Forms.BaseField = BaseField;
        class InputField extends BaseField {
        }
        Forms.InputField = InputField;
        class StringField extends InputField {
        }
        Forms.StringField = StringField;
        class NumericField extends InputField {
        }
        Forms.NumericField = NumericField;
        class BooleanField extends InputField {
        }
        Forms.BooleanField = BooleanField;
        class TextField extends StringField {
        }
        Forms.TextField = TextField;
        class DateField extends InputField {
        }
        Forms.DateField = DateField;
        class DateTimeField extends DateField {
        }
        Forms.DateTimeField = DateTimeField;
        class TimeField extends InputField {
        }
        Forms.TimeField = TimeField;
        class ChoiceField extends InputField {
        }
        Forms.ChoiceField = ChoiceField;
        class AutoCompleteField extends ChoiceField {
        }
        Forms.AutoCompleteField = AutoCompleteField;
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
                for (let f of list.querySelectorAll(':scope > field')) {
                    this.addField(f);
                    f.remove();
                }
                this.tRow.setAttribute(':data-id', 'record.id');
                this.tRow.setAttribute('v-if', 'groups.length === 0');
                this.tRow.setAttribute('v-for', `(record, index) in ${records || 'records'}`);
                this.tRow.setAttribute(':selected', 'record.$selected');
                this.tRow.setAttribute('v-on:contextmenu', 'recordContextMenu(record, index, $event)');
                table.setAttribute('v-on:contextmenu', 'tableContextMenu($event)');
                if (this.options?.recordClick)
                    this.tRow.setAttribute('v-on:click', this.options.recordClick);
                else
                    this.tRow.setAttribute('v-on:click', 'recordClick(record, index, $event)');
                if (this.inlineEditor)
                    this.tRow.setAttribute(':class', `{
          'form-data-changing': (dataSource.changing && dataSource.recordIndex === index),
          'form-data-readonly': !(dataSource.changing && dataSource.recordIndex === index)
          }`);
                let ngTrClass = list.getAttribute('ng-tr-class');
                if (ngTrClass) {
                    if (!ngTrClass.startsWith('{'))
                        ngTrClass = '{' + ngTrClass + '}';
                    this.tRow.setAttribute('ng-class', ngTrClass);
                }
                if (options.allowGrouping) {
                    let tr = document.createElement('tr');
                    tr.setAttribute('v-if', 'groups.length > 0');
                    tr.setAttribute('v-for', '(record, index) in groups');
                    tr.setAttribute('v-on:click', 'if (record.$hasChildren) expandGroup(index, record); else recordClick(record, record.$index, $event);');
                    tr.setAttribute(':class', `{'group-header': record.$hasChildren}`);
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
                    td.innerHTML = `<i class="fas fa-fw" :class="{'fa-chevron-right': !record.$expanded, 'fa-chevron-down': record.$expanded}"></i> <span v-text="record.__str__"></span>`;
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
                return table;
            }
            addField(fld) {
                if (fld.hasAttribute('invisible'))
                    return;
                let fieldName = fld.getAttribute('name');
                let field = this.viewInfo.fields[fieldName];
                let html = fld.innerHTML;
                if ((field && field.visible) || !field)
                    this.columns.push(field);
                if (!fieldName || html) {
                    let td = document.createElement('td');
                    let th = document.createElement('th');
                    th.classList.add('grid-field-readonly');
                    if (field) {
                        th.innerHTML = `<span class="grid-field-readonly">${field.caption}</span>`;
                    }
                    else
                        th.innerText = fld.getAttribute('header');
                    td.innerHTML = html;
                    this.tHeadRow.append(th);
                    this.tRow.append(td);
                }
                else {
                    field.assign(fld);
                    if (field.visible === false)
                        return;
                    field.listCreate(this);
                }
            }
        }
        Forms.ListRenderer = ListRenderer;
        function dataTableContextMenu(evt) {
            console.log('context menu');
            evt.stopPropagation();
            evt.preventDefault();
            let menu = new Forms.ContextMenu();
            menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => copyToClipboard(evt.target.closest('table')));
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
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class SelectionHelper extends Array {
                constructor() {
                    super(...arguments);
                    this._allSelected = false;
                }
                get dataSource() {
                    return this._dataSource;
                }
                set dataSource(value) {
                    this._dataSource = value;
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
                    for (let rec of this.dataSource.records) {
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
            Views.SelectionHelper = SelectionHelper;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class Loader {
            constructor(templateCache) {
                this.$cache = templateCache;
            }
            getSource(name) {
                return {
                    src: this.$cache.get(name),
                    path: name,
                    noCache: false,
                };
            }
        }
        Forms.Loader = Loader;
        class Templates {
            constructor(app, templates) {
                this.app = app;
                Templates.env = new nunjucks.Environment(new Loader(app.$templateCache), { autoescape: false });
                let oldGet = app.$templateCache.get;
                app.$templateCache.get = (name) => {
                    return this.prepare(name, oldGet.call(this, name));
                };
                this.loadTemplates(app.$templateCache, templates);
                for (let [k, v] of Object.entries(Templates.PRE_LOADED_TEMPLATES))
                    app.$templateCache.put(k, v);
            }
            prepare(name, templ) {
                if (_.isUndefined(templ))
                    throw Error('Template not found: ' + name);
                if (templ.tagName === 'SCRIPT')
                    return templ.innerHTML;
                return templ;
            }
            compileTemplate(base, templ) {
                let el = $(base);
                templ = $(templ.innerHTML);
                for (let child of Array.from(templ))
                    if (child.tagName === 'JQUERY') {
                        let $child = $(child);
                        let sel = $child.attr('selector');
                        let op = $child.attr('operation');
                        if (sel)
                            sel = el.find(sel);
                        else
                            sel = el;
                        sel[op]($child[0].innerHTML);
                    }
                return el[0].innerHTML;
            }
            loadTemplates(templateCache, res) {
                let templateLst = {};
                let readTemplates = (el) => {
                    if (el.tagName === 'TEMPLATES')
                        Array.from(el.children).map(readTemplates);
                    else if (el.tagName === 'SCRIPT') {
                        templateLst[el.id] = el.innerHTML;
                    }
                };
                let preProcess = (el) => {
                    if (el.tagName === 'TEMPLATES')
                        Array.from(el.children).map(preProcess);
                    else if (el.tagName === 'SCRIPT') {
                        let base = el.getAttribute('extends');
                        let id = el.getAttribute('id') || base;
                        if (base) {
                            el = templateLst[base] + el;
                        }
                        else
                            id = el.id;
                        templateCache.put(id, el);
                    }
                };
                let parser = new DOMParser();
                let doc = parser.parseFromString(res, 'text/html');
                let root = doc.firstChild.childNodes[1].firstChild;
                readTemplates(root);
                preProcess(root);
            }
        }
        Templates.PRE_LOADED_TEMPLATES = {};
        Forms.Templates = Templates;
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
        UI.uiKatrid = angular.module('ui.katrid', []);
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            let ID = 0;
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            let compileButtons = (container) => {
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
            };
            class ClientView {
                constructor(action) {
                    this.action = action;
                }
            }
            Views.ClientView = ClientView;
            class ActionViewElement extends HTMLElement {
                connectedCallback() {
                    this.classList.add('action-view');
                }
            }
            Views.ActionViewElement = ActionViewElement;
            customElements.define('action-view', ActionViewElement);
            class ActionView {
                constructor(action, scope, view, content) {
                    this.action = action;
                    this.view = view;
                    this.toolbar = true;
                    this.content = content;
                }
                getTemplateContext() {
                    return { content: this.content };
                }
                renderTo(el) {
                }
            }
            Views.ActionView = ActionView;
            class View extends ActionView {
                getBreadcrumb() {
                    let html = `<ol class="breadcrumb">`;
                    let i = 0;
                    for (let h of Katrid.webApp.actionManager.actions) {
                        if ((h instanceof Katrid.Actions.WindowAction) && (i === 0 && h.viewModes.length > 1))
                            html += `<li class="breadcrumb-item"><a href="#" ng-click="action.backTo(0, 0)">${h.info.display_name}</a></li>`;
                        i++;
                        if ((h instanceof Katrid.Actions.WindowAction) && (Katrid.webApp.actionManager.length > i && h.viewType === 'form'))
                            html += `<li class="breadcrumb-item"><a href="#" ng-click="action.backTo(${i - 1}, 'form')">${h.scope.record.record_name}</a></li>`;
                    }
                    if (this.type === 'form')
                        html += `<li class="breadcrumb-item">{{ self }}</li>`;
                    console.log(html);
                    return html + '</ol>';
                }
                render() {
                }
                getViewButtons() {
                    let btns = Object.entries(View.buttons).map((btn) => this.view.viewModes.includes(btn[0]) ? btn[1] : '').join('');
                    if (btns)
                        btns = `<div class="btn-group">${btns}</div>`;
                    return btns;
                }
            }
            View.buttons = {};
            Views.View = View;
            class WindowView {
                constructor(config) {
                    this.readonly = false;
                    this.toolbarVisible = true;
                    this.scripts = [];
                    this.config = config;
                    this.action = config.action;
                    this.model = config.model || this.action.model;
                    this.viewInfo = config.viewInfo;
                    this.fields = config.fields || this.viewInfo.fields;
                    this.caption = config.caption;
                    this.create();
                }
                create() {
                    this.context = {};
                    if (this.config.context)
                        Object.assign(this.context, this.config.context);
                    this._dataSource = new Katrid.Data.DataSource({
                        master: this.config?.master,
                        field: this.config?.field,
                        fields: this.fields,
                        model: this.model,
                        action: this.action,
                        readonly: this.readonly,
                    });
                    this._dataSource.dataCallback = (data) => this.dataCallback(data);
                    this._dataSource.requestCallback = (pending) => this.vm.pendingRequest = pending;
                }
                get content() {
                    return this.viewInfo.content;
                }
                get dataSource() {
                    return this._dataSource;
                }
                setSearchParams(params) {
                }
                createToolbarButtons(container) {
                    let btnCreate = document.createElement('button');
                    btnCreate.type = 'button';
                    btnCreate.classList.add('btn', 'btn-primary', 'btn-action-create');
                    btnCreate.innerText = _.gettext('Create');
                    btnCreate.setAttribute('v-on:click', 'createNew()');
                    let parent = container.querySelector('.toolbar-action-buttons');
                    parent.append(btnCreate);
                    return parent;
                }
                get template() {
                    if (this._template)
                        return this._template;
                    let content = this.content;
                    let template;
                    if (content instanceof HTMLElement)
                        template = content.cloneNode(true);
                    else
                        template = this.viewInfo.template;
                    let scripts = template.querySelectorAll('script');
                    for (let script of scripts) {
                        this.scripts.push(script.text);
                        script.parentNode.removeChild(script);
                    }
                    this._template = template;
                    return this._template;
                }
                renderTemplate(template) {
                    return template;
                }
                createToolbar() {
                    return document.createElement('div');
                }
                createBreadcrumbs(container) {
                    let nav = container.querySelector('.breadcrumb-nav');
                    let ol = document.createElement('ol');
                    ol.classList.add('breadcrumb');
                    this.action.breadcrumbs.forEach((bc, index) => ol.append(bc.render(index)));
                    nav.append(ol);
                    return nav;
                }
                createActionView(content) {
                    let actionView = document.createElement('action-view');
                    let viewContent = document.createElement('div');
                    viewContent.classList.add('action-view-content', 'content-scroll');
                    if (this.toolbarVisible)
                        actionView.append(this.createToolbar());
                    viewContent.append(content);
                    actionView.append(viewContent);
                    this.el = this.templateView = actionView;
                    return actionView;
                }
                render() {
                    let template = this.renderTemplate(this.template);
                    this.createActionView(template);
                    this.applyCustomTags(this.templateView);
                }
                renderTo(container) {
                    this.render();
                    this.afterRender(this.templateView);
                    if (container)
                        container.append(this.actionView);
                    return this.actionView;
                }
                applyCustomTags(template) {
                    Views.CustomTag.render(this, template);
                }
                afterRender(el) {
                    this.vm = this.createVm(el);
                    return this.actionView;
                }
                ready() {
                }
                data() {
                    return {};
                }
                createVm(el) {
                    let me = this;
                    let recordClick = this.config.recordClick || function (record, index, event) {
                        me.action.record = record;
                        me.action.recordId = record.id;
                        me.action.recordIndex = index;
                        history.pushState(null, '', me.action.makeUrl('form'));
                        me.action.showView('form');
                        return;
                        let params = {
                            id: record.id,
                            model: me.action.info.model,
                            action: me.action.info.id,
                            view_type: 'form',
                            menu_id: Katrid.webApp.currentMenu.id,
                        };
                        if (event && event.ctrlKey) {
                            const url = '#/app/?' + $.param(params);
                            window.open(url);
                            return;
                        }
                        else
                            Katrid.app.loadPage('#/app/?' + $.param(params), false);
                    };
                    let vm = Katrid.createView({
                        data() {
                            let data = {
                                allSelected: false,
                                selection: [],
                                action: me.action,
                                record: {},
                                records: [],
                                view: me.viewInfo,
                                actionView: me,
                                pendingRequest: false,
                                recordCount: 0,
                                groups: [],
                                dataOffset: 0,
                                dataOffsetLimit: 0,
                                selectionLength: 0,
                                loading: false,
                                $result: null,
                            };
                            Object.assign(data, me.data());
                            return data;
                        },
                        methods: {
                            createNew() {
                                me.action.recordIndex = -1;
                                me.action.showView('form');
                                setTimeout(() => {
                                    me.action.view.dataSource.insert();
                                });
                            },
                            actionRefresh() {
                                me.dataSource.refresh();
                            },
                            backTo(index, viewType) {
                                me.action.back(index);
                            },
                            recordClick,
                            actionClick(selection, methodName, event) {
                                me.action.formButtonClick(selection.map(obj => obj.id), methodName);
                            },
                            nextPage() {
                                me.dataSource.nextPage();
                            },
                            prevPage() {
                                me.dataSource.prevPage();
                            },
                            selectToggle(record) {
                                Views.selectionSelectToggle.call(this, ...arguments);
                            },
                            toggleAll(sel) {
                                Views.selectionToggleAll.call(this, ...arguments);
                            },
                            unselectAll() {
                                this.toggleAll(false);
                            },
                            recordContextMenu(record, index, event) {
                                Views.listRecordContextMenu.call(this, ...arguments);
                            },
                            sendFile(name, file) {
                                return Katrid.Services.Upload.sendFile({ model: this.action.model, method: name, file, vm: this });
                            },
                            expandGroup(index, group) {
                                group.$expanded = !group.$expanded;
                                if (group.$expanded)
                                    me.dataSource.expandGroup(index, group);
                                else
                                    me.dataSource.collapseGroup(index, group);
                            },
                            async autoReport() {
                                let svc = new Katrid.Services.Model('ui.action.report');
                                svc.rpc('auto_report', [me.model.name]);
                            }
                        },
                    }).mount(el);
                    this.dataSource.vm = vm;
                    this.dataSource.stateChangeCallback = (state) => {
                        this.vm.state = state;
                        this.vm.changing = this.dataSource.changing;
                        this.vm.editing = this.dataSource.editing;
                        this.vm.inserting = this.dataSource.inserting;
                        this.vm.browsing = this.dataSource.browsing;
                        this.vm.loading = !this.dataSource.browsing;
                    };
                    this.actionView = el;
                    this.actionView.view = this;
                    return vm;
                }
                refresh() {
                    this.dataSource.refresh();
                }
                getSelection() {
                    if (this.vm.selection)
                        return this.dataSource.records.map((obj) => obj.id);
                }
                dataCallback(data) {
                    this.vm.dataOffset = this._dataSource.offset;
                    this.vm.dataOffsetLimit = this._dataSource.offsetLimit;
                    this.vm.recordCount = this._dataSource.recordCount;
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
                    compileButtons(container);
                    if (headerEl) {
                        headerEl.remove();
                        this._mergeHeader(parent, headerEl);
                    }
                    return parent;
                }
            }
            Views.WindowView = WindowView;
            class RecordCollectionView extends WindowView {
                constructor() {
                    super(...arguments);
                    this.readonly = true;
                    this.autoLoad = true;
                }
                create() {
                    super.create();
                    if ('auto_load' in this.viewInfo)
                        this.autoLoad = this.viewInfo.auto_load;
                }
                async applyGroups(groups, params) {
                    let res = await this.dataSource.groupBy(groups, params);
                    await this.groupBy(res);
                }
                ready() {
                    if (this.autoLoad && !this.action.context.search_default)
                        this.dataSource.open();
                    this.action.dataSource = this._dataSource;
                }
                async setSearchParams(params) {
                    let p = {};
                    if (this.action.info?.domain)
                        p = JSON.parse(this.action.info.domain);
                    for (let [k, v] of Object.entries(p)) {
                        let arg = {};
                        arg[k] = v;
                        params.push(arg);
                    }
                    await this.dataSource.search(params);
                }
                createToolbar() {
                    let templ = `<div class="data-heading panel panel-default">
      <div class="panel-body">
        <div class="row">
        <div class="col-md-6">
        
          <div class="breadcrumb-nav"></div>
          <p class="help-block"></p>
          <div class="toolbar">
            <div class="toolbar-action-buttons"></div>
        </div>
      </div>
          <search-view class="col-md-6"/>
        </div>
      </div>
    </div>`;
                    let toolbar = $(templ)[0];
                    this.createBreadcrumbs(toolbar);
                    this.createToolbarButtons(toolbar);
                    return toolbar;
                }
                createToolbarButtons(container) {
                    let parent = super.createToolbarButtons(container);
                    if (this.viewInfo.toolbar?.print) {
                        let btnPrint = document.createElement('div');
                        btnPrint.classList.add('btn-group');
                        btnPrint.innerHTML = `<button type="button" class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true">
        ${_.gettext('Print')} <span class="caret"></span>
      </button>
      <div class="dropdown-menu">
        <a class="dropdown-item" v-on:click="autoReport()">${_.gettext('Auto Report')}</a>
      </div>`;
                        let dropdown = btnPrint.querySelector('.dropdown-menu');
                        for (let bindingAction of this.viewInfo.toolbar.print) {
                            let a = document.createElement('a');
                            a.classList.add('dropdown-item');
                            a.setAttribute('data-id', bindingAction.id);
                            a.innerText = bindingAction.name;
                            dropdown.append(a);
                        }
                        parent.append(btnPrint);
                    }
                    let btnRefresh = document.createElement('button');
                    btnRefresh.type = 'button';
                    btnRefresh.classList.add('btn', 'toolbtn');
                    btnRefresh.innerHTML = '<i class="fas fa-redo-alt"></i>';
                    btnRefresh.title = _.gettext('Refresh');
                    btnRefresh.setAttribute('v-on:click', 'actionRefresh()');
                    parent.append(btnRefresh);
                    let btnActions = document.createElement('div');
                    btnActions.classList.add('btn-group');
                    btnActions.innerHTML = `<div class="dropdown">
        <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" v-show="selectionLength"
                aria-haspopup="true">
          ${_.gettext('Action')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu dropdown-menu-actions">
          <a class="dropdown-item" v-on:click="action.deleteSelection()">
            <i class="fa fa-fw fa-trash-o"></i> ${_.gettext('Delete')}
          </a>
          <a class="dropdown-item" v-on:click="action.copy()">
            <i class="fa fa-fw fa-files-o"></i>
            ${_.gettext('Duplicate')}
          </a>
          <!-- replace-actions -->
        </div>
      </div>`;
                    parent.append(btnActions);
                    return parent;
                }
            }
            Views.RecordCollectionView = RecordCollectionView;
            class ViewElement extends HTMLElement {
                connectedCallback() {
                    this.create();
                }
                create() {
                }
                get action() {
                    return this._action;
                }
                set action(value) {
                    this._action = value;
                }
            }
            Views.ViewElement = ViewElement;
            class WindowElement extends ViewElement {
                setView(view) {
                    this._view = view;
                    this._action = view.action;
                }
                get action() {
                    return this._action;
                }
            }
            Views.WindowElement = WindowElement;
            Views.searchModes = ['list', 'card'];
            Views.registry = {};
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Dialogs;
        (function (Dialogs) {
            class Dialog {
                constructor(options) {
                    this.templateUrl = 'dialog.base';
                    this.scope.isDialog = true;
                }
                render() {
                    let el = Katrid.app.getTemplate(this.templateUrl).replace('<!-- replace-content -->', this.content);
                    return $(el);
                }
                show() {
                    if (!this.el) {
                        this.el = $(this.render());
                        this.root = this.el.find('.modal-dialog-body');
                        this.el.find('form').first().addClass('row');
                        this.$compile(this.el)(this.scope);
                    }
                    this.el.modal('show')
                        .on('shown.bs.modal', () => Katrid.UI.uiKatrid.setFocus(this.el.find('.form-field').first()));
                    return this.el;
                }
            }
            Dialogs.Dialog = Dialog;
            class Window extends Dialog {
                constructor(options) {
                    super(options);
                    this.scope.parentAction = options.action;
                    this.scope.views = {
                        form: options.view
                    };
                    this.dialogTitle = (options && options.title) || Katrid.i18n.gettext('Create: ');
                    this.scope.view = this.view = options.view;
                    this.scope.model = options.model;
                    this.options = options;
                    this.action = {
                        model: options.model,
                        context: {},
                        scope: this.scope,
                        saveAndClose: async () => {
                            let data = await this.scope.dataSource.save();
                            this.dialog.modal('hide');
                            this.scope.$emit('saveAndClose', this.scope, data);
                        }
                    };
                    this.scope.action = this.action;
                }
            }
            Dialogs.Window = Window;
        })(Dialogs = Forms.Dialogs || (Forms.Dialogs = {}));
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
                                let svc = new Katrid.Services.Model(serviceName);
                                let res;
                                if (field)
                                    res = svc.getFieldChoices({ field, term: query.term, kwargs: data.kwargs });
                                else
                                    res = new Katrid.Services.Model(modelChoices).searchByName(data);
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
            Katrid.component('button-attachments', {
                render() {
                    let templ = `<div class="dropdown">
        <button id="attachments-button"
                type="button" class="btn btn-outline-secondary dropdown-toggle"
                data-toggle="dropdown" aria-haspopup="true">
          <span v-if="!attachments.length">${_.gettext('Attachments')} </span>
          <span
              v-if="attachments.length">{{ $filters.sprintf('${_.gettext('%d Attachment(s)')}', attachments.length) }}
          </span>
          <span class="caret"></span>
        </button>
        <div class="dropdown-menu attachments-menu">
          <a class="dropdown-item position-relative" v-for="(attachment, index) in attachments"
             :href="attachment.download_url">
            {{ attachment.name }} <span
              class="fa fa-times remove-attachment-button" title="${_.gettext('Delete attachment')}"
              v-on:click.prevent.stop="deleteAttachment(index)"></span>
          </a>
          <div role="separator" class="dropdown-divider" v-show="attachments.length"></div>
          <a class="dropdown-item" onclick="$(this).next().click();">
            ${_.gettext('Add...')}
          </a>
          <input type="file" class="input-file-hidden" multiple="multiple"
                 v-on:change="upload($event)"/>
        </div>
      </div>`;
                    return Vue.compile(templ)(this);
                },
                mounted() {
                    this.$actionView = this.$el.closest('action-view');
                    let timeout;
                    this.$recordLoadedHook = async (evt) => {
                        clearTimeout(timeout);
                        let rec = evt.detail.record;
                        if (rec && rec.id)
                            timeout = setTimeout(async () => {
                                let model = new Katrid.Services.Model('content.attachment');
                                let res = await model.search({ where: { model: this.$parent.action.model.name, object_id: evt.detail.record.id }, count: false });
                                if (res && res.data)
                                    this.attachments = res.data;
                            }, 1000);
                        else
                            setTimeout(() => {
                                this.attachments = [];
                            });
                    };
                    this.$actionView.addEventListener("recordLoaded", this.$recordLoadedHook);
                },
                unmounted() {
                    this.$actionView.removeEventListener("recordLoaded", this.$recordLoadedHook);
                },
                methods: {
                    async upload(event) {
                        let res = await Katrid.Services.Attachments.upload(event.target, {
                            model: this.$parent.action.model,
                            recordId: this.$parent.action.recordId,
                        });
                        if (!this.attachments)
                            this.attachments = [];
                        if (res && res.result)
                            for (let obj of res.result)
                                this.attachments.push(obj);
                    },
                    deleteAttachment(index) {
                        this.$parent.action.deleteAttachment(this.attachments, index);
                    }
                },
                data() {
                    return {
                        attachments: [],
                    };
                }
            });
            class AttachmentsButton extends HTMLElement {
                connectedCallback() {
                    this.innerHTML = `
      <div class="dropdown">
        <button id="attachments-button" v-show="!$parent.dataSource.inserting"
                type="button" class="btn btn-outline-secondary dropdown-toggle"
                data-toggle="dropdown" aria-haspopup="true">
          <span v-if="!attachments.length">${_.gettext('Attachments')} </span>
          <span
              v-if="attachments.length">{ _.sprintf(_.gettext('%d Attachment(s)'), attachments.length) }</span>
          <span class="caret"></span>
        </button>
        <div class="dropdown-menu attachments-menu">
          <a class="dropdown-item position-relative" v-for="attachment in attachments"
             :href="attachment.download_url">
            {{ attachment.name }} <span
              class="fa fa-times remove-attachment-button" title="${_.gettext('Delete attachment')}"
              v-on:click.prevent.stop="action.deleteAttachment(attachments, $index)"></span>
          </a>
          <div role="separator" class="dropdown-divider" v-show="attachments.length"></div>
          <a class="dropdown-item" onclick="$(this).next().click();">
            ${_.gettext('Add...')}
          </a>
          <input type="file" class="input-file-hidden" multiple="multiple"
                 onchange="Katrid.Services.Attachments.upload(this)"/>
        </div>
      </div>
          
      `;
                    this.actionView = this.closest('action-view');
                    this._recordLoadedHook = async (evt) => {
                        clearTimeout(this._timeout);
                        let rec = evt.detail.record;
                        if (rec && rec.id)
                            this._timeout = setTimeout(async () => {
                                let model = new Katrid.Services.Model('content.attachment');
                                let res = await model.search({ where: { model: this.actionView.action.model.name, object_id: evt.detail.record.id }, count: false });
                                if (res && res.data)
                                    this.actionView.action.attachments = res.data;
                            }, 1000);
                        else
                            setTimeout(() => {
                                this.actionView.action.attachments = [];
                            });
                    };
                    this.actionView.addEventListener("recordLoaded", this._recordLoadedHook);
                }
                disconnectedCallback() {
                    this.actionView.removeEventListener("recordLoaded", this._recordLoadedHook);
                }
                renderItems(items) {
                    for (let item of items)
                        this.renderItem(item);
                }
                renderItem(item) {
                    let a = document.createElement('a');
                    a.classList.add('dropdown-item position-relative');
                    a.setAttribute('href', item.download_url);
                    a.innerText = item.name;
                    a.innerHTML = `<span class="fa fa-times remove-attachment-button" title="${Katrid.i18n.gettext('Delete attachment')}"></span>`;
                    a.querySelector('span').onclick = (evt) => {
                        evt.preventDefault();
                        this.onDeleteAttachment(item);
                        evt.stopPropagation();
                    };
                }
                onDeleteAttachment(item) {
                }
            }
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            Katrid.component('input-date', {
                props: ['modelValue'],
                template: '<div><slot></slot></div>',
                mounted() {
                    let vm = this;
                    let mask = '99/99/9999';
                    let format = vm.$attrs['date-picker'] || 'L';
                    let $format;
                    if (format === 'L LT') {
                        mask = '99/99/9999 99:99';
                        $format = Katrid.i18n.formats.shortDateTimeFormat;
                    }
                    else
                        $format = Katrid.i18n.formats.shortDateFormat;
                    let input = vm.$el.querySelector('input');
                    vm.$input = input;
                    this.$lastValue = '';
                    $(input).inputmask({
                        mask,
                        insertMode: false,
                        onincomplete: function () {
                            vm.$emit('update:modelValue', applyValue(input.value));
                        },
                        oncompleted: function () {
                            vm.$emit('update:modelValue', applyValue(input.value));
                        }
                    });
                    this.$format = $format;
                    let applyValue = (value) => {
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
                    let calendar = $(vm.$el).datetimepicker({
                        useCurrent: false,
                        format,
                        icons: {
                            time: 'fa fa-clock',
                        },
                    })
                        .on('dp.show', function (evt) {
                        calendar.datetimepicker('date', applyValue(input.value));
                    })
                        .on('dp.change', function (evt) {
                        calendar.datetimepicker('hide');
                        vm.$emit('update:modelValue', applyValue(input.value));
                    })
                        .on('dp.hide', (evt) => {
                        vm.$emit('update:modelValue', applyValue(input.value));
                    });
                },
                watch: {
                    modelValue(value) {
                        if (value) {
                            if ((this.$format === 'L') && ((this.$input.value === '') || (value !== this.$lastValue)))
                                this.$input.value = moment(value).format(this.$format);
                            if ((this.$input.value === '') || (value !== this.$lastValue))
                                this.$input.value = moment(value).format(this.$format);
                        }
                        else
                            this.$input.value = '';
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
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            Katrid.component('input-decimal', {
                props: ['modelValue'],
                template: '<input>',
                mounted() {
                    let vm = this;
                    let decimal = vm.$attrs['input-decimal'];
                    let time;
                    let opts = {
                        alias: 'numeric',
                        groupSeparator: '.',
                        unmaskAsNumber: true,
                        radixPoint: ',',
                        autoGroup: true,
                        digitsOptional: false,
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
                            }, 500);
                        },
                    };
                    if (decimal)
                        opts.digits = parseInt(decimal);
                    $(vm.$el).inputmask(opts).blur(function () {
                        clearTimeout(time);
                        vm.$changing = false;
                        let v = parseFloat($(this).inputmask('unmaskedvalue'));
                        vm.$emit('update:modelValue', v);
                        vm.$emit('change', this.value);
                    });
                },
                watch: {
                    modelValue: function (value) {
                        if (value && !this.$changing) {
                            console.log('watch value', value);
                            if (value !== $(this.$el).inputmask('unmaskedvalue'))
                                $(this.$el).inputmask('setvalue', value);
                        }
                        else if (!value)
                            $(this.$el).val('');
                    }
                }
            });
        })(Controls = Forms.Controls || (Forms.Controls = {}));
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
                this.waitTemplate = () => `<div class="dropdown-wait text-muted"><i class="fas fa-spinner fa-spin"></i> ${_.gettext('Loading...')}</div>`;
                this._loading = false;
                this.delay = 500;
                this._elements = [];
                this.mouseDown = false;
                this.el = document.createElement('div');
                this.el.classList.add('dropdown-menu');
                this.input = input;
                this.target = this.options?.target || input;
                this.input = input;
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
                else if (_.isArray(this._source)) {
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
        class BaseAutoComplete extends HTMLElement {
            constructor() {
                super(...arguments);
                this.menu = null;
                this.closeOnChange = true;
                this.term = '';
                this.multiple = false;
                this._created = false;
                this._tags = [];
                this._facets = [];
            }
            connectedCallback() {
                this.create();
            }
            create() {
                if (this._created)
                    return;
                this._created = true;
                this.classList.add('input-autocomplete', 'input-dropdown');
                let append = '';
                let prepend = '';
                let name = this.getAttribute('name');
                let model = this.getAttribute('data-model');
                if (this.hasAttribute('allow-open'))
                    append = `<span class="fa fa-fw fa-folder-open autocomplete-open" v-on:click="openObject('${model}', record.${name}.id)"></span>`;
                this.classList.add('form-control');
                if (this.multiple) {
                    prepend = `<div class="input-dropdown">`;
                    append = '</div>' + append;
                    this.classList.add('multiple');
                }
                this.innerHTML = `${prepend}<input class="form-field" autocomplete="nope" spellcheck="false"> <span class="caret"></span>${append}`;
                this.input = this.querySelector('input');
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
                    this.selectedItem = item;
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
        UI.BaseAutoComplete = BaseAutoComplete;
        class InputAutoComplete extends BaseAutoComplete {
            create() {
                super.create();
                let model = this.getAttribute('data-model');
                let svc = new Katrid.Services.Model(model);
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
                create(field) {
                    if (this._created)
                        return;
                    super.create();
                    this.allowCreateNew = this.getAttribute('allow-create') !== 'false';
                    this.allowAdvancedSearch = this.getAttribute('allow-search') !== 'false';
                    let name = this.getAttribute('name');
                    this.field = field;
                    this.actionView = this.closest('action-view');
                    this.setSource(async (query) => {
                        let domain = this.filter || this.field.filter;
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
                        if (this.actionView?.view?.model) {
                            let res = await this.actionView.view.model.getFieldChoices({
                                field: this.field.name, term: query.term, kwargs: data.kwargs
                            });
                            let items = res.items;
                            if (this.allowAdvancedSearch)
                                items.push({
                                    template: `<a class="dropdown-item action-search-more"><i>${_.gettext('Search more...')}</i></a>`,
                                    click: async (event) => {
                                        event.stopPropagation();
                                        this.hideMenu();
                                        let res = await Katrid.Forms.Views.ListViewDialog.showDialog({
                                            model: field.model,
                                            caption: field.caption,
                                        });
                                        if (res) {
                                            data.kwargs.ids = res.id;
                                            let value = await this.actionView.view.model.getFieldChoices({
                                                field: this.field.name, term: '', kwargs: data.kwargs
                                            });
                                            if (value.items.length)
                                                this.setValue(value.items[0]);
                                        }
                                    },
                                });
                            if (this.allowCreateNew)
                                items.push({
                                    template: `<a class="dropdown-item action-create-new"><i>${_.gettext('Create new...')}</i></a>`, click: async (event) => {
                                        event.stopPropagation();
                                        this.hideMenu();
                                        let dlg = await Katrid.Forms.Views.FormViewDialog.createNew({ model: field.model });
                                        let res = await dlg.showDialog();
                                        if (res) {
                                            let newRec = await dlg.dataSource.save();
                                            this.setValue({ id: newRec.id, text: newRec.record_name });
                                        }
                                    }
                                });
                            return items;
                        }
                        else {
                            let scope = angular.element(this.parentElement).scope();
                            if (scope.model) {
                                let res = await scope.model.getFieldChoices({
                                    field: this.field.name, term: query.term, kwargs: data.kwargs
                                });
                                return res.items;
                            }
                        }
                    });
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
                    this.$field = this.$parent.view.fields[this.$attrs.name];
                    this.$el.create(this.$field);
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
            Katrid.component('field-tags', {
                props: ['modelValue'],
                template: '<input-foreignkey class="input-autocomplete"><slot/></input-foreignkey>',
                mounted() {
                    this.$field = this.$parent.view.fields[this.$attrs.name];
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
        var Controls;
        (function (Controls) {
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
        })(Controls = Forms.Controls || (Forms.Controls = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Controls;
        (function (Controls) {
            class FormField {
                constructor(name) {
                    this.name = name;
                    this._dirty = false;
                    this._touched = false;
                    this._valid = true;
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
                        this.form.touched = true;
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
            Controls.FormField = FormField;
            class Form {
                constructor(el) {
                    this.el = el;
                    this.fields = {};
                    this.touched = false;
                    this.valid = true;
                    this.dirty = false;
                    this._loading = false;
                }
                setFieldValue(field, value) {
                    let f = this.fields[field.name];
                    if (f)
                        f.dirty = true;
                    this.dirty = true;
                }
                setValid(value) {
                    this.valid = value;
                    if (!value)
                        Object.values(this.fields).forEach(field => field.valid = true);
                }
                reset() {
                    if (this.dirty) {
                        this.dirty = false;
                        this.touched = false;
                        Object.values(this.fields).forEach(field => field.reset());
                    }
                }
                setLoading(value) {
                    this._loading = value;
                }
            }
            Controls.Form = Form;
            Katrid.directive('form', {
                mounted(el) {
                    el.classList.add('v-form');
                    let form = el.$form = new Form(el);
                    el.querySelectorAll('.form-field-section').forEach(child => {
                        let formField = child;
                        let field = formField.$field;
                        field.form = form;
                        form.fields[field.name] = field;
                    });
                }
            });
            Katrid.directive('form-field', {
                mounted(el, binding, vnode) {
                    let field = el.$field = new FormField(el.getAttribute('name'));
                    field.el = el;
                    field.control = el.querySelector('.form-control');
                    if (field.control) {
                        field.control.addEventListener('focusin', () => field.touched = true);
                        if (field.control.tagName === 'INPUT')
                            field.control.addEventListener('mouseup', () => field.control.select());
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
        var Controls;
        (function (Controls) {
            function renderOneToManyField(field) {
                let grid = document.createElement('div');
                let toolbar = document.createElement('div');
                toolbar.classList.add('grid-toolbar');
                toolbar.innerHTML = `
<button class="btn btn-sm btn-outline-secondary btn-action-add" type="button" v-on:click="createNew()">${_.gettext('Add')}</button>
<button class="btn btn-sm btn-outline-secondary" type="button" v-on:click="deleteSelection()" v-show="selectionLength">${_.gettext('Delete')}</button>
`;
                grid.append(toolbar);
                let viewInfo = field.views[field.viewMode];
                if (field.viewMode === 'list') {
                    let renderer = new Forms.ListRenderer(viewInfo, { rowSelector: true, allowGrouping: false });
                    grid.setAttribute('field-name', field.name);
                    let table;
                    if (field['$$listTemplateCache'] === undefined) {
                        table = renderer.render(viewInfo.template, 'records');
                        field['$$listTemplate'] = table;
                    }
                    else
                        table = field['$$listTemplateCache'];
                    let div = document.createElement('div');
                    div.classList.add('table-responsive');
                    div.append(table);
                    grid.append(div);
                    grid.$columns = renderer.columns;
                }
                else if (field.viewMode == 'card') {
                    let renderer = new Katrid.Forms.Views.CardRenderer(viewInfo.fields);
                    grid.setAttribute('field-name', field.name);
                    let table = renderer.render(viewInfo.template);
                    grid.append(table);
                }
                return grid;
            }
            class SubWindowAction {
                constructor(config) {
                    this.model = config.model;
                }
            }
            async function createDialog(config) {
                let formInfo = config.field.views.form;
                await formInfo.loadPendingViews();
                let relField = formInfo.fields[config.field.info.field];
                if (relField)
                    relField.visible = false;
                let view = new Katrid.Forms.Views.FormViewDialog({
                    master: config.master,
                    field: config.field,
                    action: {
                        model: new Katrid.Services.Model(config.field.model),
                        recordId: config.record?.id,
                        record: config.record,
                        records: [config.record],
                        recordIndex: config.recordIndex,
                    },
                    viewInfo: formInfo,
                });
                view.renderTo();
                return view;
            }
            Katrid.component('onetomany-field', {
                props: ['modelValue'],
                render() {
                    let name = this.$attrs.name;
                    let field = this.$parent.view.fields[name];
                    let viewMode = field.viewMode;
                    if (!this.$grid)
                        this.$grid = renderOneToManyField(field);
                    this.view = field.views[viewMode];
                    this.$data.field = field;
                    return Vue.compile(this.$grid)(this);
                },
                data() {
                    return {
                        allSelected: false,
                        selection: [],
                        action: {},
                        record: {},
                        records: [],
                        groups: [],
                        view: null,
                        pendingRequest: false,
                        recordCount: 0,
                        dataOffset: 0,
                        dataOffsetLimit: 0,
                        selectionLength: 0,
                        parent: null,
                        $editing: false,
                        loading: false,
                    };
                },
                methods: {
                    async recordClick(record, index, event) {
                        if (this.$editing)
                            return;
                        try {
                            this.$editing = true;
                            let form = await createDialog({
                                field: this.field, record, index,
                                master: this.$data.dataSource.masterSource,
                            });
                            let rec = record;
                            form.dataSource.record = rec;
                            form.vm.parent = this.$parent;
                            record = await record.$record.load(record);
                            let res = await form.showDialog({ edit: this.$parent.changing, backdrop: 'static' });
                            if (res) {
                                if (res.$record.state === Katrid.Data.RecordState.destroyed)
                                    this.records.splice(index, 1);
                                else {
                                    this.records[index] = res;
                                    this.record = res;
                                }
                                this.$emit('change', this.record);
                            }
                        }
                        finally {
                            this.$editing = false;
                        }
                    },
                    recordContextMenu(record, index, event) {
                        Katrid.Forms.Views.listRecordContextMenu.call(this, ...arguments);
                    },
                    tableContextMenu(event) {
                        Katrid.Forms.Views.tableContextMenu.call(this, ...arguments);
                    },
                    async createNew() {
                        if (this.$editing)
                            return;
                        try {
                            this.$editing = true;
                            let form = await createDialog({
                                field: this.field,
                                master: this.$data.dataSource.masterSource,
                            });
                            form.vm.parent = this.$parent;
                            form.dataSource.insert();
                            let res = await form.showDialog({ backdrop: 'static' });
                            if (res) {
                                this.records.push(res);
                                this.record = res;
                                this.$emit('change', this.record);
                            }
                        }
                        finally {
                            this.$editing = false;
                        }
                    },
                    toggleAll() {
                        Katrid.Forms.Views.selectionToggleAll.call(this, ...arguments);
                    },
                    selectToggle(record) {
                        Katrid.Forms.Views.selectionSelectToggle.call(this, ...arguments);
                    },
                    unselectAll() {
                        Katrid.Forms.Views.unselectAll.call(this, ...arguments);
                    },
                    deleteSelection() {
                        Katrid.Forms.Views.selectionDelete.call(this, ...arguments);
                    },
                },
                mounted() {
                    let model = new Katrid.Services.Model(this.field.model);
                    let actionView = this.$parent.actionView;
                    this.$data.dataSource = new Katrid.Data.DataSource({
                        vm: this,
                        model,
                        fields: this.$data.field.fields,
                        field: this.$data.field,
                        master: actionView.dataSource,
                        action: {},
                        pageLimit: this.$data.field.info.page_limit,
                    });
                    this.$data.dataSource.stateChangeCallback = (state) => {
                        this.loading = this.$data.dataSource.loading;
                    };
                    this.$selection = new Katrid.Forms.Views.SelectionHelper();
                    this.$selection.dataSource = this.$data.dataSource;
                    let field = this.$data.field;
                },
                watch: {
                    records(value) {
                        this.allSelected = false;
                    },
                },
                directives: Katrid.directivesRegistry,
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
        var Views;
        (function (Views) {
            class CustomView extends HTMLElement {
            }
            Views.CustomView = CustomView;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class CardRenderer {
                constructor(fields) {
                    this.fields = fields;
                }
                renderField(fieldEl) {
                    let name = fieldEl.getAttribute('name');
                    if (name) {
                        let fld = this.fields[name];
                        if (fld) {
                            fld.view = this;
                            fld.assign(fieldEl);
                            if (fld.visible) {
                                return fld.cardCreate();
                            }
                        }
                        else
                            console.error(`Field "${name}" not found`);
                    }
                }
                render(template) {
                    let templ = Katrid.element(`
    <div class="content no-padding">
      <div class="data-panel col-12">
      
        <div class="card-view kanban" v-if="groups.length > 0" card-draggable=".card-group" card-group>

          <div v-for="group in groups" class="card-group sortable-item" :data-id="group._paramValue" :data-group-name="group._paramName">
            <div class="card-header margin-bottom-8">
              <div class="pull-right">
                <button class="btn" v-on:click="cardShowAddGroupItemDlg = true"><i class="fa fa-plus"></i></button>
              </div>
              <h4>{{group.__str__}}</h4>
              <div class="clearfix"></div>

              <form id="card-add-group-item-dlg" v-on:submit="cardAddItem($event, cardNewName)" v-if="cardShowAddGroupItemDlg">
                <div class="form-group">
                  <input v-model="cardNewName" class="form-control" ng-esc="cardHideAddGroupItemDlg($event)" placeholder="${_.gettext('Add')}" v-on:blur="cardHideAddGroupItemDlg($event)">
                </div>
                <button type="submit" class="btn btn-primary" v-on:mousedown.prevent.stop>${Katrid.i18n.gettext('Add')}</button>
                <button class="btn btn-default">${_.gettext('Cancel')}</button>
              </form>

            </div>
            <div class="card-items" card-draggable=".card-items" card-item>
              <div v-for="(record, index) in group.records" class="card panel-default card-item card-link"
                v-on:click="recordClick(record, index, $event)">
                <div id="template-placeholder"></div>
              </div>
            </div>
          </div>

          <div class="card-add-group" title="${_.gettext('Click here to add new column')}" v-on:click="cardNewName='';cardShowAddGroupDlg($event);" :data-group-name="groups[0]._paramName">
            <div v-show="!cardAddGroupDlg">
              <i class="fa fa-fw fa-chevron-right fa-2x"></i>
              <div class="clearfix"></div>
              <span class="title">${_.gettext('Add New Column')}</span>
            </div>
            <form v-show="cardAddGroupDlg" v-on:submit="cardAddGroup($event, cardNewName)">
            <div class="form-group">
              <input class="form-control" v-on:blur="cardAddGroupDlg=false" ng-esc="cardAddGroupDlg=false" placeholder="${_.gettext('Add')}" v-model="cardNewName">
            </div>
              <button type="submit" class="btn btn-primary">${_.gettext('Add')}</button>
              <button type="button" class="btn btn-default">${_.gettext('Cancel')}</button>
            </form>
          </div>
        </div>
        <div class="card-view card-deck" v-else>
          <div v-for="(record, index) in records" class="card panel-default card-item card-link"
               v-on:click="recordClick(record, index, $event)">
            <div id="template-placeholder"></div>
          </div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
          <div class="card-item card-ghost"></div>
        </div>
      </div>
    </div>
      `);
                    template.querySelectorAll(':scope > field').forEach(field => field.remove());
                    for (let child of template.querySelectorAll('field')) {
                        let el = this.renderField(child);
                        if (el)
                            child.replaceWith(el);
                    }
                    $(templ).find('#template-placeholder').replaceWith(template);
                    return templ;
                }
            }
            Views.CardRenderer = CardRenderer;
            class Card extends Views.RecordCollectionView {
                create() {
                    super.create();
                    this.viewType = 'card';
                    this.action.view = this;
                }
                async groupBy(data) {
                    this.dataSource.records = [];
                    for (let group of data)
                        await this.loadGroupRecords(group);
                }
                async loadGroupRecords(group) {
                    if (group.$count > 0) {
                        let res = await this.dataSource.model.search({ params: group.$params });
                        group.records = res.data;
                        this.dataSource.records.push(...res.data);
                    }
                }
                renderTemplate(template) {
                    let cardRenderer = new CardRenderer(this.fields);
                    return cardRenderer.render(template);
                }
            }
            Views.Card = Card;
            Views.registry['card'] = Card;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            let customTagRegistry = {};
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
                }
                prepare(elements) {
                }
                assign(source, dest) {
                    dest.innerHTML = source.innerHTML;
                    for (let attr of source.attributes)
                        dest.setAttribute(attr.name, attr.value);
                }
            }
            Views.CustomTag = CustomTag;
            class ActionsTag extends CustomTag {
                prepare(elements) {
                    let atts = this.view.templateView.querySelector('.btn-toolbar');
                    for (let actions of elements.values()) {
                        if (!this.view.toolbarVisible) {
                            actions.remove();
                            continue;
                        }
                        let actionsButton = document.createElement('div');
                        actionsButton.classList.add('btn-group');
                        actionsButton.innerHTML = '<div class="dropdown"><button type="button" class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown"></button><div class="dropdown-menu custom-actions"></div></div>';
                        let dropdownMenu = actionsButton.querySelector('.dropdown-menu');
                        for (let action of actions.querySelectorAll('action')) {
                            dropdownMenu.append(this.prepareAction(action));
                            action.remove();
                        }
                        let btn = actionsButton.querySelector('button');
                        let caption = actions.getAttribute('caption');
                        if (caption)
                            btn.innerHTML = caption + ' ';
                        else
                            btn.innerHTML = actions.innerHTML;
                        let vShow = actions.getAttribute('v-show');
                        if (vShow)
                            actionsButton.setAttribute('v-show', vShow);
                        let vIf = actions.getAttribute('v-if');
                        if (vIf)
                            actionsButton.setAttribute('v-if', vIf);
                        atts.append(actionsButton);
                    }
                }
                selector() {
                    return 'actions';
                }
                prepareAction(action) {
                    let el = document.createElement('a');
                    el.classList.add('dropdown-item');
                    this.assign(action, el);
                    console.log(el.getAttribute('data-action'));
                    if (el.hasAttribute('data-action'))
                        el.setAttribute('v-on:click', `action.onActionLink('${action.getAttribute('data-action')}', '${action.getAttribute('data-action-type')}')`);
                    else if ((el.getAttribute('type') === 'object') && (el.hasAttribute('name')))
                        el.setAttribute('v-on:click', `formButtonClick(activeRecordId, '${el.getAttribute('name')}', $event.target)`);
                    if (action.hasAttribute('id'))
                        el.setAttribute('id', action.id);
                    return el;
                }
            }
            Views.ActionsTag = ActionsTag;
            function registerCustomTag(selector, customTag) {
                customTagRegistry[selector] = customTag;
            }
            Views.registerCustomTag = registerCustomTag;
            registerCustomTag(':scope > actions', ActionsTag);
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class FormView extends Views.WindowView {
                create() {
                    super.create();
                    this.viewType = 'form';
                    this.dataSource.scrollCallback = (index, rec) => {
                        this.vm.recordIndex = index;
                        this.vm.record = rec;
                    };
                }
                renderField(fieldEl) {
                    let name = fieldEl.getAttribute('name');
                    if (name) {
                        let fld = this.fields[name];
                        if (fld) {
                            fld.view = this;
                            fld.assign(fieldEl);
                            if (fld.visible)
                                return fld.formCreate(this.element);
                        }
                        else
                            console.error(`Field "${name}" not found`);
                    }
                }
                dataCallback(data) {
                    this.vm.record = data;
                }
                ready() {
                    if (this.action.dataSource && (this.action.recordIndex >= 0)) {
                        this.dataSource._records = this.action.dataSource.records;
                        this.dataSource.recordIndex = this.action.recordIndex;
                    }
                    else if (this.action.params?.id && !this.dataSource.inserting)
                        this.dataSource.get(this.action.params.id);
                    else if (!this.dataSource.inserting)
                        this.dataSource.insert();
                }
                renderTemplate(template) {
                    let form = template;
                    form.setAttribute('v-form', null);
                    form.setAttribute('autocomplete', 'off');
                    form.classList.add('row');
                    for (let child of form.querySelectorAll('field')) {
                        if ((child.parentElement.tagName === 'FORM') && (child.parentElement !== form))
                            continue;
                        if (child.hasAttribute('invisible'))
                            continue;
                        let newField = this.renderField(child);
                        if (newField) {
                            child.parentElement.insertBefore(newField, child);
                            child.remove();
                        }
                    }
                    if (this.toolbarVisible) {
                        let templ = Katrid.element(`<div ng-form="form" class="ng-form form-view data-form"
         v-bind:class="{'form-data-changing': dataSource.changing, 'form-data-readonly': !dataSource.changing}"
    >
      <div class="content">
        <header class="content-container-heading"></header>
        <div class="page-sheet">
          <div class="content container">
            <div class="form-sheet panel-default data-panel browsing"
                 v-bind:class="{ browsing: browsing, editing: dataSource.changing }">
              <div class="template-placeholder">
                <a class="maximize-button" role="button" title="${_.gettext('Maximize')}"
                   onclick="$(this).closest('div.card.data-panel').toggleClass('box-fullscreen');$(this).find('i').toggleClass('fa-compress fa-expand')">
                  <i class=" fa fa-expand"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`);
                        let header = templ.querySelector('header');
                        this.mergeHeader(header, form);
                        templ.querySelector('.template-placeholder').append(form);
                        return templ;
                    }
                    else
                        return form;
                }
                createToolbar() {
                    let templ = `<div class="data-heading panel panel-default">
      <div class="panel-body">
        <div class="row">
          <div class="col-sm-6 breadcrumb-nav"></div>
          <p class="help-block">${this.action.info.usage || ''}&nbsp;</p>
        </div>
        <div class="toolbar row">
          <div class="col-sm-6 toolbar-action-buttons"></div>
          <div class="col-sm-6">
            <div class="float-right">
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
                    let toolbar = $(templ)[0];
                    this.createBreadcrumbs(toolbar);
                    this.createToolbarButtons(toolbar);
                    return toolbar;
                }
                getSelection() {
                    if (this.dataSource.recordId)
                        return [this.dataSource.recordId];
                }
                refresh() {
                    this.dataSource.get(this.dataSource.recordId);
                }
                createComponent() {
                    let props = ['parent'];
                    let me = this;
                    return {
                        props,
                        data() {
                            return {
                                action: me.action,
                                record: {},
                                records: [],
                                dataSource: me.dataSource,
                                editing: me.dataSource.editing,
                                browsing: me.dataSource.browsing,
                                inserting: me.dataSource.inserting,
                                state: me.dataSource.state,
                                name: '',
                                view: me.viewInfo,
                                actionView: me,
                                loadingRecord: false,
                                recordIndex: me.action.recordIndex,
                                recordCount: me.action.dataSource?.recordCount,
                                parent: null,
                            };
                        },
                        methods: {
                            async doFormAction(meth, kwargs) {
                                try {
                                    me.action.pendingOperation = true;
                                    let res = await me.action.model.rpc(meth, [this.record.id], kwargs, this);
                                    await me.action._evalResponseAction(res);
                                }
                                finally {
                                    me.action.pendingOperation = false;
                                }
                            },
                            refresh() {
                                me.dataSource.refresh();
                            },
                            openObject(model, id, target) {
                                if (this.dataSource.changing)
                                    target = 'dialog';
                                openObject(model, id, { target });
                            },
                            prior() {
                                me.dataSource.prior();
                            },
                            next() {
                                this.recordIndex = 10;
                                me.dataSource.next();
                            },
                            insert() {
                                me.dataSource.insert();
                            },
                            save() {
                                return me.dataSource.save();
                            },
                            cancel() {
                                me.dataSource.cancel();
                            },
                            discardChanges() {
                                this.record.$record.discard();
                            },
                            edit() {
                                me.dataSource.edit();
                            },
                            backTo(index) {
                                me.action.back(index);
                            },
                            deleteSelection() {
                                if (this.record)
                                    me.dataSource.delete([this.record.id]);
                            },
                            formButtonClick(id, methodName) {
                                me.formButtonClick(id, methodName);
                            },
                            actionClick(selection, methodName, event) {
                                me.action.formButtonClick(selection.map(obj => obj.id), methodName);
                            },
                            onImageChange(event, fieldName) {
                                console.log('image change', event.target, fieldName);
                            },
                            async validate() {
                                let msgs = [];
                                for (let f of Object.values(me.fields)) {
                                    let v = f.validate(this.record);
                                    if (v !== true)
                                        msgs.push(`<span>${f.caption}</span><ul><li>${Katrid.i18n.gettext('This field cannot be empty.')}</li></ul>`);
                                }
                                if (msgs.length) {
                                    let s = `<span>${Katrid.i18n.gettext('The following fields are invalid:')}</span><hr>`;
                                    s += msgs.join('');
                                    Katrid.Forms.Dialogs.Alerts.error(s);
                                    return false;
                                }
                                return true;
                            },
                            async copy() {
                                this.viewType = 'form';
                                await this.dataSource.copy(this.record.id);
                                return false;
                            },
                            sendFile(name, file) {
                                console.log('send file', name, file);
                                return Katrid.Services.Upload.sendFile({ model: this.action.model, method: name, file, vm: this });
                            },
                            sum(obj, field) {
                                let res = 0;
                                if (obj)
                                    for (let record of obj)
                                        res += record[field] || 0;
                                return res;
                            },
                            rpc(...args) {
                                return me.action.model.rpc(...args);
                            }
                        },
                        computed: {
                            selection() {
                                return [this.record];
                            },
                            activeRecordId() {
                                return this.record.id;
                            }
                        },
                    };
                }
                async formButtonClick(id, meth) {
                    try {
                        this.action.pendingOperation = true;
                        let res = await this.model.rpc(meth, [id], null, this);
                        if (res.tag === 'refresh')
                            this.refresh();
                        else if (res.tag == 'new') {
                            if (res.action) {
                                let action = await Katrid.Actions.goto(res.action, { view_type: 'form' });
                                action.view.dataSource.insert(true, res.values);
                            }
                            else
                                this.dataSource.insert(true, res.values);
                        }
                        else if (res.type) {
                            const act = new (Katrid.Actions.registry[res.type])(res, this.scope, this.scope.location);
                            act.execute();
                        }
                    }
                    finally {
                        this.action.pendingOperation = false;
                    }
                }
                createVm(el) {
                    let component = this.createComponent();
                    for (let script of this.scripts) {
                        let setup = eval(`(${script})`);
                        let def = setup.call(this);
                        if (def.methods)
                            Object.assign(component.methods, def.methods);
                    }
                    let vm = Katrid.createView(component).mount(el);
                    this.vm = vm;
                    this.dataSource.stateChangeCallback = (state) => {
                        this.vm.state = state;
                        this.vm.changing = this.dataSource.changing;
                        this.vm.editing = this.dataSource.editing;
                        this.vm.inserting = this.dataSource.inserting;
                        this.vm.browsing = this.dataSource.browsing;
                        this.vm.loadingRecord = this.dataSource.loadingRecord;
                    };
                    this.dataSource.vm = vm;
                    let vForm = el.querySelector('.v-form');
                    if (vForm?.$form)
                        this.dataSource.$form = vForm.$form;
                    this.actionView = el;
                    this.actionView.view = this;
                    return vm;
                }
                createToolbarButtons(container) {
                    let parent = container.querySelector('.toolbar-action-buttons');
                    let div = document.createElement('div');
                    div.classList.add('btn-toolbar');
                    div.innerHTML = `
    <button class="btn btn-primary btn-action-save" type="button" v-bind:disabled="loadingRecord"
      v-on:click="save()" v-show="dataSource.changing">
        ${_.gettext('Save')}
      </button>
      <button class="btn btn-primary btn-action-edit" type="button" v-bind:disabled="loadingRecord"
      v-on:click="edit()" v-show="!dataSource.changing">
        ${_.gettext('Edit')}
      </button>
      <button class="btn btn-outline-secondary btn-action-create" type="button" v-bind:disabled="loadingRecord"
      v-on:click="insert()" v-show="!dataSource.changing">
        ${_.gettext('Create')}
      </button>
      <button class="btn btn-outline-secondary btn-action-cancel" type="button" v-on:click="cancel()"
      v-show="dataSource.changing">
        ${_.gettext('Discard')}
      </button>
    <div class="btn-group">
      <div class="dropdown">
        <button type="button" class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown"
                aria-haspopup="true">
          ${_.gettext('Action')} <span class="caret"></span>
        </button>
        <button type="button" class="btn toolbtn" v-if="!changing" v-on:click="refresh()" title="${_.gettext('Refresh')}">
          <i class="fa fa-fw fa-redo-alt"></i>
        </button>
        <div class="dropdown-menu dropdown-menu-actions">
          <a class="dropdown-item" v-on:click="deleteSelection()">
            <i class="fa fa-fw fa-trash-o"></i> ${_.gettext('Delete')}
          </a>
          <a class="dropdown-item" v-on:click="copy()">
            <i class="fa fa-fw fa-files-o"></i>
            ${_.gettext('Duplicate')}
          </a>
        </div>
      </div>
    </div>
    <div class="btn-group">
      <button-attachments v-show="!inserting"></button-attachments>
</div>
`;
                    parent.append(div);
                    return parent;
                }
            }
            Views.FormView = FormView;
            async function openObject(model, id, options) {
                let target = options.target;
                let svc = new Katrid.Services.Model(model);
                let res = await svc.loadViews({
                    views: { form: null },
                });
                await res.views.form.loadPendingViews();
                if (target === 'dialog') {
                    let dlg = new FormViewDialog({
                        model: svc,
                        viewInfo: res.views.form,
                        action: {
                            info: {},
                            recordId: id,
                            recordIndex: 0,
                            records: [{}],
                        },
                    });
                    dlg.renderTo();
                    if (id)
                        dlg.dataSource.get(id);
                    return dlg.showDialog();
                }
            }
            Views.openObject = openObject;
            class FormViewDialog extends FormView {
                constructor() {
                    super(...arguments);
                    this.toolbarVisible = false;
                }
                createActionView(content) {
                    let templ = $(`
    <action-view class="modal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg form-view ng-form" role="document"
        :class="{'form-data-changing': changing, 'form-data-readonly': !changing}"
      >
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ record.record_name }}
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                aria-hidden="true">&times;</span></button>
          </div>
          <div class="modal-body data-form data-panel">
               
            <div class="clearfix"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-action-save" type="button" @click="actionView.saveAndClose()"
                    v-if="dataSource.changing">
              ${Katrid.i18n.gettext('Save')}
            </button>
            <button type="button" class="btn btn-outline-secondary" type="button" data-dismiss="modal" @click="discardChanges()"
                    v-if="dataSource.changing">
              ${Katrid.i18n.gettext('Discard')}
            </button>
            <button type="button" class="btn btn-outline-secondary" type="button" @click="actionView.deleteAndClose()"
                    v-if="dataSource.changing && !dataSource.inserting">
              ${Katrid.i18n.gettext('Remove')}
            </button>
            <button type="button" class="btn btn-secondary" type="button" data-dismiss="modal"
                    v-if="!dataSource.changing">
              ${Katrid.i18n.gettext('Close')}
            </button>
          </div>
        </div>
      </div>
    </action-view>
      `)[0];
                    this.templateView = templ;
                    this.templateView.setAttribute('data-model', this.model.name);
                    templ.querySelector('.modal-body').append(content);
                    return templ;
                }
                showDialog(options) {
                    return new Promise(async (resolve, reject) => {
                        let el = this.actionView;
                        if (options?.id)
                            await this.dataSource.get(options.id);
                        if (!el)
                            el = this.renderTo();
                        $(el).modal(options)
                            .on('hidden.bs.modal', () => {
                            resolve(this.$result);
                            $(el).data('bs.modal', null);
                            el.remove();
                        });
                        if (options?.edit)
                            this.vm.dataSource.edit();
                    });
                }
                static async createNew(config) {
                    let formInfo = config.viewInfo;
                    let model = new Katrid.Services.Model(config.model);
                    if (!formInfo)
                        formInfo = new Views.ViewInfo(await model.getViewInfo({ view_type: 'form' }));
                    await formInfo.loadPendingViews();
                    let dlg = new Katrid.Forms.Views.FormViewDialog({
                        action: {
                            model,
                        },
                        viewInfo: formInfo,
                    });
                    dlg.renderTo();
                    await dlg.dataSource.insert();
                    return dlg;
                }
                closeDialog() {
                    $(this.actionView).modal('hide');
                }
                saveAndClose() {
                    this.$result = this.dataSource.flush(true, false);
                    if (this.$result)
                        this.closeDialog();
                }
                recordClick(event, index, record) {
                }
                deleteAndClose() {
                    this.vm.record.$record.delete();
                    this.$result = this.vm.record;
                    this.closeDialog();
                }
            }
            Views.FormViewDialog = FormViewDialog;
            Views.registry['form'] = FormView;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class ListView extends Views.RecordCollectionView {
                constructor() {
                    super(...arguments);
                    this.rowSelector = true;
                }
                create() {
                    super.create();
                    this.viewType = 'list';
                    this.action.view = this;
                }
                renderTemplate(template) {
                    console.log('row selector', this.rowSelector);
                    template.setAttribute('data-options', JSON.stringify({ rowSelector: this.rowSelector }));
                    let renderer = new Forms.ListRenderer(this.viewInfo);
                    let templ = Katrid.element(`<div class="content no-padding">
      <div class="clearfix"></div>
        <header class="content-container-heading"></header>
        <div class="panel-default data-panel">
      <div class="panel-body no-padding">
      <div class="form-inline footer template-placeholder"></div>
        </div></div></div>`);
                    if (this.toolbarVisible)
                        this.mergeHeader(templ.querySelector('header'), template);
                    this.element = renderer.render(template);
                    templ.querySelector('.template-placeholder').append(this.element);
                    return templ;
                }
                async groupBy(data) {
                    this.vm.records = this.vm.groups;
                }
            }
            Views.ListView = ListView;
            class ListViewDialog extends ListView {
                constructor(config) {
                    super(config);
                    this.toolbarVisible = false;
                    this.rowSelector = false;
                    if (config.rowSelector)
                        this.rowSelector = config.rowSelector;
                }
                createActionView(content) {
                    let result = '$result = this.selection[0]';
                    if (this.rowSelector)
                        result = '$result = this.selection';
                    let templ = $(`
    <action-view class="modal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg form-view ng-form search-more-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              ${this.caption}
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span
                aria-hidden="true">&times;</span></button>
          </div>
          <div class="modal-body data-form data-panel">
            <search-view></search-view>
            <div class="table-responsive"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary btn-ok" type="button" @click="${result}" data-dismiss="modal">
              OK
            </button>
            <button type="button" class="btn btn-secondary" type="button" data-dismiss="modal">
              ${Katrid.i18n.gettext('Cancel')}
            </button>
          </div>
        </div>
      </div>
    </action-view>
      `)[0];
                    this.templateView = templ;
                    templ.querySelector('.table-responsive').append(content);
                    return templ;
                }
                static showDialog(config) {
                    return new Promise(async (resolve, reject) => {
                        let viewInfo = config.viewInfo;
                        let model = new Katrid.Services.Model(config.model);
                        if (!viewInfo)
                            viewInfo = await model.loadViews({
                                views: { list: null, search: null },
                            });
                        let dlg = new ListViewDialog({
                            caption: config.caption,
                            rowSelector: config.multiple,
                            model, viewInfo: viewInfo.views.list,
                            recordClick(record) {
                                this.unselectAll();
                                record.$selected = true;
                                this.selection = [record];
                            },
                            action: {
                                views: viewInfo.views,
                                setSearchParams(params) {
                                    dlg.setSearchParams(params);
                                },
                            },
                        });
                        dlg.dataSource.where = config.where;
                        dlg.renderTo();
                        dlg.dataSource.open();
                        let el = dlg.actionView;
                        console.log('show dialog');
                        $(el).modal(config.options)
                            .on('hidden.bs.modal', () => {
                            resolve(dlg.vm.$result);
                            console.log('remove', el.closest('action-view'));
                            $(el).data('bs.modal', null);
                            el.closest('action-view').remove();
                        });
                        return dlg;
                    });
                }
            }
            Views.ListViewDialog = ListViewDialog;
            Views.registry['list'] = ListView;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            Views.registerTemplateElement('t-params', function tParams(params) {
                let div = document.createElement('div');
                div.classList.add('params', 'row');
                for (let child of params.childNodes)
                    div.append(child);
                params.replaceWith(div);
                this.compile(div);
            });
            Views.registerTemplateElement('t-param', function tParam(param) {
                let type = param.getAttribute('type');
                let choices;
                if (type === 'ChoiceField')
                    choices = param.children;
                let widget = Katrid.BI.paramWidgets[Katrid.BI.paramTypes[type || 'CharField']];
                let info = {
                    name: param.getAttribute('name'),
                    id: param.getAttribute('id'),
                    operation: param.getAttribute('operation') || '=',
                    choices,
                };
                let div = document.createElement('div');
                div.classList.add('col-md-6', 'form-group');
                div.innerHTML = `<div class="col-12"><label class="control-label">${param.getAttribute('caption')}</label></div>`;
                let paramWidget = document.createElement('div');
                paramWidget.classList.add('col', 'param-widget');
                paramWidget.innerHTML = widget(info);
                div.append(paramWidget);
                param.replaceWith(div);
            });
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class PortletView extends HTMLElement {
            }
            Views.PortletView = PortletView;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            function selectionSelectToggle(record) {
                record.$selected = !record.$selected;
                if (record.$selected && !this.selection.includes(record))
                    this.selection.push(record);
                else if (!record.$selected && this.selection.includes(record))
                    this.selection.splice(this.selection.indexOf(record), 1);
                this.selectionLength = this.selection.length;
            }
            Views.selectionSelectToggle = selectionSelectToggle;
            function selectionToggleAll(sel) {
                if (sel === undefined)
                    this.allSelected = !this.allSelected;
                else
                    this.allSelected = sel;
                for (let rec of this.records)
                    rec.$selected = this.allSelected;
                if (this.allSelected) {
                    this.selectionLength = this.records.length;
                    this.selection = [...this.records];
                }
                else {
                    this.selection = [];
                    this.selectionLength = 0;
                }
            }
            Views.selectionToggleAll = selectionToggleAll;
            function tableContextMenu(event) {
                event.preventDefault();
                event.stopPropagation();
                let menu = new Forms.ContextMenu();
                menu.add('<i class="fa fa-fw fa-copy"></i> Copiar', (...args) => copyClick(event.target.closest('table')));
                if (this.field?.pasteAllowed && this.$parent.dataSource.changing)
                    menu.add('<i class="fa fa-fw fa-paste"></i> Colar', (...args) => pasteClick(this));
                menu.show(event.pageX, event.pageY);
            }
            Views.tableContextMenu = tableContextMenu;
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
                menu.show(event.pageX, event.pageY);
            }
            Views.listRecordContextMenu = listRecordContextMenu;
            function copyClick(table) {
                navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(table));
            }
            async function pasteClick(vm) {
                let text = await navigator.clipboard.readText();
                let sep = '\t';
                if (!text.includes(sep))
                    text = ';';
                text.split('\n').forEach((line, n) => {
                    if (n > 0) {
                        line = line.trim();
                        if (line) {
                            let record = {};
                            line.split(sep).forEach((s, n) => {
                                let field = vm.$grid.$columns[n];
                                if (field)
                                    record[field.name] = s;
                            });
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
            Views.unselectAll = unselectAll;
            function filterByFieldContent(td, record) {
                let name = td.getAttribute('field-name');
                if (name) {
                    let val = record[name];
                    this.action.addFilter(name, val);
                }
            }
            function selectionDelete() {
                this.allSelected = false;
                for (let rec of this.selection) {
                    rec.$record.delete();
                }
                this.records = this.records.filter(rec => rec.$record.state !== Katrid.Data.RecordState.destroyed);
                this.selection = [];
                this.selectionLength = 0;
            }
            Views.selectionDelete = selectionDelete;
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Views;
        (function (Views) {
            class ViewInfo {
                constructor(info) {
                    this._pending = true;
                    this._info = info;
                    this.fields = info.fields;
                    Object.values(this.fields).forEach(field => field.viewInfo = this);
                    this.content = info.content;
                    this.toolbar = info.toolbar;
                    if ('auto_load' in info)
                        this.auto_load = info.auto_load;
                }
                async loadPendingViews() {
                    if (!this._pending)
                        return;
                    this._pending = false;
                    let templ = this.template;
                    for (let child of Array.from(templ.querySelectorAll('field'))) {
                        let name = child.getAttribute('name');
                        if (name) {
                            let field = this.fields[name];
                            if (field)
                                field.assign(child);
                        }
                    }
                    await Promise.all(Object.values(this.fields)
                        .filter(field => field['loadViews'])
                        .map((field) => field.loadViews()));
                }
                get template() {
                    return $(this.content)[0];
                    if (!this._template)
                        this._template = $(this.content)[0];
                    return this._template;
                }
            }
            Views.ViewInfo = ViewInfo;
        })(Views = Forms.Views || (Forms.Views = {}));
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
                intl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: config, maximumFractionDigits: config, });
            else
                intl = new Intl.NumberFormat('pt-BR', config);
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
    let fmtCharMap = { 'd': 'DD', 'm': 'MM', 'M': 'm', 'i': 'mm', 'H': 'HH' };
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
        fmts.shortDateFormat = convertFormat(fmts.SHORT_DATE_FORMAT);
        fmts.shortDateTimeFormat = convertFormat(fmts.SHORT_DATETIME_FORMAT);
        return fmts;
    }
    Katrid.i18n = {
        languageCode: 'pt-BR',
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
            _.mixin({
                gettext: Katrid.i18n.gettext,
                sprintf: sprintf,
            });
            return Katrid.i18n.initialized = true;
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
        interpolate(fmt, obj, named) {
            if (named) {
                fmt.replace(/%\(\w+\)s/g, match => String(obj[match.slice(2, -2)]));
            }
            else {
                fmt.replace(/%s/g, match => String(obj.shift()));
            }
            return {
                get_format(formatType) {
                    const value = Katrid.i18n.formats[formatType];
                    if (value != null) {
                        return value;
                    }
                    else {
                        return formatType;
                    }
                }
            };
        }
    };
    if (window['KATRID_I18N'])
        Katrid.i18n.initialize(KATRID_I18N.plural, KATRID_I18N.catalog, KATRID_I18N.formats);
    else
        _.mixin({
            gettext: (s) => s,
        });
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
                    }
                    getDisplayValue() {
                        if (this.value) {
                            return this.value[1];
                        }
                        return this.searchString;
                    }
                    getParamValue(name, value) {
                        let r = {};
                        if (_.isArray(value)) {
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
                        if (_.isString(domain))
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
                    constructor(view, facet, group) {
                        this.items = [];
                        this._selected = false;
                        this.view = view;
                        this._selection = [];
                        if (!facet)
                            facet = new Search.FacetView(this);
                        this._facet = facet;
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
                            this._facet.values = [];
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
                        console.log('custom filter', this._selection);
                        this._facet.values = this._selection.map(item => (new SearchObject(item.toString(), item.value)));
                        this._refresh();
                    }
                    removeValue(item) {
                        this._selection.splice(this._selection.indexOf(item), 1);
                        this._facet.values = this._selection.map(item => ({ searchString: item.getDisplayValue(), value: item.value }));
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
                            if (this.view.facets.indexOf(this._facet) === -1)
                                this.view.facets.push(this._facet);
                        }
                        else if (this.view.facets.indexOf(this._facet) > -1)
                            this.view.facets.splice(this.view.facets.indexOf(this._facet), 1);
                        console.log(this._selection);
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
                        console.log('search result', field, value);
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
                        this.view.model.getFieldChoices({ field: this.name, term: this.view.text })
                            .then((res) => {
                            this.children = res.items;
                            let index = this.view.availableItems.indexOf(this);
                            if (index > -1) {
                                for (let obj of this.children) {
                                    index++;
                                    this.view.availableItems.splice(index, 0, new SearchResult(this, obj));
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
                        return this.view.text;
                    }
                    select() {
                        this.facet.addValue(this.value);
                        this.view.addFacet(this.facet);
                        this.view.close();
                        this.view.update();
                    }
                    selectItem(item) {
                        let domain = {};
                        domain[this.field.name] = item[0];
                        this.facet.addValue(new SearchObject(item[1], domain));
                        this.view.addFacet(this.facet);
                        this.view.close();
                        this.view.update();
                    }
                    static fromField(view, el) {
                        let field = view.fields[el.getAttribute('name')];
                        return new SearchField(view, field.name, el, field);
                    }
                    get template() {
                        return _.sprintf(Katrid.i18n.gettext(`Search <i>%(caption)s</i> by: <strong>%(text)s</strong>`), {
                            caption: this.field.caption,
                            text: this.view.text,
                        });
                    }
                }
                Search.SearchField = SearchField;
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
                                    console.log('field change');
                                    if (this.value)
                                        this.addCondition(this.field, this.conditionName, this.value);
                                    this.customFilter.push(this.tempFilter);
                                    this.tempFilter.selectAll();
                                    this.filters.push(this.tempFilter);
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
          <span class="fa fa-star fa-fw"></span> ${_.gettext('Favorites')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu search-favorite-menu" style="min-width: 300px">
          <a class="dropdown-item dropdown-search-item" v-on:click.stop="expanded=!expanded">
            <i :class="{ 'fa-caret-right': !expanded, 'fa-caret-down': expanded }"
               class="fa expandable"></i>
            ${_.gettext('Save current search')}
          </a>
          <div v-if="expanded" v-on:click.stop>
            <div class="col-12">
              <div class="form-group">
                <input type="text" class="form-control" v-model="saveSearch.name" placeholder="${_.gettext('Search name')}">
              </div>
              <div class="form-group" ng-init="saveSearch.is_default=false;saveSearch.is_shared=true;">
                <label>
                  <input type="checkbox" v-model="saveSearch.is_default" v-on:click.stop>
                  ${_.gettext("Use by default")}
                </label>
                <label>
                  <input type="checkbox" v-model="saveSearch.is_shared">
                  ${_.gettext("Share with all users")}
                </label>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="saveSearch(saveSearch)">
                  ${_.gettext('Save')}
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
                        console.log(this.values);
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
                        this._facet.values.push(newItem);
                        this._refresh();
                    }
                    removeValue(item) {
                        this.view.groupLength--;
                        for (let i of this._facet.values)
                            if (i._ref === item) {
                                this._facet.values.splice(this._facet.values.indexOf(i), 1);
                                break;
                            }
                        this._refresh();
                    }
                    _refresh() {
                        if (this._facet.values.length) {
                            if (this.view.facets.indexOf(this._facet) === -1)
                                this.view.facets.push(this._facet);
                        }
                        else if (this.view.facets.indexOf(this._facet) > -1)
                            this.view.facets.splice(this.view.facets.indexOf(this._facet), 1);
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
                Katrid.component('filter-menu', {
                    props: ['search', 'action'],
                    template: '<div></div>',
                    template_: `<div class="dropdown-menu search-view-filter-menu">
      <div>
        <div v-for="group in search.filterGroups">
          <a class="dropdown-item" ng-class="{'selected': filter.selected}" v-for="filter in group" v-on:click.stop="filter.toggle()">
            {{ filter.toString() }}
          </a>
          <div class="dropdown-divider"></div>
        </div>
      </div>
      <div ng-controller="CustomFilterController">
        <div v-for="filter in customFilter">
          <a class="dropdown-item" ng-class="{'selected': filterItem.selected}" v-on:click.stop="filterItem.toggle()" v-for="filterItem in filter" v-html="filterItem.toString()"></a>
          <div class="dropdown-divider"></div>
        </div>
        <a class="dropdown-item dropdown-search-item" onclick="event.stopPropagation();event.preventDefault();" ng-click="customSearchExpanded=!customSearchExpanded">
          <i ng-class="{ 'fa-caret-right': !customSearchExpanded, 'fa-caret-down': customSearchExpanded }" class="fa expandable"></i>
          ${_.gettext('Add Custom Filter')}
        </a>
        <div ng-if="customSearchExpanded" onclick="event.stopPropagation();event.preventDefault();">
          <div v-show="tempFilter.length" class="margin-bottom-8">
            <a href="#" onclick="$event.preventDefault()" class="dropdown-item" v-for="filter in tempFilter" v-html="filter.toString()" title="${_.gettext('Remove item')}"></a>
          </div>
          <div class="col-12">
            <div class="form-group">
              <select class="form-control" v-model="fieldName" ng-change="fieldChange(action.fields[fieldName])">
                <option value=""></option>
                <option v-for="field in action.fieldList" :value="field.name">{{ field.caption }</option>
              </select>
            </div>
            <div class="form-group">
<!--              <ng-include src="field.paramTemplate + '.conditions'"/>-->
            </div>
            <div class="form-group">
<!--              <ng-include src="field.paramTemplate" ng-show="controlVisible"/>-->
            </div>
            <div class="form-group">
              <button class="btn btn-primary" type="button" v-on:click="applyFilter()" v-show="searchValue!==undefined">
                ${_.gettext('Apply')}
              </button>
              <button class="btn btn-outline-secondary" type="button" v-on:click="addCondition(field, condition, searchValue);fieldName='';" v-show="searchValue">
                ${_.gettext('Add a condition')}
              </button>
            </div>
          </div>
        </div>
      </div>
</div>    
    `,
                    mounted() {
                    },
                    data() {
                        return {
                            tempFilter: {},
                        };
                    }
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
        var Views;
        (function (Views) {
            var Search;
            (function (Search) {
                class SearchViewElement {
                    constructor(vm) {
                        this.vm = vm;
                        let container = vm.$el;
                        this.query = new Search.SearchQuery(this);
                        this.searchItems = [];
                        this.searchFields = [];
                        this.filterGroups = [];
                        this.groups = [];
                        this._groupLength = this.groupLength = 0;
                        this.facets = [];
                        this.facetGrouping = new Search.FacetGroup();
                        this.facets = [];
                        this.query = new Search.SearchQuery(this);
                        this.menu = $(container.querySelector('.search-dropdown-menu.search-view-menu'));
                        console.log('menu', this.menu);
                        this.input = container.querySelector('.search-view-input');
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
                                    obj = Search.SearchFilters.fromItem(this, child);
                                    this.filterGroups.push(obj);
                                }
                                else if (tag === 'FILTER-GROUP') {
                                    obj = Search.SearchFilters.fromGroup(this, child);
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
                                    obj = Search.SearchField.fromField(this, child);
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
                        let shouldApply = false;
                        if (!this._availableItems) {
                            this._availableItems = [].concat(this.searchFields);
                            shouldApply = true;
                        }
                        for (let obj of this._availableItems)
                            if (obj.expanded) {
                                obj.expanded = false;
                                shouldApply = true;
                            }
                        this.vm.availableItems = this._availableItems;
                        this.menu.show();
                        this.first();
                    }
                    close() {
                        this.vm.availableItems = null;
                        this.menu.hide();
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
                        let filters = new Search.SearchFilters(this);
                        filters.push(new Search.CustomFilterItem(this, field, '=', value, filters));
                        filters.selectAll();
                    }
                    first() {
                        this.menu.find('li.active a.search-menu-item').removeClass('active');
                        this.menu.find('li:first').addClass('active');
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
                        for (let item of this.filterGroups)
                            for (let subitem of item)
                                if (subitem.name === name)
                                    return subitem;
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
                        console.log('get params', this.getParams());
                        if (this.groupLength !== this._groupLength) {
                            this._groupLength = this.groupLength;
                            await this.view.applyGroups(this.groupBy(), this.getParams());
                        }
                        else
                            this.action.setSearchParams(this.getParams());
                        this.vm.update();
                    }
                    groupBy() {
                        return this.facetGrouping.values.map(obj => obj._ref.groupBy);
                    }
                }
                Search.SearchViewElement = SearchViewElement;
                Katrid.component('search-view', {
                    template: `<div class="search-view"><div search-view-area class="search-area">
      <div class="search-view">
        <div class="search-view-facets">
          <div class="facet-view" v-for="facet in facets">
            <span class="facet-label" v-html="facet.caption"></span>
            <span class="facet-value" v-html="facet.templateValue"></span>
            <span class="fas fa-times facet-remove" v-on:click="removeFacet(facet)"></span>
          </div>
        </div>
        <input class="search-view-input" role="search" v-on:input="setSearchText(searchText)" placeholder="${_.gettext('Search...')}" v-model="searchText">
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
            <a v-if="item.loading" class="search-menu-item"><i>${_.gettext('Loading...')}</i></a>
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
        <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" type="button" aria-expanded="false">
          <span class="fa fa-filter"></span> ${_.gettext('Filters')} <span class="caret"></span>
        </button>
        
    
<div class="dropdown-menu search-view-filter-menu">
      <div>
        <div v-for="group in search.filterGroups">
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
        <a class="dropdown-item dropdown-search-item" v-on:click.stop.prevent="customSearchExpanded=!customSearchExpanded">
          <i :class="{ 'fa-caret-right': !customSearchExpanded, 'fa-caret-down': customSearchExpanded }" class="fa expandable"></i>
          ${_.gettext('Add Custom Filter')}
        </a>
        <div v-if="customSearchExpanded" v-on:click.stop.prevent>
          <div v-show="tempFilter && tempFilter.length" class="margin-bottom-8">
            <a href="#" v-on:click.prevent class="dropdown-item" v-for="filter in tempFilter" v-html="filter.toString()" title="${_.gettext('Remove item')}"></a>
          </div>
          <div class="col-12">
            <div class="form-group">
              <select class="form-control" v-model="fieldName" v-on:change="fieldChange(fields[fieldName])">
                <option></option>
                <option v-for="field in action.fieldList" :value="field.name">{{ field.caption }}</option>
              </select>
            </div>
            <div class="form-group filter-condition" v-if="fieldName">
            <select class="form-control" v-model="tempCondition">
              <option></option>
              <option v-for="(name, value, index) in fieldConditions" :value="value">{{name}}</option>
            </select>
            </div>
            <div class="form-group" v-if="field">
              <select class="form-control" v-model="searchValue" v-if="tempCondition && field.choices">
                <option v-for="choice in field.choices" :value="choice[0]">{{choice[1]}}</option>
              </select>
              <input class="form-control" v-model="searchValue" type="text" v-else-if="tempCondition && (field.info.type === 'IntegerField')">
              <input class="form-control" v-model="searchValue" type="text" v-else-if="tempCondition && (field.info.type === 'IntegerField')">
              <input-autocomplete v-model="searchValue" :data-model="field.info.model" v-else-if="(tempCondition === '=') && (field.info.type === 'ForeignKey')"/>
              <input class="form-control" v-model="searchValue" type="text" v-else-if="field.info.type !== 'BooleanField'">
            </div>
            <div class="form-group">
              <button class="btn btn-primary" type="button" v-on:click="applyFilter()" v-show="searchValue!==undefined">
                ${_.gettext('Apply')}
              </button>
              <button class="btn btn-outline-secondary" type="button" v-on:click="addCondition(field, condition, searchValue);fieldName='';" v-show="searchValue">
                ${_.gettext('Add a condition')}
              </button>
            </div>
          </div>
        </div>
      </div>
</div>    
    
      </div>
      <div class="btn-group">
        <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" type="button">
          <span class="fa fa-bars"></span> ${_.gettext('Group By')} <span class="caret"></span>
        </button>
        <ul class="dropdown-menu search-view-groups-menu">
        
          <div v-for="group in search.groups">
            <a class="dropdown-item" :class="{'selected': item.selected}" v-on:click.stop="item.toggle()" v-for="item in group.items">
              {{ item.toString() }}
            </a>
            <div class="dropdown-divider"></div>
          </div>

          <a class="dropdown-item dropdown-search-item" v-on:click.stop.prevent
             v-on:click="groupByExpanded=!groupByExpanded">
            <i :class="{ 'fa-caret-right': !groupByExpanded, 'fa-caret-down': groupByExpanded }"
               class="fa expandable"></i>
            {{ _.gettext('Add Custom Group') }}
          </a>

          <div v-if="groupByExpanded" v-on:click.stop.prevent>
            <div class="col-12">
              <div class="form-group">
                <select class="form-control" v-model="fieldName" v-on:change="fieldChange(fields[fieldName])">
                  <option value=""></option>
                  <option v-for="(field, name, index) in fields" :value="name">{{ field.caption }}</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="addCustomGroup(fields[fieldName]);fieldName='';">
                  {{ _.gettext('Apply') }}
                </button>
              </div>
            </div>
          </div>
</ul>
      </div>
      <button class="btn btn-outline-secondary">
        <span class="fa fa-star"></span> {{ _.gettext('Favorites') }} <span class="caret"></span>
      </button>
    </div>
            <div class="float-right">
              <div class="btn-group pagination-area">
                <span v-if="pendingRequest"><span class="fas fa-spinner fa-spin"/>  ${_.gettext('Loading...')}</span>
                <div v-if="!pendingRequest">
                <span class="paginator">{{$parent.dataOffset}} - {{$parent.dataOffsetLimit}}</span>
                  /
                  <span class="total-pages">{{$parent.recordCount}}</span>
                </div>
              </div>
              <div class="btn-group">
                <button class="btn btn-outline-secondary" type="button" v-on:click="$parent.prevPage()">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <button class="btn btn-outline-secondary" type="button" v-on:click="$parent.nextPage()">
                  <i class="fa fa-chevron-right"></i>
                </button>
              </div>
              <div id="btn-view-modes" class="btn-group" role="group"></div>
            </div>
    
    </div>`,
                    mounted() {
                        this.$viewInfo = this.$parent.action.views.search;
                        let search = this.search = this.$search = new SearchViewElement(this);
                        this.$parent.action.searchView = search;
                        this.facets = search.facets;
                        this.$parent.search = this.$search;
                        this.$search.model = this.$parent.action.model;
                        this.$search.action = this.$parent.action;
                        this.$search.fields = this.$viewInfo.fields;
                        search.view = this.$parent.actionView;
                        this.$search.setContent(this.$viewInfo.template);
                        this.$search.input.addEventListener('blur', (evt) => {
                            this.searchText = '';
                            this.$search.close();
                        });
                        this.$search.input.addEventListener('keydown', (evt) => {
                            switch (evt.which) {
                                case Katrid.UI.keyCode.DOWN:
                                    this.move(1);
                                    evt.preventDefault();
                                    break;
                                case Katrid.UI.keyCode.UP:
                                    this.move(-1);
                                    evt.preventDefault();
                                    break;
                                case Katrid.UI.keyCode.ENTER:
                                    let item = this.availableItems[this.currentIndex];
                                    if (item)
                                        item.select();
                                    this.searchText = '';
                                    break;
                                case Katrid.UI.keyCode.BACKSPACE:
                                    if (this.searchText === '') {
                                        this.facets[this.facets.length - 1].clear();
                                        this.facets.splice(this.facets.length - 1, 1).map(facet => facet.clear());
                                    }
                                    break;
                            }
                        });
                        if (this.$parent.action.context.search_default)
                            setTimeout(() => this.search.load(this.$parent.action.context.search_default));
                    },
                    methods: {
                        addCondition(field, condition, value) {
                            if (!this.tempFilter)
                                this.tempFilter = new Search.SearchFilters(this.$search);
                            this.tempFilter.push(new Search.CustomFilterItem(this.$search, field, condition, value, this.tempFilter));
                            this.field = null;
                            this.condition = null;
                            this.controlVisible = false;
                            this.searchValue = undefined;
                        },
                        applyFilter() {
                            if (this.searchValue)
                                this.addCondition(this.field, this.tempCondition, this.searchValue);
                            this.customFilter.push(this.tempFilter);
                            this.tempFilter.selected = true;
                            this.tempCondition = null;
                            this.fieldName = null;
                            this.tempFilter = new Search.SearchFilters(this.$search);
                            this.customSearchExpanded = false;
                        },
                        setSearchText(text) {
                            if (text.length) {
                                return this.$search.show();
                            }
                            else {
                                return this.$search.close();
                            }
                        },
                        removeFacet(facet) {
                            let i = this.facets.indexOf(facet);
                            this.facets[i].clear();
                            this.facets.splice(i, 1);
                            this.$search.input.focus();
                            this.$search.update();
                        },
                        update() {
                            this.$emit('searchUpdate');
                        },
                        move(distance) {
                            this.currentIndex += distance;
                            if (this.currentIndex >= this.availableItems.length)
                                this.currentIndex = 0;
                            else if (this.currentIndex < 0)
                                this.currentIndex = this.availableItems.length - 1;
                        },
                        fieldChange(field) {
                            this.field = field;
                            if (field) {
                                console.log(field.choices);
                                if (field.choices) {
                                    this.fieldConditions = {
                                        '=': _.gettext('Is equal'),
                                        '!=': _.gettext('Is different'),
                                        'is not null': _.gettext('Is filled'),
                                        'is null': _.gettext('Is not filled'),
                                    };
                                }
                                else if ((field.info.type === 'CharField') || (field.info.type === 'EmailField')) {
                                    this.fieldConditions = {
                                        '%': _.gettext('Contains'),
                                        '!%': _.gettext('Not contains'),
                                        '=': _.gettext('Is equal'),
                                        '!=': _.gettext('Is different'),
                                        'is not null': _.gettext('Is filled'),
                                        'is null': _.gettext('Is not filled'),
                                    };
                                }
                                else if (field.info.type === 'ForeignKey') {
                                    this.fieldConditions = {
                                        '=': _.gettext('Is equal'),
                                        '!=': _.gettext('Is different'),
                                        'is not null': _.gettext('Is filled'),
                                        'is null': _.gettext('Is not filled'),
                                    };
                                }
                                else if (field.info.type === 'IntegerField') {
                                    this.fieldConditions = {
                                        '=': _.gettext('Is equal'),
                                        '!=': _.gettext('Is different'),
                                        '>': _.gettext('Greater-than'),
                                        '<': _.gettext('Less-than'),
                                        'is not null': _.gettext('Is defined'),
                                        'is null': _.gettext('is not defined'),
                                    };
                                }
                                else if (field.info.type === 'BooleanField') {
                                    this.fieldConditions = {
                                        'true': _.gettext('Yes'),
                                        'false': _.gettext('No'),
                                    };
                                }
                            }
                        },
                        addCustomGroup(field) {
                            if (field) {
                                let group = Search.SearchGroups.fromField({ view: this.search, field });
                                this.search.groups.push(group);
                                group.items[0].toggle();
                            }
                        },
                    },
                    data() {
                        return {
                            fields: this.$parent.action.fields,
                            search: {},
                            fieldConditions: {},
                            action: this.$parent.action,
                            fieldName: null,
                            currentIndex: 0,
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
                class SearchView {
                    constructor(scope, element, view) {
                        this.scope = scope;
                        this.element = element;
                        this.query = new Search.SearchQuery(this);
                        this._viewMoreButtons = localStorage.getItem('katrid.search.viewMoreButtons') === 'true';
                        this.items = [];
                        this.fields = [];
                        this.filterGroups = [];
                        this.groups = [];
                        this._groupLength = this.groupLength = 0;
                        this.facets = [];
                        this.input = element.find('.search-view-input');
                        this.view = view;
                        this.$items = null;
                        this.facetGrouping = new Search.FacetGroup();
                        this.groupingGroups = new Search.SearchGroups(this, this.facetGrouping);
                        if (view) {
                            this.el = $(view.content);
                            this.menu = element.find('.search-dropdown-menu.search-view-menu');
                            for (let child of this.el.children()) {
                                child = $(child);
                                let tag = child.prop('tagName');
                                let obj;
                                if (tag === 'FILTER') {
                                    obj = Search.SearchFilters.fromItem(this, child);
                                    this.filterGroups.push(obj);
                                    this.append(obj);
                                }
                                else if (tag === 'FILTER-GROUP') {
                                    obj = Search.SearchFilters.fromGroup(this, child);
                                    this.filterGroups.push(obj);
                                }
                                else if (tag === 'GROUP') {
                                    obj = Search.SearchGroup.fromItem(this, child, this.groupingGroups);
                                    this.addGrouping(obj);
                                }
                                else if (tag === 'FIELD') {
                                    obj = Search.SearchField.fromField(this, child);
                                    this.fields.push(obj);
                                }
                            }
                            this.input
                                .on('input', (evt) => {
                                if (this.input.val().length) {
                                    return this.show();
                                }
                                else {
                                    return this.close();
                                }
                            })
                                .on('keydown', (evt) => {
                                switch (evt.which) {
                                    case Katrid.UI.keyCode.DOWN:
                                        this.move(1);
                                        evt.preventDefault();
                                        break;
                                    case Katrid.UI.keyCode.UP:
                                        this.move(-1);
                                        evt.preventDefault();
                                        break;
                                    case Katrid.UI.keyCode.ENTER:
                                        this.scope.$apply(() => angular.element(this.menu.find('li.active a.search-menu-item')).scope().item.select(evt));
                                        break;
                                    case Katrid.UI.keyCode.BACKSPACE:
                                        if (this.input.val() === '') {
                                            this.scope.$apply(() => this.facets.splice(this.facets.length - 1, 1).map(facet => facet.clear()));
                                            this.update();
                                        }
                                        break;
                                }
                            })
                                .on('blur', (evt) => {
                                this.input.val('');
                                return this.close();
                            });
                        }
                    }
                    addCustomGroup(field) {
                        let group = new Search.SearchGroup(this, field.name, field.caption, this.groupingGroups);
                        this.addGrouping(group);
                        group.selected = true;
                    }
                    addGrouping(group) {
                        if (!this.groups.length)
                            this.groups = [this.groupingGroups];
                        this.groupingGroups.push(group);
                    }
                    set viewMoreButtons(value) {
                        if (this._viewMoreButtons !== value) {
                            this._viewMoreButtons = value;
                            localStorage.setItem('katrid.search.viewMoreButtons', value.toString());
                        }
                    }
                    get viewMoreButtons() {
                        return this._viewMoreButtons;
                    }
                    load(filter) {
                        filter.map((item, idx) => {
                            let i;
                            if (typeof item === 'string')
                                i = this.getByName(item);
                            else
                                i = this.getByName(item[0]);
                            if (i)
                                i.selected = true;
                        });
                    }
                    getByName(name) {
                        for (let item of this.filterGroups)
                            for (let subitem of item)
                                if (subitem.name === name)
                                    return subitem;
                        for (let item of this.items)
                            if (item.name === name)
                                return item;
                        for (let item of this.groupingGroups.items)
                            if (item.name === name)
                                return item;
                    }
                    append(item) {
                        this.items.push(item);
                    }
                    addFacet(facet) {
                        if (!this.facets.includes(facet))
                            this.facets.push(facet);
                    }
                    first() {
                        this.menu.find('li.active a.search-menu-item').removeClass('active');
                        this.menu.find('li:first').addClass('active');
                    }
                    remove(index) {
                        let facet = this.facets[index];
                        facet.destroy();
                        this.facets.splice(index, 1);
                        this.update();
                    }
                    getParams() {
                        let r = [];
                        for (let i of this.facets)
                            if (!i.grouping)
                                r = r.concat(i.getParamValues());
                        return r;
                    }
                    dump() {
                        let res = [];
                        for (let i of this.facets)
                            res.push(i);
                        return res;
                    }
                    move(distance) {
                        const fw = distance > 0;
                        distance = Math.abs(distance);
                        while (distance !== 0) {
                            distance--;
                            let el = this.element.find('.search-view-menu li.active');
                            if (el.length) {
                                el.removeClass('active');
                                if (fw) {
                                    el = el.next();
                                }
                                else {
                                    el = el.prev();
                                }
                                el.addClass('active');
                            }
                            else {
                                if (fw) {
                                    el = this.element.find('.search-view-menu > li:first');
                                }
                                else {
                                    el = this.element.find('.search-view-menu > li:last');
                                }
                                el.addClass('active');
                            }
                        }
                    }
                    update() {
                        if (this.groupLength !== this._groupLength) {
                            this._groupLength = this.groupLength;
                            this.scope.action.applyGroups(this.groupBy(), this.getParams());
                        }
                        else
                            this.action.setSearchParams(this.getParams());
                    }
                    groupBy() {
                        return this.facetGrouping.values.map(obj => obj._ref.groupBy);
                    }
                    show() {
                        let shouldApply = false;
                        if (!this.$items) {
                            this.$items = [].concat(this.fields);
                            shouldApply = true;
                        }
                        for (let obj of this.$items)
                            if (obj.expanded) {
                                obj.expanded = false;
                                shouldApply = true;
                            }
                        if (shouldApply)
                            this.scope.$apply();
                        this.menu.show();
                        this.first();
                    }
                    close() {
                        this.$items = null;
                        this.menu.hide();
                        this.reset();
                        this.input.val('');
                    }
                    reset() {
                        for (let i of this.fields)
                            if (i.children?.length)
                                i.expanded = false;
                    }
                    clear() {
                    }
                    addCustomFilter(field, value) {
                        let filters = new Search.SearchFilters(this);
                        filters.push(new Search.CustomFilterItem(this, field, '=', value, filters));
                        filters.selectAll();
                    }
                }
                Search.SearchView = SearchView;
                class SearchViewComponent {
                    constructor() {
                        this.restrict = 'E';
                        this.templateUrl = 'view.search.jinja2';
                        this.replace = true;
                        this.scope = false;
                    }
                }
                class SearchViewArea {
                    constructor() {
                        this.restrict = 'A';
                        this.scope = false;
                    }
                    link(scope, el, attrs) {
                        let view = scope.action.views.search;
                        scope.action.searchView = new SearchView(scope, el, view);
                        if (scope.action.context.search_default) {
                            scope.action.searchView.load(scope.action.context.search_default);
                        }
                    }
                }
                Katrid.UI.uiKatrid.controller('SearchMenuController', ['$scope', function ($scope) {
                    }]);
                Katrid.UI.uiKatrid.directive('searchView', SearchViewComponent);
                Katrid.UI.uiKatrid.directive('searchViewArea', SearchViewArea);
            })(Search = Views.Search || (Views.Search = {}));
        })(Views = Forms.Views || (Forms.Views = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            class Widget {
                constructor(field) {
                    this.field = field;
                }
                formRender(view) {
                    return;
                }
            }
            class StatusField extends Widget {
                formRender(view) {
                    return Katrid.element(`
     <status-field class="status-field status-field-sm pull-right">
      <input type="hidden" ng-model="self.%(fieldName)s"/>
      <div class="steps">
        <a :class="{active: record.${this.field.name} === item[0]}" v-for="item in view.fields.${this.field.name}.choices">
          <span>{{item[1]}}</span>
        </a>
      </div>
    </status-field> 
      `);
                }
            }
            Widgets.StatusField = StatusField;
            let RADIO_ID = 0;
            class RadioField extends Widget {
                formRender(view) {
                    let label = document.createElement('div');
                    label.setAttribute('v-for', `(choice, index) in view.fields.${this.field.name}.choices`);
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
            class StatValue extends Widget {
                formRender(view) {
                    let label = document.createElement('div');
                    label.classList.add('stat-value');
                    label.innerText = `{{record.${this.field.name}}}`;
                    return label;
                }
            }
            Widgets.StatValue = StatValue;
            Katrid.component('stat-button', {
                template: '<button class="btn stat-button"><slot/></button>',
            });
            Widgets.registry = {
                StatusField,
                RadioField,
                radio: RadioField,
                'stat-value': StatValue,
            };
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            Katrid.component('table-field', {
                template: '<div class="table-responsive"><slot></slot></div>',
                mounted() {
                    let el = this.$parent.actionView.el;
                    this.$name = this.$el.getAttribute('name');
                    this.$elView = el;
                    this.$recordLoaded = (...args) => this.recordLoaded(...args);
                    el.addEventListener('recordLoaded', this.$recordLoaded);
                },
                unmounted() {
                    this.$elView.removeEventListener('recordLoaded', this.$recordLoaded);
                },
                methods: {
                    async recordLoaded(event) {
                        let rec = event.detail.record;
                        console.log('record loaded', rec);
                        let data = {};
                        let field = this.$parent.actionView.fields[this.$name];
                        data[field.info.field || 'id'] = rec.id;
                        let res = await this.$parent.actionView.action.model.getFieldChoices({ field: this.$name, filter: data });
                        this.$parent.record[this.$name] = res.data;
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
            var registerCustomTag = Katrid.Forms.Views.registerCustomTag;
            function Tabset(el) {
                let container = document.createElement('div');
                container.classList.add('col-12', 'tabset');
                let tabset = document.createElement('div');
                let nav = document.createElement('nav');
                container.append(nav);
                tabset.classList.add('nav', 'nav-tabs');
                tabset.setAttribute('role', 'tablist');
                nav.append(tabset);
                let content = document.createElement('div');
                content.classList.add('tab-content');
                Array.from(el.children).forEach((child, index) => {
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
    var Grid;
    (function (Grid) {
        class TableColumn {
            constructor(collection, config) {
                this.width = 100;
                this._collection = collection;
                this._table = collection.table;
                let cfg = { width: this.width };
                if (config)
                    Object.assign(cfg, { text: config.caption || config.name });
                let h = collection.header[0].add(this, cfg);
                h.resizable = true;
            }
            get collection() {
                return this._collection;
            }
            get table() {
                return this._table;
            }
            get index() {
                return this._collection.indexOf(this);
            }
            startSelection() {
                let x = this.index;
                let cell = this._table.getCell(x, 0);
                this._table.startSelection(cell);
                cell.focus();
                this._table.endSelection(this._table.getCell(x, -1));
            }
        }
        Grid.TableColumn = TableColumn;
        class TableColumns extends Array {
            constructor(table, config) {
                super();
                this._table = table;
                this.header = new TableRowHeader(this);
                let h = this.header.add();
                for (let col of config.columns)
                    this.push(new TableColumn(this, col));
            }
            get table() {
                return this._table;
            }
            add(config) {
                let col = new TableColumn(this, config);
                this.push(col);
                return col;
            }
        }
        Grid.TableColumns = TableColumns;
        class TableRow extends Array {
            constructor(collection, data) {
                super();
                this.setCollection(collection);
                let items = [];
                if (_.isArray(data)) {
                    for (let v of data)
                        this.push(new TableCell(this, null, { value: v }));
                }
                this.header = new TableHeader(this);
            }
            render(tbody) {
                let tr = document.createElement('tr');
                this.header = new TableHeader(this);
                if (this._collection.showLineNumbers)
                    this.header.push(new TableHeaderCell(this, { text: this.index + 1 }));
                else if (this.key)
                    this.header.push(new TableHeaderCell(this, { text: this.key }));
                for (let header of this.header)
                    header.render(tr);
                for (let cell of this)
                    cell.render(tr);
                tbody.appendChild(tr);
                return tr;
            }
            get collection() {
                return this._collection;
            }
            setCollection(value) {
                this._collection = value;
                this.table = value.table;
            }
            get index() {
                return this._collection.indexOf(this);
            }
            startSelection() {
            }
        }
        class TableCell {
            constructor(row, col, config) {
                this.tag = 'td';
                this.allowFocus = true;
                this.row = row;
                if (row)
                    this._table = row.table;
                else if (col)
                    this._table = col.table;
                this.value = config.value;
                this.text = config.text;
            }
            render(tr) {
                if (!this.childMerged) {
                    let el = document.createElement(this.tag);
                    this.el = el;
                    if (this.allowFocus) {
                        this.el.tabIndex = 9999;
                        this.el.onpointerdown = (evt) => {
                            this.focus();
                            evt.stopPropagation();
                            evt.preventDefault();
                            this._table.isSelecting = true;
                            this._table.startSelection(this);
                        };
                        this.el.onpointerup = (evt) => {
                            evt.stopPropagation();
                            this._table.isSelecting = false;
                        };
                        this.el.onpointerenter = () => {
                            if (this._table.isSelecting) {
                                this.focus();
                                this._table.endSelection(this);
                            }
                        };
                        this.el.ondblclick = () => {
                            this.startEdit();
                        };
                    }
                    if (this.value)
                        this.text = this.value.toString();
                    el.innerHTML = this.text;
                    if (this.merged) {
                        if (this.colsMerged)
                            el.setAttribute('colspan', this.colsMerged.length.toString());
                        if (this.rowsMerged)
                            el.setAttribute('rowspan', this.rowsMerged.length.toString());
                    }
                    tr.appendChild(el);
                    return el;
                }
            }
            focus() {
                this.el.focus();
            }
            createInplaceEditor() {
                let ed = document.createElement('input');
                ed.classList.add('inplace-editor');
                this.el.appendChild(ed);
                ed.style.width = this.el.clientWidth + 'px';
                ed.onkeydown = (evt) => {
                    evt.stopPropagation();
                    if (evt.code === 'Enter' || evt.code === 'Tab') {
                        this.stopEdit(true);
                        this.next();
                        evt.preventDefault();
                    }
                    else if (evt.code === 'Escape') {
                        evt.preventDefault();
                        this.stopEdit(false);
                    }
                };
                ed.value = this.text;
                ed.focus();
                this.editor = ed;
            }
            destroyInplaceEditor(commit) {
                if (commit)
                    this.setText(this.editor.value);
                this.editor.remove();
                this.editor = null;
            }
            setText(v) {
                this.text = v;
                this.el.innerText = v;
            }
            startEdit() {
                this._editing = true;
                this.createInplaceEditor();
            }
            stopEdit(commit) {
                this.destroyInplaceEditor(commit);
                this._editing = false;
                this.focus();
            }
            next() {
                this._table.moveBy(1, 0);
            }
            get x() {
                return this.row.indexOf(this);
            }
            get y() {
                return this.row.index;
            }
            get selected() {
                return this._selected;
            }
            get editing() {
                return this._editing;
            }
            set selected(value) {
                this._selected = value;
                if (value)
                    this.el.classList.add('selected');
                else
                    this.el.classList.remove('selected');
            }
        }
        Grid.TableCell = TableCell;
        class ColSizer {
            constructor(th) {
                this._th = th;
                this.createElement();
            }
            createElement() {
                this._el = document.createElement('div');
                this._el.classList.add('col-sizer');
                this._th.appendChild(this._el);
                this._el.onpointerdown = (evt) => {
                    evt.stopPropagation();
                    evt.preventDefault();
                    let x = evt.clientX;
                    let w = this._th.clientWidth;
                    let l = this._el.clientLeft;
                    this._el.onpointermove = (evt) => {
                        let diff = evt.clientX - x;
                        this._th.style.maxWidth = w + diff + 'px';
                        this._th.style.width = this._th.style.maxWidth;
                        this._el.style.transform = `transform(${diff})px`;
                    };
                    this._el.setPointerCapture(evt.pointerId);
                };
                this._el.onpointerup = (evt) => {
                    this._el.onpointermove = null;
                    this._el.releasePointerCapture(evt.pointerId);
                };
            }
            destroyElement() {
                this._el.remove();
                delete this._el;
            }
        }
        class TableHeaderCell extends TableCell {
            constructor(axis, config) {
                super(axis, null, config);
                this.tag = 'th';
                this.allowFocus = false;
                this.axis = axis;
                this._table = axis.table;
                this.width = config.width;
            }
            render(tr) {
                let el = super.render(tr);
                el.style.width = this.width + 'px';
                if (el) {
                    if (this.resizable)
                        this.sizer = new ColSizer(el);
                    el.onpointerdown = (evt) => {
                        evt.stopPropagation();
                        evt.preventDefault();
                        this.axis.startSelection();
                    };
                    return el;
                }
            }
        }
        Grid.TableHeaderCell = TableHeaderCell;
        class TableRows extends Array {
            constructor(table) {
                super();
                this.showLineNumbers = true;
                this.table = table;
            }
            render(tbody) {
                for (let row of this)
                    row.render(tbody);
                let tr = document.createElement('tr');
                tr.classList.add('report-band');
                let td = document.createElement('td');
                tr.appendChild(td);
                td.setAttribute('colspan', (this.table.columns.length + 1).toString());
                td.innerText = 'DATA(QUERY1): SELECT * FROM TABLE1';
                tbody.insertBefore(tr, tbody.querySelector('tr:last-child'));
                let tr2 = document.createElement('tr');
                tr2.classList.add('col-header-band');
                td = document.createElement('td');
                tr2.appendChild(td);
                td.setAttribute('colspan', (this.table.columns.length + 1).toString());
                td.innerText = 'COL HEADER';
                tbody.insertBefore(tr2, tr.previousSibling);
                tr = document.createElement('tr');
                tr.classList.add('report-band');
                td = document.createElement('td');
                tr.appendChild(td);
                td.setAttribute('colspan', (this.table.columns.length + 1).toString());
                td.innerText = 'END DATA';
                tbody.appendChild(tr);
            }
            loadData(data) {
                for (let obj of data)
                    this.addRow(obj);
            }
            addRow(data, caption) {
                let row = new TableRow(this, data);
                this.push(row);
                if (!this.table.isLoading)
                    row.render(this.tbody);
                return row;
            }
        }
        Grid.TableRows = TableRows;
        class TableHeader extends Array {
            constructor(axis) {
                super();
                this.collection = axis;
                this._table = axis.table;
            }
            render(thead) {
                let tr = document.createElement('tr');
                for (let col of this)
                    col.render(tr);
                thead.appendChild(tr);
                return tr;
            }
            get table() {
                return this._table;
            }
            add(column, config) {
                let h = new TableHeaderCell(column, config);
                this.push(h);
                return h;
            }
        }
        Grid.TableHeader = TableHeader;
        class TableRowHeader extends Array {
            constructor(collection, ...items) {
                super(...items);
                this._collection = collection;
                this._table = collection.table;
            }
            render(table) {
                if (this.length) {
                    let thead = document.createElement('thead');
                    let c = 0;
                    for (let row of this) {
                        let tr = row.render(thead);
                        if (!c) {
                            let th = document.createElement('th');
                            tr.insertBefore(th, tr.firstChild);
                        }
                        c++;
                    }
                    table.appendChild(thead);
                    return thead;
                }
            }
            add(config) {
                let h = new TableHeader(this);
                this.push(h);
                return h;
            }
            get collection() {
                return this._collection;
            }
            get table() {
                return this._table;
            }
        }
        Grid.TableRowHeader = TableRowHeader;
        class CustomTable {
            constructor(config) {
                this._isLoading = true;
                this._columns = new TableColumns(this, config);
                this._rows = new TableRows(this);
                this._rows.table = this;
                if (config.data)
                    this._rows.loadData(config.data);
                this._config = config;
                let el = config.el;
                let dom = config.dom;
                if (el)
                    dom = document.querySelector(el);
                this._el = dom;
                this._isLoading = false;
                this.render();
            }
            insertRow(index) {
            }
            moveBy(x, y) {
                let cx = this.cellEnd.x + x;
                let cy = this.cellEnd.y + y;
                if (cy > -1 && cy < this._rows.length) {
                    let row = this._rows[cy];
                    if (cx > -1 && cx < row.length) {
                        let cell = row[cx];
                        this.startSelection(cell);
                        cell.focus();
                    }
                }
            }
            getCell(x, y) {
                if (y === -1)
                    y = this._rows.length - 1;
                if (x === -1)
                    x = this._columns.length - 1;
                return this._rows[y][x];
            }
            render() {
                let table = document.createElement('table');
                document.addEventListener('pointerup', () => this.isSelecting = false);
                table.classList.add('k-table');
                table.onkeydown = (evt) => {
                    switch (evt.code) {
                        case 'ArrowUp':
                            this.moveBy(0, -1);
                            break;
                        case 'ArrowLeft':
                            this.moveBy(-1, 0);
                            break;
                        case 'ArrowDown':
                            this.moveBy(0, 1);
                            break;
                        case 'ArrowRight':
                            this.moveBy(1, 0);
                            break;
                        case 'F2':
                            this.cell.startEdit();
                            break;
                        default:
                            if (/^[\w\d=*\/\-+,.]$/.test(evt.key)) {
                                this.cell.text = '';
                                this.cell.startEdit();
                            }
                    }
                };
                this._columns.header.render(table);
                let tbody = document.createElement('tbody');
                this._rows.render(tbody);
                table.appendChild(tbody);
                this._el.appendChild(table);
                return table;
            }
            get cell() {
                return this.cellBegin;
            }
            startSelection(cell) {
                this.clearSelection();
                this.cellBegin = cell;
                this.endSelection(cell);
            }
            endSelection(cell) {
                this.clearSelection();
                console.log('end selection');
                this.cellEnd = cell;
                this.updateSelection();
            }
            updateSelection() {
                let cells = [];
                let x1 = this.cellBegin.x;
                let x2 = this.cellEnd.x;
                let y1 = this.cellBegin.y;
                let y2 = this.cellEnd.y;
                if (x2 < x1) {
                    let t = x2;
                    x2 = x1;
                    x1 = t;
                }
                if (y2 < y1) {
                    let t = y2;
                    y2 = y1;
                    y1 = t;
                }
                for (let y = y1; y <= y2; y++)
                    for (let x = x1; x <= x2; x++) {
                        let cell = this._rows[y][x];
                        cells.push(cell);
                        cell.selected = true;
                    }
                this._selection = cells;
            }
            clearSelection() {
                if (this.cell && this.cell.editing)
                    this.cell.stopEdit(true);
                if (this._selection)
                    for (let cell of this._selection)
                        cell.selected = false;
            }
            get columns() {
                return this._columns;
            }
            get isLoading() {
                return this._isLoading;
            }
        }
        Grid.CustomTable = CustomTable;
    })(Grid = Katrid.Grid || (Katrid.Grid = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        let $fetch = window.fetch;
        window.fetch = function () {
            let ajaxStart = new CustomEvent('ajax.start', { detail: document, 'bubbles': true, 'cancelable': false });
            let ajaxStop = new CustomEvent('ajax.stop', { detail: document, 'bubbles': true, 'cancelable': false });
            let promise = $fetch.apply(this, arguments);
            document.dispatchEvent(ajaxStart);
            promise.finally(() => {
                document.dispatchEvent(ajaxStop);
            });
            return promise;
        };
        class Adapter {
        }
        Services.Adapter = Adapter;
        class FetchAdapter {
            $fetch(url, config, params) {
                if (params) {
                    url = new URL(url);
                    Object.entries(params).map((k, v) => url.searchParams.append(k, v));
                }
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
        class Service {
            constructor(name) {
                this.name = name;
            }
            static get url() {
                return '/api/rpc/';
            }
            ;
            static $fetch(url, config, params) {
                this.adapter.$fetch(url, config, params);
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
            delete(name, params, data) {
            }
            get(name, params) {
                const methName = this.name ? this.name + '/' : '';
                const rpcName = Katrid.settings.server + this.constructor.url + methName + name + '/';
                return $.get(rpcName, params);
            }
            post(name, data, params, config, context) {
                if (!context && Katrid.app)
                    context = Katrid.app.context;
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
                    Service.adapter.fetch(rpcName, config)
                        .then(async (response) => {
                        let contentType = response.headers.get('Content-Type');
                        if (response.status === 500) {
                            let res = await response.json();
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
                                    if (_.isString(msg))
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
                                    if (result.open)
                                        window.open(result.open);
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
        Services.Service = Service;
        class Data extends Service {
            static get url() {
                return '/web/data/';
            }
            ;
            reorder(model, ids, field = 'sequence', offset = 0) {
                return this.post('reorder', { args: [model, ids, field, offset] });
            }
        }
        Services.Data = Data;
        class Attachments {
            static delete(id) {
                let svc = new Katrid.Services.Model('content.attachment');
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
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        class Model extends Services.Service {
            searchByName(kwargs) {
                return this.post('api_search_by_name', kwargs);
            }
            createName(name) {
                let kwargs = { name };
                return this.post('api_create_name', { kwargs: kwargs });
            }
            search(data, params, config, context) {
                return this.post('api_search', { kwargs: data }, params, config, context);
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
                    res.fields = Katrid.Data.Fields.fromArray(res.fields);
                    res.fieldList = Object.values(res.fields);
                    if (res.views) {
                        Object.values(res.views).map((v) => v.fields = Katrid.Data.Fields.fromArray(v.fields));
                        Object.keys(res.views).map(k => res.views[k] = new Katrid.Forms.Views.ViewInfo(res.views[k]));
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
                    .then(this.constructor._prepareFields);
            }
            getFieldsInfo(data) {
                return this.post('admin_get_fields_info', { kwargs: data })
                    .then(this.constructor._prepareFields);
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
            rpc(meth, args, kwargs, action) {
                return new Promise((resolve, reject) => {
                    this.post(meth, { args: args, kwargs: kwargs })
                        .then((res) => {
                        resolve(res);
                    })
                        .catch(res => {
                        reject(res);
                    });
                });
            }
        }
        Services.Model = Model;
        class Query extends Model {
            constructor() {
                super('ir.query');
            }
            static read(config) {
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
        class Actions extends Model {
            static load(action) {
                let svc = new Model('ui.action');
                return svc.post('load', { args: [action], kwargs: { context: Katrid.app.context } });
            }
            static onExecuteAction(action, actionType, context) {
                let svc = new Model(actionType);
                return svc.post('on_execute_action', { args: [action], kwargs: { context } });
            }
        }
        Services.Actions = Actions;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
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
Katrid.UI.uiKatrid.directive("pwaAutocomplete", ['$controller', ($controller) => ({
        restrict: "A",
        require: "ngModel",
        link(scope, el, attrs, controller) {
            $(el).autocomplete({
                source: async (req, res) => {
                    let conn = new Katrid.Pwa.Data.Connection(scope, 'orun.pwa');
                    let objs = await conn.listStatic(attrs.service, { 'text.startsWith': req.term });
                    let items = [];
                    for (let obj of objs)
                        items.push({ value: obj.id, label: obj.text });
                    res(items);
                    return;
                    let domain;
                    if (field && field.domain) {
                        domain = field.domain;
                        if (_.isString(domain))
                            domain = scope.$eval(domain);
                    }
                    let data = {
                        args: [req.term],
                        kwargs: {
                            filter: domain,
                            limit: DEFAULT_PAGE_SIZE,
                            name_fields: attrs.nameFields && attrs.nameFields.split(",") || null
                        }
                    };
                    let svc;
                    if (fieldName)
                        svc = new Katrid.Services.Model(modelName).getFieldChoices({
                            field: fieldName, term: req.term, kwargs: data.kwargs
                        });
                    else if (scope.model)
                        svc = scope.model.getFieldChoices({ field: field.name, term: req.term, kwargs: data.kwargs });
                    else
                        svc = new Katrid.Services.Model(field.model).searchByName(data);
                    svc.then(r => {
                        let items = [];
                        for (let obj of r.items)
                            items.push({ value: obj[0], label: obj[1] });
                        res(items);
                    });
                },
                minLength: 1,
                select: (event, ui) => {
                    event.preventDefault();
                    event.stopPropagation();
                    el.val(ui.item.label);
                    scope.$apply(() => {
                        let obj = [ui.item.value, ui.item.label];
                        el.data('value', obj);
                        controller.$setViewValue(obj);
                        controller.$setDirty();
                        return false;
                    });
                    return false;
                }
            });
            controller.$parsers.push(value => {
                value = el.data('value');
                return value;
            });
            controller.$formatters.push(value => {
                if (_.isArray(value))
                    return value[1];
                return value;
            });
        }
    })]);
class PwaAutocomplete extends HTMLElement {
    connectedCallback() {
        this.classList.add('form-group', 'col-6');
        let label = document.createElement('label');
        label.innerText = this.field.caption;
        label.classList.add('form-label');
        let input = document.createElement('input');
        input.setAttribute('ng-model', this.name);
        input.setAttribute('pwa-autocomplete', '');
        input.classList.add('form-control');
        input.setAttribute('service', this.field.model);
        this.append(label);
        this.append(input);
    }
    bind(field) {
        this.field = field;
        this.name = field.name;
    }
}
class PwaChoiceField extends HTMLElement {
    connectedCallback() {
    }
    async loadOptions(el) {
        if (this.field instanceof Katrid.Data.Fields.ForeignKey) {
            let conn = new Katrid.Pwa.Data.Connection(null, 'orun.pwa');
            let objs = await conn.listStatic(this.service || this.field.model);
            console.log(this.service || this.field.model);
            for (let obj of objs) {
                let opt = document.createElement('option');
                opt.value = obj.id;
                opt.innerText = obj.text;
                el.append(opt);
            }
        }
    }
    bind(field) {
        this.field = field;
        this.name = field.name;
        this.classList.add('form-group', 'col-md-6');
        let label = document.createElement('label');
        label.innerText = this.field.caption;
        label.classList.add('form-label');
        let sel = document.createElement('select');
        this.service = this.getAttribute('service');
        sel.setAttribute('service', this.service);
        this.loadOptions(sel);
        sel.setAttribute('ng-model', this.name);
        sel.classList.add('form-control');
        this.append(label);
        this.append(sel);
    }
}
Katrid.define('pwa-autocomplete', PwaAutocomplete);
Katrid.define('pwa-choice-field', PwaChoiceField);
var Katrid;
(function (Katrid) {
    var Pwa;
    (function (Pwa) {
        var Data;
        (function (Data) {
            class Connection {
                constructor(scope, dbName) {
                    this.dbName = dbName;
                    this.scope = scope;
                }
                get db() {
                    if (!this._db) {
                        this._db = new Dexie(this.dbName);
                        this._db.version(5)
                            .stores({ records: '++$id, service, values, uuid, status, id', variables: 'name, value', staticData: '$id, service, id, text, data' });
                    }
                    return this._db;
                }
                async getVar(varName) {
                    let res = await this.db.variables.get(varName);
                    return res?.value;
                }
                setVar(varName, varValue) {
                    return this.db.transaction('rw', this.db.variables, async () => {
                        let res = await this.db.variables.where({ name: varName }).modify({ value: varValue });
                        if (res === 0)
                            await this.db.variables.add({ name: varName, value: varValue });
                    });
                }
                async save(service, data) {
                    console.log('save', service, data);
                    let r;
                    if (data.$id) {
                        await this.db.records.update(data.$id, {
                            $id: data.$id,
                            service,
                            data,
                            status: 'pending',
                        });
                        r = data.$id;
                    }
                    else {
                        r = await this.db.records.add({
                            service,
                            uuid: _.guid(),
                            data,
                            status: 'pending',
                        });
                        data.$id = r;
                    }
                    navigator.serviceWorker.ready.then(function (reg) {
                        return reg.sync.register('orun-sync');
                    });
                    return r;
                }
                first(service) {
                    return new Promise((resolve, reject) => {
                        this.db.records.where({ service }).first(obj => resolve(obj.data));
                    });
                }
                saveChild(name) {
                    let child = this.scope['form_' + name];
                    let record = child.record;
                    child.$records.push(child.record);
                    if (!this.scope.record[name])
                        this.scope.record[name] = [];
                    record = { action: 'CREATE', values: record };
                    this.scope.record[name].push(record);
                    child.record = null;
                }
                async getById(service, member, where) {
                    let model = new Katrid.Services.Model(service);
                    let res = await model.getById(where);
                    this.scope[member] = res.data[0];
                    this.scope.$apply();
                    return res;
                }
                async list(service, where = null) {
                    return (await this.db.records.where({ service }).toArray()).map(obj => {
                        let r = obj.data;
                        r.$id = obj.$id;
                        return r;
                    });
                }
                async listStatic(service, where = null) {
                    let qs = this.db.staticData.where({ service });
                    if (where)
                        for (let [k, v] of Object.entries(where)) {
                            if (k.indexOf('.') > -1) {
                                let w = k.split('.');
                            }
                        }
                    return (await qs.toArray()).map(obj => ({ id: obj.id, text: obj.text }));
                }
                async delete(service, id) {
                    await this.db.records.where({ service, $id: id }).delete();
                }
            }
            Data.Connection = Connection;
        })(Data = Pwa.Data || (Pwa.Data = {}));
    })(Pwa = Katrid.Pwa || (Katrid.Pwa = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Pwa;
    (function (Pwa) {
        Pwa.modelInfo = {};
        class PwaWindowAction {
            constructor(scope) {
                this.scope = scope;
            }
        }
        class Application extends Katrid.Core.Application {
            createControllers(app) {
                Katrid.settings.ui.foreignKey = { allowCreate: false, allowCreateEdit: false };
                app.controller('pwaController', function ($scope, $compile) {
                    Katrid.Core.$compile = $compile;
                    let connection = new Katrid.Pwa.Data.Connection($scope, 'orun.pwa');
                    $scope.goto = async (path) => {
                        let content = $(await fetch(path).then(res => res.text()))[0];
                        let ngView = document.querySelector('pwa-view');
                        $(ngView).empty()
                            .append(content);
                        $compile(content)($scope);
                    };
                    $scope.list = async (service, member = 'records', where = null) => {
                        let lst = await connection.list(service);
                        if (!lst)
                            lst = [];
                        $scope[member] = lst;
                        $scope.$apply();
                    };
                    $scope.first = async (service) => {
                        $scope.record = await connection.first(service);
                        $scope.$apply();
                    };
                    $scope.dbGetVar = async (varName, defaultValue) => {
                        let value = $scope[varName] = await connection.getVar(varName);
                        console.log('set var', varName, value, defaultValue);
                        if (!value && defaultValue) {
                            $scope[varName] = defaultValue;
                            await $scope.dbSetVar(varName, defaultValue);
                        }
                        $scope.$apply();
                    };
                    $scope.getQueryParameter = (paramName) => {
                        let qs = window.location.href.split('?', 2)[1];
                        if (qs) {
                            let params = new URLSearchParams(qs);
                            console.log(params);
                            if (params.has(paramName))
                                return params.get(paramName);
                        }
                    };
                    $scope.dbSetVar = async (varName, varValue) => {
                        $scope[varName] = varValue;
                        return connection.setVar(varName, varValue);
                    };
                    $scope.createNew = () => {
                        $scope.record = {};
                        $scope.changing = true;
                    };
                    $scope.save = async (data, service, path = null) => {
                        if (!service)
                            service = $scope.view.model;
                        if (!data.$id && $scope.records)
                            $scope.records.push(data);
                        await connection.save(service, data);
                        $scope.record = null;
                        $scope.changing = false;
                        $scope.$apply();
                        if (path)
                            window.location.href = path;
                    };
                    $scope.edit = (record) => {
                        if (record.$attachments)
                            for (let att of record.$attachments)
                                if (att.data)
                                    att.url = URL.createObjectURL(att.data);
                        $scope.record = record;
                        $scope.changing = true;
                    };
                    $scope.delete = (record, member = 'records', service = null) => {
                        if (record.$id) {
                            if (!service)
                                service = $scope.view.model;
                            connection.delete(service, record.$id);
                            $scope[member].splice($scope[member].indexOf(record), 1);
                        }
                    };
                    $scope.confirm = (msg) => confirm(msg);
                    $scope.sum = (iterable, member) => {
                        let res = 0;
                        for (let obj of iterable)
                            res += parseFloat(obj[member]) || 0;
                        console.log('sum', res, member);
                        return res;
                    };
                    $scope.min = (iterable, member) => {
                        return Math.min(...iterable.map(obj => obj[member]));
                    };
                    $scope.avg = (iterable, member) => {
                        return $scope.sum(iterable, member) / iterable.length;
                    };
                    $scope.max = (iterable, member) => {
                        return Math.max(...iterable.map(obj => obj[member]));
                    };
                });
            }
        }
        Pwa.Application = Application;
    })(Pwa = Katrid.Pwa || (Katrid.Pwa = {}));
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
                    secondField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}-2" v-model="param.value2" input-decimal class="form-control"></div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-xs-6"><input id="rep-param-id-${param.id}" input-decimal v-model="param.value1" class="form-control"></div>${secondField}</div>`;
            },
            DateTimeField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-xs-6"><input id="rep-param-id-${param.id}-2" type="text" date-picker="L" v-model="param.value2" class="form-control"></div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-xs-6"><input id="rep-param-id-${param.id}" type="text" date-picker="L" v-model="param.value1" class="form-control"></div>${secondField}</div>`;
            },
            DateField(param) {
                let secondField = '';
                if (param.operation === 'between') {
                    secondField = `<div class="col-xs-6">
<input-date class="input-group date" v-model="param.value2" date-picker="L">
<input id="rep-param-id-${param.id}-2" type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <div class="input-group-append input-group-addon"><div class="input-group-text"><i class="fa fa-calendar fa-sm"></i></div></div>
</input-date>
</div>`;
                }
                return `<div class="col-sm-12 row"><div class="col-xs-6">
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
                console.log(param);
                let multiple = '';
                let tag = 'select';
                if (param.operation === 'in') {
                    tag = 'multiple-tags';
                    multiple = 'multiple="multiple"';
                }
                else
                    multiple = 'class="form-control"';
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
                return `<div class="col-sm-4"><select id="param-op-${this.id}" v-model="param.operation" class="form-control" onchange="$('#param-${this.id}').data('param').change();$('#rep-param-id-${this.id}')[0].focus()">
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
                        break;
                    }
            }
            getValues() { }
            export(format) {
                if (format == null)
                    format = localStorage.katridReportViewer || 'pdf';
                const params = this.getUserParams();
                const svc = new Katrid.Services.Model('ui.action.report');
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
            <button class="btn btn-primary" type="button" v-on:click="report.preview()"><span class="fa fa-print fa-fw"></span> ${_.gettext('Preview')}</button>

            <div class="btn-group">
              <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                      aria-expanded="false">${_.gettext('Export')} <span class="caret"></span></button>
              <div class="dropdown-menu">
                <a class="dropdown-item" v-on:click="Katrid.Reports.Reports.preview()">PDF</a>
                <a class="dropdown-item" v-on:click="$event.preventDefault();report.telegram();">Telegram</a>
                <a class="dropdown-item" v-on:click="report.export('docx')">Word</a>
                <a class="dropdown-item" v-on:click="report.export('xlsx')">Excel</a>
                <a class="dropdown-item" v-on:click="report.export('pptx')">PowerPoint</a>
                <a class="dropdown-item" v-on:click="report.export('csv')">CSV</a>
                <a class="dropdown-item" v-on:click="report.export('txt')">${_.gettext('Text File')}</a>
              </div>
            </div>

            <div class="btn-group">
              <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                      aria-expanded="false">${_.gettext('My reports')} <span class="caret"></span></button>
              <ul class="dropdown-menu">
              </ul>
            </div>

          <div class="pull-right btn-group">
            <button class="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                    aria-expanded="false"><i class="fa fa-sliders-h"></i></button>
            <div class="dropdown-menu">
              <a class="dropdown-item" v-on:click="report.saveDialog()">${_.gettext('Save')}</a>
              <a class="dropdown-item">${_.gettext('Load')}</a>
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
                <label>${_.gettext('My reports')}</label>

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
        <div class="checkbox"><label><input type="checkbox" v-model="paramsAdvancedOptions"> ${_.gettext('Advanced options')}</label></div>
        <div v-show="paramsAdvancedOptions">
          <div class="form-group">
            <label>${_.gettext('Printable Fields')}</label>
            <input type="hidden" id="report-id-fields"/>
          </div>
          <div class="form-group">
            <label>${_.gettext('Totalizing Fields')}</label>
            <input type="hidden" id="report-id-totals"/>
          </div>
        </div>
      </div>

      <div class="clearfix"></div>

      </div>
        <div v-if="advancedOptions">
        <div id="params-sorting" class="col-sm-12 form-group">
          <label class="control-label">${_.gettext('Sorting')}</label>
          <select multiple id="report-id-sorting"></select>
        </div>

        <div id="params-grouping" class="col-sm-12 form-group">
          <label class="control-label">${_.gettext('Grouping')}</label>
          <select multiple id="report-id-grouping"></select>
        </div>
        <hr>
        <table class="col-sm-12">
          <tr>
            <td class="col-sm-4">
              <select class="form-control" v-model="newParam">
                <option value="">--- ${_.gettext('FILTERS')} ---</option>
                <option v-for="field in report.fields" :value="field.name">{{ field.label }}</option>
              </select>
            </td>
            <td class="col-sm-8">
              <button
                  class="btn btn-outline-secondary" type="button"
                  v-on:click="report.addParam(newParam)">
                <i class="fa fa-plus fa-fw"></i> ${_.gettext('Add Parameter')}
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
        let MENU_DELAY = 1000;
        class AppHeader extends HTMLElement {
            constructor() {
                super(...arguments);
                this._menuClicked = false;
            }
            connectedCallback() {
                this.loadModules(Katrid.app.config.menu);
                this.createUserMenu();
                document.addEventListener('click', evt => {
                    this._menuClicked = false;
                    this.hideMenu();
                });
                this.create();
            }
            create() {
                this.inputSearch = this.querySelector('#navbar-search');
                this.autocomplete = new AppGlobalSearch(this.inputSearch);
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
                    if (!imgPath)
                        imgPath = '/static/admin/assets/img/cube.svg';
                    let img = document.createElement('img');
                    img.src = imgPath;
                    menuItem.append(img);
                    let span = document.createElement('span');
                    span.innerText = item.name;
                    menuItem.append(span);
                    menu.append(menuItem);
                    menuItem.setAttribute('href', '#/app/?menu_id=' + item.id);
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
                module.setAttribute('data-toggle', 'dropdown');
                dropdown.append(module);
                this.insertBefore(dropdown, this.navMenu);
                dropdown.setAttribute('data-menu-id', menu.id.toString());
                if (Katrid.isMobile) {
                    module.classList.add('dropdown-toggle');
                    dropdown.classList.add('mr-auto');
                    if (menu.children && menu.children.length) {
                        let dropdownMenu = this.createDropdownMenu(menu.children);
                        dropdown.append(dropdownMenu);
                    }
                }
                else {
                    let ul = document.createElement('ul');
                    ul.classList.add('navbar-nav', 'navbar-menu-group', 'mr-auto');
                    ul.style.display = 'none';
                    ul.setAttribute('data-parent-id', menu.id.toString());
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
                            a.setAttribute('href', '#/app/?menu_id=' + this._rootItem.id.toString() + '&action=' + item.action);
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
                el.classList.add('dropdown-item');
                el.setAttribute('id', 'ui-menu-' + item.id.toString());
                el.setAttribute('data-menu-id', item.id.toString());
                if (item.url)
                    el.setAttribute('href', '#/app/?menu_id=' + item.id.toString());
                return el;
            }
            createMenuItem(item, dropdownMenu) {
                if (item.children && item.children.length) {
                    let menuItem = this.createDropdownItem(item);
                    menuItem.innerText = item.name;
                    let li = document.createElement('li');
                    let ul = document.createElement('ul');
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
                        menuItem.setAttribute('href', '#/app/?menu_id=' + this._rootItem.id + '&action=' + item.action);
                        menuItem.addEventListener('click', evt => {
                            evt.stopPropagation();
                            this.hideMenu();
                        });
                    }
                    dropdownMenu.append(menuItem);
                    return menuItem;
                }
            }
            createUserMenu() {
                let li = this.querySelector('.nav-item.user-menu.dropdown');
                li.addEventListener('pointerover', () => li.classList.add('show'));
                li.addEventListener('pointerout', () => li.classList.remove('show'));
            }
        }
        UI.AppHeader = AppHeader;
        Katrid.define('app-header', AppHeader);
        class AppGlobalSearch {
            constructor(input) {
                this.input = input;
                this.menu = null;
                this.term = '';
                this.input.addEventListener('input', () => this.onInput());
                this.input.addEventListener('click', event => {
                    this.input.select();
                    this.onClick();
                });
                this.input.addEventListener('blur', () => this.onFocusout());
                this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
                this.setSource(async (query) => {
                    console.log('set source', query);
                    return Katrid.Services.Service.$post('/web/menu/search/', { term: query.term }).then(res => res.items);
                });
            }
            onInput() {
                this.term = this.input.value;
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
                    if (item?.type === 'menuitem')
                        document.querySelector(`[data-menu-id="${item.id}"]`).click();
                }
                this.hideMenu();
            }
            setValue(item, el) {
                let event = new CustomEvent('selectItem', {
                    detail: {
                        item,
                        dropdownItem: el,
                    }
                });
                if (!event.defaultPrevented) {
                    this.selectedItem = item;
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
(function () {
    Katrid.UI.uiKatrid
        .directive('codeEditor', [function () {
            return {
                restrict: 'EA',
                require: 'ngModel',
                link: function (scope, elm, attrs, ngModel) {
                    let editor;
                    require.config({
                        paths: {
                            vs: '/static/web/monaco/min/vs',
                        }
                    });
                    console.log('set language', attrs.language);
                    require(['vs/editor/editor.main'], function () {
                        editor = monaco.editor.create(elm[0], {
                            value: '',
                            language: attrs.language || 'xml',
                            minimap: {
                                enabled: false,
                            },
                            automaticLayout: true,
                        });
                        editor.getModel().onDidChangeContent(evt => {
                            ngModel.$setViewValue(editor.getValue());
                        });
                        ngModel.$render = function () {
                            setTimeout(() => {
                                editor.setValue(ngModel.$viewValue);
                            }, 300);
                        };
                    });
                }
            };
        }]);
})();
(function () {
    let uiKatrid = Katrid.UI.uiKatrid;
    let formCount = 0;
    uiKatrid.directive('formField2', ['$compile', function ($compile) {
            return {
                restrict: 'A',
                priority: 99,
                replace: true,
                compile(el, attrs) {
                    return function (scope, element, attrs, ctrl) {
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
                        if (fieldAttributes['ng-readonly'])
                            sectionAttrs['ng-readonly'] = fieldAttributes['ng-readonly'].toString();
                        if (attrs.ngShow)
                            sectionAttrs['ng-show'] = attrs.ngShow;
                        if (field.helpText) {
                            sectionAttrs['title'] = field.helpText;
                        }
                        let content = element.html();
                        templ = Katrid.app.getTemplate(templ, {
                            name: attrs.name, field, attrs: fieldAttributes, content, fieldAttributes: attrs, sectionAttrs,
                        });
                        templ = $compile(templ)(scope);
                        element.replaceWith(templ);
                        let fcontrol = templ.find('.form-field');
                        if (fcontrol.length) {
                            fcontrol = fcontrol[fcontrol.length - 1];
                            const form = templ.controller('form');
                            ctrl = angular.element(fcontrol).data().$ngModelController;
                            if (ctrl)
                                form.$addControl(ctrl);
                        }
                    };
                },
            };
        }]);
    uiKatrid.directive('inputField', () => ({
        restrict: 'A',
        scope: false,
        link(scope, element, attrs) {
            $(element).on('click', function () {
                $(this).select();
            });
        }
    }));
    uiKatrid.directive('view', () => ({
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
    }));
    uiKatrid.directive('ngSum', () => ({
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
    }));
    uiKatrid.directive('ngEnter', () => (scope, element, attrs) => element.bind("keydown keypress", (event) => {
        if (event.which === 13) {
            scope.$apply(() => scope.$eval(attrs.ngEnter, { $event: event }));
            event.preventDefault();
        }
    }));
    uiKatrid.directive('ngEsc', () => (scope, element, attrs) => element.bind("keydown keypress", (event) => {
        if (event.which === 27) {
            scope.$apply(() => scope.$eval(attrs.ngEsc, { $event: event }));
            event.preventDefault();
        }
    }));
    if ($.fn.modal)
        $.fn.modal.Constructor.prototype._enforceFocus = function () { };
    uiKatrid.directive('ajaxChoices', ['$location', $location => ({
            restrict: 'A',
            require: '?ngModel',
            link(scope, element, attrs, controller) {
                const { multiple } = attrs;
                const serviceName = attrs.ajaxChoices;
                let field = attrs.field;
                let _timeout = null;
                let domain;
                const cfg = {
                    allowClear: true,
                    query(query) {
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
                            if (field)
                                svc = svc.getFieldChoices({ field, term: query.term, kwargs: data.kwargs });
                            else
                                svc = new Katrid.Services.Model(attrs.modelChoices).searchByName(data);
                            svc.then(res => {
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
                        const v = controller.$modelValue;
                        if (v) {
                            if (multiple) {
                                const values = [];
                                for (let i of Array.from(v)) {
                                    values.push({ id: i.id, text: i.text });
                                }
                                return callback(values);
                            }
                            else {
                                return callback({ id: v.id, text: v.text });
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
        })]);
    uiKatrid.directive('inputMask', () => ({
        restrict: 'A',
        link(scope, el, attrs) {
            el.inputmask();
        }
    }));
    class Decimal {
        constructor($filter) {
            this.restrict = 'A';
            this.require = '?ngModel';
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
            if (controller && controller.$parsers) {
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
    }
    uiKatrid.directive('inputDecimal', ['$filter', Decimal]);
    uiKatrid.filter('moment', () => function (input, format) {
        if (format) {
            return moment().format(format);
        }
        return moment(input).fromNow();
    });
    uiKatrid.directive('fileReader', () => ({
        restrict: 'A',
        require: 'ngModel',
        scope: {},
        link(scope, element, attrs, controller) {
            if (attrs.accept === 'image/*') {
                element.tag === 'INPUT';
            }
            return element.bind('change', event => {
                const reader = new FileReader();
                reader.onload = event => {
                    const res = event.target.result;
                    controller.$setViewValue(res);
                };
                return reader.readAsDataURL(event.target.files[0]);
            });
        }
    }));
    uiKatrid.directive('dateInput', ['$filter', ($filter) => ({
            restrict: 'A',
            require: '?ngModel',
            link(scope, element, attrs, controller) {
                let setNow = () => {
                    let value;
                    if (attrs.type === 'date')
                        value = (new Date()).toISOString().split('T')[0];
                    else
                        value = moment(new Date()).format('YYYY-MM-DD HH:mm').replace(' ', 'T');
                    $(element).val(value);
                    controller.$setViewValue(value);
                    _focus = false;
                };
                let _focus = true;
                element
                    .focus(function () {
                    if (($(this).val() === ''))
                        _focus = true;
                })
                    .keypress(function (evt) {
                    if (evt.key.toLowerCase() === 'h') {
                        setNow();
                        evt.stopPropagation();
                        evt.preventDefault();
                    }
                })
                    .keydown(function (evt) {
                    if (/\d/.test(evt.key)) {
                        if (($(this).val() === '') && (_focus))
                            setNow();
                    }
                });
                controller.$formatters.push(function (value) {
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
            el.on('focus', function () {
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
            controller.$render = function () {
                let v = controller.$modelValue;
                console.log('render', v);
                if (v)
                    return el.val(moment.utc(v).format('HH:mm'));
            };
        }
    }));
    uiKatrid.directive('cardDraggable', () => {
        return {
            restrict: 'A',
            link(scope, element, attrs, controller) {
                let cfg = {
                    connectWith: attrs.cardDraggable,
                    cursor: 'move',
                };
                if (!_.isUndefined(attrs.cardItem))
                    cfg['receive'] = (event, ui) => {
                        console.log('event');
                        let parent = angular.element(ui.item.parent()).scope();
                        let scope = angular.element(ui.item).scope();
                        console.log(scope);
                        console.log(parent);
                        let data = {};
                        data['id'] = scope.record.id;
                        $.extend(data, parent.group.$params[0]);
                        console.log(data);
                        parent.model.write([data])
                            .then(res => {
                            console.log('write ok', res);
                        });
                    };
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
                console.log(cfg);
                element.sortable(cfg).disableSelection();
                $('#sortable').sortable();
            }
        };
    });
    uiKatrid.directive('uiTooltip', () => ({
        restrict: 'A',
        link: (scope, el, attrs) => {
            $(el).tooltip({
                container: 'body',
                trigger: 'hover',
                html: true,
                placement: 'left',
                title: () => {
                    return attrs.uiTooltip;
                },
                delay: {
                    show: 1000,
                }
            });
        }
    }));
    uiKatrid.directive('actionLink', () => ({
        restrict: 'A',
        link: (scope, el, attrs) => {
            el[0].addEventListener('click', () => {
                console.log('do click');
            });
        }
    }));
    uiKatrid.setFocus = (el) => {
        let e = $(el);
        if (e.data('select2'))
            e.select2('focus');
        else
            el.focus();
    };
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
                    if (attrs.object)
                        scope.model.rpc(attrs.object, [scope.$parent.record.id]);
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
                            });
                        }
                    });
                }
                $scope.kanbanHideAddGroupItemDlg(event);
            };
        }
    }
})();
(function () {
    let uiKatrid = Katrid.UI.uiKatrid;
    uiKatrid.directive('datePicker', ['$filter', $filter => ({
            restrict: 'A',
            require: '?ngModel',
            link(scope, el, attrs, controller) {
                let mask = '99/99/9999';
                let format = attrs.datePicker || 'L';
                if (format === 'L LT')
                    mask = '99/99/9999 99:99';
                el.inputmask({
                    mask,
                    insertMode: false,
                });
                let calendar = $(el.parent()).datetimepicker({
                    useCurrent: false,
                    format,
                    icons: {
                        time: 'fa fa-clock',
                    },
                })
                    .on('dp.change', function (evt) {
                    calendar.datetimepicker('hide');
                })
                    .on('dp.hide', function (evt) {
                    controller.$setDirty();
                    controller.$setViewValue(el.val());
                });
                el.on('focus', () => el.select());
                controller.$render = function () {
                    if (controller.$modelValue) {
                        calendar.datetimepicker('date', moment.utc(controller.$modelValue));
                    }
                    else
                        el.val('');
                };
                el.on('blur', () => {
                    let v = moment(el.val(), format);
                    if (v.isValid())
                        controller.$modelValue = v.format('YYYY-MM-DD');
                    else
                        controller.$modelValue = null;
                });
                controller.$parsers.push(value => {
                    let v = moment(el.val(), format);
                    if (v.isValid()) {
                        if (format === 'L')
                            return v.format('YYYY-MM-DD');
                        else if (format === 'L LT')
                            return v.format('YYYY-MM-DD HH:mm');
                    }
                    return null;
                });
            }
        })]);
    uiKatrid.directive('timePicker', ['$filter', $filter => ({
            restrict: 'A',
            require: '?ngModel',
            link(scope, el, attrs, controller) {
                let mask = '99:99';
                el.inputmask({
                    mask,
                    insertMode: false,
                });
                el.on('focus', () => el.select());
            }
        })]);
})();
(function () {
    const DEFAULT_PAGE_SIZE = 12;
    class Component {
        constructor(el, config) {
            this.config = config;
            this.create();
            this.render();
            this.$el = $(el);
        }
        create() {
        }
        render() {
        }
    }
    Katrid.settings.ui.foreignKey = { allowCreate: true, allowCreateEdit: true };
    Katrid.UI.uiKatrid.directive('inputAutocomplete', ['$controller', ($controller) => ({
            restrict: 'A',
            scope: false,
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                ngModel.$formatters.push(function (value) {
                    if (value) {
                        element[0].$selectedItem = value;
                        return value.text;
                    }
                    element[0].selectedItem = null;
                    return '';
                });
                element[0].addEventListener('selectItem', function (evt) {
                    if (evt.detail.item)
                        ngModel.$setViewValue(evt.detail.item);
                    else
                        ngModel.$setViewValue(null);
                });
            }
        })]);
    Katrid.UI.uiKatrid.directive("fkAutocomplete", ['$controller', ($controller) => ({
            restrict: "A",
            require: "ngModel",
            link(scope, el, attrs, controller) {
                let fieldName = attrs.field;
                let modelName = attrs.modelName;
                let field;
                if (!fieldName) {
                    field = scope.view.fields[attrs.name];
                    if (!field)
                        field = scope.action.fields[attrs.name];
                }
                $(el).autocomplete({
                    source: (req, res) => {
                        let domain;
                        if (field && field.domain) {
                            domain = field.domain;
                            if (_.isString(domain))
                                domain = scope.$eval(domain);
                        }
                        let data = {
                            args: [req.term],
                            kwargs: {
                                filter: domain,
                                limit: DEFAULT_PAGE_SIZE,
                                name_fields: attrs.nameFields && attrs.nameFields.split(",") || null
                            }
                        };
                        let svc;
                        if (fieldName)
                            svc = new Katrid.Services.Model(modelName).getFieldChoices({
                                field: fieldName, term: req.term, kwargs: data.kwargs
                            });
                        else if (scope.model)
                            svc = scope.model.getFieldChoices({ field: field.name, term: req.term, kwargs: data.kwargs });
                        else
                            svc = new Katrid.Services.Model(field.model).searchByName(data);
                        svc.then(r => {
                            let items = [];
                            for (let obj of r.items)
                                items.push({ value: obj[0], label: obj[1] });
                            res(items);
                        });
                    },
                    minLength: 1,
                    select: (event, ui) => {
                        event.preventDefault();
                        event.stopPropagation();
                        el.val(ui.item.label);
                        scope.$apply(() => {
                            let obj = [ui.item.value, ui.item.label];
                            el.data('value', obj);
                            controller.$setViewValue(obj);
                            controller.$setDirty();
                            return false;
                        });
                        return false;
                    }
                });
                controller.$parsers.push(value => {
                    value = el.data('value');
                    return value;
                });
                controller.$formatters.push(value => {
                    if (_.isArray(value))
                        return value[1];
                    return value;
                });
            }
        })]);
    Katrid.UI.uiKatrid.directive("foreignkey", ['$controller', ($controller) => ({
            restrict: "A",
            require: "ngModel",
            link(scope, el, attrs, controller) {
                let serviceName;
                let sel = el;
                let _shown = false;
                const field = scope.view.fields[attrs.name];
                el.addClass("form-field");
                if (attrs.serviceName)
                    serviceName = attrs;
                else if (scope.action && scope.action.model)
                    serviceName = scope.action.model.name;
                else
                    serviceName = attrs.foreignkey;
                const newItem = function () {
                };
                const newEditItem = function () {
                };
                let _timeout = null;
                let config = {
                    allowClear: true,
                    query(query) {
                        let domain = attrs.filter || field.filter;
                        if (domain && _.isString(domain))
                            domain = scope.$eval(domain);
                        let format = 'html';
                        let data = {
                            args: [query.term],
                            kwargs: {
                                count: 1,
                                page: query.page,
                                filter: domain,
                                format,
                                name_fields: attrs.nameFields && attrs.nameFields.split(",") || null
                            }
                        };
                        const f = () => {
                            let svc;
                            if (scope.model)
                                svc = scope.model.getFieldChoices({
                                    field: field.name,
                                    term: query.term,
                                    kwargs: data.kwargs
                                });
                            else
                                svc = new Katrid.Services.Model(field.model).searchByName(data);
                            svc.then(res => {
                                let data = res.items;
                                const r = data.map(item => ({
                                    id: item[0],
                                    text: item[2] || item[1],
                                    str: item[1],
                                }));
                                const more = query.page * Katrid.settings.services.choicesPageLimit < res.count;
                                if (!multiple && !more) {
                                    let msg;
                                    let fkSettings = { allowCreate: Katrid.settings.ui.foreignKey.allowCreate };
                                    const v = sel.data("select2").search.val();
                                    if ((attrs.allowCreate && attrs.allowCreate !== "false" || attrs.allowCreate == null) && v)
                                        fkSettings.allowCreate = false;
                                    if (fkSettings.allowCreate) {
                                        msg = Katrid.i18n.gettext('Create <i>"%s"</i>...');
                                        r.push({
                                            id: newItem,
                                            text: msg
                                        });
                                    }
                                }
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
                    ajax: {
                        url: `/api/rpc/${serviceName}/get_field_choices/`,
                        contentType: "application/json",
                        dataType: "json",
                        type: "POST"
                    },
                    formatSelection(val) {
                        if (val.id === newItem || val.id === newEditItem)
                            return Katrid.i18n.gettext("Creating...");
                        return val.text;
                    },
                    formatResult(state) {
                        const s = sel.data("select2").search.val();
                        if (state.id === newItem) {
                            state.str = s;
                            return `<strong>${sprintf(state.text, s)}</strong>`;
                        }
                        else if (state.id === newEditItem) {
                            state.str = s;
                            return `<strong>${sprintf(state.text, s)}</strong>`;
                        }
                        return state.text;
                    },
                    initSelection(el, cb) {
                        let v = controller.$modelValue;
                        if (multiple) {
                            v = v.map(obj => ({
                                id: obj[0],
                                text: obj[1]
                            }));
                            return cb(v);
                        }
                        else if (_.isArray(v)) {
                            return cb({
                                id: v[0],
                                text: v[1]
                            });
                        }
                    }
                };
                let allowCreateEdit = attrs.noCreateEdit;
                if (allowCreateEdit === undefined)
                    allowCreateEdit = Katrid.settings.ui.foreignKey.allowCreateEdit;
                else
                    allowCreateEdit = !Boolean(allowCreateEdit);
                let { multiple: multiple } = attrs;
                if (multiple) {
                    config["multiple"] = true;
                }
                sel = sel.select2(config);
                let createNew = () => {
                    sel.select2('close');
                    let service = new Katrid.Services.Model(field.info.model);
                    return service.getViewInfo({
                        view_type: "form"
                    }).then(function (res) {
                        let title = _.sprintf(Katrid.i18n.gettext('Create: %(title)s'), { title: field.caption });
                        let options = {
                            scope: scope.$new(true),
                            $controller: $controller,
                            sel: sel, field: field,
                            title: title,
                            view: res,
                            model: service,
                            caption: field.caption,
                        };
                        let wnd = new Katrid.Forms.Dialogs.Window(options);
                        wnd.createNew();
                    });
                };
                console.log('allow create edit', allowCreateEdit);
                if (allowCreateEdit)
                    sel.parent().find('div.select2-container>div.select2-drop')
                        .append(`<div style="padding: 4px;"><button type="button" class="btn btn-link btn-sm">${Katrid.i18n.gettext('Create New...')}</button></div>`)
                        .find('button').click(createNew);
                sel.on("change", async (e) => {
                    let v = e.added;
                    if (v && v.id === newItem) {
                        let service = new Katrid.Services.Model(field.model);
                        try {
                            let res = await service.createName(v.str);
                            let vals = {};
                            vals[field.name] = res;
                            scope.dataSource.setValues(vals);
                            sel.select2('data', { id: res[0], text: res[1] });
                        }
                        catch (err) {
                            let res = await service.getViewInfo({
                                view_type: "form"
                            });
                            let title = _.sprintf(Katrid.i18n.gettext('Create: %(title)s'), { title: field.caption });
                            let options = {
                                scope: scope.$new(true),
                                $controller: $controller,
                                sel: sel, field: field,
                                title: title,
                                view: res,
                                model: service,
                                action: scope.action,
                            };
                            let wnd = new Katrid.Forms.Dialogs.Window(options);
                            wnd.createNew({ creationName: v.str });
                            sel.select2('data', null);
                        }
                    }
                    else if (v && v.id === newEditItem) {
                    }
                    else if (multiple && e.val.length) {
                        return controller.$setViewValue(e.val);
                    }
                    else {
                        controller.$setDirty();
                        if (v) {
                            return controller.$setViewValue([v.id, v.str]);
                        }
                        else {
                            return controller.$setViewValue(null);
                        }
                    }
                }).on("select2-open", () => {
                    if (!_shown) {
                        _shown = true;
                        let parentModal = el.closest("div.modal");
                        if (parentModal.length)
                            parentModal.on("hide.bs.modal", () => sel.select2("destroy"));
                    }
                });
                controller.$parsers.push(value => {
                    if (value) {
                        if (_.isArray(value))
                            return value;
                        else if (_.isObject(value))
                            return [value.id, value.text];
                        else
                            return value;
                    }
                    return null;
                });
                if (!multiple)
                    scope.$watch(attrs.ngModel, (newValue, oldValue) => sel.select2("val", newValue));
                return controller.$render = function () {
                    if (multiple) {
                        if (controller.$modelValue) {
                            const v = Array.from(controller.$modelValue).map(obj => obj[0]);
                            sel.select2("val", controller.$modelValue);
                        }
                    }
                    else if (controller.$viewValue) {
                        return sel.select2("val", controller.$viewValue[0]);
                    }
                    else {
                        return sel.select2("val", null);
                    }
                };
            }
        })]);
    Katrid.UI.uiKatrid.directive('multipleTags', ['$controller', ($controller) => ({
            restrict: 'A',
            scope: false,
            require: 'ngModel',
            link: (scope, element, attrs, ngModel) => {
                element.select2();
            }
        })]);
    Katrid.UI.uiKatrid.filter('m2m', () => function (input) {
        if (_.isArray(input))
            return input.map((obj) => obj ? obj[1] : null).join(', ');
    });
})();
(function () {
    Katrid.UI.uiKatrid.directive('sortableField', ['$compile', '$timeout', ($compile, $timeout) => ({
            restrict: 'E',
            require: 'ngModel',
            replace: true,
            scope: {},
            link: {
                post: function (scope, el, attrs) {
                    let tbl = el.closest('tbody');
                    let fixHelperModified = function (e, tr) {
                        let $originals = tr.children();
                        let $helper = tr.clone();
                        $helper.children().each(function (index) {
                            $(this).width($originals.eq(index).width());
                        });
                        return $helper;
                    }, updateIndex = function (e, ui) {
                        $('td.list-column-sortable', ui.item.parent()).each(function (i) {
                        });
                    };
                    tbl.sortable({
                        helper: fixHelperModified,
                        stop: updateIndex
                    }).disableSelection();
                }
            },
            template(element, attrs) {
                return sprintf(Katrid.$templateCache.get('view.field.SortableField'), { fieldName: attrs.name });
            }
        })
    ]);
})();
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
Katrid.filter('sprintf', function (fmt, ...args) {
    return _.sprintf(fmt, ...args);
});
(function () {
    class Total {
        constructor($filter) {
            this.restrict = 'E';
            this.scope = false;
            this.replace = true;
            this.$filter = $filter;
        }
        template(el, attrs) {
            if (attrs.expr[0] === "'")
                return `<span>${attrs.expr.substring(1, attrs.expr.length - 1)}</span>`;
            else
                return `<span ng-bind="total$${attrs.field}|number:2"></span>`;
        }
        link(scope, element, attrs, controller) {
            if (attrs.expr[0] !== "'")
                scope.$watch(`records`, (newValue) => {
                    let total = 0;
                    newValue.map((r) => total += parseFloat(r[attrs.field]));
                    scope['total$' + attrs.field] = total;
                    scope.parent['total$' + scope.fieldName + '$' + attrs.field] = total;
                });
        }
    }
    Katrid.UI.uiKatrid.directive('ngTotal', ['$filter', Total]);
})();
(function ($) {
    "use strict";
    function setSelectionRange(rangeStart, rangeEnd) {
        if (this.createTextRange) {
            var range = this.createTextRange();
            range.collapse(true);
            range.moveStart('character', rangeStart);
            range.moveEnd('character', rangeEnd - rangeStart);
            range.select();
        }
        else if (this.setSelectionRange) {
            this.focus();
            this.setSelectionRange(rangeStart, rangeEnd);
        }
    }
    function getSelection(part) {
        var pos = this.value.length;
        part = (part.toLowerCase() == 'start' ? 'Start' : 'End');
        if (document.selection) {
            var range = document.selection.createRange(), stored_range, selectionStart, selectionEnd;
            stored_range = range.duplicate();
            stored_range.expand('textedit');
            stored_range.setEndPoint('EndToEnd', range);
            selectionStart = stored_range.text.length - range.text.length;
            selectionEnd = selectionStart + range.text.length;
            return part == 'Start' ? selectionStart : selectionEnd;
        }
        else if (typeof (this['selection' + part]) != "undefined") {
            pos = this['selection' + part];
        }
        return pos;
    }
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
            189: 45,
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
    $.fn.number = function (number, decimals, dec_point, thousands_sep) {
        thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
        dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
        decimals = (typeof decimals === 'undefined') ? 0 : decimals;
        var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4)), regex_dec_num = new RegExp('[^-' + u_dec + '0-9]', 'g'), regex_dec = new RegExp(u_dec, 'g');
        if (number === true) {
            if (this.is('input:text')) {
                return this.on({
                    'keydown.format': function (e) {
                        var $this = $(this), data = $this.data('numFormat'), code = (e.keyCode ? e.keyCode : e.which), chara = '', start = getSelection.apply(this, ['start']), end = getSelection.apply(this, ['end']), val = '', setPos = false;
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
                            chara = _keydown.shifts[code];
                        }
                        if (chara == '')
                            chara = String.fromCharCode(code);
                        if (code !== 8 && chara != dec_point && !chara.match(/[0-9]/)) {
                            var key = (e.keyCode ? e.keyCode : e.which);
                            if (key == 46 || key == 8 || key == 9 || key == 27 || key == 13 ||
                                ((key == 65 || key == 82) && (e.ctrlKey || e.metaKey) === true) ||
                                ((key == 86 || key == 67) && (e.ctrlKey || e.metaKey) === true) ||
                                ((key >= 35 && key <= 39))) {
                                return;
                            }
                            e.preventDefault();
                            return false;
                        }
                        if (start == 0 && end == this.value.length || $this.val() == 0) {
                            if (code === 8) {
                                start = end = 1;
                                this.value = '';
                                data.init = (decimals > 0 ? -1 : 0);
                                data.c = (decimals > 0 ? -(decimals + 1) : 0);
                                setSelectionRange.apply(this, [0, 0]);
                            }
                            else if (chara === dec_point) {
                                start = end = 1;
                                this.value = '0' + dec_point + (new Array(decimals + 1).join('0'));
                                data.init = (decimals > 0 ? 1 : 0);
                                data.c = (decimals > 0 ? -(decimals + 1) : 0);
                            }
                            else if (this.value.length === 0) {
                                data.init = (decimals > 0 ? -1 : 0);
                                data.c = (decimals > 0 ? -(decimals) : 0);
                            }
                        }
                        else {
                            data.c = end - this.value.length;
                        }
                        if (decimals > 0 && chara == dec_point && start == this.value.length - decimals - 1) {
                            data.c++;
                            data.init = Math.max(0, data.init);
                            e.preventDefault();
                            setPos = this.value.length + data.c;
                        }
                        else if (chara == dec_point) {
                            data.init = Math.max(0, data.init);
                            e.preventDefault();
                        }
                        else if (decimals > 0 && code == 8 && start == this.value.length - decimals) {
                            e.preventDefault();
                            data.c--;
                            setPos = this.value.length + data.c;
                        }
                        else if (decimals > 0 && code == 8 && start > this.value.length - decimals) {
                            if (this.value === '')
                                return;
                            if (this.value.slice(start - 1, start) != '0') {
                                val = this.value.slice(0, start - 1) + '0' + this.value.slice(start);
                                $this.val(val.replace(regex_dec_num, '').replace(regex_dec, dec_point));
                            }
                            e.preventDefault();
                            data.c--;
                            setPos = this.value.length + data.c;
                        }
                        else if (code == 8 && this.value.slice(start - 1, start) == thousands_sep) {
                            e.preventDefault();
                            data.c--;
                            setPos = this.value.length + data.c;
                        }
                        else if (decimals > 0 &&
                            start == end &&
                            this.value.length > decimals + 1 &&
                            start > this.value.length - decimals - 1 && isFinite(+chara) &&
                            !e.metaKey && !e.ctrlKey && !e.altKey && chara.length === 1) {
                            if (end === this.value.length) {
                                val = this.value.slice(0, start - 1);
                            }
                            else {
                                val = this.value.slice(0, start) + this.value.slice(start + 1);
                            }
                            this.value = val;
                            setPos = start;
                        }
                        if (setPos === false && code === 44 && chara === dec_point)
                            setPos = this.value.indexOf(dec_point) + 1;
                        if (setPos !== false) {
                            setSelectionRange.apply(this, [setPos, setPos]);
                        }
                        $this.data('numFormat', data);
                    },
                    'keyup.format': function (e) {
                        var $this = $(this), data = $this.data('numFormat'), code = (e.keyCode ? e.keyCode : e.which), start = getSelection.apply(this, ['start']), setPos;
                        if (this.value === '' || (code < 48 || code > 57) && (code < 96 || code > 105) && code !== 8)
                            return;
                        $this.val($this.val());
                        if (decimals > 0) {
                            if (data.init < 1) {
                                start = this.value.length - decimals - (data.init < 0 ? 1 : 0);
                                data.c = start - this.value.length;
                                data.init = 1;
                                $this.data('numFormat', data);
                            }
                            else if (start > this.value.length - decimals && code != 8) {
                                data.c++;
                                $this.data('numFormat', data);
                            }
                        }
                        setPos = this.value.length + data.c;
                        if (((this.value.length - setPos) === data.decimals) && (String.fromCharCode(code) !== data.dec_point)) {
                            setPos -= 1;
                            console.log('set pos', data.dec_point, code, String.fromCharCode(code));
                        }
                        setSelectionRange.apply(this, [setPos, setPos]);
                    },
                    'paste.format': function (e) {
                        var $this = $(this), original = e.originalEvent, val = null;
                        if (window.clipboardData && window.clipboardData.getData) {
                            val = window.clipboardData.getData('Text');
                        }
                        else if (original.clipboardData && original.clipboardData.getData) {
                            val = original.clipboardData.getData('text/plain');
                        }
                        $this.val(val);
                        e.preventDefault();
                        return false;
                    }
                })
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
                    if (this.value === '')
                        return;
                    $this.val($this.val());
                });
            }
            else {
                return this.each(function () {
                    var $this = $(this), num = +$this.text().replace(regex_dec_num, '').replace(regex_dec, '.');
                    $this.number(!isFinite(num) ? 0 : +num, decimals, dec_point, thousands_sep);
                });
            }
        }
        return this.text($.number.apply(window, arguments));
    };
    var origHookGet = null, origHookSet = null;
    if ($.isPlainObject($.valHooks.text)) {
        if ($.isFunction($.valHooks.text.get))
            origHookGet = $.valHooks.text.get;
        if ($.isFunction($.valHooks.text.set))
            origHookSet = $.valHooks.text.set;
    }
    else {
        $.valHooks.text = {};
    }
    $.valHooks.text.get = function (el) {
        var $this = $(el), num, data = $this.data('numFormat');
        if (!data) {
            if ($.isFunction(origHookGet)) {
                return origHookGet(el);
            }
            else {
                return undefined;
            }
        }
        else {
            if (el.value === '')
                return '';
            num = +(el.value
                .replace(data.regex_dec_num, '')
                .replace(data.regex_dec, '.'));
            return '' + (isFinite(num) ? num : 0);
        }
    };
    $.valHooks.text.set = function (el, val) {
        var $this = $(el), data = $this.data('numFormat');
        if (!data) {
            if ($.isFunction(origHookSet)) {
                return origHookSet(el, val);
            }
            else {
                return undefined;
            }
        }
        else {
            return el.value = $.number(val, data.decimals, data.dec_point, data.thousands_sep);
        }
    };
    $.number = function (number, decimals, dec_point, thousands_sep) {
        thousands_sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep;
        dec_point = (typeof dec_point === 'undefined') ? '.' : dec_point;
        decimals = !isFinite(+decimals) ? 0 : Math.abs(decimals);
        var u_dec = ('\\u' + ('0000' + (dec_point.charCodeAt(0).toString(16))).slice(-4));
        var u_sep = ('\\u' + ('0000' + (thousands_sep.charCodeAt(0).toString(16))).slice(-4));
        number = (number + '')
            .replace('\.', dec_point)
            .replace(new RegExp(u_sep, 'g'), '')
            .replace(new RegExp(u_dec, 'g'), '.')
            .replace(new RegExp('[^0-9+\-Ee.]', 'g'), '');
        var n = !isFinite(+number) ? 0 : +number, s = '', toFixedFix = function (n, decimals) {
            var k = Math.pow(10, decimals);
            return '' + Math.round(n * k) / k;
        };
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
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        Katrid.component('form-login', {
            template: '<form><slot></slot></form>',
            methods: {
                login(username, password, next) {
                }
            }
        });
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
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
    Katrid.UI.uiKatrid.directive('comments', () => ({
        restrict: 'E',
        scope: {},
        replace: true,
        template: '<div class="content"><div class="comments"><mail-comments/></div></div>',
        link(scope, element, attrs) {
            if (element.closest('.modal-dialog').length)
                element.remove();
            else
                $(element).closest('.form-view[ng-form=form]').children('.content:first').append(element);
        }
    }));
    Katrid.UI.uiKatrid.directive('mailComments', () => ({
        restrict: 'E',
        controller: ['$scope', ($scope) => {
                $scope.comments = new Comments($scope);
                $scope.files = [];
                $scope.showEditor = () => {
                    $($scope.el).find('#mail-editor').show();
                    $($scope.el).find('#mail-msgEditor').focus();
                };
                $scope.hideEditor = () => {
                    $($scope.el).find('#mail-editor').hide();
                };
                $scope.attachFile = (file) => {
                    for (let f of file.files)
                        $scope.files.push({
                            name: f.name,
                            type: f.type,
                            file: f
                        });
                    $scope.$apply();
                };
                $scope.deleteFile = (idx) => {
                    $scope.files.splice(idx, 1);
                };
            }],
        replace: true,
        link(scope, element, attrs) {
            scope.el = element;
        },
        template() {
            return `
  <div class="container">
          <h3>${Katrid.i18n.gettext('Comments')}</h3>
          <div class="form-group">
          <button class="btn btn-outline-secondary" ng-click="showEditor();">${Katrid.i18n.gettext('New message')}</button>
          <button class="btn btn-outline-secondary">${Katrid.i18n.gettext('Log an internal note')}</button>
          </div>
          <div id="mail-editor" style="display: none;">
            <div class="form-group">
              <textarea id="mail-msgEditor" class="form-control" ng-model="message"></textarea>
            </div>
            <div class="form-group">
              <button class="btn btn-default" type="button" onclick="$(this).next().click()"><i class="fa fa-paperclip"></i></button>
              <input class="input-file-hidden" type="file" multiple onchange="angular.element(this).scope().attachFile(this)">
            </div>
            <div class="form-group" ng-show="files.length">
              <ul class="list-inline attachments-area">
                <li ng-repeat="file in files" ng-click="deleteFile($index)" title="${Katrid.i18n.gettext('Delete this attachment')}">{{ file.name }}</li>
              </ul>
            </div>
            <div class="from-group">
              <button class="btn btn-primary" ng-click="comments.postMessage(message)">${Katrid.i18n.gettext('Send')}</button>
            </div>
          </div>
  
          <hr>
  
          <div ng-show="loading">{{ loading }}</div>
          <div class="comment media col-sm-12" ng-repeat="comment in comments.items">
            <div class="media-left">
              <img src="/static/admin/assets/img/avatar.png" class="avatar rounded">
            </div>
            <div class="media-body">
              <strong>{{ ::comment.author_name }}</strong> - <span class="timestamp text-muted" title="$\{ ::comment.date_time|moment:'LLLL'}"> {{::comment.date_time|moment}}</span>
              <div class="clearfix"></div>
              <div class="form-group">
                {{::comment.content}}
              </div>
              <div class="form-group" ng-if="comment.attachments">
                <ul class="list-inline">
                  <li ng-repeat="file in comment.attachments">
                    {{file.mimetype}}
                    <div class="comment-preview-image" ng-if="file.mimetype.startsWith('image')" style="width: 16%;height:100px;background-image:url('/web/content/$\{ ::file.id }')"></div>
                    <a href="/web/content/$\{ ::file.id }/?download">{{ ::file.name }}</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
    </div>`;
        }
    }));
})();
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
                        let service = new Katrid.Services.Model(serviceName);
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
(function () {
    class Telegram {
        static async export(report, format) {
            console.log('export telegram');
            let templ = Katrid.app.$templateCache.get('reportbot.dialog.contacts');
            let modal = $(templ);
            $('body').append(modal);
            let sel = modal.find('#id-reportbot-select-contacts');
            let partners = new Katrid.Services.Model('res.partner');
            let res = await partners.post('get_telegram_contacts');
            if (res) {
                if (res)
                    res.map(c => sel.append(`<option value="${c[0]}">${c[1]}</option>`));
                sel.select2();
            }
            modal.find('#id-btn-ok').click(async () => {
                let svc = new Katrid.Services.Model('telegram.pending');
                format = 'pdf';
                const params = report.getUserParams();
                let res = svc.post('export_report', { args: [report.info.id], kwargs: { contacts: sel.val(), format, params } });
                if (res.ok)
                    console.log('ok');
            });
            modal.modal();
            return true;
        }
    }
    Katrid.Reports.Telegram = Telegram;
})();
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        Katrid.directive('tooltip', {
            mounted(el, binding) {
            },
            updated(el, binding) {
                console.log(binding);
                $(el).tooltip({
                    container: 'body',
                    trigger: 'hover',
                    html: true,
                    placement: 'left',
                    title: () => {
                        return binding.value;
                    },
                    delay: {
                        show: 1000,
                    }
                });
            }
        });
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
                    this._ul = document.createElement('ul');
                    a.classList.add('tree-item');
                    el.appendChild(a);
                    el.appendChild(this._ul);
                    this.el = el;
                    this._a = a;
                    this._canExpand = true;
                    this._exp = document.createElement('span');
                    this._exp.addEventListener('dblclick', (evt) => evt.stopPropagation());
                    this._exp.addEventListener('click', (evt) => {
                        evt.preventDefault();
                        this.expanded = !this.expanded;
                    });
                    this._exp.classList.add('fa', 'fa-fw');
                    a.appendChild(this._exp);
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
                if (this._parent)
                    this._parent.remove(this);
                this._parent = value;
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
                for (let node of this._selection)
                    node.selected = false;
                this._selection = value;
                for (let node of value)
                    node.selected = true;
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
(function () {
    Katrid.$hashId = 0;
    _.mixin({
        hash(obj) {
            if (!obj.$hashId) {
                obj.$hashId = ++Katrid.$hashId;
            }
            return obj.$hashId;
        }
    });
    _.mixin({
        sum(iterable, member) {
            let r = 0;
            if (iterable)
                for (let row of iterable) {
                    let v = row[member];
                    if (!_.isNumber(v))
                        v = Number(v);
                    if (_.isNaN(v))
                        v = 0;
                    r += v;
                }
            return r;
        },
        avg(iterable, member) {
            if (iterable && iterable.length) {
                let r = 0;
                return _.sum(iterable, member) / iterable.length;
            }
        }
    });
    _.mixin({
        guid() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    });
})();
//# sourceMappingURL=katrid.js.map