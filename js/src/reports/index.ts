namespace Katrid.Reports {

  export class Report {
    _name: string;
    pages: Array<Page>;

    constructor(info) {
      this.pages = [];
      if (info)
        this.load(info);
    }

    load(info) {
      for (let page of info.pages)
        this.pages.push(new Page(page));
    }

    dump() {
      let r = {
        pages: [],
      };
      for (let page of this.pages) {
        r.pages.push(page.dump());

      }
      return r;
    }
  }

  /* widgets */

  export class ReportObject {
    static className = 'ReportObject';
    $el: any;
    el: HTMLElement;
    private _name: string;
    private static _counter: number = 1;
    designer: Katrid.UI.Designer.BaseDesigner;

    constructor(public info: any) {
      this.el = null;
      this._name = null;
      this.loadDefaults();
      if (info)
        this.load(info);
      if (!this._name)
        this.autoName();
    }

    loadDefaults() {

    }

    designerDoubleClick(evt) {
      console.log('do double click');
    }

    get className(): string {
      return (<any>this.constructor).className;
    }

    get name() {
      return this._name;
    }

    autoName() {
      this.name = this.className + (ReportObject._counter++).toString();
    }

    set name(name) {
      this._name = name;
    }

    load(info) {
      if (info.name)
        this.name = info.name;
    }

    dump(): any {
      return {type: this.className, name: this.name};
    }

  }


  export class Page extends ReportObject {
    static className = 'Page';
    bands: Array<Band>;

    loadDefaults() {
      super.loadDefaults();
      this.bands = [];
    }

    toHtml() {
      return `<page class="A4"></page>`;
    }

    toDesigner() {
      this.$el = $(this.toHtml());
      this.el = this.$el[0];
      return this.el;
    }

    load(info) {
      super.load(info);
      let cls;
      this.name = info.name;
      for (let band of info.bands) {
        cls = Katrid.Reports[band.type];
        this.bands.push(new cls(band));
      }
    }

    dump(): any {
      let r = {
        bands: [],
      };

      for (let band of this.bands)
        r.bands.push(band.dump());

      return r;
    }
  }


  export class ReportWidget extends ReportObject {
    parent: ReportObject;
    private _left: number = 0;
    private _top: number = 0;
    private _height: number;
    private _width: number;
    private _style: string;

    constructor(info=null, parent=null) {
      super(info);
      this.parent = parent;
    }

    loadDefaults() {
      this.height = null;
      this.width = null;
      this.style = '';
    }

    toHtml(): string {
      // to be implemented
      return '';
    }

    toDesigner() {
      this.$el = $(this.toHtml());
      this.el = this.$el[0];
      this.$el.on('dblclick', (evt) => {
        this.designerDoubleClick(evt);
      });
      this.$el.data('reportObject', this);
      let me = this;

      let dragging, moving;

      let x, y;

      this.$el
      .on('pointerdown', function (evt) {
        evt.stopPropagation();
        evt.preventDefault();
        this.setPointerCapture(evt.pointerId);
        dragging = true;
        y = evt.screenY;
        x = evt.screenX;
        me.designer.clearSelection();
        me.designer.selectElement(me.el);
        me.designer.destroyHandles();

        me.$el.on('pointermove', (evt) => {
          if (dragging) {
            evt.stopPropagation();
            evt.preventDefault();
            moving = dragging;
            y = y - evt.screenY;
            x = x - evt.screenX;
            let pos = me.$el.position();
            me.$el.css('top', pos.top - y);
            me.$el.css('left', pos.left - x);
            y = evt.screenY;
            x = evt.screenX;
          }
        })
        .on('pointerup', (evt) => {
          // element moved
          this.releasePointerCapture(evt.pointerId);
          me.$el.off('pointermove');
          me.$el.off('pointerup');
          moving = false;
          me.designer.clearSelection();
          me.designer.selectElement(me.el);
          me.designer.onSelectionMove();
        });

      });

      return this.el;
    }

    $delete() {
      this.$el.remove();
    }

    load(info) {
      super.load(info);
      if (info) {
        if (info.left)
          this._left = info.left;
        if (info.top)
          this._top = info.top;
        if (info.height)
          this._height = info.height;
        if (info.width)
          this._width = info.width;
      }
    }

    get style() {
      return this._style;
    }

    set style(value) {
      this._style = value;
    }

    get top() {
      return this._top;
    }

    set top(value: string | number) {
      if ((typeof value === 'string') && (value.endsWith('px')))
        value = parseFloat(value.substr(0, value.length - 2));
      this._top = +value;
      if (this.el)
        this.el.style.top = this._top + 'px';
    }

    get width() {
      return this._width;
    }

    set width(value) {
      this._width = value;
    }

    get height() {
      return this._height;
    }

    set height(value) {
      this._height = value;
    }

    get left() {
      return this._left;
    }

    set left(value: string | number) {
      if ((typeof value === 'string') && (value.endsWith('px')))
        value = parseFloat(value.substr(0, value.length - 2));
      this._left = +value;
      if (this.el)
        this.el.style.left = this._left + 'px';
    }

    dump(): any {
      return {
        top: this.top,
        left: this.left,
        width: this.width,
        height: this.height,
        type: this.className,
      };
    }

  }

  export class Band extends ReportWidget {
    static className = 'Band';
    children: Array<ReportWidget>;
    bandEl: HTMLElement;
    bands: Array<Band>;

    loadDefaults() {
      super.loadDefaults();
      this.children = [];
      this.height = 30;
    }

    load(info) {
      super.load(info);
      this.height = info.height;
      for (let child of info.children)
        this.children.push(new TextObject(child, this));
    }

    toHtml() {
      return `<div class="band-designer ${this.className}">
        <div class="band-header">
          <span class="band-name">
            ${this.className}: ${this.name}
          </span>
        </div>
        <div class="band" style="height: ${this.height}px">
        </div>
        <div class="grab-handle"></div>
      </div>
    `;
    }

    toDesigner() {
      console.log('controle height', this.height);
      let ctxMenu = `<ul class="dropdown-menu"><li class="dropdown-item">teste</li></ul>`;
      this.$el = $(this.toHtml());
      this.el = this.$el[0];
      this.el.addEventListener('contextmenu', (evt) => {
        let c = $(ctxMenu).css({
          left: evt.pageX,
          top: evt.pageY,
        });
        $('body').append(c);
        c.show();
        document.addEventListener('mousedown', () => {
          c.hide();
          c.remove();
        });
      });
      this.$el.data('reportObject', this);
      this.bandEl = this.$el.find('.band');

      let dragging = false;
      let me = this;
      this.el.addEventListener('mousedown', function (evt) {
        evt.stopPropagation();
        $('.band-designer.selected').removeClass('selected');
        $(this).addClass('selected');
        if (me.designer.$adding)
          me.designer.$add(evt, me);
        else
          me.designer.selection = [me];
      });

      this.$el.find('.grab-handle')
      .on('mousedown', function (evt) {
        me.designer.clearSelection();
        evt.stopPropagation();
        dragging = true;
        let band = $(this).prev();

        let y = evt.screenY;

        document.onmousemove = (evt) => {
          if (dragging) {
            evt.preventDefault();
            y = evt.screenY - y;
            let el = band;
            let h = el.outerHeight();
            el.css('height', h + y);
            y = evt.screenY;
          }
        };

        document.onmouseup = (evt) => {
          if (dragging) {
            document.onmouseup = null;
            document.onmousemove = null;
            dragging = false;
            evt.preventDefault();
          }
        };
      });

      for (let child of this.children)
        this.bandEl.append(child.toDesigner());

      return this.el;
    }

    dump(): any {
      let r = {
        name: this.name,
        children: [],
        type: this.className,
      };
      for (let child of this.children)
        r.children.push(child.dump());
      return r;
    }
  }

  export class PageHeader extends Band {
    static className = 'PageHeader';
  }

  export class GroupHeader extends Band {
    static className = 'GroupHeader';
    groupFooter: GroupFooter;
    dataBand: DataBand;
    expression: string;

    load(info) {
      super.load(info);
      this.expression = info.expression;
    }

    dump(): any {
      let r = super.dump();
      if (this.dataBand)
        r.dataBand = this.dataBand.name;
      return r;
    }

  }

  export class GroupFooter extends Band {
    groupHeader: GroupHeader;
    static className = 'GroupFooter';

    constructor(info, public dataBand: DataBand=null) {
      super(info, null);
    }

    dump(): any {
      let r = super.dump();
      if (this.groupHeader)
        r.groupHeader = this.groupHeader.name;
      return r;
    }
  }

  export class DataBand extends Band {
    static className = 'DataBand';
    dataSource: string;
    columnHeader: ColumnHeader;
    columnFooter: ColumnFooter;
  }

  export class ColumnHeader extends Band {
    static className = 'ColumnHeader';
    dataBand: DataBand;
  }

  export class ColumnFooter extends Band {
    static className = 'ColumnFooter';
    dataBand: DataBand;
  }


  export class PageFooter extends Band {
    static className = 'PageFooter';
  }


  export class TextObject extends ReportWidget {
    static className = 'TextObject';
    text: string;
    dataSource: any;
    fieldName: string;

    get designer() {
      return this.parent.designer;
    }

    designerDoubleClick() {
      let templ = `<div class="modal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Text content</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <textarea class="form-control" autofocus></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary">OK</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
      </div>
    </div>
  </div>
</div>`;
      let el = $(templ);
      el.find('textarea').val(this.text);
      el.modal();
    }

    loadDefaults() {
      super.loadDefaults();
      this.height = 19;
      this.width = 130;
    }

    toHtml() {
      console.log('to html', this.text);
      return `<div class="report-widget text-object" style="position: absolute;left: ${this.left}px; top: ${this.top}px; height: ${this.height}px;width: ${this.width}px;"> <span>${this.text}</span> </div>`
    }

    load(info) {
      console.log('load');
      this.text = info.text;
    }

    dump(): any {
      let r = super.dump();
      r.text = this.text;
      console.log(r);
      return r;
    }

    align(align) {
      this.el.style.textAlign = align;
    }
  }

  export class ImageObject extends ReportWidget {
    src: string;
    field: string;

    loadDefaults() {
      super.loadDefaults();
      this.height = 70;
      this.width = 70;
      this.src = null;
      this.field = null;
    }

    toHtml() {
      return `<div class="report-widget image-object" style="position:absolute;left:${this.left}px;top:${this.top}px;height:${this.height}px;width:${this.width}px"> <img> </div>`;
    }
  }

}
