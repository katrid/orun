var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/controls/menu/index.ts
var menu_exports = {};
__export(menu_exports, {
  MenuItem: () => MenuItem,
  PopoverMenu: () => PopoverMenu,
  showPopover: () => showPopover
});

// src/controls/menu/item.ts
var MenuItem = class {
  constructor(config) {
    this.config = config;
  }
  render() {
    this.element = document.createElement("div");
    this.element.classList.add("dropdown-item");
    if (this.config.template) {
      this.element.innerHTML = this.config.template;
    } else if (this.config.text)
      this.element.innerText = this.config.text;
    this.element.addEventListener("click", (evt) => {
      this.config?.onClick?.(this, evt);
      this.closeCallback?.();
    });
  }
  renderTo(container) {
    this.render();
    container.appendChild(this.element);
  }
};

// src/controls/menu/utils.ts
function showPopover(el, config) {
  const popover = el;
  popover.setAttribute("popover", "auto");
  document.body.appendChild(popover);
  if (config?.target) {
    popover.showPopover();
    const trect = config.target.getBoundingClientRect();
    const prect = popover.getBoundingClientRect();
    const pos = config.position || "auto";
    let x = 0;
    let y = 0;
    switch (pos) {
      case "topLeft":
        y = trect.top;
        x = trect.left;
        break;
      case "topRight":
        y = trect.top;
        x = trect.right - prect.width;
        break;
      case "bottomRight":
        y = trect.bottom;
        x = trect.right - prect.width;
        break;
      default:
        y = trect.bottom;
        x = trect.right - prect.width;
        break;
    }
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    x = Math.max(margin, Math.min(x, vw - prect.width - margin));
    y = Math.max(margin, Math.min(y, vh - prect.height - margin));
    popover.style.left = x + "px";
    popover.style.top = y + "px";
  } else
    popover.showPopover();
}

// src/controls/menu/popover-menu.ts
var PopoverMenu = class {
  constructor(config) {
    this.config = config;
  }
  render() {
    this.element = document.createElement("div");
    this.element.className = "popover-menu context-menu";
    this.element.addEventListener("toggle", (event) => {
      if (event.newState === "closed")
        this.close();
      else
        this.element.classList.add("show");
    });
    for (const item of this.config.items) {
      const menuItem = item instanceof MenuItem ? item : new MenuItem(item);
      menuItem.renderTo(this.element);
      menuItem.closeCallback = () => this.close();
    }
  }
  show(position = "auto") {
    this.render();
    showPopover(this.element, { target: this.config.target, position });
    if (this.config.onShow)
      this.config.onShow();
  }
  close() {
    this.element.remove();
    if (this.config.onClose)
      this.config.onClose();
  }
};

// src/grids/table-utils.ts
var table_utils_exports = {};
__export(table_utils_exports, {
  TableHelper: () => TableHelper
});

// src/i18n/index.ts
var shortDateOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
};
var shortDateTimeOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
};
var shortTimeOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
};
var currencyOptions = {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
};
var cachedDecimalFormatters = /* @__PURE__ */ new Map();
var i18n = {
  lang: "en-US",
  formats: {
    shortDateOptions,
    shortDateTimeOptions,
    shortTimeOptions,
    currencyOptions,
    emptyDisplayValue: ""
  },
  format: {
    // @ts-ignore
    shortDate(value) {
      if (value instanceof Date) {
        value = value.toTemporalInstant().toZonedDateTimeISO("UTC").toPlainDate();
      } else if (typeof value === "string")
        value = Temporal.PlainDate.from(value);
      if (value instanceof Temporal.PlainDate)
        return i18n.intl.date.format(value);
    },
    // @ts-ignore
    shortDateTime(value) {
      if (value instanceof Date) {
        value = value.toTemporalInstant().toZonedDateTimeISO("UTC").toPlainDateTime();
      } else if (typeof value === "string")
        value = Temporal.PlainDateTime.from(value);
      if (value instanceof Temporal.PlainDateTime) {
        return `${i18n.intl.date.format(value)} ${i18n.intl.time.format(value)}`;
      }
    },
    // @ts-ignore
    relativeTime(value, unit = "auto") {
      const rtf = i18n.intl.relativeTime;
      if (typeof value === "string")
        value = Temporal.PlainDate.from(value);
      if (value instanceof Temporal.PlainDate) {
        const unitToUse = unit === "auto" ? "second" : unit;
        const diff = value.since(Temporal.Now.plainDateISO()).total(unitToUse);
        if (unit === "auto") {
          if (Math.abs(diff) < 60)
            return rtf.format(Math.round(diff), "second");
          else if (Math.abs(diff) < 3600)
            return rtf.format(Math.round(diff / 60), "minute");
          else if (Math.abs(diff) < 86400)
            return rtf.format(Math.round(diff / 3600), "hour");
          else if (Math.abs(diff) < 2592e3)
            return rtf.format(Math.round(diff / 86400), "day");
          else if (Math.abs(diff) < 31536e3)
            return rtf.format(Math.round(diff / 2592e3), "month");
          else
            return rtf.format(Math.round(diff / 31536e3), "year");
        }
        return rtf.format(Math.round(diff), unitToUse);
      }
    },
    number(value) {
      return i18n.intl.number.format(value);
    },
    currency(value) {
      return i18n.intl.currency.format(value);
    },
    integer(value) {
      return i18n.intl.integer.format(value);
    },
    decimal(value, minDigits = 2, maxDigits = 2) {
      const key = `${minDigits}.${maxDigits}`;
      if (!cachedDecimalFormatters.has(key)) {
        if (minDigits > maxDigits)
          maxDigits = minDigits;
        cachedDecimalFormatters.set(key, new Intl.NumberFormat(i18n.lang, { style: "decimal", minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }));
      }
      return cachedDecimalFormatters.get(key).format(value);
    },
    boolean(value) {
      if (value == null)
        return null;
      return value ? "Yes" : "No";
    }
  },
  intl: {
    // default formatters for date representation
    date: new Intl.DateTimeFormat("en-US", shortDateOptions),
    dateTime: new Intl.DateTimeFormat("en-US", shortDateTimeOptions),
    time: new Intl.DateTimeFormat("en-US", shortTimeOptions),
    relativeTime: new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }),
    // default number formatter
    number: new Intl.NumberFormat("en-US"),
    integer: new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    // currency formatter
    currency: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
  },
  setup(lang) {
    i18n.lang = lang;
    cachedDecimalFormatters.clear();
    this.intl.date = new Intl.DateTimeFormat(lang, i18n.formats.shortDateOptions);
    this.intl.dateTime = new Intl.DateTimeFormat(lang, i18n.formats.shortDateTimeOptions);
    this.intl.time = new Intl.DateTimeFormat(lang, i18n.formats.shortTimeOptions);
    this.intl.relativeTime = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    this.intl.number = new Intl.NumberFormat(lang, { style: "decimal", minimumFractionDigits: 2 });
    this.intl.integer = new Intl.NumberFormat(lang, { style: "decimal", maximumFractionDigits: 0 });
    this.intl.currency = new Intl.NumberFormat(lang, i18n.formats.currencyOptions);
  }
};

