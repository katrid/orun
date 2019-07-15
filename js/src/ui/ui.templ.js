(function () {
  class BaseTemplate {

    getSettingsDropdown(viewType) {
      if (viewType === 'form') {
        return `<ul class="dropdown-menu pull-right">
    <li>
      <a href="javascript:void(0);" ng-click="action.showDefaultValueDialog()">${ Katrid.i18n.gettext('Set Default') }</a>
    </li>
  </ul>`;
      }
    }


    getSetDefaultValueDialog() {
      return `\
  <div class="modal fade" id="set-default-value-dialog" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="${ Katrid.i18n.gettext('Close') }"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">${ Katrid.i18n.gettext('Set Default') }</h4>
        </div>
        <div class="modal-body">
          <select class="form-control" id="id-set-default-value">
            <option ng-repeat="field in view.fields">{{ field.caption }} = {{ record[field.name] }}</option>
          </select>
          <div class="radio">
            <label><input type="radio" name="public">${ Katrid.i18n.gettext('Only me') }</label>
          </div>
          <div class="radio">
            <label><input type="radio" name="public">${ Katrid.i18n.gettext('All users') }</label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary">${ Katrid.i18n.gettext('Save') }</button>
          <button type="button" class="btn btn-default" data-dismiss="modal">${ Katrid.i18n.gettext('Cancel') }</button>
        </div>
      </div>
    </div>
  </div>\
  `;
    }

    static get cssListClass() {
      return 'table table-striped table-bordered table-condensed table-hover display responsive nowrap dataTable no-footer dtr-column';
    }

    renderList(scope, element, attrs, rowClick, parentDataSource, showSelector=true) {
      let ths = '<th ng-show="dataSource.groups.length"></th>';
      let tfoot = false;
      let totals = [];
      let cols = `<td ng-show="dataSource.groups.length" class="group-header">
  <div ng-show="record._group">
  <span class="fa fa-fw fa-caret-right"
    ng-class="{'fa-caret-down': record._group.expanded, 'fa-caret-right': record._group.collapsed}"></span>
    {{::record._group.__str__}} ({{::record._group.count }})</div></td>`;
      if (showSelector) {
        ths += `<th class="list-record-selector"><input type="checkbox" ng-click="action.selectToggle($event.currentTarget)" onclick="$(this).closest('table').find('td.list-record-selector input').prop('checked', $(this).prop('checked'))"></th>`;
        cols += `<td class="list-record-selector" onclick="event.stopPropagation();"><input title="teste" type="checkbox" ng-click="action.selectToggle($event.currentTarget)" onclick="if (!$(this).prop('checked')) $(this).closest('table').find('th.list-record-selector input').prop('checked', false)"></td>`;
      }

      for (let col of Array.from(element.children())) {
        let colHtml = col.outerHTML;
        col = $(col);
        let name = col.attr('name');
        if (!name) {
          cols += `<td>${col.html()}</td>`;
          ths += "<th><span>${col.attr('label')}</span></th>";
          continue;
        }

        let total = col.attr('total');
        if (total) {
          totals.push([name, total]);
          tfoot = true;
        } else totals.push(total);

        name = col.attr('name');
        const fieldInfo = scope.view.fields[name];

        if ((col.attr('visible') === 'False') || (fieldInfo.visible === false))
          continue;

        // if (fieldInfo.choices) {
        //   fieldInfo._listChoices = {};
        //   for (let choice of Array.from(fieldInfo.choices)) {
        //     fieldInfo._listChoices[choice[0]] = choice[1];
        //   }
        // }

        let _widget = fieldInfo.createWidget(col.attr('widget'), scope, col, col);
        _widget.inList = true;
        _widget.inplaceEditor = Boolean(scope.inline);
        ths += _widget.th(col.attr('label'));

        cols += _widget.td(scope.inline, colHtml, col);
      }
      if (parentDataSource) {
        ths += '<th class="list-column-delete" ng-show="parent.dataSource.changing && !dataSource.readonly">';
        cols += '<td class="list-column-delete" ng-show="parent.dataSource.changing && !dataSource.readonly" ng-click="removeItem($index);$event.stopPropagation();"><i class="fa fa-trash-o"></i></td>';
      }
      if ((rowClick == null)) {
        rowClick = 'action.listRowClick($index, row, $event)';
      }

      if (tfoot)
        tfoot = `<tfoot><tr>${ totals.map(t => (t ? `<td class="text-right"><strong><ng-total field="${ t[0] }" type="${ t[1] }"></ng-total></ strong></td>` : '<td class="borderless"></td>')).join('') }</tr></tfoot>`;
      else
        tfoot = '';
      let gridClass = ' grid';
      if (scope.inline)
        gridClass += ' inline-editor';
      return `<table class="${this.constructor.cssListClass}${gridClass}">
  <thead><tr>${ths}</tr></thead>
  <tbody>
  <tr ng-repeat="record in records | limitTo:totalDisplayed" ng-click="${rowClick}" ng-class="{'group-header': record._hasGroup, 'form-data-changing': (dataSource.changing && dataSource.recordIndex === $index), 'form-data-readonly': !(dataSource.changing && dataSource.recordIndex === $index)}" ng-form="grid-row-form-{{$index}}" id="grid-row-form-{{$index}}">${cols}</tr>
  </tbody>
  ${ tfoot }
  </table>
  <a href="javascript:void(0)" ng-show="records.length > totalDisplayed" ng-click="totalDisplayed = totalDisplayed + 1000">${ Katrid.i18n.gettext('View more...') }</a>
  `;
    }

    renderGrid(scope, element, attrs, rowClick) {
      const tbl = this.renderList(scope, element, attrs, rowClick, true, false);
      let buttons;
      if (attrs.inline == 'inline')
        buttons = `
<button class="btn btn-xs btn-info" ng-click="addItem()" ng-show="parent.dataSource.changing && !dataSource.changing" type="button">${Katrid.i18n.gettext('Add')}</button>
<button class="btn btn-xs btn-info" ng-click="addItem()" ng-show="dataSource.changing" type="button">${Katrid.i18n.gettext('Save')}</button>
<button class="btn btn-xs btn-info" ng-click="cancelChanges()" ng-show="dataSource.changing" type="button">${Katrid.i18n.gettext('Cancel')}</button>
`;
      else
        buttons = `
<button class="btn btn-xs btn-info" ng-click="addItem()" ng-show="parent.dataSource.changing" type="button">${Katrid.i18n.gettext('Add')}</button>
<button class="btn btn-xs btn-outline-secondary float-right" ng-click="pasteData()" ng-show="parent.dataSource.changing" type="button" title="${Katrid.i18n.gettext('Paste')}">
<i class="fa fa-clipboard"></i>
</button>
`;
      return `<div style="overflow-x: auto;"><div ng-show="!dataSource.readonly">
  ${buttons}
  </div><div class="row inline-input-dialog" ng-show="dataSource.changing"/>${tbl}</div>`;
    }

    windowDialog(scope) {
      console.log('window dialog', scope);
      return `\
  <div class="modal fade" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-lg" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="myModalLabel">
          {{dialogTitle}}
          {{action.info.display_name}}</h4>
        </div>
        <div class="modal-body">
    <div class="modal-dialog-body" ng-class="{'form-data-changing': dataSource.changing}"></div>
  <div class="clearfix"></div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" type="button" ng-click="dataSource.saveAndClose()" ng-show="dataSource.changing">${Katrid.i18n.gettext('Save')}</button>
          <button type="button" class="btn btn-default" type="button" data-dismiss="modal" ng-show="dataSource.changing">${Katrid.i18n.gettext('Cancel')}</button>
          <button type="button" class="btn btn-default" type="button" data-dismiss="modal" ng-show="!dataSource.changing">${Katrid.i18n.gettext('Close')}</button>
        </div>
      </div>
    </div>
  </div>\
  `;
    }

    renderReportDialog(scope) {
      return `<div ng-controller="ReportController">
  <form id="report-form" method="get" action="/web/reports/report/">
    <div class="data-heading panel panel-default">
      <div class="panel-body">
      <h2>{{ report.name }}</h3>
      <div class="toolbar">
        <button class="btn btn-primary" type="button" ng-click="report.preview()"><span class="fa fa-print fa-fw"></span> ${ Katrid.i18n.gettext('Preview') }</button>
  
        <div class="btn-group">
          <button class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                  aria-expanded="false">${ Katrid.i18n.gettext('Export')  } <span class="caret"></span></button>
          <ul class="dropdown-menu">
            <li><a ng-click="Katrid.Reports.Reports.preview()">PDF</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('docx')">Word</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('xlsx')">Excel</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('pptx')">PowerPoint</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('csv')">CSV</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('txt')">${ Katrid.i18n.gettext('Text File') }</a></li>
          </ul>
        </div>
  
        <div class="btn-group">
          <button class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                  aria-expanded="false">${ Katrid.i18n.gettext('My reports')  } <span class="caret"></span></button>
          <ul class="dropdown-menu">
            <li><a ng-click="Katrid.Reports.Reports.preview()">PDF</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('docx')">Word</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('xlsx')">Excel</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('pptx')">PowerPoint</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('csv')">CSV</a></li>
            <li><a href="javascript:void(0)" ng-click="Katrid.Reports.Reports.export('txt')">${ Katrid.i18n.gettext('Text File') }</a></li>
          </ul>
        </div>
  
      <div class="pull-right btn-group">
        <button class="btn btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true"
                aria-expanded="false"><i class="fa fa-gear fa-fw"></i></button>
        <ul class="dropdown-menu">
          <li><a href="javascript:void(0)" ng-click="report.saveDialog()">${ Katrid.i18n.gettext('Save') }</a></li>
          <li><a href="#">${ Katrid.i18n.gettext('Load') }</a></li>
        </ul>
      </div>
  
      </div>
    </div>
    </div>
    <div class="col-sm-12">
      <table class="col-sm-12" style="margin-top: 20px; display:none;">
        <tr>
          <td colspan="2" style="padding-top: 8px;">
            <label>${ Katrid.i18n.gettext('My reports') }</label>
  
            <select class="form-control" ng-change="action.userReportChanged(action.userReport.id)" ng-model="action.userReport.id">
                <option value=""></option>
                <option ng-repeat="rep in userReports" value="{{ rep.id }}">{{ rep.name }}</option>
            </select>
          </td>
        </tr>
      </table>
    </div>
  <div id="report-params">
  <div id="params-fields" class="col-sm-12 form-group">
    <div class="checkbox"><label><input type="checkbox" ng-model="paramsAdvancedOptions"> ${ Katrid.i18n.gettext('Advanced options') }</label></div>
    <div ng-show="paramsAdvancedOptions">
      <div class="form-group">
        <label>${ Katrid.i18n.gettext('Printable Fields') }</label>
        <input type="hidden" id="report-id-fields"/>
      </div>
      <div class="form-group">
        <label>${ Katrid.i18n.gettext('Totalizing Fields') }</label>
        <input type="hidden" id="report-id-totals"/>
      </div>
    </div>
  </div>
  
  <div id="params-sorting" class="col-sm-12 form-group">
    <label class="control-label">${ Katrid.i18n.gettext('Sorting') }</label>
    <select multiple id="report-id-sorting"></select>
  </div>
  
  <div id="params-grouping" class="col-sm-12 form-group">
    <label class="control-label">${ Katrid.i18n.gettext('Grouping') }</label>
    <select multiple id="report-id-grouping"></select>
  </div>
  
  <div class="clearfix"></div>
  
  </div>
    <hr>
      <table class="col-sm-12">
        <tr>
          <td class="col-sm-4">
            <select class="form-control" ng-model="newParam">
              <option value="">--- ${ Katrid.i18n.gettext('FILTERS') } ---</option>
              <option ng-repeat="field in report.fields" value="{{ field.name }}">{{ field.label }}</option>
            </select>
          </td>
          <td class="col-sm-8">
            <button
                class="btn btn-default" type="button"
                ng-click="report.addParam(newParam)">
              <i class="fa fa-plus fa-fw"></i> ${ Katrid.i18n.gettext('Add Parameter') }
            </button>
          </td>
        </tr>
      </table>
  <div class="clearfix"></div>
  <hr>
  <div id="params-params">
    <div ng-repeat="param in report.params" ng-controller="ReportParamController" class="row form-group">
      <div class="col-sm-12">
      <div class="col-sm-4">
        <label class="control-label">{{param.label}}</label>
        <select ng-model="param.operation" class="form-control" ng-change="param.setOperation(param.operation)">
          <option ng-repeat="op in param.operations" value="{{op.id}}">{{op.text}}</option>
        </select>
      </div>
      <div class="col-sm-8" id="param-widget"></div>
      </div>
    </div>
  </div>
  </form>
  </div>\
  `;
    }

  }


  Katrid.UI.utils = {
    BaseTemplate,
    Templates: new BaseTemplate()
  };

})();
