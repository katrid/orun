(function() {

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
          res.map(c => sel.append(`<option value="${ c[0] }">${ c[1] }</option>`));
        sel.select2();
      }
      modal.find('#id-btn-ok').click(async () => {

        let svc = new Katrid.Services.Model('telegram.pending');
        format = 'pdf';
        const params = report.getUserParams();
        let res = svc.post('export_report', { args: [report.info.id], kwargs: { contacts: sel.val(), format, params } });
        if (res.ok) console.log('ok');
      });
      modal.modal();
      return true;

    }
  }

  Katrid.Reports.Telegram = Telegram;
})();
