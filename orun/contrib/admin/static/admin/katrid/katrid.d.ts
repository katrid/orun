/// <reference types="jquery" />
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
}
/**
 * Katrid.js API specification
 */
declare namespace Katrid.Specification {
    namespace Data {
        interface IReqSearch {
            where: Record<string, any>[];
            /** The page number search */
            page?: number;
            /** The limit of records per page */
            limit?: number;
            /** Get the total of records */
            count?: boolean;
        }
        interface IResSearch {
            /** Returned list of records */
            data: Record<string, any>[];
            /** The total number of records */
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
            /** Object containing default field values */
            default?: any;
            /** Javascript expression containing default field values (its expression must be evaluated) */
            $default?: string;
            [key: string]: any;
        }
    }
    /** Represents a response error */
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
        /** Represents the action information.
         * Basic action types: [ui.action.window, ui.action.view, ui.action.report, ui.action.client]
         */
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
declare namespace Katrid.Core {
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
    interface IApplicationConfig {
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
        /** User information */
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
        beforeUnload(): void;
        get actionManager(): Katrid.Actions.ActionManager;
        render(): void;
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
declare namespace Katrid.Exceptions {
    class Exception extends Error {
        constructor(message: any);
    }
    class ValidationError extends Exception {
    }
}
declare var _: any;
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
declare var KATRID_I18N: any;
declare namespace Katrid {
    export let intl: {
        number(config: any): any;
        toFixed: (length: any) => any;
    };
    export interface IServerFormats {
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
    export let i18n: Ii18n;
    export {};
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
declare namespace Katrid {
    function toCamelCase(s: string): string;
    function dict(obj: any[]): any;
}
declare namespace katrid {
    function sleep(t: number): Promise<unknown>;
}
declare namespace Katrid.Services {
    abstract class BaseAdapter {
        abstract $fetch(url: any, data: any, params?: any): any;
    }
    class LocalMemoryConnection {
    }
    /**
     * Browser fetch adapter
     */
    class FetchAdapter extends BaseAdapter {
        $fetch(url: any, config: any, params: any): Promise<Response>;
        fetch(rpcName: any, config: any): Promise<Response>;
    }
}
declare namespace Katrid.Services {
    /**
     * JsonRPC is the default adapter and is based on FetchAdapter
     */
    class JsonRpcAdapter extends FetchAdapter {
    }
}
declare namespace Katrid.Services {
    class Service {
        name: string;
        static url: string;
        constructor(name: string);
        static adapter: BaseAdapter;
        static $fetch(url: any, config: any, params: any): any;
        static $post(url: any, data: any, params?: any): any;
        get(name: string, params: any): JQuery.jqXHR<any>;
        post(name: string, data: any, params?: any, config?: any, context?: any): Promise<unknown>;
    }
    class Data extends Service {
        static get url(): string;
        /**
         * Reorder/reindex a collection of records
         * @param model
         * @param ids
         * @param field
         * @param offset
         */
        reorder(model: any, ids: any, field?: string, offset?: number): Promise<unknown>;
    }
    /**
     * Represents the attachments services api
     */
    class Attachments {
        static delete(id: any): void;
        static upload(file: any, config: any): Promise<any>;
    }
    class Upload {
        static sendFile(config: any): void;
        static uploadTo(url: any, file: any): JQuery.jqXHR<any>;
    }
    let data: Data;
    function post(url: string, data: any): Promise<any>;
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
        delete(id: any): Promise<unknown>;
        getById(id: any, config?: any): any;
        getDefaults(kwargs: any, config?: any): Promise<unknown>;
        copy(id: any): Promise<unknown>;
        protected static _prepareFields(res: any): any;
        getViewInfo(data: any): Promise<any>;
        loadViews(data?: any): Promise<any>;
        getFieldsInfo(data: any): Promise<any>;
        getFieldChoices(config: IGetFieldChoices): Promise<unknown>;
        /** Get a single object from field and natural key */
        getFieldChoice(config: IGetFieldChoices): Promise<unknown>;
        doViewAction(data: any): Promise<unknown>;
        callAdminViewAction(data: any): Promise<unknown>;
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
        getMetadata(): any;
        execute(config: any): Promise<unknown>;
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
declare var Popper: any;
declare namespace Katrid.UI {
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
    export class BaseAutoComplete extends Katrid.WebComponent {
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
        create(): void;
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
        private _dataValue;
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
    }
    class InputAutoComplete extends BaseAutoComplete {
        create(): void;
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
declare namespace katrid.filters {
    function date(value: any, fmt?: string): any;
    function dateTimeHumanize(value: any): string;
}
declare function sprintf(fmt: string, obj: any): string;
declare namespace Katrid.ui {
    interface IGridConfig {
        el: HTMLElement;
        datasource?: any;
        columns?: any[];
    }
    export class DataControl {
        datasource: any;
        el: HTMLElement;
        container: HTMLElement;
        constructor(config: IGridConfig);
        protected create(): void;
        protected dataChangedCallback(): void;
    }
    export class DataGridColumn {
        name: string | number;
        label: string;
        type: string;
        constructor(info: any);
    }
    export class DataGrid extends DataControl {
        protected create(): void;
        protected dataChangedCallback(): void;
    }
    export {};
}
declare namespace katrid.ui {
    class HelpProvider {
        getTooltipHelp(tooltip: Katrid.ui.Tooltip): string;
    }
    let helpProvider: HelpProvider;
}
declare namespace katrid.ui {
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
declare module "src/ui/index" {
    namespace katrid.ui {
        let keyCode: any;
        function toggleFullScreen(): void;
    }
    export let kui: typeof katrid.ui;
}
declare namespace Katrid.ui {
    class Input {
        input: HTMLInputElement;
        constructor(input: HTMLInputElement);
    }
}
declare namespace katrid.ui {
    class InputMask extends HTMLInputElement {
        private _created;
        private _changed;
        private _inputMask;
        constructor();
        protected _keyPress(event: KeyboardEvent): boolean;
        protected _keyDown(event: KeyboardEvent): boolean;
        connectedCallback(): void;
        protected _format(): void;
        protected _create(): void;
        get inputMask(): string;
        protected _invalidate(): void;
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
declare namespace Katrid.UI {
    class Component {
        protected _el: HTMLElement;
        get el(): HTMLElement;
        set el(value: HTMLElement);
        protected setElement(el: any): void;
    }
    class TreeNode extends Component {
        treeView: TreeView;
        data: Object;
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
        constructor(treeView: TreeView, item: any);
        get children(): TreeNode[];
        select(): void;
        collapse(): void;
        expand(): void;
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
        add(node: TreeNode): void;
        remove(node: TreeNode): void;
        private calcLevel;
        update(): void;
        get level(): number;
        set level(value: number);
        all(): IterableIterator<TreeNode>;
    }
    class TreeView {
        nodes: Array<TreeNode>;
        readonly el: HTMLElement;
        private _selection;
        constructor(cfg: any);
        get selection(): TreeNode[];
        set selection(value: TreeNode[]);
        get firstNode(): TreeNode;
        get lastNode(): TreeNode;
        previous(): void;
        next(): void;
        addNodes(nodes: any[], parent?: any): void;
        addNode(item: any, parent: any): TreeNode;
        get currentNode(): TreeNode;
    }
}
declare namespace katrid.ui {
    /** Show a search dialog for a given model */
    function search(config: any): Promise<any>;
}
//# sourceMappingURL=katrid.d.ts.map