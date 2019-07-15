<%namespace name="report" file="report.mako"/>
<%def name="includes()">
  <link href="${report.static('/static/web/assets/plugins/c3/c3.min.css')}" rel="stylesheet">
  <script src="${report.static('/static/web/assets/plugins/c3/d3.v3.min.js')}"></script>
  <script src="${report.static('/static/web/assets/plugins/c3/c3.min.js')}"></script>
  <script>
    $(document).ready(function () {
      $('chart').each(function (idx, el) {
        el = $(el);
        let data;
        let id = el.data('id');
        let columns = el.data('columns');
        let type = el.data('type');
        let types = el.data('types');
        let groups = el.data('groups');
        if (id)
          data = $(document).data(id);
        let config = {
          type,
        };
        if (columns) {
          columns = columns.split(',').map(v => [v.trim()].concat($(document).data(v.trim())));
          config.columns = columns;
        }
        if (types)
          config.types = types;
        if (groups)
          config.groups = [groups.split(',')];

        let chart = c3.generate({ bindto: this, transition: null, data: config, interaction: { enabled: false } });
      });
    })
  </script>
</%def>
