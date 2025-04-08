declare namespace Katrid.Specification {
    namespace Data {
        interface IReqSearch {
            where: Record<string, any>[];
            page?: number;
            limit?: number;
            count?: boolean;
        }
        interface IResSearch {
            data: Record<string, any>[];
            count?: number;
        }
        interface IReqGet {
            id: any;
        }
        interface IResGet {
            data: Record<string, any>;
        }
        interface IReqWrite {
            data: Record<string, any>[];
        }
        interface IResWrite {
        }
        interface IContext {
            default?: any;
            $default?: string;
            [key: string]: any;
        }
    }
    interface IResError {
        code?: string;
        message?: string;
        messages?: string[];
    }
    namespace UI {
        interface IFieldInfo {
            name?: string;
            caption?: string;
            widget?: string;
            type?: string;
            required?: boolean;
            visible?: boolean;
            primaryKey?: boolean;
            choices?: string[];
            defaultValue?: any;
            cols?: number;
        }
        interface IViewInfo {
            template: string;
            fields: Record<string, IFieldInfo>;
        }
        interface IActionInfo {
            type: string;
            id?: any;
            context?: any;
            caption?: string;
            template?: string;
            domain?: any;
        }
        interface IModelWindowActionInfo extends IActionInfo {
            viewsInfo: Record<string, IViewInfo>;
            fields?: Record<string, IFieldInfo>;
            viewMode?: string;
        }
    }
}
declare namespace katrid.ui {
    class WebComponent extends HTMLElement {
        protected _created: boolean;
        connectedCallback(): void;
        protected create(): void;
        protected _create(): any | Promise<any>;
    }
    class Widget {
        render(): void;
    }
}
declare namespace katrid.ui {
    interface IDesignableComponent {
        designer: IDesigner;
    }
    interface IDesigner {
        target: any;
        component: IDesignableComponent;
        destroy: () => void;
    }
    class BaseComponentDesigner implements IDesigner, IOutlineObject {
        target: any;
        component: IDesignableComponent;
        constructor(target: any);
        destroy(): void;
        getOutlineInfo(): IOutlineInfo;
    }
}
declare namespace Katrid {
    let $hashId: number;
    let customElementsRegistry: any;
    function define(name: string, constructor: any, options?: any): void;
    function createVm(config: any): any;
    let componentsRegistry: {};
    let directivesRegistry: {};
    let filtersRegistry: {};
    function component(name: string, config: any): void;
    function directive(name: string, config: any): void;
    function filter(name: string, config: any): void;
    function html(templ: string): HTMLElement;
    let globalData: any;
}
declare namespace katrid {
}
declare var __katridMobileHost: any;
declare namespace katrid.mobile {
    const isAndroid: boolean;
    const isIOS: boolean;
    const isApp: boolean;
    function writeStringToFile(key: string, value: string): void;
    function readStringFromFile(key: string): string;
}
declare namespace katrid {
    class localStorage {
        static setItem(key: string, value: string): void;
        static getItem(key: string): string;
    }
    class localData {
        dbName: string;
        version?: number;
        db: IDBDatabase;
        constructor(dbName: string, version?: number);
        open(): Promise<IDBDatabase>;
        setItem(key: string, value: string | any): Promise<unknown>;
        getItem(key: string): Promise<string | any>;
    }
}
declare namespace katrid.ui {
    interface BaseApplicationOptions {
        el: HTMLElement;
        template?: string | HTMLElement;
        title?: string;
    }
    class BaseActionView {
        app: BaseApplication;
        element: HTMLElement;
        template: string;
        constructor(options?: any);
        protected createElement(): HTMLDivElement;
        protected _prepareElement(el: HTMLElement): HTMLElement;
        getElement(): HTMLElement;
        ready(): Promise<void>;
        protected _execute(): Promise<void>;
        protected _ready: Promise<void>;
        execute(app: BaseApplication): Promise<void>;
    }
    class ActionView extends BaseActionView {
        protected _prepareElement(el: HTMLElement): HTMLElement;
        protected defineData(): {};
        protected defineMethods(): {};
        protected defineComponent(): {
            data: () => {};
            methods: {};
        };
        vm: any;
        protected createVm(el: HTMLElement): any;
    }
    class BaseApplication {
        element: HTMLElement;
        actionViewer: HTMLElement;
        actions: Record<string, BaseActionView | typeof BaseActionView>;
        action: BaseActionView;
        template: string | HTMLElement;
        private _title;
        protected _ready: Promise<BaseApplication>;
        constructor(options: BaseApplicationOptions);
        get title(): string;
        set title(value: string);
        $nextTick(): any;
        registerAction(actionId: string, action: BaseActionView | typeof BaseActionView): void;
        protected render(el: HTMLElement): void;
        protected prepareElement(el: HTMLElement): void;
        gotoAction(actionId: string): Promise<BaseActionView>;
        setAction(action?: any): Promise<BaseActionView>;
        push(action: BaseActionView): Promise<void>;
        ready(): Promise<BaseApplication>;
    }
    let app: BaseApplication;
}
declare namespace katrid.pwa {
    class Application extends katrid.ui.BaseApplication {
        vm: any;
        protected prepareElement(el: HTMLElement): void;
        protected defineData(): {};
        protected defineMethods(): {};
        protected defineComponent(): {
            data: () => {};
            methods: {};
        };
    }
}
declare namespace Katrid.Actions {
    let registry: any;
    interface IActionConfig {
        id?: string | number;
        isDialog?: boolean;
        app?: Katrid.Core.WebApplication;
        actionManager?: Katrid.Actions.ActionManager;
        caption?: string;
        container?: HTMLElement;
        context?: any;
        info?: Katrid.Specification.UI.IActionInfo;
        usage?: string;
    }
    class Action {
        static actionType: string;
        private static _context;
        scope: any;
        app: Katrid.Core.WebApplication;
        config: IActionConfig;
        element: HTMLElement;
        isDialog: boolean;
        path: any;
        params: any;
        state: any;
        actionManager: ActionManager;
        container: HTMLElement;
        info: Katrid.Specification.UI.IActionInfo;
        constructor(config: IActionConfig);
        beforeUnload(event: Event): void;
        confirmDiscard(): Promise<boolean>;
        debug(): Promise<void>;
        render(): Promise<void>;
        renderTo(container?: HTMLElement): Promise<void>;
        destroy(): void;
        get id(): any;
        private _context;
        get context(): any;
        doAction(act: any): any;
        onActionLink(actionId: string, actionType: string, context?: any): Promise<unknown>;
        openObject(service: string, objectId: any, evt: any): boolean;
        restore(): void;
        apply(): void;
        execute(): void;
        search(): void;
        onHashChange(params: any): Promise<void>;
        getDisplayText(): string;
        createBreadcrumbItem(ol: HTMLElement, index: number): void;
        createBackItemLink(text: string, backArrow: boolean, click: string | ((evt: MouseEvent) => void)): HTMLAnchorElement;
        generateHelp(help: any): void;
    }
    function goto(actionId: string, config: any, reset?: boolean): Promise<Action>;
}
declare namespace katrid.admin {
    class ClientAction extends Katrid.Actions.Action {
        static registry: Record<string, Function>;
        onHashChange(params: any): Promise<void>;
    }
}
declare namespace Katrid.Actions {
    class Homepage extends Action {
        static actionType: string;
        static hooks: any[];
        get content(): any;
        onHashChange(params: any): void;
    }
    class HomepageView {
        actionId: string;
        element: HTMLElement;
        constructor();
        createElement(): void;
        panels: any[];
        info: any;
        load(data: any): void;
        edit(): void;
        private _rendered;
        render(): void;
        createPanel(): Katrid.Actions.Portlets.PortletPanel;
    }
}
declare namespace Katrid.Actions {
    import IActionInfo = Katrid.Specification.UI.IActionInfo;
    interface IActionParams {
        action?: string;
        model?: string;
        id?: string;
    }
    export class ActionManager extends HTMLElement {
        actions: Action[];
        currentAction: Action;
        mainAction: Action;
        $cachedActions: Record<string, IActionInfo>;
        constructor();
        private _action;
        get action(): Action;
        set action(value: Action);
        private _navbarVisible;
        get navbarVisible(): boolean;
        set navbarVisible(value: boolean);
        back(action?: number | Action): void;
        removeAction(action: Action): void;
        get length(): number;
        get context(): any;
        empty(): void;
        reset(): void;
        get path(): any;
        doAction(action: Action): void;
        confirmDiscard(): Promise<boolean>;
        onHashChange(params: IActionParams, reset: boolean): Promise<Action>;
        addAction(action: Action): void;
        execAction(info: IActionInfo): Promise<void>;
        debug(info: any): Promise<void>;
        registerActions(actions: Record<string, IActionInfo>): void;
    }
    export {};
}
declare namespace Katrid.Actions {
    import ViewInfo = Katrid.Forms.IModelViewInfo;
    import IFieldInfo = Katrid.Data.IFieldInfo;
    let DEFAULT_VIEWS: string[];
    interface IWindowActionConfig extends IActionConfig {
        model: string | Katrid.Data.Model;
        views?: Record<string, string | number | Katrid.Forms.ModelView>;
        viewModes?: string[];
        viewsInfo?: Record<string, ViewInfo>;
        viewMode?: string;
        usage?: string;
        templates?: Record<string, string | HTMLTemplateElement>;
        records?: any[];
        fields?: Record<string, IFieldInfo>;
        info?: Katrid.Specification.UI.IModelWindowActionInfo;
    }
    class WindowAction extends Katrid.Actions.Action {
        static actionType: string;
        config: IWindowActionConfig;
        searchView: Katrid.Forms.SearchView;
        viewModes: string[];
        viewMode: string;
        model: Katrid.Data.Model;
        modelName: string;
        views: Record<string, ViewInfo>;
        fields: any[];
        fieldList: any[];
        view: Katrid.Forms.ModelView;
        _loadDataCallbacks: any[];
        lastViewType: any;
        lastSearchMode: string;
        lastUrl: any;
        private _cachedViews;
        viewInfo: Katrid.Forms.IModelViewInfo;
        constructor(config: IWindowActionConfig, location?: any);
        createSearchView(): void;
        onHashChange(params: any): Promise<void>;
        getCaption(): any;
        rpc(method: string, data: any, event: any): void;
        beforeUnload(event: any): void;
        protected prepareContext(): any;
        getDisplayText(): string;
        onLoadData(recs: any[]): void;
        addLoadDataCallback(callback: any): void;
        removeLoadDataCallback(callback: any): void;
        switchView(viewType: string, params?: any): void;
        showView(mode: string, params?: any): Promise<Forms.ModelView>;
        render(): Promise<void>;
        createViewsButtons(container: HTMLElement): void;
        get selectionLength(): any;
        copyTo(configId: any): Promise<void>;
        makeUrl(viewType?: string): string;
        recordId: any;
        execute(): Promise<void>;
        changeUrl(): void;
        _viewType: string;
        get viewType(): string;
        set viewType(value: string);
        searchText(q: string): void;
        _prepareParams(params: any): any;
        setSearchParams(params: any): Promise<void>;
        searchResultView: Katrid.Forms.Views.RecordCollectionView;
        applyGroups(groups: any, params: any): Promise<void>;
        groupHeaderClick(record: any, index: any): void;
        loadGroupRecords(group: any): Promise<void>;
        doViewAction(viewAction: any, target: any, confirmation: any, prompt: any): any;
        _doViewAction(scope: any, viewAction: any, target: any, confirmation: any, prompt: any): any;
        protected pendingOperation: boolean;
        formButtonClick(id: any, meth: any): Promise<void>;
        onActionLink(actionId: string, actionType: string, context?: any, evt?: any): Promise<unknown>;
        _evalResponseAction(res: any): Promise<any>;
        doBindingAction(evt: any): void;
        listRowClick(index: any, row: any, evt?: any): void;
        record: any;
        private _recordIndex;
        get recordIndex(): number;
        set recordIndex(value: number);
        onDataStateChange(event: any, dataSource: any): void;
        autoReport(): any;
        get selection(): any;
        getSelection(): any[];
        set attachments(value: any[]);
        deleteAttachment(attachments: any, index: any): void;
        markStar(record: any): void;
        addFilter(field: string, value: any): void;
        static fromModel(model: string): Promise<WindowAction>;
        protected canBackToSearch(): boolean;
        createBreadcrumbItem(ol: HTMLElement, index: any): void;
        back(index: number, mode?: string): void;
        get index(): number;
        generateHelp(help: any): void;
    }
    function gotoNewRecord(config: any): Promise<void>;
}
declare namespace Katrid {
    enum ComponentState {
        Loading = 0,
        Loaded = 1
    }
    class WebComponent extends HTMLElement {
        private _created;
        connectedCallback(): void;
        protected create(): void;
    }
}
declare namespace katrid {
    interface Persistent {
        dump(): any;
    }
    type OperationNotification = 'insert' | 'remove';
    type CollectionNotifyEvents = 'insert' | 'remove';
    interface IComponent {
        name: string;
        owner: IComponent;
        components: Set<IComponent>;
        destroy(): void;
        insertComponent(component: IComponent): void;
        removeComponent(component: IComponent): void;
        findComponent(name: string): IComponent;
        notification(obj: IComponent, operation: OperationNotification): void;
        freeNotification(obj: IComponent): void;
    }
    interface CollectionItem {
        collection: Collection<any>;
        dump(): any;
        load(data: any): void;
    }
    abstract class Collection<T> implements Persistent {
        items: T[];
        add(item: T): void;
        dump(): any;
        remove(item: T): void;
        clear(): void;
        abstract notify(action: CollectionNotifyEvents, item: T): any;
    }
    abstract class OwnedCollection<T> extends Collection<T> {
        owner: Persistent;
        constructor(owner: Persistent);
    }
}
declare namespace Katrid.Actions {
    class ActionNavbar extends Katrid.WebComponent {
        private _actionManager;
        protected create(): void;
        get actionManager(): ActionManager;
        set actionManager(value: ActionManager);
        render(): void;
    }
}
declare namespace Katrid.Actions {
    class ReportAction extends Katrid.Actions.Action {
        static actionType: string;
        fields: any;
        static dispatchBindingAction(parent: any, action: any): Promise<void>;
        get name(): any;
        templateUrl: string;
        userReport: any;
        constructor(info: any, scope: any, location: any);
        userReportChanged(report: any): any;
        onHashChange(params: any): Promise<void>;
        debug(): Promise<void>;
        vm: any;
        renderParams(): void;
        report: Katrid.Reports.Report;
        createVm(el: HTMLElement): any;
    }
}
declare namespace Katrid.Actions {
    class ViewAction extends Action {
        static actionType: string;
        view: Katrid.Forms.BaseView;
        constructor(config: IActionConfig);
        onHashChange(params: any): Promise<void>;
        render(): Promise<void>;
    }
}
declare namespace Katrid.Actions.Portlets {
    class HomepageEditor extends Katrid.Actions.HomepageView {
        createPanel(): Katrid.Actions.Portlets.PortletPanel;
        createElement(): void;
        edit(): void;
        dump(): {
            panels: {
                caption: string;
                portlets: any[];
            }[];
        };
        save(): Promise<void>;
        private _back;
        back(): void;
        render(): void;
    }
}
declare namespace Katrid.Actions.Portlets {
    class BasePortlet {
        header: string;
        text: string;
        description: string;
        helpText: string;
        element: HTMLElement;
        wrapper: HTMLElement;
        editing: boolean;
        render(): void;
        renderTo(panel: HTMLElement): void;
        load(info: any): void;
    }
    class Portlet extends BasePortlet {
        renderTo(panel: HTMLElement): void;
    }
    class PortletGroup {
        element: HTMLElement;
        text: string;
        portlets: BasePortlet[];
        homepage: Katrid.Actions.HomepageElement;
        constructor(config?: any);
        addPortlet(portlet: BasePortlet): void;
        renderTo(container: HTMLElement): void;
    }
    class PortletPanel extends HTMLElement {
        caption: string;
        editing: boolean;
        portlets: Portlet[];
        connectedCallback(): void;
        render(): void;
        availableItems: any[];
        renderEditor(container: any): Promise<HTMLDivElement>;
        dump(): {
            caption: string;
            portlets: any[];
        };
        info: any;
        load(info: any): void;
        addPortlet(info: any): HTMLElement;
        addPortletClick(sender: HTMLElement): void;
    }
    class PortletEditor extends HTMLElement {
        connectedCallback(): void;
        create(): void;
        info: any;
        el: HTMLElement;
        portlet: Portlet;
        panel: PortletPanel;
        load(info: any): void;
        render(): void;
        removePortlet(): void;
    }
    class PortletElement extends HTMLElement {
        editing: boolean;
        info: any;
        connectedCallback(): void;
        create(): void;
        dump(): any;
        loaded: boolean;
        load(info: any): void;
        render(container?: HTMLElement): void;
    }
    class CreateNew extends Portlet {
        model: string;
        action: string;
        create(): void;
        dump(): any;
        load(info: any): void;
    }
    class ModelActionPortlet extends Portlet {
        actionId: string;
        model: string;
        action: string;
        constructor(actionId: string);
        render(): void;
        dump(): any;
        load(info: any): void;
    }
    class GotoList extends Portlet {
        model: string;
        action: string;
        viewType: string;
        create(): void;
        dump(): any;
        render(): void;
    }
    class GotoReport extends Portlet {
        model: string;
        action: string;
        create(): void;
        load(info: any): void;
        dump(): any;
        render(): void;
    }
    let registry: any;
}
declare namespace katrid.admin {
    class Messages {
        static message(info: any): void;
    }
}
declare namespace katrid.admin {
    class ModelPermissionsWidget {
        el: HTMLElement;
        model: string;
        permissions: string[];
        treeView: katrid.ui.TreeView;
        models: Map<number, katrid.ui.TreeNode>;
        permNodes: Map<string, katrid.ui.TreeNode>;
        allowByDefault: boolean;
        onDidChange: () => void;
        private _loading;
        protected _allowed: Map<number, boolean>;
        constructor(el: HTMLElement);
        get allowed(): Map<number, boolean>;
        create(): void;
        load(): Promise<void>;
        protected _permChange(node: katrid.ui.TreeNode): void;
        loadGroup(group: string): Promise<void>;
        loadPerms(idList: Record<number, boolean>): void;
    }
    class ModelPermissionsManager {
        tvGroup: katrid.ui.TreeView;
        el: HTMLElement;
        create(): void;
        load(): Promise<void>;
    }
}
declare namespace katrid.admin {
    import TreeView = katrid.ui.TreeView;
    import TreeNode = katrid.ui.TreeNode;
    class MenuItem {
        id: number;
        name: string;
        children: MenuItem[];
        groups: GroupItem[];
        treeNode: TreeNode;
        item: IMenuItem;
    }
    class GroupItem {
        id: number;
        name: string;
        menu: Set<MenuItem>;
        treeNode: TreeNode;
        item: IGroupItem;
        modified: boolean;
    }
    interface IMenuItem {
        id: number;
        name: string;
        parent: number;
        groups: number[];
    }
    interface IGroupItem {
        id: number;
        name: string;
        menus: number[];
    }
    export class PermissionManager {
        el: HTMLElement;
        protected _treeViewMenu: TreeView;
        protected _treeViewGroup: TreeView;
        protected _loading: boolean;
        group: GroupItem;
        constructor(el: HTMLElement);
        protected _create(): void;
        loadMenu(data: MenuItem[], parentNode?: katrid.ui.TreeNode): void;
        loadGroups(data: GroupItem[]): void;
        groups: IGroupItem[];
        menu: IMenuItem[];
        groupMap: Map<number | string, GroupItem>;
        menuMap: Map<number | string, MenuItem>;
        loadPermissions(): void;
        load(data: any): void;
        selectGroupNode(node: katrid.ui.TreeNode): void;
        selectGroup(group: GroupItem): void;
        nodeMenuCheck(node: katrid.ui.TreeNode): void;
        afterChecked(node: katrid.ui.TreeNode): void;
        onCommit: (data: any) => Promise<any>;
        saveChanges(): Promise<void>;
    }
    export {};
}
declare namespace katrid.admin {
    class ResponseMessagesProcessor {
        response: Response;
        constructor(response: Response);
        process(content: any): void;
    }
    let requestMiddleware: any[];
    let responseMiddleware: any[];
}
declare namespace katrid.admin {
    class UserDefinedValue {
        fieldName: string;
        el: HTMLElement;
        constructor(fieldName: string, el: HTMLElement);
        protected createFieldValue(): void;
        protected createValue(): void;
        protected createList(): void;
        protected createQuery(): void;
        protected createUDF(): void;
        static showDialog(): Promise<any>;
    }
}
declare namespace katrid.admin {
    class UserPreferences {
        static showModal(): Promise<void>;
        changePassword(): Promise<any>;
        execute(): Promise<void>;
    }
}
declare namespace Katrid.BI {
    function newPlot(el: any, data: any, layout: any, config: any): any;
}
declare namespace Katrid.Core {
    import ActionManager = Katrid.Actions.ActionManager;
    interface IMenuInfo {
        id?: any;
        name: string;
        icon?: string;
        url?: string;
        action?: string;
        children: IMenuInfo[];
    }
    interface IUserInfo {
        id?: any;
        name: string;
        avatar?: string;
        username?: string;
        lastLogin?: string;
        lang?: string;
    }
    interface IAppConfig {
        menu?: IMenuInfo[];
        actions?: Record<string, Katrid.Actions.Action>;
        userInfo?: IUserInfo;
        el?: HTMLElement;
        adapter?: Katrid.Services.BaseAdapter;
        title?: string;
    }
    class Application {
        config: IApplicationConfig;
        private _userInfo;
        $location: any;
        $search: any;
        rootElement: HTMLElement;
        element: HTMLElement;
        title: string;
        plugins: Plugin[];
        constructor(config: IApplicationConfig);
        get context(): any;
        setView(view: HTMLElement): void;
        get userInfo(): any;
        set userInfo(value: any);
        protected setUserInfo(userInfo: any): void;
        searchParams(): URLSearchParams;
        protected appReady(): void;
        loadPage(hash: string, reset?: boolean): Promise<void>;
    }
    class WebApplication extends Application {
        private _currentMenu;
        private _actionManager;
        constructor(config: any);
        beforeUnload(event: any): void;
        get actionManager(): ActionManager;
        render(): void;
        protected hideMessageCounter(): void;
        set newMessagesCount(value: number);
        messageCounterElement: HTMLElement;
        private _notificationMessages;
        get notificationMessages(): any[];
        set notificationMessages(value: any[]);
        protected createNotificationMessageItem(menu: HTMLElement, msg: any): void;
        buttonNotificationMessages: HTMLElement;
        protected appReady(): void;
        formatActionHref(actionId: any): string;
        get currentMenu(): any;
        set currentMenu(value: any);
        protected setUserInfo(value: any): void;
        loadPage(hash: string, reset?: boolean): Promise<void>;
        debug(info: any): Promise<void>;
        search(params: any): void;
        changeUrl(paramName: string, paramValue: any): void;
        get context(): any;
    }
}
declare namespace Katrid {
    let app: Katrid.Core.Application;
    let webApp: Katrid.Core.WebApplication;
}
declare namespace katrid {
    const core: typeof Katrid.Core;
}
declare namespace Katrid.Core {
    export class Plugin {
        app: Application;
        constructor(app: Application);
        hashChange(url: string): boolean;
    }
    class Plugins extends Array<typeof Plugin> {
        start(app: Application): void;
    }
    export let plugins: Plugins;
    export function registerPlugin(cls: typeof Plugin): void;
    export {};
}
declare namespace Katrid.BI {
}
declare namespace Katrid.Forms {
    import IViewInfo = Katrid.Specification.UI.IViewInfo;
    interface IView {
        template?: string | HTMLElement;
        container?: HTMLElement;
        info?: Katrid.Specification.UI.IViewInfo;
    }
    class BaseView {
        config: IView;
        dialog: boolean;
        vm: any;
        parentVm: any;
        container: HTMLElement;
        element: HTMLElement;
        template: HTMLTemplateElement;
        html: string;
        protected info: IViewInfo;
        constructor(config: IView);
        protected create(info: IView): void;
        protected _applyDataDefinition(data: any): any;
        protected getComponentData(): any;
        protected createComponent(): any;
        protected cloneTemplate(): HTMLElement;
        domTemplate(): HTMLElement;
        protected createDialogButtons(buttons: string[] | any[]): HTMLButtonElement[];
        protected createDialog(content: HTMLElement, buttons?: string[] | any[]): HTMLElement;
        scripts: string[];
        _readyEventListeners: any[];
        protected createVm(el: HTMLElement): any;
        beforeRender(templ: HTMLElement): HTMLElement;
        createElement(): void;
        applyCustomTags(template: HTMLElement): void;
        render(): HTMLElement;
        protected _modal: bootstrap.Modal;
        closeDialog(): void;
        renderTo(container: HTMLElement): void;
        onHashChange(params: any): Promise<void>;
    }
    function compileButtons(container: HTMLElement): void;
    interface ISetupScript {
        methods: any;
        computed: any;
        created(): unknown;
        ready(view: BaseView): unknown;
    }
    let globalSettings: any;
}
declare namespace Katrid.Forms {
    interface ISearchOptions {
        id?: number | string;
        index?: number;
        where?: Record<string, any>;
        page?: number;
        limit?: number;
        timeout?: number;
    }
    let searchModes: string[];
    let registry: any;
    interface IModelViewInfo extends IView {
        name?: string;
        model?: Katrid.Data.Model;
        fields?: Record<string, Katrid.Data.IFieldInfo>;
        toolbar?: any;
        toolbarVisible?: boolean;
        autoLoad?: boolean;
        record?: any;
        records?: any[];
        recordGroups?: any[];
        action?: Katrid.Actions.WindowAction;
        recordClick?: (record: any, index: number, event: Event) => void;
        multiple?: boolean;
        viewInfo?: Katrid.Forms.ModelViewInfo;
    }
    class ModelView extends BaseView {
        datasource: Katrid.Data.DataSource;
        model: Katrid.Data.Model;
        fields: Record<string, Katrid.Data.Field>;
        action: Katrid.Actions.WindowAction;
        toolbarVisible: boolean;
        pendingOperation: number;
        protected _record: any;
        record: any;
        config: IModelViewInfo;
        dialogButtons: string[] | any[];
        protected _readonly: boolean;
        protected _loadingHandle: any;
        protected info: IModelViewInfo;
        constructor(info: IModelViewInfo);
        static viewType: string;
        static fromTemplate(action: Katrid.Actions.WindowAction, model: Katrid.Data.Model, template: string): ModelView;
        static createViewModeButton(container: HTMLElement): void;
        deleteSelection(sel: any[]): Promise<boolean>;
        protected create(info: Katrid.Forms.IModelViewInfo): void;
        protected dataSourceCallback(data: Katrid.Data.IDataCallback): void;
        protected createDialog(content: HTMLElement, buttons?: string[] | any[]): HTMLElement;
        protected _records: any[];
        get records(): any[];
        set records(value: any[]);
        private _recordCount;
        get recordCount(): number;
        set recordCount(value: number);
        private _active;
        get active(): boolean;
        set active(value: boolean);
        protected setActive(value: boolean): void;
        protected getComponentData(): any;
        get readonly(): boolean;
        set readonly(value: boolean);
        ready(): Promise<any>;
        refresh(): void;
        protected _search(options: ISearchOptions): Promise<any>;
        private _mergeHeader;
        mergeHeader(parent: HTMLElement, container: HTMLElement): HTMLElement;
        protected _vmCreated(vm: any): void;
        doViewAction(action: string, target: any): Promise<any>;
        callSubAction(action: string, selection?: any[]): Promise<void>;
        protected _evalResponseAction(res: any): Promise<any>;
        protected getSelectedIds(): Promise<any[]>;
        protected createComponent(): any;
        getViewType(): any;
        autoCreateView(): HTMLElement;
        domTemplate(): HTMLElement;
        beforeRender(template: HTMLElement): HTMLElement;
        protected renderTemplate(template: HTMLElement): HTMLElement;
        createToolbar(): HTMLElement;
        dialogPromise: Promise<any>;
        generateHelp(help: any): void;
    }
    interface IRecordGroup {
        $str: string;
        $count: number;
        $children?: any[];
        $expanded?: boolean;
        $hasChildren?: boolean;
    }
    abstract class RecordCollectionView extends ModelView {
        private _searchView;
        autoLoad: boolean;
        recordGroups: IRecordGroup[];
        groupLength: number;
        private _orderBy;
        constructor(info: IModelViewInfo);
        get orderBy(): string[];
        set orderBy(value: string[]);
        getSelectedIds(): Promise<any[]>;
        callSubAction(action: string, selection?: any[]): Promise<void>;
        protected create(info: Katrid.Forms.IModelViewInfo): void;
        protected _recordClick(record: any, index?: number): Promise<void>;
        nextPage(): void;
        prevPage(): void;
        protected createComponent(): any;
        protected setActive(value: boolean): void;
        get searchView(): SearchView;
        set searchView(value: SearchView);
        protected dataSourceCallback(data: Katrid.Data.IDataCallback): void;
        protected setSearchView(searchView: SearchView): void;
        protected getComponentData(): any;
        protected prepareGroup(groups: IRecordGroup[]): IRecordGroup[];
        groupBy(data: any[]): Promise<any>;
        applyGroups(groups: any, params: any): Promise<void>;
        private _addRecordsToGroup;
        expandGroup(group: IRecordGroup): Promise<void>;
        expandAll(): void;
        collapseAll(): void;
        collapseGroup(group: IRecordGroup): void;
        private _lastSearch;
        setSearchParams(params: any): Promise<void>;
        protected _invalidateSelection(): void;
        createToolbar(): HTMLElement;
        protected createToolbarButtons(container: HTMLElement): HTMLElement;
        protected createSelectionInfo(parent: HTMLElement): void;
        get $modalResult(): any;
        set $modalResult(value: any);
        showDialog(options?: any): Promise<unknown>;
        ready(): Promise<unknown>;
    }
    class ActionViewElement extends Katrid.WebComponent {
        action: Katrid.Actions.WindowAction;
        view: ModelView;
        protected create(): void;
    }
}
declare namespace Katrid.Forms.Views {
    export let registry: Record<string, typeof ModelView>;
    interface ITemplates {
        form?: string | HTMLTemplateElement;
        list?: string | HTMLTemplateElement;
        card?: string | HTMLTemplateElement;
        [key: string]: any;
    }
    export function fromTemplates(action: Katrid.Actions.WindowAction, model: Katrid.Data.Model, templates: ITemplates): Record<string, ModelView>;
    export {};
}
declare namespace Katrid.BI {
    export class QueryView extends Katrid.Forms.RecordCollectionView {
        static viewType: string;
        private _queryId;
        searchViewVisible: boolean;
        fieldList: Katrid.Data.Field[];
        table: HTMLTableElement;
        data: any;
        metadata: any;
        get queryId(): string | number;
        set queryId(value: string | number);
        queryChange(query: any): Promise<void>;
        refreshQuery(query: any, params?: any): Promise<any>;
        loadData(data: any): void;
        private _loadedRows;
        private _lastGroup;
        private _lastGroupValues;
        groups: string[];
        groupsIndex: number[];
        evalTotal(col: Column, values: any[]): number;
        addGroupHeader(grouper: any, record: any, data: any[]): void;
        addGroupFooter(): void;
        more(count: number): number;
        params: any[];
        columns: Column[];
        ready(): Promise<void>;
        tableScroll(evt: any): void;
        contextMenu(evt: any): void;
        copyToClipboard(formatting?: boolean): Promise<void>;
        toText(options?: {
            newLine?: string;
            separator?: string;
            withHeader?: boolean;
        }): string;
        export(): void;
        get orientation(): "landscape" | "portrait";
        reportTemplate: string;
        print(): Promise<void>;
        destroy(): void;
    }
    class Column {
        name: string | number;
        label: string;
        type: string;
        visible: boolean;
        dataIndex: number;
        total: string;
        width: number;
        cols: number;
        constructor(info: any);
    }
    export {};
}
declare namespace Katrid.BI {
    class QueryViewerElement extends Katrid.WebComponent {
        queryViewer: QueryViewer;
        protected create(): void;
    }
    class QueryViewer {
        el: HTMLElement;
        container: HTMLElement;
        constructor(el: HTMLElement);
        protected create(): void;
        queryId: number | string;
        query: Katrid.Services.Query;
        load(): Promise<void>;
        metadata: any;
        params: Katrid.Reports.Param[];
        btnPrint: HTMLButtonElement;
        btnExport: HTMLButtonElement;
        createParamsPanel(params: any): void;
        applyParams(): Promise<void>;
        queryView: QueryView;
        print(): Promise<void>;
        createQueryView(fields: any, data: any, reportType?: string): QueryView;
    }
}
declare namespace katrid.bi {
    const QueryViewer: typeof Katrid.BI.QueryViewer;
}
declare namespace Katrid.Components {
    class Component {
        name: string;
    }
    class Widget extends Component {
    }
}
declare namespace katrid.exceptions {
    class Exception extends Error {
        constructor(message: any);
    }
    class ValidationError extends Exception {
    }
}
declare var Vue: any;
declare namespace Katrid {
    let localSettings: any;
    let isMobile: Boolean;
    let settings: any;
    function init(): void;
    function assignElement(target: HTMLElement, source: HTMLElement): void;
    class LocalSettings {
        static init(): void;
        constructor();
        get searchMenuVisible(): boolean;
        set searchMenuVisible(value: boolean);
    }
}
declare namespace katrid {
    function init(): void;
    function data(el: any, key?: string, value?: any): any;
}
declare namespace katrid.data {
    interface IDataSource {
        name: string;
    }
}
declare namespace Katrid.Data {
    export enum DataSourceState {
        inserting = 0,
        browsing = 1,
        editing = 2,
        loading = 3,
        inactive = 4
    }
    export interface IDataRecord {
        id?: any;
        $record: DataRecord;
    }
    interface IDataSourceConfig {
        model: Katrid.Data.Model;
        fields?: Record<string, Katrid.Data.Field>;
        field?: Katrid.Data.Field;
        readonly?: boolean;
        master?: DataSource;
        pageLimit?: number;
        vm?: any;
        domain?: any;
        context?: any;
    }
    interface IDataSourceSearchOptions {
        where?: any;
        page?: number;
        limit?: number;
        fields?: string[];
        timeout?: number;
        order?: string[];
    }
    interface IDataSourceGetOptions {
        id: number | string;
        index?: number;
        timeout?: number;
        viewType?: string;
    }
    export interface IDataCallback {
        record?: any;
        records?: any[];
    }
    export class DataSource {
        config: IDataSourceConfig;
        readonly: boolean;
        orderBy: string[];
        $modifiedRecords: DataRecord[];
        scope: any;
        action: any;
        _recordIndex: any;
        loading: boolean;
        recordCount: number;
        private _loadingRecord;
        _masterSource: DataSource;
        _pageIndex: number;
        pageLimit: number;
        offset: number;
        offsetLimit: number;
        requestInterval: number;
        private _pendingRequest;
        pendingTimeout: any;
        children: DataSource[];
        modifiedData: any;
        uploading: number;
        rawData: any;
        private _state;
        fieldWatchers: Array<any>;
        _pendingChanges: boolean;
        _recordId: any;
        private _canceled;
        private _params;
        _records: any[];
        model: Katrid.Data.Model;
        private _pendingPromises;
        private _lastFieldName;
        dataCallback: (data: IDataCallback) => void;
        domain: any;
        field: Katrid.Data.Field;
        vm: any;
        private _$form;
        fields: Record<string, Katrid.Data.Field>;
        context: any;
        defaultValues: Record<string, any>;
        private _callbacks;
        constructor(config: IDataSourceConfig);
        create(data?: any): DataRecord;
        registerCallback(cb: any): void;
        unregisterCallback(cb: any): void;
        get pageIndex(): number;
        set pageIndex(page: number);
        requestCallback: any;
        get loadingRecord(): boolean;
        set loadingRecord(value: boolean);
        get pendingRequest(): boolean;
        set pendingRequest(value: boolean);
        private _loadingAction;
        get loadingAction(): boolean;
        set loadingAction(v: boolean);
        changing: boolean;
        get $form(): any;
        set $form(value: any);
        cancel(): Promise<unknown>;
        private _createRecord;
        copy(id: any): Promise<unknown>;
        findById(id: any): any;
        $removeById(id: any): any;
        hasKey(id: any): boolean;
        refresh(data?: any): any;
        refreshRecord(id?: number | string): Promise<unknown>;
        validate(record?: any, raiseError?: boolean): Promise<boolean>;
        indexOf(obj: any): number;
        private _page;
        private _fields;
        getFieldChoices(where: any, timeout?: any): Promise<unknown>;
        where: string;
        search(options: IDataSourceSearchOptions): Promise<unknown>;
        groups: any;
        groupBy(group: any, params: any): Promise<any>;
        _loadGroup(group: any, index?: any, where?: any, parent?: any): Promise<any[]>;
        goto(index: number): number;
        scrollCallback: any;
        moveBy(index: number): void;
        _clearTimeout(): void;
        set masterSource(master: DataSource);
        get masterSource(): DataSource;
        applyModifiedData(form: any, element: any, record: any): any;
        save(autoRefresh?: boolean): Promise<any>;
        delete(sel: any): Promise<void>;
        _getNested(recs: any): any[];
        _getModified(data: any): any;
        getModifiedData(form: any, element: any, record: any): any;
        get(options: IDataSourceGetOptions): Promise<unknown>;
        insert(loadDefaults?: boolean, defaultValues?: any, kwargs?: any): Promise<DataRecord>;
        setValues(values: any, record?: DataRecord): void;
        edit(): void;
        toClientValue(attr: string, value: any): any;
        fieldByName(fieldName: string): Field;
        _modifiedFields: any;
        inserting: boolean;
        editing: boolean;
        stateChangeCallback: any;
        set state(state: DataSourceState);
        get browsing(): boolean;
        childByName(fieldName: string): DataSource;
        get state(): DataSourceState;
        get record(): DataRecord;
        set recordId(value: any);
        get recordId(): any;
        private _record;
        set record(rec: DataRecord | any);
        setRecord(obj: any): any;
        set records(recs: any[]);
        get records(): any[];
        next(): void;
        prior(): void;
        nextPage(): void;
        prevPage(): void;
        set recordIndex(index: any);
        get recordIndex(): any;
        addRecord(rec: any): void;
        expandGroup(index: number, row: any): Promise<void>;
        collapseGroup(index: number, row: any): void;
        _chain(): DataRecord[];
        _applyResponse(res: any): void;
        dispatchEvent(name: string, ...args: any[]): Promise<void>;
        open(): Promise<unknown>;
        get parent(): DataSource;
        set parent(value: DataSource);
        $setDirty(field: any): void;
        destroyChildren(): void;
        childrenNotification(record: any): void;
        parentNotification(parentRecord: any): Promise<void>;
        destroy(): void;
        flush(validate?: boolean, browsing?: boolean): DataRecord;
        discardChanges(): void;
        protected encodeObject(obj: any): any;
        static encodeRecord(dataSource: DataSource, rec: any): any;
        private _fieldChanging;
        $onFieldChange(field: Katrid.Data.Field, newValue: any, record: DataRecord): void;
        encode(record: DataRecord): {};
    }
    export {};
}
declare namespace katrid.ui {
    type DataSource = Katrid.Data.DataSource;
}
declare namespace Katrid.Data {
    let emptyText: string;
}
declare namespace Katrid.Data {
    interface IModelInfo {
        name?: string;
        fields?: Field[] | IFieldInfo[] | Record<string, IFieldInfo> | Record<string, Field>;
        readonly?: boolean;
    }
    class Model {
        name: string;
        fields: Record<string, Field>;
        allFields: any;
        readonly: boolean;
        idField: string;
        nameField: string;
        constructor(info: IModelInfo);
        onFieldChange: (field: Field, value: any) => void;
        private _recordClass;
        get recordClass(): typeof DataRecord;
        private _service;
        get service(): Katrid.Services.ModelService;
        create(data?: any, datasource?: DataSource): DataRecord;
        newRecord(data?: any, datasource?: DataSource): DataRecord;
        fromObject(obj: any, datasource?: DataSource): DataRecord;
        fromArray(list: any[]): DataRecord[];
        flush(rec: DataRecord): void;
        discard(rec: DataRecord): void;
        validate(record: any): void;
    }
}
declare namespace Katrid.Data {
    enum RecordState {
        unmodified = 0,
        destroyed = 1,
        created = 2,
        modified = 3
    }
    class DataRecord {
        $state: RecordState;
        $pristine: Record<string, any>;
        $dirty: boolean;
        $pending: Record<string, any>;
        $data: Record<string, any>;
        $modified: string[];
        id: any;
        [key: string]: any;
        $transient: Record<string, any>;
        $parent: DataRecord;
        $parentField: string;
        $childrenData: DataRecord[];
        constructor(obj?: any);
        $flush(validate?: boolean): true | Katrid.Data.Validation;
        $validate(): Katrid.Data.Validation;
        $destroy(): void;
        $discard(): void;
        $$discard(): void;
        $serialize(): any;
        $reset(): void;
    }
}
declare namespace katrid.sql {
    function exec(query: string, params: any): Promise<any>;
}
declare namespace Katrid.Data {
    interface FieldValidation {
        field: Field;
        msgs: string[];
    }
    export class Validation {
        record: DataRecord;
        valid: boolean;
        model: Model;
        validations: FieldValidation[];
        constructor(record: DataRecord);
        validate(): this;
        showError(): void;
    }
    export {};
}
declare namespace Katrid.Data {
    class Field {
        widget: string;
        cols: any;
        visible: boolean;
        info: any;
        cssClass: string;
        caption: string;
        helpText: string;
        required: boolean;
        onChange: true;
        nolabel: any;
        emptyText: string;
        defaultSearchLookup: string;
        vReadonly: any;
        vRequired: string;
        vMaxLength: any;
        vMinLength: any;
        ngChange: string;
        readonly: boolean;
        displayChoices: Record<string | number, string>;
        choices: any;
        defaultValue: any;
        protected _loaded: boolean;
        name: string;
        boundFields: Katrid.Forms.BoundField[];
        total: string;
        constructor(info: IFieldInfo);
        create(): void;
        setChoices(choices: any): void;
        loadInfo(info: any): void;
        get internalType(): string;
        vShow: string;
        vIf: string;
        vClass: any;
        filter: any;
        attrs: any;
        el: HTMLElement;
        ['constructor']: typeof Field;
        viewType: string;
        inplaceEditor: boolean;
        protected _fieldEl: HTMLElement;
        get fieldEl(): HTMLElement;
        set fieldEl(value: HTMLElement);
        protected setElement(value: HTMLElement): void;
        formLabel(formEl: Element): HTMLLabelElement;
        tag: string;
        protected getControlId(): string;
        formControl(fieldEl?: Element): HTMLElement;
        getValue(value: any): any;
        protected getFieldAttributes(fieldEl: Element): any;
        renderTo(fieldEl: Element, view: Katrid.Forms.ModelView): void;
        formCreate(fieldEl: Element, view: Katrid.Forms.ModelView): HTMLElement;
        widgetHelp: string;
        getTooltip(el: HTMLElement): Katrid.ui.Tooltip;
        createTooltip(section: HTMLElement): void;
        listCreate(view: Katrid.Forms.ListRenderer, fieldEl: HTMLElement): void;
        formSpanTemplate(): string;
        listSpanTemplate(): string;
        listCaptionTemplate(): string;
        cardCreate(): HTMLSpanElement;
        setValue(record: Katrid.Data.DataRecord, value: any, datasource?: DataSource): void;
        get hasChoices(): boolean;
        get model(): string;
        get maxLength(): any;
        get type(): any;
        getParamTemplate(): string;
        format(value: any): any;
        getParamValue(value: any): any;
        $set(val: any): any;
        toJSON(val: any): any;
        createWidget(widget: string, fieldEl: Element): any;
        validate(value: any): string[];
        validateForm(boundField: Katrid.Forms.BoundField, value: any): string[];
        get defaultCondition(): string;
        isControlVisible(condition: any): boolean;
        getFilterConditions(): any[];
        formBind(el: HTMLElement, fieldEl: HTMLElement): Forms.BoundField;
        formUnbind(el: HTMLElement): void;
    }
}
declare namespace Katrid.Data.Fields {
    let registry: any;
    function fromInfo(config: any, name?: string): Katrid.Data.Field;
    function fromArray(fields: any[] | Record<string, any>): any;
}
declare var moment: any;
declare namespace Katrid.Data {
    class DateField extends Field {
        widgetHelp: string;
        loadInfo(info: any): void;
        formSpanTemplate(): string;
        toJSON(val: any): any;
        getParamTemplate(): string;
        getParamValue(value: any): any;
        format(value: any): any;
        tag: string;
        formControl(fieldEl: HTMLElement): HTMLElement;
        createTooltip(section: HTMLElement): void;
        listSpanTemplate(): string;
    }
    class DateTimeField extends DateField {
        formSpanTemplate(): string;
        create(): void;
        listSpanTemplate(): string;
        formControl(fieldEl: HTMLElement): HTMLElement;
        createTooltip(section: HTMLElement): void;
    }
    class TimeField extends Field {
        loadInfo(info: any): void;
        create(): void;
        formSpanTemplate(): string;
        tag: string;
    }
}
declare namespace Katrid.Data {
    class StringField extends Field {
        constructor(info: any);
        getFilterConditions(): any[];
    }
    class ChoiceField extends Field {
        formSpanTemplate(): string;
        formControl(fieldEl: Element): HTMLElement;
    }
    class PasswordField extends StringField {
        formControl(): HTMLElement;
        formSpanTemplate(): string;
    }
    class BooleanField extends Field {
        constructor(info: any);
        formSpanTemplate(): string;
        create(): void;
        getParamTemplate(): string;
        getFilterConditions(): any[];
        formLabel(fieldEl: Element): HTMLLabelElement;
        formControl(fieldEl: Element): HTMLElement;
    }
    class NumericField extends Field {
        tag: string;
        decimalPlaces: number;
        widgetHelp: string;
        constructor(info: any);
        create(): void;
        setValue(record: Katrid.Data.DataRecord, value: any): void;
        toJSON(val: any): any;
        $set(val: any): any;
        formSpanTemplate(): string;
        getParamValue(value: any): any;
    }
    class IntegerField extends NumericField {
        loadInfo(info: any): void;
        create(): void;
        formSpanTemplate(): string;
        formControl(fieldEl: Element): HTMLElement;
        toJSON(val: any): any;
    }
    class FloatField extends NumericField {
    }
    class DecimalField extends NumericField {
        constructor(info: any);
        formControl(fieldEl: Element): HTMLElement;
        listSpanTemplate(): string;
    }
    class TextField extends StringField {
        tag: string;
        formControl(fieldEl: Element): HTMLElement;
    }
    class XmlField extends TextField {
    }
    class JsonField extends TextField {
    }
    class RadioField extends ChoiceField {
        formControl(fieldEl: Element): HTMLElement;
    }
}
declare namespace Katrid.Data {
    class ForeignKey extends Field {
        tag: string;
        vFilter: string;
        formControl(fieldEl?: HTMLElement): HTMLElement;
        listSpanTemplate(): string;
        formSpanTemplate(): string;
        create(): void;
        setChoices(choices: any): void;
        getParamTemplate(): string;
        getParamValue(value: any): any;
        format(value: any): any;
        toJSON(val: any): any;
        setValue(record: Katrid.Data.DataRecord, value: any): any;
        getLabelById(svc: Katrid.Services.ModelService, id: number | string): Promise<unknown>;
        createTooltip(section: HTMLElement): void;
    }
}
declare namespace Katrid.Data {
    class ImageField extends Field {
        noImageUrl: string;
        constructor(info: any);
        get vSrc(): any;
        formSpanTemplate(): string;
        formControl(): HTMLElement;
    }
}
declare namespace Katrid.Data {
    interface IFieldInfo {
        name?: string;
        caption?: string;
        widget?: string;
        type?: string;
        required?: boolean;
        visible?: boolean;
        primaryKey?: boolean;
        choices?: string[] | Record<string, any>;
        defaultValue?: any;
        cols?: number;
        helpText?: string;
        views?: any;
    }
}
declare namespace Katrid.Data {
    class ManyToManyField extends ForeignKey {
        tag: string;
        toJSON(val: any): any;
        loadInfo(info: any): void;
        formCreate(fieldEl: HTMLElement): HTMLElement;
        formSpanTemplate(): string;
    }
}
declare namespace Katrid.Data {
    class OneToManyField extends Field {
        views: Record<string, Katrid.Forms.ModelViewInfo>;
        viewMode: string;
        fields: Katrid.Data.Field[];
        pasteAllowed: boolean;
        create(): void;
        get editor(): string;
        get field(): any;
        loadInfo(info: any): void;
        loadViews(fieldEl?: HTMLElement): Promise<void>;
        setElement(el: HTMLElement): void;
        setValue(record: Katrid.Data.DataRecord, value: any, datasource?: DataSource): void;
        formSpanTemplate(): string;
        formControl(): HTMLElement;
        createTooltip(section: any): void;
        getView(mode?: string): Katrid.Forms.ModelView;
    }
}
declare namespace katrid.db {
    class ClientDatabase {
        config: any;
        db: IDBDatabase;
        name: string;
        version: number;
        tables: any | string[];
        constructor(config: any);
        table(tableName: string): ClientTable;
        open(): Promise<any>;
        transaction(tables: string[], mode?: IDBTransactionMode): IDBTransaction;
    }
    class ClientTable {
        db: ClientDatabase;
        name: string;
        constructor(config: any);
        all(query?: IDBKeyRange | IDBValidKey): Promise<unknown>;
        delete(key: string | number): Promise<any>;
        clear(): Promise<unknown>;
        get(key: string | number): Promise<any>;
        put(item: any, key?: string | number): Promise<any>;
    }
}
declare namespace katrid.ui {
    type ConfirmConfig = {
        title: string;
        html: string;
        dom: HTMLElement;
    };
    export function confirm(config: ConfirmConfig): Promise<boolean>;
    export {};
}
declare namespace Katrid.Forms {
    class MenuItem {
        menu: ContextMenu;
        text: string;
        children: MenuItem[];
        onclick: any;
        el: HTMLElement;
        constructor(menu: ContextMenu, text?: string);
        addEventListener(type: any, listener: any, options?: any): void;
        get index(): number;
    }
    class MenuItemSeparator extends MenuItem {
        constructor(menu: ContextMenu);
    }
    class ContextMenu {
        container: HTMLElement;
        static instances: ContextMenu[];
        items: MenuItem[];
        target: any;
        el: HTMLElement;
        _visible: boolean;
        _eventHook: any;
        _eventKeyDownHook: any;
        constructor(container?: HTMLElement);
        add(item: any, clickCallback?: any): MenuItem;
        insert(index: number, item: any): MenuItem;
        addSeparator(): void;
        protected destroyElement(): void;
        protected createElement(): void;
        show(x: number, y: number, target?: any): void;
        close(): void;
        get visible(): boolean;
        static closeAll(): void;
    }
}
declare namespace katrid.ui {
    const ContextMenu: typeof Katrid.Forms.ContextMenu;
}
declare namespace Katrid.Forms {
    class CustomTag {
        view: BaseView;
        static render(view: BaseView, template: HTMLElement): void;
        selector(): string;
        constructor(view: BaseView, template: HTMLElement);
        prepare(elements: NodeListOf<HTMLElement>, template: HTMLElement): void;
        assign(source: HTMLElement, dest: HTMLElement): void;
    }
    class ActionsTag extends CustomTag {
        prepare(elements: NodeListOf<HTMLElement>, template: HTMLElement): void;
        selector(): string;
        prepareAction(action: HTMLElement): HTMLElement;
    }
    function registerCustomTag(selector: string, customTag: typeof CustomTag | Function): void;
}
declare let Swal: any;
declare let toastr: any;
declare namespace Katrid.Forms.Dialogs {
    class Alerts {
        static success(msg: string): bootstrap.Toast;
        static warning(msg: string): bootstrap.Toast;
        static warn(msg: string): bootstrap.Toast;
        static info(msg: string): bootstrap.Toast;
        static error(msg: string): bootstrap.Toast;
    }
    class WaitDialog {
        static show(): void;
        static hide(): void;
    }
    class ExceptionDialog {
        static show(title: string, msg: string, traceback?: string): void;
    }
    function toast(message: string): void;
    function alert(message: string | any, title?: string, icon?: string): void | bootstrap.Toast;
    function createModal(title?: string, content?: string, buttons?: any[]): HTMLDivElement;
    function createDialog(title?: string, content?: string, buttons?: any[]): bootstrap.Modal;
}
declare namespace Katrid.Forms {
    class BoundField {
        field: Katrid.Data.Field;
        name: string;
        fieldEl: HTMLElement;
        form: FormView;
        container: HTMLElement;
        control: HTMLElement;
        visible: boolean;
        constructor(field: Katrid.Data.Field, name: string, fieldEl: HTMLElement);
        focus(): void;
        private _dirty;
        get dirty(): boolean;
        set dirty(value: boolean);
        get required(): boolean;
        reset(): void;
        private _touched;
        get touched(): boolean;
        set touched(value: boolean);
        private _valid;
        get valid(): boolean;
        set valid(value: boolean);
        get pristine(): boolean;
        set pristine(value: boolean);
        get invalid(): boolean;
        set invalid(value: boolean);
        get untouched(): boolean;
        set untouched(value: boolean);
    }
    class DataForm {
        el: HTMLElement;
        fields: Record<string, BoundField[]>;
        touched: boolean;
        valid: boolean;
        dirty: boolean;
        constructor(el: HTMLElement);
        setFieldValue(field: Katrid.Data.Field, value: any): void;
        setValid(value: any): void;
        reset(): void;
        private _loading;
        setLoading(value: any): void;
    }
    interface IFormField extends HTMLElement {
        $field: BoundField;
    }
    interface IFormElement extends HTMLElement {
        $form: DataForm;
    }
}
declare namespace Katrid.Forms {
    class ModelViewInfo {
        info: IModelViewInfo;
        fields: Record<string, Katrid.Data.Field>;
        content: string;
        toolbar: any;
        autoLoad: boolean;
        constructor(info: IModelViewInfo);
        private _pending;
        loadPendingViews(): Promise<void>;
        get template(): HTMLElement;
    }
}
declare namespace Katrid.Forms {
    function selectionSelectToggle(record: any): void;
    function selectionToggleAll(sel?: boolean): void;
    function tableContextMenu(event: any, config: any): void;
    function listRecordContextMenu(record: any, index: any, event: any): void;
    function unselectAll(): void;
    function selectionDelete(): void;
    class SelectionHelper extends Array<Katrid.Data.DataRecord> {
        private _allSelected;
        private _element;
        get element(): HTMLElement;
        set element(value: HTMLElement);
        get allSelected(): boolean;
        set allSelected(value: boolean);
        selectToggle(record: Katrid.Data.DataRecord): void;
        selectRecord(record: Katrid.Data.DataRecord): void;
        toggleAll(): void;
        unselectRecord(record: Katrid.Data.DataRecord): void;
        unselectAll(): void;
        clear(): void;
    }
}
declare namespace Katrid.Forms {
    class View extends BaseView {
        constructor(info: IView);
    }
}
declare namespace Katrid.Reports {
    class Params {
        static Operations: any;
        static Labels: any;
        static DefaultOperations: any;
        static TypeOperations: any;
        static Widgets: any;
    }
    class Param {
        info: any;
        params: any;
        name: string;
        field: any;
        label: string;
        static: any;
        type: any;
        defaultOperation: any;
        operation: any;
        operations: any;
        exclude: any;
        id: number;
        choices: any;
        constructor(info: any, params?: any);
        defaultValue: any;
        value1: any;
        value2: any;
        el: any;
        setOperation(op: any, focus: any): void;
        createControls(): any;
        getOperations(): {
            id: string;
            text: any;
        }[];
        operationTemplate(): string;
        template(): string;
        render(container: any): any;
        dump(): {
            name: string;
            op: any;
            value1: any;
            value2: any;
            type: any;
        };
    }
    function createParamsPanel(container: HTMLElement, params: Param[]): any;
    class ReportEngine {
        static load(el: any): void;
    }
}
declare namespace Katrid.Reports {
    let currentReport: any;
    let currentUserReport: any;
    class Report {
        action: any;
        info: any;
        name: string;
        id: number;
        values: any;
        filters: any[];
        params: any[];
        groupables: any[];
        sortables: any[];
        totals: any[];
        container: any;
        model: any;
        constructor(action: Katrid.Actions.ReportAction);
        telegram(): void;
        getUserParams(): any;
        loadFromXml(xml: any): void;
        saveDialog(): boolean;
        fields: any;
        load(fields: any, params: any): void;
        autoCreate: boolean;
        loadParams(): void;
        addParam(paramName: string, value?: any): void;
        createParams(container: HTMLElement): void;
        getValues(): void;
        export(format: string): Promise<boolean>;
        preview(): Promise<boolean>;
        renderFields(): JQuery<HTMLElement>;
        elParams: any;
        renderParams(container: any): any;
        renderGrouping(container: any): any;
        renderSorting(container: any): any;
        render(container: any): any;
    }
    function renderDialog(action: Katrid.Actions.ReportAction): string;
}
declare namespace katrid.bi {
    class PreparedPage {
        metadata: any;
        load(metadata: any): void;
    }
    export class MetaDocument {
        type: string;
        pages: PreparedPage[];
        load(metadata: any): void;
    }
    export {};
}
declare var FullCalendar: any;
declare namespace Katrid.Forms {
    class CalendarView extends RecordCollectionView {
        static viewType: string;
        static createViewModeButton(container: HTMLElement): void;
        protected _calendar: FullCalendar.Calendar;
        fieldStart: string;
        fieldEnd: string;
        beforeRender(template: HTMLElement): HTMLElement;
        protected dataSourceCallback(data: Katrid.Data.IDataCallback): void;
        protected _refresh(records: any[]): void;
        renderTemplate(content: HTMLElement): HTMLElement;
        render(): HTMLElement;
    }
}
declare namespace Katrid.Forms {
    class CardRenderer {
        fields: any;
        constructor(fields: any);
        renderField(fieldEl: HTMLElement): HTMLSpanElement;
        render(template: HTMLElement): HTMLElement;
    }
    class CardView extends RecordCollectionView {
        static viewType: string;
        static createViewModeButton(container: HTMLElement): void;
        protected renderTemplate(template: HTMLElement): HTMLElement;
        protected createComponent(): any;
        insert(): void;
    }
}
declare namespace Katrid.Forms {
    class ChartView extends RecordCollectionView {
        static createViewModeButton(container: HTMLElement): void;
    }
}
declare namespace Katrid.Forms {
    import DataSourceState = Katrid.Data.DataSourceState;
    export const changingStates: DataSourceState[];
    export class FormView extends ModelView {
        static viewType: string;
        protected _state: DataSourceState;
        dataForm: DataForm;
        nestedViews: any[];
        dataCallbacks: any[];
        constructor(info: IModelViewInfo);
        protected create(info: Katrid.Forms.IModelViewInfo): void;
        get record(): any;
        set record(value: any);
        addDataCallback(cb: any): void;
        get state(): DataSourceState;
        set state(value: DataSourceState);
        setState(state: DataSourceState): void;
        get inserting(): boolean;
        get editing(): boolean;
        get changing(): boolean;
        renderField(fld: Katrid.Data.Field, fieldEl: HTMLElement): HTMLElement;
        protected sumHooks: Record<string, ISumHookFieldInfo[]>;
        protected addSumHook(field: Katrid.Data.Field, el: HTMLElement): void;
        private _attributes;
        beforeRender(template: HTMLElement): HTMLElement;
        createToolbar(): HTMLElement;
        createElement(): void;
        protected createToolbarButtons(container: HTMLElement): Element;
        protected getComponentData(): any;
        ready(): Promise<void>;
        onHashChange(params: any): Promise<void>;
        render(): HTMLElement;
        private _recordIndex;
        get recordIndex(): number;
        set recordIndex(value: number);
        protected setRecordId(value: number): Promise<void>;
        edit(): void;
        insert(defaultValues?: any): Promise<NodeJS.Timeout>;
        save(): Promise<void>;
        discard(): void;
        next(): void;
        prior(): void;
        moveBy(index: number): void;
        back(index: number, mode?: string): void;
        refresh(): void;
        copy(): Promise<void>;
        protected createComponent(): any;
        $result: any;
        protected createDialog(content: HTMLElement, buttons?: string[] | any[]): HTMLElement;
        showDialog(options?: any): Promise<void>;
        $onFieldChange(field: Katrid.Data.Field, value: any): void;
        static createNew(config: ICreateNewConfig): Promise<FormView>;
        getDisplayText(): string;
        saveAndClose(commit?: boolean): void;
        discardAndClose(): void;
        recordClick(event: any, index: any, record: any): void;
        focus(fieldName?: string): void;
        deleteAndClose(): void;
        private _pendingViews;
        loadPendingViews(): Promise<void>;
        protected $discard(): void;
    }
    interface ICreateNewConfig {
        model: string;
        dialog?: boolean;
        id?: any;
        record?: any;
        buttons?: any[];
    }
    interface ISumHookFieldInfo {
        field: Katrid.Data.Field;
        fieldToSum: string;
    }
    export {};
}
declare namespace Katrid.Forms {
    export interface WidgetOptions {
        el?: Element;
        parent?: Element;
    }
    export class Widget {
        options?: WidgetOptions;
        el: HTMLElement;
        constructor(options?: WidgetOptions);
        protected _create(): void;
        appendTo(parent: Element): HTMLElement;
    }
    export interface CheckBoxOptions extends WidgetOptions {
        text?: string;
    }
    export class CheckBox extends Widget {
        options?: CheckBoxOptions;
        protected _span: HTMLElement;
        constructor(options?: CheckBoxOptions);
        protected _create(): HTMLLabelElement;
        set text(value: string);
        appendTo(parent: Element): HTMLElement;
    }
    interface ISearchModelViewInfo extends IModelViewInfo {
        resultView?: RecordCollectionView;
    }
    export class SearchView extends ModelView {
        static viewType: string;
        private _resultView;
        constructor(info: ISearchModelViewInfo, action?: Katrid.Actions.WindowAction);
        get resultView(): RecordCollectionView;
        set resultView(value: RecordCollectionView);
        protected getComponentData(): any;
        private _dataOffset;
        get dataOffset(): number;
        set dataOffset(value: number);
        private _dataOffsetLimit;
        get dataOffsetLimit(): number;
        set dataOffsetLimit(value: number);
        pageSize: number;
        private _pageIndex;
        get pageIndex(): number;
        set pageIndex(value: number);
        nextPage(): void;
        prevPage(): void;
        protected _vmCreated(vm: any): void;
        protected createComponent(): any;
        update(vm: any): void;
        beforeRender(): HTMLElement;
        controller: Katrid.Forms.Views.Search.SearchViewController;
        render(): HTMLElement;
        load(query: any): void;
        protected _createFavoritesMenu(): void;
        saveSearch(): void;
        renderTo(container: HTMLElement): void;
        protected getFieldConditions(field: Katrid.Data.Field): any;
    }
    export {};
}
declare namespace Katrid.Forms {
    export class ListRenderer {
        viewInfo: Katrid.Forms.IModelViewInfo;
        options?: any;
        tHead: HTMLElement;
        tHeadRow: HTMLElement;
        tBody: HTMLElement;
        tRow: HTMLElement;
        table: HTMLTableElement;
        inlineEditor: boolean;
        rowSelector: boolean;
        constructor(viewInfo: Katrid.Forms.IModelViewInfo, options?: any);
        render(list: HTMLElement, records?: string): HTMLElement;
        columns: Katrid.Data.Field[];
        addField(fld: HTMLElement): void;
        compile(): void;
    }
    export class TableView extends RecordCollectionView {
        static viewType: string;
        private _formCounter;
        forms: Record<number, ITableRowForm>;
        protected _readonly: boolean;
        rowSelector: boolean;
        context: any;
        static createViewModeButton(container: HTMLElement): void;
        static createSearchDialog(config?: any): Promise<TableView>;
        protected create(info: Katrid.Forms.IModelViewInfo): void;
        protected createSelectionInfo(parent: HTMLElement): void;
        _systemContextMenuCreated: boolean;
        protected _createSystemContextMenu(target: HTMLElement): void;
        render(): HTMLElement;
        showDialog(options?: any): Promise<any>;
        createInlineEditor(): HTMLTableRowElement;
        protected _recordClick(record: any, index: number): Promise<void>;
        createFormComponent(record: any): {
            created(): void;
            data(): any;
        };
        protected createComponent(): any;
        edit(index: number): HTMLTableRowElement;
        insert(): void;
        private _removeForm;
        save(formId?: number): void;
        discard(formId?: number | string): void;
        allowGrouping: boolean;
        protected renderTemplate(template: HTMLElement): HTMLDivElement;
        $columns: any[];
        groupBy(data: any[]): Promise<any>;
    }
    interface ITableRowForm {
        formRow: HTMLTableRowElement;
        relRow?: HTMLTableRowElement;
        index: number;
        record: any;
    }
    export function dataTableContextMenu(evt: any): void;
    export {};
}
declare var KATRID_I18N: any;
declare namespace Katrid {
    let intl: {
        number(config: any): any;
        toFixed: (length: number) => any;
    };
    interface IServerFormats {
        DATETIME_FORMAT?: string;
        DATE_FORMAT?: string;
        DECIMAL_SEPARATOR?: string;
        THOUSAND_SEPARATOR?: string;
        NUMBER_GROUPING?: string;
        SHORT_DATETIME_FORMAT?: string;
        SHORT_DATE_FORMAT?: string;
        TIME_FORMAT?: string;
        YEAR_MONTH_FORMAT?: string;
        shortDateFormat?: string;
        reShortDateFormat?: RegExp;
        shortDateTimeFormat?: string;
    }
    interface Ii18n {
        languageCode: string;
        formats: IServerFormats;
        catalog: any;
        plural?: any;
        initialized?: boolean;
        initialize(plural: any, catalog: any, formats: any): void;
        merge(catalog: any): any;
        pluralidx?(n: number): number;
        gettext(s: string): string;
        ngettext(singular: any, plural: any, count: number): string;
        gettext_noop(s: string): string;
        pgettext(s: string): string;
        npgettext(ctx: any, singular: any, plural: any, count: number): string;
        interpolate(fmt: string, obj: any): string;
    }
    const i18n: Ii18n;
}
declare namespace katrid {
    const i18n: Katrid.Ii18n;
}
declare namespace _ {
    const i18n: Katrid.Ii18n;
    const gettext: (s: string) => string;
}
declare namespace Katrid.Forms.Views.Search {
    interface ISchemaItem {
        name: string;
        type: string;
        label: string;
    }
    interface ISchema {
        items: ISchemaItem[];
    }
    class SearchViewController {
        searchView: Katrid.Forms.SearchView;
        query: SearchQuery;
        facets: any[];
        input: HTMLInputElement;
        searchText: string;
        searchItems: any[];
        searchFields: any[];
        filterGroups: any[];
        fields: Record<string, Katrid.Data.Field>;
        groups: SearchGroups[];
        _groupLength: number;
        view: any;
        facetGrouping: FacetGroup;
        menu: HTMLElement;
        groupLength: number;
        viewContent: Element;
        model: Katrid.Services.ModelService;
        private _schema;
        action: Katrid.Actions.WindowAction;
        vm: any;
        constructor(searchView: Katrid.Forms.SearchView);
        get text(): any;
        get schema(): any;
        set schema(value: any);
        setContent(schema: HTMLElement | ISchema): void;
        addItem(item: SearchItem): void;
        private _availableItems;
        get availableItems(): any[];
        show(): void;
        close(): void;
        reset(): void;
        clear(): void;
        addCustomFilter(field: Katrid.Data.Field, value: any): void;
        first(): void;
        removeItem(index: number): void;
        getParams(): any[];
        addFacet(facet: any): void;
        load(filter: any[]): void;
        getByName(name: string): any;
        dump(): any[];
        onUpdate: any;
        update(): Promise<void>;
        groupBy(): string[];
    }
}
declare namespace Katrid.Forms.Views.Search {
    let conditionsLabels: any;
    let conditionSuffix: any;
    class SearchItem {
        view: Katrid.Forms.SearchView;
        name: string;
        el: Element;
        value: any;
        pattern: RegExp;
        searchString: string;
        controller: SearchViewController;
        constructor(view: Katrid.Forms.SearchView, name: string, el: Element);
        test(s: string): boolean;
        getDisplayValue(): any;
        getParamValue(name: any, value: any): any;
        _doChange(): void;
    }
    class SearchFilter extends SearchItem {
        protected _selected: boolean;
        caption: string;
        group: SearchFilters;
        constructor(view: Katrid.Forms.SearchView, name: string, caption: string, domain?: any, group?: SearchFilters, el?: HTMLElement);
        static fromItem(view: any, el: HTMLElement, group: any): SearchFilter;
        toString(): string;
        toggle(): void;
        get selected(): boolean;
        set selected(value: boolean);
        getDisplayValue(): string;
        get facet(): FacetView;
        domain: any;
        getParamValue(): any;
        get value(): any;
    }
    class SearchFilters {
        view: Katrid.Forms.SearchView;
        private _selection;
        controller: SearchViewController;
        facet: FacetView;
        items: SearchItem[];
        constructor(view: Katrid.Forms.SearchView, facet?: FacetView);
        static fromItem(view: Katrid.Forms.SearchView, el: any): SearchFilters;
        static fromGroup(view: any, el: any): SearchFilters;
        private _selected;
        get selected(): boolean;
        set selected(value: boolean);
        toggle(): void;
        addValue(item: any): void;
        removeValue(item: any): void;
        selectAll(): void;
        get caption(): string;
        toString(): string;
        _refresh(): void;
        getParamValue(v: any): any;
        clear(): void;
        push(item: SearchFilter): void;
    }
    class SearchObject {
        _ref: any;
        display: any;
        value: any;
        constructor(display: any, value: any);
    }
    class SearchResult {
        field: any;
        value: any;
        text: string;
        indent: boolean;
        constructor(field: any, value: any);
        select(): void;
    }
    class SearchField extends SearchItem {
        field: any;
        private _expanded;
        expandable: any;
        children: any[];
        options: any;
        searchKey: string;
        caption: string;
        constructor(view: any, name: any, el: HTMLElement, field: any);
        get expanded(): boolean;
        set expanded(value: boolean);
        loading: boolean;
        _loadChildren(): void;
        protected _facet: any;
        get facet(): any;
        getDisplayValue(): any;
        lookup: string;
        getParamValue(value: any): any;
        _value: any;
        get value(): any;
        select(): Promise<boolean>;
        selectItem(item: any): void;
        static fromField(view: Katrid.Forms.SearchView, el: HTMLElement): SearchField;
        get template(): string;
    }
}
declare namespace Katrid.Forms.Views.Search {
    class CustomFilterItem extends SearchFilter {
        field: any;
        condition: any;
        _value: any;
        constructor(view: Katrid.Forms.SearchView, field: Katrid.Data.Field, condition: string, value: any, group: SearchFilters);
        toString(): string;
        get value(): any;
    }
    class CustomFilterHelper {
        searchView: SearchViewController;
        constructor(searchView: SearchViewController, container: HTMLElement);
    }
    class GroupFilterHelper {
        constructor(searchView: SearchViewController, container: HTMLElement);
    }
    class SaveFilterHelper {
        constructor(searchView: SearchViewController, container: HTMLElement);
    }
}
declare namespace Katrid.Forms.Views.Search {
    class FacetView {
        item: any;
        values: any[];
        constructor(item: any);
        get separator(): string;
        init(item: any, values: any[]): void;
        addValue(value: any): number;
        get caption(): any;
        clear(): void;
        get templateValue(): string;
        template(): string;
        link(searchView: any): JQuery<HTMLElement>;
        element: any;
        render(el: any): void;
        refresh(): any;
        load(searchView: any): void;
        destroy(): void;
        getParamValues(): any[];
    }
}
declare namespace Katrid.Forms.Views.Search {
    class FacetGroup extends FacetView {
        grouping: boolean;
        constructor(...args: any[]);
        clear(): void;
        get separator(): string;
        get caption(): string;
    }
    class SearchGroups extends SearchFilters {
        constructor(view: SearchView, facet: any);
        static fromGroup(opts: any): SearchGroups;
        static fromField({ view, field }: {
            view: any;
            field: any;
        }): SearchGroups;
        addValue(item: any): void;
        removeValue(item: any): void;
        _refresh(): void;
    }
    class SearchGroup extends SearchFilter {
        context: any;
        groupBy: string | string[];
        constructor(view: SearchViewController, name: string, caption: string, group: any, el?: HTMLElement);
        static fromItem(view: any, el?: HTMLElement, group?: any): SearchGroup;
        static fromField(view: any, field: any, group?: any): SearchGroup;
        toString(): string;
    }
}
declare namespace Katrid.Forms.Views.Search {
    class SearchQuery {
        items: any[];
        groups: any[];
        searchView: any;
        constructor(searchView: any);
        add(item: any): void;
        loadItem(item: any): void;
        remove(item: any): void;
        getParams(): any;
    }
}
declare namespace Katrid.Forms.Controls {
}
declare namespace Katrid.Forms.Controls {
}
declare namespace Katrid.Forms.Widgets {
    class Widget {
        field: Katrid.Data.Field;
        fieldEl: Element;
        constructor(field: Katrid.Data.Field, fieldEl: Element);
        renderToForm: (fieldEl: Element, view?: any) => HTMLElement;
        formControl: (fieldEl: Element) => HTMLElement;
        formLabel(): HTMLLabelElement;
        spanTemplate: (fieldEl: Element, view?: any) => HTMLElement;
        afterRender(el: HTMLElement): HTMLElement;
    }
    let registry: Record<string, any>;
}
declare namespace katrid.forms.widgets {
    class CodeEditor extends katrid.ui.WebComponent {
        codeEditor: any;
        el: HTMLElement;
        value: string;
        lang: string;
        readonly: boolean;
        private _observer;
        protected _create(): Promise<unknown>;
        protected _checkReadonly(parent: Element): void;
        setValue(value: string): void;
    }
}
declare namespace Katrid.UI {
    class InputMask {
        el: HTMLInputElement;
        private options?;
        private _changed;
        private _inputMask;
        constructor(el: HTMLInputElement, options?: any);
        protected _keyPress(event: KeyboardEvent): boolean;
        protected _keyDown(event: KeyboardEvent): boolean;
        protected _format(): void;
        protected _create(): void;
        protected _invalidate(): void;
    }
}
declare namespace Katrid.Forms {
    class InputDate extends Katrid.UI.InputMask {
    }
}
declare namespace katrid.utils {
    function autoCompleteDate(s: string, format: string): Date;
}
declare namespace Katrid.UI {
    function toggleFullScreen(): void;
}
interface JQuery {
    select2(...args: any[]): JQuery;
    modal(...args: any[]): JQuery;
    tabset(...args: any[]): JQuery;
    dropdown(...args: any[]): JQuery;
    toast(...args: any[]): JQuery;
    inputmask(...args: any[]): any;
    datetimepicker(...args: any[]): JQuery;
}
declare namespace Katrid.Forms {
    class InputDecimal {
        element: HTMLInputElement;
        protected _formula: boolean;
        private _changed;
        constructor(element: HTMLInputElement);
        protected _formatValue(val: number): string;
        protected _format(): void;
        protected _create(): void;
        protected _invalidate(): void;
        getValue(): number;
        setValue(v: number | string): void;
    }
}
declare namespace katrid.ui {
    let InputDecimal: typeof Katrid.Forms.InputDecimal;
}
declare namespace Katrid.Forms.Widgets {
    class StatusField extends Widget {
        renderToForm(): HTMLElement;
    }
    class RadioField extends Widget {
        formControl(): HTMLElement;
    }
    class StatValue extends Widget {
        renderToForm(): HTMLElement;
    }
    class PasswordField extends Widget {
        afterRender(el: HTMLElement): HTMLElement;
    }
}
declare var Popper: any;
declare namespace Katrid.UI {
    export const keyCode: any;
    interface DropdownItem {
        id: any;
        text: string;
        template?: string | any;
    }
    export class DropdownMenu {
        protected options?: any;
        el: HTMLElement;
        template: string | any;
        waitTemplate: string | any;
        activeItem: HTMLElement;
        _source: any;
        _loading: boolean;
        delay: number;
        items: DropdownItem[];
        private _pendingTimeout;
        private _elements;
        private _wait;
        private _popper;
        input: InputAutoComplete;
        target: HTMLElement;
        constructor(input?: InputAutoComplete | any, options?: any);
        show(): void;
        hide(): void;
        get visible(): boolean;
        loadItems(items: any[]): void;
        clearItems(): void;
        _pending: any;
        init(): void;
        search(): Promise<unknown>;
        cancelSearch(): void;
        showWait(): void;
        hideWait(): void;
        get loading(): boolean;
        set loading(value: boolean);
        mouseDown: boolean;
        addItem(item: any): HTMLElement;
        onSelectItem(item?: HTMLElement): CustomEvent<any>;
        onActivateItem(item: HTMLElement): void;
        onDeactivateItem(item: HTMLElement): void;
        move(distance: number): void;
        get source(): any | string;
        set source(value: any | string);
    }
    export class BaseInputWidget {
        protected _options: any;
        el: HTMLElement;
        constructor(_options: any);
        protected _create(el: HTMLElement): void;
    }
    export type AutoCompleteOptions = {
        el: HTMLElement;
        source?: any;
    };
    export class BaseAutoComplete extends BaseInputWidget {
        field: any;
        $selectedItem: any;
        menu: DropdownMenu;
        onChange: any;
        closeOnChange: boolean;
        input: HTMLInputElement;
        private _source;
        term: string;
        multiple: boolean;
        allowOpen: boolean;
        constructor(options: AutoCompleteOptions | HTMLSelectElement);
        protected _create(el: HTMLElement): void;
        private _tags;
        private _facets;
        protected _addTag(tag: any): boolean;
        addTag(tag: any): void;
        removeTag(tag: any): void;
        set tags(value: any[]);
        private _setValues;
        protected onInput(): void;
        protected onClick(): void;
        protected onFocusout(): void;
        protected createMenu(): void;
        protected invalidateValue(): void;
        protected onKeyDown(evt: any): void;
        showMenu(): void;
        hideMenu(): void;
        menuVisible(): boolean;
        setOptions(options: any): void;
        setSource(value: any | string): void;
        _selectItem(el?: HTMLElement): CustomEvent<any>;
        _setValue(item: any, el?: HTMLElement): CustomEvent<{
            item: any;
            dropdownItem: HTMLElement;
        }>;
        setValue(item: any, el?: HTMLElement): CustomEvent<any>;
        get selectedItem(): any;
        set selectedItem(value: any);
        get selectedValue(): any;
        get value(): any;
        set value(value: any);
    }
    export class InputAutoComplete extends BaseAutoComplete {
        protected _create(el: HTMLElement): void;
    }
    export {};
}
declare namespace katrid.ui {
    let InputAutoComplete: typeof Katrid.UI.InputAutoComplete;
}
declare namespace Katrid.Forms.Controls {
    class InputForeignKeyElement extends Katrid.UI.BaseAutoComplete {
        actionView: any;
        allowAdvancedSearch: boolean;
        allowCreateNew: boolean;
        filter: any;
        bind(options: any): void;
    }
}
declare namespace Katrid.Forms {
}
declare namespace katrid.ui {
    function inputRegexPattern(el: HTMLElement, pattern: string): void;
}
declare namespace katrid.forms.widgets {
    class ModelPermissionsWidget extends katrid.admin.ModelPermissionsWidget {
    }
}
declare namespace Katrid.Forms {
}
declare namespace katrid.forms.widgets {
}
declare namespace Katrid.Forms.Controls {
}
declare namespace Katrid.Forms.Widgets {
}
declare namespace Katrid.Forms.Widgets {
}
declare namespace Katrid.Forms.Widgets {
}
declare namespace katrid.ui {
    class UserCommentsElement extends WebComponent {
        private _datasource;
        private _callback;
        protected _panel: HTMLElement;
        protected _textEditor: HTMLTextAreaElement;
        protected _file: HTMLInputElement;
        protected _files: any[];
        protected _recordId: any;
        get datasource(): DataSource;
        set datasource(value: DataSource);
        protected create(): void;
        protected createEditor(): void;
        showEditor(): void;
        closeEditor(): void;
        addFile(event: Event): void;
        protected _sendMessage(msg: string, attachments: any[]): Promise<void>;
        sendMessage(msg: string): Promise<void>;
        protected parentNotification(record: any): Promise<void>;
        protected _createComment(comment: any): HTMLElement;
    }
}
declare namespace Katrid.Services {
    abstract class BaseAdapter {
        abstract $fetch(url: any, data: any, params?: any): any;
    }
    class LocalMemoryConnection {
    }
    class FetchAdapter extends BaseAdapter {
        $fetch(url: any, config: any, params: any): Promise<Response>;
        fetch(rpcName: any, config: any): Promise<Response>;
    }
}
declare namespace Katrid.Services {
    class JsonRpcAdapter extends FetchAdapter {
    }
}
declare namespace Katrid.Services {
    class Service {
        name: string;
        static url: string;
        constructor(name: string);
        static adapter: BaseAdapter;
        static $fetch(url: any, config: any, params?: any): any;
        static $post(url: any, data: any, params?: any): any;
        get(name: string, params: any): JQuery.jqXHR<any>;
        post(name: string, data: any, params?: any, config?: any, context?: any): Promise<unknown>;
    }
    class Data extends Service {
        static get url(): string;
        reorder(model: any, ids: any, field?: string, offset?: number): Promise<unknown>;
    }
    class Attachments {
        static delete(id: any): void;
        static upload(file: any, config: any): Promise<any>;
    }
    class Upload {
        static callWithFiles(config: any): any;
        static sendFile(config: any): void;
        static uploadTo(url: any, file: any): JQuery.jqXHR<any>;
    }
    let data: Data;
    function post(url: string, data: any): Promise<any>;
}
declare namespace Katrid.Services {
    export interface IGetFieldChoices {
        field: string;
        term?: string;
        kwargs?: any;
        filter?: any;
        config?: any;
        context?: any;
    }
    interface ISearchParams {
        count?: boolean;
        page?: number;
        where?: any;
        fields?: string[];
        domain?: any;
        limit?: number;
    }
    export class ModelService extends Service {
        searchByName(kwargs: any): Promise<unknown>;
        createName(name: string): Promise<unknown>;
        search(params: ISearchParams, data?: any, config?: any, context?: any): any;
        listId(params: any, config?: any, context?: any): Promise<any>;
        delete(id: any): Promise<unknown>;
        getById(id: any, config?: any): any;
        getDefaults(kwargs: any, config?: any): Promise<unknown>;
        copy(id: any): Promise<unknown>;
        protected static _prepareFields(res: any): any;
        getViewInfo(data: any): Promise<any>;
        loadViews(data?: any): Promise<any>;
        getFieldsInfo(data: any): Promise<any>;
        getFieldChoices(config: IGetFieldChoices): Promise<unknown>;
        getFieldChoice(config: IGetFieldChoices): Promise<unknown>;
        doViewAction(data: any): Promise<unknown>;
        callAdminViewAction(data: any): Promise<unknown>;
        callSubAction(action: string, data: any): Promise<unknown>;
        write(data: any, params?: any): Promise<unknown>;
        groupBy(grouping: any, params: any): any;
        autoReport(): Promise<unknown>;
        rpc(meth: any, args?: any, kwargs?: any): Promise<unknown>;
    }
    export class Query extends ModelService {
        id?: number | string;
        constructor(id?: number | string);
        static read(config: any): any;
        static all(): any;
        getMetadata(devInfo?: boolean): any;
        execute(config: any): Promise<any>;
        static executeSql(sql: string): Promise<unknown>;
    }
    export class Actions extends ModelService {
        static load(action: any): Promise<Katrid.Specification.UI.IActionInfo>;
        static onExecuteAction(action: string, actionType: string, context: any): Promise<unknown>;
    }
    export {};
}
declare var openDatabase: (...args: any[]) => void;
declare namespace Katrid.Services {
    class WebSQLAdapter extends BaseAdapter {
        constructor(...args: any[]);
        $fetch(url: any, data: any, params?: any): void;
    }
}
declare namespace katrid.sql {
    class Select {
    }
    class From {
    }
    class Alias {
        name: string;
        constructor(name: string);
    }
    function select(): void;
    function from(): void;
}
declare const select: typeof katrid.sql.select;
declare namespace katrid.test {
    function click(selector: string): void;
    function modelActionTour(args: any): Promise<void>;
    function waitFor(selector: string, timeout?: number): Promise<HTMLElement>;
    function menuClick(...path: string[]): Promise<void>;
    function sendKeys(field: string, text: string, value?: any): Promise<void>;
    class Tour {
        parent?: HTMLElement;
        navigationInterval: number;
        constructor(parent?: HTMLElement);
        textClick(text: string): Promise<void>;
        set(field: string | HTMLElement, value: string): Promise<void>;
        menuClick(path: string[]): Promise<void>;
        waitFor(selector: string, timeout?: number): Promise<HTMLElement>;
        click(selector: string): void;
        sendKeys(el: HTMLInputElement, value: string): Promise<void>;
        sendKeysToField(container: HTMLElement, field: string, value: string): Promise<void>;
        addRecordTo(el: HTMLElement, data: any): Promise<void>;
        editRecordFrom(el: HTMLElement, data: any): Promise<void>;
        deleteRecordFrom(el: HTMLElement, index: number): Promise<void>;
        protected _setFields(data: any, container: Element): Promise<void>;
        protected _modelAction(op: string, step: any): Promise<void>;
        modelActionTour(structure: any): Promise<void>;
        assert(condition: any): Promise<void>;
        protected _step(step: any): Promise<boolean>;
        tour(steps: any): Promise<void>;
    }
    function runTour(steps: any): Promise<void>;
    function tour(fn: Function): Promise<void>;
}
declare namespace Katrid.ui {
    class Application extends Katrid.Core.WebApplication {
    }
}
declare namespace Katrid.UI {
    import IMenuInfo = Katrid.Core.IMenuInfo;
    export class AppHeader extends Katrid.WebComponent {
        nav: HTMLElement;
        navMenu: HTMLElement;
        private _rootItem;
        private _timeout;
        private _menuClicked;
        app: Katrid.Core.WebApplication;
        protected inputSearch: any;
        protected autocomplete: AppGlobalSearch;
        protected create(): void;
        loadModules(items: IMenuInfo[]): void;
        createMenu(menu: IMenuInfo): HTMLAnchorElement;
        showMenu(li: HTMLElement): void;
        private _currentMenu;
        hideMenu(): void;
        createDropdownMenu(items: IMenuInfo[]): HTMLDivElement;
        createDropdownItem(item: IMenuInfo): HTMLAnchorElement;
        createMenuItem(item: IMenuInfo, dropdownMenu: HTMLElement): HTMLElement;
        createUserMenu(): void;
    }
    export interface IFindMenuOptions {
        term: string;
    }
    class AppGlobalSearch {
        input: HTMLInputElement;
        $selectedItem: any;
        menu: DropdownMenu;
        term: string;
        private _source;
        private _localMenuCache;
        constructor(input: HTMLInputElement, menu: Katrid.Core.IMenuInfo[]);
        private _registerMenuItem;
        protected onInput(): void;
        protected onClick(): void;
        protected onFocusout(): void;
        protected createMenu(): void;
        protected invalidateValue(): void;
        protected onKeyDown(evt: any): void;
        private _dataValue;
        showMenu(): void;
        hideMenu(): void;
        menuVisible(): boolean;
        setOptions(options: any): void;
        setSource(value: any | string): void;
        _selectItem(el?: HTMLElement): void;
        setValue(item: any, el?: HTMLElement): CustomEvent<any>;
        get selectedItem(): any;
        set selectedItem(value: any);
        get selectedValue(): any;
    }
    export {};
}
declare namespace Katrid.ui {
    interface IButtonConfig {
        text?: string;
        click: (MouseEvent: any) => unknown;
    }
    class Button {
        config: IButtonConfig;
        text: string;
        onClick: (MouseEvent: any) => unknown;
        constructor(config: IButtonConfig);
    }
}
declare namespace Katrid.ui {
    interface ICalendarConfig {
        change?: (value: string) => void;
        date?: Date;
    }
    export class Calendar {
        config: ICalendarConfig;
        element: HTMLElement;
        target: HTMLElement;
        private _popper;
        private _docMouseEvent;
        private _date;
        constructor(el: HTMLElement, config: ICalendarConfig);
        get date(): Date;
        set date(value: Date);
        protected _renderMonthCalendar(year: number, month: number): void;
        protected dayMouseDown(event: MouseEvent): void;
        protected dayClick(event: MouseEvent): void;
        protected _renderDay(date: Date): HTMLDivElement;
        render(): HTMLElement;
        show(): void;
        hide(): void;
    }
    export {};
}
declare namespace katrid.ui {
    function openFileDialog(accept: string, multiple?: boolean): Promise<HTMLInputElement>;
}
declare namespace katrid.filters {
    function date(value: any, fmt?: string): any;
    function shortDate(value: any): any;
    function dateTimeHumanize(value: any): string;
}
declare function sprintf(fmt: string, obj: any): string;
declare namespace Katrid.UI {
    class HelpProvider {
        getTooltipHelp(tooltip: Katrid.ui.Tooltip): string;
    }
    let helpProvider: HelpProvider;
}
declare namespace Katrid.UI {
    class HelpCenter {
        app?: Katrid.Core.WebApplication;
        element: HTMLElement;
        container: HTMLElement;
        private readonly _actionChanged;
        private _timeout;
        constructor(app?: Katrid.Core.WebApplication);
        clear(): void;
        actionChanged(timeout?: number): void;
        destroy(): void;
        createElement(): void;
        collectHelp(): void;
    }
    function helpCenter(): HelpCenter;
}
declare namespace Katrid.ui {
    class Input {
        input: HTMLInputElement;
        constructor(input: HTMLInputElement);
    }
}
declare namespace katrid.ui {
    interface IOutlineInfo {
        name?: string;
        type?: string;
        template?: string;
        children?: IOutlineInfo[];
        target: IOutlineObject;
        getContextMenu?(): Katrid.Forms.ContextMenu;
    }
    interface IOutlineObject {
        getOutlineInfo(): IOutlineInfo;
        parent?: IOutlineObject;
    }
}
declare var Plotly: any;
declare namespace Katrid.Forms.Widgets {
    class PlotlyChart extends HTMLElement {
        connectedCallback(): void;
        private transformData;
    }
}
declare namespace Katrid.UI.Utils {
    function tableToText(table: HTMLTableElement): string;
    function toTsv(data: any[]): string;
    function textToDownload(s: string, filename?: string): void;
}
declare namespace Katrid.UI {
    class Toast {
        static _container: HTMLElement;
        static createElement(config: any): HTMLDivElement;
        static show(config: any): bootstrap.Toast;
        static danger(message: any): bootstrap.Toast;
        static success(message: any): bootstrap.Toast;
        static info(message: any): bootstrap.Toast;
        static warning(message: any): bootstrap.Toast;
    }
    function showMessage(message: string): unknown;
}
declare namespace katrid.ui {
    type ButtonOptions = {
        text?: string;
        iconClass?: string;
        icon?: string;
        onClick?: (evt: MouseEvent) => void;
    };
    export class Toolbar {
        container?: HTMLElement;
        el: HTMLElement;
        private _vertical;
        constructor(container?: HTMLElement);
        create(): void;
        addButton(text: string | ButtonOptions): HTMLButtonElement;
        addSeparator(): void;
        addGroup(): ToolButtonGroup;
        get vertical(): boolean;
        set vertical(value: boolean);
        showFloating(x: number, y: number): void;
    }
    export class ToolButtonGroup {
        toolbar: Toolbar;
        el: HTMLElement;
        constructor(toolbar: Toolbar);
        create(): void;
        addButton(text: string | ButtonOptions): HTMLButtonElement;
    }
    export {};
}
declare namespace Katrid.ui {
    class Tooltip {
        element: HTMLElement;
        target: HTMLElement;
        onShow: Function;
        documentation: string;
        private _additionalTip;
        private _popper;
        constructor(el: HTMLElement, config: any);
        protected createElement(text: string): HTMLElement;
        show(text: string): void;
        hide(): void;
        loadAdditionalTip(): void;
    }
}
declare namespace katrid.ui {
    const Tooltip: typeof Katrid.ui.Tooltip;
}
declare namespace katrid.ui {
    export class Component {
        protected _el: HTMLElement;
        get el(): HTMLElement;
        set el(value: HTMLElement);
        protected setElement(el: any): void;
    }
    export type NodeData = {
        id?: any;
        text: string;
        icon?: string;
        title?: string;
        children?: NodeData[];
        checked?: boolean;
        [key: string]: any;
    };
    type NodeIcons = {
        default?: string;
        expanded?: string;
        collapsed?: string;
    };
    type TreeNodeOptions = {
        icons?: NodeIcons;
        checkbox?: boolean;
        onContextMenu?: (node: TreeNode, evt: MouseEvent) => void;
        onDblClick?: (node: TreeNode, evt: MouseEvent) => void;
        onSelect?: (node: TreeNode) => void;
        onExpand?: (node: TreeNode) => Promise<boolean>;
        onCollapse?: (node: TreeNode) => Promise<boolean>;
        onCheckChange?: (node: TreeNode) => void;
        onChecked?: (node: TreeNode) => void;
    };
    export type TreeViewOptions = {
        data?: NodeData | NodeData[];
        options?: TreeNodeOptions;
    };
    export class TreeNode {
        treeView: TreeView;
        options?: TreeNodeOptions;
        data: any;
        private readonly _ul;
        private readonly _a;
        private readonly _exp;
        private _iconElement;
        private _parent;
        private readonly _children;
        private _selected;
        private _expanded;
        private _canExpand;
        private _level;
        private _icon;
        private _checked;
        el: HTMLElement;
        constructor(treeView: TreeView, item: any, options?: TreeNodeOptions);
        get children(): TreeNode[];
        clear(): void;
        select(): this;
        collapse(): void;
        checkbox: HTMLInputElement;
        createCheckbox(): void;
        setCheckAll(value: boolean): void;
        setText(value: string): void;
        protected setChecked(value: boolean | 'indeterminate'): void;
        get checked(): boolean | 'indeterminate';
        set checked(value: boolean | string);
        protected updateCheckboxState(): void;
        expand(): Promise<void>;
        get expanded(): boolean;
        set expanded(value: boolean);
        get index(): number;
        get previousSibling(): TreeNode;
        get nextSibling(): TreeNode;
        get previous(): TreeNode;
        get next(): TreeNode;
        get first(): TreeNode;
        get last(): TreeNode;
        get selected(): boolean;
        set selected(value: boolean);
        get parent(): TreeNode;
        set parent(value: TreeNode);
        protected _addNode(node: TreeNode): void;
        addNode(node: TreeNode): TreeNode;
        addItem(item: NodeData, options?: TreeNodeOptions): TreeNode;
        remove(): void;
        protected removeNode(node: TreeNode): void;
        private calcLevel;
        update(): void;
        get level(): number;
        set level(value: number);
        all(): IterableIterator<TreeNode>;
    }
    export class TreeView {
        options?: TreeViewOptions;
        nodes: TreeNode[];
        readonly el: HTMLElement;
        private _ul;
        private _selection;
        private _striped;
        readonly: boolean;
        constructor(el: HTMLElement, options?: TreeViewOptions);
        get selection(): TreeNode[];
        set selection(value: TreeNode[]);
        get firstNode(): TreeNode;
        get lastNode(): TreeNode;
        previous(): void;
        next(): void;
        addNodes(nodes: TreeViewOptions, parent?: any): void;
        addItem(item: NodeData | string, parent?: TreeNode, options?: TreeNodeOptions): TreeNode;
        all(): Generator<TreeNode>;
        get currentNode(): TreeNode;
        collapseAll(): void;
        expandAll(): void;
        get striped(): boolean;
        set striped(value: boolean);
        update(): void;
        clear(): void;
    }
    export {};
}
declare namespace katrid.ui {
    function search(config: any): Promise<any>;
}
declare namespace katrid.ui {
    class BaseView {
        constructor(config: any);
        $render(vm: any): any;
    }
    class ModelView extends BaseView {
        model: Katrid.Data.Model;
        constructor(config: any);
    }
    class RecordCollectionView extends BaseView {
    }
    class TableView extends RecordCollectionView {
        createTableRow(): void;
    }
    class CardView extends RecordCollectionView {
        quickCreateItem(): void;
        createCardItem(): void;
        createCardGroup(): void;
    }
}
declare var kui: typeof katrid.ui;
declare namespace katrid.ui {
    export class Alerts {
        static success(msg: string): bootstrap.Toast;
        static warning(msg: string): bootstrap.Toast;
        static warn(msg: string): bootstrap.Toast;
        static info(msg: string): bootstrap.Toast;
        static error(msg: string): bootstrap.Toast;
    }
    export function createDialogElement(config: DialogConfig): HTMLDialogElement;
    export class ExceptionDialog {
        static show(title: string, msg: string, traceback?: string): void;
        static showValidationError(title: string, msg: string, model: katrid.data.Model, errors: katrid.data.ValidationResult): string;
    }
    export function createModal(title?: string, content?: string, buttons?: any[]): HTMLDivElement;
    export function createDialog(title?: string, content?: string, buttons?: any[]): bootstrap.Modal;
    export enum DialogResult {
        ok = "ok",
        cancel = "cancel",
        yes = "yes",
        no = "no",
        close = "close"
    }
    type DialogConfig = {
        title: string;
        content?: string;
        buttons?: any[];
    };
    export class Dialog {
        dialog: HTMLDialogElement;
        dialogPromise: Promise<any>;
        protected resolve: any;
        protected reject: any;
        constructor(config: DialogConfig);
        showModal(): Promise<any>;
        close(): void;
    }
    export {};
}
declare namespace katrid.ui {
    class Toast {
        static _container: HTMLElement;
        static createElement(config: any): HTMLDivElement;
        static show(config: any): bootstrap.Toast;
        static danger(message: any): bootstrap.Toast;
        static success(message: any): bootstrap.Toast;
        static info(message: any): bootstrap.Toast;
        static warning(message: any): bootstrap.Toast;
    }
    function showMessage(message: string): unknown;
}
declare namespace katrid.ui {
    function showWaitDialog(config?: string | {
        message?: string;
    }): void;
    function closeWaitDialog(): void;
    class WaitDialog {
        static show(msg?: string): void;
        static hide(): void;
    }
}
declare namespace katrid.ui {
    class CellInput {
        grid: BaseGrid;
        cell: TableCell;
        el: HTMLElement;
        value: string;
        protected _prevElement: HTMLElement;
        constructor(grid: BaseGrid, cell: TableCell);
        protected create(): void;
        private _blurHandler;
        apply(): void;
        applyValue(): void;
        destroy(): void;
        appendTo(parent: HTMLElement): HTMLElement;
        select(): void;
    }
}
declare namespace katrid.ui {
    export class TableCell {
        y?: number;
        x?: number;
        content: string;
        font?: string;
        el?: HTMLElement;
        touched: boolean;
    }
    export class TableColumn {
        dataIndex: number | string;
        caption?: string;
        width?: number | string;
        visible?: boolean;
    }
    interface GridRow extends Array<TableCell> {
        rowIndex?: number;
        rowElement: Element;
    }
    export class TableColumns extends katrid.OwnedCollection<TableColumn> {
        notify(action: katrid.CollectionNotifyEvents, item: katrid.ui.TableColumn): void;
    }
    export const RE_EDIT: RegExp;
    class SelectionBox {
        el: HTMLElement;
        constructor(container?: HTMLElement);
        create(): void;
        setBounds(x: number, y: number, width: number, height: number): void;
        destroy(): void;
    }
    export class CellsRange {
        startRow: number;
        startCol: number;
        endRow: number;
        endCol: number;
        cells: TableCell[];
        constructor(startRow: number, startCol: number, endRow: number, endCol: number);
        static fromCells(cells: TableCell[]): CellsRange;
        getRect(): DOMRect;
        cellInRange(row: number, col: number): boolean;
        rowInRange(row: number): boolean;
        equals(range: CellsRange): boolean;
    }
    export enum GridHeaderEnumerator {
        number = 1,
        letter = 2
    }
    export class BaseGridHeaderItem {
        height: number;
        width: number;
        createElement(counter: number | string): HTMLElement;
    }
    export class AutoGridHeaderItem extends BaseGridHeaderItem {
        enumerator: GridHeaderEnumerator;
        initialCounter: number | string;
        constructor(enumerator: GridHeaderEnumerator);
        createElement(counter: number | string): HTMLElement;
        getNextNumber(counter: number): number;
        getNextLetter(counter: string): string;
    }
    export class GridHeaderItem {
        value: string;
    }
    export class BaseGrid implements katrid.Persistent {
        columns: TableColumns;
        dataRows: any[];
        header: BaseGridHeaderItem[];
        footer: any[];
        rowHeader: BaseGridHeaderItem[];
        rowHeight: number;
        colWidth: number;
        protected _cells: GridRow[];
        rows: number;
        cols: number;
        minRows: number;
        maxRows: number;
        loadedRows: number;
        incrementalLoad: boolean;
        table: HTMLElement;
        protected _striped: boolean;
        protected _firstCol: number;
        protected _firstRow: number;
        protected _lastCol: number;
        protected _lastRow: number;
        protected visibleRect: DOMRect;
        protected rowElements: HTMLElement[];
        protected sizeLayer: HTMLElement;
        protected _rowTag: string;
        protected _cellTag: string;
        constructor();
        dump(): void;
        protected _create(): void;
        create(): void;
        el: HTMLElement;
        appendTo(container: HTMLElement): void;
        render(): void;
        protected renderEmptyData(): void;
        protected createEvents(): void;
        protected keyDown(event: KeyboardEvent): void;
        gotoPrevCell(cell?: TableCell): void;
        gotoNextCell(cell?: TableCell): void;
        protected dblClick(event: MouseEvent): void;
        protected _createCellEditor(cell: TableCell): CellInput;
        protected _cellEditors: CellInput[];
        inputCellValue(cell: TableCell, value: string): void;
        protected _isEditing: boolean;
        get isEditing(): boolean;
        editCell(cell?: TableCell, selectAll?: boolean): void;
        applyInput(): void;
        cancelEdit(): void;
        protected _lastCell: TableCell;
        unselectAll(): void;
        moveTo(x: number, y: number): void;
        moveBy(dx: number, dy: number, shift?: boolean): void;
        protected unselectRow(row: number): void;
        protected unselectCol(col: number): void;
        goto(row: number, col: number): void;
        protected createSizeLayer(): void;
        protected calcSize(): void;
        protected rowHeaderElement: HTMLElement;
        protected createRowHeader(): void;
        protected headerElement: HTMLElement;
        protected createHeader(): void;
        protected _selBox: SelectionBox;
        protected _draggingSelection: boolean;
        cellMouseDown(cell: TableCell, event: MouseEvent): void;
        selectedCells: TableCell[];
        setSelectedCells(cells: TableCell[]): void;
        protected _selectedCell: TableCell;
        get selectedCell(): TableCell;
        set selectedCell(cell: TableCell);
        protected _selMaxRow: number;
        protected _selMinRow: number;
        protected _selMaxCol: number;
        protected _selMinCol: number;
        addToSelection(cell: TableCell): void;
        private _getCellsInRange;
        protected _updateSelectionBox(): void;
        autoSaveCell: boolean;
        selectCell(cell: TableCell): void;
        scrollToCell(cell: TableCell): void;
        getCell(row: number, col: number): TableCell;
        protected getRowCells(row: number): TableCell[];
        loadMore(n: number): void;
        protected _renderRows(rows: GridRow[]): Element[];
        renderHeader(): void;
        renderFooter(): void;
        protected scrollCol(col: number): void;
        protected scrollRow(row: number): void;
        protected _visibleRange: CellsRange;
        protected _visibleRows: GridRow[];
        protected destroyOffscreenCells(newRange: CellsRange): GridRow[];
        renderRowHeader(row: GridRow): void;
        renderRow(rowCells: GridRow): Element;
        renderCell(cell: TableCell): HTMLElement;
        addColumn(col?: TableColumn): TableColumn;
        addRow(data: any): void;
        protected destroyCells(): void;
        refresh(): void;
        protected redrawGrid(): void;
        protected insertRows(rows: GridRow[]): void;
        protected appendRows(rows: GridRow[]): void;
        protected _scroll(): void;
        protected _getVisibleRange(): CellsRange;
        addDataRow(data: any): void;
    }
    export class Grid extends BaseGrid {
    }
    export {};
}
declare namespace katrid.ui {
    class Spreadsheet extends Grid {
        incrementalLoad: boolean;
        constructor(options?: {
            rows?: number;
            cols?: number;
        });
        create(): void;
        render(): void;
    }
}
declare namespace katrid.ui {
    class DataColumn implements CollectionItem {
        collection: DataColumns;
        dataIndex: string | number;
        caption: string;
        constructor(collection: DataColumns);
        dump(): any;
        load(data: any): void;
    }
    class DataColumns extends OwnedCollection<DataColumn> {
        notify(action: katrid.CollectionNotifyEvents, item: katrid.ui.DataColumn): void;
    }
    class BaseTable extends BaseGrid {
        constructor();
        protected calcSize(): void;
        protected createSizeLayer(): void;
        protected _tbody: HTMLTableSectionElement;
        protected _create(): void;
        protected createHeader(): void;
        protected redrawGrid(): void;
    }
    class Table extends BaseTable {
    }
}
declare namespace Katrid {
    function isString(obj: any): boolean;
    function isNumber(obj: any): boolean;
    function isObject(obj: any): boolean;
    function hash(obj: any): any;
    function sum(iterable: any, member: any): number;
    function avg(iterable: any, member: any): number;
    function guid(): string;
}
declare namespace katrid.utils {
    class PivotNode {
        key: any;
        data: any;
        childCols: PivotNode[];
        childRows: PivotNode[];
        constructor(key: any, data: any, childCols: PivotNode[], childRows: PivotNode[]);
        expand(colKey?: string, rowKey?: string): void;
    }
    export function pivot(data: any[], key: string): PivotNode[];
    export {};
}
declare namespace katrid {
    function printHtml(html: string): void;
}
declare namespace Katrid {
    function toCamelCase(s: string): string;
    function dict(obj: any[]): any;
}
declare namespace katrid {
    function sleep(t: number): Promise<unknown>;
    function invoke(qualName: string): any;
}
//# sourceMappingURL=katrid.d.ts.map