"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class WebComponent extends HTMLElement {
            constructor() {
                super(...arguments);
                this._created = false;
            }
            connectedCallback() {
                if (!this._created)
                    this.create();
            }
            create() {
                this._created = true;
                this._create();
            }
            _create() {
            }
        }
        ui.WebComponent = WebComponent;
        class Widget {
            render() {
            }
        }
        ui.Widget = Widget;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class BaseComponentDesigner {
            constructor(target) {
                this.target = target;
            }
            destroy() {
            }
            getOutlineInfo() {
                return;
            }
        }
        ui.BaseComponentDesigner = BaseComponentDesigner;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    Katrid.$hashId = 0;
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
    Katrid.globalData = {};
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var mobile;
    (function (mobile) {
        mobile.isAndroid = window['__katridMobileHost'] !== undefined;
        mobile.isIOS = window['__katridMobileHost'] !== undefined;
        mobile.isApp = mobile.isAndroid || mobile.isIOS;
        function writeStringToFile(key, value) {
            __katridMobileHost.writeStringToFile(key, value);
        }
        mobile.writeStringToFile = writeStringToFile;
        function readStringFromFile(key) {
            return __katridMobileHost.readStringFromFile(key);
        }
        mobile.readStringFromFile = readStringFromFile;
    })(mobile = katrid.mobile || (katrid.mobile = {}));
})(katrid || (katrid = {}));
(function (katrid) {
    class localStorage {
        static setItem(key, value) {
            if (katrid.mobile.isApp)
                katrid.mobile.writeStringToFile(key, value);
            else
                window.localStorage.setItem(key, value);
        }
        static getItem(key) {
            if (katrid.mobile.isApp)
                return katrid.mobile.readStringFromFile(key);
            return window.localStorage.getItem(key);
        }
    }
    katrid.localStorage = localStorage;
    const LOCAL_DATA_KEY = '_LOCAL_DATA';
    class localData {
        constructor(dbName, version) {
            this.dbName = dbName;
            this.version = version;
        }
        open() {
            let req;
            req = indexedDB.open(this.dbName, this.version);
            req.onupgradeneeded = (evt) => {
                const db = evt.target.result;
                const objectStore = db.createObjectStore(LOCAL_DATA_KEY, { keyPath: "key" });
            };
            return new Promise((resolve) => {
                req.onsuccess = (evt) => {
                    this.db = evt.target.result;
                    resolve(this.db);
                };
            });
        }
        setItem(key, value) {
            return new Promise((resolve) => {
                let objStore = this.db
                    .transaction([LOCAL_DATA_KEY], "readwrite")
                    .objectStore(LOCAL_DATA_KEY);
                objStore.put({ key, value }).onsuccess = evt => resolve(true);
            });
        }
        getItem(key) {
            return new Promise((resolve) => {
                this.db
                    .transaction(LOCAL_DATA_KEY)
                    .objectStore(LOCAL_DATA_KEY)
                    .get(key)
                    .onsuccess = evt => resolve(evt.target.result?.value);
            });
        }
    }
    katrid.localData = localData;
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class BaseActionView {
            constructor(options) {
                this.template = options?.template;
                this.app = options?.app;
            }
            createElement() {
                const el = document.createElement('div');
                el.className = 'action-view';
                if (this.template)
                    el.innerHTML = this.template;
                return el;
            }
            _prepareElement(el) {
                return el;
            }
            getElement() {
                if (!this.element) {
                    this.element = this.createElement();
                    this._prepareElement(this.element);
                }
                return this.element;
            }
            ready() {
                return this._ready;
            }
            async _execute() {
            }
            async execute(app) {
                app.actionViewer.appendChild(this.getElement());
                this._ready = new Promise(async (resolve) => {
                    await this._execute();
                    resolve();
                });
            }
        }
        ui.BaseActionView = BaseActionView;
        class ActionView extends BaseActionView {
            _prepareElement(el) {
                super._prepareElement(el);
                this.vm = this.createVm(el);
                return el;
            }
            defineData() {
                return {};
            }
            defineMethods() {
                return {};
            }
            defineComponent() {
                return {
                    data: () => this.defineData(),
                    methods: this.defineMethods(),
                };
            }
            createVm(el) {
                const comp = this.defineComponent();
                this.vm = Katrid.createVm(comp).mount(el);
                return this.vm;
            }
        }
        ui.ActionView = ActionView;
        class BaseApplication {
            constructor(options) {
                this.actions = {};
                this.element = options.el;
                this.template = options.template;
                this.title = options.title;
                this.actionViewer = this.element.querySelector('.action-manager');
                this.render(this.element);
                katrid.ui.app = this;
                this.ready();
            }
            get title() {
                return this._title;
            }
            set title(value) {
                this._title = value;
                document.title = value;
            }
            $nextTick() {
                return Vue.nextTick();
            }
            registerAction(actionId, action) {
                this.actions[actionId] = action;
            }
            render(el) {
                if (!this.actionViewer) {
                    this.actionViewer = document.createElement('div');
                    this.actionViewer.className = 'action-manager';
                }
                if (typeof this.template === 'string')
                    this.actionViewer.innerHTML = this.template;
                el.appendChild(this.actionViewer);
                el.className = 'katrid-base-app';
                this.prepareElement(el);
                this._ready = Promise.resolve(this);
            }
            prepareElement(el) {
            }
            async gotoAction(actionId) {
                const action = this.actions[actionId];
                if (action instanceof BaseActionView)
                    return await this.setAction(action);
                else if (action instanceof Function)
                    return await this.setAction(new action({ app: this }));
                else
                    throw new Error('Invalid action');
            }
            async setAction(action) {
                this.action = action;
                this.actionViewer.innerHTML = '';
                if (this.action) {
                    await this.push(this.action);
                    return this.action;
                }
            }
            push(action) {
                return action.execute(this);
            }
            ready() {
                console.log('ready');
                return this._ready;
            }
        }
        ui.BaseApplication = BaseApplication;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var pwa;
    (function (pwa) {
        class Application extends katrid.ui.BaseApplication {
            prepareElement(el) {
                super.prepareElement(el);
                this.vm = Katrid.createVm(this.defineComponent()).mount(el);
            }
            defineData() {
                return {};
            }
            defineMethods() {
                return {};
            }
            defineComponent() {
                return {
                    data: () => this.defineData(),
                    methods: this.defineMethods(),
                };
            }
        }
        pwa.Application = Application;
    })(pwa = katrid.pwa || (katrid.pwa = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        Actions.registry = {};
        class Action {
            static { this._context = {}; }
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
            beforeUnload(event) {
            }
            async confirmDiscard() {
                return true;
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
                    this.element.remove();
                else
                    this.container.innerHTML = '';
            }
            get id() {
                if (this.config.id)
                    return this.config.id;
                return this.info?.id;
            }
            get context() {
                if (!this._context) {
                    if (Katrid.isString(this.config.context))
                        this._context = JSON.parse(this.config.context);
                    else if (this.config.context)
                        this._context = this.config.context;
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
            async onHashChange(params) {
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
                    li.append(this.createBackItemLink(this.getDisplayText(), index > 0, `back(${index})`));
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
                return a;
            }
            generateHelp(help) {
                if (this.config.caption) {
                    const h3 = document.createElement('h3');
                    h3.innerText = this.config.caption;
                    help.element.append(h3);
                }
                if (this.config.usage) {
                    const p = document.createElement('p');
                    p.innerHTML = this.config.usage;
                    help.element.append(p);
                }
            }
        }
        Actions.Action = Action;
        class UrlAction extends Action {
            static { this.actionType = 'ir.action.url'; }
            constructor(info) {
                super(info);
                window.location.href = info.url;
            }
        }
        function goto(actionId, config, reset = false) {
            let params = { action: actionId };
            if (config)
                Object.assign(params, config);
            return Katrid.webApp.actionManager.onHashChange(params, reset);
        }
        Actions.goto = goto;
        Actions.registry[UrlAction.actionType] = UrlAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class ClientAction extends Katrid.Actions.Action {
            static { this.registry = {}; }
            async onHashChange(params) {
                const tag = this.info.tag;
                if (tag in ClientAction.registry) {
                    const action = ClientAction.registry[tag](this);
                }
            }
        }
        admin.ClientAction = ClientAction;
        Katrid.Actions.registry['ui.action.client'] = ClientAction;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class Homepage extends Actions.Action {
            static { this.actionType = 'ui.action.homepage'; }
            static { this.hooks = []; }
            get content() {
                return this.info['content'];
            }
            onHashChange(params) {
                super.onHashChange(params);
                let home = new HomepageView();
                console.log('action info', this.info.id);
                home.actionId = this.info.id;
                this.element.append(home.element);
                let content = this.content;
                if (content) {
                    if (typeof content === 'string')
                        content = JSON.parse(content);
                    home.load(content);
                }
                home.render();
            }
        }
        Actions.Homepage = Homepage;
        class HomepageView {
            constructor() {
                this.panels = [];
                this._rendered = false;
                this.createElement();
                this.render();
            }
            createElement() {
                let div = document.createElement('div');
                let toolbar = document.createElement('div');
                toolbar.className = 'homepage-toolbar';
                div.append(toolbar);
                let btn = document.createElement('a');
                btn.classList.add('btn', 'btn-edit', 'btn-secondary');
                btn.innerHTML = '<i class="fas fa-pen"></i>';
                toolbar.append(btn);
                div.append(toolbar);
                btn.addEventListener('click', () => this.edit());
                div.classList.add('homepage-view', 'col-12');
                this.element = div;
            }
            load(data) {
                this.panels = data.panels;
                this.info = data;
                for (let h of Katrid.Actions.Homepage.hooks)
                    if (h.onLoad)
                        h.onLoad(this);
            }
            edit() {
                let editor = new Katrid.Actions.Portlets.HomepageEditor();
                editor.actionId = this.actionId;
                if (this.info)
                    editor.load(this.info);
                this.element.parentElement.append(editor.element);
                this.element.remove();
            }
            render() {
                if (this._rendered)
                    return;
                this._rendered = true;
                console.log('panels', this.panels);
                for (let panel of this.panels) {
                    let p = this.createPanel();
                    console.log('panel', p.load);
                    p.load(panel);
                    this.element.append(p);
                }
                for (let h of Katrid.Actions.Homepage.hooks)
                    if (h.onRender)
                        h.onRender(this);
            }
            createPanel() {
                return document.createElement('portlet-panel');
            }
        }
        Actions.HomepageView = HomepageView;
        Katrid.Actions.registry[Homepage.actionType] = Homepage;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class ActionManager extends HTMLElement {
            constructor() {
                super();
                this.actions = [];
                this.currentAction = null;
                this.mainAction = null;
                this.$cachedActions = {};
                this._navbarVisible = true;
            }
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
            async confirmDiscard() {
                if (this.action)
                    return await this.action?.confirmDiscard();
                return true;
            }
            async onHashChange(params, reset) {
                let actionId = params.action;
                let oldAction, action;
                action = oldAction = this.currentAction;
                let oldActionId;
                if (oldAction)
                    oldActionId = oldAction.info.id;
                if (reset) {
                    this.reset();
                    if (this.action)
                        this.action.destroy();
                    this.action = null;
                }
                if (actionId in this.$cachedActions) {
                    let actionInfo = this.$cachedActions[actionId];
                    action = new Katrid.Actions.registry[actionInfo.type](actionInfo, params);
                }
                else if (!actionId && params.model && (!action || (action.params && (action.params.model !== params.model)))) {
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
                await action.onHashChange(params);
                return action;
            }
            addAction(action) {
                this.empty();
                this.actions.push(action);
                this.action = action;
            }
            async execAction(info) {
                if (info.type === 'ui.action.view') {
                    console.log('exec', info);
                    let action = new Katrid.Actions.ViewAction({ actionManager: this, info });
                    return action.renderTo(this);
                }
                else if (info.type === 'ui.action.window') {
                    const actInfo = Object.assign({ ActionManager: this }, info);
                    actInfo.model = new Katrid.Data.Model({ name: info['model'], fields: info['fields'] });
                    let action = new Katrid.Actions.WindowAction(actInfo);
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
        class WindowAction extends Katrid.Actions.Action {
            static { this.actionType = 'ui.action.window'; }
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
                    info.model = this.model;
                    this.searchView = new Katrid.Forms.SearchView(info, this);
                    this.searchView.render();
                }
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
                    this.params.model = this.config.model;
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
                    let url = this.makeUrl(this.viewMode);
                    history.replaceState(null, null, url);
                }
                let viewType = this.params.view_type;
                if (viewType === this.viewType)
                    await this.view.onHashChange(params);
                else {
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
                else if (Array.isArray(data))
                    data = { args: data };
                else if (!Katrid.isObject(data))
                    data = { args: [data] };
                this.model.service.rpc(method, data.args, data.kwargs);
            }
            beforeUnload(event) {
                if (this.view.vm.changing)
                    event.preventDefault();
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
            async showView(mode, params = null) {
                let oldView = this.view;
                this.viewMode = mode;
                if (mode in this._cachedViews) {
                    this.view = this._cachedViews[mode];
                }
                else {
                    this.viewInfo = this.views[mode];
                    this.view = new Katrid.Forms.Views.registry[mode](Object.assign({
                        action: this,
                    }, this.viewInfo));
                    this.view.createElement();
                    if (mode === 'form')
                        await this.view.loadPendingViews();
                    else
                        this.lastSearchMode = mode;
                    this.view.renderTo(this.container);
                    this._cachedViews[Object.getPrototypeOf(this.view).constructor.viewType] = this.view;
                }
                this.view.ready();
                if (this.view instanceof Katrid.Forms.RecordCollectionView) {
                    this.searchResultView = this.view;
                    this.lastUrl = location.hash;
                }
                if (this.element) {
                    if (this.element.children.length)
                        this.element.removeChild(this.element.children[0]);
                    this.view.renderTo(this.element);
                    if (!this.searchView && !(this.viewModes.length === 1 && this.viewModes[0] == 'form'))
                        this.createSearchView();
                    if (this.view instanceof Katrid.Forms.RecordCollectionView)
                        this.view.searchView = this.searchView;
                    if (oldView && (this.view !== oldView))
                        oldView.active = false;
                    this.view.active = true;
                }
                if (mode === 'form') {
                    const form = this.view;
                    if (!params?.params?.id && !this.params?.id)
                        await form.insert();
                    else
                        form.setState(Katrid.Data.DataSourceState.browsing);
                }
                if (this.params?.view_type && (mode !== this.params.view_type)) {
                    history.pushState({ view_type: this.params.view_type }, document.title, this.makeUrl(mode));
                    this.params.view_type = mode;
                }
                if (this.app)
                    this.app.element.dispatchEvent(new CustomEvent('katrid.actionChange'));
                return this.view;
            }
            async render() {
                await super.render();
                if (this.viewMode)
                    await this.showView(this.viewMode);
            }
            createViewsButtons(container) {
                for (let mode of this.viewModes) {
                    let cls = Katrid.Forms.Views.registry[mode];
                    if (cls)
                        cls.createViewModeButton(container);
                }
            }
            get selectionLength() {
                if (this.selection)
                    return this.selection.length;
            }
            async copyTo(configId) {
                if (this.scope.recordId) {
                    let svc = new Katrid.Services.ModelService('ui.copy.to');
                    let res = await svc.rpc('copy_to', [configId, this.scope.recordId]);
                    let model = new Katrid.Services.ModelService(res.model);
                    let views = await model.getViewInfo({ view_type: 'form' });
                    let scope = this.scope.$new(true);
                    let wnd = new Katrid.Forms.Dialogs.Window({ scope, view: views, model, defaultValues: res.value });
                }
            }
            makeUrl(viewType) {
                if (!viewType)
                    viewType = this.viewMode;
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
                    search.id = this.view.record.id;
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
                    this._viewType = value;
                }
                return;
            }
            searchText(q) {
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
                        else if (res.status === 'download') {
                            const a = document.createElement('a');
                            a.href = res.download;
                            const f = res.download.split('/');
                            a.download = f[f.length - 1];
                            a.click();
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
            onActionLink(actionId, actionType, context, evt) {
                let ctx = { active_id: this.view?.record?.id };
                if (context)
                    Object.assign(ctx, context);
                Object.assign(ctx, this.context);
                if (evt.target.hasAttribute('data-binding-params')) {
                    let bindingParams = evt.target.getAttribute('data-binding-params');
                    const fn = new Function('__ctx__', `with (__ctx__) { return ${bindingParams} }`);
                    const params = fn.call(this, this.view.vm);
                    ctx.bindingParams = params;
                }
                return Katrid.Services.Actions.onExecuteAction(actionId, actionType, ctx);
            }
            async _evalResponseAction(res) {
                console.debug('eval response', res);
                if (res.tag === 'refresh')
                    this.view.refresh();
                else if (res.tag == 'new') {
                    if (res.action) {
                        let action = await Katrid.Actions.goto(res.action, { view_type: 'form' });
                        await action.view.insert(res.values);
                    }
                    else
                        this.view.datasource.insert(true, res.values);
                }
                else if (res.invoke) {
                    for (let [k, v] of Object.entries(res.invoke))
                        katrid.invoke(k)(v);
                }
                else if (res.type) {
                    const act = new (Katrid.Actions.registry[res.type])(res, this.scope, this.scope.location);
                    return act.execute();
                }
                else if (Array.isArray(res)) {
                    console.debug('array', res);
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
            }
            addFilter(field, value) {
                let f = this.view.fields[field];
                if ((f instanceof Katrid.Data.DateTimeField) && (typeof value === 'string'))
                    value = moment(value);
                this.searchView.controller.addCustomFilter(f, [value]);
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
                    li.append(this.createBackItemLink(super.getDisplayText(), true, `back(${index}, '${this.lastSearchMode || 'list'}')`));
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
            generateHelp(help) {
                super.generateHelp(help);
                if (this.modelName) {
                    const h6 = document.createElement('h5');
                    h6.innerText = Katrid.i18n.gettext('Technical information');
                    const p = document.createElement('pre');
                    p.innerText = 'Model name: ' + this.modelName;
                    const pDesc = document.createElement('p');
                    pDesc.innerHTML = this.config.help_text || '';
                    help.element.append(h6);
                    help.element.append(p);
                    help.element.append(pDesc);
                }
                if (this.view?.fields) {
                    this.view.generateHelp(help);
                }
            }
        }
        Actions.WindowAction = WindowAction;
        async function gotoNewRecord(config) {
            let actionId = config.actionId;
            let action = await Katrid.Actions.goto(actionId, { view_type: 'list' }, true);
            setTimeout(() => {
                console.log('goto', config.values);
                action.view.vm.insert(config.values);
            }, 1000);
        }
        Actions.gotoNewRecord = gotoNewRecord;
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
var katrid;
(function (katrid) {
    class Collection {
        constructor() {
            this.items = [];
        }
        add(item) {
            this.items.push(item);
            this.notify('insert', item);
        }
        dump() {
        }
        remove(item) {
            const index = this.items.indexOf(item);
            if (index >= 0) {
                this.items.splice(index, 1);
            }
            this.notify('remove', item);
        }
        clear() {
            this.items = [];
        }
    }
    katrid.Collection = Collection;
    class OwnedCollection extends Collection {
        constructor(owner) {
            super();
            this.owner = owner;
        }
    }
    katrid.OwnedCollection = OwnedCollection;
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
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
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class ReportAction extends Katrid.Actions.Action {
            static { this.actionType = 'ui.action.report'; }
            static async dispatchBindingAction(parent, action) {
                let format = localStorage.katridReportViewer || 'pdf';
                let sel = parent.selection;
                if (sel)
                    sel = sel.join(',');
                let params = { data: [{ name: 'id', value: sel }] };
                let svc = new Katrid.Services.ModelService('ui.action.report');
                let res = await svc.post('export_report', { args: [action.id], kwargs: { format, params } });
                if (res.open)
                    window.open(res.open);
            }
            get name() {
                return this.config.info.name;
            }
            constructor(info, scope, location) {
                super(info);
                this.fields = [];
                this.templateUrl = 'view.report.jinja2';
                this.userReport = {};
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
                return vm;
            }
        }
        Actions.ReportAction = ReportAction;
        Katrid.Actions.registry[ReportAction.actionType] = ReportAction;
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        class ViewAction extends Actions.Action {
            static { this.actionType = 'ui.action.view'; }
            constructor(config) {
                super(config);
                if (config.info?.template) {
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
            class HomepageEditor extends Katrid.Actions.HomepageView {
                createPanel() {
                    let el = super.createPanel();
                    el.editing = true;
                    return el;
                }
                createElement() {
                    let div = document.createElement('div');
                    div.classList.add('homepage-toolbar');
                    div.classList.add('homepage-view', 'col-12');
                    this.element = div;
                    let btnSave = document.createElement('button');
                    btnSave.classList.add('btn', 'btn-primary');
                    btnSave.innerText = Katrid.i18n.gettext('Save');
                    let btnDiscard = document.createElement('button');
                    btnDiscard.classList.add('btn', 'btn-secondary');
                    btnDiscard.innerText = Katrid.i18n.gettext('Discard');
                    btnSave.addEventListener('click', () => this.save());
                    btnDiscard.addEventListener('click', () => this.back());
                    this.element.append(btnSave);
                    this.element.append(btnDiscard);
                }
                edit() {
                    throw Error('Editor already loaded');
                }
                dump() {
                    return { panels: Array.from(this.element.querySelectorAll('portlet-panel')).map(el => el.dump()) };
                }
                async save() {
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
        })(Portlets = Actions.Portlets || (Actions.Portlets = {}));
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Actions;
    (function (Actions) {
        var Portlets;
        (function (Portlets) {
            class BasePortlet {
                constructor() {
                    this.editing = false;
                }
                render() {
                    this.wrapper = document.createElement('div');
                    this.wrapper.classList.add('portlet-wrapper');
                    this.element = document.createElement('div');
                    this.element.classList.add('portlet');
                    if (this.header) {
                        let h4 = document.createElement('h4');
                        h4.innerText = this.header;
                        this.element.append(h4);
                    }
                    if (this.text) {
                        let h5 = document.createElement('h5');
                        h5.innerText = this.text;
                        this.element.append(h5);
                    }
                    this.wrapper.append(this.element);
                }
                renderTo(panel) {
                }
                load(info) {
                    this.header = info.header || info.name;
                }
            }
            Portlets.BasePortlet = BasePortlet;
            class Portlet extends BasePortlet {
                renderTo(panel) {
                    this.wrapper = document.createElement('div');
                    this.wrapper.classList.add('portlet-wrapper', 'col');
                    if (!this.element)
                        this.render();
                    panel.append(this.wrapper);
                }
            }
            Portlets.Portlet = Portlet;
            class PortletGroup {
                constructor(config) {
                    this.portlets = [];
                    this.element = document.createElement('div');
                    this.element.classList.add('portlet-panel', 'col-12');
                    this.text = config?.text;
                    let legend = document.createElement('h3');
                    if (this.text)
                        legend.innerText = this.text;
                    this.element.append(legend);
                    if (config?.homepage)
                        this.homepage = config.homepage;
                    if (this.homepage)
                        this.renderTo(this.homepage);
                }
                addPortlet(portlet) {
                    this.portlets.push(portlet);
                    portlet.renderTo(this.element);
                }
                renderTo(container) {
                    container.append(this.element);
                }
            }
            Portlets.PortletGroup = PortletGroup;
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
                    btn.classList.add('btn', 'btn-secondary');
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
                    if (this.editing) {
                        const el = document.createElement('portlet-editor');
                        el.load(info);
                        this.portlets.push(el.el);
                        this.append(el);
                        el.panel = this;
                        el.render();
                        return el;
                    }
                    else {
                        const el = portletRegistry[info.tag];
                        el.element.load(info);
                        this.portlets.push(el);
                        let div = document.createElement('div');
                        div.classList.add('portlet-wrapper', 'col-1');
                        div.append(el);
                        this.append(div);
                        return el;
                    }
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
                    console.log('tag', info);
                    this.portlet = (new Portlets.registry[info.tag]());
                    this.portlet.editing = true;
                    this.portlet.load(info);
                    this.portlet.render();
                }
                render() {
                    if (!this.el) {
                        let div = document.createElement('div');
                        div.classList.add('mirror');
                        div.append(this.portlet.element);
                        this.append(div);
                        console.log('render');
                        if (this.portlet.editing)
                            this.addEventListener('click', () => this.removePortlet());
                        this.el = div;
                    }
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
            class PortletElement extends HTMLElement {
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
            Portlets.PortletElement = PortletElement;
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
            class ModelActionPortlet extends Portlet {
                constructor(actionId) {
                    super();
                    this.actionId = actionId;
                }
                render() {
                    super.render();
                    let href = '#' + this.actionId;
                    let btnNew = document.createElement('a');
                    btnNew.innerText = Katrid.i18n.gettext('Create');
                    btnNew.classList.add('btn', 'btn-light');
                    btnNew.href = href + '&view_type=form';
                    let btnSearch = document.createElement('a');
                    btnSearch.innerText = Katrid.i18n.gettext('Search');
                    btnSearch.classList.add('btn', 'btn-light');
                    btnSearch.href = href;
                    let div = document.createElement('div');
                    div.className = 'portlet-footer';
                    div.append(btnNew);
                    div.append(btnSearch);
                    this.element.append(div);
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
            Portlets.ModelActionPortlet = ModelActionPortlet;
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
            Katrid.define('portlet-panel', PortletPanel);
            Katrid.define('portlet-editor', PortletEditor);
            Katrid.define('portlet-create-new', CreateNew);
            Portlets.registry = {
                ModelAction: ModelActionPortlet,
            };
        })(Portlets = Actions.Portlets || (Actions.Portlets = {}));
    })(Actions = Katrid.Actions || (Katrid.Actions = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class ActionPermissionsWidget {
            constructor(el) {
                this.el = el;
                this.allowByDefault = false;
                this._loading = false;
                this.create();
            }
            get allowed() {
                return this._allowed;
            }
            create() {
                const tv = this.el.appendChild(document.createElement('div'));
                this.treeView = new katrid.ui.TreeView(tv);
                this.treeView.el.classList.add('action-permissions');
            }
            async load() {
                this.actions = new Map();
                try {
                    this._loading = true;
                    const svc = new Katrid.Services.ModelService('auth.permission');
                    const params = {};
                    if (this.model)
                        params['model'] = this.model;
                    let res = await svc.call('admin.list_actions', params);
                    const perms = Object.groupBy(res.actions, ({ model }) => model);
                    for (const model of res.models.sort((a, b) => a.name.localeCompare(b.name))) {
                        if (!perms[model.id])
                            continue;
                        const modelNode = this.treeView.addItem(model.name + ' (' + model.label + ')', null, { checkbox: true });
                        modelNode.data = model;
                        for (const perm of perms[model.id]) {
                            const item = this.treeView.addItem(perm.name, modelNode, { checkbox: true, onCheckChange: (evt) => this._permChange(evt) });
                            item.data = perm;
                            this.permNodes.set(perm.id.toString(), item);
                        }
                    }
                }
                finally {
                    this._loading = false;
                }
            }
            _permChange(node) {
                if (!this._loading) {
                    this._allowed[node.data.id] = node.checked;
                    if (this.onDidChange)
                        this.onDidChange();
                }
            }
            async loadGroup(group) {
            }
            loadPerms(idList) {
                try {
                    this._loading = true;
                    this._allowed = new Map();
                    if (this.allowByDefault)
                        for (const item of this.treeView.nodes)
                            item.checked = true;
                    if (idList)
                        for (const [k, v] of Object.entries(idList)) {
                            const n = this.permNodes.get(k);
                            n.checked = v;
                        }
                }
                finally {
                    this._loading = false;
                }
            }
        }
        admin.ActionPermissionsWidget = ActionPermissionsWidget;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class Messages {
            static message(info) {
                switch (info.type) {
                    case 'info':
                        Katrid.Forms.Dialogs.Alerts.info(info.message);
                        break;
                    case 'warning':
                    case 'warn':
                        Katrid.Forms.Dialogs.Alerts.warning(info.message);
                        break;
                    case 'sucess':
                    case 'ok':
                        Katrid.Forms.Dialogs.Alerts.success(info.message);
                        break;
                    case 'error':
                    case 'danger':
                        Katrid.Forms.Dialogs.Alerts.error(info.message);
                        break;
                }
            }
        }
        admin.Messages = Messages;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class GroupsPermissionWidget {
            constructor(el) {
                this.el = el;
                this._loading = false;
                this.create();
            }
            create() {
                const tv = this.el.appendChild(document.createElement('div'));
                this.treeView = new katrid.ui.TreeView(tv);
                this.treeView.el.classList.add('groups-permissions');
            }
            async load() {
                this.groups = new Map();
                try {
                    this._loading = true;
                    const svc = new Katrid.Services.ModelService('auth.group');
                    const params = {};
                    let res = await svc.call('admin_list_groups', params);
                    for (const group of res.sort((a, b) => a.name.localeCompare(b.name))) {
                        const groupNode = this.treeView.addItem(group.name, null, { checkbox: true });
                        groupNode.data = group;
                        this.groups.set(group.id.toString(), groupNode);
                    }
                }
                finally {
                    this._loading = false;
                }
            }
            setPerms(groups) {
                for (const [group, checked] of Object.entries(groups)) {
                    const node = this.groups.get(group);
                    if (node)
                        node.checked = checked;
                }
            }
            getPerms() {
                let res = {};
                for (const group of this.groups.values())
                    res[group.data.id] = group.checked;
                return res;
            }
            static async showDialog(groups) {
                const dlg = new katrid.ui.Dialog({ title: katrid.i18n.gettext('Groups'), buttons: ['ok', 'cancel'] });
                dlg.dialog.classList.add('dialog-lg');
                const el = dlg.dialog.querySelector('.dialog-body');
                const widget = new GroupsPermissionWidget(el);
                await widget.load();
                if (groups)
                    widget.setPerms(groups);
                if ((await dlg.showModal()) === 'ok')
                    return widget.getPerms();
            }
        }
        admin.GroupsPermissionWidget = GroupsPermissionWidget;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class ModelPermissionsWidget {
            constructor(el) {
                this.el = el;
                this.allowByDefault = false;
                this._loading = false;
                this.create();
            }
            get allowed() {
                return this._allowed;
            }
            create() {
                const tv = this.el.appendChild(document.createElement('div'));
                this.treeView = new katrid.ui.TreeView(tv);
                this.treeView.el.classList.add('model-permissions');
            }
            async load() {
                this.permNodes = new Map();
                try {
                    this._loading = true;
                    const svc = new Katrid.Services.ModelService('auth.permission');
                    const params = {};
                    if (this.model)
                        params['model'] = this.model;
                    let res = await svc.rpc('list_model_permissions', null, params);
                    const perms = Object.groupBy(res.permissions, ({ model }) => model);
                    for (const model of res.models.sort((a, b) => a.name.localeCompare(b.name))) {
                        if (!perms[model.id])
                            continue;
                        const modelNode = this.treeView.addItem(model.name + ' (' + model.label + ')', null, { checkbox: true });
                        modelNode.data = model;
                        for (const perm of perms[model.id]) {
                            const item = this.treeView.addItem(perm.name, modelNode, { checkbox: true, onCheckChange: (evt) => this._permChange(evt) });
                            item.data = perm;
                            this.permNodes.set(perm.id.toString(), item);
                        }
                    }
                }
                finally {
                    this._loading = false;
                }
            }
            _permChange(node) {
                if (!this._loading) {
                    this._allowed[node.data.id] = node.checked;
                    if (this.onDidChange)
                        this.onDidChange();
                }
            }
            async loadGroup(group) {
            }
            loadPerms(idList) {
                try {
                    this._loading = true;
                    this._allowed = new Map();
                    if (this.allowByDefault)
                        for (const item of this.treeView.nodes)
                            item.checked = true;
                    if (idList)
                        for (const [k, v] of Object.entries(idList)) {
                            const n = this.permNodes.get(k);
                            n.checked = v;
                        }
                }
                finally {
                    this._loading = false;
                }
            }
        }
        admin.ModelPermissionsWidget = ModelPermissionsWidget;
        class ModelPermissionsManager {
            create() {
                this.tvGroup = new katrid.ui.TreeView(this.el.appendChild(document.createElement('div')), { options: { onSelect: () => console.debug('sel item') } });
            }
            async load() {
                const svc = new Katrid.Services.ModelService('auth.permission');
                const params = {};
                let res = await svc.rpc('list_groups', null, params);
                this.tvGroup.clear();
                for (const group of res) {
                    let item = this.tvGroup.addItem(group[1], group[0]);
                    item.data = group;
                }
            }
        }
        admin.ModelPermissionsManager = ModelPermissionsManager;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class MenuItem {
        }
        class GroupItem {
            constructor() {
                this.modified = false;
            }
        }
        class PermissionManager {
            constructor(el) {
                this._loading = false;
                this.el = el;
                this._create();
            }
            _create() {
                this.el ??= document.createElement('div');
                this.el.classList.add('permission-manager');
                let h = document.createElement('h3');
                h.innerText = _.gettext('Permission Manager');
                this.el.appendChild(h);
                let div = this.el.appendChild(document.createElement('div'));
                div.className = 'toolbar';
                let btn = div.appendChild(document.createElement('button'));
                btn.className = 'btn btn-primary';
                btn.innerText = _.gettext('Save');
                btn.addEventListener('click', () => this.saveChanges());
                btn = div.appendChild(document.createElement('button'));
                btn.className = 'btn btn-secondary';
                btn.innerText = _.gettext('Cancel');
                let container = this.el.appendChild(document.createElement('div'));
                container.className = 'row';
                container.style.flex = '1';
                this.el.appendChild(container);
                let panel = container.appendChild(document.createElement('div'));
                panel.className = 'left-panel col-6';
                h = document.createElement('h4');
                let tvEl = document.createElement('div');
                h.innerText = _.gettext('Groups');
                this._treeViewGroup = new katrid.ui.TreeView(tvEl, { options: { onSelect: (node) => this.selectGroupNode(node) } });
                panel.appendChild(h);
                panel.appendChild(tvEl);
                panel = container.appendChild(document.createElement('div'));
                panel.className = 'left-panel col-6';
                h = document.createElement('h4');
                tvEl = document.createElement('div');
                this._treeViewMenu = new katrid.ui.TreeView(tvEl, {
                    options: {
                        checkbox: true, onCheckChange: (node) => this.nodeMenuCheck(node),
                        onChecked: (node) => this.afterChecked(node)
                    }
                });
                h.innerText = _.gettext('Menu');
                panel.appendChild(h);
                panel.appendChild(tvEl);
            }
            loadMenu(data, parentNode) {
                for (const item of data) {
                    item.treeNode = this._treeViewMenu.addItem({ id: item.id, text: item.name, menuItem: item }, parentNode);
                    if (item.children)
                        this.loadMenu(item.children, item.treeNode);
                }
            }
            loadGroups(data) {
                for (const item of data) {
                    item.treeNode = this._treeViewGroup.addItem({ id: item.id, text: item.name });
                }
            }
            loadPermissions() {
                this.groupMap = new Map();
                this.menuMap = new Map();
                for (const item of this.groups) {
                    const gi = new GroupItem();
                    gi.id = item.id;
                    gi.name = item.name;
                    gi.menu = new Set();
                    gi.item = item;
                    this.groupMap.set(gi.id, gi);
                }
                for (const item of this.menu) {
                    const mi = new MenuItem();
                    mi.id = item.id;
                    mi.name = item.name;
                    mi.children = [];
                    mi.groups = [];
                    mi.item = item;
                    this.menuMap.set(mi.id, mi);
                }
                const menu = [];
                for (const item of this.menu) {
                    const mi = this.menuMap.get(item.id);
                    mi.groups = item.groups?.map(g => this.groupMap.get(g));
                    if (item.parent) {
                        const p = this.menuMap.get(item.parent);
                        p.children.push(mi);
                    }
                    else {
                        menu.push(mi);
                    }
                }
                for (const item of this.groups) {
                    const gi = this.groupMap.get(item.id);
                    gi.menu = new Set(item.menus?.map(m => this.menuMap.get(m)));
                }
                this.loadGroups(Array.from(this.groupMap.values()));
                this.loadMenu(menu);
            }
            load(data) {
                this.groups = data.groups;
                this.menu = data.menu;
                this.loadPermissions();
            }
            selectGroupNode(node) {
                this.selectGroup(this.groupMap.get(node.data.id));
            }
            selectGroup(group) {
                if (this.group === group)
                    return;
                this.group = group;
                try {
                    this._loading = true;
                    for (const item of this.menuMap.values()) {
                        item.treeNode.checked = false;
                    }
                    if (group.menu) {
                        for (const item of group.menu) {
                            if (item.children.length === 0)
                                item.treeNode.checked = true;
                        }
                    }
                }
                finally {
                    this._loading = false;
                }
            }
            nodeMenuCheck(node) {
                if (this._loading)
                    return;
                this.group.modified = true;
                if (node.checked)
                    this.group.menu.add(node.data.menuItem);
                else
                    this.group.menu.delete(node.data.menuItem);
                for (const child of node.children)
                    this.nodeMenuCheck(child);
            }
            afterChecked(node) {
                let parent = node.parent;
                while (parent) {
                    if (parent.checked)
                        this.group.menu.add(parent.data.menuItem);
                    else
                        this.group.menu.delete(parent.data.menuItem);
                    parent = parent.parent;
                }
            }
            async saveChanges() {
                let data = [];
                for (const g of this.groupMap.values()) {
                    if (!g.modified)
                        continue;
                    const add = [];
                    const remove = [];
                    for (const m of this.menuMap.values()) {
                        if (!g.menu.has(m) && g.item.menus.includes(m.id)) {
                            remove.push(m.id);
                        }
                        else if (g.menu.has(m) && !g.item.menus.includes(m.id)) {
                            add.push(m.id);
                        }
                    }
                    if (add.length || remove.length) {
                        data.push({ group: g.id, addMenu: add, removeMenu: remove, });
                    }
                }
                if (await this.onCommit?.call(this, data)) {
                    for (const perm of data) {
                        const g = this.groupMap.get(perm.group);
                        for (const m of perm.addMenu) {
                            g.item.menus.push(m);
                        }
                        for (const m of perm.removeMenu) {
                            g.item.menus.splice(g.item.menus.indexOf(m), 1);
                        }
                    }
                }
            }
        }
        admin.PermissionManager = PermissionManager;
        admin.ClientAction.registry['katrid.admin.PermissionManager'] = async (clientAction) => {
            const manager = new PermissionManager(clientAction.element);
            const groupModel = new Katrid.Services.ModelService('auth.group');
            manager.onCommit = async (data) => {
                await groupModel.rpc('admin_set_permissions', [data]);
                return true;
            };
            let res = await groupModel.rpc('admin_get_permissions');
            if (res.groups && res.menu) {
                manager.load(res);
            }
        };
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class ResponseMessagesProcessor {
            constructor(response) {
                this.response = response;
            }
            process(content) {
                const msgs = content['katrid.admin.ResponseMessagesProcessor'];
                if (Array.isArray(msgs)) {
                    for (let msg of msgs)
                        katrid.admin.Messages.message(msg);
                }
            }
        }
        admin.ResponseMessagesProcessor = ResponseMessagesProcessor;
        admin.requestMiddleware = [];
        admin.responseMiddleware = [ResponseMessagesProcessor];
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class UserDefinedValue {
            constructor(fieldName, el) {
                this.fieldName = fieldName;
                this.el = el;
            }
            createFieldValue() {
                this.el.innerHTML = `
      <hr>
      <div class="form-group">
        <label for="field-value">${katrid.i18n.gettext('Field value')}</label>
        <input type="text" id="field-value" class="form-control">
      </div>
      `;
            }
            createValue() {
                this.el.innerHTML = `
      <hr>
      <div class="form-group">
        <label for="field-value">${katrid.i18n.gettext('Field value')}</label>
        <input type="text" id="value" class="form-control">
      </div>
      `;
            }
            createList() {
                this.el.innerHTML = `
      <hr>
      <div class="form-group">
        <label for="field-value">${katrid.i18n.gettext('Field value')}</label>
        <textarea id="list" class="form-control"></textarea>
      </div>
      `;
            }
            createQuery() {
                this.el.innerHTML = `
      <hr>
      <div class="form-group">
        <label for="field-value">${katrid.i18n.gettext('Select the user query')}</label>
        <input type="text" id="query" class="form-control">
      </div>
      `;
            }
            createUDF() {
            }
            static showDialog() {
                const dlg = new katrid.ui.Dialog({ title: 'User Defined Value', buttons: ['ok', 'cancel'] });
                dlg.dialog.classList.add('dialog-lg');
                dlg.dialog.querySelector('.dialog-body').innerHTML = `
      <select class="form-select">
        <option value="none">${katrid.i18n.gettext('None')}</option>
        <option value="field value">${katrid.i18n.gettext('Current value')}</option>
        <option value="value">${katrid.i18n.gettext('Value')}</option>
        <option value="list">${katrid.i18n.gettext('List of values')}</option>
        <option value="query">${katrid.i18n.gettext('User query')}</option>
        <option value="udf">${katrid.i18n.gettext('User defined function')}</option>
      </select>
      <div class="udv-panel"></div>
      `;
                const select = dlg.dialog.querySelector('select');
                const panel = dlg.dialog.querySelector('.udv-panel');
                let udv = new UserDefinedValue('fieldName', panel);
                select.addEventListener('change', (evt) => {
                    panel.innerHTML = '';
                    switch (select.value) {
                        case 'field value':
                            udv.createFieldValue();
                            break;
                        case 'value':
                            udv.createValue();
                            break;
                        case 'list':
                            udv.createList();
                            break;
                        case 'query':
                            udv.createQuery();
                            break;
                        case 'udf':
                            udv.createUDF();
                            break;
                    }
                });
                return dlg.showModal();
            }
        }
        admin.UserDefinedValue = UserDefinedValue;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class UserPreferences {
            static async showModal() {
                const pref = new UserPreferences();
                await pref.execute();
            }
            async changePassword() {
                const change = async () => {
                    const oldPassword = changeDialog.dialog.querySelector('input[name="old_password"]').value;
                    const newPassword = changeDialog.dialog.querySelector('input[name="new_password"]').value;
                    const confirmPassword = changeDialog.dialog.querySelector('input[name="confirm_password"]').value;
                    if (newPassword !== confirmPassword) {
                        Katrid.Forms.Dialogs.Alerts.error('Passwords do not match');
                        throw new Error('Passwords do not match');
                    }
                    const svc = new Katrid.Services.ModelService('auth.user');
                    const res = await svc.rpc('change_password', null, {
                        old_password: oldPassword, new_password: newPassword,
                    });
                    if (res.success) {
                        Katrid.Forms.Dialogs.Alerts.info(Katrid.i18n.gettext('Logging out...'));
                        setTimeout(() => window.location.reload(), 2000);
                    }
                };
                const changeDialog = new katrid.ui.Dialog({
                    title: Katrid.i18n.gettext('Change Password'),
                    content: `<form>
          <label>${Katrid.i18n.gettext('Old Password')}</label><input type="password" class="form-control" name="old_password" autocomplete="current-password">
          <label>${Katrid.i18n.gettext('New Password')}</label><input type="password" class="form-control" name="new_password" autocomplete="new-password">
          <label>${Katrid.i18n.gettext('Confirm Password')}</label><input type="password" class="form-control" name="confirm_password" autocomplete="new-password">
            </form>`,
                    buttons: [{ text: 'OK', click: () => change() }, 'cancel'],
                });
                return await changeDialog.showModal();
            }
            async execute() {
                const dlg = new katrid.ui.Dialog({
                    title: Katrid.i18n.gettext('Preferences'),
                    content: `<form><h3>${Katrid.webApp.userInfo.name}</h3>
            <button type="button" class="btn btn-secondary" id="btn-change-password">${Katrid.i18n.gettext('Change Password')}</button>
          </form>`,
                    buttons: ['ok', 'cancel'],
                });
                dlg.dialog.querySelector('#btn-change-password').addEventListener('click', async () => this.changePassword());
                if (await dlg.showModal() === 'ok') {
                }
                dlg.close();
            }
        }
        admin.UserPreferences = UserPreferences;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var admin;
    (function (admin) {
        class HelpPortal {
            constructor(el) {
                this.el = el;
                this.markdown = new showdown.Converter();
                if (!el) {
                    this.el = document.createElement('div');
                    document.body.appendChild(this.el);
                }
                this.render();
            }
            render() {
                this.el.classList.add('help-center-portal');
                this.el.innerHTML = `
      <div class="navbar">
      <h2>Help Center</h2>
      </div>
      <div class="help-panel">
        <div class="left-side"><div></div></div>
        <div class="content-panel"></div>
      </div>
    `;
                this.treeView = new katrid.ui.TreeView(this.el.querySelector('.left-side div'), { options: { onSelect: (node) => this.onSelect(node) } });
                this.treeView.options.options.onSelect;
                this.loadTOC();
            }
            onSelect(node) {
                if (node.data) {
                    if (node.data.index) {
                        this.navigateTo(node.data.index);
                    }
                    else if (node.data.target) {
                        this.navigateTo(node.data.target);
                    }
                }
            }
            async loadTOC() {
                let res = await fetch('/admin/help-center/toc/')
                    .then(res => res.json());
                for (const toc of res.toc) {
                    let node = this.treeView.addItem(toc.title);
                    node.data = toc;
                    this.loadChildren(node, toc.toc);
                }
            }
            getCurrentFolder(uri) {
                const trimmed = uri.replace(/\/$/, '');
                return trimmed.substring(0, trimmed.lastIndexOf('/') + 1);
            }
            async navigateTo(url) {
                let res = await fetch('/admin/help-center/get/?' + (new URLSearchParams({ 'content': url })).toString()).then(res => res.json());
                if (res.content) {
                    window.history.pushState({}, '', '#/' + url);
                    res = this.markdown.makeHtml(res.content);
                    this.el.querySelector('.content-panel').innerHTML = res;
                    this.el.querySelectorAll('.content-panel a').forEach((a) => {
                        if (a.href.indexOf('#') > 0) {
                            let s = a.href.slice(a.href.indexOf('#') + 1);
                            if (s.startsWith('./'))
                                s = this.getCurrentFolder(window.location.hash.slice(1)) + s.slice(2);
                            if (!s.startsWith('/'))
                                s = this.getCurrentFolder(window.location.hash.slice(1)) + '/' + s;
                            a.href = '#' + s;
                        }
                        a.addEventListener('click', evt => {
                            evt.preventDefault();
                            this.navigateTo(a.href.slice(a.href.indexOf('#') + 1));
                        });
                    });
                }
            }
            loadChildren(node, toc) {
                if (Array.isArray(toc)) {
                    for (const item of toc) {
                        if (item.toc) {
                            const n = node.addItem({ text: item.title, index: item.index, });
                            this.loadChildren(n, item.toc);
                        }
                        else
                            node.addItem({ text: item.title, target: item.index });
                    }
                }
                else
                    for (const [k, v] of Object.entries(toc)) {
                        if (typeof v === 'string')
                            node.addItem({ text: k, target: v });
                        else if (typeof v === 'object') {
                            const item = v;
                            let childNode = node.addItem({ text: k, data: v });
                            if (item.toc)
                                this.loadChildren(childNode, item.toc);
                        }
                    }
            }
        }
        admin.HelpPortal = HelpPortal;
    })(admin = katrid.admin || (katrid.admin = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
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
                katrid['app'] = Katrid.app = this;
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
            setView(view) {
                this.element.innerHTML = '';
                this.element.append(view);
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
                window.addEventListener('beforeunload', event => {
                    this.beforeUnload(event);
                });
            }
            beforeUnload(event) {
                if (this.actionManager.action?.beforeUnload)
                    return this.actionManager.action.beforeUnload(event);
            }
            get actionManager() {
                return this._actionManager;
            }
            render() {
                let appHeader = document.createElement('app-header');
                appHeader.id = 'app-header';
                appHeader.classList.add('app-header', 'navbar', 'navbar-expand-md', 'navbar-dark', 'flex-row');
                appHeader.innerHTML = `
      <div id="navbar-menu" class="mr-auto d-none d-md-block"></div>
      `;
                let homeBar = document.createElement('div');
                homeBar.classList.add('home-header', 'navbar-dark', 'navbar-expand-lg');
                homeBar.innerHTML = `
  <div class="dropdown dropdown-apps">
        <a id="apps-button" class="header-link" data-bs-toggle="dropdown">
          <i class="fa fa-grip-vertical"></i>
        </a>
        <div class="dropdown-menu apps-menu">
        </div>
      </div>

<div class="home-bar">
  <div class="app-header navbar">

    <div class="navbar-nav company-selector dropdown">

      <a class="dropdown-toggle" data-bs-toggle="dropdown" href="#">
        <span>${this.userInfo.company?.name || 'Select company'}</span>
      </a>

      <div class="dropdown-menu">
        <a class="dropdown-item">My Company</a>
      </div>

    </div>
      <div id="navbar" class="collapse navbar-collapse navbar-tools">
        <div class="navbar-search">
          <i class="fa fw fa-search"></i>
          <input id="navbar-search" type="search" class="form-control form-control-dark typeahead" spellcheck="false" autocomplete="off"
                 placeholder="${Katrid.i18n.gettext('Find resources here...')}">
        </div>
      </div>

        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="dropdown-toggle nav-link button-notification-messages" href="javascript:void(0);" data-action="messages"
               title="View notifications"
               data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <div class="position-absolute badge text-bg-warning" style="display:none">
                <span class="messages-counter">32<span>
                <span class="visually-hidden">messages</span>
              </div>
              <i class="fa fa-bell"></i>
            </a>
            <div class="dropdown-menu dropdown-menu-end dropdown-menu-notifications">
              <a class="dropdown-item"><i class="fa fa-fw"></i> Messages</a>
            </div>

          </li>
          <li class="nav-item d-none d-sm-block">
            <a class="nav-link" href="#/query-viewer/" title="${Katrid.i18n.gettext('Query Viewer')}">
              <i class="fa fa-fw fa-database"></i>
            </a>
          </li>
          <li class="nav-item d-none d-sm-block">
            <a class="nav-link" href="javascript:void(0);" data-action="helpCenter" title="Help Center"
               onclick="Katrid.UI.helpCenter()">
              <i class="fa fa-fw fa-question"></i> <span>${katrid.i18n.gettext('Help')}</span>
            </a>
          </li>
          <li class="nav-item user-menu dropdown">
            <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#">
              <img class="user-avatar" src="/static/admin/assets/img/avatar.png"> <span class="user-name">${this.userInfo.name}</span>
            </a>
            <div class="dropdown-menu dropdown-menu-end">
              <a class="dropdown-item" id="user-support-menu-item" href="https://support.katrid.com/buy" target="_blank"><i class="fa fa-fw"></i> ${katrid.i18n.gettext('Support')}</a>
              <a class="dropdown-item" id="user-support-menu-item" href="/admin/help-center/" target="_blank"><i class="fa fa-fw"></i> Help Center</a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item" onclick="katrid.admin.UserPreferences.showModal()"><i class="fa fa-fw"></i> ${Katrid.i18n.gettext('Preferences')}</a>
              <a class="dropdown-item" href="/web/logout/"><i class="fa fa-fw fa-sign-out-alt"></i> ${Katrid.i18n.gettext('Logout')}</a>
            </div>
          </li>
        </ul>
        </div>
        </div>
      `;
                homeBar.querySelector('.home-bar').appendChild(appHeader);
                this.rootElement.appendChild(homeBar);
                const companySelector = homeBar.querySelector('.company-selector');
                companySelector.addEventListener('click', async () => {
                    const menu = companySelector.querySelector('.dropdown-menu');
                    menu.innerHTML = `<span class="dropdown-item">${Katrid.i18n.gettext('Loading...')}</span>`;
                    const model = new Katrid.Services.ModelService('auth.user');
                    let res = await model.rpc('get_companies');
                    menu.innerHTML = '';
                    const companyClick = async (evt) => {
                        const target = evt.target;
                        const companyId = target.dataset.companyId;
                        if (companyId) {
                            const res = await model.rpc('set_user_company', null, { company_id: companyId });
                            if (res === true) {
                                const companyName = target.innerText;
                                companySelector.querySelector('span').innerText = companyName;
                                this.userInfo.company = { id: companyId, name: companyName };
                            }
                        }
                    };
                    if (res)
                        for (const c of res) {
                            const cEl = menu.appendChild($(`<a class="dropdown-item" data-company-id="${c.id}">${c.name}</a>`)[0]);
                            cEl['companyInfo'] = c;
                            cEl.addEventListener('click', companyClick);
                        }
                });
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
                this.buttonNotificationMessages = this.rootElement.querySelector('.button-notification-messages');
                this.buttonNotificationMessages.addEventListener('mousedown', () => {
                    let menu = this.buttonNotificationMessages.parentElement.querySelector('.dropdown-menu');
                    menu.innerHTML = '';
                    if (this.notificationMessages?.length > 0) {
                        let items = [];
                        for (let msg of this.notificationMessages) {
                            if (!msg.read) {
                                items.push(msg.id);
                                msg.read = true;
                            }
                            this.createNotificationMessageItem(menu, msg);
                        }
                        if (items.length) {
                            const model = new Katrid.Services.ModelService('mail.message');
                            model.post('set_read', { kwargs: { ids: items } });
                        }
                        setTimeout(() => {
                            this.hideMessageCounter();
                        }, 5000);
                    }
                });
                this.messageCounterElement = this.buttonNotificationMessages.querySelector('.messages-counter').parentElement;
            }
            hideMessageCounter() {
                $(this.messageCounterElement).hide();
            }
            set newMessagesCount(value) {
                if (value > 0) {
                    $(this.messageCounterElement).show();
                    this.messageCounterElement.querySelector('.messages-counter').innerText = value.toString();
                }
                else
                    this.hideMessageCounter();
            }
            get notificationMessages() {
                return this._notificationMessages;
            }
            set notificationMessages(value) {
                let menu = this.buttonNotificationMessages.parentElement.querySelector('.dropdown-menu');
                menu.innerHTML = '';
                this._notificationMessages = value;
            }
            createNotificationMessageItem(menu, msg) {
                let el = document.createElement('a');
                el.className = 'dropdown-item';
                let s = '';
                if (msg.timestamp) {
                    let m = moment(msg.timestamp);
                    s += `<small class="timestamp float-sm-end" title="${katrid.filters.dateTimeHumanize(m)}">${m.fromNow()}</small>`;
                }
                if (msg.title)
                    s += `<h3>${msg.title}</h3>`;
                if (typeof msg.content === 'string')
                    s += `<div>${msg.content}</div>`;
                else if (msg.url) {
                    s += `<div>${msg.content.message}</div>`;
                    el.href = msg.url;
                }
                if (!msg.read)
                    el.classList.add('unread');
                el.innerHTML = s;
                menu.appendChild(el);
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
                    $(`app-header > .dropdown[data-menu-id]`).hide();
                    $(`app-header > .dropdown[data-menu-id="${value.id}"]`).show();
                    $(`app-header .navbar-menu-group[data-parent-id]`).hide();
                    $(`app-header .navbar-menu-group[data-parent-id="${value.id}"]`).show();
                }
            }
            setUserInfo(value) {
                if (value) {
                    if (value.language)
                        Katrid.i18n.languageCode = value.language;
                    let userMenu = document.querySelector('.user-menu');
                    if (userMenu) {
                        userMenu.querySelector('a.nav-link span').innerText = value.name;
                        if (value.avatar)
                            userMenu.querySelector('.user-avatar').src = value.avatar;
                    }
                }
            }
            async loadPage(hash, reset = true) {
                if (!(await this.actionManager.confirmDiscard()))
                    return;
                let url = hash;
                if (hash.indexOf('?') > -1) {
                    url = hash.substring(0, hash.indexOf('?'));
                    hash = hash.substring(hash.indexOf('?') + 1, hash.length);
                }
                let _hash = new URLSearchParams(hash);
                let params = {};
                for (let [k, v] of _hash.entries())
                    params[k] = v;
                this.$search = params;
                if (!this.currentMenu || (params.menu_id && (this.currentMenu.id != params.menu_id))) {
                    this.currentMenu = {
                        id: params.menu_id,
                        name: $(`.module-selector[data-menu-id="${params.menu_id}"]`).text()
                    };
                }
                if (url.startsWith('#/action/')) {
                    let res = await Katrid.Services.Service.$fetch('/web' + url.substring(1, url.length), null, null).then(res => res.json());
                    await this.actionManager.execAction(res);
                }
                else if (('action' in params) || ('model' in params))
                    await this.actionManager.onHashChange(params, reset);
                else if ((!('action' in params)) && ('menu_id' in params)) {
                    let actionItem = document.querySelector('app-header .navbar-menu-group[data-parent-id="' + params.menu_id + '"] .menu-item-action[href]');
                    if (actionItem) {
                        let child = actionItem.parentElement.querySelector('a.dropdown-item[href]');
                        if (child) {
                            let href = child.getAttribute('href');
                            history.replaceState(null, null, href);
                            this.loadPage(href);
                        }
                        else {
                            child = actionItem.parentElement.querySelector('#navbar-menu .menu-item-action');
                            if (child) {
                                child.click();
                            }
                        }
                    }
                }
                if (url.startsWith('#/app/debug/run/')) {
                    this.debug(params);
                }
                for (let plugin of this.plugins) {
                    if (plugin.hashChange(url))
                        break;
                }
                this.element.dispatchEvent(new CustomEvent('katrid.actionChange'));
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
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    katrid.core = Katrid.Core;
})(katrid || (katrid = {}));
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
                this.app.setView(queryViewer);
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
                else if (info?.template instanceof HTMLElement)
                    this.html = info.template.outerHTML;
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
                    ...Katrid.globalData,
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
                        btn.className = 'btn btn-secondary';
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
                        if (setup?.call) {
                            let def = setup.call(this);
                            if (def.methods)
                                Object.assign(component.methods, def.methods);
                            if (def.ready || def.created || def.data)
                                this._readyEventListeners.push(def);
                            if (def.beforeMount)
                                def.beforeMount.call(this, el);
                        }
                    }
                }
                let vm = Katrid.createVm(component).mount(el);
                this.vm = vm;
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
                    const confirmation = $btn.attr('confirmation');
                    let onclick = `actionClick(selection, '${$btn.attr('name')}', $event)`;
                    if (confirmation)
                        onclick = `confirm('${confirmation}') && ` + onclick;
                    if (sendFile === undefined) {
                        $btn.attr('v-on:click', onclick);
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
                    $btn.addClass('btn btn-secondary');
            });
        }
        Forms.compileButtons = compileButtons;
        Forms.globalSettings = {
            defaultGridInline: false,
        };
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        function x() {
            return "";
        }
        Forms.searchModes = ['table', 'card'];
        Forms.registry = {};
        class ModelView extends Forms.BaseView {
            constructor(info) {
                super(info);
                this.pendingOperation = 0;
                this._active = false;
                if (info.readonly != null)
                    this._readonly = info.readonly;
            }
            static fromTemplate(action, model, template) {
                return new Katrid.Forms.Views.registry[this.viewType]({ action, model, template });
            }
            static createViewModeButton(container) {
            }
            async deleteSelection(sel) {
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
                else if (info.name || info.action?.modelName) {
                    console.warn('Please specify a model instance instead of name');
                    this.model = new Katrid.Data.Model({
                        name: info.name || info.action.modelName,
                        fields: info.fields || viewInfo?.fields
                    });
                    if (info.action?.model)
                        this.model.allFields = info.action.model.fields;
                }
                else if (info.fields) {
                    this.model = new Katrid.Data.Model({ fields: info.fields, name: this.action?.modelName });
                }
                else if (viewInfo?.fields || viewInfo?.info?.fields) {
                    this.model = new Katrid.Data.Model({ name: viewInfo.info.name, fields: viewInfo.fields || viewInfo.info.fields });
                }
                this.fields = this.model.fields;
                this.datasource = new Katrid.Data.DataSource({
                    model: this.model, context: this.action?.context, domain: this.action?.config?.domain,
                    fields: this.fields,
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
            }
            refresh() {
                this.datasource.refresh();
            }
            _search(options) {
                if (options.id)
                    return this.datasource.get({ id: options.id, timeout: options.timeout });
                return this.datasource.search({
                    where: options.where,
                    page: options.page,
                    limit: options.limit,
                    fields: Array.from(Object.keys(this.fields))
                });
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
                return this._evalResponseAction(await this.model.service.callAdminViewAction({ action: action, ids: [target] }));
            }
            async callSubAction(action, selection) {
                return;
            }
            async _evalResponseAction(res) {
                if (res?.open) {
                    window.open(res.open);
                }
                return res;
            }
            getSelectedIds() {
                return;
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
                        if (Array.isArray(params))
                            return me.model.service.rpc(methodName, params);
                        return me.model.service.rpc(methodName, params.args, params.kwargs);
                    },
                    actionClick(selection, methodName, event) {
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
                        if (iterable)
                            for (let obj of iterable)
                                res += obj[member] || 0;
                        return res;
                    },
                    sendFile(name, file) {
                        return Katrid.Services.Upload.sendFile({ model: me.model || me.action?.model, method: name, file, vm: this });
                    },
                    $closeDialog(result) {
                        if (result !== undefined)
                            this.$result = result;
                        me.closeDialog();
                    }
                });
                comp.methods.setViewMode = async function (mode) {
                    return await me.action.showView(mode);
                };
                comp.methods.callAdminViewAction = async function (args) {
                    let input;
                    if (args.prompt) {
                        input = prompt(args.prompt);
                        if (!input)
                            return;
                    }
                    if (!args.confirm || (args.confirm && confirm(args.confirm))) {
                        const config = { action: args.action, ids: args.ids };
                        if (!config.ids)
                            config.ids = await me.getSelectedIds();
                        if (input)
                            config.prompt = input;
                        let res = await me.model.service.callAdminViewAction(config);
                        if (res.location)
                            window.location.href = res.location;
                    }
                };
                comp.methods.insert = async function (defaultValues) {
                    let view = await this.setViewMode('form');
                    view.vm.insert(defaultValues);
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
                if (!this.template && !this.html)
                    return this.autoCreateView();
                return super.domTemplate();
            }
            beforeRender(template) {
                let header = template.querySelector(':scope > header');
                Forms.compileButtons(template);
                if (header)
                    template.removeChild(header);
                let actions = template.querySelector(':scope > actions');
                if (actions)
                    template.removeChild(actions);
                let templ = this.renderTemplate(template);
                if (this.dialog)
                    return this.createDialog(templ, this.dialogButtons);
                let actionView = document.createElement('div');
                actionView.className = 'view-content';
                let viewContent = document.createElement('div');
                viewContent.classList.add('action-view-content', 'content-scroll');
                if (this.toolbarVisible)
                    actionView.append(this.createToolbar());
                if (actions)
                    actionView.append(actions);
                let newHeader = document.createElement('div');
                newHeader.className = 'content-container-heading';
                if (header)
                    this._mergeHeader(newHeader, header);
                let content = document.createElement('div');
                content.className = 'content no-padding';
                content.append(newHeader);
                content.append(templ);
                viewContent.append(content);
                actionView.append(viewContent);
                return actionView;
            }
            renderTemplate(template) {
                return template;
            }
            createSettingsMenu(toolbar) {
                let btn = document.createElement('div');
                btn.innerHTML = `<span class="dropdown-toggle" data-bs-offset="-8,0" data-bs-toggle="dropdown" title="${katrid.i18n.gettext('Settings')}"><i class="fa fa-fw fa-cog"></i></span>`;
                btn.classList.add('btn-settings');
                let menu = document.createElement('ul');
                menu.classList.add('dropdown-menu');
                menu.innerHTML = `
        <li><a class="dropdown-item">${Katrid.i18n.gettext('User Defined Function')}</a></li>
        <li><a class="dropdown-item">${Katrid.i18n.gettext('User Defined Template')}</a></li>
        <li><a class="dropdown-item">${Katrid.i18n.gettext('Permissions')}</a></li>
        `;
                btn.appendChild(menu);
                toolbar.appendChild(btn);
            }
            createToolbar() {
                let el = document.createElement('div');
                el.className = 'toolbar';
                return el;
            }
            generateHelp(help) {
                if (this.fields) {
                    for (let f of Object.values(this.fields))
                        if (f.visible) {
                            let h4 = document.createElement('h4');
                            h4.innerText = f.caption;
                            help.element.append(h4);
                            if (f.helpText) {
                                let p = document.createElement('p');
                                p.innerHTML = f.helpText;
                                help.element.append(p);
                                if (f.widgetHelp) {
                                    p = document.createElement('p');
                                    p.className = 'text-muted';
                                    p.innerHTML = f.widgetHelp;
                                    help.element.append(p);
                                }
                            }
                        }
                }
            }
        }
        Forms.ModelView = ModelView;
        class RecordCollectionView extends ModelView {
            constructor(info) {
                super(info);
                this.autoLoad = true;
            }
            get orderBy() {
                return this._orderBy;
            }
            set orderBy(value) {
                this._orderBy = value;
                this.datasource.orderBy = value;
            }
            async getSelectedIds() {
                if (this.vm.allSelectionFilter)
                    return this.model.service.listId({ where: this._lastSearch, limit: 99999 });
                else
                    return this.vm.selection.map(obj => obj.id);
            }
            async callSubAction(action, selection) {
                if (!selection)
                    selection = await this.getSelectedIds();
                if (selection?.length)
                    await this.model.service.callSubAction(action, selection);
                return;
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
                        let formView = await this.action.showView('form', { params: { id: record.id } });
                        console.debug('set records', this.groupLength);
                        if (this.groupLength)
                            formView.records = this.datasource.records;
                        else
                            formView.records = this.vm.records;
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
                comp.methods.download = function (config) {
                    if (config.format)
                        return this.rpc('api_export', { kwargs: { where: me._lastSearch, fields: Array.from(Object.keys(me.fields)) } });
                };
                comp.methods.importFromFile = async function (config) {
                    if (config.format === 'xlsx') {
                        let input = document.createElement('input');
                        input.type = 'file';
                        input.accept = config.format === 'xlsx' ? '.xlsx, .xls' : '.csv';
                        input.onchange = async (event) => {
                            if (event.target.files.length > 0) {
                                const res = await Katrid.Services.Upload.callWithFiles({
                                    model: me.model, method: 'api_import', file: event.target, vm: this, data: { preview: false },
                                });
                                if (res.error) {
                                    Katrid.Forms.Dialogs.Alerts.error(res.messages?.[0] || res.message || res.error);
                                }
                                else if (res.message)
                                    Katrid.Forms.Dialogs.Alerts.success(res.message);
                            }
                            input.remove();
                        };
                        input.click();
                    }
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
                    this.vm.recordCount = this.datasource.recordCount;
                }
                this._invalidateSelection();
            }
            setSearchView(searchView) {
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
                data.$fields = this.fields;
                data.allSelectionFilter = false;
                return data;
            }
            prepareGroup(groups) {
                return groups;
            }
            async groupBy(data) {
                this.vm.records = this.vm.groups;
            }
            async applyGroups(groups, params) {
                let res = await this.datasource.groupBy(groups, params);
                await this.groupBy(res);
            }
            _addRecordsToGroup(index, list) {
            }
            async expandGroup(group) {
                group.$expanded = true;
                let idx = this.vm.groups.indexOf(group);
                let children = group.$children;
                if (!children) {
                    await this.datasource.expandGroup(idx, group);
                }
                else {
                    let groups = this.vm.groups;
                    this.vm.groups = [...groups.slice(0, idx + 1), ...children, ...groups.slice(idx + 1)];
                }
            }
            expandAll() {
                for (let g of this.vm.groups) {
                    if (g.$hasChildren && !g.$expanded) {
                        this.expandGroup(g);
                    }
                }
            }
            collapseAll() {
                for (let g of this.vm.groups)
                    if (g.$hasChildren && g.$expanded)
                        this.collapseGroup(g);
            }
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
            async setSearchParams(params) {
                let p = {};
                if (this.action?.info?.domain)
                    p = JSON.parse(this.action.info.domain);
                for (let [k, v] of Object.entries(p)) {
                    let arg = {};
                    arg[k] = v;
                    params.push(arg);
                }
                this._lastSearch = params;
                await this.datasource.search({ where: params });
            }
            _invalidateSelection() {
                this.vm.selection = [];
                this.vm.selectionLength = 0;
                this.vm.allSelected = false;
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
                if (Katrid.webApp.userInfo.superuser)
                    this.createSettingsMenu(toolbar);
                return toolbar;
            }
            createToolbarButtons(container) {
                let parent = container.querySelector('.toolbar-action-buttons');
                if (!this.config.readonly) {
                    let btnCreate = document.createElement('button');
                    btnCreate.className = 'btn btn-primary btn-action-create';
                    btnCreate.innerText = Katrid.i18n.gettext('Create');
                    btnCreate.setAttribute('v-on:click', 'insert()');
                    parent.append(btnCreate);
                }
                let btnImportExport = document.createElement('div');
                btnImportExport.className = 'btn-group';
                btnImportExport.innerHTML = `<button type="button" class="btn btn-soft-secondary dropdown-toggle btn-actions" name="import-export" data-bs-toggle="dropdown" aria-haspopup="true" title="${Katrid.i18n.gettext('Import/Export')}">
      <i class="fas fa-fw fa-download"></i>
         <span class="caret"></span>
      </button>
      <div class="dropdown-menu">
        <a class="dropdown-item" v-on:click="download({format: 'xlsx'})">${Katrid.i18n.gettext('Export to Excel')}</a>
        <a class="dropdown-item" v-on:click="importFromFile({format: 'xlsx'})">${Katrid.i18n.gettext('Import from Excel')}</a>
      </div>`;
                parent.append(btnImportExport);
                if (this.config?.toolbar?.print) {
                    let btnPrint = document.createElement('div');
                    btnPrint.classList.add('btn-group');
                    btnPrint.innerHTML = `<button type="button" class="btn btn-soft-secondary dropdown-toggle btn-actions" name="print" data-bs-toggle="dropdown" aria-haspopup="true">
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
                let btnRefresh = document.createElement('button');
                btnRefresh.type = 'button';
                btnRefresh.classList.add('btn', 'toolbtn');
                btnRefresh.innerHTML = '<i class="fas fa-redo-alt"></i>';
                btnRefresh.title = Katrid.i18n.gettext('Refresh');
                btnRefresh.setAttribute('v-on:click', 'refresh()');
                parent.append(btnRefresh);
                this.createSelectionInfo(parent);
                let btnActions = document.createElement('div');
                btnActions.classList.add('btn-group');
                console.debug('readonly', this._readonly);
                if (!this.config.readonly) {
                    btnActions.innerHTML = `<div class="dropdown">
        <button name="actions" type="button" class="btn btn-soft-secondary dropdown-toggle btn-actions" data-bs-toggle="dropdown" v-show="selectionLength"
                aria-haspopup="true">
          ${Katrid.i18n.gettext('Action')} <span class="caret"></span>
        </button>
        <div class="dropdown-menu dropdown-menu-actions">
          <a class="dropdown-item btn-action-delete" v-on:click="deleteSelection()">
            <i class="fa fa-fw fa-trash-o"></i> ${Katrid.i18n.gettext('Delete')}
          </a>
          <!-- replace-actions -->
        </div>
      </div>`;
                    parent.append(btnActions);
                }
                return parent;
            }
            createSelectionInfo(parent) {
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
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        const SCROLL_PAGE_SIZE = 100;
        class QueryView extends Katrid.Forms.RecordCollectionView {
            constructor() {
                super(...arguments);
                this.searchViewVisible = true;
                this._loadedRows = 0;
            }
            static { this.viewType = 'query'; }
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
                let container = document.createElement('div');
                container.classList.add('table-responsive');
            }
            async refreshQuery(query, params) {
                this._loadedRows = 0;
                $(this.container).empty();
                let res = await Katrid.Services.Query.read({ id: query, details: true, params });
                let fields = this.fields = res.fields;
                this.fieldList = Object.values(this.fields);
                return res;
            }
            loadData(data) {
                this._lastGroup = undefined;
                let table = this.table = document.createElement('table');
                table.classList.add('table', 'table-hover');
                const thead = table.createTHead();
                const thr = thead.insertRow(0);
                table.createTBody();
                let fixed = false;
                for (let f of this.columns) {
                    let th = document.createElement('th');
                    if (f.dataIndex > -1) {
                        let field = this.fieldList[f.dataIndex];
                        if (field.type)
                            th.className = field.type;
                        if (f.width) {
                            th.style.width = f.width + 'px';
                            fixed = true;
                        }
                        if (f.cols)
                            th.classList.add('col-' + f.cols);
                        if (!f.label)
                            f.label = field.caption;
                    }
                    else if (f.type)
                        th.className = f.type;
                    th.innerText = f.label;
                    thr.append(th);
                }
                this.element.append(table);
                if (fixed)
                    table.classList.add('table-fixed');
                table.addEventListener('contextmenu', evt => this.contextMenu(evt));
            }
            evalTotal(col, values) {
                let val = 0;
                switch (col.total.toLowerCase()) {
                    case 'sum':
                        values.forEach(obj => val += parseFloat(obj[col.dataIndex]) || 0);
                        return val;
                    case 'min':
                        values.forEach(obj => val = Math.min(parseFloat(obj[col.dataIndex]) || 0, val));
                        return val;
                    case 'max':
                        values.forEach(obj => val = Math.max(parseFloat(obj[col.dataIndex]) || 0, val));
                        return val;
                    case 'avg':
                        values.forEach(obj => val += parseFloat(obj[col.dataIndex]) || 0);
                        return val / values.length;
                }
            }
            addGroupHeader(grouper, record, data) {
                const tbody = this.table.tBodies.item(0);
                const tr = document.createElement('tr');
                let th = document.createElement('th');
                let colIndex = this.columns.length;
                for (let col of this.columns)
                    if (col.total) {
                        colIndex = this.columns.indexOf(col);
                        break;
                    }
                th.colSpan = colIndex;
                if (grouper)
                    th.innerText = grouper.toString();
                else {
                    th.innerText = '--';
                    th.className = 'text-muted';
                }
                tr.append(th);
                for (let i = colIndex; i < this.columns.length; i++) {
                    let col = this.columns[i];
                    th = document.createElement('th');
                    if (col.total) {
                        th.className = col.type;
                        let val = this.evalTotal(col, data);
                        th.innerText = Katrid.intl.number({ minimumFractionDigits: 2 }).format(val);
                    }
                    tr.append(th);
                }
                tbody.append(tr);
            }
            addGroupFooter() {
                const tbody = this.table.tBodies.item(0);
                const tr = document.createElement('tr');
                let th = document.createElement('th');
                th.colSpan = this.columns.length;
                th.innerText = 'Total de registros: ' + this._lastGroupValues.length.toString();
                tr.append(th);
                tbody.append(tr);
            }
            more(count) {
                const tbody = this.table.tBodies.item(0);
                count = Math.min(count, this.data.length - this._loadedRows);
                for (let c = 0; c < count; c++) {
                    let row = this.data[this._loadedRows + c];
                    let tr = document.createElement('tr');
                    let i = 0;
                    if (this.groupsIndex) {
                        let gIndex = this.groupsIndex[0];
                        let groupVal = row[gIndex];
                        if (this._lastGroup != groupVal) {
                            if (this._lastGroup !== undefined) {
                                this.addGroupFooter();
                            }
                            this._lastGroupValues = this.data.filter(obj => obj[gIndex] == groupVal);
                            this.addGroupHeader(groupVal, row, this._lastGroupValues);
                            this._lastGroup = groupVal;
                        }
                    }
                    for (let column of this.columns) {
                        if (column.dataIndex > -1) {
                            let field = this.fieldList[column.dataIndex];
                            let col = row[column.dataIndex];
                            let td = document.createElement('td');
                            if (col == null)
                                col = '--';
                            else {
                                if (field.type === 'DecimalField')
                                    col = Katrid.intl.number({ minimumFractionDigits: 2 }).format(col);
                                else if (Katrid.isNumber(col))
                                    col = Katrid.intl.number({ minimumFractionDigits: 0 }).format(col);
                                else if ((field.type === 'DateField') || (field.type === 'date'))
                                    col = moment(col).format('DD/MM/YYYY');
                                else if ((field.type === 'DateTimeField') || (field.type === 'datetime'))
                                    col = moment(col).format('DD/MM/YYYY HH:mm');
                            }
                            if (field.type)
                                td.className = field.type;
                            td.innerText = col;
                            tr.append(td);
                        }
                        i++;
                    }
                    tbody.append(tr);
                }
                this._loadedRows += count;
                if (count && (this._loadedRows === this.data.length) && this.groupsIndex)
                    this.addGroupFooter();
                return count;
            }
            async ready() {
                this.columns = null;
                this.fieldList = Object.values(this.fields);
                const fieldNames = Object.keys(this.fields);
                if (this.metadata.template?.columns) {
                    this.columns = this.metadata.template.columns.map(c => new Column(c));
                    for (let col of this.columns)
                        if (typeof col.name === 'string') {
                            col.dataIndex = fieldNames.indexOf(col.name);
                            if (!col.type)
                                col.type = this.fieldList[col.dataIndex].type;
                        }
                }
                else
                    this.columns = this.fieldList.map((f, idx) => new Column({
                        name: f.name, type: f.type, label: f.caption, dataIndex: idx
                    }));
                if (this.metadata?.groupBy)
                    this.groupsIndex = this.metadata.groupBy.map(g => fieldNames.indexOf(g));
                this.element = document.createElement('div');
                this.element.classList.add('table-responsive');
                this.element.addEventListener('scroll', event => this.tableScroll(event));
                this.loadData(this.data);
                this.more(SCROLL_PAGE_SIZE * 2);
                while ((this.element.scrollHeight < this.element.clientHeight) && this.more(SCROLL_PAGE_SIZE)) {
                }
                if (this.searchViewVisible) {
                    let searchView = new Katrid.Forms.SearchView({ fields: this.fields });
                    searchView.renderTo(this.container);
                }
                this.container.append(this.element);
            }
            tableScroll(evt) {
                if (this.element.scrollHeight < (this.element.scrollTop + this.element.clientHeight + 100))
                    this.more(SCROLL_PAGE_SIZE);
            }
            contextMenu(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                let menu = new Katrid.Forms.ContextMenu();
                menu.add('<i class="fa fa-fw fa-copy"></i> ' + Katrid.i18n.gettext('Copy'), () => this.copyToClipboard());
                menu.add('<i class="fa fa-fw fa-copy"></i> ' + Katrid.i18n.gettext('Copy with formatting'), () => this.copyToClipboard(true));
                menu.add('<i class="fa fa-fw fa-download"></i> ' + Katrid.i18n.gettext('Export'), () => this.export());
                menu.show(evt.pageX, evt.pageY);
            }
            async copyToClipboard(formatting = false) {
                if (formatting)
                    navigator.clipboard.writeText(this.toText());
                else {
                    await this.more(this.data.length - this._loadedRows);
                    navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(this.table));
                }
            }
            toText(options) {
                const output = [];
                options = Object.assign({ newLine: '\n', separator: '\t', withHeader: true }, options || {});
                if (options.withHeader)
                    output.push(this.columns.map(col => col.label || col.name.toString()).join(options.separator));
                output.push(...this.data.map((o) => Object.values(o).map(v => v == null ? '' : v.toString().replaceAll("\n", ";")).join(options.separator)));
                return output.join(options.newLine);
            }
            export() {
                Katrid.UI.Utils.textToDownload(this.toText(), `${this._queryId}.tsv`);
            }
            get orientation() {
                if (this.metadata?.orientation == 2)
                    return 'landscape';
                return 'portrait';
            }
            async print() {
                while ((this._loadedRows < this.data.length) && this.more(1000)) {
                }
                const wnd = window.open('');
                wnd.addEventListener('afterprint', () => {
                    wnd.close();
                });
                if (this.reportTemplate)
                    wnd.document.write(this.reportTemplate);
                const style = document.createElement('style');
                style.innerHTML = `@page { size: A4 ${this.orientation} }`;
                wnd.document.head.append(style);
                wnd.document.querySelector('.document-content').innerHTML = this.table.outerHTML;
                wnd.document.body.classList.add(this.orientation);
                wnd.document.querySelector('h1').innerText = this.metadata.name;
                wnd.document.write('<script>print()</script>');
                wnd.document.close();
            }
            destroy() {
                this.element.remove();
            }
        }
        BI.QueryView = QueryView;
        class Column {
            constructor(info) {
                this.name = info.name;
                this.type = info.type;
                this.label = info.label;
                this.visible = info.visible ? info.visible != null : true;
                this.dataIndex = info.dataIndex;
                this.total = info.total;
                this.width = info.width;
                this.cols = info.cols;
            }
        }
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var BI;
    (function (BI) {
        class QueryViewerElement extends Katrid.WebComponent {
            create() {
                this.queryViewer = new QueryViewer(this);
            }
        }
        BI.QueryViewerElement = QueryViewerElement;
        class QueryViewer {
            constructor(el) {
                this.el = el;
                this.create();
            }
            create() {
                this.el.className = 'query-viewer';
                this.el.innerHTML = `
        <div class="header">
          <h4 class="text-muted">${katrid.i18n.gettext('Query Viewer')}</h4></div>
        <div class="d-flex flex-row flex-grow-1">
          <div class="position-relative" style="flex: 0 0 250px">
          <div id="report-explorer" class="position-absolute" style="left:0;top:0;right:0;bottom:0;width: 250px"></div>
          </div>
          <div class="query-view card flex-grow-1"></div>
        </div>
      `;
                this.load();
            }
            async load() {
                this.container = this.el.querySelector('.query-view');
                let res = await Katrid.Services.Query.all();
                if (res.data) {
                    for (let item of res.data) {
                        item.onclick = async () => {
                            $(this.container).empty();
                            this.query = new Katrid.Services.Query(item.id);
                            window.history.pushState("", "", "#/query-viewer/?id=" + item.id.toString());
                            let res = await this.query.getMetadata();
                            this.metadata = res;
                            let fields = res.fields;
                            const params = res.params;
                            this.params = null;
                            if (params)
                                this.createParamsPanel(params);
                            if (fields)
                                this.createQueryView(fields, res.data).ready();
                            else if (res.type === "query") {
                                const data = await this.query.execute({});
                                this.createQueryView(data.fields, data.data).ready();
                            }
                        };
                    }
                    const treeView = new katrid.ui.TreeView(this.el.querySelector('#report-explorer'));
                    const categories = Object.groupBy(res.data, ({ category_id }) => category_id);
                    const catCtxMenu = (node, evt) => {
                        if (!Katrid.webApp.userInfo.superuser)
                            return;
                        if (!node.data?.id)
                            return;
                        const menu = new katrid.ui.ContextMenu();
                        menu.add(katrid.i18n.gettext('Permissions'), async () => {
                            const catModel = new Katrid.Services.ModelService('ui.action.report.category');
                            let res = await catModel.call('admin_get_groups', { category_id: node.data.id });
                            const selGroups = await katrid.admin.GroupsPermissionWidget.showDialog(res);
                            if (selGroups) {
                                res = await catModel.call('admin_set_groups', { category_id: node.data.id, groups: selGroups });
                            }
                        });
                        menu.show(evt.clientX, evt.clientY);
                    };
                    const repCtxMenu = (node, evt) => {
                        if (!Katrid.webApp.userInfo.superuser)
                            return;
                        const menu = new katrid.ui.ContextMenu();
                        menu.add(katrid.i18n.gettext('Permissions'), async () => {
                            const repMdel = new Katrid.Services.ModelService('ui.action.report');
                            let res = await repMdel.call('admin_get_groups', { action_id: node.data.id });
                            const selGroups = await katrid.admin.GroupsPermissionWidget.showDialog(res);
                            if (selGroups) {
                                res = await repMdel.call('admin_set_groups', { action_id: node.data.id, groups: selGroups });
                            }
                        });
                        menu.show(evt.clientX, evt.clientY);
                    };
                    const repClick = (node) => {
                        node.data.onclick();
                    };
                    for (const id of Object.keys(categories).sort((a, b) => a.localeCompare(b))) {
                        let catNode;
                        for (const item of categories[id]) {
                            if (!catNode) {
                                catNode = treeView.addItem(item.category, null, { onContextMenu: catCtxMenu });
                                catNode.data = { id: item.category_id, name: item.category };
                            }
                            treeView.addItem({ text: item.name, icon: 'fa-regular fa-file' }, catNode, { onContextMenu: repCtxMenu, onSelect: repClick }).data = item;
                        }
                    }
                }
            }
            createParamsPanel(params) {
                const title = document.createElement('div');
                title.className = 'col-12 px-3';
                title.innerHTML = `<h4 class="text-muted mb-0">${this.metadata.name}</div>`;
                this.container.appendChild(title);
                this.params = Object.values(params).map(p => new Katrid.Reports.Param(p));
                Katrid.Reports.createParamsPanel(this.container, this.params);
                const div = document.createElement('div');
                div.className = 'col-12 text-end toolbar-action-buttons px-3';
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.title = Katrid.i18n.gettext('Print');
                btn.innerHTML = '<i class="fas fa-print"></i>';
                btn.addEventListener('click', () => this.print());
                this.btnPrint = btn;
                btn.style.display = 'none';
                div.append(btn);
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.title = 'Export to Excel';
                btn.innerHTML = '<i class="fas fa-download"></i>';
                btn.addEventListener('click', () => this.exportToExcel());
                this.btnExport = btn;
                btn.style.display = 'none';
                div.append(btn);
                btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary';
                btn.innerText = Katrid.i18n.gettext('Apply');
                div.append(btn);
                btn.addEventListener('click', () => this.applyParams());
                this.container.append(div);
            }
            async applyParams() {
                if (this.queryView) {
                    this.queryView.destroy();
                }
                const params = this.params.map(p => p.dump());
                const res = await this.query.execute({ params });
                if (res.data && res.fields) {
                    const qv = this.createQueryView(res.fields, res.data);
                    qv.searchViewVisible = false;
                    qv.ready();
                    $(this.btnPrint).show();
                }
                else if (res.filename && res.content) {
                    const a = document.createElement('a');
                    const blob = new Blob([res.content], { type: 'text/json' });
                    a.href = URL.createObjectURL(blob);
                    a.download = res.filename;
                    a.click();
                    a.remove();
                }
            }
            async print() {
                this.queryView.reportTemplate = this.metadata?.template?.reportTemplate;
                this.queryView.print();
            }
            createQueryView(fields, data, reportType = 'grid') {
                let queryView = new BI.QueryView({ fields });
                queryView.metadata = this.metadata;
                queryView.data = data;
                queryView.container = this.container;
                this.queryView = queryView;
                return queryView;
            }
        }
        BI.QueryViewer = QueryViewer;
        Katrid.define('query-viewer', QueryViewerElement);
    })(BI = Katrid.BI || (Katrid.BI = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var bi;
    (function (bi) {
        bi.QueryViewer = Katrid.BI.QueryViewer;
    })(bi = katrid.bi || (katrid.bi = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class ChatDialog {
            constructor(config) {
                this.title = config?.title ?? 'Chat';
                this.create();
            }
            create() {
                this.render();
                document.body.appendChild(this.el);
            }
            render() {
                let el = document.createElement('div');
                el.className = 'chat-dialog shadow';
                el.innerHTML = `
        <div class="chat-header">
          <label>${this.title}</label>
          <button class="close-button">X</button>
        </div>
        <div class="chat-messages">
          <pre>test</pre>
        </div>
        <div class="chat-input">
          <input type="text" class="input-message form-control" placeholder="Type a message...">
        </div>
      `;
                this.el = el;
            }
        }
        ui.ChatDialog = ChatDialog;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class ChatManager {
            constructor(container) {
                this.container = container;
                if (container)
                    this.create(container);
            }
            create(container) {
                this.render();
                container.appendChild(this.el);
            }
            render() {
                this.el = document.createElement('div');
                this.el.className = 'chat-manager';
                this._chatList = this.el.appendChild(document.createElement('div'));
                this._chatList.className = 'chat-list';
                this._chatContainer = this.el.appendChild(document.createElement('div'));
                this._chatContainer.className = 'chat-container';
            }
        }
        ui.ChatManager = ChatManager;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
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
var katrid;
(function (katrid) {
    var exceptions;
    (function (exceptions) {
        class Exception extends Error {
            constructor(message) {
                super(message);
                Katrid.Forms.Dialogs.alert({ text: message, icon: 'error' });
            }
        }
        exceptions.Exception = Exception;
        class ValidationError extends Exception {
        }
        exceptions.ValidationError = ValidationError;
    })(exceptions = katrid.exceptions || (katrid.exceptions = {}));
})(katrid || (katrid = {}));
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
        document?.body?.classList.add('mobile');
    else
        document?.body?.classList.add('desktop');
    let initialized = false;
    function init() {
        if (!Katrid.Services.Service.adapter)
            Katrid.Services.Service.adapter = new Katrid.Services.FetchAdapter();
        if (!initialized) {
            initialized = true;
            for (let [tag, entry] of Object.entries(Katrid.customElementsRegistry))
                customElements.define(tag, entry.constructor, entry.options);
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
var katrid;
(function (katrid) {
    let initialized = false;
    function init() {
        if (!initialized) {
            initialized = true;
            for (let [tag, entry] of Object.entries(Katrid.customElementsRegistry))
                customElements.define(tag, entry.constructor, entry.options);
        }
    }
    katrid.init = init;
    const dataSymbol = Symbol('data');
    function data(el, key, value) {
        if (!key && value === undefined) {
            return el[dataSymbol];
        }
        if (value === undefined) {
            return el[dataSymbol]?.[key];
        }
        el[dataSymbol] ??= {};
        el[dataSymbol][key] = value;
    }
    katrid.data = data;
})(katrid || (katrid = {}));
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
                this._callbacks = [];
                this._pendingPromises = [];
                this.readonly = false;
                this.$modifiedRecords = [];
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
                if (this.fields)
                    this._fields = Array.from(Object.keys(this.fields));
                this._state = null;
                this.fieldWatchers = [];
                this._pendingChanges = false;
                if (!this.action?.recordId)
                    this.recordId = null;
                this._records = [];
                this.vm = config.vm;
                this.domain = config.domain;
                this.context = config.context;
            }
            create(data) {
                return this.model.create(data, this);
            }
            registerCallback(cb) {
                this._callbacks.push(cb);
            }
            unregisterCallback(cb) {
                this._callbacks.splice(this._callbacks.indexOf(cb), 1);
            }
            get pageIndex() {
                return this._pageIndex;
            }
            set pageIndex(page) {
                this._pageIndex = page;
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
                if (data === true)
                    r = this.search({ where: this._params, page: this._page, order: this.orderBy });
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
                return this.get({ id });
            }
            async validate(record, raiseError = true) {
                return true;
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
                let fields = options.fields || this._fields;
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
                if (fields && !Array.isArray(fields))
                    fields = Object.keys(fields);
                let order = this.orderBy;
                params = {
                    count: true,
                    page,
                    where: params,
                    fields,
                    domain,
                    order,
                    limit: options.limit || this.pageLimit,
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
                console.log(res);
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
                    r.$str = s;
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
                const _id = Katrid.hash(record);
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
                let valid = this.record.$flush(true);
                if (valid !== true) {
                    valid.showError();
                    throw Error('Validation error');
                }
                for (let child of this.children)
                    if (child.changing) {
                        child.flush();
                    }
                if (await this.validate()) {
                    const data = this.record.$serialize();
                    if (data) {
                        this.uploading++;
                        return this.model.service.write([data])
                            .then((res) => {
                            this._pendingChanges = false;
                            this.state = DataSourceState.browsing;
                            if (Array.isArray(res) && (res.length === 1))
                                res = res[0];
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
                for (let child of this.children)
                    child.vm.records = [];
                if (loadDefaults) {
                    if (!kwargs)
                        kwargs = {};
                    kwargs.context = this.context;
                    let controller = new AbortController();
                    this._pendingPromises.push(controller);
                    res = await this.model.service.getDefaults(kwargs, { signal: controller.signal });
                }
                this.state = DataSourceState.inserting;
                this.record['$str'] = Katrid.i18n.gettext('(New)');
                let defaults = {};
                if (this.masterSource && this.field && this.field.defaultValue)
                    Object.assign(defaults, this.field.defaultValue);
                if (res)
                    Object.assign(defaults, res);
                for (let v of Object.values(this.fields))
                    if (v.defaultValue)
                        defaults[v.name] = v.defaultValue;
                if (this.defaultValues)
                    Object.assign(defaults, this.defaultValues);
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
            }
            get recordId() {
                return this._recordId;
            }
            set record(rec) {
                if (rec) {
                    if (!(rec instanceof Data.DataRecord) && (typeof rec === 'object')) {
                        rec = this.model.fromObject(rec, this);
                    }
                    if (this.vm) {
                        this.vm.record = rec;
                        rec = this.vm.record;
                    }
                    if (this.dataCallback)
                        this.dataCallback({ record: rec });
                    this._record = rec;
                    this.recordId = rec.id;
                    this._pendingChanges = false;
                }
                this.childrenNotification(rec);
            }
            setRecord(obj) {
                obj = this._createRecord(obj);
                return obj;
            }
            set records(recs) {
                this._records = recs;
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
                let record = this.model.newRecord(rec, this);
                record.$flush();
                this.vm.records.push(record);
                console.log('add record');
                this.records.push(record);
                return;
            }
            async expandGroup(index, row) {
                let params = {};
                if (this._params)
                    Object.assign(params, this._params);
                if (row.$params)
                    Object.assign(params, row.$params);
                if (row.$level === (this.groups.length - 1)) {
                    let res = await this.model.service.search({ params, limit: -1 });
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
                else if (res?.values)
                    this.setValues(res.values);
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
                for (let cb of this._callbacks)
                    cb(record);
            }
            async parentNotification(parentRecord) {
                this._clearTimeout();
                if (!parentRecord || (parentRecord.$state === Data.RecordState.created))
                    return;
                this.state = DataSourceState.loading;
                this.pendingTimeout = setTimeout(async () => {
                    if (parentRecord.id != null) {
                        let data = {};
                        data[this.field.info.field] = parentRecord.id;
                        await this.getFieldChoices(data);
                        let records = this.records;
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
            flush(validate = true, browsing = true) {
                if (validate)
                    this.validate();
                this.record.$flush();
                if (browsing)
                    this.state = DataSourceState.browsing;
                return this.record;
            }
            discardChanges() {
                this.record.$discard();
            }
            encodeObject(obj) {
                if (Array.isArray(obj))
                    return obj.map((v) => this.encodeObject(v));
                else if (Katrid.isObject(obj)) {
                    let r = {};
                    for (let [k, v] of Object.entries(obj))
                        if (!k.startsWith('$'))
                            r[k] = this.encodeObject(v);
                    return r;
                }
                else
                    return obj;
            }
            static encodeRecord(dataSource, rec) {
                let prepared = {};
                for (let fieldName of Object.keys(rec)) {
                    let f = dataSource.fields[fieldName];
                    prepared[fieldName] = f ? f.toJSON(rec[fieldName]) : prepared[fieldName];
                }
                return prepared;
            }
            $onFieldChange(field, newValue, record) {
                if (field.name === this._lastFieldName)
                    clearTimeout(this.pendingTimeout);
                this._lastFieldName = field.name;
                this.pendingTimeout = setTimeout(() => {
                    if (!this._fieldChanging)
                        this._fieldChanging = true;
                    try {
                        let rec = this.encode(record);
                        if (this.parent)
                            rec[this.field.info.field] = this.parent.encode(this.parent.record);
                        this.dispatchEvent('admin_on_field_change', [field.name, rec]);
                    }
                    finally {
                        this._fieldChanging = false;
                    }
                }, 10);
            }
            encode(record) {
                let res = {};
                for (let [k, v] of Object.entries(record.$data)) {
                    let f = this.model.fields[k];
                    if (!f)
                        continue;
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
                this.readonly = false;
                this.idField = 'id';
                this.nameField = '$str';
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
                    let me = this;
                    class RecordProxy extends Data.DataRecord {
                        static { this.$model = me; }
                    }
                    let fields = this.allFields || this.fields;
                    for (let [k, field] of Object.entries(fields)) {
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
                                if (!(k in this.$pristine))
                                    this.$pristine[k] = this.$data[k];
                                if (!(k in this.$transient))
                                    this.$transient[k] = this.$data[k];
                                this.$data[k] = value;
                                if ((field instanceof Katrid.Data.Field) && field.onChange && me.onFieldChange)
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
            create(data, datasource) {
                return this.newRecord(data, datasource);
            }
            newRecord(data, datasource) {
                let rec = new this.recordClass();
                rec.$state = Data.RecordState.created;
                if (data) {
                    Object.entries(data).forEach(([k, v]) => {
                        let fld = this.allFields ? this.allFields[k] : this.fields[k];
                        if (fld)
                            fld.setValue(rec, v);
                        else
                            rec[k] = v;
                    });
                }
                if (datasource?.parent?.record) {
                    rec.$parent = datasource.parent.record;
                    rec.$parentField = datasource.field?.name;
                }
                return rec;
            }
            fromObject(obj, datasource) {
                let rec = new this.recordClass(obj);
                rec.$state = Data.RecordState.unmodified;
                if (datasource?.parent) {
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
                this.$data = obj;
                if (!this.hasOwnProperty('id'))
                    this.id = obj.id;
                if (obj.record_name !== undefined)
                    this.$str = obj.record_name;
                else if (obj.$str !== undefined)
                    this.$str = obj.$str;
            }
            $flush(validate = false) {
                if (validate) {
                    let valid = this.$validate();
                    if (!valid.valid)
                        return valid;
                }
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
                if (this.$parent) {
                    if (!this.$parent.$childrenData)
                        this.$parent.$childrenData = [];
                    if (!this.$parent.$childrenData.includes(this))
                        this.$parent.$childrenData.push(this);
                }
                return true;
            }
            $validate() {
                return new Katrid.Data.Validation(this).validate();
            }
            $destroy() {
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
                    let field = model.allFields ? model.allFields[k] : model.fields[k];
                    if (field && (!(field instanceof Data.OneToManyField)) || (field instanceof Data.OneToManyField && v && v.$valid)) {
                        if (v && v.$valid)
                            v.$valid = undefined;
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
var katrid;
(function (katrid) {
    var sql;
    (function (sql) {
        async function exec(query, params) {
            let res = await Katrid.Services.Service.$post('/sql/exec/', { query, params, withDescription: true, asDict: true });
            return res;
        }
        sql.exec = exec;
    })(sql = katrid.sql || (katrid.sql = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class Validation {
            constructor(record) {
                this.record = record;
                this.valid = true;
                this.model = record.constructor['$model'];
            }
            validate() {
                this.validations = [];
                for (let f of Object.values(this.model.fields)) {
                    let msgs = f.validate(this.record[f.name]);
                    if (msgs.length) {
                        this.validations.push({ field: f, msgs });
                    }
                }
                this.valid = this.validations.length === 0;
                return this;
            }
            showError() {
                let templ = '';
                for (let v of this.validations)
                    templ += `<ul><li>${v.field.caption}<ul>${v.msgs.map(msg => `<li>${msg}</li>`).join('')}</ul></li></ul>`;
                Katrid.Forms.Dialogs.Alerts.error(templ);
            }
        }
        Data.Validation = Validation;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class Field {
            constructor(info) {
                this._loaded = false;
                this.attrs = {};
                this.tag = 'input';
                this.widgetHelp = '';
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
                this.defaultValue = info.defaultValue;
                this.create();
                this.loadInfo(info);
            }
            create() {
                this.visible = true;
                this.emptyText = '';
                this.cols = 6;
                this.readonly = false;
                this.defaultSearchLookup = '__icontains';
            }
            setChoices(choices) {
                if (Array.isArray(choices)) {
                    this.displayChoices = Katrid.dict(choices);
                    this.choices = choices;
                }
                else {
                    this.displayChoices = choices;
                    this.choices = Object.entries(choices).map(([k, v]) => [k, v]);
                }
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
                if (info.vMaxLength)
                    this.vMaxLength = info.vMaxLength;
                if (info.vMinLength)
                    this.vMinLength = info.vMinLength;
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
            formLabel(fieldEl) {
                let nolabel = this.attrs.nolabel;
                if (fieldEl?.hasAttribute('nolabel'))
                    nolabel = true;
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
                    if (k.includes(':')) {
                        input.setAttribute(k, this.attrs[k]);
                    }
                }
                input.autocomplete = 'no';
                input.spellcheck = false;
                input.setAttribute('v-input', 'v-input');
                if (this.attrs['input-type'])
                    input.setAttribute('type', this.attrs['input-type']);
                if (this.attrs.required)
                    input.setAttribute('required', 'required');
                if (this.maxLength)
                    input.maxLength = this.maxLength;
                if (this.vMaxLength)
                    input.setAttribute(':maxlength', this.vMaxLength);
                if (this.vMinLength)
                    input.setAttribute(':minlength', this.vMinLength);
                if (this.attrs.nolabel === 'placeholder')
                    input.placeholder = this.caption;
                if (this.attrs.ngFieldChange || this.ngChange)
                    input.setAttribute('v-on:change', this.attrs.ngFieldChange || this.ngChange);
                if (this.info?.attrs) {
                    for (let [attr, v] of Object.entries(this.info.attrs))
                        input.setAttribute(attr, v.toString());
                }
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
            renderTo(fieldEl, view) {
                if (view.getViewType() === 'form')
                    this.formCreate(fieldEl, view);
            }
            formCreate(fieldEl, view) {
                let attrs = this.attrs = this.getFieldAttributes(fieldEl);
                let widget;
                let widgetType = attrs.widget || this.widget;
                let control;
                let label;
                let span;
                if (fieldEl.hasAttribute('default-value')) {
                    console.debug('Default value', this.defaultValue);
                    let value = fieldEl.getAttribute('default-value');
                    if (value)
                        this.defaultValue = value;
                }
                if (widgetType) {
                    widget = this.createWidget(widgetType);
                    if (widget.renderToForm)
                        return widget.renderToForm(fieldEl, view);
                    else if (widget.formControl)
                        control = widget.formControl(fieldEl);
                    if (widget.spanTemplate)
                        span = widget.spanTemplate(fieldEl, view);
                    if (widget.formLabel)
                        label = widget.formLabel(fieldEl);
                }
                else {
                    label = this.formLabel(fieldEl);
                    control = this.formControl(fieldEl);
                }
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
                if (attrs[':readonly']) {
                    section.setAttribute(':readonly', attrs[':readonly']);
                }
                else if (attrs.readonly) {
                    section.setAttribute('readonly', 'readonly');
                }
                else
                    section.setAttribute(':readonly', `readonlyFields?.includes('${this.name}')`);
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
                if (!span) {
                    let spanTempl = this.formSpanTemplate();
                    if (spanTempl) {
                        let span = document.createElement('div');
                        span.classList.add('form-field-readonly');
                        span.innerHTML = spanTempl;
                        section.append(span);
                    }
                }
                this.createTooltip(section);
                if (widget)
                    section = widget.afterRender(section);
                return section;
            }
            getTooltip(el) {
                return new Katrid.ui.Tooltip(el, null);
            }
            createTooltip(section) {
                if (!Katrid.settings.ui.isMobile) {
                    let title = '';
                    if (this.helpText)
                        title = this.helpText;
                    if (Katrid.webApp?.userInfo?.superuser) {
                        title += '<br>Field: ' + this.name;
                        if (this.model)
                            title += '<br>Related Model: ' + this.model;
                    }
                    if (this.widgetHelp)
                        title += '<br>Dica:<br>' + this.widgetHelp;
                    section.setAttribute('data-title', title);
                    section.setAttribute('v-ui-tooltip', `$fields.${this.name}`);
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
                th.setAttribute('v-on:click', `columnClick('${this.name}')`);
                view.tHeadRow.append(th);
            }
            formSpanTemplate() {
                if (this.hasChoices)
                    return `{{ $fields['${this.name}'].displayChoices[record.${this.name}] || '${this.emptyText}' }}`;
                if (this.attrs['input-type'] === 'password')
                    return '<span>********</span>';
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
                if (typeof value === 'string') {
                    if (value.includes(';'))
                        return value.split(';').map(s => s.trim());
                }
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
                    msgs.push(Katrid.i18n.gettext('This field cannot be empty.'));
                return msgs;
            }
            validateForm(boundField, value) {
                let msgs = [];
                if (boundField.required && (!value && value !== false && value !== 0))
                    msgs.push(Katrid.i18n.gettext('This field cannot be empty.'));
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
            formBind(el, fieldEl) {
                let boundField = new Katrid.Forms.BoundField(this, this.name, fieldEl);
                boundField.container = el;
                boundField.control = el.querySelector('.form-field');
                if (!this.boundFields)
                    this.boundFields = [];
                this.boundFields.push(boundField);
                return boundField;
            }
            formUnbind(el) {
                if (this.boundFields)
                    for (let bf of this.boundFields)
                        if (bf.container === el) {
                            this.boundFields.splice(this.boundFields.indexOf(bf), 1);
                            break;
                        }
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
var Katrid;
(function (Katrid) {
    var Data;
    (function (Data) {
        class DateField extends Data.Field {
            constructor() {
                super(...arguments);
                this.widgetHelp = '<i>Pressione H para hoje</i><br><span class="fa fa-arrow-up"></span> Amanhã<br><span class="fa fa-arrow-down"></span> Ontem';
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
            toJSON(val) {
                return val;
            }
            getParamTemplate() {
                return 'view.param.Date';
            }
            getParamValue(value) {
                if (typeof value === 'string') {
                    value = value.trim();
                    let format = Katrid.i18n.formats.shortDateFormat;
                    let re = Katrid.i18n.formats.reShortDateFormat;
                    if (value.includes('..'))
                        return value.split('..').map(v => moment(re.test(v.trim()) ? v.trim() : katrid.utils.autoCompleteDate(v.trim(), format)).format(moment.HTML5_FMT.DATE));
                    if (value.includes(';'))
                        return value.split(';').map(v => moment(re.test(v.trim()) ? v.trim() : katrid.utils.autoCompleteDate(v.trim(), format)).format(moment.HTML5_FMT.DATE));
                    if (re.test(value))
                        return moment(value, Katrid.i18n.formats.shortDateFormat).format(moment.HTML5_FMT.DATE);
                    return moment(katrid.utils.autoCompleteDate(value, format)).format(moment.HTML5_FMT.DATE);
                }
                else if (value instanceof moment)
                    return value.format(moment.HTML5_FMT.DATE);
                return value;
            }
            format(value) {
                if (Katrid.isString(value))
                    return moment(value).format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
                else if (value instanceof Date)
                    return moment(value).format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
                else if (value instanceof moment)
                    return value.format(Katrid.i18n.gettext('yyyy-mm-dd').toUpperCase());
                return '';
            }
            formControl(fieldEl) {
                let div = document.createElement(this.tag);
                div.setAttribute('v-model', 'record.' + this.name);
                div.setAttribute('date-picker', "L");
                if (this.attrs.required)
                    div.setAttribute('required', 'true');
                div.setAttribute('id', this.getControlId());
                return div;
            }
            createTooltip(section) {
                super.createTooltip(section);
                section.setAttribute(':data-tooltip', `record && record.${this.name} && $filters.dateHumanize(record.${this.name})`);
            }
            listSpanTemplate() {
                return `<span v-ui-tooltip="" :data-tooltip="record && record.${this.name} && $filters.dateHumanize(record.${this.name})">${this.formSpanTemplate()}</span>`;
            }
        }
        Data.DateField = DateField;
        class DateTimeField extends DateField {
            formSpanTemplate() {
                return `{{ $filters.date(record.${this.name}, 'short') || '${this.emptyText}' }}`;
            }
            create() {
                super.create();
            }
            listSpanTemplate() {
                return `<span v-ui-tooltip="" :data-tooltip="record && record.${this.name} && $filters.dateTimeHumanize(record.${this.name})">${this.formSpanTemplate()}</span>`;
            }
            formControl(fieldEl) {
                let control = super.formControl(fieldEl);
                control.setAttribute('date-picker', "L LT");
                return control;
            }
            createTooltip(section) {
                super.createTooltip(section);
                section.setAttribute(':data-tooltip', `record && record.${this.name} && $filters.dateTimeHumanize(record.${this.name})`);
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
                    { name: '%', label: Katrid.i18n.gettext('Contains'), },
                    { name: '!%', label: Katrid.i18n.gettext('Not contains') },
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
                this.widgetHelp = '<i>Pressione <strong>=</strong> para iniciar a calculadora</i>';
            }
            create() {
                super.create();
                this.decimalPlaces = 2;
                this.tag = 'input-decimal';
            }
            setValue(record, value) {
                if (value == null)
                    record[this.name] = null;
                else
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
                return `{{ ((record.${this.name} != null) && $filters.toFixed(record.${this.name}, {minimumFractionDigits: 2, maximunFractionDigits: ${this.decimalPlaces}})) || '${this.emptyText}' }}`;
            }
            getParamValue(value) {
                if (typeof value === 'string') {
                    if (value.includes('..'))
                        return value.split('..').map(v => parseFloat(v.trim()));
                    if (value.includes(';'))
                        return value.split(';').map(v => parseFloat(v.trim()));
                    return parseFloat(value);
                }
                return super.getParamValue(value);
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
            formSpanTemplate() {
                return `{{ record.${this.name} || '${this.emptyText}' }}`;
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
                return `<span class="grid-field-readonly">{{ $filters.toFixed(record.${this.name}, ${this.decimalPlaces}) }}</span>`;
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
                this.tag = 'field-foreignkey';
            }
            formControl(fieldEl) {
                let control = document.createElement(this.tag);
                control.setAttribute(':field', `$fields && $fields[${this.name}]`);
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
                    control.setAttribute('filter', this.filter);
                if (fieldEl?.hasAttribute(':filter'))
                    this.vFilter = fieldEl.getAttribute(':filter');
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
            }
            setChoices(choices) {
                this.choices = choices;
            }
            getParamTemplate() {
                return 'view.param.ForeignKey';
            }
            getParamValue(value) {
                if (Array.isArray(value))
                    return value[0];
                else if (Katrid.isObject(value))
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
                this.tag = 'input-tags';
            }
            setValue(record, value) {
                record[this.name] = value;
            }
            toJSON(val) {
                if (Array.isArray(val))
                    return val.map(obj => obj.id);
                else if (Katrid.isString(val))
                    val = val.split(',');
                return val;
            }
            loadInfo(info) {
                super.loadInfo(info);
            }
            formCreate(fieldEl) {
                let section = super.formCreate(fieldEl);
                section.classList.add('ManyToManyField');
                return section;
            }
            formSpanTemplate() {
                return `<div class="input-tags"><label class="badge badge-dark" v-for="tag in record.${this.name}">{{tag?.text}}</label></div>`;
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
                this.pasteAllowed = true;
            }
            create() {
                super.create();
                this.cols = 12;
            }
            get editor() {
                let editor = this.fieldEl.getAttribute('editor');
                if (!editor && Katrid.Forms.globalSettings.defaultGridInline)
                    editor = 'inline';
                return editor;
            }
            get field() {
                return this.info.field;
            }
            loadInfo(info) {
                super.loadInfo(info);
                if (info.views)
                    this._loaded = true;
                if (info['view-mode'])
                    this.viewMode = info['view-mode'];
            }
            async loadViews(fieldEl) {
                if (this._loaded)
                    return;
                this._loaded = true;
                let preLoadedViews = {};
                let template = this.fieldEl?.querySelector('template');
                if (template)
                    for (let child of template.content.children)
                        preLoadedViews[child.tagName.toLowerCase()] = child.cloneNode(true);
                let model = new Katrid.Services.ModelService(this.info.model);
                let viewModes = { form: null };
                viewModes[this.viewMode] = null;
                let res = await model.loadViews({ views: viewModes });
                this.views = res.views;
                this.fields = res.fields;
                Object.values(res.views).forEach((viewInfo) => {
                    let relField = viewInfo.info.fields[this.info.field];
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
                if (el.hasAttribute('allow-paste'))
                    this.pasteAllowed = true;
                if (el.hasAttribute('view-mode'))
                    this.viewMode = el.getAttribute('view-mode');
            }
            setValue(record, value, datasource) {
                if (!datasource)
                    return;
                let child = datasource.childByName(this.name);
                if (value && value instanceof Array) {
                    value.map(obj => {
                        if ((obj.action === 'CLEAR') && (record[this.name])) {
                            for (let rec of record[this.name])
                                rec.$destroy();
                            record[this.name] = [];
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
                let tag = 'onetomany-field';
                let grid = document.createElement(tag);
                grid.setAttribute('name', this.name);
                grid.setAttribute('v-model', 'record.' + this.name);
                if (this.attrs['v-on:change'])
                    grid.setAttribute('v-on:change', this.attrs['v-on:change']);
                return grid;
            }
            createTooltip(section) {
            }
            getView(mode = 'list') {
                if (this.views) {
                    let info = this.views[mode];
                    let template = info.content || info.info.template;
                    let view = new Katrid.Forms.Views.registry[mode]({
                        name: this.model, viewInfo: info, template,
                    });
                    view.model.allFields = this.fields;
                    return view;
                }
                else {
                    if (mode === 'list') {
                        let table = new Katrid.Forms.TableView({
                            model: new Katrid.Data.Model({ name: this.model, fields: this.info.views.list.fields }),
                        });
                        table.model.allFields = this.info.fields;
                        table.allowGrouping = false;
                        return table;
                    }
                    else if (mode === 'form') {
                        let info = this.info.views.form || this.info.views.list;
                        let form = new Katrid.Forms.FormView({ model: new Katrid.Data.Model({ name: this.model, fields: info.fields }) });
                        form.model.allFields = this.info.fields;
                        return form;
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
    var Data;
    (function (Data) {
        class RecordField extends Data.Field {
        }
        Data.RecordField = RecordField;
        Katrid.Data.Fields.registry.RecordField = RecordField;
    })(Data = Katrid.Data || (Katrid.Data = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var db;
    (function (db_1) {
        class ClientDatabase {
            constructor(config) {
                this.config = config;
                this.name = config.name;
                this.version = config.version;
                this.tables = config.tables;
            }
            table(tableName) {
                return new ClientTable({ name: tableName, db: this });
            }
            open() {
                return new Promise((resolve, reject) => {
                    let req = indexedDB.open(this.name, this.version);
                    req.onerror = reject;
                    req.onsuccess = () => {
                        this.db = req.result;
                        resolve(this.db);
                    };
                    if (this.config.onupgradeneeded)
                        req.onupgradeneeded = this.config.onupgradeneeded;
                    else
                        req.onupgradeneeded = evt => {
                            console.log('upgrade neeed');
                            const db = evt.target.result;
                            if (this.tables) {
                                for (let t of this.tables.filter(s => !db.objectStoreNames.contains(s)))
                                    if (typeof t === 'string')
                                        db.createObjectStore(t, { keyPath: 'id' });
                                    else
                                        db.createObjectStore(t.name, t.options);
                            }
                        };
                });
            }
            transaction(tables, mode = 'readwrite') {
                return this.db.transaction(tables, mode);
            }
        }
        db_1.ClientDatabase = ClientDatabase;
        class ClientTable {
            constructor(config) {
                this.db = config.db;
                this.name = config.name;
            }
            all(query) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.name], 'readonly');
                    const store = tx.objectStore(this.name);
                    const req = store.getAll(query);
                    req.onsuccess = evt => resolve(req.result);
                    req.onerror = evt => reject(tx.error);
                });
            }
            delete(key) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.name], 'readwrite');
                    const store = tx.objectStore(this.name);
                    const req = store.delete(key);
                    req.onsuccess = evt => resolve(req.result);
                    req.onerror = evt => reject(tx.error);
                });
            }
            clear() {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.name], 'readwrite');
                    const store = tx.objectStore(this.name);
                    const req = store.clear();
                    req.onsuccess = evt => resolve(req.result);
                    req.onerror = evt => reject(tx.error);
                });
            }
            get(key) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.name], 'readonly');
                    const store = tx.objectStore(this.name);
                    const req = store.get(key);
                    req.onsuccess = evt => resolve(req.result);
                    req.onerror = evt => reject(tx.error);
                });
            }
            put(item, key) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction([this.name], 'readwrite');
                    const store = tx.objectStore(this.name);
                    let req;
                    if (key != null)
                        req = store.put(item);
                    else
                        req = store.put(item, key);
                    req.onsuccess = evt => resolve(req.result);
                    req.onerror = evt => reject(tx.error);
                });
            }
        }
        db_1.ClientTable = ClientTable;
    })(db = katrid.db || (katrid.db = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        function createDialogElement(config) {
            let dialog = document.createElement('div');
            let div = document.createElement('div');
            let content = document.createElement('div');
            div.className = 'modal';
            content.className = 'modal-dialog modal-xl modal-fullscreen-md-down';
            dialog.className = 'modal-content';
            div.appendChild(content);
            content.append(dialog);
            if (config.header !== false) {
                const header = document.createElement('div');
                header.className = 'modal-header';
                if (typeof config.header === 'string')
                    header.innerHTML = `<h5 class="modal-title">${config.header}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>`;
                dialog.appendChild(header);
            }
            const body = document.createElement('div');
            body.className = 'modal-body';
            dialog.appendChild(body);
            if (config.footer !== false) {
                const footer = document.createElement('div');
                footer.className = 'modal-footer';
                if (typeof config.footer === 'string')
                    footer.innerHTML = config.footer;
                dialog.appendChild(footer);
            }
            return div;
        }
        function confirm(config) {
            return new Promise(resolve => {
                let dialog = createDialogElement({ header: config.title, autoDestroy: true });
                let footer = dialog.querySelector('.modal-footer');
                let btn = document.createElement('button');
                btn.innerText = Katrid.i18n.gettext('OK');
                btn.classList.add('btn', 'btn-secondary');
                btn.type = 'button';
                btn.addEventListener('click', () => {
                    modal.hide();
                    resolve(true);
                });
                footer.appendChild(btn);
                btn = document.createElement('button');
                btn.innerText = Katrid.i18n.gettext('Cancel');
                btn.type = 'button';
                btn.classList.add('btn', 'btn-secondary', 'ms-1');
                btn.addEventListener('click', () => {
                    modal.hide();
                    resolve(false);
                });
                footer.appendChild(btn);
                if (config.dom)
                    dialog.querySelector('.modal-body').appendChild(config.dom);
                document.body.appendChild(dialog);
                dialog.addEventListener('hidden.bs.modal', evt => {
                    dialog.remove();
                    modal.dispose();
                });
                let modal = new bootstrap.Modal(dialog);
                modal.show();
            });
        }
        ui.confirm = confirm;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
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
            static { this.instances = []; }
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
                document.addEventListener('pointerdown', this._eventHook, { once: true });
                document.addEventListener('wheel', this._eventHook);
                document.addEventListener('keydown', this._eventKeyDownHook);
                document.body.append(this.el);
                let virtualElement = {
                    getBoundingClientRect() {
                        return {
                            width: 0,
                            height: 0,
                            left: x,
                            top: y,
                            right: x,
                            bottom: y,
                        };
                    }
                };
                let _popper = Popper.createPopper(virtualElement, this.el, { placement: 'auto-start' });
                this.el.classList.add('show');
                ContextMenu.instances.push(this);
            }
            close() {
                document.removeEventListener('mousedown', this._eventHook);
                document.removeEventListener('wheel', this._eventHook);
                document.removeEventListener('keydown', this._eventKeyDownHook);
                this.el.remove();
                this._eventHook = null;
                let i = ContextMenu.instances.indexOf(this);
                if (i > -1) {
                    ContextMenu.instances.splice(i, 1);
                }
            }
            get visible() {
                return this._visible;
            }
            static closeAll() {
                for (let m of Array.from(this.instances))
                    m.close();
            }
        }
        Forms.ContextMenu = ContextMenu;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        ui.ContextMenu = Katrid.Forms.ContextMenu;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        let customTagRegistry = {};
        class CustomTag {
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
            constructor(view, template) {
                this.view = view;
                let elements = template.querySelectorAll(this.selector());
                if (elements.length)
                    this.prepare(elements, template);
            }
            prepare(elements, template) {
            }
            assign(source, dest) {
                dest.innerHTML = source.innerHTML;
                for (let attr of source.attributes)
                    dest.setAttribute(attr.name, attr.value);
            }
        }
        Forms.CustomTag = CustomTag;
        class ActionsTag extends CustomTag {
            prepare(elements, template) {
                let atts = template.querySelector('.toolbar-action-buttons');
                for (let actions of elements.values()) {
                    if (!this.view.toolbarVisible) {
                        actions.remove();
                        continue;
                    }
                    let actionsButton;
                    let name = actions.getAttribute('name');
                    let btn;
                    if (name)
                        btn = template.querySelector(`.btn-actions[name=${name}]`);
                    let dropdownMenu;
                    if (btn) {
                        actionsButton = btn.parentElement;
                    }
                    else {
                        actionsButton = document.createElement('div');
                        actionsButton.classList.add('btn-group');
                        actionsButton.innerHTML = '<div class="dropdown"><button type="button" class="btn btn-secondary dropdown-toggle btn-actions" data-bs-toggle="dropdown"></button><div class="dropdown-menu custom-actions"></div></div>';
                        btn = actionsButton.querySelector('button');
                        if (name)
                            btn.setAttribute('name', name);
                        let caption = actions.getAttribute('caption');
                        if (caption)
                            btn.innerHTML = caption + ' ';
                        atts.append(actionsButton);
                    }
                    dropdownMenu = actionsButton.querySelector('.dropdown-menu');
                    let vShow = actions.getAttribute('v-show');
                    if (vShow)
                        actionsButton.setAttribute('v-show', vShow);
                    let vIf = actions.getAttribute('v-if');
                    if (vIf)
                        actionsButton.setAttribute('v-if', vIf);
                    for (let action of actions.querySelectorAll('action')) {
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
                el.classList.add('dropdown-item');
                this.assign(action, el);
                if (el.hasAttribute('data-action'))
                    el.setAttribute('v-on:click', `action.onActionLink('${action.getAttribute('data-action')}', '${action.getAttribute('data-action-type')}', null, $event)`);
                else if ((el.getAttribute('type') === 'object') && (el.hasAttribute('name'))) {
                    el.setAttribute('v-on:click', `action.formButtonClick(record.id, '${el.getAttribute('name')}')`);
                }
                else if ((el.getAttribute('type') === 'object') && (el.hasAttribute('name'))) {
                    el.setAttribute('v-on:click', `formButtonClick({params: {id: record.id}, method: '${el.getAttribute('name')}'})`);
                }
                else if ((el.getAttribute('type') === 'view-action') && (el.hasAttribute('name'))) {
                    let attrs = '';
                    if (el.hasAttribute('confirm-dialog'))
                        attrs = `, confirm: \`${el.getAttribute('confirm-dialog').replaceAll('`', '\\``')}\``;
                    if (el.hasAttribute('prompt-dialog'))
                        attrs = `, prompt: \`${el.getAttribute('prompt-dialog').replaceAll('`', '\\``')}\``;
                    el.setAttribute('v-on:click', `callAdminViewAction({action: '${el.getAttribute('name')}'${attrs}})`);
                }
                else if ((el.getAttribute('type') === 'sub-action') && el.hasAttribute('name')) {
                    el.setAttribute('v-on:click', `callSubAction('${el.getAttribute('name')}')`);
                }
                if (action.hasAttribute('name'))
                    el.setAttribute('name', action.getAttribute('name'));
                if (action.hasAttribute('id'))
                    el.setAttribute('id', action.id);
                if (action.hasAttribute('caption'))
                    el.innerHTML = action.getAttribute('caption');
                if (action.hasAttribute('binding-params'))
                    el.setAttribute('data-binding-params', action.getAttribute('binding-params'));
                return el;
            }
        }
        Forms.ActionsTag = ActionsTag;
        function registerCustomTag(selector, customTag) {
            customTagRegistry[selector] = customTag;
        }
        Forms.registerCustomTag = registerCustomTag;
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
                    return Katrid.UI.Toast.success({ message: msg });
                }
                static warning(msg) {
                    return Katrid.UI.Toast.warning({ message: msg });
                }
                static warn(msg) {
                    return Katrid.UI.Toast.warning({ message: msg });
                }
                static info(msg) {
                    return Katrid.UI.Toast.info({ message: msg });
                }
                static error(msg) {
                    return Katrid.UI.Toast.danger({ message: msg });
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
        <button type="button" name="btn-cancel" class="btn btn-secondary" data-bs-dismiss="modal">${Katrid.i18n.gettext('Close')}</button>
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
                return Katrid.UI.Toast.danger({ message: message.text });
                return window.alert(message);
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
      </div>
      <div class="modal-footer">
      ${buttonsTempl}
      </div>
    </div>
  </div>`;
                if (content instanceof HTMLElement)
                    modal.querySelector('.modal-body').appendChild(content);
                else if (typeof content === 'string')
                    modal.querySelector('.modal-body').innerHTML = content || '';
                return modal;
            }
            Dialogs.createModal = createModal;
            function createDialog(title, content, buttons) {
                const dlg = createModal(title, content, buttons);
                const modal = new bootstrap.Modal(dlg);
                dlg.addEventListener('hidden.bs.modal', evt => {
                    dlg.remove();
                    modal.dispose();
                });
                return modal;
            }
            Dialogs.createDialog = createDialog;
            function getButtonFromName(buttonName) {
                let button = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">`;
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
        class BoundField {
            constructor(field, name, fieldEl) {
                this.field = field;
                this.name = name;
                this.fieldEl = fieldEl;
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
            get required() {
                if (this.container.hasAttribute('required')) {
                    let req = this.container.getAttribute('req');
                    return (req === '') || (req === 'true') || (req === 'null');
                }
                return this.field.required;
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
                el.classList.add('v-data-form');
                let form = el.$form = new DataForm(el);
            }
        });
        Katrid.directive('form-field', {
            mounted(el, binding, vnode) {
                let input;
                if (el.tagName === 'INPUT')
                    input = el;
                else
                    input = el.querySelector('input');
                if (input?.tagName === 'INPUT')
                    input.addEventListener('mouseup', () => {
                        input.select();
                    });
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
                this.fields = info.fields;
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
        function tableContextMenu(event, config) {
            event.preventDefault();
            event.stopPropagation();
            let menu = new Forms.ContextMenu();
            menu.add(`<i class="fa fa-fw fa-copy"></i> ${katrid.i18n.gettext('Copy')}`, (...args) => copyClick(event.target.closest('table')));
            if (config?.pasteAllowed)
                menu.add(`<i class="fa fa-fw fa-paste"></i> ${katrid.i18n.gettext('Paste')}`, (...args) => pasteClick(this));
            menu.show(event.pageX, event.pageY);
        }
        Forms.tableContextMenu = tableContextMenu;
        function listRecordContextMenu(record, index, event) {
            let td = event.target;
            if (td.tagName !== 'TD')
                td = $(td).closest('td')[0];
            if (td?.tagName !== 'TD')
                return;
            event.preventDefault();
            event.stopPropagation();
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
                menu.add(`<i class="fa fa-fw fa-paste"></i> ${katrid.i18n.gettext('Paste')}`, (...args) => pasteClick(this));
            if (td && (td.tagName === 'TD')) {
                menu.addSeparator();
                menu.add('<i class="fa fa-fw fa-filter"></i> Filtrar pelo conteúdo deste campo', () => filterByFieldContent.call(this, td, record));
                menu.add('<i class="fa fa-fw fa-paper"></i> Transformar em relatório', () => filterByFieldContent.call(this, td, record));
            }
            if (record) {
                menu.addSeparator();
                menu.add('<i class="fa fa-fw fa-trash"></i> Excluir', () => this.deleteSelection());
            }
            menu.show(event.pageX, event.pageY, td);
        }
        Forms.listRecordContextMenu = listRecordContextMenu;
        function copyClick(table) {
            navigator.clipboard.writeText(Katrid.UI.Utils.tableToText(table));
        }
        async function pasteClick(vm) {
            let yes = Katrid.i18n.gettext('Yes').toLowerCase();
            let no = Katrid.i18n.gettext('No').toLowerCase();
            let text = await navigator.clipboard.readText();
            let sep = '\t';
            if (!text.includes(sep))
                sep = ';';
            let n = 0;
            let fkCache = {};
            for (let line of text.split('\n')) {
                if (n > 0) {
                    if (line.trim()) {
                        let record = {};
                        let c = -1;
                        for (let s of line.split(sep)) {
                            c++;
                            s = s.trim();
                            if (!s)
                                continue;
                            let field = vm.$view.$columns[c];
                            if (field) {
                                if (field instanceof Katrid.Data.ForeignKey) {
                                    if (!fkCache[field.name])
                                        fkCache[field.name] = {};
                                    let fkValues = fkCache[field.name];
                                    if (!fkValues[s]) {
                                        let res = await vm.$view.model.service.getFieldChoice({
                                            field: field.name,
                                            term: s,
                                            kwargs: { exact: true }
                                        });
                                        if (res.items?.length)
                                            fkValues[s] = res.items[0];
                                    }
                                    record[field.name] = fkValues[s];
                                }
                                else if (field instanceof Katrid.Data.DateField) {
                                    if (/\d{4}-\d{2}-\d{2}/.test(s))
                                        record[field.name] = /\d{2}\/\d{2}\/d{4}/.test(s) ? new Date(s) : null;
                                    else {
                                        let v = katrid.utils.autoCompleteDate(s, katrid.i18n.formats.shortDateFormat);
                                        record[field.name] = v;
                                    }
                                }
                                else if (field instanceof Katrid.Data.NumericField) {
                                    if (s.includes(Katrid.i18n.formats.DECIMAL_SEPARATOR))
                                        s = s.replace(Katrid.i18n.formats.DECIMAL_SEPARATOR, '.');
                                    record[field.name] = parseFloat(s);
                                }
                                else if (field instanceof Katrid.Data.BooleanField) {
                                    s = s.trim().toLowerCase();
                                    if (s) {
                                        if (s.length === 1)
                                            record[field.name] = s === yes[0];
                                        else if (s === '0')
                                            record[field.name] = false;
                                        else if (s === '1')
                                            record[field.name] = true;
                                        else
                                            record[field.name] = s === yes;
                                    }
                                }
                                else
                                    record[field.name] = s;
                            }
                        }
                        vm.$addRecord(record);
                    }
                }
                n++;
            }
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
            this.selection = [];
            this.selectionLength = 0;
            this.$onChange();
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
    var Reports;
    (function (Reports) {
        let _counter = 0;
        class Params {
            static { this.Operations = {
                exact: 'exact',
                in: 'in',
                contains: 'contains',
                startswith: 'startswith',
                endswith: 'endswith',
                gt: 'gt',
                lt: 'lt',
                between: 'between',
                isnull: 'isnull'
            }; }
            static { this.Labels = null; }
            static { this.DefaultOperations = {
                CharField: Params.Operations.exact,
                IntegerField: Params.Operations.exact,
                DateTimeField: Params.Operations.between,
                DateField: Params.Operations.between,
                FloatField: Params.Operations.between,
                DecimalField: Params.Operations.between,
                ForeignKey: Params.Operations.exact,
                ModelChoices: Params.Operations.exact,
                SelectionField: Params.Operations.exact,
            }; }
            static { this.TypeOperations = {
                CharField: [Params.Operations.exact, Params.Operations.in, Params.Operations.contains, Params.Operations.startswith, Params.Operations.endswith, Params.Operations.isnull],
                IntegerField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
                FloatField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
                DecimalField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
                DateTimeField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
                DateField: [Params.Operations.exact, Params.Operations.in, Params.Operations.gt, Params.Operations.lt, Params.Operations.between, Params.Operations.isnull],
                ForeignKey: [Params.Operations.exact, Params.Operations.in, Params.Operations.isnull],
                ModelChoices: [Params.Operations.exact, Params.Operations.in, Params.Operations.isnull],
                SelectionField: [Params.Operations.exact, Params.Operations.isnull],
            }; }
            static { this.Widgets = {
                CharField(param) {
                    return `<div><input id="rep-param-id-${param.id}" v-model="param.value1" type="text" class="form-control"></div>`;
                },
                IntegerField(param) {
                    let field2 = '';
                    if (param.operation === 'between') {
                        field2 = `<div class="col-sm-6"><input id="rep-param-id-${param.id}-2" v-model="param.value2" type="number" class="form-control"></div>`;
                    }
                    return `<div class="row"><div class="col-sm-6"><input id="rep-param-id-${param.id}" type="number" v-model="param.value1" class="form-control"></div>${field2}</div>`;
                },
                DecimalField(param) {
                    let field2 = '';
                    if (param.operation === 'between') {
                        field2 = `<div class="col-6"><input id="rep-param-id-${param.id}-2" v-model="param.value2" input-decimal class="form-control"></div>`;
                    }
                    return `<div class="col-sm-12 row"><div class="col-6"><input id="rep-param-id-${param.id}" input-decimal v-model="param.value1" class="form-control"></div>${field2}</div>`;
                },
                DateTimeField(param) {
                    let field2 = '';
                    if (param.operation === 'between') {
                        field2 = `<div class="col-6"><input id="rep-param-id-${param.id}-2" type="text" date-picker="L" v-model="param.value2" class="form-control"></div>`;
                    }
                    return `<div class="col-sm-12 row"><div class="col-6"><input id="rep-param-id-${param.id}" type="text" date-picker="L" v-model="param.value1" class="form-control"></div>${field2}</div>`;
                },
                DateField(param) {
                    let field2 = '';
                    if (param.operation === 'between') {
                        field2 = `<div class="col-6">
<input-date class="input-group date" v-model="param.value2" date-picker="L">
<input id="rep-param-id-${param.id}-2" type="text" class="form-control form-field" inputmode="numeric" autocomplete="off">
      <label class="input-group-text btn-calendar"><i class="fa fa-calendar fa-sm"></i></label>
</input-date>
</div>`;
                    }
                    return `<div class="col-sm-12 row"><div class="col-6">
<input-date class="input-group date" v-model="param.value1" date-picker="L">
<input id="rep-param-id-${param.id}" type="text" class="form-control" inputmode="numeric" autocomplete="off">
      <label class="input-group-text btn-calendar"><i class="fa fa-calendar fa-sm"></i></label>
</input-date>
</div>${field2}</div>`;
                },
                ForeignKey(param) {
                    const serviceName = param.info.field.attr('model') || param.params.model;
                    let multiple = '';
                    if (param.operation === 'in') {
                        multiple = 'multiple';
                    }
                    let filter = param.info.filter ? ` filter='${JSON.stringify(param.info.filter)}'` : '';
                    return `<div><input-ajax-choices id="rep-param-id-${param.id}" ajax-choices="${serviceName}" field-name="${param.name}" v-model="param.value1" ${filter} ${multiple}></div>`;
                },
                ModelChoices(param) {
                    let multiple = '';
                    if (param.operation === 'in') {
                        multiple = 'multiple';
                    }
                    let filter = param.info.filter ? ` filter='${JSON.stringify(param.info.filter)}'` : '';
                    return `<div><input-ajax-choices id="rep-param-id-${param.id}" ajax-choices="ui.action.report" model-choices="${param.info.modelChoices}" ${filter} v-model="param.value1" ${multiple}></div>`;
                },
                SelectionField(param) {
                    let multiple = '';
                    let tag = 'select';
                    if (param.operation === 'in') {
                        tag = 'multiple-tags';
                        multiple = 'multiple="multiple" class="multiple-tags"';
                    }
                    else
                        multiple = 'class="form-select"';
                    return `<div><${tag} ${multiple} v-model="param.value1"><option :value="value" v-for="(name, value, index) in param.choices">{{name}}</option></${tag}></div>`;
                }
            }; }
        }
        Reports.Params = Params;
        Params.Widgets.StringField = Params.Widgets.CharField;
        class Param {
            constructor(info, params) {
                this.info = info;
                this.choices = info.choices;
                this.name = this.info.name;
                this.params = params;
                if (params?.info?.fields)
                    this.field = this.params.info.fields[this.name];
                this.label = this.info.label || this.params.info.caption;
                this.static = this.info.param === 'static';
                this.type = this.info.type || (this.field && this.field.type) || 'CharField';
                this.defaultOperation = this.info.operation || Params.DefaultOperations[this.type];
                this.operation = this.defaultOperation;
                if (info.options)
                    this.choices = info.options;
                this.exclude = this.info.exclude;
                this.id = ++_counter;
                this.defaultValue = info.defaultValue;
                if (info.defaultValue)
                    try {
                        this.value1 = eval(info.defaultValue);
                    }
                    catch {
                        console.error('Error evaluating default expression for param:', this.name);
                    }
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
                let type = this.type;
                if (this.choices) {
                    type = 'SelectionField';
                }
                let widget = Params.Widgets[type](this);
                widget = $(widget);
                return el.append(widget);
            }
            getOperations() {
                if (Params.TypeOperations[this.type])
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
                return container.append(this.el[0]);
            }
            dump() {
                return {
                    name: this.name,
                    op: this.operation,
                    value1: this.value1,
                    value2: this.value2,
                    type: this.type,
                };
            }
        }
        Reports.Param = Param;
        function createParamsPanel(container, params) {
            const el = $(`<div class="params-params row">
<div v-for="param in params" class="col-lg-6 form-group">
          <div class="col-12">
            <label class="control-label">{{ param.label }}</label>
          </div>
          <div class="col-4" v-if="param.operationsVisible">
            <select v-model="param.operation" class="form-control" v-on:change="param.setOperation(param.operation)">
              <option v-for="op in param.operations" :value="op.id">{{ op.text }}</option>
            </select>
          </div>
          <div class="col param-widget">
          <report-param-widget :param="param"/>
</div>
        </div>
</div>`)[0];
            const vm = Katrid.createVm({
                data() {
                    return {
                        params
                    };
                }
            });
            vm.mount(el);
            if (container)
                container.append(el);
            return vm;
        }
        Reports.createParamsPanel = createParamsPanel;
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
                let info = [];
                for (let p of this.params) {
                    let paramInfo = {};
                    let val1, val2;
                    val1 = p.value1;
                    val2 = p.value2;
                    if (val1 === '')
                        val1 = null;
                    if (val2 === '')
                        val2 = null;
                    if (val1 === null)
                        continue;
                    if (val1 && val2)
                        info.push(`${p.label}: [${val1}, ${val2}]`);
                    else if (val1)
                        info.push(`${p.label}: ${val1}`);
                    params.data.push({
                        name: p.name,
                        op: p.operation,
                        value1: val1,
                        value2: val2,
                        type: p.type
                    });
                }
                params.displayParams = info.join('\n');
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
                    const defaultValue = f.getAttribute('default');
                    const filter = f.getAttribute('filter');
                    let type = f.getAttribute('type') || $(f).data('type') || (fld && fld.type);
                    if (type in dataTypeDict)
                        type = dataTypeDict[type];
                    let choices = {};
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
                        defaultValue,
                        filter,
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
                if (this.action.fields)
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
                let elParams = this.container.querySelector('#params-params');
                for (let p of this.fields)
                    if (p.name === paramName) {
                        let param = new Reports.Param(p, this);
                        this.params.push(param);
                        break;
                    }
            }
            createParams(container) {
                for (let info of this.fields) {
                    const p = new Reports.Param(info, this);
                    this.params.push(p);
                }
            }
            getValues() { }
            async export(format) {
                if (format == null)
                    format = localStorage.katridReportViewer || 'pdf';
                const params = this.getUserParams();
                const svc = new Katrid.Services.ModelService('ui.action.report');
                let res = await svc.post('export_report', { args: [this.info.id], kwargs: { format, params } });
                console.debug('invoke', res.invoke);
                if (res.invoke)
                    for (let [k, v] of Object.entries(res.invoke))
                        katrid.invoke(k)(v);
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
                for (p of Array.from(this.params)) {
                    if (p.static && !loaded[p.name]) {
                        $(p.render(el));
                    }
                }
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
          <div class="toolbar toolbar-action-buttons">
            <button class="btn btn-primary" type="button" v-on:click="report.preview()"><span class="fa fa-print fa-fw"></span> ${Katrid.i18n.gettext('Preview')}</button>

            <div class="btn-group">
              <button class="btn btn-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true"
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
              <button class="btn btn-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true"
                      aria-expanded="false">${Katrid.i18n.gettext('My reports')} <span class="caret"></span></button>
              <ul class="dropdown-menu">
              </ul>
            </div>

          <div class="pull-right btn-group">
            <button class="btn btn-secondary dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true"
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
                  class="btn btn-secondary" type="button"
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
var katrid;
(function (katrid) {
    var bi;
    (function (bi) {
        class PreparedPage {
            load(metadata) {
                this.metadata = metadata;
            }
        }
        class MetaDocument {
            load(metadata) {
                this.type = metadata.type;
                this.pages = metadata.pages.map(p => {
                    let page = new PreparedPage();
                    page.load(p);
                    return page;
                });
            }
        }
        bi.MetaDocument = MetaDocument;
    })(bi = katrid.bi || (katrid.bi = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class CalendarView extends Forms.RecordCollectionView {
            static { this.viewType = 'calendar'; }
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary btn-view-list';
                btn.innerHTML = '<i class="fas fa-calendar"></i>';
                btn.setAttribute('v-on:click', `setViewMode('calendar')`);
                container.append(btn);
            }
            beforeRender(template) {
                let templ = super.beforeRender(template);
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
                let i = 0;
                for (let rec of records) {
                    i++;
                    let event = {
                        id: rec.id,
                        title: rec.$str, start: rec[this.fieldStart],
                        extendedProps: {
                            record: rec,
                            index: i,
                        },
                    };
                    if (this.fieldEnd)
                        event['end'] = rec[this.fieldEnd];
                    this._calendar.addEvent(event);
                }
            }
            renderTemplate(content) {
                let calendarEl = document.createElement('div');
                calendarEl.className = 'calendar-view';
                return calendarEl;
            }
            render() {
                let el = super.render();
                setTimeout(() => {
                    let calendarEl = this.element.querySelector('.calendar-view');
                    this._calendar = new FullCalendar.Calendar(calendarEl, {
                        initialView: 'dayGridMonth',
                        height: calendarEl.parentElement.getBoundingClientRect().height,
                        eventClick: info => {
                            console.debug(info.event.extendedProps);
                            this._recordClick(info.event.extendedProps.record, info.event.extendedProps.index);
                        },
                    });
                    this._calendar.render();
                });
                return el;
            }
        }
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
                <button type="button" class="btn btn-secondary" v-on:click="cardHideAddGroupItemDlg(group)" title="${Katrid.i18n.gettext('Discard record changes')}">${Katrid.i18n.gettext('Discard')}</button>
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
            static { this.viewType = 'card'; }
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-secondary btn-view-card';
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
            insert() {
                let rec = this.model.newRecord(null, this.datasource);
                this.vm.records.unshift(rec);
            }
        }
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
                btn.className = 'btn btn-secondary btn-view-list';
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
            static { this.viewType = 'form'; }
            constructor(info) {
                super(info);
                this.dataCallbacks = [];
                this._pendingViews = true;
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
                this._record = info?.record || {};
                this._readonly = false;
            }
            get record() {
                return this._record;
            }
            set record(value) {
                this._record = value;
                this.vm.record = value;
                for (let cb of this.dataCallbacks)
                    cb(this.vm.record);
                if (this.element)
                    this.element.dispatchEvent(new CustomEvent('record-changed', { detail: { record: this.vm.record } }));
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
            renderField(fld, fieldEl) {
                let name = fld.name;
                if (name) {
                    let fld = this.fields[name];
                    if (fld) {
                        if (fieldEl.hasAttribute('v-sum'))
                            this.addSumHook(fld, fieldEl);
                        if (!fieldEl.hasAttribute('invisible'))
                            return fld.formCreate(fieldEl);
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
                this._attributes = template.attributes;
                let form = template;
                form.setAttribute('autocomplete', 'off');
                form.classList.add('row');
                for (let child of form.querySelectorAll('field')) {
                    if ((child.parentElement.tagName === 'FORM') && (child.parentElement !== form))
                        continue;
                    let name = child.getAttribute('name');
                    if (name) {
                        let fld = this.fields[name];
                        if (fld) {
                            fld.fieldEl = child;
                            if (!fld.visible || child.hasAttribute('invisible') || (child.getAttribute('visible') === 'false')) {
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
              <a class="maximize-button" role="button" title="${Katrid.i18n.gettext('Maximize')}"
                 onclick="$(this).closest('div.form-sheet').toggleClass('box-fullscreen');$(this).find('i').toggleClass('fa-compress fa-expand')">
                <i class=" fa fa-expand"></i>
              </a>
              <div class="template-placeholder">
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
                    let comments = form.querySelector('comments');
                    if (comments) {
                        comments.parentElement.removeChild(comments);
                        comments = document.createElement('user-comments');
                        comments['datasource'] = this.datasource;
                        templ.appendChild(comments);
                    }
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
          <!--p class="help-block">${this.action.config.usage || ''}&nbsp;</p-->
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
                <button id="btn-form-prior" class="btn btn-soft-secondary" type="button" @click="prior()">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <button id="btn-form-next" class="btn btn-soft-secondary" type="button" @click="next()">
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
                if (Katrid.webApp.userInfo.superuser)
                    this.createSettingsMenu(toolbar);
                return toolbar;
            }
            createElement() {
                super.createElement();
                if (this._attributes)
                    Array.from(this._attributes).map(attr => {
                        if (attr.name.startsWith('v-on:')) {
                            const fn = new Function('__ctx__', `with (__ctx__) { ${attr.value} }`);
                            this.element.addEventListener(attr.name.substring(5), () => fn(this.vm));
                        }
                    });
            }
            createToolbarButtons(container) {
                let parent = container.querySelector('.toolbar-action-buttons');
                let div = document.createElement('div');
                div.classList.add('btn-toolbar');
                console.debug('readonly', this.readonly);
                div.innerHTML = `
    <div class="btn-group btn-group-split" v-show="changing">
      <button class="btn btn-primary btn-action-save" type="button" v-bind:disabled="loadingRecord"
        v-on:click="save()" v-show="changing">
        ${Katrid.i18n.gettext('Save')}
      </button>
      <button class="btn btn-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" type="button"
        :disabled="loadingRecord">
      </button>
      <ul class="dropdown-menu">
        <li><a class="dropdown-item">${Katrid.i18n.gettext('Save as draft')}</a></li>
      </ul>
    </div>
      <button class="btn btn-primary btn-action-edit" type="button" v-bind:disabled="loadingRecord"
      v-on:click="edit()" v-show="!changing">
        ${Katrid.i18n.gettext('Edit')}
      </button>
      <button class="btn btn-soft-secondary btn-action-create" type="button" v-bind:disabled="loadingRecord"
      v-on:click="insert()" v-show="!changing">
        ${Katrid.i18n.gettext('Create')}
      </button>
      <button class="btn btn-soft-secondary btn-action-cancel" type="button" v-on:click="discard()"
      v-show="changing">
        ${Katrid.i18n.gettext('Discard')}
      </button>
    <div class="btn-group">
      <div class="dropdown">
        <button type="button" class="btn toolbtn btn-action-refresh" v-if="!changing" v-on:click="refresh()" title="${Katrid.i18n.gettext('Refresh')}">
          <i class="fa fa-fw fa-redo-alt"></i>
        </button>
        <button type="button" class="btn btn-soft-secondary dropdown-toggle btn-actions" name="actions" data-bs-toggle="dropdown"
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
                if (this.config.readonly) {
                    div.querySelector('.btn-action-create').remove();
                    div.querySelector('.btn-action-edit').remove();
                    div.querySelector('.dropdown-menu-actions').innerHTML = '';
                }
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
                    actionView: this,
                    loadingRecord: false,
                    changing: this.changing,
                    inserting: this.inserting,
                    editing: this.editing,
                    state: this._state,
                    $fields: this.fields,
                    recordIndex: this._recordIndex,
                    recordCount: this.recordCount,
                    readonlyFields: null,
                };
                this._applyDataDefinition(data);
                return data;
            }
            async ready() {
                if (this.action?.params)
                    this.onHashChange(this.action.params);
                if (Katrid.webApp.userInfo.superuser) {
                    const onCtxMenu = (event) => {
                        const target = event.target;
                        if ((target.tagName === 'SECTION') || (target.tagName === 'LABEL')) {
                            event.preventDefault();
                            const menu = new katrid.ui.ContextMenu();
                            menu.add(katrid.i18n.gettext('User Defined Value'), () => {
                                katrid.admin.UserDefinedValue.showDialog();
                            });
                            menu.show(event.clientX, event.clientY);
                        }
                    };
                    this.element.querySelectorAll('section').forEach((section) => {
                        section.addEventListener('contextmenu', onCtxMenu);
                    });
                }
            }
            async onHashChange(params) {
                let id = params.id;
                if (id)
                    this.setRecordId(id);
            }
            render() {
                super.render();
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
                setTimeout(() => {
                    this._search({ id: value });
                    if (this.action && value) {
                        let params = this.action.params;
                        let newParams = {};
                        Object.assign(newParams, params);
                        newParams.id = value;
                        let url = new URLSearchParams(newParams);
                        let newUrl = '#/app/?' + url.toString();
                        setTimeout(() => this.refresh(), 1000);
                        window.history.pushState('', '', newUrl);
                    }
                }, 100);
            }
            edit() {
                this.setState(DataSourceState.editing);
            }
            insert(defaultValues) {
                this.datasource.record = null;
                this.setState(DataSourceState.inserting);
                return this.datasource.insert(true, defaultValues).then(() => setTimeout(() => {
                    this.focus();
                }));
            }
            async save() {
                for (let child of this.nestedViews)
                    child.$flush();
                await this.datasource.save();
                this.setState(DataSourceState.browsing);
            }
            discard() {
                this.setState(DataSourceState.browsing);
                if (this._record)
                    this.vm.record = this._record;
                this.$discard();
                for (let child of this.nestedViews)
                    child.$discard();
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
                const res = await this.model.service.copy(this.record.id);
                await this.insert(res);
            }
            createComponent() {
                let comp = super.createComponent();
                let me = this;
                Object.assign(comp, {
                    data() {
                        return me.getComponentData();
                    },
                });
                Object.assign(comp.methods, {
                    edit() {
                        me.edit();
                    },
                    insert(defaultValues) {
                        console.log('insert', defaultValues);
                        me.insert(defaultValues);
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
                    confirm(msg) {
                        return confirm(msg);
                    },
                    readonly(ro, fields, exclude) {
                        if (ro) {
                            if (fields === '*') {
                                this.readonlyFields = Object.keys(me.model.fields);
                            }
                            if (this.readonlyFields?.length && exclude?.length)
                                this.readonlyFields = this.readonlyFields.filter(f => !exclude.includes(f));
                        }
                        else
                            this.readonlyFields = null;
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
                });
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
            async showDialog(options) {
                this.dialog = true;
                if (!options)
                    options = {};
                if (options.buttons)
                    this.dialogButtons = options.buttons;
                let el = this.element;
                if (!el) {
                    this.createElement();
                    await this.loadPendingViews();
                    el = this.render();
                }
                if (options?.id)
                    await this.setRecordId(options.id);
                if (options?.state != null) {
                    this.state = options.state;
                    options.backdrop = 'static';
                }
                else
                    this.state = DataSourceState.browsing;
                this.dialogPromise = new Promise(async (resolve, reject) => {
                    this._modal = new bootstrap.Modal(el, options);
                    el.addEventListener('hidden.bs.modal', () => {
                        if (!this.$result)
                            this.$discard();
                        resolve(this.$result);
                        this._modal.dispose();
                        el.remove();
                        this._modal = null;
                    });
                    this._modal.show();
                });
            }
            $onFieldChange(field, value) {
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
                let svc = new Katrid.Services.ModelService(config.model);
                let res = await svc.getViewInfo({ view_type: 'form' });
                let model = new Katrid.Data.Model({ name: config.model, fields: res.fields });
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
            async saveAndClose(commit) {
                if (commit) {
                    this.$result = await this.datasource.save();
                }
                else {
                    this.datasource.flush();
                    this.$result = this._record;
                }
                this.closeDialog();
            }
            discardAndClose() {
                this.$result = false;
                this.closeDialog();
            }
            recordClick(event, index, record) {
            }
            focus(fieldName) {
                if (!fieldName)
                    this.element.querySelector('.form-field')?.focus();
            }
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
                await Promise.all(Object.values(this.fields)
                    .filter(field => field['loadViews'])
                    .map((field) => field.loadViews()));
            }
            $discard() {
                if (this.record.$state === Katrid.Data.RecordState.created) {
                    this.record.$discard();
                    this.datasource.state = DataSourceState.browsing;
                    if (this.records && this._recordIndex) {
                        this.datasource.record = this.records[this._recordIndex];
                    }
                }
                else {
                    if (this.datasource.parent)
                        this.record.$discard();
                    else
                        this.refresh();
                }
            }
        }
        Forms.FormView = FormView;
        Katrid.Forms.Views.registry['form'] = FormView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class Widget {
            constructor(options) {
                this.options = options;
                this.options ??= {};
                this._create();
            }
            _create() {
            }
            appendTo(parent) {
                return parent.appendChild(this.el);
            }
        }
        Forms.Widget = Widget;
        class CheckBox extends Widget {
            constructor(options) {
                super(options);
                this.options = options;
                this._create();
            }
            _create() {
                let el = this.options.el;
                let label = document.createElement('label');
                this.el = label;
                let checkbox = this.options.el?.tagName === 'input' ? this.options.el : document.createElement('input');
                checkbox.type = 'checkbox';
                label.className = 'checkbox';
                label.appendChild(document.createElement('span'));
                label.appendChild(checkbox);
                let span = this._span = document.createElement('i');
                span.className = 'fas';
                if (this.options.text) {
                    span.innerText = this.options.text;
                }
                label.appendChild(span);
                if (el?.parentElement) {
                    el.parentElement.replaceChild(label, el);
                }
                return label;
            }
            set text(value) {
                this._span.innerText = value;
            }
            appendTo(parent) {
                return parent.appendChild(this.el);
            }
        }
        Forms.CheckBox = CheckBox;
        class SearchView extends Forms.ModelView {
            static { this.viewType = 'search'; }
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
                    customGroupField: null,
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
                        this.addFieldCondition();
                        this.customFilter.push(this.tempFilter);
                        this.tempFilter.selected = true;
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
                            cond.value = [null];
                        }
                        else
                            cond.$field = null;
                    },
                    conditionChange(cond) {
                        if (cond.condition === '..') {
                            if (cond.value.length > 2)
                                cond.value = [cond.value[0], cond.value[1]];
                            else if (cond.value.length === 1)
                                cond.value = [cond.value[0], null];
                        }
                    },
                    addCustomGroupField(field) {
                        if (field) {
                            let group = Katrid.Forms.Views.Search.SearchGroups.fromField({ view: this.$view, field: this.$view.fields[field] });
                            this.$view.controller.groups.push(group);
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
                if (this._resultView)
                    this._resultView.groupLength = this.controller.groupLength;
                if (this.controller.groupLength) {
                    if (this._resultView)
                        this._resultView.applyGroups(this.controller.groupBy(), this.controller.getParams());
                }
                else if (this._resultView)
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
            <a v-if="item.expandable" class="expandable" v-on:click.prevent.stop
               v-on:mousedown.prevent.stop="item.expanded=!item.expanded">
              <i class="fa" :class="{'fa-angle-down': item.expanded, 'fa-angle-right': !item.expanded}"></i>
            </a>
            <a href="#" class="search-menu-item" v-on:mousedown.prevent.stop
               v-on:click.prevent="item.select()" :class="{'indent': item.indent}" v-show="!item.test || item.test(searchText)">
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
        <button class="btn btn-soft-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button" aria-expanded="false">
          <span class="fa fa-filter"></span> <span class="d-none d-lg-inline-block">${Katrid.i18n.gettext('Filters')}</span> <span class="caret"></span>
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
            <select class="form-select" v-model="cond.condition" v-on:change="conditionChange(cond)">
              <option></option>
              <option v-for="(name, value, index) in cond.conditions" :value="value">{{name}}</option>
            </select>
            </div>
            <div class="form-group" v-if="cond.fieldName && cond.condition">
              <select class="form-select" v-model="cond.value[0]" v-if="cond.$field.choices">
                <option v-for="choice in cond.$field.choices" :value="choice[0]">{{choice[1]}}</option>
              </select>
              <input class="form-control" v-model="cond.value[0]" type="text" v-else-if="cond.fieldName && (cond.$field.internalType === 'IntegerField')">
              <div v-else-if="cond.$field.internalType === 'DateField'">
<input-date class="input-group date" v-model="cond.value[0]" date-picker="L"></input-date>
<input-date class="input-group date" v-model="cond.value[1]" date-picker="L" v-if="cond.condition === '..'"></input-date>
              </div>
              <div v-else-if="cond.$field.internalType === 'DateTimeField'">
<input-date class="input-group date" v-model="cond.value[0]" date-picker="L"></input-date>
<input-date class="input-group date" v-model="cond.value[1]" date-picker="L" v-if="cond.condition === '..'"></input-date>
              </div>
              <input class="form-control" v-model="cond.value[0]" type="text" v-else-if="cond.$field.internalType === 'StringField'">

<div v-else-if="['IntegerField', 'FloatField', 'DecimalField'].includes(cond.$field.internalType)">
              <input class="form-control" v-model="cond.value[0]" type="number">
              <input class="form-control" v-model="cond.value[1]" type="number" v-if="cond.condition === '..'">
              </div>
              <input-autocomplete v-model="cond.value[0]" :data-model="cond.$field.model" v-else-if="(cond.condition === '=') && (cond.$field.internalType === 'ForeignKey')"/>
            </div>
          </div>
          <div class="col-12">
            <div class="form-group">
              <button class="btn btn-primary" type="button" v-on:click="applyFilter()">
                ${Katrid.i18n.gettext('Apply')}
              </button>
              <button class="btn btn-soft-secondary" type="button" v-on:click="newCondition()">
                ${Katrid.i18n.gettext('Add a condition')}
              </button>
            </div>
</div>
        </div>
      </div>
</div>

      </div>
      <div class="btn-group">
        <button class="btn btn-soft-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
          <span class="fa fa-bars"></span> <span class="d-none d-lg-inline-block">${Katrid.i18n.gettext('Group By')}</span> <span class="caret"></span>
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
                <select class="form-select" v-model="customGroupField">
                  <option value=""></option>
                  <option v-for="field in fieldList" :value="field.name">{{ field.caption }}</option>
                </select>
              </div>
              <div class="form-group">
                <button class="btn btn-primary" type="button" v-on:click="addCustomGroupField(customGroupField)">
                  ${Katrid.i18n.gettext('Apply')}
                </button>
              </div>
            </div>
          </div>
</ul>

      </div>

      <div class="btn-group">
        <button id="btn-favorites" class="btn btn-soft-secondary dropdown-toggle" data-bs-toggle="dropdown" type="button">
          <span class="fa fa-star"></span> <span class="d-none d-lg-inline-block">${katrid.i18n.gettext('Favorites')}</span> <span class="caret"></span>
        </button>
        <div class="dropdown-menu" role="menu">
        </div>
      </div>


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
                <button class="btn btn-soft-secondary" type="button" v-on:click="prevPage()">
                  <i class="fa fa-chevron-left"></i>
                </button>
                <button class="btn btn-soft-secondary" type="button" v-on:click="nextPage()">
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
                    if (this.action?.context.search_default)
                        setTimeout(() => this.load(this.action.context.search_default));
                }
                if (this.container)
                    this.container.append(this.element);
                this._createFavoritesMenu();
                return this.element;
            }
            load(query) {
            }
            _createFavoritesMenu() {
                let menu = this.element.querySelector('#btn-favorites').parentElement.querySelector('.dropdown-menu');
                let el = document.createElement('a');
                el.className = 'dropdown-item';
                el.innerText = _.gettext('Save current search');
                el.addEventListener('click', () => this.saveSearch());
                menu.appendChild(el);
                let div = document.createElement('div');
                div = document.createElement('div');
                menu.appendChild(div);
                div.className = 'col-12';
                div.setAttribute('style', 'padding: 0 10px;');
                let checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'form-field form-control';
                let label = document.createElement('label');
                label.className = 'checkbox';
                label.appendChild(checkbox);
                label.innerText = _.gettext('Save as default');
                let span = document.createElement('i');
                span.className = 'fas';
                label.appendChild(span);
                div.appendChild(label);
                div = document.createElement('div');
                div.className = 'dropdown-divider';
                menu.appendChild(div);
            }
            saveSearch() {
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
                    else if (['IntegerField', 'DecimalField', 'FloatField'].includes(field.internalType)) {
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
        Forms.SearchView = SearchView;
        Katrid.Forms.Views.registry['search'] = SearchView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class SettingsForm extends Katrid.Forms.ModelView {
            beforeRender(templ) {
                const div = document.createElement('div');
                div.classList.add('view-content');
                div.innerHTML = `<div class="form-header">Test</div><div class="action-view-content content-scroll"><div class="content no-padding"></div></div>`;
                div.querySelector('.form-body').appendChild(super.beforeRender(templ));
                return div;
            }
        }
        Forms.SettingsForm = SettingsForm;
        Katrid.Forms.Views.registry.settings = SettingsForm;
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
            compile() {
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
                this._systemContextMenuCreated = false;
                this.allowGrouping = true;
            }
            static { this.viewType = 'list'; }
            static createViewModeButton(container) {
                let btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn btn-soft-secondary btn-view-list';
                btn.innerHTML = '<i class="fas fa-list"></i>';
                btn.setAttribute('v-on:click', `setViewMode('list')`);
                container.append(btn);
            }
            static async createSearchDialog(config) {
                let model = config.model;
                console.debug(model);
                if (typeof model === 'string')
                    model = new Katrid.Data.Model({ name: model });
                let viewsInfo = await model.service.loadViews({
                    views: { list: null, search: null },
                });
                let view = new this({ name: model.name, viewInfo: viewsInfo.views.list.info });
                if (config.where)
                    view.datasource.domain = config.where;
                let search = new Katrid.Forms.SearchView({
                    name: model.name, viewInfo: viewsInfo.views.search.info,
                    multiple: config.multiple,
                    where: config.where,
                });
                view.dialog = true;
                view.rowSelector = true;
                if (config.multiple && !config.buttons)
                    view.dialogButtons = [
                        { text: 'OK', click: '$closeDialog(selection)' },
                        { text: Katrid.i18n.gettext('Cancel'), click: '$closeDialog(null)' },
                    ];
                view.render();
                search.resultView = view;
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
            createSelectionInfo(parent) {
                let div = document.createElement('div');
                div.className = 'selection-info';
                let span = document.createElement('span');
                div.setAttribute('v-if', '(selection.length > 0)');
                span.setAttribute('v-text', 'selection.length + " ' + Katrid.i18n.gettext('selected') + '"');
                span.setAttribute('v-if', '!allSelectionFilter');
                div.append(span);
                span = document.createElement('span');
                span.setAttribute('v-if', 'allSelectionFilter');
                span.setAttribute('v-text', '"Todos " + recordCount + " selecionados"');
                div.append(span);
                let btn = document.createElement('button');
                div.appendChild(btn);
                btn.type = 'button';
                btn.className = 'btn btn-soft-secondary';
                btn.setAttribute('v-if', '(selection.length < recordCount) && allSelected && !allSelectionFilter');
                btn.innerHTML = '<i class="fas fa-arrow-right"></i> <span>Selecionar todos {{recordCount}}</span>';
                btn.setAttribute('v-on:click', 'allSelectionFilter = true');
                parent.appendChild(div);
            }
            _createSystemContextMenu(target) {
                return;
                if (this._systemContextMenuCreated)
                    return;
                this._systemContextMenuCreated = true;
                target.addEventListener('contextmenu', (evt) => {
                    evt.preventDefault();
                    const menu = new katrid.ui.ContextMenu();
                    menu.add('Permissions', () => console.debug('show permission control'));
                    menu.show(evt.clientX, evt.clientY);
                });
            }
            render() {
                let el = super.render();
                let h = el.querySelector('.data-heading');
                if (h)
                    this._createSystemContextMenu(h);
                return el;
            }
            showDialog(options) {
                if (!options)
                    options = {};
                this.dialog = true;
                if (!options.buttons) {
                    if (this.rowSelector)
                        this.dialogButtons = [
                            { text: 'OK', click: '$closeDialog(selection)' },
                            { text: Katrid.i18n.gettext('Cancel'), click: '$closeDialog(null)' },
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
                    this._modal = new bootstrap.Modal(el, options);
                    el.addEventListener('hidden.bs.modal', () => {
                        resolve(this.vm.$result);
                        this._modal.dispose();
                        el.remove();
                        this._modal = null;
                    });
                    this._modal.show();
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
                    if (!f.visible)
                        continue;
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
                    created() {
                        this.$fields = me.fields;
                        this.$view = me;
                    },
                    data() {
                        return {
                            ...Katrid.globalData,
                            allSelectionFilter: false,
                            selection: [],
                            record: record,
                        };
                    },
                };
            }
            createComponent() {
                let me = this;
                let comp = super.createComponent();
                Object.assign(comp.methods, {
                    tableContextMenu(event) {
                        Forms.tableContextMenu.call(this, ...arguments);
                    },
                    columnClick(fieldName) {
                        if (me.orderBy && me.orderBy.includes(fieldName))
                            fieldName = '-' + fieldName;
                        me.orderBy = [fieldName];
                        me.refresh();
                    },
                    recordContextMenu(record, index, event) {
                        Forms.listRecordContextMenu.call(this, ...arguments);
                    },
                    unselectAll() {
                        this.allSelectionFilter = false;
                        Forms.unselectAll.call(this, ...arguments);
                    },
                    selectToggle(record) {
                        this.allSelectionFilter = false;
                        Forms.selectionSelectToggle.call(this, record);
                        if (!record.$selected)
                            this.allSelected = false;
                        else
                            this.allSelected = this.records.every(rec => rec.$selected);
                    },
                    toggleAll(sel) {
                        this.allSelectionFilter = false;
                        Forms.selectionToggleAll.call(this, ...arguments);
                    },
                    async actionViewClick(methName, params) {
                        try {
                            if (!params?.selection)
                                params = { ids: this.selection.map(rec => rec.id) };
                            this.pendingOperation = true;
                            let res = await me.model.service.rpc(methName, null, params);
                            await me.action._evalResponseAction(res);
                        }
                        finally {
                            this.pendingOperation = false;
                        }
                    },
                });
                return comp;
            }
            edit(index) {
                this.readonly = false;
                this.element.removeAttribute('readonly');
                let table = this.element.querySelector('table');
                let tbody = table.tBodies[0];
                let tr = this.createInlineEditor();
                let oldRow = tbody.rows[index];
                tr.setAttribute('data-index', index.toString());
                let vm = Katrid.createVm(this.createFormComponent(this.vm.records[index])).mount(tr);
                Vue.nextTick().then(() => {
                    this.forms[this._formCounter] = { formRow: tr, relRow: oldRow, index, record: vm.record || {} };
                    tbody.insertBefore(tr, oldRow);
                    if (oldRow)
                        tbody.removeChild(oldRow);
                });
                return tr;
            }
            insert() {
                let rec = this.model.newRecord(null, this.datasource);
                this.vm.records.unshift(rec);
                let tr = this.edit(0);
                let input = tr.querySelector(`input.form-field`);
                if (input) {
                    input.select();
                    input.focus();
                }
            }
            _removeForm(formId) {
                let form = this.forms[formId];
                if (form.formRow?.parentElement)
                    form.formRow.parentElement.insertBefore(form.relRow, form.formRow);
                form.formRow.remove();
                delete this.forms[formId];
                return form;
            }
            save(formId) {
                for (let fid of ((formId && [formId]) || Array.from(Object.keys(this.forms)))) {
                    let form = this._removeForm(fid);
                    if (form.index > -1) {
                        form.record.$flush();
                    }
                    else
                        this.vm.records.push(form.record);
                }
            }
            discard(formId) {
                for (let fid of ((formId && [formId]) || Array.from(Object.keys(this.forms)))) {
                    let form = this._removeForm(fid);
                    if (form.record.$state === Katrid.Data.RecordState.created)
                        this.vm.records.splice(this.vm.records.indexOf(form.record), 1);
                }
            }
            renderTemplate(template) {
                template.setAttribute('data-options', JSON.stringify({ rowSelector: this.rowSelector }));
                let renderer = new ListRenderer({ model: this.model }, { allowGrouping: this.allowGrouping });
                let div = document.createElement('div');
                let table = renderer.render(template);
                div.className = 'table-responsive';
                div.append(table);
                this.$columns = renderer.columns;
                return div;
            }
            async groupBy(data) {
                this.vm.records = this.vm.groups;
            }
        }
        Forms.TableView = TableView;
        function dataTableContextMenu(evt) {
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
        Katrid.Forms.Views.registry['list'] = TableView;
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    let _intlCache = {};
    function getNumberFormat(config) {
        let key;
        if (typeof config === 'object')
            key = JSON.stringify(config);
        else
            key = config.toString();
        let intl = _intlCache[key];
        if (!intl) {
            if (typeof config === 'number')
                intl = new Intl.NumberFormat(Katrid.i18n.languageCode, {
                    minimumFractionDigits: config,
                    maximumFractionDigits: config,
                });
            else
                intl = new Intl.NumberFormat(Katrid.i18n.languageCode, config);
            _intlCache[key] = intl;
        }
        return intl;
    }
    Katrid.intl = {
        number(config) {
            let cfg = {};
            if (!config)
                cfg.maximumFractionDigits = 2;
            else if (typeof config === 'number')
                cfg.minimumFractionDigits = config;
            else if (config.minimumFractionDigits)
                cfg.minimumFractionDigits = config.minimumFractionDigits;
            if (config?.maximumFractionDigits)
                cfg.maximumFractionDigits = config.maximumFractionDigits;
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
        fmts.shortDateFormat = convertFormat(fmts.SHORT_DATE_FORMAT);
        fmts.shortDateTimeFormat = convertFormat(fmts.SHORT_DATETIME_FORMAT);
        return fmts;
    }
    Katrid.i18n = {
        languageCode: 'en-us',
        formats: {
            shortDateFormat: 'YYYY-MM-DD',
            reShortDateFormat: /\d+[-/]\d+[-/]\d+/,
        },
        catalog: {},
        initialize(plural, catalog, formats) {
            Katrid.i18n.plural = plural;
            Katrid.i18n.catalog = catalog;
            Katrid.i18n.formats = expandFormats(formats);
            if (!Katrid.i18n.formats.reShortDateFormat) {
                Katrid.i18n.formats.reShortDateFormat = /\d+[-/]\d+[-/]\d+/;
            }
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
var katrid;
(function (katrid) {
    katrid.i18n = Katrid.i18n;
})(katrid || (katrid = {}));
var _;
(function (_) {
    _.i18n = Katrid.i18n;
    _.gettext = _.i18n.gettext;
})(_ || (_ = {}));
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
                        this.facetGrouping = new Search.FacetGroup();
                        this.query = new Search.SearchQuery(this);
                        this.menu = container.querySelector('.search-dropdown-menu.search-view-menu');
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
                                        view: this.searchView,
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
                                else if (tag === 'STRINGFIELD') {
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
                        for (let obj of this._availableItems)
                            if (obj.expanded) {
                                obj.expanded = false;
                            }
                        this.vm.availableItems = this._availableItems;
                        this.menu.classList.add('show');
                        this.first();
                    }
                    close() {
                        this.vm.availableItems = null;
                        this.vm.searchText = '';
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
                            if (!i.grouping) {
                                r = r.concat(i.getParamValues());
                                console.debug('params', i);
                            }
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
                        if (this.groupLength !== this._groupLength) {
                            this._groupLength = this.groupLength;
                            await this.searchView.resultView.applyGroups(this.groupBy(), this.getParams());
                        }
                        else {
                        }
                        this.vm.update();
                    }
                    groupBy() {
                        let res = [];
                        for (let g of this.groups)
                            res = res.concat(g.items.filter(item => item['selected']).map(item => item['groupBy']));
                        return res;
                    }
                }
                Search.SearchViewController = SearchViewController;
                Katrid.component('search-view', {
                    template: ``,
                    mounted() {
                        this.$viewInfo = this.$parent.views?.search;
                        let search = this.search = this.$search = new SearchViewController(this);
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
                    '..': Katrid.i18n.gettext('Between'),
                    '!=': Katrid.i18n.gettext('Is different'),
                    '>': Katrid.i18n.gettext('Greater-than'),
                    '<': Katrid.i18n.gettext('Less-than'),
                    '%': Katrid.i18n.gettext('Contains'),
                    '!%': Katrid.i18n.gettext('Not contains'),
                    'range': Katrid.i18n.gettext('Between'),
                    'like': Katrid.i18n.gettext('Like'),
                    'in': Katrid.i18n.gettext('In'),
                    '!in': Katrid.i18n.gettext('Not in'),
                    'isnull': Katrid.i18n.gettext('Is null'),
                    '!isnull': Katrid.i18n.gettext('Is not null'),
                    'true': Katrid.i18n.gettext('Yes'),
                    'false': Katrid.i18n.gettext('No'),
                };
                Search.conditionSuffix = {
                    '=': '',
                    '..': '__range',
                    '!=': '__isnot',
                    '%': '__icontains',
                    '!%': '__not_icontains',
                    '>': '__gt',
                    '>=': '__gte',
                    '<': '__lt',
                    '<=': '__lte',
                    'in': '__in',
                    '!in': '__not_in',
                    'range': '__range',
                    'isnull': '__isnull',
                    '!isnull': '__isnull',
                };
                class SearchItem {
                    constructor(view, name, el) {
                        this.view = view;
                        this.name = name;
                        this.el = el;
                        this.controller = view.controller;
                    }
                    test(s) {
                        if (this.pattern && s)
                            return this.pattern.test(s);
                        return true;
                    }
                    getDisplayValue() {
                        if (Array.isArray(this.value)) {
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
                        console.log('select field', this.field, this.value);
                        this.field.selectItem(this.value);
                    }
                }
                Search.SearchResult = SearchResult;
                class SearchField extends SearchItem {
                    constructor(view, name, el, field) {
                        super(view, name, el);
                        this.lookup = '';
                        this.field = field;
                        this._expanded = false;
                        this.options = $(el).data('options');
                        this.caption = el.getAttribute('caption') || field.caption;
                        if (field.type === 'ForeignKey') {
                            this.expandable = true;
                            this.children = [];
                        }
                        else {
                            if (field.type === 'IntegerField')
                                this.pattern = /^[\d]+[\d;.]*$/;
                            else if (field.type === 'FloatField')
                                this.pattern = /^[\d]+[\d,;.]*$/;
                            else if (field.type === 'DecimalField')
                                this.pattern = /^[\d]+[\d,;.]*$/;
                            else if (field.type === 'DateField')
                                this.pattern = /^[\d.\s\-\/;]+$/;
                            else if (field.type === 'DateTimeField')
                                this.pattern = /^[\d.\s\-:\/;]+$/;
                            this.expandable = false;
                        }
                        if (el.hasAttribute('search-key'))
                            this.searchKey = el.getAttribute('search-key');
                        if (el && el.hasAttribute('search-pattern'))
                            this.pattern = new RegExp(el.getAttribute('search-pattern'));
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
                            if (this.view.controller.availableItems)
                                for (let i = this.view.controller.availableItems.length - 1; i > 0; i--) {
                                    let obj = this.view.controller.availableItems[i];
                                    if (obj.field === this) {
                                        this.view.controller.availableItems.splice(i, 1);
                                    }
                                }
                        }
                    }
                    _loadChildren() {
                        this.loading = true;
                        this.view.model.service.getFieldChoices({ field: this.name, term: this.view.vm.searchText })
                            .then((res) => {
                            this.children = res.items;
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
                        let name = this.searchKey || this.name;
                        if (Array.isArray(value)) {
                            r[name + this.lookup] = value[0];
                        }
                        else if (value instanceof SearchObject) {
                            return value.value;
                        }
                        else if (name.includes('__')) {
                            r[name] = value;
                        }
                        else {
                            r[name + this.field.defaultSearchLookup] = value;
                        }
                        return r;
                    }
                    get value() {
                        if (this._value)
                            return this._value;
                        return this.view.vm.searchText;
                    }
                    async select() {
                        this._value = null;
                        if (this.options?.allowSelect !== false) {
                            if (this.field) {
                                if (this.field instanceof Katrid.Data.DateTimeField)
                                    this.lookup = '__date';
                                this._value = this.field.getParamValue(this.value);
                                let fmt;
                                if (Array.isArray(this._value)) {
                                    fmt = this._value.map(this.field.format);
                                    if (this.view.vm.searchText.includes('..'))
                                        this.lookup = '__range';
                                    else if (this.view.vm.searchText.includes(';'))
                                        this.lookup = '__in';
                                }
                                else
                                    fmt = this.field.format(this._value);
                                if (fmt === this._value)
                                    this.facet.addValue(this.value);
                                else
                                    this.facet.addValue([this._value, fmt]);
                            }
                            else
                                this.facet.addValue(this.value);
                            this.view.controller.addFacet(this.facet);
                            this.view.controller.close();
                            this.view.update();
                            return true;
                        }
                        else if (this.expandable) {
                            this.expanded = !this.expanded;
                            return false;
                        }
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
                        if (!field && (el.tagName === 'STRINGFIELD')) {
                            const name = el.getAttribute('name');
                            field = new Katrid.Data.StringField({ name, caption: el.getAttribute('caption') });
                        }
                        return new SearchField(view, field.name, el, field);
                    }
                    get template() {
                        return Katrid.i18n.interpolate(Katrid.i18n.gettext(`Search <i>%(caption)s</i> by: <strong>%(text)s</strong>`), {
                            caption: this.caption,
                            text: this.view.vm.searchText,
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
                        if (((field instanceof Katrid.Data.DateField) || (field instanceof Katrid.Data.DateTimeField)) && Array.isArray(value))
                            value = value.map(val => typeof val === 'string' ? moment(val) : val);
                        this._value = value;
                        this._selected = true;
                    }
                    toString() {
                        let v = this._value;
                        let s;
                        if (v.length === 1) {
                            v = v[0];
                            if (v != null)
                                s = this.field.format(v);
                        }
                        else if (v.length > 1)
                            s = v.map(item => this.field.format(item));
                        s = s ? ' "' + s + '"' : '';
                        return this.field.caption + ' ' + Search.conditionsLabels[this.condition].toLowerCase() + s;
                    }
                    get value() {
                        let r = {};
                        let fname = this.field.name;
                        if ((this.field instanceof Katrid.Data.DateTimeField) && !['isnull', '!isnull'].includes(this.condition))
                            fname = fname + '__date';
                        let condName = Search.conditionSuffix[this.condition] || '';
                        fname += condName;
                        if (this.condition === '..')
                            r[fname] = this._value.map(v => this.field.getParamValue(v));
                        else if ((this.condition === '=') || (this.condition === '!='))
                            r[fname] = this.field.getParamValue(this._value[0]);
                        else if ((this.condition === '%') || (this.condition === '!%'))
                            r[fname] = this.field.getParamValue(this._value[0]);
                        else if (this.condition === 'isnull')
                            r[fname] = true;
                        else if (this.condition === '!isnull')
                            r[fname] = false;
                        else if (this.condition === 'false')
                            r[fname] = false;
                        else if (this.condition === 'true')
                            r[fname] = true;
                        else
                            r[fname] = this._value[0];
                        return r;
                    }
                }
                Search.CustomFilterItem = CustomFilterItem;
                class CustomFilterHelper {
                    constructor(searchView, container) {
                        this.searchView = searchView;
                        container.innerHTML = `<button class="btn btn-soft-secondary dropdown-toggle" data-toggle="dropdown" type="button"
                aria-expanded="false">
          <span class="fa fa-filter fa-fw"></span> ${Katrid.i18n.gettext('Filters')} <span class="caret"></span>
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
          ${Katrid.i18n.gettext('Add Custom Filter')}
        </a>

        <div v-if="expanded" v-on:click.stop.prevent="">
          <div v-show="tempFilter.length" class="margin-bottom-8">
            <a href="#" v-on:click.prevent="" class="dropdown-item" v-for="filter in tempFilter" title="${Katrid.i18n.gettext('Remove item')}">
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
                ${Katrid.i18n.gettext('Apply')}
              </button>
              <button class="btn btn-soft-secondary" type="button"
                      v-on:click="addCondition(field, condition, searchValue);fieldName='';" v-show="conditionName">
                ${Katrid.i18n.gettext('Add a condition')}
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
                        container.innerHTML = `<button class="btn btn-soft-secondary dropdown-toggle" data-toggle="dropdown" type="button">
          <span class="fa fa-bars fa-fw"></span> ${Katrid.i18n.gettext('Group By')} <span class="caret"></span>
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
            ${Katrid.i18n.gettext('Add Custom Group')}
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
                  ${Katrid.i18n.gettext('Apply')}
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
                        container.innerHTML = `<button class="btn btn-soft-secondary dropdown-toggle" data-toggle="dropdown" type="button"
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
                        return (Array.from(this.values).map((s) => {
                            if (Array.isArray(s))
                                return s[1];
                            return s instanceof Search.SearchObject ? s.display : s;
                        })).join(this.separator);
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
                        this.view.controller.groupLength++;
                        let newItem = new Search.SearchObject(item.toString(), item.value);
                        newItem._ref = item;
                        this.facet.values.push(newItem);
                        this._refresh();
                    }
                    removeValue(item) {
                        this.view.controller.groupLength--;
                        for (let i of this.facet.values)
                            if (i._ref === item) {
                                this.facet.values.splice(this.facet.values.indexOf(i), 1);
                                break;
                            }
                        this._refresh();
                    }
                    _refresh() {
                        if (this.facet.values.length) {
                            if (this.view.controller.facets.indexOf(this.facet) === -1)
                                this.view.controller.facets.push(this.facet);
                        }
                        else if (this.view.controller.facets.indexOf(this.facet) > -1)
                            this.view.controller.facets.splice(this.view.controller.facets.indexOf(this.facet), 1);
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
                    let domain = this.$attrs['filter'];
                    if (typeof domain === 'string')
                        try {
                            domain = new Function(`return ${domain}`)();
                        }
                        catch (e) {
                            console.debug('Error in domain', domain);
                            console.error(e);
                        }
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
                                data.kwargs.domain = domain;
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
                type="button" class="btn btn-soft-secondary dropdown-toggle"
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
        var Widgets;
        (function (Widgets) {
            class Widget {
                constructor(field, fieldEl) {
                    this.field = field;
                    this.fieldEl = fieldEl;
                }
                formLabel() {
                    return this.field.formLabel(this.fieldEl);
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
var katrid;
(function (katrid) {
    var forms;
    (function (forms) {
        var widgets;
        (function (widgets) {
            class CodeEditor extends katrid.ui.WebComponent {
                _create() {
                    this.el = document.createElement('div');
                    this.el.className = 'editor';
                    this.append(this.el);
                    return new Promise((resolve, reject) => {
                        require(['vs/editor/editor.main'], () => {
                            setTimeout(() => {
                                this.codeEditor = monaco.editor.create(this.el, {
                                    language: this.lang,
                                    automaticLayout: true,
                                    readOnly: this.readonly,
                                    value: this.value || '',
                                });
                                this.codeEditor.getModel().updateOptions({ tabSize: 2 });
                                let parent = this.closest('.form-view');
                                if ((this.readonly == null) && parent) {
                                    this._observer = new MutationObserver(() => this._checkReadonly(parent));
                                    this._observer.observe(parent, {
                                        attributes: true,
                                        attributeFilter: ['class'],
                                    });
                                }
                                this.codeEditor.getModel().onDidChangeContent(() => this.dispatchEvent(new Event('change')));
                                this.codeEditor.onDidBlurEditorWidget(() => this.dispatchEvent(new Event('blur')));
                                if (this.readonly == null)
                                    this._checkReadonly(parent);
                                resolve(this.codeEditor);
                            }, 1000);
                        });
                    });
                }
                _checkReadonly(parent) {
                    if (parent.classList.contains('readonly'))
                        this.codeEditor.updateOptions({ readOnly: true });
                    else
                        this.codeEditor.updateOptions({ readOnly: false });
                }
                setValue(value) {
                    this.value = value;
                    console.debug('set valu');
                    if (this.codeEditor)
                        this.codeEditor.setValue(value);
                }
            }
            widgets.CodeEditor = CodeEditor;
            Katrid.component('code-editor', {
                props: ['modelValue'],
                emits: ['update:modelValue'],
                template: `<code-editor class="code-editor-widget"></code-editor>`,
                watch: {
                    modelValue: function (value) {
                        if (!this._changing)
                            this.$el.setValue(value);
                    }
                },
                mounted() {
                    if (this.$attrs['code-editor-lang'])
                        this.$el.lang = this.$attrs['code-editor-lang'];
                    if (this.$attrs.readonly)
                        this.$el.readonly = this.$attrs.readonly === 'true';
                    this._changing = false;
                    let timeout;
                    this.$el.addEventListener('change', evt => {
                        clearTimeout(timeout);
                        timeout = setTimeout(async () => {
                            try {
                                this._changing = true;
                                this.$emit('update:modelValue', this.$el.codeEditor.getValue());
                                await this.$nextTick();
                            }
                            finally {
                                this._changing = false;
                            }
                            timeout = null;
                        }, 1000);
                    });
                    this.$el.addEventListener('blur', async (evt) => {
                        if (timeout) {
                            clearTimeout(timeout);
                            timeout = null;
                            try {
                                this._changing = true;
                                this.$emit('update:modelValue', this.$el.codeEditor.getValue());
                                await this.$nextTick();
                            }
                            finally {
                                this._changing = false;
                            }
                        }
                    });
                }
            });
            class CodeEditorWidget extends Katrid.Forms.Widgets.Widget {
                constructor() {
                    super(...arguments);
                    this.formControl = (fieldEl) => {
                        const div = document.createElement('code-editor');
                        div.className = 'code-editor-widget';
                        div.setAttribute('v-model', `record.${this.field.name}`);
                        div.setAttribute('code-editor-lang', fieldEl.getAttribute('code-editor-lang') || 'javascript');
                        return div;
                    };
                    this.spanTemplate = (fieldEl) => {
                        return document.createElement('div');
                    };
                }
            }
            Katrid.Forms.Widgets.registry['CodeEditor'] = CodeEditorWidget;
            Katrid.define('code-editor', CodeEditor);
        })(widgets = forms.widgets || (forms.widgets = {}));
    })(forms = katrid.forms || (katrid.forms = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        class InputMask {
            constructor(el, options) {
                this.el = el;
                this.options = options;
                this._changed = false;
                this._inputMask = options?.mask;
                if (this._inputMask === undefined)
                    this._inputMask = this.el.getAttribute('input-mask');
                el.addEventListener('change', () => {
                    this._invalidate();
                });
                el.addEventListener('blur', () => this._format());
                el.addEventListener('keypress', event => this._keyPress(event));
                el.addEventListener('keydown', event => this._keyDown(event));
                this._create();
            }
            _keyPress(event) {
                if (this._inputMask) {
                    if (!event.shiftKey && !event.altKey && !event.ctrlKey) {
                        let start = this.el.selectionStart;
                        let end = this.el.selectionEnd;
                        let char = this._inputMask[start];
                        if ((char === '9') && !/[\d]/.test(event.key)) {
                            event.preventDefault();
                            return false;
                        }
                        else if ((char !== '9') && (char === event.key))
                            return true;
                        if (start === end) {
                            if (this.el.value.length > start) {
                                if (char !== '9') {
                                    start++;
                                }
                            }
                            this.el.value = this.el.value.substring(0, start) + this.el.value.substring(start + 1);
                            this.el.selectionEnd = start;
                            if (!char)
                                event.preventDefault();
                            else if (char !== '9') {
                                if (this.el.value.length > start)
                                    return;
                                this.el.value += char;
                            }
                        }
                    }
                }
            }
            _keyDown(event) {
                if (this._inputMask) {
                    if (event.code === 'Backspace') {
                        if ((this.el.selectionEnd === this.el.value.length) && (this.el.selectionStart === this.el.value.length))
                            return true;
                        if (this.el.selectionStart > 0) {
                            this.el.selectionStart--;
                            event.preventDefault();
                        }
                        else if ((this.el.selectionStart === 0) && (this.el.selectionEnd < this.el.value.length)) {
                            this.el.selectionEnd = this.el.value.length;
                            event.preventDefault();
                        }
                    }
                    else if (event.code === 'Delete') {
                        this.el.selectionEnd = this.el.value.length;
                    }
                }
            }
            _format() {
            }
            _create() {
            }
            _invalidate() {
            }
        }
        UI.InputMask = InputMask;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        class InputDate extends Katrid.UI.InputMask {
        }
        Forms.InputDate = InputDate;
        Katrid.component('input-date', {
            props: ['modelValue'],
            template: `<div class="input-group date">
      <input type="text" class="form-control form-field" inputmode="numeric">
      <label class="input-group-text btn-calendar" type="button"><i class="fa fa-calendar fa-sm"></i></label></div>`,
            mounted() {
                let vm = this;
                let mask = Katrid.i18n.gettext('9999-99-99');
                let todayChar = Katrid.i18n.gettext('Today')[0].toLowerCase();
                let format = vm.$attrs['date-picker'] || 'L';
                let $format;
                if (format === 'L LT') {
                    mask = Katrid.i18n.gettext('9999-99-99 99:99');
                    $format = Katrid.i18n.formats.shortDateTimeFormat || Katrid.i18n.formats.shortDateFormat;
                }
                else
                    $format = Katrid.i18n.formats.shortDateFormat;
                let input = vm.$el.querySelector('input');
                let im = new Katrid.UI.InputMask(input, { mask });
                input.value = '';
                if (vm.$attrs.name)
                    input.name = vm.$attrs['name'];
                vm.$input = input;
                this.$lastValue = '';
                input.addEventListener('focusin', () => this.$changing = true);
                input.addEventListener('focusout', () => this.$changing = false);
                input.addEventListener('keypress', (event) => {
                    if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
                        if (event.code === 'Enter') {
                            if (input.value) {
                                let v = katrid.utils.autoCompleteDate(input.value.replace('_', ''), $format);
                                if (v)
                                    input.value = moment(v).format($format);
                                else
                                    input.value = '';
                            }
                            return true;
                        }
                    }
                });
                input.addEventListener('keydown', event => {
                    if (event.code === 'ArrowUp') {
                        let v = moment(this.modelValue || new Date()).add(1, 'days').format($format);
                        input.value = v;
                        vm.$emit('update:modelValue', applyValue(v));
                    }
                    else if (event.code === 'ArrowDown') {
                        let v = moment(this.modelValue || new Date()).add(-1, 'days').format($format);
                        input.value = v;
                        vm.$emit('update:modelValue', applyValue(v));
                    }
                    else if (event.key.toLowerCase() === todayChar) {
                        let v = moment(new Date()).format($format);
                        input.value = v;
                        vm.$emit('update:modelValue', applyValue(v));
                    }
                });
                input.addEventListener('change', () => {
                    if (input.value) {
                        if (input.value.length < mask.length) {
                            let v = katrid.utils.autoCompleteDate(input.value, $format);
                            if (v)
                                input.value = moment(v).format($format);
                            else
                                input.value = '';
                        }
                    }
                    vm.$emit('update:modelValue', applyValue(this.value));
                });
                this.$format = $format;
                let applyValue = (value) => {
                    value = input.value;
                    if (format === 'L')
                        this.$lastValue = moment(value, $format).format('YYYY-MM-DD');
                    else
                        this.$lastValue = moment(value, $format).format('YYYY-MM-DDTHH:mm:ss');
                    if (this.$lastValue === 'Invalid date')
                        this.$lastValue = null;
                    vm.$emit('change', this.$lastValue);
                    return this.$lastValue;
                };
                this.$el.querySelector('.btn-calendar').addEventListener('click', () => {
                    let val = this.modelValue;
                    if (val)
                        val = moment(val).toDate();
                    let calendar = new Katrid.ui.Calendar(this.$el, {
                        change: newDate => {
                            let v = moment(newDate).format($format);
                            input.value = v;
                            vm.$emit('update:modelValue', applyValue(v));
                        },
                        date: val,
                    });
                    calendar.show();
                });
                if (this.modelValue)
                    input.value = moment(this.modelValue).format(this.$format);
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
        class InputTime extends Katrid.UI.InputMask {
        }
        Katrid.component('input-time', {
            props: ['modelValue'],
            template: '<input class="form-control" type="text">',
            mounted() {
                let el = this.$el;
                let im = new Katrid.UI.InputMask(el, { mask: "99:99" });
                el.addEventListener('blur', () => {
                    if (el.value.length === 2)
                        el.value += ':';
                    if (el.value.length === 3)
                        el.value += '00';
                    if (el.value)
                        this.$emit('update:modelValue', el.value);
                });
                el.addEventListener('change', () => {
                    this.$emit('update:modelValue', el.value);
                });
                if (this.modelValue)
                    el.value = this.modelValue;
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
var katrid;
(function (katrid) {
    var utils;
    (function (utils) {
        function autoCompleteDate(s, format) {
            let match = Array.from(s.matchAll(/(\d)+/g));
            if (match.length) {
                let today = new Date();
                let day = Number.parseInt(match[0][0]);
                let month = today.getMonth();
                let year = today.getFullYear();
                if (match.length > 1) {
                    month = Number.parseInt(match[1][0]) - 1;
                }
                if (match.length > 2) {
                    let y = match[2][0];
                    if (y.length === 2)
                        y = '20' + y;
                    year = Number.parseInt(y);
                }
                return new Date(year, month, day);
            }
            return;
        }
        utils.autoCompleteDate = autoCompleteDate;
    })(utils = katrid.utils || (katrid.utils = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
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
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        const decimalSeparator = Katrid.i18n.formats.DECIMAL_SEPARATOR || '.';
        const thousandSeparator = Katrid.i18n.formats.THOUSAND_SEPARATOR || ',';
        const RE_INPUT = new RegExp(`[-=0-9\\${decimalSeparator}]`);
        const RE_FORMULA = new RegExp(`[=+\-/*\d\\${decimalSeparator}]`);
        class InputDecimal {
            constructor(element) {
                this.element = element;
                this._formula = false;
                this._changed = false;
                this.element.addEventListener('change', () => {
                    this._invalidate();
                });
                this.element.addEventListener('blur', () => this._format());
                this._create();
            }
            _formatValue(val) {
                let fmt = this.element.getAttribute('display-format') || '0.00';
                let s;
                let inputDec = parseInt(this.element.getAttribute('input-decimal') || '2');
                if (fmt.endsWith('#'))
                    s = Katrid.intl.number({ minimumFractionDigits: inputDec }).format(val);
                else if (fmt.endsWith('0'))
                    s = Katrid.intl.number({ minimumFractionDigits: 2, maximumFractionDigits: inputDec }).format(val);
                else
                    s = Katrid.intl.number({ maximumFractionDigits: inputDec }).format(val);
                return s;
            }
            _format() {
                if (!this.element.value)
                    return;
                let s = this._formatValue(this.getValue());
                if (s)
                    this.element.value = s;
            }
            _create() {
                this.element.addEventListener('keypress', (evt) => {
                    if (this._formula) {
                        if (!evt.shiftKey && !evt.ctrlKey && !evt.altKey && evt.code === 'Enter')
                            this._invalidate();
                        return true;
                    }
                    if (!evt.shiftKey && !evt.ctrlKey && !evt.altKey) {
                        if ((evt.code === 'Enter') && this._formula) {
                            this._invalidate();
                            return true;
                        }
                        else if (RE_INPUT.test(evt.key)) {
                            if (evt.key === '=') {
                                this.element.value = '=';
                                this._formula = true;
                                evt.preventDefault();
                            }
                            return true;
                        }
                    }
                    evt.preventDefault();
                });
                this.element.addEventListener('input', () => {
                    this._formula = this.element.value && this.element.value[0] === '=';
                    return false;
                });
                this.element.addEventListener('focusin', () => {
                    this._changed = false;
                    let s = this.element.value;
                    if (s.includes(thousandSeparator))
                        this.element.value = s.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '');
                    this.element.select();
                });
            }
            _invalidate() {
                if (this.element.value && this._formula) {
                    this._formula = null;
                    let s = this.element.value;
                    s = s.replace(new RegExp(`\\${decimalSeparator}`, 'g'), '.');
                    let val = eval(s.substring(1, s.length));
                    if (typeof val === 'number')
                        this.element.value = val.toString().replace(/\./g, decimalSeparator);
                    else
                        this.element.value = '0';
                }
            }
            getValue() {
                let s = this.element.value;
                if (!s)
                    return null;
                if (s.includes(thousandSeparator))
                    s = s.replace(new RegExp(`\\${thousandSeparator}`, 'g'), '');
                if (decimalSeparator !== '.')
                    s = s.replace(decimalSeparator, '.');
                return parseFloat(s);
            }
            setValue(v) {
                if ((v == null) || (v === '')) {
                    this.element.value = '';
                    return;
                }
                if (typeof v === 'string')
                    v = parseFloat(v);
                this.element.value = this._formatValue(v);
            }
        }
        Forms.InputDecimal = InputDecimal;
        Katrid.component('input-decimal', {
            props: ['modelValue'],
            template: `<input type="text" class="form-control">`,
            mounted() {
                let vm = this;
                let decimal = vm.$attrs['input-decimal'];
                this.$inputDecimal = new InputDecimal(this.$el);
                this.$el.addEventListener('input', () => {
                    if (!this.$el._formula) {
                        this.$changing = true;
                        vm.$emit('update:modelValue', this.$inputDecimal.getValue());
                        setTimeout(() => this.$changing = false);
                    }
                });
                this.$el.addEventListener('change', () => {
                    this.$changing = true;
                    vm.$emit('update:modelValue', this.$inputDecimal.getValue());
                    setTimeout(() => this.$changing = false);
                });
                if (vm.modelValue != null)
                    this.$inputDecimal.setValue(vm.modelValue);
            },
            emits: ['update:modelValue'],
            watch: {
                modelValue: function (value) {
                    if (!this.$changing)
                        this.$inputDecimal.setValue(value);
                }
            }
        });
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        ui.InputDecimal = Katrid.Forms.InputDecimal;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            class StatusField extends Widgets.Widget {
                renderToForm() {
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
                formControl() {
                    let div = document.createElement('div');
                    div.className = 'form-field';
                    let label = document.createElement('div');
                    label.setAttribute('v-for', `(choice, index) in $fields.${this.field.name}.choices`);
                    label.classList.add('form-check', 'form-check-inline');
                    let css = this.field.fieldEl.getAttribute('class');
                    if (css)
                        label.classList.add(...css.split(' '));
                    let input = document.createElement('input');
                    input.className = 'form-check-input';
                    let id = `'RADIO_ID-${this.field.name}-${++RADIO_ID}-' + index`;
                    input.setAttribute(':id', id);
                    input.setAttribute('type', 'radio');
                    input.setAttribute('v-model', `record.${this.field.name}`);
                    input.setAttribute(':value', `choice[0]`);
                    let txt = document.createElement('label');
                    txt.className = 'form-check-label';
                    txt.innerText = '{{ choice[1] }}';
                    txt.setAttribute(':for', id);
                    label.appendChild(input);
                    label.appendChild(txt);
                    div.append(label);
                    return div;
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
                template: '<button type="button" class="btn stat-button"><slot/></button>',
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
                if (items.length) {
                    for (let item of items)
                        this.addItem(item);
                    this.move(1);
                }
            }
            clearItems() {
                this.items = [];
                for (let el of this._elements)
                    el.remove();
                this._elements = [];
            }
            init() {
                this.cancelSearch();
                this._pending = this.search();
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
                    let items = this._source;
                    if (this.input.term)
                        items = items.filter(obj => obj.text?.toLowerCase().includes(this.input.term.toLowerCase()));
                    this.loadItems(items);
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
        class BaseInputWidget {
            constructor(_options) {
                this._options = _options;
                this.el = _options.el;
                if (this.el) {
                    this._create(this.el);
                }
            }
            _create(el) {
            }
        }
        UI.BaseInputWidget = BaseInputWidget;
        class BaseAutoComplete extends BaseInputWidget {
            constructor(options) {
                if (options instanceof HTMLElement) {
                    options = { el: options };
                }
                super(options);
                this.menu = null;
                this.closeOnChange = true;
                this.term = '';
                this.multiple = false;
                this.allowOpen = false;
                this._tags = [];
                this._facets = [];
                if (options.source) {
                    this.setSource(options.source);
                }
            }
            _create(el) {
                el.classList.add('input-autocomplete', 'input-dropdown');
                let append = '';
                let prepend = '';
                let name = el.getAttribute('name');
                let model = el.getAttribute('data-model');
                if (el.hasAttribute('allow-open')) {
                    append = `<span class="fa fa-fw fa-folder-open autocomplete-open" title="${Katrid.i18n.gettext('Open this object')}" v-on:click="openObject('${model}', record.${name}.id)"></span>`;
                    this.allowOpen = true;
                }
                el.classList.add('form-control');
                if (this.multiple) {
                    prepend = `<div class="input-dropdown">`;
                    append = '</div>' + append;
                    el.classList.add('multiple');
                }
                let input = el.querySelector('input');
                if (input) {
                    if (prepend)
                        el.insertBefore(Katrid.html(prepend), input);
                    el.append(Katrid.html('<span class="caret"></span>'));
                    if (append)
                        el.append(Katrid.html(append));
                }
                else {
                    el.innerHTML = `${prepend}<input class="form-field" autocomplete="nope" spellcheck="false"> <span class="caret"></span>${append}`;
                    input = el.querySelector('input');
                }
                this.input = input;
                el.addEventListener('click', evt => {
                    this.input.focus();
                    this.input.select();
                    this.showMenu();
                });
                let caret = el.querySelector('.caret');
                caret.addEventListener('click', evt => el.click());
                this.input.type = 'text';
                this.input.addEventListener('input', () => this.onInput());
                this.input.addEventListener('click', event => {
                    if (window.getComputedStyle(el).display === 'none') {
                        event.stopPropagation();
                        return;
                    }
                    this.input.select();
                    this.onClick();
                });
                this.input.addEventListener('blur', () => this.onFocusout());
                this.input.addEventListener('keydown', (event) => this.onKeyDown(event));
                if (el.hasAttribute('placeholder'))
                    this.input.placeholder = el.getAttribute('placeholder');
                if (this.$selectedItem)
                    this.selectedItem = this.$selectedItem;
            }
            _addTag(tag) {
                if (this.el.querySelector(`[data-id="${tag.id}"]`))
                    return false;
                let facet = $(`<div class="facet-view badge bg-secondary">
        <span class="facet-value">${tag.text}</span>
        <span class="fas fa-times facet-remove"></span>
        </div>`)[0];
                facet.querySelector('.facet-remove').addEventListener('click', () => this.removeTag(tag));
                facet.setAttribute('data-id', tag.id);
                this._tags.push(tag);
                this._facets.push(facet);
                this.el.insertBefore(facet, this.input);
                return true;
            }
            addTag(tag) {
                this._addTag(tag);
                this._setValues(this._tags);
                this.hideMenu();
            }
            removeTag(tag) {
                this._tags.splice(this._tags.indexOf(tag), 1);
                let facet = this.el.querySelector(`[data-id="${tag.id}"]`);
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
                let event = new CustomEvent('onChange', {
                    detail: {
                        tags,
                    }
                });
                this.el.dispatchEvent(event);
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
                this.menu = new DropdownMenu(this, { source: this._source, target: this.el });
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
                this.el.dispatchEvent(event);
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
                if (value) {
                    this.input.value = value.text;
                    if (this.allowOpen)
                        this.el.classList.add('allow-open');
                }
                else {
                    this.input.value = '';
                    if (this.allowOpen)
                        this.el.classList.remove('allow-open');
                }
            }
            get selectedValue() {
                if (this.$selectedItem) {
                    return this.$selectedItem.id;
                }
            }
            get value() {
                return this.selectedValue;
            }
            set value(value) {
                if (Array.isArray(this._source)) {
                    for (const item of this._source)
                        if (item.id === value) {
                            this.selectedItem = item;
                            return;
                        }
                }
            }
        }
        UI.BaseAutoComplete = BaseAutoComplete;
        class InputAutoComplete extends BaseAutoComplete {
            _create(el) {
                super._create(el);
                const model = el.getAttribute('data-model');
                if (model) {
                    let svc = new Katrid.Services.ModelService(model);
                    this.setSource(async (query) => {
                        let res = await svc.searchByName({
                            args: [query.term]
                        });
                        return res.items;
                    });
                }
            }
        }
        UI.InputAutoComplete = InputAutoComplete;
        Katrid.component('input-autocomplete', {
            props: ['modelValue', 'items'],
            template: '<input-autocomplete/>',
            mounted() {
                let el = this.$el;
                let ac = new InputAutoComplete({ el });
                this.$el._autocomplete = ac;
                if (this.items)
                    ac.setSource(this.items);
                this.$el.addEventListener('selectItem', (evt) => {
                    this.$emit('update:modelValue', evt.detail.item);
                });
                if (this.modelValue)
                    ac.selectedItem = this.modelValue;
            },
            watch: {
                modelValue: function (value) {
                    if (value !== this.$el._autocomplete.selectedItem)
                        this.$el._autocomplete.selectedItem = value;
                }
            }
        });
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        ui.InputAutoComplete = Katrid.UI.InputAutoComplete;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
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
                    this.allowCreateNew = this.el.getAttribute('allow-create') !== 'false';
                    this.allowAdvancedSearch = this.el.getAttribute('allow-search') !== 'false';
                    let name = this.el.getAttribute('name');
                    this.field = field;
                    this.actionView = this.el.closest('action-view');
                    const vm = options.vm;
                    if (field?.choices)
                        this.setSource(field.choices);
                    else {
                        this.setSource(async (query) => {
                            let domain = this.filter || this.field.filter;
                            if (domain && (typeof domain === 'string'))
                                domain = JSON.parse(domain);
                            if (this.field.vFilter) {
                                const newDomain = eval(`(function($parent, ${Object.keys(vm)}) {return ${this.field.vFilter}})`).call(vm, vm.$parent, ...Object.values(vm));
                                if (newDomain) {
                                    if (domain)
                                        domain = Object.assign({}, domain);
                                    else
                                        domain = Object.assign({}, domain);
                                    domain = Object.assign(domain, newDomain);
                                }
                            }
                            let format = 'html';
                            let data = {
                                args: [query.term],
                                kwargs: {
                                    count: 1,
                                    page: query.page,
                                    filter: domain,
                                    format,
                                    name_fields: this.el.getAttribute('name-fields')?.split(",") || null
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
                                                if (v?.items)
                                                    this.setValue(v.items[0]);
                                            }
                                        }
                                    });
                                return items;
                            }
                            else {
                            }
                        });
                    }
                    if (name && this.actionView?.view) {
                        this.field = this.actionView.view.fields[name];
                    }
                }
            }
            Controls.InputForeignKeyElement = InputForeignKeyElement;
            Katrid.component('field-foreignkey', {
                props: ['modelValue'],
                template: '<div class="input-autocomplete"><slot/></div>',
                mounted() {
                    let el = this.$el;
                    let ac = new InputForeignKeyElement({ el });
                    this.$el._autocomplete = ac;
                    this.$field = this.$parent.$fields[this.$attrs.name];
                    ac.bind({ vm: this.$parent, field: this.$field, view: this.$parent.$view, model: this.$parent.$view.model });
                    this.$el.addEventListener('selectItem', (evt) => {
                        this.$emit('update:modelValue', evt.detail.item);
                    });
                    if (this.modelValue)
                        ac.selectedItem = this.modelValue;
                },
                watch: {
                    modelValue: function (value) {
                        if (value !== this.$el._autocomplete.selectedItem)
                            this.$el._autocomplete.selectedItem = value;
                    }
                }
            });
            Katrid.component('input-tags', {
                props: ['modelValue'],
                template: '<div class="input-autocomplete"><slot/></div>',
                mounted() {
                    let el = this.$el;
                    let ac = new InputForeignKeyElement({ el });
                    ac.multiple = true;
                    this.$el._autocomplete = ac;
                    this.$field = this.$parent.$fields[this.$attrs.name];
                    ac.bind({ vm: this.$parent, field: this.$field, view: this.$parent.$view, model: this.$parent.$view.model });
                    this.$el.addEventListener('onChange', (evt) => {
                        this.$emit('update:modelValue', evt.detail.tags);
                    });
                    if (this.modelValue) {
                        ac.selectedItem = this.modelValue;
                    }
                },
                watch: {
                    modelValue: function (value) {
                        this.$el._autocomplete.tags = value;
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
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        function inputRegexPattern(el, pattern) {
            const re = new RegExp(pattern);
            el.addEventListener('keypress', (evt) => {
                if (!evt.ctrlKey && !evt.altKey && re.test(evt.key)) {
                    return true;
                }
                evt.preventDefault();
            });
        }
        ui.inputRegexPattern = inputRegexPattern;
        Katrid.directive('input', {
            mounted(el) {
                if (el.hasAttribute('input-re-pattern')) {
                    inputRegexPattern(el, el.getAttribute('input-re-pattern'));
                }
            }
        });
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var forms;
    (function (forms) {
        var widgets;
        (function (widgets) {
            class ModelPermissionsWidget extends katrid.admin.ModelPermissionsWidget {
            }
            widgets.ModelPermissionsWidget = ModelPermissionsWidget;
            Katrid.component('model-permissions', {
                props: ['modelValue'],
                emits: ['update:modelValue'],
                template: '<div class="model-permissions-widget"></div>',
                watch: {
                    modelValue: function (value) {
                        if (!this._changing)
                            this._modelPermissions.loadPerms(value);
                    }
                },
                mounted() {
                    this._modelPermissions = new ModelPermissionsWidget(this.$el);
                    this._modelPermissions.allowByDefault = true;
                    this._modelPermissions.load();
                    this._modelPermissions.onDidChange = async () => {
                        try {
                            this._changing = true;
                            let val = this._modelPermissions.allowed;
                            if (val)
                                val.$valid = true;
                            this.$emit('update:modelValue', val);
                            await this.$nextTick();
                        }
                        finally {
                            this._changing = false;
                        }
                    };
                }
            });
            class ModelPermissions extends Katrid.Forms.Widgets.Widget {
                constructor() {
                    super(...arguments);
                    this.formControl = (fieldEl) => {
                        const div = document.createElement('model-permissions');
                        div.className = 'model-permissions-widget';
                        div.setAttribute('v-model', `record.${this.field.name}`);
                        div.setAttribute('readonly', `${this.field.readonly}`);
                        return div;
                    };
                }
            }
            Katrid.Forms.Widgets.registry['ModelPermissions'] = ModelPermissions;
        })(widgets = forms.widgets || (forms.widgets = {}));
    })(forms = katrid.forms || (katrid.forms = {}));
})(katrid || (katrid = {}));
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
<button class="btn btn-sm btn-secondary btn-action-add" type="button" v-on:click="createNew()" v-show="$parent.changing && !readonly">${Katrid.i18n.gettext('Add')}</button>
<button class="btn btn-sm btn-secondary btn-action-delete" type="button" v-on:click="deleteSelection()" v-show="$parent.changing && !readonly && selectionLength">${Katrid.i18n.gettext('Delete')}</button>
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
        }
        class SubWindowAction {
            constructor(config) {
                this.model = config.model;
            }
        }
        async function createDialog(config) {
            let form = config.field.getView('form');
            form.parentVm = config.parentVm;
            form.datasource.parent = config.master;
            form.datasource.field = config.field;
            let relField = form.fields[config.field.info.field];
            if (relField)
                relField.visible = false;
            await form.showDialog(config.options);
            return form;
        }
        Katrid.component('onetomany-field', {
            props: ['modelValue'],
            beforeCreate() {
                let field = this.$parent.$fields[this.$attrs.name];
                this.$field = field;
                this.$view = field.getView(field.viewMode);
                this.$fields = this.$view.fields;
                this.$view.datasource.vm = this;
                this.$view.datasource.field = this.$field;
                this.$view.datasource.parent = this.$parent.$view.datasource;
            },
            render() {
                if (!this.$compiledTemplate) {
                    let el = beforeRender(this.$field, this.$view.renderTemplate(this.$view.domTemplate()));
                    this.$columns = this.$view.$columns;
                    this.$compiledTemplate = Vue.compile(el);
                }
                return this.$compiledTemplate(this);
            },
            created() {
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
                        if (this.$field.editor === 'inline') {
                            if (!this.$parent.changing)
                                return;
                            this.$view.save();
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
                            let buttons = (parentChanging && [
                                { text: Katrid.i18n.gettext('Save'), click: 'saveAndClose()' },
                                { text: Katrid.i18n.gettext('Discard'), click: 'discardAndClose()' },
                            ]) || ['close'];
                            let form = await createDialog({
                                index,
                                field: this.$field,
                                parentVm: this.$parent,
                                master: this.$parent.$view.datasource,
                                options: {
                                    keyboard: false,
                                    backdrop: 'static',
                                    buttons,
                                },
                            });
                            if ((!record.$loaded) && (record.$state === Katrid.Data.RecordState.unmodified)) {
                                let newRec = await form.datasource.get({ id: record.id });
                            }
                            else {
                                form.datasource.record = this.records[index];
                            }
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
                    }
                    finally {
                        this.$editing = false;
                    }
                },
                rowKeyDown(event) {
                    let control = event.target;
                    if ((event.key === 'Escape') && !event.shiftKey && !event.altKey) {
                        let tr = control.closest('tr');
                        let formId = tr.getAttribute('data-form-id');
                        this.$discard();
                    }
                    else if ((event.key === 'Enter') && !event.shiftKey && !event.altKey) {
                        let formId = control.closest('tr').getAttribute('data-form-id');
                        this.$view.save(formId);
                    }
                },
                $flush() {
                    if (this.$field.editor === 'inline')
                        this.$view.save();
                },
                $discard() {
                    this.$view.discard();
                    for (let rec of this.records) {
                        if (rec.$state === Katrid.Data.RecordState.created) {
                            this.records.splice(this.modelValue.indexOf(rec), 1);
                        }
                        if (rec.$$discard)
                            rec.$$discard();
                    }
                },
                $onChange() {
                    this.$parent.$view.$onFieldChange(this.$field, this.records);
                    this.$emit('change', this.value);
                    this.$emit('update:modelValue', this.modelValue);
                },
                $addRecord(data) {
                    let ds = this.$view.datasource;
                    let rec = ds.model.newRecord(data, ds);
                    rec.$flush();
                    if (!this.records)
                        this.records = [];
                    this.records.push(rec);
                },
                recordContextMenu(record, index, event) {
                    Forms.listRecordContextMenu.call(this, ...arguments);
                },
                tableContextMenu(event) {
                    Forms.tableContextMenu.call(this, ...arguments, { pasteAllowed: this.$field.pasteAllowed && this.$parent.$view.changing });
                },
                async createNew() {
                    if (this.$editing)
                        return;
                    try {
                        if (this.$field.editor === 'inline') {
                            this.$view.insert();
                        }
                        else {
                            this.$editing = true;
                            let form = await createDialog({
                                field: this.$field,
                                parentVm: this.$parent,
                                master: this.$parent.$view.datasource,
                                options: {
                                    keyboard: false,
                                    backdrop: 'static',
                                    buttons: [
                                        { text: Katrid.i18n.gettext('Save'), click: 'saveAndClose()' },
                                        { text: Katrid.i18n.gettext('Discard'), click: 'discardAndClose()' },
                                    ],
                                },
                            });
                            form.insert();
                            if (!this.records)
                                this.records = [];
                            if (!this.$parent.record[this.$field.name])
                                this.$parent.record[this.$field.name] = this.records;
                            let res = await form.dialogPromise;
                            if (res) {
                                let rec = form.record;
                                this.records.push(rec);
                                this.$onChange();
                            }
                            return res;
                        }
                    }
                    finally {
                        this.$editing = false;
                    }
                },
                toggleAll() {
                    this._invalidateEditor();
                    Katrid.Forms.selectionToggleAll.call(this, ...arguments);
                },
                selectToggle(record) {
                    this._invalidateEditor();
                    Katrid.Forms.selectionSelectToggle.call(this, ...arguments);
                },
                unselectAll() {
                    this._invalidateEditor();
                    Katrid.Forms.unselectAll.call(this, ...arguments);
                },
                deleteSelection() {
                    this._invalidateEditor();
                    Katrid.Forms.selectionDelete.call(this, ...arguments);
                },
                _invalidateEditor() {
                    this.$view.discard();
                }
            },
            mounted() {
                this.$view.element = this.$el.parentElement;
                this.$view.vm = this;
                let modelValue = this.modelValue;
                if (modelValue) {
                    this.records = modelValue;
                }
            },
            emits: ['update:modelValue'],
            computed: {
                $fields() {
                    console.debug('get $fields', this.$view.fields);
                    return this.$view.fields;
                }
            },
            watch: {
                modelValue(value) {
                    if (value) {
                    }
                    else
                        value = [];
                    this.records = value;
                },
            },
            directives: Katrid.directivesRegistry,
        });
        Katrid.component('field-onetomany', {
            template: '<div></div>',
            mounted() {
                let field = this.$parent.$view.fields[this.$attrs.name];
                console.debug('el', field);
                let widget = new OneToManyGrid(field);
                widget.appendTo(this.$el);
                this.$el.$widget = widget;
            },
            watch: {
                modelValue(val) {
                    if (val) {
                        console.debug('field val', val);
                    }
                }
            }
        });
        class OneToManyGrid {
            constructor(field) {
                this.field = field;
                this.editing = false;
            }
            newRecord() {
                if (this.editing)
                    return;
                try {
                    if (this.field.editor === 'inline') {
                        this.view.insert();
                    }
                    else if (this.field.editor === 'dialog') {
                        console.debug('form template', this.field.getView('form'));
                    }
                }
                finally { }
            }
            render(template) {
                let header = document.createElement('div');
                header.className = 'content-container-heading';
                let toolbar = document.createElement('div');
                toolbar.classList.add('grid-toolbar');
                toolbar.innerHTML = `
  <button class="btn btn-sm btn-secondary btn-action-add" type="button" v-show="$parent.changing && !readonly">${Katrid.i18n.gettext('Add')}</button>
  <button class="btn btn-sm btn-secondary btn-action-delete" type="button" v-on:click="deleteSelection()" v-show="$parent.changing && !readonly && selectionLength">${Katrid.i18n.gettext('Delete')}</button>
  `;
                toolbar.querySelector('.btn-action-add').addEventListener('click', () => this.newRecord());
                header.append(toolbar);
                let table = document.createElement('div');
                table.className = 'table-responsive';
                table.append(template);
                let fieldSection = document.createElement('div');
                fieldSection.className = 'onetomany-grid';
                fieldSection.append(header);
                fieldSection.append(table);
                return fieldSection;
            }
            appendTo(el) {
                console.debug('o2m field', this.field.viewMode);
                let view = this.field.getView(this.field.viewMode);
                let widgetEl = this.render(view.renderTemplate(view.domTemplate()));
                this.view = view;
                el.append(widgetEl);
            }
        }
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var forms;
    (function (forms) {
        var widgets;
        (function (widgets) {
            Katrid.component('record-collection-field', {
                template: '<div class="table-responsive"></div>',
                mounted() {
                    console.debug('rec collection field', arguments);
                }
            });
            class TabularDocumentList extends Katrid.Forms.Widgets.Widget {
                constructor() {
                    super(...arguments);
                    this.formControl = (fieldEl) => {
                        const fields = fieldEl.querySelector('fields');
                        const table = document.createElement('table');
                        table.className = 'table';
                        table.innerHTML = `<thead><tr></tr></thead><tbody><tr v-for="subRecord in record.${this.field.name}"></tr></tbody>`;
                        if (fields) {
                            for (const fEl of fields.children) {
                                if (fEl.tagName === 'FIELD') {
                                    this.createFieldControl(fEl, table);
                                }
                            }
                        }
                        let th = document.createElement('th');
                        th.innerHTML = `<button type="button" class="btn btn-sm btn-danger" v-on:click="record.${this.field.name}.splice($index, 1)"><span class="fa fa-remove"></span></button>`;
                        table.tBodies[0].rows[0].append(th);
                        const div = document.createElement('div');
                        const btnAdd = document.createElement('button');
                        btnAdd.className = 'btn btn-sm btn-secondary';
                        btnAdd.innerText = katrid.i18n.gettext('Add');
                        btnAdd.type = 'button';
                        btnAdd.setAttribute('v-if', 'editing');
                        btnAdd.setAttribute('v-on:click', `record.${this.field.name} ??= [];record.${this.field.name}.push({})`);
                        div.append(btnAdd);
                        div.append(table);
                        return div;
                    };
                }
                createFieldControl(fieldEl, table) {
                    const th = document.createElement('th');
                    const td = document.createElement('td');
                    th.innerHTML = fieldEl.getAttribute('label') || fieldEl.getAttribute('name');
                    td.innerHTML = `<span class="form-field" v-text="subRecord.${fieldEl.getAttribute('name')}"></span><input type="text" v-model="record.${fieldEl.getAttribute('name')}" class="form-control">`;
                    table.tHead.rows[0].append(th);
                    table.tBodies[0].rows[0].append(td);
                }
            }
            Katrid.Forms.Widgets.registry['TabularDocumentList'] = TabularDocumentList;
        })(widgets = forms.widgets || (forms.widgets = {}));
    })(forms = katrid.forms || (katrid.forms = {}));
})(katrid || (katrid = {}));
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
            Katrid.component('table-field', {
                template: '<div class="table-responsive"><slot></slot></div>',
                mounted() {
                    let el = this.$parent.$view.element;
                    this.$name = this.$el.getAttribute('name');
                    this.$elView = el;
                    this.$recordLoaded = (...args) => this.recordLoaded(...args);
                    el.addEventListener('record-changed', this.$recordLoaded);
                },
                unmounted() {
                    this.$elView.removeEventListener('record-changed', this.$recordLoaded);
                },
                methods: {
                    async recordLoaded(event) {
                        if (this.$timeout)
                            clearTimeout(this.$timeout);
                        this.$timeout = setTimeout(async () => {
                            let rec = event.detail.record;
                            let data = {};
                            let field = this.$parent.$fields[this.$name];
                            if (field?.info) {
                                data[field.info.field || 'id'] = rec.id;
                                let res = await this.$parent.$view.model.service.getFieldChoices({ field: this.$name, filter: data });
                                rec[this.$name] = res.data;
                            }
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
    var Forms;
    (function (Forms) {
        var Widgets;
        (function (Widgets) {
            Katrid.directive('ui-tooltip', {
                mounted(el, binding, vnode) {
                    const field = binding.value;
                    if (field instanceof Katrid.Data.Field) {
                        field.getTooltip(el);
                    }
                }
            });
        })(Widgets = Forms.Widgets || (Forms.Widgets = {}));
    })(Forms = Katrid.Forms || (Katrid.Forms = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class UserCommentsElement extends ui.WebComponent {
            get datasource() {
                return this._datasource;
            }
            set datasource(value) {
                if (this._callback && this._datasource)
                    this._datasource.unregisterCallback(this._callback);
                this._callback = (record) => {
                    if (this._created)
                        this.parentNotification(record);
                };
                this._datasource = value;
                if (value)
                    value.registerCallback(this._callback);
            }
            create() {
                super.create();
                this._files = [];
                this.createEditor();
                this._panel = document.createElement('div');
                this._panel.className = 'container comments';
                this.appendChild(this._panel);
            }
            createEditor() {
                let div = document.createElement('div');
                div.innerHTML = `
      <div class="container">
          <h3>${Katrid.i18n.gettext('Comments')}</h3>
          <div class="form-group">
          <button class="btn btn-secondary btn-show-editor">${Katrid.i18n.gettext('New message')}</button>
          <button class="btn btn-secondary">${Katrid.i18n.gettext('Log note')}</button>
          </div>
          <div id="mail-editor" style="display: none;">
            <div class="form-group">
              <textarea id="mail-msgEditor" class="form-control"></textarea>
            </div>
            <div class="form-group">
              <button class="btn btn-default" type="button" onclick="$(this).next().click()"><i class="fa fa-paperclip"></i></button>
              <input class="input-file-hidden" type="file" multiple>
            </div>
            <div class="form-group">
              <ul class="list-inline attachments-area">
              </ul>
            </div>
            <div class="from-group">
              <button class="btn btn-primary btn-send">${Katrid.i18n.gettext('Send')}</button>
            </div>
          </div>

          <hr>`;
                this._textEditor = div.querySelector('textarea');
                this._file = div.querySelector('input');
                this._file.addEventListener('change', event => this.addFile(event));
                div.querySelector('button.btn-show-editor').addEventListener('click', () => this.showEditor());
                div.querySelector('button.btn-send').addEventListener('click', () => this.sendMessage(this._textEditor.value));
                this.appendChild(div);
            }
            showEditor() {
                $(this.querySelector('#mail-editor')).show();
                this._textEditor.focus();
                this._textEditor.scrollIntoView();
            }
            closeEditor() {
                $(this.querySelector('#mail-editor')).hide();
                this.querySelector('.attachments-area').innerHTML = '';
                this._files = [];
            }
            addFile(event) {
                for (let f of event.target.files) {
                    this._files.push(f);
                    let li = `<li title="${Katrid.i18n.gettext('Delete this attachment')}">${f.name} <i class="fa fa-times"></i></li>`;
                    this.querySelector('.attachments-area').insertAdjacentHTML('beforeend', li);
                }
            }
            async _sendMessage(msg, attachments) {
                let svc = new Katrid.Services.ModelService('mail.message');
                console.log(attachments);
                if (attachments)
                    attachments = attachments.map(obj => obj.id);
                let comment = await svc.post('post_message', {
                    args: [this._datasource.model.name, this._recordId],
                    kwargs: {
                        content: msg, content_subtype: 'html', format: true, attachments: attachments
                    }
                });
                this._panel.insertAdjacentElement('afterbegin', this._createComment(comment));
            }
            async sendMessage(msg) {
                this._textEditor.value = '';
                let files = this._files;
                this.closeEditor();
                console.log('files', files);
                let res = await Katrid.Services.Attachments.upload({ files: files }, { model: this._datasource.model, recordId: this._recordId });
                console.log('att', res);
                await this._sendMessage(msg, res.result);
            }
            async parentNotification(record) {
                this._panel.innerHTML = '';
                let id = this.datasource.recordId;
                this._recordId = id;
                if (id != null) {
                    let svc = new Katrid.Services.ModelService('mail.message');
                    let res = await svc.rpc('get_messages', null, {
                        model_name: this.datasource.model.name, id
                    });
                    if (res.comments)
                        for (let comment of res.comments)
                            this._panel.appendChild(this._createComment(comment));
                }
            }
            _createComment(comment) {
                let attachments = comment.attachments?.length ? `
      <div class="form-group">
        <ul class="list-inline">
          ${comment.attachments.map(file => file.mimetype.startsWith('image') ?
                    `<li><div class="comment-preview-image" style="width: 16%;height:100px;background-image:url('/web/content/${file.id}')"></div></li>` :
                    `<li><a href="/web/content/${file.id}/?download">${file.name}</a></li>`).join('')}
        </ul>
      </div>
` : '';
                let div = document.createElement('div');
                div.className = 'comment d-flex';
                div.innerHTML = `
        <div class="flex-shrink-0"><img src="/static/admin/assets/img/avatar.png" class="avatar rounded"></div>
        <div class="flex-grow-1 ms-3">
          <strong>${comment.author_name}</strong> -
          <span class="timestamp text-muted" title="${moment(comment.date_time).format('LLLL')}"> ${moment(comment.date_time).fromNow()}</span>
          <div class="form-group">
            ${comment.content}
          </div>

          ${attachments}

        </div>
      `;
                return div;
            }
        }
        ui.UserCommentsElement = UserCommentsElement;
        Katrid.define('user-comments', UserCommentsElement);
        Katrid.component('user-comments', {
            template: '<user-comments/>',
            mounted() {
                this.$el.datasource = this.$parent.$view?.datasource;
            }
        });
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        class ClipboardManager {
            constructor(designer) {
                this.designer = designer;
            }
            async getClipboardData() {
                let data = await navigator.clipboard.readText();
                if (data) {
                    data = JSON.parse(data);
                    if (data.type === 'selection') {
                        return data;
                    }
                }
            }
            prepareCopyData() {
                const objects = this.designer.selection.map(obj => obj.dump());
                return JSON.stringify({ type: 'selection', objects });
            }
            async copy() {
                await navigator.clipboard.writeText(this.prepareCopyData());
            }
            pasteData(data) {
                if (data.type !== 'selection') {
                    console.error('Invalid clipboard data');
                    return;
                }
                let objs = [];
                for (let obj of data.objects) {
                    const lo = this.designer.loadObject(obj);
                    this.designer.pasteObject(lo).locked = false;
                    this.designer.addToSelection(lo);
                    objs.push(lo);
                }
                this.designer.clearSelection();
                return objs;
            }
            async paste() {
                const data = await this.getClipboardData();
                if (data) {
                    return this.pasteData(data);
                }
            }
        }
        design.ClipboardManager = ClipboardManager;
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        class Component {
            constructor(owner) {
                this.components = new Set();
                this.owner = owner;
                owner?.insertComponent(this);
            }
            get name() {
                return this._name;
            }
            set name(value) {
                this.setName(value);
            }
            setName(value) {
                this._name = value;
            }
            destroy() {
                if (this.freeNotifies)
                    for (const c of this.freeNotifies)
                        c.notification(this, 'remove');
                for (const c of this.children)
                    c.destroy();
                this.components = new Set();
            }
            insertComponent(component) {
                if (!this.components)
                    this.components = new Set();
                this.components.add(component);
                component.owner = this;
            }
            removeComponent(component) {
                this.components.delete(component);
                for (const c of this.components)
                    c.notification(component, 'remove');
            }
            findComponent(name) {
                if (name && this.components)
                    for (const c of this.components)
                        if (c.name === name)
                            return c;
            }
            notification(obj, operation) {
                if (operation === 'remove' && this.freeNotifies?.has(obj))
                    this.freeNotifies.delete(obj);
                for (const c of this.components)
                    c.notification(obj, operation);
            }
            freeNotification(obj) {
                if (!this.freeNotifies)
                    this.freeNotifies = new Set();
                this.freeNotifies.add(obj);
            }
            getType() {
                return this.constructor.name;
            }
            dump() {
                const d = {
                    type: this.getType(),
                    name: this.name,
                };
                if (this.children) {
                    d.children = this.children.map(c => c.dump());
                }
                return d;
            }
            load(info) {
                this.name = info.name;
            }
        }
        design.Component = Component;
        design.pageSizes = {
            A3: { width: 1122, height: 1587 },
            A4: { width: 794, height: 1122 },
            A5: { width: 583, height: 794 },
            Letter: { width: 816, height: 1071 },
            Auto: { width: -1, height: -1 },
            Custom: { width: 0, height: 0 },
            Responsive: { width: "100%", height: -1 },
            WebSmall: { width: 768, height: 1024 },
            WebMedium: { width: 1024, height: 768 },
            WebLarge: { width: 1280, height: 1024 },
        };
        let PageOrientation;
        (function (PageOrientation) {
            PageOrientation[PageOrientation["Portrait"] = 0] = "Portrait";
            PageOrientation[PageOrientation["Landscape"] = 1] = "Landscape";
        })(PageOrientation = design.PageOrientation || (design.PageOrientation = {}));
        let HAlign;
        (function (HAlign) {
            HAlign[HAlign["left"] = 0] = "left";
            HAlign[HAlign["center"] = 1] = "center";
            HAlign[HAlign["right"] = 2] = "right";
            HAlign[HAlign["justify"] = 3] = "justify";
        })(HAlign = design.HAlign || (design.HAlign = {}));
        let VAlign;
        (function (VAlign) {
            VAlign[VAlign["top"] = 0] = "top";
            VAlign[VAlign["middle"] = 1] = "middle";
            VAlign[VAlign["bottom"] = 2] = "bottom";
        })(VAlign = design.VAlign || (design.VAlign = {}));
        let LineStyle;
        (function (LineStyle) {
            LineStyle[LineStyle["solid"] = 0] = "solid";
            LineStyle[LineStyle["dashed"] = 1] = "dashed";
            LineStyle[LineStyle["dotted"] = 2] = "dotted";
        })(LineStyle = design.LineStyle || (design.LineStyle = {}));
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        class PropertyEditor {
            static { this.tag = 'input'; }
            constructor(name, config) {
                this.name = name;
                this.config = config;
                this.caption = config?.caption;
                this.description = config?.description;
                this.placeholder = config?.placeholder;
                this.title = config?.title;
            }
            createEditor(typeEditor) {
                let editor = document.createElement('section');
                editor.classList.add('form-group', 'col-12');
                editor.setAttribute('prop-name', this.name);
                editor.classList.add('property-editor');
                if (this.caption)
                    this.createLabel(editor);
                if (this.cssClass)
                    editor.classList.add(this.cssClass);
                let input = this.createInput(typeEditor);
                let value = this.getValue(typeEditor);
                this.setValue(value, input);
                editor.append(input);
                if (this.title) {
                    editor.title = this.title;
                }
                return editor;
            }
            setValue(value, input) {
                if (value != null)
                    input.value = value;
            }
            createLabel(editor) {
                let label = document.createElement('label');
                label.innerText = this.caption || this.name;
                label.className = 'control-label';
                editor.appendChild(label);
            }
            createInput(typeEditor) {
                let input = document.createElement(this.constructor.tag);
                input.classList.add('form-control');
                if (this.placeholder)
                    input.placeholder = this.placeholder;
                this.createInputEvent(typeEditor, input);
                return input;
            }
            createInputEvent(typeEditor, input) {
                input.addEventListener('change', evt => this.inputChange(typeEditor, input, evt));
            }
            inputChange(typeEditor, input, evt) {
                this.apply(typeEditor, input.value);
            }
            getValue(typeEditor) {
                return typeEditor.targetObject[this.name];
            }
            apply(typeEditor, value) {
                typeEditor.targetObject[this.name] = value;
                typeEditor.setPropValue(this.name, value);
            }
        }
        design.PropertyEditor = PropertyEditor;
        class StringProperty extends PropertyEditor {
            createInput(typeEditor) {
                let el = super.createInput(typeEditor);
                el.spellcheck = false;
                return el;
            }
        }
        design.StringProperty = StringProperty;
        class NameStringProperty extends PropertyEditor {
        }
        design.NameStringProperty = NameStringProperty;
        class TextProperty extends StringProperty {
            static { this.tag = 'textarea'; }
        }
        design.TextProperty = TextProperty;
        class IntegerProperty extends PropertyEditor {
            createInput(typeEditor) {
                let el = super.createInput(typeEditor);
                el.type = 'number';
                return el;
            }
        }
        design.IntegerProperty = IntegerProperty;
        let CONTROL_COUNT = 0;
        class BooleanProperty extends PropertyEditor {
            createEditor(typeEditor) {
                let editor = document.createElement('section');
                editor.className = 'col-12 property-editor';
                editor.innerHTML = `<div class="form-check"><input class="form-check-input" type="checkbox" id="_el-input-${++CONTROL_COUNT}"><label class="form-check-label" for="_el-input-${CONTROL_COUNT}">${this.caption}</label></div>`;
                let input = editor.querySelector('input');
                input.checked = this.getValue(typeEditor);
                input.addEventListener('change', () => typeEditor.targetObject[this.name] = input.checked);
                return editor;
            }
        }
        design.BooleanProperty = BooleanProperty;
        class BackgroundProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('section');
                editor.className = 'col-12 property-editor';
                editor.innerHTML = `
      <table>
      <tr>
      <td><label>Background</label></td>
      <td style="width:100%">
      <input class="form-control" type="color" name="background-color">
      </td></tr>
      </table>
      `;
                const val = this.getValue(typeEditor) || {};
                const bgColor = editor.querySelector('input[name="background-color"]');
                if (val.color)
                    bgColor.value = val.color;
                else
                    bgColor.value = '#FFFFFF';
                bgColor.addEventListener('change', () => {
                    val.color = bgColor.value;
                    typeEditor.targetObject['background'] = val;
                });
                return editor;
            }
        }
        design.BackgroundProperty = BackgroundProperty;
        class FontProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('section');
                editor.className = 'col-12 property-editor';
                editor.style.textAlign = 'center';
                editor.innerHTML = `
<table>
<tr>
<td>
<select class="form-select form-select-sm" name="font-name">
<option value=""></option>
<option value="Arial">Arial</option>
<option value="Helvetica">Helvetica</option>
<option value="Times New Roman">Times New Roman</option>
<option value="Courier">Courier</option>
<option value="Courier New">Courier New</option>
</select>
</td>
<td>
<input class="form-control input-sm" type="number" name="font-size" value="9">
</td>
<td style="width:40px">
<input class="form-control input-sm" name="font-color" type="color">
</td>
</tr>
</table>
<div class="btn-group" style="width: 100%">
<input class="btn-check" type="checkbox" id="property-font-bold" name="font-bold">
<label class="btn btn-sm btn-outline-secondary" for="property-font-bold"><i class="fa-solid fa-bold"></i></label>
<input class="btn-check" type="checkbox" id="property-font-italic" name="font-italic">
<label class="btn btn-sm btn-outline-secondary" for="property-font-italic"><i class="fa-solid fa-italic"></i></label>
<input class="btn-check" type="checkbox" id="property-font-underline" name="font-underline">
<label class="btn btn-sm btn-outline-secondary" for="property-font-underline"><i class="fa-solid fa-underline"></i></label>
</div>
`;
                let val = this.getValue(typeEditor) || {};
                let bold = editor.querySelector('input[name="font-bold"]');
                if (val.bold)
                    bold.checked = true;
                bold.addEventListener('change', () => {
                    val.bold = bold.checked;
                    typeEditor.targetObject.font = val;
                });
                let italic = editor.querySelector('input[name="font-italic"]');
                if (val.italic)
                    italic.checked = true;
                italic.addEventListener('change', () => {
                    val.italic = italic.checked;
                    typeEditor.targetObject.font = val;
                });
                let underline = editor.querySelector('input[name="font-underline"]');
                if (val.underline)
                    underline.checked = true;
                underline.addEventListener('change', () => {
                    val.underline = underline.checked;
                    typeEditor.targetObject['font'] = val;
                });
                let fontName = editor.querySelector('select[name="font-name"]');
                fontName.value = typeEditor.targetObject.font?.name;
                fontName.addEventListener('change', () => {
                    val.name = fontName.value;
                    typeEditor.targetObject['font'] = val;
                });
                let fontColor = editor.querySelector('input[name="font-color"]');
                fontColor.value = typeEditor.targetObject['font']?.color;
                fontColor.addEventListener('change', () => {
                    val.color = fontColor.value;
                    typeEditor.targetObject['font'] = val;
                });
                let fontSize = editor.querySelector('input[name="font-size"]');
                if (typeEditor.targetObject['font']?.size) {
                    let size = typeEditor.targetObject['font'].size;
                    if (typeof size === 'number')
                        fontSize.value = size.toString();
                    else
                        fontSize.value = size.match(/(\d+)/)[0];
                }
                fontSize.addEventListener('change', () => {
                    val.size = fontSize.value;
                    typeEditor.targetObject['font'] = val;
                });
                return editor;
            }
        }
        design.FontProperty = FontProperty;
        class BorderProperty extends PropertyEditor {
            createEditor(typeEditor) {
                let editor = document.createElement('div');
                editor.className = 'property-editor';
                editor.style.textAlign = 'center';
                editor.innerHTML = `
<div class="btn-group" style="width: 100%">
<input class="btn-check" type="checkbox" id="property-border-all" name="border-all">
<label class="btn btn-sm btn-outline-secondary" for="property-border-all"><i class="fa-duotone fa-border-all"></i></label>
<input class="btn-check" type="checkbox" id="property-border-top" name="border-top">
<label class="btn btn-sm btn-outline-secondary" for="property-border-top"><i class="fa-duotone fa-border-top"></i></label>
<input class="btn-check" type="checkbox" id="property-border-right" name="border-right">
<label class="btn btn-sm btn-outline-secondary" for="property-border-right"><i class="fa-duotone fa-border-right"></i></label>
<input class="btn-check" type="checkbox" id="property-border-bottom" name="border-bottom">
<label class="btn btn-sm btn-outline-secondary" for="property-border-bottom"><i class="fa-duotone fa-border-bottom"></i></label>
<input class="btn-check" type="checkbox" id="property-border-left" name="border-left">
<label class="btn btn-sm btn-outline-secondary" for="property-border-left"><i class="fa-duotone fa-border-left"></i></label>
<input class="form-control input-sm" name="border-color" type="color">
</div>
      `;
                let val = this.getValue(typeEditor) || {};
                let all = editor.querySelector('input[name="border-all"]');
                let top = editor.querySelector('input[name="border-top"]');
                let right = editor.querySelector('input[name="border-right"]');
                let bottom = editor.querySelector('input[name="border-bottom"]');
                let left = editor.querySelector('input[name="border-left"]');
                let color = editor.querySelector('input[name="border-color"]');
                if (val.all)
                    all.checked = true;
                else {
                    top.checked = val.top;
                    right.checked = val.right;
                    bottom.checked = val.bottom;
                    left.checked = val.left;
                }
                if (val.color != null)
                    color.value = typeof val.color === 'number' ? `#${val.color.toString(16)}` : val.color;
                else
                    color.value = 'transparent';
                all.addEventListener('change', () => {
                    val.all = all.checked;
                    top.checked = right.checked = bottom.checked = left.checked = val.top = val.right = val.bottom = val.left = val.all;
                    if (val.all)
                        typeEditor.targetObject[this.name] = val;
                    else
                        typeEditor.targetObject[this.name] = null;
                });
                top.addEventListener('change', () => {
                    val.top = top.checked;
                    all.checked = val.all = this.allChecked(val);
                    typeEditor.targetObject[this.name] = val;
                });
                right.addEventListener('change', () => {
                    val.right = right.checked;
                    all.checked = val.all = this.allChecked(val);
                    typeEditor.targetObject[this.name] = val;
                });
                bottom.addEventListener('change', () => {
                    val.bottom = bottom.checked;
                    all.checked = val.all = this.allChecked(val);
                    typeEditor.targetObject[this.name] = val;
                });
                left.addEventListener('change', () => {
                    val.left = left.checked;
                    all.checked = val.all = this.allChecked(val);
                    typeEditor.targetObject[this.name] = val;
                });
                color.addEventListener('change', () => {
                    val.color = color.value;
                    typeEditor.targetObject[this.name] = val;
                });
                return editor;
            }
            allChecked(val) {
                return val.top && val.right && val.bottom && val.left;
            }
        }
        design.BorderProperty = BorderProperty;
        class VAlignProperty extends PropertyEditor {
            createEditor(typeEditor) {
                let editor = document.createElement('div');
                editor.className = 'property-editor';
                editor.style.textAlign = 'center';
                editor.innerHTML = `
<div class="btn-group" style="width: 100%">
<input class="btn-check" type="radio" id="property-valign-top" name="valign" value="0">
<label class="btn btn-sm btn-outline-secondary" for="property-valign-top"><i class="fa-duotone fa-objects-align-top"></i></label>
<input class="btn-check" type="radio" id="property-valign-middle" name="valign" value="1">
<label class="btn btn-sm btn-outline-secondary" for="property-valign-middle"><i class="fa-duotone fa-objects-align-center-vertical"></i></label>
<input class="btn-check" type="radio" id="property-valign-bottom" name="valign" value="2">
<label class="btn btn-sm btn-outline-secondary" for="property-valign-bottom"><i class="fa-duotone fa-objects-align-bottom"></i></label>
</div>
      `;
                let val = this.getValue(typeEditor) || design.VAlign.top;
                let top = editor.querySelector('#property-valign-top');
                let middle = editor.querySelector('#property-valign-middle');
                let bottom = editor.querySelector('#property-valign-bottom');
                top.checked = val === design.VAlign.top;
                middle.checked = val === design.VAlign.middle;
                bottom.checked = val === design.VAlign.bottom;
                const change = evt => typeEditor.targetObject[this.name] = parseInt(evt.target.value);
                top.addEventListener('change', change);
                middle.addEventListener('change', change);
                bottom.addEventListener('change', change);
                return editor;
            }
        }
        design.VAlignProperty = VAlignProperty;
        class HAlignProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('div');
                editor.className = 'property-editor';
                editor.style.textAlign = 'center';
                editor.innerHTML = `
<div class="btn-group" style="width: 100%">
<input class="btn-check" type="radio" id="property-halign-left" name="halign" value="0">
<label class="btn btn-sm btn-outline-secondary" title="Align to left" for="property-halign-left"><i class="fa-duotone fa-align-left"></i></label>
<input class="btn-check" type="radio" id="property-halign-center" name="halign" value="1">
<label class="btn btn-sm btn-outline-secondary" title="Align to center" for="property-halign-center"><i class="fa-duotone fa-align-center"></i></label>
<input class="btn-check" type="radio" id="property-halign-right" name="halign" value="2">
<label class="btn btn-sm btn-outline-secondary" title="Align to right" for="property-halign-right"><i class="fa-duotone fa-align-right"></i></label>
<input class="btn-check" type="radio" id="property-halign-justify" name="halign" value="3">
<label class="btn btn-sm btn-outline-secondary" title="Justify" for="property-halign-justify"><i class="fa-duotone fa-align-justify"></i></label>
</div>`;
                let val = this.getValue(typeEditor) || design.HAlign.left;
                let left = editor.querySelector('#property-halign-left');
                let center = editor.querySelector('#property-halign-center');
                let right = editor.querySelector('#property-halign-right');
                let justify = editor.querySelector('#property-halign-justify');
                left.checked = val === design.HAlign.left;
                center.checked = val === design.HAlign.center;
                right.checked = val === design.HAlign.right;
                justify.checked = val === design.HAlign.justify;
                const change = evt => typeEditor.targetObject[this.name] = parseInt(evt.target.value);
                left.addEventListener('change', change);
                center.addEventListener('change', change);
                right.addEventListener('change', change);
                justify.addEventListener('change', change);
                return editor;
            }
        }
        design.HAlignProperty = HAlignProperty;
        class DisplayFormatProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('div');
                editor.className = 'property-editor';
                editor.style.textAlign = 'center';
                editor.innerHTML = `
      <table><tr>
      <td><select class="form-select" name="displayFormat"><option value=""></option>
        <option value="Numeric">Numeric</option>
        <option value="DateTime">DateTime</option>
        <option value="String">String</option>
      </select></td>
      <td><input class="form-control" type="text"></td>
      </tr></table>
`;
                const val = this.getValue(typeEditor) || {};
                const input = editor.querySelector('input');
                const kind = editor.querySelector('select');
                if (val.kind)
                    kind.value = val.kind;
                if (val.format)
                    input.value = val.format;
                const onChange = () => {
                    val.kind = kind.value;
                    val.format = input.value;
                    typeEditor.targetObject['displayFormat'] = val;
                };
                input.addEventListener('change', onChange);
                kind.addEventListener('change', onChange);
                return editor;
            }
        }
        design.DisplayFormatProperty = DisplayFormatProperty;
        class SizeProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('section');
                editor.classList.add('form-group', 'row', 'property-editor');
                editor.setAttribute('prop-name', this.name);
                let size = this.getValue(typeEditor);
                if (this.caption) {
                    this.createLabel(editor);
                }
                if (this.cssClass) {
                    editor.classList.add(this.cssClass);
                }
                let div = document.createElement('div');
                div.className = 'col-6';
                let igroup = createInputGroup('<i class="fa-regular fa-fw fa-arrows-left-right"></i>');
                let input = igroup.querySelector('input');
                input.addEventListener('blur', evt => typeEditor.setPropValue(this.name, {
                    width: parseInt(evt.target.value),
                    height: size.height,
                }));
                input.value = size?.width;
                div.append(igroup);
                editor.append(div);
                div = document.createElement('div');
                div.className = 'col-6';
                igroup = createInputGroup('<i class="fa-regular fa-fw fa-arrows-up-down"></i>');
                input = igroup.querySelector('input');
                input.addEventListener('blur', evt => typeEditor.setPropValue(this.name, {
                    width: size?.width,
                    height: parseInt(evt.target.value),
                }));
                input.value = size?.height;
                div.append(igroup);
                editor.append(div);
                return editor;
            }
        }
        design.SizeProperty = SizeProperty;
        class PaddingProperty extends PropertyEditor {
            createEditor(typeEditor) {
                let editor = document.createElement('section');
                editor.classList.add('form-group', 'row', 'property-editor');
                editor.setAttribute('prop-name', this.name);
                const padding = this.getValue(typeEditor) || {};
                if (this.caption)
                    this.createLabel(editor);
                if (this.cssClass)
                    editor.classList.add(this.cssClass);
                let input = createInputGroup({
                    className: 'col-6', targetObj: padding, targetProp: 'top', append: 'Top', dataType: Number,
                    callback: (evt, value) => typeEditor.setPropValue(this.name, padding),
                    value: padding.top,
                });
                editor.appendChild(input);
                input = createInputGroup({
                    className: 'col-6', targetObj: padding, targetProp: 'right', append: 'Right', dataType: Number,
                    callback: (evt, value) => typeEditor.setPropValue(this.name, padding),
                    value: padding.right,
                });
                editor.appendChild(input);
                input = createInputGroup({
                    className: 'col-6', targetObj: padding, targetProp: 'bottom', append: 'Bottom', dataType: Number,
                    callback: (evt, value) => typeEditor.setPropValue(this.name, padding),
                    value: padding.bottom,
                });
                editor.appendChild(input);
                input = createInputGroup({
                    className: 'col-6', targetObj: padding, targetProp: 'left', append: 'Left', dataType: Number,
                    callback: (evt, value) => typeEditor.setPropValue(this.name, padding),
                    value: padding.left,
                });
                editor.appendChild(input);
                return editor;
            }
        }
        design.PaddingProperty = PaddingProperty;
        class SelectProperty extends StringProperty {
            static { this.tag = 'select'; }
            getValues(typeEditor) {
                if (this.config.options) {
                    if (Array.isArray(this.config.options)) {
                        return this.config.options;
                    }
                    return Array.from(Object.entries(this.config.options).map(([k, v]) => ({
                        value: k.toString(),
                        text: v.toString()
                    })));
                }
                return;
            }
            createInput(typeEditor) {
                let input = super.createInput(typeEditor);
                input.className = 'form-select';
                input.innerHTML = `<option value="">(${this.caption || this.name})</option>`;
                for (let obj of this.getValues(typeEditor)) {
                    let el = document.createElement('option');
                    el.setAttribute('value', obj.value);
                    el.innerText = obj.text;
                    input.append(el);
                }
                input.addEventListener('change', () => this.selectItem(typeEditor, parseInt(input.value)));
                return input;
            }
            selectItem(typeEditor, index) {
            }
        }
        design.SelectProperty = SelectProperty;
        class AutoCompleteProperty extends StringProperty {
            static { this.tag = 'div'; }
            getValues(typeEditor) {
                if (this.config.options) {
                    if (Array.isArray(this.config.options)) {
                        return this.config.options;
                    }
                    return Array.from(Object.entries(this.config.options).map(([k, v]) => ({
                        value: k.toString(),
                        text: v.toString()
                    })));
                }
                return;
            }
            createInput(typeEditor) {
                let input = document.createElement('div');
                const ac = new katrid.ui.InputAutoComplete({
                    el: input,
                    source: this.getValues(typeEditor),
                });
                ac.value = this.getValue(typeEditor);
                ac.el.addEventListener('selectItem', (evt) => this.selectItem(typeEditor, evt.detail.item));
                return input;
            }
            selectItem(typeEditor, item) {
                if (item) {
                    typeEditor.targetObject[this.name] = item.id;
                }
                else {
                    typeEditor.targetObject[this.name] = null;
                }
            }
        }
        design.AutoCompleteProperty = AutoCompleteProperty;
        class ComponentProperty extends SelectProperty {
            constructor(name, config) {
                super(name, config);
                this.onGetValues = config.onGetValues;
            }
            getValues(typeEditor) {
                let vals = Array.from(this.onGetValues(typeEditor));
                this.values = vals.map(v => v.value);
                vals.forEach((v, i) => v.value = i);
                return vals;
            }
            selectItem(typeEditor, index) {
                typeEditor.targetObject[this.name] = this.values[index];
            }
            setValue(value, input) {
                if (value) {
                    const i = this.values.indexOf(value);
                    if (i > -1) {
                        input.value = i.toString();
                        return;
                    }
                }
                input.value = '';
            }
        }
        design.ComponentProperty = ComponentProperty;
        function createInputGroup(param) {
            let div;
            const igroup = document.createElement('div');
            igroup.className = 'input-group input-group-sm';
            const span = document.createElement('span');
            span.className = 'input-group-text';
            const input = document.createElement('input');
            input.className = 'form-control input-xl';
            igroup.append(input);
            igroup.append(span);
            if (typeof param === 'string')
                span.innerHTML = param;
            else {
                if (param.append)
                    span.innerHTML = param.append;
                if (param.value != null)
                    input.value = param.value;
                if (param.callback || (param.targetObj && param.targetProp)) {
                    input.addEventListener('blur', (evt) => {
                        let val = input.value;
                        if (param.targetObj && param.targetProp) {
                            if (val && param.dataType === Number)
                                val = val ? parseFloat(val) : null;
                            param.targetObj[param.targetProp] = val;
                        }
                        if (param.callback)
                            param.callback(evt, val);
                    });
                }
                if (param.className) {
                    div = document.createElement('div');
                    div.className = param.className;
                    div.append(igroup);
                    return div;
                }
            }
            return igroup;
        }
        class LocationProperty extends PropertyEditor {
            createEditor(typeEditor) {
                let editor = document.createElement('section');
                editor.classList.add('form-group', 'row', 'property-editor');
                editor.setAttribute('prop-name', this.name);
                let loc = this.getValue(typeEditor);
                if (this.caption)
                    this.createLabel(editor);
                if (this.cssClass)
                    editor.classList.add(this.cssClass);
                let div = document.createElement('div');
                div.className = 'col-6';
                let igroup = createInputGroup('x');
                let input = igroup.querySelector('input');
                input.value = loc?.x;
                input.addEventListener('blur', evt => typeEditor.setPropValue(this.name, {
                    x: parseInt(evt.target.value),
                    y: loc.y
                }));
                div.append(igroup);
                editor.append(div);
                div = document.createElement('div');
                div.className = 'col-6';
                igroup = createInputGroup('y');
                input = igroup.querySelector('input');
                input.addEventListener('blur', evt => typeEditor.setPropValue(this.name, {
                    x: loc.x,
                    y: parseInt(evt.target.value),
                }));
                input.value = loc?.y;
                div.append(igroup);
                editor.append(div);
                return editor;
            }
        }
        design.LocationProperty = LocationProperty;
        class HeightProperty extends PropertyEditor {
            createEditor(typeEditor) {
                const editor = document.createElement('section');
                editor.classList.add('form-group', 'row', 'property-editor');
                editor.setAttribute('prop-name', this.name);
                let size = this.getValue(typeEditor);
                if (this.caption) {
                    this.createLabel(editor);
                }
                if (this.cssClass) {
                    editor.classList.add(this.cssClass);
                }
                let div = document.createElement('div');
                div.className = 'col-12';
                let igroup = createInputGroup('<i class="fa-regular fa-fw fa-arrows-up-down"></i>');
                let input = igroup.querySelector('input');
                input.type = 'number';
                input.addEventListener('blur', evt => typeEditor.setPropValue(this.name, parseInt(evt.target.value)));
                input.value = size;
                div.append(igroup);
                editor.append(div);
                if (this.title) {
                    editor.title = this.title;
                }
                return editor;
            }
        }
        design.HeightProperty = HeightProperty;
        let componentEditorRegistry = [];
        function findComponentEditor(type) {
            for (let reg of componentEditorRegistry)
                if (reg.type === type)
                    return reg;
            for (let i = componentEditorRegistry.length - 1; i >= 0; i--) {
                let reg = componentEditorRegistry[i];
                if (reg.type && type.prototype instanceof reg.type)
                    return reg;
            }
            for (let reg of componentEditorRegistry) {
                if (reg.type === undefined)
                    return reg;
            }
        }
        design.findComponentEditor = findComponentEditor;
        function registerComponentEditor(type, editor) {
            let reg;
            for (let r of componentEditorRegistry)
                if (r.type === type) {
                    reg = r;
                    break;
                }
            if (!reg) {
                reg = { type, editor };
                componentEditorRegistry.push(reg);
            }
            else {
                reg.editor = editor;
            }
            editor.properties = editor.defineProperties();
        }
        design.registerComponentEditor = registerComponentEditor;
        function getComponentEditor(componentClass) {
            let reg = findComponentEditor(componentClass);
            if (reg)
                return reg.editor;
            return ComponentEditor;
        }
        design.getComponentEditor = getComponentEditor;
        class ComponentEditor {
            constructor(comp, designer) {
                this.designer = designer;
                this.targetObject = comp;
            }
            createEditor() {
                let editor = document.createElement('div');
                let props = this.constructor['properties'];
                for (let prop of props)
                    editor.append(prop.createEditor(this));
                return editor;
            }
            edit() {
                this.showEditor();
            }
            showEditor() {
            }
            setModified() {
                this.designer?.setModified();
            }
            static registerPropertyEditor(propName, editor) {
                this.properties[propName] = editor;
            }
            static defineProperties() {
                return [
                    new StringProperty('name', { placeholder: 'Object Name' }),
                ];
            }
            setPropValue(propName, value) {
                this.targetObject[propName] = value;
                this.designer?.changePropertyNotification([this.targetObject], propName, value);
            }
            createContextMenu() {
                const menu = new katrid.ui.ContextMenu();
                menu.add(_.gettext('Delete'), () => this.designer.deleteObject(this.targetObject));
                return menu;
            }
            createOutline() {
            }
        }
        design.ComponentEditor = ComponentEditor;
        class WidgetEditor extends ComponentEditor {
            static defineProperties() {
                return super.defineProperties().concat(new LocationProperty('location'), new SizeProperty('size'));
            }
        }
        design.WidgetEditor = WidgetEditor;
        class DataWidgetEditor extends ComponentEditor {
            static defineProperties() {
                return [
                    new StringProperty('title', { caption: 'Title' }),
                    new DataSourceProperty('datasource', { caption: 'Data Source' }),
                ];
            }
        }
        class DataSourceProperty extends SelectProperty {
            getValues(typeEditor) {
                return typeEditor.designer.report.datasources.map(ds => ({
                    value: ds,
                    text: ds.name
                }));
            }
            getValue(typeEditor) {
                if (typeEditor.targetObject.datasource) {
                    return appStudio.dataSources.indexOf(typeEditor.targetObject.datasource);
                }
            }
            apply(target, value) {
                target.targetObject.setDataSource(appStudio.dataSources[value]);
            }
        }
        design.DataSourceProperty = DataSourceProperty;
        class ChartEditor extends WidgetEditor {
            async showEditor() {
                this.targetObject.code = await showCodeEditor(this.targetObject.code, 'javascript', 'chart');
            }
        }
        class PieChartEditor extends ChartEditor {
            static defineProperties() {
                return super.defineProperties().concat(new AutocompleteProperty('values', { caption: 'Values' }), new AutocompleteProperty('labels', { caption: 'Labels' }));
            }
        }
        class DonutChartEditor extends PieChartEditor {
        }
        class BarChartEditor extends ChartEditor {
            static defineProperties() {
                return super.defineProperties().concat(new AutocompleteProperty('x', { caption: 'X' }), new AutocompleteProperty('y', { caption: 'Y' }));
            }
        }
        class LineChartEditor extends BarChartEditor {
        }
        async function showCodeEditor(value = null, lang = 'javascript', previewType = 'table') {
            let codeEditor;
            return new Promise((resolve, reject) => {
                requirejs(['vs/editor/editor.main'], function () {
                    let title = 'Code Editor';
                    let modal = document.createElement('div');
                    modal.className = 'modal';
                    modal.tabIndex = -1;
                    modal.innerHTML = `<div class="modal-dialog modal-xl modal-fullscreen-md-down" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${title}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
      <div class="code-editor"></div>
      </div>
      <div class="modal-footer">
      <button type="button" class="btn-ok btn btn-outline-secondary">OK</button>
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
      </div>
    </div>
  </div>`;
                    let lastTimeout;
                    let dlg = new bootstrap.Modal(modal);
                    modal.addEventListener('hidden.bs.modal', () => {
                        modal.remove();
                        resolve(false);
                    });
                    dlg.show();
                    let btnOk = modal.querySelector('.btn-ok');
                    if (!codeEditor) {
                        let editor = modal.querySelector('.code-editor');
                        let preview = modal.querySelector('.preview');
                        codeEditor = monaco.editor.create(editor, {
                            lang,
                        });
                        if (previewType === 'table') {
                            let tbl = new Katrid.bi.TableWidget(preview);
                            codeEditor.onDidChangeModelContent(event => {
                                if (lastTimeout)
                                    clearTimeout(lastTimeout);
                                lastTimeout = setTimeout(() => {
                                    let previewType = modal.getAttribute('preview-type');
                                    lastTimeout = null;
                                    let code = codeEditor.getModel().getValue();
                                    if (previewType === 'table')
                                        tbl.fromCode(code);
                                    else if (previewType === 'chart')
                                        chartPreview(preview, code);
                                    else
                                        preview.innerHTML = code;
                                }, 1000);
                            });
                        }
                    }
                    let defValue = value;
                    if (!defValue) {
                        if (lang === 'javascript') {
                            defValue = ['({})'].join('\n');
                        }
                        else if (lang === 'html') {
                            defValue = '<div></div>';
                        }
                    }
                    if (lang) {
                        monaco.editor.setModelLanguage(codeEditor.getModel(), lang);
                    }
                    codeEditor.getModel().setValue(defValue);
                    codeEditor.focus();
                    btnOk.addEventListener('click', () => {
                        resolve(codeEditor.getModel().getValue());
                        dlg.hide();
                    });
                });
            });
        }
        design.showCodeEditor = showCodeEditor;
        let _lastChart = null;
        function chartPreview(preview, code) {
            preview.innerHTML = '';
            if (_lastChart) {
                Plotly.purge(_lastChart);
                _lastChart = null;
            }
            let config = katrid.bi.getTraces(eval(code), this.studio);
            _lastChart = Plotly.newPlot(preview, config.traces, config.layout || { height: $(preview).height(), width: $(preview).width() }, { responsive: true });
        }
        function getTraces(config) {
            let kwargs = ['datasource', 'x', 'y', 'values', 'labels'];
            if (config.traces instanceof Function) {
                let traces = [];
                for (let t of config.traces()) {
                    let trace = {};
                    if (typeof t.datasource === 'string') {
                        let ds = appStudio.findComponent(t.datasource);
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
        async function createCodeEditor(dom, value = null, lang = 'javascript', previewType = 'table') {
            return new Promise((resolve, reject) => {
                requirejs(['vs/editor/editor.main'], function () {
                    let codeEditor = monaco.editor.create(dom, {
                        lang,
                    });
                    setTimeout(() => {
                        codeEditor.layout();
                    });
                    if (lang)
                        monaco.editor.setModelLanguage(codeEditor.getModel(), lang);
                    if (value)
                        codeEditor.getModel().setValue(value);
                    resolve(codeEditor);
                });
            });
        }
        design.createCodeEditor = createCodeEditor;
        registerComponentEditor(oui.design.Component, ComponentEditor);
        registerComponentEditor(oui.design.BaseWidget, WidgetEditor);
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        class GrabHandle {
            constructor(el) {
                this.el = el;
                this.width = 8;
                this.height = 8;
            }
            set left(value) {
                this.el.style.left = `${value}px`;
            }
            set top(value) {
                this.el.style.top = `${value}px`;
            }
            set width(value) {
                this.el.style.width = `${value}px`;
            }
            set height(value) {
                this.el.style.height = `${value}px`;
            }
        }
        class GrabHandles {
            constructor(config) {
                this._dragging = false;
                this.gridX = 4;
                this.gridY = 4;
                this.snapToGrid = false;
                this.container = config.container;
                this.target = config.target;
                this.onObjectResized = config.onObjectResized;
                this.onObjectResizing = config.onObjectResizing;
                this.designer = config.designer;
                this.handles = [];
                this.createHandles();
                this.setPosition();
                if (config.snapToGrid) {
                    this.gridX = config.gridX;
                    this.gridY = config.gridY;
                    this.snapToGrid = true;
                }
            }
            set dragging(value) {
                this._dragging = value;
                this.designer.resizing = value;
            }
            get dragging() {
                return this._dragging;
            }
            createHandle() {
                let h = document.createElement('span');
                h.classList.add('resize-handle');
                this.handles.push(h);
                return h;
            }
            clear() {
                for (let handle of this.handles) {
                    handle.remove();
                }
                this.handles = [];
            }
            setPosition() {
                const rect = this.target.getClientRect();
                if (this.designer.zoomFactor !== 1) {
                    rect.x *= this.designer.zoomFactor;
                    rect.y *= this.designer.zoomFactor;
                    rect.width *= this.designer.zoomFactor;
                    rect.height *= this.designer.zoomFactor;
                }
                let handle = new GrabHandle(this.bottomLeft);
                handle.left = rect.left - 3;
                handle.top = rect.bottom - 5;
                handle = new GrabHandle(this.middleLeft);
                handle.left = rect.left - 3;
                handle.top = rect.bottom - rect.height / 2 - 4;
                handle = new GrabHandle(this.topLeft);
                handle.left = rect.left - 3;
                handle.top = rect.top - 3;
                handle = new GrabHandle(this.topRight);
                handle.left = rect.right - 4;
                handle.top = rect.top - 3;
                handle = new GrabHandle(this.middleRight);
                handle.left = rect.right - 4;
                handle.top = rect.bottom - rect.height / 2 - 4;
                handle = new GrabHandle(this.bottomRight);
                handle.left = rect.right - 4;
                handle.top = rect.bottom - 5;
                handle = new GrabHandle(this.topCenter);
                handle.left = rect.right - rect.width / 2 - 4;
                handle.top = rect.top - 3;
                handle = new GrabHandle(this.bottomCenter);
                handle.left = rect.right - rect.width / 2 - 4;
                handle.top = rect.bottom - 5;
            }
            _setGrabHandle() {
                this.topLeft.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    evt.stopPropagation();
                    evt.preventDefault();
                    const targetHandle = evt.target;
                    let ox = evt.clientX;
                    let oy = evt.clientY;
                    if (this.snapToGrid) {
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    }
                    this.dragging = true;
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let y = evt.clientY;
                            let x = evt.clientX;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dx = x - ox;
                            let dy = y - oy;
                            if (dx || dy) {
                                this.applyRect(dx, dy, -dx, -dy);
                                if (dx)
                                    ox = x;
                                if (dy)
                                    oy = y;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.topRight.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    const targetHandle = evt.target;
                    let ox = evt.clientX;
                    let oy = evt.clientY;
                    if (this.snapToGrid) {
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    }
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let x = evt.clientX;
                            let y = evt.clientY;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dx = x - ox;
                            let dy = y - oy;
                            if (dx || dy) {
                                this.applyRect(0, dy, dx, -dy);
                                if (dx)
                                    ox = x;
                                if (dy)
                                    oy = y;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.setPointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.bottomRight.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    let targetHandle = evt.target;
                    let ox = evt.clientX;
                    let oy = evt.clientY;
                    if (this.snapToGrid) {
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    }
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let x = evt.clientX;
                            let y = evt.clientY;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dx = x - ox;
                            let dy = y - oy;
                            if (dx || dy) {
                                this.applyRect(0, 0, dx, dy);
                                if (dx)
                                    ox = x;
                                if (dy)
                                    oy = y;
                            }
                        }
                    };
                    let onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.middleLeft.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    let targetHandle = evt.target;
                    let ox = evt.clientX;
                    if (this.snapToGrid)
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let x = evt.clientX;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                            }
                            let dx = x - ox;
                            if (dx) {
                                this.applyRect(dx, 0, -dx, 0);
                                ox = x;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.middleRight.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    const targetHandle = evt.target;
                    evt.stopPropagation();
                    evt.preventDefault();
                    let ox = evt.clientX;
                    if (this.snapToGrid)
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                    this.dragging = true;
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    let onmousemove = (evt) => {
                        evt.preventDefault();
                        evt.stopPropagation();
                        if (this.dragging) {
                            let x = evt.clientX;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                            }
                            let dx = x - ox;
                            if (dx) {
                                this.applyRect(0, 0, dx, 0);
                                ox = x;
                            }
                        }
                    };
                    let onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.bottomCenter.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    let targetHandle = evt.target;
                    let oy = evt.clientY;
                    if (this.snapToGrid)
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    let onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let y = evt.clientY;
                            if (this.snapToGrid) {
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dy = y - oy;
                            if (dy) {
                                this.applyRect(0, 0, 0, dy);
                                oy = y;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.topCenter.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    let targetHandle = evt.target;
                    let oy = evt.clientY;
                    if (this.snapToGrid)
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let y = evt.clientY;
                            if (this.snapToGrid) {
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dy = y - oy;
                            if (dy) {
                                this.applyRect(0, dy, 0, -dy);
                                oy = y;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
                this.bottomLeft.addEventListener('pointerdown', (evt) => {
                    if (evt.button !== 0)
                        return;
                    const targetHandle = evt.target;
                    let ox = evt.clientX;
                    let oy = evt.clientY;
                    if (this.snapToGrid) {
                        ox = Math.trunc(ox / this.gridX) * this.gridX;
                        oy = Math.trunc(oy / this.gridY) * this.gridY;
                    }
                    this.dragging = true;
                    evt.stopPropagation();
                    evt.preventDefault();
                    if (evt.pointerId)
                        targetHandle.setPointerCapture(evt.pointerId);
                    const onmousemove = (evt) => {
                        evt.preventDefault();
                        if (this.dragging) {
                            let x = evt.clientX;
                            let y = evt.clientY;
                            if (this.snapToGrid) {
                                x = Math.trunc(x / this.gridX) * this.gridX;
                                y = Math.trunc(y / this.gridY) * this.gridY;
                            }
                            let dx = x - ox;
                            let dy = y - oy;
                            if (dx || dy) {
                                this.applyRect(dx, 0, -dx, dy);
                                if (dx)
                                    ox = x;
                                if (dy)
                                    oy = y;
                            }
                        }
                    };
                    const onmouseup = (evt) => {
                        if (evt.pointerId)
                            targetHandle.releasePointerCapture(evt.pointerId);
                        if (this.dragging) {
                            evt.preventDefault();
                            this.dragging = false;
                            this.resized();
                            targetHandle.removeEventListener('pointermove', onmousemove);
                        }
                    };
                    targetHandle.addEventListener('pointermove', onmousemove);
                    targetHandle.addEventListener('pointerup', onmouseup, { once: true });
                });
            }
            createHandles() {
                let handle;
                this.bottomLeft = handle = this.createHandle();
                handle.classList.add('bottom-left');
                this.middleLeft = handle = this.createHandle();
                handle.classList.add('middle-left');
                this.topLeft = handle = this.createHandle();
                handle.classList.add('top-left');
                this.topRight = handle = this.createHandle();
                handle.classList.add('top-right');
                this.middleRight = handle = this.createHandle();
                handle.classList.add('middle-right');
                this.bottomRight = handle = this.createHandle();
                handle.classList.add('bottom-right');
                this.topCenter = handle = this.createHandle();
                handle.classList.add('top-center');
                this.bottomCenter = handle = this.createHandle();
                handle.classList.add('bottom-center');
                this.container.append(...this.handles);
                this.setPosition();
                this._setGrabHandle();
                return this;
            }
            resized() {
                if (this.onObjectResized)
                    this.onObjectResized({ target: this.target });
            }
            applyRect(dx = 0, dy = 0, dw = 0, dh = 0) {
                if (this.designer && this.designer.zoom !== 100) {
                    const factor = this.designer.zoom / 100;
                    dx = dx / factor;
                    dy = dy / factor;
                    dw = dw / factor;
                    dh = dh / factor;
                }
                if (this.target.designer) {
                    this.target.designer.applyRectToSelection(dx, dy, dw, dh);
                }
                else {
                    this.target.x += dx;
                    this.target.y += dy;
                    this.target.width += dw;
                    this.target.height += dh;
                }
                this.setPosition();
                this.onObjectResizing?.({ target: this.target });
            }
            destroy() {
                for (let h of this.handles) {
                    h.remove();
                }
                this.handles = [];
            }
        }
        design.GrabHandles = GrabHandles;
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        const DEFAULT_CAPACITY = 100;
        class UndoManager {
            constructor(designer) {
                this.designer = designer;
                this.enabled = true;
                this.stack = [];
                this.index = -1;
                this.capacity = DEFAULT_CAPACITY;
            }
            beginUpdate() {
                this.enabled = false;
            }
            endUpdate() {
                this.enabled = true;
            }
            add(action, data, description) {
                if (!this.enabled) {
                    return;
                }
                this.stack.splice(this.index + 1);
                this.stack.push({ action, data, description });
                this.index++;
                if (this.stack.length > this.capacity) {
                    this.stack.shift();
                }
            }
            undo() {
                try {
                    this.enabled = false;
                    if (this.index > -1) {
                        this.undoEntry(this.stack[this.index]);
                        if (this._redoEntry) {
                            this.stack[this.index] = this._redoEntry;
                            this._redoEntry = null;
                        }
                        this.index--;
                    }
                }
                finally {
                    this.enabled = true;
                }
            }
            redo() {
                try {
                    this.enabled = false;
                    if (this.index < this.stack.length - 1) {
                        this.index++;
                        this.redoEntry(this.stack[this.index]);
                    }
                }
                finally {
                    this.enabled = true;
                }
            }
            resizeSelection(selection) {
                this.add('resize', selection.map(obj => ({ target: obj, x: obj.x, y: obj.y, w: obj.width, h: obj.height })));
            }
            moveSelection(selection) {
                this.add('move', selection.map(obj => ({ target: obj, x: obj.x, y: obj.y })));
            }
            addRedo(redo) {
                if (this._redoEntry) {
                    this._redoEntry.data.push(redo.data);
                }
                else {
                    this._redoEntry = redo;
                }
            }
            undoMoveObject(undoEntry, description) {
                this.addRedo({
                    action: 'move',
                    description,
                    data: undoEntry.map(entry => ({ target: entry.target, x: entry.target.x, y: entry.target.y })),
                });
                for (let entry of undoEntry) {
                    entry.target.designer.moveTo(entry.x, entry.y);
                }
            }
            undoResizeObject(undoEntry) {
                this.addRedo({
                    action: 'resize',
                    data: undoEntry.map(entry => ({ target: entry.target, x: entry.target.x, y: entry.target.y, w: entry.target.width, h: entry.target.height })),
                });
                for (let entry of undoEntry) {
                    entry.target.setRect(entry.x, entry.y, entry.w, entry.h);
                }
            }
            undoPaste(undoEntry) {
                for (let entry of undoEntry.reverse()) {
                    this.undoEntry(entry);
                }
            }
            undoProperty(undoEntry) {
                for (let entry of undoEntry) {
                    entry.target[entry.property] = entry.value;
                    entry.target.redraw();
                }
            }
            undoRemove(undoEntry) {
                for (let entry of undoEntry) {
                    this.designer.undoRemove(entry);
                }
            }
            undoEntry(entry) {
                switch (entry.action) {
                    case 'add':
                        this.designer.removeObjects(entry.data);
                        break;
                    case 'move':
                        this.undoMoveObject(entry.data, entry.description);
                        break;
                    case 'resize':
                        this.undoResizeObject(entry.data);
                        break;
                    case 'paste':
                        this.undoPaste(entry.data);
                        break;
                    case 'property':
                        this.undoProperty(entry.data);
                        break;
                    case 'remove':
                        this.undoRemove(entry.data);
                        break;
                }
            }
            redoEntry(entry) {
                switch (entry.action) {
                    case 'add':
                        for (let obj of entry.data) {
                            this.designer.addObject(obj);
                        }
                        break;
                    case 'move':
                        this.undoMoveObject(entry.data);
                        break;
                    case 'resize':
                        this.undoResizeObject(entry.data);
                        break;
                    case 'paste':
                        break;
                    case 'property':
                        break;
                }
            }
        }
        design.UndoManager = UndoManager;
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
var oui;
(function (oui) {
    var design;
    (function (design) {
        const isMac = navigator['userAgentData']?.platform === 'macOS';
        class DesignSurface {
            constructor(container) {
                this._selecting = false;
                this._isMouseDown = false;
                this.drawGrid = true;
                this._gridSize = 8;
                this.gridX = 8;
                this.gridY = 8;
                this.eventsDisabled = false;
                this.snapToGrid = false;
                this._selection = new Set();
                this._zoom = 100;
                this._zoomFactor = 1;
                this.create();
                container.appendChild(this.el);
                this.undoManager = new design.UndoManager(this);
                this.clipboardManager = new design.ClipboardManager(this);
                this.activate();
            }
            create() {
                this.el = document.createElement('div');
                this.el.className = 'design-surface';
                this.surface = document.createElement('div');
                this.surface.className = 'design-surface-content';
                this.el.appendChild(this.surface);
                this.overlay = this.createOverlay();
                this.el.appendChild(this.overlay);
                this._createEvents();
                this._drawBackground();
            }
            changePropertyNotification(objs, propName, value) {
                for (let obj of objs) {
                    if (obj.redraw)
                        obj.redraw();
                    this.onPropertyNotification?.(obj, propName, value);
                }
                this.updateGrabs();
            }
            setModified() {
            }
            enableEvents() {
                this.eventsDisabled = false;
            }
            disableEvents() {
                this.eventsDisabled = true;
            }
            activate() {
                this.eventsDisabled = false;
            }
            deactivate() {
                this.eventsDisabled = true;
            }
            async cut() {
                await this.clipboardManager.copy();
                this._deleteObjects(this.selection);
            }
            copy() {
                if (this.selection.size) {
                    console.debug('copy', this.selection);
                    return this.clipboardManager.copy();
                }
            }
            async paste() {
                try {
                    this.undoManager.beginUpdate();
                    const objs = await this.clipboardManager.paste();
                    this.undoManager.endUpdate();
                    this.undoManager.add('add', objs);
                }
                finally {
                    this.undoManager.endUpdate();
                }
            }
            pasteObject(obj) {
                return this.insertObject(obj);
            }
            undo() {
                this.undoManager.undo();
                this.updateGrabs();
            }
            redo() {
                this.undoManager.redo();
            }
            onKeyDown(event) {
                if (this.eventsDisabled)
                    return;
                let ctrlKey = event.ctrlKey;
                let altKey = event.altKey;
                if (isMac) {
                    ctrlKey = altKey;
                    altKey = false;
                }
                if ((!isMac && ctrlKey) || (isMac && event.metaKey && !ctrlKey)) {
                    if (event.key === 'z') {
                        event.preventDefault();
                        this.undo();
                        return;
                    }
                    else if (event.key === 'c') {
                        event.preventDefault();
                        this.copy();
                        return;
                    }
                    else if (event.key === 'v') {
                        event.preventDefault();
                        this.paste();
                        return;
                    }
                    else if (event.key === 'x') {
                        event.preventDefault();
                        this.cut();
                    }
                    else if ((isMac && event.key === 'Z') || (!isMac && event.key === 'y')) {
                        event.preventDefault();
                        this.redo();
                        return;
                    }
                }
                if (this._selection?.size && !altKey) {
                    if (event.shiftKey) {
                        switch (event.key) {
                            case 'ArrowDown':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.resizeSelectionBy(0, 1);
                                else
                                    this.resizeSelectionBy(0, this.gridY || 1);
                                break;
                            case 'ArrowUp':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.resizeSelectionBy(0, -1);
                                else
                                    this.resizeSelectionBy(0, -this.gridY || -1);
                                break;
                            case 'ArrowLeft':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.resizeSelectionBy(-1, 0);
                                else
                                    this.resizeSelectionBy(-this.gridX || -1, 0);
                                break;
                            case 'ArrowRight':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.resizeSelectionBy(1, 0);
                                else
                                    this.resizeSelectionBy(this.gridX || 1, 0);
                                break;
                        }
                    }
                    else {
                        switch (event.key) {
                            case 'ArrowDown':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.moveSelectionBy(0, this.gridY || 1);
                                else
                                    this.moveSelectionBy(0, 1);
                                this._tempGuidelines();
                                break;
                            case 'ArrowUp':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.moveSelectionBy(0, -1 * this.gridY || 1);
                                else
                                    this.moveSelectionBy(0, -1);
                                this._tempGuidelines();
                                break;
                            case 'ArrowLeft':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.moveSelectionBy(-this.gridX || -1, 0);
                                else
                                    this.moveSelectionBy(-1, 0);
                                this._tempGuidelines();
                                break;
                            case 'ArrowRight':
                                event.preventDefault();
                                if (ctrlKey)
                                    this.moveSelectionBy(this.gridX || 1, 0);
                                else
                                    this.moveSelectionBy(1, 0);
                                this._tempGuidelines();
                                break;
                            case 'Delete':
                                event.preventDefault();
                                this.deleteSelection();
                                break;
                        }
                    }
                }
            }
            resizeSelectionBy(dw, dh) {
                this.applyRectToSelection(0, 0, dw, dh);
            }
            insertObject(obj) {
                obj.designer = this;
                this.surface.appendChild(obj.el);
                return obj;
            }
            get gridSize() {
                return this._gridSize;
            }
            applyRectToSelection(dx, dy, dw, dh) {
                if (dx || dy || dw || dh) {
                    this.undoManager.resizeSelection(Array.from(this._selection));
                    for (let obj of this.selection) {
                        obj.applyRect(dx, dy, dw, dh);
                    }
                    this.updateGrabs();
                }
            }
            _drawBackground() {
                if (this.drawGrid) {
                    this.surface.style.backgroundImage = 'linear-gradient(90deg, #f0f0f0 1px, transparent 1px), linear-gradient(#f0f0f0 1px, transparent 1px)';
                    this.surface.style.backgroundSize = `${this._gridSize}px ${this._gridSize}px`;
                }
            }
            _createEvents() {
                this.el.addEventListener('pointerdown', (evt) => this.onPointerDown(evt));
                this.el.addEventListener('mousemove', (evt) => this.onPointerMove(evt));
                this.el.addEventListener('pointerup', (evt) => this.onPointerUp(evt));
                document.addEventListener('keydown', (evt) => this.onKeyDown(evt));
            }
            onPointerDown(evt) {
                if (evt.button !== 0)
                    return;
                this.el.setPointerCapture(evt.pointerId);
                this.clearSelection();
                this._isMouseDown = true;
                this._ox = evt.clientX;
                this._oy = evt.clientY;
            }
            onPointerMove(evt) {
                if (!this._isMouseDown)
                    return;
                this._selecting = true;
                let x = this._ox;
                let y = this._oy;
                const r = this.el.getBoundingClientRect();
                let w = evt.clientX - this._ox - r.left;
                let h = evt.clientY - this._oy - r.top;
                if (w < 0) {
                    x += w;
                    w = Math.abs(w);
                }
                if (h < 0) {
                    y += h;
                    h = Math.abs(h);
                }
                this.updateSelectionBox(x, y, w, h);
            }
            onPointerUp(evt) {
                if (evt.button !== 0)
                    return;
                this.el.releasePointerCapture(evt.pointerId);
                this._isMouseDown = false;
                this.destroySelectionBox();
                this._selecting = false;
            }
            destroySelectionBox() {
                if (this._selecting) {
                    this._selBox.remove();
                    this._selBox = null;
                }
            }
            createOverlay() {
                const overlay = document.createElement('div');
                overlay.className = 'designer-overlay';
                return overlay;
            }
            createSelectionBox() {
                if (this._selBox)
                    this._selBox.remove();
                this._selBox = document.createElement('div');
                this._selBox.className = 'selection-box';
                this.el.appendChild(this._selBox);
            }
            updateSelectionBox(x, y, width, height) {
                if (!this._selBox)
                    this.createSelectionBox();
                this._selBox.style.left = `${x}px`;
                this._selBox.style.top = `${y}px`;
                this._selBox.style.width = `${width}px`;
                this._selBox.style.height = `${height}px`;
            }
            get selection() {
                return this._selection;
            }
            set selection(value) {
                this._selection = value;
                this.updateSelection();
            }
            objectPointerDown(obj, evt) {
                if (!this._selection.has(obj)) {
                    if (evt.shiftKey)
                        this._selection.add(obj);
                    this.selection = new Set([obj]);
                }
            }
            addToSelection(obj) {
                this._selection.add(obj);
            }
            removeFromSelection(obj) {
                this._selection.delete(obj);
            }
            clearSelection() {
                this.destroyGrabs();
                this._selection.clear();
            }
            updateSelection() {
                this.createGrabs();
                this.onSelectionChange?.(this._selection);
            }
            createGrabs() {
                if (this.grabs)
                    for (const obj of this.grabs)
                        obj.destroy();
                this.grabs = Array.from(this._selection).map(obj => new design.GrabHandles({ target: obj, container: this.el, designer: this }));
            }
            destroyGrabs() {
                if (this.grabs) {
                    for (const obj of this.grabs)
                        obj.destroy();
                    this.grabs = [];
                }
            }
            updateGrabs() {
                for (const obj of this.grabs)
                    obj.setPosition();
            }
            moveSelectionBy(dx, dy) {
                if (this._zoomFactor !== 1) {
                    dx /= this._zoomFactor;
                    dy /= this._zoomFactor;
                }
                for (const obj of this._selection) {
                    if (obj instanceof BaseWidget)
                        obj.moveBy(dx, dy);
                }
                this.updateGrabs();
            }
            get zoom() {
                return this._zoom;
            }
            set zoom(value) {
                this.setZoom(value);
            }
            get zoomFactor() {
                return this._zoomFactor;
            }
            setZoom(zoom) {
                this._zoom = zoom;
                this._zoomFactor = zoom / 100;
                this.surface.style.transform = `scale(${this._zoomFactor})`;
                this.surface.style.transformOrigin = '0 0';
            }
        }
        design.DesignSurface = DesignSurface;
        class BasePageDesigner {
        }
        design.BasePageDesigner = BasePageDesigner;
        class ObjectDesigner extends oui.design.Component {
            constructor(owner) {
                super(owner);
                this._isMouseDown = false;
                this.defaultProps();
                this.create();
            }
            defaultProps() {
                this._ox = 0;
                this._oy = 0;
            }
            create() {
                this.el = document.createElement('div');
                this._createEvents();
                this.draw();
            }
            _createEvents() {
            }
            getType() {
                return this.constructor.name;
            }
            onPointerDown(evt) {
                if (evt.button !== 0)
                    return;
                evt.stopPropagation();
                evt.preventDefault();
                this.el.setPointerCapture(evt.pointerId);
                this._isMouseDown = true;
                this._ox = evt.clientX;
                this._oy = evt.clientY;
                this.designer?.objectPointerDown(this, evt);
            }
            onPointerUp(evt) {
                evt.stopPropagation();
                this._isMouseDown = false;
                this.el.setPointerCapture(evt.pointerId);
            }
            draw() {
            }
        }
        design.ObjectDesigner = ObjectDesigner;
        class BaseWidget extends ObjectDesigner {
            constructor() {
                super(...arguments);
                this._moving = false;
            }
            create() {
                super.create();
                this.objects = [];
            }
            defaultProps() {
                super.defaultProps();
                this._x = 0;
                this._y = 0;
            }
            get location() {
                return { x: this.x, y: this.y };
            }
            set location(value) {
                this.x = value.x;
                this.y = value.y;
                this.draw();
            }
            get size() {
                return { width: this.width, height: this.height };
            }
            set size(value) {
                this.width = value.width;
                this.height = value.height;
                this.draw();
            }
            remove() {
                this.el.remove();
            }
            get x() {
                return this._x;
            }
            set x(value) {
                this._x = value;
                this.el.style.left = `${value}px`;
            }
            get y() {
                return this._y;
            }
            set y(value) {
                this._y = value;
                this.el.style.top = `${value}px`;
            }
            get width() {
                return this._width;
            }
            set width(value) {
                this._width = value;
                this.draw();
            }
            get height() {
                return this._height;
            }
            set height(value) {
                this._height = value;
                this.draw();
            }
            getClientRect() {
                return new DOMRect(this._x, this._y, this._width, this._height);
            }
            _insertObject(obj) {
                this.el.appendChild(obj.el);
            }
            insertObject(obj) {
                if (!this.children.includes(obj)) {
                    this.children.push(obj);
                    this._insertObject(obj);
                }
            }
            removeObject(obj) {
                const index = this.children.indexOf(obj);
                if (index !== -1) {
                    this.children.splice(index, 1);
                    obj.el.remove();
                }
            }
            _createEvents() {
                super._createEvents();
                this.el.addEventListener('pointerdown', (evt) => this.onPointerDown(evt));
                this.el.addEventListener('pointermove', (evt) => this.onPointerMove(evt));
                this.el.addEventListener('pointerup', (evt) => this.onPointerUp(evt));
            }
            onPointerMove(evt) {
                if (!this._isMouseDown)
                    return;
                this._moving = true;
                if (this.designer?.snapToGrid) {
                    const dx = evt.clientX - this._ox;
                    const dy = evt.clientY - this._oy;
                    const gridSize = this.designer.gridSize;
                    const snapX = Math.round(dx / gridSize) * gridSize;
                    const snapY = Math.round(dy / gridSize) * gridSize;
                    this.designer.moveSelectionBy(snapX, snapY);
                    this._ox += snapX;
                    this._oy += snapY;
                }
                else {
                    this.designer?.moveSelectionBy(evt.clientX - this._ox, evt.clientY - this._oy);
                    this._ox = evt.clientX;
                    this._oy = evt.clientY;
                }
            }
            onPointerUp(evt) {
                super.onPointerUp(evt);
                this._moving = false;
            }
            moveBy(x, y) {
                this._x += x;
                this._y += y;
                this.draw();
            }
            draw() {
                this.el.style.left = `${this._x}px`;
                this.el.style.top = `${this._y}px`;
                this.el.style.width = `${this._width}px`;
                this.el.style.height = `${this._height}px`;
            }
            applyRect(dx, dy, dw, dh) {
                this.x += dx;
                this.y += dy;
                this.width += dw;
                this.height += dh;
                this.draw();
            }
            setRect(x, y, width, height) {
                console.debug('apply undo', x, y, width, height);
                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;
                this.draw();
            }
            invalidate() {
                this.draw();
            }
        }
        design.BaseWidget = BaseWidget;
    })(design = oui.design || (oui.design = {}));
})(oui || (oui = {}));
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
        class FetchAdapter extends BaseAdapter {
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
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        class JsonRpcAdapter extends Services.FetchAdapter {
        }
        Services.JsonRpcAdapter = JsonRpcAdapter;
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var Services;
    (function (Services) {
        let $fetch = window.fetch;
        window['$fetch'] = $fetch;
        window.fetch = function () {
            let ajaxStart = new CustomEvent('ajax.start', { detail: document, bubbles: true, cancelable: false });
            let ajaxStop = new CustomEvent('ajax.stop', { detail: document, bubbles: true, cancelable: false });
            let promise = $fetch.apply(this, arguments);
            document.dispatchEvent(ajaxStart);
            promise.finally(() => {
                document.dispatchEvent(ajaxStop);
            });
            return promise;
        };
        class Service {
            static { this.url = '/api/rpc/'; }
            constructor(name) {
                this.name = name;
            }
            static $fetch(url, config, params = null) {
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
                const methName = this.name ? this.name + '/' : '';
                const rpcName = Katrid.settings.server + this.constructor.url + methName + name + '/';
                return $.get(rpcName, params);
            }
            post(name, data, params, config, context) {
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
                            for (let processor of katrid.admin.responseMiddleware)
                                (new processor(response)).process(res);
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
                                    if (result.$open || result.open)
                                        window.open(result.$open || result.open);
                                    if (result.download) {
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
            static callWithFiles(config) {
                let { model, method, file, vm, data } = config;
                let form = new FormData();
                let files = file.files;
                if (files.length === 1)
                    form.append('files', file.files[0]);
                else
                    files.map(f => form.append('files[]', f));
                let url = `/web/file/upload/${model.name}/${method}/`;
                if (vm?.record?.id)
                    form.append('id', vm.record.id);
                console.debug('data', data);
                if (data) {
                    Object.entries(data).map(([k, v]) => {
                        form.append(k, v);
                        console.debug(k, v);
                    });
                }
                return Service.$fetch(url, {
                    url,
                    method: 'POST',
                    body: form,
                }).then(res => res.json());
            }
            static sendFile(config) {
                let { model, method, file, vm } = config;
                let form = new FormData();
                let files = file.files;
                if (files.length === 1)
                    form.append('files', file.files[0]);
                else
                    files.map(f => form.append('files[]', f));
                let url = `/web/file/upload/${model.name}/${method}/`;
                if (vm?.record?.id)
                    form.append('id', vm.record.id);
                let dataSource = vm?.dataSource;
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
            if (name?.includes('filename='))
                name = name.split('filename=', 2)[1];
            if (contentType.indexOf('pdf') > -1) {
                let viewer = window.open('/pdf-viewer/pdf/web/viewer.html');
                viewer.addEventListener('load', async () => {
                    await viewer.PDFViewerApplication.open({ url, originalUrl: name });
                    URL.revokeObjectURL(url);
                });
            }
            else {
                let a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.target = '_blank';
                a.download = name;
                document.body.append(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }
        }
    })(Services = Katrid.Services || (Katrid.Services = {}));
})(Katrid || (Katrid = {}));
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
            listId(params, config, context) {
                return this.post('api_list_id', { kwargs: params }, null, config, context);
            }
            delete(id) {
                if (!Array.isArray(id))
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
            getFieldChoice(config) {
                let kwargs = config.kwargs || {};
                if (config.filter)
                    kwargs.filter = config.filter;
                if (config.context)
                    kwargs.context = config.context;
                return this.post('api_get_field_choice', { args: [config.field, config.term], kwargs }, null, config.config);
            }
            doViewAction(data) {
                return this.post('admin_do_view_action', { kwargs: data });
            }
            callAdminViewAction(data) {
                return this.post('admin_call_view_action', { kwargs: data });
            }
            callSubAction(action, data) {
                return this.post('admin_call_sub_action', { params: { ids: data.ids } });
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
                return new Promise((resolve, reject) => {
                    this.post(meth, { args: args, kwargs: kwargs })
                        .then((res) => {
                        resolve(res);
                    })
                        .catch(res => {
                        if (res?.error && (typeof res.error === 'string'))
                            Katrid.Forms.Dialogs.Alerts.error(res.error);
                        else if (res.messages && Katrid.isObject(res.messages)) {
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
            call(meth, kwargs, params) {
                return new Promise((resolve, reject) => {
                    this.post(meth, { kwargs }, params)
                        .then((res) => {
                        resolve(res);
                    })
                        .catch(res => {
                        if (res?.error && (typeof res.error === 'string'))
                            Katrid.Forms.Dialogs.Alerts.error(res.error);
                        else if (res.messages && Katrid.isObject(res.messages)) {
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
        class Query extends ModelService {
            constructor(id) {
                super('ui.action.report');
                this.id = id;
            }
            static read(config) {
                let details, id, params, filter;
                if (Katrid.isObject(config)) {
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
            getMetadata(devInfo = false) {
                return this.rpc('get_metadata', [this.id], { dev_info: devInfo });
            }
            execute(config) {
                return this.rpc('execute', [this.id], { params: config.params });
            }
            static executeSql(sql) {
                return (new Query()).post('execute_sql', { args: [sql] });
            }
        }
        Services.Query = Query;
        class Actions extends ModelService {
            static load(action) {
                let svc = new ModelService('ui.action');
                return svc.post('load', {
                    args: [action], kwargs: {
                        context: Katrid.app.context
                    }
                });
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
var katrid;
(function (katrid) {
    var sql;
    (function (sql) {
        class Select {
        }
        sql.Select = Select;
        class From {
        }
        sql.From = From;
        class Alias {
            constructor(name) {
                this.name = name;
            }
        }
        sql.Alias = Alias;
        function select() {
        }
        sql.select = select;
        function from() {
        }
        sql.from = from;
    })(sql = katrid.sql || (katrid.sql = {}));
})(katrid || (katrid = {}));
const select = katrid.sql.select;
var katrid;
(function (katrid) {
    var test;
    (function (test) {
        function click(selector) {
            document.querySelector(selector).click();
        }
        test.click = click;
        function modelActionTour(args) {
            const tour = new Tour();
            console.log('args', args);
            return tour.modelActionTour(args);
        }
        test.modelActionTour = modelActionTour;
        function waitFor(selector, timeout = 10000) {
            let observer;
            return new Promise((resolve, reject) => {
                let el = document.querySelector(selector);
                if (el)
                    return resolve(el);
                observer = new MutationObserver((mutations) => mutations.forEach(mutation => {
                    if (mutation.addedNodes) {
                        el = document.querySelector(selector);
                        if (el)
                            resolve(el);
                    }
                }));
                observer.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
                setTimeout(() => reject(), timeout);
            }).finally(() => {
                if (observer)
                    observer.disconnect();
            });
        }
        test.waitFor = waitFor;
        async function menuClick(...path) {
            let children = Katrid.webApp.config.menu;
            for (let s of path) {
                for (let m of children)
                    if (m.name === s) {
                        children = m.children;
                        document.getElementById(`ui-menu-${m.id}`).click();
                        await katrid.sleep(1000);
                        break;
                    }
            }
        }
        test.menuClick = menuClick;
        async function sendKeys(field, text, value = null) {
        }
        test.sendKeys = sendKeys;
        function _sendKeys(el, text) {
            for (let c of text) {
                el.value += c;
            }
        }
        class Tour {
            constructor(parent) {
                this.parent = parent;
                this.navigationInterval = 1000;
            }
            async textClick(text) {
                if (this.parent)
                    $(parent).find(`:contains("${text}")`)[0].click();
            }
            async set(field, value) {
                let el;
                if (typeof field === 'string')
                    el = document.querySelector(`.form-field-section[name="${field}"]`);
                else
                    el = field;
                const input = el.querySelector('input,select');
                if (input) {
                    input.focus();
                    input.click();
                    input.value = value;
                    input.dispatchEvent(new Event('input'));
                    input.dispatchEvent(new Event('change'));
                    if (el.classList.contains('ForeignKey')) {
                        let dropdownItem = await this.waitFor('.dropdown-item[data-item-id]');
                        dropdownItem.click();
                    }
                }
            }
            async menuClick(path) {
                return menuClick(...path);
            }
            waitFor(selector, timeout = 10000) {
                return waitFor(selector, timeout);
            }
            click(selector) {
                return document.querySelector(selector).click();
            }
            async sendKeys(el, value) {
                el.focus();
                el.click();
                el.value = value;
                el.dispatchEvent(new Event('input'));
            }
            async sendKeysToField(container, field, value) {
                let el = container.querySelector(`.form-field-section[name="${field}"]`);
                await this.set(el, value);
            }
            async addRecordTo(el, data) {
                el.querySelector('.btn-action-add').click();
                let dlg = await this.waitFor('.modal[data-model]');
                for (let [field, v] of Object.entries(data)) {
                    await this.sendKeysToField(dlg, field, v.toString());
                }
                await katrid.sleep(100);
                dlg.querySelector('.modal-footer .btn').click();
            }
            async editRecordFrom(el, data) {
                el.click();
                let dlg = await this.waitFor('.modal[data-model]');
                for (let [field, v] of Object.entries(data))
                    if (!field.startsWith('$') && !field.startsWith('_'))
                        await this.sendKeysToField(dlg, field, v.toString());
                await katrid.sleep(100);
                dlg.querySelector('.modal-footer .btn').click();
            }
            async deleteRecordFrom(el, index) {
                await katrid.sleep(1000);
                el.querySelector(`tbody tr:nth-child(${index}) input[type=checkbox]`).click();
                el.querySelector('.btn-action-delete').click();
                await katrid.sleep(100);
            }
            async _setFields(data, container) {
                for (let [field, v] of Object.entries(data)) {
                    if (field.startsWith('$') || field.startsWith('_'))
                        continue;
                    let el = container.querySelector(`.form-field-section[name="${field}"]`);
                    if (!el) {
                        console.log('Field not found', field, container);
                        continue;
                    }
                    if (el.classList.contains('OneToManyField')) {
                        if (Array.isArray(v)) {
                            for (let row of v) {
                                if (row['$edit'] !== undefined) {
                                    await this.editRecordFrom(el.querySelector(`tbody tr:nth-child(${row['$edit'] + 1})`), row);
                                }
                                else if (row['$delete'])
                                    await this.deleteRecordFrom(el, row['$delete']);
                                else
                                    await this.addRecordTo(el, row);
                            }
                        }
                        else
                            await this.addRecordTo(el, v);
                    }
                    else
                        await this.set(el, v.toString());
                }
            }
            async _modelAction(op, step) {
                if ((op === 'create') || (op === 'new')) {
                    let btn = await this.waitFor('.btn-action-create');
                    btn.click();
                    await katrid.sleep(500);
                    await this.waitFor('.btn-action-save');
                    await this._setFields(step, document.body);
                    if (op === 'create')
                        document.querySelector('.btn-action-save').click();
                }
                else if (op === 'update') {
                    let btn = await this.waitFor('.btn-action-edit');
                    btn.click();
                    await this._setFields(step, document.body);
                    await katrid.sleep(500);
                    document.querySelector('.btn-action-save').click();
                }
                else if (op === 'refresh') {
                    document.querySelector('.btn-action-refresh').click();
                    await katrid.sleep(1000);
                }
            }
            async modelActionTour(structure) {
                for (let [k, v] of Object.entries(structure)) {
                    switch (k) {
                        case 'steps':
                            await this.tour(v);
                            break;
                        case 'menu':
                            await this.menuClick(v);
                            break;
                        default:
                            await this._modelAction(k, v);
                            break;
                    }
                }
            }
            async assert(condition) {
                if (typeof condition === 'object')
                    if (!this._step(condition))
                        throw Error('Assertion error');
            }
            async _step(step) {
                for (let [k, v] of Object.entries(step))
                    switch (k) {
                        case 'steps':
                            await this.tour(v);
                            break;
                        case 'model':
                            await this.modelActionTour(v);
                            break;
                        case 'menu':
                            await this.menuClick(v);
                            break;
                        case 'click':
                            await document.querySelector(v.toString()).click();
                            break;
                        case 'waitFor':
                            await this.waitFor(v.toString());
                            break;
                        case 'waitAndClick':
                            await this.waitFor(v.toString());
                            await document.querySelector(v.toString()).click();
                            break;
                        case 'sleep':
                            await katrid.sleep(Number(v));
                            break;
                        case 'eval':
                            await eval(v.toString());
                            break;
                        case 'assert':
                            await this.assert(v);
                            break;
                        case 'count':
                            for (let [sel, count] of Object.entries(v))
                                return document.querySelectorAll(sel).length === count;
                    }
            }
            async tour(steps) {
                if (Array.isArray(steps))
                    for (let step of steps)
                        await this._step(step);
                else if (steps.steps)
                    await this._step(steps);
            }
        }
        test.Tour = Tour;
        function runTour(steps) {
            let tour = new Tour();
            return tour.tour(steps);
        }
        test.runTour = runTour;
        async function tour(fn) {
            console.debug('Start test tour');
            await fn.call(new Tour());
            console.debug('Test tour finish');
        }
        test.tour = tour;
    })(test = katrid.test || (katrid.test = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var ui;
    (function (ui) {
        class Application extends Katrid.Core.WebApplication {
        }
        ui.Application = Application;
    })(ui = Katrid.ui || (Katrid.ui = {}));
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
                this.inputSearch = document.querySelector('#navbar-search');
                this.autocomplete = new AppGlobalSearch(this.inputSearch, this.app.config.menu);
                const toolTip = new Katrid.ui.Tooltip(this.querySelector('.navbar-search'), { helpText: `<h5>Pesquisa rápida</h5>Cliente: <strong>cli: &lt;nome do cliente&gt;</strong>
<br>Forncedor: <strong>for: &lt;nome do cliente&gt;</strong>
<br>Nota Fiscal: <strong>nf: &lt;num da nota&gt;</strong>
` });
                this.inputSearch.addEventListener('input', () => toolTip.hide());
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
                }
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
                    if (item?.href)
                        window.location.href = item.href;
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
var Katrid;
(function (Katrid) {
    var ui;
    (function (ui) {
        class Button {
            constructor(config) {
                this.config = config;
                this.text = config.text;
                this.onClick = config.click;
            }
        }
        ui.Button = Button;
    })(ui = Katrid.ui || (Katrid.ui = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var ui;
    (function (ui) {
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
                const daysow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                for (let i = 0; i < 7; i++) {
                    let el = document.createElement('div');
                    el.classList.add('dow');
                    el.innerText = daysow[i];
                    calendar.append(el);
                }
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
                event.stopPropagation();
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
        ui.Calendar = Calendar;
    })(ui = Katrid.ui || (Katrid.ui = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        async function openFileDialog(accept, multiple = false) {
            let input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            input.accept = accept;
            input.multiple = multiple;
            return new Promise((resolve, reject) => {
                input.addEventListener('change', () => {
                    resolve(input);
                });
                input.addEventListener('cancel', () => resolve());
                input.click();
            });
        }
        ui.openFileDialog = openFileDialog;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var filters;
    (function (filters) {
        function date(value, fmt = 'MM/DD/YYYY') {
            if (value) {
                if (fmt == 'shortDate')
                    fmt = Katrid.i18n.formats.shortDateFormat;
                else if (fmt == 'short')
                    fmt = Katrid.i18n.formats.shortDateTimeFormat;
                return moment(value).format(fmt);
            }
        }
        filters.date = date;
        function shortDate(value) {
            return date(value, 'shortDate');
        }
        filters.shortDate = shortDate;
        function dateTimeHumanize(value) {
            if (value) {
                return moment(value).format('ddd, LLL') + ' (' + moment(value).fromNow() + ')';
            }
        }
        filters.dateTimeHumanize = dateTimeHumanize;
    })(filters = katrid.filters || (katrid.filters = {}));
})(katrid || (katrid = {}));
Katrid.filter('date', katrid.filters.date);
Katrid.filter('shortDate', katrid.filters.shortDate);
Katrid.filter('dateHumanize', function (value) {
    if (value) {
        return moment(value).format('ddd, LL') + ' (' + moment(value).fromNow() + ')';
    }
});
Katrid.filter('dateTimeHumanize', katrid.filters.dateTimeHumanize);
Katrid.filter('number', function (value, digits) {
    if (value != null)
        return Katrid.intl.number(digits).format(value);
});
Katrid.filter('toFixed', function (value, digits = 2) {
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
    var UI;
    (function (UI) {
        class HelpProvider {
            getTooltipHelp(tooltip) {
                return;
            }
        }
        UI.HelpProvider = HelpProvider;
        UI.helpProvider = new HelpProvider();
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        class HelpCenter {
            constructor(app) {
                this.app = app;
                if (!app)
                    this.app = Katrid.webApp;
                this._actionChanged = () => this.actionChanged();
                this.app.element.addEventListener('katrid.actionChange', this._actionChanged);
                this.container = document.createElement('div');
                this.container.className = 'help-center';
                this.app.element.parentElement.append(this.container);
                this.actionChanged(0);
            }
            clear() {
                if (this.element)
                    this.element.innerHTML = Katrid.i18n.gettext('Loading...');
            }
            actionChanged(timeout = 1000) {
                this.clear();
                if (this._timeout)
                    clearTimeout(this._timeout);
                this._timeout = setTimeout(() => {
                    this.createElement();
                    this.collectHelp();
                }, timeout);
            }
            destroy() {
                this.app.element.removeEventListener('katrid.actionChange', this._actionChanged);
                this.container.remove();
                instance = null;
            }
            createElement() {
                if (!this.element)
                    this.element = document.createElement('div');
                this.element.className = 'help-center-content';
                const div = this.element;
                div.innerHTML = `
      <table class="table">
      <tr>
      <td><h2>Help Center</h2><a>${katrid.i18n.gettext('Open in new tab')}</a></td>
      <td style="text-align: right"><button title="${katrid.i18n.gettext('Close')}" class="btn-close"></button></td>
      </tr>
      </table>`;
                const a = div.querySelector('a');
                a.addEventListener('click', () => {
                    window.open('/admin/help-center/');
                });
                div.querySelector('.btn-close').addEventListener('click', () => this.destroy());
                this.container.append(div);
            }
            collectHelp() {
                if (this.app.actionManager.action) {
                    this.app.actionManager.action.generateHelp(this);
                }
            }
        }
        UI.HelpCenter = HelpCenter;
        let instance;
        function helpCenter() {
            if (!instance)
                instance = new HelpCenter();
            return instance;
        }
        UI.helpCenter = helpCenter;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var ui;
    (function (ui) {
        class Input {
            constructor(input) {
                this.input = input;
                input.className = 'form-control';
            }
        }
        ui.Input = Input;
    })(ui = Katrid.ui || (Katrid.ui = {}));
})(Katrid || (Katrid = {}));
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
                            if (Katrid.isString(res))
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
                for (let td of table.tHead.rows[0].querySelectorAll('th'))
                    if (!td.classList.contains('list-record-selector'))
                        row.push(td.innerText);
                output.push(row.join('\t'));
                for (let tr of table.querySelectorAll('tr')) {
                    row = [];
                    for (let td of tr.querySelectorAll('td'))
                        row.push(td.innerText.replaceAll('\n', ';'));
                    if (row.length)
                        output.push(row.join('\t'));
                }
                return output.join('\n');
            }
            Utils.tableToText = tableToText;
            function toTsv(data) {
                const output = [];
                for (let record of data) {
                    let row = [];
                    for (let [k, v] of Object.entries(record)) {
                        if (v == null)
                            row.push('');
                        else
                            row.push(v.toString());
                    }
                    output.push(row.join('\t'));
                }
                return output.join('\n');
            }
            Utils.toTsv = toTsv;
            function textToDownload(s, filename) {
                const blob = new Blob([s], { type: 'text/csv' });
                const el = document.createElement('a');
                try {
                    el.href = URL.createObjectURL(blob);
                    if (!filename)
                        filename = 'document.csv';
                    el.download = filename;
                    document.body.appendChild(el);
                    el.click();
                }
                finally {
                    document.body.removeChild(el);
                }
            }
            Utils.textToDownload = textToDownload;
        })(Utils = UI.Utils || (UI.Utils = {}));
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var Katrid;
(function (Katrid) {
    var UI;
    (function (UI) {
        class Toast {
            static createElement(config) {
                if (!this._container) {
                    let container = document.createElement('div');
                    container.classList.add('toast-container', 'position-fixed', 'bottom-0', 'end-0', 'p-3');
                    document.body.append(container);
                    this._container = container;
                }
                let div = document.createElement('div');
                div.classList.add('toast');
                if (config.classList)
                    div.classList.add(...config.classList);
                div.innerHTML = `<div class="d-flex"><div class="toast-body">${config.message}</div></div>`;
                if ((config.canClose === undefined) || config.canClose)
                    div.querySelector('.d-flex').append($('<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>')[0]);
                this._container.append(div);
                return div;
            }
            static show(config) {
                let el = this.createElement(config);
                const toast = new bootstrap.Toast(el);
                toast.show();
                el.addEventListener('hidden.bs.toast', () => el.remove());
                return toast;
            }
            static danger(message) {
                message.classList = ['text-bg-danger', 'toast-dark'];
                return this.show(message);
            }
            static success(message) {
                message.classList = ['text-bg-success', 'toast-dark'];
                return this.show(message);
            }
            static info(message) {
                message.classList = ['text-bg-info'];
                return this.show(message);
            }
            static warning(message) {
                message.classList = ['text-bg-warning'];
                return this.show(message);
            }
        }
        UI.Toast = Toast;
        function showMessage(message) {
            return Toast.show({ message });
        }
        UI.showMessage = showMessage;
    })(UI = Katrid.UI || (Katrid.UI = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class Toolbar {
            static { this.buttonClass = 'btn btn-light tool-button'; }
            constructor(container) {
                this.container = container;
                this._vertical = false;
                this.create();
                if (container) {
                    container.appendChild(this.el);
                }
            }
            create() {
                this.el = document.createElement('div');
                this.el.className = 'toolbar';
            }
            addButton(text) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = this.constructor['buttonClass'];
                if (typeof text === 'string') {
                    btn.innerHTML = text;
                }
                else {
                    if (text.iconClass) {
                        const icon = document.createElement('i');
                        icon.className = text.iconClass;
                        icon.classList.add('icon');
                        btn.appendChild(icon);
                    }
                    if (text.text) {
                        btn.append(text.text);
                    }
                    if (text.onClick) {
                        btn.addEventListener('click', text.onClick);
                    }
                }
                this.el.appendChild(btn);
                return btn;
            }
            addSeparator() {
                const sep = document.createElement('div');
                sep.className = 'separator';
                this.el.appendChild(sep);
            }
            addGroup() {
                return new ToolButtonGroup(this);
            }
            get vertical() {
                return this._vertical;
            }
            set vertical(value) {
                this._vertical = value;
                if (value) {
                    this.el.classList.add('vertical');
                }
                else {
                    this.el.classList.remove('vertical');
                }
            }
            showFloating(x, y) {
                this.el.classList.add('floating');
                this.el.style.left = x + 'px';
                this.el.style.top = y + 'px';
                document.body.appendChild(this.el);
            }
        }
        ui.Toolbar = Toolbar;
        class ToolButtonGroup {
            constructor(toolbar) {
                this.toolbar = toolbar;
                this.create();
            }
            create() {
                this.el = document.createElement('div');
                this.el.className = 'btn-group';
                this.toolbar.el.appendChild(this.el);
            }
            addButton(text) {
                return this.el.appendChild(this.toolbar.addButton(text));
            }
        }
        ui.ToolButtonGroup = ToolButtonGroup;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
    var ui;
    (function (ui) {
        const DELAY = 1500;
        let timeout;
        let lastTooltip;
        class Tooltip {
            constructor(el, config) {
                const popperConfig = {
                    placement: 'top-start',
                };
                let helpText = config?.helpText;
                this.target = el;
                let title = el.getAttribute('data-title');
                if (title)
                    el.removeAttribute('data-title');
                let mouseout;
                el.addEventListener('mouseenter', evt => {
                    if (lastTooltip)
                        lastTooltip.hide();
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        lastTooltip = this;
                        let s = el.getAttribute('data-tooltip') || '';
                        if (s)
                            s += '<br>';
                        s += (title || helpText);
                        if (s)
                            this.show(s);
                    }, DELAY);
                    mouseout = setTimeout(() => this.hide(), 150000);
                }, false);
                el.addEventListener('mouseleave', evt => {
                    clearTimeout(timeout);
                    clearTimeout(mouseout);
                    mouseout = setTimeout(() => {
                    });
                    this.hide();
                }, false);
            }
            createElement(text) {
                const div = document.createElement('div');
                div.className = 'tooltip';
                div.innerHTML = `<div class="tooltip-inner shadow">${text}<div class="documentation-tip"></div></div>`;
                return div;
            }
            show(text) {
                if (!this.element) {
                    this.element = this.createElement(text);
                    this._popper = Popper.createPopper(this.target, this.element, { placement: 'top-start' });
                }
                document.body.append(this.element);
                this.element.classList.add('show');
                if (this.documentation)
                    this.loadAdditionalTip();
            }
            hide() {
                clearTimeout(this._additionalTip);
                if (this.element) {
                    this.element.remove();
                    this._popper = null;
                    this.element = null;
                }
            }
            loadAdditionalTip() {
                this._additionalTip = setTimeout(() => {
                    this.element.querySelector('.documentation-tip').innerHTML = this.documentation;
                    this._popper.update();
                }, DELAY);
            }
        }
        ui.Tooltip = Tooltip;
    })(ui = Katrid.ui || (Katrid.ui = {}));
})(Katrid || (Katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        ui.Tooltip = Katrid.ui.Tooltip;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        const DEFAULT_EXPAND_CLASS = 'fa-chevron-right';
        const DEFAULT_COLLAPSE_CLASS = 'fa-chevron-down';
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
        ui.Component = Component;
        class TreeNode {
            constructor(treeView, item, options) {
                this.treeView = treeView;
                this.options = options;
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
                    let a = document.createElement('div');
                    a.addEventListener('mousedown', (evt) => {
                        evt.preventDefault();
                        this.treeView.el.focus();
                    });
                    a.addEventListener('click', () => this.select());
                    a.addEventListener('dblclick', (evt) => {
                        evt.preventDefault();
                        if (!this._expanded) {
                            this.expand();
                        }
                        else {
                            this.collapse();
                        }
                    });
                    this._ul = document.createElement('ul');
                    a.className = 'tree-item';
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
                    if (options?.onContextMenu) {
                        a.addEventListener('contextmenu', (evt) => {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.select();
                            options.onContextMenu(this, evt);
                        });
                    }
                    this._exp.classList.add('fa', 'fa-fw');
                    a.appendChild(this._exp);
                    if (typeof item.icon === 'string') {
                        this._iconElement = document.createElement('span');
                        this._iconElement.className = 'icon ' + item.icon;
                        a.appendChild(this._iconElement);
                    }
                    else if (typeof options?.icons?.default === 'string') {
                        this._iconElement = document.createElement('span');
                        this._iconElement.className = 'icon ' + options.icons.default;
                        a.appendChild(this._iconElement);
                    }
                    let txt = document.createElement('span');
                    txt.innerText = item.text;
                    a.appendChild(txt);
                    if (options?.checkbox) {
                        this.createCheckbox();
                    }
                }
            }
            get children() {
                return this._children;
            }
            clear() {
                this._ul.innerHTML = '';
                this._children.length = 0;
            }
            select() {
                this.treeView.selection = [this];
                this.options?.onSelect?.(this);
                return this;
            }
            collapse() {
                if (this._expanded) {
                    this.options?.onCollapse?.(this);
                    this.expanded = false;
                }
            }
            createCheckbox() {
                const label = document.createElement('label');
                label.className = 'checkbox checkbox-inline';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.className = 'checkbox';
                cb.addEventListener('change', (evt) => {
                    evt.stopPropagation();
                    this.checked = cb.checked;
                });
                this.checkbox = cb;
                this._a.insertBefore(cb, this._exp.nextElementSibling);
            }
            setCheckAll(value) {
                this.setChecked(value);
                this.options?.onCheckChange?.(this);
                if (this.children.length) {
                    for (let node of this.children) {
                        node.setCheckAll(value);
                    }
                }
            }
            setText(value) {
                this._a.querySelector('span:last-child').textContent = value;
            }
            setChecked(value) {
                this._checked = value;
                if (typeof value === 'string') {
                    this.checkbox.indeterminate = true;
                    this.checkbox.checked = null;
                }
                else {
                    this.checkbox.indeterminate = false;
                    this.checkbox.checked = value;
                }
            }
            get checked() {
                return this._checked;
            }
            set checked(value) {
                this.setCheckAll(value === true);
                this._parent?.updateCheckboxState();
                this.options?.onChecked?.(this);
            }
            updateCheckboxState() {
                let anyChecked = false;
                let anyUnchecked = false;
                let newState = false;
                for (let node of this.children) {
                    if (node._checked === true) {
                        anyChecked = true;
                        if (anyUnchecked) {
                            newState = 'indeterminate';
                            break;
                        }
                    }
                    else if (!node._checked) {
                        anyUnchecked = true;
                        if (anyChecked) {
                            newState = 'indeterminate';
                            break;
                        }
                    }
                    else if (node._checked === 'indeterminate') {
                        newState = 'indeterminate';
                        break;
                    }
                }
                if (!newState && !anyUnchecked) {
                    newState = true;
                }
                this.setChecked(newState);
                this._parent?.updateCheckboxState();
            }
            async expand() {
                if (!this._expanded && this._canExpand) {
                    await this.options?.onExpand?.(this);
                    if (this.children?.length) {
                        this.expanded = true;
                    }
                }
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
                if (this._parent) {
                    nodes = this._parent.children;
                }
                else {
                    nodes = this.treeView.nodes;
                }
                return nodes[this.index + 1];
            }
            get previous() {
                let p = this.previousSibling;
                if (p) {
                    while (p._expanded && p.children?.length) {
                        p = p.last;
                    }
                    return p;
                }
                if (this._parent) {
                    return this._parent;
                }
                return p;
            }
            get next() {
                if (this._expanded && this.children.length) {
                    return this.first;
                }
                let n = this.nextSibling;
                if (n) {
                    return n;
                }
                let p = this._parent;
                while (p) {
                    let ns = p.nextSibling;
                    if (ns) {
                        return ns;
                    }
                    p = p._parent;
                }
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
                if (this._parent) {
                    this.remove();
                }
                this._parent = value;
                if (value) {
                    value._addNode(this);
                }
            }
            _addNode(node) {
                this.children.push(node);
                this._ul.appendChild(node.el);
                this.update();
                node.calcLevel();
            }
            addNode(node) {
                node.parent = this;
                return node;
            }
            addItem(item, options) {
                return this.addNode(new TreeNode(this.treeView, item, options || this.options));
            }
            remove() {
                if (this._parent) {
                    this._parent.removeNode(this);
                }
                this.el.remove();
            }
            removeNode(node) {
                this.children.splice(this.children.indexOf(node), 1);
                this.update();
            }
            calcLevel() {
                if (this._parent)
                    this.level = this._parent.level + 1;
                else
                    this.level = 0;
            }
            update() {
                if (this._canExpand && this.children.length) {
                    this._exp.className = 'fa fa-fw';
                    this._exp.classList.add(DEFAULT_EXPAND_CLASS);
                }
                else {
                    this.el.classList.remove('expanded');
                    this._exp.className = 'fa-regular fa-fw';
                }
            }
            get level() {
                return this._level;
            }
            set level(value) {
                if (value !== this._level) {
                    this._level = value;
                    this._a.style.paddingLeft = `${(value + 1) * 15}px`;
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
        ui.TreeNode = TreeNode;
        class TreeView {
            constructor(el, options) {
                this.options = options;
                this._selection = [];
                this._striped = false;
                this.readonly = false;
                this.el = el;
                this.nodes = [];
                this.el.classList.add('tree-view');
                this.el.tabIndex = 0;
                this._ul = document.createElement('ul');
                this.el.append(this._ul);
                this.el.addEventListener('keydown', async (evt) => {
                    let n;
                    if (evt.shiftKey)
                        return;
                    switch (evt.key) {
                        case 'ArrowDown':
                            this.next();
                            evt.stopPropagation();
                            evt.preventDefault();
                            break;
                        case 'ArrowUp':
                            this.previous();
                            evt.stopPropagation();
                            evt.preventDefault();
                            break;
                        case 'ArrowRight':
                            n = this.currentNode;
                            if (n && n.children.length) {
                                await n.expand();
                                n.next.select();
                            }
                            else {
                                this.next();
                            }
                            break;
                        case 'ArrowLeft':
                            n = this.currentNode;
                            if (n) {
                                if (n.expanded)
                                    n.collapse();
                                else if (!n.parent?.select())
                                    n.previousSibling?.select();
                            }
                            else
                                this.firstNode.select();
                            break;
                        case ' ':
                            if (!this.readonly && this.currentNode?.checkbox) {
                                this.currentNode.checked = !this.currentNode.checked;
                            }
                            evt.stopPropagation();
                            evt.preventDefault();
                            break;
                    }
                });
                if (Array.isArray(options?.data)) {
                    this.addNodes(options);
                }
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
                    curNode.previous?.select();
                }
                else
                    this.lastNode.select();
            }
            next() {
                let curNode = this.currentNode;
                if (curNode) {
                    curNode.next?.select();
                }
                else {
                    this.firstNode.select();
                }
            }
            addNodes(nodes, parent = null) {
                let data = nodes.data;
                if (!Array.isArray(nodes.data)) {
                    data = [nodes.data];
                }
                for (const node of data) {
                    let item = this.addItem(node, parent, nodes.options);
                    if (node.children) {
                        this.addNodes({ data: node.children, options: nodes.options }, item);
                    }
                }
            }
            addItem(item, parent, options) {
                if (typeof item === 'string')
                    item = { text: item };
                const r = new TreeNode(this, item, options || this.options?.options);
                if (parent) {
                    r.parent = parent;
                }
                else {
                    this.nodes.push(r);
                    this._ul.appendChild(r.el);
                }
                return r;
            }
            *all() {
                for (let n of this.nodes) {
                    yield n;
                    yield* n.all();
                }
            }
            get currentNode() {
                if (this.selection.length) {
                    return this.selection[this.selection.length - 1];
                }
            }
            collapseAll() {
                for (let node of this.nodes) {
                    node.collapse();
                }
            }
            expandAll() {
                for (let node of this.nodes) {
                    node.expand();
                }
            }
            get striped() {
                return this._striped;
            }
            set striped(value) {
                this._striped = value;
                if (value) {
                    this.el.classList.add('striped');
                    this._ul.style.backgroundSize = 'auto 50px';
                }
                else {
                    this.el.classList.remove('striped');
                }
            }
            update() {
            }
            clear() {
                this._ul.innerHTML = '';
                this.nodes = [];
            }
        }
        ui.TreeView = TreeView;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        async function search(config) {
            if (config.multiple == null)
                config.multiple = true;
            let dlg = await Katrid.Forms.TableView.createSearchDialog(config);
            dlg.ready();
            return dlg.showDialog();
        }
        ui.search = search;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class BaseView {
            constructor(config) {
            }
            $render(vm) {
            }
        }
        ui.BaseView = BaseView;
        class ModelView extends BaseView {
            constructor(config) {
                super(config);
            }
        }
        ui.ModelView = ModelView;
        class RecordCollectionView extends BaseView {
        }
        ui.RecordCollectionView = RecordCollectionView;
        class TableView extends RecordCollectionView {
            createTableRow() {
            }
        }
        ui.TableView = TableView;
        class CardGroupPanel {
            addItem(item) {
            }
        }
        class CardView extends RecordCollectionView {
            quickCreateItem() {
            }
            createCardItem() {
            }
            createCardGroup() {
            }
        }
        ui.CardView = CardView;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var kui = katrid.ui;
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class Alerts {
            static success(msg) {
                return katrid.ui.Toast.success({ message: msg });
            }
            static warning(msg) {
                return katrid.ui.Toast.warning({ message: msg });
            }
            static warn(msg) {
                return katrid.ui.Toast.warning({ message: msg });
            }
            static info(msg) {
                return katrid.ui.Toast.info({ message: msg });
            }
            static error(msg) {
                return katrid.ui.Toast.danger({ message: msg });
            }
        }
        ui.Alerts = Alerts;
        function createButtons(container, config) {
            for (const btn of config.buttons) {
                if (typeof btn === 'string') {
                    const button = document.createElement('button');
                    button.classList.add('btn');
                    button.classList.add('btn-secondary');
                    switch (btn) {
                        case 'ok':
                            button.classList.add('btn-primary');
                            button.textContent = katrid.i18n.gettext('OK');
                            break;
                        case 'cancel':
                            button.textContent = katrid.i18n.gettext('Cancel');
                            break;
                        case 'yes':
                            button.textContent = katrid.i18n.gettext('Yes');
                            break;
                        case 'no':
                            button.textContent = katrid.i18n.gettext('No');
                            break;
                        case 'close':
                            button.textContent = katrid.i18n.gettext('Close');
                            break;
                        default:
                            button.textContent = katrid.i18n.gettext(btn);
                    }
                    button.addEventListener('click', evt => {
                        container.closest('dialog').close(btn);
                        container.dispatchEvent(new CustomEvent('dialog-button-click', { detail: { button: btn } }));
                    });
                    container.appendChild(button);
                }
                else if (btn instanceof HTMLElement) {
                    container.appendChild(btn);
                }
                else if (btn.text) {
                    const button = document.createElement('button');
                    button.className = 'btn btn-secondary';
                    button.textContent = btn.text;
                    button.type = 'button';
                    if (btn.click)
                        button.addEventListener('click', btn.click);
                    container.appendChild(button);
                }
            }
        }
        function createDialogElement(config) {
            const dialog = document.createElement('dialog');
            dialog.className = 'dialog';
            if (config.title) {
                dialog.innerHTML = `<header class="dialog-header">${config.title}</header>`;
            }
            const div = document.createElement('div');
            div.className = 'dialog-body';
            if (config.content) {
                div.innerHTML = config.content;
            }
            dialog.appendChild(div);
            const footer = document.createElement('footer');
            footer.className = 'dialog-footer';
            if (config.buttons) {
                createButtons(footer, config);
            }
            dialog.appendChild(footer);
            return dialog;
        }
        ui.createDialogElement = createDialogElement;
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
        <button type="button" name="btn-cancel" class="btn btn-secondary" data-bs-dismiss="modal">${katrid.i18n.gettext('Close')}</button>
      </div>
    </div>
  </div>`;
            }
            static showValidationError(title, msg, model, errors) {
                let errorHtml = '';
                for (const [k, error] of Object.entries(errors)) {
                    errorHtml +=
                        '<li>' +
                            `<h6>${model.fields[k].caption}</h6>` +
                            '<ul>';
                    for (const msg of error) {
                        errorHtml += `<li class="help-block">${msg.message}</li>`;
                    }
                    errorHtml += '</ul></li>';
                }
                return errorHtml;
            }
        }
        ui.ExceptionDialog = ExceptionDialog;
        function createModal(title, content, buttons) {
            let modal = document.createElement('div');
            modal.classList.add('modal');
            modal.tabIndex = -1;
            let buttonsTempl = `
        <button type="button" name="btn-ok" class="btn btn-primary">OK</button>
        <button type="button" name="btn-cancel" class="btn btn-secondary" data-bs-dismiss="modal">${katrid.i18n.gettext('Cancel')}</button>
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
        ui.createModal = createModal;
        function createDialog(title, content, buttons) {
            const dlg = createModal(title, content, buttons);
            const modal = new bootstrap.Modal(dlg);
            dlg.addEventListener('hidden.bs.modal', evt => {
                dlg.remove();
                modal.dispose();
            });
            return modal;
        }
        ui.createDialog = createDialog;
        let DialogResult;
        (function (DialogResult) {
            DialogResult["ok"] = "ok";
            DialogResult["cancel"] = "cancel";
            DialogResult["yes"] = "yes";
            DialogResult["no"] = "no";
            DialogResult["close"] = "close";
        })(DialogResult = ui.DialogResult || (ui.DialogResult = {}));
        function getButtonFromName(buttonName) {
            let button = `<button type="button" class="btn btn-secondary">`;
            switch (buttonName) {
                case DialogResult.close:
                    button += katrid.i18n.gettext('Close');
                    break;
                case DialogResult.cancel:
                    button += katrid.i18n.gettext('Cancel');
                    break;
                case DialogResult.yes:
                    button += katrid.i18n.gettext('Yes');
                    break;
                case DialogResult.no:
                    button += katrid.i18n.gettext('No');
                    break;
                case DialogResult.ok:
                    button += katrid.i18n.gettext('OK');
                    break;
                default:
                    button += katrid.i18n.gettext(buttonName);
                    break;
            }
            button += '</button>';
            return button;
        }
        class Dialog {
            constructor(config) {
                this.dialog = createDialogElement(config);
                this.dialogPromise = new Promise((resolve, reject) => {
                    this.resolve = resolve;
                    this.reject = reject;
                    this.dialog.addEventListener('close', (evt) => {
                        this.resolve(this.dialog.returnValue);
                        this.dialog.remove();
                    });
                });
            }
            async showModal() {
                document.body.append(this.dialog);
                this.dialog.showModal();
                return this.dialogPromise;
            }
            close() {
                this.dialog.close();
            }
        }
        ui.Dialog = Dialog;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class Toast {
            static createElement(config) {
                if (!this._container) {
                    let container = document.createElement('div');
                    container.classList.add('toast-container', 'position-fixed', 'bottom-0', 'end-0', 'p-3');
                    document.body.append(container);
                    this._container = container;
                }
                let div = document.createElement('div');
                div.classList.add('toast');
                if (config.classList)
                    div.classList.add(...config.classList);
                div.innerHTML = `<div class="d-flex"><div class="toast-body">${config.message}</div></div>`;
                if ((config.canClose === undefined) || config.canClose)
                    div.querySelector('.d-flex').append(katrid.ui.html('<button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>')[0]);
                this._container.append(div);
                return div;
            }
            static show(config) {
                let el = this.createElement(config);
                const toast = new bootstrap.Toast(el);
                toast.show();
                el.addEventListener('hidden.bs.toast', () => el.remove());
                return toast;
            }
            static danger(message) {
                message.classList = ['text-bg-danger', 'toast-dark'];
                return this.show(message);
            }
            static success(message) {
                message.classList = ['text-bg-success', 'toast-dark'];
                return this.show(message);
            }
            static info(message) {
                message.classList = ['text-bg-info'];
                return this.show(message);
            }
            static warning(message) {
                message.classList = ['text-bg-warning'];
                return this.show(message);
            }
        }
        ui.Toast = Toast;
        function showMessage(message) {
            return Toast.show({ message });
        }
        ui.showMessage = showMessage;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        let waitDialog;
        function showWaitDialog(config) {
            let msg;
            if (typeof config === 'string') {
                msg = katrid.i18n.gettext('Please wait...');
            }
            waitDialog ??= ui.createDialogElement({ message: msg });
            waitDialog.showModal();
        }
        ui.showWaitDialog = showWaitDialog;
        function closeWaitDialog() {
            waitDialog?.close();
        }
        ui.closeWaitDialog = closeWaitDialog;
        class WaitDialog {
            static show(msg) {
                showWaitDialog(msg);
            }
            static hide() {
                closeWaitDialog();
            }
        }
        ui.WaitDialog = WaitDialog;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class CellInput {
            constructor(grid, cell) {
                this.grid = grid;
                this.cell = cell;
                this.value = cell.content;
                this.create();
                this._prevElement = document.activeElement;
            }
            create() {
                this.el = document.createElement('input');
                if (this.value) {
                    this.el.value = this.value;
                }
                this.el.className = 'grid-cell-input';
                this.el.addEventListener('keydown', evt => {
                    if (!evt.shiftKey) {
                        if (evt.key === 'Enter') {
                            evt.preventDefault();
                            evt.stopPropagation();
                            this.apply();
                            return;
                        }
                    }
                    if (!evt.ctrlKey && !evt.altKey && ui.RE_EDIT.test(evt.key)) {
                        evt.stopPropagation();
                    }
                });
                this.el.addEventListener('pointerdown', evt => evt.stopPropagation());
                this._blurHandler = () => this.destroy();
                this.el.addEventListener('blur', this._blurHandler);
            }
            apply() {
                this.applyValue();
                this.cell.touched = true;
                this.destroy();
            }
            applyValue() {
                this.grid.inputCellValue(this.cell, this.el.value);
            }
            destroy() {
                this.el.removeEventListener('blur', this._blurHandler);
                this.el.remove();
                this._prevElement?.focus();
            }
            appendTo(parent) {
                return parent.appendChild(this.el);
            }
            select() {
                this.el.select();
            }
        }
        ui.CellInput = CellInput;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class TableCell {
            constructor() {
                this.touched = false;
            }
        }
        ui.TableCell = TableCell;
        class TableColumn {
        }
        ui.TableColumn = TableColumn;
        class TableColumns extends katrid.OwnedCollection {
            notify(action, item) {
                const owner = this.owner;
                if (action === 'insert')
                    owner?.refresh();
            }
        }
        ui.TableColumns = TableColumns;
        ui.RE_EDIT = /^.$/u;
        class SelectionBox {
            constructor(container) {
                this.create();
                if (container) {
                    container.appendChild(this.el);
                }
            }
            create() {
                this.el = document.createElement("div");
                this.el.className = "cells-selection-box";
            }
            setBounds(x, y, width, height) {
                this.el.style.left = x + "px";
                this.el.style.top = y + "px";
                this.el.style.width = width + "px";
                this.el.style.height = height + "px";
            }
            destroy() {
                this.el.remove();
            }
        }
        class CellsRange {
            constructor(startRow, startCol, endRow, endCol) {
                this.startRow = startRow;
                this.startCol = startCol;
                this.endRow = endRow;
                this.endCol = endCol;
            }
            static fromCells(cells) {
                let startRow = null;
                let startCol = null;
                let endRow = null;
                let endCol = null;
                for (const cell of cells) {
                    if (startRow === null || cell.y < startRow) {
                        startRow = cell.y;
                    }
                    if (endRow === null || cell.y > endRow) {
                        endRow = cell.y;
                    }
                    if (startCol === null || cell.x < startCol) {
                        startCol = cell.x;
                    }
                    if (endCol === null || cell.x > endCol) {
                        endCol = cell.x;
                    }
                }
                const range = new CellsRange(startRow, startCol, endRow, endCol);
                range.cells = cells;
                return range;
            }
            getRect() {
                let x = null;
                let y = null;
                let width = null;
                let height = null;
                for (const cell of this.cells) {
                    if (cell.el) {
                        const rect = cell.el.getBoundingClientRect();
                        if (x === null || rect.left < x) {
                            x = rect.left;
                        }
                        if (y === null || rect.top < y) {
                            y = rect.top;
                        }
                        if (width === null || rect.right > width) {
                            width = rect.right;
                        }
                        if (height === null || rect.bottom > height) {
                            height = rect.bottom;
                        }
                    }
                }
                return new DOMRect(x, y, width - x, height - y);
            }
            cellInRange(row, col) {
                return row >= this.startRow && row <= this.endRow && col >= this.startCol && col <= this.endCol;
            }
            rowInRange(row) {
                return row >= this.startRow && row <= this.endRow;
            }
            equals(range) {
                return this.startRow === range.startRow && this.startCol === range.startCol && this.endRow === range.endRow && this.endCol === range.endCol;
            }
        }
        ui.CellsRange = CellsRange;
        let GridHeaderEnumerator;
        (function (GridHeaderEnumerator) {
            GridHeaderEnumerator[GridHeaderEnumerator["number"] = 1] = "number";
            GridHeaderEnumerator[GridHeaderEnumerator["letter"] = 2] = "letter";
        })(GridHeaderEnumerator = ui.GridHeaderEnumerator || (ui.GridHeaderEnumerator = {}));
        class BaseGridHeaderItem {
            createElement(counter) {
                const el = document.createElement('div');
                el.textContent = counter.toString();
                return el;
            }
        }
        ui.BaseGridHeaderItem = BaseGridHeaderItem;
        class AutoGridHeaderItem extends BaseGridHeaderItem {
            constructor(enumerator) {
                super();
                this.enumerator = enumerator;
                this.initialCounter = 1;
            }
            createElement(counter) {
                const el = document.createElement('div');
                el.className = 'grid-header-cell';
                if (this.enumerator === GridHeaderEnumerator.number) {
                    el.textContent = this.getNextNumber(counter).toString();
                }
                else {
                    el.textContent = this.getNextLetter(counter);
                }
                return el;
            }
            getNextNumber(counter) {
                return counter + 1;
            }
            getNextLetter(counter) {
                if (counter === 'Z') {
                    return 'AA';
                }
                return String.fromCharCode(counter.charCodeAt(0) + 1);
            }
        }
        ui.AutoGridHeaderItem = AutoGridHeaderItem;
        class GridHeaderItem {
        }
        ui.GridHeaderItem = GridHeaderItem;
        class BaseGrid {
            constructor() {
                this.rowHeight = 20;
                this.colWidth = 64;
                this.minRows = 0;
                this.maxRows = -1;
                this.loadedRows = 0;
                this.incrementalLoad = true;
                this._striped = false;
                this._isEditing = false;
                this._draggingSelection = false;
                this.autoSaveCell = true;
                this._visibleRows = [];
                this._cells = [];
                this.columns = new TableColumns(this);
                this._rowTag = "div";
                this._cellTag = "div";
            }
            dump() {
            }
            _create() {
                this.el = document.createElement("div");
                this.el.className = 'table-grid';
                this.table = document.createElement("div");
                this.table.className = "grid";
            }
            create() {
                this._create();
                this.createEvents();
                this.createHeader();
                this.createRowHeader();
                this.createSizeLayer();
                this.calcSize();
                if (this.incrementalLoad) {
                    this.el.addEventListener('scroll', (event) => {
                        this._scroll();
                    });
                }
            }
            appendTo(container) {
                this.create();
                container.appendChild(this.el);
                this.render();
            }
            render() {
                if (this.dataRows) {
                    this._scroll();
                }
                else {
                    this.renderEmptyData();
                }
            }
            renderEmptyData() {
            }
            createEvents() {
                this.el.tabIndex = 0;
                this.el.addEventListener('keydown', (event) => this.keyDown(event));
                this.el.addEventListener('dblclick', (event) => this.dblClick(event));
            }
            keyDown(event) {
                switch (event.key) {
                    case 'ArrowUp':
                        this.moveBy(0, -1, event.shiftKey);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'ArrowDown':
                        this.moveBy(0, 1, event.shiftKey);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'ArrowLeft':
                        this.moveBy(-1, 0, event.shiftKey);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'ArrowRight':
                        this.moveBy(1, 0, event.shiftKey);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'F2':
                        this.editCell(this._selectedCell);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'Tab':
                        if (event.shiftKey)
                            this.gotoPrevCell(this._selectedCell);
                        else
                            this.gotoNextCell(this._selectedCell);
                        event.stopPropagation();
                        event.preventDefault();
                        break;
                    case 'Escape':
                        if (this.isEditing) {
                            event.stopPropagation();
                            this.cancelEdit();
                        }
                        break;
                    default:
                        if (!event.ctrlKey && ui.RE_EDIT.test(event.key)) {
                            this.editCell(this._selectedCell, true);
                            event.stopPropagation();
                        }
                }
            }
            gotoPrevCell(cell) {
                if (!cell) {
                    cell = this._selectedCell;
                }
                this.moveTo(cell.x - 1, cell.y);
            }
            gotoNextCell(cell) {
                if (!cell) {
                    cell = this._selectedCell;
                }
                this.moveTo(cell.x + 1, cell.y);
            }
            dblClick(event) {
                if (this._selectedCell) {
                    this.editCell(this._selectedCell);
                }
            }
            _createCellEditor(cell) {
                return new ui.CellInput(this, cell);
            }
            inputCellValue(cell, value) {
                cell.content = value;
                cell.el.textContent = value;
            }
            get isEditing() {
                return this._isEditing;
            }
            editCell(cell, selectAll = false) {
                if (!cell) {
                    cell = this.selectedCell;
                }
                if (cell.el) {
                    this._cellEditors ??= [];
                    cell.el.classList.add('editing');
                    const editor = this._createCellEditor(cell);
                    if (selectAll)
                        editor.select();
                    this._cellEditors.push(editor);
                    editor.appendTo(cell.el).focus();
                    this._isEditing = true;
                }
            }
            applyInput() {
                this._cellEditors?.forEach(e => e.apply());
                this._cellEditors = null;
                this._isEditing = false;
            }
            cancelEdit() {
                this._selectedCell?.el?.classList.remove('editing');
                this._isEditing = false;
                this._cellEditors?.forEach(e => e.destroy());
                this._cellEditors = null;
            }
            unselectAll() {
                this.selectedCells = [];
                this._updateSelectionBox();
            }
            moveTo(x, y) {
                const cell = this.getCell(y, x);
                if (cell) {
                    this.selectCell(cell);
                }
            }
            moveBy(dx, dy, shift = false) {
                const refCell = (shift && this._lastCell) || this._selectedCell;
                let cell = this.getCell(refCell.y + dy, refCell.x + dx);
                if (cell) {
                    if (shift) {
                        if (dy) {
                            if (this._selectedCell.y <= cell.y) {
                                if (dy > 0) {
                                    this.addToSelection(cell);
                                }
                                else {
                                    this.unselectRow(refCell.y);
                                }
                            }
                            else {
                                if (dy > 0) {
                                    this.unselectRow(refCell.y);
                                }
                                else {
                                    this.addToSelection(cell);
                                }
                            }
                        }
                        if (dx) {
                            if (this._selectedCell.x <= cell.x) {
                                if (dx > 0) {
                                    this.addToSelection(cell);
                                }
                                else {
                                    this.unselectCol(refCell.x);
                                }
                            }
                            else {
                                if (dx > 0) {
                                    this.unselectCol(refCell.x);
                                }
                                else {
                                    this.addToSelection(cell);
                                }
                            }
                        }
                    }
                    else {
                        this.selectCell(cell);
                    }
                    this._lastCell = cell;
                }
                else if (!shift) {
                    this.selectCell(this._selectedCell);
                }
            }
            unselectRow(row) {
                if (this._selMaxRow === row) {
                    this._selMaxRow--;
                }
                else if (this._selMinRow === row) {
                    this._selMinRow++;
                }
                this.selectedCells = this._getCellsInRange(new CellsRange(this._selMinRow, this._selMinCol, this._selMaxRow, this._selMaxCol));
                this._updateSelectionBox();
            }
            unselectCol(col) {
                if (this._selMaxCol === col) {
                    this._selMaxCol--;
                }
                else if (this._selMinCol === col) {
                    this._selMinCol++;
                }
                this.selectedCells = this._getCellsInRange(new CellsRange(this._selMinRow, this._selMinCol, this._selMaxRow, this._selMaxCol));
                this._updateSelectionBox();
            }
            goto(row, col) {
                const cell = this.getCell(row, col);
                if (cell) {
                    this.selectCell(cell);
                }
            }
            createSizeLayer() {
                this.sizeLayer = document.createElement("div");
                this.sizeLayer.className = "grid-size-layer";
                this.sizeLayer.appendChild(this.table);
                this.el.appendChild(this.sizeLayer);
            }
            calcSize() {
                this.sizeLayer.style.width = this.cols * this.colWidth + "px";
                this.sizeLayer.style.height = this.rows * this.rowHeight + "px";
            }
            createRowHeader() {
                const el = document.createElement("div");
                el.className = 'grid-vertical-header';
                this.rowHeaderElement = document.createElement("div");
                this.rowHeaderElement.className = 'grid-header';
                el.appendChild(this.rowHeaderElement);
                this.rowHeaderElement.style.width = el.style.width = "30px";
                this.rowHeaderElement.style.height = this.rows * this.rowHeight + "px";
                if (this.rowHeader?.length) {
                    for (const item of this.rowHeader) {
                        item.height = this.rowHeight;
                        item.width = 30;
                    }
                    this.el.appendChild(el);
                }
            }
            createHeader() {
                this.headerElement = document.createElement('div');
                this.headerElement.className = 'grid-horizontal-header grid-header';
                if (this.header) {
                    for (const item of this.header) {
                        item.height = this.rowHeight;
                        item.width = this.colWidth;
                    }
                }
            }
            cellMouseDown(cell, event) {
                this._draggingSelection = true;
                this.el.focus();
                this.selectCell(cell);
            }
            setSelectedCells(cells) {
                if (this.selectedCells) {
                    for (const c of this.selectedCells) {
                        c.el?.classList.remove("selected");
                    }
                }
                if (cells) {
                    for (const c of cells) {
                        this.selectCell(c);
                    }
                }
            }
            get selectedCell() {
                if (!this._selectedCell) {
                    this._selectedCell = this.getCell(0, 0);
                }
                return this._selectedCell;
            }
            set selectedCell(cell) {
                this.selectCell(cell);
            }
            addToSelection(cell) {
                const range = CellsRange.fromCells([this._selectedCell, cell]);
                this._selMinRow = range.startRow;
                this._selMaxRow = range.endRow;
                this._selMinCol = range.startCol;
                this._selMaxCol = range.endCol;
                this.selectedCells = this._getCellsInRange(range);
                this._updateSelectionBox();
            }
            _getCellsInRange(range) {
                const res = [];
                for (let y = range.startRow; y <= range.endRow; ++y) {
                    for (let x = range.startCol; x <= range.endCol; ++x) {
                        res.push(this._cells[y][x]);
                    }
                }
                return res;
            }
            _updateSelectionBox() {
                this._selBox ??= new SelectionBox(this.el);
                if (this.selectedCells.length > 1) {
                    const selRange = CellsRange.fromCells(this.selectedCells);
                    const rect = selRange.getRect();
                    this._selBox.setBounds(rect.x, rect.y, rect.width, rect.height);
                }
                else {
                    this._selBox.destroy();
                    this._selBox = null;
                }
            }
            selectCell(cell) {
                if (this.isEditing && this.autoSaveCell) {
                    this.applyInput();
                }
                this._lastCell = null;
                this.selectedCells = [];
                this._updateSelectionBox();
                this._selectedCell?.el?.classList.remove("selected");
                this._selectedCell = cell;
                cell?.el?.classList.add("selected");
                if (cell) {
                    this.scrollToCell(cell);
                }
                this.addToSelection(cell);
                this._updateSelectionBox();
            }
            scrollToCell(cell) {
                const rect = cell.el.getBoundingClientRect();
                if (this.visibleRect.top - rect.top > this.visibleRect.bottom) {
                }
            }
            getCell(row, col) {
                return this.getRowCells(row)?.[col];
            }
            getRowCells(row) {
                if (this.incrementalLoad && row >= this.loadedRows && this.rows > this.loadedRows) {
                    this.loadMore(row - this.loadedRows);
                }
                return this._cells[row];
            }
            loadMore(n) {
                this.cols ??= this.columns.items.length;
                for (let i = 0; i < n; i++) {
                    let dataRow = this.dataRows?.[this.loadedRows];
                    if (!dataRow && this.rows > this.loadedRows) {
                        dataRow = [];
                        dataRow[this.cols - 1] = undefined;
                    }
                    const cells = [];
                    for (let j = 0; j < this.cols; j++) {
                        const dataCol = dataRow[j];
                        cells.push({
                            y: this.loadedRows,
                            x: j,
                            content: dataCol || "",
                            touched: false,
                        });
                    }
                    cells.rowIndex = this.loadedRows;
                    this._cells.push(cells);
                    this.loadedRows++;
                }
            }
            _renderRows(rows) {
                const res = [];
                for (const row of rows) {
                    res.push(this.renderRow(row));
                }
                return res;
            }
            renderHeader() {
            }
            renderFooter() {
            }
            scrollCol(col) {
            }
            scrollRow(row) {
            }
            destroyOffscreenCells(newRange) {
                const newRows = [];
                for (const r of this._visibleRows) {
                    if (newRange.rowInRange(r.rowIndex)) {
                        newRows.push(r);
                    }
                    else {
                        r.rowElement?.remove();
                        r.rowElement = null;
                        continue;
                    }
                    for (const cell of r) {
                        if (!newRange.cellInRange(cell.y, cell.x)) {
                            cell.el?.remove();
                        }
                    }
                }
                return this._visibleRows = newRows;
            }
            renderRowHeader(row) {
                if (this.rowHeader) {
                    for (const rh of this.rowHeader) {
                        const th = rh.createElement(row.rowIndex);
                        this.rowHeaderElement.appendChild(th);
                    }
                }
            }
            renderRow(rowCells) {
                const tr = document.createElement(this._rowTag);
                tr.className = "grid-row";
                tr.style.height = this.rowHeight + "px";
                this.renderRowHeader(rowCells);
                let i = 0;
                const startCol = this._visibleRange?.startCol || 0;
                const endCol = Math.min(this._visibleRange?.endCol, this.cols);
                for (let x = startCol; x < endCol; x++) {
                    let cell = rowCells[x];
                    if (!cell)
                        cell = rowCells[i] = { content: `${x}` };
                    cell.el = tr.appendChild(this.renderCell(cell));
                    i++;
                }
                rowCells.rowElement = tr;
                return tr;
            }
            renderCell(cell) {
                const td = document.createElement(this._cellTag);
                td.style.width = `${this.colWidth}px`;
                td.className = 'cell';
                td.textContent = cell?.content || "";
                td.addEventListener('pointerdown', event => {
                    if (event.button === 0) {
                        this.cellMouseDown(cell || { el: td }, event);
                    }
                    document.addEventListener('mouseup', event => {
                        this._draggingSelection = false;
                    }, { once: true });
                });
                td.addEventListener('pointermove', event => {
                    if (this._draggingSelection) {
                        event.preventDefault();
                        this.addToSelection(cell);
                    }
                });
                return td;
            }
            addColumn(col) {
                col ??= new TableColumn();
                this.columns.add(col);
                return col;
            }
            addRow(data) {
                this.dataRows.push(data);
            }
            destroyCells() {
                for (const row of this._cells) {
                    for (const cell of row) {
                        cell.el?.remove();
                    }
                }
                this._cells = [];
                this.loadedRows = 0;
            }
            refresh() {
                this.destroyCells();
                this.render();
            }
            redrawGrid() {
                const range = this._getVisibleRange();
                range.startRow = Math.max(range.startRow -= 1, 0);
                if (this.rows) {
                    range.endRow = Math.min(range.endRow += 2, this.rows);
                }
                if (this._visibleRange?.equals(range)) {
                    return;
                }
                const keepRows = this.destroyOffscreenCells(range);
                this._visibleRange = range;
                if (this.loadedRows < range.endRow) {
                    this.loadMore(range.endRow - this.loadedRows);
                }
                if (!keepRows.length) {
                    this.appendRows(this._cells.slice(range.startRow, range.endRow));
                }
                else if (keepRows[0].rowIndex > range.startRow) {
                    this.insertRows(this._cells.slice(range.startRow, keepRows[0].rowIndex));
                }
                else if (keepRows.at(-1).rowIndex < range.endRow) {
                    this.appendRows(this._cells.slice(keepRows.at(-1).rowIndex + 1, range.endRow));
                }
            }
            insertRows(rows) {
                const first = this.table.firstChild;
                for (const el of this._renderRows(rows)) {
                    this.table.insertBefore(el, first);
                }
                this._visibleRows.splice(0, 0, ...rows);
            }
            appendRows(rows) {
                for (const el of this._renderRows(rows)) {
                    this.table.appendChild(el);
                }
                this._visibleRows.push(...rows);
            }
            _scroll() {
                if (!this.el?.isConnected)
                    return;
                this.visibleRect = new DOMRect(this.el.scrollLeft, this.el.scrollTop, this.el.clientWidth, this.el.clientHeight);
                this.redrawGrid();
                if (this.incrementalLoad) {
                    this.sizeLayer.style.paddingTop = this._visibleRange.startRow * this.rowHeight + "px";
                }
            }
            _getVisibleRange() {
                return new CellsRange(Math.floor(this.visibleRect.y / this.rowHeight), Math.min(Math.floor(this.visibleRect.x / this.colWidth), this.cols), Math.floor((this.visibleRect.y + this.visibleRect.height) / this.rowHeight), Math.floor((this.visibleRect.x + this.visibleRect.width) / this.colWidth));
            }
            addDataRow(data) {
                this.dataRows ??= [];
                this.dataRows.push(data);
                this.rows = this.dataRows.length;
                this.refresh();
            }
        }
        ui.BaseGrid = BaseGrid;
        class Grid extends BaseGrid {
        }
        ui.Grid = Grid;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class Spreadsheet extends ui.Grid {
            constructor(options) {
                super();
                this.incrementalLoad = true;
                this.rowHeader = [new ui.AutoGridHeaderItem(ui.GridHeaderEnumerator.number)];
                this.rows = options?.rows || 100;
                this.cols = options?.cols || 20;
            }
            create() {
                super.create();
                this.table.classList.add("spreadsheet");
            }
            render() {
                this._scroll();
            }
        }
        ui.Spreadsheet = Spreadsheet;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    var ui;
    (function (ui) {
        class DataColumn {
            constructor(collection) {
                this.collection = collection;
                collection.add(this);
            }
            dump() {
                return {
                    dataIndex: this.dataIndex,
                    caption: this.caption,
                };
            }
            load(data) {
                this.dataIndex = data.dataIndex;
                this.caption = data.caption;
            }
        }
        ui.DataColumn = DataColumn;
        class DataColumns extends katrid.OwnedCollection {
            notify(action, item) {
            }
        }
        ui.DataColumns = DataColumns;
        class BaseTable extends ui.BaseGrid {
            constructor() {
                super();
                this._rowTag = 'tr';
                this._cellTag = 'td';
                this.incrementalLoad = false;
            }
            calcSize() {
            }
            createSizeLayer() {
                this.sizeLayer = document.createElement("div");
                this.sizeLayer.className = "grid-size-layer";
                this.sizeLayer.appendChild(this.table);
                this.el.appendChild(this.sizeLayer);
            }
            _create() {
                this.el = document.createElement('div');
                this.el.classList.add('table-grid');
                this.table = document.createElement('table');
                this.table.className = 'table table-sm';
                this._tbody = this.table.createTBody();
            }
            createHeader() {
                this.headerElement = document.createElement('thead');
                this.table.appendChild(this.headerElement);
                if (this.columns) {
                    let row = document.createElement('tr');
                    this.headerElement.appendChild(row);
                    for (const col of this.columns.items) {
                        const cell = document.createElement('th');
                        cell.innerText = col.caption || col.dataIndex.toString();
                        row.appendChild(cell);
                    }
                }
            }
            redrawGrid() {
                this._visibleRange = this._getVisibleRange();
                this.loadMore(this.rows);
                this._tbody.append(...this._renderRows(this._cells));
            }
        }
        ui.BaseTable = BaseTable;
        class Table extends BaseTable {
        }
        ui.Table = Table;
    })(ui = katrid.ui || (katrid.ui = {}));
})(katrid || (katrid = {}));
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
var katrid;
(function (katrid) {
    var utils;
    (function (utils) {
        function groupBy(data, key) {
            const list = new Map();
            for (const o of data) {
                const k = o[key];
                if (!list.has(k)) {
                    list.set(k, []);
                }
                list.get(k).push(o);
            }
            return list;
        }
        class PivotNode {
            constructor(key, data, childCols, childRows) {
                this.key = key;
                this.data = data;
                this.childCols = childCols;
                this.childRows = childRows;
            }
            expand(colKey, rowKey) {
                expandNode(this, rowKey, colKey);
            }
        }
        function pivot(data, key) {
            return pivotDimension(Map.groupBy(data, obj => obj[key]));
        }
        utils.pivot = pivot;
        function expandNode(node, rowKey, colKey) {
            if (rowKey) {
                node.childRows = pivotDimension(Map.groupBy(node.data, obj => obj[rowKey]));
            }
            if (colKey) {
                node.childCols = pivotDimension(Map.groupBy(node.data, obj => obj[colKey]));
            }
        }
        function pivotDimension(data) {
            let res = [];
            for (const [k, v] of data) {
                res.push(new PivotNode(k, v, null, null));
            }
            return res;
        }
    })(utils = katrid.utils || (katrid.utils = {}));
})(katrid || (katrid = {}));
var katrid;
(function (katrid) {
    function printHtml(html) {
        let iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        let doc = iframe.contentDocument;
        doc.open();
        doc.write(html);
        doc.close();
        iframe.onload = () => {
            console.debug('page loaded');
            iframe.contentWindow.print();
            setTimeout(() => {
                iframe.remove();
            }, 1000);
        };
    }
    katrid.printHtml = printHtml;
})(katrid || (katrid = {}));
var Katrid;
(function (Katrid) {
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
var katrid;
(function (katrid) {
    function sleep(t) {
        return new Promise((res) => setTimeout(() => res(), t));
    }
    katrid.sleep = sleep;
    function invoke(qualName) {
        let member = window;
        for (let o of qualName.split('.'))
            member = member[o];
        if (member)
            return member;
    }
    katrid.invoke = invoke;
})(katrid || (katrid = {}));
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
})();
//# sourceMappingURL=katrid.js.map