// src/controls/base.ts
var BaseWidget = class {
  constructor(config) {
    this.config = config;
    this._loadingData = false;
    this._created = false;
    this._isReady = false;
    if (config?.el)
      this.renderTo(config.el);
  }
  create() {
    if (this._created) return;
    this._create();
    this._created = true;
  }
  append(child) {
    if (!this.element)
      throw new Error("Widget element is not created yet. Call create() before appending children.");
    this.element.appendChild(child.element);
  }
  renderTo(container) {
    console.warn("renderTo is deprecated, please use appendTo instead for better performance and to avoid unnecessary reflows");
    this.appendTo(container);
  }
  appendTo(container) {
    this.create();
    container.appendChild(this.element);
  }
  get isReady() {
    return this._isReady;
  }
  /** Ready method to perform async initialization after the widget is mounted. Can be overridden by subclasses. */
  async ready() {
    if (this._isReady) return;
    await this._ready();
    this._isReady = true;
  }
  /** Internal ready implementation. It can be executed once when the widget is mounted. */
  async _ready() {
  }
};

// src/grids/table-utils.ts
var SCROLL_PAGE_SIZE = 100;
var Column = class {
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
};
var Field = class _Field {
  static fromInfo(info) {
    const field = new _Field();
    field.name = info.name;
    field.type = info.type || "string";
    field.caption = info.caption || info.name;
    field.visible = info.visible == null ? true : info.visible;
    return field;
  }
};
var TableHelper = class extends BaseWidget {
  constructor(config) {
    super(config);
    this.searchViewVisible = true;
    this._loadedRows = 0;
    this.autoExecute = config?.autoExecute || false;
    this.name = config.name;
    this.datasource = config.datasource;
  }
  static {
    this.viewType = "query";
  }
  get queryId() {
    return this._queryId;
  }
  set queryId(value) {
    this._queryId = value;
    if (value) {
      this.queryChange(value);
    }
  }
  load(info) {
    this.name = info.name;
  }
  /** Will be executed when user click to apply button */
  async prepareTable(data) {
    this.data = data.data;
    this._lastGroup = void 0;
    let table = this.table = document.createElement("table");
    table.classList.add("table", "table-hover", "data-table");
    const thead = table.createTHead();
    const thr = thead.insertRow(0);
    table.createTBody();
    let fixed = false;
    for (let f of this.columns) {
      let th = document.createElement("th");
      if (f.dataIndex > -1) {
        let field = this.fields[f.dataIndex];
        if (field.type)
          th.className = field.type;
        if (f.width) {
          th.style.width = f.width + "px";
          fixed = true;
        }
        if (f.cols)
          th.classList.add("col-" + f.cols);
        if (!f.label)
          f.label = field.caption;
      } else if (f.type)
        th.className = f.type;
      th.innerText = f.label;
      thr.append(th);
    }
    this.element.append(table);
    if (fixed)
      table.classList.add("table-fixed");
    table.addEventListener("contextmenu", (evt) => this.contextMenu(evt));
  }
  evalTotal(col, values) {
    let val = 0;
    switch (col.total.toLowerCase()) {
      case "sum":
        values.forEach((obj) => val += parseFloat(obj[col.dataIndex]) || 0);
        return val;
      case "min":
        values.forEach((obj) => val = Math.min(parseFloat(obj[col.dataIndex]) || 0, val));
        return val;
      case "max":
        values.forEach((obj) => val = Math.max(parseFloat(obj[col.dataIndex]) || 0, val));
        return val;
      case "avg":
        values.forEach((obj) => val += parseFloat(obj[col.dataIndex]) || 0);
        return val / values.length;
    }
  }
  addGroupHeader(grouper, record, data) {
    const tbody = this.table.tBodies.item(0);
    const tr = document.createElement("tr");
    let th = document.createElement("th");
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
      th.innerText = "--";
      th.className = "text-muted";
    }
    tr.append(th);
    for (let i = colIndex; i < this.columns.length; i++) {
      let col = this.columns[i];
      th = document.createElement("th");
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
    const tr = document.createElement("tr");
    let th = document.createElement("th");
    th.colSpan = this.columns.length;
    th.innerText = "Total de registros: " + this._lastGroupValues.length.toString();
    tr.append(th);
    tbody.append(tr);
  }
  more(count) {
    const tbody = this.table.tBodies.item(0);
    count = Math.min(count, this.data.length - this._loadedRows);
    for (let c = 0; c < count; c++) {
      let row = this.data[this._loadedRows + c];
      let tr = document.createElement("tr");
      let i = 0;
      if (this.groupsIndex) {
        let gIndex = this.groupsIndex[0];
        let groupVal = row[gIndex];
        if (this._lastGroup != groupVal) {
          if (this._lastGroup !== void 0) {
            this.addGroupFooter();
          }
          this._lastGroupValues = this.data.filter((obj) => obj[gIndex] == groupVal);
          this.addGroupHeader(groupVal, row, this._lastGroupValues);
          this._lastGroup = groupVal;
        }
      }
      for (let column of this.columns) {
        if (column.dataIndex > -1) {
          let field = this.fields[column.dataIndex];
          let col = row[column.dataIndex];
          let td = document.createElement("td");
          if (col == null)
            col = "--";
          else {
            if (field.type === "DecimalField" || field.type === "decimal")
              col = i18n.intl.number.format(col);
            else if (Katrid.isNumber(col))
              col = i18n.intl.number.format(col);
            else if (field.type === "DateField" || field.type === "date")
              col = i18n.intl.date.format(col);
            else if (field.type === "DateTimeField" || field.type === "datetime") {
              col = i18n.intl.dateTime.format(col);
            }
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
    if (count && this._loadedRows === this.data.length && this.groupsIndex)
      this.addGroupFooter();
    return count;
  }
  _loadMetdata() {
    if (this.datasource && !(this.datasource instanceof Function)) {
      const ds = this.datasource;
      this.fields = ds.fields.map((f) => Field.fromInfo(f));
      this.columns = [];
      for (let f of this.fields)
        this.columns.push(new Column({ name: f.name, type: f.type, label: f.caption, dataIndex: this.columns.length }));
    }
  }
  async _ready() {
    this.columns = null;
    if (this.datasource)
      this._loadMetdata();
    const fieldNames = this.fields.map((f) => f.name);
    if (this.metadata?.template?.columns) {
      this.columns = this.metadata.template.columns.map((c) => new Column(c));
      for (let col of this.columns)
        if (typeof col.name === "string") {
          col.dataIndex = fieldNames.indexOf(col.name);
          if (!col.type)
            col.type = this.fields[col.dataIndex].type;
        }
    } else
      this.columns = this.fields.map(
        (f, idx) => new Column({
          name: f.name,
          type: f.type,
          label: f.caption,
          dataIndex: idx
        })
      );
    if (this.metadata?.groupBy)
      this.groupsIndex = this.metadata.groupBy.map((g) => fieldNames.indexOf(g));
    if (this.datasource)
      await this.prepareTable(this.datasource);
    this.more(SCROLL_PAGE_SIZE * 2);
    while (this.element.scrollHeight < this.element.clientHeight && this.more(SCROLL_PAGE_SIZE)) {
    }
  }
  async _ready_() {
    this.columns = null;
    const fieldNames = this.fields.map((f) => f.name);
    if (this.metadata.template?.columns) {
      this.columns = this.metadata.template.columns.map((c) => new Column(c));
      for (let col of this.columns)
        if (typeof col.name === "string") {
          col.dataIndex = fieldNames.indexOf(col.name);
          if (!col.type)
            col.type = this.fields[col.dataIndex].type;
        }
    } else
      this.columns = this.fields.map(
        (f, idx) => new Column({
          name: f.name,
          type: f.type,
          label: f.caption,
          dataIndex: idx
        })
      );
    if (this.metadata?.groupBy)
      this.groupsIndex = this.metadata.groupBy.map((g) => fieldNames.indexOf(g));
    this.more(SCROLL_PAGE_SIZE * 2);
    while (this.element.scrollHeight < this.element.clientHeight && this.more(SCROLL_PAGE_SIZE)) {
    }
  }
  _create() {
    this.element = document.createElement("div");
    this.element.classList.add("table-responsive");
    this.element.addEventListener("scroll", (event) => this.tableScroll(event));
  }
  tableScroll(evt) {
    if (this.element.scrollHeight < this.element.scrollTop + this.element.clientHeight + 100)
      this.more(SCROLL_PAGE_SIZE);
  }
  contextMenu(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    let menu = new Katrid.Forms.ContextMenu();
    menu.add('<i class="fa fa-fw fa-copy"></i> ' + Katrid.i18n.gettext("Copy"), () => this.copyToClipboard());
    menu.add('<i class="fa fa-fw fa-copy"></i> ' + Katrid.i18n.gettext("Copy with formatting"), () => this.copyToClipboard(true));
    menu.add('<i class="fa fa-fw fa-download"></i> ' + Katrid.i18n.gettext("Export"), () => this.export());
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
    options = Object.assign({ newLine: "\n", separator: "	", withHeader: true }, options || {});
    if (options.withHeader)
      output.push(this.columns.map((col) => col.label || col.name.toString()).join(options.separator));
    output.push(
      ...this.data.map(
        (o) => Object.values(o).map((v) => v == null ? "" : v.toString().replaceAll("\n", ";")).join(options.separator)
      )
    );
    return output.join(options.newLine);
  }
  export() {
    Katrid.UI.Utils.textToDownload(this.toText(), `${this._queryId}.tsv`);
  }
  get orientation() {
    if (this.metadata?.orientation == 2)
      return "landscape";
    return "portrait";
  }
  async print() {
    while (this._loadedRows < this.data.length && this.more(1e3)) {
    }
    const wnd = window.open("");
    wnd.addEventListener("afterprint", () => {
      wnd.close();
    });
    if (this.reportTemplate)
      wnd.document.write(this.reportTemplate);
    const style = document.createElement("style");
    style.innerHTML = `@page { size: A4 ${this.orientation} }`;
    wnd.document.head.append(style);
    wnd.document.querySelector(".document-content").innerHTML = this.table.outerHTML;
    wnd.document.body.classList.add(this.orientation);
    wnd.document.querySelector("h1").innerText = this.metadata.name;
    wnd.document.write("<script>print()<\/script>");
    wnd.document.close();
  }
  /** Collect parameters filled by user */
  getUserParams() {
    return {};
  }
  /** Will be executed when user click on apply button */
  async execute(data) {
  }
  destroy() {
    this.element.remove();
  }
};

// src/actions/homepage.ts
var homepage_exports = {};
__export(homepage_exports, {
  Homepage: () => Homepage,
  HomepageView: () => HomepageView
});

// src/controls/overlay.ts
function createWaitOverlay() {
  const el = document.createElement("div");
  el.classList.add("wait-overlay");
  el.setAttribute("popover", "manual");
  el.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  return el;
}
var WidgetOverlayHelper = class {
  constructor(widget) {
    this.widget = widget;
    this.show();
  }
  show() {
    this.overlay = createWaitOverlay();
    this.widget.element.appendChild(this.overlay);
    this.overlay.showPopover();
  }
  hide() {
    this.overlay.hidePopover();
    this.overlay.remove();
  }
};

// src/controls/data.ts
var DataWidget = class extends BaseWidget {
  _setLoading(loading) {
    this._loadingData = loading;
    if (loading) {
      this.element.classList.add("loading");
      if (!this._overlayHelper)
        this._overlayHelper = new WidgetOverlayHelper(this);
    } else {
      this.element.classList.remove("loading");
      this._overlayHelper?.hide();
    }
  }
  set loading(loading) {
    this._setLoading(loading);
  }
  get loading() {
    return this._loadingData;
  }
};

// src/portlets/index.ts
var portletRegistry = {};
function registerPortlet(portletClass, moduleName) {
  if (moduleName) {
    const qualName = `${moduleName}.${portletClass.name}`;
    if (!portletClass["type"])
      portletClass["type"] = qualName;
    portletRegistry[qualName] = portletClass;
  } else if (portletClass instanceof Function) {
    portletRegistry[portletClass.type || portletClass.name] = portletClass;
  } else {
    throw new Error("Invalid arguments for registerPortlet");
  }
}
var DEFAULT_MAX_HEIGHT = 500;
var BasePortlet = class _BasePortlet extends DataWidget {
  constructor(config) {
    super(config);
    this.config = config;
    this._loadProps();
  }
  static fromInfo(w) {
    const cls = portletRegistry[w.type];
    if (!cls) {
      console.error(`Unknown portlet type: ${w.type}`);
      return;
    }
    let p;
    if (cls.prototype instanceof _BasePortlet)
      p = new cls();
    else {
      p = portletRegistry["CustomPortlet"].from(cls);
    }
    p.load(w);
    return p;
  }
  dump() {
    return {
      type: this.constructor["type"],
      title: this.title,
      actionId: this.actionId
    };
  }
  createGhost() {
    const header = this.element.querySelector(".portlet-header");
    const rect = this.element.getBoundingClientRect();
    const ghost = this.element.cloneNode(true);
    ghost.classList.add("drag-ghost");
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: "none"
    });
    return ghost;
  }
  createDragEvents(el) {
    el.addEventListener("pointerdown", (evt) => {
      if (evt.button !== 0)
        return;
      const ghost = this.createGhost();
      let dragging = false;
      const ox = evt.clientX;
      const oy = evt.clientY;
      let lastTarget = null;
      let raf = 0;
      const onPointerMove = (evt2) => {
        if (dragging) {
          ghost.style.transform = `translate(${evt2.clientX - ox}px, ${evt2.clientY - oy}px)`;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const target = document.elementsFromPoint(evt2.clientX, evt2.clientY);
            for (const el2 of target)
              if (el2 === this.element) {
                this.dragRect?.remove();
                lastTarget?.classList.remove("drag-over");
                return;
              } else if (el2.classList.contains("drag-over") || el2 === this.element || this.element.parentElement === el2 && this.element.parentElement.lastChild === this.element)
                return;
              else if (el2.classList.contains("homepage-col")) {
                const children = Array.from(el2.children);
                if (children.length) {
                  const lastChild = el2.lastChild;
                  const y = evt2.clientY;
                  if (y < children[0].getBoundingClientRect().bottom && el2 === this.element.parentElement && children[0] === this.element) {
                    this.dragRect?.remove();
                    lastTarget?.classList.remove("drag-over");
                    return;
                  }
                  if (y > lastChild.getBoundingClientRect().bottom) {
                    lastTarget?.classList.remove("drag-over");
                    lastTarget = el2;
                    el2.classList.add("drag-over");
                    this.createDragRectangle();
                    el2.appendChild(this.dragRect);
                  } else {
                    for (const child of children) {
                      if (child === this.dragRect)
                        continue;
                      const rect = child.getBoundingClientRect();
                      if (y < rect.bottom) {
                        if (this.element === child)
                          return;
                        if (lastTarget === child)
                          return;
                        lastTarget?.classList.remove("drag-over");
                        lastTarget = child;
                        lastTarget.classList.add("drag-over");
                        this.createDragRectangle();
                        if (el2 === this.element.parentElement) {
                          const before = this.element.getBoundingClientRect().top > child.getBoundingClientRect().top;
                          el2.insertBefore(this.dragRect, before ? child : child.nextSibling);
                        } else
                          el2.insertBefore(this.dragRect, child);
                        return;
                      }
                    }
                  }
                } else {
                  lastTarget?.classList.remove("drag-over");
                  lastTarget = el2;
                  el2.classList.add("drag-over");
                  this.createDragRectangle();
                  el2.appendChild(this.dragRect);
                }
                return;
              } else if (el2.classList.contains("portlet")) {
                let before = true;
                if (el2.parentElement === this.element.parentElement) {
                  const children = Array.from(el2.parentElement.children);
                  const rect1 = this.element.getBoundingClientRect();
                  const rect2 = el2.getBoundingClientRect();
                  before = rect1.top > rect2.top;
                }
                lastTarget?.classList.remove("drag-over");
                lastTarget = el2;
                el2.classList.add("drag-over");
                this.createDragRectangle();
                el2.parentElement.insertBefore(this.dragRect, before ? el2 : el2.nextSibling);
                return;
              } else if (el2 === this.dragRect)
                return;
            if (lastTarget && !target.includes(lastTarget)) {
              lastTarget.classList.remove("drag-over");
              this.dragRect?.remove();
              lastTarget = null;
            }
          });
        } else {
          dragging = true;
          document.body.appendChild(ghost);
          this.element.classList.add("dragging");
          this.element.dispatchEvent(new CustomEvent("ouiStartDrag", { bubbles: true }));
        }
      };
      const onPointerUp = (evt2) => {
        ghost.remove();
        if (this.dragRect && lastTarget)
          this.element.dispatchEvent(
            new CustomEvent("ouiDragSuccess", {
              detail: {
                target: lastTarget.classList.contains("homepage-col") ? lastTarget : lastTarget.parentElement,
                portlet: this,
                index: Array.from(this.dragRect.parentElement.children).indexOf(this.dragRect)
              },
              bubbles: true
            })
          );
        this.element.dispatchEvent(new CustomEvent("ouiStopDrag", { bubbles: true }));
        lastTarget?.classList.remove("drag-over");
        this.element.classList.remove("dragging");
        el.releasePointerCapture(evt2.pointerId);
        el.removeEventListener("pointermove", onPointerMove);
        document.querySelectorAll(".drag-placeholder").forEach((r) => r.remove());
      };
      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerup", onPointerUp, { once: true });
      el.setPointerCapture(evt.pointerId);
    });
  }
  createDragRectangle() {
    this.dragRect?.remove();
    let rect = this.element.getBoundingClientRect();
    let dragRect = document.createElement("div");
    dragRect.classList.add("drag-placeholder");
    dragRect.style.height = `${rect.height}px`;
    this.dragRect = dragRect;
    return dragRect;
  }
  createHeader() {
    const div = document.createElement("div");
    div.className = "portlet-header";
    this.element.appendChild(div);
    const h3 = document.createElement("h3");
    h3.textContent = this.title || this.constructor["info"]?.name;
    div.appendChild(h3);
    this.element.appendChild(div);
    this.createDragEvents(div);
    return div;
  }
  createBody() {
    const body = document.createElement("div");
    body.classList.add("portlet-body");
    this.element.appendChild(body);
    body.style.maxHeight = `${DEFAULT_MAX_HEIGHT}px`;
    return body;
  }
  _defaultProps() {
    return {};
  }
  _loadProps() {
    const defaults = this._defaultProps();
    for (const [k, v] of Object.entries(defaults))
      this[k] = v;
  }
  _create() {
    const el = document.createElement("div");
    el.classList.add("portlet", this.constructor["type"]);
    this.element = el;
    this.createHeader();
    this.createBody();
  }
  load(info) {
    this.title = info.title;
    this.actionId = info.actionId;
  }
  loadData() {
  }
  async _ready() {
    if (this.onLoadMetadata)
      this.metadata = await this.onLoadMetadata(this.actionId);
    await this.loadData();
  }
  get maxHeight() {
    return this._maxHeight;
  }
  set maxHeight(value) {
    this._maxHeight = value;
    if (value)
      this.element.style.maxHeight = `${value}px`;
    else
      this.element.style.maxHeight = "";
  }
};

