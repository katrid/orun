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
    }
    class Widget {
        render(): void;
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
    type CollectionNotifyEvents = 'add' | 'remove';
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
    class ResponseMessagesProcessor {
        response: Response;
        constructor(response: Response);
        process(content: any): void;
    }
    let requestMiddleware: any[];
    let responseMiddleware: any[];
}
declare namespace Katrid.BI {
    function newPlot(el: any, data: any, layout: any, config: any): any;
}
declare namespace katrid.bi {
    function createCodeEditor(dom: HTMLElement, code?: string, language?: string, previewType?: string): Promise<unknown>;
    function showCodeEditor(code: string, lang: string): Promise<any>;
}
declare namespace katrid.design {
    class WidgetDesigner {
        target: katrid.drawing.BaseWidget;
        draw: katrid.drawing.Draw;
        designer: katrid.design.DesignSurface;
        dragging: boolean;
        private _dx;
        private _dy;
        moved: boolean;
        gridX: number;
        gridY: number;
        locked: boolean;
        constructor(target: katrid.drawing.BaseWidget, designer?: katrid.design.DesignSurface);
        private _pointerDownHandler;
        private _pointerMoveHandler;
        private _pointerUpHandler;
        drawDesign(parent: katrid.drawing.Draw): drawing.Draw;
        destroyDesign(): void;
        getDesignRect(): DOMRect;
        get pageY(): any;
        moveTo(x: number, y: number): void;
        moveToParent(parent: katrid.drawing.BaseWidget): void;
        moveBy(dx: number, dy: number): void;
        get page(): any;
        resize(width: number, height: number): void;
        update(widget: katrid.drawing.BaseWidget): void;
        designMove(ox: number, oy: number): void;
        applyRect(dx: number, dy: number, dw: number, dh: number): void;
        designApplyRect(dx: number, dy: number, dw: number, dh: number): void;
        setRect(x: number, y: number, width: number, height: number): void;
        protected designMouseDown(event: PointerEvent): void;
        protected designMouseMove(event: MouseEvent): void;
        dump(): any;
        load(data: any): void;
        protected _mouseUp(): void;
        protected designMouseUp(event: PointerEvent): void;
    }
}
declare namespace katrid.drawing {
    class BaseWidget {
        designer: katrid.design.WidgetDesigner;
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
        element: Element;
        graphic: Graphic;
        objects: BaseWidget[];
        parent: BaseWidget;
        page: BasePage;
        clientWidth: number;
        clientHeight: number;
        private _created;
        get clientY(): any;
        get clientX(): any;
        constructor();
        protected defaultProps(): void;
        protected _create(): void;
        get location(): Point;
        set location(value: Point);
        get size(): Size;
        set size(value: Size);
        drawTo(parent: Draw): void;
        drawDesign(parent: Draw): Graphic;
        create(): void;
        redraw(): void;
        remove(): void;
        getDesignRect(): DOMRect;
        getType(): string;
        dump(): any;
        load(data: any): void;
        getClassByName(name: string): typeof BaseWidget;
        children(): BaseWidget[];
        protected loadObjects(data: any): void;
    }
    class Rectangle extends BaseWidget {
        rect: Graphic;
        defaultProps(): void;
        create(): void;
        redraw(): void;
    }
}
declare namespace katrid.drawing {
    class Image extends BaseWidget {
        img: Graphic;
        protected defaultProps(): void;
        field: string;
        center: boolean;
        transparent: boolean;
        datasource: katrid.bi.DataSource;
        picture: string;
        format: string;
        dump(): any;
        load(info: any): void;
        private _rect;
        create(): void;
        redraw(): void;
    }
}
declare namespace katrid.drawing {
    class Text extends BaseWidget {
        private _text;
        allowExpression: boolean;
        allowTags: boolean;
        wrap: boolean;
        canGrow: boolean;
        highlights: TextHighlight[];
        protected textElement: HTMLElement;
        protected foreignObject: SVGForeignObjectElement;
        private _background;
        private _div;
        create(): void;
        protected defaultProps(): void;
        get text(): string;
        set text(value: string);
        get background(): Background;
        set background(value: Background);
        private _displayFormat;
        get displayFormat(): DisplayFormat;
        set displayFormat(value: DisplayFormat);
        private _border;
        get border(): katrid.drawing.Border;
        set border(value: katrid.drawing.Border);
        private _font;
        get font(): katrid.drawing.Font;
        set font(value: katrid.drawing.Font);
        private _hAlign;
        get hAlign(): HAlign;
        set hAlign(value: HAlign);
        private _vAlign;
        get vAlign(): VAlign;
        set vAlign(value: VAlign);
        protected applyStyle(): void;
        dump(): any;
        load(info: any): void;
        redraw(): void;
    }
}
declare namespace katrid.drawing {
    class Barcode extends BaseWidget {
        protected defaultProps(): void;
        field: string;
        center: boolean;
        datasource: katrid.bi.DataSource;
        code: string;
        barcodeType: string;
        dump(): any;
        load(info: any): void;
        redraw(): void;
    }
}
declare namespace katrid.bi {
    const componentRegistry: Record<string, typeof katrid.drawing.BaseWidget>;
}
declare namespace katrid.bi {
    class _DataSource {
        commandText: string;
        data: any[];
        private _name;
        private widgets;
        constructor(name: string, commandText: string);
        get name(): string;
        set name(value: string);
        dump(): {
            name: string;
            commandText: string;
        };
        static fromJson(data: any): _DataSource;
        refresh(): Promise<void>;
        get dataView(): any[];
        values(column: string | number): any[];
        bind(widget: WidgetContainer): void;
        unbind(widget: WidgetContainer): void;
    }
}
declare namespace katrid.bi {
    const GUIDELINE_DELAY = 2000;
    class BasePageDesigner {
        container: HTMLElement;
        page: katrid.report.BasePage;
        reportDesigner?: ReportEditor;
        el: HTMLElement;
        grabs: GrabHandles[];
        selection: ReportWidget[];
        dragging: boolean;
        snapToGrid: boolean;
        guidelines: SVGElement[];
        selectionBox: boolean;
        draggingSelectionBox: boolean;
        protected _documentKeyDown: (event: KeyboardEvent) => void;
        protected _dx: number;
        protected _dy: number;
        constructor(container: HTMLElement, page: katrid.report.BasePage, reportDesigner?: ReportEditor);
        activate(): void;
        deactivate(): void;
        get report(): report.Report;
        protected onKeyDown(event: KeyboardEvent): void;
        resizeSelectionBy(deltaX: number, deltaY: number): void;
        protected _resizingTimeout: any;
        protected refreshGrabs(): void;
        clearGuidelines(): void;
        clearSelection(): void;
        addToSelection(obj: BandedObject): void;
        destroyGrabHandles(obj?: BandedObject): void;
        createGrabHandles(obj: BandedObject): void;
        createElement(widgetName: string, target: Element, x: number, y: number): void;
        selectObject(obj: BandedObject): void;
        removeFromSelection(obj: BandedObject): void;
        moveSelectionBy(deltaX: number, deltaY: number): void;
        deleteSelection(): void;
        onPointerDown(event: PointerEvent): void;
        protected _selBox: HTMLElement | katrid.ui.SVGObject;
        protected createSelectionBox(x: number, y: number, width: number, height: number): void;
        protected destroySelectionBox(): void;
        protected _bx: number;
        protected _by: number;
        protected _bw: number;
        protected _bh: number;
        protected updateSelectionBox(x: number, y: number, width: number, height: number): void;
        onPointerUp(event: PointerEvent): void;
        refreshSelection(): void;
        onMouseMove(event: MouseEvent): void;
    }
    class GrabHandles {
        topCenter: HTMLLabelElement;
        topRight: HTMLLabelElement;
        middleLeft: HTMLLabelElement;
        bottomRight: HTMLLabelElement;
        bottomCenter: HTMLLabelElement;
        bottomLeft: HTMLLabelElement;
        middleRight: HTMLLabelElement;
        topLeft: HTMLLabelElement;
        handles: HTMLElement[];
        dragging: boolean;
        onObjectResized: ({ target }: {
            target: any;
        }) => void;
        onObjectResizing: ({ target }: {
            target: any;
        }) => void;
        container: HTMLElement;
        target: ReportWidget;
        gridX: number;
        gridY: number;
        snapToGrid: boolean;
        constructor(config: any);
        createHandle(): HTMLLabelElement;
        clear(): void;
        setPosition(): void;
        _setGrabHandle(): void;
        createHandles(): this;
        destroy(): void;
    }
}
declare namespace katrid.bi {
    class ReportDesigner {
        container: HTMLElement;
        private _report;
        pages: BasePageDesigner[];
        tabs: HTMLElement[];
        el: HTMLElement;
        toolbox: katrid.bi.Toolbox;
        toolWindow: katrid.bi.ToolWindow;
        tabsetElement: HTMLElement;
        workspace: HTMLElement;
        private _datasources;
        constructor(container: HTMLElement);
        create(): void;
        propertiesEditor: katrid.bi.ObjectInspector;
        onSelectionChange(selection?: any[]): void;
        get datasources(): DataSource[];
        protected createDragEvents(): void;
        toolItemDrop(widget: string, evt: DragEvent): void;
        createElement(widgetName: string, target: Element, x: number, y: number): void;
        newReport(reportType?: string): any;
        get report(): Report;
        set report(value: Report);
        private _page;
        get page(): BasePageDesigner;
        set page(value: BasePageDesigner);
        getValidName(prefix: string): string;
        showParamsDialog(): Promise<any>;
        preview(showParams?: boolean): Promise<void>;
        protected loadReport(report: Report): void;
        protected createPageDesigner(page: BasePage): BasePageDesigner;
        widgetExecuteEditor(widget: ReportWidget): Promise<void>;
        fileHandle: any;
        showOpenFilePicker(): Promise<void>;
        showSaveFilePicker(): Promise<void>;
        loading: boolean;
        removeObjectNotification(obj: any): void;
        dump(): any;
        load(structure: any, filename?: string): Report;
        set filename(filename: string);
        clear(): void;
        registerDataSource(ds: DataSource): void;
    }
    let reportDesigner: ReportDesigner;
}
declare namespace katrid.drawing {
    class Component {
        name: string;
        getType(): string;
        dump(): {
            type: string;
            name: string;
        };
        load(info: any): void;
    }
    type Point = {
        x: number;
        y: number;
    };
    type Size = {
        width: number;
        height: number;
    };
    enum PageSize {
        A3,
        A4,
        A5,
        Letter,
        Custom,
        Responsive,
        WebSmall,
        WebMedium,
        WebLarge
    }
    enum PageOrientation {
        Portrait = 0,
        Landscape = 1
    }
    type Background = {
        color: string;
        style: string;
    };
    type TextHighlight = {
        font?: Font;
        background?: any;
        visible?: boolean;
        condition: string;
    };
    type DisplayFormat = {
        type: string;
        format?: string;
    };
    enum HAlign {
        left = 0,
        center = 1,
        right = 2,
        justify = 3
    }
    enum VAlign {
        top = 0,
        middle = 1,
        bottom = 2
    }
    interface Font {
        name?: string;
        size?: string;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        color?: string;
    }
    interface Border {
        all?: boolean;
        top?: boolean;
        right?: boolean;
        bottom?: boolean;
        left?: boolean;
        rounded?: number;
    }
}
declare var Plotly: any;
declare var requirejs: any;
declare var appStudio: any;
declare var monaco: any;
declare namespace katrid.design {
    type PropertyConfig = {
        caption?: string;
        description?: string;
        placeholder?: string;
        title?: string;
        onGetValues?: (typeEditor: ComponentEditor) => any[];
        options?: any[] | Record<any, string>;
    };
    class PropertyEditor {
        name: string;
        config?: PropertyConfig;
        caption: string;
        description: string;
        placeholder: string;
        title: string;
        cssClass: string;
        static tag: string;
        constructor(name: string, config?: PropertyConfig);
        createEditor(typeEditor: ComponentEditor): HTMLElement;
        protected setValue(value: any, input: HTMLElement): void;
        protected createLabel(editor: HTMLElement): void;
        createInput(typeEditor: ComponentEditor): HTMLElement;
        createInputEvent(typeEditor: ComponentEditor, input: HTMLElement): void;
        inputChange(typeEditor: ComponentEditor, input: any, evt: any): void;
        getValue(typeEditor: ComponentEditor): any;
        apply(typeEditor: ComponentEditor, value: any): void;
    }
    class StringProperty extends PropertyEditor {
        createInput(typeEditor: ComponentEditor): HTMLElement;
    }
    class NameStringProperty extends PropertyEditor {
    }
    class TextProperty extends StringProperty {
        static tag: string;
    }
    class IntegerProperty extends PropertyEditor {
        createInput(typeEditor: ComponentEditor): HTMLElement;
    }
    class AutocompleteProperty extends StringProperty {
    }
    class BooleanProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class BackgroundProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class FontProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class BorderProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
        private allChecked;
    }
    class VAlignProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class HAlignProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class DisplayFormatProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    interface ISelectPropertyItem {
        value: any;
        text: string;
    }
    class SelectProperty extends StringProperty {
        static tag: string;
        getValues(typeEditor: ComponentEditor): ISelectPropertyItem[];
        createInput(typeEditor: ComponentEditor): HTMLElement;
        selectItem(typeEditor: ComponentEditor, index: number): void;
    }
    class ComponentProperty extends SelectProperty {
        onGetValues: (typeEditor: ComponentEditor) => ISelectPropertyItem[];
        values: any[];
        constructor(name: string, config: IPropertyConfig);
        getValues(typeEditor: ComponentEditor): ISelectPropertyItem[];
        selectItem(typeEditor: ComponentEditor, index: number): void;
        protected setValue(value: any, input: HTMLElement): void;
    }
    class LocationProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class HeightProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    class SizeProperty extends PropertyEditor {
        createEditor(typeEditor: ComponentEditor): HTMLElement;
    }
    function findComponentEditor(type: typeof katrid.drawing.Component): any;
    function registerComponentEditor(type: typeof katrid.drawing.Component, editor: typeof ComponentEditor): void;
    function getComponentEditor(type: typeof katrid.drawing.Component): typeof ComponentEditor;
    class ComponentEditor {
        designer: DesignSurface;
        static properties: PropertyEditor[];
        targetObject: any;
        constructor(comp: any, designer: DesignSurface);
        createEditor(): HTMLElement;
        showEditor(): void;
        static registerPropertyEditor(propName: string, editor?: PropertyEditor): void;
        static defineProperties(): StringProperty[];
        setPropValue(proName: string, value: any): void;
    }
    class WidgetEditor extends ComponentEditor {
        static defineProperties(): PropertyEditor[];
    }
    class DataSourceProperty extends SelectProperty {
        getValues(typeEditor: ComponentEditor): {
            value: bi.DataSource;
            text: string;
        }[];
        getValue(typeEditor: ComponentEditor): any;
        apply(target: any, value: any): void;
    }
    function showCodeEditor(value?: string, lang?: string, previewType?: string): Promise<unknown>;
    function createCodeEditor(dom: HTMLElement, value?: string, lang?: string, previewType?: string): Promise<unknown>;
}
declare namespace katrid.bi {
    interface IObject {
        name: string;
        dump(): any;
        load(data: any): void;
    }
    class Field {
        name: string;
        expression: string;
        calculated: boolean;
        client: boolean;
    }
    class DataSource {
        name: string;
        fields: any[];
        connection: string;
        data: any;
        master: DataSource;
        report: katrid.report.Report;
        protected _dataStored: boolean;
        constructor(name: string);
        dump(): any;
        load(info: any): void;
    }
    class SqlDataSource extends DataSource {
        private _sql;
        protected _dataStored: boolean;
        get sql(): string;
        set sql(value: string);
        dump(): any;
        load(info: any): void;
        read(): Promise<any>;
    }
    class ORMDataSource extends DataSource {
        model: string;
        domain: any;
        selectFields: string[];
        where: any;
        protected _dataStored: boolean;
        dump(): any;
        load(info: any): void;
        read(): Promise<any>;
    }
}
declare namespace katrid.drawing {
    class BaseColumn {
        expression: string;
        caption: string;
        dump(): any;
    }
    class BaseGrid extends BaseWidget {
        gridElement: HTMLTableElement;
        foreignObject: SVGForeignObjectElement;
        private _div;
        columns: BaseColumn[];
        protected defaultProps(): void;
        create(): void;
        createTable(): void;
        thClick(th: HTMLElement): void;
        dump(): any;
    }
}
declare namespace katrid.bi {
    class Grid extends katrid.drawing.BaseGrid {
        datasource: DataSource;
        dump(): any;
    }
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
declare namespace katrid.drawing {
    class BasePage {
        name: string;
        width: number;
        height: number;
        designer: katrid.design.DesignSurface;
        objects: BaseWidget[];
        constructor();
        get isEmpty(): boolean;
        protected defaultProps(): void;
        get size(): Size;
        set size(value: Size);
        protected _pageSize: keyof typeof PageSize;
        get pageSize(): keyof typeof PageSize;
        set pageSize(value: keyof typeof PageSize);
        private _orientation;
        get orientation(): PageOrientation;
        set orientation(value: PageOrientation);
        dump(): any;
        allObjects(): Generator<any>;
        children(): BaseWidget[];
        load(data: any): void;
        onLoad(info: any): void;
        protected _createDesigner(): design.PageDesigner;
        loading: boolean;
        createDesigner(): design.DesignSurface;
    }
}
declare namespace katrid.bi {
    class BasePage extends katrid.drawing.BasePage {
        description: string;
        report: katrid.report.Report;
    }
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
declare namespace katrid.bi {
    class QueryView extends Katrid.BI.QueryView {
    }
    class QueryPage extends BasePage {
        title: string;
        private _model;
        modelService: Katrid.Services.ModelService;
        private _datasource;
        userCanCustomize: boolean;
        availableFields: string[];
        fields: string[];
        groupByFields: string[];
        queryView: QueryView;
        protected _createDesigner(): QueryPageDesigner;
        dump(): any;
        load(d: any): void;
        get model(): string;
        set model(value: string);
        setModelService(service: Katrid.Services.ModelService): Promise<void>;
        protected createQueryView(fields: any): void;
        get datasource(): DataSource;
        set datasource(value: DataSource);
    }
}
declare namespace katrid.bi {
    import ComponentEditor = katrid.design.ComponentEditor;
    class DataSourceEditor extends ComponentEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
    class GridEditor extends katrid.design.WidgetEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
    class QueryPageEditor extends katrid.design.ComponentEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
}
declare namespace katrid.drawing {
    const NS = "http://www.w3.org/2000/svg";
    class Graphic {
        $el: SVGElement;
        constructor(tag: string | SVGElement, attrs?: Record<string, string | number>);
        path(attrs?: Record<string, string | number>): void;
        rect(x: number, y: number, width: number, height: number): Graphic;
        private _d;
        private _path;
        beginPath(attrs?: any): Graphic;
        moveTo(x: number, y: number): this;
        lineTo(x: number, y: number): this;
        closePath(): this;
        text(x: number, y: number, text: string, attrs?: any): Graphic;
        line(x1: number, y1: number, x2: number, y2: number, attrs?: Record<string, string | number>): Graphic;
        image(x: number, y: number, width: number, height: number, src: string): Graphic;
        attr(name: string | Record<string, string | number>, value?: string | number): string | this;
        clear(): this;
        append(obj: Graphic): void;
        parent(): Graphic;
        translate(x: number, y: number): void;
        remove(): void;
    }
    function svg(el: SVGElement): Graphic;
    class Draw extends Graphic {
    }
    function draw(tag: string, attrs?: Record<string, string | number>): Graphic;
    function rect(x: number, y: number, width: number, height: number, attrs?: Record<string, string | number>): Graphic;
    function g(attrs?: Record<string, string | number>): Graphic;
    class SVG extends Draw {
        private _width;
        private _height;
        constructor(width: number, height: number);
        get width(): number;
        set width(value: number);
        get height(): number;
        set height(value: number);
    }
    class Canvas extends SVG {
        container: Element;
        constructor(width?: number, height?: number);
        appendTo(parent: Element): void;
    }
}
declare namespace katrid.design {
    import BaseWidget = katrid.drawing.BaseWidget;
    const GUIDELINE_DELAY = 1000;
    class DesignSurface extends katrid.drawing.Canvas {
        dragging: boolean;
        grabs: GrabHandles[];
        snapToGrid: boolean;
        gridX: number;
        gridY: number;
        showGrid: boolean;
        showGuidelines: boolean;
        selection: BaseWidget[];
        guidelines: SVGElement[];
        objects: BaseWidget[];
        undoManager: UndoManager;
        clipboardManager: ClipboardManager;
        workspace: Element;
        private _loading;
        onNotification: (obj: any, event: string) => void;
        constructor(width?: number, height?: number);
        defaultProps(): void;
        get loading(): boolean;
        set loading(value: boolean);
        beginChanges(action: string): void;
        endChanges(): void;
        create(): void;
        private _keyDownHandler;
        private _active;
        eventsDisabled: boolean;
        enableEvents(): void;
        disableEvents(): void;
        activate(): void;
        private _selBox;
        protected createSelectionBox(x: number, y: number, width: number, height: number): void;
        deactivate(): void;
        protected onKeyDown(event: KeyboardEvent): void;
        applyRectToSelection(dx: number, dy: number, dw: number, dh: number): void;
        updateSelectedObjects(): void;
        protected updateGrabs(): void;
        refreshGrabs(): void;
        resizeSelectionBy(dw: number, dh: number): void;
        addObject(obj: BaseWidget): WidgetDesigner;
        addDesigner(designer: WidgetDesigner): void;
        setSelection(objs: BaseWidget[]): void;
        clearSelection(): void;
        createGrabHandles(obj: BaseWidget): void;
        destroyGrabHandles(obj?: BaseWidget): void;
        applySelectionBox(rect: DOMRect): void;
        invalidate(): void;
        getValidName(name: string): string;
        getDesigner(widget: BaseWidget): WidgetDesigner;
        removeFromSelection(obj: BaseWidget): void;
        protected onSelectionChange(): void;
        addToSelection(obj: BaseWidget): void;
        selectObject(obj: BaseWidget): void;
        toggleSelection(obj: BaseWidget): void;
        moveSelectionBy(dx: number, dy: number): void;
        onSelectionMoved(): void;
        protected _createGuideline(x1: number, y1: number, x2: number, y2: number): void;
        resizing: boolean;
        createGuidelines(): void;
        clearGuidelines(): void;
        loadObject(obj: any): BaseWidget;
        removeObject(obj: BaseWidget): void;
        deleteSelection(): void;
        protected _removeObjects(objs: BaseWidget[], description?: string): void;
        removeObjects(objs: BaseWidget[]): void;
        cut(): Promise<void>;
        copy(): Promise<void>;
        paste(): Promise<void>;
        pasteObject(obj: BaseWidget): WidgetDesigner;
        undo(): void;
        redo(): void;
        resize(width: number, height: number): void;
        getDesignerHeight(): number;
        protected _resize(): void;
        private _zoom;
        get zoom(): number;
        set zoom(value: number);
        protected _resizingTimeout: any;
        private _tempGuidelines;
        selectionBox: boolean;
        draggingSelectionBox: boolean;
        protected _dx: number;
        protected _dy: number;
        protected _bx: number;
        protected _by: number;
        protected _bw: number;
        protected _bh: number;
        onPointerDown(event: PointerEvent): void;
        onMouseMove(event: MouseEvent): void;
        onPointerUp(event: PointerEvent): void;
        protected _onPointerUp(): void;
        refreshSelection(): void;
        protected destroySelectionBox(): void;
        protected updateSelectionBox(x: number, y: number, width: number, height: number): void;
        widgetDoubleClick(widget: WidgetDesigner, event: MouseEvent): void;
        executeEditor(widget: WidgetDesigner): void;
        protected toolItemDragOver(evt: DragEvent): void;
        protected createDragEvents(): void;
        protected toolItemDrop(widget: string, evt: DragEvent): void;
        createWidget(widgetName: string, target: Element, x: number, y: number): void;
        getElement(): Element;
    }
}
declare namespace katrid.design {
    class PageDesigner extends katrid.design.DesignSurface {
        protected _page: katrid.drawing.BasePage;
        constructor(page: katrid.drawing.BasePage);
        get page(): katrid.drawing.BasePage;
        get report(): report.Report;
        set page(value: katrid.drawing.BasePage);
        showConfigWizard(): void;
        hideConfigWizard(): void;
        onConfigClick(event: MouseEvent): void;
        getElement(): Element;
    }
}
declare namespace katrid.bi {
    class PageDesigner extends katrid.design.PageDesigner {
        reportDesigner: ReportEditor;
        activate(): void;
        protected onSelectionChange(): void;
    }
}
declare namespace katrid.bi {
    class PivotTable {
        el: HTMLElement;
        table: HTMLTableElement;
        constructor(container: HTMLElement);
        create(): void;
        createTable(): void;
        private _cols;
        get cols(): string[];
        set cols(value: string[]);
        private _rows;
        get rows(): string[];
        set rows(value: string[]);
        update(): void;
        data: any[];
        setData(data: any[]): void;
        rowPivot: any;
        colPivot: any;
        protected loadData(): void;
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
declare namespace Katrid.BI {
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
declare namespace katrid.bi {
    class ReportEditor {
        container: HTMLElement;
        el: HTMLElement;
        dataExplorer: DataExplorer;
        paramExplorer: ParamExplorer;
        pageExplorer: PageExplorer;
        outlineExplorer: OutlineExplorer;
        toolBox: ToolBox;
        inspector: ObjectInspector;
        zoomTool: ZoomTool;
        protected leftNav: HTMLElement;
        protected rightNav: HTMLElement;
        private _report;
        pages: katrid.bi.BasePageDesigner[];
        workspaceElement: HTMLElement;
        constructor(container: HTMLElement);
        onSelectionChanged(selection: any[]): void;
        objectNotification(obj: any, event: 'add' | 'remove' | 'rename'): void;
        private _name;
        get reportName(): string;
        set reportName(value: string);
        create(): void;
        createWorkspace(): void;
        protected createToolbar(container: HTMLElement): ui.Toolbar;
        showParamsDialog(): Promise<any>;
        preview(showParams?: boolean): Promise<void>;
        activatePage(page: katrid.bi.BasePage): void;
        get report(): katrid.report.Report;
        set report(value: katrid.report.Report);
        showToolBox(): void;
        showPageExplorer(): void;
        showOutlineExplorer(): void;
        showDataExplorer(): void;
        showParamExplorer(): void;
        showPropertiesEditor(): void;
        loading: boolean;
        loadReport(report: katrid.report.Report): void;
        onSave: (data: any) => void;
        save(): void;
        onDestroy: () => void;
        close(): void;
        newReportWizard(): void;
        newReport(repType?: katrid.report.PageType): report.Report;
        protected clean(): void;
        addPage(page: katrid.report.BasePage): BasePageDesigner;
        protected setModified(): void;
        newPage(type?: katrid.report.PageType, name?: string): BasePageDesigner;
        private _modified;
        get modified(): boolean;
        set modified(value: boolean);
        private _page;
        get page(): katrid.design.PageDesigner;
        set page(value: katrid.design.PageDesigner);
        load(data: any, filename?: string): void;
        fileHandle: FileSystemFileHandle;
        openFile(): Promise<void>;
        saveFile(): Promise<void>;
        setParams(params: string): void;
        configCurrentPage(evt: MouseEvent): void;
    }
}
declare namespace katrid.bi {
}
declare namespace Katrid.BI {
    interface ITableConfig {
        caption?: string;
        fieldElements?: HTMLElement[];
    }
    export class TableWidget {
        el: HTMLElement;
        config?: ITableConfig;
        constructor(el: HTMLElement, config?: ITableConfig);
        private _queryCommand;
        get queryCommand(): string;
        set queryCommand(value: string);
        private _waiting;
        get waiting(): boolean;
        set waiting(value: boolean);
        protected _refresh(data: any): void;
    }
    export class TableWidgetElement extends Katrid.WebComponent {
        protected create(): void;
    }
    export {};
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
declare namespace katrid.bi {
    class TableWidget extends katrid.drawing.BaseWidget {
        datasource: DataSource;
        table: HTMLTableElement;
        dump(): any;
    }
}
declare namespace katrid.bi {
    class DataToolWindow {
        container: HTMLElement;
        protected btnNew: HTMLButtonElement;
        protected table: HTMLTableElement;
        el: HTMLElement;
        constructor(container: HTMLElement);
        create(): void;
        createDataSourceDialog(opts?: any): Promise<any>;
        newDataSource(): Promise<void>;
        editDataSource(dataSource: DataSource): Promise<void>;
        createDataSource(name: string, sql: string): void;
        saveDataSource(dataSource: DataSource, name: string, sql: string): void;
        registerDataSource(dataSource: DataSource): void;
        addDataSource(dataSource: DataSource): void;
        clear(): void;
        get datasources(): DataSource[];
    }
}
declare namespace katrid.bi {
}
declare namespace katrid.bi {
    class ToolWindow {
        designer: any;
        protected btnNew: HTMLButtonElement;
        protected table: HTMLTableElement;
        template: string;
        constructor(designer: any, container: HTMLElement);
        showCodeEditor(): Promise<void>;
        createDataSourceDialog(opts?: any): Promise<any>;
        newDataSource(): Promise<void>;
        editDataSource(dataSource: DataSource): Promise<void>;
        createDataSource(name: string, sql: string): void;
        saveDataSource(dataSource: DataSource, name: string, sql: string): void;
        registerDataSource(dataSource: DataSource): void;
        addDataSource(dataSource: DataSource): void;
        clear(): void;
        get datasources(): DataSource[];
    }
}
declare namespace katrid.bi {
    class QueryPageDesigner extends katrid.bi.PageDesigner {
        elEmptyPage: HTMLElement;
        get page(): katrid.bi.QueryPage;
        set page(value: katrid.bi.QueryPage);
        get queryView(): katrid.bi.QueryView;
        pageContainer: HTMLElement;
        create(): void;
        createEmptyPage(): void;
        getElement(): Element;
    }
}
declare namespace katrid.report {
    interface DesignableWidget {
        name: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }
    interface IReportObject {
        name: string;
    }
    class ReportElement extends katrid.drawing.BaseWidget {
        protected applyStyle(): void;
    }
}
declare namespace katrid.report {
    let reportDesigner: ReportDesigner;
    class ReportDesigner {
        container: HTMLElement;
        private _modified;
        private _report;
        pages: katrid.design.DesignSurface[];
        tabs: HTMLElement[];
        el: HTMLElement;
        toolbox: katrid.bi.Toolbox;
        toolWindow: katrid.bi.ToolWindow;
        tabsetElement: HTMLElement;
        workspace: HTMLElement;
        private _datasources;
        constructor(container: HTMLElement);
        create(): void;
        propertiesEditor: katrid.bi.ObjectInspector;
        onSelectionChange(selection?: IWidgetDesigner[]): void;
        get datasources(): bi.DataSource[];
        protected createDragEvents(): void;
        toolItemDrop(widget: string, evt: DragEvent): void;
        createWidget(widgetName: string, target: Element, x: number, y: number): void;
        newReport(): Report;
        get report(): Report;
        set report(value: Report);
        private _page;
        get page(): PageDesigner;
        set page(value: PageDesigner);
        getValidName(prefix: string): string;
        protected loadReport(report: Report): void;
        widgetExecuteEditor(widget: ReportElement): Promise<void>;
        fileHandle: any;
        showOpenFilePicker(): Promise<void>;
        showSaveFilePicker(): Promise<void>;
        loading: boolean;
        dump(): {
            report: {
                version: number;
                type: PageType;
                pages: any[];
                datasources: any[];
            };
        };
        load(info: any, filename?: string): Report;
        set filename(filename: string);
        clear(): void;
        registerDataSource(ds: katrid.bi.DataSource): void;
        addPage(page: katrid.report.BasePage): design.DesignSurface;
        newPage(type?: katrid.report.PageType): design.DesignSurface;
        setModified(modified?: boolean): void;
    }
}
declare namespace katrid.report {
    class BasePage extends katrid.bi.BasePage {
    }
}
declare namespace katrid.report {
    enum PageType {
        Banded = "banded",
        Query = "query",
        Dashboard = "dashboard",
        Document = "document",
        Spreadsheet = "spreadsheet"
    }
    class Report {
        pages: BasePage[];
        datasources: katrid.bi.DataSource[];
        reportType: PageType;
        loading: boolean;
        name: string;
        onLoadCallbacks: Function[];
        params: string;
        cache: any;
        constructor(pageType?: PageType);
        static fromMetadata(metadata: any): Report;
        addPage(page: BasePage): void;
        removeDataSource(ds: katrid.bi.DataSource): void;
        getValidName(prefix: string): string;
        findObject(name: string): any;
        getObjects(): Generator<katrid.bi.IObject>;
        newPage(type?: PageType): BasePage;
        addDataSource(datasource: katrid.bi.DataSource): void;
        dump(): {
            report: {
                version: number;
                type: PageType;
                pages: any[];
                datasources: any[];
            };
        };
        protected loadPage(pageInfo: any): BandedPage;
        protected loadDataSource(ds: any): bi.DataSource;
        clear(): void;
        load(data: any): void;
        addLoadCallback(cb: Function): void;
    }
}
declare namespace katrid.report {
    import Graphic = katrid.drawing.Graphic;
    import BaseWidget = katrid.drawing.BaseWidget;
    class BandedObject extends ReportElement {
    }
    class Band extends ReportElement {
        name: string;
        sizer: Graphic;
        private _background;
        private _headerHeight;
        private _sizerHeight;
        protected _header: Graphic;
        private _resizing;
        private _tempSizer;
        private _dy;
        canGrow: boolean;
        canShrink: boolean;
        parentBand: Band;
        protected defaultProps(): void;
        onRemoveNotification(obj: any): void;
        getDesignRect(): DOMRect;
        reorderBy(d: number): void;
        get clientY(): number;
        get report(): katrid.report.Report;
        get background(): katrid.drawing.Background;
        set background(value: katrid.drawing.Background);
        get totalHeight(): number;
        addObject(obj: BaseWidget): design.WidgetDesigner;
        validateHeight(): void;
        dump(): any;
        appendToDesigner(obj: BaseWidget): design.WidgetDesigner;
        pageDesigner: BandDesigner;
        bandDesign: Graphic;
        elBand: Graphic;
        private _rect;
        getHeaderCaption(): string;
        protected _createDesigner(): void;
        createDesigner(): void;
        createGroup(): void;
        createSizer(bandDesigner: Graphic): Graphic;
        createDesignerContextMenu(designer: BandDesigner): Katrid.Forms.ContextMenu;
        private _minHeight;
        protected getMinHeight(): number;
        protected _sizerMouseDown(event: PointerEvent): void;
        protected _sizerMouseMove(event: PointerEvent): void;
        protected _sizerMouseUp(event: PointerEvent): void;
        sizerMoveBy(dy: number): boolean;
        destroyDesigner(): void;
        redraw(): void;
        getClassByName(name: string): typeof BaseWidget;
    }
    class DataBand extends Band {
        static type: string;
        header: Band;
        footer: Band;
        groupHeader: GroupHeader;
        parentBand: DataBand;
        private _datasource;
        get datasource(): bi.DataSource;
        set datasource(value: bi.DataSource);
        load(info: any): void;
        onRemoveNotification(obj: any): void;
        dump(): any;
        onLoad(info: any): void;
    }
    class PageHeader extends Band {
        static type: string;
    }
    class PageFooter extends Band {
        static type: string;
    }
    class ReportTitle extends Band {
        static type: string;
    }
    class HeaderBand extends Band {
        static type: string;
        remove(): void;
    }
    class FooterBand extends Band {
        static type: string;
        remove(): void;
    }
    class GroupHeader extends Band {
        static type: string;
        parentBand: GroupHeader;
        footer: GroupFooter;
        dataBand: DataBand;
        expression: string;
        remove(): void;
        onRemoveNotification(obj: any): void;
        dump(): any;
        load(info: any): void;
        onLoad(info: any): void;
    }
    class GroupFooter extends Band {
        static type: string;
        header: GroupHeader;
        remove(): void;
        load(info: any): void;
        onLoad(info: any): void;
    }
    class SummaryBand extends Band {
        static type: string;
    }
}
declare namespace katrid.report {
    class BandedObjectDesigner extends katrid.design.WidgetDesigner {
        protected _mouseUp(): void;
    }
    class BandDesigner extends katrid.bi.PageDesigner {
        defaultProps(): void;
        removeObjectNotification(): void;
        create(): void;
        loadBands(): void;
        addBand(band: Band): void;
        newBand(bandType: string): Band;
        getValidName(prefix: string): string;
        invalidate(): void;
        invalidateBands(): void;
        getDesignerHeight(): number;
        adjustPageHeight(): void;
        protected _resize(): void;
        private _rearrangeBand;
        private _selectedBand;
        get selectedBand(): Band;
        set selectedBand(value: Band);
        createGrabHandles(obj: katrid.drawing.BaseWidget): void;
        removeBand(band: Band): void;
        protected onKeyDown(event: KeyboardEvent): void;
        applySelectionBox(rect: DOMRect): void;
        protected onSelectionChange(): void;
        moveObjectToBand(obj: katrid.drawing.BaseWidget, band: Band): void;
        onSelectionMoved(): void;
        protected toolItemDragOver(evt: DragEvent): void;
        createWidget(widgetName: string, target: Element, x: number, y: number): void;
        pasteObject(obj: katrid.drawing.BaseWidget): katrid.design.WidgetDesigner;
        private _configButton;
        showConfigWizard(): void;
        hideConfigWizard(): void;
        onConfigClick(event: MouseEvent): void;
    }
}
declare namespace katrid.report {
    class TableBand extends Band {
        static type: string;
        table: HTMLTableElement;
        private _datasource;
        columns: string[];
        headerVisible: boolean;
        footerVisible: boolean;
        defaultProps(): void;
        get datasource(): bi.DataSource;
        set datasource(value: bi.DataSource);
        load(info: any): void;
        onLoad(info: any): void;
        dump(): any;
        protected _createDesigner(): void;
        createDesignerContextMenu(designer: katrid.report.BandDesigner): Katrid.Forms.ContextMenu;
        createOutlineContextMenu(): void;
        redraw(): void;
        showTableEditor(evt: MouseEvent): void;
        selectColumns(): void;
        selectColumn(col: any): void;
    }
}
declare namespace katrid.report {
    import ComponentEditor = katrid.design.ComponentEditor;
    import PropertyEditor = katrid.design.PropertyEditor;
    import WidgetEditor = katrid.design.WidgetEditor;
    class BandEditor extends ComponentEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
    class DataBandEditor extends BandEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
    class GroupHeaderEditor extends BandEditor {
        static defineProperties(): PropertyEditor[];
    }
    class PageEditor extends ComponentEditor {
        static defineProperties(): PropertyEditor[];
    }
    class SubReportEditor extends WidgetEditor {
    }
    class TableBandEditor extends BandEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
}
declare namespace katrid.report {
    class GridBand extends Band {
        datasource: katrid.bi.DataSource;
    }
}
declare namespace katrid.report {
    import BaseWidget = katrid.drawing.BaseWidget;
    interface IObjectInfo {
        name: string;
        height: number;
        width: number;
    }
    export type BandInfo = {
        name: string;
        width: number;
        height: number;
        objects: IObjectInfo[];
    };
    export type PageInfo = {
        name: string;
        height: number;
        width: number;
        bands: BandInfo[];
    };
    export class BandedPage extends BasePage {
        bands: Band[];
        protected defaultProps(): void;
        protected _createDesigner(): BandDesigner;
        addBand(band: Band): void;
        children(): katrid.drawing.BaseWidget[];
        allObjects(): Generator<BaseWidget>;
        removeBand(band: Band): void;
        redraw(): void;
        dump(): any;
        load(info: PageInfo): void;
    }
    export {};
}
declare namespace katrid.report {
    import BaseWidget = katrid.drawing.BaseWidget;
    class SubReport extends BaseWidget {
        protected _page: BasePage;
        protected defaultProps(): void;
        get page(): BasePage;
        set page(value: BasePage);
        dump(): any;
        redraw(): void;
    }
}
declare namespace Katrid.BI {
    class ReportPreview {
        loadReport(report: any): void;
        loadBand(data: any): void;
        loadText(data: any): HTMLSpanElement;
        loadImage(data: any): HTMLImageElement;
    }
}
declare namespace katrid.bi {
    class AlignmentTool {
        el: HTMLElement;
        designer: katrid.design.DesignSurface;
        constructor();
        create(): void;
        alignLeft(): void;
        alignCenterHorizontal(): void;
        alignRight(): void;
        alignTop(): void;
        alignCenterVertical(): void;
        alignBottom(): void;
        distributeHorizontally(): void;
        distributeVertically(): void;
    }
}
declare namespace katrid.bi {
    class BaseToolWindow {
        container: HTMLElement;
        el: HTMLElement;
        constructor(container: HTMLElement);
        getHeaderTemplate(): string;
        create(): void;
        hide(): void;
        show(): void;
    }
}
declare namespace katrid.bi {
    class DataExplorer extends BaseToolWindow {
        table: HTMLElement;
        onNewDataSource: () => DataSource;
        onSelectionChange: (datasource?: DataSource) => void;
        onRemoveDataSource: (datasource?: DataSource) => void;
        designer: PageDesigner;
        getHeaderTemplate(): string;
        protected tv: katrid.ui.TreeView;
        create(): void;
        registerDataSource(datasource: DataSource): void;
        saveDataSource(datasource: SqlDataSource, name: string, sql: string): void;
        editDataSource(datasource: DataSource): Promise<void>;
        createDataSourceDialog(opts?: any): Promise<any>;
        clear(): void;
        nodeContextMenu(node: katrid.ui.TreeNode, evt?: MouseEvent): void;
    }
}
declare namespace katrid.bi {
    class ObjectInspector extends BaseToolWindow {
        editor: katrid.design.ComponentEditor;
        selection: any[];
        content: HTMLElement;
        private _designer;
        alignmentTool: AlignmentTool;
        getHeaderTemplate(): string;
        create(): void;
        private _keyDown;
        get designer(): katrid.design.DesignSurface;
        set designer(value: katrid.design.DesignSurface);
        setSelection(selection: any[]): void;
        getComponentEditor(component: any): design.ComponentEditor;
        createComponentEditor(component: any): design.ComponentEditor;
        refresh(): void;
    }
}
declare namespace katrid.bi {
    import TreeNode = katrid.ui.TreeNode;
    class OutlineExplorer extends BaseToolWindow {
        treeView: katrid.ui.TreeView;
        getHeaderTemplate(): string;
        create(): void;
        objectNotification(obj: any, event: 'add' | 'remove' | 'rename'): void;
        clear(): void;
        loadReport(report: katrid.report.Report): void;
        private _findNode;
        addObject(obj: any): TreeNode;
        removeObject(obj: any): void;
        renameObject(obj: any): void;
        protected getObjectText(obj: any): any;
        onSelectItem: (obj: any) => void;
        selectObject(obj: any): void;
    }
}
declare namespace katrid.bi {
    class PageExplorer extends BaseToolWindow {
        reportEditor: ReportEditor;
        treeView: katrid.ui.TreeView;
        getHeaderTemplate(): string;
        create(): void;
        registerPage(page: katrid.drawing.BasePage): void;
        clear(): void;
    }
}
declare namespace katrid.bi {
    class ParamExplorer extends BaseToolWindow {
        reportEditor: ReportEditor;
        getHeaderTemplate(): string;
        create(): void;
    }
}
declare namespace katrid.bi {
    class ToolBox extends BaseToolWindow {
        getHeaderTemplate(): string;
        create(): void;
    }
}
declare namespace katrid.bi {
    class ZoomTool {
        container: any;
        private _designer;
        protected buttonReset: HTMLElement;
        constructor(container: any, designer?: katrid.design.DesignSurface);
        create(): void;
        get designer(): design.DesignSurface;
        set designer(value: design.DesignSurface);
        protected setZoomText(value: number | string): void;
        zoomIn(): void;
        zoomOut(): void;
        zoomReset(): void;
    }
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
declare namespace katrid {
    function init(): void;
    const elementDataSymbol: unique symbol;
    function data(el: any, key?: string, value?: any): any;
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
        formCreate(fieldEl: Element): any;
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
declare namespace katrid.design {
    class ClipboardManager {
        designer: DesignSurface;
        constructor(designer: DesignSurface);
        getClipboardData(): Promise<any[]>;
        prepareCopyData(): string;
        copy(): Promise<void>;
        pasteData(data: any): any[];
        paste(): Promise<any[]>;
    }
}
declare namespace katrid.design {
    class GrabHandles {
        topCenter: SVGElement;
        topRight: SVGElement;
        middleLeft: SVGElement;
        bottomRight: SVGElement;
        bottomCenter: SVGElement;
        bottomLeft: SVGElement;
        middleRight: SVGElement;
        topLeft: SVGElement;
        handles: SVGElement[];
        private _dragging;
        onObjectResized: ({ target }: {
            target: any;
        }) => void;
        onObjectResizing: ({ target }: {
            target: any;
        }) => void;
        container: Element;
        target: katrid.drawing.BaseWidget;
        gridX: number;
        gridY: number;
        snapToGrid: boolean;
        designer: DesignSurface;
        constructor(config: {
            target: katrid.drawing.BaseWidget;
            container: Element;
            snapToGrid?: boolean;
            gridX?: number;
            gridY?: number;
            designer: DesignSurface;
            onObjectResized?: ({ target }: {
                target: any;
            }) => void;
            onObjectResizing?: ({ target }: {
                target: any;
            }) => void;
        });
        set dragging(value: boolean);
        get dragging(): boolean;
        createHandle(): SVGElement;
        clear(): void;
        setPosition(): void;
        _setGrabHandle(): void;
        createHandles(): this;
        resized(): void;
        applyRect(dx?: number, dy?: number, dw?: number, dh?: number): void;
        destroy(): void;
    }
}
declare namespace katrid.design {
}
declare namespace katrid.design {
    class Rule {
        el: Element;
        graphic: katrid.drawing.Graphic;
        width: number;
        height: number;
        create(): void;
        redraw(): void;
    }
    class HorizontalRule extends Rule {
    }
    class VerticalRule extends Rule {
    }
}
declare namespace katrid.design {
    import Font = katrid.drawing.Font;
    import HAlign = katrid.drawing.HAlign;
    import VAlign = katrid.drawing.VAlign;
    import Border = katrid.drawing.Border;
    class TextWidget extends katrid.drawing.BaseWidget {
        text: string;
        fill: string;
        private _font;
        border: Border;
        constructor(text?: string);
        defaultProps(): void;
        get font(): Font;
        set font(value: Font);
        private _hAlign;
        get hAlign(): HAlign;
        set hAlign(value: HAlign);
        private _vAlign;
        get vAlign(): VAlign;
        set vAlign(value: VAlign);
        applyStyle(): void;
    }
}
declare namespace katrid.design {
    interface UndoEntry {
        action: string;
        data: any;
        description?: string;
    }
    class UndoManager {
        designer: DesignSurface;
        stack: UndoEntry[];
        capacity: number;
        index: number;
        private _redoEntry;
        enabled: boolean;
        constructor(designer: DesignSurface);
        beginUpdate(): void;
        endUpdate(): void;
        add(action: string, data: any, description?: string): void;
        undo(): void;
        redo(): void;
        resizeSelection(selection: katrid.drawing.BaseWidget[]): void;
        moveSelection(selection: katrid.drawing.BaseWidget[]): void;
        addRedo(redo: UndoEntry): void;
        protected undoMoveObject(undoEntry: IUndoMoveObject[], description?: string): void;
        protected undoResizeObject(undoEntry: IUndoResizeObject[]): void;
        protected undoPaste(undoEntry: any[]): void;
        protected undoProperty(undoEntry: any[]): void;
        protected undoRemove(undoEntry: any[]): void;
        protected undoEntry(entry: UndoEntry): void;
        redoEntry(entry: UndoEntry): void;
    }
    interface IUndoMoveObject {
        target: katrid.drawing.BaseWidget;
        x: number;
        y: number;
    }
    interface IUndoResizeObject {
        target: katrid.drawing.BaseWidget;
        x: number;
        y: number;
        w: number;
        h: number;
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
declare namespace katrid.drawing.editors {
    class TextObjectEditor extends katrid.design.WidgetEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
        showEditor(): Promise<void>;
    }
    class ImageEditor extends katrid.design.WidgetEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
    class BarcodeEditor extends katrid.design.WidgetEditor {
        static defineProperties(): katrid.design.PropertyEditor[];
    }
}
declare namespace katrid.drawing {
    function pointInRect(x: number, y: number, rect: DOMRect): boolean;
    function rectInRect(rect1: DOMRect, rect2: DOMRect): Boolean;
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
        renderField(fld: Katrid.Data.Field, fieldEl: HTMLElement): any;
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
        toFixed: (length: any) => any;
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
    let i18n: Ii18n;
}
declare namespace katrid {
    const i18n: Katrid.Ii18n;
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
    class Widget {
        field: Katrid.Data.Field;
        fieldEl: Element;
        constructor(field: Katrid.Data.Field, fieldEl: Element);
        renderToForm: any;
        formLabel(): HTMLLabelElement;
        afterRender(el: HTMLElement): HTMLElement;
    }
    let registry: Record<string, any>;
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
        el: HTMLElement;
        constructor(options: any);
        protected _create(el: HTMLElement): void;
    }
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
        protected _create(el: HTMLElement): void;
    }
    export {};
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
declare namespace Katrid.Forms {
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
    };
    export type NodeOptions = {
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
        select(): this;
        collapse(): void;
        checkbox: HTMLInputElement;
        createCheckbox(): void;
        setCheckAll(value: boolean): void;
        setText(value: string): void;
        protected setChecked(value: boolean | string): void;
        get checked(): boolean | string;
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
        options?: NodeOptions;
        nodes: TreeNode[];
        readonly el: HTMLElement;
        private _ul;
        private _selection;
        private _striped;
        constructor(el: HTMLElement, options?: NodeOptions);
        get selection(): TreeNode[];
        set selection(value: TreeNode[]);
        get firstNode(): TreeNode;
        get lastNode(): TreeNode;
        previous(): void;
        next(): void;
        addNodes(nodes: NodeOptions, parent?: any): void;
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
        result: any;
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
    export class TableCell {
        row?: number;
        col?: number;
        content: string;
        font?: string;
        el?: Element;
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
    export class BaseGrid implements katrid.Persistent {
        columns: TableColumns;
        dataRows: any[];
        header: any[];
        footer: any[];
        rowHeader: any[];
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
        moveBy(dx: number, dy: number, shift?: boolean): void;
        goto(row: number, col: number): void;
        protected createSizeLayer(): void;
        protected calcSize(): void;
        protected rowHeaderElement: HTMLElement;
        protected createRowHeader(): void;
        protected headerElement: HTMLElement;
        protected createHeader(): void;
        protected _selBox: SelectionBox;
        cellMouseDown(cell: TableCell, event: MouseEvent): void;
        selectedCells: TableCell[];
        setSelectedCells(cells: TableCell[]): void;
        protected _selectedCell: TableCell;
        get selectedCell(): TableCell;
        set selectedCell(cell: TableCell);
        addToSelection(cell: TableCell): void;
        protected _updateSelectionBox(): void;
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
        renderRowHeader(rowElement: Element): void;
        renderRow(rowCells: GridRow): Element;
        renderCell(cell: TableCell): HTMLElement;
        addColumn(): void;
        addRow(data: any): void;
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