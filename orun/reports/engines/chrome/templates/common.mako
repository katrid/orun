<%namespace name="report" file="report.mako"/>
<%def name="includes()">
  <link href="${report.static('/static/web/assets/css/bootstrap.min.css')}" rel="stylesheet">
  <link href="${report.static('/static/web/assets/css/font-awesome.css')}" rel="stylesheet">
  <link href="${report.static('/static/web/api/reports/reports.css')}"  rel="stylesheet">
  <script src="${report.static('/static/web/assets/js/jquery.min.js')}"></script>
  <script src="${report.static('/static/web/api/reports/reports.js')}"></script>

  <script>
    $(document).ready(function() {
      $('data').each(function (idx, el) {
        el = $(el);
        let data = JSON.parse(el.text());
        $(document).data(el.data('id'), data);
        el.remove();
      });
    });
  </script>
</%def>