// src/portlets/selector.ts
var PortletSelector = class extends BaseWidget {
  _create() {
    this.element = document.createElement("div");
    this.element.classList.add("portlet-selector", "list-group");
    for (const [k, v] of Object.entries(portletRegistry)) {
      const info = v["info"] || {};
      const item = document.createElement("div");
      item.classList.add("portlet-selector-item", "list-group-item", "list-group-item-action");
      const caption = info.name || k;
      if (info.description)
        item.innerHTML = `<h5 class="mb-1">${caption}</h5><small class="mb-1">${info.description}</small>`;
      else
        item.innerHTML = `<h5 class="mb-1">${caption}</h5>`;
      item.onclick = () => {
        if (this.onSelect)
          this.onSelect(v);
      };
      this.element.appendChild(item);
    }
  }
  showToolbox(container) {
    const toolbox = document.createElement("div");
    toolbox.classList.add("toolbox", "portlet-toolbox");
    toolbox.style.position = "fixed";
    toolbox.style.top = "0";
    toolbox.style.left = "0";
    toolbox.style.bottom = "0";
    toolbox.style.width = "200px";
    toolbox.style.backgroundColor = "#fff";
    toolbox.style.border = "1px solid #ccc";
    toolbox.innerHTML = '<div class="toolbox-header"><h5 class="modal-title">Select a Portlet</h5><button type="button" class="btn-close" aria-label="Close"></button></div>';
    toolbox.querySelector(".btn-close").addEventListener("click", () => {
      toolbox.remove();
      if (this.onClose)
        this.onClose();
    });
    this.create();
    toolbox.appendChild(this.element);
    container.appendChild(toolbox);
    return toolbox;
  }
};

