(function() {

  class ReportAction extends Katrid.Actions.Action {
    static initClass() {
      this.actionType = 'ir.action.report';
    }

    static async dispatchBindingAction(parent, action) {
      let format = localStorage.katridReportViewer || 'pdf';
      let sel = parent.selection;
      console.log('selection ', sel);
      if (sel)
        sel = sel.join(',');
      let params = { data: [{ name: 'id', value: sel }] };
      const svc = new Katrid.Services.Model('ir.action.report');
      let res = await svc.post('export_report', { args: [action.id], kwargs: { format, params } });
      if (res.open)
        return window.open(res.open);
    }

    get name() {
      return this.info.name;
    }

    constructor(info, scope, location) {
      super(info, scope, location);
      this.templateUrl = 'view.report.jinja2';
      this.userReport = {};
    }

    userReportChanged(report) {
      return this.location.search({
        user_report: report});
    }

    async onHashChange(params) {
      console.log('report hash change', params);
      this.userReport.id = params.user_report;
      if (this.userReport.id) {
        const svc = new Katrid.Services.Model('ir.action.report');
        let res = await svc.post('load_user_report', { kwargs: { user_report: this.userReport.id } });
        this.userReport.params = res.result;
      } else {
        // Katrid.core.setContent(, this.scope);
      }
      location.hash = '#/app/?' + $.param(params);
      let templ = Katrid.Reports.Reports.renderDialog(this);
      templ = Katrid.Core.$compile(templ)(this.scope);
      $('#katrid-action-view').empty().append(templ);
    }

  }
  ReportAction.initClass();

  Katrid.Actions.ReportAction = ReportAction;
  Katrid.Actions[ReportAction.actionType] = ReportAction;

})();
