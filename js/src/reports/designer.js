(function () {


  class QueryObject {
    constructor(name, sql) {
      this.sql = sql;
      this._name = name;
      ReportDesigner.currentDesigner.addDataSource(this);
    }

    get name() {
      return this._name;
    }

    set name(value) {
      if (this._name)
        delete ReportDesigner.currentDesigner.dataSources[this._name];
      this._name = value;
      if (value)
        ReportDesigner.currentDesigner.addDataSource(this);
    }
  }


  class ReportDesigner extends Katrid.UI.Designer.BaseDesigner {
    constructor(surface) {
      super(document);
      ReportDesigner.currentDesigner = this;
      this.handles = [];
      this.surface = surface;

      // data sources registry
      this.dataSources = {};
      this.data = {
        connections: {
          default: [

          ]
        }
      };

      this.$element = surface.closest('.report-designer');
      this.element = this.$element[0];
      this.mouseDown = (evt) => this.selection = [];
      this.surface[0].addEventListener('mousedown', this.mouseDown);
      this.element.querySelector('#btn-align-left')
      .addEventListener('click', () => this.alignSelection('left'));
      this.element.querySelector('#btn-align-center')
      .addEventListener('click', () => this.alignSelection('center'));
      this.element.querySelector('#btn-align-right')
      .addEventListener('click', () => this.alignSelection('right'));
      this.element.querySelector('#btn-format-bold', () => this.bold());
      this.element.querySelector('#btn-format-italic', () => this.italic());
      this.element.querySelector('#btn-format-underline', () => this.underline());
      this.element.querySelector('#btn-save')
      .addEventListener('click', () => this.save());

      this.element.querySelectorAll('.toolbox-item')
      .forEach((el, idx) => {
        el.addEventListener('click', () => {
          let widget = el.getAttribute('widget');
          this.$element.find('.toolbox-item.selected').removeClass('selected');
          el.classList.add('selected');
          this.$setComponent(widget);
        })
      });

      // data source editor
      this.dataSourceTree = new Katrid.UI.TreeView({
        dom: this.element.querySelector('.data-source-tree'),
      });
      this.defaultConnectionNode = this.dataSourceTree.addNode({ text: '(Default Connection)', icon: 'fa-folder' });
      this.element.querySelector('#btn-new-query').addEventListener('click', () => this.newQueryDialog());

      // band editor
      this.element.querySelector('#btn-add-group-band')
      .addEventListener('click', () => this.addGroupBand());
      this.element.querySelector('#btn-add-column-header')
      .addEventListener('click', () => this.addColumnHeader());
      this.element.querySelector('#btn-add-column-footer')
      .addEventListener('click', () => this.addColumnFooter());
      this.element.querySelector('#btn-add-table-band')
      .addEventListener('click', () => this.addTableBand());
    }

    bold() {
      for (let sel of this.selection)
        sel.bold = !sel.bold;
    }

    italic() {
      for (let sel of this.selection)
        sel.italic = !sel.italic;
    }

    addDataSource(dataSource) {
      this.dataSources[dataSource.name] = dataSource;
      this.loadDataSources();
    }

    loadDataSources() {
      let el = this.element.querySelector('#id-datasource');
      for (let op of el.querySelectorAll('option'))
        el.removeChild(op);

      el = $(el);
      el.append(`<option value=""></option>`);
      for (let ds of Object.values(this.dataSources))
        el.append(`<option value="${ds.name}">${ds.name}</option>`);
    }

    newQueryDialog() {
      let modal = $(`<div class="modal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">New Query</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <textarea autofocus class="form-control" id="commandText"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary">OK</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
      </div>
    </div>
  </div>
</div>`);
      modal.find('.btn-primary').click(() => {
        let queryName = this.getQueryName('query');
        let sql = $(modal.find('#commandText')).val();
        let query = new QueryObject(queryName, sql);
        let node = this.dataSourceTree.addNode(
          {
            text: queryName,
            icon: 'fa-file',
            query: query,
          },
          this.defaultConnectionNode,
        );
        node.el.title = sql;
        modal.modal('hide').modal('dispose').data('bs-modal', null);
      });
      $(modal).modal();
    }

    addGroupBand(dataBand) {
      if (!dataBand)
        dataBand = this.getDataBand();
      if (dataBand) {
        let header = new Katrid.Reports.GroupHeader(null, dataBand);
        header.designer = this;
        let footer = new Katrid.Reports.GroupFooter(null, header);
        footer.designer = this;
        dataBand.el.before(header.toDesigner());
        dataBand.el.after(footer.toDesigner());
      }
    }

    addColumnHeader(dataBand) {
      if (!dataBand)
        dataBand = this.getDataBand();
      if (dataBand) {
        let header = new Katrid.Reports.ColumnHeader();
        header.designer = this;
        dataBand.el.before(header.toDesigner());
        dataBand.columnHeader = header;
      }
    }

    addColumnFooter(dataBand) {
      if (!dataBand)
        dataBand = this.getDataBand();
      if (dataBand) {
        let header = new Katrid.Reports.ColumnFooter();
        header.designer = this;
        dataBand.el.before(header.toDesigner());
        dataBand.columnHeader = header;
      }
    }

    addTableBand(page) {
      if (!page)
        page = this.currentPage;
      if (page.pageHeader) {

      }
    }

    getDataBand() {
      for (let band of this.currentPage.bands)
        if (band instanceof Katrid.Reports.DataBand)
          return band;
    }

    get currentPage() {
      return this.report.pages[0];
    }

    getQueryName(name) {
      // auto generate a query name
      let i = 0;
      let newName;
      while (true) {
        i++;
        newName = name + i;
        if (!this.dataSources[newName])
          return newName;
      }
    }

    loadReport(rep) {
      this.report = rep;
      for (let page of this.report.pages) {
        this.surface.append(page.toDesigner());
        for (let band of page.bands) {
          band.designer = this;
          page.el.append(band.toDesigner());
        }
      }
    }

    updateSelection() {
      this.destroyHandles();
      for (let sel of this.selection) {
        if (!(sel instanceof Katrid.Reports.Band))
          this.addGrabHandles(sel);
        else
          this.onSelectionChange(this.selection);
      }

      this.setPropInspObject(this.selection);
    }

    setPropInspObject(selection) {
      let el = $(this.element.querySelector('#id-datasource'));
      el.val('');
      let fieldEl = $(this.element.querySelector('#id-field'));
      fieldEl.val('');
      let exprEl = $(this.element.querySelector('#id-expression'));
      exprEl.val('');
      if (selection.length) {
        let sel = selection[0];
        if (sel.dataSource)
          el.val(sel.dataSource);
        exprEl.val(sel.expression);
        console.log('expression', sel.expression);
        fieldEl.val(sel.field);
      }
    }

    setSelectionProp(prop, value) {
      console.log('set selection', prop, value);
      if (this.selection) {
        let sel = this.selection[0];
        console.log('sel', value, sel, sel.dataSource);
        sel[prop] = value;
      }
    }

    onSelectionChange(value) {
      // remove active status from toolbar buttons
      this.$element.find('.btn-align').removeClass('active');
      if (value) {
        if (value.length === 1) {
          let obj = $(value).data('reportObject');
          if (obj instanceof Katrid.Reports.TextObject) {
            let textAlign = value[0].el.style.textAlign || 'left';
            let btnSel = '#btn-align-' + textAlign;
            this.element.querySelector(btnSel).classList.add('active');
          }
        }
      }

    }

    onSelectionMove() {
      for (let sel of this.selection) {
        sel.left = sel.el.style.left;
        sel.top = sel.el.style.top;
      }
    }

    get report() {
      return this._report;
    }

    set report(info) {
      let rep;
      if (info instanceof Katrid.Reports.Report)
        rep = info;
      else
        rep = new Katrid.Reports.Report(info);
      this._report = rep;
    }

    $add(evt, band) {
      let obj = new this.$adding(undefined, band);
      this.$adding = null;
      band.children.push(obj);
      band.band.append(obj.toDesigner());
      obj.left = evt.offsetX;
      obj.top = evt.offsetY;
      this.$element.find('.toolbox-item.selected').removeClass('selected');
      this.selection = [obj];
    }

    alignSelection(align) {
      for (let child of this.selection)
        child.align(align);
      this.onSelectionChange(this.selection);
    }

    $setComponent(className) {
      this.$adding = Katrid.Reports[className];
    }

    selectElement(el) {
      // add element to selection
      let obj = $(el).data('reportObject');
      this.selection = this.selection.concat([obj]);
    }

    dump() {
      return this.report.dump();
    }

    save() {
      console.log(this.dump());
    }

  }

  /* end widgets */



  Katrid.Reports.ReportDesigner = ReportDesigner;


})();