// src/portlets/custom.ts
var CustomPortlet = class _CustomPortlet extends BasePortlet {
  static {
    this.type = "CustomPortlet";
  }
  static from(fn) {
    const portlet = new _CustomPortlet();
    if (fn.info.name)
      portlet.title = fn.info.name;
    portlet._functionalType = fn.type;
    portlet.content = fn(portlet);
    return portlet;
  }
  dump() {
    const info = super.dump();
    info["type"] = this._functionalType;
    return info;
  }
  createBody() {
    const el = super.createBody();
    if (this.content)
      el.appendChild(this.content);
    return el;
  }
};
registerPortlet(CustomPortlet);

// src/actions/homepage.ts
var Homepage = class {
};
var HomepageView = class extends BaseWidget {
  constructor(config) {
    super(config);
    this.config = config;
    if (config.info)
      this.load(config.info);
  }
  get title() {
    return this._title;
  }
  set title(value) {
    this._title = value;
    const h1 = this.element.querySelector("h1");
    if (h1)
      h1.textContent = value;
  }
  createToolbar() {
    const toolbar = document.createElement("div");
    toolbar.classList.add("toolbar");
    let btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("btn", "toolbar-button");
    btn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
    btn.addEventListener("click", () => this.togglePortletSelector());
    toolbar.appendChild(btn);
    btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("btn", "toolbar-button", "dropdown-toggle");
    btn.innerText = "Layout";
    btn.addEventListener("click", () => {
      const menu = new PopoverMenu({
        target: btn,
        items: [
          { text: "1 Column", onClick: () => this.setLayout("1-col") },
          { text: "2 Columns 50%-50%", onClick: () => this.setLayout("2-cols-50-50") },
          { text: "2 Columns 70%-30%", onClick: () => this.setLayout("2-cols-70-30") },
          { text: "2 Columns 30%-70%", onClick: () => this.setLayout("2-cols-30-70") },
          { text: "3 Columns 33%-33%-33%", onClick: () => this.setLayout("3-cols-33-33-33") },
          { text: "3 Columns 50%-25%-25%", onClick: () => this.setLayout("3-cols-50-25-25") },
          { text: "3 Columns 25%-50%-25%", onClick: () => this.setLayout("3-cols-25-50-25") },
          { text: "3 Columns 25%-25%-50%", onClick: () => this.setLayout("3-cols-25-25-50") }
        ]
      });
      menu.show();
    });
    toolbar.appendChild(btn);
    let el = document.createElement("div");
    el.innerHTML = `<h1 class="g-col-8">${this._title || "My Homepage"}</h1>`;
    el.querySelector("h1").addEventListener("click", () => this.changeTitle());
    el.className = "grid";
    this.element.appendChild(el);
    let toolbarWrapper = document.createElement("div");
    toolbarWrapper.className = "g-col-4";
    toolbarWrapper.appendChild(toolbar);
    el.appendChild(toolbarWrapper);
  }
  changeTitle() {
    const newTitle = prompt("Enter homepage title", this.element.querySelector("h1").textContent);
    if (newTitle !== null) {
      this.element.querySelector("h1").textContent = newTitle;
      this.onUserChange?.();
    }
  }
  createContent(container) {
    const content = document.createElement("div");
    content.classList.add("homepage-content", "grid");
    container.appendChild(content);
    this._contentElement = content;
  }
  _create() {
    this.element = document.createElement("div");
    this.element.classList.add("homepage-view");
    this.element.addEventListener("ouiDragSuccess", (evt) => {
      if (evt.detail?.portlet && evt.detail.target) {
        const portlet = evt.detail.portlet;
        const oldCol = this.columns[portlet.element.parentElement.dataset.index];
        oldCol.widgets.splice(oldCol.widgets.indexOf(portlet), 1);
        portlet.element.remove();
        const col = this.columns[evt.detail.target.dataset.index];
        col.widgets.splice(evt.detail.index, 0, portlet);
        const children = Array.from(col.element.children);
        if (evt.detail.index === children.length)
          col.element.appendChild(portlet.element);
        else
          col.element.insertBefore(portlet.element, children[evt.detail.index]);
        this.onUserChange?.();
      }
    });
    this.createToolbar();
    this.createContent(this.element);
  }
  createPortlet(portlet, container) {
    portlet.appendTo(container);
  }
  _reset() {
    this._contentElement.innerHTML = "";
  }
  load(info) {
    try {
      this._loaded = false;
      this.columns = [];
      if (info.columns)
        this.columns = info.columns.map((c) => ({
          element: null,
          // if error loading, ignore the widget and continue loading the others
          widgets: c.widgets?.length && c.widgets.map((w) => BasePortlet.fromInfo(w)).filter((w) => w) || []
        }));
      console.debug("");
      this.setLayout(info.layout);
    } finally {
      this._loaded = true;
    }
  }
  dump() {
    const info = {
      layout: this._layout,
      columns: this.columns ? this.columns.map((c) => ({ widgets: c.widgets.map((w) => w.dump()) })) : void 0
    };
    return info;
  }
  async _ready() {
    await Promise.all(
      this.columns?.flatMap((c) => c.widgets.map((w) => {
        w.onLoadMetadata = this.config.onLoadMetadata;
        return w.ready();
      })) || []
    );
  }
  _addColumn(index) {
    const el = document.createElement("div");
    el.dataset.index = index.toString();
    el.classList.add("homepage-col");
    if (!this.columns[index])
      this.columns[index] = { element: null, widgets: [] };
    const col = this.columns[index];
    col.element = el;
    for (const w of col.widgets)
      w.appendTo(el);
    return this._contentElement.appendChild(el);
  }
  setLayout(layout) {
    this._layout = layout;
    this._reset();
    switch (layout) {
      case "1-col": {
        this._addColumn(0).classList.add("homepage-col-100", "g-col-12");
        break;
      }
      case "2-cols-50-50": {
        this._addColumn(0).classList.add("homepage-col-50", "g-col-6");
        this._addColumn(1).classList.add("homepage-col-50", "g-col-6");
        break;
      }
      case "2-cols-70-30": {
        this._addColumn(0).classList.add("homepage-col-70", "g-col-8");
        this._addColumn(1).classList.add("homepage-col-30", "g-col-4");
        break;
      }
      case "2-cols-30-70": {
        this._addColumn(0).classList.add("homepage-col-30", "g-col-4");
        this._addColumn(1).classList.add("homepage-col-70", "g-col-8");
        break;
      }
      case "3-cols-33-33-33": {
        this._addColumn(0).classList.add("homepage-col-33", "g-col-4");
        this._addColumn(1).classList.add("homepage-col-33", "g-col-4");
        this._addColumn(2).classList.add("homepage-col-33", "g-col-4");
        break;
      }
      case "3-cols-50-25-25": {
        this._addColumn(0).classList.add("homepage-col-50", "g-col-6");
        this._addColumn(1).classList.add("homepage-col-25", "g-col-3");
        this._addColumn(2).classList.add("homepage-col-25", "g-col-3");
        break;
      }
      case "3-cols-25-50-25": {
        this._addColumn(0).classList.add("homepage-col-25", "g-col-3");
        this._addColumn(1).classList.add("homepage-col-50", "g-col-6");
        this._addColumn(2).classList.add("homepage-col-25", "g-col-3");
        break;
      }
      case "3-cols-25-25-50": {
        this._addColumn(0).classList.add("homepage-col-25", "g-col-3");
        this._addColumn(1).classList.add("homepage-col-25", "g-col-3");
        this._addColumn(2).classList.add("homepage-col-50", "g-col-6");
        break;
      }
    }
    if (this._loaded)
      this.onUserChange?.();
  }
  addNewPortlet(portletClass, colIndex) {
    let portlet;
    if (portletClass.prototype instanceof BasePortlet)
      portlet = new portletClass();
    else {
      portlet = CustomPortlet.from(portletClass);
    }
    colIndex ??= this.columns.length === 3 ? 1 : 0;
    const col = this.columns[colIndex];
    col.widgets.push(portlet);
    this.createPortlet(portlet, col.element);
    this.onUserChange?.();
  }
  togglePortletSelector() {
    if (!this._selector) {
      this._selector = new PortletSelector();
      this._selector.showToolbox(this.element);
      this._selector.onSelect = (portletClass) => this.addNewPortlet(portletClass);
      this._selector.onClose = () => this._selector = null;
    }
    return this._selector;
  }
};

