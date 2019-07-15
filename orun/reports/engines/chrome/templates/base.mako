<%!
  import datetime
  from orun import g, app

  date = datetime.datetime.now()
  company = g.user.user_company
%>
<%namespace name="common" file="common.mako"/>
<%namespace name="engine" file="report.mako"/>
<html>
  <%block name="head">
    <head>
      <title>teste</title>
      <meta charset="UTF-8">
      % for ns in list(context.namespaces.values())[::-1]:
        % if hasattr(ns, 'includes'):
          ${ns.includes()}
        % endif
      % endfor
      <%block name="styles"></%block>
    </head>
  </%block>
<body>
<%block name="header">
<row class="report-title">
  <column>
  <img id="logo" src="${company.base64_logo}"/>
  <div class="float-right text-right">
    % if company.report_header:
    <small class="float-right">
      ${company.report_header | linebreaks}
    </small>
    <br/>
    % endif
    <span class="float-right">${date}</span>
    <br/>
    <h2 class="float-right">
      <%block name="report_title">${report.title or 'Report'}</%block>
    </h2>
  </div>
  </column>
</row>
</%block>

${next.body()}

<%block name="footer">
<footer>
##   ${(company.report_footer or str(company)) | linebreaks}
</footer>
</%block>

</body>
</html>