// src/portlets/all.ts
var all_exports = {};
__export(all_exports, {
  CustomPortlet: () => CustomPortlet,
  ModelViewPortlet: () => ModelViewPortlet,
  ReportPortlet: () => ReportPortlet,
  registerPortlet: () => registerPortlet
});

// src/portlets/report.ts
var ReportPortlet = class extends BasePortlet {
  constructor() {
    super(...arguments);
    this.data = null;
  }
  static {
    this.type = "ReportPortlet";
  }
  static {
    this.info = {
      name: "Report Portlet",
      description: "A portlet to display reports based on an action and parameters"
    };
  }
  dump() {
    return {
      ...super.dump(),
      actionId: this.actionId,
      parameters: this.parameters
    };
  }
  load(info) {
    super.load(info);
    this.actionId = info.actionId;
    this.parameters = info.parameters;
    this._datasource = info.datasource;
  }
  _defaultProps() {
    return {
      title: "<Select a Report>"
    };
  }
  async loadData() {
    if (this._datasource)
      this.data = await this._loadData(this._datasource);
    this.loading = false;
  }
  /** Internal method to load data */
  async _loadData(data) {
    try {
      this.loading = true;
      let res;
      if (typeof data === "function")
        res = await data(this.parameters);
      if (res) {
      }
      return res;
    } finally {
      this.loading = false;
    }
  }
  createBody() {
    const el = super.createBody();
    el.classList.add("no-padding");
    return el;
  }
  async _ready() {
    await super._ready();
    if (this.metadata?.datasource) {
      const tableHelper = new TableHelper({
        datasource: this.metadata.datasource
      });
      tableHelper.renderTo(this.element.querySelector(".portlet-body"));
      await tableHelper.ready();
    }
  }
};
registerPortlet(ReportPortlet);
console.debug("ReportPortlet registered", portletRegistry);

// src/portlets/models.ts
var ModelViewPortlet = class extends BasePortlet {
  static {
    this.type = "ModelViewPortlet";
  }
  dump() {
    return {
      ...super.dump(),
      modelName: this.modelName,
      viewType: this.viewType
    };
  }
  load(info) {
    this.modelName = info.modelName;
    this.viewType = info.viewType;
  }
  loadData() {
  }
};
registerPortlet(ModelViewPortlet);

// src/dialogs/index.ts
var dialogs_exports = {};
__export(dialogs_exports, {
  ModalResult: () => ModalResult,
  createDialog: () => createDialog,
  modalResultText: () => modalResultText,
  showDialog: () => showDialog
});

// src/dialogs/consts.ts
var ModalResult = /* @__PURE__ */ ((ModalResult2) => {
  ModalResult2[ModalResult2["OK"] = 1] = "OK";
  ModalResult2[ModalResult2["CANCEL"] = 2] = "CANCEL";
  ModalResult2[ModalResult2["YES"] = 3] = "YES";
  ModalResult2[ModalResult2["NO"] = 4] = "NO";
  ModalResult2[ModalResult2["NONE"] = 0] = "NONE";
  return ModalResult2;
})(ModalResult || {});
var modalResultText = {
  [1 /* OK */]: "OK",
  [2 /* CANCEL */]: "Cancel",
  [3 /* YES */]: "Yes",
  [4 /* NO */]: "No"
};

// src/dialogs/index.ts
function createDialog(config) {
  const el = document.createElement("dialog");
  if (config.title)
    el.innerHTML = `
    
        <header class="dialog-header">${config.title}</header>
    `;
  el.className = "dialog";
  if (config.content instanceof HTMLElement)
    el.appendChild(config.content);
  return el;
}
function showDialog(config) {
  const dlg = createDialog(config);
  document.body.appendChild(dlg);
  if (config.modal == null || config.modal)
    dlg.showModal();
  else
    dlg.show();
}
export {
  homepage_exports as actions,
  menu_exports as controls,
  dialogs_exports as dialogs,
  table_utils_exports as grids,
  all_exports as portlets
};
